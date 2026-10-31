import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { TIPO_STRUTTURA_SEGNALABILE_META, SERVIZI_SEGNALAZIONE_META, inviaSegnalazioneStruttura } from "../lib/segnalazioni";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";

export default function NuovaSegnalazioneScreen({ navigation }) {
  const { session } = useAuth();
  const [tipoStruttura, setTipoStruttura] = useState("campeggio");
  const [amenities, setAmenities] = useState([]);
  const [nome, setNome] = useState("");
  const [citta, setCitta] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [sitoWeb, setSitoWeb] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(null);

  const toggleAmenity = (chiave) =>
    setAmenities((a) => (a.includes(chiave) ? a.filter((k) => k !== chiave) : [...a, chiave]));

  const invia = async () => {
    if (!nome.trim() || !citta.trim()) {
      setErrore("Inserisci almeno il nome e la città della struttura.");
      return;
    }
    setErrore(null);
    setInviando(true);
    try {
      await inviaSegnalazioneStruttura({
        autoreId: session.user.id,
        nomeAutore: session.user.user_metadata?.nome || "Cliente NaturaGo",
        nome,
        citta,
        tipoStruttura,
        indirizzo,
        sitoWeb,
        amenities,
      });
      Alert.alert("Grazie!", "La tua segnalazione verrà controllata dal team NaturaGo prima di comparire sul sito.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setErrore(messaggioErroreComprensibile(e, "Non è stato possibile inviare la segnalazione."));
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
        <Text style={styles.titoloIntestazione}>Nuova segnalazione</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
        <Text style={styles.sottotitolo}>
          Conosci un campeggio o un&apos;area sosta non ancora su NaturaGo? Segnalacela.
        </Text>

        <Text style={styles.etichetta}>Tipo struttura</Text>
        <View style={styles.pills}>
          {Object.entries(TIPO_STRUTTURA_SEGNALABILE_META).map(([chiave, meta]) => (
            <Pressable
              key={chiave}
              style={[styles.pill, tipoStruttura === chiave && styles.pillAttiva]}
              onPress={() => setTipoStruttura(chiave)}
            >
              <Ionicons name={meta.icona} size={13} color={tipoStruttura === chiave ? colori.bianco : colori.testo} />
              <Text style={[styles.pillTesto, tipoStruttura === chiave && styles.pillTestoAttivo]}>{meta.etichetta}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.etichetta}>Servizi per camper (se li conosci)</Text>
        <View style={styles.pills}>
          {Object.entries(SERVIZI_SEGNALAZIONE_META).map(([chiave, meta]) => {
            const attiva = amenities.includes(chiave);
            return (
              <Pressable key={chiave} style={[styles.pill, attiva && styles.pillAttiva]} onPress={() => toggleAmenity(chiave)}>
                <Ionicons name={meta.icona} size={13} color={attiva ? colori.bianco : colori.testo} />
                <Text style={[styles.pillTesto, attiva && styles.pillTestoAttivo]}>{meta.etichetta}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.etichetta}>Nome della struttura</Text>
        <TextInput style={styles.campo} value={nome} onChangeText={setNome} placeholder="Es. Camping Belvedere" />

        <Text style={styles.etichetta}>Città</Text>
        <TextInput style={styles.campo} value={citta} onChangeText={setCitta} placeholder="Es. Riva del Garda" />

        <Text style={styles.etichetta}>Indirizzo (facoltativo)</Text>
        <TextInput style={styles.campo} value={indirizzo} onChangeText={setIndirizzo} placeholder="Via, numero" />

        <Text style={styles.etichetta}>Sito web (facoltativo)</Text>
        <TextInput
          style={styles.campo}
          value={sitoWeb}
          onChangeText={setSitoWeb}
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.nota}>La segnalazione verrà controllata dal team NaturaGo prima di comparire sul sito.</Text>

        {errore && <Text style={styles.errore}>{errore}</Text>}

        <Pressable style={styles.invia} onPress={invia} disabled={inviando}>
          {inviando ? <ActivityIndicator color={colori.bianco} /> : <Text style={styles.inviaTesto}>Invia segnalazione</Text>}
        </Pressable>
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
  etichetta: { fontSize: 11, fontWeight: "700", color: colori.testoSecondario, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 10, marginBottom: 4 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  pillAttiva: { backgroundColor: colori.blu, borderColor: colori.blu },
  pillTesto: { fontSize: 11.5, fontWeight: "600", color: colori.testo },
  pillTestoAttivo: { color: colori.bianco },
  campo: {
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colori.testo,
  },
  nota: { fontSize: 11, color: colori.testoSecondario, marginTop: 12, lineHeight: 16 },
  errore: { fontSize: 12, color: colori.rosso, marginTop: 8 },
  invia: {
    marginTop: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
  },
  inviaTesto: { color: colori.bianco, fontWeight: "800", fontSize: 13.5 },
});
