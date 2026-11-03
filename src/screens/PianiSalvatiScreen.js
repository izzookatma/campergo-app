import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaPianiSalvati, eliminaPianoSalvato } from "../lib/pianiSalvati";

function dataBreve(iso) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export default function PianiSalvatiScreen({ navigation }) {
  const { session } = useAuth();
  const [piani, setPiani] = useState(null);

  const carica = useCallback(() => {
    caricaPianiSalvati(session.user.id)
      .then(setPiani)
      .catch((e) => console.error("Errore nel caricare i piani salvati:", e));
  }, [session.user.id]);

  useFocusEffect(carica);

  const elimina = (p) => {
    Alert.alert("Eliminare questo piano?", p.richiesta, [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
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
          <Ionicons name="chevron-back" size={18} color={colori.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>I miei piani di viaggio</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <FlatList
        data={piani || []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          piani === null ? (
            <ActivityIndicator color={colori.blu} style={{ marginTop: 30 }} />
          ) : (
            <Text style={styles.vuoto}>Non hai ancora salvato nessun piano di viaggio.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("PianificaViaggio", { pianoSalvato: item.piano, richiestaSalvata: item.richiesta })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitolo} numberOfLines={2}>
                {item.richiesta}
              </Text>
              <Text style={styles.cardSottotitolo}>
                {item.giorniRichiesti} giorni · {(item.tappe || []).join(" → ")}
              </Text>
              <Text style={styles.cardData}>Salvato il {dataBreve(item.creatoIl)}</Text>
            </View>
            <Pressable style={styles.elimina} onPress={() => elimina(item)} hitSlop={8}>
              <Ionicons name="trash-outline" size={17} color={colori.rosso} />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
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
  vuoto: { fontSize: 12.5, color: colori.testoSecondario, textAlign: "center", marginTop: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colori.bianco,
    borderRadius: raggioCard,
    padding: 13,
    ...ombraCard,
  },
  cardTitolo: { fontSize: 13.5, fontWeight: "700", color: colori.testo },
  cardSottotitolo: { fontSize: 11.5, color: colori.blu, fontWeight: "600", marginTop: 3 },
  cardData: { fontSize: 10.5, color: colori.testoSecondario, marginTop: 3 },
  elimina: { padding: 6 },
});
