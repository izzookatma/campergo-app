import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";
import { useT } from "../../i18n/i18n";
import { cercaStrutture } from "../../lib/strutture";
import { caricaSchedeCulturali } from "../../lib/cultura";
import { suggerimentiLuogo } from "../../lib/geocodifica";

// Cerca un posto da aggiungere alla vacanza: strutture NaturaGo, musei/
// borghi/attività e qualsiasi luogo (Nominatim). Chi sceglie riceve un
// oggetto semplice { tipo, id, nome, localita, lat, lng }.
export default function CercaLuogoModal({ visibile, titolo, onScegli, onChiudi }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();
  const [testo, setTesto] = useState("");
  const [strutture, setStrutture] = useState([]);
  const [cultura, setCultura] = useState([]);
  const [luoghi, setLuoghi] = useState([]);
  const [cercando, setCercando] = useState(false);

  useEffect(() => {
    const termine = testo.trim();
    if (termine.length < 3) return undefined;
    let attivo = true;
    const id = setTimeout(async () => {
      setCercando(true);
      const [s, k, l] = await Promise.all([
        cercaStrutture({ termine, limite: 8 }).catch(() => []),
        caricaSchedeCulturali({ termine }).catch(() => []),
        suggerimentiLuogo(termine).catch(() => []),
      ]);
      if (!attivo) return;
      setStrutture(s.filter((x) => x.lat != null && x.lng != null).slice(0, 6));
      setCultura(k.filter((x) => x.lat != null && x.lng != null).slice(0, 6));
      setLuoghi(l);
      setCercando(false);
    }, 350);
    return () => {
      attivo = false;
      clearTimeout(id);
    };
  }, [testo]);

  const chiudi = () => {
    setTesto("");
    setStrutture([]);
    setCultura([]);
    setLuoghi([]);
    onChiudi();
  };
  const scegli = (luogo) => {
    onScegli(luogo);
    setTesto("");
    setStrutture([]);
    setCultura([]);
    setLuoghi([]);
  };
  const pochiCaratteri = testo.trim().length < 3;
  const nessunRisultato = !pochiCaratteri && !cercando && strutture.length + cultura.length + luoghi.length === 0;

  return (
    <Modal visible={visibile} animationType="slide" presentationStyle="pageSheet" onRequestClose={chiudi}>
      <SafeAreaView style={styles.schermo} edges={["top", "bottom"]}>
        <View style={styles.intestazione}>
          <Text style={styles.titolo}>{titolo}</Text>
          <Pressable onPress={chiudi} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi">
            <Ionicons name="close" size={22} color={c.testo} />
          </Pressable>
        </View>
        <View style={styles.campo}>
          <Ionicons name="search" size={16} color={c.testoSecondario} />
          <TextInput
            style={styles.input}
            value={testo}
            onChangeText={setTesto}
            placeholder={t("vacanza.cerca")}
            placeholderTextColor={c.testoSecondario}
            autoFocus
            autoCorrect={false}
          />
          {cercando && <ActivityIndicator size="small" color={c.primario} />}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.lista}>
          <Sezione titolo={t("vacanza.sezioneStrutture")} icona="bed-outline" c={c} styles={styles}>
            {strutture.map((s) => (
              <Riga
                key={`s-${s.id}`}
                styles={styles}
                nome={s.nome}
                sotto={[s.tipo, s.localita].filter(Boolean).join(" · ")}
                onPress={() => scegli({ tipo: "struttura", id: s.id, nome: s.nome, localita: s.localita || "", lat: Number(s.lat), lng: Number(s.lng) })}
              />
            ))}
          </Sezione>
          <Sezione titolo={t("vacanza.sezioneCultura")} icona="library-outline" c={c} styles={styles}>
            {cultura.map((k) => (
              <Riga
                key={`k-${k.id}`}
                styles={styles}
                nome={k.titolo}
                sotto={[k.citta, k.regione].filter(Boolean).join(", ")}
                onPress={() => scegli({ tipo: "cultura", id: k.id, nome: k.titolo, localita: k.citta || "", lat: Number(k.lat), lng: Number(k.lng) })}
              />
            ))}
          </Sezione>
          <Sezione titolo={t("vacanza.sezioneLuoghi")} icona="location-outline" c={c} styles={styles}>
            {luoghi.map((l, i) => (
              <Riga
                key={`l-${i}`}
                styles={styles}
                nome={l.nome}
                sotto=""
                onPress={() => scegli({ tipo: "libero", id: null, nome: l.nome, localita: "", lat: l.lat, lng: l.lng })}
              />
            ))}
          </Sezione>
          {pochiCaratteri && <Text style={styles.vuoto}>{t("vacanza.scrivi3")}</Text>}
          {nessunRisultato && <Text style={styles.vuoto}>{t("vacanza.nessunRisultato")}</Text>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Sezione({ titolo, icona, children, c, styles }) {
  const figli = Array.isArray(children) ? children : [children];
  if (figli.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.sezioneTitolo}>
        <Ionicons name={icona} size={14} color={c.testoSecondario} />
        <Text style={styles.sezioneTitoloTesto}>{titolo}</Text>
      </View>
      {children}
    </View>
  );
}

function Riga({ nome, sotto, onPress, styles }) {
  return (
    <Pressable style={styles.riga} onPress={onPress} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <Text style={styles.rigaNome} numberOfLines={2}>
          {nome}
        </Text>
        {sotto ? (
          <Text style={styles.rigaSotto} numberOfLines={1}>
            {sotto}
          </Text>
        ) : null}
      </View>
      <Ionicons name="add-circle" size={22} color="#00587C" />
    </Pressable>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: c.sfondoGruppo,
      borderBottomWidth: 1,
      borderBottomColor: c.separatore,
    },
    titolo: { flex: 1, fontSize: 16, fontWeight: "800", color: c.testo, marginRight: 10 },
    campo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.sfondoCampo,
      borderWidth: 1,
      borderColor: c.separatore,
    },
    input: { flex: 1, fontSize: 16, color: c.testo },
    lista: { paddingHorizontal: 16, paddingBottom: 30, gap: 14 },
    sezioneTitolo: { flexDirection: "row", alignItems: "center", gap: 6 },
    sezioneTitoloTesto: { fontSize: 12, fontWeight: "700", color: c.testoSecondario, textTransform: "uppercase" },
    riga: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.sfondoGruppo,
      borderRadius: 12,
      padding: 12,
    },
    rigaNome: { fontSize: 15, fontWeight: "700", color: c.testo },
    rigaSotto: { fontSize: 13, color: c.testoSecondario, marginTop: 2 },
    vuoto: { textAlign: "center", color: c.testoSecondario, marginTop: 20, fontSize: 14 },
  });
}
