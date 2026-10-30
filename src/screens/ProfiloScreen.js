import { View, Text, Pressable, StyleSheet, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { usePreferenze } from "../context/PreferenzeContext";
import AccediScreen from "./AccediScreen";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

const MOTORI_MAPPA = [
  { chiave: "google", etichetta: "Google" },
  { chiave: "apple", etichetta: "Apple" },
  { chiave: "waze", etichetta: "Waze" },
];

const VOCI_MENU = [
  { icona: "calendar-outline", testo: "Le mie prenotazioni", azione: "naviga", schermo: "Prenotazioni" },
  { icona: "flag-outline", testo: "Segnala una struttura mancante", azione: "naviga", schermo: "MieSegnalazioni" },
  {
    icona: "notifications-outline",
    testo: "Notifiche",
    azione: "avviso",
    messaggio: "Le notifiche push arriveranno in una prossima versione dell'app.",
  },
  { icona: "shield-checkmark-outline", testo: "Privacy policy", azione: "apri", url: "https://www.naturago.it/privacy" },
  { icona: "document-text-outline", testo: "Termini e condizioni", azione: "apri", url: "https://www.naturago.it/termini" },
];

export default function ProfiloScreen({ navigation }) {
  const { session, esci } = useAuth();
  const { motoreMappa, setMotoreMappa } = usePreferenze();

  if (!session) return <AccediScreen />;

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.contenuto}>
        <MarchioNaturaGo />

        <View style={styles.intestazione}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color={colori.bianco} />
          </View>
          <View>
            <Text style={styles.nome}>{session.user.user_metadata?.nome || "Il tuo profilo"}</Text>
            <Text style={styles.email}>{session.user.email}</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {VOCI_MENU.map((voce, i) => (
            <Pressable
              key={voce.testo}
              style={[styles.vocemenu, i < VOCI_MENU.length - 1 && styles.vocemenuBordo]}
              onPress={() => {
                if (voce.azione === "naviga") navigation.navigate(voce.schermo);
                else if (voce.azione === "apri") Linking.openURL(voce.url);
                else Alert.alert(voce.testo, voce.messaggio);
              }}
            >
              <Ionicons name={voce.icona} size={17} color={colori.blu} />
              <Text style={styles.vocemenuTesto}>{voce.testo}</Text>
              <Ionicons name="chevron-forward" size={14} color={colori.testoSecondario} />
            </Pressable>
          ))}
        </View>

        <View style={styles.sezione}>
          <Text style={styles.sezioneTitolo}>Impostazioni</Text>
          <View style={styles.impostazioneBox}>
            <Text style={styles.impostazioneEtichetta}>Motore mappa</Text>
            <View style={styles.segmentato}>
              {MOTORI_MAPPA.map((m) => (
                <Pressable
                  key={m.chiave}
                  style={[styles.segmento, motoreMappa === m.chiave && styles.segmentoAttivo]}
                  onPress={() => setMotoreMappa(m.chiave)}
                >
                  <Text style={[styles.segmentoTesto, motoreMappa === m.chiave && styles.segmentoTestoAttivo]}>
                    {m.etichetta}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable style={styles.esci} onPress={esci}>
          <Text style={styles.esciTesto}>Esci</Text>
        </Pressable>

        <Pressable style={styles.eliminaAccount} onPress={() => navigation.navigate("EliminaAccount")}>
          <Text style={styles.eliminaAccountTesto}>Elimina il mio account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  contenuto: { flex: 1, padding: 20, gap: 18 },
  intestazione: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
  },
  nome: { fontWeight: "800", fontSize: 15, color: colori.testo },
  email: { fontSize: 11.5, color: colori.testoSecondario },
  menu: { backgroundColor: colori.bianco, borderRadius: 14, overflow: "hidden" },
  vocemenu: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13 },
  vocemenuBordo: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  vocemenuTesto: { flex: 1, fontSize: 12.5, fontWeight: "600", color: colori.testo },
  sezione: { gap: 8 },
  sezioneTitolo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colori.testoSecondario,
  },
  impostazioneBox: { backgroundColor: colori.bianco, borderRadius: 14, padding: 13, gap: 10 },
  impostazioneEtichetta: { fontSize: 12.5, fontWeight: "600", color: colori.testo },
  segmentato: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 10, padding: 3 },
  segmento: { flex: 1, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  segmentoAttivo: { backgroundColor: colori.blu },
  segmentoTesto: { fontSize: 11.5, fontWeight: "600", color: colori.testoSecondario },
  segmentoTestoAttivo: { color: colori.bianco, fontWeight: "700" },
  esci: { marginTop: "auto", alignItems: "center", paddingVertical: 12 },
  esciTesto: { color: colori.rosso, fontWeight: "700", fontSize: 12.5 },
  eliminaAccount: { alignItems: "center", paddingVertical: 4, paddingBottom: 10 },
  eliminaAccountTesto: { color: colori.testoSecondario, fontWeight: "600", fontSize: 11 },
});
