import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { usePreferenze } from "../context/PreferenzeContext";
import {
  caricaItinerarioDettaglio,
  DIFFICOLTA_META,
  TIPO_VEICOLO_META,
  MODALITA_SENTIERO_META,
  STATO_ITINERARIO_META,
  salvaItinerarioOffline,
  leggiItinerarioOffline,
  rimuoviItinerarioOfflineSalvato,
  itinerarioSalvatoOffline,
} from "../lib/itinerari";
import { vibraLeggera, vibraConferma } from "../lib/vibrazione";
import { caricaRecensioniItinerario, inviaRecensioneItinerario } from "../lib/recensioni";
import { urlMappa, urlPercorso } from "../lib/mappa";
import Pulsante from "../components/ui/Pulsante";
import MappaItinerario from "../components/MappaItinerario";
import ModuloRecensione from "../components/ModuloRecensione";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import RigaStelle from "../components/ui/RigaStelle";
import { useT } from "../i18n/i18n";
import { apriLink } from "../lib/linkEsterni";

function formattaData(iso) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export default function ItinerarioDettaglioScreen({ route, navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { itinerarioId } = route.params;
  const { session } = useAuth();
  const { motoreMappa } = usePreferenze();
  const [itinerario, setItinerario] = useState(null);
  const [tappe, setTappe] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [daCacheOffline, setDaCacheOffline] = useState(false);
  const [salvatoOffline, setSalvatoOffline] = useState(false);
  const [recensioni, setRecensioni] = useState([]);
  const [mostraModuloRecensione, setMostraModuloRecensione] = useState(false);

  useEffect(() => {
    let attivo = true;
    caricaItinerarioDettaglio(itinerarioId)
      .then(async ({ itinerario, tappe }) => {
        if (!attivo) return;
        setItinerario(itinerario);
        setTappe(tappe);
        setDaCacheOffline(false);
        // Se l'utente l'aveva già salvato per l'uso offline, la copia resta
        // aggiornata ai dati appena arrivati dal server — non si salva da
        // sola la prima volta che si apre, solo quando scelto col bottone.
        if (await itinerarioSalvatoOffline(itinerarioId)) {
          await salvaItinerarioOffline({ itinerario, tappe });
          if (attivo) setSalvatoOffline(true);
        }
      })
      .catch(async (e) => {
        console.error("Errore nel caricare l'itinerario:", e);
        // Senza connessione (o un errore di rete): si prova con l'ultima
        // copia salvata per l'uso offline, invece di mostrare solo un
        // errore — lo stesso principio di salvaInCache/leggiDaCache già
        // usato per l'elenco strutture in Esplora.
        const offline = await leggiItinerarioOffline(itinerarioId);
        if (!attivo) return;
        if (offline) {
          setItinerario(offline.itinerario);
          setTappe(offline.tappe);
          setDaCacheOffline(true);
          setSalvatoOffline(true);
        }
      })
      .finally(() => attivo && setCaricamento(false));
    return () => {
      attivo = false;
    };
  }, [itinerarioId]);

  const toggleSalvaOffline = async () => {
    vibraLeggera();
    if (salvatoOffline) {
      await rimuoviItinerarioOfflineSalvato(itinerarioId);
      setSalvatoOffline(false);
    } else if (itinerario) {
      await salvaItinerarioOffline({ itinerario, tappe });
      setSalvatoOffline(true);
      vibraConferma();
    }
  };

  const caricaRecensioniItin = () => {
    caricaRecensioniItinerario(itinerarioId)
      .then(setRecensioni)
      .catch((e) => console.error("Errore nel caricare le recensioni:", e));
  };

  useEffect(caricaRecensioniItin, [itinerarioId]);

  const miaRecensione = session?.user?.id ? recensioni.find((r) => r.clienteId === session.user.id) : null;

  if (caricamento) {
    return (
      <View style={styles.schermo}>
        <ActivityIndicator style={{ marginTop: 60 }} color={c.primario} />
      </View>
    );
  }

  if (!itinerario) return null;

  const metaDifficolta = DIFFICOLTA_META[itinerario.difficolta];
  const metaVeicolo = TIPO_VEICOLO_META[itinerario.tipoVeicolo];
  const metaModalita = MODALITA_SENTIERO_META[itinerario.modalita];
  const coloreAccento = itinerario.categoria === "sentiero" ? "#2f6b3f" : c.primario;

  return (
    <View style={styles.schermo}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <SafeAreaView edges={["top"]} style={styles.hero}>
          <ImmagineConRiserva
            uri={itinerario.fotoUrl}
            larghezza={780}
            style={styles.heroImmagine}
            icona={itinerario.categoria === "sentiero" ? "trail-sign-outline" : "car-sport-outline"}
            iconaDimensione={46}
            iconaColore="#60a5fa"
          />
          <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={c.testo} />
          </Pressable>
          <Pressable
            style={styles.offlineBottone}
            onPress={toggleSalvaOffline}
            accessibilityRole="button"
            accessibilityLabel={salvatoOffline ? t("itinerario.rimuoviOffline") : t("itinerario.salvaOffline")}
          >
            <Ionicons name={salvatoOffline ? "cloud-done" : "cloud-download-outline"} size={18} color={salvatoOffline ? c.successo : c.testo} />
          </Pressable>
        </SafeAreaView>

        <View style={styles.contenuto}>
          <Text style={styles.titolo}>{itinerario.titolo}</Text>
          {itinerario.regione ? <Text style={styles.regione}>{itinerario.regione}</Text> : null}

          {daCacheOffline && (
            <View style={styles.avvisoOffline}>
              <Ionicons name="cloud-offline-outline" size={14} color={c.testoSecondario} />
              <Text style={styles.avvisoOfflineTesto}>{t("itinerario.avvisoOffline")}</Text>
            </View>
          )}

          {itinerario.stato && itinerario.stato !== "approvato" && (
            <View style={[styles.avvisoStato, { backgroundColor: STATO_ITINERARIO_META[itinerario.stato].colore + "18" }]}>
              <Ionicons name="time-outline" size={14} color={STATO_ITINERARIO_META[itinerario.stato].colore} />
              <Text style={[styles.avvisoStatoTesto, { color: STATO_ITINERARIO_META[itinerario.stato].colore }]}>
                {STATO_ITINERARIO_META[itinerario.stato].etichetta} — {t("itinerario.visibileSoloTe")}
              </Text>
            </View>
          )}

          <View style={styles.badges}>
            {metaDifficolta && (
              <View style={[styles.badge, { backgroundColor: metaDifficolta.colore + "22" }]}>
                <Text style={[styles.badgeTesto, { color: metaDifficolta.colore }]}>{metaDifficolta.etichetta}</Text>
              </View>
            )}
            {metaVeicolo && (
              <View style={[styles.badge, { backgroundColor: coloreAccento + "18" }]}>
                <Ionicons name={metaVeicolo.icona} size={12} color={coloreAccento} />
                <Text style={[styles.badgeTesto, { color: coloreAccento }]}>{metaVeicolo.etichetta}</Text>
              </View>
            )}
            {metaModalita && (
              <View style={[styles.badge, { backgroundColor: coloreAccento + "18" }]}>
                <Ionicons name={metaModalita.icona} size={12} color={coloreAccento} />
                <Text style={[styles.badgeTesto, { color: coloreAccento }]}>{metaModalita.etichetta}</Text>
              </View>
            )}
            {itinerario.tempoStimato && (
              <View style={[styles.badge, { backgroundColor: coloreAccento + "18" }]}>
                <Ionicons name="time-outline" size={12} color={coloreAccento} />
                <Text style={[styles.badgeTesto, { color: coloreAccento }]}>{itinerario.tempoStimato}</Text>
              </View>
            )}
            {itinerario.lunghezzaKm && (
              <View style={[styles.badge, { backgroundColor: coloreAccento + "18" }]}>
                <Text style={[styles.badgeTesto, { color: coloreAccento }]}>{itinerario.lunghezzaKm} km</Text>
              </View>
            )}
            {itinerario.dislivelloM != null && (
              <View style={[styles.badge, { backgroundColor: coloreAccento + "18" }]}>
                <Text style={[styles.badgeTesto, { color: coloreAccento }]}>↑ {itinerario.dislivelloM} m</Text>
              </View>
            )}
          </View>

          {itinerario.descrizione ? <Text style={styles.descrizione}>{itinerario.descrizione}</Text> : null}

          <MappaItinerario tappe={tappe} colore={coloreAccento} />

          {tappe.some((tp) => tp.lat != null && tp.lng != null) && (
            <Pulsante
              titolo={t("itinerario.avviaNavigazione")}
              icona={<Ionicons name="navigate" size={18} color={c.sulPrimario} />}
              sfondoPersonalizzato={coloreAccento}
              onPress={() => {
                const url = urlPercorso(tappe, motoreMappa);
                if (url) apriLink(url, t("comune.linkNonApribile"));
              }}
            />
          )}

          {tappe.length > 0 && (
            <View style={styles.sezioneTappe}>
              <Text style={styles.sezioneTitolo}>{t("itinerario.tappe")}</Text>
              {tappe.map((tappa, i) => (
                <View key={tappa.id} style={styles.tappa}>
                  <View style={[styles.tappaNumero, { backgroundColor: coloreAccento + "18" }]}>
                    <Text style={[styles.tappaNumeroTesto, { color: coloreAccento }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tappaNome}>
                      {tappa.nome || t("itinerario.tappaDefault")}
                      {i === 0 ? `  ·  ${t("itinerario.partenza")}` : i === tappe.length - 1 ? `  ·  ${t("itinerario.arrivo")}` : ""}
                    </Text>
                    {tappa.localitaStruttura ? <Text style={styles.tappaDescrizione}>{tappa.localitaStruttura}</Text> : null}
                    {tappa.descrizione ? <Text style={styles.tappaDescrizione}>{tappa.descrizione}</Text> : null}
                    {tappa.foto?.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tappaFotoRiga}>
                        {tappa.foto.map((url) => (
                          <Image key={url} source={{ uri: url }} style={styles.tappaFoto} contentFit="cover" transition={150} />
                        ))}
                      </ScrollView>
                    )}
                    {tappa.lat != null && tappa.lng != null && (
                      <Pressable
                        style={styles.tappaMappaLink}
                        onPress={() => {
                          const url = urlMappa(tappa, motoreMappa);
                          if (url) apriLink(url, t("comune.linkNonApribile"));
                        }}
                      >
                        <Ionicons name="navigate-outline" size={12} color={coloreAccento} />
                        <Text style={[styles.tappaMappaLinkTesto, { color: coloreAccento }]}>{t("comune.apriInMappe")}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.sezioneRecensioni}>
            <View style={styles.recensioniIntestazione}>
              <Text style={styles.sezioneTitolo}>{t("recensioni.titolo")}{recensioni.length > 0 ? ` (${recensioni.length})` : ""}</Text>
              {session && !miaRecensione && !mostraModuloRecensione && (
                <Pressable onPress={() => setMostraModuloRecensione(true)}>
                  <Text style={[styles.recensisciLink, { color: coloreAccento }]}>{t("recensioni.scriviLink")}</Text>
                </Pressable>
              )}
            </View>

            {!session && (
              <Pressable onPress={() => Alert.alert(t("accedi.titoloAccedi"), t("recensioni.accediMessaggio"))}>
                <Text style={[styles.recensisciLink, { color: coloreAccento }]}>{t("recensioni.accediLink")}</Text>
              </Pressable>
            )}

            {miaRecensione && <Text style={styles.giaRecensito}>{t("recensioni.giaRecensito")}</Text>}

            {mostraModuloRecensione && !miaRecensione && (
              <ModuloRecensione
                onInvia={({ punteggio, testo }) =>
                  inviaRecensioneItinerario({
                    itinerarioId: itinerario.id,
                    clienteId: session.user.id,
                    nomeCliente: session.user.user_metadata?.nome || t("comune.utenteDefault"),
                    punteggio,
                    testo,
                  })
                }
                onInviata={() => {
                  setMostraModuloRecensione(false);
                  caricaRecensioniItin();
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
    </View>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondoGruppo },
  hero: { height: 230, backgroundColor: c.primarioChiaro, alignItems: "center", justifyContent: "center" },
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
  offlineBottone: {
    position: "absolute",
    top: 52,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  contenuto: { padding: 20, gap: 10 },
  titolo: { fontSize: 19, fontWeight: "800", color: c.testo },
  avvisoOffline: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  avvisoOfflineTesto: { flex: 1, fontSize: 11, color: c.testoSecondario, lineHeight: 15 },
  regione: { fontSize: 12.5, color: c.testoSecondario },
  avvisoStato: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 10, padding: 9, marginTop: 8 },
  avvisoStatoTesto: { flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 15 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTesto: { fontSize: 10.5, fontWeight: "700" },
  descrizione: { fontSize: 12.5, lineHeight: 19, color: c.testoSecondario, marginTop: 6 },
  sezioneTappe: { marginTop: 14, gap: 10 },
  sezioneTitolo: { fontSize: 15, fontWeight: "800", color: c.testo },
  tappa: { flexDirection: "row", gap: 10 },
  tappaNumero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.primarioChiaro,
    alignItems: "center",
    justifyContent: "center",
  },
  tappaNumeroTesto: { fontSize: 11, fontWeight: "800", color: c.primario },
  tappaNome: { fontSize: 12.5, fontWeight: "700", color: c.testo },
  tappaDescrizione: { fontSize: 11.5, color: c.testoSecondario, marginTop: 2, lineHeight: 16 },
  tappaFotoRiga: { marginTop: 6 },
  tappaFoto: { width: 72, height: 72, borderRadius: 10, marginRight: 6, backgroundColor: c.sfondo },
  tappaMappaLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  tappaMappaLinkTesto: { fontSize: 11, fontWeight: "700" },
  sezioneRecensioni: { marginTop: 18, gap: 10 },
  recensioniIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recensisciLink: { fontSize: 12, fontWeight: "700" },
  giaRecensito: { fontSize: 11.5, color: c.primario, fontWeight: "600" },
  recensioniVuoto: { fontSize: 12, color: c.testoSecondario },
  recensioneCard: { backgroundColor: c.sfondo, borderRadius: 14, padding: 12, gap: 4 },
  recensioneIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recensioneNome: { fontSize: 12.5, fontWeight: "700", color: c.testo },
  recensioneData: { fontSize: 10.5, color: c.testoSecondario },
  recensioneTesto: { fontSize: 12, lineHeight: 18, color: c.testo, marginTop: 4 },
  });
}
