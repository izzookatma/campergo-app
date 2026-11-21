import { useState } from "react";
import { View, Text, Animated, Pressable, useWindowDimensions, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmagineConRiserva from "./ImmagineConRiserva";
import VeloSfumato from "./ui/VeloSfumato";
import { vibraLeggera } from "../lib/vibrazione";

// Carosello a "carte" della home: foto grande, la carta al centro si
// ingrandisce e quelle ai lati si rimpiccioliscono mentre si scorre; un
// tocco apre la scheda. Foto e dati vengono dal database (strutture
// meglio piazzate che hanno una foto).
export default function CaroselloInEvidenza({ strutture, onApri }) {
  const { width } = useWindowDimensions();
  const larghezzaCarta = Math.round(width * 0.74);
  const passo = larghezzaCarta + 12;
  const [x] = useState(() => new Animated.Value(0));
  if (!strutture?.length) return null;

  return (
    <Animated.FlatList
      data={strutture}
      horizontal
      keyExtractor={(s) => String(s.id)}
      showsHorizontalScrollIndicator={false}
      snapToInterval={passo}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: (width - larghezzaCarta) / 2 - 16 + 16, gap: 12, paddingVertical: 6 }}
      style={{ marginHorizontal: -16 }}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: true })}
      scrollEventThrottle={16}
      renderItem={({ item, index }) => {
        const range = [(index - 1) * passo, index * passo, (index + 1) * passo];
        const scala = x.interpolate({ inputRange: range, outputRange: [0.92, 1, 0.92], extrapolate: "clamp" });
        const foto = x.interpolate({ inputRange: range, outputRange: [-24, 0, 24], extrapolate: "clamp" });
        return (
          <Animated.View style={{ width: larghezzaCarta, transform: [{ scale: scala }] }}>
            <Pressable
              onPress={() => {
                vibraLeggera();
                onApri(item);
              }}
              style={styles.carta}
              accessibilityRole="button"
              accessibilityLabel={`${item.nome}, ${item.localita || ""}`}
            >
              <Animated.View style={[StyleSheet.absoluteFill, { left: -30, right: -30, transform: [{ translateX: foto }] }]}>
                <ImmagineConRiserva uri={item.fotoUrl} larghezza={800} style={{ width: "100%", height: "100%" }} iconaDimensione={40} iconaColore="#60a5fa" />
              </Animated.View>
              <VeloSfumato forza={0.75} />
              <View style={styles.testi}>
                <Text style={styles.tipo}>{item.tipo}</Text>
                <Text style={styles.nome} numberOfLines={2}>
                  {item.nome}
                </Text>
                <View style={styles.riga}>
                  <Ionicons name="location" size={14} color="#fff" />
                  <Text style={styles.localita} numberOfLines={1}>
                    {item.localita}
                  </Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  carta: { height: 300, borderRadius: 26, overflow: "hidden", backgroundColor: "#0b2a3b", justifyContent: "flex-end" },
  testi: { padding: 16, gap: 4 },
  tipo: { color: "#fff", opacity: 0.85, fontSize: 12, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  nome: { color: "#fff", fontSize: 24, lineHeight: 29, fontWeight: "800" },
  riga: { flexDirection: "row", alignItems: "center", gap: 5 },
  localita: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 },
});
