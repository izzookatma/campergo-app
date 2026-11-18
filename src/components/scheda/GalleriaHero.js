import { useState } from "react";
import { View, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import ImmagineConRiserva from "../ImmagineConRiserva";

// Galleria a scorrimento orizzontale in testa alla Scheda (foto principale +
// foto del gestore), con puntini; con una sola foto resta un'immagine fissa.
// Estratta da SchedaScreen.js: nessuno stato condiviso col resto della
// pagina, solo l'elenco delle foto da mostrare.
export default function GalleriaHero({ foto }) {
  const { width } = useWindowDimensions();
  const [indice, setIndice] = useState(0);

  if (foto.length <= 1) {
    return (
      <ImmagineConRiserva uri={foto[0]} larghezza={780} style={styles.heroImmagine} iconaDimensione={46} iconaColore="#60a5fa" />
    );
  }

  return (
    <View style={styles.heroImmagine}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {foto.map((uri) => (
          <ImmagineConRiserva key={uri} uri={uri} larghezza={780} style={{ width, height: 230 }} iconaColore="#60a5fa" />
        ))}
      </ScrollView>
      <View style={styles.heroPuntini} pointerEvents="none">
        {foto.map((uri, i) => (
          <View key={uri} style={[styles.heroPuntino, i === indice && styles.heroPuntinoAttivo]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroImmagine: { width: "100%", height: "100%", position: "absolute" },
  heroPuntini: { position: "absolute", bottom: 10, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  heroPuntino: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.55)" },
  heroPuntinoAttivo: { backgroundColor: "#fff", width: 18 },
});
