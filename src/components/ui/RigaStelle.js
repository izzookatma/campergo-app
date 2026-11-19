import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";

// Riga di 1-5 stelle per mostrare un punteggio (recensioni), prima
// ridefinita identica in 3 schermate diverse (Scheda struttura, Scheda
// culturale, Itinerario), ognuna col colore oro scritto a mano.
export default function RigaStelle({ punteggio, size = 12 }) {
  const { c } = useTema();
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= punteggio ? "star" : "star-outline"} size={size} color={c.voto} />
      ))}
    </View>
  );
}
