import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../theme/tema";
import { useT } from "../i18n/i18n";
import { useAuth } from "../context/AuthContext";
import { usePreferenze } from "../context/PreferenzeContext";
import { urlNavigazione, urlViaggio } from "../lib/mappa";
import { apriLink } from "../lib/linkEsterni";
import SelettoreDate from "../components/SelettoreDate";
import CercaLuogoModal from "../components/vacanza/CercaLuogoModal";
import MappaVacanza from "../components/vacanza/MappaVacanza";
import RigaPostoVacanza from "../components/vacanza/RigaPostoVacanza";
import { percorsoConTratte } from "../lib/percorsoStradale";
import { salvaVacanzaPersonale, aggiornaVacanzaPersonale } from "../lib/pianiSalvati";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { iscriviAggiuntaLuogo } from "../lib/bozzaVacanza";
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
  conLuogoCambiato,
  riassuntoPrenotazioni,
  spostaLuogo,
  trovaBersaglio,
} from "../lib/vacanza";

// "Crea la tua vacanza". Dall'alto in basso:
//  1. punto di PARTENZA;
//  2. RIEPILOGO dei giorni (con i km tra un giorno e l'altro: toccandone
//     uno si apre il suo dettaglio);
//  3. DETTAGLIO dei giorni: ognuno si apre e si chiude da solo, aprirne uno
//     non chiude gli altri, così si vede tutto il piano;
//  4. punto di ARRIVO FINALE;
//  5. TOTALE del viaggio, sempre in fondo.
// Le distanze sono quelle vere della strada, nell'ordine scelto.
export default function CreaVacanzaScreen({ navigation, route }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  const { session } = useAuth();
  const { motoreMappa, setMotoreMappa } = usePreferenze();

  const pianoIniziale = route?.params?.pianoSalvato;
  const [vacanza, setVacanza] = useState(() => (pianoIniziale ? vacanzaDaPiano(pianoIniziale) : nuovaVacanza()));
  const [idSalvato, setIdSalvato] = useState(route?.params?.idPiano ?? null);
  const [salvato, setSalvato] = useState(!!pianoIniziale);
  const [salvando, setSalvando] = useState(false);
  const [ricerca, setRicerca] = useState(null); // { giorno, ruolo }
  // Ricerca da riaprire al ritorno da una scheda aperta dai risultati.
  const ricercaInSospeso = useRef(null);
  const [testoRicerca, setTestoRicerca] = useState("");
  const [versioneRicerca, setVersioneRicerca] = useState(0);
  const [selettoreDate, setSelettoreDate] = useState(false);
  // Giorni aperti: ognuno resta com'è finché non lo cambia chi usa l'app.
  const [aperti, setAperti] = useState(() => new Set([1]));
  // Ultimo calcolo delle distanze, con la firma dei punti a cui si riferisce.
  const [calcolo, setCalcolo] = useState({ firma: null, dati: null });
  const scrollRef = useRef(null);
  const posizioniGiorni = useRef({});
  // Trascinamento dei posti: { giorno, indice, bersaglio: { giorno, indice } | null }.
  const [trascinamento, setTrascinamento] = useState(null);
  const [traslazione] = useState(() => new Animated.Value(0));
  const righeRef = useRef({}); // `${giorno}-${indice}` → riga
  const sezioniRef = useRef({}); // giorno → contenitore del giorno
  const misure = useRef({ righe: [], sezioni: [], scroll0: 0 });
  const scrollY = useRef(0);
  const ultimoTrascinamento = useRef(null);
  const vacanzaRicente = useRef(null);

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

  const { giorni: totaliGiorno, trasferimenti } = useMemo(() => totaliPerGiorno(punti, rotta?.tratte), [punti, rotta]);

  useEffect(() => {
    vacanzaRicente.current = vacanza;
  }, [vacanza]);

  const modifica = (nuova) => {
    setVacanza(nuova);
    setSalvato(false);
  };
  const aggiornaGiorno = (numero, cambia) =>
    modifica({ ...vacanza, giorni: vacanza.giorni.map((g) => (g.numero === numero ? { ...g, ...cambia(g) } : g)) });

  const alternaGiorno = (numero) =>
    setAperti((prec) => {
      const nuovo = new Set(prec);
      if (nuovo.has(numero)) nuovo.delete(numero);
      else nuovo.add(numero);
      return nuovo;
    });

  // Dal riepilogo: apre il giorno (senza chiudere gli altri) e ci scorre.
  const apriGiornoDalRiepilogo = (numero) => {
    setAperti((prec) => new Set(prec).add(numero));
    setTimeout(() => {
      const y = posizioniGiorni.current[numero];
      if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    }, 80);
  };

  const aggiungiGiorno = () => {
    const numero = vacanza.giorni.length + 1;
    modifica({ ...vacanza, giorni: [...vacanza.giorni, giornoVuoto(numero)] });
    setAperti((prec) => new Set(prec).add(numero));
  };
  const togliGiorno = (numero) => {
    const rimasti = vacanza.giorni.filter((g) => g.numero !== numero).map((g, i) => ({ ...g, numero: i + 1 }));
    modifica({ ...vacanza, giorni: rimasti });
    // I numeri dei giorni successivi scalano di uno: gli aperti si riallineano.
    setAperti((prec) => {
      const nuovo = new Set();
      prec.forEach((n) => {
        if (n < numero) nuovo.add(n);
        else if (n > numero) nuovo.add(n - 1);
      });
      return nuovo;
    });
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

  // --- Trascinare i posti con il dito -------------------------------------
  // Si tiene premuta la maniglia e si porta il posto sopra un altro, anche di
  // un altro giorno (se è aperto): la riga evidenziata è dove cadrà. Le
  // posizioni delle righe si misurano all'inizio del gesto.
  const iniziaTrascinamento = (giorno, indice) => {
    traslazione.setValue(0);
    misure.current = { righe: [], sezioni: [], scroll0: scrollY.current };
    Object.entries(righeRef.current).forEach(([chiave, el]) => {
      if (!el) return;
      const [g, i] = chiave.split("-").map(Number);
      el.measureInWindow((_x, y, _w, h) => misure.current.righe.push({ giorno: g, indice: i, y, h }));
    });
    Object.entries(sezioniRef.current).forEach(([g, el]) => {
      if (!el) return;
      el.measureInWindow((_x, y, _w, h) => misure.current.sezioni.push({ giorno: Number(g), y, h }));
    });
    const stato = { giorno, indice, bersaglio: { giorno, indice } };
    ultimoTrascinamento.current = stato;
    setTrascinamento(stato);
  };
  const muoviTrascinamento = (moveY) => {
    const corrente = ultimoTrascinamento.current;
    if (!corrente) return;
    const scarto = scrollY.current - misure.current.scroll0; // la pagina è scorsa
    const quanti = {};
    (vacanzaRicente.current?.giorni || []).forEach((g) => {
      quanti[g.numero] = g.luoghi.length;
    });
    const bersaglio = trovaBersaglio({ righe: misure.current.righe, sezioni: misure.current.sezioni, quanti }, moveY, scarto);
    const prima = corrente.bersaglio;
    if (bersaglio?.giorno !== prima?.giorno || bersaglio?.indice !== prima?.indice) {
      const nuovo = { ...corrente, bersaglio };
      ultimoTrascinamento.current = nuovo;
      setTrascinamento(nuovo);
    }
    // Vicino ai bordi dello schermo la pagina scorre da sola.
    const altezza = Dimensions.get("window").height;
    if (moveY < 150) scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current - 14), animated: false });
    else if (moveY > altezza - 130) scrollRef.current?.scrollTo({ y: scrollY.current + 14, animated: false });
  };
  const finisciTrascinamento = (annullato) => {
    const corrente = ultimoTrascinamento.current;
    ultimoTrascinamento.current = null;
    setTrascinamento(null);
    traslazione.setValue(0);
    if (!corrente || annullato || !corrente.bersaglio) return;
    modifica(spostaLuogo(vacanzaRicente.current, { giorno: corrente.giorno, indice: corrente.indice }, corrente.bersaglio));
  };
  const cambiaLuogo = (giorno, ruolo, indice, cambia) => modifica(conLuogoCambiato(vacanza, giorno, ruolo, indice, cambia));

  // Un posto entra nel percorso (dalla ricerca con il +, o dalla sua scheda
  // con «Aggiungi al percorso»). Aggiornamento "funzionale": vale anche
  // quando arriva da un'altra schermata con lo stato già cambiato.
  const applicaLuogo = useCallback(({ giorno, ruolo }, luogo) => {
    if (!luogo) return;
    ricercaInSospeso.current = null;
    setVacanza((prec) => {
      if (ruolo === "partenza") return { ...prec, partenza: luogo };
      if (ruolo === "arrivo") return { ...prec, arrivo: luogo };
      return {
        ...prec,
        giorni: prec.giorni.map((g) => {
          if (g.numero !== giorno) return g;
          return ruolo === "dormire" ? { ...g, dormire: luogo } : { ...g, luoghi: [...g.luoghi, luogo] };
        }),
      };
    });
    setSalvato(false);
  }, []);

  useEffect(() => iscriviAggiuntaLuogo(applicaLuogo), [applicaLuogo]);

  // Tornando dalla scheda senza aver aggiunto nulla, si riapre la ricerca di
  // prima con lo stesso testo (la scheda che aggiunge svuota il "sospeso").
  useEffect(() => {
    return navigation.addListener("focus", () => {
      const sospesa = ricercaInSospeso.current;
      if (!sospesa) return;
      ricercaInSospeso.current = null;
      setTestoRicerca(sospesa.testo || "");
      setVersioneRicerca((v) => v + 1);
      setRicerca(sospesa.richiesta);
    });
  }, [navigation]);

  const luogoScelto = (luogo) => {
    const richiesta = ricerca;
    setRicerca(null);
    applicaLuogo(richiesta, luogo);
  };

  // Dalla ricerca: apre la scheda del posto, con il pulsante «Aggiungi al
  // percorso». Si aspetta che il pannello di ricerca si sia chiuso.
  const apriSchedaDaRicerca = ({ tipo, oggetto, testo }) => {
    const richiesta = ricerca;
    ricercaInSospeso.current = { richiesta, testo };
    setRicerca(null);
    setTimeout(() => {
      if (tipo === "struttura") navigation.navigate("Scheda", { struttura: oggetto, aggiungiAlPercorso: richiesta });
      else if (tipo === "itinerario") navigation.navigate("ItinerarioDettaglio", { itinerarioId: oggetto.id, aggiungiAlPercorso: richiesta });
      else navigation.navigate("SchedaCulturale", { id: oggetto.id, aggiungiAlPercorso: richiesta });
    }, 350);
  };

  // Dai posti già nel percorso: riapre la scheda (per leggere, chiamare, prenotare).
  const apriSchedaDelPosto = (luogo) => {
    if (luogo.tipo === "struttura" && luogo.struttura) navigation.navigate("Scheda", { struttura: luogo.struttura });
    else if (luogo.tipo === "cultura") navigation.navigate("SchedaCulturale", { id: luogo.id });
    else if (luogo.tipo === "itinerario") navigation.navigate("ItinerarioDettaglio", { itinerarioId: luogo.id });
  };
  const haScheda = (luogo) => (luogo.tipo === "struttura" && !!luogo.struttura) || luogo.tipo === "cultura" || luogo.tipo === "itinerario";

  const dateScelte = ({ checkIn, checkOut }) => {
    setSelettoreDate(false);
    if (!checkIn) {
      modifica({ ...vacanza, dataInizio: null });
      return;
    }
    // Se è stato scelto anche l'ultimo giorno, si aggiungono i giorni che mancano.
    const giorniServono = checkOut ? numeroNotti(checkIn, checkOut) + 1 : vacanza.giorni.length;
    const giorni = [...vacanza.giorni];
    const nuoviAperti = new Set(aperti);
    while (giorni.length < Math.min(giorniServono, 30)) {
      giorni.push(giornoVuoto(giorni.length + 1));
      nuoviAperti.add(giorni.length);
    }
    setAperti(nuoviAperti);
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
  // I posti si numerano da 1; partenza e arrivo restano fuori ("P" e "A").
  const numeroPosto = (k) => k + (vacanza.partenza ? 0 : 1);
  const trattoPer = (k) => (rotta && k > 0 ? rotta.tratte[k - 1] : null);
  const prenotazioni = riassuntoPrenotazioni(vacanza);
  const numeroPostiTotali = vacanza.giorni.reduce((n, g) => n + g.luoghi.length + (g.dormire ? 1 : 0), 0);

  // Punto da cui guardare la mappa di scelta: l'ultimo posto del viaggio fino
  // a quel giorno (es. Bologna), altrimenti la partenza.
  const centroRicerca = (() => {
    if (!ricerca) return null;
    const fino = ricerca.ruolo === "arrivo" ? Infinity : ricerca.giorno;
    for (let i = punti.length - 1; i >= 0; i--) {
      const p = punti[i];
      if (p.ruolo !== "arrivo" && (p.giorno <= fino || p.ruolo === "partenza")) {
        return { lat: p.luogo.lat, lng: p.luogo.lng, nome: (p.luogo.localita || "").split(",")[0].trim() || p.luogo.nome };
      }
    }
    return null;
  })();

  // Navigazione nell'app di mappe scelta (Google Maps, Apple Mappe o Waze).
  const navigaA = (luogo) => {
    const url = urlNavigazione(luogo, motoreMappa);
    if (url) apriLink(url, t("comune.linkNonApribile"));
  };
  const avviaViaggio = () => {
    const url = urlViaggio(punti.map((p) => p.luogo), motoreMappa);
    if (url) apriLink(url, t("comune.linkNonApribile"));
  };
  const motoriMappa = [
    { chiave: "google", etichetta: "Google Maps" },
    ...(Platform.OS === "ios" ? [{ chiave: "apple", etichetta: "Apple Mappe" }] : []),
    { chiave: "waze", etichetta: "Waze" },
  ];

  const testoTratto = (tratto) => t("vacanza.tratta", { km: formattaKm(tratto.km), tempo: formattaTempo(tratto.minuti) });
  const connettore = (tratto) =>
    tratto ? (
      <View style={styles.connettore}>
        <View style={styles.connettoreLinea} />
        <Ionicons name="car-outline" size={14} color={c.testoSecondario} />
        <Text style={styles.connettoreTesto}>{testoTratto(tratto)}</Text>
      </View>
    ) : (
      <View style={[styles.connettore, { opacity: 0.4 }]}>
        <View style={styles.connettoreLinea} />
        <Ionicons name="ellipsis-vertical" size={14} color={c.testoSecondario} />
      </View>
    );

  // Casella di partenza / arrivo finale (stessa grafica, colori diversi).
  const casellaEstremo = ({ ruolo, luogo, colore, lettera, titolo, scegli, etichetta }) => (
    <View style={styles.cardEstremo}>
      <Text style={styles.etichetta}>{titolo}</Text>
      {luogo ? (
        <View style={[styles.rigaPosto, { backgroundColor: c.sfondo }]}>
          <View style={[styles.numeroPosto, { backgroundColor: colore }]}>
            <Text style={styles.numeroPostoTesto}>{lettera}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.postoNome} numberOfLines={2}>
              {luogo.nome}
            </Text>
            <Text style={styles.postoSotto}>{etichetta}</Text>
          </View>
          <Pressable onPress={() => navigaA(luogo)} hitSlop={8} accessibilityLabel={t("vacanza.naviga")}>
            <Ionicons name="navigate-circle" size={22} color={c.primario} />
          </Pressable>
          <Pressable onPress={() => setRicerca({ giorno: 0, ruolo })} hitSlop={8} accessibilityLabel={scegli}>
            <Ionicons name="create-outline" size={18} color={c.primario} />
          </Pressable>
          <Pressable
            onPress={() => modifica({ ...vacanza, [ruolo]: null })}
            hitSlop={8}
            accessibilityLabel="Togli"
          >
            <Ionicons name="close-circle" size={18} color={c.pericolo} />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.bottoneAggiungi} onPress={() => setRicerca({ giorno: 0, ruolo })} accessibilityRole="button">
          <Ionicons name={ruolo === "partenza" ? "home-outline" : "flag-outline"} size={18} color={colore} />
          <Text style={[styles.bottoneAggiungiTesto, { color: colore }]}>{scegli}</Text>
        </Pressable>
      )}
    </View>
  );

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
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.contenuto}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!trascinamento}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
        >
          <Text style={styles.etichetta}>{t("vacanza.nomeEtichetta")}</Text>
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
              {vacanza.dataInizio ? `${t("vacanza.partenza")} ${etichettaData(vacanza.dataInizio)}` : t("vacanza.sceglieDate")}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={c.testoSecondario} />
          </Pressable>

          {/* 1. PARTENZA */}
          {casellaEstremo({ ruolo: "partenza", luogo: vacanza.partenza, colore: c.successo, lettera: "P", titolo: t("vacanza.daDoveParti"), scegli: t("vacanza.scegliPartenza"), etichetta: t("vacanza.partenzaEtichetta") })}

          <MappaVacanza punti={punti} tracciato={rotta?.punti} />

          {punti.length > 0 && (
            <View style={styles.cardNavigazione}>
              <Pressable style={styles.bottoneNavigazione} onPress={avviaViaggio} accessibilityRole="button">
                <Ionicons name="navigate" size={18} color={c.sulPrimario} />
                <Text style={styles.bottoneNavigazioneTesto}>{t("itinerario.avviaNavigazione")}</Text>
              </Pressable>
              <Text style={styles.navigaCon}>{t("vacanza.navigaCon")}</Text>
              <View style={styles.rigaMotori}>
                {motoriMappa.map((m) => (
                  <Pressable
                    key={m.chiave}
                    onPress={() => setMotoreMappa(m.chiave)}
                    style={[styles.chipMotore, motoreMappa === m.chiave && styles.chipMotoreAttivo]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipMotoreTesto, motoreMappa === m.chiave && { color: c.sulPrimario }]}>{m.etichetta}</Text>
                  </Pressable>
                ))}
              </View>
              {motoreMappa === "waze" && <Text style={styles.navigaCon}>{t("vacanza.wazeUnaTappa")}</Text>}
            </View>
          )}

          {/* 2. RIEPILOGO dei giorni, con i km tra un giorno e l'altro */}
          <View style={styles.cardRiepilogo}>
            <Text style={styles.sezioneTitolo}>{t("vacanza.riepilogo")}</Text>
            {vacanza.partenza && (
              <View style={styles.rigaRiepilogoEstremo}>
                <View style={[styles.numeroPostoPiccolo, { backgroundColor: c.successo }]}>
                  <Text style={styles.numeroPostoTesto}>P</Text>
                </View>
                <Text style={styles.riepilogoNome} numberOfLines={1}>
                  {vacanza.partenza.nome}
                </Text>
              </View>
            )}
            {vacanza.giorni.map((g) => {
              const data = dataDelGiorno(vacanza.dataInizio, g.numero);
              const tot = totaliGiorno[g.numero];
              const nPosti = g.luoghi.length + (g.dormire ? 1 : 0);
              return (
                <View key={g.numero}>
                  {(vacanza.partenza || g.numero > 1) && connettore(trasferimenti[g.numero])}
                  <Pressable style={styles.rigaRiepilogo} onPress={() => apriGiornoDalRiepilogo(g.numero)} accessibilityRole="button">
                    <View style={{ flex: 1 }}>
                      <Text style={styles.riepilogoGiorno}>
                        {t("vacanza.giorno", { n: g.numero })}
                        {data ? ` · ${etichettaDataLunga(data)}` : ""}
                      </Text>
                      <Text style={styles.riepilogoSotto}>
                        {nPosti === 0
                          ? t("vacanza.nessunPostoBreve")
                          : [t("vacanza.postiN", { n: nPosti }), tot ? testoTratto(tot) : null].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.testoSecondario} />
                  </Pressable>
                </View>
              );
            })}
            {vacanza.arrivo && (
              <>
                {connettore(trasferimenti.arrivo)}
                <View style={styles.rigaRiepilogoEstremo}>
                  <View style={[styles.numeroPostoPiccolo, { backgroundColor: c.pericolo }]}>
                    <Text style={styles.numeroPostoTesto}>A</Text>
                  </View>
                  <Text style={styles.riepilogoNome} numberOfLines={1}>
                    {vacanza.arrivo.nome}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* 3. DETTAGLIO dei giorni (si aprono e chiudono da soli) */}
          <Text style={styles.sezioneTitolo}>{t("vacanza.dettaglio")}</Text>
          {vacanza.giorni.map((g) => {
            const data = dataDelGiorno(vacanza.dataInizio, g.numero);
            const tot = totaliGiorno[g.numero];
            const aperto = aperti.has(g.numero);
            const nPosti = g.luoghi.length + (g.dormire ? 1 : 0);
            return (
              <View
                key={g.numero}
                style={styles.cardGiorno}
                onLayout={(e) => {
                  posizioniGiorni.current[g.numero] = e.nativeEvent.layout.y;
                }}
              >
                <Pressable style={styles.giornoIntestazione} onPress={() => alternaGiorno(g.numero)} accessibilityRole="button" accessibilityState={{ expanded: aperto }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.giornoTitolo}>{t("vacanza.giorno", { n: g.numero })}</Text>
                    <Text style={styles.giornoData}>
                      {[data ? etichettaDataLunga(data) : null, nPosti > 0 ? t("vacanza.postiN", { n: nPosti }) : null, tot ? testoTratto(tot) : null]
                        .filter(Boolean)
                        .join(" · ") || t("vacanza.nessunPostoBreve")}
                    </Text>
                  </View>
                  <Ionicons name={aperto ? "chevron-up" : "chevron-down"} size={20} color={c.primario} />
                </Pressable>

                {aperto && (
                  <View
                    style={{ gap: 8 }}
                    collapsable={false}
                    ref={(el) => {
                      if (el) sezioniRef.current[g.numero] = el;
                      else delete sezioniRef.current[g.numero];
                    }}
                  >
                    {g.luoghi.length === 0 && <Text style={styles.vuoto}>{t("vacanza.nessunPosto")}</Text>}
                    {g.luoghi.map((l, i) => {
                      const k = posizioneGlobale(g.numero, "visita", i);
                      const tratto = trattoPer(k);
                      return (
                        <View key={`${g.numero}-${i}`}>
                          {tratto && (
                            <View style={styles.tratto}>
                              <Ionicons name="car-outline" size={13} color={c.testoSecondario} />
                              <Text style={styles.trattoTesto}>{testoTratto(tratto)}</Text>
                            </View>
                          )}
                          <RigaPostoVacanza
                            luogo={l}
                            ruolo="visita"
                            numero={numeroPosto(k)}
                            colore={c.primario}
                            sfondo={c.primarioChiaro}
                            giorno={g.numero}
                            indice={i}
                            ultimo={i === g.luoghi.length - 1}
                            dataGiorno={data}
                            altriGiorni={vacanza.giorni.filter((gg) => gg.numero !== g.numero).map((gg) => gg.numero)}
                            haScheda={haScheda(l)}
                            stato={{
                              eQuesta: trascinamento?.giorno === g.numero && trascinamento?.indice === i,
                              bersaglioSopra: !!trascinamento?.bersaglio && trascinamento.bersaglio.giorno === g.numero && trascinamento.bersaglio.indice === i,
                              bersaglioSotto: !!trascinamento?.bersaglio && trascinamento.bersaglio.giorno === g.numero && i === g.luoghi.length - 1 && trascinamento.bersaglio.indice === g.luoghi.length,
                              traslazione,
                            }}
                            onApriScheda={() => apriSchedaDelPosto(l)}
                            onNaviga={() => navigaA(l)}
                            onTogli={() => togliLuogo(g.numero, i)}
                            onSposta={(verso) => sposta(g.numero, i, verso)}
                            onSpostaAlGiorno={(n) => modifica(spostaLuogo(vacanza, { giorno: g.numero, indice: i }, { giorno: n, indice: 1e9 }))}
                            onPrenotazione={(prenotazione) => cambiaLuogo(g.numero, "visita", i, () => ({ prenotazione }))}
                            onInizia={iniziaTrascinamento}
                            onMuovi={muoviTrascinamento}
                            onFinisci={finisciTrascinamento}
                            registraRiga={(el) => {
                              if (el) righeRef.current[`${g.numero}-${i}`] = el;
                              else delete righeRef.current[`${g.numero}-${i}`];
                            }}
                          />
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
                          const tratto = trattoPer(posizioneGlobale(g.numero, "dormire", null));
                          return tratto ? (
                            <View style={styles.tratto}>
                              <Ionicons name="car-outline" size={13} color={c.testoSecondario} />
                              <Text style={styles.trattoTesto}>{testoTratto(tratto)}</Text>
                            </View>
                          ) : null;
                        })()}
                        <RigaPostoVacanza
                          luogo={g.dormire}
                          ruolo="dormire"
                          numero={numeroPosto(posizioneGlobale(g.numero, "dormire", null))}
                          colore={c.accento}
                          sfondo={c.accentoChiaro}
                          giorno={g.numero}
                          indice={null}
                          ultimo
                          dataGiorno={data}
                          altriGiorni={[]}
                          haScheda={haScheda(g.dormire)}
                          stato={null}
                          onApriScheda={() => apriSchedaDelPosto(g.dormire)}
                          onNaviga={() => navigaA(g.dormire)}
                          onTogli={() => aggiornaGiorno(g.numero, () => ({ dormire: null }))}
                          onSposta={() => {}}
                          onSpostaAlGiorno={() => {}}
                          onPrenotazione={(prenotazione) => cambiaLuogo(g.numero, "dormire", null, () => ({ prenotazione }))}
                          onInizia={() => {}}
                          onMuovi={() => {}}
                          onFinisci={() => {}}
                          registraRiga={() => {}}
                        />
                      </View>
                    ) : (
                      <Pressable style={styles.bottoneAggiungi} onPress={() => setRicerca({ giorno: g.numero, ruolo: "dormire" })} accessibilityRole="button">
                        <Ionicons name="bed-outline" size={18} color={c.accento} />
                        <Text style={[styles.bottoneAggiungiTesto, { color: c.accento }]}>{t("vacanza.scegliDormire")}</Text>
                      </Pressable>
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

                    {vacanza.giorni.length > 1 && (
                      <Pressable style={styles.rimuoviGiorno} onPress={() => togliGiorno(g.numero)} accessibilityRole="button">
                        <Ionicons name="trash-outline" size={16} color={c.pericolo} />
                        <Text style={styles.rimuoviGiornoTesto}>{t("vacanza.rimuoviGiorno")}</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <Pressable style={styles.bottoneGiorno} onPress={aggiungiGiorno} accessibilityRole="button">
            <Ionicons name="add" size={18} color={c.primario} />
            <Text style={styles.bottoneGiornoTesto}>{t("vacanza.aggiungiGiorno")}</Text>
          </Pressable>

          {/* 4. ARRIVO FINALE */}
          {casellaEstremo({ ruolo: "arrivo", luogo: vacanza.arrivo, colore: c.pericolo, lettera: "A", titolo: t("vacanza.arrivoFinale"), scegli: t("vacanza.scegliArrivo"), etichetta: t("vacanza.arrivoEtichetta") })}

          {/* 5. TOTALE, sempre in fondo */}
          <View style={styles.riquadroTotale}>
            <Text style={styles.totaleTitolo}>{t("vacanza.totaleVacanza")}</Text>
            <Text style={styles.totaleValore}>
              {calcolando ? t("vacanza.calcolo") : rotta ? `${formattaKm(rotta.distanzaKm)} · ${formattaTempo(rotta.minuti)}` : "—"}
            </Text>
            <Text style={styles.totaleSotto}>
              {rotta || calcolando
                ? `${t("vacanza.totaleSub", { giorni: vacanza.giorni.length, posti: numeroPostiTotali })}${prenotazioni.fatte + prenotazioni.daFare > 0 ? ` · ${t("vacanza.prenotazioniRiepilogo", { fatte: prenotazioni.fatte, daFare: prenotazioni.daFare })}` : ""}`
                : t("vacanza.totaleNonDisponibile")}
            </Text>
          </View>

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
                <Text style={styles.salvatoTesto}>
                  {vacanza.titolo.trim() ? t("vacanza.salvataComeNome", { nome: vacanza.titolo.trim() }) : t("pianoMappa.salvato")}
                </Text>
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
        key={`ricerca-${versioneRicerca}`}
        richiesta={ricerca}
        centro={centroRicerca ? { lat: centroRicerca.lat, lng: centroRicerca.lng } : null}
        centroNome={centroRicerca?.nome || ""}
        iniziale={testoRicerca}
        visibile={!!ricerca}
        titolo={
          ricerca?.ruolo === "dormire"
            ? t("vacanza.scegliDormire")
            : ricerca?.ruolo === "partenza"
              ? t("vacanza.scegliPartenza")
              : ricerca?.ruolo === "arrivo"
                ? t("vacanza.scegliArrivo")
                : t("vacanza.aggiungiPosto")
        }
        onScegli={luogoScelto}
        onApriScheda={apriSchedaDaRicerca}
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
    cardNavigazione: { gap: 8 },
    bottoneNavigazione: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.primario, borderRadius: 14, paddingVertical: 14 },
    bottoneNavigazioneTesto: { color: c.sulPrimario, fontSize: 16, fontWeight: "800" },
    navigaCon: { fontSize: 12, color: c.testoSecondario },
    rigaMotori: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chipMotore: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: c.separatore, backgroundColor: c.sfondoGruppo },
    chipMotoreAttivo: { backgroundColor: c.primario, borderColor: c.primario },
    chipMotoreTesto: { fontSize: 12, fontWeight: "700", color: c.testoSecondario },
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
    rigaData: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.sfondoGruppo, borderRadius: 12, padding: 14 },
    rigaDataTesto: { flex: 1, fontSize: 15, fontWeight: "600", color: c.testo },
    sezioneTitolo: { fontSize: 18, fontWeight: "800", color: c.testo, marginTop: 4 },
    cardEstremo: { backgroundColor: c.sfondoGruppo, borderRadius: 16, padding: 14, gap: 8 },
    cardRiepilogo: { backgroundColor: c.sfondoGruppo, borderRadius: 16, padding: 14, gap: 2 },
    rigaRiepilogoEstremo: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
    numeroPostoPiccolo: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    riepilogoNome: { flex: 1, fontSize: 14, fontWeight: "700", color: c.testo },
    rigaRiepilogo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.primarioChiaro,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    riepilogoGiorno: { fontSize: 15, fontWeight: "800", color: c.testo },
    riepilogoSotto: { fontSize: 12, color: c.testoSecondario, marginTop: 2 },
    connettore: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 10, paddingVertical: 5 },
    connettoreLinea: { width: 2, height: 16, backgroundColor: c.separatore, marginRight: 4 },
    connettoreTesto: { fontSize: 12, fontWeight: "700", color: c.testoSecondario },
    cardGiorno: { backgroundColor: c.sfondoGruppo, borderRadius: 16, padding: 14, gap: 8 },
    giornoIntestazione: { flexDirection: "row", alignItems: "center", gap: 10 },
    giornoTitolo: { fontSize: 17, fontWeight: "800", color: c.testo },
    giornoData: { fontSize: 13, color: c.primario, fontWeight: "600", marginTop: 1 },
    vuoto: { fontSize: 13, color: c.testoSecondario },
    tratto: { flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 12, paddingVertical: 4 },
    trattoTesto: { fontSize: 12, color: c.testoSecondario, fontWeight: "600" },
    rigaPosto: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.primarioChiaro, borderRadius: 12, padding: 10 },
    numeroPosto: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
    numeroPostoTesto: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
    postoNome: { fontSize: 15, fontWeight: "700", color: c.testo },
    apriScheda: { fontSize: 12, fontWeight: "700", color: c.primario, marginTop: 3 },
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
    rimuoviGiorno: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
    rimuoviGiornoTesto: { fontSize: 13, fontWeight: "700", color: c.pericolo },
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
    riquadroTotale: { backgroundColor: c.primario, borderRadius: 16, padding: 16, gap: 4, alignItems: "center" },
    totaleTitolo: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", textTransform: "uppercase", opacity: 0.9 },
    totaleValore: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
    totaleSotto: { color: "#FFFFFF", fontSize: 13, opacity: 0.9, textAlign: "center" },
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
