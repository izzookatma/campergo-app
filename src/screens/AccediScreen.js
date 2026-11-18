import { useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import Pulsante from "../components/ui/Pulsante";
import Testo from "../components/ui/Testo";
import LogoGoogle from "../components/LogoGoogle";

// `navigation` esiste solo quando questa schermata è aperta da dentro
// l'app (es. toccando il cuoricino senza account) — all'avvio, prima del
// Tab.Navigator, la schermata non ha un `navigation` vero.
export default function AccediScreen({ onSaltaAccesso, navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
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
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={styles.chiudi}
                accessibilityRole="button"
                accessibilityLabel="Chiudi"
              >
                <Ionicons name="close" size={20} color={c.testoSecondario} />
              </Pressable>
            )}
          </View>
          <Testo v="titoloGrande" style={styles.testoCentrato}>
            {modalita === "accedi" ? "Accedi" : modalita === "registrati" ? "Crea account" : "Recupera password"}
          </Testo>
          <Testo v="secondario" tono="secondario" style={[styles.testoCentrato, { marginBottom: 10 }]}>
            {modalita === "accedi"
              ? "Per salvare i preferiti e le prenotazioni."
              : modalita === "registrati"
                ? "Bastano email e password."
                : "Ti mandiamo un link per impostarne una nuova."}
          </Testo>

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
            <TextInput style={styles.campo} placeholder="Nome" placeholderTextColor={c.testoSecondario} value={nome} onChangeText={setNome} />
          )}
          <TextInput
            style={styles.campo}
            placeholder="Email"
            placeholderTextColor={c.testoSecondario}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {modalita !== "recupera" && (
            <TextInput
              style={styles.campo}
              placeholder="Password"
              placeholderTextColor={c.testoSecondario}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          )}

          {errore ? (
            <Testo v="secondario" tono="pericolo" style={{ fontWeight: "600" }}>
              {errore}
            </Testo>
          ) : null}
          {messaggio ? (
            <Testo v="secondario" tono="primario" style={{ fontWeight: "600" }}>
              {messaggio}
            </Testo>
          ) : null}

          <Pulsante
            titolo={modalita === "accedi" ? "Accedi" : modalita === "registrati" ? "Registrati" : "Invia il link"}
            caricamento={inviando}
            onPress={invia}
            style={{ marginTop: 6 }}
          />

          {modalita === "accedi" && (
            <Pressable onPress={() => setModalita("recupera")} accessibilityRole="button">
              <Testo v="secondario" tono="secondario" style={styles.linkTesto}>
                Password dimenticata?
              </Testo>
            </Pressable>
          )}

          <Pressable
            onPress={() => setModalita(modalita === "registrati" ? "accedi" : "registrati")}
            accessibilityRole="button"
          >
            <Testo v="secondario" tono="primario" style={[styles.testoCentrato, { fontWeight: "600", marginTop: 6 }]}>
              {modalita === "registrati" ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
            </Testo>
          </Pressable>

          {modalita === "recupera" && (
            <Pressable onPress={() => setModalita("accedi")} accessibilityRole="button">
              <Testo v="secondario" tono="secondario" style={styles.linkTesto}>
                Torna ad accedere
              </Testo>
            </Pressable>
          )}

          {onSaltaAccesso && (
            <Pressable onPress={onSaltaAccesso} style={{ marginTop: 10, gap: 3 }} accessibilityRole="button">
              <Testo v="secondario" tono="secondario" style={[styles.testoCentrato, { fontWeight: "600" }]}>
                Continua senza account
              </Testo>
              <Testo v="nota" tono="secondario" style={styles.testoCentrato}>
                Ti chiederemo di accedere solo al momento di prenotare.
              </Testo>
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

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    // Niente `justifyContent: "center"`: su questa schermata (aperta dentro
    // una tab, con la barra in basso ancora visibile) centrare verticalmente
    // lasciava mezzo schermo vuoto sopra il logo prima del contenuto.
    contenuto: { flex: 1, padding: spazio.xl, gap: spazio.m },
    rigaMarchio: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    chiudi: { padding: spazio.xs },
    testoCentrato: { textAlign: "center" },
    campo: {
      height: 50,
      borderRadius: raggio.m,
      backgroundColor: c.sfondoCampo,
      borderWidth: 1,
      borderColor: c.separatore,
      paddingHorizontal: spazio.m + 2,
      fontSize: 17,
      color: c.testo,
    },
    linkTesto: { textAlign: "center", fontWeight: "600", marginTop: spazio.xs },
    legale: { textAlign: "center", color: c.testoSecondario, fontSize: 13, marginTop: spazio.l - 2 },
    legaleLink: { color: c.primario, fontWeight: "600" },
  });
}
