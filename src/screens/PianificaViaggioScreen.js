import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { generaPianoStrutturato } from "../lib/pianificatore";
import { suggerimentiLuogo } from "../lib/geocodifica";
import { salvaPianoViaggio } from "../lib/pianiSalvati";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import { CardGiorno } from "../components/PianoGiorno";
import MappaPianoViaggio from "../components/MappaPianoViaggio";

// "Pianifica il tuo viaggio": form a campi (partenza, arrivo, giorni, dove
// dormire, luoghi di interesse) invece di una frase libera — chi visita
// sceglie partenza e arrivo da un elenco di suggerimenti (Nominatim, già
// geocodificati), non serve più capire la frase con l'IA (lib/pianificatore
// chiama direttamente genera-itinerario-ia, saltando interpreta-richiesta-
// viaggio: quella resta solo per "Creami un percorso" nella schermata
// Mappa, che parte da una frase detta/scritta libera).

// Deve restare uguale a GIORNI_MASSIMI nella edge function genera-itinerario-ia.
const GIORNI_MASSIMI = 10;

const OPZIONI_DORMIRE = [
  { valore: null, etichetta: "Qualsiasi" },
  { valore: "campeggio", etichetta: "Campeggio" },
  { valore: "areaSosta", etichetta: "Area sosta" },
  { valore: "libera", etichetta: "Sosta libera" },
];

// Suggerimenti di luoghi (Nominatim) 400ms dopo l'ultima digitazione, solo
// se il campo è aperto — stesso principio del debounce già usato altrove
// nell'app per le ricerche live.
function useSuggerimentiLuogo(testo, attivo) {
  const [risultati, setRisultati] = useState([]);
  const [errore, setErrore] = useState("");
  useEffect(() => {
    let corrente = true;
    const vuoto = !attivo || testo.trim().length < 3;
    const timer = setTimeout(
      () => {
        if (vuoto) {
          if (corrente) {
            setRisultati([]);
            setErrore("");
          }
          return;
        }
        suggerimentiLuogo(testo)
          .then((r) => {
            if (corrente) {
              setRisultati(r);
              setErrore("");
            }
          })
          .catch((e) => {
            if (corrente) {
              setRisultati([]);
              setErrore(messaggioErroreComprensibile(e, "Suggerimenti non disponibili:"));
            }
          });
      },
      vuoto ? 0 : 400
    );
    return () => {
      corrente = false;
      clearTimeout(timer);
    };
  }, [testo, attivo]);
  return { risultati, errore };
}

// Campo partenza/arrivo con precompilazione: chi visita scrive un nome di
// luogo e sceglie uno dei suggerimenti già geocodificati (lat/lng pronte),
// invece di scrivere una frase libera che poi va interpretata dall'IA.
function CampoLuogo({ etichetta, placeholder, testo, setTesto, setLuogo }) {
  // Niente setState in onFocus: cambiare stato proprio nell'istante in cui
  // la tastiera sta per aprirsi (build native, non Expo Go) ha fatto
  // restare la tastiera a metà corsa — segnalato dal vivo. I suggerimenti
  // si aprono solo mentre si scrive (onChangeText, a tastiera già aperta) e
  // si chiudono alla selezione o quando il campo perde il focus.
  const [aperto, setAperto] = useState(false);
  const { risultati, errore } = useSuggerimentiLuogo(testo, aperto);
  return (
    // zIndex fisso, non più acceso/spento insieme alla comparsa della
    // tendina: cambiarli nello stesso istante (nuovo figlio assoluto +
    // nuovo livello sul contenitore) faceva sfarfallare la tendina e la
    // richiudeva subito — segnalato dal vivo sull'iPhone.
    <View style={styles.campoContenitore}>
      <Text style={styles.etichettaCampo}>{etichetta}</Text>
      <View style={styles.campoLuogo}>
        <Ionicons name="location-outline" size={16} color={colori.blu} />
        <TextInput
          style={styles.campoLuogoInput}
          placeholder={placeholder}
          placeholderTextColor={colori.testoSecondario}
          value={testo}
          onChangeText={(v) => {
            setTesto(v);
            setLuogo(null);
            setAperto(true);
          }}
          onBlur={() => setTimeout(() => setAperto(false), 150)}
          returnKeyType="next"
        />
      </View>
      {aperto && errore ? <Text style={styles.erroreCampo}>{errore}</Text> : null}
      {aperto && risultati.length > 0 && (
        <View style={styles.dropdown}>
          {risultati.map((r, i) => (
            <Pressable
              key={`${r.nome}-${i}`}
              style={({ pressed }) => [styles.dropdownVoce, pressed && { backgroundColor: colori.bluChiaro }]}
              onPress={() => {
                setTesto(r.nome);
                setLuogo(r);
                setAperto(false);
              }}
            >
              <Text style={styles.dropdownTesto}>{r.nome}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function SelettoreGiorni({ valore, onCambia }) {
  return (
    <View style={styles.campoContenitore}>
      <Text style={styles.etichettaCampo}>Quanti giorni</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepperPulsante} onPress={() => onCambia(Math.max(1, valore - 1))} hitSlop={8}>
          <Ionicons name="remove" size={16} color={colori.blu} />
        </Pressable>
        <Text style={styles.stepperValore}>{valore}</Text>
        <Pressable style={styles.stepperPulsante} onPress={() => onCambia(Math.min(GIORNI_MASSIMI, valore + 1))} hitSlop={8}>
          <Ionicons name="add" size={16} color={colori.blu} />
        </Pressable>
      </View>
    </View>
  );
}

function SelettoreDormire({ valore, onCambia }) {
  return (
    <View style={styles.campoContenitore}>
      <Text style={styles.etichettaCampo}>
        <Ionicons name="bed-outline" size={12} color={colori.testoSecondario} /> Dove dormire
      </Text>
      <View style={styles.chipRiga}>
        {OPZIONI_DORMIRE.map((o) => (
          <Pressable
            key={o.etichetta}
            style={[styles.chip, valore === o.valore && styles.chipAttivo]}
            onPress={() => onCambia(o.valore)}
          >
            <Text style={[styles.chipTesto, valore === o.valore && styles.chipTestoAttivo]}>{o.etichetta}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ToggleLuoghiInteresse({ attivo, onCambia }) {
  return (
    <View style={styles.toggleRiga}>
      <Ionicons name="flag-outline" size={18} color={colori.blu} />
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitolo}>Luoghi di interesse</Text>
        <Text style={styles.toggleSottotitolo}>Borghi, musei e attività lungo il percorso</Text>
      </View>
      <Switch
        value={attivo}
        onValueChange={onCambia}
        trackColor={{ true: colori.blu }}
        thumbColor={colori.bianco}
      />
    </View>
  );
}

export default function PianificaViaggioScreen({ navigation, route }) {
  const { session } = useAuth();
  const [richiesta, setRichiesta] = useState("");
  const [testoPartenza, setTestoPartenza] = useState("");
  const [luogoPartenza, setLuogoPartenza] = useState(null);
  const [testoArrivo, setTestoArrivo] = useState("");
  const [luogoArrivo, setLuogoArrivo] = useState(null);
  const [giorni, setGiorni] = useState(3);
  const [dormirePref, setDormirePref] = useState(null);
  const [luoghiInteresse, setLuoghiInteresse] = useState(true);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState("");
  const [piano, setPiano] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvato, setSalvato] = useState(false);

  // Aperta da "I miei piani di viaggio" (PianiSalvatiScreen): il piano è già
  // pronto, non va rigenerato — solo mostrato (già salvato, il pulsante
  // salva resta disattivo). Il form sopra si precompila con partenza/
  // arrivo/giorni di quel piano (da piano.tappeCoordinate, già geocodificate).
  useEffect(() => {
    if (!route?.params?.pianoSalvato) return;
    Promise.resolve().then(() => {
      const pianoSalvato = route.params.pianoSalvato;
      setRichiesta(route.params.richiestaSalvata || "");
      setPiano(pianoSalvato);
      setSalvato(true);
      setGiorni(pianoSalvato?.giorniRichiesti || 3);
      const tappeCoordinate = pianoSalvato?.tappeCoordinate || [];
      const prima = tappeCoordinate[0];
      const ultima = tappeCoordinate[tappeCoordinate.length - 1];
      if (prima) {
        setTestoPartenza(prima.nome);
        setLuogoPartenza(prima);
      }
      if (ultima && ultima !== prima) {
        setTestoArrivo(ultima.nome);
        setLuogoArrivo(ultima);
      }
    });
  }, [route?.params?.pianoSalvato, route?.params?.richiestaSalvata]);

  const richiedeAccesso = () => {
    Alert.alert("Accedi", "Pianificare un viaggio con l'IA è gratuito per chi si registra. Accedi o registrati per usarla.", [
      { text: "Annulla", style: "cancel" },
      { text: "Accedi", onPress: () => navigation.navigate("Accedi") },
    ]);
  };

  const genera = async () => {
    if (caricando) return;
    if (!session) {
      richiedeAccesso();
      return;
    }
    if (!luogoPartenza || !luogoArrivo) {
      setErrore("Scegli partenza e arrivo da uno dei suggerimenti della lista.");
      return;
    }
    setCaricando(true);
    setErrore("");
    setPiano(null);
    setSalvato(false);
    try {
      const { piano: nuovoPiano, richiesta: fraseRichiesta } = await generaPianoStrutturato({
        partenza: luogoPartenza,
        arrivo: luogoArrivo,
        giorni,
        preferenzaDormire: dormirePref,
        mostraLuoghiInteresse: luoghiInteresse,
      });
      setRichiesta(fraseRichiesta);
      setPiano(nuovoPiano);
    } catch (e) {
      setErrore(messaggioErroreComprensibile(e, "Non sono riuscito a generare il piano di viaggio."));
    } finally {
      setCaricando(false);
    }
  };

  const salva = async () => {
    if (salvando || salvato || !piano) return;
    setSalvando(true);
    try {
      await salvaPianoViaggio(session.user.id, {
        richiesta,
        tappe: piano.tappe,
        giorniRichiesti: piano.giorniRichiesti,
        piano,
      });
      setSalvato(true);
    } catch (e) {
      Alert.alert("Non salvato", messaggioErroreComprensibile(e, "Non sono riuscito a salvare il piano."));
    } finally {
      setSalvando(false);
    }
  };

  // "Cambia" su dove dormire/cosa visitare: sostituisce la scelta di un solo
  // giorno con un'altra tra le alternative vere già arrivate con il piano
  // (tappeCandidati), senza richiamare l'IA. Il piano cambia rispetto a
  // quello eventualmente già salvato, quindi il pulsante Salva torna attivo.
  const aggiornaDormireGiorno = (numeroGiorno, categoria, nuovoPosto) => {
    setPiano((prev) =>
      prev
        ? {
            ...prev,
            giorni: prev.giorni.map((g) =>
              g.numero === numeroGiorno ? { ...g, dormire: { ...g.dormire, [categoria]: nuovoPosto } } : g
            ),
          }
        : prev
    );
    setSalvato(false);
  };

  const aggiornaVoceGiorno = (numeroGiorno, indiceVoce, nuovaVoce) => {
    setPiano((prev) =>
      prev
        ? {
            ...prev,
            giorni: prev.giorni.map((g) => {
              if (g.numero !== numeroGiorno) return g;
              const voci = [...g.voci];
              voci[indiceVoce] = nuovaVoce;
              return { ...g, voci };
            }),
          }
        : prev
    );
    setSalvato(false);
  };

  const puoGenerare = luogoPartenza && luogoArrivo && !caricando;

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
            <MarchioNaturaGo />
            <Text style={styles.titolo}>Pianifica il tuo viaggio</Text>
            <Text style={styles.sottotitolo}>
              Scegli partenza, arrivo e per quanti giorni: l&apos;IA costruisce un piano giorno per giorno con le
              schede vere di NaturaGo.
            </Text>

            <View style={styles.card}>
              <CampoLuogo
                etichetta="Partenza"
                placeholder="Es. Mantova"
                testo={testoPartenza}
                setTesto={setTestoPartenza}
                setLuogo={setLuogoPartenza}
              />
              <CampoLuogo
                etichetta="Arrivo"
                placeholder="Es. Lago di Garda"
                testo={testoArrivo}
                setTesto={setTestoArrivo}
                setLuogo={setLuogoArrivo}
              />
              <SelettoreGiorni valore={giorni} onCambia={setGiorni} />
              <SelettoreDormire valore={dormirePref} onCambia={setDormirePref} />
              <ToggleLuoghiInteresse attivo={luoghiInteresse} onCambia={setLuoghiInteresse} />

              <Pressable style={[styles.bottone, !puoGenerare && styles.bottoneDisattivo]} onPress={genera} disabled={!puoGenerare}>
                {caricando ? (
                  <ActivityIndicator color={colori.bianco} size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles-outline" size={16} color={colori.bianco} />
                    <Text style={styles.bottoneTesto}>Genera il piano</Text>
                  </>
                )}
              </Pressable>
            </View>

            {errore ? <Text style={styles.errore}>{errore}</Text> : null}

            {piano && (
              <View style={styles.risultato}>
                <View style={styles.rigaRisultato}>
                  <Text style={styles.risultatoTitolo}>
                    {piano.giorniRichiesti} giorni · {piano.tappe.join(" → ")}
                  </Text>
                  <Pressable style={styles.pulsanteSalva} onPress={salva} disabled={salvando || salvato}>
                    {salvando ? (
                      <ActivityIndicator color={colori.blu} size="small" />
                    ) : (
                      <Ionicons name={salvato ? "bookmark" : "bookmark-outline"} size={18} color={colori.blu} />
                    )}
                  </Pressable>
                </View>
                <MappaPianoViaggio piano={piano} />
                {piano.giorni.map((g) => (
                  <CardGiorno
                    key={g.numero}
                    giorno={g}
                    navigation={navigation}
                    candidati={piano.tappeCandidati?.[g.tappaIndice]}
                    onCambiaDormire={(categoria, scelta) => aggiornaDormireGiorno(g.numero, categoria, scelta)}
                    onCambiaVoce={(indice, scelta) => aggiornaVoceGiorno(g.numero, indice, scelta)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.bluChiaro },
  contenuto: { padding: 20, paddingBottom: 40, gap: 4 },
  titolo: { fontSize: 20, fontWeight: "800", color: colori.testo, marginTop: 14 },
  sottotitolo: { fontSize: 12.5, color: colori.testoSecondario, marginTop: 4, marginBottom: 14, lineHeight: 18 },
  card: {
    backgroundColor: colori.bianco,
    borderRadius: raggioCard,
    padding: 16,
    gap: 14,
    ...ombraCard,
  },
  campoContenitore: { gap: 5, zIndex: 10 },
  etichettaCampo: { fontSize: 10.5, fontWeight: "700", color: colori.testoSecondario, textTransform: "uppercase" },
  campoLuogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.bluChiaro,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  campoLuogoInput: { flex: 1, fontSize: 13.5, color: colori.testo },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colori.bianco,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colori.bordo,
    maxHeight: 180,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  dropdownVoce: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colori.bluChiaro },
  dropdownTesto: { fontSize: 12.5, color: colori.testo },
  erroreCampo: { fontSize: 10.5, color: colori.rosso, marginTop: 3 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colori.bluChiaro,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  stepperPulsante: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colori.bianco,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValore: { fontSize: 14, fontWeight: "700", color: colori.testo, minWidth: 16, textAlign: "center" },
  chipRiga: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colori.bordo,
    backgroundColor: colori.bianco,
  },
  chipAttivo: { backgroundColor: colori.blu, borderColor: colori.blu },
  chipTesto: { fontSize: 11.5, fontWeight: "600", color: colori.testo },
  chipTestoAttivo: { color: colori.bianco },
  toggleRiga: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colori.bluChiaro,
    borderRadius: 12,
    padding: 10,
  },
  toggleTitolo: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  toggleSottotitolo: { fontSize: 10.5, color: colori.testoSecondario, marginTop: 1 },
  bottone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colori.blu,
    borderRadius: 999,
    paddingVertical: 13,
  },
  bottoneDisattivo: { opacity: 0.5 },
  bottoneTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13.5 },
  errore: { color: colori.rosso, fontSize: 12.5, marginTop: 10 },
  risultato: { marginTop: 22, gap: 12 },
  rigaRisultato: { flexDirection: "row", alignItems: "center", gap: 10 },
  risultatoTitolo: { flex: 1, fontSize: 15, fontWeight: "800", color: colori.testo },
  pulsanteSalva: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colori.bianco,
    ...ombraCard,
  },
});
