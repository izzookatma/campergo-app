import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";
import { CATEGORIA_CULTURALE_META } from "../../lib/cultura";

// "Cosa visitare nei dintorni": musei/borghi/eventi entro 50 km dalla
// struttura (vedi caricaCulturaVicina in src/lib/cultura.js). Estratta da
// SchedaScreen.js: riceve solo l'elenco già caricato e il callback per
// aprire la scheda culturale, nessuno stato proprio.
export default function CulturaViciniLista({ culturaVicina, onApri }) {
  const { c } = useTema();
  const styles = useEstili(c);

  if (culturaVicina.length === 0) return null;

  return (
    <View style={styles.sezione}>
      <Text style={styles.sezioneTitolo}>Cosa visitare nei dintorni</Text>
      <View style={{ gap: 7 }}>
        {culturaVicina.map((voce) => {
          const meta = CATEGORIA_CULTURALE_META[voce.categoria];
          return (
            <Pressable key={voce.id} style={styles.riga} onPress={() => onApri(voce.id)}>
              <View style={[styles.rigaIcona, { backgroundColor: meta.colore + "18" }]}>
                <Ionicons name={meta.icona} size={14} color={meta.colore} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rigaTitolo} numberOfLines={1}>
                  {voce.titolo}
                </Text>
                <Text style={styles.rigaTipo}>{meta.etichettaSingolare}</Text>
              </View>
              <Text style={styles.rigaDistanza}>{voce.distanzaKm < 1 ? "<1" : voce.distanzaKm.toFixed(1)} km</Text>
            </Pressable>
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
    riga: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.sfondo, borderRadius: 12, padding: 10 },
    rigaIcona: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    rigaTitolo: { fontSize: 13, fontWeight: "700", color: c.testo },
    rigaTipo: { fontSize: 13, color: c.testoSecondario },
    rigaDistanza: { fontSize: 13, fontWeight: "600", color: c.testoSecondario },
  });
}
