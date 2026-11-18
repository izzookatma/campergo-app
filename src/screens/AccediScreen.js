import { useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import Pulsante from "../components/ui/Pulsante";
import LogoGoogle from "../components/LogoGoogle";

// `navigation` esiste solo quando questa schermata è aperta da dentro
// l'app (es. toccando il cuoricino senza account) — all'avvio, prima del
// Tab.Navigator, la schermata non ha un `navigation` vero.
export default function AccediScreen({ onSaltaAccesso, navigation }) {
  const { accedi, registrati, recuperaPassword, accediConGoogle, accediConFacebook, accediConApple } = useAuth();
  const [appleDisponibile, setAppleDisponibile] = useState(false);
  useEffect(() => {
    if (Platform.OS === "ios") AppleAuthentication.isAvailableAsync().then(setAppleDisponibile).catch(() => {});
  }, []);
  const [modalita, setModalita] = useState("accedi");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviando, setInviando] = useState(false);
  const [inviandoProvider, setInviandoProvider] = useState(null);
  const [errore, setErrore] = useState(null);
  const [messaggio, setMessaggio] = useState(null);

  const accediEsterno = async (provider, funzione) => {
    setErrore(null);
    setMessaggio(null);
    setInviandoProvider(provider);
    const { error, annullato } = await funzione();
    if (error) setErrore(messaggioErroreComprensibile(error));
    else if (!annullato) navigation?.goBack();
    setInviandoProvider(null);
  };

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
      else navigation?.goBack();
    } else {
      const { data, error } = await registrati(email.trim(), password, nome.trim());
      if (error) setErrore(messaggioErroreComprensibile(error));
      else if (!data.session) setMessaggio("Controlla la tua email per confermare l'account, poi accedi qui.");
      else navigation?.goBack();
    }
    setInviando(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={styles.schermo} edges={["top"]}>
        <View style={styles.contenuto}>
          <View style={styles.rigaMarchio}>
            <MarchioNaturaGo style={{ marginBottom: 14 }} />
            {navigation && (
              <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.chiudi}>
                <Ionicons name="close" size={20} color={colori.testoSecondario} />
              </Pressable>
            )}
          </View>
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

          {modalita !== "recupera" && (
            <View style={{ gap: 10, marginBottom: 4 }}>
              {appleDisponibile && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={{ height: 50 }}
                  onPress={() => accediEsterno("apple", accediConApple)}
                />
              )}
              <Pulsante
                titolo="Continua con Google"
                variante="secondario"
                icona={<LogoGoogle size={20} />}
                caricamento={inviandoProvider === "google"}
                disabilitato={!!inviandoProvider}
                onPress={() => accediEsterno("google", accediConGoogle)}
              />
              <Pulsante
                titolo="Continua con Facebook"
                sfondoPersonalizzato="#1877F2"
                coloreTestoPersonalizzato="#FFFFFF"
                icona={<Ionicons name="logo-facebook" size={22} color="#FFFFFF" />}
                caricamento={inviandoProvider === "facebook"}
                disabilitato={!!inviandoProvider}
                onPress={() => accediEsterno("facebook", accediConFacebook)}
              />
              <Text style={styles.linkSecondario}>oppure</Text>
            </View>
          )}

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

          <Pulsante
            titolo={modalita === "accedi" ? "Accedi" : modalita === "registrati" ? "Registrati" : "Invia il link"}
            caricamento={inviando}
            onPress={invia}
            style={{ marginTop: 6 }}
          />

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
  rigaMarchio: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  chiudi: { padding: 4 },
  titolo: { textAlign: "center", fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.3, color: colori.testo },
  sottotitolo: { textAlign: "center", fontSize: 15, color: colori.testoSecondario, marginBottom: 10 },
  campo: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
    paddingHorizontal: 14,
    fontSize: 17,
    color: colori.testo,
  },
  errore: { color: colori.rosso, fontSize: 14, fontWeight: "600" },
  messaggio: { color: colori.blu, fontSize: 14, fontWeight: "600" },
  cambiaModalita: { textAlign: "center", color: colori.blu, fontSize: 15, fontWeight: "600", marginTop: 6 },
  linkSecondario: { textAlign: "center", color: colori.testoSecondario, fontSize: 14, fontWeight: "600", marginTop: 4 },
  saltaAccesso: { textAlign: "center", color: colori.testoSecondario, fontSize: 15, fontWeight: "600" },
  saltaAccessoNota: { textAlign: "center", color: colori.testoSecondario, fontSize: 13 },
  legale: { textAlign: "center", color: colori.testoSecondario, fontSize: 13, marginTop: 14 },
  legaleLink: { color: colori.blu, fontWeight: "600" },
});
