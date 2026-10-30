import { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Linking, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaSchedaCulturale, CATEGORIA_CULTURALE_META } from "../lib/cultura";
import { caricaRecensioniEvento, inviaRecensioneEvento } from "../lib/recensioni";
import { caricaStruttureVicine } from "../lib/strutture";
import { distanzaKm } from "../lib/geo";
import ModuloRecensione from "../components/ModuloRecensione";

function formattaDataEvento(iso) {
  const d = new Date(iso);
  const testo = d.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" });
  const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `${testo} · ${ora}`;
}

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

function RigaDettaglio({ icona, testo, colore }) {
  if (!testo) return null;
  return (
    <View style={styles.rigaDettaglio}>
      <Ionicons name={icona} size={15} color={colore} />
      <Text style={styles.rigaDettaglioTesto}>{testo}</Text>
    </View>
  );
}

export default function SchedaCulturaleScreen({ route, navigation }) {
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
        <ActivityIndicator style={{ marginTop: 60 }} color={colori.blu} />
      </View>
    );
  }

  if (!scheda) return null;

  const meta = CATEGORIA_CULTURALE_META[scheda.categoria];
  const apriSito = (url) => Linking.openURL(url.startsWith("http") ? url : `https://${url}`);
  const apriMappa = () => {
    if (scheda.lat && scheda.lng) Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(scheda.titolo)}&ll=${scheda.lat},${scheda.lng}`);
  };

  return (
    <View style={styles.schermo}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <SafeAreaView edges={["top"]} style={[styles.hero, { backgroundColor: meta.colore + "18" }]}>
          {scheda.fotoUrl ? (
            <Image source={{ uri: scheda.fotoUrl }} style={styles.heroImmagine} />
          ) : (
            <Ionicons name={meta.icona} size={46} color={meta.colore} />
          )}
          <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colori.testo} />
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
                <Text style={[styles.rigaDettaglioTesto, { color: meta.colore }]}>Visita il sito web</Text>
              </Pressable>
            )}
            {scheda.linkBiglietti && (
              <Pressable style={styles.rigaDettaglio} onPress={() => apriSito(scheda.linkBiglietti)}>
                <Ionicons name="ticket-outline" size={15} color={meta.colore} />
                <Text style={[styles.rigaDettaglioTesto, { color: meta.colore }]}>Biglietti</Text>
              </Pressable>
            )}
            {scheda.lat && scheda.lng && (
              <Pressable style={styles.rigaDettaglio} onPress={apriMappa}>
                <Ionicons name="navigate-outline" size={15} color={meta.colore} />
                <Text style={[styles.rigaDettaglioTesto, { color: meta.colore }]}>Apri in Mappe</Text>
              </Pressable>
            )}
          </View>

          {struttureVicine.length > 0 && (
            <View style={styles.sezionePuoiAlloggiare}>
              <Text style={styles.sezioneTitolo}>Puoi alloggiare qui</Text>
              <View style={{ gap: 7 }}>
                {struttureVicine.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.cardStruttura}
                    onPress={() => navigation.navigate("Scheda", { struttura: s })}
                  >
                    <View style={styles.cardStrutturaFoto}>
                      {s.fotoUrl ? (
                        <Image source={{ uri: s.fotoUrl }} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <Ionicons name="image-outline" size={20} color={colori.testoSecondario} />
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.cardStrutturaNome} numberOfLines={1}>
                        {s.nome}
                      </Text>
                      <Text style={styles.cardStrutturaDistanza}>
                        {s.distanzaKm < 1 ? "<1" : s.distanzaKm.toFixed(1)} km
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 1 }}>
                        {s.prezzo != null && <Text style={styles.cardStrutturaPrezzo}>da {s.prezzo}€/notte</Text>}
                        {s.rating ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                            <Ionicons name="star" size={10} color="#f59e0b" />
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
              <Text style={styles.sezioneTitolo}>Recensioni{recensioni.length > 0 ? ` (${recensioni.length})` : ""}</Text>
              {session && !miaRecensione && !mostraModuloRecensione && (
                <Pressable onPress={() => setMostraModuloRecensione(true)}>
                  <Text style={[styles.recensisciLink, { color: meta.colore }]}>Recensiscila</Text>
                </Pressable>
              )}
            </View>

            {!session && (
              <Pressable onPress={() => Alert.alert("Accedi", "Accedi al tuo account per lasciare una recensione.")}>
                <Text style={[styles.recensisciLink, { color: meta.colore }]}>Accedi per recensire</Text>
              </Pressable>
            )}

            {miaRecensione && <Text style={styles.giaRecensito}>✓ Hai già recensito questa scheda</Text>}

            {mostraModuloRecensione && !miaRecensione && (
              <ModuloRecensione
                onInvia={({ punteggio, testo }) =>
                  inviaRecensioneEvento({
                    eventoId: scheda.id,
                    clienteId: session.user.id,
                    nomeCliente: session.user.user_metadata?.nome || "Utente NaturaGo",
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
    borderRadius: 999,
  },
  badgeTipoTesto: { fontSize: 10, fontWeight: "700" },
  titolo: { fontSize: 19, fontWeight: "800", color: colori.testo },
  localita: { fontSize: 12, color: colori.testoSecondario },
  descrizione: { fontSize: 12.5, lineHeight: 19, color: "#4b5563" },
  sezione: { gap: 8, marginTop: 6 },
  rigaDettaglio: { flexDirection: "row", alignItems: "center", gap: 8 },
  rigaDettaglioTesto: { flex: 1, fontSize: 12, color: "#374151", lineHeight: 17 },
  sezioneTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo },
  sezionePuoiAlloggiare: { gap: 8, marginTop: 14 },
  cardStruttura: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 12,
    padding: 8,
  },
  cardStrutturaFoto: {
    width: 52,
    height: 52,
    borderRadius: 9,
    backgroundColor: colori.grigioSfondo,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardStrutturaNome: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  cardStrutturaDistanza: { fontSize: 10.5, color: colori.testoSecondario },
  cardStrutturaPrezzo: { fontSize: 10.5, fontWeight: "600", color: colori.testoSecondario },
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
