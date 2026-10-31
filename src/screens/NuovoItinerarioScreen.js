import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import {
  DIFFICOLTA_META,
  DIFFICOLTA_SENTIERO_CHIAVI,
  TIPO_VEICOLO_META,
  MODALITA_SENTIERO_META,
  nuovaTappaVuota,
  creaItinerario,
} from "../lib/itinerari";
import { REGIONI_ITALIANE } from "../lib/regioni";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import ModuloTappaItinerario from "../components/ModuloTappaItinerario";

function PillGroup({ voci, valore, onScegli }) {
  return (
    <View style={styles.pills}>
      {voci.map(([chiave, meta]) => (
        <Pressable key={chiave} style={[styles.pill, valore === chiave && styles.pillAttiva]} onPress={() => onScegli(chiave)}>
          <Text style={[styles.pillTesto, valore === chiave && styles.pillTestoAttivo]}>{meta.etichetta}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function NuovoItinerarioScreen({ route, navigation }) {
  const { categoria } = route.params;
  const { session } = useAuth();
  const ePercorso4x4 = categoria === "percorso_4x4";
  const eSentiero = categoria === "sentiero";
  const coloreAccento = eSentiero ? "#2f6b3f" : colori.blu;

  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [regione, setRegione] = useState("");
  const [difficolta, setDifficolta] = useState("");
  const [tipoVeicolo, setTipoVeicolo] = useState("");
  const [modalita, setModalita] = useState("");
  const [tempoStimato, setTempoStimato] = useState("");
  const [lunghezzaKm, setLunghezzaKm] = useState("");
  const [dislivelloM, setDislivelloM] = useState("");
  const [tappe, setTappe] = useState([nuovaTappaVuota()]);
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(null);

  const aggiornaTappa = (i, nuova) => setTappe((t) => t.map((x, idx) => (idx === i ? nuova : x)));
  const rimuoviTappa = (i) => setTappe((t) => t.filter((_, idx) => idx !== i));
  const spostaTappa = (i, direzione) =>
    setTappe((t) => {
      const j = i + direzione;
      if (j < 0 || j >= t.length) return t;
      const copia = [...t];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  const difficoltaVoci = Object.entries(DIFFICOLTA_META).filter(([chiave]) => !eSentiero || DIFFICOLTA_SENTIERO_CHIAVI.includes(chiave));

  const invia = async () => {
    setErrore(null);
    if (!titolo.trim() || !descrizione.trim()) {
      setErrore("Inserisci almeno titolo e descrizione.");
      return;
    }
    if (!regione || !difficolta) {
      setErrore("Scegli regione e difficoltà.");
      return;
    }
    if (ePercorso4x4 && !tipoVeicolo) {
      setErrore("Scegli il tipo di veicolo.");
      return;
    }
    if (eSentiero && !modalita) {
      setErrore("Scegli se si percorre a piedi o in bici.");
      return;
    }
    const lunghezzaNumero = lunghezzaKm.trim() ? Number(lunghezzaKm.trim().replace(",", ".")) : null;
    const dislivelloNumero = dislivelloM.trim() ? Number(dislivelloM.trim().replace(",", ".")) : null;
    if (eSentiero && lunghezzaNumero !== null && !(lunghezzaNumero > 0 && lunghezzaNumero < 10000)) {
      setErrore("La lunghezza deve essere un numero di chilometri maggiore di zero (es. 12,5).");
      return;
    }
    if (eSentiero && dislivelloNumero !== null && !(Number.isInteger(dislivelloNumero) && dislivelloNumero >= 0 && dislivelloNumero < 10000)) {
      setErrore("Il dislivello deve essere un numero intero di metri (es. 480).");
      return;
    }
    for (const t of tappe) {
      if (t.tipo === "struttura" && !t.campeggioId) {
        setErrore("Ogni tappa \"Struttura esistente\" deve avere una struttura scelta dalla ricerca.");
        return;
      }
      if (t.tipo === "punto_interesse" && !t.nome.trim()) {
        setErrore("Ogni tappa \"Punto di interesse\" deve avere un nome.");
        return;
      }
    }

    setInviando(true);
    try {
      const itinerario = await creaItinerario({
        autoreId: session.user.id,
        nomeAutore: session.user.user_metadata?.nome || "Cliente NaturaGo",
        categoria,
        titolo,
        descrizione,
        difficolta,
        tipoVeicolo,
        tempoStimato,
        regione,
        modalita,
        lunghezzaKm: lunghezzaNumero,
        dislivelloM: dislivelloNumero,
        tappe,
      });
      Alert.alert(
        "Grazie!",
        ePercorso4x4 ? "Il tuo percorso sarà pubblicato dopo l'approvazione del team NaturaGo." : "Il tuo sentiero sarà pubblicato dopo l'approvazione del team NaturaGo.",
        [{ text: "OK", onPress: () => navigation.replace("ItinerarioDettaglio", { itinerarioId: itinerario.id }) }]
      );
    } catch (e) {
      setErrore(
        messaggioErroreComprensibile(e, ePercorso4x4 ? "Non è stato possibile creare il percorso." : "Non è stato possibile creare il sentiero.")
      );
    } finally {
      setInviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.schermo}>
        <SafeAreaView edges={["top"]} style={styles.intestazione}>
          <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colori.testo} />
          </Pressable>
          <Text style={styles.titoloIntestazione}>{ePercorso4x4 ? "Nuovo percorso 4x4" : "Nuovo sentiero"}</Text>
          <View style={{ width: 34 }} />
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
          <Text style={styles.etichetta}>{ePercorso4x4 ? "Titolo del percorso" : "Titolo del sentiero"}</Text>
          <TextInput
            style={styles.campo}
            value={titolo}
            onChangeText={setTitolo}
            placeholder={ePercorso4x4 ? "Es. Il tracciato dei calanchi" : "Es. Anello del Lago di Braies"}
          />

          <Text style={styles.etichetta}>Regione</Text>
          <View style={styles.pills}>
            {REGIONI_ITALIANE.map((r) => (
              <Pressable key={r} style={[styles.pill, regione === r && styles.pillAttiva]} onPress={() => setRegione(r)}>
                <Text style={[styles.pillTesto, regione === r && styles.pillTestoAttivo]}>{r}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.etichetta}>Difficoltà</Text>
          <PillGroup voci={difficoltaVoci} valore={difficolta} onScegli={setDifficolta} />

          {ePercorso4x4 ? (
            <>
              <Text style={styles.etichetta}>Tipo veicolo</Text>
              <PillGroup voci={Object.entries(TIPO_VEICOLO_META)} valore={tipoVeicolo} onScegli={setTipoVeicolo} />
            </>
          ) : (
            <>
              <Text style={styles.etichetta}>Come si percorre</Text>
              <PillGroup voci={Object.entries(MODALITA_SENTIERO_META)} valore={modalita} onScegli={setModalita} />

              <View style={styles.rigaDoppia}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.etichetta}>Lunghezza in km (facoltativa)</Text>
                  <TextInput style={styles.campo} value={lunghezzaKm} onChangeText={setLunghezzaKm} placeholder="Es. 12,5" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.etichetta}>Dislivello in metri (facoltativo)</Text>
                  <TextInput style={styles.campo} value={dislivelloM} onChangeText={setDislivelloM} placeholder="Es. 480" keyboardType="number-pad" />
                </View>
              </View>
            </>
          )}

          <Text style={styles.etichetta}>Tempo stimato (facoltativo)</Text>
          <TextInput
            style={styles.campo}
            value={tempoStimato}
            onChangeText={setTempoStimato}
            placeholder={eSentiero ? "Es. Circa 4 ore a piedi" : "Es. Circa 3-4 ore di guida"}
          />

          <Text style={styles.etichetta}>Descrizione generale</Text>
          <TextInput
            style={[styles.campo, styles.campoMultilinea]}
            value={descrizione}
            onChangeText={setDescrizione}
            placeholder={eSentiero ? "Racconta il percorso: fondo, segnaletica, punti panoramici..." : "Racconta il percorso: fondo, tratti tecnici, punti panoramici..."}
            multiline
          />

          <Text style={[styles.etichetta, { marginTop: 14 }]}>Tappe</Text>
          <View style={{ gap: 10 }}>
            {tappe.map((t, i) => (
              <ModuloTappaItinerario
                key={i}
                tappa={t}
                indice={i}
                totale={tappe.length}
                onCambia={(nuova) => aggiornaTappa(i, nuova)}
                onRimuovi={() => rimuoviTappa(i)}
                onSposta={(dir) => spostaTappa(i, dir)}
              />
            ))}
          </View>
          <Pressable style={styles.aggiungiTappa} onPress={() => setTappe((t) => [...t, nuovaTappaVuota()])}>
            <Ionicons name="add-circle-outline" size={16} color={coloreAccento} />
            <Text style={[styles.aggiungiTappaTesto, { color: coloreAccento }]}>Aggiungi tappa</Text>
          </Pressable>

          <Text style={styles.nota}>
            {ePercorso4x4 ? "Il tuo percorso" : "Il tuo sentiero"} sarà pubblicato dopo l&apos;approvazione del team NaturaGo.
          </Text>

          {errore && <Text style={styles.errore}>{errore}</Text>}

          <Pressable style={[styles.invia, { backgroundColor: coloreAccento }]} onPress={invia} disabled={inviando}>
            {inviando ? <ActivityIndicator color={colori.bianco} /> : <Text style={styles.inviaTesto}>Invia per approvazione</Text>}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  contenuto: { padding: 20, gap: 6, paddingBottom: 50 },
  etichetta: { fontSize: 11, fontWeight: "700", color: colori.testoSecondario, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 12, marginBottom: 5 },
  campo: {
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colori.testo,
  },
  campoMultilinea: { minHeight: 80, textAlignVertical: "top" },
  rigaDoppia: { flexDirection: "row", gap: 12 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  pill: {
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  pillAttiva: { backgroundColor: colori.blu, borderColor: colori.blu },
  pillTesto: { fontSize: 11.5, fontWeight: "600", color: colori.testo },
  pillTestoAttivo: { color: colori.bianco },
  aggiungiTappa: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start" },
  aggiungiTappaTesto: { fontSize: 12.5, fontWeight: "700" },
  nota: { fontSize: 11, color: colori.testoSecondario, marginTop: 16, lineHeight: 16 },
  errore: { fontSize: 12, color: colori.rosso, marginTop: 8 },
  invia: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inviaTesto: { color: colori.bianco, fontWeight: "800", fontSize: 14 },
});
