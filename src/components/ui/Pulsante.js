import { useState } from "react";
import { Animated, ActivityIndicator, Pressable } from "react-native";
import { useTema } from "../../theme/tema";
import { vibraLeggera } from "../../lib/vibrazione";
import Testo from "./Testo";

// Pulsante unico dell'app, alto 50 (sopra i 44 richiesti da Apple), con
// "molla" alla pressione e vibrazione leggera.
// variante: "primario" (pieno blu), "secondario" (bordo), "testo" (solo
// scritta), "pericolo" (scritta rossa).
export default function Pulsante({
  titolo,
  onPress,
  variante = "primario",
  caricamento = false,
  disabilitato = false,
  vibra = true,
  style,
  accessibilityLabel,
  icona = null,
  sfondoPersonalizzato,
  coloreTestoPersonalizzato,
}) {
  const { c, raggio } = useTema();
  const [scala] = useState(() => new Animated.Value(1));
  const molla = (a) => Animated.spring(scala, { toValue: a, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  const pieno = variante === "primario";
  const sfondoBase = pieno ? c.primario : variante === "secondario" ? c.sfondoGruppo : "transparent";
  const sfondo = sfondoPersonalizzato || sfondoBase;
  const coloreBase = pieno ? c.sulPrimario : variante === "pericolo" ? c.pericolo : variante === "testo" ? c.primario : c.testo;
  const colore = coloreTestoPersonalizzato || coloreBase;

  return (
    <Animated.View style={[{ transform: [{ scale: scala }], opacity: disabilitato ? 0.5 : 1 }, style]}>
      <Pressable
        onPress={() => {
          if (vibra) vibraLeggera();
          onPress?.();
        }}
        onPressIn={() => molla(0.97)}
        onPressOut={() => molla(1)}
        disabled={disabilitato || caricamento}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || titolo}
        accessibilityState={{ disabled: disabilitato || caricamento, busy: caricamento }}
        style={{
          minHeight: 50,
          borderRadius: raggio.m,
          backgroundColor: sfondo,
          borderWidth: variante === "secondario" ? 1 : 0,
          borderColor: c.separatore,
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        }}
      >
        {caricamento ? (
          <ActivityIndicator color={colore} />
        ) : (
          <>
            {icona}
            <Testo v="corpoForte" style={{ color: colore }}>
              {titolo}
            </Testo>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
