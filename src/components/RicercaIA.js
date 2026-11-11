import { useState, useRef } from "react";
import { View, TextInput, Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { interpretaRicercaIA, mappaFiltriIA } from "../lib/ricercaIA";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { dettaturaDisponibile, avviaDettatura } from "../lib/voce";

// Campo "descrivi cosa cerchi" sotto la barra di ricerca normale, stessa
// prova già pubblicata sul sito — ora con microfono (build di sviluppo,
// vedi ../lib/voce.js): prima ne era privo perché Expo Go non include
// moduli nativi di riconoscimento vocale (vedi AGENTS.md).
// Visibile a tutti, come sul sito dal 1/11 (prima era nascosta a chi non
// aveva fatto login): il gate scatta solo al momento di cercare, tramite
// `onRichiedeAccesso` passato dal chiamante (EsploraHubScreen/EsploraScreen),
// non nascondendo più il riquadro. supabase-js manda già da solo
// l'access_token dell'utente al posto della anon key nelle chiamate a
// supabase.functions.invoke quando c'è una sessione - la funzione Edge
// verifica comunque di nuovo il login lato server.
export default function RicercaIA({ onRisultato, loggato, onRichiedeAccesso }) {
  const [testo, setTesto] = useState("");
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState("");
  const [ascoltando, setAscoltando] = useState(false);
  const dettaturaRef = useRef(null);
  const microfonoDisponibile = dettaturaDisponibile();

  const toggleDettatura = async () => {
    if (ascoltando) {
      dettaturaRef.current?.ferma();
      setAscoltando(false);
      return;
    }
    setErrore("");
    setAscoltando(true);
    const controllo = await avviaDettatura({
      lingua: "it-IT",
      onRisultato: (trascrizione) => setTesto(trascrizione),
      onErrore: () => {
        setErrore("Non sono riuscito ad ascoltare: riprova, oppure scrivi la ricerca.");
        setAscoltando(false);
      },
      onFine: () => setAscoltando(false),
    });
    dettaturaRef.current = controllo;
    if (!controllo) setAscoltando(false);
  };

  const cerca = async () => {
    const frase = testo.trim();
    if (!frase || caricando) return;
    if (!loggato) {
      onRichiedeAccesso?.();
      return;
    }
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
      <View style={styles.badge}>
        <Text style={styles.badgeNovita}>NOVITÀ</Text>
        <Text style={styles.badgeGratis}>gratis se ti iscrivi</Text>
      </View>
      <View style={styles.pill}>
        <Ionicons name="sparkles-outline" size={16} color={colori.rosso} />
        <TextInput
          style={styles.input}
          placeholder="Oppure descrivi cosa cerchi…"
          placeholderTextColor={colori.testoSecondario}
          value={testo}
          onChangeText={setTesto}
          onSubmitEditing={cerca}
          returnKeyType="search"
        />
        {microfonoDisponibile && (
          <Pressable
            style={ascoltando && styles.microfonoAttivo}
            onPress={toggleDettatura}
            hitSlop={8}
          >
            <Ionicons name={ascoltando ? "mic" : "mic-outline"} size={18} color={ascoltando ? colori.rosso : colori.testoSecondario} />
          </Pressable>
        )}
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
  contenitore: { marginTop: 18 },
  badge: {
    position: "absolute",
    top: -10,
    left: 18,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colori.rosso,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeNovita: { color: colori.bianco, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  badgeGratis: { color: colori.bianco, fontSize: 9, opacity: 0.9 },
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
  microfonoAttivo: { backgroundColor: "#fef2f2", borderRadius: 999, padding: 2 },
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
