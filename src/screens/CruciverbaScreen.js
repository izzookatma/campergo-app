import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { temaGiochi } from "../theme/giochiTema";
import { usePreferenze } from "../context/PreferenzeContext";
import { BANCA_CRUCIVERBA } from "../lib/cruciverbaBanca";
import { generaSchema, costruisciGrigliaCelle } from "../lib/cruciverbaGeneratore";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

const CHIAVE_IN_CORSO = "naturago_cruciverba_in_corso";
const CHIAVE_RISOLTI = "naturago_cruciverba_risolti_totale";
const LARGHEZZA_DISPONIBILE = 356;
const DIVARIO_CELLE = 4;

const LIVELLI = [
  { chiave: "facile", etichetta: "Facile", colore: temaGiochi.verde },
  { chiave: "medio", etichetta: "Medio", colore: temaGiochi.giallo },
  { chiave: "difficile", etichetta: "Difficile", colore: temaGiochi.rosa },
];

export default function CruciverbaScreen() {
  const { musicaGiochiAttiva, setMusicaGiochiAttiva } = usePreferenze();
  const [fase, setFase] = useState("caricamento"); // caricamento | scelta | gioco
  const [livelloScelto, setLivelloScelto] = useState("facile");
  const [schema, setSchema] = useState(null); // { livello, dimensione, parole }
  const [risposte, setRisposte] = useState({});
  const [rivelato, setRivelato] = useState(false);
  const [contatoQuestoSchema, setContatoQuestoSchema] = useState(false);
  const [risoltiTotale, setRisoltiTotale] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_RISOLTI).then((v) => setRisoltiTotale(parseInt(v, 10) || 0));
    AsyncStorage.getItem(CHIAVE_IN_CORSO).then((salvato) => {
      if (salvato) {
        const dati = JSON.parse(salvato);
        setSchema({ livello: dati.livello, dimensione: dati.dimensione, parole: dati.parole });
        setRisposte(dati.risposte || {});
        setFase("gioco");
      } else {
        setFase("scelta");
      }
    });
  }, []);

  const celle = schema ? costruisciGrigliaCelle(schema.dimensione, schema.parole) : null;

  const tutteCorrette = (() => {
    if (!celle) return false;
    for (let r = 0; r < schema.dimensione; r++) {
      for (let c = 0; c < schema.dimensione; c++) {
        const cella = celle[r][c];
        if (!cella) continue;
        if ((risposte[`${r}-${c}`] || "") !== cella.lettera) return false;
      }
    }
    return true;
  })();

  // Salva i progressi (e lo schema) a ogni lettera scritta, così uscendo e
  // rientrando nell'app si riparte da dove si era rimasti.
  useEffect(() => {
    if (fase !== "gioco" || !schema) return;
    AsyncStorage.setItem(CHIAVE_IN_CORSO, JSON.stringify({ ...schema, risposte }));
  }, [fase, schema, risposte]);

  useEffect(() => {
    if (!tutteCorrette || contatoQuestoSchema || rivelato) return;
    AsyncStorage.getItem(CHIAVE_RISOLTI).then((v) => {
      const nuovo = (parseInt(v, 10) || 0) + 1;
      AsyncStorage.setItem(CHIAVE_RISOLTI, String(nuovo));
      setRisoltiTotale(nuovo);
      setContatoQuestoSchema(true);
    });
  }, [tutteCorrette, contatoQuestoSchema, rivelato]);

  const nuovoSchema = (livello) => {
    const generato = generaSchema(BANCA_CRUCIVERBA, livello);
    if (!generato) {
      Alert.alert("Non ci sono riuscita", "Riprova: a volte capita di non trovare abbastanza incroci al primo colpo.");
      return;
    }
    setSchema({ livello, dimensione: generato.dimensione, parole: generato.parole });
    setRisposte({});
    setRivelato(false);
    setContatoQuestoSchema(false);
    setFase("gioco");
  };

  const abbandona = () => {
    AsyncStorage.removeItem(CHIAVE_IN_CORSO);
    setSchema(null);
    setRisposte({});
    setFase("scelta");
  };

  const mostraSoluzione = () => {
    const nuove = {};
    for (let r = 0; r < schema.dimensione; r++) {
      for (let c = 0; c < schema.dimensione; c++) {
        if (celle[r][c]) nuove[`${r}-${c}`] = celle[r][c].lettera;
      }
    }
    setRivelato(true);
    setRisposte(nuove);
  };

  const scriviLettera = (riga, colonna, testo) => {
    const lettera = testo.slice(-1).toUpperCase();
    setRisposte((precedenti) => ({ ...precedenti, [`${riga}-${colonna}`]: lettera }));
  };

  const latoCella = schema
    ? Math.max(24, Math.floor((LARGHEZZA_DISPONIBILE - (schema.dimensione - 1) * DIVARIO_CELLE) / schema.dimensione))
    : 0;

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo style={{ marginBottom: 2 }} />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>Cruciverba</Text>
          <Pressable style={styles.bottoneMusica} onPress={() => setMusicaGiochiAttiva(!musicaGiochiAttiva)} hitSlop={8}>
            <Ionicons
              name={musicaGiochiAttiva ? "musical-notes" : "musical-notes-outline"}
              size={20}
              color={musicaGiochiAttiva ? temaGiochi.verde : colori.testoSecondario}
            />
          </Pressable>
        </View>
      </View>

      {fase === "caricamento" && <View style={styles.centro} />}

      {fase === "scelta" && (
        <View style={styles.scelta}>
          <Text style={styles.sceltaDomanda}>Che livello vuoi?</Text>
          <View style={styles.selettoreLivello}>
            {LIVELLI.map((l) => (
              <Pressable
                key={l.chiave}
                style={[styles.pillLivello, livelloScelto === l.chiave && { backgroundColor: l.colore, borderColor: l.colore }]}
                onPress={() => setLivelloScelto(l.chiave)}
              >
                <Text style={[styles.pillLivelloTesto, livelloScelto === l.chiave && styles.pillLivelloTestoAttivo]}>
                  {l.etichetta}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.bottoneNuovo} onPress={() => nuovoSchema(livelloScelto)}>
            <Ionicons name="shuffle" size={18} color={colori.bianco} />
            <Text style={styles.bottoneNuovoTesto}>Genera uno schema nuovo</Text>
          </Pressable>
          {risoltiTotale > 0 && <Text style={styles.contatoreRisolti}>Schemi completati finora: {risoltiTotale}</Text>}
        </View>
      )}

      {fase === "gioco" && schema && (
        <ScrollView contentContainerStyle={styles.giocoContenuto} showsVerticalScrollIndicator={false}>
          <View style={styles.rigaAzioni}>
            <Pressable style={styles.bottoneIndietro} onPress={abbandona}>
              <Ionicons name="chevron-back" size={16} color={colori.blu} />
              <Text style={styles.bottoneIndietroTesto}>Abbandona</Text>
            </Pressable>
            <Text style={styles.livelloEtichetta}>{LIVELLI.find((l) => l.chiave === schema.livello)?.etichetta}</Text>
            {!tutteCorrette && (
              <Pressable onPress={mostraSoluzione}>
                <Text style={styles.bottoneSoluzioneTesto}>Soluzione</Text>
              </Pressable>
            )}
          </View>

          {tutteCorrette && (
            <View style={styles.bannerCompletato}>
              <Text style={styles.bannerCompletatoTesto}>
                {rivelato ? "Ecco la soluzione" : "Hai completato lo schema! 🎉"}
              </Text>
            </View>
          )}

          <View style={styles.griglia}>
            {celle.map((riga, r) => (
              <View key={r} style={styles.rigaGriglia}>
                {riga.map((cella, c) => {
                  if (!cella) return <View key={c} style={{ width: latoCella, height: latoCella }} />;
                  const valore = risposte[`${r}-${c}`] || "";
                  const corretta = valore === cella.lettera;
                  return (
                    <View key={c} style={{ width: latoCella, height: latoCella }}>
                      {cella.numero != null && <Text style={styles.cellaNumero}>{cella.numero}</Text>}
                      <TextInput
                        style={[
                          styles.cella,
                          { fontSize: Math.max(13, Math.floor(latoCella * 0.42)) },
                          corretta && styles.cellaCorretta,
                        ]}
                        value={valore}
                        onChangeText={(testo) => scriviLettera(r, c, testo)}
                        maxLength={1}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!corretta}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.indizi}>
            <Text style={styles.indiziTitolo}>Orizzontali</Text>
            {schema.parole
              .filter((p) => p.direzione === "orizz")
              .map((p) => (
                <Text key={`o${p.numero}`} style={styles.indizioTesto}>
                  {p.numero}. {p.indizio}
                </Text>
              ))}
            <Text style={[styles.indiziTitolo, { marginTop: 10 }]}>Verticali</Text>
            {schema.parole
              .filter((p) => p.direzione === "vert")
              .map((p) => (
                <Text key={`v${p.numero}`} style={styles.indizioTesto}>
                  {p.numero}. {p.indizio}
                </Text>
              ))}
          </View>

          {tutteCorrette && (
            <Pressable style={styles.bottoneProssimo} onPress={() => nuovoSchema(schema.livello)}>
              <Ionicons name="arrow-forward" size={16} color={colori.bianco} />
              <Text style={styles.bottoneProssimoTesto}>Schema successivo</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: { paddingHorizontal: 16, paddingTop: 6 },
  rigaTitolo: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6 },
  titolo: { fontSize: 19, fontWeight: "800", color: colori.testo },
  bottoneMusica: { position: "absolute", right: 0 },
  centro: { flex: 1 },

  scelta: { flex: 1, paddingHorizontal: 24, justifyContent: "center", gap: 14 },
  sceltaDomanda: { fontSize: 15, fontWeight: "700", color: colori.testo, textAlign: "center" },
  selettoreLivello: { flexDirection: "row", justifyContent: "center", gap: 8 },
  pillLivello: {
    backgroundColor: colori.bianco,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  pillLivelloTesto: { fontSize: 12.5, fontWeight: "700", color: colori.testoSecondario },
  pillLivelloTestoAttivo: { color: colori.bianco },
  bottoneNuovo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: temaGiochi.verde,
    borderRadius: raggioCard,
    paddingVertical: 15,
    marginTop: 6,
    ...ombraCard,
  },
  bottoneNuovoTesto: { color: colori.bianco, fontWeight: "800", fontSize: 14.5 },
  contatoreRisolti: { textAlign: "center", color: colori.testoSecondario, fontSize: 12 },

  giocoContenuto: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24, alignItems: "center", gap: 12 },
  rigaAzioni: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bottoneIndietro: { flexDirection: "row", alignItems: "center", gap: 4 },
  bottoneIndietroTesto: { color: colori.blu, fontWeight: "700", fontSize: 13 },
  livelloEtichetta: { fontSize: 11, fontWeight: "800", color: colori.testoSecondario, textTransform: "uppercase" },
  bottoneSoluzioneTesto: { color: temaGiochi.rosa, fontWeight: "700", fontSize: 13 },

  bannerCompletato: { backgroundColor: temaGiochi.verdeChiaro, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 },
  bannerCompletatoTesto: { color: temaGiochi.verde, fontWeight: "800", fontSize: 13.5 },

  griglia: { gap: DIVARIO_CELLE },
  rigaGriglia: { flexDirection: "row", gap: DIVARIO_CELLE },
  cellaNumero: { position: "absolute", top: 1, left: 3, fontSize: 8, fontWeight: "800", color: colori.testoSecondario, zIndex: 1 },
  cella: {
    width: "100%",
    height: "100%",
    borderRadius: 7,
    backgroundColor: colori.bianco,
    borderWidth: 1.5,
    borderColor: colori.bordo,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
    color: colori.testo,
  },
  cellaCorretta: { backgroundColor: temaGiochi.verdeChiaro, borderColor: temaGiochi.verde, color: temaGiochi.verde },

  indizi: { width: "100%", backgroundColor: colori.bianco, borderRadius: raggioCard, padding: 16, gap: 3, ...ombraCard },
  indiziTitolo: { fontSize: 12, fontWeight: "800", color: colori.testo, textTransform: "uppercase" },
  indizioTesto: { fontSize: 13, color: colori.testo, lineHeight: 19 },

  bottoneProssimo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: temaGiochi.verde,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bottoneProssimoTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13 },
});
