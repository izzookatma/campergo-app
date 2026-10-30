import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaPercorsi4x4, DIFFICOLTA_META, TIPO_VEICOLO_META } from "../lib/itinerari";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

const FILTRI = [
  { chiave: null, etichetta: "Tutti" },
  { chiave: "facile", etichetta: "Facile" },
  { chiave: "medio", etichetta: "Medio" },
  { chiave: "difficile", etichetta: "Difficile" },
  { chiave: "estremo", etichetta: "Estremo" },
];

export default function Percorsi4x4Screen({ navigation }) {
  const { session } = useAuth();
  const [percorsi, setPercorsi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [difficolta, setDifficolta] = useState(null);
  const [termine, setTermine] = useState("");

  const creaPercorso = () => {
    if (!session) {
      Alert.alert("Accedi", "Accedi al tuo account per creare un percorso 4x4.");
      return;
    }
    navigation.navigate("NuovoItinerario", { categoria: "percorso_4x4" });
  };

  useFocusEffect(
    useCallback(() => {
      setCaricamento(true);
      caricaPercorsi4x4({ difficolta })
        .then(setPercorsi)
        .catch((e) => console.error("Errore nel caricare i percorsi 4x4:", e))
        .finally(() => setCaricamento(false));
    }, [difficolta])
  );

  // Filtro lato app sui percorsi già caricati (al massimo poche centinaia
  // di righe): basta il titolo o la regione, niente nuova query.
  const percorsiFiltrati = useMemo(() => {
    const pulito = termine.trim().toLowerCase();
    if (!pulito) return percorsi;
    return percorsi.filter((it) => `${it.titolo} ${it.regione || ""}`.toLowerCase().includes(pulito));
  }, [percorsi, termine]);

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo onPress={() => navigation.navigate("EsploraHub")} />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>Percorsi 4x4</Text>
          <Pressable style={styles.creaBottone} onPress={creaPercorso}>
            <Ionicons name="add" size={14} color={colori.blu} />
            <Text style={styles.creaBottoneTesto}>Crea</Text>
          </Pressable>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTRI}
          keyExtractor={(f) => f.etichetta}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: f }) => (
            <Pressable
              style={[styles.chip, difficolta === f.chiave && styles.chipAttivo]}
              onPress={() => setDifficolta(f.chiave)}
            >
              <Text style={[styles.chipTesto, difficolta === f.chiave && styles.chipTestoAttivo]}>{f.etichetta}</Text>
            </Pressable>
          )}
        />
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
      ) : percorsiFiltrati.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name="car-sport-outline" size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>Nessun percorso trovato.</Text>
        </View>
      ) : (
        <FlatList
          data={percorsiFiltrati}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListHeaderComponent={<Text style={styles.contatore}>{percorsiFiltrati.length} percorsi</Text>}
          renderItem={({ item }) => {
            const metaDifficolta = DIFFICOLTA_META[item.difficolta];
            const metaVeicolo = TIPO_VEICOLO_META[item.tipoVeicolo];
            return (
              <Pressable style={styles.card} onPress={() => navigation.navigate("ItinerarioDettaglio", { itinerarioId: item.id })}>
                <View style={styles.cardFoto}>
                  {item.fotoUrl ? (
                    <Image source={{ uri: item.fotoUrl }} style={styles.cardImmagine} />
                  ) : (
                    <Ionicons name="car-sport-outline" size={22} color={colori.blu} />
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitolo} numberOfLines={1}>
                    {item.titolo}
                  </Text>
                  <Text style={styles.cardRegione}>{item.regione}</Text>
                  <View style={styles.cardBadge}>
                    {metaDifficolta && (
                      <View style={[styles.badgePill, { backgroundColor: metaDifficolta.colore + "22" }]}>
                        <Text style={[styles.badgePillTesto, { color: metaDifficolta.colore }]}>{metaDifficolta.etichetta}</Text>
                      </View>
                    )}
                    {metaVeicolo && (
                      <View style={styles.badgePillBlu}>
                        <Ionicons name={metaVeicolo.icona} size={11} color={colori.blu} />
                        <Text style={styles.badgePillBluTesto}>{metaVeicolo.etichetta}</Text>
                      </View>
                    )}
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
    backgroundColor: "#e7eefc",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  creaBottoneTesto: { fontSize: 11.5, fontWeight: "700", color: colori.blu },
  chip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: colori.bianco,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  chipAttivo: { backgroundColor: colori.blu, borderColor: colori.blu },
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
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 3 },
  cardTitolo: { fontSize: 13, fontWeight: "700", color: colori.testo },
  cardRegione: { fontSize: 11, color: colori.testoSecondario },
  cardBadge: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badgePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgePillTesto: { fontSize: 9.5, fontWeight: "700" },
  badgePillBlu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#e7eefc",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePillBluTesto: { fontSize: 9.5, fontWeight: "700", color: colori.blu },
});
