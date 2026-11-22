import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { caricaStrutturePreferite, caricaSchedePreferite } from "../lib/preferiti";
import Chip from "../components/ui/Chip";
import { salvaInCache, leggiDaCache } from "../lib/cacheOffline";
import MarchioNaturaGo from "../components/MarchioNaturaGo";
import ImmagineConRiserva from "../components/ImmagineConRiserva";
import ScheletroCard from "../components/ScheletroCard";
import { useT } from "../i18n/i18n";
import StatoErrore from "../components/ui/StatoErrore";

export default function PreferitiScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const t = useT();
  const { session } = useAuth();
  const [preferiti, setPreferiti] = useState([]);
  const [schede, setSchede] = useState([]);
  const [tab, setTab] = useState("strutture");
  const [caricamento, setCaricamento] = useState(true);
  const [senzaConnessione, setSenzaConnessione] = useState(false);
  const [errore, setErrore] = useState(false);
  const [tentativo, setTentativo] = useState(0);

  useFocusEffect(
    useCallback(() => {
      Promise.resolve().then(() => {
        if (!session?.user?.id) {
          setPreferiti([]);
          setCaricamento(false);
          return;
        }
        // Cache per utente (non da condividere tra account diversi sullo
        // stesso telefono): resta consultabile anche senza connessione,
        // come già per la lista base di Esplora e la Mappa.
        const chiaveCache = `preferiti_${session.user.id}`;
        setCaricamento(true);
        void tentativo; // «Riprova» cambia questo valore e rilancia il caricamento
        setErrore(false);
        caricaSchedePreferite(session.user.id)
          .then(setSchede)
          .catch(() => {});
        caricaStrutturePreferite(session.user.id)
          .then((dati) => {
            setPreferiti(dati);
            setSenzaConnessione(false);
            salvaInCache(chiaveCache, dati);
          })
          .catch(async () => {
            const cache = await leggiDaCache(chiaveCache);
            if (cache) {
              setPreferiti(cache.dati);
              setSenzaConnessione(true);
            } else {
              setErrore(true);
            }
          })
          .finally(() => setCaricamento(false));
      });
    }, [session, tentativo])
  );

  return (
    <SafeAreaView style={styles.schermo} edges={["top"]}>
      <View style={styles.intestazione}>
        <MarchioNaturaGo style={{ marginBottom: 10 }} />
        <Text style={styles.titolo}>{t("tab.preferiti")}</Text>
        <Text style={styles.sottotitolo}>
          {tab === "cultura" ? t("preferiti.schedeSalvate", { n: schede.length }) : t("preferiti.struttureSalvate", { n: preferiti.length })}
        </Text>
        {!!session && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 10 }}>
            <Chip etichetta={t("preferiti.tabStrutture")} attivo={tab === "strutture"} onPress={() => setTab("strutture")} compatto />
            <Chip etichetta={t("preferiti.tabCultura")} attivo={tab === "cultura"} onPress={() => setTab("cultura")} compatto />
          </View>
        )}
      </View>

      {senzaConnessione && (
        <View style={styles.bannerOffline}>
          <Ionicons name="cloud-offline-outline" size={16} color={c.testoSecondario} />
          <Text style={styles.bannerOfflineTesto}>{t("preferiti.senzaConnessione")}</Text>
        </View>
      )}

      {caricamento ? (
        <ScheletroCard righe={4} />
      ) : errore ? (
        <StatoErrore
          onRiprova={() => {
            setCaricamento(true);
            setTentativo((n) => n + 1);
          }}
        />
      ) : !session ? (
        <View style={styles.vuoto}>
          <Ionicons name="heart-outline" size={28} color={c.testoSecondario} />
          <Text style={styles.vuotoTesto}>{t("preferiti.accediMessaggio")}</Text>
          <Pressable accessibilityRole="button" style={styles.pulsanteAccedi} onPress={() => navigation.navigate("Accedi")}>
            <Text style={styles.pulsanteAccediTesto}>{t("accedi.titoloAccedi")}</Text>
          </Pressable>
        </View>
      ) : tab === "cultura" ? (
        schede.length === 0 ? (
          <View style={styles.vuoto}>
            <Ionicons name="heart-outline" size={28} color={c.testoSecondario} />
            <Text style={styles.vuotoTesto}>{t("preferiti.nessunaScheda")}</Text>
          </View>
        ) : (
          <FlatList
            data={schede}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            contentContainerStyle={{ padding: 20, gap: 10 }}
            columnWrapperStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.titolo}
                style={styles.card}
                onPress={() => navigation.navigate("SchedaCulturale", { id: item.id })}
              >
                <View style={styles.cardFoto}>
                  <ImmagineConRiserva uri={item.fotoUrl} larghezza={160} style={styles.cardImmagine} iconaColore={c.primario} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNome}>{item.titolo}</Text>
                  <Text style={styles.cardLocalita}>{item.citta}</Text>
                </View>
              </Pressable>
            )}
          />
        )
      ) : preferiti.length === 0 ? (
        <View style={styles.vuoto}>
          <Ionicons name="heart-outline" size={28} color={c.testoSecondario} />
          <Text style={styles.vuotoTesto}>{t("preferiti.nessunaStruttura")}</Text>
        </View>
      ) : (
        <FlatList
          data={preferiti}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.nome}
              style={styles.card}
              onPress={() => navigation.navigate("Scheda", { struttura: item })}
            >
              <View style={styles.cardFoto}>
                <ImmagineConRiserva
                  uri={item.fotoUrl}
                  larghezza={160}
                  style={styles.cardImmagine}
                  iconaColore={c.primario}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardNome}>{item.nome}</Text>
                <Text style={styles.cardLocalita}>{item.localita}</Text>
              </View>
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
    intestazione: { paddingHorizontal: 20, paddingTop: 10 },
    titolo: { textAlign: "center", fontSize: 21, fontWeight: "800", color: c.testo },
    sottotitolo: { textAlign: "center", fontSize: 11, color: c.testoSecondario },
    vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
    vuotoTesto: { textAlign: "center", fontSize: 12.5, color: c.testoSecondario },
    pulsanteAccedi: {
      backgroundColor: c.primario,
      borderRadius: raggio.m,
      paddingHorizontal: 20,
      paddingVertical: 10,
      marginTop: 4,
    },
    pulsanteAccediTesto: { color: c.sulPrimario, fontWeight: "700", fontSize: 13 },
    bannerOffline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      marginTop: 10,
      padding: 10,
      borderRadius: raggio.s,
      backgroundColor: c.sfondoGruppo,
    },
    bannerOfflineTesto: { flex: 1, fontSize: 11.5, color: c.testoSecondario, fontWeight: "600" },
    card: {
      flex: 1,
      borderRadius: raggio.l,
      backgroundColor: c.sfondoGruppo,
      ...ombra(c),
    },
    cardFoto: {
      height: 84,
      borderTopLeftRadius: raggio.l,
      borderTopRightRadius: raggio.l,
      backgroundColor: c.primarioChiaro,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    cardImmagine: { width: "100%", height: "100%" },
    cardInfo: { padding: 8, gap: 2 },
    cardNome: { fontWeight: "700", fontSize: 11, color: c.testo },
    cardLocalita: { fontSize: 9, color: c.testoSecondario },
  });
}
