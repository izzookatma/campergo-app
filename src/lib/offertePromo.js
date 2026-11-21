import { supabase } from "./supabase";

// Offerte promo degli host (stessa tabella e stesse regole del sito, vedi
// src/offertePromo.js nel repo campergo). L'app le mostra e le spiega; il
// calcolo del prezzo e il controllo restano al sito/server.

const GIORNI = { 0: "dom", 1: "lun", 2: "mar", 3: "mer", 4: "gio", 5: "ven", 6: "sab" };
const haGiorno = (v) => v !== null && v !== undefined && v !== "";

export async function caricaOffertePromo(campeggioId) {
  const oggi = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("offerte_promo")
    .select("*")
    .eq("campeggio_id", campeggioId)
    .eq("attiva", true)
    .gte("data_fine", oggi)
    .order("creato_il");
  if (error) throw error;
  return data || [];
}

// "arrivo ven, partenza lun · min. 3 notti" oppure "qualsiasi giorno"
export function descriviRegola(o) {
  const parti = [];
  if (haGiorno(o.giorno_arrivo)) parti.push(`arrivo ${GIORNI[o.giorno_arrivo]}`);
  if (haGiorno(o.giorno_partenza)) parti.push(`partenza ${GIORNI[o.giorno_partenza]}`);
  if (Number(o.notti_minime) > 1) parti.push(`min. ${o.notti_minime} notti`);
  return parti.length ? parti.join(", ") : "qualsiasi giorno";
}

export function offertaVale(o, unita) {
  if (!o?.attiva || !unita) return false;
  if (o.ambito === "tutte") return true;
  if (o.ambito === "piazzole") return unita.tipo !== "alloggio";
  if (o.ambito === "alloggi") return unita.tipo === "alloggio";
  if (o.ambito === "unita") return o.piazzola_id === unita.id;
  return false;
}

export const etichettaSconto = (o) =>
  o.tipo_prezzo === "percentuale" ? `−${Number(o.sconto_percentuale)}%` : `€${Number(o.prezzo_notte)}`;

export const dataBreve = (iso) => iso.split("-").reverse().join("/");

export function perChiVale(o, piazzole) {
  if (o.ambito === "tutte") return "Tutte le unità";
  if (o.ambito === "piazzole") return "Tutte le piazzole";
  if (o.ambito === "alloggi") return "Tutti gli alloggi";
  const u = piazzole.find((p) => p.id === o.piazzola_id);
  return u ? `${u.tipo === "alloggio" ? "Alloggio" : "Piazzola"}${u.numero ? ` ${u.numero}` : ""}` : "Una unità";
}

// ---------------------------------------------------------------------------
// Prezzo con sconto (barrato + nuovo), come sul sito: ogni unità ha un
// prezzo "pieno" di riferimento = prezzo base, oppure il più basso tra i
// periodi stagionali non ancora scaduti (stessa regola di prezzoRiferimento
// nella scheda del sito). Vale l'offerta che fa pagare di meno.
// ---------------------------------------------------------------------------

export function prezzoConSconto(prezzo, percentuale) {
  const centesimi = Math.round(Number(prezzo) * 100);
  return Math.floor((centesimi * (100 - Number(percentuale)) + 50) / 100) / 100;
}

export function prezzoRiferimento(unita, periodi, oggiIso) {
  if (unita.prezzo != null && Number(unita.prezzo) > 0) return Number(unita.prezzo);
  const validi = (periodi || [])
    .filter((p) => p.piazzola_id === unita.id && !p.chiuso && p.prezzo_notte != null && p.data_fine >= oggiIso)
    .map((p) => Number(p.prezzo_notte))
    .filter((n) => n > 0);
  return validi.length ? Math.min(...validi) : null;
}

// { offerta, pieno, scontato } dell'offerta più conveniente per l'unità, o null.
export function miglioreOffertaUnita(unita, periodi, offerte, oggiIso) {
  const pieno = prezzoRiferimento(unita, periodi, oggiIso);
  if (!pieno) return null;
  let migliore = null;
  for (const o of offerte) {
    if (!offertaVale(o, unita)) continue;
    const scontato = o.tipo_prezzo === "percentuale" ? prezzoConSconto(pieno, o.sconto_percentuale) : Number(o.prezzo_notte);
    if (!(scontato < pieno)) continue;
    if (!migliore || scontato < migliore.scontato) migliore = { offerta: o, pieno, scontato };
  }
  return migliore;
}

// Per la card/intestazione: l'unità con il prezzo scontato più basso.
export function miglioreOffertaStruttura(piazzole, periodi, offerte) {
  const oggi = new Date().toISOString().slice(0, 10);
  let migliore = null;
  for (const u of piazzole) {
    const r = miglioreOffertaUnita(u, periodi, offerte, oggi);
    if (r && (!migliore || r.scontato < migliore.scontato)) migliore = r;
  }
  return migliore;
}

const cachePromo = new Map();

// Carica (una volta sola per struttura) offerte, unità e periodi di più
// strutture insieme e restituisce { [campeggioId]: miglioreOfferta|null }.
export async function caricaPromoStrutture(ids) {
  const mancanti = ids.filter((id) => !cachePromo.has(id));
  if (mancanti.length) {
    const oggi = new Date().toISOString().slice(0, 10);
    const [of, pz, pe] = await Promise.all([
      supabase.from("offerte_promo").select("*").in("campeggio_id", mancanti).eq("attiva", true).gte("data_fine", oggi),
      supabase.from("piazzole_pubbliche").select("id, campeggio_id, tipo, prezzo").in("campeggio_id", mancanti),
      supabase.from("periodi_piazzola").select("piazzola_id, campeggio_id, prezzo_notte, data_fine, chiuso").in("campeggio_id", mancanti),
    ]);
    if (of.error) throw of.error;
    for (const id of mancanti) {
      const offerte = (of.data || []).filter((o) => o.campeggio_id === id);
      const unita = (pz.data || []).filter((p) => p.campeggio_id === id);
      const periodi = (pe.data || []).filter((p) => p.campeggio_id === id);
      cachePromo.set(id, offerte.length ? miglioreOffertaStruttura(unita, periodi, offerte) : null);
    }
  }
  return Object.fromEntries(ids.map((id) => [id, cachePromo.get(id) || null]));
}

export async function caricaPeriodiStruttura(campeggioId) {
  const { data, error } = await supabase
    .from("periodi_piazzola")
    .select("piazzola_id, prezzo_notte, data_fine, chiuso")
    .eq("campeggio_id", campeggioId);
  if (error) throw error;
  return data || [];
}
