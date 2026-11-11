import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { usePreferenze } from "../context/PreferenzeContext";
import { caricaIdPreferiti, toggleFavorito, sipuoSalvare } from "../lib/preferiti";
import { urlMappa } from "../lib/mappa";
import { caricaRecensioni, inviaRecensioneStruttura } from "../lib/recensioni";
import { caricaDettaglioStruttura, caricaPiazzoleStruttura, ETICHETTA_TIPO_ALLOGGIO } from "../lib/strutture";
import { ETICHETTA_SERVIZIO } from "../lib/filtriServizi";
import { caricaCulturaVicina, CATEGORIA_CULTURALE_META } from "../lib/cultura";
import ModuloRecensione from "../components/ModuloRecensione";
import ImmagineConRiserva from "../components/ImmagineConRiserva";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

// Stesse etichette di TIPO_AMBIENTE_META sul sito (src/App.jsx).
const ETICHETTA_AMBIENTE = {
  lago: "Lago",
  mare: "Mare",
  montagna: "Montagna",
  collina: "Collina",
  agriturismo: "Agriturismo",
  valle: "Valle",
};

// Uniche 3 categorie in uso sul database (verificate dal vivo).
const ETICHETTA_INTERESSE = {
  cultura: "Cultura",
  relax: "Relax",
  natura: "Natura",
};

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

function RigaDettaglio({ icona, testo }) {
  if (!testo) return null;
  return (
    <View style={styles.rigaDettaglio}>
      <Ionicons name={icona} size={15} color={colori.testoSecondario} />
      <Text style={styles.rigaDettaglioTesto}>{testo}</Text>
    </View>
  );
}

export default function SchedaScreen({ route, navigation }) {
  const { struttura } = route.params;
  const { session } = useAuth();
  const { motoreMappa } = usePreferenze();
  const [preferito, setPreferito] = useState(false);
  const [recensioni, setRecensioni] = useState([]);
  const [caricandoRecensioni, setCaricandoRecensioni] = useState(false);
  const [mostraModuloRecensione, setMostraModuloRecensione] = useState(false);
  const [dettaglio, setDettaglio] = useState(null);
  const [culturaVicina, setCulturaVicina] = useState([]);
  const [piazzole, setPiazzole] = useState([]);

  useEffect(() => {
    if (sipuoSalvare(struttura)) {
      caricaIdPreferiti(session?.user?.id).then((ids) => setPreferito(ids.has(struttura.idOriginale)));
    }
  }, [session?.user?.id, struttura.idOriginale]);

  useEffect(() => {
    caricaDettaglioStruttura(struttura)
      .then(setDettaglio)
      .catch((e) => console.error("Errore nel caricare il dettaglio della struttura:", e));
  }, [struttura.origine, struttura.idOriginale]);

  // Piazzole e alloggi fissi: sempre visibili, con foto, senza bisogno di
  // scegliere delle date (stessa regola del sito, vedi commento su
  // caricaPiazzoleStruttura in src/lib/strutture.js).
  useEffect(() => {
    if (struttura.origine !== "campeggi_pubblici") return;
    caricaPiazzoleStruttura(struttura.idOriginale)
      .then(setPiazzole)
      .catch((e) => console.error("Errore nel caricare piazzole e alloggi:", e));
  }, [struttura.origine, struttura.idOriginale]);

  const caricaRecensioniStruttura = () => {
    if (struttura.origine !== "campeggi_pubblici") return;
    setCaricandoRecensioni(true);
    caricaRecensioni(struttura.idOriginale)
      .then(setRecensioni)
      .catch((e) => console.error("Errore nel caricare le recensioni:", e))
      .finally(() => setCaricandoRecensioni(false));
  };

  useEffect(() => {
    Promise.resolve().then(() => caricaRecensioniStruttura());
  }, [struttura.origine, struttura.idOriginale]);

  // Direzione "struttura -> cultura", il cuore del sito: musei, borghi ed
  // eventi da visitare entro 50 km, per incrociare i dati con l'interesse
  // di chi guarda questa scheda — stessa logica di CulturaViciniStruttura
  // sul sito, qui lato app.
  useEffect(() => {
    caricaCulturaVicina({
      lat: struttura.lat,
      lng: struttura.lng,
      escludiCampeggioId: struttura.origine === "campeggi_pubblici" ? struttura.idOriginale : undefined,
    })
      .then(setCulturaVicina)
      .catch((e) => console.error("Errore nel caricare cosa visitare nei dintorni:", e));
  }, [struttura.lat, struttura.lng, struttura.origine, struttura.idOriginale]);

  const miaRecensione = session?.user?.id ? recensioni.find((r) => r.clienteId === session.user.id) : null;

  const onPreferito = async () => {
    if (!session?.user?.id) {
      Alert.alert("Accedi", "Accedi al tuo account per salvare le strutture nei preferiti.", [
        { text: "Annulla", style: "cancel" },
        { text: "Accedi", onPress: () => navigation.navigate("Accedi") },
      ]);
      return;
    }
    const nuovoStato = !preferito;
    setPreferito(nuovoStato);
    const error = await toggleFavorito(session.user.id, struttura.idOriginale, nuovoStato);
    if (error) setPreferito(!nuovoStato);
  };

  const apriChiamata = () => {
    const tel = struttura.telefono || dettaglio?.telefono;
    if (tel) Linking.openURL(`tel:${tel}`);
  };

  const apriMappa = () => {
    const url = urlMappa(struttura, motoreMappa);
    if (url) Linking.openURL(url);
  };

  const apriSito = () => {
    if (dettaglio?.sitoWeb) Linking.openURL(dettaglio.sitoWeb.startsWith("http") ? dettaglio.sitoWeb : `https://${dettaglio.sitoWeb}`);
  };

  const apriRivendica = () => {
    Linking.openURL(`https://www.naturago.it/host?modo=registrati&nome=${encodeURIComponent(struttura.nome)}`);
  };

  const periodoApertura = (() => {
    if (!dettaglio) return null;
    if (struttura.origine === "rifugi" || struttura.origine === "camper_service") return dettaglio.periodoApertura || null;
    if (dettaglio.periodoAperturaTipo && dettaglio.periodoAperturaTipo !== "stagionale") return "Aperto tutto l'anno";
    if (dettaglio.aperturaMeseInizio && dettaglio.aperturaMeseFine) {
      return `Aperto da ${MESI[dettaglio.aperturaMeseInizio - 1]} a ${MESI[dettaglio.aperturaMeseFine - 1]}`;
    }
    return null;
  })();

  const serviziPresenti = (dettaglio?.amenities || []).map((chiave) => ETICHETTA_SERVIZIO[chiave]).filter(Boolean);

  return (
    <View style={styles.schermo}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <SafeAreaView edges={["top"]} style={styles.hero}>
          <ImmagineConRiserva
            uri={struttura.fotoUrl}
            larghezza={780}
            style={styles.heroImmagine}
            iconaDimensione={46}
            iconaColore="#60a5fa"
          />
          <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colori.testo} />
          </Pressable>
          {sipuoSalvare(struttura) && (
            <Pressable style={styles.preferitoBottone} onPress={onPreferito}>
              <Ionicons name={preferito ? "heart" : "heart-outline"} size={18} color={colori.rosso} />
            </Pressable>
          )}
        </SafeAreaView>

        <View style={styles.contenuto}>
          <View style={styles.rigaBadge}>
            <Text style={styles.badgeTipo}>{struttura.tipo}</Text>
            {dettaglio?.verificato && (
              <View style={styles.badgeVerificato}>
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                <Text style={styles.badgeVerificatoTesto}>Verificata</Text>
              </View>
            )}
            {dettaglio?.badgeCulturaleAnno && (
              <View style={styles.badgeCulturale}>
                <Ionicons name="ribbon-outline" size={12} color="#9333ea" />
                <Text style={styles.badgeCulturaleTesto}>Bene culturale dal {dettaglio.badgeCulturaleAnno}</Text>
              </View>
            )}
          </View>

          <Text style={styles.titolo}>{struttura.nome}</Text>
          <View style={styles.rigaInfo}>
            <Text style={styles.localita}>{struttura.localita}</Text>
            {struttura.rating ? (
              <View style={styles.rigaRating}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.rating}>
                  {struttura.rating} ({struttura.recensioni || 0})
                </Text>
              </View>
            ) : null}
          </View>

          {dettaglio?.chiusaTemporaneamente && (
            <View style={styles.avvisoRosso}>
              <Ionicons name="alert-circle" size={16} color="#dc2626" />
              <Text style={styles.avvisoRossoTesto}>
                Chiusa temporaneamente{dettaglio.chiusaTemporaneamenteMotivo ? `: ${dettaglio.chiusaTemporaneamenteMotivo}` : ""}
              </Text>
            </View>
          )}
          {dettaglio?.divietoCamper && (
            <View style={styles.avvisoArancio}>
              <Ionicons name="warning-outline" size={16} color="#ea580c" />
              <Text style={styles.avvisoAranciotesto}>
                Divieto camper{dettaglio.divietoCamperMotivo ? `: ${dettaglio.divietoCamperMotivo}` : ""}
              </Text>
            </View>
          )}
          {dettaglio?.avvisoVerifica && (
            <View style={styles.avvisoArancio}>
              <Ionicons name="information-circle-outline" size={16} color="#ea580c" />
              <Text style={styles.avvisoAranciotesto}>{dettaglio.notaVerifica || "Dati da verificare sul posto."}</Text>
            </View>
          )}
          {dettaglio?.verificato === false && (
            <View style={styles.avvisoRivendica}>
              <Ionicons name="shield-outline" size={20} color={colori.testoSecondario} />
              <Text style={styles.avvisoRivendicaTitolo}>Questa scheda non è ancora stata verificata</Text>
              <Text style={styles.avvisoRivendicaTesto}>
                Non è ancora possibile prenotare qui. Se gestisci tu questa struttura, rivendica gratis la scheda per completarla e iniziare a ricevere prenotazioni.
              </Text>
              <Pressable style={styles.bottoneRivendica} onPress={apriRivendica}>
                <Text style={styles.bottoneRivendicaTesto}>Sei il gestore? Rivendica questa scheda gratis</Text>
              </Pressable>
            </View>
          )}

          {struttura.descrizione ? <Text style={styles.descrizione}>{struttura.descrizione}</Text> : null}
          {dettaglio?.descrizioneEstesa && dettaglio.descrizioneEstesa !== struttura.descrizione ? (
            <Text style={styles.descrizione}>{dettaglio.descrizioneEstesa}</Text>
          ) : null}

          {/* Informazioni pratiche */}
          <View style={styles.sezione}>
            <RigaDettaglio icona="location-outline" testo={dettaglio?.indirizzo ? `${dettaglio.indirizzo}${dettaglio.cap ? `, ${dettaglio.cap}` : ""}` : null} />
            <RigaDettaglio icona="calendar-outline" testo={periodoApertura} />
            <RigaDettaglio
              icona="log-in-outline"
              testo={dettaglio?.orarioCheckin ? `Check-in dalle ${dettaglio.orarioCheckin}` : null}
            />
            <RigaDettaglio
              icona="log-out-outline"
              testo={dettaglio?.orarioCheckout ? `Check-out entro le ${dettaglio.orarioCheckout}` : null}
            />
            <RigaDettaglio
              icona="time-outline"
              testo={
                dettaglio?.lateCheckoutDisponibile
                  ? `Late check-out disponibile${dettaglio.lateCheckoutOrario ? ` fino alle ${dettaglio.lateCheckoutOrario}` : ""}${
                      dettaglio.lateCheckoutAPagamento ? ` (a pagamento${dettaglio.lateCheckoutPrezzo ? `, ${dettaglio.lateCheckoutPrezzo}€` : ""})` : ""
                    }`
                  : null
              }
            />
            <RigaDettaglio
              icona="resize-outline"
              testo={
                dettaglio?.piazzolaLunghezzaMax
                  ? `Piazzole fino a ${dettaglio.piazzolaLunghezzaMax}×${dettaglio.piazzolaLarghezzaMax || "?"} m`
                  : null
              }
            />
            <RigaDettaglio
              icona="swap-vertical-outline"
              testo={dettaglio?.altezzaMassimaM ? `Altezza massima consentita ${dettaglio.altezzaMassimaM} m` : null}
            />
            <RigaDettaglio
              icona="bus-outline"
              testo={dettaglio?.fermataBusVicina ? "Fermata bus vicina" : null}
            />
            <RigaDettaglio
              icona="train-outline"
              testo={dettaglio?.stazioneTrenoVicina ? "Stazione treno vicina" : null}
            />
            <RigaDettaglio
              icona="language-outline"
              testo={dettaglio?.linguaParlate?.length > 0 ? `Lingue parlate: ${dettaglio.linguaParlate.join(", ")}` : null}
            />
            <RigaDettaglio
              icona="footsteps-outline"
              testo={dettaglio?.attivitaVicinanze?.length > 0 ? `Nelle vicinanze: ${dettaglio.attivitaVicinanze.join(", ")}` : null}
            />
            <RigaDettaglio
              icona="leaf-outline"
              testo={
                dettaglio?.tipoAmbiente?.length > 0
                  ? dettaglio.tipoAmbiente.map((a) => ETICHETTA_AMBIENTE[a] || a).join(", ")
                  : null
              }
            />
            <RigaDettaglio
              icona="heart-outline"
              testo={
                dettaglio?.categorieInteresse?.length > 0
                  ? `Adatta a chi cerca: ${dettaglio.categorieInteresse.map((c) => ETICHETTA_INTERESSE[c] || c).join(", ")}`
                  : null
              }
            />
            <RigaDettaglio icona="home-outline" testo={dettaglio?.haAlloggiFissi ? "Offre anche alloggi fissi, oltre alle piazzole" : null} />
            <RigaDettaglio icona="sparkles-outline" testo={dettaglio?.haEventiFuturi ? "Eventi culturali in programma" : null} />
            {dettaglio?.sitoWeb && (
              <Pressable style={styles.rigaDettaglio} onPress={apriSito}>
                <Ionicons name="globe-outline" size={15} color={colori.blu} />
                <Text style={[styles.rigaDettaglioTesto, { color: colori.blu }]}>Visita il sito web</Text>
              </Pressable>
            )}
          </View>

          {/* Rifugi: info specifiche */}
          {struttura.origine === "rifugi" && (
            <View style={styles.sezione}>
              <RigaDettaglio icona="trending-up-outline" testo={dettaglio?.quotaM ? `${dettaglio.quotaM} m di quota` : null} />
              <RigaDettaglio icona="person-outline" testo={dettaglio?.proprietario ? `Gestito da ${dettaglio.proprietario}` : null} />
              <RigaDettaglio icona="bed-outline" testo={dettaglio?.postiLetto ? `${dettaglio.postiLetto} posti letto` : null} />
              <RigaDettaglio
                icona="restaurant-outline"
                testo={dettaglio?.ristoro ? `Punto ristoro${dettaglio.ristoroNote ? `: ${dettaglio.ristoroNote}` : ""}` : null}
              />
            </View>
          )}

          {serviziPresenti.length > 0 && (
            <View style={styles.sezione}>
              <Text style={styles.sezioneTitolo}>Servizi</Text>
              <View style={styles.servizi}>
                {serviziPresenti.map((s) => (
                  <View key={s} style={styles.servizioPill}>
                    <Text style={styles.servizioPillTesto}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {struttura.tipo === "Camper service" && dettaglio && (dettaglio.parcheggioTariffa || dettaglio.parcheggioPosti) && (
            <View style={styles.sezione}>
              <Text style={styles.sezioneTitolo}>Parcheggio</Text>
              <RigaDettaglio
                icona="cash-outline"
                testo={dettaglio.parcheggioPrezzoTesto || (dettaglio.parcheggioTariffa === "gratuito" ? "Gratuito" : dettaglio.parcheggioTariffa === "a_pagamento" ? "A pagamento" : dettaglio.parcheggioTariffa === "misto" ? "Parzialmente a pagamento" : null)}
              />
              <RigaDettaglio icona="car-outline" testo={dettaglio.parcheggioPosti ? `${dettaglio.parcheggioPosti} posti` : null} />
              <RigaDettaglio icona="shield-checkmark-outline" testo={dettaglio.parcheggioSorvegliato ? "Sorvegliato" : null} />
              <RigaDettaglio icona="layers-outline" testo={dettaglio.parcheggioSuperficie ? `Fondo: ${dettaglio.parcheggioSuperficie}` : null} />
              <RigaDettaglio icona="bulb-outline" testo={dettaglio.parcheggioIlluminato ? "Illuminato" : null} />
            </View>
          )}

          {dettaglio?.camperServiceNonOspiti && (
            <View style={styles.sezione}>
              <Text style={styles.sezioneTitolo}>Camper service (anche per chi non alloggia)</Text>
              <RigaDettaglio icona="water-outline" testo={dettaglio.camperServiceScaricoNere ? "Scarico acque nere" : null} />
              <RigaDettaglio icona="water-outline" testo={dettaglio.camperServiceScaricoGrigie ? "Scarico acque grigie" : null} />
              <RigaDettaglio icona="flask-outline" testo={dettaglio.camperServiceCaricoAcqua ? "Carico acqua potabile" : null} />
              <RigaDettaglio icona="flash-outline" testo={dettaglio.camperServiceCorrente ? "Corrente elettrica" : null} />
              <RigaDettaglio icona="pricetag-outline" testo={dettaglio.camperServiceCosto || (dettaglio.camperServiceAltro ?? null)} />
            </View>
          )}

          {struttura.origine === "camper_service" && dettaglio && (
            <View style={styles.sezione}>
              <Text style={styles.sezioneTitolo}>Servizi</Text>
              <RigaDettaglio icona="key-outline" testo={dettaglio.accesso ? `Accesso ${dettaglio.accesso}` : null} />
              <RigaDettaglio icona="pricetag-outline" testo={dettaglio.costoIndicativo || null} />
              <RigaDettaglio icona="water-outline" testo={dettaglio.scaricoAcqueNere ? "Scarico acque nere" : null} />
              <RigaDettaglio icona="water-outline" testo={dettaglio.scaricoAcqueGrigie ? "Scarico acque grigie" : null} />
              <RigaDettaglio icona="flask-outline" testo={dettaglio.caricoAcquaPotabile ? "Carico acqua potabile" : null} />
              <RigaDettaglio icona="flash-outline" testo={dettaglio.correnteElettrica ? "Corrente elettrica" : null} />
              <RigaDettaglio icona="time-outline" testo={dettaglio.orari || null} />
              <RigaDettaglio icona="ellipsis-horizontal-outline" testo={dettaglio.altriServizi || null} />
            </View>
          )}

          {piazzole.length > 0 && (
            <View style={styles.sezione}>
              <Text style={styles.sezioneTitolo}>Piazzole e alloggi</Text>
              <View style={styles.piazzoleGriglia}>
                {piazzole.map((pz) => {
                  const eAlloggio = pz.tipo === "alloggio";
                  const titolo = eAlloggio
                    ? `${ETICHETTA_TIPO_ALLOGGIO[pz.tipoAlloggio] || "Alloggio"}${pz.numero ? ` · ${pz.numero}` : ""}`
                    : `Piazzola${pz.numero ? ` ${pz.numero}` : ""}`;
                  const dettagli = eAlloggio
                    ? [
                        pz.postiLetto ? `${pz.postiLetto} posti letto` : null,
                        pz.stanze ? `${pz.stanze} stanze` : null,
                        pz.mq ? `${pz.mq} mq` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : pz.lunghezza && pz.larghezza
                    ? `${pz.lunghezza} x ${pz.larghezza} m`
                    : null;
                  return (
                    <View key={pz.id} style={styles.piazzolaCard}>
                      <View style={styles.piazzolaFoto}>
                        <ImmagineConRiserva
                          uri={pz.fotoUrl}
                          larghezza={300}
                          style={styles.piazzolaFoto}
                          icona="image-outline"
                          iconaDimensione={20}
                          iconaColore={colori.testoSecondario}
                        />
                      </View>
                      <View style={styles.piazzolaInfo}>
                        <View style={styles.piazzolaRigaTitolo}>
                          <Text style={styles.piazzolaTitolo} numberOfLines={1}>
                            {titolo}
                          </Text>
                          {pz.prezzo != null && <Text style={styles.piazzolaPrezzo}>{pz.prezzo}€/notte</Text>}
                        </View>
                        {dettagli && <Text style={styles.piazzolaDettagli}>{dettagli}</Text>}
                        {pz.descrizione && (
                          <Text style={styles.piazzolaDescrizione} numberOfLines={2}>
                            {pz.descrizione}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {culturaVicina.length > 0 && (
            <View style={styles.sezione}>
              <Text style={styles.sezioneTitolo}>Cosa visitare nei dintorni</Text>
              <View style={{ gap: 7 }}>
                {culturaVicina.map((c) => {
                  const meta = CATEGORIA_CULTURALE_META[c.categoria];
                  return (
                    <Pressable
                      key={c.id}
                      style={styles.rigaCultura}
                      onPress={() => navigation.navigate("SchedaCulturale", { id: c.id })}
                    >
                      <View style={[styles.rigaCulturaIcona, { backgroundColor: meta.colore + "18" }]}>
                        <Ionicons name={meta.icona} size={14} color={meta.colore} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.rigaCulturaTitolo} numberOfLines={1}>
                          {c.titolo}
                        </Text>
                        <Text style={styles.rigaCulturaTipo}>{meta.etichettaSingolare}</Text>
                      </View>
                      <Text style={styles.rigaCulturaDistanza}>
                        {c.distanzaKm < 1 ? "<1" : c.distanzaKm.toFixed(1)} km
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {struttura.origine === "campeggi_pubblici" && (
          <View style={styles.sezioneRecensioni}>
            <View style={styles.recensioniIntestazione}>
              <Text style={styles.recensioniTitolo}>Recensioni{recensioni.length > 0 ? ` (${recensioni.length})` : ""}</Text>
              {session && !miaRecensione && !mostraModuloRecensione && (
                <Pressable onPress={() => setMostraModuloRecensione(true)}>
                  <Text style={styles.recensisciLink}>Recensiscila</Text>
                </Pressable>
              )}
            </View>

            {!session && (
              <Pressable onPress={() => Alert.alert("Accedi", "Accedi al tuo account per lasciare una recensione.")}>
                <Text style={styles.recensisciLink}>Accedi per recensire</Text>
              </Pressable>
            )}

            {miaRecensione && <Text style={styles.giaRecensito}>✓ Hai già recensito questa struttura</Text>}

            {mostraModuloRecensione && !miaRecensione && (
              <ModuloRecensione
                onInvia={({ punteggio, testo }) =>
                  inviaRecensioneStruttura({
                    campeggioId: struttura.idOriginale,
                    clienteId: session.user.id,
                    nomeCliente: session.user.user_metadata?.nome || "Utente NaturaGo",
                    punteggio,
                    testo,
                  })
                }
                onInviata={() => {
                  setMostraModuloRecensione(false);
                  caricaRecensioniStruttura();
                }}
              />
            )}

            {caricandoRecensioni ? (
              <ActivityIndicator color={colori.blu} style={{ marginTop: 8 }} />
            ) : recensioni.length === 0 ? (
              <Text style={styles.recensioniVuoto}>Ancora nessuna recensione per questa struttura.</Text>
            ) : (
              recensioni.map((r) => (
                <View key={r.id} style={styles.recensioneCard}>
                  <View style={styles.recensioneIntestazione}>
                    <Text style={styles.recensioneNome}>{r.nomeCliente}</Text>
                    <RigaStelle punteggio={r.punteggio} />
                  </View>
                  <Text style={styles.recensioneData}>{formattaData(r.creatoIl)}</Text>
                  <Text style={styles.recensioneTesto}>{r.testo}</Text>
                  {r.fotoUrls.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {r.fotoUrls.map((url) => (
                        <ImmagineConRiserva key={url} uri={url} larghezza={300} style={styles.recensioneFoto} />
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.barraAzioni}>
        <Text style={styles.prezzo}>
          {struttura.prezzo ? `${struttura.prezzo}€` : "—"}
          <Text style={styles.prezzoNotte}> /notte</Text>
        </Text>
        <View style={styles.pulsanti}>
          <Pressable style={styles.pulsanteContorno} onPress={apriChiamata}>
            <Ionicons name="call-outline" size={17} color={colori.testo} />
          </Pressable>
          <Pressable style={styles.pulsanteContorno} onPress={apriMappa}>
            <Ionicons name="navigate-outline" size={17} color={colori.testo} />
          </Pressable>
          <Pressable style={styles.prenotaSubito}>
            <Text style={styles.prenotaSubitoTesto}>Prenota subito</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.bianco },
  hero: {
    height: 230,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
  },
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
  preferitoBottone: {
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
  rigaBadge: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  badgeTipo: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "700",
    color: colori.blu,
    backgroundColor: "#e7eefc",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeVerificato: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeVerificatoTesto: { fontSize: 10, fontWeight: "700", color: "#16a34a" },
  badgeCulturale: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeCulturaleTesto: { fontSize: 10, fontWeight: "700", color: "#9333ea" },
  titolo: { fontSize: 19, fontWeight: "800", color: colori.testo },
  rigaInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  localita: { fontSize: 12, color: colori.testoSecondario },
  rigaRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { fontSize: 12, fontWeight: "700", color: colori.testo },
  descrizione: { fontSize: 12.5, lineHeight: 19, color: "#4b5563" },
  avvisoRosso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 10,
  },
  avvisoRossoTesto: { flex: 1, fontSize: 11.5, color: "#991b1b", fontWeight: "600" },
  avvisoArancio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff7ed",
    borderRadius: 12,
    padding: 10,
  },
  avvisoAranciotesto: { flex: 1, fontSize: 11.5, color: "#9a3412", fontWeight: "600" },
  avvisoRivendica: {
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  avvisoRivendicaTitolo: { fontSize: 13, fontWeight: "700", color: colori.testo, textAlign: "center" },
  avvisoRivendicaTesto: { fontSize: 11.5, color: colori.testoSecondario, textAlign: "center", lineHeight: 16 },
  bottoneRivendica: {
    marginTop: 6,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ea580c",
    alignItems: "center",
  },
  bottoneRivendicaTesto: { fontSize: 12.5, fontWeight: "700", color: "#fff" },
  sezione: { gap: 8, marginTop: 6 },
  sezioneTitolo: { fontSize: 14, fontWeight: "800", color: colori.testo, marginBottom: 2 },
  rigaDettaglio: { flexDirection: "row", alignItems: "center", gap: 8 },
  rigaDettaglioTesto: { flex: 1, fontSize: 12, color: "#374151", lineHeight: 17 },
  servizi: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  servizioPill: {
    backgroundColor: colori.grigioSfondo,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  servizioPillTesto: { fontSize: 11, fontWeight: "600", color: colori.testo },
  rigaCultura: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colori.grigioSfondo,
    borderRadius: 12,
    padding: 10,
  },
  rigaCulturaIcona: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rigaCulturaTitolo: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  rigaCulturaTipo: { fontSize: 10.5, color: colori.testoSecondario },
  rigaCulturaDistanza: { fontSize: 11, fontWeight: "600", color: colori.testoSecondario },
  piazzoleGriglia: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  piazzolaCard: {
    width: "47%",
    backgroundColor: colori.grigioSfondo,
    borderRadius: 14,
    overflow: "hidden",
  },
  piazzolaFoto: {
    width: "100%",
    height: 90,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
  },
  piazzolaInfo: { padding: 8, gap: 2 },
  piazzolaRigaTitolo: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 4 },
  piazzolaTitolo: { flex: 1, fontSize: 11.5, fontWeight: "700", color: colori.testo },
  piazzolaPrezzo: { fontSize: 11, fontWeight: "700", color: colori.testo },
  piazzolaDettagli: { fontSize: 10, color: colori.testoSecondario },
  piazzolaDescrizione: { fontSize: 10.5, color: "#4b5563", marginTop: 2 },
  sezioneRecensioni: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },
  recensioniTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo },
  recensioniVuoto: { fontSize: 12, color: colori.testoSecondario },
  recensioneCard: {
    backgroundColor: colori.grigioSfondo,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  recensioneIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recensioneNome: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  recensioneData: { fontSize: 10.5, color: colori.testoSecondario },
  recensioneTesto: { fontSize: 12, lineHeight: 18, color: "#374151", marginTop: 4 },
  recensioneFoto: { width: 72, height: 72, borderRadius: 10, marginRight: 8, backgroundColor: colori.bluChiaro },
  recensioniIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recensisciLink: { fontSize: 12, fontWeight: "700", color: colori.blu },
  giaRecensito: { fontSize: 11.5, color: colori.blu, fontWeight: "600" },
  barraAzioni: {
    borderTopWidth: 1,
    borderTopColor: colori.bordo,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  prezzo: { fontSize: 18, fontWeight: "800", color: colori.testo },
  prezzoNotte: { fontSize: 11, fontWeight: "600", color: colori.testoSecondario },
  pulsanti: { flexDirection: "row", gap: 8, paddingBottom: 6 },
  pulsanteContorno: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colori.bordo,
    alignItems: "center",
    justifyContent: "center",
  },
  prenotaSubito: {
    flexGrow: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
  },
  prenotaSubitoTesto: { color: colori.bianco, fontWeight: "800", fontSize: 13.5 },
});
