import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { caricaStrutture, caricaStruttureVicine, cercaStrutture } from "../lib/strutture";
import { REGIONI_ITALIANE } from "../lib/regioni";
import { CATEGORIE_FILTRI_SERVIZI } from "../lib/filtriServizi";
import { caricaRicercheRecenti, salvaRicercaRecente, cancellaRicercheRecenti } from "../lib/ricercheRecenti";
import { salvaInCache, leggiDaCache } from "../lib/cacheOffline";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import RicercaIA from "../components/RicercaIA";
import { useAuth } from "../context/AuthContext";
import { caricaIdPreferiti, toggleFavorito, sipuoSalvare } from "../lib/preferiti";
import { distanzaKm } from "../lib/geo";

const FILTRI = ["Tutti", "Campeggi", "Agriturismi", "Agricampeggi", "Aree sosta", "Camper service", "Rifugi", "Bivacchi"];
const STRUTTURE_PER_PAGINA = 60;

export default function EsploraScreen({ navigation, route }) {
  const { session } = useAuth();
  const [strutture, setStrutture] = useState([]);
  const [preferitiIds, setPreferitiIds] = useState(new Set());
  const [caricamento, setCaricamento] = useState(true);
  const [aggiornamento, setAggiornamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [senzaConnessione, setSenzaConnessione] = useState(false);
  // Arrivando dall'hub di Esplora con una tessera già scelta (es.
  // "Rifugi"): il filtro parte già impostato, modificabile come sempre
  // una volta sulla pagina.
  const [filtriTipo, setFiltriTipo] = useState(() => route.params?.filtriIniziali || []); // vuoto = "Tutti"
  const [ricerca, setRicerca] = useState("");
  const [posizione, setPosizione] = useState(null);
  const [cercandoPosizione, setCercandoPosizione] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [caricandoAltre, setCaricandoAltre] = useState(false);
  const [fineLista, setFineLista] = useState(false);
  const primoRendering = useRef(true);
  const ricercaAttiva = ricerca.trim().length >= 2;
  const [inputAFocus, setInputAFocus] = useState(false);
  // Arrivando dall'hub con servizi già riconosciuti dalla ricerca IA
  // (es. "piscina"): parte già impostato, come filtriTipo/ricerca sopra.
  const [filtriServizi, setFiltriServizi] = useState(() => route.params?.serviziIniziali || []);
  const [modalFiltriAperto, setModalFiltriAperto] = useState(false);
  const [sezioniAperte, setSezioniAperte] = useState({ [CATEGORIE_FILTRI_SERVIZI[0].titolo]: true });
  const [ricercheRecenti, setRicercheRecenti] = useState([]);
  const [bannerHostVisibile, setBannerHostVisibile] = useState(false);
  const bannerHostMostrato = useRef(false);

  useEffect(() => {
    caricaRicercheRecenti().then(setRicercheRecenti);
  }, []);

  const carica = useCallback(async () => {
    try {
      const dati = await caricaStrutture({ limite: STRUTTURE_PER_PAGINA, pagina: 0, servizi: filtriServizi, tipi: filtriTipo });
      setStrutture(dati);
      setPagina(0);
      setFineLista(dati.length < STRUTTURE_PER_PAGINA);
      setSenzaConnessione(false);
      setErrore(null);
      // Solo la lista di base (nessun filtro servizi/tipo), così la cache
      // ha sempre un senso ovvio da mostrare offline, non il risultato
      // di una combinazione di filtri che l'utente potrebbe non ricordare.
      if (filtriServizi.length === 0 && filtriTipo.length === 0) salvaInCache("esplora_lista", dati);
    } catch (_e) {
      const cache = filtriServizi.length === 0 && filtriTipo.length === 0 ? await leggiDaCache("esplora_lista") : null;
      if (cache) {
        setStrutture(cache.dati);
        setFineLista(true);
        setSenzaConnessione(true);
      } else {
        setErrore("Non riesco a caricare le strutture. Controlla la connessione.");
      }
    }
  }, [filtriServizi, filtriTipo]);

  useEffect(() => {
    Promise.resolve()
      .then(() => carica())
      .finally(() => setCaricamento(false));
  }, [carica]);

  useEffect(() => {
    caricaIdPreferiti(session?.user?.id).then(setPreferitiIds);
  }, [session?.user?.id]);

  // Un unico punto che decide cosa ricaricare quando cambia il testo
  // cercato, i servizi scelti o la posizione: "vicino a me" ha la
  // precedenza (resta attivo finché non lo si cambia), poi la ricerca
  // testuale (con debounce), altrimenti la lista normale per voto. La
  // ricerca guarda TUTTO il database, non solo le strutture già caricate
  // per voto: altrimenti "Lombardia" o "piscina" non trovano nulla finché
  // non si sfoglia abbastanza la lista.
  useEffect(() => {
    if (primoRendering.current) {
      primoRendering.current = false;
      return;
    }

    let annullato = false;
    const termine = ricerca.trim();

    const timer = setTimeout(async () => {
      try {
        let dati;
        if (posizione) {
          dati = await caricaStruttureVicine({ lat: posizione.lat, lng: posizione.lng, servizi: filtriServizi, tipi: filtriTipo });
        } else if (termine.length >= 2) {
          dati = await cercaStrutture({ termine, servizi: filtriServizi, tipi: filtriTipo });
          salvaRicercaRecente(termine).then(setRicercheRecenti);
          // Promemoria per i gestori che usano l'app senza account: compare
          // una sola volta per apertura dell'app, dopo la prima ricerca.
          if (!session && !bannerHostMostrato.current) {
            bannerHostMostrato.current = true;
            setBannerHostVisibile(true);
          }
        } else if (termine.length === 0) {
          await carica();
          return;
        } else {
          return;
        }
        if (!annullato) setStrutture(dati);
      } catch (e) {
        console.error("Errore nel ricaricare le strutture:", e);
      }
    }, 300);

    return () => {
      annullato = true;
      clearTimeout(timer);
    };
  }, [ricerca, filtriServizi, filtriTipo, posizione, carica]);

  const onRefresh = async () => {
    setAggiornamento(true);
    await carica();
    setAggiornamento(false);
  };

  const caricaAltre = async () => {
    if (caricandoAltre || fineLista || posizione || ricercaAttiva) return;
    setCaricandoAltre(true);
    try {
      const prossimaPagina = pagina + 1;
      const dati = await caricaStrutture({ limite: STRUTTURE_PER_PAGINA, pagina: prossimaPagina, servizi: filtriServizi, tipi: filtriTipo });
      setStrutture((prev) => [...prev, ...dati]);
      setPagina(prossimaPagina);
      if (dati.length < STRUTTURE_PER_PAGINA) setFineLista(true);
    } catch (e) {
      console.error("Errore nel caricare altre strutture:", e);
    } finally {
      setCaricandoAltre(false);
    }
  };

  const vicinoAMe = async () => {
    let permesso;
    try {
      permesso = await Location.requestForegroundPermissionsAsync();
    } catch (e) {
      console.error("Permesso posizione:", e);
      Alert.alert("Posizione non disponibile", "Per vedere le strutture vicine a te, consenti l'accesso alla posizione.");
      return;
    }
    if (permesso.status !== "granted") {
      console.log("Permesso posizione negato:", permesso.status);
      Alert.alert("Posizione non disponibile", "Per vedere le strutture vicine a te, consenti l'accesso alla posizione.");
      return;
    }
    setCercandoPosizione(true);
    try {
      const posiz = await Location.getCurrentPositionAsync({});
      setPosizione({ lat: posiz.coords.latitude, lng: posiz.coords.longitude });
    } catch (e) {
      console.error("Errore nel trovare la posizione:", e);
      Alert.alert("Non riesco a trovare la tua posizione", "Riprova tra poco.");
    } finally {
      setCercandoPosizione(false);
    }
  };

  // Sentieri e percorsi 4x4 non sono strutture: questa schermata non li
  // mostra mai, serve passare a quella giusta (stesso principio del sito,
  // dove Home manda a /sentieri o /percorsi-4x4 invece di filtrare).
  const onRicercaIA = (risultato) => {
    if (risultato.categoria === "sentiero") {
      navigation.push("Sentieri", { regioneIniziale: risultato.regione, modalitaIniziale: risultato.modalita });
      return;
    }
    if (risultato.categoria === "percorso_4x4") {
      navigation.push("Percorsi4x4", {
        regioneIniziale: risultato.regione,
        difficoltaIniziale: risultato.difficolta,
        tipoVeicoloIniziale: risultato.tipoVeicolo,
      });
      return;
    }
    if (risultato.filtriTipo.length > 0) setFiltriTipo(risultato.filtriTipo);
    if (risultato.ricerca) setRicerca(risultato.ricerca);
    if (risultato.filtriServizi.length > 0) setFiltriServizi(risultato.filtriServizi);
  };

  const toggleServizio = (chiave) => {
    setFiltriServizi((prev) => (prev.includes(chiave) ? prev.filter((c) => c !== chiave) : [...prev, chiave]));
  };

  const toggleSezione = (titolo) => {
    setSezioniAperte((prev) => ({ ...prev, [titolo]: !prev[titolo] }));
  };

  const onToggleFavorito = async (struttura) => {
    if (!session?.user?.id) {
      Alert.alert("Accedi", "Accedi al tuo account per salvare le strutture nei preferiti.");
      return;
    }
    const presente = !preferitiIds.has(struttura.idOriginale);
    setPreferitiIds((prev) => {
      const copia = new Set(prev);
      if (presente) copia.add(struttura.idOriginale);
      else copia.delete(struttura.idOriginale);
      return copia;
    });
    const error = await toggleFavorito(session.user.id, struttura.idOriginale, presente);
    if (error) {
      setPreferitiIds((prev) => {
        const copia = new Set(prev);
        if (presente) copia.delete(struttura.idOriginale);
        else copia.add(struttura.idOriginale);
        return copia;
      });
    }
  };

  let risultati = strutture.filter((s) => {
    const passaFiltro =
      filtriTipo.length === 0 ||
      (filtriTipo.includes("Campeggi") && s.tipo === "Campeggio") ||
      (filtriTipo.includes("Agriturismi") && s.tipo === "Agriturismo") ||
      (filtriTipo.includes("Agricampeggi") && s.tipo === "Agricampeggio") ||
      (filtriTipo.includes("Rifugi") && s.tipo === "Rifugio") ||
      (filtriTipo.includes("Bivacchi") && s.tipo === "Bivacco") ||
      (filtriTipo.includes("Camper service") && s.tipo === "Camper service") ||
      (filtriTipo.includes("Aree sosta") && s.tipo === "Area sosta");
    const passaRicerca =
      ricerca.trim().length === 0 ||
      s.nome?.toLowerCase().includes(ricerca.toLowerCase()) ||
      s.localita?.toLowerCase().includes(ricerca.toLowerCase());
    return passaFiltro && passaRicerca;
  });

  if (posizione) {
    risultati = risultati
      .filter((s) => s.lat && s.lng)
      .map((s) => ({ ...s, distanzaKm: distanzaKm(posizione.lat, posizione.lng, s.lat, s.lng) }))
      .sort((a, b) => a.distanzaKm - b.distanzaKm);
  }

  // Suggerimenti mentre si digita (es. "piem" → "Piemonte" + prime
  // strutture che iniziano così): regioni da un elenco fisso (sono solo
  // 20, non serve interrogare il database), strutture da quelle già
  // caricate dalla ricerca in corso.
  const termineSuggerimenti = ricerca.trim().toLowerCase();
  const regioniSuggerite =
    termineSuggerimenti.length >= 2
      ? REGIONI_ITALIANE.filter((r) => r.toLowerCase().includes(termineSuggerimenti)).slice(0, 3)
      : [];
  const struttureSuggerite =
    termineSuggerimenti.length >= 2
      ? strutture.filter((s) => s.nome?.toLowerCase().startsWith(termineSuggerimenti)).slice(0, 5)
      : [];
  const mostraRicercheRecenti = termineSuggerimenti.length === 0 && ricercheRecenti.length > 0;
  const mostraTendina =
    inputAFocus && (regioniSuggerite.length > 0 || struttureSuggerite.length > 0 || mostraRicercheRecenti);

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo onPress={() => navigation.navigate("EsploraHub")} />

        <View style={styles.ricercaPill}>
          <Ionicons name="search" size={16} color={colori.testoSecondario} />
          <TextInput
            style={styles.inputRicerca}
            placeholder="Zona, regione, struttura…"
            placeholderTextColor={colori.testoSecondario}
            value={ricerca}
            onChangeText={setRicerca}
            onFocus={() => setInputAFocus(true)}
            onBlur={() => setTimeout(() => setInputAFocus(false), 150)}
          />
        </View>

        {mostraTendina && (
          <View style={styles.tendina}>
            {mostraRicercheRecenti && (
              <>
                <View style={styles.tendinaIntestazione}>
                  <Text style={styles.tendinaIntestazioneTesto}>Ricerche recenti</Text>
                  <Pressable
                    onPress={() => {
                      cancellaRicercheRecenti().then(setRicercheRecenti);
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.tendinaCancella}>Cancella</Text>
                  </Pressable>
                </View>
                {ricercheRecenti.map((termine) => (
                  <Pressable
                    key={`recente-${termine}`}
                    style={styles.rigaTendina}
                    onPress={() => {
                      setRicerca(termine);
                      setInputAFocus(false);
                    }}
                  >
                    <Ionicons name="time-outline" size={15} color={colori.testoSecondario} />
                    <Text style={styles.rigaTendinaTesto}>{termine}</Text>
                  </Pressable>
                ))}
              </>
            )}
            {regioniSuggerite.map((r) => (
              <Pressable
                key={`regione-${r}`}
                style={styles.rigaTendina}
                onPress={() => {
                  setRicerca(r);
                  setInputAFocus(false);
                }}
              >
                <Ionicons name="map-outline" size={15} color={colori.blu} />
                <Text style={styles.rigaTendinaTesto}>{r}</Text>
                <Text style={styles.rigaTendinaEtichetta}>Regione</Text>
              </Pressable>
            ))}
            {struttureSuggerite.map((s) => (
              <Pressable
                key={`struttura-${s.id}`}
                style={styles.rigaTendina}
                onPress={() => {
                  setInputAFocus(false);
                  navigation.navigate("Scheda", { struttura: s });
                }}
              >
                <Ionicons name="business-outline" size={15} color={colori.testoSecondario} />
                <Text style={styles.rigaTendinaTesto} numberOfLines={1}>
                  {s.nome}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {session && <RicercaIA onRisultato={onRicercaIA} />}

        <View style={styles.rigaFiltri}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtri}
            style={{ flex: 1 }}
          >
            {FILTRI.map((f) => {
              const attivo = f === "Tutti" ? filtriTipo.length === 0 : filtriTipo.includes(f);
              return (
                <Pressable
                  key={f}
                  onPress={() =>
                    f === "Tutti"
                      ? setFiltriTipo([])
                      : setFiltriTipo((prev) => (prev.includes(f) ? prev.filter((t) => t !== f) : [...prev, f]))
                  }
                  style={[styles.chip, attivo && styles.chipAttivo]}
                >
                  <Text style={[styles.chipTesto, attivo && styles.chipTestoAttivo]}>{f}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={[styles.bottoneFiltriServizi, filtriServizi.length > 0 && styles.bottoneFiltriServiziAttivo]}
            onPress={() => setModalFiltriAperto(true)}
          >
            <Ionicons name="options-outline" size={17} color={filtriServizi.length > 0 ? colori.bianco : colori.blu} />
            {filtriServizi.length > 0 && (
              <View style={styles.badgeFiltri}>
                <Text style={styles.badgeFiltriTesto}>{filtriServizi.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.vicinoAMe} onPress={vicinoAMe}>
          {cercandoPosizione ? (
            <ActivityIndicator color={colori.bianco} size="small" />
          ) : (
            <Ionicons name="navigate" size={16} color={colori.bianco} />
          )}
          <Text style={styles.vicinoAMeTesto}>{posizione ? "Ordinato per distanza" : "Vicino a me ora"}</Text>
        </Pressable>
      </View>

      {bannerHostVisibile && (
        <View style={styles.bannerHost}>
          <Ionicons name="business-outline" size={20} color={colori.blu} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.bannerHostTitolo}>Gestisci un campeggio o una struttura?</Text>
            <Text style={styles.bannerHostTesto}>Registrala su NaturaGo.it, è gratis.</Text>
          </View>
          <Pressable
            style={styles.bannerHostPulsante}
            onPress={() => Linking.openURL("https://www.naturago.it/host?modo=registrati")}
          >
            <Text style={styles.bannerHostPulsanteTesto}>Registrati</Text>
          </Pressable>
          <Pressable onPress={() => setBannerHostVisibile(false)} hitSlop={8}>
            <Ionicons name="close" size={16} color={colori.testoSecondario} />
          </Pressable>
        </View>
      )}

      {senzaConnessione && (
        <View style={styles.bannerOffline}>
          <Ionicons name="cloud-offline-outline" size={16} color={colori.testoSecondario} />
          <Text style={styles.bannerOfflineTesto}>Senza connessione: stai vedendo gli ultimi risultati salvati.</Text>
        </View>
      )}

      {caricamento ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colori.blu} />
      ) : errore ? (
        <Text style={styles.messaggioErrore}>{errore}</Text>
      ) : (
        <FlatList
          data={risultati}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          refreshControl={<RefreshControl refreshing={aggiornamento} onRefresh={onRefresh} />}
          ListHeaderComponent={<Text style={styles.contatore}>{risultati.length} strutture</Text>}
          onEndReached={caricaAltre}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            caricandoAltre ? <ActivityIndicator style={{ marginVertical: 14 }} color={colori.blu} /> : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("Scheda", { struttura: item })}
            >
              <View style={styles.cardFoto}>
                {item.fotoUrl ? (
                  <Image source={{ uri: item.fotoUrl }} style={styles.cardImmagine} />
                ) : (
                  <Ionicons name="image-outline" size={22} color={colori.blu} />
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTipo}>{item.tipo}</Text>
                <Text style={styles.cardNome}>{item.nome}</Text>
                <Text style={styles.cardLocalita}>
                  {item.localita}
                  {item.distanzaKm != null ? ` · ${item.distanzaKm.toFixed(1)} km` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                {item.prezzo ? <Text style={styles.cardPrezzo}>{item.prezzo}€</Text> : null}
                {sipuoSalvare(item) && (
                  <Pressable onPress={() => onToggleFavorito(item)} hitSlop={8}>
                    <Ionicons
                      name={preferitiIds.has(item.idOriginale) ? "heart" : "heart-outline"}
                      size={16}
                      color={colori.rosso}
                    />
                  </Pressable>
                )}
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal
        visible={modalFiltriAperto}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalFiltriAperto(false)}
      >
        <SafeAreaView style={styles.modaleSchermo} edges={["top", "bottom"]}>
          <View style={styles.modaleIntestazione}>
            <Text style={styles.modaleTitolo}>Filtri</Text>
            <Pressable onPress={() => setModalFiltriAperto(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color={colori.testo} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 4 }}>
            {CATEGORIE_FILTRI_SERVIZI.map((categoria) => {
              const aperta = !!sezioniAperte[categoria.titolo];
              return (
                <View key={categoria.titolo} style={styles.sezioneFiltro}>
                  <Pressable style={styles.sezioneIntestazione} onPress={() => toggleSezione(categoria.titolo)}>
                    <Ionicons name={categoria.icona} size={17} color={colori.blu} />
                    <Text style={styles.sezioneTitoloModale}>{categoria.titolo}</Text>
                    <Ionicons name={aperta ? "chevron-up" : "chevron-down"} size={16} color={colori.testoSecondario} />
                  </Pressable>
                  {aperta &&
                    categoria.voci.map((voce) => {
                      const selezionato = filtriServizi.includes(voce.chiave);
                      return (
                        <Pressable
                          key={voce.chiave}
                          style={styles.rigaServizio}
                          onPress={() => toggleServizio(voce.chiave)}
                        >
                          <Text style={styles.rigaServizioTesto}>{voce.etichetta}</Text>
                          <Ionicons
                            name={selezionato ? "checkbox" : "square-outline"}
                            size={20}
                            color={selezionato ? colori.blu : colori.testoSecondario}
                          />
                        </Pressable>
                      );
                    })}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.modalePiede}>
            <Pressable
              style={styles.pulsanteCancella}
              onPress={() => setFiltriServizi([])}
              disabled={filtriServizi.length === 0}
            >
              <Text
                style={[
                  styles.pulsanteCancellaTesto,
                  filtriServizi.length === 0 && styles.pulsanteCancellaTestoDisattivo,
                ]}
              >
                Cancella
              </Text>
            </Pressable>
            <Pressable style={styles.pulsanteMostra} onPress={() => setModalFiltriAperto(false)}>
              <Text style={styles.pulsanteMostraTesto}>
                {filtriServizi.length === 0
                  ? "Chiudi"
                  : `Mostra ${risultati.length} struttur${risultati.length === 1 ? "a" : "e"}`}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: { paddingHorizontal: 20, paddingTop: 12, gap: 12, position: "relative", zIndex: 30 },
  ricercaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.bianco,
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 16,
  },
  inputRicerca: { flex: 1, fontSize: 13, color: colori.testo },
  tendina: {
    position: "absolute",
    top: 56,
    left: 20,
    right: 20,
    backgroundColor: colori.bianco,
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 31,
  },
  rigaTendina: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  rigaTendinaTesto: { flex: 1, fontSize: 12.5, fontWeight: "600", color: colori.testo },
  rigaTendinaEtichetta: { fontSize: 10, fontWeight: "700", color: colori.blu, textTransform: "uppercase" },
  tendinaIntestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  tendinaIntestazioneTesto: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colori.testoSecondario,
  },
  tendinaCancella: { fontSize: 11, fontWeight: "700", color: colori.blu },
  rigaFiltri: { flexDirection: "row", alignItems: "center", gap: 8 },
  filtri: { flexDirection: "row", gap: 8 },
  bottoneFiltriServizi: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bottoneFiltriServiziAttivo: { backgroundColor: colori.blu, borderColor: colori.blu },
  badgeFiltri: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colori.arancio,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeFiltriTesto: { color: colori.bianco, fontSize: 9, fontWeight: "800" },
  modaleSchermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  modaleIntestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colori.bianco,
    borderBottomWidth: 1,
    borderBottomColor: colori.bordo,
  },
  modaleTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo },
  sezioneFiltro: { backgroundColor: colori.bianco, borderRadius: 14, marginBottom: 10, overflow: "hidden" },
  sezioneIntestazione: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  sezioneTitoloModale: { flex: 1, fontSize: 13, fontWeight: "700", color: colori.testo },
  rigaServizio: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  rigaServizioTesto: { fontSize: 12.5, color: colori.testo },
  modalePiede: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    backgroundColor: colori.bianco,
    borderTopWidth: 1,
    borderTopColor: colori.bordo,
  },
  pulsanteCancella: { height: 46, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  pulsanteCancellaTesto: { fontSize: 13, fontWeight: "700", color: colori.testo },
  pulsanteCancellaTestoDisattivo: { color: colori.testoSecondario },
  pulsanteMostra: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
  },
  pulsanteMostraTesto: { color: colori.bianco, fontWeight: "800", fontSize: 13.5 },
  chip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: colori.bianco,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  chipAttivo: { backgroundColor: colori.blu, borderColor: colori.blu },
  chipTesto: { fontSize: 11.5, fontWeight: "600", color: colori.testoSecondario },
  chipTestoAttivo: { color: colori.bianco },
  vicinoAMe: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colori.blu,
    height: 44,
    borderRadius: 12,
  },
  vicinoAMeTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13.5 },
  contatore: { fontSize: 11, color: colori.testoSecondario, marginBottom: 4 },
  bannerHost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: colori.bluChiaro,
    borderRadius: 14,
  },
  bannerHostTitolo: { fontSize: 11.5, fontWeight: "700", color: colori.testo },
  bannerHostTesto: { fontSize: 10.5, color: colori.testoSecondario },
  bannerHostPulsante: {
    backgroundColor: colori.blu,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerHostPulsanteTesto: { color: colori.bianco, fontSize: 11, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colori.bianco,
    borderRadius: 14,
    padding: 10,
  },
  cardFoto: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 2 },
  cardTipo: { fontSize: 10, fontWeight: "700", color: colori.blu },
  cardNome: { fontSize: 13, fontWeight: "700", color: colori.testo },
  cardLocalita: { fontSize: 11, color: colori.testoSecondario },
  cardPrezzo: { fontSize: 13, fontWeight: "800", color: colori.testo },
  messaggioErrore: { textAlign: "center", marginTop: 40, color: colori.testoSecondario, paddingHorizontal: 30 },
  bannerOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  bannerOfflineTesto: { flex: 1, fontSize: 11.5, color: colori.testoSecondario, fontWeight: "600" },
});
