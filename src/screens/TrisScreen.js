import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { temaGiochi } from "../theme/giochiTema";
import { usePreferenze } from "../context/PreferenzeContext";
import { trovaLineaVincente, partitaFinita, mossaIA } from "../lib/trisIA";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

const CELLE_VUOTE = Array(9).fill(null);
const COLORE_X = colori.blu;
const COLORE_O = temaGiochi.rosa;

export default function TrisScreen() {
  const { musicaGiochiAttiva, setMusicaGiochiAttiva } = usePreferenze();
  // "scelta": si sceglie modalità e, se contro il computer, la difficoltà.
  // "gioco": partita in corso o appena finita (il risultato resta a video
  // finché non si tocca "Rivincita" o "Cambia modalità").
  const [fase, setFase] = useState("scelta");
  const [modalita, setModalita] = useState(null); // "computer" | "due"
  const [livello, setLivello] = useState("facile");
  const [celle, setCelle] = useState(CELLE_VUOTE);
  const [turno, setTurno] = useState("X");

  // useState con inizializzatore pigro invece di useRef: gli Animated.Value
  // restano la stessa istanza stabile tra i render (li muta solo la libreria
  // Animated, non React), senza leggere un .current in fase di render.
  const [animazioniCelle] = useState(() => CELLE_VUOTE.map(() => new Animated.Value(0)));
  const [pulsazione] = useState(() => new Animated.Value(1));

  const vincita = trovaLineaVincente(celle);
  const finita = partitaFinita(celle);
  const pareggio = finita && !vincita;

  useEffect(() => {
    if (!vincita) return;
    const anima = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsazione, { toValue: 1.18, duration: 420, useNativeDriver: true }),
        Animated.timing(pulsazione, { toValue: 1, duration: 420, useNativeDriver: true }),
      ])
    );
    anima.start();
    return () => anima.stop();
  }, [vincita, pulsazione]);

  const giocaCella = useCallback(
    (indice, simbolo) => {
      setCelle((precedenti) => {
        if (precedenti[indice]) return precedenti;
        const nuove = [...precedenti];
        nuove[indice] = simbolo;
        return nuove;
      });
      Animated.spring(animazioniCelle[indice], { toValue: 1, useNativeDriver: true, friction: 5 }).start();
      setTurno((t) => (t === "X" ? "O" : "X"));
    },
    [animazioniCelle]
  );

  // Nella modalità "contro il computer" l'IA (sempre "O") gioca da sola
  // non appena è il suo turno, con un piccolo ritardo per sembrare una
  // mossa "pensata" e non istantanea.
  useEffect(() => {
    if (modalita !== "computer" || fase !== "gioco" || finita || turno !== "O") return;
    const timer = setTimeout(() => {
      const indice = mossaIA(celle, livello);
      if (indice >= 0) giocaCella(indice, "O");
    }, 550);
    return () => clearTimeout(timer);
  }, [modalita, fase, finita, turno, celle, livello, giocaCella]);

  const toccaCella = (indice) => {
    if (finita || celle[indice]) return;
    if (modalita === "computer" && turno !== "X") return;
    giocaCella(indice, turno);
  };

  const avviaPartita = (modalitaScelta) => {
    setModalita(modalitaScelta);
    setCelle(CELLE_VUOTE);
    setTurno("X");
    animazioniCelle.forEach((a) => a.setValue(0));
    setFase("gioco");
  };

  const rivincita = () => {
    setCelle(CELLE_VUOTE);
    setTurno("X");
    animazioniCelle.forEach((a) => a.setValue(0));
  };

  const cambiaModalita = () => {
    setFase("scelta");
    setModalita(null);
    setCelle(CELLE_VUOTE);
    animazioniCelle.forEach((a) => a.setValue(0));
  };

  const testoEsito = () => {
    if (pareggio) return "Pareggio!";
    if (!vincita) return null;
    if (modalita === "computer") return vincita.giocatore === "X" ? "Hai vinto! 🎉" : "Ha vinto il computer";
    return `Ha vinto ${vincita.giocatore}! 🎉`;
  };

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo style={{ marginBottom: 2 }} />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>Tris</Text>
          <Pressable
            style={styles.bottoneMusica}
            onPress={() => setMusicaGiochiAttiva(!musicaGiochiAttiva)}
            hitSlop={8}
          >
            <Ionicons
              name={musicaGiochiAttiva ? "musical-notes" : "musical-notes-outline"}
              size={20}
              color={musicaGiochiAttiva ? temaGiochi.viola : colori.testoSecondario}
            />
          </Pressable>
        </View>
      </View>

      {fase === "scelta" ? (
        <View style={styles.scelta}>
          <Text style={styles.sceltaDomanda}>Con chi giochi?</Text>
          <Pressable style={[styles.bottoneModalita, { backgroundColor: temaGiochi.viola }]} onPress={() => avviaPartita("computer")}>
            <Ionicons name="hardware-chip-outline" size={22} color={colori.bianco} />
            <Text style={styles.bottoneModalitaTesto}>Contro il computer</Text>
          </Pressable>

          <View style={styles.selettoreLivello}>
            {["facile", "difficile"].map((opzione) => (
              <Pressable
                key={opzione}
                style={[styles.pillLivello, livello === opzione && styles.pillLivelloAttiva]}
                onPress={() => setLivello(opzione)}
              >
                <Text style={[styles.pillLivelloTesto, livello === opzione && styles.pillLivelloTestoAttivo]}>
                  {opzione === "facile" ? "Facile" : "Difficile"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={[styles.bottoneModalita, { backgroundColor: temaGiochi.rosa }]} onPress={() => avviaPartita("due")}>
            <Ionicons name="people-outline" size={22} color={colori.bianco} />
            <Text style={styles.bottoneModalitaTesto}>In due, a turni sul telefono</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.gioco}>
          <Text style={styles.turnoTesto}>
            {finita
              ? testoEsito()
              : modalita === "computer"
                ? turno === "X" ? "Tocca a te" : "Il computer sta pensando…"
                : `Tocca a ${turno}`}
          </Text>

          <View style={styles.tabellone}>
            {celle.map((valore, indice) => {
              const dentroVincita = vincita?.linea.includes(indice);
              return (
                <Pressable key={indice} style={styles.cella} onPress={() => toccaCella(indice)}>
                  <Animated.View
                    style={{
                      transform: [
                        { scale: dentroVincita ? pulsazione : animazioniCelle[indice] },
                      ],
                    }}
                  >
                    {valore && (
                      <Text style={[styles.simbolo, { color: valore === "X" ? COLORE_X : COLORE_O }]}>{valore}</Text>
                    )}
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>

          {finita && (
            <View style={styles.rigaBottoni}>
              <Pressable style={[styles.bottoneEsito, { backgroundColor: temaGiochi.viola }]} onPress={rivincita}>
                <Ionicons name="refresh" size={16} color={colori.bianco} />
                <Text style={styles.bottoneEsitoTesto}>Rivincita</Text>
              </Pressable>
              <Pressable style={[styles.bottoneEsito, styles.bottoneEsitoSecondario]} onPress={cambiaModalita}>
                <Text style={[styles.bottoneEsitoTesto, { color: colori.testo }]}>Cambia modalità</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: { paddingHorizontal: 16, paddingTop: 6 },
  rigaTitolo: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6 },
  titolo: { fontSize: 20, fontWeight: "800", color: colori.testo },
  bottoneMusica: { position: "absolute", right: 0 },

  scelta: { flex: 1, paddingHorizontal: 24, justifyContent: "center", gap: 14 },
  sceltaDomanda: { fontSize: 16, fontWeight: "700", color: colori.testo, textAlign: "center", marginBottom: 6 },
  bottoneModalita: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: raggioCard,
    paddingVertical: 16,
    ...ombraCard,
  },
  bottoneModalitaTesto: { color: colori.bianco, fontWeight: "800", fontSize: 14.5 },
  selettoreLivello: { flexDirection: "row", justifyContent: "center", gap: 8 },
  pillLivello: {
    backgroundColor: colori.bianco,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  pillLivelloAttiva: { backgroundColor: temaGiochi.viola, borderColor: temaGiochi.viola },
  pillLivelloTesto: { fontSize: 12.5, fontWeight: "700", color: colori.testoSecondario },
  pillLivelloTestoAttivo: { color: colori.bianco },

  gioco: { flex: 1, alignItems: "center", paddingTop: 18, gap: 18 },
  turnoTesto: { fontSize: 16, fontWeight: "800", color: colori.testo },
  tabellone: { width: 288, height: 288, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cella: {
    width: 90,
    height: 90,
    borderRadius: 18,
    backgroundColor: colori.bianco,
    alignItems: "center",
    justifyContent: "center",
    ...ombraCard,
  },
  simbolo: { fontSize: 44, fontWeight: "900" },
  rigaBottoni: { flexDirection: "row", gap: 10, marginTop: 4 },
  bottoneEsito: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  bottoneEsitoSecondario: { backgroundColor: colori.bianco, borderWidth: 1, borderColor: colori.bordo },
  bottoneEsitoTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13 },
});
