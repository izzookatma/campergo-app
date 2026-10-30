import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";

// react-native-maps richiede moduli nativi non presenti in Expo Go (stesso
// limite di MappaScreen.js): in attesa della build di sviluppo EAS si mostra
// un segnaposto per non far crashare l'app in Expo Go.
const DENTRO_EXPO_GO = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

// Traccia il percorso vero (strada per strada) fra le tappe in ordine,
// stesso servizio gratuito usato dal sito (OSRM) — nessuna chiave richiesta.
function useTracciatoStradale(tappe) {
  const [percorso, setPercorso] = useState(null);

  useEffect(() => {
    if (tappe.length < 2) {
      setPercorso(null);
      return;
    }
    let attivo = true;
    const coordinate = tappe.map((t) => `${t.lng},${t.lat}`).join(";");
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordinate}?overview=full&geometries=geojson`)
      .then((r) => r.json())
      .then((dati) => {
        if (!attivo) return;
        const geometria = dati?.routes?.[0]?.geometry?.coordinates;
        setPercorso(geometria ? geometria.map(([lng, lat]) => ({ latitude: lat, longitude: lng })) : null);
      })
      .catch(() => {
        if (attivo) setPercorso(null);
      });
    return () => {
      attivo = false;
    };
  }, [tappe]);

  return percorso;
}

function MappaVera({ tappe, colore }) {
  const { default: MapView, Marker, Polyline } = require("react-native-maps");
  const percorso = useTracciatoStradale(tappe);

  const regione = useMemo(() => {
    const lats = tappe.map((t) => t.lat);
    const lngs = tappe.map((t) => t.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.025) * 1.6,
      longitudeDelta: Math.max(maxLng - minLng, 0.025) * 1.6,
    };
  }, [tappe]);

  return (
    <MapView style={styles.mappa} initialRegion={regione} scrollEnabled zoomEnabled pitchEnabled={false}>
      {percorso && <Polyline coordinates={percorso} strokeColor={colore} strokeWidth={4} />}
      {tappe.map((t, i) => (
        <Marker key={t.id} coordinate={{ latitude: t.lat, longitude: t.lng }} title={t.nome} description={t.descrizione || undefined}>
          <View style={[styles.pin, { backgroundColor: colore }]}>
            <Text style={styles.pinTesto}>{i + 1}</Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

// Mappa con una tappa numerata per punto e il percorso stradale tracciato
// fra loro, stessa logica di MappaItinerario in ItinerarioDettaglio.jsx sul
// sito (lì con Leaflet, qui con react-native-maps).
export default function MappaItinerario({ tappe, colore = colori.blu }) {
  const tappeConPosizione = tappe.filter((t) => t.lat != null && t.lng != null);
  if (tappeConPosizione.length === 0) return null;

  return (
    <View style={styles.contenitore}>
      {DENTRO_EXPO_GO ? (
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={26} color="#93c5fd" />
          <Text style={styles.placeholderTesto}>Mappa disponibile nella build di sviluppo</Text>
        </View>
      ) : (
        <MappaVera tappe={tappeConPosizione} colore={colore} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 14,
    backgroundColor: colori.grigioSfondo,
  },
  mappa: { flex: 1 },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  pinTesto: { color: "#fff", fontWeight: "800", fontSize: 11 },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 20 },
  placeholderTesto: { fontSize: 11, color: colori.testoSecondario, textAlign: "center" },
});
