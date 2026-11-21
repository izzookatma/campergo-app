import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Share, Animated } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { usePreferenze } from "../context/PreferenzeContext";
import { caricaIdPreferiti, toggleFavorito, sipuoSalvare } from "../lib/preferiti";
import { vibraConferma } from "../lib/vibrazione";
import { urlMappa } from "../lib/mappa";
import { apriLink } from "../lib/linkEsterni";
import { caricaRecensioni, inviaRecensioneStruttura } from "../lib/recensioni";
import { caricaDettaglioStruttura, caricaPiazzoleStruttura } from "../lib/strutture";
import { ETICHETTA_SERVIZIO } from "../lib/filtriServizi";
import { caricaCulturaVicina } from "../lib/cultura";
import ModuloRecensione from "../components/ModuloRecensione";
import Pulsante from "../components/ui/Pulsante";
import Badge from "../components/ui/Badge";
import Avviso from "../components/ui/Avviso";
import RigaStelle from "../components/ui/RigaStelle";
import CuoreAnimato from "../components/ui/CuoreAnimato";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import GalleriaHero from "../components/scheda/GalleriaHero";
import GalleriaFullscreen from "../components/scheda/GalleriaFullscreen";
import CulturaViciniLista from "../components/scheda/CulturaViciniLista";
import PiazzoleGrid from "../components/scheda/PiazzoleGrid";
import { useT } from "../i18n/i18n";

const ALTEZZA_HERO = 340;

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

function formattaData(iso) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function RigaDettaglio({ icona, testo, styles, c }) {
  if (!testo) return null;
  return (
    <View style={styles.rigaDettaglio}>
      <Ionicons name={icona} size={15} color={c.testoSecondario} />
      <Text style={styles.rigaDettaglioTesto}>{testo}</Text>
    </View>
  );
}

// Mirror di PRENOTAZIONI_ATTIVE del sito (src/avvisiSito.jsx, oggi false):
// finché le prenotazioni sono spente il pulsante non compare.
const PRENOTAZIONI_ATTIVE = false;

export default function SchedaScreen({ route, navigation }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  const { struttura } = route.params;
  const { session } = useAuth();
  const { motoreMappa } = usePreferenze();
  const insets = useSafeAreaInsets();
  const [scrollY] = useState(() => new Animated.Value(0));
  const [fotoAperta, setFotoAperta] = useState(null);
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

  // Link pubblico della scheda sul sito (stessi indirizzi della sitemap): su
  // telefono con l'app installata si apre direttamente nell'app. I rifugi non
  // hanno qui lo slug del sito, quindi si condivide la home.
  const condividi = async () => {
    const SITO = "https://www.naturago.it";
    const url =
      struttura.origine === "campeggi_pubblici"
        ? `${SITO}/esplora?apri=${struttura.idOriginale}`
        : struttura.origine === "camper_service"
          ? `${SITO}/camper-service?id=${struttura.idOriginale}`
          : SITO;
    try {
      await Share.share({ message: `${struttura.nome}${struttura.localita ? ` · ${struttura.localita}` : ""}\n${url}`, url });
    } catch (e) {
      console.error("Errore nella condivisione della scheda:", e);
    }
  };

  const onPreferito = async () => {
    if (!session?.user?.id) {
      Alert.alert(t("accedi.titoloAccedi"), t("preferiti.accediMessaggio"), [
        { text: t("comune.annulla"), style: "cancel" },
        { text: t("accedi.titoloAccedi"), onPress: () => navigation.navigate("Accedi") },
      ]);
      return;
    }
    vibraConferma();
    const nuovoStato = !preferito;
    setPreferito(nuovoStato);
    const error = await toggleFavorito(session.user.id, struttura.idOriginale, nuovoStato);
    if (error) setPreferito(!nuovoStato);
  };

  const apriChiamata = () => {
    const tel = struttura.telefono || dettaglio?.telefono;
    if (tel) apriLink(`tel:${String(tel).replace(/\s+/g, "")}`, t("comune.linkNonApribile"));
  };

  const apriMappa = () => {
    const url = urlMappa(struttura, motoreMappa);
    if (url) apriLink(url, t("comune.linkNonApribile"));
  };

  const apriSito = () => {
    if (dettaglio?.sitoWeb) apriLink(dettaglio.sitoWeb.startsWith("http") ? dettaglio.sitoWeb : `https://${dettaglio.sitoWeb}`, t("comune.linkNonApribile"));
  };

  const apriRivendica = () => {
    apriLink(`https://www.naturago.it/host?modo=registrati&nome=${encodeURIComponent(struttura.nome)}`, t("comune.linkNonApribile"));
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

  const fotoHero = [struttura.fotoUrl, ...(dettaglio?.fotoExtra || [])].filter(Boolean);
  const serviziPresenti = (dettaglio?.amenities || []).map((chiave) => ETICHETTA_SERVIZIO[chiave]).filter(Boolean);

  return (
    <View style={styles.schermo}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        <Animated.View
          style={[
            styles.hero,
            {
              transform: [
                { translateY: scrollY.interpolate({ inputRange: [-300, 0, ALTEZZA_HERO], outputRange: [-150, 0, ALTEZZA_HERO * 0.45], extrapolateRight: "clamp" }) },
                { scale: scrollY.interpolate({ inputRange: [-300, 0], outputRange: [2, 1], extrapolateRight: "clamp" }) },
              ],
            },
          ]}
        >
          <GalleriaHero foto={fotoHero} altezza={ALTEZZA_HERO} onApri={(i) => setFotoAperta(i)} />
        </Animated.View>
        <View style={styles.contenuto}>
          <View style={styles.rigaBadge}>
            <Badge testo={struttura.tipo} tono="neutro" />
            {dettaglio?.verificato && <Badge testo={t("scheda.verificata")} icona="checkmark-circle" tono="successo" />}
            {dettaglio?.badgeCulturaleAnno && (
              <Badge testo={t("scheda.beneCulturaleDal", { anno: dettaglio.badgeCulturaleAnno })} icona="ribbon-outline" tono="viola" />
            )}
          </View>

          <Text style={styles.titolo}>{struttura.nome}</Text>
          <View style={styles.rigaInfo}>
            <Text style={styles.localita}>{struttura.localita}</Text>
            {struttura.rating ? (
              <View style={styles.rigaRating}>
                <Ionicons name="star" size={12} color={c.voto} />
                <Text style={styles.rating}>
                  {struttura.rating} ({struttura.recensioni || 0})
                </Text>
              </View>
            ) : null}
          </View>

          {dettaglio?.chiusaTemporaneamente && (
            <Avviso
              tono="pericolo"
              icona="alert-circle"
              testo={`${t("scheda.chiusaTemporaneamente")}${dettaglio.chiusaTemporaneamenteMotivo ? `: ${dettaglio.chiusaTemporaneamenteMotivo}` : ""}`}
            />
          )}
          {dettaglio?.divietoCamper && (
            <Avviso
              tono="attenzione"
              icona="warning-outline"
              testo={`${t("scheda.divietoCamper")}${dettaglio.divietoCamperMotivo ? `: ${dettaglio.divietoCamperMotivo}` : ""}`}
            />
          )}
          {dettaglio?.avvisoVerifica && (
            <Avviso
              tono="attenzione"
              icona="information-circle-outline"
              testo={dettaglio.notaVerifica || t("scheda.datiDaVerificare")}
            />
          )}
          {struttura.descrizione ? <Text style={styles.descrizione}>{struttura.descrizione}</Text> : null}
          {dettaglio?.descrizioneEstesa && dettaglio.descrizioneEstesa !== struttura.descrizione ? (
            <Text style={styles.descrizione}>{dettaglio.descrizioneEstesa}</Text>
          ) : null}

          {dettaglio?.verificato === false && (
            <View style={styles.avvisoRivendica}>
              <Ionicons name="shield-outline" size={20} color={c.testoSecondario} />
              <Text style={styles.avvisoRivendicaTitolo}>{t("scheda.rivendicaTitolo")}</Text>
              <Text style={styles.avvisoRivendicaTesto}>{t("scheda.rivendicaTesto")}</Text>
              <Pulsante
                titolo={t("scheda.rivendicaBottone")}
                onPress={apriRivendica}
                sfondoPersonalizzato={c.attenzione}
                coloreTestoPersonalizzato="#fff"
                style={{ marginTop: 6, width: "100%" }}
              />
            </View>
          )}

          {/* Informazioni pratiche */}
          <View style={styles.sezione}>
            <RigaDettaglio styles={styles} c={c} icona="location-outline" testo={dettaglio?.indirizzo ? `${dettaglio.indirizzo}${dettaglio.cap ? `, ${dettaglio.cap}` : ""}` : null} />
            <RigaDettaglio styles={styles} c={c} icona="calendar-outline" testo={periodoApertura} />
            <RigaDettaglio styles={styles} c={c}
              icona="log-in-outline"
              testo={dettaglio?.orarioCheckin ? t("scheda.checkinDalle", { orario: dettaglio.orarioCheckin }) : null}
            />
            <RigaDettaglio styles={styles} c={c}
              icona="log-out-outline"
              testo={dettaglio?.orarioCheckout ? t("scheda.checkoutEntro", { orario: dettaglio.orarioCheckout }) : null}
            />
            <RigaDettaglio styles={styles} c={c}
              icona="time-outline"
              testo={
                dettaglio?.lateCheckoutDisponibile
                  ? `${t("scheda.lateCheckoutDisponibile")}${
                      dettaglio.lateCheckoutOrario ? ` ${t("scheda.lateCheckoutFinoAlle", { orario: dettaglio.lateCheckoutOrario })}` : ""
                    }${
                      dettaglio.lateCheckoutAPagamento
                        ? ` ${t("scheda.lateCheckoutAPagamento", { prezzo: dettaglio.lateCheckoutPrezzo ? `, ${dettaglio.lateCheckoutPrezzo}€` : "" })}`
                        : ""
                    }`
                  : null
              }
            />
            <RigaDettaglio styles={styles} c={c}
              icona="resize-outline"
              testo={
                dettaglio?.piazzolaLunghezzaMax
                  ? t("scheda.piazzoleFinoA", { l: dettaglio.piazzolaLunghezzaMax, larg: dettaglio.piazzolaLarghezzaMax || "?" })
                  : null
              }
            />
            <RigaDettaglio styles={styles} c={c}
              icona="swap-vertical-outline"
              testo={dettaglio?.altezzaMassimaM ? t("scheda.altezzaMassima", { h: dettaglio.altezzaMassimaM }) : null}
            />
            <RigaDettaglio styles={styles} c={c}
              icona="bus-outline"
              testo={dettaglio?.fermataBusVicina ? t("scheda.fermataBusVicina") : null}
            />
            <RigaDettaglio styles={styles} c={c}
              icona="train-outline"
              testo={dettaglio?.stazioneTrenoVicina ? t("scheda.stazioneTrenoVicina") : null}
            />
            <RigaDettaglio styles={styles} c={c}
              icona="language-outline"
              testo={dettaglio?.linguaParlate?.length > 0 ? t("scheda.linguaParlate", { lista: dettaglio.linguaParlate.join(", ") }) : null}
            />
            <RigaDettaglio styles={styles} c={c}
              icona="footsteps-outline"
              testo={dettaglio?.attivitaVicinanze?.length > 0 ? t("scheda.nelleVicinanze", { lista: dettaglio.attivitaVicinanze.join(", ") }) : null}
            />
            <RigaDettaglio styles={styles} c={c}
              icona="leaf-outline"
              testo={
                dettaglio?.tipoAmbiente?.length > 0
                  ? dettaglio.tipoAmbiente.map((a) => ETICHETTA_AMBIENTE[a] || a).join(", ")
                  : null
              }
            />
            <RigaDettaglio styles={styles} c={c}
              icona="heart-outline"
              testo={
                dettaglio?.categorieInteresse?.length > 0
                  ? t("scheda.adattaAChiCerca", { lista: dettaglio.categorieInteresse.map((ci) => ETICHETTA_INTERESSE[ci] || ci).join(", ") })
                  : null
              }
            />
            <RigaDettaglio styles={styles} c={c} icona="home-outline" testo={dettaglio?.haAlloggiFissi ? t("scheda.alloggiFissi") : null} />
            <RigaDettaglio styles={styles} c={c} icona="sparkles-outline" testo={dettaglio?.haEventiFuturi ? t("scheda.eventiInProgramma") : null} />
            {dettaglio?.sitoWeb && (
              <Pressable style={styles.rigaDettaglio} onPress={apriSito}>
                <Ionicons name="globe-outline" size={15} color={c.primario} />
                <Text style={[styles.rigaDettaglioTesto, { color: c.primario }]}>{t("comune.visitaSitoWeb")}</Text>
              </Pressable>
            )}
          </View>

          {/* Rifugi: info specifiche */}
          {struttura.origine === "rifugi" && (
            <View style={styles.sezione}>
              <RigaDettaglio styles={styles} c={c} icona="trending-up-outline" testo={dettaglio?.quotaM ? t("scheda.quotaM", { quota: dettaglio.quotaM }) : null} />
              <RigaDettaglio styles={styles} c={c} icona="person-outline" testo={dettaglio?.proprietario ? t("scheda.gestitoDa", { nome: dettaglio.proprietario }) : null} />
              <RigaDettaglio styles={styles} c={c} icona="bed-outline" testo={dettaglio?.postiLetto ? t("scheda.postiLetto", { n: dettaglio.postiLetto }) : null} />
              <RigaDettaglio styles={styles} c={c}
                icona="restaurant-outline"
                testo={dettaglio?.ristoro ? `${t("scheda.puntoRistoro")}${dettaglio.ristoroNote ? `: ${dettaglio.ristoroNote}` : ""}` : null}
              />
            </View>
          )}

          {serviziPresenti.length > 0 && (
            <View style={styles.sezione}>
              <Text style={styles.sezioneTitolo}>{t("scheda.servizi")}</Text>
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
              <Text style={styles.sezioneTitolo}>{t("scheda.parcheggio")}</Text>
              <RigaDettaglio styles={styles} c={c}
                icona="cash-outline"
                testo={dettaglio.parcheggioPrezzoTesto || (dettaglio.parcheggioTariffa === "gratuito" ? t("comune.gratuito") : dettaglio.parcheggioTariffa === "a_pagamento" ? t("comune.aPagamento") : dettaglio.parcheggioTariffa === "misto" ? t("scheda.parzialmentePagamento") : null)}
              />
              <RigaDettaglio styles={styles} c={c} icona="car-outline" testo={dettaglio.parcheggioPosti ? t("scheda.postiParcheggio", { n: dettaglio.parcheggioPosti }) : null} />
              <RigaDettaglio styles={styles} c={c} icona="shield-checkmark-outline" testo={dettaglio.parcheggioSorvegliato ? t("scheda.sorvegliato") : null} />
              <RigaDettaglio styles={styles} c={c} icona="layers-outline" testo={dettaglio.parcheggioSuperficie ? t("scheda.fondoSuperficie", { superficie: dettaglio.parcheggioSuperficie }) : null} />
              <RigaDettaglio styles={styles} c={c} icona="bulb-outline" testo={dettaglio.parcheggioIlluminato ? t("scheda.illuminato") : null} />
            </View>
          )}

          {dettaglio?.camperServiceNonOspiti && (
            <View style={styles.sezione}>
              <Text style={styles.sezioneTitolo}>{t("scheda.camperServiceNonOspitiTitolo")}</Text>
              <RigaDettaglio styles={styles} c={c} icona="water-outline" testo={dettaglio.camperServiceScaricoNere ? t("comune.scaricoAcqueNere") : null} />
              <RigaDettaglio styles={styles} c={c} icona="water-outline" testo={dettaglio.camperServiceScaricoGrigie ? t("comune.scaricoAcqueGrigie") : null} />
              <RigaDettaglio styles={styles} c={c} icona="flask-outline" testo={dettaglio.camperServiceCaricoAcqua ? t("comune.caricoAcquaPotabile") : null} />
              <RigaDettaglio styles={styles} c={c} icona="flash-outline" testo={dettaglio.camperServiceCorrente ? t("comune.correnteElettrica") : null} />
              <RigaDettaglio styles={styles} c={c} icona="pricetag-outline" testo={dettaglio.camperServiceCosto || (dettaglio.camperServiceAltro ?? null)} />
            </View>
          )}

          {struttura.origine === "camper_service" && dettaglio && (
            <View style={styles.sezione}>
              <Text style={styles.sezioneTitolo}>{t("scheda.servizi")}</Text>
              <RigaDettaglio styles={styles} c={c} icona="key-outline" testo={dettaglio.accesso ? t("scheda.accesso", { accesso: dettaglio.accesso }) : null} />
              <RigaDettaglio styles={styles} c={c} icona="pricetag-outline" testo={dettaglio.costoIndicativo || null} />
              <RigaDettaglio styles={styles} c={c} icona="water-outline" testo={dettaglio.scaricoAcqueNere ? t("comune.scaricoAcqueNere") : null} />
              <RigaDettaglio styles={styles} c={c} icona="water-outline" testo={dettaglio.scaricoAcqueGrigie ? t("comune.scaricoAcqueGrigie") : null} />
              <RigaDettaglio styles={styles} c={c} icona="flask-outline" testo={dettaglio.caricoAcquaPotabile ? t("comune.caricoAcquaPotabile") : null} />
              <RigaDettaglio styles={styles} c={c} icona="flash-outline" testo={dettaglio.correnteElettrica ? t("comune.correnteElettrica") : null} />
              <RigaDettaglio styles={styles} c={c} icona="time-outline" testo={dettaglio.orari || null} />
              <RigaDettaglio styles={styles} c={c} icona="ellipsis-horizontal-outline" testo={dettaglio.altriServizi || null} />
            </View>
          )}

          <PiazzoleGrid piazzole={piazzole} />

          <CulturaViciniLista
            culturaVicina={culturaVicina}
            onApri={(id) => navigation.navigate("SchedaCulturale", { id })}
          />
        </View>

        {struttura.origine === "campeggi_pubblici" && (
          <View style={styles.sezioneRecensioni}>
            <View style={styles.recensioniIntestazione}>
              <Text style={styles.recensioniTitolo}>{t("recensioni.titolo")}{recensioni.length > 0 ? ` (${recensioni.length})` : ""}</Text>
              {session && !miaRecensione && !mostraModuloRecensione && (
                <Pressable onPress={() => setMostraModuloRecensione(true)}>
                  <Text style={styles.recensisciLink}>{t("recensioni.scriviLink")}</Text>
                </Pressable>
              )}
            </View>

            {!session && (
              <Pressable onPress={() => Alert.alert(t("accedi.titoloAccedi"), t("recensioni.accediMessaggio"))}>
                <Text style={styles.recensisciLink}>{t("recensioni.accediLink")}</Text>
              </Pressable>
            )}

            {miaRecensione && <Text style={styles.giaRecensito}>{t("recensioni.giaRecensito")}</Text>}

            {mostraModuloRecensione && !miaRecensione && (
              <ModuloRecensione
                onInvia={({ punteggio, testo }) =>
                  inviaRecensioneStruttura({
                    campeggioId: struttura.idOriginale,
                    clienteId: session.user.id,
                    nomeCliente: session.user.user_metadata?.nome || t("comune.utenteDefault"),
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
              <ActivityIndicator color={c.primario} style={{ marginTop: 8 }} />
            ) : recensioni.length === 0 ? (
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
      </Animated.ScrollView>

      <View style={[styles.barraSuperiore, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable style={styles.bottoneRotondo} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t("comune.indietro")}>
          <Ionicons name="chevron-back" size={20} color={c.testo} />
        </Pressable>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable style={styles.bottoneRotondo} onPress={condividi} accessibilityRole="button" accessibilityLabel={t("comune.condividi")}>
            <Ionicons name="share-outline" size={20} color={c.primario} />
          </Pressable>
          {sipuoSalvare(struttura) && (
            <Pressable
              style={styles.bottoneRotondo}
              onPress={onPreferito}
              accessibilityRole="button"
              accessibilityLabel={preferito ? t("comune.preferitoRimuovi") : t("comune.preferitoSalva")}
            >
              <CuoreAnimato attivo={preferito} size={20} colore={c.pericolo} />
            </Pressable>
          )}
        </View>
      </View>

      {fotoAperta !== null && <GalleriaFullscreen foto={fotoHero} indiceIniziale={fotoAperta} visibile onChiudi={() => setFotoAperta(null)} />}

      <SafeAreaView edges={["bottom"]} style={styles.barraAzioni}>
        {struttura.prezzo ? (
          <Text style={styles.prezzo}>
            {`${struttura.prezzo}€`}
            <Text style={styles.prezzoNotte}> /notte</Text>
          </Text>
        ) : null}
        <View style={styles.pulsanti}>
          <Pulsante
            titolo={t("comune.chiama")}
            variante="secondario"
            icona={<Ionicons name="call-outline" size={20} color={c.testo} />}
            onPress={apriChiamata}
            style={{ flex: 1 }}
          />
          <Pulsante
            titolo={t("comune.indicazioni")}
            icona={<Ionicons name="navigate" size={20} color="#fff" />}
            onPress={apriMappa}
            style={{ flex: 1 }}
          />
          {PRENOTAZIONI_ATTIVE && (
            <Pressable style={styles.prenotaSubito}>
              <Text style={styles.prenotaSubitoTesto}>{t("comune.prenotaSubito")}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondoGruppo },
  hero: { height: ALTEZZA_HERO, backgroundColor: c.primarioChiaro },
  barraSuperiore: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  bottoneRotondo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  contenuto: { padding: 20, gap: 10, marginTop: -28, backgroundColor: c.sfondoGruppo, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  rigaBadge: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  titolo: { fontSize: 28, lineHeight: 34, fontWeight: "700", color: c.testo },
  rigaInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  localita: { fontSize: 13, color: c.testoSecondario },
  rigaRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { fontSize: 13, fontWeight: "700", color: c.testo },
  descrizione: { fontSize: 13, lineHeight: 19, color: "#4b5563" },
  avvisoRivendica: {
    alignItems: "center",
    backgroundColor: c.attenzioneChiaro,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  avvisoRivendicaTitolo: { fontSize: 15, fontWeight: "700", color: c.testo, textAlign: "center" },
  avvisoRivendicaTesto: { fontSize: 13, color: c.testoSecondario, textAlign: "center", lineHeight: 16 },
  sezione: { gap: 8, marginTop: 6 },
  sezioneTitolo: { fontSize: 15, fontWeight: "800", color: c.testo, marginBottom: 2 },
  rigaDettaglio: { flexDirection: "row", alignItems: "center", gap: 8 },
  rigaDettaglioTesto: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 17 },
  servizi: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  servizioPill: {
    backgroundColor: c.sfondo,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  servizioPillTesto: { fontSize: 13, fontWeight: "600", color: c.testo },
  sezioneRecensioni: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },
  recensioniTitolo: { fontSize: 15, fontWeight: "800", color: c.testo },
  recensioniVuoto: { fontSize: 13, color: c.testoSecondario },
  recensioneCard: {
    backgroundColor: c.sfondo,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  recensioneIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recensioneNome: { fontSize: 13, fontWeight: "700", color: c.testo },
  recensioneData: { fontSize: 13, color: c.testoSecondario },
  recensioneTesto: { fontSize: 13, lineHeight: 18, color: "#374151", marginTop: 4 },
  recensioneFoto: { width: 72, height: 72, borderRadius: 10, marginRight: 8, backgroundColor: c.primarioChiaro },
  recensioniIntestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recensisciLink: { fontSize: 13, fontWeight: "700", color: c.primario },
  giaRecensito: { fontSize: 13, color: c.primario, fontWeight: "600" },
  barraAzioni: {
    borderTopWidth: 1,
    borderTopColor: c.separatore,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  prezzo: { fontSize: 18, fontWeight: "800", color: c.testo },
  prezzoNotte: { fontSize: 13, fontWeight: "600", color: c.testoSecondario },
  pulsanti: { flexDirection: "row", gap: 8, paddingBottom: 6 },
  prenotaSubito: {
    flexGrow: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.primario,
    alignItems: "center",
    justifyContent: "center",
  },
  prenotaSubitoTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 15 },
  });
}
