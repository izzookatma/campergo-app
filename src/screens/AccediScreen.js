import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

export default function AccediScreen({ onSaltaAccesso }) {
  const { accedi, registrati, recuperaPassword } = useAuth();
  const [modalita, setModalita] = useState("accedi");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(null);
  const [messaggio, setMessaggio] = useState(null);

  const invia = async () => {
    setErrore(null);
    setMessaggio(null);
    setInviando(true);
    if (modalita === "recupera") {
      await recuperaPassword(email.trim());
      // Non si rivela se l'email esiste o no (stessa scelta del sito):
      // lo stesso messaggio compare sempre, successo o no.
      setMessaggio("Se l'indirizzo è registrato, ti abbiamo inviato un'email con il link per reimpostare la password.");
    } else if (modalita === "accedi") {
      const { error } = await accedi(email.trim(), password);
      if (error) setErrore(messaggioErroreComprensibile(error));
    } else {
      const { data, error } = await registrati(email.trim(), password, nome.trim());
      if (error) setErrore(messaggioErroreComprensibile(error));
      else if (!data.session) setMessaggio("Controlla la tua email per confermare l'account, poi accedi qui.");
    }
    setInviando(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={styles.schermo} edges={["top"]}>
        <View style={styles.contenuto}>
          <MarchioNaturaGo style={{ marginBottom: 14 }} />
          <Text style={styles.titolo}>
            {modalita === "accedi" ? "Accedi" : modalita === "registrati" ? "Crea account" : "Recupera password"}
          </Text>
          <Text style={styles.sottotitolo}>
            {modalita === "accedi"
              ? "Per salvare i preferiti e le prenotazioni."
              : modalita === "registrati"
                ? "Bastano email e password."
                : "Ti mandiamo un link per impostarne una nuova."}
          </Text>

          {modalita === "registrati" && (
            <TextInput style={styles.campo} placeholder="Nome" placeholderTextColor={colori.testoSecondario} value={nome} onChangeText={setNome} />
          )}
          <TextInput
            style={styles.campo}
            placeholder="Email"
            placeholderTextColor={colori.testoSecondario}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {modalita !== "recupera" && (
            <TextInput
              style={styles.campo}
              placeholder="Password"
              placeholderTextColor={colori.testoSecondario}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          )}

          {errore ? <Text style={styles.errore}>{errore}</Text> : null}
          {messaggio ? <Text style={styles.messaggio}>{messaggio}</Text> : null}

          <Pressable style={styles.pulsante} onPress={invia} disabled={inviando}>
            {inviando ? (
              <ActivityIndicator color={colori.bianco} />
            ) : (
              <Text style={styles.pulsanteTesto}>
                {modalita === "accedi" ? "Accedi" : modalita === "registrati" ? "Registrati" : "Invia il link"}
              </Text>
            )}
          </Pressable>

          {modalita === "accedi" && (
            <Pressable onPress={() => setModalita("recupera")}>
              <Text style={styles.linkSecondario}>Password dimenticata?</Text>
            </Pressable>
          )}

          <Pressable onPress={() => setModalita(modalita === "registrati" ? "accedi" : "registrati")}>
            <Text style={styles.cambiaModalita}>
              {modalita === "registrati" ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
            </Text>
          </Pressable>

          {modalita === "recupera" && (
            <Pressable onPress={() => setModalita("accedi")}>
              <Text style={styles.linkSecondario}>Torna ad accedere</Text>
            </Pressable>
          )}

          {onSaltaAccesso && (
            <Pressable onPress={onSaltaAccesso} style={{ marginTop: 10, gap: 3 }}>
              <Text style={styles.saltaAccesso}>Continua senza account</Text>
              <Text style={styles.saltaAccessoNota}>Ti chiederemo di accedere solo al momento di prenotare.</Text>
            </Pressable>
          )}

          <Text style={styles.legale}>
            Continuando accetti la{" "}
            <Text style={styles.legaleLink} onPress={() => Linking.openURL("https://www.naturago.it/privacy")}>
              Privacy policy
            </Text>{" "}
            e i{" "}
            <Text style={styles.legaleLink} onPress={() => Linking.openURL("https://www.naturago.it/termini")}>
              Termini e condizioni
            </Text>
          </Text>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  contenuto: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  titolo: { fontSize: 22, fontWeight: "800", color: colori.testo },
  sottotitolo: { fontSize: 12.5, color: colori.testoSecondario, marginBottom: 10 },
  campo: {
    height: 46,
    borderRadius: 12,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
    paddingHorizontal: 14,
    fontSize: 13,
    color: colori.testo,
  },
  errore: { color: colori.rosso, fontSize: 12, fontWeight: "600" },
  messaggio: { color: colori.blu, fontSize: 12, fontWeight: "600" },
  pulsante: {
    height: 46,
    borderRadius: 12,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  pulsanteTesto: { color: colori.bianco, fontWeight: "800", fontSize: 14 },
  cambiaModalita: { textAlign: "center", color: colori.blu, fontSize: 12, fontWeight: "600", marginTop: 6 },
  linkSecondario: { textAlign: "center", color: colori.testoSecondario, fontSize: 11.5, fontWeight: "600", marginTop: 4 },
  saltaAccesso: { textAlign: "center", color: colori.testoSecondario, fontSize: 12, fontWeight: "600" },
  saltaAccessoNota: { textAlign: "center", color: colori.testoSecondario, fontSize: 10.5 },
  legale: { textAlign: "center", color: colori.testoSecondario, fontSize: 10.5, marginTop: 14 },
  legaleLink: { color: colori.blu, fontWeight: "600" },
});
