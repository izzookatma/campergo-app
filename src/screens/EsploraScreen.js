import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
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
import { colori, ombraCard, raggioCard } from "../theme/colors";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import { caricaStrutture, caricaStruttureVicine, cercaStrutture } from "../lib/strutture";
import { REGIONI_ITALIANE } from "../lib/regioni";
import { CATEGORIE_FILTRI_SERVIZI } from "../lib/filtriServizi";
import { caricaRicercheRecenti, salvaRicercaRecente, cancellaRicercheRecenti } from "../lib/ricercheRecenti";
import { salvaInCache, leggiDaCache } from "../lib/cacheOffline";
import ScheletroCard from "../components/ScheletroCard";
import { vibraLeggera, vibraConferma } from "../lib/vibrazione";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import RicercaIA from "../components/RicercaIA";
import BollinoPromo from "../components/BollinoPromo";
import { useAuth } from "../context/AuthContext";
import { caricaIdPreferiti, toggleFavorito, sipuoSalvare } from "../lib/preferiti";
import { distanzaKm } from "../lib/geo";
import SelettoreDate from "../components/SelettoreDate";
import { apertoNelPeriodo, etichettaData, numeroNotti } from "../lib/periodo";

const FILTRI = ["Tutti", "Campeggi", "Agriturismi", "Agricampeggi", "Aree sosta", "Camper service", "Rifugi", "Bivacchi"];
const STRUTTURE_PER_PAGINA = 60;

// Servizi che un camperista cerca per primi: mostrati come icone nella card
// (max 5, nell'ordine di importanza) così non serve aprire la scheda.
const SERVIZI_IN_CARD = [
  ["elettricita", "flash", "Corrente"],
  ["camperService", "color-fill", "Camper service"],
  ["caricoAcqua", "water", "Carico acqua"],
  ["docce", "rainy", "Docce"],
  ["wifi", "wifi", "Wi-Fi"],
  ["petFriendly", "paw", "Animali"],
  ["animaliAmmessi", "paw", "Animali"],
  ["piscina", "umbrella", "Piscina"],
];

function iconeServizi(servizi) {
  if (!servizi || servizi.length === 0) return [];
  const viste = new Set();
  const out = [];
  for (const [chiave, icona, etichetta] of SERVIZI_IN_CARD) {
    if (servizi.includes(chiave) && !viste.has(icona)) {
      viste.add(icona);
      out.push({ chiave, icona, etichetta });
    }
  }
  return out;
}

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
  // Arrivando dall'hub con un termine già digitato o con "Vicino a te ora"
  // già scelto: parte già impostato, senza dover rifare il tap qui.
  const [ricerca, setRicerca] = useState(() => route.params?.ricercaIniziale || "");
  const vicinoAMeIniziale = useRef(!!route.params?.vicinoAMeIniziale);
  const [posizione, setPosizione] = useState(null);
  const [cercandoPosizione, setCercandoPosizione] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [caricandoAltre, setCaricandoAltre] = useState(false);
  const [fineLista, setFineLista] = useState(false);
  // Arrivando dall'hub con un termine già scritto, la ricerca vera (su
  // tutto il database) deve scattare subito, non essere saltata come il
  // primo rendering normale: altrimenti resta il filtro lato client sulle
  // sole strutture già caricate per voto, che in molte regioni sono pochissime.
  const primoRendering = useRef(!route.params?.ricercaIniziale);
  const ricercaAttiva = ricerca.trim().length >= 2;
  const [inputAFocus, setInputAFocus] = useState(false);
  const [iaAperta, setIaAperta] = useState(false);
  // Arrivando dall'hub con servizi già riconosciuti dalla ricerca IA
  // (es. "piscina"): parte già impostato, come filtriTipo/ricerca sopra.
  const [filtriServizi, setFiltriServizi] = useState(() => route.params?.serviziIniziali || []);
  // Ordinamento e prezzo massimo: applicati sulle strutture già caricate
  // (i dati del database non hanno un ordine per prezzo/voto utilizzabile
  // in query: restano come ritocco della lista che si sta guardando).
  const [ordine, setOrdine] = useState("consigliati");
  // Date del soggiorno (dall'hub o scelte qui): tolgono le strutture
  // stagionali chiuse in quel periodo, come sul sito.
  const [dateSoggiorno, setDateSoggiorno] = useState(() => ({
    checkIn: route.params?.dateIniziali?.checkIn || null,
    checkOut: route.params?.dateIniziali?.checkOut || null,
  }));
  const [dateAperte, setDateAperte] = useState(false);
  const [prezzoMax, setPrezzoMax] = useState(null);
  const [modalFiltriAperto, setModalFiltriAperto] = useState(false);
  const [sezioniAperte, setSezioniAperte] = useState({ [CATEGORIE_FILTRI_SERVIZI[0].titolo]: true });
  const [ricercheRecenti, setRicercheRecenti] = useState([]);
  const [bannerHostVisibile, setBannerHostVisibile] = useState(false);
  const bannerHostMostrato = useRef(false);
  // Riga dei filtri: se il filtro attivo è fuori schermo (es. "Aree sosta"
  // arrivando dall'hub), la riga scorre fino a mostrarlo.
  const righeFiltriRef = useRef(null);
  const posizioniChip = useRef({});
  const scorrimentoChip = useRef({ x: 0, larghezza: 0 });

  const mostraChipAttivo = useCallback((nome) => {
    const pos = posizioniChip.current[nome];
    const { x, larghezza } = scorrimentoChip.current;
    if (!pos || !righeFiltriRef.current || larghezza === 0) return;
    if (pos.x < x || pos.x + pos.w > x + larghezza) {
      righeFiltriRef.current.scrollTo({ x: Math.max(0, pos.x - 12), animated: true });
    }
  }, []);

  useEffect(() => {
    if (filtriTipo.length > 0) mostraChipAttivo(filtriTipo[filtriTipo.length - 1]);
  }, [filtriTipo, mostraChipAttivo]);

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
          // Stesso schema della lista base: solo la versione senza filtri
          // va in cache, così c'è sempre qualcosa di ovvio da mostrare
          // offline (non il risultato di una combinazione di filtri).
          if (filtriServizi.length === 0 && filtriTipo.length === 0) salvaInCache("vicino_a_me", dati);
          setSenzaConnessione(false);
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
        if (posizione && filtriServizi.length === 0 && filtriTipo.length === 0) {
          const cache = await leggiDaCache("vicino_a_me");
          if (cache && !annullato) {
            setStrutture(cache.dati);
            setSenzaConnessione(true);
          }
        }
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

  // Arrivati qui con "Vicino a te ora" già scelto dall'hub: lo avvia una
  // sola volta all'apertura, non ad ogni rendering (il ref si azzera subito).
  useEffect(() => {
    if (vicinoAMeIniziale.current) {
      vicinoAMeIniziale.current = false;
      Promise.resolve().then(() => vicinoAMe());
    }
  }, []);

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

  const onRicercaIARichiedeAccesso = () => {
    Alert.alert("Accedi", "La ricerca con l'IA è gratuita per chi si registra. Accedi o registrati per usarla.", [
      { text: "Annulla", style: "cancel" },
      { text: "Accedi", onPress: () => navigation.navigate("Accedi") },
    ]);
  };

  const toggleServizio = (chiave) => {
    setFiltriServizi((prev) => (prev.includes(chiave) ? prev.filter((c) => c !== chiave) : [...prev, chiave]));
  };

  const toggleSezione = (titolo) => {
    setSezioniAperte((prev) => ({ ...prev, [titolo]: !prev[titolo] }));
  };

  const onToggleFavorito = async (struttura) => {
    vibraConferma();
    if (!session?.user?.id) {
      Alert.alert("Accedi", "Accedi al tuo account per salvare le strutture nei preferiti.", [
        { text: "Annulla", style: "cancel" },
        { text: "Accedi", onPress: () => navigation.navigate("Accedi") },
      ]);
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
    return passaFiltro && passaRicerca && apertoNelPeriodo(s, dateSoggiorno.checkIn, dateSoggiorno.checkOut);
  });

  if (posizione) {
    risultati = risultati
      .filter((s) => s.lat && s.lng)
      .map((s) => ({ ...s, distanzaKm: distanzaKm(posizione.lat, posizione.lng, s.lat, s.lng) }))
      .sort((a, b) => a.distanzaKm - b.distanzaKm);
  }

  if (prezzoMax != null) {
    risultati = risultati.filter((s) => s.prezzo != null && Number(s.prezzo) <= prezzoMax);
  }
  if (ordine === "prezzo") {
    // Senza prezzo indicato in fondo, non in cima come se costassero 0.
    risultati = [...risultati].sort((a, b) => (a.prezzo == null) - (b.prezzo == null) || Number(a.prezzo) - Number(b.prezzo));
  } else if (ordine === "valutazione") {
    risultati = [...risultati].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  } else if (ordine === "distanza" && posizione) {
    risultati = [...risultati].sort((a, b) => a.distanzaKm - b.distanzaKm);
  }

  // Il database ne ha migliaia ma ne carichiamo 60 per volta: finché ce ne
  // sono altre da caricare il numero è "almeno", non il totale.
  const altreDaCaricare = !fineLista && !posizione && !ricercaAttiva;
  const testoConteggio = `${risultati.length}${altreDaCaricare ? "+" : ""}`;
  const filtriAttiviNumero = filtriServizi.length + (prezzoMax != null ? 1 : 0);

  const scegliOrdine = () => {
    const opzioni = [
      { text: "Consigliati", onPress: () => setOrdine("consigliati") },
      { text: "Prezzo più basso", onPress: () => setOrdine("prezzo") },
      { text: "Valutazione migliore", onPress: () => setOrdine("valutazione") },
    ];
    Alert.alert("Ordina per", undefined, [...opzioni, { text: "Annulla", style: "cancel" }]);
  };
  const etichettaOrdine = { consigliati: "Consigliati", prezzo: "Prezzo più basso", valutazione: "Valutazione", distanza: "Distanza" }[ordine];

  const apriMappa = () => {
    navigation.getParent()?.navigate("Mappa", {
      screen: "MappaVista",
      params: { filtriTipo, filtriServizi, ricerca: ricerca.trim(), arrivo: Date.now() },
    });
  };

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
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Cerca zona, regione o struttura"
          />
          <Pressable
            onPress={vicinoAMe}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Strutture vicino a me"
            style={[styles.pillaVicino, posizione && styles.pillaVicinoAttivo]}
          >
            {cercandoPosizione ? (
              <ActivityIndicator color={colori.blu} size="small" />
            ) : (
              <Ionicons name="navigate" size={16} color={posizione ? colori.bianco : colori.blu} />
            )}
          </Pressable>
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.rigaTendinaTesto} numberOfLines={1}>
                    {s.nome}
                  </Text>
                  {s.localita ? (
                    <Text style={styles.rigaTendinaSottotitolo} numberOfLines={1}>
                      {s.localita}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {iaAperta && <RicercaIA onRisultato={onRicercaIA} loggato={!!session} onRichiedeAccesso={onRicercaIARichiedeAccesso} />}

        <View style={styles.rigaFiltri}>
          <ScrollView
            ref={righeFiltriRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtri}
            style={{ flex: 1 }}
            scrollEventThrottle={32}
            onScroll={(e) => {
              scorrimentoChip.current.x = e.nativeEvent.contentOffset.x;
            }}
            onLayout={(e) => {
              scorrimentoChip.current.larghezza = e.nativeEvent.layout.width;
              if (filtriTipo.length > 0) mostraChipAttivo(filtriTipo[filtriTipo.length - 1]);
            }}
          >
            {FILTRI.map((f) => {
              const attivo = f === "Tutti" ? filtriTipo.length === 0 : filtriTipo.includes(f);
              return (
                <Pressable
                  key={f}
                  onLayout={(e) => {
                    posizioniChip.current[f] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
                    if (filtriTipo.length > 0 && filtriTipo[filtriTipo.length - 1] === f) mostraChipAttivo(f);
                  }}
                  onPress={() => {
                    vibraLeggera();
                    return f === "Tutti"
                      ? setFiltriTipo([])
                      : setFiltriTipo((prev) => (prev.includes(f) ? prev.filter((t) => t !== f) : [...prev, f]));
                  }}
                  style={[styles.chip, attivo && styles.chipAttivo]}
                >
                  <Text style={[styles.chipTesto, attivo && styles.chipTestoAttivo]}>{f}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={[styles.bottoneIA, iaAperta && styles.bottoneFiltriServiziAttivo]}
            onPress={() => setIaAperta((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Cerca con l'intelligenza artificiale"
          >
            <Ionicons name="sparkles" size={15} color={iaAperta ? colori.bianco : colori.rosso} />
            <Text style={[styles.bottoneIATesto, iaAperta && { color: colori.bianco }]}>IA</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filtriAttiviNumero > 0 ? `Filtri, ${filtriAttiviNumero} attivi` : "Filtri"}
            style={[styles.bottoneFiltriServizi, filtriAttiviNumero > 0 && styles.bottoneFiltriServiziAttivo]}
            onPress={() => setModalFiltriAperto(true)}
          >
            <Ionicons name="options-outline" size={20} color={filtriAttiviNumero > 0 ? colori.bianco : colori.blu} />
            {filtriAttiviNumero > 0 && (
              <View style={styles.badgeFiltri}>
                <Text style={styles.badgeFiltriTesto}>{filtriAttiviNumero}</Text>
              </View>
            )}
          </Pressable>
        </View>

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
        <ScheletroCard />
      ) : errore ? (
        <Text style={styles.messaggioErrore}>{errore}</Text>
      ) : (
        <FlatList
          data={risultati}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
          refreshControl={<RefreshControl refreshing={aggiornamento} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <>
            <Pressable
              onPress={() => setDateAperte(true)}
              style={styles.pillDate}
              accessibilityRole="button"
              accessibilityLabel="Scegli le date del soggiorno"
            >
              <Ionicons name="calendar-outline" size={16} color={colori.blu} />
              <Text style={styles.pillDateTesto}>
                {dateSoggiorno.checkIn && dateSoggiorno.checkOut
                  ? `${etichettaData(dateSoggiorno.checkIn)} → ${etichettaData(dateSoggiorno.checkOut)} · ${numeroNotti(dateSoggiorno.checkIn, dateSoggiorno.checkOut)} notti`
                  : "Aggiungi le date del soggiorno"}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colori.testoSecondario} />
            </Pressable>
            <View style={styles.rigaContatore}>
              <Text style={styles.contatore}>{testoConteggio} strutture</Text>
              <Pressable
                onPress={scegliOrdine}
                hitSlop={10}
                style={styles.pulsanteOrdina}
                accessibilityRole="button"
                accessibilityLabel={`Ordina per, ora: ${etichettaOrdine}`}
              >
                <Ionicons name="swap-vertical" size={15} color={colori.blu} />
                <Text style={styles.pulsanteOrdinaTesto}>{etichettaOrdine}</Text>
              </Pressable>
            </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.vuoto}>
              <Ionicons name="search-outline" size={34} color={colori.testoSecondario} />
              <Text style={styles.vuotoTitolo}>Nessuna struttura trovata</Text>
              <Text style={styles.vuotoTesto}>Prova a togliere qualche filtro o a cercare un&apos;altra zona.</Text>
            </View>
          }
          onEndReached={caricaAltre}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            caricandoAltre ? <ActivityIndicator style={{ marginVertical: 14 }} color={colori.blu} /> : null
          }
          renderItem={({ item }) => {
            const servizi = iconeServizi(item.servizi);
            const visibili = servizi.slice(0, 4);
            const altri = servizi.length - visibili.length;
            return (
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate("Scheda", { struttura: item })}
                accessibilityRole="button"
                accessibilityLabel={`${item.tipo} ${item.nome}, ${item.localita || ""}${item.prezzo ? `, da ${item.prezzo} euro a notte` : ""}`}
              >
                <View style={styles.cardFoto}>
                  <ImmagineConRiserva uri={item.fotoUrl} larghezza={640} style={styles.cardImmagine} iconaColore={colori.blu} iconaDimensione={34} />
                  <View style={styles.cardBadgeTipo}>
                    <Text style={styles.cardBadgeTipoTesto}>{item.tipo}</Text>
                  </View>
                  {item.haPromoAttiva && <BollinoPromo style={styles.cardBollinoPromo} />}
                  {sipuoSalvare(item) && (
                    <Pressable
                      onPress={() => onToggleFavorito(item)}
                      hitSlop={6}
                      style={styles.cardCuore}
                      accessibilityRole="button"
                      accessibilityLabel={preferitiIds.has(item.idOriginale) ? "Togli dai preferiti" : "Salva nei preferiti"}
                    >
                      <Ionicons
                        name={preferitiIds.has(item.idOriginale) ? "heart" : "heart-outline"}
                        size={20}
                        color={colori.rosso}
                      />
                    </Pressable>
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardRigaTitolo}>
                    <Text style={styles.cardNome} numberOfLines={2}>
                      {item.nome}
                    </Text>
                    {item.rating ? (
                      <View style={styles.cardRatingRiga}>
                        <Ionicons name="star" size={13} color="#f59e0b" />
                        <Text style={styles.cardRatingTesto}>
                          {item.rating}
                          {item.recensioni ? ` (${item.recensioni})` : ""}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardLocalita} numberOfLines={1}>
                    {item.localita}
                    {item.distanzaKm != null ? ` · a ${item.distanzaKm.toFixed(1)} km` : ""}
                  </Text>
                  {visibili.length > 0 && (
                    <View style={styles.cardServizi}>
                      {visibili.map((sv) => (
                        <View key={sv.chiave} style={styles.cardServizioPill}>
                          <Ionicons name={sv.icona} size={12} color={colori.blu} />
                          <Text style={styles.cardServizioTesto}>{sv.etichetta}</Text>
                        </View>
                      ))}
                      {altri > 0 && <Text style={styles.cardServiziAltri}>+{altri}</Text>}
                    </View>
                  )}
                  {item.prezzo ? (
                    <Text style={styles.cardPrezzoRiga}>
                      da <Text style={styles.cardPrezzo}>{item.prezzo}€</Text> / notte
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <SelettoreDate
        key={`${dateSoggiorno.checkIn}-${dateSoggiorno.checkOut}-${dateAperte}`}
        visibile={dateAperte}
        checkIn={dateSoggiorno.checkIn}
        checkOut={dateSoggiorno.checkOut}
        onChiudi={() => setDateAperte(false)}
        onConferma={(d) => {
          setDateSoggiorno(d);
          setDateAperte(false);
        }}
      />
      {!caricamento && !errore && (
        <Pressable style={styles.bottoneMappa} onPress={apriMappa} accessibilityRole="button" accessibilityLabel="Mostra queste strutture sulla mappa">
          <Ionicons name="map" size={18} color={colori.bianco} />
          <Text style={styles.bottoneMappaTesto}>Mappa</Text>
        </Pressable>
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
            <View style={styles.sezioneFiltro}>
              <View style={styles.sezioneIntestazione}>
                <Ionicons name="swap-vertical" size={17} color={colori.blu} />
                <Text style={styles.sezioneTitoloModale}>Ordina per</Text>
              </View>
              <View style={styles.gruppoChip}>
                {[
                  ["consigliati", "Consigliati"],
                  ["prezzo", "Prezzo più basso"],
                  ["valutazione", "Valutazione"],
                ].map(([chiave, etichetta]) => (
                  <Pressable
                    key={chiave}
                    onPress={() => setOrdine(chiave)}
                    style={[styles.chipModale, ordine === chiave && styles.chipAttivo]}
                  >
                    <Text style={[styles.chipModaleTesto, ordine === chiave && styles.chipTestoAttivo]}>{etichetta}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.sezioneFiltro}>
              <View style={styles.sezioneIntestazione}>
                <Ionicons name="pricetag-outline" size={17} color={colori.blu} />
                <Text style={styles.sezioneTitoloModale}>Prezzo a notte</Text>
              </View>
              <View style={styles.gruppoChip}>
                {[
                  [null, "Qualsiasi"],
                  [20, "Fino a 20€"],
                  [35, "Fino a 35€"],
                  [50, "Fino a 50€"],
                  [80, "Fino a 80€"],
                ].map(([valore, etichetta]) => (
                  <Pressable
                    key={etichetta}
                    onPress={() => setPrezzoMax(valore)}
                    style={[styles.chipModale, prezzoMax === valore && styles.chipAttivo]}
                  >
                    <Text style={[styles.chipModaleTesto, prezzoMax === valore && styles.chipTestoAttivo]}>{etichetta}</Text>
                  </Pressable>
                ))}
              </View>
              {prezzoMax != null && (
                <Text style={styles.notaPrezzo}>Le strutture senza prezzo indicato (rifugi, aree sosta gratuite) non compaiono.</Text>
              )}
            </View>
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
              onPress={() => {
                setFiltriServizi([]);
                setPrezzoMax(null);
                setOrdine("consigliati");
              }}
              disabled={filtriAttiviNumero === 0 && ordine === "consigliati"}
            >
              <Text
                style={[
                  styles.pulsanteCancellaTesto,
                  filtriAttiviNumero === 0 && ordine === "consigliati" && styles.pulsanteCancellaTestoDisattivo,
                ]}
              >
                Cancella
              </Text>
            </Pressable>
            <Pressable style={styles.pulsanteMostra} onPress={() => setModalFiltriAperto(false)}>
              <Text style={styles.pulsanteMostraTesto}>
                {filtriAttiviNumero === 0
                  ? "Chiudi"
                  : `Mostra ${testoConteggio} struttur${risultati.length === 1 && !altreDaCaricare ? "a" : "e"}`}
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
  pillaVicino: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colori.bluChiaro },
  pillaVicinoAttivo: { backgroundColor: colori.blu },
  inputRicerca: { flex: 1, fontSize: 15, color: colori.testo },
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
  rigaTendinaSottotitolo: { fontSize: 10.5, color: colori.testoSecondario },
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
  bottoneIA: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  bottoneIATesto: { fontSize: 13, fontWeight: "800", color: colori.rosso },
  bottoneFiltriServizi: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  sezioneFiltro: {
    backgroundColor: colori.bianco,
    borderRadius: raggioCard,
    marginBottom: 10,
    ...ombraCard,
  },
  sezioneIntestazione: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  sezioneTitoloModale: { flex: 1, fontSize: 15, fontWeight: "700", color: colori.testo },
  rigaServizio: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  rigaServizioTesto: { fontSize: 14.5, color: colori.testo },
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
    height: 44,
    borderRadius: 22,
    backgroundColor: colori.bianco,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  chipAttivo: { backgroundColor: colori.blu, borderColor: colori.blu },
  chipTesto: { fontSize: 14, fontWeight: "600", color: colori.testoSecondario },
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
  contatore: { fontSize: 13.5, fontWeight: "600", color: colori.testoSecondario },
  rigaContatore: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4, minHeight: 36 },
  pillDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.bianco,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 10,
    ...ombraCard,
  },
  pillDateTesto: { flex: 1, fontSize: 14, fontWeight: "600", color: colori.testo },
  pulsanteOrdina: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 36, paddingLeft: 8 },
  pulsanteOrdinaTesto: { fontSize: 13.5, fontWeight: "700", color: colori.blu },
  vuoto: { alignItems: "center", gap: 8, paddingVertical: 50, paddingHorizontal: 20 },
  vuotoTitolo: { fontSize: 16, fontWeight: "800", color: colori.testo },
  vuotoTesto: { fontSize: 13.5, color: colori.testoSecondario, textAlign: "center" },
  bottoneMappa: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.testo,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bottoneMappaTesto: { color: colori.bianco, fontSize: 15, fontWeight: "800" },
  notaPrezzo: { fontSize: 12.5, color: colori.testoSecondario, paddingHorizontal: 14, paddingBottom: 14, marginTop: -6 },
  gruppoChip: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  chipModale: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colori.bordo,
    backgroundColor: colori.bianco,
    alignItems: "center",
    justifyContent: "center",
  },
  chipModaleTesto: { fontSize: 14, fontWeight: "600", color: colori.testo },
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
    backgroundColor: colori.bianco,
    borderRadius: 20,
    overflow: "hidden",
    ...ombraCard,
  },
  cardFoto: {
    width: "100%",
    height: 180,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardBadgeTipo: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardBadgeTipoTesto: { fontSize: 12, fontWeight: "800", color: colori.blu },
  cardBollinoPromo: { position: "absolute", bottom: 12, left: 12 },
  cardCuore: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { padding: 14, gap: 5 },
  cardRigaTitolo: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cardNome: { flex: 1, fontSize: 17, fontWeight: "800", color: colori.testo },
  cardLocalita: { fontSize: 14, color: colori.testoSecondario },
  cardRatingRiga: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardRatingTesto: { fontSize: 13.5, fontWeight: "700", color: colori.testo },
  cardServizi: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
  cardServizioPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colori.bluChiaro,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  cardServizioTesto: { fontSize: 12.5, fontWeight: "600", color: colori.blu },
  cardServiziAltri: { fontSize: 12.5, fontWeight: "700", color: colori.testoSecondario },
  cardPrezzoRiga: { fontSize: 14, color: colori.testoSecondario, marginTop: 4 },
  cardPrezzo: { fontSize: 18, fontWeight: "800", color: colori.testo },
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
