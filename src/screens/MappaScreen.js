import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { caricaStrutture, cercaStrutture } from "../lib/strutture";
import { salvaInCache, leggiDaCache } from "../lib/cacheOffline";
import { usePreferenze } from "../context/PreferenzeContext";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

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

const ETICHETTA_MOTORE = { google: "Google", apple: "Apple", waze: "Waze" };

function MappaPlaceholder({ motoreMappa, cambiaMotore }) {
  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.sovrapposizioneStatica}>
        <MarchioNaturaGo />
        <View style={styles.ricercaPill}>
          <Ionicons name="search" size={15} color={colori.testoSecondario} />
          <Text style={styles.placeholderRicerca}>Zona, regione, struttura…</Text>
        </View>
        <Pressable style={styles.selettoreMappa} onPress={cambiaMotore}>
          <Ionicons name="layers-outline" size={13} color={colori.blu} />
          <Text style={styles.selettoreMappaTesto}>Mappa: {ETICHETTA_MOTORE[motoreMappa]}</Text>
        </Pressable>
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

function MappaVera({ navigation, motoreMappa, cambiaMotore }) {
  const { default: MapView, Marker, PROVIDER_GOOGLE } = require("react-native-maps");
  const mappaRef = useRef(null);
  const [strutture, setStrutture] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [termine, setTermine] = useState("");
  const [cercando, setCercando] = useState(false);
  const [senzaConnessione, setSenzaConnessione] = useState(false);

  const caricaDefault = () => {
    setCaricamento(true);
    caricaStrutture({ limite: 100 })
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

  useEffect(() => {
    Promise.resolve().then(() => caricaDefault());
  }, []);

  // Ricerca per zona/regione/struttura su tutto il database (stessa
  // `cercaStrutture` già usata in Esplora), non solo le 100 già caricate
  // per rating — altrimenti una zona poco "votata" non si trova mai.
  // Svuotare il campo (anche a mano, lettera per lettera, non solo con la
  // ×) deve far tornare subito l'elenco di partenza, non restare bloccato
  // sull'ultima ricerca.
  useEffect(() => {
    if (!termine.trim()) {
      Promise.resolve().then(() => caricaDefault());
      return;
    }
    let annullato = false;
    Promise.resolve().then(() => {
      if (!annullato) setCercando(true);
    });
    const scaduto = setTimeout(() => {
      cercaStrutture({ termine })
        .then((dati) => {
          const conPosizione = dati.filter((s) => s.lat && s.lng);
          setStrutture(conPosizione);
          if (conPosizione.length > 0) {
            mappaRef.current?.fitToCoordinates(
              conPosizione.map((s) => ({ latitude: s.lat, longitude: s.lng })),
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
  }, [termine]);

  const svuotaRicerca = () => setTermine("");

  return (
    <View style={styles.schermo}>
      <MapView
        ref={mappaRef}
        style={styles.mappa}
        initialRegion={REGIONE_ITALIA}
        provider={motoreMappa === "google" ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
      >
        {strutture.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            title={s.nome}
            description={s.localita}
            onCalloutPress={() => navigation.navigate("Scheda", { struttura: s })}
          />
        ))}
      </MapView>

      <SafeAreaView edges={["top"]} style={styles.sovrapposizione} pointerEvents="box-none">
        <MarchioNaturaGo />
        <View style={styles.ricercaPill}>
          <Ionicons name="search" size={15} color={colori.testoSecondario} />
          <TextInput
            style={styles.ricercaInput}
            placeholder="Zona, regione, struttura…"
            placeholderTextColor={colori.testoSecondario}
            value={termine}
            onChangeText={setTermine}
          />
          {cercando ? (
            <ActivityIndicator size="small" color={colori.blu} />
          ) : termine ? (
            <Pressable onPress={svuotaRicerca} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colori.testoSecondario} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.selettoreMappa} onPress={cambiaMotore}>
          <Ionicons name="layers-outline" size={13} color={colori.blu} />
          <Text style={styles.selettoreMappaTesto}>Mappa: {ETICHETTA_MOTORE[motoreMappa]}</Text>
        </Pressable>
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
    </View>
  );
}

export default function MappaScreen({ navigation }) {
  const { motoreMappa, setMotoreMappa } = usePreferenze();
  const cambiaMotore = () => setMotoreMappa(motoreMappa === "google" ? "apple" : "google");

  if (DENTRO_EXPO_GO) {
    return <MappaPlaceholder motoreMappa={motoreMappa} cambiaMotore={cambiaMotore} />;
  }
  return <MappaVera navigation={navigation} motoreMappa={motoreMappa} cambiaMotore={cambiaMotore} />;
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
  },
  placeholderRicerca: { fontSize: 12, color: colori.testoSecondario },
  ricercaInput: { flex: 1, fontSize: 12.5, color: colori.testo, padding: 0 },
  selettoreMappa: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  selettoreMappaTesto: { fontSize: 10.5, fontWeight: "700", color: "#374151" },
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
  },
});
