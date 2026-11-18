import { Text } from "react-native";
import { useTema } from "../../theme/tema";

// Testo con la scala di NaturaGo: <Testo v="titolo">…</Testo>.
// Varianti: titoloGrande, titolo, sezione, corpo, corpoForte, secondario,
// nota, etichetta. `tono`: "testo" (default), "secondario", "primario",
// "pericolo", "sulPrimario". La dimensione segue le impostazioni di testo del
// telefono, ma con un tetto (1.6x) per non rompere i layout.
export default function Testo({ v = "corpo", tono, style, children, ...resto }) {
  const { c, tipo } = useTema();
  const nomeTono = tono || (v === "secondario" || v === "nota" || v === "etichetta" ? "secondario" : "testo");
  const colore = nomeTono === "secondario" ? c.testoSecondario : c[nomeTono] || c.testo;
  return (
    <Text maxFontSizeMultiplier={1.6} {...resto} style={[tipo[v], { color: colore }, style]}>
      {children}
    </Text>
  );
}
