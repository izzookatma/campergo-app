import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";

// Modulo per scrivere una recensione (struttura o itinerario, `onInvia`
// decide dove va). Niente foto: senza una prenotazione collegata (l'app
// non ne ha ancora) il database le rifiuta comunque, vedi src/lib/recensioni.js.
export default function ModuloRecensione({ onInvia, onInviata }) {
  const [punteggio, setPunteggio] = useState(0);
  const [testo, setTesto] = useState("");
  const [inviando, setInviando] = useState(false);

  const invia = async () => {
    if (punteggio === 0) {
      Alert.alert("Scegli un punteggio", "Tocca da 1 a 5 stelle prima di inviare.");
      return;
    }
    if (!testo.trim()) {
      Alert.alert("Scrivi qualcosa", "Aggiungi un breve testo alla recensione.");
      return;
    }
    setInviando(true);
    try {
      await onInvia({ punteggio, testo: testo.trim() });
      setPunteggio(0);
      setTesto("");
      onInviata?.();
    } catch (e) {
      console.error("Errore nell'invio della recensione:", e);
      Alert.alert("Non riesco a inviare la recensione", "Riprova tra poco.");
    } finally {
      setInviando(false);
    }
  };

  return (
    <View style={styles.modulo}>
      <View style={styles.stelle}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setPunteggio(n)} hitSlop={6}>
            <Ionicons name={n <= punteggio ? "star" : "star-outline"} size={24} color="#f59e0b" />
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.campo}
        placeholder="Racconta la tua esperienza…"
        placeholderTextColor={colori.testoSecondario}
        value={testo}
        onChangeText={setTesto}
        multiline
      />
      <Pressable style={styles.pulsante} onPress={invia} disabled={inviando}>
        {inviando ? <ActivityIndicator color={colori.bianco} size="small" /> : <Text style={styles.pulsanteTesto}>Invia recensione</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  modulo: { gap: 10, backgroundColor: colori.grigioSfondo, borderRadius: 14, padding: 14 },
  stelle: { flexDirection: "row", gap: 6 },
  campo: {
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12.5,
    color: colori.testo,
    textAlignVertical: "top",
  },
  pulsante: { height: 42, borderRadius: 12, backgroundColor: colori.blu, alignItems: "center", justifyContent: "center" },
  pulsanteTesto: { color: colori.bianco, fontWeight: "800", fontSize: 13 },
});
