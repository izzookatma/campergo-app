import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

const SEZIONI = [
  {
    titolo: "Dove dormire",
    icona: "bonfire-outline",
    colore: colori.bluChiaro,
    coloreTesto: colori.blu,
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
    colore: "#eef6ec",
    coloreTesto: "#2f6b3f",
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
    colore: "#fdf2e9",
    coloreTesto: "#b45309",
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
          <View key={sezione.titolo} style={[styles.sezione, { backgroundColor: sezione.colore }]}>
            <View style={styles.sezioneIntestazione}>
              <Ionicons name={sezione.icona} size={15} color={sezione.coloreTesto} />
              <Text style={[styles.sezioneTitolo, { color: sezione.coloreTesto }]}>{sezione.titolo}</Text>
            </View>
            <View style={styles.griglia}>
              {sezione.tessere.map((tessera) => (
                <Pressable key={tessera.etichetta} style={styles.tessera} onPress={() => vaiA(tessera)}>
                  <View style={styles.tesseraIcona}>
                    <Ionicons name={tessera.icona} size={16} color={tessera.colore || sezione.coloreTesto} />
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  contenuto: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 8 },
  sottotitolo: { fontSize: 15, fontWeight: "800", color: colori.testo, textAlign: "center", marginBottom: 2 },
  sezione: { borderRadius: 16, padding: 10, gap: 6 },
  sezioneIntestazione: { flexDirection: "row", alignItems: "center", gap: 6 },
  sezioneTitolo: { fontSize: 12.5, fontWeight: "800" },
  griglia: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tessera: {
    width: "31%",
    aspectRatio: 1.35,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: 4,
  },
  tesseraIcona: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    paddingVertical: 6,
  },
  pulsanteTutteTesto: { fontSize: 12, fontWeight: "700", color: colori.blu },
});
