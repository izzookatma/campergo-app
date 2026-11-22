import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { caricaMiaStruttura, caricaRecensioniHost, rispondiRecensione } from "../lib/host";
import StatoErrore from "../components/ui/StatoErrore";

// Recensioni della propria struttura con risposta pubblica del gestore:
// stessa funzione del pannello host del sito, ora anche dal telefono.
export default function RecensioniStrutturaScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const { session } = useAuth();
  const utenteId = session?.user?.id;
  const [recensioni, setRecensioni] = useState([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState(false);
  const [tentativo, setTentativo] = useState(0);
  const [inRisposta, setInRisposta] = useState(null);
  const [testo, setTesto] = useState("");
  const [salvando, setSalvando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void tentativo;
      let attivo = true;
      setErrore(false);
      caricaMiaStruttura(utenteId)
        .then((s) => (s ? caricaRecensioniHost(s.id) : []))
        .then((r) => attivo && setRecensioni(r))
        .catch((e) => {
          console.error("[NaturaGo app] recensioni host", e);
          if (attivo) setErrore(true);
        })
        .finally(() => attivo && setCaricando(false));
      return () => {
        attivo = false;
      };
    }, [utenteId, tentativo]),
  );

  const apri = (r) => {
    setInRisposta(r.id);
    setTesto(r.risposta_host ?? "");
  };

  const salva = async () => {
    setSalvando(true);
    try {
      const pulito = testo.trim();
      await rispondiRecensione(inRisposta, pulito);
      setRecensioni((rs) => rs.map((r) => (r.id === inRisposta ? { ...r, risposta_host: pulito || null } : r)));
      setInRisposta(null);
    } catch (e) {
      console.error("[NaturaGo app] rispondiRecensione", e);
      Alert.alert("Risposta non salvata", messaggioErroreComprensibile(e, "Non è stato possibile salvare la risposta. Riprova."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.intestazione}>
        <Pressable accessibilityRole="button" accessibilityLabel="Indietro" hitSlop={8} style={styles.indietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={c.testo} />
        </Pressable>
        <Text style={styles.titolo}>Recensioni ({recensioni.length})</Text>
        <View style={styles.indietro} />
      </View>
      {caricando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={c.primario} />
        </View>
      ) : errore ? (
        <StatoErrore
          onRiprova={() => {
            setCaricando(true);
            setTentativo((n) => n + 1);
          }}
        />
      ) : (
        <FlatList
          data={recensioni}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.lista}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.nota}>Nessuna recensione ancora. Quando un cliente ne lascia una, la trovi qui e puoi rispondere.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rigaStelle}>
                <View style={{ flexDirection: "row", gap: 2 }} accessible accessibilityLabel={`${item.punteggio} su 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons key={n} name={n <= item.punteggio ? "star" : "star-outline"} size={14} color={c.voto} />
                  ))}
                </View>
                <Text style={styles.data}>{new Date(item.creato_il).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}</Text>
              </View>
              <Text style={styles.autore}>{item.nome_cliente || "Cliente"}</Text>
              {!!item.testo && <Text style={styles.testo}>{item.testo}</Text>}

              {inRisposta === item.id ? (
                <View style={{ gap: 8 }}>
                  <TextInput
                    style={styles.campo}
                    value={testo}
                    onChangeText={setTesto}
                    multiline
                    maxLength={1000}
                    placeholder="Scrivi una risposta pubblica, visibile a tutti i clienti…"
                    placeholderTextColor={c.testoSecondario}
                    accessibilityLabel="Risposta alla recensione"
                  />
                  <View style={styles.rigaPulsanti}>
                    <Pressable style={styles.bottoneBordo} onPress={() => setInRisposta(null)} disabled={salvando}>
                      <Text style={styles.bottoneBordoTesto}>Annulla</Text>
                    </Pressable>
                    <Pressable style={[styles.bottonePieno, salvando && { opacity: 0.5 }]} onPress={salva} disabled={salvando}>
                      {salvando ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.bottonePienoTesto}>Salva risposta</Text>}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  {!!item.risposta_host && (
                    <View style={styles.risposta}>
                      <Text style={styles.rispostaTitolo}>La tua risposta (pubblica)</Text>
                      <Text style={styles.testo}>{item.risposta_host}</Text>
                    </View>
                  )}
                  <Pressable accessibilityRole="button" style={styles.bottoneBordo} onPress={() => apri(item)}>
                    <Text style={styles.bottoneBordoTesto}>{item.risposta_host ? "Modifica risposta" : "Rispondi"}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.separatore, backgroundColor: c.sfondoGruppo },
    indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
    titolo: { fontSize: 14.5, fontWeight: "800", color: c.testo },
    centro: { flex: 1, alignItems: "center", justifyContent: "center" },
    lista: { padding: 16, gap: 12, paddingBottom: 40 },
    nota: { fontSize: 12.5, color: c.testoSecondario, lineHeight: 18, textAlign: "center", marginTop: 30 },
    card: { backgroundColor: c.sfondoGruppo, borderRadius: raggio.l, padding: 14, gap: 8, ...ombra(c) },
    rigaStelle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    data: { fontSize: 11, color: c.testoSecondario },
    autore: { fontSize: 13, fontWeight: "700", color: c.testo },
    testo: { fontSize: 13, color: c.testo, lineHeight: 19 },
    risposta: { backgroundColor: c.sfondo, borderRadius: raggio.m, padding: 10, gap: 4 },
    rispostaTitolo: { fontSize: 11.5, fontWeight: "700", color: c.primario },
    campo: { minHeight: 90, borderWidth: 1, borderColor: c.separatore, borderRadius: 10, padding: 10, fontSize: 13, color: c.testo, textAlignVertical: "top" },
    rigaPulsanti: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
    bottonePieno: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
    bottonePienoTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 13 },
    bottoneBordo: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: c.primario, alignItems: "center", justifyContent: "center" },
    bottoneBordoTesto: { color: c.primario, fontWeight: "700", fontSize: 13 },
  });
}
