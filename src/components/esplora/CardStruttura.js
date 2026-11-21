import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../../theme/tema";
import ImmagineConRiserva from "../ImmagineConRiserva";
import BollinoPromo from "../BollinoPromo";
import CuoreAnimato from "../ui/CuoreAnimato";
import { sipuoSalvare } from "../../lib/preferiti";
import { useT } from "../../i18n/i18n";

// Servizi che un camperista cerca per primi: mostrati come icone nella card
// (max 5, nell'ordine di importanza) così non serve aprire la scheda.
const SERVIZI_IN_CARD = [
  ["elettricita", "flash", "Corrente"],
  ["camperService", "color-fill", "Camper service"],
  ["caricoAcqua", "water", "Carico acqua"],
  ["docce", "rainy", "Docce"],
  ["wifi", "wifi", "Wi-Fi"],
  ["petFriendly", "paw", "Animali"],
  ["animaliAmmessi", "paw", "Animali"],
  ["piscina", "umbrella", "Piscina"],
];

function iconeServizi(servizi) {
  if (!servizi || servizi.length === 0) return [];
  const viste = new Set();
  const out = [];
  for (const [chiave, icona, etichetta] of SERVIZI_IN_CARD) {
    if (servizi.includes(chiave) && !viste.has(icona)) {
      viste.add(icona);
      out.push({ chiave, icona, etichetta });
    }
  }
  return out;
}

// Card della lista di Esplora: una struttura (campeggio/agriturismo/rifugio/
// ecc.), con foto, badge tipo, promo, preferito, servizi principali e
// prezzo. Estratta da EsploraScreen.js (era inline nel renderItem della
// FlatList) perché non ha stato proprio: riceve tutto da fuori.
export default function CardStruttura({ item, preferito, onPress, onToggleFavorito }) {
  const { c } = useTema();
  const t = useT();
  const styles = useEstili(c);
  const servizi = iconeServizi(item.servizi);
  const visibili = servizi.slice(0, 4);
  const [scala] = useState(() => new Animated.Value(1));
  const molla = (a) => Animated.spring(scala, { toValue: a, useNativeDriver: true, speed: 40, bounciness: 5 }).start();
  const altri = servizi.length - visibili.length;

  return (
    <Animated.View style={{ transform: [{ scale: scala }] }}>
    <Pressable
      style={styles.card}
      onPressIn={() => molla(0.98)}
      onPressOut={() => molla(1)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.tipo} ${item.nome}, ${item.localita || ""}${item.prezzo ? `, da ${item.prezzo} euro a notte` : ""}`}
    >
      <View style={styles.cardFoto}>
        <ImmagineConRiserva uri={item.fotoUrl} larghezza={640} style={styles.cardImmagine} iconaColore={c.primario} iconaDimensione={34} />
        <View style={styles.cardBadgeTipo}>
          <Text style={styles.cardBadgeTipoTesto}>{item.tipo}</Text>
        </View>
        <View style={styles.cardVelo} pointerEvents="none" />
        {item.prezzo ? (
          <View style={styles.cardPrezzoFoto}>
            <Text style={styles.cardPrezzoFotoTesto}>da {item.prezzo}€</Text>
          </View>
        ) : null}
        {item.haPromoAttiva && <BollinoPromo style={styles.cardBollinoPromo} />}
        {sipuoSalvare(item) && (
          <Pressable
            onPress={onToggleFavorito}
            hitSlop={6}
            style={styles.cardCuore}
            accessibilityRole="button"
            accessibilityLabel={preferito ? t("comune.preferitoRimuovi") : t("comune.preferitoSalva")}
          >
            <CuoreAnimato attivo={preferito} size={20} colore={c.pericolo} />
          </Pressable>
        )}
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardRigaTitolo}>
          <Text style={styles.cardNome} numberOfLines={2}>
            {item.nome}
          </Text>
          {item.rating ? (
            <View style={styles.cardRatingRiga}>
              <Ionicons name="star" size={13} color={c.voto} />
              <Text style={styles.cardRatingTesto}>
                {item.rating}
                {item.recensioni ? ` (${item.recensioni})` : ""}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardLocalita} numberOfLines={1}>
          {item.localita}
          {item.distanzaKm != null ? ` · a ${item.distanzaKm.toFixed(1)} km` : ""}
        </Text>
        {visibili.length > 0 && (
          <View style={styles.cardServizi}>
            {visibili.map((sv) => (
              <View key={sv.chiave} style={styles.cardServizioPill}>
                <Ionicons name={sv.icona} size={12} color={c.primario} />
                <Text style={styles.cardServizioTesto}>{sv.etichetta}</Text>
              </View>
            ))}
            {altri > 0 && <Text style={styles.cardServiziAltri}>+{altri}</Text>}
          </View>
        )}
      </View>
    </Pressable>
    </Animated.View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    card: { backgroundColor: c.sfondoGruppo, borderRadius: 20, overflow: "hidden", ...ombra(c) },
    cardFoto: {
      width: "100%",
      height: 240,
      backgroundColor: c.primarioChiaro,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
    },
    cardImmagine: { width: "100%", height: "100%" },
    cardBadgeTipo: {
      position: "absolute",
      top: 12,
      left: 12,
      backgroundColor: "rgba(255,255,255,0.94)",
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    cardBadgeTipoTesto: { fontSize: 12, fontWeight: "800", color: c.primario },
    cardBollinoPromo: { position: "absolute", bottom: 12, left: 12 },
    cardVelo: { position: "absolute", left: 0, right: 0, bottom: 0, height: 70, backgroundColor: "rgba(8,24,36,0.22)" },
    cardPrezzoFoto: { position: "absolute", bottom: 12, right: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 14, paddingHorizontal: 11, paddingVertical: 5 },
    cardPrezzoFotoTesto: { color: "#fff", fontSize: 14, fontWeight: "800" },
    cardCuore: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.94)",
      alignItems: "center",
      justifyContent: "center",
    },
    cardInfo: { padding: 14, gap: 5 },
    cardRigaTitolo: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
    cardNome: { flex: 1, fontSize: 17, fontWeight: "800", color: c.testo },
    cardLocalita: { fontSize: 14, color: c.testoSecondario },
    cardRatingRiga: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    cardRatingTesto: { fontSize: 13.5, fontWeight: "700", color: c.testo },
    cardServizi: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
    cardServizioPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.primarioChiaro,
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    cardServizioTesto: { fontSize: 12.5, fontWeight: "600", color: c.primario },
    cardServiziAltri: { fontSize: 12.5, fontWeight: "700", color: c.testoSecondario },
    cardPrezzoRiga: { fontSize: 14, color: c.testoSecondario, marginTop: 4 },
    cardPrezzo: { fontSize: 18, fontWeight: "800", color: c.testo },
  });
}
