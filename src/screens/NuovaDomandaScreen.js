import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { inviaDomanda } from "../lib/domanda";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_MESSAGGIO = 10;

// "Fai una domanda" (src/DomandaPage.jsx sul sito): chiunque, anche senza
// account, scrive qui — non richiede login, a differenza di altre schermate
// del Profilo.
export default function NuovaDomandaScreen({ navigation }) {
  const { session } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [messaggio, setMessaggio] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(null);
  const [inviataA, setInviataA] = useState(null);

  const invia = async () => {
    const emailPulita = email.trim();
    const testo = messaggio.trim();
    if (!EMAIL_VALIDA.test(emailPulita)) return setErrore("Inserisci un indirizzo email valido.");
    if (testo.length < MIN_MESSAGGIO) return setErrore("Scrivi qualche parola in più nel messaggio.");

    setErrore(null);
    setInviando(true);
    try {
      await inviaDomanda({ email: emailPulita, messaggio: testo, nome: nome.trim() });
      setInviataA(emailPulita);
      setMessaggio("");
    } catch (e) {
      setErrore(messaggioErroreComprensibile(e, "Non è stato possibile inviare la domanda."));
    } finally {
      setInviando(false);
    }
  };

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colori.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>Fai una domanda</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
        {inviataA ? (
          <View style={styles.grazie}>
            <View style={styles.grazieIcona}>
              <Ionicons name="checkmark-circle" size={30} color={colori.blu} />
            </View>
            <Text style={styles.grazieTitolo}>Grazie!</Text>
            <Text style={styles.grazieTesto}>Ti risponderemo via email all&apos;indirizzo {inviataA} il prima possibile.</Text>
            <Pressable onPress={() => setInviataA(null)}>
              <Text style={styles.grazieLink}>Fai un&apos;altra domanda</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.sottotitolo}>Scrivici la tua domanda: ti rispondiamo via email, il prima possibile.</Text>

            <Text style={styles.etichetta}>Nome (facoltativo)</Text>
            <TextInput style={styles.campo} value={nome} onChangeText={setNome} autoComplete="name" maxLength={100} />

            <Text style={styles.etichetta}>Email</Text>
            <TextInput
              style={styles.campo}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              maxLength={254}
            />
            <Text style={styles.aiuto}>Ti risponderemo a questo indirizzo.</Text>

            <Text style={styles.etichetta}>Messaggio</Text>
            <TextInput
              style={[styles.campo, styles.campoMessaggio]}
              value={messaggio}
              onChangeText={setMessaggio}
              placeholder="Scrivi qui la tua domanda…"
              multiline
              numberOfLines={6}
              maxLength={3000}
            />

            {errore && <Text style={styles.errore}>{errore}</Text>}

            <Text style={styles.privacy}>
              Inviando accetti la{" "}
              <Text style={styles.link} onPress={() => Linking.openURL("https://www.naturago.it/privacy")}>
                Privacy
              </Text>
              .
            </Text>

            <Pressable style={styles.invia} onPress={invia} disabled={inviando}>
              {inviando ? <ActivityIndicator color={colori.bianco} /> : <Text style={styles.inviaTesto}>Invia</Text>}
            </Pressable>

            <Text style={styles.oppure}>
              Vedi anche le{" "}
              <Text style={styles.link} onPress={() => navigation.goBack()}>
                domande frequenti
              </Text>{" "}
              o scrivi a{" "}
              <Text style={styles.link} onPress={() => Linking.openURL("mailto:info@naturago.it")}>
                info@naturago.it
              </Text>
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.bianco },
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colori.bordo,
  },
  tornaIndietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  titoloIntestazione: { fontSize: 14.5, fontWeight: "800", color: colori.testo },
  contenuto: { padding: 20, gap: 8, paddingBottom: 40 },
  sottotitolo: { fontSize: 12.5, color: colori.testoSecondario, marginBottom: 6, lineHeight: 18 },
  etichetta: {
    fontSize: 11,
    fontWeight: "700",
    color: colori.testoSecondario,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 4,
  },
  campo: {
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colori.testo,
  },
  campoMessaggio: { minHeight: 120, textAlignVertical: "top" },
  aiuto: { fontSize: 10.5, color: colori.testoSecondario, marginTop: 3 },
  errore: { fontSize: 12, color: colori.rosso, marginTop: 8 },
  privacy: { fontSize: 11, color: colori.testoSecondario, marginTop: 12, lineHeight: 16 },
  link: { color: colori.blu, fontWeight: "700" },
  invia: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
  },
  inviaTesto: { color: colori.bianco, fontWeight: "800", fontSize: 13.5 },
  oppure: { fontSize: 11, color: colori.testoSecondario, textAlign: "center", marginTop: 14, lineHeight: 17 },
  grazie: { alignItems: "center", paddingTop: 40, gap: 6 },
  grazieIcona: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  grazieTitolo: { fontSize: 17, fontWeight: "800", color: colori.testo },
  grazieTesto: { fontSize: 12.5, color: colori.testoSecondario, textAlign: "center", lineHeight: 18, paddingHorizontal: 20 },
  grazieLink: { fontSize: 12.5, fontWeight: "700", color: colori.blu, marginTop: 10 },
});
