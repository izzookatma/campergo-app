import { useState } from "react";
import { View, TextInput, Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { creaPercorso } from "../lib/pianificatore";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";

// "Creami un percorso": stessa idea della Ricerca IA (RicercaIA.js) e di
// "Pianifica il tuo viaggio" (PianificaViaggioScreen.js) - stesso stile,
// bordo e icona rossi - ma qui il risultato non è un piano giorno per
// giorno: è solo il percorso stradale vero (src/lib/percorsoStradale.js,
// via creaPercorso in pianificatore.js) da disegnare sopra la mappa già
// filtrata (vedi MappaScreen.js).
export default function CreaPercorso({ loggato, attivo, onPercorso, onReset, onRichiedeAccesso }) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState("");
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState("");

  const crea = async () => {
    const frase = testo.trim();
    if (!frase || caricando) return;
    if (!loggato) {
      onRichiedeAccesso?.();
      return;
    }
    setCaricando(true);
    setErrore("");
    try {
      const risultato = await creaPercorso(frase);
      onPercorso(risultato);
      setAperto(false);
    } catch (e) {
      setErrore(messaggioErroreComprensibile(e, "Non sono riuscito a creare il percorso."));
    } finally {
      setCaricando(false);
    }
  };

  const chiudi = () => {
    setAperto(false);
    setTesto("");
    setErrore("");
    onReset();
  };

  if (!aperto) {
    return (
      <View style={styles.rigaChiuso}>
        <Pressable style={styles.pillChiuso} onPress={() => setAperto(true)}>
          <Ionicons name="sparkles-outline" size={14} color={colori.rosso} />
          <Text style={styles.pillChiusoTesto}>{attivo ? "Modifica il percorso" : "Creami un percorso"}</Text>
        </Pressable>
        {attivo && (
          <Pressable style={styles.pillTogli} onPress={chiudi}>
            <Ionicons name="close" size={14} color={colori.testoSecondario} />
            <Text style={styles.pillTogliTesto}>Togli il percorso</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.contenitore}>
      <View style={styles.pill}>
        <Ionicons name="sparkles-outline" size={16} color={colori.rosso} />
        <TextInput
          style={styles.input}
          placeholder="Es. Da Milano al Lago di Garda in 3 giorni"
          placeholderTextColor={colori.testoSecondario}
          value={testo}
          onChangeText={setTesto}
          onSubmitEditing={crea}
          returnKeyType="done"
          autoFocus
        />
        <Pressable onPress={() => setAperto(false)} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colori.testoSecondario} />
        </Pressable>
        <Pressable
          style={[styles.bottone, (!testo.trim() || caricando) && styles.bottoneDisattivo]}
          onPress={crea}
          disabled={caricando || !testo.trim()}
        >
          {caricando ? <ActivityIndicator color={colori.bianco} size="small" /> : <Text style={styles.bottoneTesto}>Crea</Text>}
        </Pressable>
      </View>
      {errore ? <Text style={styles.errore}>{errore}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rigaChiuso: { flexDirection: "row", gap: 8, marginTop: 10 },
  pillChiuso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colori.bianco,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colori.rosso,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillChiusoTesto: { color: colori.rosso, fontSize: 12, fontWeight: "700" },
  pillTogli: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colori.bianco,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colori.bordo,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pillTogliTesto: { color: colori.testoSecondario, fontSize: 12, fontWeight: "600" },
  contenitore: { marginTop: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.bianco,
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colori.rosso,
  },
  input: { flex: 1, fontSize: 12.5, color: colori.testo },
  bottone: {
    backgroundColor: colori.rosso,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  bottoneDisattivo: { opacity: 0.5 },
  bottoneTesto: { color: colori.bianco, fontSize: 11, fontWeight: "700" },
  errore: { marginTop: 6, fontSize: 11, color: colori.rosso, textAlign: "center" },
});
