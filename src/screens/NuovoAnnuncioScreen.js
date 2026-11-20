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
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { pubblicaAnnuncio, CATEGORIE_MERCATINO, STATO_PRODOTTO_META } from "../lib/mercatino";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { useT } from "../i18n/i18n";

const MASSIMO_FOTO = 6;

export default function NuovoAnnuncioScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { session } = useAuth();
  const [categoria, setCategoria] = useState("camper");
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [statoProdotto, setStatoProdotto] = useState("buone_condizioni");
  const [prezzo, setPrezzo] = useState("");
  const [metodoRitiro, setMetodoRitiro] = useState("");
  const [citta, setCitta] = useState("");
  const [foto, setFoto] = useState([]);
  const [pubblicando, setPubblicando] = useState(false);
  const [errore, setErrore] = useState(null);

  const scegliFoto = async () => {
    const permesso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permesso.granted) {
      Alert.alert(t("nuovoAnnuncio.fotoNonDisponibiliTitolo"), t("nuovoAnnuncio.fotoNonDisponibiliMessaggio"));
      return;
    }
    const risultato = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MASSIMO_FOTO - foto.length,
      quality: 0.6,
    });
    if (risultato.canceled) return;
    const nuove = risultato.assets.map((a) => a.uri);
    setFoto((prev) => [...prev, ...nuove].slice(0, MASSIMO_FOTO));
  };

  const rimuoviFoto = (uri) => {
    setFoto((prev) => prev.filter((u) => u !== uri));
  };

  const pubblica = async () => {
    setErrore(null);
    if (foto.length === 0) {
      setErrore(t("nuovoAnnuncio.erroreAggiungiFoto"));
      return;
    }
    if (!titolo.trim() || !prezzo || !metodoRitiro.trim() || !citta.trim()) {
      setErrore(t("nuovoAnnuncio.erroreCompila"));
      return;
    }
    const prezzoNumero = Number(prezzo.replace(",", "."));
    if (!prezzoNumero || prezzoNumero <= 0) {
      setErrore(t("nuovoAnnuncio.errorePrezzo"));
      return;
    }

    setPubblicando(true);
    try {
      await pubblicaAnnuncio({
        utenteId: session.user.id,
        nomeVenditore: session.user.user_metadata?.nome || t("comune.utenteDefault"),
        categoria,
        titolo: titolo.trim(),
        descrizione: descrizione.trim(),
        stato_prodotto: statoProdotto,
        prezzo: prezzoNumero,
        metodo_ritiro: metodoRitiro.trim(),
        citta: citta.trim(),
        foto,
      });
      Alert.alert(t("nuovoAnnuncio.annuncioInviatoTitolo"), t("nuovoAnnuncio.annuncioInviatoMessaggio"), [
        { text: t("comune.ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error("Errore nella pubblicazione dell'annuncio:", e);
      setErrore(messaggioErroreComprensibile(e));
    } finally {
      setPubblicando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={styles.schermo} edges={["top"]}>
        <View style={styles.intestazione}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={c.testo} />
          </Pressable>
          <Text style={styles.titoloSchermo}>{t("nuovoAnnuncio.titoloSchermo")}</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={styles.contenuto}>
          <Text style={styles.etichetta}>{t("nuovoAnnuncio.foto", { n: MASSIMO_FOTO })}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {foto.map((uri) => (
              <View key={uri} style={styles.fotoBox}>
                <Image source={{ uri }} style={styles.fotoImmagine} contentFit="cover" />
                <Pressable style={styles.fotoRimuovi} onPress={() => rimuoviFoto(uri)}>
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {foto.length < MASSIMO_FOTO && (
              <Pressable style={styles.fotoAggiungi} onPress={scegliFoto}>
                <Ionicons name="camera-outline" size={22} color={c.primario} />
              </Pressable>
            )}
          </ScrollView>

          <Text style={styles.etichetta}>{t("nuovoAnnuncio.categoria")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {Object.entries(CATEGORIE_MERCATINO).map(([chiave, etichetta]) => (
              <Pressable
                key={chiave}
                style={[styles.chip, categoria === chiave && styles.chipAttivo]}
                onPress={() => setCategoria(chiave)}
              >
                <Text style={[styles.chipTesto, categoria === chiave && styles.chipTestoAttivo]}>{etichetta}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.etichetta}>{t("nuovoAnnuncio.titolo")}</Text>
          <TextInput style={styles.campo} placeholder={t("nuovoAnnuncio.placeholderTitolo")} placeholderTextColor={c.testoSecondario} value={titolo} onChangeText={setTitolo} />

          <Text style={styles.etichetta}>{t("nuovoAnnuncio.descrizione")}</Text>
          <TextInput
            style={[styles.campo, styles.campoMultilinea]}
            placeholder={t("nuovoAnnuncio.placeholderDescrizione")}
            placeholderTextColor={c.testoSecondario}
            value={descrizione}
            onChangeText={setDescrizione}
            multiline
          />

          <Text style={styles.etichetta}>{t("nuovoAnnuncio.condizioni")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {Object.entries(STATO_PRODOTTO_META).map(([chiave, etichetta]) => (
              <Pressable
                key={chiave}
                style={[styles.chip, statoProdotto === chiave && styles.chipAttivo]}
                onPress={() => setStatoProdotto(chiave)}
              >
                <Text style={[styles.chipTesto, statoProdotto === chiave && styles.chipTestoAttivo]}>{etichetta}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.etichetta}>{t("nuovoAnnuncio.prezzo")}</Text>
          <TextInput style={styles.campo} placeholder="0" placeholderTextColor={c.testoSecondario} value={prezzo} onChangeText={setPrezzo} keyboardType="decimal-pad" />

          <Text style={styles.etichetta}>{t("nuovoAnnuncio.citta")}</Text>
          <TextInput style={styles.campo} placeholder={t("nuovoAnnuncio.placeholderCitta")} placeholderTextColor={c.testoSecondario} value={citta} onChangeText={setCitta} />

          <Text style={styles.etichetta}>{t("nuovoAnnuncio.comeSiRitira")}</Text>
          <TextInput
            style={styles.campo}
            placeholder={t("nuovoAnnuncio.placeholderRitiro")}
            placeholderTextColor={c.testoSecondario}
            value={metodoRitiro}
            onChangeText={setMetodoRitiro}
          />

          {errore ? <Text style={styles.errore}>{errore}</Text> : null}

          <Pressable style={styles.pulsantePubblica} onPress={pubblica} disabled={pubblicando}>
            {pubblicando ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.pulsantePubblicaTesto}>{t("nuovoAnnuncio.pubblicaAnnuncio")}</Text>}
          </Pressable>
          <Text style={styles.nota}>{t("nuovoAnnuncio.notaApprovazione")}</Text>
        </ScrollView>
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
  },
  titoloSchermo: { fontSize: 14, fontWeight: "800", color: c.testo },
  contenuto: { padding: 20, gap: 6, paddingBottom: 40 },
  etichetta: { fontSize: 11.5, fontWeight: "700", color: c.testo, marginTop: 10, marginBottom: 4 },
  campo: {
    height: 46,
    borderRadius: 12,
    backgroundColor: c.sfondoGruppo,
    borderWidth: 1,
    borderColor: c.separatore,
    paddingHorizontal: 14,
    fontSize: 13,
    color: c.testo,
  },
  campoMultilinea: { height: 90, paddingTop: 12, textAlignVertical: "top" },
  chip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.sfondoGruppo,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.separatore,
    marginRight: 8,
  },
  chipAttivo: { backgroundColor: c.primario, borderColor: c.primario },
  chipTesto: { fontSize: 11.5, fontWeight: "600", color: c.testoSecondario },
  chipTestoAttivo: { color: c.sulPrimario },
  fotoBox: { width: 72, height: 72, borderRadius: 12, marginRight: 8, position: "relative" },
  fotoImmagine: { width: "100%", height: "100%", borderRadius: 12 },
  fotoRimuovi: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.pericolo,
    alignItems: "center",
    justifyContent: "center",
  },
  fotoAggiungi: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.separatore,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.sfondoGruppo,
  },
  errore: { color: c.pericolo, fontSize: 12, fontWeight: "600", marginTop: 10 },
  pulsantePubblica: {
    height: 48,
    borderRadius: 12,
    backgroundColor: c.primario,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  pulsantePubblicaTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 14 },
  nota: { fontSize: 10.5, color: c.testoSecondario, textAlign: "center", marginTop: 8 },
  });
}
