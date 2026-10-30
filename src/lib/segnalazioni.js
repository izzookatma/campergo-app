import { supabase } from "./supabase";

// Segnalazione di una struttura mancante (campeggio, area sosta...): stessa
// tabella e stessa logica del sito (`ModuloSegnalazione`/`SezioneSegnalazioni`
// in AccountArea.jsx) — niente di nuovo lato database, solo il modulo lato
// app. Le etichette dei tipi riprendono quelle già usate in Esplora
// (EsploraScreen.js), non quelle più generiche del sito ("Parcheggio").
export const TIPO_STRUTTURA_SEGNALABILE_META = {
  campeggio: { etichetta: "Campeggio", icona: "bonfire-outline" },
  area_sosta: { etichetta: "Area sosta", icona: "car-outline" },
  agricampeggio: { etichetta: "Agricampeggio", icona: "leaf-outline" },
  agriturismo: { etichetta: "Agriturismo", icona: "home-outline" },
  parcheggio: { etichetta: "Camper service", icona: "water-outline" },
};

// Stessa lista breve del sito (SERVIZI_CAMPER_META in App.jsx) — qui basta
// sapere "cosa si conosce", non il set completo dei filtri di Esplora.
export const SERVIZI_SEGNALAZIONE_META = {
  scaricoAcqueNere: { etichetta: "Scarico acque nere", icona: "trash-outline" },
  scaricoAcqueGrigie: { etichetta: "Scarico acque grigie", icona: "water-outline" },
  acquaPotabile: { etichetta: "Acqua potabile", icona: "flask-outline" },
  acquaNonPotabile: { etichetta: "Acqua non potabile", icona: "alert-circle-outline" },
  bagni: { etichetta: "Bagni", icona: "business-outline" },
  elettricita: { etichetta: "Elettricità", icona: "flash-outline" },
  docce: { etichetta: "Docce", icona: "rainy-outline" },
  petFriendly: { etichetta: "Animali ammessi", icona: "paw-outline" },
};

export const STATO_SEGNALAZIONE_META = {
  in_attesa: { etichetta: "In attesa di approvazione", colore: "#ca8a04" },
  approvato: { etichetta: "Approvata — pubblicata come scheda non verificata", colore: "#16a34a" },
  rifiutato: { etichetta: "Non approvata", colore: "#dc2626" },
};

function normalizzaSegnalazione(s) {
  return {
    id: s.id,
    nome: s.nome,
    citta: s.citta,
    tipoStruttura: s.tipo_struttura,
    stato: s.stato,
    creatoIl: s.creato_il,
  };
}

export async function caricaMieSegnalazioni(autoreId) {
  const { data, error } = await supabase
    .from("segnalazioni_strutture")
    .select("id, nome, citta, tipo_struttura, stato, creato_il")
    .eq("autore_id", autoreId)
    .order("creato_il", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizzaSegnalazione);
}

export async function inviaSegnalazioneStruttura({
  autoreId,
  nomeAutore,
  nome,
  citta,
  tipoStruttura,
  indirizzo,
  sitoWeb,
  amenities,
}) {
  const { error } = await supabase.from("segnalazioni_strutture").insert({
    autore_id: autoreId,
    nome_autore: nomeAutore,
    nome: nome.trim(),
    citta: citta.trim(),
    tipo_struttura: tipoStruttura,
    indirizzo: indirizzo?.trim() || null,
    sito_web: sitoWeb?.trim() || null,
    amenities,
  });
  if (error) throw error;
}
