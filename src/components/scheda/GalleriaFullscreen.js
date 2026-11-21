import { useState } from "react";
import { Modal, View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, StatusBar } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { urlImmagineRidimensionata } from "../../lib/immagini";

const INTESTAZIONI = { "User-Agent": "NaturaGo/1.0 (https://naturago.it)" };

// Foto a tutto schermo su sfondo nero: scorrimento orizzontale tra le foto,
// pizzico per ingrandire (iOS), pulsante chiudi e contatore.
export default function GalleriaFullscreen({ foto, indiceIniziale = 0, visibile, onChiudi }) {
  const { width, height } = useWindowDimensions();
  const [indice, setIndice] = useState(indiceIniziale);

  return (
    <Modal visible={visibile} animationType="fade" onRequestClose={onChiudi} statusBarTranslucent>
      <StatusBar hidden={false} barStyle="light-content" />
      <View style={styles.sfondo}>
        <ScrollView
          contentOffset={{ x: indiceIniziale * width, y: 0 }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {foto.map((uri, i) => (
            <ScrollView
              key={`${uri}-${i}`}
              style={{ width, height }}
              contentContainerStyle={{ width, height, alignItems: "center", justifyContent: "center" }}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: urlImmagineRidimensionata(uri, 1600), headers: INTESTAZIONI }}
                style={{ width, height: height * 0.8 }}
                contentFit="contain"
                transition={150}
              />
            </ScrollView>
          ))}
        </ScrollView>
        <SafeAreaView edges={["top"]} style={styles.barra} pointerEvents="box-none">
          <Text style={styles.contatore}>
            {indice + 1} / {foto.length}
          </Text>
          <Pressable style={styles.chiudi} onPress={onChiudi} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi">
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: "#000" },
  barra: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 },
  contatore: { color: "#fff", fontWeight: "700", fontSize: 15 },
  chiudi: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
});
