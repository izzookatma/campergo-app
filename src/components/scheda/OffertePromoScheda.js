import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { descriviRegola, etichettaSconto, dataBreve, perChiVale, offertaVale } from "../../lib/offertePromo";

const ROSSO = "#C62828";
const ROSSO_SCURO = "#B71C1C";

// Offerte promo dell'host, come sul sito: riquadro rosso con lo sconto, a chi
// vale, le regole, la descrizione e il periodo di validità.
export default function OffertePromoScheda({ offerte, piazzole }) {
  const righe = offerte.filter((o) => piazzole.length === 0 || piazzole.some((p) => offertaVale(o, p)));
  if (righe.length === 0) return null;
  return (
    <View style={styles.sezione}>
      <Text style={styles.titolo}>Offerte</Text>
      {righe.map((o) => {
        const percentuale = o.tipo_prezzo === "percentuale";
        return (
          <View key={o.id} style={styles.carta}>
            <View style={styles.sconto}>
              <Text style={styles.scontoEtichetta}>OFFERTA</Text>
              <Text style={styles.scontoValore}>{etichettaSconto(o)}</Text>
              <Text style={styles.scontoSotto}>{percentuale ? "di sconto" : "a notte"}</Text>
            </View>
            <View style={styles.corpo}>
              <Text style={styles.nome}>{o.nome}</Text>
              <View style={styles.pillole}>
                <Text style={styles.pillola}>{perChiVale(o, piazzole)}</Text>
                <Text style={styles.pillola}>{descriviRegola(o)}</Text>
              </View>
              {o.descrizione ? <Text style={styles.descrizione}>{o.descrizione}</Text> : null}
              <View style={styles.validita}>
                <Ionicons name="calendar-outline" size={14} color={ROSSO_SCURO} />
                <Text style={styles.validitaTesto}>
                  Valida dal {dataBreve(o.data_inizio)} al {dataBreve(o.data_fine)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sezione: { gap: 10, marginTop: 6 },
  titolo: { fontSize: 15, fontWeight: "800", color: "#111827" },
  carta: { flexDirection: "row", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(198,40,40,0.3)", backgroundColor: "#fff" },
  sconto: { width: 100, backgroundColor: ROSSO, alignItems: "center", justifyContent: "center", paddingVertical: 14, paddingHorizontal: 6 },
  scontoEtichetta: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1.6, opacity: 0.9 },
  scontoValore: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 2 },
  scontoSotto: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: 2 },
  corpo: { flex: 1, padding: 12, gap: 6 },
  nome: { fontSize: 16, fontWeight: "800", color: "#111827" },
  pillole: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pillola: { backgroundColor: "#FDECEC", color: ROSSO_SCURO, fontSize: 11, fontWeight: "700", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  descrizione: { fontSize: 13, lineHeight: 18, color: "#4b5563" },
  validita: { flexDirection: "row", alignItems: "center", gap: 5, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: "rgba(198,40,40,0.3)", paddingTop: 6, marginTop: 2 },
  validitaTesto: { fontSize: 12, fontWeight: "700", color: ROSSO_SCURO },
});
