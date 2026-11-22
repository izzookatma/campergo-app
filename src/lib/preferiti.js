import { supabase } from "./supabase";
import { COLONNE_CAMPEGGIO, normalizzaCampeggio } from "./strutture";
import { COLONNE_CULTURA, normalizzaSchedaCulturale } from "./cultura";

// Solo le strutture da campeggi_pubblici si possono salvare nei preferiti
// (stessa regola del sito: colonna campeggio_id, i rifugi non sono ancora
// favoritabili né sul sito né qui).
export function sipuoSalvare(struttura) {
  return struttura.origine === "campeggi_pubblici";
}

export async function caricaIdPreferiti(utenteId) {
  if (!utenteId) return new Set();
  const { data } = await supabase.from("preferiti").select("campeggio_id").eq("utente_id", utenteId).eq("tipo", "campeggio");
  return new Set((data ?? []).map((r) => r.campeggio_id));
}

export async function toggleFavorito(utenteId, idOriginale, presente) {
  if (presente) {
    const { error } = await supabase.from("preferiti").insert({ utente_id: utenteId, tipo: "campeggio", campeggio_id: idOriginale });
    return error;
  }
  const { error } = await supabase
    .from("preferiti")
    .delete()
    .eq("utente_id", utenteId)
    .eq("tipo", "campeggio")
    .eq("campeggio_id", idOriginale);
  return error;
}

export async function caricaStrutturePreferite(utenteId) {
  if (!utenteId) return [];
  const { data: righe, error: erroreRighe } = await supabase
    .from("preferiti")
    .select("campeggio_id")
    .eq("utente_id", utenteId)
    .eq("tipo", "campeggio");
  if (erroreRighe) throw erroreRighe;
  const ids = (righe ?? []).map((r) => r.campeggio_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("campeggi_pubblici").select(COLONNE_CAMPEGGIO).in("id", ids);
  if (error) throw error;
  return (data ?? []).map(normalizzaCampeggio);
}

// Schede culturali (musei, borghi, attività): stesso cuoricino del sito, tipo
// "evento" nella tabella `preferiti` (migrazione 190 del sito).
export async function eFavoritaScheda(utenteId, eventoId) {
  if (!utenteId) return false;
  const { data } = await supabase
    .from("preferiti")
    .select("evento_id")
    .eq("utente_id", utenteId)
    .eq("tipo", "evento")
    .eq("evento_id", eventoId)
    .limit(1);
  return (data ?? []).length > 0;
}

export async function impostaFavoritaScheda(utenteId, eventoId, favorita) {
  if (favorita) {
    const { error } = await supabase.from("preferiti").insert({ utente_id: utenteId, tipo: "evento", evento_id: eventoId });
    return error;
  }
  const { error } = await supabase.from("preferiti").delete().eq("utente_id", utenteId).eq("tipo", "evento").eq("evento_id", eventoId);
  return error;
}

export async function caricaSchedePreferite(utenteId) {
  if (!utenteId) return [];
  const { data: righe, error: erroreRighe } = await supabase
    .from("preferiti")
    .select("evento_id")
    .eq("utente_id", utenteId)
    .eq("tipo", "evento");
  if (erroreRighe) throw erroreRighe;
  const ids = (righe ?? []).map((r) => r.evento_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("eventi_campeggio").select(COLONNE_CULTURA).in("id", ids).eq("stato", "approvato");
  if (error) throw error;
  return (data ?? []).map(normalizzaSchedaCulturale);
}
