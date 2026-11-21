import { useEffect, useState } from "react";
import { Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Icona che "respira" (sale e scende piano, con un lieve ingrandimento) per
// gli stati vuoti: dà vita alla pagina senza librerie native aggiuntive.
export default function IconaFluttuante({ nome, size = 40, colore }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [v]);
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
        ],
      }}
    >
      <Ionicons name={nome} size={size} color={colore} />
    </Animated.View>
  );
}
