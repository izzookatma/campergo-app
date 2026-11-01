import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaSentieri, MODALITA_SENTIERO_META } from "../lib/itinerari";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

const FILTRI = [
  { chiave: null, etichetta: "Tutti" },
  { chiave: "a_piedi", etichetta: "A piedi" },
  { chiave: "bici", etichetta: "In bici" },
];

export default function SentieriScreen({ navigation, route }) {
  const { session } = useAuth();
  const [sentieri, setSentieri] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  // Arrivando dalla ricerca IA con una modalità/regione già riconosciute
  // (es. "percorso bici in Lombardia"): partono già impostate, modificabili
  // come sempre una volta sulla schermata.
  const [modalita, setModalita] = useState(() => route.params?.modalitaIniziale ?? null);
  const [termine, setTermine] = useState(() => route.params?.regioneIniziale || "");

  const creaSentiero = () => {
    if (!session) {
      Alert.alert("Accedi", "Accedi al tuo account per creare un sentiero.");
      return;
    }
    navigation.navigate("NuovoItinerario", { categoria: "sentiero" });
  };

  useFocusEffect(
    useCallback(() => {
      setCaricamento(true);
      caricaSentieri({ modalita })
        .then(setSentieri)
        .catch((e) => console.error("Errore nel caricare i sentieri:", e))
        .finally(() => setCaricamento(false));
    }, [modalita])
  );

  // Filtro lato app sui sentieri già caricati (al massimo poche centinaia
  // di righe): basta il titolo o la regione, niente nuova query.
  const sentieriFiltrati = useMemo(() => {
    const pulito = termine.trim().toLowerCase();
    if (!pulito) return sentieri;
    return sentieri.filter((it) => `${it.titolo} ${it.regione || ""}`.toLowerCase().includes(pulito));
  }, [sentieri, termine]);

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo onPress={() => navigation.navigate("EsploraHub")} />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>Sentieri e ciclabili</Text>
          <Pressable style={styles.creaBottone} onPress={creaSentiero}>
            <Ionicons name="add" size={14} color="#2f6b3f" />
            <Text style={styles.creaBottoneTesto}>Crea</Text>
          </Pressable>
        </View>
        <View style={styles.filtri}>
          {FILTRI.map((f) => (
            <Pressable
              key={f.etichetta}
              style={[styles.chip, modalita === f.chiave && styles.chipAttivo]}
              onPress={() => setModalita(f.chiave)}
            >
              <Text style={[styles.chipTesto, modalita === f.chiave && styles.chipTestoAttivo]}>{f.etichetta}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.ricerca}>
          <Ionicons name="search-outline" size={14} color={colori.testoSecondario} />
          <TextInput
            style={styles.ricercaInput}
            placeholder="Titolo o regione…"
            placeholderTextColor={colori.testoSecondario}
            value={termine}
            onChangeText={setTermine}
          />
        </View>
      </View>

      {caricamento ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colori.blu} />
      ) : sentieriFiltrati.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name="trail-sign-outline" size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>Nessun sentiero trovato.</Text>
        </View>
      ) : (
        <FlatList
          data={sentieriFiltrati}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListHeaderComponent={<Text style={styles.contatore}>{sentieriFiltrati.length} sentieri</Text>}
          renderItem={({ item }) => {
            const meta = MODALITA_SENTIERO_META[item.modalita];
            return (
              <Pressable style={styles.card} onPress={() => navigation.navigate("ItinerarioDettaglio", { itinerarioId: item.id })}>
                <View style={styles.cardFoto}>
                  {item.fotoUrl ? (
                    <Image source={{ uri: item.fotoUrl }} style={styles.cardImmagine} />
                  ) : (
                    <Ionicons name="trail-sign-outline" size={22} color="#2f6b3f" />
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitolo} numberOfLines={1}>
                    {item.titolo}
                  </Text>
                  <Text style={styles.cardRegione}>{item.regione}</Text>
                  <View style={styles.cardBadge}>
                    {meta && (
                      <View style={styles.badgePill}>
                        <Ionicons name={meta.icona} size={11} color="#2f6b3f" />
                        <Text style={styles.badgePillTesto}>{meta.etichetta}</Text>
                      </View>
                    )}
                    {item.lunghezzaKm && <Text style={styles.cardDettaglio}>{item.lunghezzaKm} km</Text>}
                    {item.dislivelloM != null && <Text style={styles.cardDettaglio}>↑{item.dislivelloM} m</Text>}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  rigaTitolo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titolo: { fontSize: 19, fontWeight: "800", color: colori.testo },
  creaBottone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#eef6ec",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  creaBottoneTesto: { fontSize: 11.5, fontWeight: "700", color: "#2f6b3f" },
  filtri: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: colori.bianco,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  chipAttivo: { backgroundColor: "#2f6b3f", borderColor: "#2f6b3f" },
  chipTesto: { fontSize: 11.5, fontWeight: "600", color: colori.testoSecondario },
  chipTestoAttivo: { color: colori.bianco },
  ricerca: {
    height: 38,
    borderRadius: 12,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  ricercaInput: { flex: 1, fontSize: 12.5, color: colori.testo, padding: 0 },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  vuotoTesto: { textAlign: "center", fontSize: 12.5, color: colori.testoSecondario },
  contatore: { fontSize: 11, color: colori.testoSecondario, marginBottom: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colori.bianco,
    borderRadius: 14,
    padding: 10,
  },
  cardFoto: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#eef6ec",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 3 },
  cardTitolo: { fontSize: 13, fontWeight: "700", color: colori.testo },
  cardRegione: { fontSize: 11, color: colori.testoSecondario },
  cardBadge: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#eef6ec",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePillTesto: { fontSize: 9.5, fontWeight: "700", color: "#2f6b3f" },
  cardDettaglio: { fontSize: 10.5, color: colori.testoSecondario, fontWeight: "600" },
});
