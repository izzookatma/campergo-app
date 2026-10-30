import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaMieSegnalazioni, TIPO_STRUTTURA_SEGNALABILE_META, STATO_SEGNALAZIONE_META } from "../lib/segnalazioni";

export default function MieSegnalazioniScreen({ navigation }) {
  const { session } = useAuth();
  const [segnalazioni, setSegnalazioni] = useState(null);

  const carica = useCallback(() => {
    caricaMieSegnalazioni(session.user.id)
      .then(setSegnalazioni)
      .catch((e) => console.error("Errore nel caricare le segnalazioni:", e));
  }, [session.user.id]);

  useFocusEffect(carica);

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colori.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>Le mie segnalazioni</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <FlatList
        data={segnalazioni || []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <Pressable style={styles.nuova} onPress={() => navigation.navigate("NuovaSegnalazione")}>
            <Ionicons name="add-circle-outline" size={17} color={colori.blu} />
            <Text style={styles.nuovaTesto}>Nuova segnalazione</Text>
          </Pressable>
        }
        ListEmptyComponent={
          segnalazioni === null ? (
            <ActivityIndicator color={colori.blu} style={{ marginTop: 30 }} />
          ) : (
            <Text style={styles.vuoto}>Non hai ancora segnalato nessuna struttura.</Text>
          )
        }
        renderItem={({ item }) => {
          const statoMeta = STATO_SEGNALAZIONE_META[item.stato];
          const tipoMeta = TIPO_STRUTTURA_SEGNALABILE_META[item.tipoStruttura];
          return (
            <View style={styles.card}>
              <View style={styles.cardIntestazione}>
                {tipoMeta && <Ionicons name={tipoMeta.icona} size={14} color={colori.testoSecondario} />}
                <Text style={styles.cardNome}>{item.nome}</Text>
              </View>
              <Text style={styles.cardCitta}>{item.citta}</Text>
              {statoMeta && (
                <View style={[styles.badge, { backgroundColor: statoMeta.colore + "18" }]}>
                  <Text style={[styles.badgeTesto, { color: statoMeta.colore }]}>{statoMeta.etichetta}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.bianco },
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colori.bordo,
  },
  tornaIndietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  titoloIntestazione: { fontSize: 14.5, fontWeight: "800", color: colori.testo },
  lista: { padding: 20, gap: 10, flexGrow: 1 },
  nuova: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.grigioSfondo,
    borderRadius: 12,
    padding: 13,
    marginBottom: 6,
  },
  nuovaTesto: { fontSize: 13, fontWeight: "700", color: colori.blu },
  vuoto: { fontSize: 12.5, color: colori.testoSecondario, textAlign: "center", marginTop: 20 },
  card: {
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 14,
    padding: 13,
    gap: 4,
  },
  cardIntestazione: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardNome: { fontSize: 13.5, fontWeight: "700", color: colori.testo },
  cardCitta: { fontSize: 11.5, color: colori.testoSecondario },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginTop: 4 },
  badgeTesto: { fontSize: 10.5, fontWeight: "700" },
});
