import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Cuore dei preferiti con "pop" elastico quando viene acceso (come nelle app
// Apple/Airbnb). Allo spegnimento cambia solo l'icona, senza effetto.
export default function CuoreAnimato({ attivo, size = 18, colore = "#D92D20" }) {
  const [scala] = useState(() => new Animated.Value(1));
  const precedente = useRef(attivo);
  useEffect(() => {
    if (attivo && !precedente.current) {
      Animated.sequence([
        Animated.timing(scala, { toValue: 1.35, duration: 110, useNativeDriver: true }),
        Animated.spring(scala, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      ]).start();
    }
    precedente.current = attivo;
  }, [attivo, scala]);
  return (
    <Animated.View style={{ transform: [{ scale: scala }] }}>
      <Ionicons name={attivo ? "heart" : "heart-outline"} size={size} color={colore} />
    </Animated.View>
  );
}
