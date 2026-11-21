import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { caricaSchedaCulturale, CATEGORIA_CULTURALE_META } from "../lib/cultura";
import { caricaRecensioniEvento, inviaRecensioneEvento } from "../lib/recensioni";
import { caricaStruttureVicine } from "../lib/strutture";
import { distanzaKm } from "../lib/geo";
import ModuloRecensione from "../components/ModuloRecensione";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import RigaStelle from "../components/ui/RigaStelle";
import { useT } from "../i18n/i18n";
import PulsanteAggiungiAlPercorso from "../components/vacanza/PulsanteAggiungiAlPercorso";
import { luogoDaSchedaCulturale } from "../lib/bozzaVacanza";
import { urlMappa } from "../lib/mappa";
import { apriLink } from "../lib/linkEsterni";
import { usePreferenze } from "../context/PreferenzeContext";

function formattaDataEvento(iso) {
  const d = new Date(iso);
  const testo = d.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" });
  const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `${testo} · ${ora}`;
}

function formattaData(iso) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function RigaDettaglio({ icona, testo, colore }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  if (!testo) return null;
  return (
    <View style={styles.rigaDettaglio}>
      <Ionicons name={icona} size={15} color={colore} />
      <Text style={styles.rigaDettaglioTesto}>{testo}</Text>
    </View>
  );
}

export default function SchedaCulturaleScreen({ route, navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { motoreMappa } = usePreferenze();
  const { id } = route.params;
  const { session } = useAuth();
  const [scheda, setScheda] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  const [recensioni, setRecensioni] = useState([]);
  const [mostraModuloRecensione, setMostraModuloRecensione] = useState(false);
  const [struttureVicine, setStruttureVicine] = useState([]);

  useEffect(() => {
    caricaSchedaCulturale(id)
      .then(setScheda)
      .catch((e) => console.error("Errore nel caricare la scheda culturale:", e))
      .finally(() => setCaricamento(false));
  }, [id]);

  // Direzione "cultura -> struttura" (il cuore del sito, stessa logica di
  // "Puoi alloggiare qui" in Interessi.jsx): le strutture più vicine a
  // questo museo/borgo/attività, per invogliare a pernottare lì vicino.
  useEffect(() => {
    if (scheda?.lat == null || scheda?.lng == null) return;
    caricaStruttureVicine({ lat: scheda.lat, lng: scheda.lng, raggioKm: 40, limite: 40 })
      .then((strutture) => {
        const vicine = strutture
          .filter((s) => s.lat != null && s.lng != null)
          .map((s) => ({ ...s, distanzaKm: distanzaKm(scheda.lat, scheda.lng, s.lat, s.lng) }))
          .sort((a, b) => a.distanzaKm - b.distanzaKm)
          .slice(0, 3);
        setStruttureVicine(vicine);
      })
      .catch((e) => console.error("Errore nel caricare le strutture vicine:", e));
  }, [scheda?.lat, scheda?.lng]);

  const caricaRecensioniScheda = () => {
    caricaRecensioniEvento(id)
      .then(setRecensioni)
      .catch((e) => console.error("Errore nel caricare le recensioni:", e));
  };

  useEffect(caricaRecensioniScheda, [id]);

  const miaRecensione = session?.user?.id ? recensioni.find((r) => r.clienteId === session.user.id) : null;

  if (caricamento) {
    return (
      <View style={styles.schermo}>
        <ActivityIndicator style={{ marginTop: 60 }} color={c.primario} />
      </View>
    );
  }

  if (!scheda) return null;

  const meta = CATEGORIA_CULTURALE_META[scheda.categoria];
  const apriSito = (url) => apriLink(url.startsWith("http") ? url : `https://${url}`, t("comune.linkNonApribile"));
  const apriMappa = () => {
    const url = urlMappa({ lat: scheda.lat, lng: scheda.lng, nome: scheda.titolo }, motoreMappa);
    if (url) apriLink(url, t("comune.linkNonApribile"));
  };

  return (
    <View style={styles.schermo}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <SafeAreaView edges={["top"]} style={[styles.hero, { backgroundColor: meta.colore + "18" }]}>
          <ImmagineConRiserva
            uri={scheda.fotoUrl}
            larghezza={780}
            style={styles.heroImmagine}
            icona={meta.icona}
            iconaDimensione={46}
            iconaColore={meta.colore}
          />
          <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={c.testo} />
          </Pressable>
        </SafeAreaView>

        <View style={styles.contenuto}>
          <View style={[styles.badgeTipo, { backgroundColor: meta.colore + "18" }]}>
            <Ionicons name={meta.icona} size={11} color={meta.colore} />
            <Text style={[styles.badgeTipoTesto, { color: meta.colore }]}>{meta.etichettaSingolare}</Text>
          </View>

          <Text style={styles.titolo}>{scheda.titolo}</Text>
          {(scheda.citta || scheda.regione) && (
            <Text style={styles.localita}>{[scheda.citta, scheda.regione].filter(Boolean).join(", ")}</Text>
          )}
          {scheda.categoria === "eventi" && scheda.dataOra && (
            <Text style={[styles.localita, { fontWeight: "700", color: meta.colore }]}>{formattaDataEvento(scheda.dataOra)}</Text>
          )}

          {scheda.descrizione ? <Text style={styles.descrizione}>{scheda.descrizione}</Text> : null}

          <View style={styles.sezione}>
            <RigaDettaglio icona="time-outline" testo={scheda.orari} colore={meta.colore} />
            <RigaDettaglio icona="calendar-outline" testo={scheda.giorniApertura} colore={meta.colore} />
            {scheda.sitoWeb && (
              <Pressable style={styles.rigaDettaglio} onPress={() => apriSito(scheda.sitoWeb)}>
                <Ionicons name="globe-outline" size={15} color={meta.colore} />
                <Text style={[styles.rigaDettaglioTesto, { color: meta.colore }]}>{t("comune.visitaSitoWeb")}</Text>
              </Pressable>
            )}
            {scheda.linkBiglietti && (
              <Pressable style={styles.rigaDettaglio} onPress={() => apriSito(scheda.linkBiglietti)}>
                <Ionicons name="ticket-outline" size={15} color={meta.colore} />
                <Text style={[styles.rigaDettaglioTesto, { color: meta.colore }]}>{t("comune.biglietti")}</Text>
              </Pressable>
            )}
            {scheda.lat && scheda.lng && (
              <Pressable style={styles.rigaDettaglio} onPress={apriMappa}>
                <Ionicons name="navigate-outline" size={15} color={meta.colore} />
                <Text style={[styles.rigaDettaglioTesto, { color: meta.colore }]}>{t("comune.apriInMappe")}</Text>
              </Pressable>
            )}
          </View>

          {struttureVicine.length > 0 && (
            <View style={styles.sezionePuoiAlloggiare}>
              <Text style={styles.sezioneTitolo}>{t("cultura.puoiAlloggiareQui")}</Text>
              <View style={{ gap: 7 }}>
                {struttureVicine.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.cardStruttura}
                    onPress={() => navigation.navigate("Scheda", { struttura: s })}
                  >
                    <View style={styles.cardStrutturaFoto}>
                      <ImmagineConRiserva
                        uri={s.fotoUrl}
                        larghezza={160}
                        style={{ width: "100%", height: "100%" }}
                        iconaDimensione={20}
                        iconaColore={c.testoSecondario}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.cardStrutturaNome} numberOfLines={1}>
                        {s.nome}
                      </Text>
                      <Text style={styles.cardStrutturaDistanza}>
                        {s.distanzaKm < 1 ? "<1" : s.distanzaKm.toFixed(1)} km
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 1 }}>
                        {s.prezzo != null && <Text style={styles.cardStrutturaPrezzo}>{t("comune.daPrezzoNotte", { prezzo: s.prezzo })}</Text>}
                        {s.rating ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                            <Ionicons name="star" size={10} color={c.voto} />
                            <Text style={styles.cardStrutturaPrezzo}>{s.rating}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.sezioneRecensioni}>
            <View style={styles.recensioniIntestazione}>
              <Text style={styles.sezioneTitolo}>{t("recensioni.titolo")}{recensioni.length > 0 ? ` (${recensioni.length})` : ""}</Text>
              {session && !miaRecensione && !mostraModuloRecensione && (
                <Pressable onPress={() => setMostraModuloRecensione(true)}>
                  <Text style={[styles.recensisciLink, { color: meta.colore }]}>{t("recensioni.scriviLink")}</Text>
                </Pressable>
              )}
            </View>

            {!session && (
              <Pressable onPress={() => Alert.alert(t("accedi.titoloAccedi"), t("recensioni.accediMessaggio"))}>
                <Text style={[styles.recensisciLink, { color: meta.colore }]}>{t("recensioni.accediLink")}</Text>
              </Pressable>
            )}

            {miaRecensione && <Text style={styles.giaRecensito}>{t("recensioni.giaRecensito")}</Text>}

            {mostraModuloRecensione && !miaRecensione && (
              <ModuloRecensione
                onInvia={({ punteggio, testo }) =>
                  inviaRecensioneEvento({
                    eventoId: scheda.id,
                    clienteId: session.user.id,
                    nomeCliente: session.user.user_metadata?.nome || t("comune.utenteDefault"),
                    punteggio,
                    testo,
                  })
                }
                onInviata={() => {
                  setMostraModuloRecensione(false);
                  caricaRecensioniScheda();
                }}
              />
            )}

            {recensioni.length === 0 ? (
              <Text style={styles.recensioniVuoto}>{t("recensioni.nessunaRecensione")}</Text>
            ) : (
              recensioni.map((r) => (
                <View key={r.id} style={styles.recensioneCard}>
                  <View style={styles.recensioneIntestazione}>
                    <Text style={styles.recensioneNome}>{r.nomeCliente}</Text>
                    <RigaStelle punteggio={r.punteggio} />
                  </View>
                  <Text style={styles.recensioneData}>{formattaData(r.creatoIl)}</Text>
                  <Text style={styles.recensioneTesto}>{r.testo}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      {route.params.aggiungiAlPercorso && (
        <SafeAreaView edges={["bottom"]} style={styles.barraAggiungi}>
          <PulsanteAggiungiAlPercorso richiesta={route.params.aggiungiAlPercorso} luogo={luogoDaSchedaCulturale(scheda)} navigation={navigation} />
        </SafeAreaView>
      )}
    </View>
  );
}

// Stili derivati dal tema: funzione semplice (nessuno stato interno),
// richiamata da ogni componente di questo file che ne ha bisogno.
function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    barraAggiungi: { borderTopWidth: 1, borderTopColor: c.separatore, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, backgroundColor: c.sfondoGruppo },
    schermo: { flex: 1, backgroundColor: c.sfondoGruppo },
    hero: { height: 230, alignItems: "center", justifyContent: "center" },
    heroImmagine: { width: "100%", height: "100%", position: "absolute" },
    tornaIndietro: {
      position: "absolute",
      top: 52,
      left: 16,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.92)",
      alignItems: "center",
      justifyContent: "center",
    },
    contenuto: { padding: 20, gap: 10 },
    badgeTipo: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: raggio.pillola,
    },
    badgeTipoTesto: { fontSize: 10, fontWeight: "700" },
    titolo: { fontSize: 19, fontWeight: "800", color: c.testo },
    localita: { fontSize: 12, color: c.testoSecondario },
    descrizione: { fontSize: 12.5, lineHeight: 19, color: c.testo },
    sezione: { gap: 8, marginTop: 6 },
    rigaDettaglio: { flexDirection: "row", alignItems: "center", gap: 8 },
    rigaDettaglioTesto: { flex: 1, fontSize: 12, color: c.testo, lineHeight: 17 },
    sezioneTitolo: { fontSize: 15, fontWeight: "800", color: c.testo },
    sezionePuoiAlloggiare: { gap: 8, marginTop: 14 },
    cardStruttura: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.sfondoGruppo,
      borderRadius: raggio.l,
      padding: 10,
      ...ombra(c),
    },
    cardStrutturaFoto: {
      width: 52,
      height: 52,
      borderRadius: raggio.s - 1,
      backgroundColor: c.sfondo,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    cardStrutturaNome: { fontSize: 12.5, fontWeight: "700", color: c.testo },
    cardStrutturaDistanza: { fontSize: 10.5, color: c.testoSecondario },
    cardStrutturaPrezzo: { fontSize: 10.5, fontWeight: "600", color: c.testoSecondario },
    sezioneRecensioni: { marginTop: 18, gap: 10 },
    recensioniIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    recensisciLink: { fontSize: 12, fontWeight: "700" },
    giaRecensito: { fontSize: 11.5, color: c.primario, fontWeight: "600" },
    recensioniVuoto: { fontSize: 12, color: c.testoSecondario },
    recensioneCard: { backgroundColor: c.sfondo, borderRadius: raggio.m, padding: 12, gap: 4 },
    recensioneIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    recensioneNome: { fontSize: 12.5, fontWeight: "700", color: c.testo },
    recensioneData: { fontSize: 10.5, color: c.testoSecondario },
    recensioneTesto: { fontSize: 12, lineHeight: 18, color: c.testo, marginTop: 4 },
  });
}
