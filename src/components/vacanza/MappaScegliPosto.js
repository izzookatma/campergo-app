import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MAPPA_VERA_NON_DISPONIBILE } from "../../lib/mappaDisponibile";
import { useTema } from "../../theme/tema";
import { useT } from "../../i18n/i18n";
import { caricaStruttureVicine } from "../../lib/strutture";
import { geocodificaInversa } from "../../lib/geocodifica";
import { luogoDaStruttura } from "../../lib/bozzaVacanza";

// Mappa per SCEGLIERE un posto: le strutture NaturaGo dell'area guardata
// (pallini blu) e, toccando un punto qualsiasi, «Usa questo punto» (pallino
// rosso) per un posto che su NaturaGo non c'è. Si apre centrata sull'ultimo
// punto del viaggio (es. Bologna).
const DELTA_MASSIMO = 1.2; // più lontano di così non si caricano le strutture

function MappaVera({ centro, onScegli, onApriScheda }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  const { default: MapView, Marker } = require("react-native-maps");
  const [strutture, setStrutture] = useState([]);
  const [lontano, setLontano] = useState(false);
  const [selezionata, setSelezionata] = useState(null);
  const [punto, setPunto] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const attesa = useRef(null);

  const regioneIniziale = centro
    ? { latitude: centro.lat, longitude: centro.lng, latitudeDelta: 0.35, longitudeDelta: 0.35 }
    : { latitude: 42.5, longitude: 12.5, latitudeDelta: 9, longitudeDelta: 9 };

  const carica = useCallback((regione) => {
    clearTimeout(attesa.current);
    if (regione.latitudeDelta > DELTA_MASSIMO) {
      setLontano(true);
      setStrutture([]);
      return;
    }
    setLontano(false);
    attesa.current = setTimeout(async () => {
      try {
        const raggioKm = Math.max(3, (regione.latitudeDelta * 111) / 2);
        const dati = await caricaStruttureVicine({ lat: regione.latitude, lng: regione.longitude, raggioKm, limite: 120 });
        setStrutture(dati.filter((s) => s.lat != null && s.lng != null));
      } catch (e) {
        console.error("Errore nel caricare le strutture della mappa di scelta:", e);
      }
    }, 350);
  }, []);

  const usaPunto = async () => {
    if (!punto || salvando) return;
    setSalvando(true);
    const localita = await geocodificaInversa(punto.latitude, punto.longitude);
    setSalvando(false);
    onScegli({
      tipo: "libero",
      id: null,
      nome: localita ? `Punto vicino a ${localita}` : t("vacanza.puntoSullaMappa"),
      localita: localita || "",
      lat: punto.latitude,
      lng: punto.longitude,
    });
  };

  return (
    <View style={styles.contenitore}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={regioneIniziale}
        onRegionChangeComplete={carica}
        onMapReady={() => carica(regioneIniziale)}
        onPress={(e) => {
          setSelezionata(null);
          setPunto(e.nativeEvent.coordinate);
        }}
        showsUserLocation
      >
        {strutture.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: Number(s.lat), longitude: Number(s.lng) }}
            stopPropagation
            onPress={() => {
              setPunto(null);
              setSelezionata(s);
            }}
          >
            <View style={[styles.pallino, selezionata?.id === s.id && styles.pallinoSelezionato]} />
          </Marker>
        ))}
        {punto && (
          <Marker coordinate={punto} stopPropagation>
            <View style={styles.pallinoPunto} />
          </Marker>
        )}
      </MapView>

      {lontano && (
        <View style={styles.avviso} pointerEvents="none">
          <Text style={styles.avvisoTesto}>{t("vacanza.ingrandisciMappa")}</Text>
        </View>
      )}

      {selezionata && (
        <View style={styles.scheda}>
          <Text style={styles.schedaNome} numberOfLines={2}>
            {selezionata.nome}
          </Text>
          {selezionata.localita ? <Text style={styles.schedaSotto}>{selezionata.localita}</Text> : null}
          <View style={styles.schedaAzioni}>
            <Pressable style={styles.bottonePieno} onPress={() => onScegli(luogoDaStruttura(selezionata))} accessibilityRole="button">
              <Text style={styles.bottonePienoTesto}>{t("vacanza.aggiungi")}</Text>
            </Pressable>
            <Pressable onPress={() => onApriScheda({ tipo: "struttura", oggetto: selezionata })} accessibilityRole="button">
              <Text style={styles.link}>{t("vacanza.apriScheda")}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {punto && (
        <View style={styles.scheda}>
          <Text style={styles.schedaNome}>{t("vacanza.puntoScelto")}</Text>
          <View style={styles.schedaAzioni}>
            <Pressable style={styles.bottonePieno} onPress={usaPunto} disabled={salvando} accessibilityRole="button">
              {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.bottonePienoTesto}>{t("vacanza.usaQuestoPunto")}</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function MappaScegliPosto(props) {
  const { c } = useTema();
  const styles = useEstili(c);
  if (MAPPA_VERA_NON_DISPONIBILE) {
    return (
      <View style={[styles.contenitore, { alignItems: "center", justifyContent: "center", gap: 6 }]}>
        <Ionicons name="map-outline" size={26} color="#93c5fd" />
        <Text style={styles.schedaSotto}>Mappa disponibile nella build di sviluppo</Text>
      </View>
    );
  }
  return <MappaVera {...props} />;
}

function useEstili(c) {
  return StyleSheet.create({
    contenitore: { height: 340, borderRadius: 16, overflow: "hidden", backgroundColor: c.sfondoGruppo },
    pallino: { width: 18, height: 18, borderRadius: 9, backgroundColor: c.primario, borderWidth: 2, borderColor: "#fff" },
    pallinoSelezionato: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.accento },
    pallinoPunto: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.pericolo, borderWidth: 3, borderColor: "#fff" },
    avviso: { position: "absolute", top: 10, alignSelf: "center", backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
    avvisoTesto: { fontSize: 12, fontWeight: "700", color: c.testo },
    scheda: { position: "absolute", left: 10, right: 10, bottom: 10, backgroundColor: c.sfondoGruppo, borderRadius: 14, padding: 12, gap: 6 },
    schedaNome: { fontSize: 15, fontWeight: "800", color: c.testo },
    schedaSotto: { fontSize: 12, color: c.testoSecondario },
    schedaAzioni: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
    bottonePieno: { backgroundColor: c.primario, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, minWidth: 90, alignItems: "center" },
    bottonePienoTesto: { color: "#fff", fontWeight: "700", fontSize: 13 },
    link: { color: c.primario, fontWeight: "700", fontSize: 13 },
  });
}
