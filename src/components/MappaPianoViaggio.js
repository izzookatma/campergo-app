import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { percorsoStradale } from "../lib/percorsoStradale";
import { ETICHETTE_TIPO, ETICHETTA_RIFUGIO, STILE_PER_TIPO, STILE_DEFAULT } from "../lib/strutture";
import { CATEGORIA_CULTURALE_META } from "../lib/cultura";
import { CATEGORIA_ITINERARIO_META } from "../lib/itinerari";

// Mappa UNICA e scorrevole per l'intero viaggio di "Pianifica il tuo
// viaggio" (non una mini-mappa per ogni giorno): il percorso stradale vero
// tra le tappe, un pin per ogni notte (dove dormire, con lo stesso
// stile/colore/icona della struttura già usato nella sezione Mappa:
// STILE_PER_TIPO in lib/strutture.js, non una copia) e un pin per ogni
// luogo da visitare (stesso colore/icona della categoria già usati in
// CardVoce, PianoGiorno.js) — stessa idea del sito (PianificaViaggio.jsx,
// MappaPiano, lì con Leaflet), qui con react-native-maps.

const DENTRO_EXPO_GO = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

// La prima proposta disponibile tra campeggio/area sosta/libera per quel
// giorno — stessa priorità di puntoDormireGiorno sul sito.
function dormireGiorno(giorno) {
  if (!giorno.dormire) return null;
  if (giorno.dormire.campeggio) return { categoria: "campeggio", posto: giorno.dormire.campeggio };
  if (giorno.dormire.areaSosta) return { categoria: "areaSosta", posto: giorno.dormire.areaSosta };
  if (giorno.dormire.libera) return { categoria: "libera", posto: giorno.dormire.libera };
  return null;
}

function stileDormire(categoria, posto) {
  if (categoria === "areaSosta") return STILE_PER_TIPO["Area sosta"] || STILE_DEFAULT;
  if (categoria === "libera") {
    return posto.tipo === "parcheggio" ? STILE_PER_TIPO["Camper service"] || STILE_DEFAULT : STILE_DEFAULT;
  }
  if (posto.origine === "rifugi") return STILE_PER_TIPO[ETICHETTA_RIFUGIO[posto.tipoStruttura] || "Rifugio"] || STILE_DEFAULT;
  return STILE_PER_TIPO[ETICHETTE_TIPO[posto.tipoStruttura]] || STILE_DEFAULT;
}

function stileVoce(voce) {
  const meta = voce.tipo === "cultura" ? CATEGORIA_CULTURALE_META[voce.categoria] : CATEGORIA_ITINERARIO_META[voce.categoria];
  return meta ? { icona: meta.icona, colore: meta.colore } : STILE_DEFAULT;
}

function useTracciatoStradale(tappe) {
  const [percorso, setPercorso] = useState(null);
  useEffect(() => {
    if (tappe.length < 2) {
      return;
    }
    let attivo = true;
    percorsoStradale(tappe)
      .then((punti) => {
        if (attivo) setPercorso(punti ? punti.map((p) => ({ latitude: p.lat, longitude: p.lng })) : null);
      })
      .catch(() => {
        if (attivo) setPercorso(null);
      });
    return () => {
      attivo = false;
    };
  }, [tappe]);
  return tappe.length < 2 ? null : percorso;
}

function MappaVera({ piano }) {
  const { default: MapView, Marker, Polyline } = require("react-native-maps");
  const tappeRoute = useMemo(() => (piano.tappeCoordinate || []).filter((t) => t.lat != null && t.lng != null), [piano]);
  const percorso = useTracciatoStradale(tappeRoute);

  const puntiGiorno = useMemo(
    () =>
      piano.giorni
        .map((g) => {
          const scelta = dormireGiorno(g);
          if (!scelta || scelta.posto.lat == null || scelta.posto.lng == null) return null;
          return { numero: g.numero, posto: scelta.posto, stile: stileDormire(scelta.categoria, scelta.posto) };
        })
        .filter(Boolean),
    [piano]
  );

  const puntiVoci = useMemo(
    () =>
      piano.giorni.flatMap((g) =>
        (g.voci || [])
          .filter((v) => v.lat != null && v.lng != null)
          .map((v) => ({ numero: g.numero, voce: v, stile: stileVoce(v) }))
      ),
    [piano]
  );

  const tuttiIPunti = [...tappeRoute, ...puntiGiorno.map((p) => p.posto), ...puntiVoci.map((p) => p.voce)];

  const regione = useMemo(() => {
    if (tuttiIPunti.length === 0) return null;
    const lats = tuttiIPunti.map((p) => p.lat);
    const lngs = tuttiIPunti.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.05) * 1.5,
      longitudeDelta: Math.max(maxLng - minLng, 0.05) * 1.5,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piano]);

  if (!regione) return null;

  return (
    <MapView style={styles.mappa} initialRegion={regione} scrollEnabled zoomEnabled pitchEnabled={false}>
      {percorso && <Polyline coordinates={percorso} strokeColor={colori.arancio} strokeWidth={4} />}
      {puntiGiorno.map((p) => (
        <Marker
          key={`giorno-${p.numero}`}
          coordinate={{ latitude: p.posto.lat, longitude: p.posto.lng }}
          title={p.posto.nome}
          description={`Giorno ${p.numero}`}
        >
          <View style={[styles.segnaposto, { backgroundColor: p.stile.colore }]}>
            <Ionicons name={p.stile.icona} size={13} color={colori.bianco} />
          </View>
        </Marker>
      ))}
      {puntiVoci.map((p, i) => (
        <Marker
          key={`voce-${p.voce.tipo}-${p.voce.id}-${i}`}
          coordinate={{ latitude: p.voce.lat, longitude: p.voce.lng }}
          title={p.voce.titolo}
          description={`Giorno ${p.numero}`}
        >
          <View style={[styles.segnaposto, { backgroundColor: p.stile.colore }]}>
            <Ionicons name={p.stile.icona} size={13} color={colori.bianco} />
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

export default function MappaPianoViaggio({ piano }) {
  if (!piano?.giorni?.length) return null;
  return (
    <View style={styles.contenitore}>
      {DENTRO_EXPO_GO ? (
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={26} color="#93c5fd" />
          <Text style={styles.placeholderTesto}>Mappa disponibile nella build di sviluppo</Text>
        </View>
      ) : (
        <MappaVera piano={piano} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colori.grigioSfondo,
  },
  mappa: { flex: 1 },
  segnaposto: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 20 },
  placeholderTesto: { fontSize: 11, color: colori.testoSecondario, textAlign: "center" },
});
