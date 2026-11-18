import { useEffect, useState } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { useTema, ombra } from "../theme/tema";

// Segnaposto grigio pulsante al posto dell'indicatore di caricamento:
// la lista "appare" subito con la sua forma vera.
export default function ScheletroCard({ righe = 6 }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const [opacita] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacita, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacita, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacita]);

  return (
    <View style={{ padding: 20, gap: 10 }} accessibilityLabel="Caricamento in corso">
      {Array.from({ length: righe }).map((_, i) => (
        <Animated.View key={i} style={[styles.card, { opacity: opacita }]}>
          <View style={styles.foto} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.barra, { width: "35%" }]} />
            <View style={[styles.barra, { width: "75%", height: 14 }]} />
            <View style={[styles.barra, { width: "50%" }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    card: { flexDirection: "row", gap: 12, backgroundColor: c.sfondoGruppo, borderRadius: raggio.l, padding: 12, ...ombra(c) },
    foto: { width: 92, height: 92, borderRadius: raggio.m, backgroundColor: c.primarioChiaro },
    barra: { height: 10, borderRadius: 5, backgroundColor: c.primarioChiaro },
  });
}
