import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { temaGiochi } from "../theme/giochiTema";
import { usePreferenze } from "../context/PreferenzeContext";
import { BANCA_CRUCIVERBA } from "../lib/cruciverbaBanca";
import { DIMENSIONE_PERCORSO, generaTabellone, nuovaDomanda, probabilitaComputer, tipoCella } from "../lib/giocoOca";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import Dado from "../components/Dado";

const CHIAVE_IN_CORSO = "naturago_oca_in_corso";
const CHIAVE_VINTE = "naturago_oca_vinte_totale";

const LIVELLI = {
  facile: { etichetta: "Facile", colore: temaGiochi.verde },
  medio: { etichetta: "Medio", colore: temaGiochi.giallo },
  difficile: { etichetta: "Difficile", colore: temaGiochi.rosa },
};

const TABELLONE = generaTabellone();

function nomeGiocatore(modalita, turno) {
  if (turno === 0) return "Tu";
  return modalita === "computer" ? "Computer" : "Giocatore 2";
}

function statoIniziale(modalita, livello) {
  return {
    modalita,
    livello,
    posizioni: [0, 0],
    turno: 0,
    domanda: null,
    paroleUsate: [],
    vincitore: null,
  };
}

export default function OcaScreen() {
  const { musicaGiochiAttiva, setMusicaGiochiAttiva } = usePreferenze();
  const [fase, setFase] = useState("caricamento"); // caricamento | scelta | gioco
  const [modalitaScelta, setModalitaScelta] = useState("computer");
  const [livelloScelto, setLivelloScelto] = useState("facile");
  const [partita, setPartita] = useState(null);
  const [dadoValore, setDadoValore] = useState(1);
  const [rotolando, setRotolando] = useState(false);
  const [vinteTotale, setVinteTotale] = useState(0);
  const [contatoQuestaPartita, setContatoQuestaPartita] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_VINTE).then((v) => setVinteTotale(parseInt(v, 10) || 0));
    AsyncStorage.getItem(CHIAVE_IN_CORSO).then((salvato) => {
      if (salvato) {
        setPartita(JSON.parse(salvato));
        setFase("gioco");
      } else {
        setFase("scelta");
      }
    });
  }, []);

  useEffect(() => {
    if (fase !== "gioco" || !partita) return;
    AsyncStorage.setItem(CHIAVE_IN_CORSO, JSON.stringify(partita));
  }, [fase, partita]);

  useEffect(() => {
    if (!partita || partita.vincitore !== 0 || contatoQuestaPartita) return;
    AsyncStorage.getItem(CHIAVE_VINTE).then((v) => {
      const nuovo = (parseInt(v, 10) || 0) + 1;
      AsyncStorage.setItem(CHIAVE_VINTE, String(nuovo));
      setVinteTotale(nuovo);
      setContatoQuestaPartita(true);
    });
  }, [partita, contatoQuestaPartita]);

  const nuovaPartita = useCallback((modalita, livello) => {
    setPartita(statoIniziale(modalita, livello));
    setDadoValore(1);
    setContatoQuestaPartita(false);
    setFase("gioco");
  }, []);

  const abbandona = () => {
    AsyncStorage.removeItem(CHIAVE_IN_CORSO);
    setPartita(null);
    setFase("scelta");
  };

  // Muove il giocatore di turno, poi decide se serve una domanda o si passa
  // subito al turno successivo (casella di riposo o traguardo raggiunto).
  const muoviGiocatore = useCallback((passi) => {
    setPartita((precedente) => {
      if (!precedente || precedente.vincitore !== null) return precedente;
      const turno = precedente.turno;
      const nuovaPosizione = Math.min(DIMENSIONE_PERCORSO, precedente.posizioni[turno] + passi);
      const posizioni = [...precedente.posizioni];
      posizioni[turno] = nuovaPosizione;

      if (nuovaPosizione >= DIMENSIONE_PERCORSO) {
        return { ...precedente, posizioni, vincitore: turno, domanda: null };
      }

      const tipo = tipoCella(nuovaPosizione);
      if (tipo === "domanda") {
        const domanda = nuovaDomanda(BANCA_CRUCIVERBA, precedente.paroleUsate);
        return {
          ...precedente,
          posizioni,
          domanda,
          paroleUsate: [...precedente.paroleUsate, domanda.risposta],
        };
      }
      return { ...precedente, posizioni, turno: turno === 0 ? 1 : 0, domanda: null };
    });
  }, []);

  const lanciaDado = useCallback(() => {
    if (rotolando || !partita || partita.vincitore !== null || partita.domanda) return;
    setRotolando(true);
    let giri = 0;
    const intervallo = setInterval(() => {
      setDadoValore(1 + Math.floor(Math.random() * 6));
      giri += 1;
      if (giri >= 6) {
        clearInterval(intervallo);
        const finale = 1 + Math.floor(Math.random() * 6);
        setDadoValore(finale);
        setRotolando(false);
        muoviGiocatore(finale);
      }
    }, 90);
  }, [rotolando, partita, muoviGiocatore]);

  // Risponde alla domanda per il giocatore di turno: se sbagliata, il
  // giocatore torna indietro di 2 caselle (mai sotto lo zero).
  const rispondi = useCallback(
    (opzione) => {
      setPartita((precedente) => {
        if (!precedente || !precedente.domanda) return precedente;
        const turno = precedente.turno;
        const corretta = opzione === precedente.domanda.risposta;
        const posizioni = [...precedente.posizioni];
        if (!corretta) posizioni[turno] = Math.max(0, posizioni[turno] - 2);
        return { ...precedente, posizioni, domanda: null, ultimaRisposta: { corretta }, turno: turno === 0 ? 1 : 0 };
      });
    },
    []
  );

  // Turno del computer: lancia da solo il dado dopo una breve pausa, e
  // risponde alle domande con una probabilità di successo per livello.
  useEffect(() => {
    if (fase !== "gioco" || !partita || partita.vincitore !== null) return;
    if (partita.modalita !== "computer" || partita.turno !== 1) return;

    if (partita.domanda) {
      const timer = setTimeout(() => {
        const corretto = Math.random() < probabilitaComputer(partita.livello);
        const scelta = corretto
          ? partita.domanda.risposta
          : partita.domanda.opzioni.find((o) => o !== partita.domanda.risposta);
        rispondi(scelta);
      }, 1100);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => lanciaDado(), 900);
    return () => clearTimeout(timer);
  }, [fase, partita, lanciaDado, rispondi]);

  const finito = partita && partita.vincitore !== null;
  const turnoComputer = partita && partita.modalita === "computer" && partita.turno === 1 && !finito;

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo style={{ marginBottom: 2 }} />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>Sentiero del campeggio</Text>
          <Pressable style={styles.bottoneMusica} onPress={() => setMusicaGiochiAttiva(!musicaGiochiAttiva)} hitSlop={8}>
            <Ionicons
              name={musicaGiochiAttiva ? "musical-notes" : "musical-notes-outline"}
              size={20}
              color={musicaGiochiAttiva ? temaGiochi.azzurro : colori.testoSecondario}
            />
          </Pressable>
        </View>
      </View>

      {fase === "caricamento" && <View style={{ flex: 1 }} />}

      {fase === "scelta" && (
        <View style={styles.scelta}>
          <Text style={styles.sceltaDomanda}>Come vuoi giocare?</Text>
          <View style={styles.selettoreLivello}>
            {[
              { chiave: "computer", etichetta: "Contro il computer" },
              { chiave: "duo", etichetta: "In due, a turni" },
            ].map((m) => (
              <Pressable
                key={m.chiave}
                style={[styles.pillLivello, modalitaScelta === m.chiave && { backgroundColor: temaGiochi.azzurro, borderColor: temaGiochi.azzurro }]}
                onPress={() => setModalitaScelta(m.chiave)}
              >
                <Text style={[styles.pillLivelloTesto, modalitaScelta === m.chiave && styles.pillLivelloTestoAttivo]}>
                  {m.etichetta}
                </Text>
              </Pressable>
            ))}
          </View>

          {modalitaScelta === "computer" && (
            <>
              <Text style={styles.sceltaDomanda}>Che livello vuoi?</Text>
              <View style={styles.selettoreLivello}>
                {Object.entries(LIVELLI).map(([chiave, l]) => (
                  <Pressable
                    key={chiave}
                    style={[styles.pillLivello, livelloScelto === chiave && { backgroundColor: l.colore, borderColor: l.colore }]}
                    onPress={() => setLivelloScelto(chiave)}
                  >
                    <Text style={[styles.pillLivelloTesto, livelloScelto === chiave && styles.pillLivelloTestoAttivo]}>
                      {l.etichetta}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Pressable style={styles.bottoneNuovo} onPress={() => nuovaPartita(modalitaScelta, livelloScelto)}>
            <Ionicons name="shuffle" size={18} color={colori.bianco} />
            <Text style={styles.bottoneNuovoTesto}>Inizia la partita</Text>
          </Pressable>
          {vinteTotale > 0 && <Text style={styles.contatore}>Partite vinte finora: {vinteTotale}</Text>}
        </View>
      )}

      {fase === "gioco" && partita && (
        <ScrollView contentContainerStyle={styles.giocoContenuto} showsVerticalScrollIndicator={false}>
          <View style={styles.rigaAzioni}>
            <Pressable style={styles.bottoneIndietro} onPress={abbandona}>
              <Ionicons name="chevron-back" size={16} color={colori.blu} />
              <Text style={styles.bottoneIndietroTesto}>Abbandona</Text>
            </Pressable>
            <Text style={styles.livelloEtichetta}>
              {partita.modalita === "computer" ? LIVELLI[partita.livello].etichetta : "In due"}
            </Text>
          </View>

          <View style={styles.tabellone}>
            {TABELLONE.map((riga, indiceRiga) => (
              <View key={indiceRiga} style={styles.rigaTabellone}>
                {riga.map((numero) => {
                  const tipo = tipoCella(numero);
                  const quiTu = partita.posizioni[0] === numero;
                  const quiAltro = partita.posizioni[1] === numero;
                  return (
                    <View
                      key={numero}
                      style={[
                        styles.cella,
                        tipo === "riposo" && styles.cellaRiposo,
                        tipo === "arrivo" && styles.cellaArrivo,
                      ]}
                    >
                      <Text style={styles.cellaNumero}>{numero}</Text>
                      {tipo === "riposo" && <Ionicons name="bed-outline" size={12} color={temaGiochi.verde} />}
                      {tipo === "arrivo" && <Ionicons name="flag-outline" size={12} color={temaGiochi.rosa} />}
                      <View style={styles.gettoni}>
                        {quiTu && <View style={[styles.gettone, { backgroundColor: temaGiochi.azzurro }]} />}
                        {quiAltro && <View style={[styles.gettone, { backgroundColor: temaGiochi.rosa }]} />}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {finito ? (
            <View style={[styles.bannerEsito, { backgroundColor: temaGiochi.azzurroChiaro }]}>
              <Text style={[styles.bannerEsitoTesto, { color: temaGiochi.azzurro }]}>
                {nomeGiocatore(partita.modalita, partita.vincitore)} ha vinto! 🎉
              </Text>
            </View>
          ) : (
            <Text style={styles.turnoTesto}>
              Turno di: <Text style={{ fontWeight: "800" }}>{nomeGiocatore(partita.modalita, partita.turno)}</Text>
            </Text>
          )}

          {!finito && partita.domanda && (
            <View style={styles.domandaRiquadro}>
              <Text style={styles.domandaTesto}>{partita.domanda.indizio}</Text>
              <View style={styles.opzioni}>
                {partita.domanda.opzioni.map((opzione) => (
                  <Pressable
                    key={opzione}
                    style={styles.opzionePulsante}
                    disabled={turnoComputer}
                    onPress={() => rispondi(opzione)}
                  >
                    <Text style={styles.opzioneTesto}>{opzione}</Text>
                  </Pressable>
                ))}
              </View>
              {turnoComputer && <Text style={styles.attesaComputer}>Il computer sta pensando…</Text>}
            </View>
          )}

          {!finito && !partita.domanda && (
            <View style={styles.zonaDado}>
              <Dado valore={dadoValore} size={72} colore={temaGiochi.azzurro} />
              <Pressable
                style={[styles.bottoneDado, (rotolando || turnoComputer) && styles.bottoneDadoDisabilitato]}
                onPress={lanciaDado}
                disabled={rotolando || turnoComputer}
              >
                <Ionicons name="dice-outline" size={18} color={colori.bianco} />
                <Text style={styles.bottoneDadoTesto}>{turnoComputer ? "Attendi…" : "Lancia il dado"}</Text>
              </Pressable>
            </View>
          )}

          {finito && (
            <Pressable style={styles.bottoneProssimo} onPress={() => nuovaPartita(partita.modalita, partita.livello)}>
              <Ionicons name="arrow-forward" size={16} color={colori.bianco} />
              <Text style={styles.bottoneProssimoTesto}>Nuova partita</Text>
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
  titolo: { fontSize: 18, fontWeight: "800", color: colori.testo },
  bottoneMusica: { position: "absolute", right: 0 },

  scelta: { flex: 1, paddingHorizontal: 24, justifyContent: "center", gap: 14 },
  sceltaDomanda: { fontSize: 15, fontWeight: "700", color: colori.testo, textAlign: "center" },
  selettoreLivello: { flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
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
    backgroundColor: temaGiochi.azzurro,
    borderRadius: raggioCard,
    paddingVertical: 15,
    marginTop: 6,
    ...ombraCard,
  },
  bottoneNuovoTesto: { color: colori.bianco, fontWeight: "800", fontSize: 14.5 },
  contatore: { textAlign: "center", color: colori.testoSecondario, fontSize: 12 },

  giocoContenuto: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24, alignItems: "center", gap: 14 },
  rigaAzioni: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bottoneIndietro: { flexDirection: "row", alignItems: "center", gap: 4 },
  bottoneIndietroTesto: { color: colori.blu, fontWeight: "700", fontSize: 13 },
  livelloEtichetta: { fontSize: 11, fontWeight: "800", color: colori.testoSecondario, textTransform: "uppercase" },

  tabellone: { width: "100%", gap: 6 },
  rigaTabellone: { flexDirection: "row", gap: 6 },
  cella: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colori.bordo,
    backgroundColor: colori.bianco,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  cellaRiposo: { backgroundColor: temaGiochi.verdeChiaro, borderColor: temaGiochi.verde },
  cellaArrivo: { backgroundColor: temaGiochi.rosaChiaro, borderColor: temaGiochi.rosa },
  cellaNumero: { fontSize: 10, fontWeight: "700", color: colori.testoSecondario },
  gettoni: { flexDirection: "row", gap: 2, position: "absolute", bottom: 3 },
  gettone: { width: 8, height: 8, borderRadius: 4 },

  turnoTesto: { fontSize: 14, color: colori.testo },

  bannerEsito: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, width: "100%" },
  bannerEsitoTesto: { fontWeight: "800", fontSize: 14.5, textAlign: "center" },

  domandaRiquadro: {
    width: "100%",
    backgroundColor: colori.bianco,
    borderRadius: raggioCard,
    padding: 16,
    gap: 10,
    ...ombraCard,
  },
  domandaTesto: { fontSize: 14.5, fontWeight: "700", color: colori.testo, textAlign: "center" },
  opzioni: { gap: 8 },
  opzionePulsante: {
    backgroundColor: temaGiochi.azzurroChiaro,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  opzioneTesto: { fontSize: 13.5, fontWeight: "700", color: colori.testo },
  attesaComputer: { textAlign: "center", color: colori.testoSecondario, fontSize: 12.5 },

  zonaDado: { alignItems: "center", gap: 12 },
  bottoneDado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: temaGiochi.azzurro,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bottoneDadoDisabilitato: { opacity: 0.5 },
  bottoneDadoTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13 },

  bottoneProssimo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: temaGiochi.azzurro,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bottoneProssimoTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13 },
});
