import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

// Stesse categorie/stati del sito (src/Mercatino.jsx), stesso bucket
// "fotografie" e stessa convenzione di percorso per le foto, così le due
// app restano compatibili (stesse tabelle, stessa moderazione admin).
export const CATEGORIE_MERCATINO = {
  camper: "Camper in vendita",
  roulotte: "Roulotte in vendita",
  casette_mobili: "Casette mobili/bungalow in vendita",
  accessori: "Accessori",
  altro: "Altro",
};

export const STATO_PRODOTTO_META = {
  nuovo: "Nuovo",
  usato_come_nuovo: "Usato come nuovo",
  buone_condizioni: "Buone condizioni",
  usato: "Usato",
};

export async function caricaAnnunciApprovati({ categoria, citta } = {}) {
  let query = supabase.from("annunci_mercatino").select("*").eq("stato", "approvato").order("creato_il", { ascending: false });
  if (categoria) query = query.eq("categoria", categoria);
  if (citta) query = query.ilike("citta", `%${citta}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function caricaAnnuncio(id) {
  const { data, error } = await supabase.from("annunci_mercatino").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function caricaMieiAnnunci(utenteId) {
  const { data, error } = await supabase
    .from("annunci_mercatino")
    .select("*")
    .eq("venditore_id", utenteId)
    .order("creato_il", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Carica una foto scelta dal rullino (uri locale "file://...") sullo
// stesso bucket pubblico "fotografie" usato dal sito, stessa convenzione
// di percorso ({utenteId}/mercatino-...): le due app restano compatibili.
async function caricaFoto(utenteId, uri) {
  const estensione = (uri.split(".").pop() || "jpg").split("?")[0].toLowerCase();
  const percorso = `${utenteId}/mercatino-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${estensione}`;
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const tipoMime = estensione === "png" ? "image/png" : "image/jpeg";

  const { error } = await supabase.storage.from("fotografie").upload(percorso, decode(base64), { contentType: tipoMime });
  if (error) throw error;

  return supabase.storage.from("fotografie").getPublicUrl(percorso).data.publicUrl;
}

export async function pubblicaAnnuncio({ utenteId, nomeVenditore, foto, ...campi }) {
  const fotoUrls = [];
  for (const uri of foto) {
    fotoUrls.push(await caricaFoto(utenteId, uri));
  }

  const { data, error } = await supabase
    .from("annunci_mercatino")
    .insert({
      ...campi,
      foto_urls: fotoUrls,
      venditore_id: utenteId,
      nome_venditore: nomeVenditore,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function eliminaAnnuncio(id) {
  const { error } = await supabase.from("annunci_mercatino").delete().eq("id", id);
  if (error) throw error;
}

export async function segnaVendutoAnnuncio(id, venduto) {
  const { error } = await supabase.from("annunci_mercatino").update({ venduto }).eq("id", id);
  if (error) throw error;
}

// Messaggistica: una riga per messaggio, le conversazioni si calcolano
// lato app raggruppando per (annuncio, controparte) — stessa logica del
// sito, nessuna tabella "conversazioni" a parte.
export async function caricaConversazioni(utenteId) {
  const { data, error } = await supabase
    .from("messaggi_mercatino")
    .select("*, annunci_mercatino(id, titolo, foto_urls)")
    .or(`mittente_id.eq.${utenteId},destinatario_id.eq.${utenteId}`)
    .order("creato_il", { ascending: false });
  if (error) throw error;

  const conversazioni = new Map();
  for (const m of data || []) {
    const controparteId = m.mittente_id === utenteId ? m.destinatario_id : m.mittente_id;
    const chiave = `${m.annuncio_id}-${controparteId}`;
    if (!conversazioni.has(chiave)) {
      conversazioni.set(chiave, {
        chiave,
        annuncioId: m.annuncio_id,
        annuncioTitolo: m.annunci_mercatino?.titolo || "Annuncio",
        annuncioFoto: m.annunci_mercatino?.foto_urls?.[0] || null,
        controparteId,
        ultimoMessaggio: m.testo,
        ultimoMessaggioIl: m.creato_il,
        nonLetti: 0,
      });
    }
    const conv = conversazioni.get(chiave);
    if (m.destinatario_id === utenteId && !m.letto) conv.nonLetti += 1;
  }
  return Array.from(conversazioni.values());
}

export async function caricaMessaggi(annuncioId, controparteId, utenteId) {
  const { data, error } = await supabase
    .from("messaggi_mercatino")
    .select("*")
    .eq("annuncio_id", annuncioId)
    .or(
      `and(mittente_id.eq.${utenteId},destinatario_id.eq.${controparteId}),and(mittente_id.eq.${controparteId},destinatario_id.eq.${utenteId})`
    )
    .order("creato_il", { ascending: true });
  if (error) throw error;

  await supabase
    .from("messaggi_mercatino")
    .update({ letto: true })
    .eq("annuncio_id", annuncioId)
    .eq("mittente_id", controparteId)
    .eq("destinatario_id", utenteId)
    .eq("letto", false);

  return data || [];
}

export async function inviaMessaggio({ annuncioId, mittenteId, destinatarioId, nomeMittente, testo }) {
  const { error } = await supabase.from("messaggi_mercatino").insert({
    annuncio_id: annuncioId,
    mittente_id: mittenteId,
    destinatario_id: destinatarioId,
    nome_mittente: nomeMittente,
    testo,
  });
  if (error) throw error;
}
