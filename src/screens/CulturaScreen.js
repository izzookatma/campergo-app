import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { caricaSchedeCulturali, CATEGORIA_CULTURALE_META } from "../lib/cultura";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

const CATEGORIE = Object.keys(CATEGORIA_CULTURALE_META);

export default function CulturaScreen({ route, navigation }) {
  const [categoria, setCategoria] = useState(route.params?.categoria || CATEGORIE[0]);
  const [termine, setTermine] = useState("");
  const [schede, setSchede] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    setCaricamento(true);
    const scaduto = setTimeout(() => {
      caricaSchedeCulturali({ categoria, termine: termine.trim() || undefined })
        .then(setSchede)
        .catch((e) => console.error("Errore nel caricare le schede culturali:", e))
        .finally(() => setCaricamento(false));
    }, 300);
    return () => clearTimeout(scaduto);
  }, [categoria, termine]);

  const meta = CATEGORIA_CULTURALE_META[categoria];

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo onPress={() => navigation.navigate("EsploraHub")} />
        <Text style={styles.titolo}>Musei, borghi e attività</Text>
        <View style={styles.filtri}>
          {CATEGORIE.map((c) => {
            const m = CATEGORIA_CULTURALE_META[c];
            const attivo = categoria === c;
            return (
              <Pressable
                key={c}
                style={[styles.chip, attivo && { backgroundColor: m.colore, borderColor: m.colore }]}
                onPress={() => setCategoria(c)}
              >
                <Text style={[styles.chipTesto, attivo && styles.chipTestoAttivo]}>{m.etichetta}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.ricerca}>
          <Ionicons name="search-outline" size={14} color={colori.testoSecondario} />
          <TextInput
            style={styles.ricercaInput}
            placeholder="Città, regione o nome…"
            placeholderTextColor={colori.testoSecondario}
            value={termine}
            onChangeText={setTermine}
          />
        </View>
      </View>

      {caricamento ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={meta.colore} />
      ) : schede.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name={meta.icona} size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>Nessun risultato trovato.</Text>
        </View>
      ) : (
        <FlatList
          data={schede}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListHeaderComponent={<Text style={styles.contatore}>{schede.length} risultati</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate("SchedaCulturale", { id: item.id })}>
              <View style={[styles.cardFoto, { backgroundColor: meta.colore + "18" }]}>
                {item.fotoUrl ? (
                  <Image source={{ uri: item.fotoUrl }} style={styles.cardImmagine} />
                ) : (
                  <Ionicons name={meta.icona} size={22} color={meta.colore} />
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitolo} numberOfLines={1}>
                  {item.titolo}
                </Text>
                <Text style={styles.cardLocalita} numberOfLines={1}>
                  {[item.citta, item.regione].filter(Boolean).join(", ")}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  titolo: { fontSize: 19, fontWeight: "800", color: colori.testo },
  filtri: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: colori.bianco,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colori.bordo,
  },
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
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 3 },
  cardTitolo: { fontSize: 13, fontWeight: "700", color: colori.testo },
  cardLocalita: { fontSize: 11, color: colori.testoSecondario },
});
