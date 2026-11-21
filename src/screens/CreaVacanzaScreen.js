import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../theme/tema";
import { useT } from "../i18n/i18n";
import { useAuth } from "../context/AuthContext";
import SelettoreDate from "../components/SelettoreDate";
import CercaLuogoModal from "../components/vacanza/CercaLuogoModal";
import MappaVacanza from "../components/vacanza/MappaVacanza";
import { percorsoConTratte } from "../lib/percorsoStradale";
import { salvaVacanzaPersonale, aggiornaVacanzaPersonale } from "../lib/pianiSalvati";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { etichettaData, numeroNotti } from "../lib/periodo";
import {
  giornoVuoto,
  nuovaVacanza,
  dataDelGiorno,
  etichettaDataLunga,
  formattaKm,
  formattaTempo,
  sequenzaPunti,
  firmaPunti,
  totaliPerGiorno,
  pianoDaVacanza,
  vacanzaDaPiano,
  nomiTappe,
} from "../lib/vacanza";

// "Crea la tua vacanza": chi viaggia compone i giorni (posti da vedere in
// ordine, dove dormire, data, appunti liberi) e l'app calcola km e tempi
// veri tra i posti nell'ordine scelto. Si salva in Profilo → I miei percorsi.
export default function CreaVacanzaScreen({ navigation, route }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  const { session } = useAuth();

  const pianoIniziale = route?.params?.pianoSalvato;
  const [vacanza, setVacanza] = useState(() => (pianoIniziale ? vacanzaDaPiano(pianoIniziale) : nuovaVacanza()));
  const [idSalvato, setIdSalvato] = useState(route?.params?.idPiano ?? null);
  const [salvato, setSalvato] = useState(!!pianoIniziale);
  const [salvando, setSalvando] = useState(false);
  const [ricerca, setRicerca] = useState(null); // { giorno, ruolo }
  const [selettoreDate, setSelettoreDate] = useState(false);
  // Ultimo calcolo delle distanze, con la firma dei punti a cui si riferisce.
  const [calcolo, setCalcolo] = useState({ firma: null, dati: null });

  const punti = useMemo(() => sequenzaPunti(vacanza), [vacanza]);
  const firma = useMemo(() => firmaPunti(punti), [punti]);

  // Distanze vere: si ricalcolano solo se cambiano posti o ordine. Il
  // risultato vale solo se porta la firma attuale (altrimenti è vecchio:
  // si mostra "calcolo..."), così l'effetto cambia lo stato solo a
  // calcolo finito.
  const serveCalcolo = punti.length >= 2;
  const rotta = serveCalcolo && calcolo.firma === firma ? calcolo.dati : null;
  const calcolando = serveCalcolo && calcolo.firma !== firma;
  useEffect(() => {
    if (!serveCalcolo) return undefined;
    let attivo = true;
    const id = setTimeout(() => {
      percorsoConTratte(punti.map((p) => p.luogo))
        .then((dati) => attivo && setCalcolo({ firma, dati }))
        .catch(() => attivo && setCalcolo({ firma, dati: null }));
    }, 500);
    return () => {
      attivo = false;
      clearTimeout(id);
    };
    // La firma è l'unico dato che conta: `punti` cambia identità a ogni modifica degli appunti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma]);

  const totaliGiorno = useMemo(() => totaliPerGiorno(punti, rotta?.tratte), [punti, rotta]);

  const modifica = (nuova) => {
    setVacanza(nuova);
    setSalvato(false);
  };
  const aggiornaGiorno = (numero, cambia) =>
    modifica({ ...vacanza, giorni: vacanza.giorni.map((g) => (g.numero === numero ? { ...g, ...cambia(g) } : g)) });

  const aggiungiGiorno = () => modifica({ ...vacanza, giorni: [...vacanza.giorni, giornoVuoto(vacanza.giorni.length + 1)] });
  const togliGiorno = (numero) => {
    const rimasti = vacanza.giorni.filter((g) => g.numero !== numero).map((g, i) => ({ ...g, numero: i + 1 }));
    modifica({ ...vacanza, giorni: rimasti });
  };
  const sposta = (numero, indice, verso) =>
    aggiornaGiorno(numero, (g) => {
      const luoghi = [...g.luoghi];
      const altro = indice + verso;
      if (altro < 0 || altro >= luoghi.length) return {};
      [luoghi[indice], luoghi[altro]] = [luoghi[altro], luoghi[indice]];
      return { luoghi };
    });
  const togliLuogo = (numero, indice) => aggiornaGiorno(numero, (g) => ({ luoghi: g.luoghi.filter((_, i) => i !== indice) }));

  const luogoScelto = (luogo) => {
    const { giorno, ruolo } = ricerca;
    setRicerca(null);
    if (ruolo === "partenza") {
      modifica({ ...vacanza, partenza: luogo });
      return;
    }
    aggiornaGiorno(giorno, (g) => (ruolo === "dormire" ? { dormire: luogo } : { luoghi: [...g.luoghi, luogo] }));
  };

  const dateScelte = ({ checkIn, checkOut }) => {
    setSelettoreDate(false);
    if (!checkIn) {
      modifica({ ...vacanza, dataInizio: null });
      return;
    }
    // Se è stato scelto anche l'ultimo giorno, si aggiungono i giorni che mancano.
    const giorniServono = checkOut ? numeroNotti(checkIn, checkOut) + 1 : vacanza.giorni.length;
    const giorni = [...vacanza.giorni];
    while (giorni.length < Math.min(giorniServono, 30)) giorni.push(giornoVuoto(giorni.length + 1));
    modifica({ ...vacanza, dataInizio: checkIn, giorni });
  };

  const salva = async () => {
    if (salvando || salvato) return;
    if (!session) {
      Alert.alert(t("accedi.titoloAccedi"), t("pianifica.accediMessaggio"), [
        { text: t("comune.annulla"), style: "cancel" },
        { text: t("accedi.titoloAccedi"), onPress: () => navigation.navigate("Accedi") },
      ]);
      return;
    }
    if (punti.length === 0) {
      Alert.alert(t("vacanza.titolo"), t("vacanza.aggiungiAlmenoUno"));
      return;
    }
    setSalvando(true);
    try {
      const titolo = vacanza.titolo.trim() || nomiTappe(vacanza).slice(0, 3).join(" → ");
      const piano = pianoDaVacanza({ ...vacanza, titolo }, rotta ? { km: rotta.distanzaKm, minuti: rotta.minuti } : null);
      const dati = { titolo, tappe: piano.tappe, giorniRichiesti: piano.giorniRichiesti, piano };
      if (idSalvato) {
        await aggiornaVacanzaPersonale(idSalvato, dati);
      } else {
        setIdSalvato(await salvaVacanzaPersonale(session.user.id, dati));
      }
      setSalvato(true);
    } catch (e) {
      console.error("Errore nel salvare la vacanza:", e);
      Alert.alert(t("pianifica.nonSalvatoTitolo"), messaggioErroreComprensibile(e, t("pianifica.erroreSalvataggio")));
    } finally {
      setSalvando(false);
    }
  };

  // Numero progressivo del punto nell'intero viaggio (per i tratti e la mappa).
  const posizioneGlobale = (giorno, ruolo, indice) =>
    punti.findIndex((p) => p.giorno === giorno && p.ruolo === ruolo && (ruolo === "dormire" || p.indice === indice));
  // I posti si numerano da 1; la partenza resta fuori dalla numerazione (è la "P").
  const numeroPosto = (k) => k + (vacanza.partenza ? 0 : 1);
  const trattoPer = (k) => (rotta && k > 0 ? rotta.tratte[k - 1] : null);

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <Pressable style={styles.indietro} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Indietro">
          <Ionicons name="chevron-back" size={18} color={c.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>{t("vacanza.titolo")}</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.campoTitolo}
            value={vacanza.titolo}
            onChangeText={(v) => modifica({ ...vacanza, titolo: v })}
            placeholder={t("vacanza.nomeSegnaposto")}
            placeholderTextColor={c.testoSecondario}
          />

          <Pressable style={styles.rigaData} onPress={() => setSelettoreDate(true)} accessibilityRole="button">
            <Ionicons name="calendar-outline" size={18} color={c.primario} />
            <Text style={styles.rigaDataTesto}>
              {vacanza.dataInizio
                ? `${t("vacanza.partenza")} ${etichettaData(vacanza.dataInizio)}`
                : t("vacanza.sceglieDate")}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={c.testoSecondario} />
          </Pressable>

          {punti.length > 0 && (
            <View style={styles.riquadroTotale}>
              <Ionicons name="trail-sign" size={16} color="#FFFFFF" />
              <Text style={styles.riquadroTotaleTesto}>
                {calcolando
                  ? t("vacanza.calcolo")
                  : rotta
                    ? t("vacanza.totaleViaggio", { km: formattaKm(rotta.distanzaKm), tempo: formattaTempo(rotta.minuti) })
                    : t("vacanza.serveDuePunti")}
              </Text>
            </View>
          )}

          <View style={styles.cardPartenza}>
            <Text style={styles.etichetta}>{t("vacanza.daDoveParti")}</Text>
            {vacanza.partenza ? (
              <View style={[styles.rigaPosto, { backgroundColor: c.successoChiaro }]}>
                <View style={[styles.numeroPosto, { backgroundColor: c.successo }]}>
                  <Text style={styles.numeroPostoTesto}>P</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.postoNome} numberOfLines={2}>
                    {vacanza.partenza.nome}
                  </Text>
                  <Text style={styles.postoSotto}>{t("vacanza.partenzaEtichetta")}</Text>
                </View>
                <Pressable onPress={() => setRicerca({ giorno: 0, ruolo: "partenza" })} hitSlop={8} accessibilityLabel="Cambia partenza">
                  <Ionicons name="create-outline" size={18} color={c.primario} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.bottoneAggiungi} onPress={() => setRicerca({ giorno: 0, ruolo: "partenza" })} accessibilityRole="button">
                <Ionicons name="home-outline" size={18} color={c.successo} />
                <Text style={[styles.bottoneAggiungiTesto, { color: c.successo }]}>{t("vacanza.scegliPartenza")}</Text>
              </Pressable>
            )}
          </View>

          <MappaVacanza punti={punti} tracciato={rotta?.punti} />

          {vacanza.giorni.map((g) => {
            const data = dataDelGiorno(vacanza.dataInizio, g.numero);
            const tot = totaliGiorno[g.numero];
            return (
              <View key={g.numero} style={styles.cardGiorno}>
                <View style={styles.giornoIntestazione}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.giornoTitolo}>{t("vacanza.giorno", { n: g.numero })}</Text>
                    {data ? <Text style={styles.giornoData}>{etichettaDataLunga(data)}</Text> : null}
                  </View>
                  {vacanza.giorni.length > 1 && (
                    <Pressable onPress={() => togliGiorno(g.numero)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("vacanza.rimuoviGiorno")}>
                      <Ionicons name="trash-outline" size={18} color={c.pericolo} />
                    </Pressable>
                  )}
                </View>

                {g.luoghi.length === 0 && <Text style={styles.vuoto}>{t("vacanza.nessunPosto")}</Text>}
                {g.luoghi.map((l, i) => {
                  const k = posizioneGlobale(g.numero, "visita", i);
                  const tratto = trattoPer(k);
                  return (
                    <View key={`${g.numero}-${i}`}>
                      {tratto && (
                        <View style={styles.tratto}>
                          <Ionicons name="car-outline" size={13} color={c.testoSecondario} />
                          <Text style={styles.trattoTesto}>{t("vacanza.tratta", { km: formattaKm(tratto.km), tempo: formattaTempo(tratto.minuti) })}</Text>
                        </View>
                      )}
                      <View style={styles.rigaPosto}>
                        <View style={styles.numeroPosto}>
                          <Text style={styles.numeroPostoTesto}>{numeroPosto(k)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.postoNome} numberOfLines={2}>
                            {l.nome}
                          </Text>
                          {l.localita ? <Text style={styles.postoSotto}>{l.localita}</Text> : null}
                        </View>
                        <View style={styles.azioniPosto}>
                          <Pressable onPress={() => sposta(g.numero, i, -1)} hitSlop={6} disabled={i === 0} accessibilityLabel="Sposta su">
                            <Ionicons name="arrow-up" size={18} color={i === 0 ? c.separatore : c.primario} />
                          </Pressable>
                          <Pressable onPress={() => sposta(g.numero, i, 1)} hitSlop={6} disabled={i === g.luoghi.length - 1} accessibilityLabel="Sposta giù">
                            <Ionicons name="arrow-down" size={18} color={i === g.luoghi.length - 1 ? c.separatore : c.primario} />
                          </Pressable>
                          <Pressable onPress={() => togliLuogo(g.numero, i)} hitSlop={6} accessibilityLabel="Togli">
                            <Ionicons name="close-circle" size={18} color={c.pericolo} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}

                <Pressable style={styles.bottoneAggiungi} onPress={() => setRicerca({ giorno: g.numero, ruolo: "visita" })} accessibilityRole="button">
                  <Ionicons name="add-circle-outline" size={18} color={c.primario} />
                  <Text style={styles.bottoneAggiungiTesto}>{t("vacanza.aggiungiPosto")}</Text>
                </Pressable>

                <Text style={styles.etichetta}>{t("vacanza.doveDormire")}</Text>
                {g.dormire ? (
                  <View>
                    {(() => {
                      const k = posizioneGlobale(g.numero, "dormire", null);
                      const tratto = trattoPer(k);
                      return tratto ? (
                        <View style={styles.tratto}>
                          <Ionicons name="car-outline" size={13} color={c.testoSecondario} />
                          <Text style={styles.trattoTesto}>{t("vacanza.tratta", { km: formattaKm(tratto.km), tempo: formattaTempo(tratto.minuti) })}</Text>
                        </View>
                      ) : null;
                    })()}
                    <View style={[styles.rigaPosto, { backgroundColor: c.accentoChiaro }]}>
                      <View style={[styles.numeroPosto, { backgroundColor: c.accento }]}>
                        <Text style={styles.numeroPostoTesto}>{numeroPosto(posizioneGlobale(g.numero, "dormire", null))}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.postoNome} numberOfLines={2}>
                          {g.dormire.nome}
                        </Text>
                        {g.dormire.localita ? <Text style={styles.postoSotto}>{g.dormire.localita}</Text> : null}
                      </View>
                      <Pressable onPress={() => aggiornaGiorno(g.numero, () => ({ dormire: null }))} hitSlop={6} accessibilityLabel="Togli">
                        <Ionicons name="close-circle" size={18} color={c.pericolo} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable style={styles.bottoneAggiungi} onPress={() => setRicerca({ giorno: g.numero, ruolo: "dormire" })} accessibilityRole="button">
                    <Ionicons name="bed-outline" size={18} color={c.accento} />
                    <Text style={[styles.bottoneAggiungiTesto, { color: c.accento }]}>{t("vacanza.scegliDormire")}</Text>
                  </Pressable>
                )}

                {tot && (
                  <View style={styles.totaleGiorno}>
                    <Text style={styles.totaleGiornoTesto}>
                      {t("vacanza.totaleGiorno", { km: formattaKm(tot.km), tempo: formattaTempo(tot.minuti) })}
                    </Text>
                  </View>
                )}

                <Text style={styles.etichetta}>{t("vacanza.appunti")}</Text>
                <TextInput
                  style={styles.appunti}
                  value={g.appunti}
                  onChangeText={(v) => aggiornaGiorno(g.numero, () => ({ appunti: v }))}
                  placeholder={t("vacanza.appuntiSegnaposto")}
                  placeholderTextColor={c.testoSecondario}
                  multiline
                />
              </View>
            );
          })}

          <Pressable style={styles.bottoneGiorno} onPress={aggiungiGiorno} accessibilityRole="button">
            <Ionicons name="add" size={18} color={c.primario} />
            <Text style={styles.bottoneGiornoTesto}>{t("vacanza.aggiungiGiorno")}</Text>
          </Pressable>

          <Text style={styles.etichetta}>{t("vacanza.appuntiViaggio")}</Text>
          <TextInput
            style={styles.appunti}
            value={vacanza.appuntiViaggio}
            onChangeText={(v) => modifica({ ...vacanza, appuntiViaggio: v })}
            placeholder={t("vacanza.appuntiSegnaposto")}
            placeholderTextColor={c.testoSecondario}
            multiline
          />

          {salvato ? (
            <View style={styles.salvatoRiquadro}>
              <View style={styles.salvatoRiga}>
                <Ionicons name="checkmark-circle" size={20} color={c.successo} />
                <Text style={styles.salvatoTesto}>{t("pianoMappa.salvato")}</Text>
              </View>
              <Pressable
                style={styles.bottoneSecondario}
                onPress={() => navigation.navigate("Profilo", { screen: "PianiSalvati" })}
                accessibilityRole="button"
              >
                <Text style={styles.bottoneSecondarioTesto}>{t("pianoMappa.apriMieiPercorsi")}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={[styles.bottoneSalva, salvando && { opacity: 0.6 }]} onPress={salva} disabled={salvando} accessibilityRole="button">
              {salvando ? (
                <ActivityIndicator color={c.sulPrimario} size="small" />
              ) : (
                <>
                  <Ionicons name="bookmark-outline" size={18} color={c.sulPrimario} />
                  <Text style={styles.bottoneSalvaTesto}>{idSalvato ? t("vacanza.salvaModifiche") : t("pianoMappa.salva")}</Text>
                </>
              )}
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <CercaLuogoModal
        visibile={!!ricerca}
        titolo={ricerca?.ruolo === "dormire" ? t("vacanza.scegliDormire") : ricerca?.ruolo === "partenza" ? t("vacanza.scegliPartenza") : t("vacanza.aggiungiPosto")}
        onScegli={luogoScelto}
        onChiudi={() => setRicerca(null)}
      />
      <SelettoreDate
        visibile={selettoreDate}
        checkIn={vacanza.dataInizio}
        checkOut={vacanza.dataInizio ? dataDelGiorno(vacanza.dataInizio, vacanza.giorni.length) : null}
        onConferma={dateScelte}
        onChiudi={() => setSelettoreDate(false)}
      />
    </SafeAreaView>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.separatore,
    },
    indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: c.sfondoGruppo },
    titoloIntestazione: { fontSize: 17, fontWeight: "800", color: c.testo },
    contenuto: { padding: 16, gap: 12, paddingBottom: 50 },
    campoTitolo: {
      fontSize: 18,
      fontWeight: "700",
      color: c.testo,
      backgroundColor: c.sfondoCampo,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.separatore,
    },
    rigaData: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.sfondoGruppo,
      borderRadius: 12,
      padding: 14,
    },
    rigaDataTesto: { flex: 1, fontSize: 15, fontWeight: "600", color: c.testo },
    riquadroTotale: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.primario,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    riquadroTotaleTesto: { flex: 1, color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
    cardPartenza: { backgroundColor: c.sfondoGruppo, borderRadius: 16, padding: 14, gap: 8 },
    cardGiorno: { backgroundColor: c.sfondoGruppo, borderRadius: 16, padding: 14, gap: 8 },
    giornoIntestazione: { flexDirection: "row", alignItems: "center", gap: 10 },
    giornoTitolo: { fontSize: 17, fontWeight: "800", color: c.testo },
    giornoData: { fontSize: 13, color: c.primario, fontWeight: "600", marginTop: 1 },
    vuoto: { fontSize: 13, color: c.testoSecondario },
    tratto: { flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 12, paddingVertical: 4 },
    trattoTesto: { fontSize: 12, color: c.testoSecondario, fontWeight: "600" },
    rigaPosto: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.primarioChiaro,
      borderRadius: 12,
      padding: 10,
    },
    numeroPosto: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
    numeroPostoTesto: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
    postoNome: { fontSize: 15, fontWeight: "700", color: c.testo },
    postoSotto: { fontSize: 12, color: c.testoSecondario, marginTop: 1 },
    azioniPosto: { flexDirection: "row", alignItems: "center", gap: 10 },
    bottoneAggiungi: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.separatore,
    },
    bottoneAggiungiTesto: { fontSize: 14, fontWeight: "700", color: c.primario },
    etichetta: { fontSize: 12, fontWeight: "700", color: c.testoSecondario, textTransform: "uppercase", marginTop: 4 },
    totaleGiorno: { backgroundColor: c.primarioChiaro, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
    totaleGiornoTesto: { fontSize: 13, fontWeight: "700", color: c.primario },
    appunti: {
      minHeight: 70,
      fontSize: 15,
      color: c.testo,
      backgroundColor: c.sfondoCampo,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.separatore,
      textAlignVertical: "top",
    },
    bottoneGiorno: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.primario,
    },
    bottoneGiornoTesto: { fontSize: 15, fontWeight: "700", color: c.primario },
    bottoneSalva: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primario,
      borderRadius: 14,
      paddingVertical: 15,
      marginTop: 6,
    },
    bottoneSalvaTesto: { fontSize: 16, fontWeight: "700", color: c.sulPrimario },
    salvatoRiquadro: { backgroundColor: c.successoChiaro, borderRadius: 14, padding: 14, gap: 10, marginTop: 6 },
    salvatoRiga: { flexDirection: "row", alignItems: "center", gap: 8 },
    salvatoTesto: { flex: 1, fontSize: 14, fontWeight: "600", color: c.testo },
    bottoneSecondario: {
      alignItems: "center",
      backgroundColor: c.sfondoGruppo,
      borderRadius: 12,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: c.primario,
    },
    bottoneSecondarioTesto: { fontSize: 15, fontWeight: "700", color: c.primario },
  });
}
