import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { TIPO_STRUTTURA_SEGNALABILE_META, SERVIZI_SEGNALAZIONE_META, inviaSegnalazioneStruttura } from "../lib/segnalazioni";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { useT } from "../i18n/i18n";

export default function NuovaSegnalazioneScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { session } = useAuth();
  const [tipoStruttura, setTipoStruttura] = useState("campeggio");
  const [amenities, setAmenities] = useState([]);
  const [nome, setNome] = useState("");
  const [citta, setCitta] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [sitoWeb, setSitoWeb] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(null);

  const toggleAmenity = (chiave) =>
    setAmenities((a) => (a.includes(chiave) ? a.filter((k) => k !== chiave) : [...a, chiave]));

  const invia = async () => {
    if (!nome.trim() || !citta.trim()) {
      setErrore(t("segnalazioni.erroreNomeCitta"));
      return;
    }
    setErrore(null);
    setInviando(true);
    try {
      await inviaSegnalazioneStruttura({
        autoreId: session.user.id,
        nomeAutore: session.user.user_metadata?.nome || t("segnalazioni.clienteDefault"),
        nome,
        citta,
        tipoStruttura,
        indirizzo,
        sitoWeb,
        amenities,
      });
      Alert.alert(t("segnalazioni.grazieTitolo"), t("segnalazioni.notaControllo"), [
        { text: t("comune.ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setErrore(messaggioErroreComprensibile(e, t("segnalazioni.erroreInvio")));
    } finally {
      setInviando(false);
    }
  };

  return (
    <View style={styles.schermo}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("comune.indietro")} hitSlop={8} style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={c.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>{t("segnalazioni.nuovaSegnalazione")}</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
        <Text style={styles.sottotitolo}>{t("segnalazioni.sottotitolo")}</Text>

        <Text style={styles.etichetta}>{t("segnalazioni.tipoStruttura")}</Text>
        <View style={styles.pills}>
          {Object.entries(TIPO_STRUTTURA_SEGNALABILE_META).map(([chiave, meta]) => (
            <Pressable
              key={chiave}
              style={[styles.pill, tipoStruttura === chiave && styles.pillAttiva]}
              onPress={() => setTipoStruttura(chiave)}
            >
              <Ionicons name={meta.icona} size={13} color={tipoStruttura === chiave ? c.sulPrimario : c.testo} />
              <Text style={[styles.pillTesto, tipoStruttura === chiave && styles.pillTestoAttivo]}>{meta.etichetta}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.etichetta}>{t("segnalazioni.serviziCamper")}</Text>
        <View style={styles.pills}>
          {Object.entries(SERVIZI_SEGNALAZIONE_META).map(([chiave, meta]) => {
            const attiva = amenities.includes(chiave);
            return (
              <Pressable key={chiave} style={[styles.pill, attiva && styles.pillAttiva]} onPress={() => toggleAmenity(chiave)}>
                <Ionicons name={meta.icona} size={13} color={attiva ? c.sulPrimario : c.testo} />
                <Text style={[styles.pillTesto, attiva && styles.pillTestoAttivo]}>{meta.etichetta}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.etichetta}>{t("segnalazioni.nomeStruttura")}</Text>
        <TextInput style={styles.campo} value={nome} onChangeText={setNome} placeholder={t("segnalazioni.placeholderNome")} />

        <Text style={styles.etichetta}>{t("segnalazioni.citta")}</Text>
        <TextInput style={styles.campo} value={citta} onChangeText={setCitta} placeholder={t("segnalazioni.placeholderCitta")} />

        <Text style={styles.etichetta}>{t("segnalazioni.indirizzo")}</Text>
        <TextInput style={styles.campo} value={indirizzo} onChangeText={setIndirizzo} placeholder={t("segnalazioni.placeholderIndirizzo")} />

        <Text style={styles.etichetta}>{t("segnalazioni.sitoWebFacoltativo")}</Text>
        <TextInput
          style={styles.campo}
          value={sitoWeb}
          onChangeText={setSitoWeb}
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.nota}>{t("segnalazioni.notaControllo")}</Text>

        {errore && <Text style={styles.errore}>{errore}</Text>}

        <Pressable style={styles.invia} onPress={invia} disabled={inviando}>
          {inviando ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.inviaTesto}>{t("segnalazioni.inviaSegnalazione")}</Text>}
        </Pressable>
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
  etichetta: { fontSize: 11, fontWeight: "700", color: c.testoSecondario, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 10, marginBottom: 4 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: c.separatore,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  pillAttiva: { backgroundColor: c.primario, borderColor: c.primario },
  pillTesto: { fontSize: 11.5, fontWeight: "600", color: c.testo },
  pillTestoAttivo: { color: c.sulPrimario },
  campo: {
    borderWidth: 1,
    borderColor: c.separatore,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: c.testo,
  },
  nota: { fontSize: 11, color: c.testoSecondario, marginTop: 12, lineHeight: 16 },
  errore: { fontSize: 12, color: c.pericolo, marginTop: 8 },
  invia: {
    marginTop: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: c.primario,
    alignItems: "center",
    justifyContent: "center",
  },
  inviaTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 13.5 },
  });
}
