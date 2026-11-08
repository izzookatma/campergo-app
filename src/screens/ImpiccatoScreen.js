import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { temaGiochi } from "../theme/giochiTema";
import { usePreferenze } from "../context/PreferenzeContext";
import { BANCA_CRUCIVERBA } from "../lib/cruciverbaBanca";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import DisegnoImpiccato from "../components/DisegnoImpiccato";

const CHIAVE_IN_CORSO = "naturago_impiccato_in_corso";
const CHIAVE_VINTE = "naturago_impiccato_vinte_totale";
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const LIVELLI = {
  facile: { etichetta: "Facile", colore: temaGiochi.verde, tentativi: 8, lunghezzaMax: 5 },
  medio: { etichetta: "Medio", colore: temaGiochi.giallo, tentativi: 6, lunghezzaMin: 6, lunghezzaMax: 7 },
  difficile: { etichetta: "Difficile", colore: temaGiochi.rosa, tentativi: 5, lunghezzaMin: 8 },
};

function scegliParola(livello, giaUsate) {
  const config = LIVELLI[livello];
  const candidate = BANCA_CRUCIVERBA.filter((v) => {
    if (config.lunghezzaMin && v.parola.length < config.lunghezzaMin) return false;
    if (config.lunghezzaMax && v.parola.length > config.lunghezzaMax) return false;
    return true;
  });
  const disponibili = candidate.filter((v) => !giaUsate.has(v.parola));
  const lista = disponibili.length > 0 ? disponibili : candidate;
  return lista[Math.floor(Math.random() * lista.length)];
}

export default function ImpiccatoScreen() {
  const { musicaGiochiAttiva, setMusicaGiochiAttiva } = usePreferenze();
  const [fase, setFase] = useState("caricamento"); // caricamento | scelta | gioco
  const [livelloScelto, setLivelloScelto] = useState("facile");
  const [partita, setPartita] = useState(null); // { livello, parola, indizio, tentativi }
  const [lettereUsate, setLettereUsate] = useState([]);
  const usateSessione = useRef(new Set());
  const [contatoQuestaPartita, setContatoQuestaPartita] = useState(false);
  const [vinteTotale, setVinteTotale] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_VINTE).then((v) => setVinteTotale(parseInt(v, 10) || 0));
    AsyncStorage.getItem(CHIAVE_IN_CORSO).then((salvato) => {
      if (salvato) {
        const dati = JSON.parse(salvato);
        setPartita(dati.partita);
        setLettereUsate(dati.lettereUsate || []);
        setFase("gioco");
      } else {
        setFase("scelta");
      }
    });
  }, []);

  const erroriCommessi = partita ? lettereUsate.filter((l) => !partita.parola.includes(l)).length : 0;
  const vinto = partita ? partita.parola.split("").every((l) => lettereUsate.includes(l)) : false;
  const perso = partita ? erroriCommessi >= partita.tentativi && !vinto : false;
  const finito = vinto || perso;
  const faseDisegno = partita ? Math.min(6, Math.ceil((erroriCommessi / partita.tentativi) * 6)) : 0;

  useEffect(() => {
    if (fase !== "gioco" || !partita) return;
    AsyncStorage.setItem(CHIAVE_IN_CORSO, JSON.stringify({ partita, lettereUsate }));
  }, [fase, partita, lettereUsate]);

  useEffect(() => {
    if (!vinto || contatoQuestaPartita) return;
    AsyncStorage.getItem(CHIAVE_VINTE).then((v) => {
      const nuovo = (parseInt(v, 10) || 0) + 1;
      AsyncStorage.setItem(CHIAVE_VINTE, String(nuovo));
      setVinteTotale(nuovo);
      setContatoQuestaPartita(true);
    });
  }, [vinto, contatoQuestaPartita]);

  const nuovaPartita = useCallback(
    (livello) => {
      const scelta = scegliParola(livello, usateSessione.current);
      usateSessione.current.add(scelta.parola);
      setPartita({ livello, parola: scelta.parola, indizio: scelta.indizio, tentativi: LIVELLI[livello].tentativi });
      setLettereUsate([]);
      setContatoQuestaPartita(false);
      setFase("gioco");
    },
    []
  );

  const abbandona = () => {
    AsyncStorage.removeItem(CHIAVE_IN_CORSO);
    setPartita(null);
    setLettereUsate([]);
    setFase("scelta");
  };

  const provaLettera = (lettera) => {
    if (finito || lettereUsate.includes(lettera)) return;
    setLettereUsate((precedenti) => [...precedenti, lettera]);
  };

  const coloreLivello = partita ? LIVELLI[partita.livello].colore : temaGiochi.giallo;

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo style={{ marginBottom: 2 }} />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>Impiccato</Text>
          <Pressable style={styles.bottoneMusica} onPress={() => setMusicaGiochiAttiva(!musicaGiochiAttiva)} hitSlop={8}>
            <Ionicons
              name={musicaGiochiAttiva ? "musical-notes" : "musical-notes-outline"}
              size={20}
              color={musicaGiochiAttiva ? temaGiochi.giallo : colori.testoSecondario}
            />
          </Pressable>
        </View>
      </View>

      {fase === "caricamento" && <View style={{ flex: 1 }} />}

      {fase === "scelta" && (
        <View style={styles.scelta}>
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
          <Pressable style={styles.bottoneNuovo} onPress={() => nuovaPartita(livelloScelto)}>
            <Ionicons name="shuffle" size={18} color={colori.bianco} />
            <Text style={styles.bottoneNuovoTesto}>Nuova parola</Text>
          </Pressable>
          {vinteTotale > 0 && <Text style={styles.contatore}>Parole indovinate finora: {vinteTotale}</Text>}
        </View>
      )}

      {fase === "gioco" && partita && (
        <ScrollView contentContainerStyle={styles.giocoContenuto} showsVerticalScrollIndicator={false}>
          <View style={styles.rigaAzioni}>
            <Pressable style={styles.bottoneIndietro} onPress={abbandona}>
              <Ionicons name="chevron-back" size={16} color={colori.blu} />
              <Text style={styles.bottoneIndietroTesto}>Abbandona</Text>
            </Pressable>
            <Text style={styles.livelloEtichetta}>{LIVELLI[partita.livello].etichetta}</Text>
            <Text style={styles.tentativiTesto}>
              {Math.max(0, partita.tentativi - erroriCommessi)}/{partita.tentativi}
            </Text>
          </View>

          <DisegnoImpiccato size={110} colorePatibolo={colori.testoSecondario} coloreOmino={perso ? temaGiochi.rosa : coloreLivello} fase={faseDisegno} />

          {finito && (
            <View style={[styles.bannerEsito, { backgroundColor: vinto ? temaGiochi.verdeChiaro : temaGiochi.rosaChiaro }]}>
              <Text style={[styles.bannerEsitoTesto, { color: vinto ? temaGiochi.verde : temaGiochi.rosa }]}>
                {vinto ? "Hai vinto! 🎉" : `Hai perso questa volta! Era "${partita.parola}"`}
              </Text>
            </View>
          )}

          <Text style={styles.indizio}>{partita.indizio}</Text>

          <View style={styles.rigaParola}>
            {partita.parola.split("").map((lettera, indice) => {
              const mostrata = lettereUsate.includes(lettera) || perso;
              return (
                <View key={indice} style={styles.casellaLettera}>
                  <Text style={styles.casellaLetteraTesto}>{mostrata ? lettera : ""}</Text>
                </View>
              );
            })}
          </View>

          {!finito && (
            <View style={styles.tastiera}>
              {ALFABETO.map((lettera) => {
                const usata = lettereUsate.includes(lettera);
                const corretta = usata && partita.parola.includes(lettera);
                return (
                  <Pressable
                    key={lettera}
                    style={[
                      styles.tasto,
                      usata && (corretta ? styles.tastoCorretto : styles.tastoSbagliato),
                    ]}
                    onPress={() => provaLettera(lettera)}
                    disabled={usata}
                  >
                    <Text style={[styles.tastoTesto, usata && styles.tastoTestoUsato]}>{lettera}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {finito && (
            <Pressable style={styles.bottoneProssimo} onPress={() => nuovaPartita(partita.livello)}>
              <Ionicons name="arrow-forward" size={16} color={colori.bianco} />
              <Text style={styles.bottoneProssimoTesto}>Prossima parola</Text>
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
    backgroundColor: temaGiochi.giallo,
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
  tentativiTesto: { fontSize: 13, fontWeight: "800", color: colori.testo },

  bannerEsito: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 },
  bannerEsitoTesto: { fontWeight: "800", fontSize: 13.5, textAlign: "center" },

  indizio: { fontSize: 14, color: colori.testo, textAlign: "center", fontWeight: "600", paddingHorizontal: 10 },

  rigaParola: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  casellaLettera: {
    width: 30,
    height: 38,
    borderBottomWidth: 3,
    borderBottomColor: colori.bordo,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  casellaLetteraTesto: { fontSize: 20, fontWeight: "800", color: colori.testo },

  tastiera: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, maxWidth: 360 },
  tasto: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
    alignItems: "center",
    justifyContent: "center",
  },
  tastoCorretto: { backgroundColor: temaGiochi.verdeChiaro, borderColor: temaGiochi.verde },
  tastoSbagliato: { backgroundColor: "#f1f1f1", borderColor: colori.bordo },
  tastoTesto: { fontSize: 15, fontWeight: "800", color: colori.testo },
  tastoTestoUsato: { color: colori.testoSecondario },

  bottoneProssimo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: temaGiochi.giallo,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bottoneProssimoTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13 },
});
