import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { ETICHETTE_TIPO, ETICHETTA_RIFUGIO } from "../lib/strutture";
import { CATEGORIA_CULTURALE_META } from "../lib/cultura";
import { CATEGORIA_ITINERARIO_META } from "../lib/itinerari";

// Le card del piano giorno-per-giorno (genera-itinerario-ia), condivise tra
// PianificaViaggioScreen.js e CreaPercorso.js/MappaScreen.js — stessa idea
// del sito (src/PianoGiorno.jsx nel repo campergo), stesso riuso invece di
// due copie. "Dove dormire" a tre proposte distinte (campeggio, area
// sosta, libera o parcheggio), come il sito: chi pianifica un viaggio
// vero vuole confrontare le opzioni, non una sola struttura.

// Stessa forma di normalizzaCampeggio/normalizzaRifugio in lib/strutture.js:
// la funzione Edge manda solo i campi grezzi (id/nome/località/tipo/foto/
// lat/lng + "origine" = la tabella vera), qui si costruisce l'oggetto che
// SchedaScreen si aspetta (id con prefisso, etichetta del tipo leggibile).
export function struttureNavigazione(s) {
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

function CardStrutturaSingola({ struttura, etichetta, icona, navigation }) {
  if (!struttura) return null;
  return (
    <Pressable style={styles.cardBase} onPress={() => navigation.navigate("Scheda", { struttura: struttureNavigazione(struttura) })}>
      <Ionicons name={icona} size={16} color={colori.blu} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardBaseEtichetta}>{etichetta}</Text>
        <Text style={styles.cardBaseTitolo}>{struttura.nome}</Text>
        {struttura.localita ? <Text style={styles.cardBaseSottotitolo}>{struttura.localita}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colori.testoSecondario} />
    </Pressable>
  );
}

function SezioneDormire({ dormire, navigation }) {
  if (!dormire) return null;
  const libera = dormire.libera;
  const etichettaLibera = libera?.tipo === "sosta_libera" ? "Sosta libera" : "Parcheggio";
  if (!dormire.campeggio && !dormire.areaSosta && !libera) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.etichettaSezione}>Dove dormire</Text>
      <CardStrutturaSingola struttura={dormire.campeggio} etichetta="Campeggio" icona="bonfire-outline" navigation={navigation} />
      <CardStrutturaSingola struttura={dormire.areaSosta} etichetta="Area sosta" icona="bus-outline" navigation={navigation} />
      <CardStrutturaSingola struttura={libera} etichetta={etichettaLibera} icona="car-outline" navigation={navigation} />
    </View>
  );
}

function CardVoce({ voce, navigation }) {
  const meta = voce.tipo === "cultura" ? CATEGORIA_CULTURALE_META[voce.categoria] : CATEGORIA_ITINERARIO_META[voce.categoria];
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
          {voce.titolo}
        </Text>
        {sottotitolo ? <Text style={styles.voceSottotitolo}>{sottotitolo}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={colori.testoSecondario} />
    </Pressable>
  );
}

export function CardGiorno({ giorno, navigation }) {
  return (
    <View style={styles.cardGiorno}>
      <Text style={styles.numeroGiorno}>
        Giorno {giorno.numero}
        {giorno.tappa ? ` · ${giorno.tappa}` : ""}
      </Text>
      <Text style={styles.titoloGiorno}>{giorno.titolo}</Text>
      {giorno.nota ? <Text style={styles.notaGiorno}>{giorno.nota}</Text> : null}
      <SezioneDormire dormire={giorno.dormire} navigation={navigation} />
      {giorno.voci.map((v) => (
        <CardVoce key={`${v.tipo}-${v.id}`} voce={v} navigation={navigation} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
  etichettaSezione: { fontSize: 10.5, fontWeight: "700", color: colori.blu, textTransform: "uppercase" },
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
