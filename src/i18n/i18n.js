// Sistema di traduzione dell'app, stesso principio di src/i18n/i18n.js sul
// sito (letto prima di scrivere questo), adattato a React Native: niente
// `window`/`localStorage` (si usa AsyncStorage) né rilevamento da
// `navigator` (si usa expo-localization, la lingua del telefono).
//
// - I testi stanno in src/i18n/<lingua>.js, un oggetto piatto chiave -> testo.
//   it.js è la fonte: se una chiave manca in un'altra lingua si vede
//   l'italiano (mai una chiave nuda).
// - Nei componenti: const t = useT(); t("tab.esplora").
//   Segnaposto: t("chiave", { nome }) sostituisce {nome} nel testo.
// - Fuori dai componenti: traduci("chiave").
// - La lingua è uno stato globale (useSyncExternalStore): cambiarla
//   ridisegna subito le schermate già aperte.
// - Di proposito più semplice della versione sul sito per questo primo
//   passo (niente plurali/Intl.PluralRules, niente testo con tag <a>/<b>):
//   l'app non ne ha ancora bisogno, si aggiunge quando servirà davvero.
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { LINGUA_BASE, LINGUE } from "./lingue";
import it from "./it";
import en from "./en";
import fr from "./fr";
import de from "./de";
import nl from "./nl";

const DIZIONARI = { it, en, fr, de, nl };
const CHIAVE_STORAGE = "naturago_lingua";

function eLinguaSupportata(codice) {
  return typeof codice === "string" && Object.prototype.hasOwnProperty.call(DIZIONARI, codice);
}

// Lingue preferite impostate sul telefono, nell'ordine scelto dall'utente:
// la prima che l'app supporta vince, altrimenti italiano.
function linguaDaDispositivo() {
  try {
    const preferite = Localization.getLocales();
    for (const l of preferite) {
      if (eLinguaSupportata(l.languageCode)) return l.languageCode;
    }
  } catch {
    // expo-localization non disponibile per qualche motivo: niente crash,
    // si parte in italiano come se il telefono non avesse preferenze note.
  }
  return LINGUA_BASE;
}

let linguaCorrente = linguaDaDispositivo();
const ascoltatori = new Set();

function notifica() {
  ascoltatori.forEach((ascoltatore) => ascoltatore());
}

// La scelta salvata (se l'utente ne aveva già fatta una in passato) arriva
// in modo asincrono: fino ad allora si vede la lingua del telefono, poi si
// passa a quella salvata senza bisogno di riavviare l'app.
AsyncStorage.getItem(CHIAVE_STORAGE)
  .then((salvata) => {
    if (eLinguaSupportata(salvata) && salvata !== linguaCorrente) {
      linguaCorrente = salvata;
      notifica();
    }
  })
  .catch(() => {});

export function impostaLingua(codice) {
  if (!eLinguaSupportata(codice) || codice === linguaCorrente) return;
  linguaCorrente = codice;
  AsyncStorage.setItem(CHIAVE_STORAGE, codice).catch(() => {});
  notifica();
}

function iscrivi(ascoltatore) {
  ascoltatori.add(ascoltatore);
  return () => ascoltatori.delete(ascoltatore);
}

export function getLingua() {
  return linguaCorrente;
}

// Cambia identità quando cambia la lingua: chi la mette tra le dipendenze
// di un effetto o di un useMemo si aggiorna da solo.
export function useLingua() {
  return useSyncExternalStore(iscrivi, getLingua, () => LINGUA_BASE);
}

function cercaTesto(lingua, chiave) {
  return DIZIONARI[lingua][chiave] ?? DIZIONARI[LINGUA_BASE][chiave];
}

function sostituisciSegnaposto(testo, parametri) {
  if (!parametri) return testo;
  return testo.replace(/\{(\w+)\}/g, (intero, nome) => (parametri[nome] != null ? String(parametri[nome]) : intero));
}

function creaT(lingua) {
  const t = (chiave, parametri) => {
    const testo = cercaTesto(lingua, chiave);
    if (testo === undefined) {
      if (__DEV__) console.warn(`[i18n] testo mancante: ${chiave}`);
      return chiave;
    }
    return sostituisciSegnaposto(testo, parametri);
  };
  t.lingua = lingua;
  return t;
}

const funzioniT = {};
function tPerLingua(lingua) {
  return (funzioniT[lingua] ??= creaT(lingua));
}

export function useT() {
  return tPerLingua(useLingua());
}

// Fuori dai componenti (es. dentro src/lib/), nella lingua scelta.
export function traduci(chiave, parametri) {
  return tPerLingua(linguaCorrente)(chiave, parametri);
}

export { LINGUE, LINGUA_BASE };
