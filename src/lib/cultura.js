import { supabase } from "./supabase";
import { distanzaKm } from "./geo";

// Musei, Borghi e Attività locali vivono nella stessa tabella del sito
// `eventi_campeggio` (le "schede culturali" di CLAUDE.md), distinte dalla
// colonna `categoria` — verificato dal vivo: 540 musei, 526 borghi, 1151
// attività, 10 eventi approvati. "Eventi" non ha una tessera propria
// nell'hub (richiesta solo musei/borghi/attività), ma compare comunque fra
// "Cosa visitare nei dintorni" di una struttura — stessa logica del sito.
export const CATEGORIA_CULTURALE_META = {
  musei: { etichetta: "Musei", etichettaSingolare: "Museo", icona: "color-palette-outline", colore: "#7c3aed" },
  borghi: { etichetta: "Borghi", etichettaSingolare: "Borgo", icona: "business-outline", colore: "#b45309" },
  attivita: { etichetta: "Attività locali", etichettaSingolare: "Attività", icona: "compass-outline", colore: "#0891b2" },
  eventi: { etichetta: "Eventi", etichettaSingolare: "Evento", icona: "calendar-outline", colore: "#dc2626" },
};

// Stesso raggio del sito (RAGGIO_CULTURA_STRUTTURA_KM in App.jsx).
const RAGGIO_CULTURA_STRUTTURA_KM = 50;

const COLONNE_CULTURA =
  "id, titolo, descrizione, categoria, regione, citta, foto_url, foto_generica, lat, lng, orari, giorni_apertura, sito_web, link_biglietti, data_ora";

function normalizzaSchedaCulturale(e) {
  return {
    id: e.id,
    titolo: e.titolo,
    descrizione: e.descrizione,
    categoria: e.categoria,
    regione: e.regione,
    citta: e.citta,
    fotoUrl: e.foto_url || null,
    lat: e.lat != null ? Number(e.lat) : null,
    lng: e.lng != null ? Number(e.lng) : null,
    orari: e.orari,
    giorniApertura: e.giorni_apertura,
    sitoWeb: e.sito_web,
    linkBiglietti: e.link_biglietti,
    dataOra: e.data_ora || null,
  };
}

// Stessa scala di rilevanza della ricerca testuale sul sito (risultatiCulturali
// in src/App.jsx, senza il livello "sottotipo/parole di categoria": qui la
// ricerca è già dentro una categoria scelta dall'hub, non serve): titolo
// identico, poi titolo che la contiene, poi città/regione, poi il resto.
function punteggioRicerca(scheda, termine) {
  const q = termine.trim().toLowerCase();
  const titolo = (scheda.titolo || "").toLowerCase();
  if (titolo === q) return 0;
  if (titolo.includes(q)) return 1;
  if ((scheda.citta || "").toLowerCase().includes(q) || (scheda.regione || "").toLowerCase().includes(q)) return 2;
  return 3;
}

// Limite di sicurezza: "attivita" da sola supera le 1000 righe (il massimo
// che Supabase restituisce in una pagina): senza una ricerca che restringa,
// mostriamo le prime 200 per città, come per le altre liste dell'app.
// Con una ricerca attiva, ordinare per città prima di tagliare a 200
// avrebbe potuto escludere del tutto una scheda con titolo identico al
// termine cercato, se c'erano più di 200 risultati e la sua città veniva
// alfabeticamente dopo: si prendono invece fino a 500 righe filtrate (ben
// sotto il limite di Supabase, margine ampio anche per un termine molto
// generico dentro una categoria), si ordinano per rilevanza come
// risultatiCulturali sul sito, poi si tagliano le prime 200 per mostrarne.
export async function caricaSchedeCulturali({ categoria, termine } = {}) {
  let query = supabase.from("eventi_campeggio").select(COLONNE_CULTURA).eq("stato", "approvato");
  if (categoria) query = query.eq("categoria", categoria);
  if (termine) {
    query = query.or(`titolo.ilike.%${termine}%,citta.ilike.%${termine}%,regione.ilike.%${termine}%`).limit(500);
  } else {
    query = query.order("citta", { ascending: true }).limit(200);
  }
  const { data, error } = await query;
  if (error) throw error;
  const schede = (data || []).map(normalizzaSchedaCulturale);
  if (!termine) return schede;
  return schede
    .sort((a, b) => punteggioRicerca(a, termine) - punteggioRicerca(b, termine) || (a.citta || "").localeCompare(b.citta || ""))
    .slice(0, 200);
}

export async function caricaSchedaCulturale(id) {
  const { data, error } = await supabase
    .from("eventi_campeggio")
    .select(COLONNE_CULTURA + ", indirizzo, note")
    .eq("id", id)
    .single();
  if (error) throw error;
  return normalizzaSchedaCulturale(data);
}

// Direzione "struttura -> cultura" (il cuore del sito, stessa logica di
// CulturaViciniStruttura in App.jsx): musei, borghi ed eventi entro 50 km
// da una struttura, più vicini prima. Tutti i musei/borghi/eventi hanno
// già lat/lng proprie (verificato dal vivo, nessuno manca), quindi basta
// un riquadro geografico, niente join con la struttura collegata — a
// differenza del sito non serve paginare (il riquadro resta sotto le 1000
// righe anche nelle zone più dense).
export async function caricaCulturaVicina({ lat, lng, escludiCampeggioId, limite = 6 } = {}) {
  if (lat == null || lng == null) return [];
  const deltaLat = RAGGIO_CULTURA_STRUTTURA_KM / 111;
  const deltaLng = RAGGIO_CULTURA_STRUTTURA_KM / (111 * Math.cos((lat * Math.PI) / 180) || 1);

  const { data, error } = await supabase
    .from("eventi_campeggio")
    .select(COLONNE_CULTURA + ", campeggio_id")
    .eq("stato", "approvato")
    .in("categoria", ["musei", "borghi", "eventi"])
    .gte("lat", lat - deltaLat)
    .lte("lat", lat + deltaLat)
    .gte("lng", lng - deltaLng)
    .lte("lng", lng + deltaLng)
    .limit(300);
  if (error) throw error;

  const ora = new Date();
  return (data || [])
    .filter((e) => e.campeggio_id !== escludiCampeggioId)
    .filter((e) => e.categoria !== "eventi" || new Date(e.data_ora) >= ora)
    .map((e) => ({ ...normalizzaSchedaCulturale(e), distanzaKm: distanzaKm(lat, lng, Number(e.lat), Number(e.lng)) }))
    .filter((e) => e.distanzaKm <= RAGGIO_CULTURA_STRUTTURA_KM)
    .sort((a, b) => a.distanzaKm - b.distanzaKm)
    .slice(0, limite);
}
