import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";
import { CardGiorno } from "../PianoGiorno";
import { salvaPianoViaggio } from "../../lib/pianiSalvati";
import { messaggioErroreComprensibile } from "../../lib/erroriComprensibili";
import { useT } from "../../i18n/i18n";

// Il piano giorno-per-giorno generato da "Creami un percorso" (CreaPercorso),
// mostrato in un modale a tutto schermo. Ora si può MODIFICARE ("Cambia" su
// dove dormire e cosa visitare, tra le alternative vere già arrivate col
// piano) e SALVARE: il pulsante è grande e scritto per esteso, e dopo il
// salvataggio dice dove ritrovarlo (Profilo → I miei percorsi).
export default function ModalePianoMappa({ visibile, piano, richiesta, utenteId, onChiudi, navigation }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  const [pianoModificato, setPianoModificato] = useState(piano);
  const [salvando, setSalvando] = useState(false);
  const [salvato, setSalvato] = useState(false);

  // Un piano nuovo (altra richiesta) riparte da zero: non salvato. Si
  // confronta durante il disegno (schema consigliato da React) invece di
  // usare un effetto che cambia lo stato.
  const [pianoOrigine, setPianoOrigine] = useState(piano);
  if (piano !== pianoOrigine) {
    setPianoOrigine(piano);
    setPianoModificato(piano);
    setSalvato(false);
  }

  const aggiornaDormire = (numeroGiorno, categoria, nuovoPosto) => {
    setPianoModificato((prev) =>
      prev
        ? {
            ...prev,
            giorni: prev.giorni.map((g) => (g.numero === numeroGiorno ? { ...g, dormire: { ...g.dormire, [categoria]: nuovoPosto } } : g)),
          }
        : prev
    );
    setSalvato(false);
  };

  const aggiornaVoce = (numeroGiorno, indiceVoce, nuovaVoce) => {
    setPianoModificato((prev) =>
      prev
        ? {
            ...prev,
            giorni: prev.giorni.map((g) => {
              if (g.numero !== numeroGiorno) return g;
              const voci = [...g.voci];
              voci[indiceVoce] = nuovaVoce;
              return { ...g, voci };
            }),
          }
        : prev
    );
    setSalvato(false);
  };

  const salva = async () => {
    if (salvando || salvato || !pianoModificato) return;
    if (!utenteId) {
      Alert.alert(t("accedi.titoloAccedi"), t("pianifica.accediMessaggio"));
      return;
    }
    setSalvando(true);
    try {
      await salvaPianoViaggio(utenteId, {
        richiesta: richiesta || pianoModificato.tappe.join(" → "),
        tappe: pianoModificato.tappe,
        giorniRichiesti: pianoModificato.giorniRichiesti,
        piano: pianoModificato,
      });
      setSalvato(true);
    } catch (e) {
      console.error("Errore nel salvare il piano:", e);
      Alert.alert(t("pianifica.nonSalvatoTitolo"), messaggioErroreComprensibile(e, t("pianifica.erroreSalvataggio")));
    } finally {
      setSalvando(false);
    }
  };

  const apriMieiPercorsi = () => {
    onChiudi();
    navigation.navigate("Profilo", { screen: "PianiSalvati" });
  };

  return (
    <Modal visible={visibile} animationType="slide" presentationStyle="pageSheet" onRequestClose={onChiudi}>
      <SafeAreaView style={styles.modalePianoSchermo} edges={["top", "bottom"]}>
        <View style={styles.modaleIntestazione}>
          <Text style={styles.modaleTitolo}>
            {pianoModificato ? `${pianoModificato.giorniRichiesti} giorni · ${pianoModificato.tappe.join(" → ")}` : "Il tuo piano"}
          </Text>
          <Pressable onPress={onChiudi} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi">
            <Ionicons name="close" size={22} color={c.testo} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalePianoContenuto}>
          {salvato ? (
            <View style={styles.salvatoRiquadro}>
              <View style={styles.salvatoRiga}>
                <Ionicons name="checkmark-circle" size={20} color={c.successo} />
                <Text style={styles.salvatoTesto}>{t("pianoMappa.salvato")}</Text>
              </View>
              <Pressable style={styles.bottoneSecondario} onPress={apriMieiPercorsi} accessibilityRole="button">
                <Text style={styles.bottoneSecondarioTesto}>{t("pianoMappa.apriMieiPercorsi")}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.bottoneSalva, salvando && { opacity: 0.6 }]}
              onPress={salva}
              disabled={salvando}
              accessibilityRole="button"
              accessibilityLabel={t("pianoMappa.salva")}
            >
              {salvando ? (
                <ActivityIndicator color={c.sulPrimario} size="small" />
              ) : (
                <>
                  <Ionicons name="bookmark-outline" size={18} color={c.sulPrimario} />
                  <Text style={styles.bottoneSalvaTesto}>{t("pianoMappa.salva")}</Text>
                </>
              )}
            </Pressable>
          )}
          <Text style={styles.suggerimento}>{t("pianoMappa.suggerimentoModifica")}</Text>
          {pianoModificato?.giorni?.map((g) => (
            <CardGiorno
              key={g.numero}
              giorno={g}
              navigation={navigation}
              candidati={pianoModificato.tappeCandidati?.[g.tappaIndice]}
              onCambiaDormire={(categoria, scelta) => aggiornaDormire(g.numero, categoria, scelta)}
              onCambiaVoce={(indice, scelta) => aggiornaVoce(g.numero, indice, scelta)}
            />
          ))}
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
    bottoneSalva: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primario,
      borderRadius: 14,
      paddingVertical: 14,
    },
    bottoneSalvaTesto: { fontSize: 16, fontWeight: "700", color: c.sulPrimario },
    salvatoRiquadro: { backgroundColor: c.successoChiaro, borderRadius: 14, padding: 14, gap: 10 },
    salvatoRiga: { flexDirection: "row", alignItems: "center", gap: 8 },
    salvatoTesto: { flex: 1, fontSize: 14, fontWeight: "600", color: c.testo },
    bottoneSecondario: {
      alignItems: "center",
      backgroundColor: c.sfondoGruppo,
      borderRadius: 12,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: c.primario,
    },
    bottoneSecondarioTesto: { fontSize: 15, fontWeight: "700", color: c.primario },
    suggerimento: { fontSize: 13, color: c.testoSecondario, lineHeight: 18 },
  });
}
