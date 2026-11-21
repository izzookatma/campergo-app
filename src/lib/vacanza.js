// "Crea la tua vacanza": il viaggio lo compone chi lo fa, giorno per giorno
// (posti da vedere in ordine, dove dormire, data, appunti liberi) e l'app
// calcola le distanze vere tra i posti NELL'ORDINE scelto (percorsoConTratte).
// Qui solo i dati e i conti, senza schermo.

import { dataDaIso, isoDaData } from "./periodo";

export function giornoVuoto(numero) {
  return { numero, appunti: "", luoghi: [], dormire: null };
}

export function nuovaVacanza() {
  return { titolo: "", appuntiViaggio: "", dataInizio: null, partenza: null, giorni: [giornoVuoto(1)] };
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
  return punti;
}

// Chiave stabile dell'elenco di punti: cambia solo se cambiano posti o
// ordine, quindi il calcolo delle distanze riparte solo allora (non a ogni
// lettera scritta negli appunti).
export function firmaPunti(punti) {
  return punti.map((p) => `${p.luogo.lat.toFixed(5)},${p.luogo.lng.toFixed(5)}`).join("|");
}

// Tratto che ARRIVA al punto k (dal punto precedente): tratte[k-1].
// Somma per giorno dei tratti che arrivano ai punti di quel giorno.
export function totaliPerGiorno(punti, tratte) {
  const totali = {};
  if (!tratte) return totali;
  punti.forEach((p, k) => {
    if (k === 0 || !tratte[k - 1]) return;
    const t = totali[p.giorno] || { km: 0, minuti: 0 };
    t.km += tratte[k - 1].km;
    t.minuti += tratte[k - 1].minuti;
    totali[p.giorno] = t;
  });
  return totali;
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
