import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";

// Riquadro di avviso a tutta larghezza (icona + testo), un solo componente
// invece delle 2 varianti quasi identiche ridisegnate a mano in Scheda
// struttura ("chiusa temporaneamente", "divieto camper", "dati da
// verificare"). `tono`: "attenzione" (default, arancio), "pericolo" (rosso).
export default function Avviso({ testo, icona, tono = "attenzione" }) {
  const { c } = useTema();
  const palette = {
    attenzione: { sfondo: c.attenzioneChiaro, colore: c.attenzione },
    pericolo: { sfondo: c.pericoloChiaro, colore: c.pericolo },
  }[tono] || { sfondo: c.attenzioneChiaro, colore: c.attenzione };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: palette.sfondo,
        borderRadius: 12,
        padding: 10,
      }}
    >
      <Ionicons name={icona} size={16} color={palette.colore} />
      <Text style={{ flex: 1, fontSize: 13, color: palette.colore, fontWeight: "600" }}>{testo}</Text>
    </View>
  );
}
