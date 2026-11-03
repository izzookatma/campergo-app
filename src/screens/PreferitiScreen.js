import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaStrutturePreferite } from "../lib/preferiti";
import { salvaInCache, leggiDaCache } from "../lib/cacheOffline";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import ImmagineConRiserva from "../components/ImmagineConRiserva";

export default function PreferitiScreen({ navigation }) {
  const { session } = useAuth();
  const [preferiti, setPreferiti] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [senzaConnessione, setSenzaConnessione] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.resolve().then(() => {
        if (!session?.user?.id) {
          setPreferiti([]);
          setCaricamento(false);
          return;
        }
        // Cache per utente (non da condividere tra account diversi sullo
        // stesso telefono): resta consultabile anche senza connessione,
        // come già per la lista base di Esplora e la Mappa.
        const chiaveCache = `preferiti_${session.user.id}`;
        setCaricamento(true);
        caricaStrutturePreferite(session.user.id)
          .then((dati) => {
            setPreferiti(dati);
            setSenzaConnessione(false);
            salvaInCache(chiaveCache, dati);
          })
          .catch(async () => {
            const cache = await leggiDaCache(chiaveCache);
            if (cache) {
              setPreferiti(cache.dati);
              setSenzaConnessione(true);
            }
          })
          .finally(() => setCaricamento(false));
      });
    }, [session])
  );

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo style={{ marginBottom: 10 }} />
        <Text style={styles.titolo}>Preferiti</Text>
        <Text style={styles.sottotitolo}>{preferiti.length} strutture salvate</Text>
      </View>

      {senzaConnessione && (
        <View style={styles.bannerOffline}>
          <Ionicons name="cloud-offline-outline" size={16} color={colori.testoSecondario} />
          <Text style={styles.bannerOfflineTesto}>Senza connessione: stai vedendo gli ultimi preferiti salvati.</Text>
        </View>
      )}

      {caricamento ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colori.blu} />
      ) : !session ? (
        <View style={styles.vuoto}>
          <Ionicons name="heart-outline" size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>Accedi al tuo account per salvare le strutture che ti interessano.</Text>
          <Pressable style={styles.pulsanteAccedi} onPress={() => navigation.navigate("Accedi")}>
            <Text style={styles.pulsanteAccediTesto}>Accedi</Text>
          </Pressable>
        </View>
      ) : preferiti.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name="heart-outline" size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>Non hai ancora salvato nessuna struttura.</Text>
        </View>
      ) : (
        <FlatList
          data={preferiti}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("Scheda", { struttura: item })}
            >
              <View style={styles.cardFoto}>
                <ImmagineConRiserva
                  uri={item.fotoUrl}
                  larghezza={160}
                  style={styles.cardImmagine}
                  iconaColore={colori.blu}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardNome}>{item.nome}</Text>
                <Text style={styles.cardLocalita}>{item.localita}</Text>
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
  sottotitolo: { fontSize: 11, color: colori.testoSecondario },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  vuotoTesto: { textAlign: "center", fontSize: 12.5, color: colori.testoSecondario },
  pulsanteAccedi: {
    backgroundColor: colori.blu,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  pulsanteAccediTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13 },
  bannerOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  bannerOfflineTesto: { flex: 1, fontSize: 11.5, color: colori.testoSecondario, fontWeight: "600" },
  card: {
    flex: 1,
    borderRadius: raggioCard,
    backgroundColor: colori.bianco,
    ...ombraCard,
  },
  cardFoto: {
    height: 84,
    borderTopLeftRadius: raggioCard,
    borderTopRightRadius: raggioCard,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { padding: 8, gap: 2 },
  cardNome: { fontWeight: "700", fontSize: 11, color: colori.testo },
  cardLocalita: { fontSize: 9, color: colori.testoSecondario },
});
