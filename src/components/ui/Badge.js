import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";

// Pillola piccola con icona opzionale + testo, un solo componente invece
// delle 3+ varianti ridisegnate a mano in ogni schermata (Scheda struttura,
// Cultura, Itinerari), ognuna con un colore leggermente diverso.
// `tono`: "neutro" (default, blu marchio), "successo", "attenzione",
// "pericolo", "viola" (bene culturale).
export default function Badge({ testo, icona, tono = "neutro", style }) {
  const { c, raggio } = useTema();
  const palette = {
    neutro: { sfondo: c.primarioChiaro, colore: c.primario },
    successo: { sfondo: c.successoChiaro, colore: c.successo },
    attenzione: { sfondo: c.attenzioneChiaro, colore: c.attenzione },
    pericolo: { sfondo: c.pericoloChiaro, colore: c.pericolo },
    viola: { sfondo: c.violaChiaro, colore: c.viola },
  }[tono] || { sfondo: c.primarioChiaro, colore: c.primario };

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          backgroundColor: palette.sfondo,
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: raggio.pillola,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      {icona && <Ionicons name={icona} size={12} color={palette.colore} />}
      <Text style={{ fontSize: 13, fontWeight: "700", color: palette.colore }}>{testo}</Text>
    </View>
  );
}
