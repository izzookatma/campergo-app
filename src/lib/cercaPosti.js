import { supabase } from "./supabase";
import { COLONNE_CAMPEGGIO, normalizzaCampeggio } from "./strutture";
import { COLONNE_CULTURA, normalizzaSchedaCulturale } from "./cultura";
import { ordinaPerVicinanza, filtraEOrdinaPerTesto } from "./ricercaPosti";

// Accesso ai dati per la ricerca dei posti di "Crea la tua vacanza" (app):
// stessa logica e stesse query del sito (src/cercaPosti.js). Il risultato ha
// la forma che usano già le schede (normalizzaCampeggio / normalizzaSchedaCulturale)
// più distanzaKm quando c'è un punto di riferimento.
const CATEGORIE_CULTURA = ["musei", "borghi", "attivita"];

function pulisci(testo) {
  return testo.trim().replace(/[,(){}%]/g, " ").replace(/\s+/g, " ").trim();
}

function riquadro(centro, raggioKm) {
  const dLat = raggioKm / 111;
  const dLng = raggioKm / (111 * Math.cos((centro.lat * Math.PI) / 180) || 1);
  return { sud: centro.lat - dLat, nord: centro.lat + dLat, ovest: centro.lng - dLng, est: centro.lng + dLng };
}

const comeStruttura = (c) => ({ ...normalizzaCampeggio(c), zonaTuristica: c.zona_turistica });

// Strutture NaturaGo vicine al punto (la zona), dalla più vicina; se nel
// raggio ce ne sono poche, si allarga una volta.
export async function strutturePressoPunto(centro, { raggioKm = 25, minimo = 6, limite = 40 } = {}) {
  for (const r of [raggioKm, raggioKm * 2.4]) {
    const b = riquadro(centro, r);
    const { data, error } = await supabase
      .from("campeggi_pubblici")
      .select(`${COLONNE_CAMPEGGIO}, zona_turistica`)
      .gte("lat", b.sud)
      .lte("lat", b.nord)
      .gte("lng", b.ovest)
      .lte("lng", b.est)
      .limit(400);
    if (error) throw error;
    const vicine = ordinaPerVicinanza((data || []).map(comeStruttura), centro, r, (s) => s).slice(0, limite);
    if (vicine.length >= minimo || r !== raggioKm) return vicine;
  }
  return [];
}

export async function culturaPressoPunto(centro, { raggioKm = 30, minimo = 6, limite = 40 } = {}) {
  for (const r of [raggioKm, raggioKm * 2.4]) {
    const b = riquadro(centro, r);
    const { data, error } = await supabase
      .from("eventi_campeggio")
      .select(COLONNE_CULTURA)
      .eq("stato", "approvato")
      .in("categoria", CATEGORIE_CULTURA)
      .gte("lat", b.sud)
      .lte("lat", b.nord)
      .gte("lng", b.ovest)
      .lte("lng", b.est)
      .limit(400);
    if (error) throw error;
    const vicine = ordinaPerVicinanza((data || []).map(normalizzaSchedaCulturale), centro, r, (k) => k).slice(0, limite);
    if (vicine.length >= minimo || r !== raggioKm) return vicine;
  }
  return [];
}

// Strutture il cui nome o la cui località comincia con quello scritto
// ("lodi" non porta più "Piani di Clodia").
export async function struttureperNome(termineGrezzo, centro, limite = 8) {
  const termine = pulisci(termineGrezzo);
  const parole = termine.split(" ").filter((p) => p.length >= 2);
  if (parole.length === 0) return [];
  let q = supabase.from("campeggi_pubblici").select(`${COLONNE_CAMPEGGIO}, zona_turistica`).not("lat", "is", null);
  for (const p of parole) q = q.or(`nome.ilike.%${p}%,localita.ilike.%${p}%,zona_turistica.ilike.%${p}%`);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return filtraEOrdinaPerTesto((data || []).map(comeStruttura), termine, centro, (s) => ({ nome: s.nome, localita: s.localita, zona: s.zonaTuristica, lat: s.lat, lng: s.lng })).slice(0, limite);
}

export async function culturaPerNome(termineGrezzo, centro, limite = 8) {
  const termine = pulisci(termineGrezzo);
  const parole = termine.split(" ").filter((p) => p.length >= 2);
  if (parole.length === 0) return [];
  let q = supabase.from("eventi_campeggio").select(COLONNE_CULTURA).eq("stato", "approvato").in("categoria", CATEGORIE_CULTURA).not("lat", "is", null);
  for (const p of parole) q = q.or(`titolo.ilike.%${p}%,citta.ilike.%${p}%`);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return filtraEOrdinaPerTesto((data || []).map(normalizzaSchedaCulturale), termine, centro, (k) => ({ nome: k.titolo, localita: k.citta, zona: k.regione, lat: k.lat, lng: k.lng })).slice(0, limite);
}
