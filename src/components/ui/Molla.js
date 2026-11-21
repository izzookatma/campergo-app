import { useEffect, useState } from "react";
import { Animated, Pressable } from "react-native";

// Pressable con "molla" (si rimpicciolisce al tocco e rimbalza al rilascio),
// per tessere, banner e chip che non usano <Pulsante>.
export function Molla({ children, style, scala: valore = 0.96, ...props }) {
  const [s] = useState(() => new Animated.Value(1));
  const vai = (a) => Animated.spring(s, { toValue: a, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Animated.View style={{ transform: [{ scale: s }] }}>
      <Pressable style={style} onPressIn={() => vai(valore)} onPressOut={() => vai(1)} {...props}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

// Comparsa morbida all'apertura: sfuma e sale di pochi punti. `ritardo` in
// ms per far entrare gli elementi uno dopo l'altro.
export function Comparsa({ children, ritardo = 0, style }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay: ritardo, useNativeDriver: true }).start();
  }, [v, ritardo]);
  return (
    <Animated.View
      style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }, style]}
    >
      {children}
    </Animated.View>
  );
}
