import { supabase } from "./supabase";
import { COLONNE_CAMPEGGIO, normalizzaCampeggio } from "./strutture";

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
  const { data: righe } = await supabase.from("preferiti").select("campeggio_id").eq("utente_id", utenteId).eq("tipo", "campeggio");
  const ids = (righe ?? []).map((r) => r.campeggio_id);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("campeggi_pubblici").select(COLONNE_CAMPEGGIO).in("id", ids);
  return (data ?? []).map(normalizzaCampeggio);
}
