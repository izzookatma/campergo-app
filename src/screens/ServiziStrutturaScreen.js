import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { caricaMiaStruttura, caricaServiziHost, salvaServiziHost } from "../lib/host";
import { CATEGORIE_FILTRI_SERVIZI } from "../lib/filtriServizi";
import StatoErrore from "../components/ui/StatoErrore";

const AMBIENTI = [
  { chiave: "lago", etichetta: "Lago" },
  { chiave: "mare", etichetta: "Mare" },
  { chiave: "montagna", etichetta: "Montagna" },
  { chiave: "collina", etichetta: "Collina" },
  { chiave: "agriturismo", etichetta: "Agriturismo" },
  { chiave: "valle", etichetta: "Valle" },
];
const CATEGORIE = [
  { chiave: "relax", etichetta: "Relax" },
  { chiave: "cultura", etichetta: "Attività e visite culturali" },
  { chiave: "natura", etichetta: "Vivi nella natura" },
];
const uguali = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// Servizi offerti dalla struttura (corrente, docce, wifi, camper service…):
// sono quelli che i clienti filtrano nella ricerca, quindi tenerli giusti
// porta più visite alla scheda.
export default function ServiziStrutturaScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const { session } = useAuth();
  const utenteId = session?.user?.id;
  const [strutturaId, setStrutturaId] = useState(null);
  const [selezionati, setSelezionati] = useState([]);
  const [originali, setOriginali] = useState([]);
  const [ambiente, setAmbiente] = useState([]);
  const [ambienteOrig, setAmbienteOrig] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [categorieOrig, setCategorieOrig] = useState([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState(false);
  const [tentativo, setTentativo] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [salvato, setSalvato] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void tentativo;
      let attivo = true;
      setErrore(false);
      caricaMiaStruttura(utenteId)
        .then(async (s) => {
          if (!s) return null;
          const servizi = await caricaServiziHost(s.id);
          return { id: s.id, servizi };
        })
        .then((r) => {
          if (!attivo || !r) return;
          setStrutturaId(r.id);
          setSelezionati(r.servizi.amenities);
          setOriginali(r.servizi.amenities);
          setAmbiente(r.servizi.tipoAmbiente);
          setAmbienteOrig(r.servizi.tipoAmbiente);
          setCategorie(r.servizi.categorie);
          setCategorieOrig(r.servizi.categorie);
        })
        .catch((e) => {
          console.error("[NaturaGo app] servizi host", e);
          if (attivo) setErrore(true);
        })
        .finally(() => attivo && setCaricando(false));
      return () => {
        attivo = false;
      };
    }, [utenteId, tentativo]),
  );

  const alterna = (chiave) => {
    setSalvato(false);
    setSelezionati((s) => (s.includes(chiave) ? s.filter((x) => x !== chiave) : [...s, chiave]));
  };
  const alternaIn = (imposta) => (chiave) => {
    setSalvato(false);
    imposta((s) => (s.includes(chiave) ? s.filter((x) => x !== chiave) : [...s, chiave]));
  };

  const salva = async () => {
    setSalvando(true);
    try {
      await salvaServiziHost(strutturaId, { amenities: selezionati, tipoAmbiente: ambiente, categorie });
      setOriginali(selezionati);
      setAmbienteOrig(ambiente);
      setCategorieOrig(categorie);
      setSalvato(true);
    } catch (e) {
      console.error("[NaturaGo app] salvaServiziHost", e);
      Alert.alert("Non salvato", messaggioErroreComprensibile(e, "Non è stato possibile salvare i servizi. Riprova."));
    } finally {
      setSalvando(false);
    }
  };

  const modificato = !uguali(selezionati, originali) || !uguali(ambiente, ambienteOrig) || !uguali(categorie, categorieOrig);

  return (
    <View style={styles.schermo}>
      <View style={styles.intestazione}>
        <Pressable accessibilityRole="button" accessibilityLabel="Indietro" hitSlop={8} style={styles.indietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={c.testo} />
        </Pressable>
        <Text style={styles.titolo}>Servizi</Text>
        <View style={styles.indietro} />
      </View>
      {caricando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={c.primario} />
        </View>
      ) : errore || !strutturaId ? (
        <StatoErrore onRiprova={() => { setCaricando(true); setTentativo((n) => n + 1); }} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.lista}>
            <Text style={styles.nota}>Spunta ciò che la tua struttura offre davvero. I clienti cercano e filtrano per questi servizi.</Text>
            {[
              { titolo: "Ambiente", icona: "earth-outline", voci: AMBIENTI, valori: ambiente, imposta: setAmbiente },
              { titolo: "Cosa possono fare i tuoi ospiti", icona: "compass-outline", voci: CATEGORIE, valori: categorie, imposta: setCategorie },
            ].map((g) => (
              <View key={g.titolo} style={styles.card}>
                <View style={styles.rigaCat}>
                  <Ionicons name={g.icona} size={16} color={c.primario} />
                  <Text style={styles.catTitolo}>{g.titolo}</Text>
                </View>
                {g.voci.map((v) => {
                  const on = g.valori.includes(v.chiave);
                  return (
                    <Pressable
                      key={v.chiave}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={v.etichetta}
                      style={styles.voce}
                      onPress={() => alternaIn(g.imposta)(v.chiave)}
                    >
                      <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? c.primario : c.testoSecondario} />
                      <Text style={styles.voceTesto}>{v.etichetta}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {CATEGORIE_FILTRI_SERVIZI.map((cat) => (
              <View key={cat.titolo} style={styles.card}>
                <View style={styles.rigaCat}>
                  <Ionicons name={cat.icona} size={16} color={c.primario} />
                  <Text style={styles.catTitolo}>{cat.titolo}</Text>
                </View>
                {cat.voci.map((v) => {
                  const on = selezionati.includes(v.chiave);
                  return (
                    <Pressable
                      key={v.chiave}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={v.etichetta}
                      style={styles.voce}
                      onPress={() => alterna(v.chiave)}
                    >
                      <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? c.primario : c.testoSecondario} />
                      <Text style={styles.voceTesto}>{v.etichetta}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <View style={styles.piede}>
            {salvato && <Text style={styles.conferma}>Salvato: le modifiche sono già sulla tua scheda.</Text>}
            <Pressable
              accessibilityRole="button"
              style={[styles.bottonePieno, (!modificato || salvando) && { opacity: 0.45 }]}
              onPress={salva}
              disabled={!modificato || salvando}
            >
              {salvando ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.bottonePienoTesto}>Salva</Text>}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.separatore, backgroundColor: c.sfondoGruppo },
    indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
    titolo: { fontSize: 14.5, fontWeight: "800", color: c.testo },
    centro: { flex: 1, alignItems: "center", justifyContent: "center" },
    lista: { padding: 16, gap: 12, paddingBottom: 24 },
    nota: { fontSize: 12.5, color: c.testoSecondario, lineHeight: 18 },
    card: { backgroundColor: c.sfondoGruppo, borderRadius: raggio.l, padding: 14, gap: 2, ...ombra(c) },
    rigaCat: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    catTitolo: { fontSize: 13.5, fontWeight: "800", color: c.testo },
    voce: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
    voceTesto: { fontSize: 13.5, color: c.testo, flex: 1 },
    piede: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: c.separatore, backgroundColor: c.sfondoGruppo },
    conferma: { fontSize: 12, color: c.primario, textAlign: "center" },
    bottonePieno: { minHeight: 48, borderRadius: 12, backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
    bottonePienoTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 13.5 },
  });
}
