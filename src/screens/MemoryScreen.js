import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { temaGiochi } from "../theme/giochiTema";
import { usePreferenze } from "../context/PreferenzeContext";
import { creaMazzo, aggiornaMemoria, sceglieIndiceIA } from "../lib/memoriaIA";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import IconaBussolaLogo from "../components/IconaBussolaLogo";

// Foto vere di campeggi, camper e tende (Unsplash, uso libero, soggetto
// verificato a mano una per una): "difficile" le usa tutte e 8, "facile"
// solo le prime 6, per una partita più breve.
const FOTO = [
  { url: "https://images.unsplash.com/photo-1660819731358-e197f235eeb7?auto=format&fit=crop&w=400&h=400&q=70" },
  { url: "https://images.unsplash.com/photo-1721678160780-2ea6aa76a90c?auto=format&fit=crop&w=400&h=400&q=70" },
  { url: "https://images.unsplash.com/photo-1609788063095-d71bf3c1f01f?auto=format&fit=crop&w=400&h=400&q=70" },
  { url: "https://images.unsplash.com/photo-1790710359529-ee3fd9609e88?auto=format&fit=crop&w=400&h=400&q=70" },
  { url: "https://images.unsplash.com/photo-1596662214814-b4a60ea1a1f8?auto=format&fit=crop&w=400&h=400&q=70" },
  { url: "https://images.unsplash.com/photo-1565301346072-8cff85ab552e?auto=format&fit=crop&w=400&h=400&q=70" },
  { url: "https://images.unsplash.com/photo-1764148508104-f3de381f7d5f?auto=format&fit=crop&w=400&h=400&q=70" },
  { url: "https://images.unsplash.com/photo-1771780601360-c5f107f9fb4c?auto=format&fit=crop&w=400&h=400&q=70" },
];

const LIVELLI = { facile: { coppie: 6 }, difficile: { coppie: 8 } };
const COLORI_RETRO = [temaGiochi.viola, temaGiochi.rosa, temaGiochi.giallo, temaGiochi.verde];
const RITARDO_CONFRONTO = 900;
const RITARDO_IA = 700;
const COLONNE = 4;
const LARGHEZZA_CARTA = 84;
const ALTEZZA_CARTA = 105;

export default function MemoryScreen() {
  const { musicaGiochiAttiva, setMusicaGiochiAttiva } = usePreferenze();
  const [fase, setFase] = useState("scelta");
  const [modalita, setModalita] = useState(null); // "computer" | "due"
  const [livello, setLivello] = useState("facile");
  const [carte, setCarte] = useState([]);
  const [animazioni, setAnimazioni] = useState([]);
  const [scoperte, setScoperte] = useState([]); // [{indice, coppiaId}]
  const [turno, setTurno] = useState(1);
  const [punteggi, setPunteggi] = useState({ 1: 0, 2: 0 });
  const [memoria, setMemoria] = useState({});

  const tutteAbbinate = carte.length > 0 && carte.every((c) => c.abbinata);
  const bloccato = scoperte.length === 2;

  const animaCarta = useCallback(
    (indice, valore) => {
      Animated.timing(animazioni[indice], { toValue: valore, duration: 260, useNativeDriver: true }).start();
    },
    [animazioni]
  );

  const rivelaCarta = useCallback(
    (indice) => {
      const coppiaId = carte[indice].coppiaId;
      setCarte((precedenti) => {
        const nuove = [...precedenti];
        nuove[indice] = { ...nuove[indice], scoperta: true };
        return nuove;
      });
      setMemoria((precedente) => aggiornaMemoria(precedente, indice, coppiaId));
      setScoperte((precedenti) => [...precedenti, { indice, coppiaId }]);
      animaCarta(indice, 180);
    },
    [carte, animaCarta]
  );

  const toccaCarta = (indice) => {
    if (bloccato || fase !== "gioco" || scoperte.length >= 2) return;
    if (carte[indice].scoperta || carte[indice].abbinata) return;
    if (modalita === "computer" && turno === 2) return;
    rivelaCarta(indice);
  };

  // Confronta le due carte scoperte: se la coppia combacia resta il turno
  // allo stesso giocatore (come nel memory vero), altrimenti le due carte
  // tornano coperte e passa il turno.
  useEffect(() => {
    if (scoperte.length !== 2) return;
    const [a, b] = scoperte;
    const abbinate = a.coppiaId === b.coppiaId;
    const timer = setTimeout(() => {
      if (abbinate) {
        setCarte((precedenti) => {
          const nuove = [...precedenti];
          nuove[a.indice] = { ...nuove[a.indice], abbinata: true };
          nuove[b.indice] = { ...nuove[b.indice], abbinata: true };
          return nuove;
        });
        setPunteggi((precedenti) => ({ ...precedenti, [turno]: precedenti[turno] + 1 }));
      } else {
        animaCarta(a.indice, 0);
        animaCarta(b.indice, 0);
        setCarte((precedenti) => {
          const nuove = [...precedenti];
          nuove[a.indice] = { ...nuove[a.indice], scoperta: false };
          nuove[b.indice] = { ...nuove[b.indice], scoperta: false };
          return nuove;
        });
        setTurno((t) => (t === 1 ? 2 : 1));
      }
      setScoperte([]);
    }, RITARDO_CONFRONTO);
    return () => clearTimeout(timer);
  }, [scoperte, turno, animaCarta]);

  // L'IA (giocatore 2) sceglie da sola la prima carta del suo turno.
  useEffect(() => {
    if (modalita !== "computer" || fase !== "gioco" || turno !== 2 || bloccato) return;
    if (scoperte.length !== 0 || tutteAbbinate) return;
    const timer = setTimeout(() => {
      const indice = sceglieIndiceIA(carte, memoria, livello, null);
      if (indice >= 0) rivelaCarta(indice);
    }, RITARDO_IA);
    return () => clearTimeout(timer);
  }, [modalita, fase, turno, bloccato, scoperte.length, tutteAbbinate, carte, memoria, livello, rivelaCarta]);

  // ...e poi la seconda, ricordando (più o meno, secondo il livello) dove
  // ha già visto le carte.
  useEffect(() => {
    if (modalita !== "computer" || fase !== "gioco" || turno !== 2 || bloccato) return;
    if (scoperte.length !== 1) return;
    const scelta = scoperte[0];
    const timer = setTimeout(() => {
      const indice = sceglieIndiceIA(carte, memoria, livello, scelta.indice);
      if (indice >= 0) rivelaCarta(indice);
    }, RITARDO_IA);
    return () => clearTimeout(timer);
  }, [modalita, fase, turno, bloccato, scoperte, carte, memoria, livello, rivelaCarta]);

  const nuovaPartita = (modalitaScelta, livelloScelto) => {
    const mazzo = creaMazzo(FOTO, LIVELLI[livelloScelto].coppie);
    setCarte(mazzo);
    setAnimazioni(mazzo.map(() => new Animated.Value(0)));
    setScoperte([]);
    setTurno(1);
    setPunteggi({ 1: 0, 2: 0 });
    setMemoria({});
    setModalita(modalitaScelta);
    setLivello(livelloScelto);
    setFase("gioco");
  };

  const rivincita = () => nuovaPartita(modalita, livello);
  const cambiaModalita = () => setFase("scelta");

  const etichettaGiocatore = (n) => {
    if (modalita === "computer") return n === 1 ? "Tu" : "Computer";
    return `Giocatore ${n}`;
  };

  const testoEsito = () => {
    if (punteggi[1] === punteggi[2]) return "Pareggio!";
    const chiVince = punteggi[1] > punteggi[2] ? 1 : 2;
    if (modalita === "computer") return chiVince === 1 ? "Hai vinto! 🎉" : "Ha vinto il computer";
    return `Ha vinto ${etichettaGiocatore(chiVince)}! 🎉`;
  };

  const testoTurno = tutteAbbinate
    ? testoEsito()
    : modalita === "computer" && turno === 2
      ? "Il computer sta pensando…"
      : `Tocca a ${etichettaGiocatore(turno)}`;

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo style={{ marginBottom: 2 }} />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>Gioco delle coppie</Text>
          <Pressable
            style={styles.bottoneMusica}
            onPress={() => setMusicaGiochiAttiva(!musicaGiochiAttiva)}
            hitSlop={8}
          >
            <Ionicons
              name={musicaGiochiAttiva ? "musical-notes" : "musical-notes-outline"}
              size={20}
              color={musicaGiochiAttiva ? temaGiochi.rosa : colori.testoSecondario}
            />
          </Pressable>
        </View>
      </View>

      {fase === "scelta" ? (
        <View style={styles.scelta}>
          <Text style={styles.sceltaDomanda}>Quante coppie?</Text>
          <View style={styles.selettoreLivello}>
            {["facile", "difficile"].map((opzione) => (
              <Pressable
                key={opzione}
                style={[styles.pillLivello, livello === opzione && styles.pillLivelloAttiva]}
                onPress={() => setLivello(opzione)}
              >
                <Text style={[styles.pillLivelloTesto, livello === opzione && styles.pillLivelloTestoAttivo]}>
                  {opzione === "facile" ? "Facile · 6 coppie" : "Difficile · 8 coppie"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sceltaDomanda}>Con chi giochi?</Text>
          <Pressable
            style={[styles.bottoneModalita, { backgroundColor: temaGiochi.viola }]}
            onPress={() => nuovaPartita("computer", livello)}
          >
            <Ionicons name="hardware-chip-outline" size={22} color={colori.bianco} />
            <Text style={styles.bottoneModalitaTesto}>Contro il computer</Text>
          </Pressable>
          <Pressable
            style={[styles.bottoneModalita, { backgroundColor: temaGiochi.rosa }]}
            onPress={() => nuovaPartita("due", livello)}
          >
            <Ionicons name="people-outline" size={22} color={colori.bianco} />
            <Text style={styles.bottoneModalitaTesto}>In due, a turni sul telefono</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.gioco}>
          <View style={styles.punteggi}>
            {[1, 2].map((n) => (
              <View key={n} style={[styles.chipPunteggio, turno === n && !tutteAbbinate && styles.chipPunteggioAttivo]}>
                <Text style={styles.chipPunteggioEtichetta}>{etichettaGiocatore(n)}</Text>
                <Text style={styles.chipPunteggioNumero}>{punteggi[n]}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.turnoTesto}>{testoTurno}</Text>

          <View style={styles.griglia}>
            {carte.map((carta, indice) => {
              const anim = animazioni[indice];
              const rotRetro = anim?.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
              const rotFronte = anim?.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });
              const coloreRetro = COLORI_RETRO[indice % COLORI_RETRO.length];
              return (
                <Pressable
                  key={carta.id}
                  style={[styles.cartaContenitore, carta.abbinata && styles.cartaAbbinata]}
                  onPress={() => toccaCarta(indice)}
                  disabled={bloccato || carta.abbinata}
                >
                  <Animated.View
                    style={[styles.faccia, { backgroundColor: coloreRetro, transform: [{ perspective: 1000 }, { rotateY: rotRetro || "0deg" }] }]}
                  >
                    <IconaBussolaLogo size={28} />
                  </Animated.View>
                  <Animated.View
                    style={[styles.faccia, styles.facciaFronte, { transform: [{ perspective: 1000 }, { rotateY: rotFronte || "180deg" }] }]}
                  >
                    <Image source={{ uri: carta.immagine }} style={styles.immagineCarta} />
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>

          {tutteAbbinate && (
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
  titolo: { fontSize: 19, fontWeight: "800", color: colori.testo },
  bottoneMusica: { position: "absolute", right: 0 },

  scelta: { flex: 1, paddingHorizontal: 24, justifyContent: "center", gap: 12 },
  sceltaDomanda: { fontSize: 15, fontWeight: "700", color: colori.testo, textAlign: "center", marginTop: 4, marginBottom: 2 },
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
  selettoreLivello: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 6 },
  pillLivello: {
    backgroundColor: colori.bianco,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  pillLivelloAttiva: { backgroundColor: temaGiochi.rosa, borderColor: temaGiochi.rosa },
  pillLivelloTesto: { fontSize: 11.5, fontWeight: "700", color: colori.testoSecondario },
  pillLivelloTestoAttivo: { color: colori.bianco },

  gioco: { flex: 1, alignItems: "center", paddingTop: 10, gap: 10 },
  punteggi: { flexDirection: "row", gap: 10 },
  chipPunteggio: {
    alignItems: "center",
    backgroundColor: colori.bianco,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 110,
    borderWidth: 2,
    borderColor: "transparent",
  },
  chipPunteggioAttivo: { borderColor: temaGiochi.rosa },
  chipPunteggioEtichetta: { fontSize: 11, fontWeight: "700", color: colori.testoSecondario },
  chipPunteggioNumero: { fontSize: 18, fontWeight: "800", color: colori.testo },
  turnoTesto: { fontSize: 14.5, fontWeight: "800", color: colori.testo, minHeight: 20 },

  griglia: {
    width: COLONNE * LARGHEZZA_CARTA + (COLONNE - 1) * 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  cartaContenitore: { width: LARGHEZZA_CARTA, height: ALTEZZA_CARTA, position: "relative" },
  cartaAbbinata: { opacity: 0.45 },
  faccia: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    overflow: "hidden",
    ...ombraCard,
  },
  facciaFronte: { backgroundColor: colori.bianco },
  immagineCarta: { width: "100%", height: "100%" },

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
