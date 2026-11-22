import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { elencaItinerariOfflineSalvati, rimuoviItinerarioOfflineSalvato, CATEGORIA_ITINERARIO_META } from "../lib/itinerari";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import { useT } from "../i18n/i18n";

export default function ItinerariOfflineScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const [salvati, setSalvati] = useState(null);

  const carica = useCallback(() => {
    elencaItinerariOfflineSalvati()
      .then(setSalvati)
      .catch((e) => console.error("Errore nel leggere gli itinerari salvati offline:", e));
  }, []);

  useFocusEffect(carica);

  const rimuovi = (item) => {
    Alert.alert(t("itinerariOffline.rimuovereTitolo"), t("itinerariOffline.rimuovereMessaggio", { titolo: item.titolo }), [
      { text: t("comune.annulla"), style: "cancel" },
      {
        text: t("comune.rimuovi"),
        style: "destructive",
        onPress: () => rimuoviItinerarioOfflineSalvato(item.id).then(carica),
      },
    ]);
  };

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("comune.indietro")} hitSlop={8} style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={c.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>{t("profilo.itinerariOffline")}</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <FlatList
        data={salvati || []}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={<Text style={styles.spiegazione}>{t("itinerariOffline.spiegazione")}</Text>}
        ListEmptyComponent={
          salvati === null ? (
            <ActivityIndicator color={c.primario} style={{ marginTop: 30 }} />
          ) : (
            <Text style={styles.vuoto}>{t("itinerariOffline.nessunoSalvato")}</Text>
          )
        }
        renderItem={({ item }) => {
          const meta = CATEGORIA_ITINERARIO_META[item.categoria];
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("ItinerarioDettaglio", { itinerarioId: item.id })}
            >
              <View style={styles.cardFoto}>
                <ImmagineConRiserva
                  uri={item.fotoUrl}
                  larghezza={120}
                  style={styles.cardImmagine}
                  icona={meta?.icona || "trail-sign-outline"}
                  iconaColore={c.primario}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitolo} numberOfLines={1}>
                  {item.titolo}
                </Text>
                {item.regione && <Text style={styles.cardRegione}>{item.regione}</Text>}
              </View>
              <Pressable
                onPress={() => rimuovi(item)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t("itinerario.rimuoviOffline")}
              >
                <Ionicons name="trash-outline" size={18} color={c.testoSecondario} />
              </Pressable>
            </Pressable>
          );
        }}
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
  spiegazione: { fontSize: 12, color: c.testoSecondario, lineHeight: 17, marginBottom: 6 },
  vuoto: { fontSize: 12.5, color: c.testoSecondario, textAlign: "center", marginTop: 20, lineHeight: 18 },
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
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: c.primarioChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 3 },
  cardTitolo: { fontSize: 13.5, fontWeight: "700", color: c.testo },
  cardRegione: { fontSize: 11.5, color: c.testoSecondario },
  });
}
