import { View, Text, StyleSheet } from "react-native";
import { useTema } from "../../theme/tema";
import { ETICHETTA_TIPO_ALLOGGIO } from "../../lib/strutture";
import ImmagineConRiserva from "../ImmagineConRiserva";

// "Piazzole e alloggi": piazzole/alloggi fissi della struttura, sempre
// visibili (vedi caricaPiazzoleStruttura in src/lib/strutture.js). Estratta
// da SchedaScreen.js: riceve solo l'elenco già caricato, nessuno stato proprio.
export default function PiazzoleGrid({ piazzole }) {
  const { c } = useTema();
  const styles = useEstili(c);

  if (piazzole.length === 0) return null;

  return (
    <View style={styles.sezione}>
      <Text style={styles.sezioneTitolo}>Piazzole e alloggi</Text>
      <View style={styles.griglia}>
        {piazzole.map((pz) => {
          const eAlloggio = pz.tipo === "alloggio";
          const titolo = eAlloggio
            ? `${ETICHETTA_TIPO_ALLOGGIO[pz.tipoAlloggio] || "Alloggio"}${pz.numero ? ` · ${pz.numero}` : ""}`
            : `Piazzola${pz.numero ? ` ${pz.numero}` : ""}`;
          const dettagli = eAlloggio
            ? [pz.postiLetto ? `${pz.postiLetto} posti letto` : null, pz.stanze ? `${pz.stanze} stanze` : null, pz.mq ? `${pz.mq} mq` : null]
                .filter(Boolean)
                .join(" · ")
            : pz.lunghezza && pz.larghezza
              ? `${pz.lunghezza} x ${pz.larghezza} m`
              : null;
          return (
            <View key={pz.id} style={styles.card}>
              <View style={styles.foto}>
                <ImmagineConRiserva
                  uri={pz.fotoUrl}
                  larghezza={300}
                  style={styles.foto}
                  icona="image-outline"
                  iconaDimensione={20}
                  iconaColore={c.testoSecondario}
                />
              </View>
              <View style={styles.info}>
                <View style={styles.rigaTitolo}>
                  <Text style={styles.titolo} numberOfLines={1}>
                    {titolo}
                  </Text>
                  {pz.prezzo != null && <Text style={styles.prezzo}>{pz.prezzo}€/notte</Text>}
                </View>
                {dettagli && <Text style={styles.dettagli}>{dettagli}</Text>}
                {pz.descrizione && (
                  <Text style={styles.descrizione} numberOfLines={2}>
                    {pz.descrizione}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    sezione: { gap: 8, marginTop: 6 },
    sezioneTitolo: { fontSize: 15, fontWeight: "800", color: c.testo, marginBottom: 2 },
    griglia: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: { width: "47%", backgroundColor: c.sfondo, borderRadius: 14, overflow: "hidden" },
    foto: { width: "100%", height: 90, backgroundColor: c.primarioChiaro, alignItems: "center", justifyContent: "center" },
    info: { padding: 8, gap: 2 },
    rigaTitolo: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 4 },
    titolo: { flex: 1, fontSize: 13, fontWeight: "700", color: c.testo },
    prezzo: { fontSize: 13, fontWeight: "700", color: c.testo },
    dettagli: { fontSize: 13, color: c.testoSecondario },
    descrizione: { fontSize: 13, color: "#4b5563", marginTop: 2 },
  });
}
