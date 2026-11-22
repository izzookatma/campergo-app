import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";
import { useT } from "../../i18n/i18n";
import Testo from "./Testo";
import Pulsante from "./Pulsante";

// Stato di errore unico dell'app: spiega che non è riuscito il caricamento
// (non "nessun risultato") e offre sempre «Riprova». Se c'è `onIndietro`
// aggiunge anche «Indietro» (schermate di dettaglio, altrimenti senza uscita).
export default function StatoErrore({ onRiprova, onIndietro, messaggio, style }) {
  const { c } = useTema();
  const t = useT();
  return (
    <View
      accessibilityRole="alert"
      style={[{ alignItems: "center", justifyContent: "center", padding: 28, gap: 12 }, style]}
    >
      <Ionicons name="cloud-offline-outline" size={40} color={c.testoSecondario} />
      <Testo style={{ textAlign: "center", color: c.testoSecondario }}>
        {messaggio || t("comune.erroreCaricamento")}
      </Testo>
      {onRiprova ? <Pulsante titolo={t("comune.riprova")} onPress={onRiprova} /> : null}
      {onIndietro ? <Pulsante titolo={t("comune.indietro")} onPress={onIndietro} variante="testo" /> : null}
    </View>
  );
}
