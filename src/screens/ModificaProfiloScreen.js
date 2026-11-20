import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTema } from "../theme/tema";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { caricaFotoProfilo } from "../lib/host";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { useT } from "../i18n/i18n";

// Profilo vero e proprio: foto, nome e password, come nel sito
// (AccountArea.jsx): stessi campi in user_metadata (nome, avatar_url).
export default function ModificaProfiloScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
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
        Alert.alert(t("modificaProfilo.permessoNegatoTitolo"), t("modificaProfilo.permessoNegatoMessaggio"));
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
      Alert.alert(t("modificaProfilo.fotoNonSalvataTitolo"), messaggioErroreComprensibile(e, t("modificaProfilo.fotoNonSalvataFallback")));
    } finally {
      setCaricandoFoto(false);
    }
  };

  const menuFoto = () =>
    Alert.alert(t("modificaProfilo.fotoDelProfiloTitolo"), undefined, [
      { text: t("modificaProfilo.scattaFoto"), onPress: () => scegliFoto(true) },
      { text: t("modificaProfilo.scegliDallaLibreria"), onPress: () => scegliFoto(false) },
      { text: t("comune.annulla"), style: "cancel" },
    ]);

  const salvaNome = async () => {
    if (!nome.trim()) {
      Alert.alert(t("modificaProfilo.nomeMancanteTitolo"), t("modificaProfilo.nomeMancanteMessaggio"));
      return;
    }
    setSalvandoNome(true);
    const { error } = await supabase.auth.updateUser({ data: { nome: nome.trim() } });
    setSalvandoNome(false);
    if (error) {
      console.error("[NaturaGo app] salva nome", error);
      Alert.alert(t("modificaProfilo.nomeNonSalvatoTitolo"), messaggioErroreComprensibile(error, t("modificaProfilo.nomeNonSalvatoFallback")));
      return;
    }
    Alert.alert(t("comune.fatto"), t("modificaProfilo.nomeAggiornato"));
  };

  const cambiaPassword = async () => {
    if (nuovaPassword.length < 10) {
      Alert.alert(t("modificaProfilo.passwordCorteTitolo"), t("modificaProfilo.passwordCorteMessaggio"));
      return;
    }
    if (nuovaPassword !== confermaPassword) {
      Alert.alert(t("modificaProfilo.passwordDiverseTitolo"), t("modificaProfilo.passwordDiverseMessaggio"));
      return;
    }
    setSalvandoPassword(true);
    const { error: erroreLogin } = await accedi(utente.email, passwordAttuale);
    if (erroreLogin) {
      setSalvandoPassword(false);
      Alert.alert(t("modificaProfilo.passwordErrataTitolo"), t("modificaProfilo.passwordErrataMessaggio"));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: nuovaPassword });
    setSalvandoPassword(false);
    if (error) {
      console.error("[NaturaGo app] cambia password", error);
      Alert.alert(t("modificaProfilo.passwordNonCambiataTitolo"), messaggioErroreComprensibile(error, t("modificaProfilo.passwordNonCambiataFallback")));
      return;
    }
    setPasswordAttuale("");
    setNuovaPassword("");
    setConfermaPassword("");
    Alert.alert(t("comune.fatto"), t("modificaProfilo.passwordCambiata"));
  };

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable style={styles.indietro} onPress={() => navigation.goBack()} accessibilityLabel={t("comune.indietro")}>
          <Ionicons name="chevron-back" size={18} color={c.testo} />
        </Pressable>
        <Text style={styles.titolo}>{t("modificaProfilo.titolo")}</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.avatarBox} onPress={menuFoto} accessibilityLabel={t("modificaProfilo.cambiaFotoLabel")}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.avatar, styles.avatarVuoto]}>
                <Ionicons name="person" size={44} color={c.sulPrimario} />
              </View>
            )}
            {caricandoFoto && (
              <View style={[styles.avatar, styles.avatarCarica]}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
            <View style={styles.macchina}>
              <Ionicons name="camera" size={14} color={c.sulPrimario} />
            </View>
          </Pressable>
          <Text style={styles.cambiaFoto} onPress={menuFoto}>
            {avatarUrl ? t("modificaProfilo.cambiaFoto") : t("modificaProfilo.aggiungiFoto")}
          </Text>

          <View style={styles.box}>
            <Text style={styles.etichetta}>{t("modificaProfilo.nome")}</Text>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder={t("modificaProfilo.placeholderNome")} placeholderTextColor={c.testoSecondario} />
            <Text style={styles.etichetta}>{t("modificaProfilo.email")}</Text>
            <Text style={styles.emailFissa}>{utente.email}</Text>
            <Pressable style={styles.bottone} onPress={salvaNome} disabled={salvandoNome}>
              {salvandoNome ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.bottoneTesto}>{t("modificaProfilo.salvaNome")}</Text>}
            </Pressable>
          </View>

          <View style={styles.box}>
            <Text style={styles.sezione}>{t("modificaProfilo.password")}</Text>
            {conPassword ? (
              <>
                <TextInput style={styles.input} value={passwordAttuale} onChangeText={setPasswordAttuale} placeholder={t("modificaProfilo.placeholderPasswordAttuale")} placeholderTextColor={c.testoSecondario} secureTextEntry autoCapitalize="none" />
                <TextInput style={styles.input} value={nuovaPassword} onChangeText={setNuovaPassword} placeholder={t("modificaProfilo.placeholderNuovaPassword")} placeholderTextColor={c.testoSecondario} secureTextEntry autoCapitalize="none" />
                <TextInput style={styles.input} value={confermaPassword} onChangeText={setConfermaPassword} placeholder={t("modificaProfilo.placeholderRipetiPassword")} placeholderTextColor={c.testoSecondario} secureTextEntry autoCapitalize="none" />
                <Pressable style={styles.bottone} onPress={cambiaPassword} disabled={salvandoPassword}>
                  {salvandoPassword ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.bottoneTesto}>{t("modificaProfilo.cambiaPassword")}</Text>}
                </Pressable>
              </>
            ) : (
              <Text style={styles.nota}>{t("modificaProfilo.notaAccessoSocial")}</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spazio.l, paddingBottom: spazio.s, backgroundColor: c.sfondoGruppo },
    indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
    titolo: { fontSize: 17, fontWeight: "700", color: c.testo },
    contenuto: { padding: spazio.xl - 4, gap: spazio.l, alignItems: "stretch" },
    avatarBox: { alignSelf: "center" },
    avatar: { width: 104, height: 104, borderRadius: 52 },
    avatarVuoto: { backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
    avatarCarica: { position: "absolute", backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
    macchina: { position: "absolute", right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: c.primario, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
    cambiaFoto: { alignSelf: "center", color: c.primario, fontWeight: "600", fontSize: 14 },
    box: { backgroundColor: c.sfondoGruppo, borderRadius: raggio.l, padding: spazio.l, gap: spazio.s + 2 },
    sezione: { fontSize: 15, fontWeight: "700", color: c.testo },
    etichetta: { fontSize: 12, fontWeight: "600", color: c.testoSecondario },
    input: { borderWidth: 1, borderColor: c.separatore, borderRadius: raggio.m - 2, paddingHorizontal: spazio.l - 2, paddingVertical: spazio.m, fontSize: 15, color: c.testo },
    emailFissa: { fontSize: 15, color: c.testoSecondario },
    nota: { fontSize: 13, lineHeight: 19, color: c.testoSecondario },
    bottone: { backgroundColor: c.primario, borderRadius: raggio.m - 2, paddingVertical: spazio.m + 1, alignItems: "center", marginTop: spazio.xs },
    bottoneTesto: { color: c.sulPrimario, fontWeight: "700", fontSize: 15 },
  });
}
