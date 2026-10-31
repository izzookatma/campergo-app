import { useCallback, useState } from "react";
import { View, Text, Pressable, Image, StyleSheet, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { usePreferenze } from "../context/PreferenzeContext";
import { urlMappa } from "../lib/mappa";
import AccediScreen from "./AccediScreen";

// Non esiste ancora una prenotazione vera da nessuna parte (il pulsante
// "Prenota subito" nella Scheda non è collegato a nulla, per scelta:
// dipende da PRENOTAZIONI_ATTIVE sul sito, oggi false). Questa funzione è
// il punto in cui andranno lette le prenotazioni vere quando esisteranno:
// per ogni voce, la stessa forma degli oggetti "struttura" usata altrove
// nell'app (vedi normalizzaCampeggio in src/lib/strutture.js) più
// checkIn/checkOut in formato ISO (YYYY-MM-DD).
async function caricaPrenotazioni(/* utenteId */) {
  return { future: [], passate: [] };
}

function formattaPeriodo(checkIn, checkOut) {
  const opzioni = { day: "numeric", month: "short" };
  const inizio = new Date(checkIn).toLocaleDateString("it-IT", opzioni);
  const fine = new Date(checkOut).toLocaleDateString("it-IT", opzioni);
  return `${inizio} → ${fine}`;
}

function CardPrenotazione({ prenotazione, navigation, motoreMappa }) {
  const { struttura, checkIn, checkOut } = prenotazione;

  const apriMappa = () => {
    const url = urlMappa(struttura, motoreMappa);
    if (url) Linking.openURL(url);
  };

  return (
    <Pressable style={styles.card} onPress={() => navigation.navigate("Scheda", { struttura })}>
      <View style={styles.cardFoto}>
        {struttura.fotoUrl ? (
          <Image source={{ uri: struttura.fotoUrl }} style={styles.cardImmagine} />
        ) : (
          <Ionicons name="image-outline" size={22} color={colori.blu} />
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTipo}>{struttura.tipo}</Text>
        <Text style={styles.cardNome}>{struttura.nome}</Text>
        <Text style={styles.cardPeriodo}>{formattaPeriodo(checkIn, checkOut)}</Text>
      </View>
      <Pressable style={styles.bottoneMappa} onPress={apriMappa} hitSlop={8}>
        <Ionicons name="navigate-outline" size={16} color={colori.blu} />
      </Pressable>
    </Pressable>
  );
}

function SezioneVuota({ icona, testo }) {
  return (
    <View style={styles.vuoto}>
      <Ionicons name={icona} size={24} color="#93c5fd" />
      <Text style={styles.vuotoTesto}>{testo}</Text>
    </View>
  );
}

export default function PrenotazioniScreen({ navigation }) {
  const { session } = useAuth();
  const { motoreMappa } = usePreferenze();
  const [future, setFuture] = useState([]);
  const [passate, setPassate] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  useFocusEffect(
    useCallback(() => {
      Promise.resolve().then(() => {
        if (!session?.user?.id) return;
        setCaricamento(true);
        caricaPrenotazioni(session.user.id).then((dati) => {
          setFuture(dati.future);
          setPassate(dati.passate);
          setCaricamento(false);
        });
      });
    }, [session])
  );

  if (!session) return <AccediScreen />;

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colori.testo} />
        </Pressable>
        <Text style={styles.titolo}>Le mie prenotazioni</Text>
        <View style={{ width: 20 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.contenuto}>
        <Text style={styles.sezioneTitolo}>Prenotazioni</Text>
        {!caricamento && future.length === 0 ? (
          <SezioneVuota
            icona="calendar-outline"
            testo="Qui vedrai le strutture che hai prenotato, con la scheda e la mappa a portata di mano."
          />
        ) : (
          future.map((p) => (
            <CardPrenotazione key={p.id} prenotazione={p} navigation={navigation} motoreMappa={motoreMappa} />
          ))
        )}

        <Text style={[styles.sezioneTitolo, { marginTop: 22 }]}>I tuoi soggiorni</Text>
        {!caricamento && passate.length === 0 ? (
          <SezioneVuota
            icona="time-outline"
            testo="Qui compariranno i posti dove hai già soggiornato, con le date del soggiorno."
          />
        ) : (
          passate.map((p) => (
            <CardPrenotazione key={p.id} prenotazione={p} navigation={navigation} motoreMappa={motoreMappa} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colori.bianco,
    borderBottomWidth: 1,
    borderBottomColor: colori.bordo,
  },
  titolo: { fontSize: 14, fontWeight: "800", color: colori.testo },
  contenuto: { padding: 20, gap: 10 },
  sezioneTitolo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colori.testoSecondario,
    marginBottom: 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colori.bianco,
    borderRadius: 14,
    padding: 10,
  },
  cardFoto: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 2 },
  cardTipo: { fontSize: 10, fontWeight: "700", color: colori.blu },
  cardNome: { fontSize: 13, fontWeight: "700", color: colori.testo },
  cardPeriodo: { fontSize: 11, color: colori.testoSecondario },
  bottoneMappa: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
  },
  vuoto: {
    backgroundColor: colori.bianco,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  vuotoTesto: { fontSize: 12, color: colori.testoSecondario, textAlign: "center", lineHeight: 18 },
});
