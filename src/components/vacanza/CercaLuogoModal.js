import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, ScrollView, ActivityIndicator, StyleSheet, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";
import { useT } from "../../i18n/i18n";
import { suggerimentiLuogo } from "../../lib/geocodifica";
import { luogoDaStruttura, luogoDaSchedaCulturale, luogoDaItinerario, infoLuogo } from "../../lib/bozzaVacanza";
import { risolviLinkGoogleMaps, urlGoogleMaps } from "../../lib/vacanza";
import { areaCercata, formattaDistanza } from "../../lib/ricercaPosti";
import {
  camperServicePressoPunto,
  culturaPerNome,
  culturaPressoPunto,
  itinerariPerNome,
  itinerariPressoPunto,
  sosteLiberePressoPunto,
  strutturePressoPunto,
  struttureperNome,
} from "../../lib/cercaPosti";
import MappaScegliPosto from "./MappaScegliPosto";

// Cerca un posto per la vacanza, con la logica di chi pianifica:
//  - senza scrivere nulla l'ELENCO mostra i posti VICINI al punto in cui sei
//    nel viaggio (es. dove dormire dopo Lodi → strutture intorno a Lodi),
//    dal più vicino, con i km;
//  - scrivendo una città ("Lodi") si vedono i posti vicini a quella città e
//    quelli che hanno quel nome (parole che COMINCIANO così, non "Clodia");
//  - toccando un posto si APRE LA SUA SCHEDA (poi «Aggiungi al percorso»);
//    con il + a destra lo si aggiunge subito.
const NUMERO_PER_SEZIONE = 12;

function pulisci(testo) {
  return testo.trim().replace(/[,(){}%]/g, " ").replace(/\s+/g, " ").trim();
}

const VUOTO = {
  chiave: null,
  vicinoStrutture: [],
  vicinoCultura: [],
  vicinoItinerari: [],
  vicinoSoste: [],
  vicinoCamper: [],
  perNomeStrutture: [],
  perNomeCultura: [],
  perNomeItinerari: [],
  luoghi: [],
  area: null,
};

export default function CercaLuogoModal({ visibile, titolo, richiesta, centro, centroNome = "", iniziale = "", onScegli, onApriScheda, onChiudi }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  const [testo, setTesto] = useState(iniziale);
  const [vista, setVista] = useState("elenco"); // "elenco" | "mappa"
  const [linkGoogle, setLinkGoogle] = useState("");
  const [erroreLink, setErroreLink] = useState("");
  const [leggendoLink, setLeggendoLink] = useState(false);
  // Risultati con la chiave della ricerca a cui appartengono: se non
  // corrispondono più a testo e punto attuali sono vecchi (si mostra "Cerco…").
  const [esito, setEsito] = useState(VUOTO);

  const ruolo = richiesta?.ruolo;
  const termine = pulisci(testo);
  const chiave = `${termine}|${centro ? `${centro.lat},${centro.lng}` : ""}|${ruolo}|${visibile ? 1 : 0}`;
  const cercando = visibile && esito.chiave !== chiave && (termine.length >= 3 || !!centro);

  useEffect(() => {
    if (!visibile || !ruolo) return undefined;
    let attivo = true;
    const timer = setTimeout(
      async () => {
        try {
          const caricaVicini = async (punto) => {
            const [vicinoStrutture, vicinoCultura, vicinoItinerari, vicinoSoste, vicinoCamper] = await Promise.all([
              ruolo === "dormire" ? strutturePressoPunto(punto) : [],
              ruolo === "visita" ? culturaPressoPunto(punto) : [],
              ruolo === "visita" ? itinerariPressoPunto(punto).catch(() => []) : [],
              ruolo === "dormire" ? sosteLiberePressoPunto(punto).catch(() => []) : [],
              ruolo === "dormire" ? camperServicePressoPunto(punto).catch(() => []) : [],
            ]);
            return { vicinoStrutture, vicinoCultura, vicinoItinerari, vicinoSoste, vicinoCamper };
          };
          if (termine.length < 3) {
            // Elenco della zona: i posti vicini al punto del viaggio.
            if (!centro || (ruolo !== "dormire" && ruolo !== "visita")) {
              if (attivo) setEsito({ ...VUOTO, chiave });
              return;
            }
            const vicini = await caricaVicini(centro);
            if (attivo) setEsito({ ...VUOTO, ...vicini, chiave, area: centroNome ? { nome: centroNome, lat: centro.lat, lng: centro.lng } : null });
            return;
          }
          const [perNomeStrutture, perNomeCultura, perNomeItinerari, luoghi] = await Promise.all([
            struttureperNome(termine, centro).catch(() => []),
            ruolo === "visita" ? culturaPerNome(termine, centro).catch(() => []) : Promise.resolve([]),
            ruolo === "visita" ? itinerariPerNome(termine, centro).catch(() => []) : Promise.resolve([]),
            suggerimentiLuogo(termine).catch(() => []),
          ]);
          // "Lodi" → l'area è Lodi: si mostrano i posti vicini a quella città.
          const area = areaCercata(luoghi, termine);
          const vicini = area ? await caricaVicini(area).catch(() => ({})) : {};
          if (attivo) setEsito({ ...VUOTO, ...vicini, chiave, perNomeStrutture, perNomeCultura, perNomeItinerari, luoghi: luoghi || [], area });
        } catch (e) {
          console.error("Errore nella ricerca dei posti:", e);
          if (attivo) setEsito({ ...VUOTO, chiave });
        }
      },
      termine.length < 3 ? 0 : 350
    );
    return () => {
      attivo = false;
      clearTimeout(timer);
    };
    // La chiave riassume testo, punto, ruolo e apertura: è l'unica cosa che fa ripartire la ricerca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave]);

  const vedi = esito.chiave === chiave ? esito : VUOTO;
  // Quelli già mostrati nell'elenco "vicino" non si ripetono in "con questo nome".
  const giaVicini = new Set(vedi.vicinoStrutture.map((s) => s.id));
  const perNomeStruttureNuove = vedi.perNomeStrutture.filter((s) => !giaVicini.has(s.id));
  const giaViciniCultura = new Set(vedi.vicinoCultura.map((k) => k.id));
  const perNomeCulturaNuova = vedi.perNomeCultura.filter((k) => !giaViciniCultura.has(k.id));
  const giaViciniItinerari = new Set(vedi.vicinoItinerari.map((i) => i.id));
  const perNomeItinerariNuovi = vedi.perNomeItinerari.filter((i) => !giaViciniItinerari.has(i.id));
  const nomeArea = vedi.area?.nome?.split(",")[0];
  const totale =
    vedi.vicinoStrutture.length +
    vedi.vicinoCultura.length +
    vedi.vicinoItinerari.length +
    vedi.vicinoSoste.length +
    vedi.vicinoCamper.length +
    perNomeStruttureNuove.length +
    perNomeCulturaNuova.length +
    perNomeItinerariNuovi.length +
    vedi.luoghi.length;
  // La mappa si apre dove si sta cercando: la città scritta, altrimenti il punto del viaggio.
  const centroMappa = vedi.area?.lat != null ? { lat: vedi.area.lat, lng: vedi.area.lng } : centro;
  const luoghiPrima = ruolo === "partenza" || ruolo === "arrivo";

  const chiudi = () => {
    setTesto("");
    setVista("elenco");
    onChiudi();
  };
  const scegli = (luogo) => {
    if (!luogo) return;
    onScegli(luogo);
    setTesto("");
  };

  const messaggioVuoto = () => {
    if (termine.length < 3 && !centro) return t("vacanza.scriviCitta");
    if (termine.length < 3 && luoghiPrima) return t("vacanza.scriviCitta");
    return termine.length < 3 ? t("vacanza.nessunPostoVicino") : t("vacanza.nessunRisultatoMappa");
  };

  const sezioneStrutture = (lista, titoloSezione, chiavePrefisso) =>
    lista.length > 0 ? (
      <Sezione key={chiavePrefisso} icona="bed-outline" titolo={titoloSezione} c={c} styles={styles}>
        {lista.slice(0, NUMERO_PER_SEZIONE).map((s) => (
          <Riga
            key={`${chiavePrefisso}-${s.id}`}
            styles={styles}
            nome={s.nome}
            sotto={[s.tipo, s.localita, formattaDistanza(s.distanzaKm)].filter(Boolean).join(" · ")}
            onPress={() => onApriScheda({ tipo: "struttura", oggetto: s, testo })}
            onAggiungi={() => scegli(luogoDaStruttura(s))}
          />
        ))}
      </Sezione>
    ) : null;

  const sezioneCultura = (lista, titoloSezione, chiavePrefisso) =>
    lista.length > 0 ? (
      <Sezione key={chiavePrefisso} icona="library-outline" titolo={titoloSezione} c={c} styles={styles}>
        {lista.slice(0, NUMERO_PER_SEZIONE).map((k) => (
          <Riga
            key={`${chiavePrefisso}-${k.id}`}
            styles={styles}
            nome={k.titolo}
            sotto={[k.citta, formattaDistanza(k.distanzaKm)].filter(Boolean).join(" · ")}
            onPress={() => onApriScheda({ tipo: "cultura", oggetto: k, testo })}
            onAggiungi={() => scegli(luogoDaSchedaCulturale(k))}
          />
        ))}
      </Sezione>
    ) : null;

  const sezioneItinerari = (lista, titoloSezione, chiavePrefisso) =>
    lista.length > 0 ? (
      <Sezione key={chiavePrefisso} icona="trail-sign-outline" titolo={titoloSezione} c={c} styles={styles}>
        {lista.slice(0, NUMERO_PER_SEZIONE).map((i) => {
          const luogo = luogoDaItinerario(i, i);
          return (
            <Riga
              key={`${chiavePrefisso}-${i.id}`}
              styles={styles}
              nome={i.nome}
              sotto={[infoLuogo(luogo, t), i.localita, formattaDistanza(i.distanzaKm)].filter(Boolean).join(" · ")}
              onPress={() => onApriScheda({ tipo: "itinerario", oggetto: i, testo })}
              onAggiungi={() => scegli(luogo)}
            />
          );
        })}
      </Sezione>
    ) : null;

  const sezioneSenzaScheda = (lista, titoloSezione, etichetta, tipo, icona) =>
    lista.length > 0 ? (
      <Sezione key={tipo} icona={icona} titolo={titoloSezione} c={c} styles={styles}>
        {lista.slice(0, NUMERO_PER_SEZIONE).map((x) => (
          <Riga
            key={`${tipo}-${x.id}`}
            styles={styles}
            nome={x.nome}
            sotto={[etichetta, x.localita, formattaDistanza(x.distanzaKm)].filter(Boolean).join(" · ")}
            onPress={() => scegli({ tipo, id: x.id, nome: x.nome, localita: x.localita || "", lat: Number(x.lat), lng: Number(x.lng), info: etichetta })}
            onAggiungi={() => scegli({ tipo, id: x.id, nome: x.nome, localita: x.localita || "", lat: Number(x.lat), lng: Number(x.lng), info: etichetta })}
          />
        ))}
      </Sezione>
    ) : null;

  const sezioneLuoghi =
    vedi.luoghi.length > 0 ? (
      <Sezione key="luoghi" icona="location-outline" titolo={t("vacanza.sezioneLuoghi")} c={c} styles={styles}>
        {vedi.luoghi.map((l, i) => (
          <Riga
            key={`l-${i}`}
            styles={styles}
            nome={l.nome}
            sotto=""
            onPress={() => scegli({ tipo: "libero", id: null, nome: l.nome, localita: "", lat: l.lat, lng: l.lng })}
            onAggiungi={null}
          />
        ))}
      </Sezione>
    ) : null;

  return (
    <Modal visible={visibile} animationType="slide" presentationStyle="pageSheet" onRequestClose={chiudi}>
      <SafeAreaView style={styles.schermo} edges={["top", "bottom"]}>
        <View style={styles.intestazione}>
          <Text style={styles.titolo}>{titolo}</Text>
          <Pressable onPress={chiudi} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi">
            <Ionicons name="close" size={22} color={c.testo} />
          </Pressable>
        </View>
        <View style={styles.campo}>
          <Ionicons name="search" size={16} color={c.testoSecondario} />
          <TextInput
            style={styles.input}
            value={testo}
            onChangeText={setTesto}
            placeholder={t("vacanza.cerca")}
            placeholderTextColor={c.testoSecondario}
            autoCorrect={false}
          />
          {cercando && <ActivityIndicator size="small" color={c.primario} />}
        </View>
        <View style={styles.tab}>
          {[
            ["elenco", t("vacanza.elenco")],
            ["mappa", t("vacanza.scegliSullaMappa")],
          ].map(([chiaveVista, etichetta]) => (
            <Pressable key={chiaveVista} style={[styles.tabVoce, vista === chiaveVista && styles.tabVoceAttiva]} onPress={() => setVista(chiaveVista)} accessibilityRole="button">
              <Text style={[styles.tabTesto, vista === chiaveVista && styles.tabTestoAttivo]}>{etichetta}</Text>
            </Pressable>
          ))}
        </View>

        {vista === "mappa" ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.lista}>
            <MappaScegliPosto
              key={centroMappa ? `${centroMappa.lat.toFixed(3)},${centroMappa.lng.toFixed(3)}` : "italia"}
              centro={centroMappa}
              richiesta={richiesta}
              onScegli={onScegli}
              onApriScheda={(dati) => onApriScheda({ ...dati, testo })}
            />
            <Text style={styles.vuoto}>{t("vacanza.spiegaMappa")}</Text>
            <View style={styles.riquadroGoogle}>
              <Pressable onPress={() => Linking.openURL(urlGoogleMaps(centroMappa, ruolo))} accessibilityRole="link">
                <Text style={styles.linkGoogle}>{t("vacanza.cercaSuGoogle")}</Text>
              </Pressable>
              <Text style={styles.rigaSotto}>{t("vacanza.incollaSpiega")}</Text>
              <View style={styles.rigaLink}>
                <TextInput
                  style={styles.inputLink}
                  value={linkGoogle}
                  onChangeText={(v) => {
                    setLinkGoogle(v);
                    setErroreLink("");
                  }}
                  placeholder={t("vacanza.incollaQui")}
                  placeholderTextColor={c.testoSecondario}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={styles.bottoneUsa}
                  disabled={leggendoLink}
                  onPress={async () => {
                    setLeggendoLink(true);
                    const r = await risolviLinkGoogleMaps(linkGoogle);
                    setLeggendoLink(false);
                    if (!r) {
                      setErroreLink(t("vacanza.linkNonRiconosciuto"));
                      return;
                    }
                    onScegli({ tipo: "libero", id: null, nome: r.nome, localita: "", lat: r.lat, lng: r.lng });
                  }}
                  accessibilityRole="button"
                >
                  {leggendoLink ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.bottoneUsaTesto}>{t("vacanza.usa")}</Text>}
                </Pressable>
              </View>
              {erroreLink ? <Text style={[styles.rigaSotto, { color: c.pericolo }]}>{erroreLink}</Text> : null}
            </View>
          </ScrollView>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.lista}>
            {luoghiPrima ? sezioneLuoghi : null}
            {sezioneStrutture(vedi.vicinoStrutture, nomeArea ? t("vacanza.doveDormireVicino", { luogo: nomeArea }) : t("vacanza.doveDormireQuiVicino"), "vs")}
            {sezioneSenzaScheda(vedi.vicinoSoste, nomeArea ? t("vacanza.sosteVicino", { luogo: nomeArea }) : t("vacanza.sosteQuiVicino"), t("vacanza.sostaLibera"), "sosta_libera", "caravan-outline")}
            {sezioneSenzaScheda(vedi.vicinoCamper, nomeArea ? t("vacanza.camperVicino", { luogo: nomeArea }) : t("vacanza.camperQuiVicino"), t("vacanza.camperService"), "camper_service", "water-outline")}
            {sezioneItinerari(vedi.vicinoItinerari, nomeArea ? t("vacanza.sentieriVicino", { luogo: nomeArea }) : t("vacanza.sentieriQuiVicino"), "vi")}
            {sezioneItinerari(perNomeItinerariNuovi, t("vacanza.sentieriConNome"), "ni")}
            {sezioneCultura(vedi.vicinoCultura, nomeArea ? t("vacanza.cosaVedereVicino", { luogo: nomeArea }) : t("vacanza.cosaVedereQuiVicino"), "vk")}
            {sezioneCultura(perNomeCulturaNuova, t("vacanza.culturaConNome"), "nk")}
            {sezioneStrutture(perNomeStruttureNuove, t("vacanza.struttureConNome"), "ns")}
            {luoghiPrima ? null : sezioneLuoghi}
            {cercando && totale === 0 && <Text style={styles.vuoto}>{t("vacanza.cerco")}</Text>}
            {!cercando && totale === 0 && <Text style={styles.vuoto}>{messaggioVuoto()}</Text>}
            {totale > 0 && <Text style={styles.vuoto}>{t("vacanza.suggerimentoRicerca")}</Text>}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Sezione({ titolo, icona, children, c, styles }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.sezioneTitolo}>
        <Ionicons name={icona} size={14} color={c.testoSecondario} />
        <Text style={styles.sezioneTitoloTesto}>{titolo}</Text>
      </View>
      {children}
    </View>
  );
}

function Riga({ nome, sotto, onPress, onAggiungi, styles }) {
  return (
    <View style={styles.riga}>
      <Pressable style={{ flex: 1 }} onPress={onPress} accessibilityRole="button">
        <Text style={styles.rigaNome} numberOfLines={2}>
          {nome}
        </Text>
        {sotto ? (
          <Text style={styles.rigaSotto} numberOfLines={2}>
            {sotto}
          </Text>
        ) : null}
      </Pressable>
      {onAggiungi ? (
        <Pressable onPress={onAggiungi} hitSlop={8} accessibilityRole="button" accessibilityLabel="Aggiungi subito">
          <Ionicons name="add-circle" size={28} color="#00587C" />
        </Pressable>
      ) : (
        <Ionicons name="add-circle" size={28} color="#00587C" />
      )}
    </View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: c.sfondoGruppo,
      borderBottomWidth: 1,
      borderBottomColor: c.separatore,
    },
    titolo: { flex: 1, fontSize: 16, fontWeight: "800", color: c.testo, marginRight: 10 },
    campo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      margin: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.sfondoCampo,
      borderWidth: 1,
      borderColor: c.separatore,
    },
    input: { flex: 1, fontSize: 16, color: c.testo },
    tab: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
    tabVoce: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: c.sfondoGruppo },
    tabVoceAttiva: { backgroundColor: c.primario },
    tabTesto: { fontSize: 14, fontWeight: "700", color: c.testoSecondario },
    tabTestoAttivo: { color: "#FFFFFF" },
    lista: { paddingHorizontal: 16, paddingBottom: 30, gap: 14 },
    riquadroGoogle: { backgroundColor: c.sfondoGruppo, borderRadius: 14, padding: 12, gap: 8 },
    linkGoogle: { fontSize: 14, fontWeight: "700", color: c.primario, textDecorationLine: "underline" },
    rigaLink: { flexDirection: "row", alignItems: "center", gap: 8 },
    inputLink: { flex: 1, height: 40, borderRadius: 10, paddingHorizontal: 10, backgroundColor: c.sfondoCampo, borderWidth: 1, borderColor: c.separatore, color: c.testo, fontSize: 14 },
    bottoneUsa: { backgroundColor: c.primario, borderRadius: 10, paddingHorizontal: 16, height: 40, alignItems: "center", justifyContent: "center", minWidth: 60 },
    bottoneUsaTesto: { color: "#fff", fontWeight: "700", fontSize: 14 },
    sezioneTitolo: { flexDirection: "row", alignItems: "center", gap: 6 },
    sezioneTitoloTesto: { fontSize: 12, fontWeight: "700", color: c.testoSecondario, textTransform: "uppercase" },
    riga: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.sfondoGruppo, borderRadius: 12, padding: 12 },
    rigaNome: { fontSize: 15, fontWeight: "700", color: c.testo },
    rigaSotto: { fontSize: 13, color: c.testoSecondario, marginTop: 2 },
    vuoto: { textAlign: "center", color: c.testoSecondario, marginTop: 10, fontSize: 14 },
  });
}
