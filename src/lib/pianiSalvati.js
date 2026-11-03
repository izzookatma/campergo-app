// Piani di viaggio salvati (sezione Profilo, insieme a Preferiti, su
// richiesta esplicita): il piano intero (giorni/struttura/voci già
// risolti da genera-itinerario-ia) resta in una colonna jsonb, niente da
// rigenerare a ogni apertura.

import { supabase } from "./supabase";

export async function salvaPianoViaggio(utenteId, { richiesta, tappe, giorniRichiesti, piano }) {
  const { error } = await supabase.from("piani_viaggio_salvati").insert({
    utente_id: utenteId,
    richiesta,
    tappe,
    giorni_richiesti: giorniRichiesti,
    piano,
  });
  if (error) throw error;
}

export async function caricaPianiSalvati(utenteId) {
  if (!utenteId) return [];
  const { data, error } = await supabase
    .from("piani_viaggio_salvati")
    .select("id, richiesta, tappe, giorni_richiesti, piano, creato_il")
    .eq("utente_id", utenteId)
    .order("creato_il", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    richiesta: p.richiesta,
    tappe: p.tappe,
    giorniRichiesti: p.giorni_richiesti,
    piano: p.piano,
    creatoIl: p.creato_il,
  }));
}

export async function eliminaPianoSalvato(id) {
  const { error } = await supabase.from("piani_viaggio_salvati").delete().eq("id", id);
  if (error) throw error;
}
