import { supabase } from "./supabase";
import { COLONNE_CAMPEGGIO, ETICHETTE_TIPO, normalizzaCampeggio } from "./strutture";

// Eventi in programma della struttura (stesse due tabelle del sito: eventi
// organizzati dalla struttura e schede culturali legate al campeggio), già
// ordinati per data. Colonne esplicite: l'email non è leggibile dal pubblico.
export async function caricaEventiStruttura(campeggioId) {
  const adesso = new Date().toISOString();
  const [a, b] = await Promise.all([
    supabase
      .from("eventi_struttura")
      .select("id, titolo, descrizione, data_inizio, data_fine, gratuito, prezzo")
      .eq("campeggio_id", campeggioId)
      .eq("stato", "approvato")
      .gte("data_fine", adesso)
      .order("data_inizio"),
    supabase
      .from("eventi_campeggio")
      .select("id, titolo, descrizione, data_ora")
      .eq("campeggio_id", campeggioId)
      .eq("stato", "approvato")
      .gte("data_ora", adesso)
      .order("data_ora"),
  ]);
  if (a.error) throw a.error;
  const daStruttura = (a.data || []).map((e) => ({ ...e, inizio: e.data_inizio, fine: e.data_fine }));
  const culturali = (b.data || []).map((e) => ({ id: `c${e.id}`, titolo: e.titolo, descrizione: e.descrizione, inizio: e.data_ora, fine: null, gratuito: null, prezzo: null }));
  return [...daStruttura, ...culturali].sort((x, y) => String(x.inizio).localeCompare(String(y.inizio)));
}

// "Altre strutture" dello stesso tipo e della stessa regione (la regione è
// l'ultima parte di `localita`, es. "Marsala, Marsala e Stagnone, Sicilia").
export async function caricaStruttureSimili({ idOriginale, tipo, localita, limite = 8 }) {
  const regione = (localita || "").split(",").pop().trim();
  const chiaveTipo = Object.keys(ETICHETTE_TIPO).find((k) => ETICHETTE_TIPO[k] === tipo);
  if (!regione || !chiaveTipo) return [];
  const { data, error } = await supabase
    .from("campeggi_pubblici")
    .select(COLONNE_CAMPEGGIO)
    .is("seed", null)
    .eq("tipo_struttura", chiaveTipo)
    .ilike("localita", `%, ${regione}`)
    .neq("id", idOriginale)
    .not("foto_url", "is", null)
    .limit(limite);
  if (error) throw error;
  return (data || []).map(normalizzaCampeggio);
}
