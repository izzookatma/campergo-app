import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";

// Guida breve per i gestori: cosa si può fare dall'app, cosa dal sito e come
// funzionano prenotazioni e costi. Testi statici (schermata solo gestori).
const DOMANDE = [
  {
    d: "Cosa posso fare dall'app?",
    r: "Da «La mia struttura» puoi cambiare foto principale e galleria, nome, indirizzo, descrizione, telefono, sito e prezzo, scegliere i servizi offerti, misurare e fotografare le piazzole, creare offerte promo e rispondere alle recensioni. Gli avvisi di NaturaGo e dei clienti arrivano anche come notifica.",
  },
  {
    d: "Cosa devo fare dal sito?",
    r: "Calendario e sincronizzazione iCal, prezzi per periodo, creazione o eliminazione di piazzole e alloggi, attività nei dintorni e il resto delle impostazioni avanzate si gestiscono dal pannello gestori su www.naturago.it.",
  },
  {
    d: "Come faccio una buona scheda?",
    r: "Una foto principale vera e luminosa, 5-10 foto in galleria (ingresso, piazzole, servizi), una descrizione che dica per chi è adatta la struttura e i servizi spuntati giusti: i clienti filtrano proprio per questi. Aggiorna la scheda a ogni cambio di stagione.",
  },
  {
    d: "Come funzionano le prenotazioni e i costi?",
    r: "La vetrina è gratuita e non ci sono canoni fissi. Quando le prenotazioni sul sito saranno aperte (dal 1° aprile 2027) il cliente pagherà a NaturaGo una caparra del 15% del soggiorno, e il saldo resta dovuto a te, direttamente in struttura.",
  },
  {
    d: "Come uso le offerte promo?",
    r: "Scegli uno sconto in percentuale o un prezzo a notte, il periodo di validità e, se vuoi, giorni di arrivo e partenza o un minimo di notti. Il prezzo promo vale solo se è più basso di quello normale. Puoi sospendere l'offerta in qualsiasi momento.",
  },
  {
    d: "Come rispondo a una recensione?",
    r: "Da «Recensioni e risposte» tocca «Rispondi». La risposta è pubblica e la vedono tutti i clienti: mantieni un tono cortese, anche davanti a una critica.",
  },
  {
    d: "Non ricevo le notifiche",
    r: "Controlla che le notifiche di NaturaGo siano consentite nelle impostazioni del telefono, poi esci e rientra nell'app. Gli avvisi restano comunque elencati in «Avvisi».",
  },
];

export default function GuidaGestoreScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const [aperta, setAperta] = useState(0);

  return (
    <View style={styles.schermo}>
      <View style={styles.intestazione}>
        <Pressable accessibilityRole="button" accessibilityLabel="Indietro" hitSlop={8} style={styles.indietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={c.testo} />
        </Pressable>
        <Text style={styles.titolo}>Guida per i gestori</Text>
        <View style={styles.indietro} />
      </View>
      <ScrollView contentContainerStyle={styles.lista}>
        {DOMANDE.map((x, i) => {
          const on = aperta === i;
          return (
            <View key={x.d} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                style={styles.testa}
                onPress={() => setAperta(on ? -1 : i)}
              >
                <Text style={styles.domanda}>{x.d}</Text>
                <Ionicons name={on ? "chevron-up" : "chevron-down"} size={18} color={c.testoSecondario} />
              </Pressable>
              {on && <Text style={styles.risposta}>{x.r}</Text>}
            </View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          style={styles.contatto}
          onPress={() => Linking.openURL("mailto:info@naturago.it").catch(() => {})}
        >
          <Ionicons name="mail-outline" size={18} color={c.sulPrimario} />
          <Text style={styles.contattoTesto}>Scrivici: info@naturago.it</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.separatore, backgroundColor: c.sfondoGruppo },
    indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
    titolo: { fontSize: 14.5, fontWeight: "800", color: c.testo },
    lista: { padding: 16, gap: 10, paddingBottom: 40 },
    card: { backgroundColor: c.sfondoGruppo, borderRadius: raggio.l, paddingHorizontal: 14, ...ombra(c) },
    testa: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    domanda: { flex: 1, fontSize: 13.5, fontWeight: "700", color: c.testo },
    risposta: { fontSize: 13, color: c.testoSecondario, lineHeight: 19, paddingBottom: 14 },
    contatto: { marginTop: 8, minHeight: 48, borderRadius: 12, backgroundColor: c.primario, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    contattoTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 13.5 },
  });
}
