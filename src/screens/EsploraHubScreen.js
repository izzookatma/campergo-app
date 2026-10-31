import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

// Foto Unsplash: "Montagna e sentieri" e "Musei, borghi e attività" riusano
// quelle già in uso sul sito per lo stesso tema (CATEGORIE_INTERESSE in
// src/App.jsx), per coerenza visiva app/sito. "Dove dormire" usa invece un
// furgone in spiaggia al tramonto sul mare (Stefan Kranz su Unsplash): il
// furgone cade in basso a destra, lontano dall'etichetta in alto a sinistra.
const SEZIONI = [
  {
    titolo: "Dove dormire",
    icona: "bonfire-outline",
    colore: "#1d4ed8",
    tinta: "rgba(29,78,216,0.08)",
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

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.contenuto} showsVerticalScrollIndicator={false}>
        <MarchioNaturaGo style={{ marginBottom: 2 }} />
        <Text style={styles.sottotitolo}>Cosa stai cercando?</Text>

        {SEZIONI.map((sezione) => (
          <View key={sezione.titolo} style={[styles.sezione, { backgroundColor: sezione.tinta }]}>
            <ImageBackground source={{ uri: sezione.immagine }} style={styles.sezioneBanner} imageStyle={styles.sezioneBannerImmagine}>
              <View style={[styles.sezioneEtichetta, { backgroundColor: sezione.colore }]}>
                <Ionicons name={sezione.icona} size={14} color="#fff" />
                <Text style={styles.sezioneTitolo}>{sezione.titolo}</Text>
              </View>
            </ImageBackground>
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
  sottotitolo: { fontSize: 15, fontWeight: "800", color: colori.testo, textAlign: "center", marginBottom: 2 },
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
