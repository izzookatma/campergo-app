import { useColorScheme } from "react-native";
import { usePreferenze } from "../context/PreferenzeContext";

// Sistema di stile unico di NaturaGo (ispirato alle linee guida Apple:
// gerarchia chiara, pochi pesi, spazi a multipli di 4/8, colori "semantici"
// con versione chiara e scura). Le schermate nuove usano questo file; quelle
// vecchie usano ancora `colors.js`, che resta valido finché non migrano.

// Il tema scuro si accende cambiando questo valore (e "userInterfaceStyle"
// in app.json su "automatic") SOLO quando tutte le schermate usano `useTema`:
// finché ce ne sono di vecchie, con colori fissi, il tema scuro le renderebbe
// illeggibili (testo scuro su sfondo scuro).
export const TEMA_SCURO_ATTIVO = false;

export const spazio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

export const raggio = { s: 10, m: 14, l: 20, pillola: 999 };

// Scala dei testi (punti). Corpo 17 come iOS: leggibile anche in camper, alla
// guida o al sole. Niente testi sotto i 12.
export const tipo = {
  titoloGrande: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.3 },
  titolo: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: 0.2 },
  sezione: { fontSize: 20, lineHeight: 25, fontWeight: "600" },
  corpo: { fontSize: 17, lineHeight: 22, fontWeight: "400" },
  corpoForte: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  secondario: { fontSize: 15, lineHeight: 20, fontWeight: "400" },
  nota: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  etichetta: { fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.4 },
};

const chiaro = {
  sfondo: "#F2F4F7",
  sfondoGruppo: "#FFFFFF",
  sfondoCampo: "#FFFFFF",
  testo: "#111827",
  testoSecondario: "#5F6B7A",
  separatore: "#E5E7EB",
  primario: "#00587C",
  primarioChiaro: "#EAF4FA",
  sulPrimario: "#FFFFFF",
  accento: "#E08A3E",
  accentoChiaro: "#FBF2E8",
  sulAccento: "#FFFFFF",
  pericolo: "#D92D20",
  pericoloChiaro: "#FEF2F2",
  // Toni semantici in più, oltre a primario/accento/pericolo: badge e
  // avvisi delle schermate (Scheda struttura, Cultura, Itinerari) li
  // usavano prima come colori scritti a mano, ognuno un po' diverso
  // (verde/arancio/viola leggermente diversi da una schermata all'altra).
  successo: "#16A34A",
  successoChiaro: "#DCFCE7",
  attenzione: "#EA580C",
  attenzioneChiaro: "#FFF7ED",
  viola: "#9333EA",
  violaChiaro: "#F3E8FF",
  voto: "#F59E0B",
  inattivo: "#8E97A3",
  ombra: "#0F172A",
};

const scuro = {
  sfondo: "#0B1620",
  sfondoGruppo: "#14232F",
  sfondoCampo: "#14232F",
  testo: "#F3F6F8",
  testoSecondario: "#9FB0BF",
  separatore: "#243746",
  primario: "#4DB3DC",
  primarioChiaro: "#12303F",
  sulPrimario: "#06202D",
  accento: "#F0A35F",
  accentoChiaro: "#2E2416",
  sulAccento: "#06202D",
  pericolo: "#FF6B5E",
  pericoloChiaro: "#2E1512",
  successo: "#4ADE80",
  successoChiaro: "#153226",
  attenzione: "#FB923C",
  attenzioneChiaro: "#2E2012",
  viola: "#C084FC",
  violaChiaro: "#2B1D3D",
  voto: "#FBBF24",
  inattivo: "#6F8394",
  ombra: "#000000",
};

export function paletteTema(schema) {
  return TEMA_SCURO_ATTIVO && schema === "dark" ? scuro : chiaro;
}

// Colori correnti (chiaro/scuro) + il resto del sistema in un solo oggetto.
// Il tema scuro è una scelta dell'utente (Profilo > Aspetto), chiaro di
// default: le schermate con colori fissi (giochi) restano chiare.
export function useTema() {
  const schema = useColorScheme();
  const aspetto = usePreferenze()?.aspetto ?? "chiaro";
  const scuroAttivo = aspetto === "scuro" || (aspetto === "sistema" && schema === "dark") || (TEMA_SCURO_ATTIVO && schema === "dark");
  const c = scuroAttivo ? scuro : chiaro;
  return { c, spazio, raggio, tipo, scuro: scuroAttivo };
}
// Ombra morbida unica per card sollevate.
export function ombra(c) {
  return { shadowColor: c.ombra, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 };
}
