import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { pubblicaAnnuncio, CATEGORIE_MERCATINO, STATO_PRODOTTO_META } from "../lib/mercatino";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";

const MASSIMO_FOTO = 6;

export default function NuovoAnnuncioScreen({ navigation }) {
  const { session } = useAuth();
  const [categoria, setCategoria] = useState("camper");
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [statoProdotto, setStatoProdotto] = useState("buone_condizioni");
  const [prezzo, setPrezzo] = useState("");
  const [metodoRitiro, setMetodoRitiro] = useState("");
  const [citta, setCitta] = useState("");
  const [foto, setFoto] = useState([]);
  const [pubblicando, setPubblicando] = useState(false);
  const [errore, setErrore] = useState(null);

  const scegliFoto = async () => {
    const permesso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permesso.granted) {
      Alert.alert("Foto non disponibili", "Consenti l'accesso alle foto per aggiungerle all'annuncio.");
      return;
    }
    const risultato = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MASSIMO_FOTO - foto.length,
      quality: 0.6,
    });
    if (risultato.canceled) return;
    const nuove = risultato.assets.map((a) => a.uri);
    setFoto((prev) => [...prev, ...nuove].slice(0, MASSIMO_FOTO));
  };

  const rimuoviFoto = (uri) => {
    setFoto((prev) => prev.filter((u) => u !== uri));
  };

  const pubblica = async () => {
    setErrore(null);
    if (foto.length === 0) {
      setErrore("Aggiungi almeno una foto.");
      return;
    }
    if (!titolo.trim() || !prezzo || !metodoRitiro.trim() || !citta.trim()) {
      setErrore("Compila titolo, prezzo, ritiro e città.");
      return;
    }
    const prezzoNumero = Number(prezzo.replace(",", "."));
    if (!prezzoNumero || prezzoNumero <= 0) {
      setErrore("Il prezzo deve essere maggiore di zero.");
      return;
    }

    setPubblicando(true);
    try {
      await pubblicaAnnuncio({
        utenteId: session.user.id,
        nomeVenditore: session.user.user_metadata?.nome || "Utente NaturaGo",
        categoria,
        titolo: titolo.trim(),
        descrizione: descrizione.trim(),
        stato_prodotto: statoProdotto,
        prezzo: prezzoNumero,
        metodo_ritiro: metodoRitiro.trim(),
        citta: citta.trim(),
        foto,
      });
      Alert.alert("Annuncio inviato", "Sarà visibile a tutti dopo l'approvazione di un amministratore.", [
        { text: "Ok", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error("Errore nella pubblicazione dell'annuncio:", e);
      setErrore(messaggioErroreComprensibile(e));
    } finally {
      setPubblicando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={styles.schermo} edges={["top"]}>
        <View style={styles.intestazione}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colori.testo} />
          </Pressable>
          <Text style={styles.titoloSchermo}>Nuovo annuncio</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={styles.contenuto}>
          <Text style={styles.etichetta}>Foto (max {MASSIMO_FOTO})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {foto.map((uri) => (
              <View key={uri} style={styles.fotoBox}>
                <Image source={{ uri }} style={styles.fotoImmagine} />
                <Pressable style={styles.fotoRimuovi} onPress={() => rimuoviFoto(uri)}>
                  <Ionicons name="close" size={12} color={colori.bianco} />
                </Pressable>
              </View>
            ))}
            {foto.length < MASSIMO_FOTO && (
              <Pressable style={styles.fotoAggiungi} onPress={scegliFoto}>
                <Ionicons name="camera-outline" size={22} color={colori.blu} />
              </Pressable>
            )}
          </ScrollView>

          <Text style={styles.etichetta}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {Object.entries(CATEGORIE_MERCATINO).map(([chiave, etichetta]) => (
              <Pressable
                key={chiave}
                style={[styles.chip, categoria === chiave && styles.chipAttivo]}
                onPress={() => setCategoria(chiave)}
              >
                <Text style={[styles.chipTesto, categoria === chiave && styles.chipTestoAttivo]}>{etichetta}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.etichetta}>Titolo</Text>
          <TextInput style={styles.campo} placeholder="Es. Camper Fiat Ducato 2018" placeholderTextColor={colori.testoSecondario} value={titolo} onChangeText={setTitolo} />

          <Text style={styles.etichetta}>Descrizione</Text>
          <TextInput
            style={[styles.campo, styles.campoMultilinea]}
            placeholder="Descrivi l'oggetto, le condizioni, eventuali dettagli utili…"
            placeholderTextColor={colori.testoSecondario}
            value={descrizione}
            onChangeText={setDescrizione}
            multiline
          />

          <Text style={styles.etichetta}>Condizioni</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {Object.entries(STATO_PRODOTTO_META).map(([chiave, etichetta]) => (
              <Pressable
                key={chiave}
                style={[styles.chip, statoProdotto === chiave && styles.chipAttivo]}
                onPress={() => setStatoProdotto(chiave)}
              >
                <Text style={[styles.chipTesto, statoProdotto === chiave && styles.chipTestoAttivo]}>{etichetta}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.etichetta}>Prezzo (€)</Text>
          <TextInput style={styles.campo} placeholder="0" placeholderTextColor={colori.testoSecondario} value={prezzo} onChangeText={setPrezzo} keyboardType="decimal-pad" />

          <Text style={styles.etichetta}>Città</Text>
          <TextInput style={styles.campo} placeholder="Es. Verona" placeholderTextColor={colori.testoSecondario} value={citta} onChangeText={setCitta} />

          <Text style={styles.etichetta}>Come si ritira</Text>
          <TextInput
            style={styles.campo}
            placeholder="Es. Consegna a mano, spedizione a carico dell'acquirente…"
            placeholderTextColor={colori.testoSecondario}
            value={metodoRitiro}
            onChangeText={setMetodoRitiro}
          />

          {errore ? <Text style={styles.errore}>{errore}</Text> : null}

          <Pressable style={styles.pulsantePubblica} onPress={pubblica} disabled={pubblicando}>
            {pubblicando ? <ActivityIndicator color={colori.bianco} /> : <Text style={styles.pulsantePubblicaTesto}>Pubblica annuncio</Text>}
          </Pressable>
          <Text style={styles.nota}>Il tuo annuncio sarà visibile a tutti dopo l&apos;approvazione di un amministratore.</Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.grigioSfondo },
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colori.bianco,
    borderBottomWidth: 1,
    borderBottomColor: colori.bordo,
  },
  titoloSchermo: { fontSize: 14, fontWeight: "800", color: colori.testo },
  contenuto: { padding: 20, gap: 6, paddingBottom: 40 },
  etichetta: { fontSize: 11.5, fontWeight: "700", color: colori.testo, marginTop: 10, marginBottom: 4 },
  campo: {
    height: 46,
    borderRadius: 12,
    backgroundColor: colori.bianco,
    borderWidth: 1,
    borderColor: colori.bordo,
    paddingHorizontal: 14,
    fontSize: 13,
    color: colori.testo,
  },
  campoMultilinea: { height: 90, paddingTop: 12, textAlignVertical: "top" },
  chip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: colori.bianco,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colori.bordo,
    marginRight: 8,
  },
  chipAttivo: { backgroundColor: colori.blu, borderColor: colori.blu },
  chipTesto: { fontSize: 11.5, fontWeight: "600", color: colori.testoSecondario },
  chipTestoAttivo: { color: colori.bianco },
  fotoBox: { width: 72, height: 72, borderRadius: 12, marginRight: 8, position: "relative" },
  fotoImmagine: { width: "100%", height: "100%", borderRadius: 12 },
  fotoRimuovi: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colori.rosso,
    alignItems: "center",
    justifyContent: "center",
  },
  fotoAggiungi: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colori.bordo,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colori.bianco,
  },
  errore: { color: colori.rosso, fontSize: 12, fontWeight: "600", marginTop: 10 },
  pulsantePubblica: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colori.blu,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  pulsantePubblicaTesto: { color: colori.bianco, fontWeight: "800", fontSize: 14 },
  nota: { fontSize: 10.5, color: colori.testoSecondario, textAlign: "center", marginTop: 8 },
});
