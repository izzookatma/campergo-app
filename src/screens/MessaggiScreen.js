import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaConversazioni } from "../lib/mercatino";

function formattaData(iso) {
  const data = new Date(iso);
  const oggi = new Date();
  const stessoGiorno = data.toDateString() === oggi.toDateString();
  return stessoGiorno
    ? data.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : data.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export default function MessaggiScreen({ navigation }) {
  const { session } = useAuth();
  const [conversazioni, setConversazioni] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) {
        setCaricamento(false);
        return;
      }
      setCaricamento(true);
      caricaConversazioni(session.user.id)
        .then(setConversazioni)
        .catch((e) => console.error("Errore nel caricare i messaggi:", e))
        .finally(() => setCaricamento(false));
    }, [session?.user?.id])
  );

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <Text style={styles.titolo}>I miei messaggi</Text>
      </View>

      {caricamento ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colori.blu} />
      ) : !session ? (
        <View style={styles.vuoto}>
          <Ionicons name="chatbubbles-outline" size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>Accedi al tuo account per vedere i tuoi messaggi.</Text>
        </View>
      ) : conversazioni.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name="chatbubbles-outline" size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>Nessun messaggio per ora.</Text>
        </View>
      ) : (
        <FlatList
          data={conversazioni}
          keyExtractor={(c) => c.chiave}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate("Conversazione", { conversazione: item })}>
              <View style={styles.cardFoto}>
                {item.annuncioFoto ? (
                  <Image source={{ uri: item.annuncioFoto }} style={styles.cardImmagine} />
                ) : (
                  <Ionicons name="pricetag-outline" size={18} color={colori.blu} />
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitolo} numberOfLines={1}>
                  {item.annuncioTitolo}
                </Text>
                <Text style={styles.cardMessaggio} numberOfLines={1}>
                  {item.ultimoMessaggio}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={styles.cardData}>{formattaData(item.ultimoMessaggioIl)}</Text>
                {item.nonLetti > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTesto}>{item.nonLetti}</Text>
                  </View>
                )}
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
  intestazione: { paddingHorizontal: 20, paddingTop: 10 },
  titolo: { fontSize: 21, fontWeight: "800", color: colori.testo },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  vuotoTesto: { textAlign: "center", fontSize: 12.5, color: colori.testoSecondario },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colori.bianco,
    borderRadius: 14,
    padding: 12,
  },
  cardFoto: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 2 },
  cardTitolo: { fontSize: 13, fontWeight: "700", color: colori.testo },
  cardMessaggio: { fontSize: 11.5, color: colori.testoSecondario },
  cardData: { fontSize: 10, color: colori.testoSecondario },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeTesto: { color: colori.bianco, fontSize: 10, fontWeight: "800" },
});
