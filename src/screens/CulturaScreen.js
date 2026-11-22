import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { caricaSchedeCulturali, CATEGORIA_CULTURALE_META } from "../lib/cultura";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import ScheletroCard from "../components/ScheletroCard";
import Chip from "../components/ui/Chip";
import { useT } from "../i18n/i18n";
import StatoErrore from "../components/ui/StatoErrore";

const CATEGORIE = Object.keys(CATEGORIA_CULTURALE_META);

export default function CulturaScreen({ route, navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const [categoria, setCategoria] = useState(route.params?.categoria || CATEGORIE[0]);
  const [termine, setTermine] = useState("");
  const [schede, setSchede] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(false);
  const [tentativo, setTentativo] = useState(0);

  useEffect(() => {
    const scaduto = setTimeout(() => {
      setErrore(false);
      caricaSchedeCulturali({ categoria, termine: termine.trim() || undefined })
        .then(setSchede)
        .catch((e) => {
          console.error("Errore nel caricare le schede culturali:", e);
          setSchede([]);
          setErrore(true);
        })
        .finally(() => setCaricamento(false));
    }, 300);
    return () => clearTimeout(scaduto);
  }, [categoria, termine, tentativo]);

  const meta = CATEGORIA_CULTURALE_META[categoria];

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo onPress={() => navigation.navigate("EsploraHub")} />
        <Text style={styles.titolo}>{t("hub.museiBorghiAttivita")}</Text>
        <View style={styles.filtri}>
          {CATEGORIE.map((chiaveCategoria) => {
            const m = CATEGORIA_CULTURALE_META[chiaveCategoria];
            const attivo = categoria === chiaveCategoria;
            return (
              <Chip
                key={chiaveCategoria}
                etichetta={m.etichetta}
                attivo={attivo}
                compatto
                coloreAttivo={m.colore}
                onPress={() => {
                  setCategoria(chiaveCategoria);
                  setCaricamento(true);
                }}
              />
            );
          })}
        </View>
        <View style={styles.ricerca}>
          <Ionicons name="search-outline" size={14} color={c.testoSecondario} />
          <TextInput
            style={styles.ricercaInput}
            placeholder={t("cultura.placeholderRicerca")}
            placeholderTextColor={c.testoSecondario}
            value={termine}
            onChangeText={(t) => {
              setTermine(t);
              setCaricamento(true);
            }}
          />
        </View>
      </View>

      {caricamento ? (
        <ScheletroCard righe={4} />
      ) : errore ? (
        <StatoErrore
          onRiprova={() => {
            setCaricamento(true);
            setTentativo((n) => n + 1);
          }}
        />
      ) : schede.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name={meta.icona} size={28} color={c.testoSecondario} />
          <Text style={styles.vuotoTesto}>{t("comune.nessunRisultatoTrovato")}</Text>
        </View>
      ) : (
        <FlatList
          data={schede}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListHeaderComponent={<Text style={styles.contatore}>{t("comune.risultati", { n: schede.length })}</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate("SchedaCulturale", { id: item.id })}>
              <View style={[styles.cardFoto, { backgroundColor: meta.colore + "18" }]}>
                <ImmagineConRiserva
                  uri={item.fotoUrl}
                  larghezza={160}
                  style={styles.cardImmagine}
                  icona={meta.icona}
                  iconaColore={meta.colore}
                />
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

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondo },
  intestazione: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  titolo: { textAlign: "center", fontSize: 19, fontWeight: "800", color: c.testo },
  filtri: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  ricerca: {
    height: 38,
    borderRadius: 12,
    backgroundColor: c.sfondoGruppo,
    borderWidth: 1,
    borderColor: c.separatore,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  ricercaInput: { flex: 1, fontSize: 12.5, color: c.testo, padding: 0 },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  vuotoTesto: { textAlign: "center", fontSize: 12.5, color: c.testoSecondario },
  contatore: { fontSize: 11, color: c.testoSecondario, marginBottom: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.sfondoGruppo,
    borderRadius: raggio.l,
    padding: 12,
    ...ombra(c),
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
  cardTitolo: { fontSize: 13, fontWeight: "700", color: c.testo },
  cardLocalita: { fontSize: 11, color: c.testoSecondario },
  });
}
