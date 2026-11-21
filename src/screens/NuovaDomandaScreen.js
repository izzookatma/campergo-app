import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { inviaDomanda } from "../lib/domanda";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { useT } from "../i18n/i18n";
import { apriLink } from "../lib/linkEsterni";

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_MESSAGGIO = 10;

// "Fai una domanda" (src/DomandaPage.jsx sul sito): chiunque, anche senza
// account, scrive qui — non richiede login, a differenza di altre schermate
// del Profilo.
export default function NuovaDomandaScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { session } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [messaggio, setMessaggio] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(null);
  const [inviataA, setInviataA] = useState(null);

  const invia = async () => {
    const emailPulita = email.trim();
    const testo = messaggio.trim();
    if (!EMAIL_VALIDA.test(emailPulita)) return setErrore(t("domanda.erroreEmail"));
    if (testo.length < MIN_MESSAGGIO) return setErrore(t("domanda.erroreMessaggioBreve"));

    setErrore(null);
    setInviando(true);
    try {
      await inviaDomanda({ email: emailPulita, messaggio: testo, nome: nome.trim() });
      setInviataA(emailPulita);
      setMessaggio("");
    } catch (e) {
      setErrore(messaggioErroreComprensibile(e, t("domanda.erroreInvio")));
    } finally {
      setInviando(false);
    }
  };

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={c.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>{t("faq.faiUnaDomanda")}</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
        {inviataA ? (
          <View style={styles.grazie}>
            <View style={styles.grazieIcona}>
              <Ionicons name="checkmark-circle" size={30} color={c.primario} />
            </View>
            <Text style={styles.grazieTitolo}>{t("segnalazioni.grazieTitolo")}</Text>
            <Text style={styles.grazieTesto}>{t("domanda.grazieTesto", { email: inviataA })}</Text>
            <Pressable onPress={() => setInviataA(null)}>
              <Text style={styles.grazieLink}>{t("domanda.faiUnAltraDomanda")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.sottotitolo}>{t("faq.scriviciLaTuaDomanda")}</Text>

            <Text style={styles.etichetta}>{t("domanda.nomeFacoltativo")}</Text>
            <TextInput style={styles.campo} value={nome} onChangeText={setNome} autoComplete="name" maxLength={100} />

            <Text style={styles.etichetta}>{t("modificaProfilo.email")}</Text>
            <TextInput
              style={styles.campo}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              maxLength={254}
            />
            <Text style={styles.aiuto}>{t("domanda.aiutoEmail")}</Text>

            <Text style={styles.etichetta}>{t("domanda.messaggio")}</Text>
            <TextInput
              style={[styles.campo, styles.campoMessaggio]}
              value={messaggio}
              onChangeText={setMessaggio}
              placeholder={t("domanda.placeholderMessaggio")}
              multiline
              numberOfLines={6}
              maxLength={3000}
            />

            {errore && <Text style={styles.errore}>{errore}</Text>}

            <Text style={styles.privacy}>
              {t("domanda.privacyAccetti")}{" "}
              <Text style={styles.link} onPress={() => apriLink("https://www.naturago.it/privacy", t("comune.linkNonApribile"))}>
                {t("domanda.privacyLink")}
              </Text>
              .
            </Text>

            <Pressable style={styles.invia} onPress={invia} disabled={inviando}>
              {inviando ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.inviaTesto}>{t("comune.invia")}</Text>}
            </Pressable>

            <Text style={styles.oppure}>
              {t("domanda.vediAncheLe")}{" "}
              <Text style={styles.link} onPress={() => navigation.goBack()}>
                {t("domanda.domandeFrequenti")}
              </Text>{" "}
              {t("domanda.oScriviA")}{" "}
              <Text style={styles.link} onPress={() => apriLink("mailto:info@naturago.it", t("comune.linkNonApribile"))}>
                info@naturago.it
              </Text>
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondoGruppo },
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.separatore,
  },
  tornaIndietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  titoloIntestazione: { fontSize: 14.5, fontWeight: "800", color: c.testo },
  contenuto: { padding: 20, gap: 8, paddingBottom: 40 },
  sottotitolo: { fontSize: 12.5, color: c.testoSecondario, marginBottom: 6, lineHeight: 18 },
  etichetta: {
    fontSize: 11,
    fontWeight: "700",
    color: c.testoSecondario,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 4,
  },
  campo: {
    borderWidth: 1,
    borderColor: c.separatore,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: c.testo,
  },
  campoMessaggio: { minHeight: 120, textAlignVertical: "top" },
  aiuto: { fontSize: 10.5, color: c.testoSecondario, marginTop: 3 },
  errore: { fontSize: 12, color: c.pericolo, marginTop: 8 },
  privacy: { fontSize: 11, color: c.testoSecondario, marginTop: 12, lineHeight: 16 },
  link: { color: c.primario, fontWeight: "700" },
  invia: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: c.primario,
    alignItems: "center",
    justifyContent: "center",
  },
  inviaTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 13.5 },
  oppure: { fontSize: 11, color: c.testoSecondario, textAlign: "center", marginTop: 14, lineHeight: 17 },
  grazie: { alignItems: "center", paddingTop: 40, gap: 6 },
  grazieIcona: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.primarioChiaro,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  grazieTitolo: { fontSize: 17, fontWeight: "800", color: c.testo },
  grazieTesto: { fontSize: 12.5, color: c.testoSecondario, textAlign: "center", lineHeight: 18, paddingHorizontal: 20 },
  grazieLink: { fontSize: 12.5, fontWeight: "700", color: c.primario, marginTop: 10 },
  });
}
