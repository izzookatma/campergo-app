import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { caricaMiaStruttura, caricaUnita, salvaMisureUnita, sostituisciFotoUnita, salvaOrdineUnita, creaUnita, TIPI_ALLOGGIO } from "../lib/host";

const URL_PANNELLO_SITO = "https://www.naturago.it/host";

const testoMisura = (n) => (n == null ? "" : String(n).replace(".", ","));

// Strumento da campo: l'host passa tra le piazzole e gli alloggi col telefono,
// misura, fotografa e riordina. Ogni modifica va subito sul database del sito.
export default function PiazzoleScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const { session } = useAuth();
  const utenteId = session?.user?.id;
  const [struttura, setStruttura] = useState(null);
  const [unita, setUnita] = useState([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const s = await caricaMiaStruttura(utenteId);
        const elenco = s ? await caricaUnita(s.id) : [];
        if (!attivo) return;
        setStruttura(s);
        setUnita(elenco);
      } catch (e) {
        console.error("[NaturaGo app] PiazzoleScreen", e);
        if (attivo) setErrore(messaggioErroreComprensibile(e, "Non è stato possibile aprire le piazzole."));
      } finally {
        if (attivo) setCaricando(false);
      }
    })();
    return () => {
      attivo = false;
    };
  }, [utenteId]);

  const sposta = async (indice, verso) => {
    const destinazione = indice + verso;
    if (destinazione < 0 || destinazione >= unita.length) return;
    const precedente = unita;
    const nuovo = [...unita];
    [nuovo[indice], nuovo[destinazione]] = [nuovo[destinazione], nuovo[indice]];
    setUnita(nuovo);
    setErrore(null);
    try {
      await salvaOrdineUnita(nuovo);
    } catch (e) {
      console.error("[NaturaGo app] salvaOrdineUnita", e);
      setUnita(precedente);
      setErrore(messaggioErroreComprensibile(e, "Non è stato possibile salvare il nuovo ordine."));
    }
  };

  const aggiorna = (id, campi) => setUnita((u) => u.map((x) => (x.id === id ? { ...x, ...campi } : x)));

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.intestazione}>
        <Pressable style={styles.indietro} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={c.testo} />
        </Pressable>
        <Text style={styles.titolo}>Piazzole e alloggi</Text>
        <View style={styles.indietro} />
      </View>
      {caricando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={c.primario} />
        </View>
      ) : !struttura ? (
        <View style={styles.centro}>
          <Text style={styles.nota}>{errore ?? "Nessuna struttura collegata a questo account."}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contenuto} keyboardShouldPersistTaps="handled">
          <Text style={styles.nota}>
            Misura, fotografa e riordina. Le modifiche sono subito sul sito. Prezzi, servizi ed eliminazioni restano sul pannello del sito.
          </Text>
          {errore && <Text style={styles.errore}>{errore}</Text>}
          <NuovaUnita struttura={struttura} posizione={unita.length} onCreata={(u) => setUnita((x) => [...x, u])} />
          {unita.length === 0 && <Text style={styles.nota}>Non hai ancora piazzole o alloggi: aggiungi la prima qui sopra.</Text>}
          {unita.map((u, i) => (
            <CardUnita
              key={u.id}
              unita={u}
              struttura={struttura}
              primo={i === 0}
              ultimo={i === unita.length - 1}
              onSu={() => sposta(i, -1)}
              onGiu={() => sposta(i, 1)}
              onAggiorna={(campi) => aggiorna(u.id, campi)}
            />
          ))}
          <Text style={styles.linkSito}>Pannello completo: {URL_PANNELLO_SITO}</Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function NuovaUnita({ struttura, posizione, onCreata }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const [aperto, setAperto] = useState(false);
  const [tipo, setTipo] = useState("piazzola");
  const [tipoAlloggio, setTipoAlloggio] = useState(null);
  const [numero, setNumero] = useState("");
  const [lunghezza, setLunghezza] = useState("");
  const [larghezza, setLarghezza] = useState("");
  const [mq, setMq] = useState("");
  const [asset, setAsset] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState(null);

  const scegliFoto = async (camera) => {
    try {
      const permesso = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permesso.granted) {
        Alert.alert("Permesso negato", "Consenti l'accesso dalle impostazioni del telefono.");
        return;
      }
      const opzioni = { mediaTypes: ["images"], quality: 0.9 };
      const r = camera ? await ImagePicker.launchCameraAsync(opzioni) : await ImagePicker.launchImageLibraryAsync(opzioni);
      if (!r.canceled) setAsset(r.assets[0]);
    } catch (e) {
      console.error("[NaturaGo app] foto nuova unita", e);
      setErrore(messaggioErroreComprensibile(e, "Non è stato possibile aprire la fotocamera o le foto."));
    }
  };

  const salva = async () => {
    setErrore(null);
    if (!numero.trim()) return setErrore("Scrivi il numero o il nome (es. 12).");
    if (tipo === "alloggio" && !tipoAlloggio) return setErrore("Scegli che tipo di alloggio è.");
    setSalvando(true);
    try {
      const u = await creaUnita(struttura, { tipo, numero, tipoAlloggio, lunghezza, larghezza, mq, asset, posizione });
      onCreata(u);
      setNumero("");
      setLunghezza("");
      setLarghezza("");
      setMq("");
      setAsset(null);
      setAperto(false);
    } catch (e) {
      console.error("[NaturaGo app] creaUnita", e);
      const misura = String(e?.message).includes("misura non valida");
      setErrore(misura ? "Inserisci numeri maggiori di zero, es. 8,5." : messaggioErroreComprensibile(e, "Non è stato possibile aggiungerla."));
    } finally {
      setSalvando(false);
    }
  };

  if (!aperto) {
    return (
      <Pressable style={styles.bottone} onPress={() => setAperto(true)}>
        <Text style={styles.bottoneTesto}>+ Aggiungi piazzola o alloggio</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitolo}>Nuova unità</Text>
      <View style={styles.rigaCampi}>
        {["piazzola", "alloggio"].map((t) => (
          <Pressable key={t} style={[styles.scelta, tipo === t && styles.sceltaOn]} onPress={() => setTipo(t)}>
            <Text style={[styles.sceltaTesto, tipo === t && styles.sceltaTestoOn]}>{t === "piazzola" ? "Piazzola" : "Alloggio"}</Text>
          </Pressable>
        ))}
      </View>
      {tipo === "alloggio" && (
        <View style={styles.rigaCampi}>
          {TIPI_ALLOGGIO.map((t) => (
            <Pressable key={t.valore} style={[styles.scelta, tipoAlloggio === t.valore && styles.sceltaOn]} onPress={() => setTipoAlloggio(t.valore)}>
              <Text style={[styles.sceltaTesto, tipoAlloggio === t.valore && styles.sceltaTestoOn]}>{t.etichetta}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={styles.etichetta}>Numero o nome</Text>
      <TextInput style={styles.campo} value={numero} onChangeText={setNumero} placeholder="es. 12" />
      <View style={styles.rigaCampi}>
        <View style={styles.flex1}>
          <Text style={styles.etichetta}>Lunghezza (m)</Text>
          <TextInput style={styles.campo} value={lunghezza} onChangeText={setLunghezza} keyboardType="decimal-pad" />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.etichetta}>Larghezza (m)</Text>
          <TextInput style={styles.campo} value={larghezza} onChangeText={setLarghezza} keyboardType="decimal-pad" />
        </View>
        {tipo === "alloggio" && (
          <View style={styles.flex1}>
            <Text style={styles.etichetta}>Mq</Text>
            <TextInput style={styles.campo} value={mq} onChangeText={setMq} keyboardType="decimal-pad" />
          </View>
        )}
      </View>
      {asset && <Image source={{ uri: asset.uri }} style={styles.foto} contentFit="cover" />}
      <View style={styles.rigaCampi}>
        <Pressable style={[styles.scelta, styles.flex1]} onPress={() => scegliFoto(true)}>
          <Text style={styles.sceltaTesto}>Scatta ora</Text>
        </Pressable>
        <Pressable style={[styles.scelta, styles.flex1]} onPress={() => scegliFoto(false)}>
          <Text style={styles.sceltaTesto}>Dal telefono</Text>
        </Pressable>
      </View>
      {errore && <Text style={styles.errore}>{errore}</Text>}
      <Pressable style={[styles.bottone, salvando && styles.disattivato]} onPress={salva} disabled={salvando}>
        {salvando ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.bottoneTesto}>Aggiungi</Text>}
      </Pressable>
      <Pressable onPress={() => setAperto(false)} disabled={salvando}>
        <Text style={styles.linkSito}>Annulla</Text>
      </Pressable>
    </View>
  );
}

function CardUnita({ unita, struttura, primo, ultimo, onSu, onGiu, onAggiorna }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const alloggio = unita.tipo === "alloggio";
  const [lunghezza, setLunghezza] = useState(testoMisura(unita.lunghezza));
  const [larghezza, setLarghezza] = useState(testoMisura(unita.larghezza));
  const [mq, setMq] = useState(testoMisura(unita.mq));
  const [foto, setFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [messaggio, setMessaggio] = useState(null);
  const [errore, setErrore] = useState(null);

  const prendiFoto = async (origine) => {
    const camera = origine === "fotocamera";
    const permesso = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permesso.granted) {
      Alert.alert(camera ? "Fotocamera non disponibile" : "Foto non disponibili", "Consenti l'accesso dalle impostazioni del telefono.");
      return null;
    }
    const opzioni = { mediaTypes: ["images"], quality: 0.9 };
    const r = camera ? await ImagePicker.launchCameraAsync(opzioni) : await ImagePicker.launchImageLibraryAsync(opzioni);
    return r.canceled ? null : r.assets[0];
  };

  const caricaFoto = async (origine) => {
    setErrore(null);
    setMessaggio(null);
    try {
      const asset = await prendiFoto(origine);
      if (!asset) return;
      setFoto(true);
      const url = await sostituisciFotoUnita(struttura, unita, asset);
      onAggiorna({ foto_url: url });
    } catch (e) {
      console.error("[NaturaGo app] foto unita", e);
      setErrore(messaggioErroreComprensibile(e, "Non è stato possibile caricare la foto."));
    } finally {
      setFoto(false);
    }
  };

  const sceltaFoto = () =>
    Alert.alert("Foto", "Da dove vuoi prendere la foto?", [
      { text: "Scatta ora", onPress: () => caricaFoto("fotocamera") },
      { text: "Scegli dal telefono", onPress: () => caricaFoto("rullino") },
      { text: "Annulla", style: "cancel" },
    ]);

  const salva = async () => {
    setErrore(null);
    setMessaggio(null);
    setSalvando(true);
    try {
      const agg = await salvaMisureUnita(unita, { lunghezza, larghezza, mq });
      onAggiorna(agg);
      setMessaggio("Misure salvate.");
    } catch (e) {
      console.error("[NaturaGo app] misure unita", e);
      const valore = String(e?.message).includes("misura non valida");
      setErrore(valore ? "Inserisci numeri maggiori di zero, es. 8,5." : messaggioErroreComprensibile(e, "Non è stato possibile salvare le misure."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.rigaTitolo}>
        <Text style={styles.cardTitolo}>
          {alloggio ? "Alloggio" : "Piazzola"} {unita.numero}
          {alloggio && unita.tipo_alloggio ? ` · ${unita.tipo_alloggio}` : ""}
        </Text>
        <View style={styles.frecce}>
          <Pressable onPress={onSu} disabled={primo} style={[styles.freccia, primo && styles.disattivato]} hitSlop={6}>
            <Ionicons name="arrow-up" size={18} color={c.primario} />
          </Pressable>
          <Pressable onPress={onGiu} disabled={ultimo} style={[styles.freccia, ultimo && styles.disattivato]} hitSlop={6}>
            <Ionicons name="arrow-down" size={18} color={c.primario} />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={sceltaFoto} disabled={foto} style={styles.fotoBox}>
        {unita.foto_url ? (
          <Image source={{ uri: unita.foto_url }} style={styles.foto} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.foto, styles.fotoMancante]}>
            <Ionicons name="camera-outline" size={28} color={c.testoSecondario} />
            <Text style={styles.nota}>Aggiungi foto</Text>
          </View>
        )}
        {foto && (
          <View style={styles.velo}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
        {!!unita.foto_url && !foto && (
          <View style={styles.cambia}>
            <Ionicons name="camera" size={14} color="#fff" />
            <Text style={styles.cambiaTesto}>Cambia</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.rigaCampi}>
        <View style={styles.flex1}>
          <Text style={styles.etichetta}>Lunghezza (m)</Text>
          <TextInput style={styles.campo} value={lunghezza} onChangeText={setLunghezza} keyboardType="decimal-pad" placeholder="es. 8,5" />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.etichetta}>Larghezza (m)</Text>
          <TextInput style={styles.campo} value={larghezza} onChangeText={setLarghezza} keyboardType="decimal-pad" placeholder="es. 5" />
        </View>
        {alloggio && (
          <View style={styles.flex1}>
            <Text style={styles.etichetta}>Mq</Text>
            <TextInput style={styles.campo} value={mq} onChangeText={setMq} keyboardType="decimal-pad" placeholder="es. 30" />
          </View>
        )}
      </View>
      {errore && <Text style={styles.errore}>{errore}</Text>}
      {messaggio && <Text style={styles.conferma}>{messaggio}</Text>}
      <Pressable style={[styles.bottone, salvando && styles.disattivato]} onPress={salva} disabled={salvando}>
        {salvando ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.bottoneTesto}>Salva misure</Text>}
      </Pressable>
    </View>
  );
}

// Stili derivati dal tema: funzione semplice (nessuno stato interno),
// richiamata da ogni componente di questo file che ne ha bisogno.
function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.separatore, backgroundColor: c.sfondoGruppo },
    indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
    titolo: { fontSize: 14.5, fontWeight: "800", color: c.testo },
    centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
    contenuto: { padding: 16, gap: 14, paddingBottom: 40 },
    nota: { fontSize: 12, color: c.testoSecondario, lineHeight: 17 },
    card: { backgroundColor: c.sfondoGruppo, borderRadius: raggio.l, padding: 14, gap: 10, ...ombra(c) },
    rigaTitolo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    cardTitolo: { fontSize: 14, fontWeight: "800", color: c.testo, flex: 1 },
    frecce: { flexDirection: "row", gap: 8 },
    freccia: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: c.primario, alignItems: "center", justifyContent: "center" },
    fotoBox: { borderRadius: raggio.m, overflow: "hidden" },
    foto: { width: "100%", aspectRatio: 16 / 10, backgroundColor: "#eef2f6" },
    fotoMancante: { alignItems: "center", justifyContent: "center", gap: 4 },
    velo: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,58,84,.6)", alignItems: "center", justifyContent: "center" },
    cambia: { position: "absolute", right: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(17,24,39,.72)", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
    cambiaTesto: { color: "#fff", fontSize: 11, fontWeight: "700" },
    rigaCampi: { flexDirection: "row", gap: 8 },
    flex1: { flex: 1 },
    etichetta: { fontSize: 10.5, fontWeight: "700", color: c.testoSecondario, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 },
    campo: { borderWidth: 1, borderColor: c.separatore, borderRadius: raggio.s, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.testo },
    bottone: { height: 44, borderRadius: raggio.m, backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
    bottoneTesto: { color: c.sulPrimario, fontWeight: "700", fontSize: 13 },
    disattivato: { opacity: 0.4 },
    scelta: { paddingHorizontal: 12, height: 40, borderRadius: raggio.s, borderWidth: 1.5, borderColor: c.primario, alignItems: "center", justifyContent: "center" },
    sceltaOn: { backgroundColor: c.primario },
    sceltaTesto: { color: c.primario, fontWeight: "700", fontSize: 12.5 },
    sceltaTestoOn: { color: c.sulPrimario },
    errore: { fontSize: 12, color: c.pericolo, lineHeight: 17 },
    conferma: { fontSize: 12, color: "#15803d", fontWeight: "600" },
    linkSito: { fontSize: 11.5, color: c.testoSecondario, textAlign: "center", paddingTop: 6 },
  });
}
