import { supabase } from "./supabase";
import { COLONNE_CAMPEGGIO, COLONNE_RIFUGIO, normalizzaCampeggio, normalizzaRifugio } from "./strutture";
import { COLONNE_CULTURA, normalizzaSchedaCulturale } from "./cultura";
import { distanzaKm, ordinaPerVicinanza, filtraEOrdinaPerTesto } from "./ricercaPosti";

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
const comeRifugio = (r) => ({ ...normalizzaRifugio(r), zonaTuristica: r.gruppo_montuoso || "" });

// Strutture NaturaGo vicine al punto (la zona), dalla più vicina; se nel
// raggio ce ne sono poche, si allarga una volta.
export async function strutturePressoPunto(centro, { raggioKm = 25, minimo = 6, limite = 40 } = {}) {
  for (const r of [raggioKm, raggioKm * 2.4]) {
    const b = riquadro(centro, r);
    const [{ data, error }, { data: rifugi }] = await Promise.all([
      supabase
        .from("campeggi_pubblici")
        .select(`${COLONNE_CAMPEGGIO}, zona_turistica`)
        .gte("lat", b.sud)
        .lte("lat", b.nord)
        .gte("lng", b.ovest)
        .lte("lng", b.est)
        .limit(400),
      supabase
        .from("rifugi")
        .select(COLONNE_RIFUGIO)
        .eq("stato", "approvato")
        .gte("lat", b.sud)
        .lte("lat", b.nord)
        .gte("lng", b.ovest)
        .lte("lng", b.est)
        .limit(100),
    ]);
    if (error) throw error;
    const tutte = [...(data || []).map(comeStruttura), ...(rifugi || []).map(comeRifugio)];
    const vicine = ordinaPerVicinanza(tutte, centro, r, (s) => s).slice(0, limite);
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
  let qr = supabase.from("rifugi").select(COLONNE_RIFUGIO).eq("stato", "approvato").not("lat", "is", null);
  for (const p of parole) qr = qr.or(`nome.ilike.%${p}%,comune.ilike.%${p}%,gruppo_montuoso.ilike.%${p}%`);
  const [{ data, error }, { data: rifugi }] = await Promise.all([q.limit(200), qr.limit(60)]);
  if (error) throw error;
  const tutte = [...(data || []).map(comeStruttura), ...(rifugi || []).map(comeRifugio)];
  return filtraEOrdinaPerTesto(tutte, termine, centro, (s) => ({ nome: s.nome, localita: s.localita, zona: s.zonaTuristica, lat: s.lat, lng: s.lng })).slice(0, limite);
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

// --- Sentieri, percorsi 4x4, soste libere, camper service ---------------------
// Stessa logica del sito (src/cercaPosti.js). Il punto di un itinerario è il
// suo INIZIO (la prima tappa con posizione): è lì che si lascia il camper.
const COLONNE_ITINERARIO = "id, titolo, categoria, modalita, difficolta, lunghezza_km, dislivello_m, regione";

function comeItinerario(it, tappa) {
  return {
    tipoLuogo: "itinerario",
    id: it.id,
    nome: it.titolo,
    localita: it.regione || "",
    zonaTuristica: "",
    categoria: it.categoria,
    modalita: it.modalita,
    lunghezzaKm: it.lunghezza_km,
    dislivelloM: it.dislivello_m,
    lat: tappa.lat,
    lng: tappa.lng,
  };
}

async function primeTappe(ids) {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("itinerario_tappe").select("itinerario_id, ordine, lat, lng").in("itinerario_id", ids).not("lat", "is", null).limit(6000);
  const prime = new Map();
  for (const t of data || []) {
    const attuale = prime.get(t.itinerario_id);
    if (!attuale || t.ordine < attuale.ordine) prime.set(t.itinerario_id, t);
  }
  return prime;
}

export async function itinerariPressoPunto(centro, { raggioKm = 40, minimo = 5, limite = 30 } = {}) {
  for (const r of [raggioKm, raggioKm * 2.2]) {
    const b = riquadro(centro, r);
    const { data: tappeVicine } = await supabase
      .from("itinerario_tappe")
      .select("itinerario_id")
      .not("lat", "is", null)
      .gte("lat", b.sud)
      .lte("lat", b.nord)
      .gte("lng", b.ovest)
      .lte("lng", b.est)
      .limit(2000);
    const ids = [...new Set((tappeVicine || []).map((t) => t.itinerario_id))].slice(0, 150);
    if (ids.length === 0 && r === raggioKm) continue;
    const { data: itinerari } = await supabase.from("itinerari").select(COLONNE_ITINERARIO).in("id", ids).eq("stato", "approvato");
    const prime = await primeTappe((itinerari || []).map((i) => i.id));
    const tutti = (itinerari || []).filter((i) => prime.has(i.id)).map((i) => comeItinerario(i, prime.get(i.id)));
    const vicini = ordinaPerVicinanza(tutti, centro, r * 1.6, (x) => x).slice(0, limite);
    if (vicini.length >= minimo || r !== raggioKm) return vicini;
  }
  return [];
}

export async function itinerariPerNome(termineGrezzo, centro, limite = 8) {
  const termine = pulisci(termineGrezzo);
  const parole = termine.split(" ").filter((p) => p.length >= 2);
  if (parole.length === 0) return [];
  let q = supabase.from("itinerari").select(COLONNE_ITINERARIO).eq("stato", "approvato");
  for (const p of parole) q = q.or(`titolo.ilike.%${p}%,regione.ilike.%${p}%`);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  const giusti = filtraEOrdinaPerTesto(data || [], termine, null, (i) => ({ nome: i.titolo, localita: i.regione, zona: "", lat: null, lng: null }));
  const prime = await primeTappe(giusti.map((i) => i.id));
  return giusti
    .filter((i) => prime.has(i.id))
    .map((i) => comeItinerario(i, prime.get(i.id)))
    .map((x) => ({ ...x, distanzaKm: centro ? distanzaKm(centro, { lat: Number(x.lat), lng: Number(x.lng) }) : null }))
    .slice(0, limite);
}

export async function sosteLiberePressoPunto(centro, { raggioKm = 30, limite = 12 } = {}) {
  const b = riquadro(centro, raggioKm);
  const { data } = await supabase
    .from("soste_libere_pubbliche")
    .select("id, titolo, regione, lat, lng")
    .gte("lat", b.sud)
    .lte("lat", b.nord)
    .gte("lng", b.ovest)
    .lte("lng", b.est)
    .limit(200);
  const tutte = (data || []).map((s) => ({ tipoLuogo: "sosta_libera", id: s.id, nome: s.titolo, localita: s.regione || "", lat: s.lat, lng: s.lng }));
  return ordinaPerVicinanza(tutte, centro, raggioKm, (x) => x).slice(0, limite);
}

export async function camperServicePressoPunto(centro, { raggioKm = 30, limite = 8 } = {}) {
  const b = riquadro(centro, raggioKm);
  const { data } = await supabase
    .from("camper_service_pubblici")
    .select("id, nome, comune, provincia, lat, lng")
    .gte("lat", b.sud)
    .lte("lat", b.nord)
    .gte("lng", b.ovest)
    .lte("lng", b.est)
    .limit(200);
  const tutti = (data || []).map((s) => ({
    tipoLuogo: "camper_service",
    id: s.id,
    nome: s.nome,
    localita: [s.comune, s.provincia].filter(Boolean).join(", "),
    lat: s.lat,
    lng: s.lng,
  }));
  return ordinaPerVicinanza(tutti, centro, raggioKm, (x) => x).slice(0, limite);
}
