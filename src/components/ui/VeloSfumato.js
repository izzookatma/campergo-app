import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Sfumatura scura sulle foto (dal trasparente al blu notte): sostituisce i
// rettangoli neri piatti e fa leggere testi, prezzi e puntini sopra la foto.
// `altezza` assente = copre tutta la foto (banner); con un numero resta in
// basso.
export default function VeloSfumato({ altezza, forza = 0.55, style }) {
  const posizione = altezza ? { position: "absolute", left: 0, right: 0, bottom: 0, height: altezza } : StyleSheet.absoluteFill;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(8,24,36,0)", `rgba(8,24,36,${forza})`]}
      locations={[0, 1]}
      style={[posizione, style]}
    />
  );
}
