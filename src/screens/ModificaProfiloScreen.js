import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colori } from "../theme/colors";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { caricaFotoProfilo } from "../lib/host";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";

// Profilo vero e proprio: foto, nome e password, come nel sito
// (AccountArea.jsx): stessi campi in user_metadata (nome, avatar_url).
export default function ModificaProfiloScreen({ navigation }) {
  const { session, accedi } = useAuth();
  const utente = session.user;
  const [nome, setNome] = useState(utente.user_metadata?.nome || utente.user_metadata?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(utente.user_metadata?.avatar_url || utente.user_metadata?.picture || null);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [caricandoFoto, setCaricandoFoto] = useState(false);
  const [passwordAttuale, setPasswordAttuale] = useState("");
  const [nuovaPassword, setNuovaPassword] = useState("");
  const [confermaPassword, setConfermaPassword] = useState("");
  const [salvandoPassword, setSalvandoPassword] = useState(false);

  // Chi è entrato con Google/Facebook non ha una password sua da cambiare.
  const conPassword = (utente.app_metadata?.providers || [utente.app_metadata?.provider]).includes("email");

  const scegliFoto = async (daFotocamera) => {
    try {
      const permesso = daFotocamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permesso.granted) {
        Alert.alert("Permesso negato", "Consenti l'accesso alle foto dalle impostazioni del telefono.");
        return;
      }
      const opzioni = { mediaTypes: ["images"], quality: 0.9, allowsEditing: true, aspect: [1, 1] };
      const risultato = daFotocamera
        ? await ImagePicker.launchCameraAsync(opzioni)
        : await ImagePicker.launchImageLibraryAsync(opzioni);
      if (risultato.canceled || !risultato.assets?.[0]) return;
      setCaricandoFoto(true);
      const url = await caricaFotoProfilo(utente.id, risultato.assets[0]);
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: url } });
      if (error) throw error;
      setAvatarUrl(url);
    } catch (e) {
      console.error("[NaturaGo app] foto profilo", e);
      Alert.alert("Foto non salvata", messaggioErroreComprensibile(e, "Non è stato possibile salvare la foto."));
    } finally {
      setCaricandoFoto(false);
    }
  };

  const menuFoto = () =>
    Alert.alert("Foto del profilo", undefined, [
      { text: "Scatta una foto", onPress: () => scegliFoto(true) },
      { text: "Scegli dalla libreria", onPress: () => scegliFoto(false) },
      { text: "Annulla", style: "cancel" },
    ]);

  const salvaNome = async () => {
    if (!nome.trim()) {
      Alert.alert("Nome mancante", "Scrivi il tuo nome.");
      return;
    }
    setSalvandoNome(true);
    const { error } = await supabase.auth.updateUser({ data: { nome: nome.trim() } });
    setSalvandoNome(false);
    if (error) {
      console.error("[NaturaGo app] salva nome", error);
      Alert.alert("Nome non salvato", messaggioErroreComprensibile(error, "Non è stato possibile salvare il nome."));
      return;
    }
    Alert.alert("Fatto", "Nome aggiornato.");
  };

  const cambiaPassword = async () => {
    if (nuovaPassword.length < 10) {
      Alert.alert("Password troppo corta", "Usa almeno 10 caratteri.");
      return;
    }
    if (nuovaPassword !== confermaPassword) {
      Alert.alert("Password diverse", "Le due password non coincidono.");
      return;
    }
    setSalvandoPassword(true);
    const { error: erroreLogin } = await accedi(utente.email, passwordAttuale);
    if (erroreLogin) {
      setSalvandoPassword(false);
      Alert.alert("Password attuale errata", "Controlla la password attuale e riprova.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: nuovaPassword });
    setSalvandoPassword(false);
    if (error) {
      console.error("[NaturaGo app] cambia password", error);
      Alert.alert("Password non cambiata", messaggioErroreComprensibile(error, "Non è stato possibile cambiare la password."));
      return;
    }
    setPasswordAttuale("");
    setNuovaPassword("");
    setConfermaPassword("");
    Alert.alert("Fatto", "Password cambiata.");
  };

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable style={styles.indietro} onPress={() => navigation.goBack()} accessibilityLabel="Indietro">
          <Ionicons name="chevron-back" size={18} color={colori.testo} />
        </Pressable>
        <Text style={styles.titolo}>Il mio profilo</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.avatarBox} onPress={menuFoto} accessibilityLabel="Cambia la foto del profilo">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarVuoto]}>
                <Ionicons name="person" size={44} color={colori.bianco} />
              </View>
            )}
            {caricandoFoto && (
              <View style={[styles.avatar, styles.avatarCarica]}>
                <ActivityIndicator color={colori.bianco} />
              </View>
            )}
            <View style={styles.macchina}>
              <Ionicons name="camera" size={14} color={colori.bianco} />
            </View>
          </Pressable>
          <Text style={styles.cambiaFoto} onPress={menuFoto}>
            {avatarUrl ? "Cambia foto" : "Aggiungi una foto"}
          </Text>

          <View style={styles.box}>
            <Text style={styles.etichetta}>Nome</Text>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Il tuo nome" placeholderTextColor={colori.testoSecondario} />
            <Text style={styles.etichetta}>Email</Text>
            <Text style={styles.emailFissa}>{utente.email}</Text>
            <Pressable style={styles.bottone} onPress={salvaNome} disabled={salvandoNome}>
              {salvandoNome ? <ActivityIndicator color={colori.bianco} /> : <Text style={styles.bottoneTesto}>Salva nome</Text>}
            </Pressable>
          </View>

          <View style={styles.box}>
            <Text style={styles.sezione}>Password</Text>
            {conPassword ? (
              <>
                <TextInput style={styles.input} value={passwordAttuale} onChangeText={setPasswordAttuale} placeholder="Password attuale" placeholderTextColor={colori.testoSecondario} secureTextEntry autoCapitalize="none" />
                <TextInput style={styles.input} value={nuovaPassword} onChangeText={setNuovaPassword} placeholder="Nuova password (almeno 10 caratteri)" placeholderTextColor={colori.testoSecondario} secureTextEntry autoCapitalize="none" />
                <TextInput style={styles.input} value={confermaPassword} onChangeText={setConfermaPassword} placeholder="Ripeti la nuova password" placeholderTextColor={colori.testoSecondario} secureTextEntry autoCapitalize="none" />
                <Pressable style={styles.bottone} onPress={cambiaPassword} disabled={salvandoPassword}>
                  {salvandoPassword ? <ActivityIndicator color={colori.bianco} /> : <Text style={styles.bottoneTesto}>Cambia password</Text>}
                </Pressable>
              </>
            ) : (
              <Text style={styles.nota}>
                Hai effettuato l&apos;accesso con Google o Facebook: la password è quella del tuo account lì, qui non c&apos;è nulla da cambiare.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colori.bianco },
  indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  titolo: { fontSize: 17, fontWeight: "700", color: colori.testo },
  contenuto: { padding: 20, gap: 16, alignItems: "stretch" },
  avatarBox: { alignSelf: "center" },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  avatarVuoto: { backgroundColor: colori.blu, alignItems: "center", justifyContent: "center" },
  avatarCarica: { position: "absolute", backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  macchina: { position: "absolute", right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: colori.blu, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colori.bianco },
  cambiaFoto: { alignSelf: "center", color: colori.blu, fontWeight: "600", fontSize: 14 },
  box: { backgroundColor: colori.bianco, borderRadius: 16, padding: 16, gap: 10 },
  sezione: { fontSize: 15, fontWeight: "700", color: colori.testo },
  etichetta: { fontSize: 12, fontWeight: "600", color: colori.testoSecondario },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colori.testo },
  emailFissa: { fontSize: 15, color: colori.testoSecondario },
  nota: { fontSize: 13, lineHeight: 19, color: colori.testoSecondario },
  bottone: { backgroundColor: colori.blu, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  bottoneTesto: { color: colori.bianco, fontWeight: "700", fontSize: 15 },
});
