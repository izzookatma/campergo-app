import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTema, ombra } from "../theme/tema";
import { caricaArticoli, etichettaRubrica } from "../lib/blog";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import ScheletroCard from "../components/ScheletroCard";
import { useT } from "../i18n/i18n";

function dataBreve(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const [articoli, setArticoli] = useState(null);
  const [rubricaScelta, setRubricaScelta] = useState(null);

  useEffect(() => {
    caricaArticoli()
      .then(setArticoli)
      .catch((e) => console.error("Errore nel caricare il blog:", e));
  }, []);

  const rubricheDisponibili = useMemo(
    () => [...new Set((articoli || []).map((a) => a.rubrica).filter(Boolean))],
    [articoli]
  );

  const inEvidenza = (articoli || []).find((a) => a.in_evidenza) || (articoli || [])[0] || null;
  const resto = (articoli || [])
    .filter((a) => a.slug !== inEvidenza?.slug)
    .filter((a) => !rubricaScelta || a.rubrica === rubricaScelta);

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo onPress={() => navigation.navigate("EsploraHub")} />
        <Text style={styles.titolo}>NaturaGo Explorer</Text>
        <Text style={styles.sottotitolo}>{t("blog.sottotitolo")}</Text>
      </View>

      {articoli === null ? (
        <ScheletroCard righe={4} />
      ) : articoli.length === 0 ? (
        <View style={styles.vuoto}>
          <Text style={styles.vuotoTesto}>{t("blog.nessunArticolo")}</Text>
        </View>
      ) : (
        <FlatList
          data={resto}
          keyExtractor={(a) => a.slug}
          contentContainerStyle={styles.lista}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              {inEvidenza && (
                <Pressable
                  style={styles.cardEvidenza}
                  onPress={() => navigation.navigate("ArticoloBlog", { slug: inEvidenza.slug })}
                >
                  <ImmagineConRiserva
                    uri={inEvidenza.foto_copertina}
                    larghezza={900}
                    style={styles.cardEvidenzaFoto}
                    icona={null}
                  />
                  <View style={styles.cardEvidenzaOmbra} />
                  <View style={styles.cardEvidenzaTesto}>
                    {inEvidenza.rubrica && (
                      <Text style={styles.cardEvidenzaRubrica}>{etichettaRubrica(inEvidenza.rubrica)}</Text>
                    )}
                    <Text style={styles.cardEvidenzaTitolo} numberOfLines={2}>
                      {inEvidenza.titolo}
                    </Text>
                  </View>
                </Pressable>
              )}

              {rubricheDisponibili.length > 1 && (
                <View style={styles.filtri}>
                  <Pressable
                    style={[styles.chip, rubricaScelta === null && styles.chipAttivo]}
                    onPress={() => setRubricaScelta(null)}
                  >
                    <Text style={[styles.chipTesto, rubricaScelta === null && styles.chipTestoAttivo]}>{t("mercatino.tutte")}</Text>
                  </Pressable>
                  {rubricheDisponibili.map((r) => (
                    <Pressable
                      key={r}
                      style={[styles.chip, rubricaScelta === r && styles.chipAttivo]}
                      onPress={() => setRubricaScelta(r)}
                    >
                      <Text style={[styles.chipTesto, rubricaScelta === r && styles.chipTestoAttivo]}>
                        {etichettaRubrica(r)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("ArticoloBlog", { slug: item.slug })}
            >
              <View style={[styles.cardFoto, styles.cardFotoSegnaposto]}>
                <ImmagineConRiserva
                  uri={item.foto_copertina}
                  larghezza={200}
                  style={{ width: "100%", height: "100%" }}
                  iconaDimensione={20}
                  iconaColore={c.testoSecondario}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitolo} numberOfLines={2}>
                  {item.titolo}
                </Text>
                <Text style={styles.cardSottotitolo} numberOfLines={1}>
                  {[etichettaRubrica(item.rubrica), dataBreve(item.data_pubblicazione)].filter(Boolean).join(" · ")}
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
  intestazione: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, gap: 4 },
  titolo: { fontSize: 19, fontWeight: "800", color: c.testo, textAlign: "center", marginTop: 4 },
  sottotitolo: { fontSize: 12, color: c.testoSecondario, textAlign: "center" },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  vuotoTesto: { fontSize: 12.5, color: c.testoSecondario, textAlign: "center" },
  lista: { padding: 20, gap: 12 },
  cardEvidenza: { height: 180, borderRadius: 16, overflow: "hidden", backgroundColor: c.separatore },
  cardEvidenzaFoto: { width: "100%", height: "100%", position: "absolute" },
  cardEvidenzaOmbra: { position: "absolute", inset: 0, backgroundColor: "rgba(15,29,23,0.45)" },
  cardEvidenzaTesto: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 14, gap: 4 },
  cardEvidenzaRubrica: {
    alignSelf: "flex-start",
    backgroundColor: c.accento,
    color: c.sulAccento,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  cardEvidenzaTitolo: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", lineHeight: 21 },
  filtri: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.sfondoGruppo,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.separatore,
  },
  chipAttivo: { backgroundColor: c.primario, borderColor: c.primario },
  chipTesto: { fontSize: 11.5, fontWeight: "600", color: c.testoSecondario },
  chipTestoAttivo: { color: c.sulPrimario },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: c.sfondoGruppo,
    borderRadius: raggio.l,
    padding: 12,
    ...ombra(c),
  },
  cardFoto: { width: 76, height: 76, borderRadius: 10, overflow: "hidden" },
  cardFotoSegnaposto: { backgroundColor: c.sfondo, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, justifyContent: "center", gap: 4 },
  cardTitolo: { fontSize: 13, fontWeight: "700", color: c.testo, lineHeight: 17 },
  cardSottotitolo: { fontSize: 11, color: c.testoSecondario },
  });
}
