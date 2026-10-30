import { useCallback, useState, useRef } from "react";
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaMessaggi, inviaMessaggio } from "../lib/mercatino";

export default function ConversazioneScreen({ route, navigation }) {
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

  useFocusEffect(carica);

  const invia = async () => {
    if (!testo.trim()) return;
    setInviando(true);
    try {
      await inviaMessaggio({
        annuncioId: conversazione.annuncioId,
        mittenteId: session.user.id,
        destinatarioId: conversazione.controparteId,
        nomeMittente: session.user.user_metadata?.nome || "Utente NaturaGo",
        testo: testo.trim(),
      });
      setTesto("");
      carica();
    } catch (e) {
      console.error("Errore nell'invio del messaggio:", e);
    } finally {
      setInviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={styles.schermo} edges={["top", "bottom"]}>
        <View style={styles.intestazione}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colori.testo} />
          </Pressable>
          <Text style={styles.titolo} numberOfLines={1}>
            {conversazione.annuncioTitolo}
          </Text>
          <View style={{ width: 20 }} />
        </View>

        {caricamento ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colori.blu} />
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
            placeholder="Scrivi un messaggio…"
            placeholderTextColor={colori.testoSecondario}
            value={testo}
            onChangeText={setTesto}
            multiline
          />
          <Pressable style={styles.pulsanteInvia} onPress={invia} disabled={inviando || !testo.trim()}>
            <Ionicons name="send" size={16} color={colori.bianco} />
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colori.bianco,
    borderBottomWidth: 1,
    borderBottomColor: colori.bordo,
    gap: 10,
  },
  titolo: { flex: 1, fontSize: 14, fontWeight: "800", color: colori.testo, textAlign: "center" },
  bolla: { maxWidth: "78%", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
  bollaMia: { alignSelf: "flex-end", backgroundColor: colori.blu },
  bollaAltra: { alignSelf: "flex-start", backgroundColor: colori.bianco },
  bollaTesto: { fontSize: 12.5, color: colori.testo, lineHeight: 18 },
  bollaTestoMio: { color: colori.bianco },
  barraInvio: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    backgroundColor: colori.bianco,
    borderTopWidth: 1,
    borderTopColor: colori.bordo,
  },
  campo: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: colori.grigioSfondo,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 12.5,
    color: colori.testo,
  },
  pulsanteInvia: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
  },
});
