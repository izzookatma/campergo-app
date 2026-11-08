import { View, StyleSheet } from "react-native";
import { colori } from "../theme/colors";

// Dado disegnato coi pallini (nessuna immagine): posizioni classiche 1-6
// su una griglia 3x3, indici da 0 (in alto a sinistra) a 8 (in basso a
// destra).
const PUNTI_PER_FACCIA = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function Dado({ valore = 1, size = 64, colore }) {
  const punti = PUNTI_PER_FACCIA[valore] || [];
  return (
    <View style={[styles.dado, { width: size, height: size, borderColor: colore || colori.testo }]}>
      {Array.from({ length: 9 }).map((_, indice) => (
        <View key={indice} style={styles.cella}>
          {punti.includes(indice) && <View style={[styles.punto, { backgroundColor: colore || colori.testo }]} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dado: {
    borderRadius: 14,
    borderWidth: 2.5,
    backgroundColor: colori.bianco,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 6,
  },
  cella: { width: "33.33%", height: "33.33%", alignItems: "center", justifyContent: "center" },
  punto: { width: "40%", height: "40%", borderRadius: 999 },
});
