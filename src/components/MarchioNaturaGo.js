import { View, Text, Pressable, StyleSheet } from "react-native";
import IconaBussolaLogo from "./IconaBussolaLogo";

// Marchio "NaturaGo" in piccolo, da mettere sopra il contenuto di ogni
// schermata (stessi colori del logo del sito su sfondo chiaro: navbar e
// footer). La copertina d'avvio ha i suoi colori propri (sfondo scuro),
// non usa questo componente. Con `onPress` diventa toccabile (es. "torna
// all'hub di Esplora"), altrimenti resta solo decorativo.
export default function MarchioNaturaGo({ style, onPress }) {
  const contenuto = (
    <View style={[styles.marchio, style]}>
      <IconaBussolaLogo size={26} />
      <Text style={styles.testo}>
        NATURA<Text style={styles.go}>GO</Text>
      </Text>
    </View>
  );

  if (!onPress) return contenuto;

  return <Pressable onPress={onPress}>{contenuto}</Pressable>;
}

const styles = StyleSheet.create({
  marchio: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "center" },
  testo: { fontSize: 17, fontWeight: "800", color: "#0D3A2B", letterSpacing: -0.3 },
  go: { color: "#E08A3E" },
});
