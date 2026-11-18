import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Linking, Image, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { usePreferenze } from "../context/PreferenzeContext";
import AccediScreen from "./AccediScreen";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import Testo from "../components/ui/Testo";
import Pulsante from "../components/ui/Pulsante";
import { Gruppo, Riga } from "../components/ui/Gruppo";
import { caricaMiaStruttura } from "../lib/host";
import { registraNotifichePush } from "../lib/notifichePush";

const MOTORI_MAPPA = [
  { chiave: "google", etichetta: "Google" },
  { chiave: "apple", etichetta: "Apple" },
  { chiave: "waze", etichetta: "Waze" },
];

const VOCI_MENU = [
  { icona: "calendar-outline", testo: "Le mie prenotazioni", azione: "naviga", schermo: "Prenotazioni" },
  { icona: "map-outline", testo: "I miei piani di viaggio", azione: "naviga", schermo: "PianiSalvati" },
  { icona: "game-controller-outline", testo: "Giochi da viaggio", azione: "naviga", schermo: "GiochiHub" },
  { icona: "flag-outline", testo: "Segnala una struttura mancante", azione: "naviga", schermo: "MieSegnalazioni" },
  {
    icona: "notifications-outline",
    testo: "Notifiche",
    azione: "impostazioni",
  },
  { icona: "shield-checkmark-outline", testo: "Privacy policy", azione: "apri", url: "https://www.naturago.it/privacy" },
  { icona: "document-text-outline", testo: "Termini e condizioni", azione: "apri", url: "https://www.naturago.it/termini" },
];

export default function ProfiloScreen({ navigation }) {
  const { session, esci } = useAuth();
  const { motoreMappa, setMotoreMappa } = usePreferenze();

  // La voce "La mia struttura" compare solo a chi gestisce davvero una
  // scheda (stesso account del sito): per i clienti il Profilo resta
  // identico a prima. Ricontrollato a ogni ritorno sulla pagina, così
  // compare anche subito dopo un accesso. Se il controllo fallisce (rete)
  // la voce semplicemente non c'è: nessun errore davanti a un cliente.
  const utenteId = session?.user?.id;
  const [struttura, setStruttura] = useState(null);
  useFocusEffect(
    useCallback(() => {
      let attivo = true;
      if (!utenteId) {
        setStruttura(null);
        return undefined;
      }
      caricaMiaStruttura(utenteId)
        .then((s) => {
          if (attivo) setStruttura(s);
          if (attivo && s) registraNotifichePush(utenteId);
        })
        .catch((e) => console.error("[NaturaGo app] caricaMiaStruttura", e));
      return () => {
        attivo = false;
      };
    }, [utenteId])
  );

  if (!session) return <AccediScreen />;

  const meta = session.user.user_metadata || {};
  const nomeUtente = meta.nome || meta.full_name || "Il tuo profilo";
  const avatarUrl = meta.avatar_url || meta.picture || null;

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.contenuto} showsVerticalScrollIndicator={false}>
        <MarchioNaturaGo />

        <Pressable
          style={styles.intestazione}
          onPress={() => navigation.navigate("ModificaProfilo")}
          accessibilityRole="button"
          accessibilityLabel="Apri il tuo profilo"
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={colori.bianco} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Testo v="corpoForte">{nomeUtente}</Testo>
            <Testo v="nota">{session.user.email}</Testo>
            <Testo v="nota" tono="primario" style={{ fontWeight: "600", marginTop: 2 }}>
              Modifica profilo
            </Testo>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colori.testoSecondario} />
        </Pressable>

        {struttura && (
          <Pressable style={styles.struttura} onPress={() => navigation.navigate("MiaStruttura")}>
            <View style={styles.strutturaIcona}>
              <Ionicons name="camera" size={18} color={colori.bianco} />
            </View>
            <View style={styles.strutturaTesti}>
              <Text style={styles.strutturaTitolo}>La mia struttura</Text>
              <Text style={styles.strutturaNome} numberOfLines={1}>
                {struttura.nome} · foto e dati della vetrina
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colori.bianco} />
          </Pressable>
        )}

        {!struttura && (
          <Pressable
            style={styles.struttura}
            onPress={() => Linking.openURL("https://www.naturago.it/host?modo=registrati")}
            accessibilityRole="link"
            accessibilityLabel="Hai una struttura? Registrala su NaturaGo"
          >
            <View style={styles.strutturaIcona}>
              <Ionicons name="business" size={18} color={colori.bianco} />
            </View>
            <View style={styles.strutturaTesti}>
              <Text style={styles.strutturaTitolo}>Hai una struttura?</Text>
              <Text style={styles.strutturaNome} numberOfLines={1}>
                Registrala gratis su NaturaGo
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colori.bianco} />
          </Pressable>
        )}

        <Gruppo>
          {VOCI_MENU.map((voce) => (
            <Riga
              key={voce.testo}
              icona={voce.icona}
              testo={voce.testo}
              onPress={() => {
                if (voce.azione === "naviga") navigation.navigate(voce.schermo);
                else if (voce.azione === "apri") Linking.openURL(voce.url);
                else if (voce.azione === "impostazioni") Linking.openSettings();
                else Alert.alert(voce.testo, voce.messaggio);
              }}
            />
          ))}
        </Gruppo>

        <View style={styles.sezione}>
          <Testo v="etichetta" style={{ textTransform: "uppercase", marginLeft: 16 }} accessibilityRole="header">
            Impostazioni
          </Testo>
          <View style={styles.impostazioneBox}>
            <Testo v="corpo">Motore mappa</Testo>
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

        <Pulsante titolo="Esci" variante="pericolo" onPress={esci} />

        <Pressable
          style={styles.eliminaAccount}
          onPress={() => navigation.navigate("EliminaAccount")}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Testo v="nota">Elimina il mio account</Testo>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  contenuto: { padding: 20, gap: 20, paddingBottom: 32 },
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
  struttura: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colori.blu,
    borderRadius: raggioCard,
    padding: 13,
    ...ombraCard,
  },
  strutturaIcona: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  strutturaTesti: { flex: 1 },
  strutturaTitolo: { color: colori.bianco, fontWeight: "700", fontSize: 16 },
  strutturaNome: { color: "rgba(255,255,255,.85)", fontSize: 13, marginTop: 1 },
  menu: { backgroundColor: colori.bianco, borderRadius: raggioCard, ...ombraCard },
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
  impostazioneBox: { backgroundColor: colori.bianco, borderRadius: raggioCard, padding: 13, gap: 10, ...ombraCard },
  impostazioneEtichetta: { fontSize: 12.5, fontWeight: "600", color: colori.testo },
  segmentato: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 10, padding: 3 },
  segmento: { flex: 1, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  segmentoAttivo: { backgroundColor: colori.blu },
  segmentoTesto: { fontSize: 14, fontWeight: "600", color: colori.testoSecondario },
  segmentoTestoAttivo: { color: colori.bianco, fontWeight: "600" },
  esci: { marginTop: "auto", alignItems: "center", paddingVertical: 12 },
  esciTesto: { color: colori.rosso, fontWeight: "700", fontSize: 12.5 },
  eliminaAccount: { alignItems: "center", paddingVertical: 8 },
  eliminaAccountTesto: { color: colori.testoSecondario, fontWeight: "600", fontSize: 11 },
});
