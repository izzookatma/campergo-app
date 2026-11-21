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
