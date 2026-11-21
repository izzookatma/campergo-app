import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Animated, PanResponder, StyleSheet, Linking, ActionSheetIOS, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";
import { useT } from "../../i18n/i18n";
import { prossimoStatoPrenotazione, urlPrenotazione } from "../../lib/vacanza";
import { infoLuogo } from "../../lib/bozzaVacanza";

// Un posto del percorso (da vedere o dove dormire): maniglia per trascinarlo,
// nome (si apre la scheda), frecce, e sotto la PRENOTAZIONE: stato (da
// prenotare / prenotato), nota libera (conferma, orari), chiama, prenota con le
// date già inserite, e «Sposta al giorno…».
// Il trascinamento è gestito da CreaVacanzaScreen (conosce tutte le righe):
// qui solo il gesto sulla maniglia.
export default function RigaPostoVacanza({
  luogo,
  ruolo, // "visita" | "dormire"
  numero,
  colore,
  sfondo,
  giorno,
  indice,
  ultimo,
  dataGiorno,
  altriGiorni, // [numero, ...]
  haScheda,
  stato: statoTrascinamento, // { eQuesta, bersaglioSopra, bersaglioSotto, traslazione }
  onApriScheda,
  onNaviga, // () => apre la navigazione verso questo posto
  onTogli,
  onSposta, // (verso: -1|1)
  onSpostaAlGiorno, // (numeroGiorno)
  onPrenotazione, // (prenotazione)
  onInizia,
  onMuovi,
  onFinisci,
  registraRiga,
}) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  const dormire = ruolo === "dormire";
  const prenotazione = luogo.prenotazione || { stato: null, nota: "" };
  // Sentieri, soste libere e camper service non si prenotano: niente blocco prenotazione.
  const senzaPrenotazione = ["itinerario", "sosta_libera", "camper_service"].includes(luogo.tipo);
  const urlPrenota = urlPrenotazione(luogo, dataGiorno, dormire);

  // Il gesto legge sempre le proprietà più recenti (la riga si ridisegna spesso).
  const [ultime] = useState(() => ({}));
  useEffect(() => {
    Object.assign(ultime, { onInizia, onMuovi, onFinisci, giorno, indice, traslazione: statoTrascinamento?.traslazione });
  });
  const [gesto] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Nessun altro (la lista che scorre) può rubare il gesto mentre si trascina.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => ultime.onInizia?.(ultime.giorno, ultime.indice),
      onPanResponderMove: (_e, g) => {
        ultime.traslazione?.setValue(g.dy);
        ultime.onMuovi?.(g.moveY);
      },
      onPanResponderRelease: () => ultime.onFinisci?.(),
      onPanResponderTerminate: () => ultime.onFinisci?.(true),
    })
  );

  const mostraSposta = () => {
    const opzioni = altriGiorni.map((n) => t("vacanza.giorno", { n }));
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title: t("vacanza.spostaAlGiorno"), options: [...opzioni, t("comune.annulla")], cancelButtonIndex: opzioni.length }, (i) => {
        if (i < altriGiorni.length) onSpostaAlGiorno(altriGiorni[i]);
      });
    } else {
      Alert.alert(t("vacanza.spostaAlGiorno"), "", [...altriGiorni.map((n, i) => ({ text: opzioni[i], onPress: () => onSpostaAlGiorno(n) })), { text: t("comune.annulla"), style: "cancel" }]);
    }
  };

  const cicloStato = () => onPrenotazione({ stato: prossimoStatoPrenotazione(prenotazione.stato), nota: prenotazione.nota || "" });
  const etichettaStato = { da_prenotare: t("vacanza.daPrenotare"), prenotato: t("vacanza.prenotato") };

  const trascinata = statoTrascinamento?.eQuesta;
  return (
    <View>
      {statoTrascinamento?.bersaglioSopra ? <View style={styles.indicatore} /> : null}
      <Animated.View
        ref={registraRiga}
        collapsable={false}
        style={[
          styles.riga,
          { backgroundColor: sfondo },
          trascinata && { transform: [{ translateY: statoTrascinamento.traslazione }], zIndex: 20, elevation: 8, opacity: 0.92, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8 },
        ]}
      >
        <View style={styles.principale}>
          {!dormire && (
            <View {...gesto.panHandlers} style={styles.maniglia} accessibilityLabel={t("vacanza.trascinaPerSpostare")} accessibilityRole="adjustable">
              <Ionicons name="reorder-three" size={24} color={c.testoSecondario} />
            </View>
          )}
          <View style={[styles.numero, { backgroundColor: colore }]}>
            <Text style={styles.numeroTesto}>{numero}</Text>
          </View>
          <Pressable style={{ flex: 1 }} onPress={onApriScheda} disabled={!haScheda} accessibilityRole="button">
            <Text style={styles.nome} numberOfLines={2}>
              {luogo.nome}
            </Text>
            {luogo.localita ? <Text style={styles.sotto}>{luogo.localita}</Text> : null}
            {infoLuogo(luogo, t) ? <Text style={styles.info}>{infoLuogo(luogo, t)}</Text> : null}
            {haScheda ? <Text style={styles.apri}>{t("vacanza.apriScheda")}</Text> : null}
          </Pressable>
          {onNaviga ? (
            <Pressable onPress={onNaviga} hitSlop={6} style={styles.naviga} accessibilityRole="button" accessibilityLabel={t("vacanza.naviga")}>
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
            </Pressable>
          ) : null}
          <View style={styles.azioni}>
            {!dormire && (
              <>
                <Pressable onPress={() => onSposta(-1)} hitSlop={6} disabled={indice === 0} accessibilityLabel="Sposta su">
                  <Ionicons name="arrow-up" size={18} color={indice === 0 ? c.separatore : c.primario} />
                </Pressable>
                <Pressable onPress={() => onSposta(1)} hitSlop={6} disabled={ultimo} accessibilityLabel="Sposta giù">
                  <Ionicons name="arrow-down" size={18} color={ultimo ? c.separatore : c.primario} />
                </Pressable>
              </>
            )}
            <Pressable onPress={onTogli} hitSlop={6} accessibilityLabel="Togli">
              <Ionicons name="close-circle" size={18} color={c.pericolo} />
            </Pressable>
          </View>
        </View>

        {!senzaPrenotazione && (
        <View style={styles.rigaPrenotazione}>
          <Pressable
            onPress={cicloStato}
            style={[styles.chip, prenotazione.stato === "prenotato" && styles.chipPrenotato, prenotazione.stato === "da_prenotare" && styles.chipDaPrenotare]}
            accessibilityRole="button"
          >
            <Text style={[styles.chipTesto, prenotazione.stato && { color: "#FFFFFF" }]}>{etichettaStato[prenotazione.stato] || t("vacanza.segnaDaPrenotare")}</Text>
          </Pressable>
          {luogo.telefono ? (
            <Pressable onPress={() => Linking.openURL(`tel:${luogo.telefono}`)} accessibilityRole="link">
              <Text style={styles.link}>{t("vacanza.chiama")}</Text>
            </Pressable>
          ) : null}
          {urlPrenota ? (
            <Pressable onPress={() => Linking.openURL(urlPrenota)} accessibilityRole="link">
              <Text style={styles.link}>{dormire && dataGiorno ? t("vacanza.prenotaDate") : t("vacanza.prenotaContatta")}</Text>
            </Pressable>
          ) : null}
          {!dormire && altriGiorni.length > 0 ? (
            <Pressable onPress={mostraSposta} accessibilityRole="button">
              <Text style={styles.link}>{t("vacanza.spostaAlGiorno")}</Text>
            </Pressable>
          ) : null}
        </View>
        )}
        {!senzaPrenotazione && prenotazione.stato ? (
          <TextInput
            style={styles.nota}
            value={prenotazione.nota || ""}
            onChangeText={(v) => onPrenotazione({ stato: prenotazione.stato, nota: v })}
            placeholder={t("vacanza.notaPrenotazione")}
            placeholderTextColor={c.testoSecondario}
          />
        ) : null}
      </Animated.View>
      {statoTrascinamento?.bersaglioSotto ? <View style={styles.indicatore} /> : null}
    </View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    riga: { borderRadius: 12, padding: 10, gap: 8 },
    principale: { flexDirection: "row", alignItems: "center", gap: 10 },
    maniglia: { width: 34, height: 38, alignItems: "center", justifyContent: "center", marginLeft: -6 },
    numero: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    numeroTesto: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
    nome: { fontSize: 15, fontWeight: "700", color: c.testo },
    sotto: { fontSize: 12, color: c.testoSecondario, marginTop: 1 },
    info: { fontSize: 12, fontWeight: "700", color: c.primario, marginTop: 1 },
    apri: { fontSize: 12, fontWeight: "700", color: c.primario, marginTop: 3 },
    naviga: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
    azioni: { flexDirection: "row", alignItems: "center", gap: 10 },
    rigaPrenotazione: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: c.separatore, backgroundColor: c.sfondoGruppo },
    chipDaPrenotare: { backgroundColor: c.primario, borderColor: c.primario },
    chipPrenotato: { backgroundColor: c.successo, borderColor: c.successo },
    chipTesto: { fontSize: 12, fontWeight: "700", color: c.testoSecondario },
    link: { fontSize: 12, fontWeight: "700", color: c.primario, textDecorationLine: "underline" },
    nota: { height: 38, borderRadius: 10, paddingHorizontal: 10, backgroundColor: c.sfondoCampo, borderWidth: 1, borderColor: c.separatore, color: c.testo, fontSize: 13 },
    indicatore: { height: 4, borderRadius: 2, backgroundColor: c.accento, marginVertical: 2 },
  });
}
