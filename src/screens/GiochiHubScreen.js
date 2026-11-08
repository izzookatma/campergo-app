import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { temaGiochi } from "../theme/giochiTema";
import { useAuth } from "../context/AuthContext";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import DisegnoImpiccato from "../components/DisegnoImpiccato";

// Gratuiti per chi ha un account NaturaGo (come la ricerca con l'IA in
// EsploraHubScreen): senza login si vede la stessa schermata ma con
// l'invito ad accedere, non i giochi.
const GIOCHI = [
  {
    chiave: "tris",
    etichetta: "Tris",
    descrizione: "Contro il computer o in due, a turni",
    icona: "grid-outline",
    colore: temaGiochi.viola,
    tinta: temaGiochi.violaChiaro,
    schermo: "Tris",
  },
  {
    chiave: "coppie",
    etichetta: "Gioco delle coppie",
    descrizione: "Memory con le foto di campeggi, camper e tende",
    icona: "images-outline",
    colore: temaGiochi.rosa,
    tinta: temaGiochi.rosaChiaro,
    schermo: "Memory",
  },
  {
    chiave: "cruciverba",
    etichetta: "Cruciverba",
    descrizione: "Domande sul mondo dei campeggi, più schemi",
    icona: "newspaper-outline",
    colore: temaGiochi.verde,
    tinta: temaGiochi.verdeChiaro,
    schermo: "Cruciverba",
  },
  {
    chiave: "impiccato",
    etichetta: "Impiccato",
    descrizione: "Indovina la parola lettera per lettera",
    icona: "impiccato",
    colore: temaGiochi.giallo,
    tinta: temaGiochi.gialloChiaro,
    schermo: "Impiccato",
  },
  {
    chiave: "oca",
    etichetta: "Sentiero del campeggio",
    descrizione: "Tabellone con dado e domande, contro il computer o in due",
    icona: "dice-outline",
    colore: temaGiochi.azzurro,
    tinta: temaGiochi.azzurroChiaro,
    schermo: "Oca",
  },
];

export default function GiochiHubScreen({ navigation }) {
  const { session } = useAuth();

  const vaiA = (gioco) => {
    if (gioco.inArrivo) {
      Alert.alert(gioco.etichetta, "Questo gioco arriverà in una prossima versione dell'app.");
      return;
    }
    navigation.push(gioco.schermo);
  };

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.contenuto} showsVerticalScrollIndicator={false}>
        <MarchioNaturaGo style={{ marginBottom: 2 }} />
        <Text style={styles.titolo}>Giochi da viaggio</Text>
        <Text style={styles.sottotitolo}>Per passare il tempo mentre si viaggia</Text>

        {!session ? (
          <View style={styles.bloccoAccesso}>
            <Ionicons name="lock-closed-outline" size={28} color={colori.blu} />
            <Text style={styles.bloccoAccessoTitolo}>Giochi gratuiti per chi ha un account</Text>
            <Text style={styles.bloccoAccessoTesto}>Accedi o registrati, gratis, per sbloccare tutti i giochi da viaggio.</Text>
            <Pressable style={styles.bottoneAccedi} onPress={() => navigation.navigate("Accedi")}>
              <Text style={styles.bottoneAccediTesto}>Accedi o registrati</Text>
            </Pressable>
          </View>
        ) : (
          GIOCHI.map((gioco) => (
            <Pressable
              key={gioco.chiave}
              style={[styles.card, { backgroundColor: gioco.tinta }]}
              onPress={() => vaiA(gioco)}
            >
              <View style={[styles.cardIcona, { backgroundColor: gioco.colore }]}>
                {gioco.icona === "impiccato" ? (
                  <DisegnoImpiccato size={26} fase={6} colorePatibolo={colori.bianco} coloreOmino={colori.bianco} />
                ) : (
                  <Ionicons name={gioco.icona} size={26} color={colori.bianco} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitolo}>{gioco.etichetta}</Text>
                <Text style={styles.cardDescrizione}>{gioco.descrizione}</Text>
              </View>
              {gioco.inArrivo ? (
                <Text style={[styles.cardArrivo, { color: gioco.colore }]}>In arrivo</Text>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={gioco.colore} />
              )}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  contenuto: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24, gap: 10 },
  titolo: { fontSize: 20, fontWeight: "800", color: colori.testo, textAlign: "center", marginTop: 4 },
  sottotitolo: { fontSize: 13, color: colori.testoSecondario, textAlign: "center", marginBottom: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: raggioCard,
    padding: 14,
    ...ombraCard,
  },
  cardIcona: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo },
  cardDescrizione: { fontSize: 11.5, color: colori.testoSecondario, marginTop: 2 },
  cardArrivo: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  bloccoAccesso: {
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.bianco,
    borderRadius: raggioCard,
    padding: 22,
    marginTop: 12,
    ...ombraCard,
  },
  bloccoAccessoTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo, textAlign: "center" },
  bloccoAccessoTesto: { fontSize: 12.5, color: colori.testoSecondario, textAlign: "center" },
  bottoneAccedi: {
    backgroundColor: colori.blu,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 6,
  },
  bottoneAccediTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13 },
});
