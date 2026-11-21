import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Keyboard } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import Testo from "../components/ui/Testo";
import Pulsante from "../components/ui/Pulsante";
import { Molla, Comparsa } from "../components/ui/Molla";
import VeloSfumato from "../components/ui/VeloSfumato";
import { vibraLeggera } from "../lib/vibrazione";
import { Gruppo, Riga } from "../components/ui/Gruppo";
import SelettoreDate from "../components/SelettoreDate";
import { etichettaData, numeroNotti } from "../lib/periodo";
import CaroselloInEvidenza from "../components/CaroselloInEvidenza";
import { cercaStrutture, caricaStrutture } from "../lib/strutture";
import { REGIONI_ITALIANE } from "../lib/regioni";
import { caricaRicercheRecenti, salvaRicercaRecente, cancellaRicercheRecenti } from "../lib/ricercheRecenti";
import { useT } from "../i18n/i18n";

// Foto Unsplash: "Montagna e sentieri" e "Musei, borghi e attività" riusano
// quelle già in uso sul sito per lo stesso tema (CATEGORIE_INTERESSE in
// src/App.jsx), per coerenza visiva app/sito. "Dove dormire" usa invece un
// furgone in spiaggia al tramonto sul mare (Stefan Kranz su Unsplash): il
// furgone cade in basso a destra, lontano dall'etichetta in alto a sinistra.
// Le tre sezioni hanno un colore di categoria proprio ("Dove dormire" usa il
// blu del marchio, le altre due un verde/arancio dedicato): colori fissi
// apposta, non presi dal tema — distinguono le categorie anche in scuro.
// Le etichette delle singole tessere (Campeggi, Rifugi, Sentieri...) e il
// loro `filtro` restano in italiano di proposito: `filtro`/`schermo` sono
// anche le chiavi dati vere, usate tali e quali da EsploraScreen.js
// (FILTRI) e da TIPO_STRUTTURA_CAMPEGGIO/TIPO_RIFUGIO in src/lib/
// strutture.js — tradurre solo l'etichetta visibile richiede prima di
// separare testo ed etichetta-chiave in quei punti, lavoro a parte.
function useSezioni(c, t) {
  return [
  {
    chiave: "dormire",
    titolo: t("hub.doveDormire"),
    icona: "bonfire-outline",
    colore: c.primario,
    tinta: "rgba(0,88,124,0.08)",
    immagine: "https://images.unsplash.com/photo-1665677455995-9680bb0a5e18?auto=format&fit=crop&w=1000&h=280&q=70",
    tessere: [
      { etichetta: "Campeggi", icona: "bonfire-outline", filtro: "Campeggi" },
      { etichetta: "Agriturismi", icona: "leaf-outline", filtro: "Agriturismi" },
      { etichetta: "Agricampeggi", icona: "flower-outline", filtro: "Agricampeggi" },
      { etichetta: "Aree sosta", icona: "car-outline", filtro: "Aree sosta" },
      { etichetta: "Camper service", icona: "water-outline", filtro: "Camper service" },
    ],
  },
  {
    chiave: "montagna",
    titolo: t("hub.montagnaSentieri"),
    icona: "trail-sign-outline",
    colore: "#15803d",
    tinta: "rgba(21,128,61,0.08)",
    immagine: "https://images.unsplash.com/photo-1761415451904-0a0a2c630ea9?auto=format&fit=crop&w=800&q=70",
    tessere: [
      { etichetta: "Sentieri", icona: "trail-sign-outline", schermo: "Sentieri" },
      { etichetta: "Rifugi", icona: "home-outline", filtro: "Rifugi" },
      { etichetta: "Bivacchi", icona: "bed-outline", filtro: "Bivacchi" },
      { etichetta: "Percorsi 4x4", icona: "car-sport-outline", schermo: "Percorsi4x4" },
      // Stessa schermata di "Sentieri": i sentieri hanno già il filtro
      // "a piedi / in bici / entrambi", non serve una seconda lista.
      { etichetta: "Bici e a piedi", icona: "bicycle-outline", schermo: "Sentieri" },
    ],
  },
  {
    // Stessa tabella del sito `eventi_campeggio` ("schede culturali"),
    // distinta dalla colonna categoria: 'musei' / 'borghi' / 'attivita'.
    chiave: "cultura",
    titolo: t("hub.museiBorghiAttivita"),
    icona: "color-palette-outline",
    colore: "#c2410c",
    tinta: "rgba(194,65,12,0.08)",
    immagine: "https://images.unsplash.com/photo-1775685921744-6f6596d33dd0?auto=format&fit=crop&w=800&q=70",
    tessere: [
      { etichetta: "Musei", icona: "color-palette-outline", categoriaCulturale: "musei", colore: "#7c3aed" },
      { etichetta: "Borghi", icona: "business-outline", categoriaCulturale: "borghi", colore: "#b45309" },
      { etichetta: "Attività locali", icona: "compass-outline", categoriaCulturale: "attivita", colore: "#0891b2" },
    ],
  },
  ];
}

export default function EsploraHubScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const SEZIONI = useSezioni(c, t);
  const [testoRicerca, setTestoRicerca] = useState("");
  const [inputAFocus, setInputAFocus] = useState(false);
  const [ricercheRecenti, setRicercheRecenti] = useState([]);
  const [inEvidenza, setInEvidenza] = useState([]);
  const ora = new Date().getHours();
  const saluto = t(ora < 12 ? "hub.saluto.mattina" : ora < 18 ? "hub.saluto.pomeriggio" : "hub.saluto.sera");

  // Luoghi in evidenza: le strutture meglio piazzate che hanno una foto.
  useEffect(() => {
    let annullato = false;
    caricaStrutture({ limite: 24 })
      .then((dati) => {
        if (!annullato) setInEvidenza(dati.filter((d) => d.fotoUrl && d.lat != null).slice(0, 8));
      })
      .catch((e) => console.error("Errore nel caricare i luoghi in evidenza:", e));
    return () => {
      annullato = true;
    };
  }, []);
  const [suggerimentiStrutture, setSuggerimentiStrutture] = useState([]);

  useEffect(() => {
    caricaRicercheRecenti().then(setRicercheRecenti);
  }, []);

  // Stessi suggerimenti "mentre si digita" della ricerca in EsploraLista
  // (regioni da un elenco fisso + poche strutture vere dal database), solo
  // con meno risultati: qui bastano per completare il tocco, non per
  // sfogliare una lista.
  useEffect(() => {
    const termine = testoRicerca.trim();
    if (termine.length < 2) {
      Promise.resolve().then(() => setSuggerimentiStrutture([]));
      return;
    }
    let annullato = false;
    const timer = setTimeout(() => {
      cercaStrutture({ termine, limite: 5 })
        .then((dati) => {
          if (!annullato) setSuggerimentiStrutture(dati);
        })
        .catch((e) => console.error("Errore nei suggerimenti di ricerca:", e));
    }, 300);
    return () => {
      annullato = true;
      clearTimeout(timer);
    };
  }, [testoRicerca]);

  // Percorso guidato: prima il luogo, poi le date, poi "Cerca". Digitare o
  // scegliere un suggerimento NON avvia la ricerca: compila solo il campo e,
  // se mancano le date, apre il calendario (si può saltare con "Senza date").
  const apriDate = () => {
    Keyboard.dismiss();
    setInputAFocus(false);
    setDateAperte(true);
  };

  const scegliLuogo = (termine) => {
    setTestoRicerca(termine);
    Keyboard.dismiss();
    setInputAFocus(false);
    if (!(dateSoggiorno.checkIn && dateSoggiorno.checkOut)) setDateAperte(true);
  };

  // Ricerca con le date del soggiorno: toglie le strutture stagionali chiuse
  // in quel periodo (stessa regola del sito).
  const [dateSoggiorno, setDateSoggiorno] = useState({ checkIn: null, checkOut: null });
  const [dateAperte, setDateAperte] = useState(false);
  const haDate = !!(dateSoggiorno.checkIn && dateSoggiorno.checkOut);

  const avviaRicerca = () => {
    vibraLeggera();
    const pulito = testoRicerca.trim();
    if (pulito) salvaRicercaRecente(pulito).then(setRicercheRecenti);
    setInputAFocus(false);
    navigation.push("EsploraLista", {
      ricercaIniziale: pulito || undefined,
      dateIniziali: haDate ? dateSoggiorno : undefined,
    });
  };

  const vaiVicinoAMe = () => {
    navigation.push("EsploraLista", { vicinoAMeIniziale: true });
  };

  const vaiA = (tessera) => {
    vibraLeggera();
    if (tessera.inArrivo) {
      Alert.alert(tessera.etichetta, "Questa sezione arriverà in una prossima versione dell'app.");
      return;
    }
    // "push", non "navigate": se la schermata è già nello stack (ci si
    // era già stati), "navigate" la riuserebbe con il vecchio filtro.
    // "push" ne apre sempre una nuova, pulita.
    if (tessera.schermo) {
      navigation.push(tessera.schermo);
      return;
    }
    if (tessera.categoriaCulturale) {
      navigation.push("Cultura", { categoria: tessera.categoriaCulturale });
      return;
    }
    navigation.push("EsploraLista", { filtriIniziali: [tessera.filtro] });
  };

  // La foto e la scritta della sezione (non solo le tessere piccole sotto)
  // devono essere toccabili: è il primo istinto di chi guarda questa
  // schermata. "Dove dormire" ha tessere tutte dello stesso tipo (filtro
  // per EsploraLista): il tocco le mostra tutte insieme. Le altre due
  // sezioni mescolano destinazioni diverse (schermi propri, categorie
  // culturali): il tocco apre la prima tessera, la più rappresentativa.
  const vaiASezione = (sezione) => {
    if (sezione.chiave === "dormire") {
      navigation.push("EsploraLista", {
        filtriIniziali: sezione.tessere.filter((t) => t.filtro).map((t) => t.filtro),
      });
      return;
    }
    vaiA(sezione.tessere[0]);
  };

  const termineSuggerimenti = testoRicerca.trim().toLowerCase();
  const regioniSuggerite =
    termineSuggerimenti.length >= 2
      ? REGIONI_ITALIANE.filter((r) => r.toLowerCase().includes(termineSuggerimenti)).slice(0, 3)
      : [];
  const mostraRicercheRecenti = termineSuggerimenti.length === 0 && ricercheRecenti.length > 0;
  const mostraTendina =
    inputAFocus && (regioniSuggerite.length > 0 || suggerimentiStrutture.length > 0 || mostraRicercheRecenti);

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.contenuto}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <MarchioNaturaGo style={{ marginBottom: 2 }} />
        <Testo v="titolo" accessibilityRole="header" style={{ marginTop: 2, textAlign: "center" }}>
          {t("hub.dovevai")}
        </Testo>
        <Comparsa>
          <Testo v="secondario" style={{ textAlign: "center", color: c.testoSecondario }}>
            {saluto}
          </Testo>
        </Comparsa>

        <View style={styles.ricercaRapida}>
          <View style={styles.contenitoreRicerca}>
            <View style={styles.cardRicerca}>
              <View style={styles.ricercaPill}>
                <Ionicons name="search" size={20} color={c.primario} />
                <TextInput
                  style={styles.inputRicerca}
                  placeholder={t("hub.placeholderRicerca")}
                  placeholderTextColor={c.testoSecondario}
                  value={testoRicerca}
                  onChangeText={setTestoRicerca}
                  onSubmitEditing={() => (haDate ? Keyboard.dismiss() : apriDate())}
                  onFocus={() => setInputAFocus(true)}
                  onBlur={() => setTimeout(() => setInputAFocus(false), 150)}
                  returnKeyType="next"
                  blurOnSubmit
                />
              </View>
              <View style={styles.separatore} />
              <Pressable
                style={styles.rigaDate}
                onPress={apriDate}
                accessibilityRole="button"
                accessibilityLabel={t("hub.aggiungiDate")}
              >
                <Ionicons name="calendar-outline" size={20} color={c.primario} />
                <Text style={[styles.testoDate, !haDate && { color: c.testoSecondario, fontWeight: "500" }]}>
                  {haDate
                    ? `${etichettaData(dateSoggiorno.checkIn)} → ${etichettaData(dateSoggiorno.checkOut)} · ${numeroNotti(dateSoggiorno.checkIn, dateSoggiorno.checkOut)} ${t("hub.notti")}`
                    : t("hub.aggiungiDate")}
                </Text>
                <Ionicons name="chevron-forward" size={15} color={c.testoSecondario} />
              </Pressable>
              <Pressable style={styles.bottoneCerca} onPress={avviaRicerca} accessibilityRole="button" accessibilityLabel={t("hub.cerca")}>
                <Text style={styles.bottoneCercaTesto}>{t("hub.cerca")}</Text>
              </Pressable>
            </View>

            {mostraTendina && (
              <View style={styles.tendina}>
                {mostraRicercheRecenti && (
                  <>
                    <View style={styles.tendinaIntestazione}>
                      <Text style={styles.tendinaIntestazioneTesto}>{t("hub.ricercheRecenti")}</Text>
                      <Pressable onPress={() => cancellaRicercheRecenti().then(setRicercheRecenti)} hitSlop={8}>
                        <Text style={styles.tendinaCancella}>{t("hub.cancella")}</Text>
                      </Pressable>
                    </View>
                    {ricercheRecenti.map((termine) => (
                      <Pressable key={`recente-${termine}`} style={styles.rigaTendina} onPress={() => scegliLuogo(termine)}>
                        <Ionicons name="time-outline" size={15} color={c.testoSecondario} />
                        <Text style={styles.rigaTendinaTesto}>{termine}</Text>
                      </Pressable>
                    ))}
                  </>
                )}
                {regioniSuggerite.map((r) => (
                  <Pressable key={`regione-${r}`} style={styles.rigaTendina} onPress={() => scegliLuogo(r)}>
                    <Ionicons name="map-outline" size={15} color={c.primario} />
                    <Text style={styles.rigaTendinaTesto}>{r}</Text>
                    <Text style={styles.rigaTendinaEtichetta}>{t("hub.regione")}</Text>
                  </Pressable>
                ))}
                {suggerimentiStrutture.map((s) => (
                  <Pressable
                    key={`struttura-${s.id}`}
                    style={styles.rigaTendina}
                    onPress={() => {
                      setInputAFocus(false);
                      navigation.navigate("Scheda", { struttura: s });
                    }}
                  >
                    <Ionicons name="business-outline" size={15} color={c.testoSecondario} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rigaTendinaTesto} numberOfLines={1}>
                        {s.nome}
                      </Text>
                      {s.localita ? (
                        <Text style={styles.rigaTendinaSottotitolo} numberOfLines={1}>
                          {s.localita}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <Pulsante
            titolo={t("hub.viciniATe")}
            variante="secondario"
            icona={<Ionicons name="navigate" size={18} color={c.primario} />}
            onPress={vaiVicinoAMe}
            accessibilityLabel="Mostra le strutture vicino a te"
          />

        </View>

        <Pressable
          style={styles.bannerPianifica}
          onPress={() => navigation.push("PianificaViaggio")}
          accessibilityRole="button"
          accessibilityLabel={t("hub.pianificaIA")}
        >
          <View style={styles.bannerPianificaIcona}>
            <Ionicons name="sparkles" size={20} color={c.primario} />
          </View>
          <View style={{ flex: 1 }}>
            <Testo v="corpoForte">{t("hub.pianificaIA")}</Testo>
            <Testo v="nota">{t("hub.pianificaIASotto")}</Testo>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.testoSecondario} />
        </Pressable>

        {inEvidenza.length > 0 && (
          <>
            <Testo v="titolo" accessibilityRole="header" style={{ marginTop: 10 }}>
              {t("hub.inEvidenza")}
            </Testo>
            <Comparsa ritardo={80}>
              <CaroselloInEvidenza strutture={inEvidenza} onApri={(struttura) => navigation.push("Scheda", { struttura })} />
            </Comparsa>
          </>
        )}

        <Testo v="titolo" accessibilityRole="header" style={{ marginTop: 10, textAlign: "center" }}>
          {t("hub.cosaCerchi")}
        </Testo>

        {SEZIONI.map((sezione, i) => (
          <Comparsa key={sezione.chiave} ritardo={120 + i * 140} style={styles.sezione}>
            <Molla
              scala={0.975}
              onPress={() => {
                vibraLeggera();
                vaiASezione(sezione);
              }}
              accessibilityRole="button"
              accessibilityLabel={sezione.titolo}
            >
              <View style={styles.sezioneBanner}>
                <Image
                  source={{ uri: sezione.immagine }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                  accessibilityIgnoresInvertColors
                />
                <VeloSfumato forza={0.7} />
                <View style={styles.sezioneTestiFoto}>
                  <Ionicons name={sezione.icona} size={22} color="#fff" />
                  <Text style={styles.sezioneTitolo}>{sezione.titolo}</Text>
                </View>
              </View>
            </Molla>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRiga}>
              {sezione.tessere.map((tessera) => (
                <Molla
                  key={tessera.etichetta}
                  style={styles.chip}
                  scala={0.93}
                  onPress={() => vaiA(tessera)}
                  accessibilityRole="button"
                  accessibilityLabel={tessera.etichetta}
                >
                  <Ionicons name={tessera.icona} size={18} color={tessera.colore || sezione.colore} />
                  <Text style={styles.chipTesto}>{tessera.etichetta}</Text>
                </Molla>
              ))}
            </ScrollView>
          </Comparsa>
        ))}

        <Pulsante titolo={t("hub.vediTutteLeStrutture")} variante="secondario" onPress={() => navigation.push("EsploraLista")} style={{ marginTop: 6 }} />

        <Gruppo style={{ marginTop: 10 }}>
          <Riga icona="create-outline" testo={t("vacanza.titolo")} onPress={() => navigation.push("CreaVacanza")} />
          <Riga icona="book-outline" testo="Blog NaturaGo Explorer" onPress={() => navigation.push("Blog")} />
        </Gruppo>
      </ScrollView>
      <SelettoreDate
        key={`${dateSoggiorno.checkIn}-${dateSoggiorno.checkOut}-${dateAperte}`}
        visibile={dateAperte}
        checkIn={dateSoggiorno.checkIn}
        checkOut={dateSoggiorno.checkOut}
        onChiudi={() => setDateAperte(false)}
        onConferma={(d) => {
          setDateSoggiorno(d);
          setDateAperte(false);
        }}
      />
    </SafeAreaView>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondo },
  contenuto: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24, gap: 10 },
  ricercaRapida: { gap: 8, marginBottom: 2 },
  contenitoreRicerca: { position: "relative", zIndex: 30 },
  tendina: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: c.sfondoGruppo,
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 31,
  },
  rigaTendina: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  rigaTendinaTesto: { flex: 1, fontSize: 14, fontWeight: "600", color: c.testo },
  rigaTendinaSottotitolo: { fontSize: 10.5, color: c.testoSecondario },
  rigaTendinaEtichetta: { fontSize: 10, fontWeight: "700", color: c.primario, textTransform: "uppercase" },
  tendinaIntestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  tendinaIntestazioneTesto: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: c.testoSecondario,
  },
  tendinaCancella: { fontSize: 11, fontWeight: "700", color: c.primario },
  cardRicerca: {
    backgroundColor: c.sfondoGruppo,
    borderRadius: 22,
    padding: 6,
    ...ombra(c),
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  separatore: { height: StyleSheet.hairlineWidth, backgroundColor: "#e5e7eb", marginHorizontal: 14 },
  rigaDate: { flexDirection: "row", alignItems: "center", gap: 10, height: 54, paddingHorizontal: 14 },
  testoDate: { flex: 1, fontSize: 16, fontWeight: "700", color: c.testo },
  bottoneCerca: { backgroundColor: c.primario, borderRadius: 16, height: 52, alignItems: "center", justifyContent: "center", margin: 4, marginTop: 2 },
  bottoneCercaTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 17 },
  ricercaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 56,
    paddingHorizontal: 14,
  },
  inputRicerca: { flex: 1, fontSize: 17, fontWeight: "600", color: c.testo },
  sezione: { gap: 10 },
  sezioneBanner: { width: "100%", height: 150, borderRadius: 20, overflow: "hidden", justifyContent: "flex-end" },
  sezioneVelo: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.28)" },
  sezioneTestiFoto: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 },
  sezioneTitolo: { fontSize: 22, lineHeight: 27, fontWeight: "700", color: "#fff" },
  sezionePremuta: { opacity: 0.85 },
  chipRiga: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    backgroundColor: c.sfondoGruppo,
    borderRadius: 999,
    ...ombra(c),
  },
  chipTesto: { fontSize: 15, fontWeight: "600", color: c.testo },
  bannerPianifica: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.primarioChiaro,
    borderRadius: raggio.l,
    padding: 14,
    marginTop: 6,
  },
  bannerPianificaIcona: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.sfondoGruppo,
    alignItems: "center",
    justifyContent: "center",
  },
  });
}
