import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

// Domande frequenti (src/FaqPage.jsx sul sito): contenuto statico, non da
// tabella — se cambia una regola (commissione, cancellazioni...) va
// aggiornata anche qui, a mano, in entrambi i posti.
//
// Mirror a mano di PRENOTAZIONI_ATTIVE (src/avvisiSito.jsx sul sito, oggi
// false): le voci "finoAllApertura" valgono solo finché è falso.
const PRENOTAZIONI_ATTIVE = false;

function apriLink(href, navigation) {
  if (href === "/domande") {
    navigation.navigate("NuovaDomanda");
    return;
  }
  if (href.startsWith("mailto:")) {
    Linking.openURL(href);
    return;
  }
  Linking.openURL(href.startsWith("http") ? href : `https://www.naturago.it${href}`);
}

// Paragrafo con link in stile "[testo](percorso)", stessa idea di
// testoConLink sul sito: qui "/domande" resta dentro l'app, il resto apre
// il sito in browser (l'app non replica /chi-siamo, /termini, /privacy).
function Paragrafo({ testo, navigation }) {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parti = [];
  let ultimo = 0;
  let m;
  while ((m = re.exec(testo))) {
    if (m.index > ultimo) parti.push(testo.slice(ultimo, m.index));
    const href = m[2];
    parti.push(
      <Text key={m.index} style={styles.link} onPress={() => apriLink(href, navigation)}>
        {m[1]}
      </Text>
    );
    ultimo = re.lastIndex;
  }
  if (ultimo < testo.length) parti.push(testo.slice(ultimo));
  return <Text style={styles.risposta}>{parti}</Text>;
}

const FAQ_GESTORI = [
  {
    id: "chi-siamo",
    d: "Che cos'è NaturaGo e in cosa è diverso dalle altre piattaforme?",
    r: [
      "NaturaGo è un portale italiano per chi viaggia in camper, in van o in tenda: campeggi, agricampeggi, agriturismi, aree sosta, camper service e luoghi da visitare, tutto su una sola mappa.",
      "Siamo una startup agli inizi e lo diciamo apertamente ([chi siamo](/chi-siamo)). Ci rivolgiamo a chi cerca una sosta e ai gestori, spesso a conduzione familiare, che meritano di farsi trovare senza costi insostenibili: iscrizione gratuita, commissione solo sulle prenotazioni e recensioni solo da chi ha davvero soggiornato.",
    ],
  },
  {
    id: "costo",
    d: "Quanto costa registrarsi e pubblicare la mia struttura?",
    r: [
      "Niente. La registrazione e la pubblicazione sono gratuite: nessun canone, nessun abbonamento, nessun costo di iscrizione. NaturaGo guadagna solo con una commissione sulle prenotazioni che arrivano dal portale: se non arrivano prenotazioni, non paghi nulla.",
    ],
  },
  {
    id: "commissione",
    d: "Come funziona la commissione del 15%?",
    r: [
      "Quando un cliente prenota, versa a NaturaGo un acconto pari al 15% del totale del soggiorno: è il corrispettivo del servizio di intermediazione, che NaturaGo documenta fiscalmente in proprio nome. Il restante 85% lo paga il cliente direttamente a te, in struttura.",
      "Il meccanismo completo è descritto in [Come funziona il pagamento](/termini#pagamento).",
    ],
  },
  {
    id: "pagamenti",
    d: "Quando e come ricevo i pagamenti?",
    r: [
      "Il saldo (85% del totale) lo incassi tu direttamente dall'ospite, in struttura all'arrivo, e lo documenti fiscalmente tu secondo il tuo regime. Il 15% versato alla prenotazione è la commissione di NaturaGo.",
    ],
  },
  {
    id: "cancellazioni",
    d: "Cosa succede se un cliente cancella o non si presenta?",
    r: [
      "Il cliente può cancellare con rimborso integrale dell'acconto fino a 24 ore prima dell'orario di arrivo previsto. Oltre questo termine, e in caso di mancata presentazione, l'acconto non viene rimborsato al cliente ed è riconosciuto alla struttura a titolo di indennizzo: NaturaGo non trattiene alcuna somma.",
      "Le regole complete sono nei [Termini e condizioni](/termini#pagamento).",
    ],
  },
  {
    id: "apertura",
    finoAllApertura: true,
    d: "Quando apre il sito e quando arrivano le prime prenotazioni?",
    r: [
      "Il sito è online in versione di prova e apre ufficialmente al pubblico nell'estate 2027. Le prenotazioni non sono ancora attive e partiranno dal 1° aprile 2027: nel frattempo puoi già registrarti e preparare la tua scheda.",
    ],
  },
  {
    id: "prezzi-disponibilita",
    d: "Posso gestire io disponibilità, prezzi e condizioni di soggiorno?",
    r: [
      "Sì. Dalla tua area riservata gestisci piazzole e unità, prezzi e calendario: puoi chiudere dei periodi (manutenzione, uso privato) e impostare un prezzo diverso per un intervallo di date, per esempio l'alta stagione.",
      "In registrazione inserisci un prezzo base; i prezzi per periodo si impostano poi dal calendario di ciascuna unità. Orari di check-in e check-out, late check-out e orario limite per l'ingresso serale li decidi tu.",
    ],
  },
  {
    id: "attivita",
    d: "Posso inserire anche attività, escursioni o noleggi?",
    r: [
      "Sì. All'inizio della registrazione scegli cosa registrare: una struttura ricettiva (campeggio, area sosta, agricampeggio, agriturismo, alloggio fisso) oppure un'attività ricreativa, cioè tour guidati, escursioni, noleggi e altre attività per chi viaggia in camper, con orari prenotabili.",
    ],
  },
  {
    id: "dati-richiesti",
    d: "Quali dati servono per registrarsi? Servono l'IBAN o altri dati bancari?",
    r: [
      "Servono i dati della tua struttura: nome, indirizzo, descrizione e servizi offerti. I dati di fatturazione (nome del referente, partita IVA o codice fiscale, IBAN) sono facoltativi per ora: li vedono solo tu e il team di NaturaGo, non sono mai pubblici e puoi compilarli anche dopo.",
    ],
  },
  {
    id: "correggere-scheda",
    d: "La mia struttura è già su NaturaGo ma i dati sono sbagliati o incompleti: come li correggo?",
    r: [
      "Molte schede le abbiamo inserite noi a partire da fonti pubbliche, quindi possono avere dati vecchi o incompleti. Se hai ricevuto la nostra email con il link personale, aprilo: ti permette di rivendicare la scheda e correggerla, gratis.",
      "Se non hai il link, [scrivici](/domande) indicando nome e località della struttura: ti aiutiamo noi, senza creare schede doppie.",
    ],
  },
  {
    id: "modificare-dati",
    d: "Posso modificare i miei dati dopo la registrazione?",
    r: [
      "Sì: foto, piazzole, servizi e descrizione restano sempre modificabili liberamente, senza limiti. I dati di fatturazione (IBAN, ragione sociale, P.IVA), per sicurezza, si possono solo richiedere in modifica: verifichiamo noi prima di applicarla.",
    ],
  },
  {
    id: "togliere-scheda",
    d: "La mia attività è cambiata o non voglio comparire: come tolgo o correggo la scheda?",
    r: ["[Scrivici](/domande) indicando la struttura: se non offri più il servizio, o preferisci non comparire, la scheda va corretta o tolta e ce ne occupiamo noi."],
  },
  {
    id: "recensioni-gestori",
    d: "Chi può scrivere una recensione sulla mia struttura? Posso rispondere?",
    r: [
      "Solo chi ha davvero soggiornato da te, con una prenotazione confermata tramite NaturaGo, può lasciare una recensione. Tu puoi rispondere pubblicamente a ogni recensione ricevuta.",
    ],
  },
];

const FAQ_VIAGGIATORI = [
  {
    id: "prenotare",
    finoAllApertura: true,
    d: "Posso già prenotare su NaturaGo?",
    r: [
      "Non ancora. Il sito è online in versione di prova e aprirà al pubblico nell'estate 2027; le prenotazioni partiranno dal 1° aprile 2027. Intanto puoi esplorare la mappa, le schede di campeggi, aree sosta e camper service e i luoghi da visitare.",
    ],
  },
  {
    id: "pagamento",
    d: "Quanto pago e quando?",
    r: [
      "Alla prenotazione versi a NaturaGo il 15% del totale del soggiorno, come corrispettivo del servizio di intermediazione. Il restante 85% lo paghi direttamente alla struttura, al momento del soggiorno.",
      "Il meccanismo completo è descritto in [Come funziona il pagamento](/termini#pagamento).",
    ],
  },
  {
    id: "cancellare",
    d: "Posso cancellare una prenotazione?",
    r: [
      "Sì: fino a 24 ore prima dell'orario di arrivo previsto con rimborso integrale dell'acconto. Oltre questo termine, o se non ti presenti, l'acconto non viene rimborsato e viene riconosciuto alla struttura a titolo di indennizzo.",
    ],
  },
  {
    id: "salta-fila",
    d: "Cos'è «Salta Fila»?",
    r: [
      "Un servizio opzionale (5 €) che ti permette di segnalare in anticipo il tuo orario di arrivo, per avere priorità di accesso se alla struttura c'è coda.",
    ],
  },
  {
    id: "recensioni-viaggiatori",
    d: "Chi può lasciare una recensione?",
    r: [
      "Solo chi ha davvero soggiornato in una struttura, con una prenotazione confermata tramite NaturaGo: così le recensioni sono vere.",
    ],
  },
  {
    id: "dato-sbagliato",
    d: "Ho trovato un dato sbagliato in una scheda: come lo segnalo?",
    r: ["[Scrivici](/domande) indicando la struttura e cosa non è corretto: le schede sono state inserite da fonti pubbliche e le aggiorniamo volentieri."],
  },
  {
    id: "dati-personali",
    d: "Come posso chiedere la cancellazione del mio account o dei miei dati?",
    r: [
      "Scrivici a [info@naturago.it](mailto:info@naturago.it). Nella [Privacy](/privacy) trovi tutti i tuoi diritti (accesso, rettifica, cancellazione, opposizione) e come esercitarli.",
    ],
  },
];

function Domanda({ f, aperta, onToggle, navigation }) {
  return (
    <View style={styles.domanda}>
      <Pressable style={styles.domandaIntestazione} onPress={onToggle}>
        <Text style={styles.domandaTesto}>{f.d}</Text>
        <Ionicons name={aperta ? "chevron-up" : "chevron-down"} size={15} color={colori.testoSecondario} />
      </Pressable>
      {aperta && (
        <View style={styles.rispostaBox}>
          {f.r.map((p, i) => (
            <Paragrafo key={i} testo={p} navigation={navigation} />
          ))}
        </View>
      )}
    </View>
  );
}

function Gruppo({ titolo, voci, apertaId, onToggle, navigation }) {
  return (
    <View style={{ gap: 8, marginTop: 18 }}>
      <Text style={styles.gruppoTitolo}>{titolo}</Text>
      {voci.map((f) => (
        <Domanda key={f.id} f={f} aperta={apertaId === f.id} onToggle={() => onToggle(f.id)} navigation={navigation} />
      ))}
    </View>
  );
}

export default function FaqScreen({ navigation }) {
  const [apertaId, setApertaId] = useState(null);
  const gestori = FAQ_GESTORI.filter((f) => !(f.finoAllApertura && PRENOTAZIONI_ATTIVE));
  const viaggiatori = FAQ_VIAGGIATORI.filter((f) => !(f.finoAllApertura && PRENOTAZIONI_ATTIVE));

  const alterna = (id) => setApertaId((corrente) => (corrente === id ? null : id));

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.contenuto}>
        <MarchioNaturaGo onPress={() => navigation.navigate("EsploraHub")} />
        <Text style={styles.titolo}>Domande frequenti</Text>
        <Text style={styles.sottotitolo}>
          Le risposte alle domande che ci fanno più spesso, soprattutto i gestori di campeggi, aree sosta e strutture.
        </Text>

        <Gruppo titolo="Per i gestori di strutture e attività" voci={gestori} apertaId={apertaId} onToggle={alterna} navigation={navigation} />
        <Gruppo titolo="Per chi viaggia" voci={viaggiatori} apertaId={apertaId} onToggle={alterna} navigation={navigation} />

        <View style={styles.cassettaAiuto}>
          <Text style={styles.cassettaTitolo}>Non hai trovato la risposta?</Text>
          <Text style={styles.cassettaTesto}>Scrivici la tua domanda: ti rispondiamo via email, il prima possibile.</Text>
          <Pressable style={styles.cassettaPulsante} onPress={() => navigation.navigate("NuovaDomanda")}>
            <Text style={styles.cassettaPulsanteTesto}>Fai una domanda</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  contenuto: { padding: 20, paddingBottom: 40, gap: 4 },
  titolo: { fontSize: 20, fontWeight: "800", color: colori.testo, textAlign: "center", marginTop: 6 },
  sottotitolo: { fontSize: 12, color: colori.testoSecondario, textAlign: "center", marginTop: 4, marginBottom: 4 },
  gruppoTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo },
  domanda: { backgroundColor: colori.bianco, borderRadius: 12, borderWidth: 1, borderColor: colori.bordo, overflow: "hidden" },
  domandaIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 13 },
  domandaTesto: { flex: 1, fontSize: 12.5, fontWeight: "700", color: colori.testo },
  rispostaBox: { paddingHorizontal: 13, paddingBottom: 13, gap: 8 },
  risposta: { fontSize: 12, lineHeight: 18, color: "#4b5563" },
  link: { color: colori.blu, fontWeight: "700", textDecorationLine: "underline" },
  cassettaAiuto: { marginTop: 22, backgroundColor: colori.bianco, borderRadius: 16, padding: 18, alignItems: "center", gap: 6 },
  cassettaTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo, textAlign: "center" },
  cassettaTesto: { fontSize: 12, color: colori.testoSecondario, textAlign: "center" },
  cassettaPulsante: { marginTop: 8, backgroundColor: colori.arancio, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 11 },
  cassettaPulsanteTesto: { color: colori.bianco, fontWeight: "800", fontSize: 12.5 },
});
