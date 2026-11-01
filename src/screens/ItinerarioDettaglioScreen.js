import { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Linking, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { usePreferenze } from "../context/PreferenzeContext";
import { caricaItinerarioDettaglio, DIFFICOLTA_META, TIPO_VEICOLO_META, MODALITA_SENTIERO_META, STATO_ITINERARIO_META } from "../lib/itinerari";
import { caricaRecensioniItinerario, inviaRecensioneItinerario } from "../lib/recensioni";
import { urlMappa } from "../lib/mappa";
import MappaItinerario from "../components/MappaItinerario";
import ModuloRecensione from "../components/ModuloRecensione";

function RigaStelle({ punteggio, size = 12 }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= punteggio ? "star" : "star-outline"} size={size} color="#f59e0b" />
      ))}
    </View>
  );
}

function formattaData(iso) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export default function ItinerarioDettaglioScreen({ route, navigation }) {
  const { itinerarioId } = route.params;
  const { session } = useAuth();
  const { motoreMappa } = usePreferenze();
  const [itinerario, setItinerario] = useState(null);
  const [tappe, setTappe] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [recensioni, setRecensioni] = useState([]);
  const [mostraModuloRecensione, setMostraModuloRecensione] = useState(false);

  useEffect(() => {
    caricaItinerarioDettaglio(itinerarioId)
      .then(({ itinerario, tappe }) => {
        setItinerario(itinerario);
        setTappe(tappe);
      })
      .catch((e) => console.error("Errore nel caricare l'itinerario:", e))
      .finally(() => setCaricamento(false));
  }, [itinerarioId]);

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
        <ActivityIndicator style={{ marginTop: 60 }} color={colori.blu} />
      </View>
    );
  }

  if (!itinerario) return null;

  const metaDifficolta = DIFFICOLTA_META[itinerario.difficolta];
  const metaVeicolo = TIPO_VEICOLO_META[itinerario.tipoVeicolo];
  const metaModalita = MODALITA_SENTIERO_META[itinerario.modalita];
  const coloreAccento = itinerario.categoria === "sentiero" ? "#2f6b3f" : colori.blu;

  return (
    <View style={styles.schermo}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <SafeAreaView edges={["top"]} style={styles.hero}>
          {itinerario.fotoUrl ? (
            <Image source={{ uri: itinerario.fotoUrl }} style={styles.heroImmagine} />
          ) : (
            <Ionicons name={itinerario.categoria === "sentiero" ? "trail-sign-outline" : "car-sport-outline"} size={46} color="#60a5fa" />
          )}
          <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colori.testo} />
          </Pressable>
        </SafeAreaView>

        <View style={styles.contenuto}>
          <Text style={styles.titolo}>{itinerario.titolo}</Text>
          {itinerario.regione ? <Text style={styles.regione}>{itinerario.regione}</Text> : null}

          {itinerario.stato && itinerario.stato !== "approvato" && (
            <View style={[styles.avvisoStato, { backgroundColor: STATO_ITINERARIO_META[itinerario.stato].colore + "18" }]}>
              <Ionicons name="time-outline" size={14} color={STATO_ITINERARIO_META[itinerario.stato].colore} />
              <Text style={[styles.avvisoStatoTesto, { color: STATO_ITINERARIO_META[itinerario.stato].colore }]}>
                {STATO_ITINERARIO_META[itinerario.stato].etichetta} — visibile solo a te finché non viene controllato
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

          {tappe.length > 0 && (
            <View style={styles.sezioneTappe}>
              <Text style={styles.sezioneTitolo}>Tappe</Text>
              {tappe.map((t, i) => (
                <View key={t.id} style={styles.tappa}>
                  <View style={[styles.tappaNumero, { backgroundColor: coloreAccento + "18" }]}>
                    <Text style={[styles.tappaNumeroTesto, { color: coloreAccento }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tappaNome}>
                      {t.nome || "Tappa"}
                      {i === 0 ? "  ·  partenza" : i === tappe.length - 1 ? "  ·  arrivo" : ""}
                    </Text>
                    {t.localitaStruttura ? <Text style={styles.tappaDescrizione}>{t.localitaStruttura}</Text> : null}
                    {t.descrizione ? <Text style={styles.tappaDescrizione}>{t.descrizione}</Text> : null}
                    {t.foto?.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tappaFotoRiga}>
                        {t.foto.map((url) => (
                          <Image key={url} source={{ uri: url }} style={styles.tappaFoto} />
                        ))}
                      </ScrollView>
                    )}
                    {t.lat != null && t.lng != null && (
                      <Pressable
                        style={styles.tappaMappaLink}
                        onPress={() => {
                          const url = urlMappa(t, motoreMappa);
                          if (url) Linking.openURL(url);
                        }}
                      >
                        <Ionicons name="navigate-outline" size={12} color={coloreAccento} />
                        <Text style={[styles.tappaMappaLinkTesto, { color: coloreAccento }]}>Apri in Mappe</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.sezioneRecensioni}>
            <View style={styles.recensioniIntestazione}>
              <Text style={styles.sezioneTitolo}>Recensioni{recensioni.length > 0 ? ` (${recensioni.length})` : ""}</Text>
              {session && !miaRecensione && !mostraModuloRecensione && (
                <Pressable onPress={() => setMostraModuloRecensione(true)}>
                  <Text style={[styles.recensisciLink, { color: coloreAccento }]}>Recensiscilo</Text>
                </Pressable>
              )}
            </View>

            {!session && (
              <Pressable onPress={() => Alert.alert("Accedi", "Accedi al tuo account per lasciare una recensione.")}>
                <Text style={[styles.recensisciLink, { color: coloreAccento }]}>Accedi per recensire</Text>
              </Pressable>
            )}

            {miaRecensione && <Text style={styles.giaRecensito}>✓ Hai già recensito questo percorso</Text>}

            {mostraModuloRecensione && !miaRecensione && (
              <ModuloRecensione
                onInvia={({ punteggio, testo }) =>
                  inviaRecensioneItinerario({
                    itinerarioId: itinerario.id,
                    clienteId: session.user.id,
                    nomeCliente: session.user.user_metadata?.nome || "Utente NaturaGo",
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
              <Text style={styles.recensioniVuoto}>Ancora nessuna recensione.</Text>
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

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.bianco },
  hero: { height: 230, backgroundColor: colori.bluChiaro, alignItems: "center", justifyContent: "center" },
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
  titolo: { fontSize: 19, fontWeight: "800", color: colori.testo },
  regione: { fontSize: 12.5, color: colori.testoSecondario },
  avvisoStato: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 10, padding: 9, marginTop: 8 },
  avvisoStatoTesto: { flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 15 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTesto: { fontSize: 10.5, fontWeight: "700" },
  descrizione: { fontSize: 12.5, lineHeight: 19, color: "#4b5563", marginTop: 6 },
  sezioneTappe: { marginTop: 14, gap: 10 },
  sezioneTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo },
  tappa: { flexDirection: "row", gap: 10 },
  tappaNumero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
  },
  tappaNumeroTesto: { fontSize: 11, fontWeight: "800", color: colori.blu },
  tappaNome: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  tappaDescrizione: { fontSize: 11.5, color: colori.testoSecondario, marginTop: 2, lineHeight: 16 },
  tappaFotoRiga: { marginTop: 6 },
  tappaFoto: { width: 72, height: 72, borderRadius: 10, marginRight: 6, backgroundColor: colori.grigioSfondo },
  tappaMappaLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  tappaMappaLinkTesto: { fontSize: 11, fontWeight: "700" },
  sezioneRecensioni: { marginTop: 18, gap: 10 },
  recensioniIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recensisciLink: { fontSize: 12, fontWeight: "700" },
  giaRecensito: { fontSize: 11.5, color: colori.blu, fontWeight: "600" },
  recensioniVuoto: { fontSize: 12, color: colori.testoSecondario },
  recensioneCard: { backgroundColor: colori.grigioSfondo, borderRadius: 14, padding: 12, gap: 4 },
  recensioneIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recensioneNome: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  recensioneData: { fontSize: 10.5, color: colori.testoSecondario },
  recensioneTesto: { fontSize: 12, lineHeight: 18, color: "#374151", marginTop: 4 },
});
