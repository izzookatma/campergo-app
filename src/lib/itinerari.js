import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";
import { geocodificaOCoordinate } from "./geocodifica";

// Stesse etichette del sito (DIFFICOLTA_4X4_META, TIPO_VEICOLO_4X4_META,
// MODALITA_SENTIERO_META in src/App.jsx) — sentieri e percorsi 4x4 sono
// la stessa tabella `itinerari`, distinta dalla colonna `categoria`.
export const DIFFICOLTA_META = {
  facile: { etichetta: "Facile", colore: "#16a34a" },
  medio: { etichetta: "Medio", colore: "#ca8a04" },
  difficile: { etichetta: "Difficile", colore: "#ea580c" },
  estremo: { etichetta: "Estremo", colore: "#dc2626" },
};

// I sentieri non hanno "estremo" (solo i percorsi 4x4), stessa lista del
// sito (DIFFICOLTA_SENTIERO_CHIAVI in App.jsx).
export const DIFFICOLTA_SENTIERO_CHIAVI = ["facile", "medio", "difficile"];

export const TIPO_VEICOLO_META = {
  "4x4": { etichetta: "4x4", icona: "car-outline" },
  moto: { etichetta: "Moto", icona: "bicycle-outline" },
  entrambi: { etichetta: "4x4 e moto", icona: "navigate-outline" },
};

export const MODALITA_SENTIERO_META = {
  a_piedi: { etichetta: "A piedi", icona: "walk-outline" },
  bici: { etichetta: "In bici", icona: "bicycle-outline" },
  entrambi: { etichetta: "A piedi e in bici", icona: "navigate-outline" },
};

export const STATO_ITINERARIO_META = {
  in_attesa: { etichetta: "In attesa di approvazione", colore: "#ca8a04" },
  approvato: { etichetta: "Approvato", colore: "#16a34a" },
  rifiutato: { etichetta: "Non approvato", colore: "#dc2626" },
};

const COLONNE_ITINERARIO =
  "id, titolo, descrizione, categoria, difficolta, tipo_veicolo, modalita, lunghezza_km, dislivello_m, tempo_stimato, regione, creato_il, stato";

function normalizzaItinerario(it) {
  return {
    id: it.id,
    titolo: it.titolo,
    descrizione: it.descrizione,
    categoria: it.categoria,
    difficolta: it.difficolta,
    tipoVeicolo: it.tipo_veicolo,
    modalita: it.modalita,
    lunghezzaKm: it.lunghezza_km,
    dislivelloM: it.dislivello_m,
    tempoStimato: it.tempo_stimato,
    regione: it.regione,
    creatoIl: it.creato_il,
    stato: it.stato,
    fotoUrl: null,
    lat: null,
    lng: null,
  };
}

// La copertina e la posizione di ogni itinerario vengono dalla prima
// tappa (in ordine) con una foto / con una posizione. Le tappe "struttura"
// non hanno lat/lng proprie: vanno prese dalla struttura collegata con un
// join su campeggi_pubblici, altrimenti una tappa "struttura" in prima
// posizione verrebbe scartata e si prenderebbe per errore la tappa dopo —
// stessa logica del sito (ItinerarioDettaglio.jsx).
function posizioneTappa(t) {
  if (t.tipo === "struttura") {
    return t.campeggi?.lat != null && t.campeggi?.lng != null
      ? { lat: Number(t.campeggi.lat), lng: Number(t.campeggi.lng) }
      : null;
  }
  return t.lat != null && t.lng != null ? { lat: Number(t.lat), lng: Number(t.lng) } : null;
}

async function arricchisciConTappe(itinerari) {
  if (itinerari.length === 0) return itinerari;
  const ids = itinerari.map((it) => it.id);
  const { data: tappe, error } = await supabase
    .from("itinerario_tappe")
    .select("itinerario_id, ordine, foto, tipo, lat, lng, campeggi(lat, lng)")
    .in("itinerario_id", ids)
    .order("ordine", { ascending: true });
  if (error) throw error;

  const copertine = {};
  const posizioni = {};
  for (const t of tappe || []) {
    if (!(t.itinerario_id in copertine) && t.foto?.length > 0) copertine[t.itinerario_id] = t.foto[0];
    const pos = posizioneTappa(t);
    if (!(t.itinerario_id in posizioni) && pos) posizioni[t.itinerario_id] = pos;
  }

  return itinerari.map((it) => ({
    ...it,
    fotoUrl: copertine[it.id] || null,
    lat: posizioni[it.id]?.lat ?? null,
    lng: posizioni[it.id]?.lng ?? null,
  }));
}

export async function caricaSentieri({ modalita } = {}) {
  let query = supabase.from("itinerari").select(COLONNE_ITINERARIO).eq("stato", "approvato").eq("categoria", "sentiero");
  if (modalita) query = query.or(`modalita.eq.${modalita},modalita.eq.entrambi`);
  const { data, error } = await query.order("creato_il", { ascending: false });
  if (error) throw error;
  return arricchisciConTappe((data || []).map(normalizzaItinerario));
}

export async function caricaPercorsi4x4({ difficolta } = {}) {
  let query = supabase.from("itinerari").select(COLONNE_ITINERARIO).eq("stato", "approvato").eq("categoria", "percorso_4x4");
  if (difficolta) query = query.eq("difficolta", difficolta);
  const { data, error } = await query.order("creato_il", { ascending: false });
  if (error) throw error;
  return arricchisciConTappe((data || []).map(normalizzaItinerario));
}

export async function caricaItinerarioDettaglio(id) {
  const [itinerarioRes, tappeRes] = await Promise.all([
    supabase.from("itinerari").select(COLONNE_ITINERARIO).eq("id", id).single(),
    supabase
      .from("itinerario_tappe")
      .select("id, ordine, tipo, nome, descrizione, foto, lat, lng, campeggio_id, campeggi(nome, localita, lat, lng)")
      .eq("itinerario_id", id)
      .order("ordine", { ascending: true }),
  ]);
  if (itinerarioRes.error) throw itinerarioRes.error;
  if (tappeRes.error) throw tappeRes.error;

  const itinerario = normalizzaItinerario(itinerarioRes.data);

  // Tappa normalizzata: nome e posizione risolti anche per le tappe
  // "struttura" (prese dalla struttura collegata, non dalla tappa stessa).
  const tappe = (tappeRes.data || []).map((t) => {
    const pos = posizioneTappa(t);
    return {
      id: t.id,
      ordine: t.ordine,
      tipo: t.tipo,
      nome: t.tipo === "struttura" ? t.campeggi?.nome || t.nome : t.nome,
      descrizione: t.descrizione,
      foto: t.foto || [],
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      localitaStruttura: t.tipo === "struttura" ? t.campeggi?.localita || null : null,
    };
  });

  const primaConFoto = (tappeRes.data || []).find((t) => t.foto?.length > 0);
  const primaConPosizione = tappe.find((t) => t.lat != null && t.lng != null);
  itinerario.fotoUrl = primaConFoto?.foto[0] || null;
  itinerario.lat = primaConPosizione?.lat ?? null;
  itinerario.lng = primaConPosizione?.lng ?? null;

  return { itinerario, tappe };
}

// --- Creazione di un itinerario/sentiero/percorso 4x4 (stessa logica di
// ModuloCreaItinerario in AccountArea.jsx sul sito) ---------------------

export const MAX_FOTO_TAPPA_ITINERARIO = 5;

export function nuovaTappaVuota() {
  return { tipo: "struttura", campeggioId: null, nome: "", luogo: "", descrizione: "", foto: [] };
}

// Ricerca leggera per la tappa "Struttura esistente": solo campeggi_pubblici
// (come sul sito), per nome, non tutte le migliaia di righe in memoria.
export async function cercaCampeggiPerNome(termine) {
  if (!termine?.trim()) return [];
  const { data, error } = await supabase
    .from("campeggi_pubblici")
    .select("id, nome, localita")
    .ilike("nome", `%${termine.trim()}%`)
    .limit(15);
  if (error) throw error;
  return data || [];
}

// Carica una foto scelta dal rullino sullo stesso bucket pubblico
// "fotografie" usato dal sito e dal Mercatino dell'app, stessa convenzione
// di percorso ({autoreId}/itinerario-...).
async function caricaFotoTappa(autoreId, uri) {
  const estensione = (uri.split(".").pop() || "jpg").split("?")[0].toLowerCase();
  const percorso = `${autoreId}/itinerario-tappa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${estensione}`;
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const tipoMime = estensione === "png" ? "image/png" : "image/jpeg";

  const { error } = await supabase.storage.from("fotografie").upload(percorso, decode(base64), { contentType: tipoMime });
  if (error) throw error;

  return supabase.storage.from("fotografie").getPublicUrl(percorso).data.publicUrl;
}

export async function creaItinerario({
  autoreId,
  nomeAutore,
  categoria,
  titolo,
  descrizione,
  difficolta,
  tipoVeicolo,
  tempoStimato,
  regione,
  modalita,
  lunghezzaKm,
  dislivelloM,
  tappe,
}) {
  const eSentiero = categoria === "sentiero";
  const ePercorso4x4 = categoria === "percorso_4x4";
  const eTracciato = eSentiero || ePercorso4x4;

  const { data: itinerario, error: erroreItinerario } = await supabase
    .from("itinerari")
    .insert({
      autore_id: autoreId,
      nome_autore: nomeAutore,
      prenotazione_id: null,
      titolo: titolo.trim(),
      descrizione: descrizione.trim(),
      categoria,
      difficolta: eTracciato ? difficolta : null,
      tipo_veicolo: ePercorso4x4 ? tipoVeicolo : null,
      tempo_stimato: eTracciato ? tempoStimato?.trim() || null : null,
      regione: eTracciato ? regione : null,
      ...(eSentiero ? { modalita, lunghezza_km: lunghezzaKm, dislivello_m: dislivelloM } : {}),
    })
    .select()
    .single();
  if (erroreItinerario) throw erroreItinerario;

  for (let i = 0; i < tappe.length; i++) {
    const t = tappe[i];
    const fotoUrls = [];
    for (const uri of t.foto) {
      fotoUrls.push(await caricaFotoTappa(autoreId, uri));
    }

    let coordinate = null;
    if (t.tipo === "punto_interesse" && t.luogo?.trim()) {
      coordinate = await geocodificaOCoordinate(t.luogo.trim());
    }

    const { error: erroreTappa } = await supabase.from("itinerario_tappe").insert({
      itinerario_id: itinerario.id,
      ordine: i,
      tipo: t.tipo,
      campeggio_id: t.tipo === "struttura" ? t.campeggioId : null,
      nome: t.tipo === "punto_interesse" ? t.nome.trim() : null,
      descrizione: t.descrizione.trim(),
      foto: fotoUrls,
      ...(coordinate ? { lat: coordinate.lat, lng: coordinate.lng } : {}),
    });
    if (erroreTappa) throw erroreTappa;
  }

  return itinerario;
}
