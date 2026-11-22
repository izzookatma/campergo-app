import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { caricaPercorsi4x4, DIFFICOLTA_META, TIPO_VEICOLO_META } from "../lib/itinerari";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import ScheletroCard from "../components/ScheletroCard";
import Chip from "../components/ui/Chip";
import { useT } from "../i18n/i18n";
import StatoErrore from "../components/ui/StatoErrore";

const FILTRI = [
  { chiave: null, etichetta: "Tutti" },
  { chiave: "facile", etichetta: "Facile" },
  { chiave: "medio", etichetta: "Medio" },
  { chiave: "difficile", etichetta: "Difficile" },
  { chiave: "estremo", etichetta: "Estremo" },
];

const FILTRI_VEICOLO = [
  { chiave: null, etichetta: "Tutti i veicoli" },
  { chiave: "4x4", etichetta: "4x4" },
  { chiave: "moto", etichetta: "Moto" },
];

export default function Percorsi4x4Screen({ navigation, route }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { session } = useAuth();
  const [percorsi, setPercorsi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(false);
  const [tentativo, setTentativo] = useState(0);
  // Arrivando dalla ricerca IA con una difficoltà/regione già riconosciute:
  // partono già impostate, modificabili come sempre una volta qui.
  const [difficolta, setDifficolta] = useState(() => route.params?.difficoltaIniziale ?? null);
  const [tipoVeicolo, setTipoVeicolo] = useState(() => route.params?.tipoVeicoloIniziale ?? null);
  const [termine, setTermine] = useState(() => route.params?.regioneIniziale || "");

  const creaPercorso = () => {
    if (!session) {
      Alert.alert(t("accedi.titoloAccedi"), t("percorsi4x4.accediPerCreare"));
      return;
    }
    navigation.navigate("NuovoItinerario", { categoria: "percorso_4x4" });
  };

  useFocusEffect(
    useCallback(() => {
      setCaricamento(true);
      void tentativo; // «Riprova» cambia questo valore e rilancia il caricamento
      setErrore(false);
      caricaPercorsi4x4({ difficolta, tipoVeicolo })
        .then(setPercorsi)
        .catch((e) => {
          console.error("Errore nel caricare i percorsi 4x4:", e);
          setErrore(true);
        })
        .finally(() => setCaricamento(false));
    }, [difficolta, tipoVeicolo, tentativo])
  );

  // Filtro lato app sui percorsi già caricati (al massimo poche centinaia
  // di righe): basta il titolo o la regione, niente nuova query.
  const percorsiFiltrati = useMemo(() => {
    const pulito = termine.trim().toLowerCase();
    if (!pulito) return percorsi;
    return percorsi.filter((it) => `${it.titolo} ${it.regione || ""}`.toLowerCase().includes(pulito));
  }, [percorsi, termine]);

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo onPress={() => navigation.navigate("EsploraHub")} />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>{t("percorsi4x4.titolo")}</Text>
          <Pressable style={styles.creaBottone} onPress={creaPercorso}>
            <Ionicons name="add" size={14} color={c.primario} />
            <Text style={styles.creaBottoneTesto}>{t("comune.crea")}</Text>
          </Pressable>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTRI}
          keyExtractor={(f) => f.etichetta}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: f }) => (
            <Chip etichetta={f.etichetta} attivo={difficolta === f.chiave} compatto onPress={() => setDifficolta(f.chiave)} />
          )}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTRI_VEICOLO}
          keyExtractor={(f) => f.etichetta}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: f }) => (
            <Chip etichetta={f.etichetta} attivo={tipoVeicolo === f.chiave} compatto onPress={() => setTipoVeicolo(f.chiave)} />
          )}
        />
        <View style={styles.ricerca}>
          <Ionicons name="search-outline" size={14} color={c.testoSecondario} />
          <TextInput
            style={styles.ricercaInput}
            placeholder={t("comune.placeholderTitoloORegione")}
            placeholderTextColor={c.testoSecondario}
            value={termine}
            onChangeText={setTermine}
          />
        </View>
      </View>

      {caricamento ? (
        <ScheletroCard righe={4} />
      ) : errore ? (
        <StatoErrore
          onRiprova={() => {
            setCaricamento(true);
            setTentativo((n) => n + 1);
          }}
        />
      ) : percorsiFiltrati.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name="car-sport-outline" size={28} color={c.testoSecondario} />
          <Text style={styles.vuotoTesto}>{t("percorsi4x4.nessunoTrovato")}</Text>
        </View>
      ) : (
        <FlatList
          data={percorsiFiltrati}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListHeaderComponent={<Text style={styles.contatore}>{t("percorsi4x4.percorsiConteggio", { n: percorsiFiltrati.length })}</Text>}
          renderItem={({ item }) => {
            const metaDifficolta = DIFFICOLTA_META[item.difficolta];
            const metaVeicolo = TIPO_VEICOLO_META[item.tipoVeicolo];
            return (
              <Pressable style={styles.card} onPress={() => navigation.navigate("ItinerarioDettaglio", { itinerarioId: item.id })}>
                <View style={styles.cardFoto}>
                  <ImmagineConRiserva
                    uri={item.fotoUrl}
                    larghezza={160}
                    style={styles.cardImmagine}
                    icona="car-sport-outline"
                    iconaColore={c.primario}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitolo} numberOfLines={1}>
                    {item.titolo}
                  </Text>
                  <Text style={styles.cardRegione}>{item.regione}</Text>
                  <View style={styles.cardBadge}>
                    {metaDifficolta && (
                      <View style={[styles.badgePill, { backgroundColor: metaDifficolta.colore + "22" }]}>
                        <Text style={[styles.badgePillTesto, { color: metaDifficolta.colore }]}>{metaDifficolta.etichetta}</Text>
                      </View>
                    )}
                    {metaVeicolo && (
                      <View style={styles.badgePillBlu}>
                        <Ionicons name={metaVeicolo.icona} size={11} color={c.primario} />
                        <Text style={styles.badgePillBluTesto}>{metaVeicolo.etichetta}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
  schermo: { flex: 1, backgroundColor: c.sfondo },
  intestazione: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  rigaTitolo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titolo: { fontSize: 19, fontWeight: "800", color: c.testo },
  creaBottone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: c.primarioChiaro,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  creaBottoneTesto: { fontSize: 11.5, fontWeight: "700", color: c.primario },
  ricerca: {
    height: 38,
    borderRadius: 12,
    backgroundColor: c.sfondoGruppo,
    borderWidth: 1,
    borderColor: c.separatore,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  ricercaInput: { flex: 1, fontSize: 12.5, color: c.testo, padding: 0 },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  vuotoTesto: { textAlign: "center", fontSize: 12.5, color: c.testoSecondario },
  contatore: { fontSize: 11, color: c.testoSecondario, marginBottom: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.sfondoGruppo,
    borderRadius: raggio.l,
    padding: 12,
    ...ombra(c),
  },
  cardFoto: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: c.primarioChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 3 },
  cardTitolo: { fontSize: 13, fontWeight: "700", color: c.testo },
  cardRegione: { fontSize: 11, color: c.testoSecondario },
  cardBadge: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badgePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgePillTesto: { fontSize: 9.5, fontWeight: "700" },
  badgePillBlu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: c.primarioChiaro,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePillBluTesto: { fontSize: 9.5, fontWeight: "700", color: c.primario },
  });
}
