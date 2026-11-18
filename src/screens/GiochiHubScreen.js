import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
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
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
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
            <Ionicons name="lock-closed-outline" size={28} color={c.primario} />
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
                  <DisegnoImpiccato size={26} fase={6} colorePatibolo="#FFFFFF" coloreOmino="#FFFFFF" />
                ) : (
                  <Ionicons name={gioco.icona} size={26} color="#FFFFFF" />
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

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    contenuto: { paddingHorizontal: spazio.l, paddingTop: spazio.s - 2, paddingBottom: spazio.xxl - 8, gap: spazio.s + 2 },
    titolo: { fontSize: 20, fontWeight: "800", color: c.testo, textAlign: "center", marginTop: spazio.xs },
    sottotitolo: { fontSize: 13, color: c.testoSecondario, textAlign: "center", marginBottom: spazio.s },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spazio.m,
      borderRadius: raggio.l,
      padding: spazio.m + 2,
      ...ombra(c),
    },
    cardIcona: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitolo: { fontSize: 15, fontWeight: "800", color: c.testo },
    cardDescrizione: { fontSize: 11.5, color: c.testoSecondario, marginTop: 2 },
    cardArrivo: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
    bloccoAccesso: {
      alignItems: "center",
      gap: spazio.s,
      backgroundColor: c.sfondoGruppo,
      borderRadius: raggio.l,
      padding: spazio.xl - 2,
      marginTop: spazio.m,
      ...ombra(c),
    },
    bloccoAccessoTitolo: { fontSize: 15, fontWeight: "800", color: c.testo, textAlign: "center" },
    bloccoAccessoTesto: { fontSize: 12.5, color: c.testoSecondario, textAlign: "center" },
    bottoneAccedi: {
      backgroundColor: c.primario,
      borderRadius: raggio.m - 2,
      paddingHorizontal: spazio.l + 4,
      paddingVertical: spazio.m - 1,
      marginTop: spazio.s - 2,
    },
    bottoneAccediTesto: { color: c.sulPrimario, fontWeight: "700", fontSize: 13 },
  });
}
