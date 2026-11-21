import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmagineConRiserva from "../ImmagineConRiserva";

// Galleria a scorrimento orizzontale in testa alla Scheda. Un tocco su una
// foto la apre a tutto schermo (onApri). Sopra la foto: velo scuro in basso
// (per far leggere puntini e contatore) e contatore "1/5".
export default function GalleriaHero({ foto, altezza = 340, onApri }) {
  const { width } = useWindowDimensions();
  const [indice, setIndice] = useState(0);

  const corpo = (uri, i) => (
    <Pressable key={`${uri}-${i}`} onPress={() => onApri?.(i)} accessibilityRole="imagebutton" accessibilityLabel={`Foto ${i + 1} di ${foto.length}`}>
      <ImmagineConRiserva uri={uri} larghezza={1000} style={{ width, height: altezza }} iconaDimensione={46} iconaColore="#60a5fa" />
    </Pressable>
  );

  return (
    <View style={{ width, height: altezza }}>
      {foto.length <= 1 ? (
        corpo(foto[0], 0)
      ) : (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {foto.map(corpo)}
        </ScrollView>
      )}
      <View style={styles.velo} pointerEvents="none" />
      {foto.length > 1 && (
        <>
          <View style={styles.heroPuntini} pointerEvents="none">
            {foto.map((uri, i) => (
              <View key={`${uri}-${i}`} style={[styles.heroPuntino, i === indice && styles.heroPuntinoAttivo]} />
            ))}
          </View>
          <View style={styles.contatore} pointerEvents="none">
            <Ionicons name="images-outline" size={13} color="#fff" />
            <Text style={styles.contatoreTesto}>
              {indice + 1}/{foto.length}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  velo: { position: "absolute", left: 0, right: 0, bottom: 0, height: 90, backgroundColor: "rgba(8,24,36,0.28)" },
  heroPuntini: { position: "absolute", bottom: 40, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  heroPuntino: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.55)" },
  heroPuntinoAttivo: { backgroundColor: "#fff", width: 18 },
  contatore: {
    position: "absolute",
    bottom: 40,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  contatoreTesto: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
