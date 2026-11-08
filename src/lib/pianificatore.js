// "Pianifica il tuo viaggio" — stessa logica della Ricerca IA (prova, vedi
// supabase/functions/interpreta-richiesta-viaggio e genera-itinerario-ia
// nel repo campergo): stesso progetto Supabase, stesse funzioni Edge,
// nessuna duplicazione lato server. Qui solo le chiamate.

import { supabase } from "./supabase";
import { geocodificaOCoordinate } from "./geocodifica";
import { aggiungiTappeIntermedie, percorsoStradale } from "./percorsoStradale";

async function chiamaFunzione(nome, corpo) {
  const { data, error } = await supabase.functions.invoke(nome, { body: corpo });
  if (error) {
    // FunctionsHttpError di supabase-js perde il messaggio preciso del
    // corpo JSON (data.errore) dietro un testo generico — lo recuperiamo
    // leggendo la risposta vera, se disponibile.
    const corpoErrore = await error?.context?.json?.().catch(() => null);
    throw new Error(corpoErrore?.errore || error.message || "Errore sconosciuto nella chiamata alla funzione.");
  }
  if (!data?.ok) throw new Error(data?.errore || "Richiesta non riuscita.");
  return data;
}

// Due chiamate, non una: Nominatim rifiuta con 403 le richieste che
// arrivano dall'IP di Supabase ("Access denied", verificato dal vivo),
// quindi la geocodifica di ogni tappa deve avvenire qui sul telefono, non
// dentro la funzione Edge — stessa cosa già fatta per creare un itinerario.
// 1) interpreta-richiesta-viaggio capisce le tappe del percorso (una sola
// per "vicino a Mantova", più d'una per "da Milano a Napoli") più giorni/
// interessi; 2) geocodifichiamo ogni tappa qui; 3) genera-itinerario-ia
// distribuisce i giorni lungo le tappe e costruisce il piano.
// Interpreta una frase libera in tappe già geocodificate più giorni/
// interessi: usata solo da creaPercorso qui sotto ("Creami un percorso"
// nella schermata Mappa, che genera sia il percorso stradale sia lo stesso
// tipo di piano da una frase libera). "Pianifica il tuo viaggio" non la usa
// più: parte da partenza/arrivo già scelti nel form, vedi
// generaPianoStrutturato sotto.
async function interpretaTappe(testo) {
  const { estrazione } = await chiamaFunzione("interpreta-richiesta-viaggio", { testo });

  const tappe = (
    await Promise.all(
      estrazione.tappe.map(async (nome) => {
        const posizione = await geocodificaOCoordinate(nome);
        return posizione ? { nome, lat: posizione.lat, lng: posizione.lng } : null;
      })
    )
  ).filter(Boolean);

  if (tappe.length === 0) {
    const elenco = estrazione.tappe.join(", ");
    throw new Error(`Non sono riuscito a trovare "${elenco}" sulla mappa: provare con nomi più precisi.`);
  }

  return { tappe, giorni: estrazione.giorni, interessi: estrazione.interessi };
}

// Form a campi di "Pianifica il tuo viaggio" (partenza/arrivo già scelti
// dai suggerimenti, con lat/lng pronte): salta interpreta-richiesta-viaggio
// (serve solo a capire una frase libera, qui non c'è) e chiama direttamente
// genera-itinerario-ia, passando "verificaQuota" perché il controllo del
// limite giornaliero (altrimenti fatto da interpreta-richiesta-viaggio) non
// è stato ancora fatto per questa richiesta.
export async function generaPianoStrutturato({ partenza, arrivo, giorni, preferenzaDormire, mostraLuoghiInteresse }) {
  const richiesta = `Da ${partenza.nome} a ${arrivo.nome} in ${giorni} giorn${giorni === 1 ? "o" : "i"}`;
  const tappeNominate = [
    { nome: partenza.nome, lat: partenza.lat, lng: partenza.lng },
    { nome: arrivo.nome, lat: arrivo.lat, lng: arrivo.lng },
  ];
  const tappe = await aggiungiTappeIntermedie(tappeNominate, giorni);
  const { piano } = await chiamaFunzione("genera-itinerario-ia", {
    testo: richiesta,
    tappe,
    giorni,
    interessi: [],
    preferenzaDormire,
    mostraLuoghiInteresse,
    verificaQuota: true,
  });
  return { piano, richiesta };
}

// "Creami un percorso" (MappaScreen.js): il percorso stradale vero (tappe
// nominate + tappe intermedie reali, vedi percorsoStradale.js) da disegnare
// sopra la mappa già filtrata, più il piano giorno per giorno (dove dormire
// e cosa visitare/i sentieri nei dintorni) — prima disegnava solo la
// strada, ignorando i giorni come pianificazione, segnalato dall'utente.
// Una sola interpreta-richiesta-viaggio (quota giornaliera, vedi sopra),
// non due: il piano riusa le stesse tappe già geocodificate per il
// percorso. Se il piano fallisce (o non ci sono schede vicine), il
// percorso resta comunque creato: non blocca "Crea" come sul sito.
export async function creaPercorso(testo) {
  const { tappe: tappeNominate, giorni, interessi } = await interpretaTappe(testo);
  const tappe = await aggiungiTappeIntermedie(tappeNominate, giorni);
  const percorso = tappe.length >= 2 ? await percorsoStradale(tappe) : null;
  if (!percorso) {
    throw new Error("Non sono riuscito a disegnare un percorso stradale tra queste tappe: provare con tappe più vicine o più precise.");
  }
  let piano = null;
  try {
    const risultatoPiano = await chiamaFunzione("genera-itinerario-ia", { testo, tappe, giorni, interessi });
    piano = risultatoPiano.piano;
  } catch {
    piano = null;
  }
  return { tappe, percorso, piano };
}
