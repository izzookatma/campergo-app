import { View, Text, StyleSheet } from "react-native";

// Stesso bollino rosso "PROMO" del sito (BollinoPromo.jsx, #C62828): colore
// dedicato a questo badge, diverso dal rosso della Ricerca IA
// (colori.rosso), per restare lo stesso marchio visivo del sito.
export default function BollinoPromo({ style }) {
  return (
    <View style={[styles.bollino, style]}>
      <Text style={styles.testo}>PROMO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bollino: {
    backgroundColor: "#C62828",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  testo: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
