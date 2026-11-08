import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from "react-native";
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
//
// "Cambia" (candidati/onCambiaDormire/onCambiaVoce su CardGiorno) è
// facoltativo: solo PianificaViaggioScreen.js lo passa (ha le alternative
// vere della tappa, tappeCandidati della edge function), CreaPercorso.js/
// MappaScreen.js continua a chiamare CardGiorno senza, nessun pulsante
// "Cambia" compare lì e il comportamento resta quello di sempre.

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

// Elenco a comparsa per scegliere un'alternativa (dove dormire o cosa
// visitare) tra le schede vere trovate nei dintorni della stessa tappa —
// stesso stile a pagina intera già usato per il piano in MappaScreen.js.
function ModaleScelta({ visibile, titolo, opzioni, onScegli, onChiudi }) {
  return (
    <Modal visible={visibile} animationType="slide" presentationStyle="pageSheet" onRequestClose={onChiudi}>
      <View style={styles.modaleSchermo}>
        <View style={styles.modaleIntestazione}>
          <Text style={styles.modaleTitolo}>{titolo}</Text>
          <Pressable onPress={onChiudi} hitSlop={10}>
            <Ionicons name="close" size={22} color={colori.testo} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modaleContenuto}>
          {opzioni.map((o, i) => (
            <Pressable key={`${o.id}-${i}`} style={styles.modaleRiga} onPress={() => onScegli(o)}>
              <Text style={styles.modaleRigaTitolo}>{o.nome || o.titolo}</Text>
              {o.localita || o.citta || o.regione ? (
                <Text style={styles.modaleRigaSottotitolo}>{o.localita || o.citta || o.regione}</Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PulsanteCambia({ onPress }) {
  return (
    <Pressable style={styles.cambiaLink} onPress={onPress} hitSlop={6}>
      <Ionicons name="swap-horizontal" size={12} color={colori.blu} />
      <Text style={styles.cambiaTesto}>Cambia</Text>
    </Pressable>
  );
}

function CardStrutturaSingola({ struttura, etichetta, icona, navigation, alternative, onCambia }) {
  const [apertoScelta, setApertoScelta] = useState(false);
  if (!struttura) return null;
  const altreOpzioni = onCambia
    ? (alternative || []).filter((o) => !(o.id === struttura.id && (o.tipo ?? null) === (struttura.tipo ?? null)))
    : [];
  return (
    <View style={{ gap: 4 }}>
      <Pressable style={styles.cardBase} onPress={() => navigation.navigate("Scheda", { struttura: struttureNavigazione(struttura) })}>
        <Ionicons name={icona} size={16} color={colori.blu} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardBaseEtichetta}>{etichetta}</Text>
          <Text style={styles.cardBaseTitolo}>{struttura.nome}</Text>
          {struttura.localita ? <Text style={styles.cardBaseSottotitolo}>{struttura.localita}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colori.testoSecondario} />
      </Pressable>
      {onCambia && altreOpzioni.length > 0 && <PulsanteCambia onPress={() => setApertoScelta(true)} />}
      {onCambia && (
        <ModaleScelta
          visibile={apertoScelta}
          titolo={`Scegli ${etichetta.toLowerCase()}`}
          opzioni={altreOpzioni}
          onScegli={(o) => {
            setApertoScelta(false);
            onCambia(o);
          }}
          onChiudi={() => setApertoScelta(false)}
        />
      )}
    </View>
  );
}

function SezioneDormire({ dormire, navigation, candidati, onCambia }) {
  if (!dormire) return null;
  const libera = dormire.libera;
  const etichettaLibera = libera?.tipo === "sosta_libera" ? "Sosta libera" : "Parcheggio";
  if (!dormire.campeggio && !dormire.areaSosta && !libera) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.etichettaSezione}>Dove dormire</Text>
      <CardStrutturaSingola
        struttura={dormire.campeggio}
        etichetta="Campeggio"
        icona="bonfire-outline"
        navigation={navigation}
        alternative={candidati?.campeggio}
        onCambia={onCambia ? (scelta) => onCambia("campeggio", scelta) : null}
      />
      <CardStrutturaSingola
        struttura={dormire.areaSosta}
        etichetta="Area sosta"
        icona="bus-outline"
        navigation={navigation}
        alternative={candidati?.areaSosta}
        onCambia={onCambia ? (scelta) => onCambia("areaSosta", scelta) : null}
      />
      <CardStrutturaSingola
        struttura={libera}
        etichetta={etichettaLibera}
        icona="car-outline"
        navigation={navigation}
        alternative={candidati?.libera}
        onCambia={onCambia ? (scelta) => onCambia("libera", scelta) : null}
      />
    </View>
  );
}

function CardVoce({ voce, navigation, alternative, onCambia }) {
  const [apertoScelta, setApertoScelta] = useState(false);
  const meta = voce.tipo === "cultura" ? CATEGORIA_CULTURALE_META[voce.categoria] : CATEGORIA_ITINERARIO_META[voce.categoria];
  const sottotitolo = voce.tipo === "cultura" ? voce.citta : voce.regione;
  const onPress = () =>
    voce.tipo === "cultura"
      ? navigation.navigate("SchedaCulturale", { id: voce.id })
      : navigation.navigate("ItinerarioDettaglio", { itinerarioId: voce.id });
  const altreOpzioni = onCambia ? (alternative || []).filter((o) => !(o.id === voce.id && o.tipo === voce.tipo)) : [];
  return (
    <View>
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
      {onCambia && altreOpzioni.length > 0 && <PulsanteCambia onPress={() => setApertoScelta(true)} />}
      {onCambia && (
        <ModaleScelta
          visibile={apertoScelta}
          titolo="Scegli cosa visitare"
          opzioni={altreOpzioni}
          onScegli={(o) => {
            setApertoScelta(false);
            onCambia(o);
          }}
          onChiudi={() => setApertoScelta(false)}
        />
      )}
    </View>
  );
}

export function CardGiorno({ giorno, navigation, candidati, onCambiaDormire, onCambiaVoce }) {
  const alternativeVoci = candidati ? [...(candidati.cultura || []), ...(candidati.itinerari || [])] : undefined;
  return (
    <View style={styles.cardGiorno}>
      <Text style={styles.numeroGiorno}>
        Giorno {giorno.numero}
        {giorno.tappa ? ` · ${giorno.tappa}` : ""}
      </Text>
      <Text style={styles.titoloGiorno}>{giorno.titolo}</Text>
      {giorno.nota ? <Text style={styles.notaGiorno}>{giorno.nota}</Text> : null}
      <SezioneDormire dormire={giorno.dormire} navigation={navigation} candidati={candidati} onCambia={onCambiaDormire} />
      {giorno.voci.map((v, indice) => (
        <CardVoce
          key={`${v.tipo}-${v.id}`}
          voce={v}
          navigation={navigation}
          alternative={alternativeVoci}
          onCambia={onCambiaVoce ? (nuovaVoce) => onCambiaVoce(indice, nuovaVoce) : null}
        />
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
  cambiaLink: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingLeft: 10, paddingVertical: 2 },
  cambiaTesto: { fontSize: 10.5, fontWeight: "700", color: colori.blu },
  modaleSchermo: { flex: 1, backgroundColor: colori.bianco },
  modaleIntestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colori.bordo,
  },
  modaleTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo, flex: 1, marginRight: 10 },
  modaleContenuto: { padding: 16, gap: 8 },
  modaleRiga: { backgroundColor: colori.bluChiaro, borderRadius: 12, padding: 12 },
  modaleRigaTitolo: { fontSize: 13, fontWeight: "700", color: colori.testo },
  modaleRigaSottotitolo: { fontSize: 11, color: colori.testoSecondario, marginTop: 2 },
});
