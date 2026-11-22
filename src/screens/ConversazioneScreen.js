import { useCallback, useState, useRef } from "react";
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { caricaMessaggi, inviaMessaggio } from "../lib/mercatino";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { useT } from "../i18n/i18n";

export default function ConversazioneScreen({ route, navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { conversazione } = route.params;
  const { session } = useAuth();
  const [messaggi, setMessaggi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [testo, setTesto] = useState("");
  const [inviando, setInviando] = useState(false);
  const listaRef = useRef(null);

  const carica = useCallback(() => {
    caricaMessaggi(conversazione.annuncioId, conversazione.controparteId, session.user.id)
      .then(setMessaggi)
      .catch((e) => console.error("Errore nel caricare la conversazione:", e))
      .finally(() => setCaricamento(false));
  }, [conversazione.annuncioId, conversazione.controparteId, session.user.id]);

  // Niente realtime sul database: finché la conversazione è aperta si
  // ricontrolla ogni 8 secondi, così i messaggi nuovi arrivano da soli.
  useFocusEffect(
    useCallback(() => {
      carica();
      const id = setInterval(carica, 8000);
      return () => clearInterval(id);
    }, [carica])
  );

  const invia = async () => {
    if (!testo.trim()) return;
    setInviando(true);
    try {
      await inviaMessaggio({
        annuncioId: conversazione.annuncioId,
        mittenteId: session.user.id,
        destinatarioId: conversazione.controparteId,
        nomeMittente: session.user.user_metadata?.nome || t("comune.utenteDefault"),
        testo: testo.trim(),
      });
      setTesto("");
      carica();
    } catch (e) {
      console.error("Errore nell'invio del messaggio:", e);
      // Il testo resta nel campo: si può riprovare senza riscriverlo.
      Alert.alert(t("mercatino.erroreInvioTitolo"), messaggioErroreComprensibile(e, t("mercatino.erroreInvioTitolo")));
    } finally {
      setInviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={styles.schermo} edges={["top", "bottom"]}>
        <View style={styles.intestazione}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("comune.indietro")} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={c.testo} />
          </Pressable>
          <Text style={styles.titolo} numberOfLines={1}>
            {conversazione.annuncioTitolo}
          </Text>
          <View style={{ width: 20 }} />
        </View>

        {caricamento ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={c.primario} />
        ) : (
          <FlatList
            ref={listaRef}
            data={messaggi}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const mio = item.mittente_id === session.user.id;
              return (
                <View style={[styles.bolla, mio ? styles.bollaMia : styles.bollaAltra]}>
                  <Text style={[styles.bollaTesto, mio && styles.bollaTestoMio]}>{item.testo}</Text>
                </View>
              );
            }}
          />
        )}

        <View style={styles.barraInvio}>
          <TextInput
            style={styles.campo}
            placeholder={t("mercatino.placeholderMessaggio")}
            placeholderTextColor={c.testoSecondario}
            value={testo}
            onChangeText={setTesto}
            multiline
          />
          <Pressable style={styles.pulsanteInvia} onPress={invia} disabled={inviando || !testo.trim()}>
            <Ionicons name="send" size={16} color={c.sulPrimario} />
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondo },
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: c.sfondoGruppo,
    borderBottomWidth: 1,
    borderBottomColor: c.separatore,
    gap: 10,
  },
  titolo: { flex: 1, fontSize: 14, fontWeight: "800", color: c.testo, textAlign: "center" },
  bolla: { maxWidth: "78%", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
  bollaMia: { alignSelf: "flex-end", backgroundColor: c.primario },
  bollaAltra: { alignSelf: "flex-start", backgroundColor: c.sfondoGruppo },
  bollaTesto: { fontSize: 12.5, color: c.testo, lineHeight: 18 },
  bollaTestoMio: { color: c.sulPrimario },
  barraInvio: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    backgroundColor: c.sfondoGruppo,
    borderTopWidth: 1,
    borderTopColor: c.separatore,
  },
  campo: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: c.sfondo,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 12.5,
    color: c.testo,
  },
  pulsanteInvia: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.primario,
    alignItems: "center",
    justifyContent: "center",
  },
  });
}
