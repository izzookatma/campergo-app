import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Location from "expo-location";
import Supercluster from "supercluster";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard } from "../theme/colors";
import { caricaTutteLePosizioni, cercaStrutture } from "../lib/strutture";
import { caricaTutteLePosizioniCulturali, CATEGORIA_CULTURALE_META } from "../lib/cultura";
import { caricaTutteLePosizioniItinerari, CATEGORIA_ITINERARIO_META } from "../lib/itinerari";
import { salvaInCache, leggiDaCache } from "../lib/cacheOffline";
import { useAuth } from "../context/AuthContext";
import { REGIONI_ITALIANE } from "../lib/regioni";
import { caricaRicercheRecenti, salvaRicercaRecente, cancellaRicercheRecenti } from "../lib/ricercheRecenti";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import RicercaIA from "../components/RicercaIA";
import CreaPercorso from "../components/CreaPercorso";
import { distanzaKmPunti } from "../lib/percorsoStradale";

// react-native-maps richiede moduli nativi non presenti in Expo Go: in attesa
// della build di sviluppo EAS si mostra il segnaposto per non far crashare
// l'app in Expo Go. Appena pronta la build, questo controllo diventa superfluo.
const DENTRO_EXPO_GO = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

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

const STILE_PER_TIPO = {
  Campeggio: { icona: "bonfire", colore: "#16a34a" },
  Agriturismo: { icona: "home", colore: colori.arancio },
  Agricampeggio: { icona: "leaf", colore: "#65a30d" },
  "Area sosta": { icona: "car", colore: colori.blu },
  "Camper service": { icona: "water", colore: "#0891b2" },
  Rifugio: { icona: "triangle", colore: "#92400e" },
  Bivacco: { icona: "cube", colore: "#64748b" },
};
const STILE_DEFAULT = { icona: "location", colore: colori.rosso };

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

function MappaPlaceholder() {
  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.sovrapposizioneStatica}>
        <MarchioNaturaGo />
        <View style={styles.ricercaPill}>
          <Ionicons name="search" size={15} color={colori.testoSecondario} />
          <Text style={styles.placeholderRicerca}>Zona, regione, struttura…</Text>
        </View>
      </SafeAreaView>
      <View style={styles.centro}>
        <Ionicons name="map-outline" size={32} color="#93c5fd" />
        <Text style={styles.messaggioCentro}>Mappa in arrivo</Text>
        <Text style={styles.messaggioCentroPiccolo}>
          Pronta, ma serve la build di sviluppo per vederla su questo telefono
        </Text>
      </View>
    </View>
  );
}

function MappaVera({ navigation }) {
  const { default: MapView, Marker, Polyline } = require("react-native-maps");
  const { session } = useAuth();
  const mappaRef = useRef(null);
  const [strutture, setStrutture] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [termine, setTermine] = useState("");
  // Filtri impostati dalla Ricerca IA (tipo struttura/servizi): non hanno
  // una propria interfaccia qui (niente chip, a differenza di Esplora), si
  // impostano solo scrivendo una frase all'IA e si azzerano svuotando la
  // ricerca con la ×.
  const [filtriTipoIA, setFiltriTipoIA] = useState([]);
  const [filtriServiziIA, setFiltriServiziIA] = useState([]);
  const [cercando, setCercando] = useState(false);
  const [senzaConnessione, setSenzaConnessione] = useState(false);
  const [inputAFocus, setInputAFocus] = useState(false);
  const [ricercheRecenti, setRicercheRecenti] = useState([]);
  const [cercandoPosizione, setCercandoPosizione] = useState(false);
  const [regione, setRegione] = useState(REGIONE_ITALIA);
  const [cultura, setCultura] = useState([]);
  const [categorieCulturaAttive, setCategorieCulturaAttive] = useState(CATEGORIE_CULTURA);
  const [itinerari, setItinerari] = useState([]);
  const [categorieItinerarioAttive, setCategorieItinerarioAttive] = useState(CATEGORIE_ITINERARIO);

  // "Creami un percorso": percorso stradale vero (tappe nominate + tappe
  // intermedie, src/lib/percorsoStradale.js) disegnato sopra la mappa già
  // filtrata - stessa idea del sito (src/App.jsx, CreaPercorsoMappa).
  const [routeTappe, setRouteTappe] = useState(null);
  const [routePercorso, setRoutePercorso] = useState(null);

  useEffect(() => {
    if (!routePercorso) return;
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

  const culturaVisibile = useMemo(() => {
    if (categoriaCulturaCercata) return cultura.filter((c) => c.categoria === categoriaCulturaCercata);
    const base = cultura.filter((c) => categorieCulturaAttive.includes(c.categoria));
    if (pulitoMinuscolo.length < 2) return base;
    return base.filter(
      (c) =>
        c.titolo?.toLowerCase().includes(pulitoMinuscolo) ||
        c.citta?.toLowerCase().includes(pulitoMinuscolo) ||
        c.regione?.toLowerCase().includes(pulitoMinuscolo)
    );
  }, [cultura, categorieCulturaAttive, pulitoMinuscolo, categoriaCulturaCercata]);

  const itinerariVisibili = useMemo(() => {
    if (categoriaItinerarioCercata) return itinerari.filter((it) => it.categoria === categoriaItinerarioCercata);
    const base = itinerari.filter((it) => categorieItinerarioAttive.includes(it.categoria));
    if (pulitoMinuscolo.length < 2) return base;
    return base.filter(
      (it) => it.titolo?.toLowerCase().includes(pulitoMinuscolo) || it.regione?.toLowerCase().includes(pulitoMinuscolo)
    );
  }, [itinerari, categorieItinerarioAttive, pulitoMinuscolo, categoriaItinerarioCercata]);

  // Tutte le schede con coordinate (eventualmente filtrate per tipo/servizi),
  // non solo le "migliori" N per punteggio: a differenza di Esplora qui serve
  // copertura geografica completa, altrimenti zone intere (Lago di Garda,
  // riviera adriatica...) restavano vuote pur avendo schede nel database. I
  // tanti segnaposto si raggruppano poi in cluster qui sotto (supercluster),
  // altrimenti sarebbero migliaia di puntini illeggibili e lenti da disegnare.
  const caricaDefault = (tipi, servizi) => {
    setCaricamento(true);
    caricaTutteLePosizioni({ tipi, servizi })
      .then((dati) => {
        const conPosizione = dati.filter((s) => s.lat && s.lng);
        setStrutture(conPosizione);
        setSenzaConnessione(false);
        salvaInCache("mappa_strutture", conPosizione);
      })
      .catch(async () => {
        const cache = await leggiDaCache("mappa_strutture");
        if (cache) {
          setStrutture(cache.dati);
          setSenzaConnessione(true);
        }
      })
      .finally(() => setCaricamento(false));
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
          salvaRicercaRecente(pulito).then(setRicercheRecenti);
          const conPosizione = dati.filter((s) => s.lat && s.lng);
          setStrutture(conPosizione);
          // Inquadra anche musei/borghi/attività e sentieri/percorsi trovati dalla
          // stessa ricerca (già filtrati sopra, culturaVisibile/itinerariVisibili
          // dipendono dallo stesso testo), non solo le strutture.
          const daInquadrare = [...conPosizione, ...culturaVisibile, ...itinerariVisibili];
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
  }, [termine, filtriTipoIA, filtriServiziIA, culturaVisibile, itinerariVisibili]);

  // Strutture, cultura e itinerari condividono lo stesso clustering: chiavi
  // diverse ("s-"/"c-"/"i-") perché gli id vengono da tabelle diverse e
  // possono coincidere come numero.
  const puntiById = useMemo(() => {
    const m = new Map();
    strutture.forEach((s) => m.set(`s-${s.id}`, { tipo: "struttura", dato: s }));
    culturaVisibile.forEach((c) => m.set(`c-${c.id}`, { tipo: "cultura", dato: c }));
    itinerariVisibili.forEach((it) => m.set(`i-${it.id}`, { tipo: "itinerario", dato: it }));
    return m;
  }, [strutture, culturaVisibile, itinerariVisibili]);

  // Indice per il clustering: ricalcolato solo quando cambia l'elenco di
  // schede, non a ogni spostamento della mappa (vedi `cluster` sotto, che
  // invece dipende anche da `regione`).
  const indiceCluster = useMemo(() => {
    const sc = new Supercluster({ radius: 50, maxZoom: 16 });
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
    const zoom = Math.max(0, Math.min(20, Math.round(Math.log2(360 / regione.longitudeDelta))));
    const bbox = [
      regione.longitude - regione.longitudeDelta,
      regione.latitude - regione.latitudeDelta,
      regione.longitude + regione.longitudeDelta,
      regione.latitude + regione.latitudeDelta,
    ];
    return indiceCluster.getClusters(bbox, zoom);
  }, [indiceCluster, regione]);

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
    setFiltriServiziIA([]);
  };

  const vaiVicinoAMe = async () => {
    let permesso;
    try {
      permesso = await Location.requestForegroundPermissionsAsync();
    } catch (e) {
      console.error("Permesso posizione:", e);
      Alert.alert("Posizione non disponibile", "Per centrare la mappa su di te, consenti l'accesso alla posizione.");
      return;
    }
    if (permesso.status !== "granted") {
      Alert.alert("Posizione non disponibile", "Per centrare la mappa su di te, consenti l'accesso alla posizione.");
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
      Alert.alert("Non riesco a trovare la tua posizione", "Riprova tra poco.");
    } finally {
      setCercandoPosizione(false);
    }
  };

  // Sentieri e percorsi 4x4 non sono strutture: la mappa non li mostra
  // (stesso principio di EsploraScreen/EsploraHubScreen). Qui però non fanno
  // parte di questo stack di navigazione (vedi App.js, MappaStackNavigator):
  // si passa alla scheda Esplora, che li ha già.
  const onRicercaIA = (risultato) => {
    if (risultato.categoria === "sentiero") {
      Alert.alert("Apro in Esplora", "I sentieri non si vedono sulla mappa: li apro nella scheda Esplora.", [
        { text: "Ok", onPress: () => navigation.navigate("Esplora", { screen: "Sentieri", params: { regioneIniziale: risultato.regione, modalitaIniziale: risultato.modalita } }) },
      ]);
      return;
    }
    if (risultato.categoria === "percorso_4x4") {
      Alert.alert("Apro in Esplora", "I percorsi 4x4 non si vedono sulla mappa: li apro nella scheda Esplora.", [
        {
          text: "Ok",
          onPress: () =>
            navigation.navigate("Esplora", {
              screen: "Percorsi4x4",
              params: {
                regioneIniziale: risultato.regione,
                difficoltaIniziale: risultato.difficolta,
                tipoVeicoloIniziale: risultato.tipoVeicolo,
              },
            }),
        },
      ]);
      return;
    }
    if (risultato.filtriTipo.length > 0) setFiltriTipoIA(risultato.filtriTipo);
    if (risultato.filtriServizi.length > 0) setFiltriServiziIA(risultato.filtriServizi);
    setTermine(risultato.ricerca || "");
  };

  const onRicercaIARichiedeAccesso = () => {
    Alert.alert("Accedi", "La ricerca con l'IA è gratuita per chi si registra. Accedi o registrati per usarla.", [
      { text: "Annulla", style: "cancel" },
      { text: "Accedi", onPress: () => navigation.navigate("Accedi") },
    ]);
  };

  // Chip di filtro manuali (oltre a quelli impostabili con la Ricerca IA):
  // stesso stato filtriTipoIA, così entrambe le vie finiscono nella stessa
  // query sopra.
  const alternaFiltroTipo = (f) => {
    if (f === "Tutti") {
      setFiltriTipoIA([]);
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
      <MapView
        ref={mappaRef}
        style={styles.mappa}
        initialRegion={REGIONE_ITALIA}
        onRegionChangeComplete={setRegione}
        showsUserLocation
      >
        {routePercorso && (
          <Polyline
            coordinates={routePercorso.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor="#C1663A"
            strokeWidth={4}
          />
        )}
        {routeTappe &&
          routeTappe.map((tp, i) => (
            <Marker key={`tappa-${i}`} coordinate={{ latitude: tp.lat, longitude: tp.lng }} title={tp.nome}>
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
                onPress={() => vaiAlCluster(c)}
              >
                <View style={styles.cluster}>
                  <Text style={styles.clusterTesto}>{c.properties.point_count}</Text>
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
                title={voce.titolo}
                description={voce.citta}
                onCalloutPress={() => navigation.navigate("SchedaCulturale", { id: voce.id })}
              >
                <View style={[styles.segnaposto, { backgroundColor: meta.colore }]}>
                  <Ionicons name={meta.icona} size={18} color={colori.bianco} />
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
                title={it.titolo}
                description={it.regione}
                onCalloutPress={() => navigation.navigate("ItinerarioDettaglio", { itinerarioId: it.id })}
              >
                <View style={[styles.segnaposto, { backgroundColor: meta.colore }]}>
                  <Ionicons name={meta.icona} size={18} color={colori.bianco} />
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
              title={s.nome}
              description={s.localita}
              onCalloutPress={() => navigation.navigate("Scheda", { struttura: s })}
            >
              <View style={[styles.segnaposto, { backgroundColor: stile.colore }]}>
                <Ionicons name={stile.icona} size={18} color={colori.bianco} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView edges={["top"]} style={styles.sovrapposizione} pointerEvents="box-none">
        <MarchioNaturaGo />
        <View style={styles.contenitoreRicerca}>
          <View style={styles.ricercaPill}>
            <Ionicons name="search" size={15} color={colori.testoSecondario} />
            <TextInput
              style={styles.ricercaInput}
              placeholder="Zona, regione, struttura…"
              placeholderTextColor={colori.testoSecondario}
              value={termine}
              onChangeText={setTermine}
              onFocus={() => setInputAFocus(true)}
              onBlur={() => setTimeout(() => setInputAFocus(false), 150)}
            />
            {cercando ? (
              <ActivityIndicator size="small" color={colori.blu} />
            ) : termine ? (
              <Pressable onPress={svuotaRicerca} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colori.testoSecondario} />
              </Pressable>
            ) : null}
          </View>

          {mostraTendina && (
            <View style={styles.tendina}>
              {mostraRicercheRecenti && (
                <>
                  <View style={styles.tendinaIntestazione}>
                    <Text style={styles.tendinaIntestazioneTesto}>Ricerche recenti</Text>
                    <Pressable onPress={() => cancellaRicercheRecenti().then(setRicercheRecenti)} hitSlop={8}>
                      <Text style={styles.tendinaCancella}>Cancella</Text>
                    </Pressable>
                  </View>
                  {ricercheRecenti.map((t) => (
                    <Pressable key={`recente-${t}`} style={styles.rigaTendina} onPress={() => setTermine(t)}>
                      <Ionicons name="time-outline" size={15} color={colori.testoSecondario} />
                      <Text style={styles.rigaTendinaTesto}>{t}</Text>
                    </Pressable>
                  ))}
                </>
              )}
              {regioniSuggerite.map((r) => (
                <Pressable key={`regione-${r}`} style={styles.rigaTendina} onPress={() => setTermine(r)}>
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
        </View>

        <RicercaIA onRisultato={onRicercaIA} loggato={!!session} onRichiedeAccesso={onRicercaIARichiedeAccesso} />

        <CreaPercorso
          loggato={!!session}
          attivo={!!routePercorso}
          onPercorso={({ tappe, percorso }) => {
            setRouteTappe(tappe);
            setRoutePercorso(percorso);
          }}
          onReset={() => {
            setRouteTappe(null);
            setRoutePercorso(null);
          }}
          onRichiedeAccesso={onRicercaIARichiedeAccesso}
        />

        <View style={styles.rigaFiltri}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtri}>
            {FILTRI.map((f) => {
              const attivo = f === "Tutti" ? filtriTipoIA.length === 0 : filtriTipoIA.includes(f);
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
                  <Ionicons name={meta.icona} size={12} color={attivo ? colori.bianco : meta.colore} />
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
                  <Ionicons name={meta.icona} size={12} color={attivo ? colori.bianco : meta.colore} />
                  <Text style={[styles.chipTesto, attivo && styles.chipTestoAttivo]}>{meta.etichetta}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {senzaConnessione && (
          <View style={styles.bannerOffline}>
            <Ionicons name="cloud-offline-outline" size={14} color={colori.testoSecondario} />
            <Text style={styles.bannerOfflineTesto}>Senza connessione: ultimi risultati salvati.</Text>
          </View>
        )}
      </SafeAreaView>

      {caricamento && (
        <View style={styles.caricamentoBadge} pointerEvents="none">
          <ActivityIndicator color={colori.blu} size="small" />
        </View>
      )}

      <Pressable style={styles.pulsanteVicinoAMe} onPress={vaiVicinoAMe} disabled={cercandoPosizione}>
        {cercandoPosizione ? (
          <ActivityIndicator color={colori.blu} size="small" />
        ) : (
          <Ionicons name="locate" size={20} color={colori.blu} />
        )}
      </Pressable>

      {routePercorso && (
        <SafeAreaView edges={["bottom"]} style={styles.strisciaPercorso} pointerEvents="box-none">
          {struttureToccateDalPercorso.length === 0 ? (
            <View style={styles.strutturaPercorsoVuota}>
              <Text style={styles.strutturaPercorsoVuotaTesto}>Nessuna struttura mostrata è sul percorso</Text>
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
    </View>
  );
}

export default function MappaScreen({ navigation }) {
  if (DENTRO_EXPO_GO) {
    return <MappaPlaceholder />;
  }
  return <MappaVera navigation={navigation} />;
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.bluChiaro },
  mappa: { flex: 1 },
  sovrapposizione: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  sovrapposizioneStatica: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  ricercaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    backgroundColor: colori.bianco,
    borderRadius: 22,
    paddingHorizontal: 16,
    ...ombraCard,
  },
  placeholderRicerca: { fontSize: 12, color: colori.testoSecondario },
  ricercaInput: { flex: 1, fontSize: 12.5, color: colori.testo, padding: 0 },
  contenitoreRicerca: { position: "relative", zIndex: 30 },
  tendina: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
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
  rigaFiltri: { flexDirection: "row", alignItems: "center" },
  filtri: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: colori.bianco,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colori.bordo,
    ...ombraCard,
  },
  chipAttivo: { backgroundColor: colori.blu, borderColor: colori.blu },
  chipConIcona: { flexDirection: "row", alignItems: "center", gap: 4 },
  chipTesto: { fontSize: 11.5, fontWeight: "600", color: colori.testoSecondario },
  chipTestoAttivo: { color: colori.bianco },
  segnaposto: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colori.bianco,
    ...ombraCard,
  },
  cluster: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colori.blu,
    borderWidth: 2,
    borderColor: colori.bianco,
    ...ombraCard,
  },
  clusterTesto: { color: colori.bianco, fontWeight: "700", fontSize: 12.5 },
  bannerOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  bannerOfflineTesto: { fontSize: 10.5, fontWeight: "600", color: colori.testoSecondario },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 30 },
  messaggioCentro: { fontWeight: "700", color: colori.testo },
  messaggioCentroPiccolo: { fontSize: 11, color: colori.testoSecondario, textAlign: "center" },
  caricamentoBadge: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: colori.bianco,
    borderRadius: 20,
    padding: 8,
    ...ombraCard,
  },
  pulsanteVicinoAMe: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colori.bianco,
    alignItems: "center",
    justifyContent: "center",
    ...ombraCard,
  },
  pinTappa: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C1663A",
    borderWidth: 2,
    borderColor: colori.bianco,
  },
  pinTappaTesto: { color: colori.bianco, fontWeight: "800", fontSize: 11 },
  strisciaPercorso: { position: "absolute", left: 0, right: 0, bottom: 0 },
  strisciaPercorsoContenuto: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  cardStrutturaPercorso: {
    backgroundColor: colori.bianco,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 180,
    ...ombraCard,
  },
  cardStrutturaPercorsoNome: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  cardStrutturaPercorsoLocalita: { fontSize: 11, color: colori.testoSecondario, marginTop: 2 },
  strutturaPercorsoVuota: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colori.bianco,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...ombraCard,
  },
  strutturaPercorsoVuotaTesto: { fontSize: 11.5, color: colori.testoSecondario, textAlign: "center" },
});
