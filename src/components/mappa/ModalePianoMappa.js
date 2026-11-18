import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";
import { CardGiorno } from "../PianoGiorno";

// Il piano giorno-per-giorno generato da "Creami un percorso" (CreaPercorso),
// mostrato in un modale a tutto schermo. Estratto da MappaScreen.js: non ha
// stato proprio, solo quello che riceve dal genitore.
export default function ModalePianoMappa({ visibile, piano, onChiudi, navigation }) {
  const { c } = useTema();
  const styles = useEstili(c);

  return (
    <Modal visible={visibile} animationType="slide" presentationStyle="pageSheet" onRequestClose={onChiudi}>
      <SafeAreaView style={styles.modalePianoSchermo} edges={["top", "bottom"]}>
        <View style={styles.modaleIntestazione}>
          <Text style={styles.modaleTitolo}>
            {piano ? `${piano.giorniRichiesti} giorni · ${piano.tappe.join(" → ")}` : "Il tuo piano"}
          </Text>
          <Pressable onPress={onChiudi} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi">
            <Ionicons name="close" size={22} color={c.testo} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalePianoContenuto}>
          {piano?.giorni?.map((g) => <CardGiorno key={g.numero} giorno={g} navigation={navigation} />)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    modalePianoSchermo: { flex: 1, backgroundColor: c.sfondo },
    modalePianoContenuto: { padding: 20, gap: 12, paddingBottom: 40 },
    modaleIntestazione: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: c.sfondoGruppo,
      borderBottomWidth: 1,
      borderBottomColor: c.separatore,
    },
    modaleTitolo: { flex: 1, fontSize: 14, fontWeight: "800", color: c.testo, marginRight: 10 },
  });
}
