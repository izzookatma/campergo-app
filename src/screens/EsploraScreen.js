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
 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { caricaStrutture, caricaStruttureVicine, cercaStrutture } from "../lib/strutture";
import { REGIONI_ITALIANE } from "../lib/regioni";
import { CATEGORIE_FILTRI_SERVIZI, ETICHETTA_SERVIZIO } from "../lib/filtriServizi";
import { caricaRicercheRecenti, salvaRicercaRecente, cancellaRicercheRecenti } from "../lib/ricercheRecenti";
import { salvaInCache, leggiDaCache } from "../lib/cacheOffline";
import IconaFluttuante from "../components/ui/IconaFluttuante";
import ScheletroCard from "../components/ScheletroCard";
import { Molla, Comparsa } from "../components/ui/Molla";
import { vibraLeggera } from "../lib/vibrazione";
import { caricaPromoStrutture } from "../lib/offertePromo";
import Chip from "../components/ui/Chip";
import { vibraConferma } from "../lib/vibrazione";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import RicercaIA from "../components/RicercaIA";
import CardStruttura from "../components/esplora/CardStruttura";
import ModaleFiltriEsplora from "../components/esplora/ModaleFiltriEsplora";
import { useAuth } from "../context/AuthContext";
import { caricaIdPreferiti, toggleFavorito } from "../lib/preferiti";
import { distanzaKm } from "../lib/geo";
import SelettoreDate from "../components/SelettoreDate";
import { apertoNelPeriodo, etichettaData, numeroNotti } from "../lib/periodo";
import { useT } from "../i18n/i18n";
import { apriLink } from "../lib/linkEsterni";

const FILTRI = ["Tutti", "Campeggi", "Agriturismi", "Agricampeggi", "Aree sosta", "Camper service", "Rifugi", "Bivacchi"];
const STRUTTURE_PER_PAGINA = 60;

export default function EsploraScreen({ navigation, route }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
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
      const dati = await caricaStrutture({ limite: STRUTTURE_PER_PAGINA, pagina: 0, servizi: filtriServizi, tipi: filtriTipo, ordine, prezzoMax });
      setStrutture(dati);
      setPagina(0);
      setFineLista(dati.length < STRUTTURE_PER_PAGINA);
      setSenzaConnessione(false);
      setErrore(null);
      // Solo la lista di base (nessun filtro servizi/tipo), così la cache
      // ha sempre un senso ovvio da mostrare offline, non il risultato
      // di una combinazione di filtri che l'utente potrebbe non ricordare.
      if (filtriServizi.length === 0 && filtriTipo.length === 0 && prezzoMax == null && ordine !== "prezzo") salvaInCache("esplora_lista", dati);
    } catch (_e) {
      const cache = filtriServizi.length === 0 && filtriTipo.length === 0 && prezzoMax == null ? await leggiDaCache("esplora_lista") : null;
      if (cache) {
        setStrutture(cache.dati);
        setFineLista(true);
        setSenzaConnessione(true);
      } else {
        setErrore(t("esplora.erroreCaricamento"));
      }
    }
  }, [filtriServizi, filtriTipo, ordine, prezzoMax, t]);

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
          dati = await caricaStruttureVicine({ lat: posizione.lat, lng: posizione.lng, servizi: filtriServizi, tipi: filtriTipo, ordine, prezzoMax });
          // Stesso schema della lista base: solo la versione senza filtri
          // va in cache, così c'è sempre qualcosa di ovvio da mostrare
          // offline (non il risultato di una combinazione di filtri).
          if (filtriServizi.length === 0 && filtriTipo.length === 0) salvaInCache("vicino_a_me", dati);
          setSenzaConnessione(false);
        } else if (termine.length >= 2) {
          dati = await cercaStrutture({ termine, servizi: filtriServizi, tipi: filtriTipo, ordine, prezzoMax });
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
  }, [ricerca, filtriServizi, filtriTipo, ordine, prezzoMax, posizione, carica]);

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
      const dati = await caricaStrutture({ limite: STRUTTURE_PER_PAGINA, pagina: prossimaPagina, servizi: filtriServizi, tipi: filtriTipo, ordine, prezzoMax });
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
      Alert.alert(t("esplora.posizioneTitolo"), t("esplora.posizioneMessaggio"));
      return;
    }
    if (permesso.status !== "granted") {
      console.log("Permesso posizione negato:", permesso.status);
      Alert.alert(t("esplora.posizioneTitolo"), t("esplora.posizioneMessaggio"));
      return;
    }
    setCercandoPosizione(true);
    try {
      const posiz = await Location.getCurrentPositionAsync({});
      setPosizione({ lat: posiz.coords.latitude, lng: posiz.coords.longitude });
    } catch (e) {
      console.error("Errore nel trovare la posizione:", e);
      Alert.alert(t("esplora.posizioneErroreTitolo"), t("comune.riprovaTraPoco"));
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
    Alert.alert(t("accedi.titoloAccedi"), t("esplora.iaAccediMessaggio"), [
      { text: t("comune.annulla"), style: "cancel" },
      { text: t("accedi.titoloAccedi"), onPress: () => navigation.navigate("Accedi") },
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
      Alert.alert(t("accedi.titoloAccedi"), t("preferiti.accediMessaggio"), [
        { text: t("comune.annulla"), style: "cancel" },
        { text: t("accedi.titoloAccedi"), onPress: () => navigation.navigate("Accedi") },
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
    // Da 2 lettere in su la ricerca è già fatta dal server (nome, località,
    // zona, CAP, ambiente): rifiltrare qui per frase intera scartava risultati
    // validi. Il filtro locale resta solo per la prima lettera.
    const passaRicerca =
      ricercaAttiva ||
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
  // Prezzi scontati (barrato + nuovo) per le sole strutture con offerta attiva.
  const idsPromo = risultati
    .filter((r) => r.haPromoAttiva && r.origine === "campeggi_pubblici")
    .map((r) => r.idOriginale)
    .sort((a, b) => a - b)
    .join(",");
  const [promoPerStruttura, setPromoPerStruttura] = useState({});
  useEffect(() => {
    if (!idsPromo) return;
    caricaPromoStrutture(idsPromo.split(",").map(Number))
      .then((m) => setPromoPerStruttura((prev) => ({ ...prev, ...m })))
      .catch((e) => console.error("Errore nel caricare i prezzi scontati:", e));
  }, [idsPromo]);

  // In ricerca e «vicino a me» il server restituisce al massimo 100/150
  // schede: se si arriva al tetto il numero è «almeno», non il totale.
  const tettoRaggiunto = (ricercaAttiva && strutture.length >= 100) || (posizione && strutture.length >= 150);
  const testoConteggio = `${risultati.length}${altreDaCaricare || tettoRaggiunto ? "+" : ""}`;
  const filtriAttiviNumero = filtriServizi.length + (prezzoMax != null ? 1 : 0);

  // Nessuna scheda ha ancora un voto (verificato dal vivo: rating a zero su
  // tutto il database), quindi "per valutazione" non è proposto finché non ce
  // ne sono; "Vicino a te" compare solo con la posizione.
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
          <Ionicons name="search" size={16} color={c.testoSecondario} />
          <TextInput
            style={styles.inputRicerca}
            placeholder={t("esplora.placeholderRicerca")}
            placeholderTextColor={c.testoSecondario}
            value={ricerca}
            onChangeText={setRicerca}
            onFocus={() => setInputAFocus(true)}
            onBlur={() => setTimeout(() => setInputAFocus(false), 150)}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel={t("esplora.cercaAccessibilita")}
          />
          <Pressable
            onPress={vicinoAMe}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("esplora.vicinoAMeLabel")}
            style={[styles.pillaVicino, posizione && styles.pillaVicinoAttivo]}
          >
            {cercandoPosizione ? (
              <ActivityIndicator color={c.primario} size="small" />
            ) : (
              <Ionicons name="navigate" size={16} color={posizione ? c.sulPrimario : c.primario} />
            )}
          </Pressable>
        </View>

        {mostraTendina && (
          <View style={styles.tendina}>
            {mostraRicercheRecenti && (
              <>
                <View style={styles.tendinaIntestazione}>
                  <Text style={styles.tendinaIntestazioneTesto}>{t("esplora.ricercheRecenti")}</Text>
                  <Pressable
                    onPress={() => {
                      cancellaRicercheRecenti().then(setRicercheRecenti);
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.tendinaCancella}>{t("comune.cancella")}</Text>
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
                    <Ionicons name="time-outline" size={15} color={c.testoSecondario} />
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
                <Ionicons name="map-outline" size={15} color={c.primario} />
                <Text style={styles.rigaTendinaTesto}>{r}</Text>
                <Text style={styles.rigaTendinaEtichetta}>{t("esplora.regione")}</Text>
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
                <Ionicons name="business-outline" size={15} color={c.testoSecondario} />
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
                <Chip
                  key={f}
                  etichetta={f}
                  attivo={attivo}
                  onLayout={(e) => {
                    posizioniChip.current[f] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
                    if (filtriTipo.length > 0 && filtriTipo[filtriTipo.length - 1] === f) mostraChipAttivo(f);
                  }}
                  onPress={() =>
                    f === "Tutti"
                      ? setFiltriTipo([])
                      : setFiltriTipo((prev) => (prev.includes(f) ? prev.filter((t) => t !== f) : [...prev, f]))
                  }
                />
              );
            })}
          </ScrollView>

          <Pressable
            style={[styles.bottoneIA, iaAperta && styles.bottoneFiltriServiziAttivo]}
            onPress={() => setIaAperta((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={t("esplora.cercaIALabel")}
          >
            <Ionicons name="sparkles" size={15} color={iaAperta ? c.sulPrimario : c.pericolo} />
            <Text style={[styles.bottoneIATesto, iaAperta && { color: c.sulPrimario }]}>{t("esplora.iaBreve")}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filtriAttiviNumero > 0 ? t("esplora.filtriAttiviLabel", { n: filtriAttiviNumero }) : t("esplora.filtriLabel")}
            style={[styles.bottoneFiltriServizi, filtriAttiviNumero > 0 && styles.bottoneFiltriServiziAttivo]}
            onPress={() => setModalFiltriAperto(true)}
          >
            <Ionicons name="options-outline" size={20} color={filtriAttiviNumero > 0 ? c.sulPrimario : c.primario} />
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
          <Ionicons name="business-outline" size={20} color={c.primario} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.bannerHostTitolo}>{t("esplora.bannerHostTitolo")}</Text>
            <Text style={styles.bannerHostTesto}>{t("esplora.bannerHostTesto")}</Text>
          </View>
          <Pressable
            style={styles.bannerHostPulsante}
            onPress={() => apriLink("https://www.naturago.it/host?modo=registrati", t("comune.linkNonApribile"))}
          >
            <Text style={styles.bannerHostPulsanteTesto}>{t("comune.registrati")}</Text>
          </Pressable>
          <Pressable onPress={() => setBannerHostVisibile(false)} hitSlop={8}>
            <Ionicons name="close" size={16} color={c.testoSecondario} />
          </Pressable>
        </View>
      )}

      {senzaConnessione && (
        <View style={styles.bannerOffline}>
          <Ionicons name="cloud-offline-outline" size={16} color={c.testoSecondario} />
          <Text style={styles.bannerOfflineTesto}>{t("esplora.senzaConnessione")}</Text>
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
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
          refreshControl={<RefreshControl refreshing={aggiornamento} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <>
            <Pressable
              onPress={() => setDateAperte(true)}
              style={styles.pillDate}
              accessibilityRole="button"
              accessibilityLabel={t("esplora.sceglieDateLabel")}
            >
              <Ionicons name="calendar-outline" size={16} color={c.primario} />
              <Text style={styles.pillDateTesto}>
                {dateSoggiorno.checkIn && dateSoggiorno.checkOut
                  ? `${etichettaData(dateSoggiorno.checkIn)} → ${etichettaData(dateSoggiorno.checkOut)} · ${t("esplora.notti", { n: numeroNotti(dateSoggiorno.checkIn, dateSoggiorno.checkOut) })}`
                  : t("esplora.aggiungiDate")}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={c.testoSecondario} />
            </Pressable>
            {(filtriServizi.length > 0 || prezzoMax != null) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRiepilogo} style={{ marginBottom: 8 }}>
                {prezzoMax != null && (
                  <Pressable style={styles.chipFiltro} onPress={() => setPrezzoMax(null)} accessibilityRole="button" accessibilityLabel={`Togli prezzo massimo ${prezzoMax} euro`}>
                    <Text style={styles.chipFiltroTesto}>{`≤ ${prezzoMax}€`}</Text>
                    <Ionicons name="close-circle" size={16} color={c.primario} />
                  </Pressable>
                )}
                {filtriServizi.map((chiave) => (
                  <Pressable
                    key={chiave}
                    style={styles.chipFiltro}
                    onPress={() => setFiltriServizi((prev) => prev.filter((x) => x !== chiave))}
                    accessibilityRole="button"
                    accessibilityLabel={`Togli filtro ${ETICHETTA_SERVIZIO[chiave] || chiave}`}
                  >
                    <Text style={styles.chipFiltroTesto}>{ETICHETTA_SERVIZIO[chiave] || chiave}</Text>
                    <Ionicons name="close-circle" size={16} color={c.primario} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <View style={styles.rigaContatore}>
              <Text style={styles.contatore}>{t("esplora.struttureConteggio", { testo: testoConteggio })}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRiepilogo} style={{ marginBottom: 10 }}>
              {[
                { chiave: "consigliati", icona: "sparkles", testo: t("esplora.ordineConsigliati") },
                { chiave: "prezzo", icona: "pricetag", testo: t("esplora.ordinePrezzo") },
                ...(posizione ? [{ chiave: "distanza", icona: "navigate", testo: t("esplora.ordineDistanza") }] : []),
              ].map((o) => {
                const attivo = ordine === o.chiave;
                return (
                  <Molla
                    key={o.chiave}
                    scala={0.94}
                    style={[styles.chipOrdine, attivo && styles.chipOrdineAttivo]}
                    onPress={() => {
                      vibraLeggera();
                      setOrdine(o.chiave);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: attivo }}
                    accessibilityLabel={t("esplora.ordinaLabel", { etichetta: o.testo })}
                  >
                    <Ionicons name={o.icona} size={14} color={attivo ? c.sulPrimario : c.primario} />
                    <Text style={[styles.chipOrdineTesto, attivo && { color: c.sulPrimario }]}>{o.testo}</Text>
                  </Molla>
                );
              })}
            </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.vuoto}>
              <IconaFluttuante nome="search-outline" size={40} colore={c.testoSecondario} />
              <Text style={styles.vuotoTitolo}>{t("esplora.nessunaStrutturaTrovata")}</Text>
              <Text style={styles.vuotoTesto}>{t("esplora.provaTogliereFiltri")}</Text>
            </View>
          }
          onEndReached={caricaAltre}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            caricandoAltre ? <ActivityIndicator style={{ marginVertical: 14 }} color={c.primario} /> : null
          }
          renderItem={({ item, index }) => (
            <Comparsa ritardo={Math.min(index, 5) * 70}>
              <CardStruttura
                item={item}
                preferito={preferitiIds.has(item.idOriginale)}
                promo={item.haPromoAttiva ? promoPerStruttura[item.idOriginale] : null}
                onPress={() => navigation.navigate("Scheda", { struttura: item })}
                onToggleFavorito={() => onToggleFavorito(item)}
              />
            </Comparsa>
          )}
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
        <Pressable style={styles.bottoneMappa} onPress={() => {
            vibraLeggera();
            apriMappa();
          }} accessibilityRole="button" accessibilityLabel={t("esplora.mostraSuMappaLabel")}>
          <Ionicons name="map" size={18} color={c.sulPrimario} />
          <Text style={styles.bottoneMappaTesto}>{t("tab.mappa")}</Text>
        </Pressable>
      )}

      <ModaleFiltriEsplora
        visibile={modalFiltriAperto}
        onChiudi={() => setModalFiltriAperto(false)}
        ordine={ordine}
        onCambiaOrdine={setOrdine}
        prezzoMax={prezzoMax}
        onCambiaPrezzoMax={setPrezzoMax}
        categorieFiltri={CATEGORIE_FILTRI_SERVIZI}
        sezioniAperte={sezioniAperte}
        onToggleSezione={toggleSezione}
        filtriServizi={filtriServizi}
        onToggleServizio={toggleServizio}
        filtriAttiviNumero={filtriAttiviNumero}
        etichettaRisultati={t("esplora.struttureConteggio", { testo: testoConteggio })}
        onReset={() => {
          setFiltriServizi([]);
          setPrezzoMax(null);
          setOrdine("consigliati");
        }}
      />
    </SafeAreaView>
  );
}

function useEstili(c) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondo },
  intestazione: { paddingHorizontal: 20, paddingTop: 12, gap: 12, position: "relative", zIndex: 30 },
  ricercaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.sfondoGruppo,
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 16,
  },
  pillaVicino: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.primarioChiaro },
  pillaVicinoAttivo: { backgroundColor: c.primario },
  inputRicerca: { flex: 1, fontSize: 15, color: c.testo },
  tendina: {
    position: "absolute",
    top: 56,
    left: 20,
    right: 20,
    backgroundColor: c.sfondoGruppo,
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
  rigaTendinaTesto: { flex: 1, fontSize: 12.5, fontWeight: "600", color: c.testo },
  rigaTendinaSottotitolo: { fontSize: 10.5, color: c.testoSecondario },
  rigaTendinaEtichetta: { fontSize: 10, fontWeight: "700", color: c.primario, textTransform: "uppercase" },
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
    color: c.testoSecondario,
  },
  tendinaCancella: { fontSize: 11, fontWeight: "700", color: c.primario },
  rigaFiltri: { flexDirection: "row", alignItems: "center", gap: 8 },
  filtri: { flexDirection: "row", gap: 8 },
  bottoneIA: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: c.sfondoGruppo,
    borderWidth: 1,
    borderColor: c.separatore,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  bottoneIATesto: { fontSize: 13, fontWeight: "800", color: c.pericolo },
  bottoneFiltriServizi: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.sfondoGruppo,
    borderWidth: 1,
    borderColor: c.separatore,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bottoneFiltriServiziAttivo: { backgroundColor: c.primario, borderColor: c.primario },
  badgeFiltri: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.accento,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeFiltriTesto: { color: c.sulAccento, fontSize: 9, fontWeight: "800" },
  contatore: { fontSize: 13.5, fontWeight: "600", color: c.testoSecondario },
  rigaContatore: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4, minHeight: 36 },
  chipRiepilogo: { gap: 8, paddingRight: 8 },
  chipFiltro: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.primarioChiaro, borderRadius: 16, paddingLeft: 12, paddingRight: 8, paddingVertical: 7 },
  chipFiltroTesto: { fontSize: 13.5, fontWeight: "700", color: c.primario },
  pillDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.sfondoGruppo,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 10,
    ...ombra(c),
  },
  pillDateTesto: { flex: 1, fontSize: 14, fontWeight: "600", color: c.testo },
  pulsanteOrdina: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 36, paddingLeft: 8 },
  pulsanteOrdinaTesto: { fontSize: 13.5, fontWeight: "700", color: c.primario },
  vuoto: { alignItems: "center", gap: 8, paddingVertical: 50, paddingHorizontal: 20 },
  vuotoTitolo: { fontSize: 16, fontWeight: "800", color: c.testo },
  vuotoTesto: { fontSize: 13.5, color: c.testoSecondario, textAlign: "center" },
  bottoneMappa: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.testo,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  chipOrdine: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.primarioChiaro },
  chipOrdineAttivo: { backgroundColor: c.primario },
  chipOrdineTesto: { fontSize: 14, fontWeight: "700", color: c.primario },
  bottoneMappaTesto: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  bannerHost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: c.primarioChiaro,
    borderRadius: 14,
  },
  bannerHostTitolo: { fontSize: 11.5, fontWeight: "700", color: c.testo },
  bannerHostTesto: { fontSize: 10.5, color: c.testoSecondario },
  bannerHostPulsante: {
    backgroundColor: c.primario,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerHostPulsanteTesto: { color: c.sulPrimario, fontSize: 11, fontWeight: "700" },
  messaggioErrore: { textAlign: "center", marginTop: 40, color: c.testoSecondario, paddingHorizontal: 30 },
  bannerOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: c.sfondo,
  },
  bannerOfflineTesto: { flex: 1, fontSize: 11.5, color: c.testoSecondario, fontWeight: "600" },
  });
}
