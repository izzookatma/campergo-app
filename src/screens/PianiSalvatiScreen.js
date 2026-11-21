import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { caricaPianiSalvati, eliminaPianoSalvato } from "../lib/pianiSalvati";
import { eVacanzaPersonale, intervalloDate } from "../lib/vacanza";
import { useT } from "../i18n/i18n";

function dataBreve(iso) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export default function PianiSalvatiScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { session } = useAuth();
  const [piani, setPiani] = useState(null);

  const carica = useCallback(() => {
    caricaPianiSalvati(session.user.id)
      .then(setPiani)
      .catch((e) => console.error("Errore nel caricare i piani salvati:", e));
  }, [session.user.id]);

  useFocusEffect(carica);

  const elimina = (p) => {
    Alert.alert(t("pianiSalvati.eliminareTitolo"), p.richiesta, [
      { text: t("comune.annulla"), style: "cancel" },
      {
        text: t("comune.elimina"),
        style: "destructive",
        onPress: () => {
          setPiani((prev) => prev.filter((x) => x.id !== p.id));
          eliminaPianoSalvato(p.id).catch((e) => {
            console.error("Errore nell'eliminare il piano:", e);
            carica();
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={c.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>{t("profilo.iMieiPianiViaggio")}</Text>
        <Pressable style={styles.tornaIndietro} onPress={() => navigation.navigate("CreaVacanza")} accessibilityRole="button" accessibilityLabel={t("vacanza.titolo")}>
          <Ionicons name="add" size={20} color={c.primario} />
        </Pressable>
      </SafeAreaView>

      <FlatList
        data={piani || []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          piani === null ? (
            <ActivityIndicator color={c.primario} style={{ marginTop: 30 }} />
          ) : (
            <Text style={styles.vuoto}>{t("pianiSalvati.nessunoSalvato")}</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              item.piano?.tipo === "personale"
                ? navigation.navigate("CreaVacanza", { pianoSalvato: item.piano, idPiano: item.id })
                : navigation.navigate("PianificaViaggio", { pianoSalvato: item.piano, richiestaSalvata: item.richiesta })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitolo} numberOfLines={2}>
                {item.richiesta}
              </Text>
              {eVacanzaPersonale(item.piano) && intervalloDate(item.piano) ? (
                <Text style={styles.cardDate}>{intervalloDate(item.piano)}</Text>
              ) : null}
              <Text style={styles.cardSottotitolo}>
                {t("pianiSalvati.giorniTappe", { n: item.giorniRichiesti, tappe: (item.tappe || []).join(" → ") })}
              </Text>
              <Text style={styles.cardData}>{t("pianiSalvati.salvatoIl", { data: dataBreve(item.creatoIl) })}</Text>
            </View>
            <Pressable style={styles.elimina} onPress={() => elimina(item)} hitSlop={8}>
              <Ionicons name="trash-outline" size={17} color={c.pericolo} />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondo },
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.separatore,
  },
  tornaIndietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  titoloIntestazione: { fontSize: 14.5, fontWeight: "800", color: c.testo },
  lista: { padding: 20, gap: 10, flexGrow: 1 },
  vuoto: { fontSize: 12.5, color: c.testoSecondario, textAlign: "center", marginTop: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: c.sfondoGruppo,
    borderRadius: raggio.l,
    padding: 13,
    ...ombra(c),
  },
  cardTitolo: { fontSize: 13.5, fontWeight: "700", color: c.testo },
  cardSottotitolo: { fontSize: 11.5, color: c.primario, fontWeight: "600", marginTop: 3 },
  cardDate: { fontSize: 13, fontWeight: "700", color: c.primario, marginTop: 3 },
  cardData: { fontSize: 10.5, color: c.testoSecondario, marginTop: 3 },
  elimina: { padding: 6 },
  });
}
