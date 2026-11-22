import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Linking, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTema } from "../theme/tema";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { registraStruttura } from "../lib/host";
import Chip from "../components/ui/Chip";

const TIPI = [
  { chiave: "campeggio", etichetta: "Campeggio / Piazzola" },
  { chiave: "area_sosta", etichetta: "Area sosta" },
  { chiave: "agricampeggio", etichetta: "Agricampeggio" },
  { chiave: "agriturismo", etichetta: "Agriturismo" },
  { chiave: "alloggio_fisso", etichetta: "Alloggio fisso" },
];
const SITO = "https://www.naturago.it";

// Registrazione gratuita di una nuova struttura dal telefono. Chiama la
// stessa funzione del sito; foto, servizi e piazzole si aggiungono dopo da
// «La mia struttura».
export default function RegistraStrutturaScreen({ navigation }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const [tipo, setTipo] = useState("campeggio");
  const [v, setV] = useState({ nome: "", indirizzo: "", cap: "", localita: "", descrizione: "", telefono: "", sitoWeb: "", prezzo: "" });
  const [privacy, setPrivacy] = useState(false);
  const [contratto, setContratto] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(null);
  const [esito, setEsito] = useState(null);

  const imposta = (k) => (t) => setV((x) => ({ ...x, [k]: t }));
  const completo = v.nome.trim() && v.indirizzo.trim() && v.cap.trim() && v.localita.trim() && v.descrizione.trim() && privacy && contratto;

  const invia = async () => {
    setErrore(null);
    setInvio(true);
    try {
      const r = await registraStruttura({
        tipoStruttura: tipo,
        nome: v.nome.trim(),
        indirizzo: v.indirizzo.trim(),
        cap: v.cap.trim(),
        localita: v.localita.trim(),
        descrizione: v.descrizione.trim(),
        telefono: v.telefono.trim(),
        sitoWeb: v.sitoWeb.trim(),
        prezzo: v.prezzo.replace(",", ".").trim(),
      });
      setEsito(r.id == null ? "attesa" : "ok");
    } catch (e) {
      console.error("[NaturaGo app] registraStruttura", e);
      setErrore(
        e?.code === "23505"
          ? "Hai già registrato una struttura con questo account."
          : messaggioErroreComprensibile(e, "Non è stato possibile completare la registrazione. Riprova."),
      );
    } finally {
      setInvio(false);
    }
  };

  const Campo = ({ k, etichetta, ...resto }) => (
    <View style={{ gap: 4 }}>
      <Text style={styles.etichetta}>{etichetta}</Text>
      <TextInput style={styles.input} value={v[k]} onChangeText={imposta(k)} placeholderTextColor={c.testoSecondario} {...resto} />
    </View>
  );

  const Consenso = ({ valore, onPress, testo, pagina, link }) => (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: valore }} style={styles.consenso} onPress={onPress}>
      <Ionicons name={valore ? "checkbox" : "square-outline"} size={22} color={valore ? c.primario : c.testoSecondario} />
      <Text style={styles.consensoTesto}>
        {testo}{" "}
        <Text style={styles.link} onPress={() => Linking.openURL(`${SITO}${pagina}`)}>
          {link}
        </Text>
      </Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable accessibilityRole="button" accessibilityLabel="Indietro" hitSlop={8} style={styles.indietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={c.testo} />
        </Pressable>
        <Text style={styles.titolo}>Registra la tua struttura</Text>
        <View style={styles.indietro} />
      </SafeAreaView>
      {esito ? (
        <View style={styles.centro}>
          <Ionicons name="checkmark-circle" size={44} color={c.primario} />
          <Text style={styles.esitoTitolo}>{esito === "ok" ? "Struttura registrata" : "Richiesta inviata"}</Text>
          <Text style={styles.esitoTesto}>
            {esito === "ok"
              ? "Trovi la tua scheda in «La mia struttura»: aggiungi foto, servizi e piazzole. Prima di comparire sul sito, la scheda viene controllata dal nostro team."
              : "Esiste già una scheda con questo nome: abbiamo scritto all'indirizzo di riferimento per confermare che sei tu il gestore."}
          </Text>
          <Pressable accessibilityRole="button" style={styles.bottone} onPress={() => navigation.goBack()}>
            <Text style={styles.bottoneTesto}>Fatto</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.lista} keyboardShouldPersistTaps="handled">
            <Text style={styles.nota}>È gratis. Compila i dati principali: foto, servizi e piazzole si aggiungono dopo.</Text>
            <Text style={styles.etichetta}>Tipo di struttura</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {TIPI.map((t) => (
                <Chip key={t.chiave} etichetta={t.etichetta} attivo={tipo === t.chiave} onPress={() => setTipo(t.chiave)} />
              ))}
            </ScrollView>
            {Campo({ k: "nome", etichetta: "Nome della struttura" })}
            {Campo({ k: "indirizzo", etichetta: "Indirizzo" })}
            {Campo({ k: "cap", etichetta: "CAP", keyboardType: "number-pad", maxLength: 5 })}
            {Campo({ k: "localita", etichetta: "Città" })}
            {Campo({ k: "descrizione", etichetta: "Descrizione", multiline: true, style: [styles.input, { minHeight: 90, textAlignVertical: "top" }] })}
            {Campo({ k: "telefono", etichetta: "Telefono (facoltativo)", keyboardType: "phone-pad" })}
            {Campo({ k: "sitoWeb", etichetta: "Sito web (facoltativo)", autoCapitalize: "none", keyboardType: "url" })}
            {Campo({ k: "prezzo", etichetta: "Prezzo a notte in € (facoltativo)", keyboardType: "number-pad" })}
            {Consenso({ valore: privacy, onPress: () => setPrivacy((x) => !x), testo: "Ho letto e accetto la", pagina: "/privacy", link: "Privacy Policy" })}
            {Consenso({ valore: contratto, onPress: () => setContratto((x) => !x), testo: "Ho letto e accetto il", pagina: "/contratto-host", link: "Contratto di Collaborazione Host" })}
            {!!errore && <Text style={styles.errore}>{errore}</Text>}
          </ScrollView>
          <View style={styles.piede}>
            <Pressable accessibilityRole="button" style={[styles.bottone, (!completo || invio) && { opacity: 0.45 }]} disabled={!completo || invio} onPress={invia}>
              {invio ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.bottoneTesto}>Registra la struttura</Text>}
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.separatore, backgroundColor: c.sfondoGruppo },
    indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
    titolo: { fontSize: 14.5, fontWeight: "800", color: c.testo },
    lista: { padding: 16, gap: 12, paddingBottom: 24 },
    nota: { fontSize: 12.5, color: c.testoSecondario, lineHeight: 18 },
    etichetta: { fontSize: 11.5, fontWeight: "700", color: c.testoSecondario },
    input: { borderWidth: 1, borderColor: c.separatore, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.testo, backgroundColor: c.sfondoGruppo },
    consenso: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
    consensoTesto: { flex: 1, fontSize: 12.5, color: c.testo, lineHeight: 18 },
    link: { color: c.primario, fontWeight: "700" },
    errore: { fontSize: 12.5, color: "#c0392b" },
    piede: { padding: 16, borderTopWidth: 1, borderTopColor: c.separatore, backgroundColor: c.sfondoGruppo },
    bottone: { minHeight: 48, borderRadius: 12, backgroundColor: c.primario, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    bottoneTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 13.5 },
    centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    esitoTitolo: { fontSize: 18, fontWeight: "800", color: c.testo },
    esitoTesto: { fontSize: 13.5, color: c.testoSecondario, textAlign: "center", lineHeight: 20 },
  });
}
