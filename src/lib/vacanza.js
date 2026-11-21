// "Crea la tua vacanza": il viaggio lo compone chi lo fa, giorno per giorno
// (posti da vedere in ordine, dove dormire, data, appunti liberi) e l'app
// calcola le distanze vere tra i posti NELL'ORDINE scelto (percorsoConTratte).
// Qui solo i dati e i conti, senza schermo.

import { dataDaIso, etichettaData, isoDaData } from "./periodo";

export function giornoVuoto(numero) {
  return { numero, appunti: "", luoghi: [], dormire: null };
}

export function nuovaVacanza() {
  return { titolo: "", appuntiViaggio: "", dataInizio: null, partenza: null, arrivo: null, giorni: [giornoVuoto(1)] };
}

// Data del giorno N: partenza + (N-1) giorni ("YYYY-MM-DD", ora locale).
export function dataDelGiorno(dataInizio, numero) {
  if (!dataInizio) return null;
  const d = dataDaIso(dataInizio);
  d.setDate(d.getDate() + numero - 1);
  return isoDaData(d);
}

export function etichettaDataLunga(iso) {
  if (!iso) return "";
  return dataDaIso(iso).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

export function formattaTempo(minuti) {
  if (minuti == null) return "";
  const ore = Math.floor(minuti / 60);
  return ore > 0 ? `${ore} h ${String(minuti % 60).padStart(2, "0")} min` : `${minuti} min`;
}

export function formattaKm(km) {
  if (km == null) return "";
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}

// Tutti i punti del viaggio nell'ordine in cui si attraversano: per ogni
// giorno prima i posti da vedere, poi dove si dorme. Ogni punto sa a quale
// giorno appartiene e che posto è (indice nel giorno o "dormire").
export function sequenzaPunti(vacanza) {
  const punti = [];
  // La partenza è il punto da cui si parte, non una tappa del Giorno 1: il
  // Giorno 1 comincia dal primo ARRIVO, e il primo tratto (partenza → primo
  // arrivo) conta nel totale del Giorno 1.
  if (vacanza.partenza) punti.push({ giorno: 0, ruolo: "partenza", indice: null, luogo: vacanza.partenza });
  for (const g of vacanza.giorni) {
    g.luoghi.forEach((luogo, indice) => punti.push({ giorno: g.numero, ruolo: "visita", indice, luogo }));
    if (g.dormire) punti.push({ giorno: g.numero, ruolo: "dormire", indice: null, luogo: g.dormire });
  }
  // L'arrivo finale chiude il viaggio: ultimo punto, fuori dai giorni (il
  // tratto che ci porta lì è un "trasferimento", non parte di un giorno).
  if (vacanza.arrivo) punti.push({ giorno: vacanza.giorni.length + 1, ruolo: "arrivo", indice: null, luogo: vacanza.arrivo });
  return punti;
}

// Chiave stabile dell'elenco di punti: cambia solo se cambiano posti o
// ordine, quindi il calcolo delle distanze riparte solo allora (non a ogni
// lettera scritta negli appunti).
export function firmaPunti(punti) {
  return punti.map((p) => `${p.luogo.lat.toFixed(5)},${p.luogo.lng.toFixed(5)}`).join("|");
}

// Tratto che ARRIVA al punto k (dal punto precedente): tratte[k-1].
// - Se il punto precedente è dello stesso giorno, il tratto è "dentro" quel
//   giorno (giorni[n]: somma dei tratti della giornata).
// - Altrimenti è un TRASFERIMENTO tra un giorno e il successivo (o dalla
//   partenza al primo arrivo, o dall'ultimo giorno all'arrivo finale):
//   trasferimenti[n] = tratto che porta al primo punto del giorno n, e
//   trasferimenti.arrivo = tratto che porta all'arrivo finale.
export function totaliPerGiorno(punti, tratte) {
  const giorni = {};
  const trasferimenti = {};
  if (!tratte) return { giorni, trasferimenti };
  punti.forEach((p, k) => {
    if (k === 0 || !tratte[k - 1]) return;
    const tratto = tratte[k - 1];
    if (punti[k - 1].giorno === p.giorno) {
      const t = giorni[p.giorno] || { km: 0, minuti: 0 };
      t.km += tratto.km;
      t.minuti += tratto.minuti;
      giorni[p.giorno] = t;
    } else {
      trasferimenti[p.ruolo === "arrivo" ? "arrivo" : p.giorno] = tratto;
    }
  });
  return { giorni, trasferimenti };
}

// Forma salvata nella colonna jsonb "piano" (piani_viaggio_salvati). Il
// tipo "personale" la distingue dai piani generati dall'IA.
export function pianoDaVacanza(vacanza, totale) {
  return {
    tipo: "personale",
    titolo: vacanza.titolo,
    appuntiViaggio: vacanza.appuntiViaggio,
    dataInizio: vacanza.dataInizio,
    partenza: vacanza.partenza || null,
    arrivo: vacanza.arrivo || null,
    giorniRichiesti: vacanza.giorni.length,
    tappe: nomiTappe(vacanza),
    giorni: vacanza.giorni,
    totale: totale ? { km: Math.round(totale.km), minuti: totale.minuti } : null,
  };
}

export function vacanzaDaPiano(piano) {
  return {
    titolo: piano.titolo || "",
    appuntiViaggio: piano.appuntiViaggio || "",
    dataInizio: piano.dataInizio || null,
    partenza: piano.partenza || null,
    arrivo: piano.arrivo || null,
    giorni: (piano.giorni || []).map((g, i) => ({
      numero: i + 1,
      appunti: g.appunti || "",
      luoghi: g.luoghi || [],
      dormire: g.dormire || null,
    })),
  };
}

// Nomi dei posti, nell'ordine (per l'elenco "Roma → Siena → ...").
export function nomiTappe(vacanza) {
  return sequenzaPunti(vacanza).map((p) => p.luogo.nome);
}

export function eVacanzaPersonale(piano) {
  return piano?.tipo === "personale";
}

// "12 lug – 15 lug 2027" per una vacanza con data di partenza; vuoto se
// la data non è stata scelta. Il giorno finale è partenza + giorni - 1.
export function intervalloDate(piano) {
  if (!piano?.dataInizio) return "";
  const giorni = piano.giorniRichiesti || piano.giorni?.length || 1;
  const fine = dataDelGiorno(piano.dataInizio, giorni);
  const anno = dataDaIso(fine).getFullYear();
  return giorni > 1 ? `${etichettaData(piano.dataInizio)} – ${etichettaData(fine)} ${anno}` : `${etichettaData(piano.dataInizio)} ${anno}`;
}

// --- Google Maps ---------------------------------------------------------
// Link per aprire Google Maps vicino a un punto, già con la ricerca giusta.
export function urlGoogleMaps(centro, ruolo) {
  const cosa = ruolo === "dormire" ? "campeggio area sosta camper" : "cosa visitare";
  const base = `https://www.google.com/maps/search/${encodeURIComponent(cosa)}`;
  return centro ? `${base}/@${centro.lat.toFixed(5)},${centro.lng.toFixed(5)},12z` : base;
}

// Da un link COMPLETO di Google Maps ricava nome e coordinate (null se non
// è un link di Google Maps o non ha coordinate).
export function leggiLinkGoogleMaps(testo) {
  const url = (testo || "").trim();
  if (!/^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(url)) return null;
  const numero = "(-?\\d+(?:\\.\\d+)?)";
  const m =
    url.match(new RegExp(`!3d${numero}!4d${numero}`)) ||
    url.match(new RegExp(`@${numero},${numero}`)) ||
    url.match(new RegExp(`[?&](?:q|query|ll|destination)=${numero}(?:,|%2C)${numero}`));
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const nomeGrezzo = url.match(/\/maps\/place\/([^/@?]+)/i)?.[1];
  let nome = "";
  try {
    nome = nomeGrezzo ? decodeURIComponent(nomeGrezzo.replace(/\+/g, " ")) : "";
  } catch {
    nome = nomeGrezzo ? nomeGrezzo.replace(/\+/g, " ") : "";
  }
  return { lat, lng, nome: nome || "Posto da Google Maps" };
}

// Come sopra, ma accetta anche i link abbreviati (maps.app.goo.gl,
// goo.gl/maps): sull'app si possono seguire (la richiesta arriva al link
// completo). Se non si riesce, null.
export async function risolviLinkGoogleMaps(testo) {
  const diretto = leggiLinkGoogleMaps(testo);
  if (diretto) return diretto;
  const url = (testo || "").trim();
  if (!/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(url)) return null;
  try {
    const risposta = await fetch(url);
    return leggiLinkGoogleMaps(risposta.url);
  } catch {
    return null;
  }
}
