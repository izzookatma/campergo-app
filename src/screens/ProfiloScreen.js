import { useCallback, useState } from "react";
import { View, Pressable, StyleSheet, Alert, Linking, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { usePreferenze } from "../context/PreferenzeContext";
import AccediScreen from "./AccediScreen";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import Testo from "../components/ui/Testo";
import Pulsante from "../components/ui/Pulsante";
import Chip from "../components/ui/Chip";
import { Gruppo, Riga } from "../components/ui/Gruppo";
import { caricaMiaStruttura } from "../lib/host";
import { registraNotifichePush } from "../lib/notifichePush";
import { useT, useLingua, impostaLingua } from "../i18n/i18n";
import { apriLink } from "../lib/linkEsterni";
import { LINGUE } from "../i18n/lingue";

const ASPETTI = [
  { chiave: "chiaro", chiaveTesto: "aspetto.chiaro" },
  { chiave: "scuro", chiaveTesto: "aspetto.scuro" },
  { chiave: "sistema", chiaveTesto: "aspetto.sistema" },
];

const MOTORI_MAPPA = [
  { chiave: "google", etichetta: "Google" },
  { chiave: "apple", etichetta: "Apple" },
  { chiave: "waze", etichetta: "Waze" },
];

function vociMenu(t) {
  return [
    { icona: "calendar-outline", testo: t("profilo.leMiePrenotazioni"), azione: "naviga", schermo: "Prenotazioni" },
    { icona: "create-outline", testo: t("vacanza.titolo"), azione: "naviga", schermo: "CreaVacanza" },
    { icona: "map-outline", testo: t("profilo.iMieiPianiViaggio"), azione: "naviga", schermo: "PianiSalvati" },
    { icona: "flag-outline", testo: t("profilo.segnalaStruttura"), azione: "naviga", schermo: "MieSegnalazioni" },
    { icona: "cloud-download-outline", testo: t("profilo.itinerariOffline"), azione: "naviga", schermo: "ItinerariOffline" },
    {
      icona: "notifications-outline",
      testo: t("profilo.notifiche"),
      azione: "impostazioni",
    },
    { icona: "help-circle-outline", testo: t("faq.titolo"), azione: "naviga", schermo: "Faq" },
    { icona: "shield-checkmark-outline", testo: t("profilo.privacyPolicy"), azione: "apri", url: "https://www.naturago.it/privacy" },
    { icona: "document-text-outline", testo: t("profilo.termini"), azione: "apri", url: "https://www.naturago.it/termini" },
  ];
}

export default function ProfiloScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const linguaAttuale = useLingua();
  const { session, esci } = useAuth();
  const { motoreMappa, setMotoreMappa, aspetto, setAspetto } = usePreferenze();

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
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={c.sulPrimario} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Testo v="corpoForte">{nomeUtente}</Testo>
            <Testo v="nota">{session.user.email}</Testo>
            <Testo v="nota" tono="primario" style={{ fontWeight: "600", marginTop: 2 }}>
              {t("profilo.modificaProfilo")}
            </Testo>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.testoSecondario} />
        </Pressable>

        {struttura && (
          <Pressable style={styles.struttura} onPress={() => navigation.navigate("MiaStruttura")}>
            <View style={styles.strutturaIcona}>
              <Ionicons name="camera" size={18} color={c.sulPrimario} />
            </View>
            <View style={styles.strutturaTesti}>
              <Testo v="corpoForte" style={{ color: c.sulPrimario }}>
                La mia struttura
              </Testo>
              <Testo v="nota" numberOfLines={1} style={{ color: c.sulPrimario, opacity: 0.85, marginTop: 1 }}>
                {struttura.nome} · foto e dati della vetrina
              </Testo>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.sulPrimario} />
          </Pressable>
        )}

        {!struttura && (
          <Pressable
            style={styles.struttura}
            onPress={() => apriLink("https://www.naturago.it/host?modo=registrati", t("comune.linkNonApribile"))}
            accessibilityRole="link"
            accessibilityLabel="Hai una struttura? Registrala su NaturaGo"
          >
            <View style={styles.strutturaIcona}>
              <Ionicons name="business" size={18} color={c.sulPrimario} />
            </View>
            <View style={styles.strutturaTesti}>
              <Testo v="corpoForte" style={{ color: c.sulPrimario }}>
                Hai una struttura?
              </Testo>
              <Testo v="nota" numberOfLines={1} style={{ color: c.sulPrimario, opacity: 0.85, marginTop: 1 }}>
                Registrala gratis su NaturaGo
              </Testo>
            </View>
            <Ionicons name="open-outline" size={16} color={c.sulPrimario} />
          </Pressable>
        )}

        <Gruppo>
          {vociMenu(t).map((voce) => (
            <Riga
              key={voce.testo}
              icona={voce.icona}
              testo={voce.testo}
              onPress={() => {
                if (voce.azione === "naviga") navigation.navigate(voce.schermo);
                else if (voce.azione === "apri") apriLink(voce.url, t("comune.linkNonApribile"));
                else if (voce.azione === "impostazioni") Linking.openSettings();
                else Alert.alert(voce.testo, voce.messaggio);
              }}
            />
          ))}
        </Gruppo>

        <View style={styles.sezione}>
          <Testo v="etichetta" style={{ textTransform: "uppercase", marginLeft: 16 }} accessibilityRole="header">
            {t("profilo.impostazioni")}
          </Testo>
          <View style={styles.impostazioneBox}>
            <Testo v="corpo">{t("profilo.motoreMappa")}</Testo>
            <View style={styles.segmentato}>
              {MOTORI_MAPPA.map((m) => (
                <Pressable
                  key={m.chiave}
                  style={[styles.segmento, motoreMappa === m.chiave && styles.segmentoAttivo]}
                  onPress={() => setMotoreMappa(m.chiave)}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.etichetta} ${t("profilo.motoreMappa")}`}
                  accessibilityState={{ selected: motoreMappa === m.chiave }}
                >
                  <Testo
                    v="secondario"
                    style={{ fontWeight: "600", color: motoreMappa === m.chiave ? c.sulPrimario : c.testoSecondario }}
                  >
                    {m.etichetta}
                  </Testo>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[styles.impostazioneBox, { marginTop: 10 }]}>
            <Testo v="corpo">{t("profilo.aspetto")}</Testo>
            <View style={styles.segmentato}>
              {ASPETTI.map((a) => (
                <Pressable
                  key={a.chiave}
                  style={[styles.segmento, aspetto === a.chiave && styles.segmentoAttivo]}
                  onPress={() => setAspetto(a.chiave)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("profilo.aspetto")}: ${t(a.chiaveTesto)}`}
                  accessibilityState={{ selected: aspetto === a.chiave }}
                >
                  <Testo v="secondario" style={{ fontWeight: "600", color: aspetto === a.chiave ? c.sulPrimario : c.testoSecondario }}>
                    {t(a.chiaveTesto)}
                  </Testo>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[styles.impostazioneBox, { marginTop: 10 }]}>
            <Testo v="corpo">{t("profilo.lingua")}</Testo>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
              {LINGUE.map((l) => (
                <Chip key={l.codice} etichetta={l.nome} compatto attivo={linguaAttuale === l.codice} onPress={() => impostaLingua(l.codice)} />
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Voce volutamente defilata (niente ombra/sfondo pieno come il
            resto del menu): i giochi sono un extra per i tempi morti del
            viaggio, non una funzione principale dell'app — non deve
            competere in visibilità con prenotazioni/preferiti/mappa. */}
        <Pressable
          style={styles.giochiRiga}
          onPress={() => navigation.navigate("GiochiHub")}
          accessibilityRole="button"
          accessibilityLabel={t("profilo.giochiDaViaggio")}
        >
          <Ionicons name="game-controller-outline" size={18} color={c.testoSecondario} />
          <Testo v="secondario" tono="secondario" style={{ flex: 1 }}>
            {t("profilo.giochiDaViaggio")}
          </Testo>
          <Ionicons name="chevron-forward" size={15} color={c.testoSecondario} />
        </Pressable>

        <Pulsante titolo={t("profilo.esci")} variante="pericolo" onPress={esci} />

        <Pressable
          style={styles.eliminaAccount}
          onPress={() => navigation.navigate("EliminaAccount")}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Testo v="nota">{t("profilo.eliminaAccount")}</Testo>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// Stili derivati dal tema (colori/raggi condivisi con il resto dell'app,
// vedi src/theme/tema.js): si ricreano a ogni render, costo trascurabile
// per una schermata che non è in una lista.
function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    contenuto: { padding: spazio.xl - 4, gap: spazio.xl - 4, paddingBottom: spazio.xxl },
    intestazione: { flexDirection: "row", alignItems: "center", gap: spazio.m },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.primario,
      alignItems: "center",
      justifyContent: "center",
    },
    struttura: {
      flexDirection: "row",
      alignItems: "center",
      gap: spazio.m,
      backgroundColor: c.primario,
      borderRadius: raggio.l,
      padding: spazio.m + 1,
      ...ombra(c),
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
    sezione: { gap: spazio.s },
    impostazioneBox: {
      backgroundColor: c.sfondoGruppo,
      borderRadius: raggio.l,
      padding: spazio.m + 1,
      gap: spazio.s + 2,
      ...ombra(c),
    },
    segmentato: { flexDirection: "row", backgroundColor: c.sfondo, borderRadius: raggio.s, padding: 3 },
    segmento: { flex: 1, height: 36, borderRadius: raggio.s - 2, alignItems: "center", justifyContent: "center" },
    segmentoAttivo: { backgroundColor: c.primario },
    giochiRiga: {
      flexDirection: "row",
      alignItems: "center",
      gap: spazio.s,
      borderWidth: 1,
      borderColor: c.separatore,
      borderRadius: raggio.m,
      paddingVertical: spazio.s + 2,
      paddingHorizontal: spazio.m,
    },
    eliminaAccount: { alignItems: "center", paddingVertical: spazio.s },
  });
}
