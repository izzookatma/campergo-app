import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useTema } from "../../theme/tema";
import { CATEGORIA_CULTURALE_META } from "../../lib/cultura";
import ImmagineConRiserva from "../ImmagineConRiserva";

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {culturaVicina.map((voce) => {
          const meta = CATEGORIA_CULTURALE_META[voce.categoria];
          return (
            <Pressable key={voce.id} style={styles.card} onPress={() => onApri(voce.id)}>
              <View style={[styles.cardFoto, { backgroundColor: meta.colore + "18" }]}>
                <ImmagineConRiserva
                  uri={voce.fotoUrl}
                  larghezza={220}
                  style={styles.cardImmagine}
                  icona={meta.icona}
                  iconaColore={meta.colore}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.rigaTitolo} numberOfLines={2}>
                  {voce.titolo}
                </Text>
                <Text style={styles.rigaTipo} numberOfLines={1}>
                  {meta.etichettaSingolare} · {voce.distanzaKm < 1 ? "<1" : voce.distanzaKm.toFixed(1)} km
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    sezione: { gap: 8, marginTop: 6 },
    sezioneTitolo: { fontSize: 15, fontWeight: "800", color: c.testo, marginBottom: 2 },
    card: { width: 190, backgroundColor: c.sfondo, borderRadius: 14, overflow: "hidden" },
    cardFoto: { height: 110, width: "100%" },
    cardImmagine: { width: "100%", height: "100%" },
    cardInfo: { padding: 10, gap: 2 },
    riga: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.sfondo, borderRadius: 12, padding: 10 },
    rigaIcona: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    rigaTitolo: { fontSize: 13, fontWeight: "700", color: c.testo },
    rigaTipo: { fontSize: 13, color: c.testoSecondario },
    rigaDistanza: { fontSize: 13, fontWeight: "600", color: c.testoSecondario },
  });
}
