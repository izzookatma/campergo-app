import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { caricaConversazioni } from "../lib/mercatino";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import ScheletroCard from "../components/ScheletroCard";
import { useT } from "../i18n/i18n";

function formattaData(iso) {
  const data = new Date(iso);
  const oggi = new Date();
  const stessoGiorno = data.toDateString() === oggi.toDateString();
  return stessoGiorno
    ? data.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : data.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export default function MessaggiScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { session } = useAuth();
  const [conversazioni, setConversazioni] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  useFocusEffect(
    useCallback(() => {
      Promise.resolve().then(() => {
        if (!session?.user?.id) {
          setCaricamento(false);
          return;
        }
        setCaricamento(true);
        caricaConversazioni(session.user.id)
          .then(setConversazioni)
          .catch((e) => console.error("Errore nel caricare i messaggi:", e))
          .finally(() => setCaricamento(false));
      });
    }, [session])
  );

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <Text style={styles.titolo}>{t("mercatino.iMieiMessaggi")}</Text>
      </View>

      {caricamento ? (
        <ScheletroCard righe={4} />
      ) : !session ? (
        <View style={styles.vuoto}>
          <Ionicons name="chatbubbles-outline" size={28} color={c.testoSecondario} />
          <Text style={styles.vuotoTesto}>{t("mercatino.accediPerMessaggi")}</Text>
        </View>
      ) : conversazioni.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name="chatbubbles-outline" size={28} color={c.testoSecondario} />
          <Text style={styles.vuotoTesto}>{t("mercatino.nessunMessaggio")}</Text>
        </View>
      ) : (
        <FlatList
          data={conversazioni}
          keyExtractor={(c) => c.chiave}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate("Conversazione", { conversazione: item })}>
              <View style={styles.cardFoto}>
                <ImmagineConRiserva
                  uri={item.annuncioFoto}
                  larghezza={120}
                  style={styles.cardImmagine}
                  icona="pricetag-outline"
                  iconaDimensione={18}
                  iconaColore={c.primario}
                />
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

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondo },
  intestazione: { paddingHorizontal: 20, paddingTop: 10 },
  titolo: { textAlign: "center", fontSize: 21, fontWeight: "800", color: c.testo },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  vuotoTesto: { textAlign: "center", fontSize: 12.5, color: c.testoSecondario },
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
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: c.primarioChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 2 },
  cardTitolo: { fontSize: 13, fontWeight: "700", color: c.testo },
  cardMessaggio: { fontSize: 11.5, color: c.testoSecondario },
  cardData: { fontSize: 10, color: c.testoSecondario },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.primario,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeTesto: { color: c.sulPrimario, fontSize: 10, fontWeight: "800" },
  });
}
