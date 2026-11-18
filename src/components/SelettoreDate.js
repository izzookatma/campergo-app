import { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import { isoDaData, dataDaIso, etichettaData, numeroNotti } from "../lib/periodo";

const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const GIORNI = ["L", "M", "M", "G", "V", "S", "D"];

// Calendario semplice (arrivo → partenza) fatto in JavaScript: nessun
// modulo nativo in più da compilare.
export default function SelettoreDate({ visibile, checkIn, checkOut, onConferma, onChiudi }) {
  const oggi = new Date();
  const oggiIso = isoDaData(new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()));
  const [mese, setMese] = useState(() => {
    const base = checkIn ? dataDaIso(checkIn) : oggi;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [da, setDa] = useState(checkIn || null);
  const [a, setA] = useState(checkOut || null);

  const tocca = (iso) => {
    if (!da || (da && a) || iso <= da) {
      setDa(iso);
      setA(null);
    } else {
      setA(iso);
    }
  };

  const primoGiorno = (mese.getDay() + 6) % 7; // lunedì = 0
  const giorniNelMese = new Date(mese.getFullYear(), mese.getMonth() + 1, 0).getDate();
  const celle = [...Array(primoGiorno).fill(null), ...Array.from({ length: giorniNelMese }, (_, i) => i + 1)];
  const puoiTornare = mese > new Date(oggi.getFullYear(), oggi.getMonth(), 1);
  const notti = numeroNotti(da, a);

  return (
    <Modal visible={visibile} transparent animationType="slide" onRequestClose={onChiudi}>
      <View style={stili.sfondo}>
        <View style={stili.foglio}>
          <View style={stili.testata}>
            <Text style={stili.titolo}>Quando vuoi soggiornare?</Text>
            <Pressable onPress={onChiudi} hitSlop={10} accessibilityLabel="Chiudi">
              <Ionicons name="close" size={22} color={colori.testo} />
            </Pressable>
          </View>

          <View style={stili.meseRiga}>
            <Pressable
              disabled={!puoiTornare}
              onPress={() => setMese(new Date(mese.getFullYear(), mese.getMonth() - 1, 1))}
              hitSlop={10}
              accessibilityLabel="Mese precedente"
            >
              <Ionicons name="chevron-back" size={22} color={puoiTornare ? colori.blu : "#cbd5e1"} />
            </Pressable>
            <Text style={stili.meseTitolo}>
              {MESI[mese.getMonth()]} {mese.getFullYear()}
            </Text>
            <Pressable
              onPress={() => setMese(new Date(mese.getFullYear(), mese.getMonth() + 1, 1))}
              hitSlop={10}
              accessibilityLabel="Mese successivo"
            >
              <Ionicons name="chevron-forward" size={22} color={colori.blu} />
            </Pressable>
          </View>

          <View style={stili.griglia}>
            {GIORNI.map((g, i) => (
              <Text key={`g${i}`} style={stili.giornoSettimana}>
                {g}
              </Text>
            ))}
            {celle.map((giorno, i) => {
              if (!giorno) return <View key={`v${i}`} style={stili.cella} />;
              const iso = isoDaData(new Date(mese.getFullYear(), mese.getMonth(), giorno));
              const passato = iso < oggiIso;
              const estremo = iso === da || iso === a;
              const dentro = da && a && iso > da && iso < a;
              return (
                <Pressable
                  key={iso}
                  disabled={passato}
                  onPress={() => tocca(iso)}
                  style={[stili.cella, dentro && stili.cellaDentro, estremo && stili.cellaEstremo]}
                >
                  <Text style={[stili.numero, passato && stili.numeroPassato, estremo && stili.numeroEstremo]}>{giorno}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={stili.riepilogo}>
            {da && a
              ? `${etichettaData(da)} → ${etichettaData(a)} · ${notti} nott${notti === 1 ? "e" : "i"}`
              : da
                ? "Ora scegli il giorno di partenza"
                : "Scegli il giorno di arrivo"}
          </Text>

          <View style={stili.azioni}>
            <Pressable
              style={stili.secondario}
              onPress={() => {
                setDa(null);
                setA(null);
                onConferma({ checkIn: null, checkOut: null });
              }}
            >
              <Text style={stili.secondarioTesto}>Senza date</Text>
            </Pressable>
            <Pressable
              style={[stili.primario, !(da && a) && { opacity: 0.4 }]}
              disabled={!(da && a)}
              onPress={() => onConferma({ checkIn: da, checkOut: a })}
            >
              <Text style={stili.primarioTesto}>Conferma</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const stili = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  foglio: { backgroundColor: colori.bianco, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34, gap: 12 },
  testata: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titolo: { fontSize: 18, fontWeight: "800", color: colori.testo },
  meseRiga: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meseTitolo: { fontSize: 16, fontWeight: "700", color: colori.testo },
  griglia: { flexDirection: "row", flexWrap: "wrap" },
  giornoSettimana: { width: "14.2857%", textAlign: "center", fontSize: 12, fontWeight: "700", color: colori.testoSecondario, paddingBottom: 6 },
  cella: { width: "14.2857%", height: 42, alignItems: "center", justifyContent: "center" },
  cellaDentro: { backgroundColor: "rgba(0,88,124,0.12)" },
  cellaEstremo: { backgroundColor: colori.blu, borderRadius: 21 },
  numero: { fontSize: 15, color: colori.testo },
  numeroPassato: { color: "#cbd5e1" },
  numeroEstremo: { color: colori.bianco, fontWeight: "800" },
  riepilogo: { textAlign: "center", fontSize: 14, fontWeight: "600", color: colori.blu, minHeight: 20 },
  azioni: { flexDirection: "row", gap: 10 },
  secondario: { flex: 1, borderWidth: 1.5, borderColor: colori.blu, borderRadius: 14, height: 48, alignItems: "center", justifyContent: "center" },
  secondarioTesto: { color: colori.blu, fontWeight: "700", fontSize: 15 },
  primario: { flex: 1.4, backgroundColor: colori.blu, borderRadius: 14, height: 48, alignItems: "center", justifyContent: "center" },
  primarioTesto: { color: colori.bianco, fontWeight: "800", fontSize: 15 },
});
