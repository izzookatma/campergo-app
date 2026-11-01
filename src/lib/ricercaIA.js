// Stessa ricerca a frase libera assistita dall'IA del sito (prova, vedi
// supabase/functions/interpreta-ricerca-naturale nel repo campergo): stesso
// progetto Supabase, stessa funzione Edge, nessuna duplicazione lato
// server. Qui solo la chiamata e la conversione del risultato nei filtri
// che l'app già conosce.

import { supabase } from "./supabase";

export async function interpretaRicercaIA(testo) {
  const { data, error } = await supabase.functions.invoke("interpreta-ricerca-naturale", {
    body: { testo },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.errore || "Ricerca non riuscita.");
  return data.filtri;
}

// tipo_struttura (DB) -> chip di EsploraLista (vedi FILTRI in
// EsploraScreen.js e TIPO_STRUTTURA_CAMPEGGIO in lib/strutture.js).
// "camper_service" (colonnine pubbliche, tabella a parte) e "alloggio"
// (mietunterkunft) non hanno ancora una chip in questa app: restano
// scartati, contano comunque testo e servizi.
const TIPO_IA_A_CHIP = {
  campeggio: "Campeggi",
  agriturismo: "Agriturismi",
  agricampeggio: "Agricampeggi",
  area_sosta: "Aree sosta",
  // "parcheggio" è già la chip "Camper service" in questa app (vedi
  // TIPO_STRUTTURA_CAMPEGGIO): la ricerca IA atterra sullo stesso valore.
  parcheggio: "Camper service",
};

// "entrambi" in modalita significa "a piedi o in bici, indifferente": per
// SentieriScreen equivale a nessun filtro (null), non a un valore preciso
// da passare a caricaSentieri (che con "entrambi" mostrerebbe solo i
// sentieri taggati proprio "entrambi", escludendo quelli solo a piedi o
// solo in bici che invece andrebbero bene comunque).
function modalitaPerSentieri(modalita) {
  return modalita && modalita !== "entrambi" ? modalita : null;
}

// Oltre alle strutture (vedi sotto), la ricerca IA riconosce anche sentieri
// e percorsi 4x4 (campo "categoria" della funzione Edge): queste due
// sezioni vivono in schermate a parte (SentieriScreen, Percorsi4x4Screen),
// non dentro EsploraLista. Il chiamante decide dove navigare in base a
// "categoria"; qui si prepara solo cosa passare a ciascuna schermata.
//
// La ricerca testuale dell'app, a differenza del sito, non ha un filtro
// "ambiente" a parte: un luogo preciso (città/zona o regione) vince
// sempre, perché cercaStrutture lo confronta con "localita" per intero
// (contiene comune/provincia/regione). Senza un luogo, ma con un solo
// ambiente riconosciuto (mare/montagna/collina/valle), quella parola passa
// come testo di ricerca: cercaStrutture la riconosce già (PAROLE_AMBIENTE).
export function mappaFiltriIA(filtri) {
  if (filtri.categoria === "sentiero") {
    return { categoria: "sentiero", regione: filtri.regione || "", modalita: modalitaPerSentieri(filtri.modalita) };
  }
  if (filtri.categoria === "percorso_4x4") {
    return { categoria: "percorso_4x4", regione: filtri.regione || "", difficolta: filtri.difficolta || null };
  }
  const chip = filtri.tipo ? TIPO_IA_A_CHIP[filtri.tipo] : null;
  const luogo = filtri.testo_libero || filtri.regione || "";
  return {
    categoria: "struttura",
    filtriTipo: chip ? [chip] : [],
    ricerca: luogo || filtri.ambiente?.[0] || "",
    filtriServizi: filtri.filtri || [],
  };
}
