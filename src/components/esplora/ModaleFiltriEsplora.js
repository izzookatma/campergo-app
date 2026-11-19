import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTema, ombra } from "../../theme/tema";
import { useT } from "../../i18n/i18n";

function opzioniOrdine(t) {
  return [
    ["consigliati", t("esplora.ordineConsigliati")],
    ["prezzo", t("esplora.ordinePrezzo")],
    ["valutazione", t("esplora.ordineValutazione")],
  ];
}

function opzioniPrezzo(t) {
  return [
    [null, t("esplora.qualsiasi")],
    [20, t("esplora.finoA", { n: 20 })],
    [35, t("esplora.finoA", { n: 35 })],
    [50, t("esplora.finoA", { n: 50 })],
    [80, t("esplora.finoA", { n: 80 })],
  ];
}

// Il pannello "Filtri" di Esplora: ordinamento, prezzo massimo e le
// categorie di servizi (CATEGORIE_FILTRI_SERVIZI). Estratto da
// EsploraScreen.js: non ha stato proprio, solo quello che riceve dal
// genitore (stesso principio di CardStruttura.js).
export default function ModaleFiltriEsplora({
  visibile,
  onChiudi,
  ordine,
  onCambiaOrdine,
  prezzoMax,
  onCambiaPrezzoMax,
  categorieFiltri,
  sezioniAperte,
  onToggleSezione,
  filtriServizi,
  onToggleServizio,
  filtriAttiviNumero,
  etichettaRisultati,
  onReset,
}) {
  const { c } = useTema();
  const styles = useEstili(c);
  const t = useT();

  return (
    <Modal visible={visibile} animationType="slide" presentationStyle="pageSheet" onRequestClose={onChiudi}>
      <SafeAreaView style={styles.modaleSchermo} edges={["top", "bottom"]}>
        <View style={styles.modaleIntestazione}>
          <Text style={styles.modaleTitolo}>{t("esplora.filtriLabel")}</Text>
          <Pressable onPress={onChiudi} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("comune.chiudi")}>
            <Ionicons name="close" size={22} color={c.testo} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 4 }}>
          <View style={styles.sezioneFiltro}>
            <View style={styles.sezioneIntestazione}>
              <Ionicons name="swap-vertical" size={17} color={c.primario} />
              <Text style={styles.sezioneTitoloModale}>{t("esplora.ordinaPerTitolo")}</Text>
            </View>
            <View style={styles.gruppoChip}>
              {opzioniOrdine(t).map(([chiave, etichetta]) => (
                <Pressable
                  key={chiave}
                  onPress={() => onCambiaOrdine(chiave)}
                  style={[styles.chipModale, ordine === chiave && styles.chipAttivo]}
                >
                  <Text style={[styles.chipModaleTesto, ordine === chiave && styles.chipTestoAttivo]}>{etichetta}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.sezioneFiltro}>
            <View style={styles.sezioneIntestazione}>
              <Ionicons name="pricetag-outline" size={17} color={c.primario} />
              <Text style={styles.sezioneTitoloModale}>{t("esplora.prezzoANotte")}</Text>
            </View>
            <View style={styles.gruppoChip}>
              {opzioniPrezzo(t).map(([valore, etichetta]) => (
                <Pressable
                  key={etichetta}
                  onPress={() => onCambiaPrezzoMax(valore)}
                  style={[styles.chipModale, prezzoMax === valore && styles.chipAttivo]}
                >
                  <Text style={[styles.chipModaleTesto, prezzoMax === valore && styles.chipTestoAttivo]}>{etichetta}</Text>
                </Pressable>
              ))}
            </View>
            {prezzoMax != null && (
              <Text style={styles.notaPrezzo}>{t("esplora.notaPrezzo")}</Text>
            )}
          </View>

          {categorieFiltri.map((categoria) => {
            const aperta = !!sezioniAperte[categoria.titolo];
            return (
              <View key={categoria.titolo} style={styles.sezioneFiltro}>
                <Pressable style={styles.sezioneIntestazione} onPress={() => onToggleSezione(categoria.titolo)}>
                  <Ionicons name={categoria.icona} size={17} color={c.primario} />
                  <Text style={styles.sezioneTitoloModale}>{categoria.titolo}</Text>
                  <Ionicons name={aperta ? "chevron-up" : "chevron-down"} size={16} color={c.testoSecondario} />
                </Pressable>
                {aperta &&
                  categoria.voci.map((voce) => {
                    const selezionato = filtriServizi.includes(voce.chiave);
                    return (
                      <Pressable key={voce.chiave} style={styles.rigaServizio} onPress={() => onToggleServizio(voce.chiave)}>
                        <Text style={styles.rigaServizioTesto}>{voce.etichetta}</Text>
                        <Ionicons
                          name={selezionato ? "checkbox" : "square-outline"}
                          size={20}
                          color={selezionato ? c.primario : c.testoSecondario}
                        />
                      </Pressable>
                    );
                  })}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.modalePiede}>
          <Pressable
            style={styles.pulsanteCancella}
            onPress={onReset}
            disabled={filtriAttiviNumero === 0 && ordine === "consigliati"}
          >
            <Text
              style={[
                styles.pulsanteCancellaTesto,
                filtriAttiviNumero === 0 && ordine === "consigliati" && styles.pulsanteCancellaTestoDisattivo,
              ]}
            >
              {t("comune.cancella")}
            </Text>
          </Pressable>
          <Pressable style={styles.pulsanteMostra} onPress={onChiudi}>
            <Text style={styles.pulsanteMostraTesto}>
              {filtriAttiviNumero === 0 ? t("comune.chiudi") : t("esplora.mostraRisultati", { etichetta: etichettaRisultati })}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    modaleSchermo: { flex: 1, backgroundColor: c.sfondo },
    modaleIntestazione: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: c.sfondoGruppo,
      borderBottomWidth: 1,
      borderBottomColor: c.separatore,
    },
    modaleTitolo: { fontSize: 15, fontWeight: "800", color: c.testo },
    sezioneFiltro: { backgroundColor: c.sfondoGruppo, borderRadius: 16, marginBottom: 10, ...ombra(c) },
    sezioneIntestazione: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
    sezioneTitoloModale: { flex: 1, fontSize: 15, fontWeight: "700", color: c.testo },
    rigaServizio: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: c.separatore,
    },
    rigaServizioTesto: { fontSize: 14.5, color: c.testo },
    modalePiede: {
      flexDirection: "row",
      gap: 10,
      padding: 16,
      backgroundColor: c.sfondoGruppo,
      borderTopWidth: 1,
      borderTopColor: c.separatore,
    },
    pulsanteCancella: { height: 46, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
    pulsanteCancellaTesto: { fontSize: 13, fontWeight: "700", color: c.testo },
    pulsanteCancellaTestoDisattivo: { color: c.testoSecondario },
    pulsanteMostra: { flex: 1, height: 46, borderRadius: 12, backgroundColor: c.primario, alignItems: "center", justifyContent: "center" },
    pulsanteMostraTesto: { color: c.sulPrimario, fontWeight: "800", fontSize: 13.5 },
    gruppoChip: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    chipModale: {
      height: 40,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.separatore,
      backgroundColor: c.sfondoGruppo,
      alignItems: "center",
      justifyContent: "center",
    },
    chipModaleTesto: { fontSize: 14, fontWeight: "600", color: c.testo },
    chipAttivo: { backgroundColor: c.primario, borderColor: c.primario },
    chipTestoAttivo: { color: c.sulPrimario },
    notaPrezzo: { fontSize: 12.5, color: c.testoSecondario, paddingHorizontal: 14, paddingBottom: 14, marginTop: -6 },
  });
}
