import { useCallback, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { caricaAnnunciApprovati, caricaMieiAnnunci, CATEGORIE_MERCATINO } from "../lib/mercatino";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import ScheletroCard from "../components/ScheletroCard";
import Chip from "../components/ui/Chip";
import { useT } from "../i18n/i18n";

export default function MercatinoScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const FILTRI_CATEGORIA = [{ chiave: "", etichetta: t("mercatino.tutte") }, ...Object.entries(CATEGORIE_MERCATINO).map(([chiave, etichetta]) => ({ chiave, etichetta }))];
  const { session } = useAuth();
  const [vista, setVista] = useState("tutti");
  const [annunci, setAnnunci] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [categoria, setCategoria] = useState("");
  const [citta, setCitta] = useState("");

  const carica = useCallback(async () => {
    setCaricamento(true);
    try {
      const dati =
        vista === "miei" && session?.user?.id
          ? await caricaMieiAnnunci(session.user.id)
          : await caricaAnnunciApprovati({ categoria, citta: citta.trim() || undefined });
      setAnnunci(dati);
    } catch (e) {
      console.error("Errore nel caricare gli annunci:", e);
    } finally {
      setCaricamento(false);
    }
  }, [vista, categoria, citta, session]);

  useFocusEffect(
    useCallback(() => {
      Promise.resolve().then(() => carica());
    }, [carica])
  );

  const nuovoAnnuncio = () => {
    if (!session) {
      Alert.alert(t("accedi.titoloAccedi"), t("mercatino.accediPerPubblicare"));
      return;
    }
    navigation.navigate("NuovoAnnuncio");
  };

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>{t("tab.mercatino")}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              style={styles.pulsanteMessaggi}
              onPress={() =>
                session
                  ? navigation.navigate("Messaggi")
                  : Alert.alert(t("accedi.titoloAccedi"), t("mercatino.accediPerMessaggi"))
              }
            >
              <Ionicons name="chatbubble-outline" size={16} color={c.primario} />
            </Pressable>
            <Pressable style={styles.pulsanteNuovo} onPress={nuovoAnnuncio}>
              <Ionicons name="add" size={16} color={c.sulPrimario} />
              <Text style={styles.pulsanteNuovoTesto}>{t("mercatino.vendi")}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.vistaToggle}>
          <Pressable style={[styles.vistaChip, vista === "tutti" && styles.vistaChipAttivo]} onPress={() => setVista("tutti")}>
            <Text style={[styles.vistaChipTesto, vista === "tutti" && styles.vistaChipTestoAttivo]}>{t("mercatino.tuttiGliAnnunci")}</Text>
          </Pressable>
          <Pressable style={[styles.vistaChip, vista === "miei" && styles.vistaChipAttivo]} onPress={() => setVista("miei")}>
            <Text style={[styles.vistaChipTesto, vista === "miei" && styles.vistaChipTestoAttivo]}>{t("mercatino.iMieiAnnunci")}</Text>
          </Pressable>
        </View>

        {vista === "tutti" && (
          <>
            <View style={styles.ricercaPill}>
              <Ionicons name="search" size={15} color={c.testoSecondario} />
              <TextInput
                style={styles.inputRicerca}
                placeholder={t("mercatino.placeholderCitta")}
                placeholderTextColor={c.testoSecondario}
                value={citta}
                onChangeText={setCitta}
              />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={FILTRI_CATEGORIA}
              keyExtractor={(f) => f.chiave}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => (
                <Chip etichetta={item.etichetta} attivo={categoria === item.chiave} compatto onPress={() => setCategoria(item.chiave)} />
              )}
            />
          </>
        )}
      </View>

      {caricamento ? (
        <ScheletroCard righe={4} />
      ) : !session && vista === "miei" ? (
        <View style={styles.vuoto}>
          <Ionicons name="pricetag-outline" size={28} color={c.testoSecondario} />
          <Text style={styles.vuotoTesto}>{t("mercatino.accediPerGestire")}</Text>
        </View>
      ) : annunci.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name="pricetag-outline" size={28} color={c.testoSecondario} />
          <Text style={styles.vuotoTesto}>
            {vista === "miei" ? t("mercatino.nessunoPubblicato") : t("mercatino.nessunoTrovato")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={annunci}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate("Annuncio", { annuncio: item })}>
              <View style={styles.cardFoto}>
                <ImmagineConRiserva
                  uri={item.foto_urls?.[0]}
                  larghezza={160}
                  style={styles.cardImmagine}
                  iconaColore={c.primario}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardCategoria}>{CATEGORIE_MERCATINO[item.categoria]}</Text>
                <Text style={styles.cardTitolo} numberOfLines={1}>
                  {item.titolo}
                </Text>
                <Text style={styles.cardLocalita}>{item.citta}</Text>
                {vista === "miei" && item.stato !== "approvato" && (
                  <Text style={styles.cardStato}>
                    {item.stato === "in_attesa" ? t("mercatino.inAttesa") : t("mercatino.rifiutato")}
                  </Text>
                )}
                {item.venduto && <Text style={styles.cardVenduto}>{t("mercatino.venduto")}</Text>}
              </View>
              <Text style={styles.cardPrezzo}>{item.prezzo}€</Text>
            </Pressable>
          )}
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
  pulsanteMessaggi: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: c.primarioChiaro,
    alignItems: "center",
    justifyContent: "center",
  },
  pulsanteNuovo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.primario,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 32,
  },
  pulsanteNuovoTesto: { color: c.sulPrimario, fontWeight: "700", fontSize: 12 },
  vistaToggle: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 10, padding: 3 },
  vistaChip: { flex: 1, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  vistaChipAttivo: { backgroundColor: c.primario },
  vistaChipTesto: { fontSize: 12, fontWeight: "600", color: c.testoSecondario },
  vistaChipTestoAttivo: { color: c.sulPrimario, fontWeight: "700" },
  ricercaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.sfondoGruppo,
    borderRadius: 22,
    height: 40,
    paddingHorizontal: 14,
  },
  inputRicerca: { flex: 1, fontSize: 12.5, color: c.testo },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  vuotoTesto: { textAlign: "center", fontSize: 12.5, color: c.testoSecondario },
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
  cardInfo: { flex: 1, gap: 2 },
  cardCategoria: { fontSize: 10, fontWeight: "700", color: c.primario },
  cardTitolo: { fontSize: 13, fontWeight: "700", color: c.testo },
  cardLocalita: { fontSize: 11, color: c.testoSecondario },
  cardStato: { fontSize: 10, fontWeight: "700", color: c.accento, marginTop: 2 },
  cardVenduto: { fontSize: 10, fontWeight: "700", color: c.pericolo, marginTop: 2 },
  cardPrezzo: { fontSize: 14, fontWeight: "800", color: c.testo },
  });
}
