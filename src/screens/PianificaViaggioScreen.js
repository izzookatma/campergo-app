import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { generaItinerarioIA } from "../lib/pianificatore";
import { salvaPianoViaggio } from "../lib/pianiSalvati";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import { CardGiorno } from "../components/PianoGiorno";

const ESEMPI = [
  "Ho 3 giorni nel weekend, voglio visitare Mantova e la sua periferia, cosa mi consigli?",
  "Un weekend sul Lago di Garda, mi piace la natura e la buona cucina",
  "Una settimana in Toscana, musei e borghi, viaggio con la famiglia",
];

export default function PianificaViaggioScreen({ navigation, route }) {
  const { session } = useAuth();
  const [testo, setTesto] = useState("");
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState("");
  const [piano, setPiano] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvato, setSalvato] = useState(false);

  // Aperta da "I miei piani di viaggio" (PianiSalvatiScreen): il piano è già
  // pronto, non va rigenerato — solo mostrato (già salvato, il pulsante
  // salva resta disattivo).
  useEffect(() => {
    if (!route?.params?.pianoSalvato) return;
    Promise.resolve().then(() => {
      setTesto(route.params.richiestaSalvata || "");
      setPiano(route.params.pianoSalvato);
      setSalvato(true);
    });
  }, [route?.params?.pianoSalvato, route?.params?.richiestaSalvata]);

  const richiedeAccesso = () => {
    Alert.alert("Accedi", "Pianificare un viaggio con l'IA è gratuito per chi si registra. Accedi o registrati per usarla.", [
      { text: "Annulla", style: "cancel" },
      { text: "Accedi", onPress: () => navigation.navigate("Accedi") },
    ]);
  };

  const genera = async (fraseIniziale) => {
    const frase = (fraseIniziale ?? testo).trim();
    if (!frase || caricando) return;
    if (!session) {
      richiedeAccesso();
      return;
    }
    setTesto(frase);
    setCaricando(true);
    setErrore("");
    setPiano(null);
    setSalvato(false);
    try {
      const risultato = await generaItinerarioIA(frase);
      setPiano(risultato);
    } catch (e) {
      setErrore(messaggioErroreComprensibile(e, "Non sono riuscito a generare il piano di viaggio."));
    } finally {
      setCaricando(false);
    }
  };

  const salva = async () => {
    if (salvando || salvato || !piano) return;
    setSalvando(true);
    try {
      await salvaPianoViaggio(session.user.id, {
        richiesta: testo,
        tappe: piano.tappe,
        giorniRichiesti: piano.giorniRichiesti,
        piano,
      });
      setSalvato(true);
    } catch (e) {
      Alert.alert("Non salvato", messaggioErroreComprensibile(e, "Non sono riuscito a salvare il piano."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
        <MarchioNaturaGo />
        <Text style={styles.titolo}>Pianifica il tuo viaggio</Text>
        <Text style={styles.sottotitolo}>
          Scrivi dove vuoi andare e per quanto tempo: l&apos;IA costruisce un piano giorno per giorno con le schede
          vere di NaturaGo.
        </Text>

        <View style={styles.pill}>
          <TextInput
            style={styles.input}
            placeholder="Es. Ho 3 giorni nel weekend, voglio visitare Mantova…"
            placeholderTextColor={colori.testoSecondario}
            value={testo}
            onChangeText={setTesto}
            onSubmitEditing={() => genera()}
            multiline
            returnKeyType="send"
          />
        </View>

        <Pressable
          style={[styles.bottone, (!testo.trim() || caricando) && styles.bottoneDisattivo]}
          onPress={() => genera()}
          disabled={!testo.trim() || caricando}
        >
          {caricando ? (
            <ActivityIndicator color={colori.bianco} size="small" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={16} color={colori.bianco} />
              <Text style={styles.bottoneTesto}>Genera il piano</Text>
            </>
          )}
        </Pressable>

        {errore ? <Text style={styles.errore}>{errore}</Text> : null}

        {!piano && !caricando && (
          <View style={styles.esempi}>
            <Text style={styles.esempiTitolo}>Qualche esempio</Text>
            {ESEMPI.map((e) => (
              <Pressable key={e} style={styles.esempio} onPress={() => genera(e)}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={colori.blu} />
                <Text style={styles.esempioTesto}>{e}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {piano && (
          <View style={styles.risultato}>
            <View style={styles.rigaRisultato}>
              <Text style={styles.risultatoTitolo}>
                {piano.giorniRichiesti} giorni · {piano.tappe.join(" → ")}
              </Text>
              <Pressable style={styles.pulsanteSalva} onPress={salva} disabled={salvando || salvato}>
                {salvando ? (
                  <ActivityIndicator color={colori.blu} size="small" />
                ) : (
                  <Ionicons name={salvato ? "bookmark" : "bookmark-outline"} size={18} color={colori.blu} />
                )}
              </Pressable>
            </View>
            {piano.giorni.map((g) => (
              <CardGiorno key={g.numero} giorno={g} navigation={navigation} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.bluChiaro },
  contenuto: { padding: 20, paddingBottom: 40, gap: 4 },
  titolo: { fontSize: 20, fontWeight: "800", color: colori.testo, marginTop: 14 },
  sottotitolo: { fontSize: 12.5, color: colori.testoSecondario, marginTop: 4, marginBottom: 14, lineHeight: 18 },
  pill: {
    backgroundColor: colori.bianco,
    borderRadius: raggioCard,
    padding: 14,
    minHeight: 70,
    ...ombraCard,
  },
  input: { fontSize: 13.5, color: colori.testo },
  bottone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colori.blu,
    borderRadius: 999,
    paddingVertical: 13,
    marginTop: 12,
  },
  bottoneDisattivo: { opacity: 0.5 },
  bottoneTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13.5 },
  errore: { color: colori.rosso, fontSize: 12.5, marginTop: 10 },
  esempi: { marginTop: 22, gap: 8 },
  esempiTitolo: { fontSize: 11, fontWeight: "700", color: colori.testoSecondario, textTransform: "uppercase", marginBottom: 2 },
  esempio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colori.bianco,
    borderRadius: raggioCard,
    padding: 12,
    ...ombraCard,
  },
  esempioTesto: { flex: 1, fontSize: 12.5, color: colori.testo },
  risultato: { marginTop: 22, gap: 12 },
  rigaRisultato: { flexDirection: "row", alignItems: "center", gap: 10 },
  risultatoTitolo: { flex: 1, fontSize: 15, fontWeight: "800", color: colori.testo },
  pulsanteSalva: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colori.bianco,
    ...ombraCard,
  },
});
