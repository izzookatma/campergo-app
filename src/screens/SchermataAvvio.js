import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import IconaBussolaLogo from "../components/IconaBussolaLogo";

// Stesso marchio dell'hero del sito (vedi MarchioHeroConSlogan in
// src/App.jsx): bussola trasparente + "NATURAGO" + slogan a pillola.
export default function SchermataAvvio() {
  return (
    <View style={styles.schermo}>
      <View style={styles.marchio}>
        <IconaBussolaLogo size={80} />
        <Text style={styles.nome}>
          NATURA<Text style={styles.nomeGo}>GO</Text>
        </Text>
      </View>
      <View style={styles.pillola}>
        <Text style={styles.frase}>Spegni il motore, accendi la natura</Text>
      </View>
      <ActivityIndicator style={styles.indicatore} color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: {
    flex: 1,
    backgroundColor: "#0e3a53",
    alignItems: "center",
    justifyContent: "center",
  },
  marchio: { alignItems: "center", gap: 4, marginBottom: 10 },
  nome: { color: "#ffffff", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  nomeGo: { color: "#E08A3E" },
  pillola: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  frase: { color: "#ffffff", fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  indicatore: { marginTop: 28 },
});
