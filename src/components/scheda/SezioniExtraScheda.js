import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../theme/tema";
import ImmagineConRiserva from "../ImmagineConRiserva";
import { Molla } from "../ui/Molla";
import { vibraLeggera } from "../../lib/vibrazione";

const GIORNI = { 1: "lunedì", 2: "martedì", 3: "mercoledì", 4: "giovedì", 5: "venerdì", 6: "sabato", 7: "domenica" };
const ora = (v) => (v ? String(v).slice(0, 5) : null);
const euro = (n) => `€${Number(n).toFixed(2).replace(".", ",")}`;

export function EventiStruttura({ eventi }) {
  const { c } = useTema();
  const styles = useEstili(c);
  if (!eventi?.length) return null;
  const fmt = (iso, opz) => new Date(iso).toLocaleString("it-IT", opz);
  return (
    <View style={styles.sezione}>
      <Text style={styles.titolo}>Eventi in programma</Text>
      {eventi.map((e) => (
        <View key={e.id} style={styles.evento}>
          <View style={styles.data}>
            <Text style={styles.dataGiorno}>{new Date(e.inizio).getDate()}</Text>
            <Text style={styles.dataMese}>{fmt(e.inizio, { month: "short" })}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.eventoTitolo}>{e.titolo}</Text>
            <Text style={styles.eventoQuando}>
              {fmt(e.inizio, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              {e.fine ? ` – ${fmt(e.fine, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}
              {e.gratuito ? " · Gratuito" : e.prezzo != null ? ` · ${euro(e.prezzo)}` : ""}
            </Text>
            {e.descrizione ? <Text style={styles.eventoDescrizione}>{e.descrizione}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function SpazioBarbecue({ cfg }) {
  const { c } = useTema();
  const styles = useEstili(c);
  if (!cfg) return null;
  const prezzo =
    cfg.modello_prezzo === "gratuito"
      ? "Servizio gratuito."
      : cfg.modello_prezzo === "a_tavolo"
        ? `${euro(cfg.prezzo)} a tavolo, per l'intera giornata.`
        : `${euro(cfg.prezzo)} a persona, per l'intera giornata.`;
  const orario = cfg.orario_inizio || cfg.orario_fine ? `Orario: ${ora(cfg.orario_inizio) || "—"} - ${ora(cfg.orario_fine) || "—"}` : null;
  const giorni = cfg.giorni_disponibili?.length ? `Giorni disponibili: ${cfg.giorni_disponibili.map((g) => GIORNI[g]).join(", ")}.` : null;
  return (
    <View style={styles.sezione}>
      <View style={styles.titoloRiga}>
        <Ionicons name="flame" size={18} color="#E08A3E" />
        <Text style={styles.titolo}>Spazio barbecue per esterni</Text>
      </View>
      <View style={styles.riquadro}>
        <Text style={styles.testo}>
          {cfg.numero_postazioni} {cfg.numero_postazioni === 1 ? "postazione" : "postazioni"} disponibili, fino a {cfg.capienza_postazione}{" "}
          {cfg.capienza_postazione === 1 ? "persona" : "persone"} a tavolo.
        </Text>
        <Text style={styles.testo}>{prezzo}</Text>
        {orario ? <Text style={styles.testo}>{orario}</Text> : null}
        {giorni ? <Text style={styles.testo}>{giorni}</Text> : null}
        {cfg.incluso ? <Text style={styles.testo}><Text style={styles.forte}>Incluso: </Text>{cfg.incluso}</Text> : null}
        {cfg.cosa_portare ? <Text style={styles.testo}><Text style={styles.forte}>Da portare: </Text>{cfg.cosa_portare}</Text> : null}
        {cfg.note_regolamento ? <Text style={styles.nota}><Text style={styles.forte}>Regolamento: </Text>{cfg.note_regolamento}</Text> : null}
      </View>
    </View>
  );
}

export function AltreStrutture({ strutture, regione, onApri }) {
  const { c } = useTema();
  const styles = useEstili(c);
  if (!strutture?.length) return null;
  return (
    <View style={styles.sezione}>
      <Text style={styles.titolo}>{regione ? `Altre strutture in ${regione}` : "Altre strutture vicine"}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {strutture.map((s) => (
          <Molla
            key={s.id}
            scala={0.96}
            style={styles.cartaVicina}
            onPress={() => {
              vibraLeggera();
              onApri(s);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${s.nome}, ${s.localita || ""}`}
          >
            <ImmagineConRiserva uri={s.fotoUrl} larghezza={400} style={styles.fotoVicina} iconaDimensione={28} iconaColore={c.primario} />
            <View style={{ padding: 10, gap: 2 }}>
              <Text style={styles.nomeVicina} numberOfLines={2}>{s.nome}</Text>
              <Text style={styles.localitaVicina} numberOfLines={1}>{s.localita}</Text>
              {s.prezzo ? <Text style={styles.prezzoVicina}>da {s.prezzo}€</Text> : null}
            </View>
          </Molla>
        ))}
      </ScrollView>
    </View>
  );
}

function useEstili(c) {
  return StyleSheet.create({
    sezione: { gap: 10, marginTop: 10 },
    titoloRiga: { flexDirection: "row", alignItems: "center", gap: 6 },
    titolo: { fontSize: 15, fontWeight: "800", color: c.testo },
    evento: { flexDirection: "row", gap: 12, backgroundColor: c.sfondo, borderRadius: 14, padding: 12 },
    data: { width: 48, alignItems: "center", justifyContent: "center" },
    dataGiorno: { fontSize: 22, fontWeight: "800", color: c.primario },
    dataMese: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", color: c.testoSecondario },
    eventoTitolo: { fontSize: 15, fontWeight: "700", color: c.testo },
    eventoQuando: { fontSize: 12, color: c.testoSecondario },
    eventoDescrizione: { fontSize: 13, lineHeight: 18, color: c.testo, marginTop: 3 },
    riquadro: { backgroundColor: c.sfondo, borderRadius: 14, padding: 14, gap: 6 },
    testo: { fontSize: 14, lineHeight: 20, color: c.testo },
    nota: { fontSize: 12, lineHeight: 17, color: c.testoSecondario },
    forte: { fontWeight: "700" },
    cartaVicina: { width: 190, backgroundColor: c.sfondoGruppo, borderRadius: 16, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: c.separatore },
    fotoVicina: { width: "100%", height: 110, backgroundColor: c.primarioChiaro },
    nomeVicina: { fontSize: 14, fontWeight: "800", color: c.testo },
    localitaVicina: { fontSize: 12, color: c.testoSecondario },
    prezzoVicina: { fontSize: 13, fontWeight: "800", color: c.testo, marginTop: 2 },
  });
}
