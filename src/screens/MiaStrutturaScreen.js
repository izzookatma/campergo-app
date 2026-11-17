import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colori, ombraCard, raggioCard } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import {
  MASSIMO_FOTO_GALLERIA,
  caricaMiaStruttura,
  sostituisciFotoPrincipale,
  aggiungiFotoGalleria,
  togliFotoGalleria,
  salvaDatiStruttura,
} from "../lib/host";

const URL_PANNELLO_SITO = "https://www.naturago.it/host";

// "La mia struttura": la parte del pannello host che ha senso fare col
// telefono in mano, stando sul posto - foto scattate al momento e dati
// base della vetrina. Calendario, offerte, piazzole e tutto il resto
// restano sul sito (pulsante in fondo). Le foto si caricano subito,
// una alla volta, senza un "Salva": in campeggio la rete va e viene, e
// così ogni scatto riuscito è già al sicuro.
export default function MiaStrutturaScreen({ navigation }) {
  const { session } = useAuth();
  const utenteId = session?.user?.id;

  const [struttura, setStruttura] = useState(null);
  const [caricando, setCaricando] = useState(true);
  const [erroreCaricamento, setErroreCaricamento] = useState(null);

  // "principale" | "galleria" | null: quale caricamento foto è in corso.
  const [fotoInCorso, setFotoInCorso] = useState(null);
  const [erroreFoto, setErroreFoto] = useState(null);

  const [descrizione, setDescrizione] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sitoWeb, setSitoWeb] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [erroreDati, setErroreDati] = useState(null);

  useEffect(() => {
    let attivo = true;
    caricaMiaStruttura(utenteId)
      .then((s) => {
        if (!attivo) return;
        setStruttura(s);
        if (s) {
          setDescrizione(s.descrizione ?? "");
          setTelefono(s.telefono ?? "");
          setSitoWeb(s.sito_web ?? "");
          setPrezzo(s.prezzo != null ? String(s.prezzo) : "");
        }
      })
      .catch((e) => {
        if (attivo) setErroreCaricamento(messaggioErroreComprensibile(e, "Non è stato possibile aprire la tua struttura."));
      })
      .finally(() => {
        if (attivo) setCaricando(false);
      });
    return () => {
      attivo = false;
    };
  }, [utenteId]);

  // Chiede da dove prendere la foto e restituisce quella scelta (o null).
  const prendiFoto = async (origine) => {
    if (origine === "fotocamera") {
      const permesso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permesso.granted) {
        Alert.alert("Fotocamera non disponibile", "Consenti a NaturaGo di usare la fotocamera dalle impostazioni del telefono.");
        return null;
      }
      const risultato = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
      return risultato.canceled ? null : risultato.assets[0];
    }
    const permesso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permesso.granted) {
      Alert.alert("Foto non disponibili", "Consenti a NaturaGo di accedere alle foto dalle impostazioni del telefono.");
      return null;
    }
    const risultato = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    return risultato.canceled ? null : risultato.assets[0];
  };

  const caricaFoto = async (destinazione, origine) => {
    setErroreFoto(null);
    let asset;
    try {
      asset = await prendiFoto(origine);
    } catch (e) {
      setErroreFoto(messaggioErroreComprensibile(e, "Non è stato possibile aprire la fotocamera o le foto."));
      return;
    }
    if (!asset) return;
    setFotoInCorso(destinazione);
    try {
      if (destinazione === "principale") {
        const url = await sostituisciFotoPrincipale(struttura, asset);
        setStruttura((s) => ({ ...s, foto_url: url, foto_generica: false }));
      } else {
        const nuove = await aggiungiFotoGalleria(struttura, asset);
        setStruttura((s) => ({ ...s, chi_siamo_foto: nuove }));
      }
    } catch (e) {
      setErroreFoto(messaggioErroreComprensibile(e, "Non è stato possibile caricare la foto."));
    } finally {
      setFotoInCorso(null);
    }
  };

  const scegliOrigine = (destinazione) => {
    Alert.alert(destinazione === "principale" ? "Foto principale" : "Aggiungi alla galleria", "Da dove vuoi prendere la foto?", [
      { text: "Scatta ora", onPress: () => caricaFoto(destinazione, "fotocamera") },
      { text: "Scegli dal telefono", onPress: () => caricaFoto(destinazione, "rullino") },
      { text: "Annulla", style: "cancel" },
    ]);
  };

  const chiediRimozione = (url) => {
    Alert.alert("Togliere questa foto?", "La foto non comparirà più nella galleria della tua scheda.", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Togli",
        style: "destructive",
        onPress: async () => {
          setErroreFoto(null);
          setFotoInCorso("galleria");
          try {
            const nuove = await togliFotoGalleria(struttura, url);
            setStruttura((s) => ({ ...s, chi_siamo_foto: nuove }));
          } catch (e) {
            setErroreFoto(messaggioErroreComprensibile(e, "Non è stato possibile togliere la foto."));
          } finally {
            setFotoInCorso(null);
          }
        },
      },
    ]);
  };

  const salvaDati = async () => {
    setErroreDati(null);
    setSalvato(false);
    const prezzoPulito = prezzo.trim();
    if (prezzoPulito && !/^\d+$/.test(prezzoPulito)) {
      setErroreDati("Il prezzo deve essere un numero intero, senza virgole (es. 25).");
      return;
    }
    setSalvando(true);
    try {
      const aggiornamento = await salvaDatiStruttura(struttura, { descrizione, telefono, sitoWeb, prezzo: prezzoPulito });
      setStruttura((s) => ({ ...s, ...aggiornamento }));
      setSalvato(true);
    } catch (e) {
      setErroreDati(messaggioErroreComprensibile(e, "Non è stato possibile salvare."));
    } finally {
      setSalvando(false);
    }
  };

  const galleria = struttura?.chi_siamo_foto ?? [];
  const galleriaPiena = galleria.length >= MASSIMO_FOTO_GALLERIA;

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView edges={["top"]} style={styles.intestazione}>
        <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colori.testo} />
        </Pressable>
        <Text style={styles.titoloIntestazione}>La mia struttura</Text>
        <View style={{ width: 34 }} />
      </SafeAreaView>

      {caricando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={colori.blu} />
        </View>
      ) : erroreCaricamento ? (
        <View style={styles.centro}>
          <Text style={styles.errore}>{erroreCaricamento}</Text>
        </View>
      ) : !struttura ? (
        <View style={styles.centro}>
          <Ionicons name="business-outline" size={34} color={colori.testoSecondario} />
          <Text style={styles.vuotoTitolo}>Nessuna struttura collegata</Text>
          <Text style={styles.vuotoTesto}>
            Questo account non gestisce ancora una struttura. Se ne hai una, registrala gratis dal sito.
          </Text>
          <Pressable style={styles.bottonePieno} onPress={() => Linking.openURL(`${URL_PANNELLO_SITO}?modo=registrati`)}>
            <Text style={styles.bottonePienoTesto}>Registra la tua struttura</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.nomeStruttura}>{struttura.nome}</Text>
            {!!struttura.localita && <Text style={styles.localita}>{struttura.localita}</Text>}
          </View>

          {/* Foto principale */}
          <View style={styles.card}>
            <Text style={styles.cardTitolo}>Foto principale</Text>
            <Text style={styles.cardNota}>È la prima che vedono i viaggiatori, in elenco e in cima alla scheda.</Text>
            <View style={styles.fotoPrincipaleBox}>
              {struttura.foto_url ? (
                <Image source={{ uri: struttura.foto_url }} style={styles.fotoPrincipale} />
              ) : (
                <View style={[styles.fotoPrincipale, styles.fotoMancante]}>
                  <Ionicons name="image-outline" size={30} color={colori.testoSecondario} />
                </View>
              )}
              {struttura.foto_generica && struttura.foto_url && (
                <View style={styles.bollinoGenerica}>
                  <Text style={styles.bollinoGenericaTesto}>Foto illustrativa: sostituiscila con una tua</Text>
                </View>
              )}
              {fotoInCorso === "principale" && (
                <View style={styles.veloCaricamento}>
                  <ActivityIndicator color={colori.bianco} />
                  <Text style={styles.veloTesto}>Carico la foto…</Text>
                </View>
              )}
            </View>
            <Pressable
              style={[styles.bottonePieno, fotoInCorso && styles.disattivato]}
              onPress={() => scegliOrigine("principale")}
              disabled={!!fotoInCorso}
            >
              <Ionicons name="camera" size={16} color={colori.bianco} />
              <Text style={styles.bottonePienoTesto}>{struttura.foto_url ? "Cambia foto principale" : "Aggiungi foto principale"}</Text>
            </Pressable>
          </View>

          {/* Galleria */}
          <View style={styles.card}>
            <View style={styles.rigaTitolo}>
              <Text style={styles.cardTitolo}>Galleria «Chi siamo»</Text>
              <Text style={styles.contatore}>
                {galleria.length}/{MASSIMO_FOTO_GALLERIA}
              </Text>
            </View>
            <Text style={styles.cardNota}>Le altre foto della struttura: piazzole, servizi, panorama, ingresso.</Text>
            {galleria.length > 0 && (
              <View style={styles.griglia}>
                {galleria.map((url) => (
                  <View key={url} style={styles.miniaturaBox}>
                    <Image source={{ uri: url }} style={styles.miniatura} />
                    <Pressable
                      style={styles.togli}
                      onPress={() => chiediRimozione(url)}
                      disabled={!!fotoInCorso}
                      accessibilityLabel="Togli questa foto"
                      hitSlop={6}
                    >
                      <Ionicons name="close" size={13} color={colori.bianco} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {fotoInCorso === "galleria" && (
              <View style={styles.rigaCaricamento}>
                <ActivityIndicator color={colori.blu} />
                <Text style={styles.rigaCaricamentoTesto}>Aggiorno la galleria…</Text>
              </View>
            )}
            {galleriaPiena ? (
              <Text style={styles.cardNota}>Hai raggiunto il massimo: togli una foto per aggiungerne un&apos;altra.</Text>
            ) : (
              <View style={styles.rigaBottoni}>
                <Pressable
                  style={[styles.bottonePieno, styles.flex1, fotoInCorso && styles.disattivato]}
                  onPress={() => caricaFoto("galleria", "fotocamera")}
                  disabled={!!fotoInCorso}
                >
                  <Ionicons name="camera" size={16} color={colori.bianco} />
                  <Text style={styles.bottonePienoTesto}>Scatta ora</Text>
                </Pressable>
                <Pressable
                  style={[styles.bottoneBordo, styles.flex1, fotoInCorso && styles.disattivato]}
                  onPress={() => caricaFoto("galleria", "rullino")}
                  disabled={!!fotoInCorso}
                >
                  <Ionicons name="images-outline" size={16} color={colori.blu} />
                  <Text style={styles.bottoneBordoTesto}>Dal telefono</Text>
                </Pressable>
              </View>
            )}
          </View>

          {erroreFoto && <Text style={styles.errore}>{erroreFoto}</Text>}

          {/* Dati base */}
          <View style={styles.card}>
            <Text style={styles.cardTitolo}>Dati della vetrina</Text>

            <Text style={styles.etichetta}>Descrizione</Text>
            <TextInput
              style={[styles.campo, styles.campoLungo]}
              value={descrizione}
              onChangeText={(t) => {
                setDescrizione(t);
                setSalvato(false);
              }}
              placeholder="Racconta la tua struttura a chi viaggia"
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.etichetta}>Telefono</Text>
            <TextInput
              style={styles.campo}
              value={telefono}
              onChangeText={(t) => {
                setTelefono(t);
                setSalvato(false);
              }}
              placeholder="Es. 0461 123456"
              keyboardType="phone-pad"
            />

            <Text style={styles.etichetta}>Sito web</Text>
            <TextInput
              style={styles.campo}
              value={sitoWeb}
              onChangeText={(t) => {
                setSitoWeb(t);
                setSalvato(false);
              }}
              placeholder="https://..."
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.etichetta}>Prezzo a notte, da (€)</Text>
            <TextInput
              style={styles.campo}
              value={prezzo}
              onChangeText={(t) => {
                setPrezzo(t);
                setSalvato(false);
              }}
              placeholder="Es. 25"
              keyboardType="number-pad"
            />

            {erroreDati && <Text style={styles.errore}>{erroreDati}</Text>}
            {salvato && <Text style={styles.conferma}>Salvato. Le modifiche sono già sulla tua scheda.</Text>}

            <Pressable style={[styles.bottonePieno, salvando && styles.disattivato]} onPress={salvaDati} disabled={salvando}>
              {salvando ? <ActivityIndicator color={colori.bianco} /> : <Text style={styles.bottonePienoTesto}>Salva i dati</Text>}
            </Pressable>
          </View>

          <Pressable style={styles.linkSito} onPress={() => Linking.openURL(URL_PANNELLO_SITO)}>
            <Ionicons name="open-outline" size={15} color={colori.blu} />
            <Text style={styles.linkSitoTesto}>
              Nome, indirizzo, piazzole, calendario e offerte: apri il pannello completo sul sito
            </Text>
          </Pressable>
        </ScrollView>
      )}
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colori.bordo,
    backgroundColor: colori.bianco,
  },
  tornaIndietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  titoloIntestazione: { fontSize: 14.5, fontWeight: "800", color: colori.testo },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 10 },
  vuotoTitolo: { fontSize: 14.5, fontWeight: "800", color: colori.testo },
  vuotoTesto: { fontSize: 12.5, color: colori.testoSecondario, textAlign: "center", lineHeight: 18, marginBottom: 6 },
  contenuto: { padding: 16, gap: 14, paddingBottom: 40 },
  nomeStruttura: { fontSize: 17, fontWeight: "800", color: colori.testo },
  localita: { fontSize: 12.5, color: colori.testoSecondario, marginTop: 2 },
  card: { backgroundColor: colori.bianco, borderRadius: raggioCard, padding: 14, gap: 10, ...ombraCard },
  rigaTitolo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitolo: { fontSize: 13.5, fontWeight: "800", color: colori.testo },
  cardNota: { fontSize: 11.5, color: colori.testoSecondario, lineHeight: 16 },
  contatore: { fontSize: 11.5, fontWeight: "700", color: colori.testoSecondario },
  fotoPrincipaleBox: { borderRadius: 12, overflow: "hidden" },
  fotoPrincipale: { width: "100%", aspectRatio: 16 / 10, backgroundColor: "#eef2f6" },
  fotoMancante: { alignItems: "center", justifyContent: "center" },
  bollinoGenerica: {
    position: "absolute",
    left: 8,
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(17,24,39,.72)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  bollinoGenericaTesto: { color: colori.bianco, fontSize: 11, fontWeight: "600" },
  veloCaricamento: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,58,84,.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  veloTesto: { color: colori.bianco, fontSize: 12, fontWeight: "700" },
  griglia: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  miniaturaBox: { width: "31%", aspectRatio: 1, borderRadius: 10, overflow: "hidden", backgroundColor: "#eef2f6" },
  miniatura: { width: "100%", height: "100%" },
  togli: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  rigaCaricamento: { flexDirection: "row", alignItems: "center", gap: 8 },
  rigaCaricamentoTesto: { fontSize: 12, color: colori.testoSecondario },
  rigaBottoni: { flexDirection: "row", gap: 8 },
  flex1: { flex: 1 },
  bottonePieno: {
    height: 46,
    borderRadius: 12,
    backgroundColor: colori.blu,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 16,
  },
  bottonePienoTesto: { color: colori.bianco, fontWeight: "700", fontSize: 13 },
  bottoneBordo: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colori.blu,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 16,
  },
  bottoneBordoTesto: { color: colori.blu, fontWeight: "700", fontSize: 13 },
  disattivato: { opacity: 0.55 },
  etichetta: {
    fontSize: 11,
    fontWeight: "700",
    color: colori.testoSecondario,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 4,
  },
  campo: {
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colori.testo,
  },
  campoLungo: { minHeight: 120 },
  errore: { fontSize: 12, color: colori.rosso, lineHeight: 17 },
  conferma: { fontSize: 12, color: "#15803d", fontWeight: "600" },
  linkSito: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 4 },
  linkSitoTesto: { flex: 1, fontSize: 12, color: colori.blu, fontWeight: "600", lineHeight: 17 },
});
