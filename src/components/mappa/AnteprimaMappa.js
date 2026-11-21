import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTema, ombra } from "../../theme/tema";
import ImmagineConRiserva from "../ImmagineConRiserva";
import Pulsante from "../ui/Pulsante";
import { useT } from "../../i18n/i18n";

// Scheda anteprima che sale dal basso quando si tocca un segnaposto (al posto
// del fumetto di sistema, che andava toccato una seconda volta): foto, nome,
// località e due azioni. `voce` = { titolo, sottotitolo, fotoUrl, etichetta }.
export default function AnteprimaMappa({ voce, onApri, onIndicazioni, onChiudi }) {
  const { c } = useTema();
  const t = useT();
  const styles = useEstili(c);
  const [salita] = useState(() => new Animated.Value(0));

  useEffect(() => {
    salita.setValue(0);
    Animated.spring(salita, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
  }, [voce, salita]);

  return (
    <Animated.View
      style={[
        styles.contenitore,
        { opacity: salita, transform: [{ translateY: salita.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] },
      ]}
      pointerEvents="box-none"
    >
      <SafeAreaView edges={["bottom"]} pointerEvents="box-none">
        <View style={styles.card}>
          <Pressable onPress={onApri} style={styles.riga} accessibilityRole="button" accessibilityLabel={voce.titolo}>
            <View style={styles.foto}>
              <ImmagineConRiserva uri={voce.fotoUrl} larghezza={300} style={styles.fotoImg} iconaColore={c.primario} iconaDimensione={28} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              {voce.etichetta ? <Text style={styles.etichetta}>{voce.etichetta}</Text> : null}
              <Text style={styles.titolo} numberOfLines={2}>
                {voce.titolo}
              </Text>
              {voce.sottotitolo ? (
                <Text style={styles.sottotitolo} numberOfLines={1}>
                  {voce.sottotitolo}
                </Text>
              ) : null}
            </View>
          </Pressable>
          <Pressable style={styles.chiudi} onPress={onChiudi} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("comune.chiudi")}>
            <Ionicons name="close" size={16} color={c.testoSecondario} />
          </Pressable>
          <View style={styles.azioni}>
            <Pulsante titolo={t("mappa.apriScheda")} variante="secondario" onPress={onApri} style={{ flex: 1 }} />
            {onIndicazioni && (
              <Pulsante
                titolo={t("comune.indicazioni")}
                icona={<Ionicons name="navigate" size={18} color={c.sulPrimario} />}
                onPress={onIndicazioni}
                style={{ flex: 1 }}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    contenitore: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: 8 },
    card: { backgroundColor: c.sfondoGruppo, borderRadius: 24, padding: 14, gap: 12, ...ombra(c), shadowOpacity: 0.18, shadowRadius: 16 },
    riga: { flexDirection: "row", gap: 12, alignItems: "center", paddingRight: 24 },
    foto: { width: 84, height: 84, borderRadius: 16, overflow: "hidden", backgroundColor: c.primarioChiaro, alignItems: "center", justifyContent: "center" },
    fotoImg: { width: "100%", height: "100%" },
    etichetta: { fontSize: 12, fontWeight: "800", color: c.primario, letterSpacing: 0.3 },
    titolo: { fontSize: 18, fontWeight: "800", color: c.testo },
    sottotitolo: { fontSize: 14, color: c.testoSecondario },
    chiudi: { position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: c.sfondo, alignItems: "center", justifyContent: "center" },
    azioni: { flexDirection: "row", gap: 10 },
  });
}
