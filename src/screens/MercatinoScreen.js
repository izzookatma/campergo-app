import { useCallback, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { caricaAnnunciApprovati, caricaMieiAnnunci, CATEGORIE_MERCATINO } from "../lib/mercatino";
import MarchioNaturaGo from "../components/MarchioNaturaGo";

const FILTRI_CATEGORIA = [{ chiave: "", etichetta: "Tutte" }, ...Object.entries(CATEGORIE_MERCATINO).map(([chiave, etichetta]) => ({ chiave, etichetta }))];

export default function MercatinoScreen({ navigation }) {
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
      Alert.alert("Accedi", "Accedi al tuo account per pubblicare un annuncio.");
      return;
    }
    navigation.navigate("NuovoAnnuncio");
  };

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo />
        <View style={styles.rigaTitolo}>
          <Text style={styles.titolo}>Mercatino</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              style={styles.pulsanteMessaggi}
              onPress={() =>
                session
                  ? navigation.navigate("Messaggi")
                  : Alert.alert("Accedi", "Accedi al tuo account per vedere i tuoi messaggi.")
              }
            >
              <Ionicons name="chatbubble-outline" size={16} color={colori.blu} />
            </Pressable>
            <Pressable style={styles.pulsanteNuovo} onPress={nuovoAnnuncio}>
              <Ionicons name="add" size={16} color={colori.bianco} />
              <Text style={styles.pulsanteNuovoTesto}>Vendi</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.vistaToggle}>
          <Pressable style={[styles.vistaChip, vista === "tutti" && styles.vistaChipAttivo]} onPress={() => setVista("tutti")}>
            <Text style={[styles.vistaChipTesto, vista === "tutti" && styles.vistaChipTestoAttivo]}>Tutti gli annunci</Text>
          </Pressable>
          <Pressable style={[styles.vistaChip, vista === "miei" && styles.vistaChipAttivo]} onPress={() => setVista("miei")}>
            <Text style={[styles.vistaChipTesto, vista === "miei" && styles.vistaChipTestoAttivo]}>I miei annunci</Text>
          </Pressable>
        </View>

        {vista === "tutti" && (
          <>
            <View style={styles.ricercaPill}>
              <Ionicons name="search" size={15} color={colori.testoSecondario} />
              <TextInput
                style={styles.inputRicerca}
                placeholder="Filtra per città…"
                placeholderTextColor={colori.testoSecondario}
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
                <Pressable
                  style={[styles.chip, categoria === item.chiave && styles.chipAttivo]}
                  onPress={() => setCategoria(item.chiave)}
                >
                  <Text style={[styles.chipTesto, categoria === item.chiave && styles.chipTestoAttivo]}>{item.etichetta}</Text>
                </Pressable>
              )}
            />
          </>
        )}
      </View>

      {caricamento ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colori.blu} />
      ) : !session && vista === "miei" ? (
        <View style={styles.vuoto}>
          <Ionicons name="pricetag-outline" size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>Accedi al tuo account per pubblicare e gestire i tuoi annunci.</Text>
        </View>
      ) : annunci.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name="pricetag-outline" size={28} color={colori.testoSecondario} />
          <Text style={styles.vuotoTesto}>
            {vista === "miei" ? "Non hai ancora pubblicato nessun annuncio." : "Nessun annuncio trovato."}
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
                {item.foto_urls?.[0] ? (
                  <Image source={{ uri: item.foto_urls[0] }} style={styles.cardImmagine} />
                ) : (
                  <Ionicons name="image-outline" size={22} color={colori.blu} />
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardCategoria}>{CATEGORIE_MERCATINO[item.categoria]}</Text>
                <Text style={styles.cardTitolo} numberOfLines={1}>
                  {item.titolo}
                </Text>
                <Text style={styles.cardLocalita}>{item.citta}</Text>
                {vista === "miei" && item.stato !== "approvato" && (
                  <Text style={styles.cardStato}>
                    {item.stato === "in_attesa" ? "In attesa di approvazione" : "Rifiutato"}
                  </Text>
                )}
                {item.venduto && <Text style={styles.cardVenduto}>Venduto</Text>}
              </View>
              <Text style={styles.cardPrezzo}>{item.prezzo}€</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  rigaTitolo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titolo: { fontSize: 19, fontWeight: "800", color: colori.testo },
  pulsanteMessaggi: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
  },
  pulsanteNuovo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colori.blu,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 32,
  },
  pulsanteNuovoTesto: { color: colori.bianco, fontWeight: "700", fontSize: 12 },
  vistaToggle: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 10, padding: 3 },
  vistaChip: { flex: 1, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  vistaChipAttivo: { backgroundColor: colori.blu },
  vistaChipTesto: { fontSize: 12, fontWeight: "600", color: colori.testoSecondario },
  vistaChipTestoAttivo: { color: colori.bianco, fontWeight: "700" },
  ricercaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colori.bianco,
    borderRadius: 22,
    height: 40,
    paddingHorizontal: 14,
  },
  inputRicerca: { flex: 1, fontSize: 12.5, color: colori.testo },
  chip: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: colori.bianco,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  chipAttivo: { backgroundColor: colori.blu, borderColor: colori.blu },
  chipTesto: { fontSize: 11, fontWeight: "600", color: colori.testoSecondario },
  chipTestoAttivo: { color: colori.bianco },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  vuotoTesto: { textAlign: "center", fontSize: 12.5, color: colori.testoSecondario },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colori.bianco,
    borderRadius: 14,
    padding: 10,
  },
  cardFoto: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colori.bluChiaro,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImmagine: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: 2 },
  cardCategoria: { fontSize: 10, fontWeight: "700", color: colori.blu },
  cardTitolo: { fontSize: 13, fontWeight: "700", color: colori.testo },
  cardLocalita: { fontSize: 11, color: colori.testoSecondario },
  cardStato: { fontSize: 10, fontWeight: "700", color: colori.arancio, marginTop: 2 },
  cardVenduto: { fontSize: 10, fontWeight: "700", color: colori.rosso, marginTop: 2 },
  cardPrezzo: { fontSize: 14, fontWeight: "800", color: colori.testo },
});
