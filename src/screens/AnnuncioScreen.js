import { useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { CATEGORIE_MERCATINO, STATO_PRODOTTO_META, inviaMessaggio } from "../lib/mercatino";

function formattaData(iso) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export default function AnnuncioScreen({ route, navigation }) {
  const { annuncio } = route.params;
  const { session } = useAuth();
  const [testo, setTesto] = useState("");
  const [inviando, setInviando] = useState(false);
  const [inviato, setInviato] = useState(false);

  const propio = session?.user?.id === annuncio.venditore_id;

  const invia = async () => {
    if (!testo.trim()) return;
    setInviando(true);
    try {
      await inviaMessaggio({
        annuncioId: annuncio.id,
        mittenteId: session.user.id,
        destinatarioId: annuncio.venditore_id,
        nomeMittente: session.user.user_metadata?.nome || "Utente NaturaGo",
        testo: testo.trim(),
      });
      setInviato(true);
      setTesto("");
    } catch (e) {
      console.error("Errore nell'invio del messaggio:", e);
      Alert.alert("Non riesco a inviare il messaggio", "Riprova tra poco.");
    } finally {
      setInviando(false);
    }
  };

  return (
    <View style={styles.schermo}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <SafeAreaView edges={["top"]} style={styles.hero}>
          {annuncio.foto_urls?.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: "100%", height: "100%" }}>
              {annuncio.foto_urls.map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.heroImmagine} />
              ))}
            </ScrollView>
          ) : (
            <Ionicons name="image-outline" size={46} color="#60a5fa" />
          )}
          <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colori.testo} />
          </Pressable>
        </SafeAreaView>

        <View style={styles.contenuto}>
          <Text style={styles.badgeTipo}>{CATEGORIE_MERCATINO[annuncio.categoria]}</Text>
          <Text style={styles.titolo}>{annuncio.titolo}</Text>
          <Text style={styles.prezzo}>{annuncio.prezzo}€</Text>

          <View style={styles.rigaInfo}>
            <Ionicons name="location-outline" size={14} color={colori.testoSecondario} />
            <Text style={styles.infoTesto}>{annuncio.citta}</Text>
          </View>
          <View style={styles.rigaInfo}>
            <Ionicons name="pricetag-outline" size={14} color={colori.testoSecondario} />
            <Text style={styles.infoTesto}>{STATO_PRODOTTO_META[annuncio.stato_prodotto]}</Text>
          </View>
          <View style={styles.rigaInfo}>
            <Ionicons name="cube-outline" size={14} color={colori.testoSecondario} />
            <Text style={styles.infoTesto}>{annuncio.metodo_ritiro}</Text>
          </View>

          {annuncio.descrizione ? <Text style={styles.descrizione}>{annuncio.descrizione}</Text> : null}

          <Text style={styles.venditore}>Venduto da {annuncio.nome_venditore} · {formattaData(annuncio.creato_il)}</Text>

          <View style={styles.avviso}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colori.blu} />
            <Text style={styles.avvisoTesto}>
              Incontrati sempre in un luogo pubblico e verifica l'oggetto prima di pagare. NaturaGo non gestisce né
              garantisce le transazioni tra utenti.
            </Text>
          </View>

          {!propio && !session && (
            <Pressable
              style={styles.pulsanteInvia}
              onPress={() => Alert.alert("Accedi", "Accedi al tuo account per contattare il venditore.")}
            >
              <Text style={styles.pulsanteInviaTesto}>Contatta il venditore</Text>
            </Pressable>
          )}

          {!propio && session && (
            <View style={styles.contatta}>
              {inviato ? (
                <Text style={styles.inviatoTesto}>Messaggio inviato. Trovi la conversazione in "I miei messaggi".</Text>
              ) : (
                <>
                  <Text style={styles.contattaTitolo}>Contatta il venditore</Text>
                  <TextInput
                    style={styles.campoMessaggio}
                    placeholder="Scrivi un messaggio..."
                    placeholderTextColor={colori.testoSecondario}
                    value={testo}
                    onChangeText={setTesto}
                    multiline
                  />
                  <Pressable style={styles.pulsanteInvia} onPress={invia} disabled={inviando || !testo.trim()}>
                    {inviando ? (
                      <ActivityIndicator color={colori.bianco} size="small" />
                    ) : (
                      <Text style={styles.pulsanteInviaTesto}>Invia messaggio</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.bianco },
  hero: { height: 230, backgroundColor: colori.bluChiaro, alignItems: "center", justifyContent: "center" },
  heroImmagine: { width: 390, height: 230 },
  tornaIndietro: {
    position: "absolute",
    top: 52,
    left: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  contenuto: { padding: 20, gap: 8 },
  badgeTipo: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "700",
    color: colori.blu,
    backgroundColor: "#e7eefc",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  titolo: { fontSize: 19, fontWeight: "800", color: colori.testo },
  prezzo: { fontSize: 22, fontWeight: "800", color: colori.blu, marginBottom: 4 },
  rigaInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoTesto: { fontSize: 12.5, color: colori.testoSecondario },
  descrizione: { fontSize: 12.5, lineHeight: 19, color: "#4b5563", marginTop: 6 },
  venditore: { fontSize: 11, color: colori.testoSecondario, marginTop: 6 },
  avviso: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colori.bluChiaro,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  avvisoTesto: { flex: 1, fontSize: 10.5, lineHeight: 15, color: colori.testo },
  contatta: { marginTop: 16, gap: 8 },
  contattaTitolo: { fontSize: 13, fontWeight: "700", color: colori.testo },
  campoMessaggio: {
    minHeight: 60,
    borderRadius: 12,
    backgroundColor: colori.grigioSfondo,
    borderWidth: 1,
    borderColor: colori.bordo,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12.5,
    color: colori.testo,
    textAlignVertical: "top",
  },
  pulsanteInvia: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
  },
  pulsanteInviaTesto: { color: colori.bianco, fontWeight: "800", fontSize: 13 },
  inviatoTesto: { fontSize: 12, color: colori.blu, fontWeight: "600" },
});
