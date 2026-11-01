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
// "alloggio" (mietunterkunft) non ha ancora una chip in questa app: resta
// scartato, contano comunque testo e servizi.
const TIPO_IA_A_CHIP = {
  campeggio: "Campeggi",
  agriturismo: "Agriturismi",
  agricampeggio: "Agricampeggi",
  area_sosta: "Aree sosta",
  // "parcheggio" è già la chip "Camper service" in questa app (vedi
  // TIPO_STRUTTURA_CAMPEGGIO): la ricerca IA atterra sullo stesso valore.
  parcheggio: "Camper service",
};

// "camper_service" (valore di "tipo", diverso da "parcheggio": è il filtro
// del sito per le strutture che dichiarano un servizio camper per i NON
// ospiti, tipoStrutturaFiltro in src/App.jsx) non ha una chip propria in
// questa app - prima finiva scartato in silenzio (chip undefined → nessun
// filtro, mostrava "Tutti"). Non esiste un filtro identico lato app, ma
// "camperService" (il servizio Servizi camper del pannello Filtri, già
// presente in CATEGORIE_FILTRI_SERVIZI) è l'equivalente più vicino
// disponibile: meglio di ignorare del tutto il segnale.
const TIPO_IA_SENZA_CHIP_A_SERVIZIO = {
  camper_service: "camperService",
};

// "entrambi" in modalita significa "a piedi o in bici, indifferente": per
// SentieriScreen equivale a nessun filtro (null), non a un valore preciso
// da passare a caricaSentieri (che con "entrambi" mostrerebbe solo i
// sentieri taggati proprio "entrambi", escludendo quelli solo a piedi o
// solo in bici che invece andrebbero bene comunque).
function modalitaPerSentieri(modalita) {
  return modalita && modalita !== "entrambi" ? modalita : null;
}

// Stesso principio di modalitaPerSentieri sopra: "entrambi" per il tipo di
// veicolo significa nessuna preferenza, non un valore da passare a
// caricaPercorsi4x4 (che con "entrambi" mostrerebbe solo i percorsi taggati
// proprio "4x4 e moto", escludendo quelli solo 4x4 o solo moto che invece
// andrebbero bene comunque).
function tipoVeicoloPerPercorsi4x4(tipoVeicolo) {
  return tipoVeicolo && tipoVeicolo !== "entrambi" ? tipoVeicolo : null;
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
    return {
      categoria: "percorso_4x4",
      regione: filtri.regione || "",
      difficolta: filtri.difficolta || null,
      tipoVeicolo: tipoVeicoloPerPercorsi4x4(filtri.tipo_veicolo),
    };
  }
  const luogo = filtri.testo_libero || filtri.regione || "";
  // Rifugi e bivacchi, a differenza di sentieri/percorsi 4x4, non hanno una
  // schermata a parte in questa app: sono già due chip dentro EsploraLista
  // (vedi TIPO_RIFUGIO in lib/strutture.js). "rifugio" ci atterra con
  // entrambe le chip attive insieme — mai una sola, vedi il prompt della
  // funzione Edge sul perché (il sito li mostra sempre uniti).
  if (filtri.categoria === "rifugio") {
    return {
      categoria: "rifugio",
      filtriTipo: ["Rifugi", "Bivacchi"],
      ricerca: luogo,
      filtriServizi: [],
    };
  }
  const chip = filtri.tipo ? TIPO_IA_A_CHIP[filtri.tipo] : null;
  const servizioEquivalente = !chip && filtri.tipo ? TIPO_IA_SENZA_CHIP_A_SERVIZIO[filtri.tipo] : null;
  const filtriServizi = filtri.filtri || [];
  return {
    categoria: "struttura",
    filtriTipo: chip ? [chip] : [],
    ricerca: luogo || filtri.ambiente?.[0] || "",
    filtriServizi: servizioEquivalente && !filtriServizi.includes(servizioEquivalente)
      ? [...filtriServizi, servizioEquivalente]
      : filtriServizi,
  };
}
