import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MAPPA_VERA_NON_DISPONIBILE } from "../lib/mappaDisponibile";
import * as Location from "expo-location";
import Supercluster from "supercluster";
import { vibraLeggera } from "../lib/vibrazione";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { caricaTutteLePosizioni, cercaStrutture, STILE_PER_TIPO, STILE_DEFAULT } from "../lib/strutture";
import { caricaTutteLePosizioniCulturali, CATEGORIA_CULTURALE_META } from "../lib/cultura";
import { caricaTutteLePosizioniItinerari, CATEGORIA_ITINERARIO_META } from "../lib/itinerari";
import { salvaInCache, leggiDaCache } from "../lib/cacheOffline";
import { useAuth } from "../context/AuthContext";
import { REGIONI_ITALIANE } from "../lib/regioni";
import { caricaRicercheRecenti, salvaRicercaRecente, cancellaRicercheRecenti } from "../lib/ricercheRecenti";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import ModaleServizi from "../components/ModaleServizi";
import CreaPercorso from "../components/CreaPercorso";
import TendinaSuggerimentiMappa from "../components/mappa/TendinaSuggerimentiMappa";
import ModalePianoMappa from "../components/mappa/ModalePianoMappa";
import { distanzaKmPunti } from "../lib/percorsoStradale";
import AnteprimaMappa from "../components/mappa/AnteprimaMappa";
import { usePreferenze } from "../context/PreferenzeContext";
import { urlMappa } from "../lib/mappa";
import { apriLink } from "../lib/linkEsterni";
import { useT } from "../i18n/i18n";

// react-native-maps richiede moduli nativi non presenti in Expo Go: in attesa
// della build di sviluppo EAS si mostra il segnaposto per non far crashare
// l'app in Expo Go. Appena pronta la build, questo controllo diventa superfluo.
const DENTRO_EXPO_GO = MAPPA_VERA_NON_DISPONIBILE;

const REGIONE_ITALIA = {
  latitude: 42.5,
  longitude: 12.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

// Stesse etichette filtro di Esplora (src/screens/EsploraScreen.js), qui in
// più ogni tipo ha un'icona/colore per distinguere i segnaposto sulla mappa
// (prima erano tutti puntini rossi uguali).
const FILTRI = ["Tutti", "Campeggi", "Agriturismi", "Agricampeggi", "Aree sosta", "Camper service", "Rifugi", "Bivacchi"];

// Musei/borghi/attività: stessi colori/icone di CulturaScreen (CATEGORIA_CULTURALE_META
// in src/lib/cultura.js), "eventi" esclusi (legati a una data, non un posto fisso da
// segnare in mappa in modo stabile).
const CATEGORIE_CULTURA = Object.keys(CATEGORIA_CULTURALE_META).filter((k) => k !== "eventi");
const CATEGORIE_ITINERARIO = Object.keys(CATEGORIA_ITINERARIO_META);

// La barra di ricerca cerca per nome/zona (cercaStrutture), ma scrivendo
// "4x4", "sentieri", "musei"... non c'è un titolo che li contenga (i titoli
// dei percorsi sono nomi di luoghi, non la categoria): senza queste parole
// chiave digitare "4x4" non mostrava nulla, pur avendo 88 percorsi in mappa.
const PAROLE_CATEGORIA_CULTURA = {
  musei: "musei",
  museo: "musei",
  borghi: "borghi",
  borgo: "borghi",
  attività: "attivita",
  attivita: "attivita",
};
const PAROLE_CATEGORIA_ITINERARIO = {
  "4x4": "percorso_4x4",
  fuoristrada: "percorso_4x4",
  sterrate: "percorso_4x4",
  percorsi: "percorso_4x4",
  sentieri: "sentiero",
  sentiero: "sentiero",
  trekking: "sentiero",
  escursioni: "sentiero",
};

function voceAnteprima({ tipo, dato }, t) {
  if (tipo === "cultura") return { titolo: dato.titolo, sottotitolo: dato.citta, fotoUrl: dato.fotoUrl, etichetta: null };
  if (tipo === "itinerario") return { titolo: dato.titolo, sottotitolo: dato.regione, fotoUrl: dato.fotoUrl, etichetta: null };
  return { titolo: dato.nome, sottotitolo: dato.localita, fotoUrl: dato.fotoUrl, etichetta: dato.tipo };
}

function MappaPlaceholder() {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.sovrapposizioneStatica}>
        <MarchioNaturaGo />
        <View style={styles.ricercaPill}>
          <Ionicons name="search" size={15} color={c.testoSecondario} />
          <Text style={styles.placeholderRicerca}>{t("esplora.placeholderRicerca")}</Text>
        </View>
      </SafeAreaView>
      <View style={styles.centro}>
        <Ionicons name="map-outline" size={32} color="#93c5fd" />
        <Text style={styles.messaggioCentro}>{t("mappa.inArrivo")}</Text>
        <Text style={styles.messaggioCentroPiccolo}>{t("mappa.serveBuildSviluppo")}</Text>
      </View>
    </View>
  );
}

function MappaVera({ navigation, route }) {
  const { default: MapView, Marker, Polyline } = require("react-native-maps");
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  const { session } = useAuth();
  const mappaRef = useRef(null);
  const richiestaDefaultRef = useRef(0);
  const culturaVisibileRef = useRef([]);
  const itinerariVisibiliRef = useRef([]);
  const [strutture, setStrutture] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [termine, setTermine] = useState(() => route?.params?.ricerca || "");
  // Filtri di tipo/servizi: si impostano con i chip, con la Ricerca IA o
  // arrivando dal pulsante "Mappa" della lista (EsploraScreen).
  const [filtriTipoIA, setFiltriTipoIA] = useState(() => route?.params?.filtriTipo || []);
  const [filtriServiziIA, setFiltriServiziIA] = useState(() => route?.params?.filtriServizi || []);
  const [categorieCulturaAttive, setCategorieCulturaAttive] = useState([]);
  const [categorieItinerarioAttive, setCategorieItinerarioAttive] = useState([]);
  // La tab Mappa resta montata: i filtri in arrivo dalla lista vanno
  // riapplicati a ogni tocco (il contatore `arrivo` cambia ogni volta).
  const arrivoApplicato = useRef(route?.params?.arrivo);
  useEffect(() => {
    const p = route?.params;
    if (!p?.arrivo || p.arrivo === arrivoApplicato.current) return;
    arrivoApplicato.current = p.arrivo;
    Promise.resolve().then(() => {
      setFiltriTipoIA(p.filtriTipo || []);
      setCategorieCulturaAttive([]);
      setCategorieItinerarioAttive([]);
      setFiltriServiziIA(p.filtriServizi || []);
      setTermine(p.ricerca || "");
    });
  }, [route?.params]);
  const [cercando, setCercando] = useState(false);
  const [serviziAperti, setServiziAperti] = useState(false);
  const [senzaConnessione, setSenzaConnessione] = useState(false);
  const [inputAFocus, setInputAFocus] = useState(false);
  const [ricercheRecenti, setRicercheRecenti] = useState([]);
  const [cercandoPosizione, setCercandoPosizione] = useState(false);
  const [regione, setRegione] = useState(REGIONE_ITALIA);
  const [cultura, setCultura] = useState([]);
  const [itinerari, setItinerari] = useState([]);
  const { motoreMappa } = usePreferenze();
  // Segnaposto toccato: { tipo, dato } -> scheda anteprima in basso.
  const [selezionato, setSelezionato] = useState(null);
  // Segnaposto con tracksViewChanges attivo solo per un attimo dopo ogni cambio
  // (altrimenti Android li ridisegna di continuo e la mappa rallenta).
  const [tracciaMarker, setTracciaMarker] = useState(true);
  const seleziona = (tipo, dato) => {
    vibraLeggera();
    setSelezionato({ tipo, dato });
    mappaRef.current?.animateToRegion(
      {
        latitude: dato.lat - regione.latitudeDelta * 0.18,
        longitude: dato.lng,
        latitudeDelta: Math.min(regione.latitudeDelta, 0.5),
        longitudeDelta: Math.min(regione.longitudeDelta, 0.5),
      },
      350
    );
  };

  // "Creami un percorso": percorso stradale vero (tappe nominate + tappe
  // intermedie, src/lib/percorsoStradale.js) disegnato sopra la mappa già
  // filtrata - stessa idea del sito (src/App.jsx, CreaPercorsoMappa).
  const [routeTappe, setRouteTappe] = useState(null);
  const [routePercorso, setRoutePercorso] = useState(null);
  // km e minuti di guida veri (da OSRM, come sul sito); se mancano si usa la stima.
  const [routeDati, setRouteDati] = useState(null);
  const [routeRichiesta, setRouteRichiesta] = useState("");
  // Giorno per giorno (dove dormire + cosa visitare/sentieri nei
  // dintorni), mostrato in un modale appena pronto - stessa idea del sito,
  // dove "Creami un percorso" prima disegnava solo la strada senza
  // proporre nulla per le notti di un viaggio di più giorni.
  const [piano, setPiano] = useState(null);
  const [modalPianoAperto, setModalPianoAperto] = useState(false);

  useEffect(() => {
    if (!routePercorso) return;
    // Un solo luogo (punto ripetuto): si centra con uno zoom di zona, senza
    // stringere l'inquadratura su un punto solo.
    const primo = routePercorso[0];
    const ultimo = routePercorso[routePercorso.length - 1];
    if (primo.lat === ultimo.lat && primo.lng === ultimo.lng) {
      mappaRef.current?.animateToRegion({ latitude: primo.lat, longitude: primo.lng, latitudeDelta: 0.25, longitudeDelta: 0.25 }, 600);
      return;
    }
    mappaRef.current?.fitToCoordinates(
      routePercorso.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: { top: 100, right: 60, bottom: 160, left: 60 }, animated: true }
    );
  }, [routePercorso]);

  // Il percorso ha molti più punti di quanti servano per capire se una
  // struttura è "sulla strada": un campione (al massimo 300 punti) costa
  // molto meno a confrontare con centinaia di strutture caricate.
  const puntiPercorsoCampionati = useMemo(() => {
    if (!routePercorso) return null;
    const passo = Math.max(1, Math.ceil(routePercorso.length / 300));
    return routePercorso.filter((_, i) => i % passo === 0);
  }, [routePercorso]);

  // Lunghezza e tempo di guida: quelli veri della strada (OSRM, in auto) se
  // ci sono; altrimenti una stima dalla linea d'aria a 60 km/h (media
  // prudente da camper), e l'etichetta lo dice.
  const formattaTempo = (minuti) => {
    const ore = Math.floor(minuti / 60);
    return ore > 0 ? `${ore} h ${String(minuti % 60).padStart(2, "0")} min` : `${minuti} min`;
  };
  const riepilogoPercorso = useMemo(() => {
    if (!routePercorso || routePercorso.length < 2) return null;
    if (routeDati) return { km: routeDati.km, tempo: formattaTempo(routeDati.minuti), vero: true };
    let km = 0;
    for (let i = 1; i < routePercorso.length; i++) km += distanzaKmPunti(routePercorso[i - 1], routePercorso[i]);
    if (km < 1) return null; // un solo luogo: nessuna distanza da mostrare
    return { km: Math.round(km), tempo: formattaTempo(Math.round(km)), vero: false };
  }, [routePercorso, routeDati]);

  // Il tracciato si "disegna" da solo (in circa un secondo) invece di
  // comparire di colpo; a fine animazione si usa il percorso completo.
  const [passiTracciato, setPassiTracciato] = useState(0);
  useEffect(() => {
    if (!puntiPercorsoCampionati) return undefined;
    const n = puntiPercorsoCampionati.length;
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(n, i + Math.max(2, Math.ceil(n / 28)));
      setPassiTracciato(i);
      if (i >= n) clearInterval(id);
    }, 35);
    return () => clearInterval(id);
  }, [puntiPercorsoCampionati]);
  const tracciatoVisibile = useMemo(() => {
    if (!routePercorso || !puntiPercorsoCampionati) return null;
    const n = puntiPercorsoCampionati.length;
    const pezzo = passiTracciato >= n ? routePercorso : puntiPercorsoCampionati.slice(0, passiTracciato);
    return pezzo.length >= 2 ? pezzo.map((p) => ({ latitude: p.lat, longitude: p.lng })) : null;
  }, [routePercorso, puntiPercorsoCampionati, passiTracciato]);

  const RAGGIO_STRUTTURE_TOCCATE_KM = 6;
  // Strutture (tra quelle già mostrate/filtrate sulla mappa) che il
  // percorso attraversa, in ordine di incontro lungo la strada - non
  // cultura/itinerari, che non hanno una vera scheda da aprire e chiamare
  // qui come le strutture (Scheda, vedi sotto).
  const struttureToccateDalPercorso = useMemo(() => {
    if (!puntiPercorsoCampionati) return [];
    const trovate = [];
    for (const s of strutture) {
      let indiceMigliore = -1;
      for (let i = 0; i < puntiPercorsoCampionati.length; i++) {
        if (distanzaKmPunti({ lat: s.lat, lng: s.lng }, puntiPercorsoCampionati[i]) <= RAGGIO_STRUTTURE_TOCCATE_KM) {
          indiceMigliore = i;
          break;
        }
      }
      if (indiceMigliore !== -1) trovate.push({ ...s, _indicePercorso: indiceMigliore });
    }
    return trovate.sort((a, b) => a._indicePercorso - b._indicePercorso);
  }, [strutture, puntiPercorsoCampionati]);

  useEffect(() => {
    caricaRicercheRecenti().then(setRicercheRecenti);
  }, []);

  // Musei/borghi/attività e sentieri/percorsi 4x4: due livelli indipendenti
  // dalla ricerca testuale delle strutture sopra, caricati una sola volta e
  // filtrati solo dai chip qui sotto (niente nuove query a ogni tocco di un chip).
  useEffect(() => {
    caricaTutteLePosizioniCulturali()
      .then((dati) => {
        const conPosizione = dati.filter((c) => c.lat && c.lng);
        setCultura(conPosizione);
        salvaInCache("mappa_cultura", conPosizione);
      })
      .catch(async () => {
        const cache = await leggiDaCache("mappa_cultura");
        if (cache) setCultura(cache.dati);
      });
    caricaTutteLePosizioniItinerari()
      .then((dati) => {
        setItinerari(dati);
        salvaInCache("mappa_itinerari", dati);
      })
      .catch(async () => {
        const cache = await leggiDaCache("mappa_itinerari");
        if (cache) setItinerari(cache.dati);
      });
  }, []);

  const alternaCategoriaCultura = (categoria) => {
    setCategorieCulturaAttive((prev) =>
      prev.includes(categoria) ? prev.filter((c) => c !== categoria) : [...prev, categoria]
    );
  };

  const alternaCategoriaItinerario = (categoria) => {
    setCategorieItinerarioAttive((prev) =>
      prev.includes(categoria) ? prev.filter((c) => c !== categoria) : [...prev, categoria]
    );
  };

  // Cercando un testo che nomina una categoria ("4x4", "musei"...) si mostra
  // quella categoria per intero, a prescindere dai chip; cercando un nome di
  // luogo/zona invece si resta sui chip attivi e si guarda dentro titolo/città.
  const pulitoMinuscolo = termine.trim().toLowerCase();
  const categoriaCulturaCercata = PAROLE_CATEGORIA_CULTURA[pulitoMinuscolo];
  const categoriaItinerarioCercata = PAROLE_CATEGORIA_ITINERARIO[pulitoMinuscolo];

  // Un solo filtro per tutta la mappa: nessun chip scelto = "Tutti" (si vede
  // tutto); appena se ne sceglie uno si vedono SOLO le categorie scelte (prima
  // i chip Musei/Sentieri/Percorsi 4x4 partivano tutti accesi e toccarne uno
  // lo spegneva, lasciando in mappa le migliaia di strutture).
  const nessunaSelezione =
    filtriTipoIA.length === 0 && categorieCulturaAttive.length === 0 && categorieItinerarioAttive.length === 0;

  const culturaVisibile = useMemo(() => {
    if (categoriaCulturaCercata) return cultura.filter((c) => c.categoria === categoriaCulturaCercata);
    const base = filtriServiziIA.length > 0 ? [] : nessunaSelezione ? cultura : cultura.filter((c) => categorieCulturaAttive.includes(c.categoria));
    if (pulitoMinuscolo.length < 2) return base;
    return base.filter(
      (c) =>
        c.titolo?.toLowerCase().includes(pulitoMinuscolo) ||
        c.citta?.toLowerCase().includes(pulitoMinuscolo) ||
        c.regione?.toLowerCase().includes(pulitoMinuscolo)
    );
  }, [cultura, categorieCulturaAttive, nessunaSelezione, filtriServiziIA, pulitoMinuscolo, categoriaCulturaCercata]);

  const itinerariVisibili = useMemo(() => {
    if (categoriaItinerarioCercata) return itinerari.filter((it) => it.categoria === categoriaItinerarioCercata);
    const base = filtriServiziIA.length > 0 ? [] : nessunaSelezione ? itinerari : itinerari.filter((it) => categorieItinerarioAttive.includes(it.categoria));
    if (pulitoMinuscolo.length < 2) return base;
    return base.filter(
      (it) => it.titolo?.toLowerCase().includes(pulitoMinuscolo) || it.regione?.toLowerCase().includes(pulitoMinuscolo)
    );
  }, [itinerari, categorieItinerarioAttive, nessunaSelezione, filtriServiziIA, pulitoMinuscolo, categoriaItinerarioCercata]);
  useEffect(() => {
    culturaVisibileRef.current = culturaVisibile;
    itinerariVisibiliRef.current = itinerariVisibili;
  }, [culturaVisibile, itinerariVisibili]);

  // Tutte le schede con coordinate (eventualmente filtrate per tipo/servizi),
  // non solo le "migliori" N per punteggio: a differenza di Esplora qui serve
  // copertura geografica completa, altrimenti zone intere (Lago di Garda,
  // riviera adriatica...) restavano vuote pur avendo schede nel database. I
  // tanti segnaposto si raggruppano poi in cluster qui sotto (supercluster),
  // altrimenti sarebbero migliaia di puntini illeggibili e lenti da disegnare.
  const caricaDefault = (tipi, servizi) => {
    setCaricamento(true);
    // Solo l'ultima richiesta vale: una risposta lenta non deve sovrascrivere
    // una più recente (cambio filtro, ricerca svuotata...).
    const numero = ++richiestaDefaultRef.current;
    caricaTutteLePosizioni({ tipi, servizi })
      .then((dati) => {
        if (numero !== richiestaDefaultRef.current) return;
        const conPosizione = dati.filter((s) => s.lat && s.lng);
        setStrutture(conPosizione);
        setSenzaConnessione(false);
        salvaInCache("mappa_strutture", conPosizione);
      })
      .catch(async () => {
        if (numero !== richiestaDefaultRef.current) return;
        const cache = await leggiDaCache("mappa_strutture");
        if (cache) {
          setStrutture(cache.dati);
          setSenzaConnessione(true);
        }
      })
      .finally(() => {
        if (numero === richiestaDefaultRef.current) setCaricamento(false);
      });
  };

  // Ricerca per zona/regione/struttura su tutto il database (stessa
  // `cercaStrutture` già usata in Esplora): senza testo (o con un solo
  // carattere, non ancora una ricerca vera) si torna alla copertura
  // geografica completa sopra, con gli stessi filtri tipo/servizi impostabili
  // anche dalla Ricerca IA qui sotto, senza passare dal testo. Svuotare il
  // campo (anche a mano, lettera per lettera, non solo con la ×) deve far
  // tornare subito l'elenco di partenza, non restare bloccato sull'ultima
  // ricerca.
  useEffect(() => {
    const pulito = termine.trim();
    if (pulito.length < 2) {
      Promise.resolve().then(() => caricaDefault(filtriTipoIA, filtriServiziIA));
      return;
    }
    let annullato = false;
    Promise.resolve().then(() => {
      if (!annullato) setCercando(true);
    });
    const scaduto = setTimeout(() => {
      cercaStrutture({ termine: pulito, tipi: filtriTipoIA, servizi: filtriServiziIA })
        .then((dati) => {
          if (annullato) return;
          salvaRicercaRecente(pulito).then(setRicercheRecenti);
          const conPosizione = dati.filter((s) => s.lat && s.lng);
          setStrutture(conPosizione);
          // Inquadra anche musei/borghi/attività e sentieri/percorsi trovati dalla
          // stessa ricerca (già filtrati sopra, culturaVisibile/itinerariVisibili
          // dipendono dallo stesso testo), non solo le strutture.
          const daInquadrare = [...conPosizione, ...culturaVisibileRef.current, ...itinerariVisibiliRef.current];
          if (daInquadrare.length > 0) {
            mappaRef.current?.fitToCoordinates(
              daInquadrare.map((p) => ({ latitude: p.lat, longitude: p.lng })),
              { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true }
            );
          }
        })
        .catch(() => {})
        .finally(() => setCercando(false));
    }, 400);
    return () => {
      annullato = true;
      clearTimeout(scaduto);
    };
    // culturaVisibile/itinerariVisibili si leggono dai ref: toccare un chip
    // cultura/itinerari non deve riscaricare tutte le strutture.
  }, [termine, filtriTipoIA, filtriServiziIA]);

  // Strutture, cultura e itinerari condividono lo stesso clustering: chiavi
  // diverse ("s-"/"c-"/"i-") perché gli id vengono da tabelle diverse e
  // possono coincidere come numero.
  // Con un chip di sola cultura/itinerari (o una parola-categoria cercata,
  // es. "4x4") le strutture non vanno mostrate.
  const struttureMostrate = useMemo(() => {
    if (categoriaCulturaCercata || categoriaItinerarioCercata) return [];
    if (!nessunaSelezione && filtriTipoIA.length === 0) return [];
    return strutture;
  }, [strutture, nessunaSelezione, filtriTipoIA, categoriaCulturaCercata, categoriaItinerarioCercata]);

  const puntiById = useMemo(() => {
    const m = new Map();
    struttureMostrate.forEach((s) => m.set(`s-${s.id}`, { tipo: "struttura", dato: s }));
    culturaVisibile.forEach((c) => m.set(`c-${c.id}`, { tipo: "cultura", dato: c }));
    itinerariVisibili.forEach((it) => m.set(`i-${it.id}`, { tipo: "itinerario", dato: it }));
    return m;
  }, [struttureMostrate, culturaVisibile, itinerariVisibili]);

  // Indice per il clustering: ricalcolato solo quando cambia l'elenco di
  // schede, non a ogni spostamento della mappa (vedi `cluster` sotto, che
  // invece dipende anche da `regione`).
  // Raggio alzato da 50 a 80: con tutti e tre i livelli (strutture, cultura,
  // itinerari) visibili insieme sull'Italia intera, un raggio troppo stretto
  // lasciava tanti cluster piccoli e vicini che si sovrapponevano tra loro e
  // con la barra dei filtri sopra - segnalato dal vivo.
  const indiceCluster = useMemo(() => {
    const sc = new Supercluster({ radius: 80, maxZoom: 16 });
    sc.load(
      Array.from(puntiById.entries()).map(([chiave, voce]) => ({
        type: "Feature",
        properties: { chiave },
        geometry: { type: "Point", coordinates: [voce.dato.lng, voce.dato.lat] },
      }))
    );
    return sc;
  }, [puntiById]);

  const cluster = useMemo(() => {
    // `floor`, non `round`: arrotondare per eccesso sovrastimava lo zoom e
    // supercluster accorpava meno di quanto lo schermo potesse mostrare
    // pulito, lasciando cluster vicini non uniti (vedi raggio sopra).
    const zoom = Math.max(0, Math.min(20, Math.floor(Math.log2(360 / regione.longitudeDelta))));
    const bbox = [
      regione.longitude - regione.longitudeDelta,
      regione.latitude - regione.latitudeDelta,
      regione.longitude + regione.longitudeDelta,
      regione.latitude + regione.latitudeDelta,
    ];
    return indiceCluster.getClusters(bbox, zoom);
  }, [indiceCluster, regione]);

  useEffect(() => {
    Promise.resolve().then(() => setTracciaMarker(true));
    const id = setTimeout(() => setTracciaMarker(false), 700);
    return () => clearTimeout(id);
  }, [cluster, selezionato]);

  const vaiAlCluster = (cl) => {
    const [lng, lat] = cl.geometry.coordinates;
    const zoomEspanso = indiceCluster.getClusterExpansionZoom(cl.id);
    const delta = Math.min(regione.longitudeDelta, 360 / Math.pow(2, zoomEspanso));
    mappaRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta },
      400
    );
  };

  const svuotaRicerca = () => {
    setTermine("");
    setFiltriTipoIA([]);
    setCategorieCulturaAttive([]);
    setCategorieItinerarioAttive([]);
    setFiltriServiziIA([]);
  };

  const vaiVicinoAMe = async () => {
    let permesso;
    try {
      permesso = await Location.requestForegroundPermissionsAsync();
    } catch (e) {
      console.error("Permesso posizione:", e);
      Alert.alert(t("esplora.posizioneTitolo"), t("mappa.posizioneMessaggio"));
      return;
    }
    if (permesso.status !== "granted") {
      Alert.alert(t("esplora.posizioneTitolo"), t("mappa.posizioneMessaggio"));
      return;
    }
    setCercandoPosizione(true);
    try {
      const posiz = await Location.getCurrentPositionAsync({});
      mappaRef.current?.animateToRegion(
        { latitude: posiz.coords.latitude, longitude: posiz.coords.longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 },
        600
      );
    } catch (e) {
      console.error("Errore nel trovare la posizione:", e);
      Alert.alert(t("esplora.posizioneErroreTitolo"), t("comune.riprovaTraPoco"));
    } finally {
      setCercandoPosizione(false);
    }
  };

  const onRicercaIARichiedeAccesso = () => {
    Alert.alert(t("accedi.titoloAccedi"), t("esplora.iaAccediMessaggio"), [
      { text: t("comune.annulla"), style: "cancel" },
      { text: t("accedi.titoloAccedi"), onPress: () => navigation.navigate("Accedi") },
    ]);
  };

  // Chip di filtro manuali: stesso stato filtriTipoIA, usato dalla query sopra.
  const alternaFiltroTipo = (f) => {
    if (f === "Tutti") {
      setFiltriTipoIA([]);
      setCategorieCulturaAttive([]);
      setCategorieItinerarioAttive([]);
      return;
    }
    setFiltriTipoIA((prev) => (prev.includes(f) ? prev.filter((t) => t !== f) : [...prev, f]));
  };

  // Stessi suggerimenti "mentre si digita" di Esplora: regioni da un
  // elenco fisso e strutture tra quelle già caricate sulla mappa (nessuna
  // query in più, qui serve solo a centrare la mappa più in fretta).
  const termineSuggerimenti = termine.trim().toLowerCase();
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
    <View style={styles.schermo}>
      {/* Niente selettore Google/Apple: Google Maps non ha mai avuto una
          vera chiave configurata (solo il segnaposto nativo, non la mappa
          vera), e cambiare "provider" su una MapView già montata mandava in
          crash l'app — segnalato dal vivo. Resta solo Apple Maps, l'unica
          che funzionava davvero. */}
      {/* I segnaposto hanno stopPropagation: su iPhone il tocco su un
          segnaposto arrivava ANCHE alla mappa, il cui onPress azzera la
          selezione un istante dopo averla fatta, e l'anteprima non
          compariva mai. */}
      <MapView
        ref={mappaRef}
        style={styles.mappa}
        initialRegion={REGIONE_ITALIA}
        onRegionChangeComplete={setRegione}
        showsUserLocation
        onPress={() => setSelezionato(null)}
      >
        {tracciatoVisibile && (
          <>
            <Polyline coordinates={tracciatoVisibile} strokeColor="#FFFFFF" strokeWidth={9} lineCap="round" lineJoin="round" />
            <Polyline coordinates={tracciatoVisibile} strokeColor="#C1663A" strokeWidth={5} lineCap="round" lineJoin="round" />
          </>
        )}
        {routeTappe &&
          routeTappe.map((tp, i) => (
            <Marker key={`tappa-${i}`} coordinate={{ latitude: tp.lat, longitude: tp.lng }} title={tp.nome} tracksViewChanges={tracciaMarker}>
              <View style={styles.pinTappa}>
                <Text style={styles.pinTappaTesto}>{i + 1}</Text>
              </View>
            </Marker>
          ))}

        {cluster.map((c) => {
          const [lng, lat] = c.geometry.coordinates;
          if (c.properties.cluster) {
            return (
              <Marker
                key={`cluster-${c.id}`}
                coordinate={{ latitude: lat, longitude: lng }}
                stopPropagation
                tracksViewChanges={tracciaMarker}
                onPress={() => vaiAlCluster(c)}
              >
                <View style={[styles.cluster, misuraCluster(c.properties.point_count)]}>
                  <Text style={styles.clusterTesto} numberOfLines={1} adjustsFontSizeToFit>
                    {c.properties.point_count}
                  </Text>
                </View>
              </Marker>
            );
          }
          const punto = puntiById.get(c.properties.chiave);
          if (!punto) return null;
          if (punto.tipo === "cultura") {
            const voce = punto.dato;
            const meta = CATEGORIA_CULTURALE_META[voce.categoria] || STILE_DEFAULT;
            return (
              <Marker
                key={`c-${voce.id}`}
                coordinate={{ latitude: voce.lat, longitude: voce.lng }}
                stopPropagation
                tracksViewChanges={tracciaMarker}
                onPress={() => seleziona("cultura", voce)}
              >
                <View style={[styles.segnaposto, { backgroundColor: meta.colore }]}>
                  <Ionicons name={meta.icona} size={18} color={"#FFFFFF"} />
                </View>
              </Marker>
            );
          }
          if (punto.tipo === "itinerario") {
            const it = punto.dato;
            const meta = CATEGORIA_ITINERARIO_META[it.categoria] || STILE_DEFAULT;
            return (
              <Marker
                key={`i-${it.id}`}
                coordinate={{ latitude: it.lat, longitude: it.lng }}
                stopPropagation
                tracksViewChanges={tracciaMarker}
                onPress={() => seleziona("itinerario", it)}
              >
                <View style={[styles.segnaposto, { backgroundColor: meta.colore }]}>
                  <Ionicons name={meta.icona} size={18} color={"#FFFFFF"} />
                </View>
              </Marker>
            );
          }
          const s = punto.dato;
          const stile = STILE_PER_TIPO[s.tipo] || STILE_DEFAULT;
          return (
            <Marker
              key={`s-${s.id}`}
              coordinate={{ latitude: s.lat, longitude: s.lng }}
              stopPropagation
              tracksViewChanges={tracciaMarker}
              onPress={() => seleziona("struttura", s)}
            >
              <View style={[styles.segnaposto, { backgroundColor: stile.colore }, selezionato?.dato === s && styles.segnapostoSelezionato]}>
                <Ionicons name={stile.icona} size={18} color={"#FFFFFF"} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView edges={["top"]} style={styles.sovrapposizione} pointerEvents="box-none">
        <MarchioNaturaGo />
        <View style={styles.contenitoreRicerca}>
          <View style={styles.ricercaPill}>
            <Ionicons name="search" size={15} color={c.testoSecondario} />
            <TextInput
              style={styles.ricercaInput}
              placeholder={t("esplora.placeholderRicerca")}
              placeholderTextColor={c.testoSecondario}
              value={termine}
              onChangeText={setTermine}
              onFocus={() => setInputAFocus(true)}
              onBlur={() => setTimeout(() => setInputAFocus(false), 150)}
            />
            {cercando ? (
              <ActivityIndicator size="small" color={c.primario} />
            ) : termine ? (
              <Pressable onPress={svuotaRicerca} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={c.testoSecondario} />
              </Pressable>
            ) : null}
          </View>

          {mostraTendina && (
            <TendinaSuggerimentiMappa
              mostraRicercheRecenti={mostraRicercheRecenti}
              ricercheRecenti={ricercheRecenti}
              onCancellaRicerche={() => cancellaRicercheRecenti().then(setRicercheRecenti)}
              onScegliTermine={setTermine}
              regioniSuggerite={regioniSuggerite}
              onScegliRegione={setTermine}
              struttureSuggerite={struttureSuggerite}
              onScegliStruttura={(s) => {
                setInputAFocus(false);
                navigation.navigate("Scheda", { struttura: s });
              }}
            />
          )}
        </View>

        <CreaPercorso
          loggato={!!session}
          attivo={!!routePercorso}
          onPercorso={({ tappe, percorso, piano: pianoGenerato, richiesta, distanzaKm, minuti }) => {
            setRouteRichiesta(richiesta || "");
            setRouteTappe(tappe);
            setRoutePercorso(percorso);
            setRouteDati(distanzaKm != null && minuti != null ? { km: Math.round(distanzaKm), minuti } : null);
            setPiano(pianoGenerato);
            setModalPianoAperto(!!pianoGenerato?.giorni?.length);
          }}
          onReset={() => {
            setRouteTappe(null);
            setRoutePercorso(null);
            setRouteDati(null);
            setPiano(null);
            setModalPianoAperto(false);
          }}
          onRichiedeAccesso={onRicercaIARichiedeAccesso}
        />

        {!!piano?.giorni?.length && !modalPianoAperto && (
          <Pressable style={styles.pillPiano} onPress={() => setModalPianoAperto(true)}>
            <Ionicons name="calendar-outline" size={14} color={c.primario} />
            <Text style={styles.pillPianoTesto}>{t("mappa.vediIlPiano")}</Text>
          </Pressable>
        )}

        <View style={styles.rigaFiltri}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtri} style={{ flex: 1 }}>
            {FILTRI.map((f) => {
              const attivo = f === "Tutti" ? nessunaSelezione : filtriTipoIA.includes(f);
              return (
                <Pressable key={f} onPress={() => alternaFiltroTipo(f)} style={[styles.chip, attivo && styles.chipAttivo]}>
                  <Text style={[styles.chipTesto, attivo && styles.chipTestoAttivo]}>{f}</Text>
                </Pressable>
              );
            })}
            {CATEGORIE_CULTURA.map((cat) => {
              const meta = CATEGORIA_CULTURALE_META[cat];
              const attivo = categorieCulturaAttive.includes(cat);
              return (
                <Pressable
                  key={cat}
                  onPress={() => alternaCategoriaCultura(cat)}
                  style={[styles.chip, styles.chipConIcona, attivo && { backgroundColor: meta.colore, borderColor: meta.colore }]}
                >
                  <Ionicons name={meta.icona} size={12} color={attivo ? "#FFFFFF" : meta.colore} />
                  <Text style={[styles.chipTesto, attivo && styles.chipTestoAttivo]}>{meta.etichetta}</Text>
                </Pressable>
              );
            })}
            {CATEGORIE_ITINERARIO.map((cat) => {
              const meta = CATEGORIA_ITINERARIO_META[cat];
              const attivo = categorieItinerarioAttive.includes(cat);
              return (
                <Pressable
                  key={cat}
                  onPress={() => alternaCategoriaItinerario(cat)}
                  style={[styles.chip, styles.chipConIcona, attivo && { backgroundColor: meta.colore, borderColor: meta.colore }]}
                >
                  <Ionicons name={meta.icona} size={12} color={attivo ? "#FFFFFF" : meta.colore} />
                  <Text style={[styles.chipTesto, attivo && styles.chipTestoAttivo]}>{meta.etichetta}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filtriServiziIA.length > 0 ? t("mappa.filtriServiziAttivi", { n: filtriServiziIA.length }) : t("mappa.filtriServizi")}
            style={[styles.bottoneServizi, filtriServiziIA.length > 0 && styles.bottoneServiziAttivo]}
            onPress={() => setServiziAperti(true)}
          >
            <Ionicons name="options-outline" size={18} color={filtriServiziIA.length > 0 ? c.sulPrimario : c.primario} />
            {filtriServiziIA.length > 0 && <Text style={styles.bottoneServiziNumero}>{filtriServiziIA.length}</Text>}
          </Pressable>
        </View>

        <ModaleServizi
          visibile={serviziAperti}
          selezionati={filtriServiziIA}
          onCambia={setFiltriServiziIA}
          onChiudi={() => setServiziAperti(false)}
        />

        {senzaConnessione && (
          <View style={styles.bannerOffline}>
            <Ionicons name="cloud-offline-outline" size={14} color={c.testoSecondario} />
            <Text style={styles.bannerOfflineTesto}>{t("esplora.senzaConnessione")}</Text>
          </View>
        )}
      </SafeAreaView>

      {caricamento && (
        <View style={styles.caricamentoBadge} pointerEvents="none">
          <ActivityIndicator color={c.primario} size="small" />
        </View>
      )}

      <Pressable style={styles.pulsanteVicinoAMe} onPress={vaiVicinoAMe} disabled={cercandoPosizione}>
        {cercandoPosizione ? (
          <ActivityIndicator color={c.primario} size="small" />
        ) : (
          <Ionicons name="locate" size={20} color={c.primario} />
        )}
      </Pressable>

      {routePercorso && (
        <SafeAreaView edges={["bottom"]} style={styles.strisciaPercorso} pointerEvents="box-none">
          {riepilogoPercorso && (
            <View style={styles.riepilogoPercorso}>
              <Ionicons name="trail-sign" size={16} color="#FFFFFF" />
              <Text style={styles.riepilogoPercorsoTesto}>
                {t(riepilogoPercorso.vero ? "mappa.percorsoVero" : "mappa.stimaPercorso", { km: riepilogoPercorso.km, tempo: riepilogoPercorso.tempo })}
              </Text>
            </View>
          )}
          {struttureToccateDalPercorso.length === 0 ? (
            <View style={styles.strutturaPercorsoVuota}>
              <Text style={styles.strutturaPercorsoVuotaTesto}>{t("mappa.nessunaStrutturaSulPercorso")}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strisciaPercorsoContenuto}>
              {struttureToccateDalPercorso.map((s) => (
                <Pressable
                  key={`${s.tipo}-${s.id}`}
                  style={styles.cardStrutturaPercorso}
                  onPress={() => navigation.navigate("Scheda", { struttura: s })}
                >
                  <Text style={styles.cardStrutturaPercorsoNome} numberOfLines={1}>
                    {s.nome}
                  </Text>
                  {s.localita ? (
                    <Text style={styles.cardStrutturaPercorsoLocalita} numberOfLines={1}>
                      {s.localita}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      )}

      {selezionato && !routePercorso && (
        <AnteprimaMappa
          voce={voceAnteprima(selezionato, t)}
          onChiudi={() => setSelezionato(null)}
          onApri={() => {
            const { tipo, dato } = selezionato;
            if (tipo === "struttura") navigation.navigate("Scheda", { struttura: dato });
            else if (tipo === "cultura") navigation.navigate("SchedaCulturale", { id: dato.id });
            else navigation.navigate("ItinerarioDettaglio", { itinerarioId: dato.id });
          }}
          onIndicazioni={
            selezionato.dato.lat != null
              ? () => {
                  const url = urlMappa({ nome: selezionato.dato.nome || selezionato.dato.titolo, lat: selezionato.dato.lat, lng: selezionato.dato.lng }, motoreMappa);
                  if (url) apriLink(url, t("comune.linkNonApribile"));
                }
              : undefined
          }
        />
      )}

      <ModalePianoMappa
        visibile={modalPianoAperto}
        piano={piano}
        richiesta={routeRichiesta}
        utenteId={session?.user?.id}
        onChiudi={() => setModalPianoAperto(false)}
        navigation={navigation}
      />
    </View>
  );
}

// Il cerchio dei raggruppamenti cresce con le cifre: 4 cifre (migliaia) non
// entrano in un cerchio da 36.
function misuraCluster(n) {
  const d = String(n).length;
  const l = d <= 1 ? 38 : d === 2 ? 42 : d === 3 ? 50 : 58;
  return { width: l, height: l, borderRadius: l / 2, paddingHorizontal: 4 };
}

export default function MappaScreen({ navigation, route }) {
  if (DENTRO_EXPO_GO) {
    return <MappaPlaceholder />;
  }
  return <MappaVera navigation={navigation} route={route} />;
}

function useEstili(c) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.primarioChiaro },
  mappa: { flex: 1 },
  sovrapposizione: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  sovrapposizioneStatica: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  ricercaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    backgroundColor: c.sfondoGruppo,
    borderRadius: 22,
    paddingHorizontal: 16,
    ...ombra(c),
  },
  placeholderRicerca: { fontSize: 12, color: c.testoSecondario },
  ricercaInput: { flex: 1, fontSize: 12.5, color: c.testo, padding: 0 },
  contenitoreRicerca: { position: "relative", zIndex: 30 },
  rigaFiltri: { flexDirection: "row", alignItems: "center", gap: 8 },
  bottoneServizi: {
    height: 34,
    minWidth: 34,
    borderRadius: 17,
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.sfondoGruppo,
    borderWidth: 1,
    borderColor: c.separatore,
    ...ombra(c),
  },
  bottoneServiziAttivo: { backgroundColor: c.primario, borderColor: c.primario },
  bottoneServiziNumero: { color: c.sulPrimario, fontWeight: "800", fontSize: 12 },
  // paddingRight: senza margine l'ultimo chip visibile finiva tagliato di
  // netto contro il pulsante Servizi affianco, invece di un normale "si
  // intuisce che si scorre" (segnalato dal vivo su "Agricampeggi").
  filtri: { flexDirection: "row", gap: 8, paddingRight: 12 },
  chip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.sfondoGruppo,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.separatore,
    ...ombra(c),
  },
  chipAttivo: { backgroundColor: c.primario, borderColor: c.primario },
  chipConIcona: { flexDirection: "row", alignItems: "center", gap: 4 },
  chipTesto: { fontSize: 11.5, fontWeight: "600", color: c.testoSecondario },
  chipTestoAttivo: { color: c.sulPrimario },
  segnaposto: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    ...ombra(c),
  },
  cluster: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primario,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    ...ombra(c),
  },
  clusterTesto: { color: c.sulPrimario, fontWeight: "700", fontSize: 14, textAlign: "center" },
  bannerOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: c.sfondoGruppo,
    borderWidth: 1,
    borderColor: c.separatore,
  },
  bannerOfflineTesto: { fontSize: 10.5, fontWeight: "600", color: c.testoSecondario },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 30 },
  messaggioCentro: { fontWeight: "700", color: c.testo },
  messaggioCentroPiccolo: { fontSize: 11, color: c.testoSecondario, textAlign: "center" },
  caricamentoBadge: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: c.sfondoGruppo,
    borderRadius: 20,
    padding: 8,
    ...ombra(c),
  },
  pulsanteVicinoAMe: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.sfondoGruppo,
    alignItems: "center",
    justifyContent: "center",
    ...ombra(c),
  },
  pinTappa: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C1663A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  pinTappaTesto: { color: "#FFFFFF", fontWeight: "800", fontSize: 11 },
  segnapostoSelezionato: { transform: [{ scale: 1.3 }], borderWidth: 3, borderColor: "#FFFFFF" },
  riepilogoPercorso: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", backgroundColor: c.primario, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10 },
  riepilogoPercorsoTesto: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  strisciaPercorso: { position: "absolute", left: 0, right: 0, bottom: 0 },
  strisciaPercorsoContenuto: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pillPiano: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: c.sfondoGruppo,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.separatore,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    ...ombra(c),
  },
  pillPianoTesto: { color: c.primario, fontSize: 12, fontWeight: "600" },
  cardStrutturaPercorso: {
    backgroundColor: c.sfondoGruppo,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 180,
    ...ombra(c),
  },
  cardStrutturaPercorsoNome: { fontSize: 12.5, fontWeight: "700", color: c.testo },
  cardStrutturaPercorsoLocalita: { fontSize: 11, color: c.testoSecondario, marginTop: 2 },
  strutturaPercorsoVuota: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: c.sfondoGruppo,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...ombra(c),
  },
  strutturaPercorsoVuotaTesto: { fontSize: 11.5, color: c.testoSecondario, textAlign: "center" },
  });
}
