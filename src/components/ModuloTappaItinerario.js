import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { cercaCampeggiPerNome, MAX_FOTO_TAPPA_ITINERARIO } from "../lib/itinerari";

// Ricerca con un piccolo ritardo (non ad ogni lettera) per non fare una
// query per ogni tasto premuto, stessa idea già usata in CulturaScreen.js.
function useRicercaStrutture(termine) {
  const [risultati, setRisultati] = useState([]);
  const [ultimoTermineCaricato, setUltimoTermineCaricato] = useState(null);

  useEffect(() => {
    if (!termine?.trim()) {
      return;
    }
    const timer = setTimeout(() => {
      cercaCampeggiPerNome(termine)
        .then(setRisultati)
        .catch(() => setRisultati([]))
        .finally(() => setUltimoTermineCaricato(termine));
    }, 300);
    return () => clearTimeout(timer);
  }, [termine]);

  const cercando = !!termine?.trim() && ultimoTermineCaricato !== termine;
  return { risultati: termine?.trim() ? risultati : [], cercando };
}

export default function ModuloTappaItinerario({ tappa, indice, totale, onCambia, onRimuovi, onSposta }) {
  const [ricerca, setRicerca] = useState("");
  const { risultati, cercando } = useRicercaStrutture(ricerca);

  const sceglieStruttura = (c) => {
    onCambia({ ...tappa, campeggioId: c.id, nome: c.nome });
    setRicerca("");
  };

  const sceglieFoto = async () => {
    const permesso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permesso.granted) {
      Alert.alert("Foto non disponibili", "Consenti l'accesso alle foto per aggiungerle alla tappa.");
      return;
    }
    const risultato = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_FOTO_TAPPA_ITINERARIO - tappa.foto.length,
      quality: 0.6,
    });
    if (risultato.canceled) return;
    const nuove = risultato.assets.map((a) => a.uri);
    onCambia({ ...tappa, foto: [...tappa.foto, ...nuove].slice(0, MAX_FOTO_TAPPA_ITINERARIO) });
  };

  const rimuoviFoto = (uri) => onCambia({ ...tappa, foto: tappa.foto.filter((u) => u !== uri) });

  return (
    <View style={styles.contenitore}>
      <View style={styles.intestazione}>
        <Text style={styles.numero}>Tappa {indice + 1}</Text>
        <View style={styles.azioniIntestazione}>
          <Pressable style={styles.azioneBottone} disabled={indice === 0} onPress={() => onSposta(-1)}>
            <Ionicons name="chevron-up" size={15} color={indice === 0 ? colori.bordo : colori.testo} />
          </Pressable>
          <Pressable style={styles.azioneBottone} disabled={indice === totale - 1} onPress={() => onSposta(1)}>
            <Ionicons name="chevron-down" size={15} color={indice === totale - 1 ? colori.bordo : colori.testo} />
          </Pressable>
          {totale > 1 && (
            <Pressable style={styles.azioneBottone} onPress={onRimuovi}>
              <Ionicons name="close" size={15} color={colori.rosso} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.pills}>
        <Pressable
          style={[styles.pill, tappa.tipo === "struttura" && styles.pillAttiva]}
          onPress={() => onCambia({ ...tappa, tipo: "struttura", nome: "", campeggioId: null })}
        >
          <Text style={[styles.pillTesto, tappa.tipo === "struttura" && styles.pillTestoAttivo]}>Struttura esistente</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, tappa.tipo === "punto_interesse" && styles.pillAttiva]}
          onPress={() => onCambia({ ...tappa, tipo: "punto_interesse", campeggioId: null })}
        >
          <Text style={[styles.pillTesto, tappa.tipo === "punto_interesse" && styles.pillTestoAttivo]}>
            Punto di interesse libero
          </Text>
        </Pressable>
      </View>

      {tappa.tipo === "struttura" ? (
        <View>
          {tappa.campeggioId ? (
            <View style={styles.strutturaScelta}>
              <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
              <Text style={styles.strutturaSceltaTesto}>{tappa.nome}</Text>
              <Pressable onPress={() => onCambia({ ...tappa, campeggioId: null, nome: "" })}>
                <Text style={styles.cambiaLink}>Cambia</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.campo}
                value={ricerca}
                onChangeText={setRicerca}
                placeholder="Cerca per nome (es. Camping Belvedere)"
              />
              {cercando && <ActivityIndicator size="small" color={colori.blu} style={{ marginTop: 6 }} />}
              {risultati.length > 0 && (
                <View style={styles.risultati}>
                  {risultati.map((c) => (
                    <Pressable key={c.id} style={styles.risultatoRiga} onPress={() => sceglieStruttura(c)}>
                      <Text style={styles.risultatoNome}>{c.nome}</Text>
                      <Text style={styles.risultatoLocalita}>{c.localita}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <TextInput
            style={styles.campo}
            value={tappa.nome}
            onChangeText={(v) => onCambia({ ...tappa, nome: v })}
            placeholder="Nome del luogo (es. Cascata di Nardis)"
          />
          <TextInput
            style={styles.campo}
            value={tappa.luogo}
            onChangeText={(v) => onCambia({ ...tappa, luogo: v })}
            placeholder="Indirizzo o coordinate GPS (facoltativo)"
          />
        </View>
      )}

      <TextInput
        style={[styles.campo, styles.campoMultilinea, { marginTop: 8 }]}
        value={tappa.descrizione}
        onChangeText={(v) => onCambia({ ...tappa, descrizione: v })}
        placeholder={tappa.tipo === "punto_interesse" ? "Breve descrizione..." : "Una nota su questa tappa (facoltativa)"}
        multiline
      />

      <View style={styles.foto}>
        {tappa.foto.map((uri) => (
          <View key={uri} style={styles.fotoBox}>
            <Image source={{ uri }} style={styles.fotoImmagine} />
            <Pressable style={styles.fotoRimuovi} onPress={() => rimuoviFoto(uri)}>
              <Ionicons name="close" size={11} color={colori.bianco} />
            </Pressable>
          </View>
        ))}
        {tappa.foto.length < MAX_FOTO_TAPPA_ITINERARIO && (
          <Pressable style={styles.fotoAggiungi} onPress={sceglieFoto}>
            <Ionicons name="camera-outline" size={18} color={colori.blu} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: { backgroundColor: colori.grigioSfondo, borderRadius: 14, padding: 12, gap: 8 },
  intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  numero: { fontSize: 11, fontWeight: "800", color: colori.testoSecondario, textTransform: "uppercase", letterSpacing: 0.4 },
  azioniIntestazione: { flexDirection: "row", gap: 2 },
  azioneBottone: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  pills: { flexDirection: "row", gap: 7 },
  pill: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: colori.bianco,
  },
  pillAttiva: { backgroundColor: colori.blu, borderColor: colori.blu },
  pillTesto: { fontSize: 11, fontWeight: "600", color: colori.testo },
  pillTestoAttivo: { color: colori.bianco },
  campo: {
    borderWidth: 1,
    borderColor: colori.bordo,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 12.5,
    color: colori.testo,
    backgroundColor: colori.bianco,
  },
  campoMultilinea: { minHeight: 56, textAlignVertical: "top" },
  strutturaScelta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colori.bianco,
    borderRadius: 10,
    padding: 10,
  },
  strutturaSceltaTesto: { flex: 1, fontSize: 12.5, fontWeight: "700", color: colori.testo },
  cambiaLink: { fontSize: 11, fontWeight: "700", color: colori.blu },
  risultati: { backgroundColor: colori.bianco, borderRadius: 10, marginTop: 6, overflow: "hidden" },
  risultatoRiga: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  risultatoNome: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  risultatoLocalita: { fontSize: 10.5, color: colori.testoSecondario },
  foto: { flexDirection: "row", gap: 7, marginTop: 4, flexWrap: "wrap" },
  fotoBox: { width: 54, height: 54, borderRadius: 10, position: "relative" },
  fotoImmagine: { width: "100%", height: "100%", borderRadius: 10 },
  fotoRimuovi: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colori.rosso,
    alignItems: "center",
    justifyContent: "center",
  },
  fotoAggiungi: {
    width: 54,
    height: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colori.bordo,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colori.bianco,
  },
});
