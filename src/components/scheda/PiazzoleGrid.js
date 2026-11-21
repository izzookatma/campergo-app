import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";
import { ETICHETTA_TIPO_ALLOGGIO } from "../../lib/strutture";
import ImmagineConRiserva from "../ImmagineConRiserva";
import { offertaVale, etichettaSconto, descriviRegola, dataBreve } from "../../lib/offertePromo";
import { Molla } from "../ui/Molla";
import { vibraLeggera } from "../../lib/vibrazione";

// "Piazzole e alloggi": piazzole/alloggi fissi della struttura, sempre
// visibili (vedi caricaPiazzoleStruttura in src/lib/strutture.js). Estratta
// da SchedaScreen.js: riceve solo l'elenco già caricato, nessuno stato proprio.
export default function PiazzoleGrid({ piazzole, offerte = [] }) {
  const { c } = useTema();
  const styles = useEstili(c);
  const [aperta, setAperta] = useState(null);

  if (piazzole.length === 0) return null;

  const titoloDi = (pz) =>
    pz.tipo === "alloggio"
      ? `${ETICHETTA_TIPO_ALLOGGIO[pz.tipoAlloggio] || "Alloggio"}${pz.numero ? ` · ${pz.numero}` : ""}`
      : `Piazzola${pz.numero ? ` ${pz.numero}` : ""}`;
  const dettagliDi = (pz) =>
    pz.tipo === "alloggio"
      ? [pz.postiLetto ? `${pz.postiLetto} posti letto` : null, pz.stanze ? `${pz.stanze} stanze` : null, pz.mq ? `${pz.mq} mq` : null].filter(Boolean).join(" · ")
      : pz.lunghezza && pz.larghezza
        ? `${pz.lunghezza} x ${pz.larghezza} m`
        : null;

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
            <Molla
              key={pz.id}
              scala={0.96}
              style={styles.card}
              onPress={() => {
                vibraLeggera();
                setAperta(pz);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${titolo}, apri i dettagli`}
            >
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
              {offerte.some((o) => offertaVale(o, pz)) && (
                <View style={styles.bollinoPromo}>
                  <Text style={styles.bollinoPromoTesto}>PROMO</Text>
                </View>
              )}
            </Molla>
          );
        })}
      </View>

      <Modal visible={!!aperta} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAperta(null)}>
        {aperta && (
          <SafeAreaView style={{ flex: 1, backgroundColor: c.sfondoGruppo }} edges={["bottom"]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <ImmagineConRiserva uri={aperta.fotoUrl} larghezza={1000} style={styles.fotoGrande} icona="image-outline" iconaDimensione={40} iconaColore={c.testoSecondario} />
              <View style={{ padding: 18, gap: 8 }}>
                <Text style={styles.modaleTitolo}>{titoloDi(aperta)}</Text>
                {aperta.prezzo != null && <Text style={styles.modalePrezzo}>{aperta.prezzo}€ a notte</Text>}
                {dettagliDi(aperta) ? <Text style={styles.modaleDettagli}>{dettagliDi(aperta)}</Text> : null}
                {aperta.descrizione ? <Text style={styles.modaleDescrizione}>{aperta.descrizione}</Text> : null}
                {offerte
                  .filter((o) => offertaVale(o, aperta))
                  .map((o) => (
                    <View key={o.id} style={styles.promoRiga}>
                      <Text style={styles.promoSconto}>{etichettaSconto(o)}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.promoNome}>{o.nome}</Text>
                        <Text style={styles.promoDettagli}>
                          {descriviRegola(o)} · fino al {dataBreve(o.data_fine)}
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            </ScrollView>
            <Pressable style={styles.chiudi} onPress={() => setAperta(null)} accessibilityRole="button" accessibilityLabel="Chiudi">
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </SafeAreaView>
        )}
      </Modal>
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
    bollinoPromo: { position: "absolute", top: 6, left: 6, backgroundColor: "#C62828", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
    bollinoPromoTesto: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
    fotoGrande: { width: "100%", height: 260, backgroundColor: c.primarioChiaro },
    modaleTitolo: { fontSize: 22, fontWeight: "800", color: c.testo },
    modalePrezzo: { fontSize: 18, fontWeight: "800", color: c.primario },
    modaleDettagli: { fontSize: 15, color: c.testoSecondario },
    modaleDescrizione: { fontSize: 15, lineHeight: 21, color: c.testo },
    promoRiga: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FDECEC", borderRadius: 14, padding: 12, marginTop: 6 },
    promoSconto: { fontSize: 20, fontWeight: "900", color: "#C62828" },
    promoNome: { fontSize: 14, fontWeight: "800", color: "#111827" },
    promoDettagli: { fontSize: 12, color: "#B71C1C" },
    chiudi: { position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  });
}
