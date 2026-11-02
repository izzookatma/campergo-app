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
// interessi: primo passo condiviso da generaItinerarioIA qui sotto (un
// piano giorno per giorno) e da creaPercorso (solo il percorso stradale,
// per "Creami un percorso" nella schermata Mappa).
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

export async function generaItinerarioIA(testo) {
  const { tappe, giorni, interessi } = await interpretaTappe(testo);
  const { piano } = await chiamaFunzione("genera-itinerario-ia", { testo, tappe, giorni, interessi });
  return piano;
}

// "Creami un percorso" (MappaScreen.js): solo il percorso stradale vero
// (tappe nominate + tappe intermedie reali, vedi percorsoStradale.js) da
// disegnare sopra la mappa già filtrata — non un piano giorno per giorno
// come generaItinerarioIA sopra.
export async function creaPercorso(testo) {
  const { tappe: tappeNominate, giorni } = await interpretaTappe(testo);
  const tappe = await aggiungiTappeIntermedie(tappeNominate, giorni);
  const percorso = tappe.length >= 2 ? await percorsoStradale(tappe) : null;
  if (!percorso) {
    throw new Error("Non sono riuscito a disegnare un percorso stradale tra queste tappe: provare con tappe più vicine o più precise.");
  }
  return { tappe, percorso };
}
