import { supabase } from "./supabase";

// Recensioni vere dei clienti (tabella `recensioni`, lettura pubblica,
// stessa query del sito): solo quelle generali sulla struttura (tipo
// "campeggio"), non quelle sulla singola piazzola.
export async function caricaRecensioni(campeggioId) {
  const { data, error } = await supabase
    .from("recensioni")
    .select("id, cliente_id, nome_cliente, testo, punteggio, foto_urls, creato_il")
    .eq("campeggio_id", campeggioId)
    .eq("tipo", "campeggio")
    .eq("rimossa", false)
    .order("creato_il", { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizzaRecensione);
}

// Recensioni su un sentiero/percorso 4x4/itinerario (tabella `recensioni`,
// tipo "itinerario", stessa logica delle recensioni sulle strutture).
export async function caricaRecensioniItinerario(itinerarioId) {
  const { data, error } = await supabase
    .from("recensioni")
    .select("id, cliente_id, nome_cliente, testo, punteggio, foto_urls, creato_il")
    .eq("itinerario_id", itinerarioId)
    .eq("tipo", "itinerario")
    .eq("rimossa", false)
    .order("creato_il", { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizzaRecensione);
}

// Recensioni su una scheda culturale (museo/borgo/attività — tabella
// `eventi_campeggio`), tipo "evento", stessa logica delle altre.
export async function caricaRecensioniEvento(eventoId) {
  const { data, error } = await supabase
    .from("recensioni")
    .select("id, cliente_id, nome_cliente, testo, punteggio, foto_urls, creato_il")
    .eq("evento_id", eventoId)
    .eq("tipo", "evento")
    .eq("rimossa", false)
    .order("creato_il", { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizzaRecensione);
}

export async function inviaRecensioneEvento({ eventoId, clienteId, nomeCliente, punteggio, testo }) {
  const { error } = await supabase.from("recensioni").insert({
    tipo: "evento",
    evento_id: eventoId,
    cliente_id: clienteId,
    nome_cliente: nomeCliente,
    punteggio,
    testo,
  });
  if (error) throw error;
}

function normalizzaRecensione(r) {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    nomeCliente: r.nome_cliente,
    testo: r.testo,
    punteggio: r.punteggio,
    fotoUrls: r.foto_urls || [],
    creatoIl: r.creato_il,
  };
}

// Dal 29/10/2026 (migrazione 097 del sito, scelta esplicita del gestore)
// scrivere una recensione NON richiede più una prenotazione: chi è
// loggato può recensire qualsiasi struttura o itinerario. Senza una
// prenotazione collegata (qui mai, l'app non ha prenotazioni reali) non
// si possono allegare foto, solo testo — stesso limite imposto dalla
// policy del database, non solo lato app.
export async function inviaRecensioneStruttura({ campeggioId, clienteId, nomeCliente, punteggio, testo }) {
  const { error } = await supabase.from("recensioni").insert({
    tipo: "campeggio",
    campeggio_id: campeggioId,
    cliente_id: clienteId,
    nome_cliente: nomeCliente,
    punteggio,
    testo,
  });
  if (error) throw error;
}

export async function inviaRecensioneItinerario({ itinerarioId, clienteId, nomeCliente, punteggio, testo }) {
  const { error } = await supabase.from("recensioni").insert({
    tipo: "itinerario",
    itinerario_id: itinerarioId,
    cliente_id: clienteId,
    nome_cliente: nomeCliente,
    punteggio,
    testo,
  });
  if (error) throw error;
}
