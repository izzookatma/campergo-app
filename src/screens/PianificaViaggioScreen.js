import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { generaItinerarioIA } from "../lib/pianificatore";
import { salvaPianoViaggio } from "../lib/pianiSalvati";
import { ETICHETTE_TIPO, ETICHETTA_RIFUGIO } from "../lib/strutture";
import { CATEGORIA_CULTURALE_META } from "../lib/cultura";
import { CATEGORIA_ITINERARIO_META } from "../lib/itinerari";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

const ESEMPI = [
  "Ho 3 giorni nel weekend, voglio visitare Mantova e la sua periferia, cosa mi consigli?",
  "Un weekend sul Lago di Garda, mi piace la natura e la buona cucina",
  "Una settimana in Toscana, musei e borghi, viaggio con la famiglia",
];

// Stessa forma di normalizzaCampeggio/normalizzaRifugio in lib/strutture.js:
// la funzione Edge manda solo i campi grezzi (id/nome/località/tipo/foto/
// lat/lng + "origine" = la tabella vera), qui si costruisce l'oggetto che
// SchedaScreen si aspetta (id con prefisso, etichetta del tipo leggibile).
function struttureNavigazione(s) {
  if (!s) return null;
  const rifugio = s.origine === "rifugi";
  return {
    id: `${rifugio ? "rifugio" : "campeggio"}-${s.id}`,
    idOriginale: s.id,
    origine: s.origine,
    tipo: rifugio ? ETICHETTA_RIFUGIO[s.tipoStruttura] || "Rifugio" : ETICHETTE_TIPO[s.tipoStruttura] || "Struttura",
    nome: s.nome,
    localita: s.localita,
    prezzo: null,
    fotoUrl: s.fotoUrl,
    lat: s.lat,
    lng: s.lng,
    rating: null,
    recensioni: null,
    telefono: null,
    descrizione: "",
  };
}

function CardStruttura({ struttura, navigation }) {
  if (!struttura) return null;
  return (
    <Pressable style={styles.cardBase} onPress={() => navigation.navigate("Scheda", { struttura: struttureNavigazione(struttura) })}>
      <Ionicons name="bed-outline" size={16} color={colori.blu} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardBaseEtichetta}>Dove pernottare</Text>
        <Text style={styles.cardBaseTitolo}>{struttura.nome}</Text>
        {struttura.localita ? <Text style={styles.cardBaseSottotitolo}>{struttura.localita}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colori.testoSecondario} />
    </Pressable>
  );
}

function CardVoce({ voce, navigation }) {
  const meta =
    voce.tipo === "cultura" ? CATEGORIA_CULTURALE_META[voce.categoria] : CATEGORIA_ITINERARIO_META[voce.categoria];
  const titolo = voce.titolo;
  const sottotitolo = voce.tipo === "cultura" ? voce.citta : voce.regione;
  const onPress = () =>
    voce.tipo === "cultura"
      ? navigation.navigate("SchedaCulturale", { id: voce.id })
      : navigation.navigate("ItinerarioDettaglio", { itinerarioId: voce.id });
  return (
    <Pressable style={styles.voce} onPress={onPress}>
      <View style={[styles.voceIcona, { backgroundColor: meta?.colore || colori.testoSecondario }]}>
        <Ionicons name={meta?.icona || "location-outline"} size={14} color={colori.bianco} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.voceTitolo} numberOfLines={1}>
          {titolo}
        </Text>
        {sottotitolo ? <Text style={styles.voceSottotitolo}>{sottotitolo}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={colori.testoSecondario} />
    </Pressable>
  );
}

function CardGiorno({ giorno, navigation }) {
  return (
    <View style={styles.cardGiorno}>
      <Text style={styles.numeroGiorno}>
        Giorno {giorno.numero}
        {giorno.tappa ? ` · ${giorno.tappa}` : ""}
      </Text>
      <Text style={styles.titoloGiorno}>{giorno.titolo}</Text>
      {giorno.nota ? <Text style={styles.notaGiorno}>{giorno.nota}</Text> : null}
      <CardStruttura struttura={giorno.struttura} navigation={navigation} />
      {giorno.voci.map((v) => (
        <CardVoce key={`${v.tipo}-${v.id}`} voce={v} navigation={navigation} />
      ))}
    </View>
  );
}

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
  cardGiorno: {
    backgroundColor: colori.bianco,
    borderRadius: raggioCard,
    padding: 16,
    gap: 8,
    ...ombraCard,
  },
  numeroGiorno: { fontSize: 10.5, fontWeight: "700", color: colori.blu, textTransform: "uppercase" },
  titoloGiorno: { fontSize: 15, fontWeight: "800", color: colori.testo },
  notaGiorno: { fontSize: 12, color: colori.testoSecondario, lineHeight: 17, marginBottom: 4 },
  cardBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colori.bluChiaro,
    borderRadius: 12,
    padding: 10,
  },
  cardBaseEtichetta: { fontSize: 9.5, fontWeight: "700", color: colori.blu, textTransform: "uppercase" },
  cardBaseTitolo: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  cardBaseSottotitolo: { fontSize: 11, color: colori.testoSecondario },
  voce: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  voceIcona: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  voceTitolo: { flex: 1, fontSize: 12.5, fontWeight: "600", color: colori.testo },
  voceSottotitolo: { fontSize: 10.5, color: colori.testoSecondario },
});
