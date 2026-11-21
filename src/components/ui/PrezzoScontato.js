import { View, Text, StyleSheet } from "react-native";
import { descriviRegola, dataBreve } from "../../lib/offertePromo";

// Blocco prezzo "stile Booking": vecchio prezzo barrato in rosso, nuovo
// prezzo grande e scuro, badge verde con lo sconto, regola in grigio e
// scadenza in rosso. Colori presi dal riferimento indicato dall'utente.
export const COLORI_PROMO = {
  barrato: "#D4111E",
  prezzo: "#1A1A1A",
  grigio: "#6B6B6B",
  verde: "#008009",
  rosso: "#C00000",
  marrone: "#8C4A00",
};

export default function PrezzoScontato({ promo, grande = false, allineaDestra = false, conScadenza = true }) {
  if (!promo) return null;
  const { offerta, pieno, scontato } = promo;
  const percentuale = Math.round((1 - scontato / pieno) * 100);
  const euro = (n) => `€ ${Number(n).toLocaleString("it-IT", { maximumFractionDigits: 2 })}`;
  return (
    <View style={[styles.blocco, allineaDestra && { alignItems: "flex-end" }]}>
      <View style={styles.riga}>
        <View style={styles.badge}>
          <Text style={styles.badgeTesto}>−{percentuale}%</Text>
        </View>
        <Text style={[styles.barrato, grande && { fontSize: 17 }]}>{euro(pieno)}</Text>
        <Text style={[styles.nuovo, grande && { fontSize: 30 }]}>{euro(scontato)}</Text>
      </View>
      <Text style={styles.nota}>a notte · {descriviRegola(offerta)}</Text>
      {conScadenza && <Text style={styles.scadenza}>{offerta.nome} · fino al {dataBreve(offerta.data_fine)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  blocco: { gap: 2 },
  riga: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  badge: { backgroundColor: COLORI_PROMO.verde, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "center" },
  badgeTesto: { color: "#fff", fontSize: 12, fontWeight: "800" },
  barrato: { color: COLORI_PROMO.barrato, fontSize: 14, fontWeight: "600", textDecorationLine: "line-through" },
  nuovo: { color: COLORI_PROMO.prezzo, fontSize: 22, fontWeight: "800" },
  nota: { color: COLORI_PROMO.grigio, fontSize: 12 },
  scadenza: { color: COLORI_PROMO.rosso, fontSize: 12, fontWeight: "700" },
});
