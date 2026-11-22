import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, TextInput, Alert, Switch, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../theme/tema";
import { useAuth } from "../context/AuthContext";
import { messaggioErroreComprensibile } from "../lib/erroriComprensibili";
import { caricaMiaStruttura, caricaOfferteHost, creaOffertaHost, impostaOffertaAttiva, eliminaOffertaHost } from "../lib/host";
import { descriviRegola, etichettaSconto, dataBreve } from "../lib/offertePromo";
import { etichettaData } from "../lib/periodo";
import SelettoreDate from "../components/SelettoreDate";
import StatoErrore from "../components/ui/StatoErrore";

const AMBITI = [
  { chiave: "tutte", etichetta: "Tutte le unità" },
  { chiave: "piazzole", etichetta: "Solo piazzole" },
  { chiave: "alloggi", etichetta: "Solo alloggi" },
];
const GIORNI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

function ChipGiorno({ valoreCorrente, onScegli, styles }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {[null, 1, 2, 3, 4, 5, 6, 0].map((g) => (
        <Pressable
          key={String(g)}
          accessibilityRole="button"
          accessibilityState={{ selected: valoreCorrente === g }}
          style={[styles.chip, valoreCorrente === g && styles.chipAttivo]}
          onPress={() => onScegli(g)}
        >
          <Text style={[styles.chipTesto, valoreCorrente === g && styles.chipTestoAttivo]}>{g === null ? "Qualsiasi" : GIORNI[g]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// Offerte promo dal telefono: elenco con sospendi/elimina e creazione
// guidata (sconto % o prezzo a notte, periodo, giorni e notti minime).
export default function OfferteStrutturaScreen({ navigation }) {
  const { c, spazio, raggio } = useTema();
  const styles = useEstili(c, spazio, raggio);
  const { session } = useAuth();
  const utenteId = session?.user?.id;
  const [strutturaId, setStrutturaId] = useState(null);
  const [offerte, setOfferte] = useState([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState(false);
  const [tentativo, setTentativo] = useState(0);
  const [nuova, setNuova] = useState(false);

  const [nome, setNome] = useState("");
  const [ambito, setAmbito] = useState("tutte");
  const [tipo, setTipo] = useState("percentuale");
  const [valore, setValore] = useState("");
  const [periodo, setPeriodo] = useState({ checkIn: null, checkOut: null });
  const [dateAperte, setDateAperte] = useState(false);
  const [arrivo, setArrivo] = useState(null);
  const [partenza, setPartenza] = useState(null);
  const [notti, setNotti] = useState("1");
  const [descrizione, setDescrizione] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroreForm, setErroreForm] = useState(null);

  useFocusEffect(
    useCallback(() => {
      void tentativo;
      let attivo = true;
      setErrore(false);
      caricaMiaStruttura(utenteId)
        .then(async (s) => {
          if (!s) return [];
          if (attivo) setStrutturaId(s.id);
          return caricaOfferteHost(s.id);
        })
        .then((o) => attivo && setOfferte(o))
        .catch((e) => {
          console.error("[NaturaGo app] offerte host", e);
          if (attivo) setErrore(true);
        })
        .finally(() => attivo && setCaricando(false));
      return () => {
        attivo = false;
      };
    }, [utenteId, tentativo]),
  );

  const ricarica = () => setTentativo((n) => n + 1);

  const alterna = async (o, valoreNuovo) => {
    setOfferte((lista) => lista.map((x) => (x.id === o.id ? { ...x, attiva: valoreNuovo } : x)));
    try {
      await impostaOffertaAttiva(o.id, valoreNuovo);
    } catch (e) {
      console.error("[NaturaGo app] impostaOffertaAttiva", e);
      setOfferte((lista) => lista.map((x) => (x.id === o.id ? { ...x, attiva: !valoreNuovo } : x)));
      Alert.alert("Non salvato", messaggioErroreComprensibile(e, "Non è stato possibile cambiare lo stato dell'offerta."));
    }
  };

  const elimina = (o) => {
    Alert.alert("Eliminare l'offerta?", `«${o.nome}» sparirà dalla scheda. Non si può annullare.`, [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: async () => {
          try {
            await eliminaOffertaHost(o.id);
            setOfferte((lista) => lista.filter((x) => x.id !== o.id));
          } catch (e) {
            console.error("[NaturaGo app] eliminaOffertaHost", e);
            Alert.alert("Non eliminata", messaggioErroreComprensibile(e, "Non è stato possibile eliminare l'offerta."));
          }
        },
      },
    ]);
  };

  const azzeraForm = () => {
    setNome("");
    setAmbito("tutte");
    setTipo("percentuale");
    setValore("");
    setPeriodo({ checkIn: null, checkOut: null });
    setArrivo(null);
    setPartenza(null);
    setNotti("1");
    setDescrizione("");
    setErroreForm(null);
  };

  const salva = async () => {
    setErroreForm(null);
    const numero = Number(String(valore).replace(",", "."));
    const nottiNum = parseInt(notti, 10);
    if (!nome.trim()) return setErroreForm("Dai un nome all'offerta (es. «Ponte di primavera»).");
    if (!Number.isFinite(numero) || numero <= 0) return setErroreForm(tipo === "percentuale" ? "Indica lo sconto in percentuale (da 1 a 99)." : "Indica il prezzo a notte.");
    if (tipo === "percentuale" && (numero < 1 || numero > 99 || !Number.isInteger(numero))) return setErroreForm("Lo sconto deve essere un numero intero da 1 a 99.");
    if (!periodo.checkIn || !periodo.checkOut) return setErroreForm("Scegli il periodo in cui l'offerta è valida.");
    if (!Number.isInteger(nottiNum) || nottiNum < 1 || nottiNum > 365) return setErroreForm("Le notti minime devono essere da 1 a 365.");
    if (!strutturaId) return setErroreForm("Non trovo la tua struttura. Riprova più tardi.");
    setSalvando(true);
    try {
      await creaOffertaHost(strutturaId, {
        nome: nome.trim().slice(0, 60),
        ambito,
        giornoArrivo: arrivo,
        giornoPartenza: partenza,
        nottiMinime: nottiNum,
        tipoPrezzo: tipo,
        prezzoNotte: numero,
        scontoPercentuale: numero,
        dataInizio: periodo.checkIn,
        dataFine: periodo.checkOut,
        descrizione: descrizione.trim().slice(0, 200),
      });
      azzeraForm();
      setNuova(false);
      ricarica();
    } catch (e) {
      console.error("[NaturaGo app] creaOffertaHost", e);
      setErroreForm(messaggioErroreComprensibile(e, "Non è stato possibile creare l'offerta. Riprova."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.schermo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.intestazione}>
        <Pressable accessibilityRole="button" accessibilityLabel="Indietro" hitSlop={8} style={styles.indietro} onPress={() => (nuova ? setNuova(false) : navigation.goBack())}>
          <Ionicons name="chevron-back" size={22} color={c.testo} />
        </Pressable>
        <Text style={styles.titolo}>{nuova ? "Nuova offerta" : "Offerte promo"}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Nuova offerta" style={styles.indietro} onPress={() => setNuova(true)} disabled={nuova}>
          <Ionicons name="add-circle-outline" size={24} color={nuova ? c.separatore : c.primario} />
        </Pressable>
      </View>

      {caricando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={c.primario} />
        </View>
      ) : errore ? (
        <StatoErrore onRiprova={() => { setCaricando(true); ricarica(); }} />
      ) : nuova ? (
        <ScrollView contentContainerStyle={styles.lista} keyboardShouldPersistTaps="handled">
          <Text style={styles.etichetta}>Nome</Text>
          <TextInput style={styles.campo} value={nome} onChangeText={setNome} maxLength={60} placeholder="Es. Ponte di primavera" placeholderTextColor={c.testoSecondario} />

          <Text style={styles.etichetta}>Vale per</Text>
          <View style={styles.riga}>
            {AMBITI.map((a) => (
              <Pressable key={a.chiave} accessibilityRole="button" accessibilityState={{ selected: ambito === a.chiave }} style={[styles.chip, ambito === a.chiave && styles.chipAttivo]} onPress={() => setAmbito(a.chiave)}>
                <Text style={[styles.chipTesto, ambito === a.chiave && styles.chipTestoAttivo]}>{a.etichetta}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.etichetta}>Tipo di sconto</Text>
          <View style={styles.riga}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: tipo === "percentuale" }} style={[styles.chip, tipo === "percentuale" && styles.chipAttivo]} onPress={() => setTipo("percentuale")}>
              <Text style={[styles.chipTesto, tipo === "percentuale" && styles.chipTestoAttivo]}>Percentuale</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: tipo === "prezzo_notte" }} style={[styles.chip, tipo === "prezzo_notte" && styles.chipAttivo]} onPress={() => setTipo("prezzo_notte")}>
              <Text style={[styles.chipTesto, tipo === "prezzo_notte" && styles.chipTestoAttivo]}>Prezzo a notte</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.campo}
            value={valore}
            onChangeText={setValore}
            keyboardType="decimal-pad"
            placeholder={tipo === "percentuale" ? "Sconto in % (es. 15)" : "Prezzo a notte in € (es. 40)"}
            placeholderTextColor={c.testoSecondario}
            accessibilityLabel={tipo === "percentuale" ? "Sconto in percentuale" : "Prezzo a notte"}
          />
          {tipo === "prezzo_notte" && <Text style={styles.nota}>Il prezzo promo vale solo se è più basso del prezzo normale dell&apos;unità.</Text>}

          <Text style={styles.etichetta}>Periodo di validità</Text>
          <Pressable accessibilityRole="button" style={styles.campoPulsante} onPress={() => setDateAperte(true)}>
            <Ionicons name="calendar-outline" size={16} color={c.primario} />
            <Text style={styles.campoPulsanteTesto}>
              {periodo.checkIn && periodo.checkOut ? `${etichettaData(periodo.checkIn)} → ${etichettaData(periodo.checkOut)}` : "Scegli le date"}
            </Text>
          </Pressable>

          <Text style={styles.etichetta}>Giorno di arrivo</Text>
          <ChipGiorno valoreCorrente={arrivo} onScegli={setArrivo} styles={styles} />
          <Text style={styles.etichetta}>Giorno di partenza</Text>
          <ChipGiorno valoreCorrente={partenza} onScegli={setPartenza} styles={styles} />

          <Text style={styles.etichetta}>Notti minime</Text>
          <TextInput style={styles.campo} value={notti} onChangeText={setNotti} keyboardType="number-pad" maxLength={3} accessibilityLabel="Notti minime" />

          <Text style={styles.etichetta}>Descrizione (facoltativa)</Text>
          <TextInput style={[styles.campo, { minHeight: 70, textAlignVertical: "top" }]} value={descrizione} onChangeText={setDescrizione} multiline maxLength={200} />

          {!!erroreForm && <Text style={styles.errore}>{erroreForm}</Text>}
          <Pressable accessibilityRole="button" style={[styles.bottonePieno, salvando && { opacity: 0.5 }]} onPress={salva} disabled={salvando}>
            {salvando ? <ActivityIndicator color={c.sulPrimario} /> : <Text style={styles.bottonePienoTesto}>Crea offerta</Text>}
          </Pressable>
        </ScrollView>
      ) : (
        <FlatList
          data={offerte}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<Text style={styles.notaCentro}>Nessuna offerta. Tocca + per crearne una: gli sconti compaiono sulla tua scheda.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rigaTitolo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitolo}>{item.nome}</Text>
                  <Text style={styles.cardTesto}>
                    {etichettaSconto(item)} · {dataBreve(item.data_inizio)} → {dataBreve(item.data_fine)}
                  </Text>
                  <Text style={styles.cardTesto}>{descriviRegola(item)}</Text>
                </View>
                <Switch value={!!item.attiva} onValueChange={(v) => alterna(item, v)} accessibilityLabel={`Offerta ${item.nome} attiva`} />
              </View>
              <Pressable accessibilityRole="button" style={styles.elimina} onPress={() => elimina(item)}>
                <Ionicons name="trash-outline" size={15} color={c.pericolo} />
                <Text style={styles.eliminaTesto}>Elimina</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <SelettoreDate
        key={`${periodo.checkIn}-${periodo.checkOut}-${dateAperte}`}
        visibile={dateAperte}
        checkIn={periodo.checkIn}
        checkOut={periodo.checkOut}
        onChiudi={() => setDateAperte(false)}
        onConferma={(d) => {
          setPeriodo(d);
          setDateAperte(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function useEstili(c, spazio, raggio) {
  return StyleSheet.create({
    schermo: { flex: 1, backgroundColor: c.sfondo },
    intestazione: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.separatore, backgroundColor: c.sfondoGruppo },
    indietro: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
    titolo: { fontSize: 14.5, fontWeight: "800", color: c.testo },
    centro: { flex: 1, alignItems: "center", justifyContent: "center" },
    lista: { padding: 16, gap: 10, paddingBottom: 40 },
    notaCentro: { fontSize: 12.5, color: c.testoSecondario, lineHeight: 18, textAlign: "center", marginTop: 30 },
    nota: { fontSize: 11.5, color: c.testoSecondario, lineHeight: 16 },
    etichetta: { fontSize: 11, fontWeight: "700", color: c.testoSecondario, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 8 },
    campo: { borderWidth: 1, borderColor: c.separatore, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: c.testo, backgroundColor: c.sfondoGruppo },
    campoPulsante: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, borderWidth: 1, borderColor: c.separatore, borderRadius: 10, paddingHorizontal: 12, backgroundColor: c.sfondoGruppo },
    campoPulsanteTesto: { fontSize: 13, color: c.testo },
    riga: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.separatore, backgroundColor: c.sfondoGruppo, justifyContent: "center" },
    chipAttivo: { backgroundColor: c.primario, borderColor: c.primario },
    chipTesto: { fontSize: 12.5, fontWeight: "600", color: c.testoSecondario },
    chipTestoAttivo: { color: c.sulPrimario },
    errore: { fontSize: 12, color: c.pericolo, marginTop: 6 },
    bottonePieno: { marginTop: 12, minHeight: 48, borderRadius: 12, backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
    bottonePienoTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 13.5 },
    card: { backgroundColor: c.sfondoGruppo, borderRadius: raggio.l, padding: 14, gap: 8, ...ombra(c) },
    rigaTitolo: { flexDirection: "row", alignItems: "center", gap: 10 },
    cardTitolo: { fontSize: 14, fontWeight: "800", color: c.testo },
    cardTesto: { fontSize: 12, color: c.testoSecondario, lineHeight: 17 },
    elimina: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 36 },
    eliminaTesto: { fontSize: 12.5, fontWeight: "700", color: c.pericolo },
  });
}
