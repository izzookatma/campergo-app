import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MAPPA_VERA_NON_DISPONIBILE } from "../../lib/mappaDisponibile";
import { useTema } from "../../theme/tema";

// Mappa dell'intera vacanza: un segnaposto numerato per ogni punto (arancio
// = dove dormire) e la strada vera tra i punti, nell'ordine scelto.
function MappaVera({ punti, tracciato }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const { default: MapView, Marker, Polyline } = require("react-native-maps");
  const conPartenza = punti[0]?.ruolo === "partenza";
  const regione = useMemo(() => {
    const lats = punti.map((p) => p.luogo.lat);
    const lngs = punti.map((p) => p.luogo.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.05) * 1.6,
      longitudeDelta: Math.max(maxLng - minLng, 0.05) * 1.6,
    };
    // Si ricalcola solo quando cambia l'insieme dei posti (non a ogni render).
  }, [punti]);
  return (
    <MapView style={{ flex: 1 }} initialRegion={regione} key={punti.length} pitchEnabled={false}>
      {tracciato && <Polyline coordinates={tracciato.map((p) => ({ latitude: p.lat, longitude: p.lng }))} strokeColor={c.primario} strokeWidth={4} />}
      {punti.map((p, i) => (
        <Marker key={`${i}-${p.luogo.lat}`} coordinate={{ latitude: p.luogo.lat, longitude: p.luogo.lng }} title={p.luogo.nome} stopPropagation>
          <View style={[styles.pin, { backgroundColor: p.ruolo === "dormire" ? c.accento : c.primario }]}>
            <Text style={styles.pinTesto}>{p.ruolo === "partenza" ? "P" : p.ruolo === "arrivo" ? "A" : i + (conPartenza ? 0 : 1)}</Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

export default function MappaVacanza({ punti, tracciato }) {
  const { c } = useTema();
  const styles = useEstili(c);
  if (!punti || punti.length === 0) return null;
  return (
    <View style={styles.contenitore}>
      {MAPPA_VERA_NON_DISPONIBILE ? (
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={26} color="#93c5fd" />
          <Text style={styles.placeholderTesto}>Mappa disponibile nella build di sviluppo</Text>
        </View>
      ) : (
        <MappaVera punti={punti} tracciato={tracciato} />
      )}
    </View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    contenitore: { height: 240, borderRadius: 16, overflow: "hidden", backgroundColor: c.sfondoGruppo },
    pin: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
    pinTesto: { color: "#fff", fontWeight: "800", fontSize: 12 },
    placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
    placeholderTesto: { color: c.testoSecondario, fontSize: 13 },
  });
}
