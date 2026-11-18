import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";

// Tendina dei suggerimenti sotto la barra di ricerca della Mappa (ricerche
// recenti + regioni + strutture già caricate): stessa idea già vista in
// EsploraScreen.js/EsploraHubScreen.js. Estratta da MappaScreen.js perché
// non ha stato proprio, solo quello che riceve dal genitore.
export default function TendinaSuggerimentiMappa({
  mostraRicercheRecenti,
  ricercheRecenti,
  onCancellaRicerche,
  onScegliTermine,
  regioniSuggerite,
  onScegliRegione,
  struttureSuggerite,
  onScegliStruttura,
}) {
  const { c } = useTema();
  const styles = useEstili(c);

  return (
    <View style={styles.tendina}>
      {mostraRicercheRecenti && (
        <>
          <View style={styles.tendinaIntestazione}>
            <Text style={styles.tendinaIntestazioneTesto}>Ricerche recenti</Text>
            <Pressable onPress={onCancellaRicerche} hitSlop={8}>
              <Text style={styles.tendinaCancella}>Cancella</Text>
            </Pressable>
          </View>
          {ricercheRecenti.map((t) => (
            <Pressable key={`recente-${t}`} style={styles.rigaTendina} onPress={() => onScegliTermine(t)}>
              <Ionicons name="time-outline" size={15} color={c.testoSecondario} />
              <Text style={styles.rigaTendinaTesto}>{t}</Text>
            </Pressable>
          ))}
        </>
      )}
      {regioniSuggerite.map((r) => (
        <Pressable key={`regione-${r}`} style={styles.rigaTendina} onPress={() => onScegliRegione(r)}>
          <Ionicons name="map-outline" size={15} color={c.primario} />
          <Text style={styles.rigaTendinaTesto}>{r}</Text>
          <Text style={styles.rigaTendinaEtichetta}>Regione</Text>
        </Pressable>
      ))}
      {struttureSuggerite.map((s) => (
        <Pressable key={`struttura-${s.id}`} style={styles.rigaTendina} onPress={() => onScegliStruttura(s)}>
          <Ionicons name="business-outline" size={15} color={c.testoSecondario} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rigaTendinaTesto} numberOfLines={1}>
              {s.nome}
            </Text>
            {s.localita ? (
              <Text style={styles.rigaTendinaSottotitolo} numberOfLines={1}>
                {s.localita}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    tendina: {
      position: "absolute",
      top: 50,
      left: 0,
      right: 0,
      backgroundColor: c.sfondoGruppo,
      borderRadius: 14,
      paddingVertical: 4,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
      zIndex: 31,
    },
    rigaTendina: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
    },
    rigaTendinaTesto: { flex: 1, fontSize: 12.5, fontWeight: "600", color: c.testo },
    rigaTendinaSottotitolo: { fontSize: 10.5, color: c.testoSecondario },
    rigaTendinaEtichetta: { fontSize: 10, fontWeight: "700", color: c.primario, textTransform: "uppercase" },
    tendinaIntestazione: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 4,
    },
    tendinaIntestazioneTesto: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: c.testoSecondario,
    },
    tendinaCancella: { fontSize: 11, fontWeight: "700", color: c.primario },
  });
}
