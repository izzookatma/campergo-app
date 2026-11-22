// Conteggio anonimo dell'uso dell'app, per /admin/visite (sezione «App»).
//
// Anonimo: nessun nome, email, posizione, IP o identificativo pubblicitario.
// Ogni installazione ha solo un codice casuale tenuto sul telefono (si azzera
// disinstallando l'app). Si inviano: aperture, schermate viste, schede
// aperte (struttura o scheda culturale) ed errori JavaScript dell'app. Gli
// errori non portano dati personali: solo il messaggio tecnico (max 300
// caratteri) e la schermata. I crash nativi (app che si chiude di colpo)
// si vedono invece in Google Play Console e App Store Connect.
//
// Mai bloccante: ogni invio è «lancia e dimentica», qualunque errore qui
// dentro viene ignorato e non deve mai rompere l'app.

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { supabase } from "./supabase";

const CHIAVE_INSTALLAZIONE = "naturago_telemetria_installazione";
const CHIAVE_CONSENSO = "naturago_telemetria_disattivata";

// Statistiche anonime attive di default; l'utente le può spegnere dal Profilo.
// Lo stato è tenuto in memoria e riletto all'avvio.
let telemetriaDisattivata = false;
const letturaConsenso = AsyncStorage.getItem(CHIAVE_CONSENSO)
  .then((v) => {
    telemetriaDisattivata = v === "1";
  })
  .catch(() => {});

export async function telemetriaAttiva() {
  await letturaConsenso;
  return !telemetriaDisattivata;
}

export async function impostaTelemetriaAttiva(attiva) {
  telemetriaDisattivata = !attiva;
  try {
    await AsyncStorage.setItem(CHIAVE_CONSENSO, attiva ? "0" : "1");
  } catch {
    // Resta valido per questa sessione.
  }
}

function codiceCasuale() {
  const blocco = () => Math.random().toString(36).slice(2, 10);
  return `${blocco()}${blocco()}${Date.now().toString(36)}`;
}

const sessione = codiceCasuale();
const piattaforma = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : null;
const versione = Constants.expoConfig?.version ?? null;

let installazionePromessa = null;
function ottieniInstallazione() {
  if (!installazionePromessa) {
    installazionePromessa = (async () => {
      try {
        let id = await AsyncStorage.getItem(CHIAVE_INSTALLAZIONE);
        if (!id) {
          id = codiceCasuale();
          await AsyncStorage.setItem(CHIAVE_INSTALLAZIONE, id);
        }
        return id;
      } catch {
        return codiceCasuale();
      }
    })();
  }
  return installazionePromessa;
}

async function invia(tipo, { schermata, oggettoTipo, oggettoId, dettaglio } = {}) {
  if (!piattaforma || __DEV__) return;
  try {
    await letturaConsenso;
    if (telemetriaDisattivata) return;
    const installazione = await ottieniInstallazione();
    await supabase.rpc("registra_evento_app", {
      p_installazione: installazione,
      p_sessione: sessione,
      p_piattaforma: piattaforma,
      p_versione: versione,
      p_tipo: tipo,
      p_schermata: schermata ?? null,
      p_oggetto_tipo: oggettoTipo ?? null,
      p_oggetto_id: oggettoId ?? null,
      p_dettaglio: dettaglio ?? null,
    });
  } catch {
    // Il conteggio non deve mai disturbare l'app.
  }
}

export function segnaApertura() {
  invia("apertura");
}

let ultimaSchermata = null;

// Da chiamare a ogni cambio di schermata con il nome e i parametri della
// schermata corrente (la più interna).
export function segnaSchermata(nome, parametri) {
  if (!nome || nome === ultimaSchermata) return;
  ultimaSchermata = nome;
  invia("schermata", { schermata: nome });

  // Scheda di una struttura o scheda culturale: si conta anche quale.
  if (nome === "Scheda" && parametri?.struttura?.origine === "campeggi_pubblici") {
    const id = Number(parametri.struttura.idOriginale);
    if (Number.isFinite(id)) invia("scheda", { schermata: nome, oggettoTipo: "campeggio", oggettoId: id });
  } else if (nome === "SchedaCulturale") {
    const id = Number(parametri?.id);
    if (Number.isFinite(id)) invia("scheda", { schermata: nome, oggettoTipo: "scheda_culturale", oggettoId: id });
  }
}

export function segnaErrore(errore, fatale) {
  const testo = `${fatale ? "[fatale] " : ""}${errore?.message || String(errore)}`;
  invia("errore", { schermata: ultimaSchermata, dettaglio: testo });
}

let erroriAttivi = false;
export function attivaSegnalazioneErrori() {
  if (erroriAttivi) return;
  erroriAttivi = true;
  try {
    const precedente = globalThis.ErrorUtils?.getGlobalHandler?.();
    globalThis.ErrorUtils?.setGlobalHandler?.((errore, fatale) => {
      segnaErrore(errore, fatale);
      precedente?.(errore, fatale);
    });
  } catch {
    // Se non si può agganciare, l'app funziona lo stesso.
  }
}
