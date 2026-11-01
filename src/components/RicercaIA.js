import { useState } from "react";
import { View, TextInput, Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { interpretaRicercaIA, mappaFiltriIA } from "../lib/ricercaIA";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";

// Campo "descrivi cosa cerchi" sotto la barra di ricerca normale, stessa
// prova già pubblicata sul sito — qui senza microfono: Expo Go non include
// moduli nativi di riconoscimento vocale, servirebbe una build di sviluppo
// dedicata (vedi AGENTS.md, "Expo Go only includes its bundled native
// modules"). Solo testo, per ora.
// Riservata a chi ha fatto login, come sul sito: va renderizzata solo se
// c'è una sessione (vedi EsploraHubScreen/EsploraScreen). supabase-js manda
// già da solo l'access_token dell'utente al posto della anon key nelle
// chiamate a supabase.functions.invoke, non serve passarlo a mano qui - la
// funzione Edge lo verifica comunque di nuovo lato server.
export default function RicercaIA({ onRisultato }) {
  const [testo, setTesto] = useState("");
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState("");

  const cerca = async () => {
    const frase = testo.trim();
    if (!frase || caricando) return;
    setCaricando(true);
    setErrore("");
    try {
      const filtri = await interpretaRicercaIA(frase);
      onRisultato(mappaFiltriIA(filtri));
    } catch (e) {
      setErrore(messaggioErroreComprensibile(e, "Non sono riuscito a interpretare la ricerca."));
    } finally {
      setCaricando(false);
    }
  };

  return (
    <View style={styles.contenitore}>
      <View style={styles.pill}>
        <Ionicons name="sparkles-outline" size={16} color={colori.blu} />
        <TextInput
          style={styles.input}
          placeholder="Oppure descrivi cosa cerchi…"
          placeholderTextColor={colori.testoSecondario}
          value={testo}
          onChangeText={setTesto}
          onSubmitEditing={cerca}
          returnKeyType="search"
        />
        <Pressable
          style={[styles.bottone, (!testo.trim() || caricando) && styles.bottoneDisattivo]}
          onPress={cerca}
          disabled={caricando || !testo.trim()}
        >
          {caricando ? (
            <ActivityIndicator color={colori.bianco} size="small" />
          ) : (
            <Text style={styles.bottoneTesto}>Cerca con l&apos;IA</Text>
          )}
        </Pressable>
      </View>
      {errore ? <Text style={styles.errore}>{errore}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: { marginTop: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.bianco,
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  input: { flex: 1, fontSize: 12.5, color: colori.testo },
  bottone: {
    backgroundColor: colori.blu,
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
