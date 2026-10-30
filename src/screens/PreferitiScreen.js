import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaStrutturePreferite } from "../lib/preferiti";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

export default function PreferitiScreen({ navigation }) {
  const { session } = useAuth();
  const [preferiti, setPreferiti] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) {
        setPreferiti([]);
        setCaricamento(false);
        return;
      }
      setCaricamento(true);
      caricaStrutturePreferite(session.user.id)
        .then(setPreferiti)
        .finally(() => setCaricamento(false));
    }, [session?.user?.id])
  );

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo style={{ marginBottom: 10 }} />
        <Text style={styles.titolo}>Preferiti</Text>
        <Text style={styles.sottotitolo}>{preferiti.length} strutture salvate</Text>
      </View>

      {caricamento ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colori.blu} />
      ) : !session ? (
        <View style={styles.vuoto}>
          <Ionicons name="heart-outline" size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>Accedi al tuo account per salvare le strutture che ti interessano.</Text>
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
                {item.fotoUrl ? <Image source={{ uri: item.fotoUrl }} style={styles.cardImmagine} /> : null}
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
  card: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colori.bianco,
    overflow: "hidden",
  },
  cardFoto: { height: 84, backgroundColor: colori.bluChiaro },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { padding: 8, gap: 2 },
  cardNome: { fontWeight: "700", fontSize: 11, color: colori.testo },
  cardLocalita: { fontSize: 9, color: colori.testoSecondario },
});
