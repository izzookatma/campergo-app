import { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { CATEGORIE_FILTRI_SERVIZI } from "../lib/filtriServizi";

// Elenco dei servizi (stessi di Esplora) da spuntare: usato dalla Mappa.
export default function ModaleServizi({ visibile, selezionati, onCambia, onChiudi }) {
  const [aperte, setAperte] = useState({});
  const alterna = (chiave) =>
    onCambia(selezionati.includes(chiave) ? selezionati.filter((c) => c !== chiave) : [...selezionati, chiave]);

  return (
    <Modal visible={visibile} animationType="slide" presentationStyle="pageSheet" onRequestClose={onChiudi}>
      <SafeAreaView style={stili.schermo} edges={["top", "bottom"]}>
        <View style={stili.testata}>
          <Text style={stili.titolo}>Filtri servizi</Text>
          <Pressable onPress={onChiudi} hitSlop={10} accessibilityLabel="Chiudi">
            <Ionicons name="close" size={22} color={colori.testo} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
          {CATEGORIE_FILTRI_SERVIZI.map((cat) => {
            const aperta = !!aperte[cat.titolo];
            return (
              <View key={cat.titolo} style={stili.sezione}>
                <Pressable style={stili.sezioneTesta} onPress={() => setAperte((p) => ({ ...p, [cat.titolo]: !aperta }))}>
                  <Ionicons name={cat.icona} size={17} color={colori.blu} />
                  <Text style={stili.sezioneTitolo}>{cat.titolo}</Text>
                  <Ionicons name={aperta ? "chevron-up" : "chevron-down"} size={16} color={colori.testoSecondario} />
                </Pressable>
                {aperta &&
                  cat.voci.map((voce) => {
                    const sel = selezionati.includes(voce.chiave);
                    return (
                      <Pressable key={voce.chiave} style={stili.riga} onPress={() => alterna(voce.chiave)}>
                        <Text style={stili.rigaTesto}>{voce.etichetta}</Text>
                        <Ionicons name={sel ? "checkbox" : "square-outline"} size={20} color={sel ? colori.blu : colori.testoSecondario} />
                      </Pressable>
                    );
                  })}
              </View>
            );
          })}
          <Text style={stili.nota}>Con un servizio scelto i rifugi e i bivacchi non compaiono: non hanno questi servizi.</Text>
        </ScrollView>
        <View style={stili.piede}>
          <Pressable style={stili.cancella} onPress={() => onCambia([])} disabled={selezionati.length === 0}>
            <Text style={[stili.cancellaTesto, selezionati.length === 0 && { opacity: 0.4 }]}>Cancella</Text>
          </Pressable>
          <Pressable style={stili.mostra} onPress={onChiudi}>
            <Text style={stili.mostraTesto}>{selezionati.length === 0 ? "Chiudi" : "Mostra sulla mappa"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const stili = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  testata: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colori.bianco, borderBottomWidth: 1, borderBottomColor: colori.bordo },
  titolo: { fontSize: 15, fontWeight: "800", color: colori.testo },
  sezione: { backgroundColor: colori.bianco, borderRadius: 14, padding: 14, gap: 4 },
  sezioneTesta: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32 },
  sezioneTitolo: { flex: 1, fontSize: 15, fontWeight: "700", color: colori.testo },
  riga: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  rigaTesto: { fontSize: 14.5, color: colori.testo },
  nota: { fontSize: 12.5, color: colori.testoSecondario, textAlign: "center", marginTop: 4 },
  piede: { flexDirection: "row", gap: 10, padding: 16, backgroundColor: colori.bianco, borderTopWidth: 1, borderTopColor: colori.bordo },
  cancella: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1.5, borderColor: colori.blu },
  cancellaTesto: { color: colori.blu, fontWeight: "700", fontSize: 15 },
  mostra: { flex: 1.6, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colori.blu },
  mostraTesto: { color: colori.bianco, fontWeight: "800", fontSize: 15 },
});
