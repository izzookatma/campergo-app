import { Pressable, Text } from "react-native";
import { useTema } from "../../theme/tema";
import { vibraLeggera } from "../../lib/vibrazione";

// Chip di filtro (toggle) unico dell'app: prima ogni schermata (Esplora,
// Cultura, Sentieri, Percorsi 4x4, Mercatino) ridisegnava a mano chip/
// chipAttivo/chipTesto/chipTestoAttivo, con differenze non volute — es. il
// colore attivo era il verde del sito in una schermata, il blu marchio in
// un'altra, bianco scritto a mano invece di `c.sulPrimario` in un'altra
// ancora. `compatto`: testo più piccolo (11.5 invece di 14), per le
// schermate con molte chip in poco spazio.
// `coloreAttivo`/`coloreTestoAttivo`: per i casi con un colore proprio per
// categoria (es. Musei/Borghi/Attività in CulturaScreen, un colore diverso
// per ciascuna) invece del blu marchio di default.
export default function Chip({
  etichetta,
  attivo,
  onPress,
  onLayout,
  compatto = false,
  vibra = true,
  coloreAttivo,
  coloreTestoAttivo,
  style,
}) {
  const { c, raggio } = useTema();
  const sfondoAttivo = coloreAttivo || c.primario;
  const testoAttivo = coloreTestoAttivo || c.sulPrimario;
  return (
    <Pressable
      onLayout={onLayout}
      onPress={() => {
        if (vibra) vibraLeggera();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!attivo }}
      style={[
        {
          paddingHorizontal: compatto ? 10 : 12,
          height: compatto ? 36 : 44,
          borderRadius: raggio.pillola,
          backgroundColor: attivo ? sfondoAttivo : c.sfondoGruppo,
          justifyContent: "center",
          borderWidth: 1,
          borderColor: attivo ? sfondoAttivo : c.separatore,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: compatto ? 11.5 : 14,
          fontWeight: "600",
          color: attivo ? testoAttivo : c.testoSecondario,
        }}
      >
        {etichetta}
      </Text>
    </Pressable>
  );
}
