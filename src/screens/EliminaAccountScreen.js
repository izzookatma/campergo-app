import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";

const TESTO_RICHIESTO = "CANCELLA";

// Stessa logica del sito (ZonaEliminazioneAccount in AccountArea.jsx):
// si riverifica la password (serve per essere sicuri che non sia
// qualcun altro col telefono sbloccato) e si digita "CANCELLA" per
// confermare, poi la stessa RPC `elimina_mio_account`. Obbligo di Apple
// per pubblicare su App Store: un'app che permette di registrarsi deve
// permettere di cancellarsi anche dall'app, non solo dal sito.
export default function EliminaAccountScreen({ navigation }) {
  const { session, accedi, eliminaAccount, esci } = useAuth();
  const [password, setPassword] = useState("");
  const [testoConferma, setTestoConferma] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [errore, setErrore] = useState(null);

  const elimina = async () => {
    setErrore(null);
    if (testoConferma !== TESTO_RICHIESTO) {
      setErrore(`Digita esattamente "${TESTO_RICHIESTO}" per confermare.`);
      return;
    }
    setEliminando(true);

    const { error: erroreLogin } = await accedi(session.user.email, password);
    if (erroreLogin) {
      setEliminando(false);
      setErrore("Password errata.");
      return;
    }

    const { error } = await eliminaAccount(testoConferma);
    if (error) {
      setEliminando(false);
      setErrore(messaggioErroreComprensibile(error, "Non è stato possibile eliminare l'account."));
      return;
    }

    await esci();
    // Dopo esci(), la sessione diventa null: l'app torna da sola alla
    // schermata di accesso (App.js), non serve navigare esplicitamente.
  };

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colori.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>Elimina account</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
        <View style={styles.avviso}>
          <Ionicons name="warning-outline" size={18} color={colori.rosso} />
          <Text style={styles.avvisoTesto}>Questa azione è irreversibile.</Text>
        </View>

        <Text style={styles.descrizione}>
          Verranno cancellati: account di accesso, dati del profilo, itinerari, segnalazioni e messaggi. Se gestisci
          una struttura, sparirà da ricerca e mappa. Le recensioni scritte restano visibili ma con autore anonimo. Le
          prenotazioni concluse vengono mantenute in forma anonima per obblighi fiscali.{"\n\n"}
          Se hai prenotazioni future attive (come cliente o sulle tue strutture come host), cancellale prima di
          procedere: l&apos;eliminazione verrebbe altrimenti rifiutata.
        </Text>

        <Text style={styles.etichetta}>Conferma la tua password attuale</Text>
        <TextInput style={styles.campo} value={password} onChangeText={setPassword} secureTextEntry />

        <Text style={styles.etichetta}>Digita {TESTO_RICHIESTO} per confermare</Text>
        <TextInput style={styles.campo} value={testoConferma} onChangeText={setTestoConferma} autoCapitalize="characters" />

        {errore && <Text style={styles.errore}>{errore}</Text>}

        <Pressable
          style={[styles.elimina, (eliminando || testoConferma !== TESTO_RICHIESTO || !password) && styles.eliminaDisabilitato]}
          onPress={elimina}
          disabled={eliminando || testoConferma !== TESTO_RICHIESTO || !password}
        >
          {eliminando ? <ActivityIndicator color={colori.bianco} /> : <Text style={styles.eliminaTesto}>Elimina definitivamente il mio account</Text>}
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
  avviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  avvisoTesto: { fontSize: 12.5, fontWeight: "700", color: "#991b1b" },
  descrizione: { fontSize: 12, lineHeight: 18, color: "#4b5563", marginBottom: 10 },
  etichetta: { fontSize: 11, fontWeight: "700", color: colori.testoSecondario, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 10, marginBottom: 5 },
  campo: {
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colori.testo,
  },
  errore: { fontSize: 12, color: colori.rosso, marginTop: 10 },
  elimina: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    backgroundColor: colori.rosso,
    alignItems: "center",
    justifyContent: "center",
  },
  eliminaDisabilitato: { opacity: 0.4 },
  eliminaTesto: { color: colori.bianco, fontWeight: "800", fontSize: 13.5 },
});
