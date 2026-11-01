import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import RicercaIA from "../components/RicercaIA";
import { cercaStrutture } from "../lib/strutture";
import { REGIONI_ITALIANE } from "../lib/regioni";
import { caricaRicercheRecenti, salvaRicercaRecente, cancellaRicercheRecenti } from "../lib/ricercheRecenti";
import { useAuth } from "../context/AuthContext";

// Foto Unsplash: "Montagna e sentieri" e "Musei, borghi e attività" riusano
// quelle già in uso sul sito per lo stesso tema (CATEGORIE_INTERESSE in
// src/App.jsx), per coerenza visiva app/sito. "Dove dormire" usa invece un
// furgone in spiaggia al tramonto sul mare (Stefan Kranz su Unsplash): il
// furgone cade in basso a destra, lontano dall'etichetta in alto a sinistra.
const SEZIONI = [
  {
    titolo: "Dove dormire",
    icona: "bonfire-outline",
    colore: colori.blu,
    tinta: "rgba(0,88,124,0.08)",
    immagine: "https://images.unsplash.com/photo-1665677455995-9680bb0a5e18?auto=format&fit=crop&w=1000&h=280&q=70",
    tessere: [
      { etichetta: "Campeggi", icona: "bonfire-outline", filtro: "Campeggi" },
      { etichetta: "Agriturismi", icona: "leaf-outline", filtro: "Agriturismi" },
      { etichetta: "Agricampeggi", icona: "flower-outline", filtro: "Agricampeggi" },
      { etichetta: "Aree sosta", icona: "car-outline", filtro: "Aree sosta" },
      { etichetta: "Camper service", icona: "water-outline", filtro: "Camper service" },
    ],
  },
  {
    titolo: "Montagna e sentieri",
    icona: "trail-sign-outline",
    colore: "#15803d",
    tinta: "rgba(21,128,61,0.08)",
    immagine: "https://images.unsplash.com/photo-1761415451904-0a0a2c630ea9?auto=format&fit=crop&w=800&q=70",
    tessere: [
      { etichetta: "Sentieri", icona: "trail-sign-outline", schermo: "Sentieri" },
      { etichetta: "Rifugi", icona: "home-outline", filtro: "Rifugi" },
      { etichetta: "Bivacchi", icona: "bed-outline", filtro: "Bivacchi" },
      { etichetta: "Percorsi 4x4", icona: "car-sport-outline", schermo: "Percorsi4x4" },
      // Stessa schermata di "Sentieri": i sentieri hanno già il filtro
      // "a piedi / in bici / entrambi", non serve una seconda lista.
      { etichetta: "Bici e a piedi", icona: "bicycle-outline", schermo: "Sentieri" },
    ],
  },
  {
    // Stessa tabella del sito `eventi_campeggio` ("schede culturali"),
    // distinta dalla colonna categoria: 'musei' / 'borghi' / 'attivita'.
    titolo: "Musei, borghi e attività",
    icona: "color-palette-outline",
    colore: "#c2410c",
    tinta: "rgba(194,65,12,0.08)",
    immagine: "https://images.unsplash.com/photo-1775685921744-6f6596d33dd0?auto=format&fit=crop&w=800&q=70",
    tessere: [
      { etichetta: "Musei", icona: "color-palette-outline", categoriaCulturale: "musei", colore: "#7c3aed" },
      { etichetta: "Borghi", icona: "business-outline", categoriaCulturale: "borghi", colore: "#b45309" },
      { etichetta: "Attività locali", icona: "compass-outline", categoriaCulturale: "attivita", colore: "#0891b2" },
    ],
  },
];

export default function EsploraHubScreen({ navigation }) {
  const { session } = useAuth();
  const [testoRicerca, setTestoRicerca] = useState("");
  const [inputAFocus, setInputAFocus] = useState(false);
  const [ricercheRecenti, setRicercheRecenti] = useState([]);
  const [suggerimentiStrutture, setSuggerimentiStrutture] = useState([]);

  useEffect(() => {
    caricaRicercheRecenti().then(setRicercheRecenti);
  }, []);

  // Stessi suggerimenti "mentre si digita" della ricerca in EsploraLista
  // (regioni da un elenco fisso + poche strutture vere dal database), solo
  // con meno risultati: qui bastano per completare il tocco, non per
  // sfogliare una lista.
  useEffect(() => {
    const termine = testoRicerca.trim();
    if (termine.length < 2) {
      Promise.resolve().then(() => setSuggerimentiStrutture([]));
      return;
    }
    let annullato = false;
    const timer = setTimeout(() => {
      cercaStrutture({ termine, limite: 5 })
        .then((dati) => {
          if (!annullato) setSuggerimentiStrutture(dati);
        })
        .catch((e) => console.error("Errore nei suggerimenti di ricerca:", e));
    }, 300);
    return () => {
      annullato = true;
      clearTimeout(timer);
    };
  }, [testoRicerca]);

  // Ricerca/"vicino a te" raggiungibili da qui, senza dover prima toccare
  // una tessera o "Vedi tutte le strutture": un tap in meno per arrivare
  // alla lista vera, che ha già la ricerca completa (suggerimenti, ricerche
  // recenti, filtri) — qui basta avviarla, con le stesse regole (ricerche
  // recenti ricordate, suggerimenti mentre si scrive).
  const cercaETermina = (termine) => {
    const pulito = termine.trim();
    if (!pulito) return;
    salvaRicercaRecente(pulito).then(setRicercheRecenti);
    setInputAFocus(false);
    navigation.push("EsploraLista", { ricercaIniziale: pulito });
  };

  const avviaRicerca = () => cercaETermina(testoRicerca);

  const vaiVicinoAMe = () => {
    navigation.push("EsploraLista", { vicinoAMeIniziale: true });
  };

  const onRicercaIA = (risultato) => {
    if (risultato.categoria === "sentiero") {
      navigation.push("Sentieri", { regioneIniziale: risultato.regione, modalitaIniziale: risultato.modalita });
      return;
    }
    if (risultato.categoria === "percorso_4x4") {
      navigation.push("Percorsi4x4", {
        regioneIniziale: risultato.regione,
        difficoltaIniziale: risultato.difficolta,
        tipoVeicoloIniziale: risultato.tipoVeicolo,
      });
      return;
    }
    navigation.push("EsploraLista", {
      filtriIniziali: risultato.filtriTipo,
      ricercaIniziale: risultato.ricerca,
      serviziIniziali: risultato.filtriServizi,
    });
  };

  const vaiA = (tessera) => {
    if (tessera.inArrivo) {
      Alert.alert(tessera.etichetta, "Questa sezione arriverà in una prossima versione dell'app.");
      return;
    }
    // "push", non "navigate": se la schermata è già nello stack (ci si
    // era già stati), "navigate" la riuserebbe con il vecchio filtro.
    // "push" ne apre sempre una nuova, pulita.
    if (tessera.schermo) {
      navigation.push(tessera.schermo);
      return;
    }
    if (tessera.categoriaCulturale) {
      navigation.push("Cultura", { categoria: tessera.categoriaCulturale });
      return;
    }
    navigation.push("EsploraLista", { filtriIniziali: [tessera.filtro] });
  };

  // La foto e la scritta della sezione (non solo le tessere piccole sotto)
  // devono essere toccabili: è il primo istinto di chi guarda questa
  // schermata. "Dove dormire" ha tessere tutte dello stesso tipo (filtro
  // per EsploraLista): il tocco le mostra tutte insieme. Le altre due
  // sezioni mescolano destinazioni diverse (schermi propri, categorie
  // culturali): il tocco apre la prima tessera, la più rappresentativa.
  const vaiASezione = (sezione) => {
    if (sezione.titolo === "Dove dormire") {
      navigation.push("EsploraLista", {
        filtriIniziali: sezione.tessere.filter((t) => t.filtro).map((t) => t.filtro),
      });
      return;
    }
    vaiA(sezione.tessere[0]);
  };

  const termineSuggerimenti = testoRicerca.trim().toLowerCase();
  const regioniSuggerite =
    termineSuggerimenti.length >= 2
      ? REGIONI_ITALIANE.filter((r) => r.toLowerCase().includes(termineSuggerimenti)).slice(0, 3)
      : [];
  const mostraRicercheRecenti = termineSuggerimenti.length === 0 && ricercheRecenti.length > 0;
  const mostraTendina =
    inputAFocus && (regioniSuggerite.length > 0 || suggerimentiStrutture.length > 0 || mostraRicercheRecenti);

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.contenuto}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <MarchioNaturaGo style={{ marginBottom: 2 }} />

        <View style={styles.ricercaRapida}>
          <View style={styles.contenitoreRicerca}>
            <View style={styles.ricercaPill}>
              <Ionicons name="search" size={16} color={colori.testoSecondario} />
              <TextInput
                style={styles.inputRicerca}
                placeholder="Zona, regione, struttura…"
                placeholderTextColor={colori.testoSecondario}
                value={testoRicerca}
                onChangeText={setTestoRicerca}
                onSubmitEditing={avviaRicerca}
                onFocus={() => setInputAFocus(true)}
                onBlur={() => setTimeout(() => setInputAFocus(false), 150)}
                returnKeyType="search"
              />
            </View>

            {mostraTendina && (
              <View style={styles.tendina}>
                {mostraRicercheRecenti && (
                  <>
                    <View style={styles.tendinaIntestazione}>
                      <Text style={styles.tendinaIntestazioneTesto}>Ricerche recenti</Text>
                      <Pressable onPress={() => cancellaRicercheRecenti().then(setRicercheRecenti)} hitSlop={8}>
                        <Text style={styles.tendinaCancella}>Cancella</Text>
                      </Pressable>
                    </View>
                    {ricercheRecenti.map((termine) => (
                      <Pressable key={`recente-${termine}`} style={styles.rigaTendina} onPress={() => cercaETermina(termine)}>
                        <Ionicons name="time-outline" size={15} color={colori.testoSecondario} />
                        <Text style={styles.rigaTendinaTesto}>{termine}</Text>
                      </Pressable>
                    ))}
                  </>
                )}
                {regioniSuggerite.map((r) => (
                  <Pressable key={`regione-${r}`} style={styles.rigaTendina} onPress={() => cercaETermina(r)}>
                    <Ionicons name="map-outline" size={15} color={colori.blu} />
                    <Text style={styles.rigaTendinaTesto}>{r}</Text>
                    <Text style={styles.rigaTendinaEtichetta}>Regione</Text>
                  </Pressable>
                ))}
                {suggerimentiStrutture.map((s) => (
                  <Pressable
                    key={`struttura-${s.id}`}
                    style={styles.rigaTendina}
                    onPress={() => {
                      setInputAFocus(false);
                      navigation.navigate("Scheda", { struttura: s });
                    }}
                  >
                    <Ionicons name="business-outline" size={15} color={colori.testoSecondario} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rigaTendinaTesto} numberOfLines={1}>
                        {s.nome}
                      </Text>
                      {s.localita ? (
                        <Text style={styles.rigaTendinaSottotitolo} numberOfLines={1}>
                          {s.localita}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <Pressable style={styles.vicinoAMeRapido} onPress={vaiVicinoAMe}>
            <Ionicons name="navigate" size={16} color={colori.bianco} />
            <Text style={styles.vicinoAMeRapidoTesto}>Vicino a te ora</Text>
          </Pressable>

          {session && <RicercaIA onRisultato={onRicercaIA} />}
        </View>

        <Text style={styles.sottotitolo}>Oppure scegli cosa stai cercando</Text>

        {SEZIONI.map((sezione) => (
          <View key={sezione.titolo} style={[styles.sezione, { backgroundColor: sezione.tinta }]}>
            <Pressable onPress={() => vaiASezione(sezione)} style={({ pressed }) => pressed && styles.sezionePremuta}>
              <ImageBackground source={{ uri: sezione.immagine }} style={styles.sezioneBanner} imageStyle={styles.sezioneBannerImmagine}>
                <View style={[styles.sezioneEtichetta, { backgroundColor: sezione.colore }]}>
                  <Ionicons name={sezione.icona} size={14} color="#fff" />
                  <Text style={styles.sezioneTitolo}>{sezione.titolo}</Text>
                </View>
                <View style={styles.sezioneFreccia}>
                  <Ionicons name="chevron-forward" size={14} color="#fff" />
                </View>
              </ImageBackground>
            </Pressable>
            <View style={styles.griglia}>
              {sezione.tessere.map((tessera) => (
                <Pressable key={tessera.etichetta} style={styles.tessera} onPress={() => vaiA(tessera)}>
                  <View style={[styles.tesseraIcona, { backgroundColor: colori.bianco }]}>
                    <Ionicons name={tessera.icona} size={16} color={tessera.colore || sezione.colore} />
                  </View>
                  <Text style={styles.tesseraTesto}>{tessera.etichetta}</Text>
                  {tessera.inArrivo && <Text style={styles.tesseraArrivo}>In arrivo</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable style={styles.pulsanteTutte} onPress={() => navigation.push("EsploraLista")}>
          <Text style={styles.pulsanteTutteTesto}>Vedi tutte le strutture</Text>
          <Ionicons name="arrow-forward" size={15} color={colori.blu} />
        </Pressable>

        <View style={styles.rigaInfo}>
          <Pressable style={styles.pillInfo} onPress={() => navigation.push("Blog")}>
            <Ionicons name="book-outline" size={14} color={colori.testo} />
            <Text style={styles.pillInfoTesto}>Blog</Text>
          </Pressable>
          <Pressable style={styles.pillInfo} onPress={() => navigation.push("Faq")}>
            <Ionicons name="help-circle-outline" size={14} color={colori.testo} />
            <Text style={styles.pillInfoTesto}>Domande frequenti</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  contenuto: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, gap: 6 },
  sottotitolo: { fontSize: 13, fontWeight: "700", color: colori.testoSecondario, textAlign: "center", marginBottom: 2 },
  ricercaRapida: { gap: 8, marginBottom: 2 },
  contenitoreRicerca: { position: "relative", zIndex: 30 },
  tendina: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: colori.bianco,
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 31,
  },
  rigaTendina: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  rigaTendinaTesto: { flex: 1, fontSize: 12.5, fontWeight: "600", color: colori.testo },
  rigaTendinaSottotitolo: { fontSize: 10.5, color: colori.testoSecondario },
  rigaTendinaEtichetta: { fontSize: 10, fontWeight: "700", color: colori.blu, textTransform: "uppercase" },
  tendinaIntestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  tendinaIntestazioneTesto: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colori.testoSecondario,
  },
  tendinaCancella: { fontSize: 11, fontWeight: "700", color: colori.blu },
  ricercaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.bianco,
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 16,
  },
  inputRicerca: { flex: 1, fontSize: 13, color: colori.testo },
  vicinoAMeRapido: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colori.blu,
    height: 44,
    borderRadius: 12,
  },
  vicinoAMeRapidoTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13.5 },
  sezione: { borderRadius: 16, overflow: "hidden", paddingBottom: 8, gap: 4 },
  sezioneBanner: { width: "100%", height: 140 },
  sezioneBannerImmagine: { resizeMode: "cover" },
  // Riquadro piccolo, non una fascia su tutta la larghezza/altezza: così
  // non rischia di finire sopra al soggetto della foto (vedi commento sopra
  // a SEZIONI per "Dove dormire", dov'è già successo con una fascia intera).
  sezioneEtichetta: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sezioneTitolo: { fontSize: 13, fontWeight: "800", color: "#fff" },
  sezionePremuta: { opacity: 0.85 },
  sezioneFreccia: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  griglia: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 10, paddingTop: 6 },
  tessera: {
    width: "31%",
    aspectRatio: 1.7,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: 3,
  },
  tesseraIcona: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colori.bianco,
    alignItems: "center",
    justifyContent: "center",
  },
  tesseraTesto: { fontSize: 9.5, fontWeight: "700", color: colori.testo, textAlign: "center" },
  tesseraArrivo: { fontSize: 8, fontWeight: "700", color: colori.arancio, textTransform: "uppercase" },
  pulsanteTutte: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  pulsanteTutteTesto: { fontSize: 12, fontWeight: "700", color: colori.blu },
  rigaInfo: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 2 },
  pillInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colori.bianco,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillInfoTesto: { fontSize: 11, fontWeight: "700", color: colori.testo },
});
