import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../../theme/tema";
import Testo from "./Testo";

// Elenco "a gruppi" come le Impostazioni di iPhone: un riquadro arrotondato
// con righe separate da una linea sottile.
// <Gruppo titolo="Account"><Riga icona="person-outline" testo="Profilo" onPress={…} />…</Gruppo>
export function Gruppo({ titolo, children, style }) {
  const { c, raggio } = useTema();
  const figli = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={[{ gap: 6 }, style]}>
      {titolo ? (
        <Testo v="etichetta" style={{ textTransform: "uppercase", marginLeft: 16 }} accessibilityRole="header">
          {titolo}
        </Testo>
      ) : null}
      <View style={[{ backgroundColor: c.sfondoGruppo, borderRadius: raggio.l, overflow: "hidden" }, ombra(c)]}>
        {figli.map((figlio, i) => (
          <View key={figlio.key ?? i}>
            {figlio}
            {i < figli.length - 1 && <View style={{ height: 1, backgroundColor: c.separatore, marginLeft: 52 }} />}
          </View>
        ))}
      </View>
    </View>
  );
}

// Riga con icona a sinistra, testo, valore facoltativo e freccia.
export function Riga({ icona, testo, valore, onPress, pericolo = false, senzaFreccia = false }) {
  const { c } = useTema();
  const colore = pericolo ? c.pericolo : c.primario;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={valore ? `${testo}, ${valore}` : testo}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 52,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: pressed ? c.primarioChiaro : "transparent",
      })}
    >
      {icona ? <Ionicons name={icona} size={22} color={colore} style={{ width: 24 }} /> : null}
      <Testo v="corpo" style={{ flex: 1 }} tono={pericolo ? "pericolo" : "testo"}>
        {testo}
      </Testo>
      {valore ? <Testo v="secondario">{valore}</Testo> : null}
      {!senzaFreccia && <Ionicons name="chevron-forward" size={16} color={c.inattivo} />}
    </Pressable>
  );
}
