import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

// Lato gestore dell'app ("La mia struttura"): stesse tabelle, stesso bucket
// "fotografie" e stesse convenzioni di percorso del pannello host del sito
// (src/HostArea.jsx nel repo campergo, modulo "Modifica dati del campeggio"),
// così una foto caricata dal telefono è identica a una caricata dal sito.
// Nessuna regola nuova sul database: valgono la policy "Host possono
// aggiornare il proprio campeggio" (owner_id = utente) e quella dello
// storage (prima cartella del percorso = id utente).

// Stessi limiti del sito (MAX_FOTO_CHI_SIAMO in HostArea.jsx).
export const MASSIMO_FOTO_GALLERIA = 10;
// Stessi valori di comprimiImmagine() del sito (src/fileHelpers.js).
const LATO_MASSIMO_FOTO = 1600;
const QUALITA_FOTO = 0.82;
const CACHE_CONTROL_FOTO = "604800";

const COLONNE_STRUTTURA =
  "id, owner_id, nome, localita, tipo_struttura, tipo_host, stato, descrizione, telefono, sito_web, prezzo, foto_url, foto_generica, chi_siamo_foto";

// La struttura del gestore collegato, oppure null se l'account non ne ha
// una (un cliente normale): è questo che decide se mostrare la voce
// "La mia struttura" nel Profilo. Oggi ogni gestore ha una sola scheda;
// se un giorno ne avesse più d'una si prende la più vecchia, come farebbe
// il sito, invece di andare in errore.
export async function caricaMiaStruttura(utenteId) {
  if (!utenteId) return null;
  const { data, error } = await supabase
    .from("campeggi")
    .select(COLONNE_STRUTTURA)
    .eq("owner_id", utenteId)
    .order("id", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

// Le foto del telefono arrivano a 3-10 MB: prima di caricarle si riducono
// al lato lungo di 1600 px in JPEG, come fa il sito. Serve soprattutto in
// campeggio, dove la rete è spesso debole.
async function preparaFoto(asset) {
  const contesto = ImageManipulator.manipulate(asset.uri);
  const larghezza = asset.width || 0;
  const altezza = asset.height || 0;
  if (Math.max(larghezza, altezza) > LATO_MASSIMO_FOTO) {
    contesto.resize(larghezza >= altezza ? { width: LATO_MASSIMO_FOTO } : { height: LATO_MASSIMO_FOTO });
  }
  const immagine = await contesto.renderAsync();
  const risultato = await immagine.saveAsync({ format: SaveFormat.JPEG, compress: QUALITA_FOTO, base64: true });
  if (!risultato.base64) throw new Error("foto vuota");
  return risultato.base64;
}

async function caricaFotoNelBucket(utenteId, prefisso, asset) {
  const base64 = await preparaFoto(asset);
  const percorso = `${utenteId}/${prefisso}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from("fotografie")
    .upload(percorso, decode(base64), { contentType: "image/jpeg", cacheControl: CACHE_CONTROL_FOTO });
  if (error) throw error;
  return supabase.storage.from("fotografie").getPublicUrl(percorso).data.publicUrl;
}

// Foto principale della scheda: sostituisce quella attuale (anche quella
// illustrativa messa da noi, per questo foto_generica torna false).
export async function sostituisciFotoPrincipale(struttura, asset) {
  const url = await caricaFotoNelBucket(struttura.owner_id, "campeggio", asset);
  const { error } = await supabase.from("campeggi").update({ foto_url: url, foto_generica: false }).eq("id", struttura.id);
  if (error) throw error;
  return url;
}

// Galleria "Chi siamo". Prima di aggiungere o togliere si rilegge l'elenco
// dal database: se nel frattempo il gestore ha cambiato la galleria dal
// sito, quelle modifiche non vengono sovrascritte.
async function leggiGalleria(strutturaId) {
  const { data, error } = await supabase.from("campeggi").select("chi_siamo_foto").eq("id", strutturaId).single();
  if (error) throw error;
  return data?.chi_siamo_foto ?? [];
}

export async function aggiungiFotoGalleria(struttura, asset) {
  const attuali = await leggiGalleria(struttura.id);
  if (attuali.length >= MASSIMO_FOTO_GALLERIA) {
    throw new Error(`La galleria ha già ${MASSIMO_FOTO_GALLERIA} foto, il massimo consentito.`);
  }
  const url = await caricaFotoNelBucket(struttura.owner_id, "chi-siamo", asset);
  const nuove = [...attuali, url];
  const { error } = await supabase.from("campeggi").update({ chi_siamo_foto: nuove }).eq("id", struttura.id);
  if (error) throw error;
  return nuove;
}

export async function togliFotoGalleria(struttura, url) {
  const attuali = await leggiGalleria(struttura.id);
  const nuove = attuali.filter((u) => u !== url);
  const { error } = await supabase.from("campeggi").update({ chi_siamo_foto: nuove }).eq("id", struttura.id);
  if (error) throw error;
  return nuove;
}

// Dati base della vetrina. Nome e indirizzo restano sul sito: cambiarli
// fa ricalcolare la posizione sulla mappa, meglio farlo dal pannello completo.
export async function salvaDatiStruttura(struttura, { descrizione, telefono, sitoWeb, prezzo }) {
  const aggiornamento = {
    descrizione: descrizione.trim(),
    telefono: telefono.trim() || null,
    sito_web: sitoWeb.trim() || null,
    prezzo: prezzo ? Number(prezzo) : null,
  };
  const { error } = await supabase.from("campeggi").update(aggiornamento).eq("id", struttura.id);
  if (error) throw error;
  return aggiornamento;
}
