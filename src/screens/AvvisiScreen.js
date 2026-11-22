import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { caricaAvvisi, segnaAvvisiLetti } from "../lib/host";

const ICONE = { prenotazione: "calendar", recensione: "star", messaggio: "mail" };

function formattaData(iso) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

// Avvisi del gestore: nuove richieste, recensioni e messaggi di NaturaGo.
// I non letti hanno il pallino; si segnano letti toccando l'avviso o con
// «Segna tutti come letti».
export default function AvvisiScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const { session } = useAuth();
  const utenteId = session?.user?.id;
  const [avvisi, setAvvisi] = useState([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let attivo = true;
      setErrore(null);
      caricaAvvisi(utenteId)
        .then((a) => attivo && setAvvisi(a))
        .catch((e) => {
          console.error("[NaturaGo app] caricaAvvisi", e);
          if (attivo) setErrore(messaggioErroreComprensibile(e, "Non è stato possibile aprire gli avvisi."));
        })
        .finally(() => attivo && setCaricando(false));
      return () => {
        attivo = false;
      };
    }, [utenteId]),
  );

  const segna = async (ids) => {
    setAvvisi((a) => a.map((x) => (!ids || ids.includes(x.id) ? { ...x, letto: true } : x)));
    try {
      await segnaAvvisiLetti(utenteId, ids);
    } catch (e) {
      console.error("[NaturaGo app] segnaAvvisiLetti", e);
    }
  };

  const nonLetti = avvisi.filter((a) => !a.letto).length;

  return (
    <View style={styles.schermo}>
      <View style={styles.intestazione}>
        <Pressable accessibilityRole="button" accessibilityLabel="Indietro" hitSlop={8} style={styles.indietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={c.testo} />
        </Pressable>
        <Text style={styles.titolo}>Avvisi</Text>
        <Pressable style={styles.indietro} disabled={!nonLetti} onPress={() => segna(null)}>
          <Ionicons name="checkmark-done" size={20} color={nonLetti ? c.primario : c.separatore} />
        </Pressable>
      </View>
      {caricando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={c.primario} />
        </View>
      ) : (
        <FlatList
          data={avvisi}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<Text style={styles.nota}>{errore ?? "Nessun avviso per ora. Qui compariranno nuove richieste, recensioni e messaggi di NaturaGo."}</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => !item.letto && segna([item.id])}>
              <View style={styles.icona}>
                <Ionicons name={ICONE[item.tipo] ?? "notifications"} size={17} color={c.sulPrimario} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.cardTitolo, !item.letto && styles.grassetto]}>{item.titolo}</Text>
                {!!item.testo && <Text style={styles.cardTesto}>{item.testo}</Text>}
              </View>
              <View style={styles.destra}>
                <Text style={styles.data}>{formattaData(item.creato_il)}</Text>
                {!item.letto && <View style={styles.pallino} />}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondo },
  intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.separatore, backgroundColor: c.sfondoGruppo },
  indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  titolo: { fontSize: 14.5, fontWeight: "800", color: c.testo },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  lista: { padding: 16, gap: 10 },
  nota: { fontSize: 12.5, color: c.testoSecondario, lineHeight: 18, textAlign: "center", marginTop: 30 },
  card: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: c.sfondoGruppo, borderRadius: raggio.l, padding: 12, ...ombra(c) },
  icona: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
  flex1: { flex: 1, gap: 2 },
  cardTitolo: { fontSize: 13, color: c.testo },
  grassetto: { fontWeight: "800" },
  cardTesto: { fontSize: 12, color: c.testoSecondario, lineHeight: 17 },
  destra: { alignItems: "flex-end", gap: 6 },
  data: { fontSize: 11, color: c.testoSecondario },
  pallino: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.pericolo },
  });
}
