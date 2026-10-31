import { supabase } from "./supabase";

const ETICHETTE_TIPO = {
  campeggio: "Campeggio",
  agriturismo: "Agriturismo",
  agricampeggio: "Agricampeggio",
  area_sosta: "Area sosta",
  parcheggio: "Camper service",
};

export const COLONNE_CAMPEGGIO =
  "id, nome, localita, prezzo, prezzo_da, lat, lng, tipo_struttura, foto_url, foto_generica, rating, recensioni, telefono, descrizione";

export const COLONNE_RIFUGIO = "id, nome, comune, provincia, gruppo_montuoso, lat, lng, foto_url, tipo";

// Tutte le colonne vere della vista (72 in tutto, verificate dal vivo):
// per le liste bastano quelle di COLONNE_CAMPEGGIO/COLONNE_RIFUGIO (il
// payload resta leggero), il dettaglio completo si carica a parte quando
// si apre la Scheda — vedi caricaDettaglioStruttura più sotto. Escluse di
// proposito (dati interni o poco utili in una scheda): id/owner_id/seed/
// click_30gg/mappa_url (il link mappa lo genera l'app), piazzole_dimensioni
// e spazio_barbecue (jsonb poco strutturati), chi_siamo_foto (galleria,
// rimandata), foto_credito, prenotabile_naturago (colonna inutilizzata,
// vedi memoria del progetto), servizi (jsonb legacy, non usato nemmeno dal
// sito a livello di scheda — sostituito da amenities), salta_fila_attivo/
// reception_chiusura (legati al flusso di prenotazione, che l'app non ha
// ancora: il pulsante "Prenota subito" in Scheda è un segnaposto),
// piazzole_dimensioni/piazzole_totali_conteggio (compatibilità piazzola↔
// mezzo, stesso motivo).
const COLONNE_DETTAGLIO_CAMPEGGIO = [
  "id",
  "nome",
  "localita",
  "indirizzo",
  "cap",
  "prezzo",
  "prezzo_da",
  "lat",
  "lng",
  "tipo_struttura",
  "foto_url",
  "foto_generica",
  "rating",
  "recensioni",
  "telefono",
  "sito_web",
  "descrizione",
  "chi_siamo_testo",
  "amenities",
  "verificato",
  "chiusa_temporaneamente",
  "chiusa_temporaneamente_motivo",
  "divieto_camper",
  "divieto_camper_motivo",
  "altezza_massima_m",
  "piazzola_lunghezza_max",
  "piazzola_larghezza_max",
  "orario_checkin",
  "orario_checkout",
  "late_checkout_disponibile",
  "late_checkout_orario",
  "late_checkout_a_pagamento",
  "late_checkout_prezzo",
  "periodo_apertura_tipo",
  "apertura_mese_inizio",
  "apertura_mese_fine",
  "fermata_bus_vicina",
  "stazione_treno_vicina",
  "lingue_parlate",
  "attivita_vicinanze",
  "badge_culturale_anno",
  "zona_turistica",
  "tipo_ambiente",
  "categorie_interesse",
  "ha_alloggi_fissi",
  "ha_eventi_futuri",
  "parcheggio_tariffa",
  "parcheggio_prezzo_testo",
  "parcheggio_posti",
  "parcheggio_sorvegliato",
  "parcheggio_superficie",
  "parcheggio_illuminato",
  "camper_service_non_ospiti",
  "camper_service_non_ospiti_scarico_nere",
  "camper_service_non_ospiti_scarico_grigie",
  "camper_service_non_ospiti_carico_acqua",
  "camper_service_non_ospiti_corrente",
  "camper_service_non_ospiti_altro",
  "camper_service_non_ospiti_costo",
].join(", ");

const COLONNE_DETTAGLIO_RIFUGIO =
  "id, nome, tipo, comune, provincia, regione, gruppo_montuoso, quota_m, lat, lng, foto_url, telefono, sito_web, descrizione, proprietario, periodo_apertura, posti_letto, ristoro, ristoro_note, avviso_verifica, nota_verifica";

export function normalizzaCampeggio(c) {
  return {
    id: `campeggio-${c.id}`,
    idOriginale: c.id,
    origine: "campeggi_pubblici",
    tipo: ETICHETTE_TIPO[c.tipo_struttura] || "Struttura",
    nome: c.nome,
    localita: c.localita,
    prezzo: c.prezzo_da ?? c.prezzo ?? null,
    fotoUrl: c.foto_url || null,
    lat: c.lat,
    lng: c.lng,
    rating: c.rating,
    recensioni: c.recensioni,
    telefono: c.telefono,
    descrizione: c.descrizione,
  };
}

// "capanna" (solo 4 schede) confluisce in "Rifugio": non ha una propria
// tessera nell'hub, non ha senso inventargliene una per così poche schede.
const ETICHETTA_RIFUGIO = { rifugio: "Rifugio", bivacco: "Bivacco", capanna: "Rifugio" };

function normalizzaRifugio(r) {
  return {
    id: `rifugio-${r.id}`,
    idOriginale: r.id,
    origine: "rifugi",
    tipo: ETICHETTA_RIFUGIO[r.tipo] || "Rifugio",
    nome: r.nome,
    localita: [r.comune, r.provincia].filter(Boolean).join(", "),
    prezzo: null,
    fotoUrl: r.foto_url || null,
    lat: r.lat,
    lng: r.lng,
    rating: null,
    recensioni: null,
    telefono: null,
    descrizione: r.gruppo_montuoso ? `Gruppo montuoso: ${r.gruppo_montuoso}` : "",
  };
}

// scaricoAcqueNere/scaricoAcqueGrigie contano anche per il vecchio tag
// combinato "scaricoPozzetto" (prima che i due filtri fossero separati,
// vedi AMENITY_META e il commento su matchFiltri in src/App.jsx sul
// sito), o se lo conferma la colonna dedicata della struttura
// (camper_service_non_ospiti_scarico_nere/_grigie).
const FALLBACK_SERVIZIO = {
  scaricoAcqueNere: ["amenities.cs.{scaricoAcqueNere}", "amenities.cs.{scaricoPozzetto}", "camper_service_non_ospiti_scarico_nere.eq.true"],
  scaricoAcqueGrigie: ["amenities.cs.{scaricoAcqueGrigie}", "amenities.cs.{scaricoPozzetto}", "camper_service_non_ospiti_scarico_grigie.eq.true"],
};

// I rifugi non hanno la colonna amenities (niente servizi da campeggio):
// quando è attivo un filtro servizi restano fuori dai risultati.
function conServizi(query, servizi) {
  if (!servizi || servizi.length === 0) return query;
  return servizi.reduce((q, chiave) => {
    const alternative = FALLBACK_SERVIZIO[chiave];
    return alternative ? q.or(alternative.join(",")) : q.contains("amenities", [chiave]);
  }, query);
}

// Chip di Esplora (FILTRI in EsploraScreen.js) → valore vero sul database,
// per interrogare direttamente la tabella giusta quando è scelto un tipo
// preciso, invece di filtrare lato app un campione generico che può non
// contenere affatto quel tipo (vedi bug sotto).
const TIPO_STRUTTURA_CAMPEGGIO = {
  Campeggi: "campeggio",
  Agriturismi: "agriturismo",
  Agricampeggi: "agricampeggio",
  "Aree sosta": "area_sosta",
  "Camper service": "parcheggio",
};
// "Rifugi" in etichetta include anche "capanna" (ETICHETTA_RIFUGIO sopra
// le fa confluire insieme, sono solo 4 schede).
const TIPO_RIFUGIO = {
  Rifugi: ["rifugio", "capanna"],
  Bivacchi: ["bivacco"],
};

// Ricerca unificata su tutte le tipologie di struttura (campeggi, agriturismi,
// agricampeggi, rifugi), come richiesto per la ricerca dell'app - stessa
// logica dietro /esplora sul sito (campeggi_pubblici + rifugi).
//
// `tipi` (le chip scelte, es. ["Bivacchi"]) restringe la query alla tabella
// giusta con un filtro vero: senza, scegliere "Bivacchi" filtrava lato app
// lo stesso campione generico (poche decine di rifugi, di ogni tipo) usato
// per "Tutti" — bastava che il campione contenesse solo 1-2 bivacchi per
// farli sembrare gli unici che esistono (51 in realtà, verificato dal
// vivo). Bug reale, segnalato dall'utente ("perché ci sono solo due
// bivacchi?").
export async function caricaStrutture({ limite = 40, pagina = 0, servizi = [], tipi = [] } = {}) {
  const conServiziAttivi = servizi.length > 0;

  const tipiCampeggioScelti = tipi.map((t) => TIPO_STRUTTURA_CAMPEGGIO[t]).filter(Boolean);
  const tipiRifugioScelti = tipi.flatMap((t) => TIPO_RIFUGIO[t] || []);
  // Una tabella si salta del tutto solo se sono stati scelti SOLO tipi
  // dell'altra tabella (es. solo "Bivacchi"): se la scelta mescola le due
  // tabelle (es. "Campeggi" + "Bivacchi" insieme) vanno interrogate
  // entrambe, ciascuna col proprio filtro — altrimenti si ricadrebbe nello
  // stesso bug (campione generico non filtrato) per questa combinazione.
  const saltaCampeggi = tipiCampeggioScelti.length === 0 && tipiRifugioScelti.length > 0;
  const saltaRifugi = tipiRifugioScelti.length === 0 && tipiCampeggioScelti.length > 0;
  // Tutto il `limite` ai rifugi solo quando sono l'unica tabella scelta;
  // altrimenti resta la proporzione 1:4 di sempre (caso raro, scelta
  // mista tra le due tabelle).
  const soloRifugi = tipiRifugioScelti.length > 0 && tipiCampeggioScelti.length === 0;
  // I rifugi non hanno mai `amenities`: con un filtro servizi attivo non
  // potrebbero comunque mai comparire, a prescindere dal tipo scelto.
  const saltaRifugiDelTutto = saltaRifugi || conServiziAttivi;

  const daCampeggi = pagina * limite;
  const limiteRifugi = soloRifugi ? limite : Math.round(limite / 4);
  const daRifugi = pagina * limiteRifugi;

  // L'ordine per rating da solo non è deterministico tra le pagine: con
  // più schede a pari voto, range() su una sola colonna può restituire la
  // stessa riga due volte tra una pagina e l'altra (chiave React duplicata
  // in Esplora quando si scorre "carica altre"). L'id come secondo
  // ordinamento rende l'ordine stabile.
  let queryCampeggi = supabase.from("campeggi_pubblici").select(COLONNE_CAMPEGGIO).order("rating", { ascending: false }).order("id", { ascending: true });
  if (tipiCampeggioScelti.length > 0) queryCampeggi = queryCampeggi.in("tipo_struttura", tipiCampeggioScelti);
  queryCampeggi = conServizi(queryCampeggi, servizi).range(daCampeggi, daCampeggi + limite - 1);

  let queryRifugi = supabase.from("rifugi").select(COLONNE_RIFUGIO).eq("stato", "approvato").order("id", { ascending: true });
  if (tipiRifugioScelti.length > 0) queryRifugi = queryRifugi.in("tipo", tipiRifugioScelti);
  queryRifugi = queryRifugi.range(daRifugi, daRifugi + limiteRifugi - 1);

  const [campeggiRes, rifugiRes] = await Promise.all([
    saltaCampeggi ? Promise.resolve({ data: [], error: null }) : queryCampeggi,
    saltaRifugiDelTutto ? Promise.resolve({ data: [], error: null }) : queryRifugi,
  ]);

  if (campeggiRes.error) throw campeggiRes.error;
  if (rifugiRes.error) throw rifugiRes.error;

  const campeggi = (campeggiRes.data || []).map(normalizzaCampeggio);
  const rifugi = (rifugiRes.data || []).map(normalizzaRifugio);

  return [...campeggi, ...rifugi];
}

// Parole che indicano un ambiente (tile mare/collina/montagna/valle di
// /relax e /natura sul sito, colonna ambiente_calcolato, un array testo)
// invece di un nome di zona/regione: cercarle fa scattare anche un
// confronto sull'ambiente, non solo sul testo libero.
const PAROLE_AMBIENTE = {
  mare: "mare",
  spiaggia: "mare",
  marina: "mare",
  montagna: "montagna",
  montagne: "montagna",
  monti: "montagna",
  monte: "montagna",
  collina: "collina",
  colline: "collina",
  valle: "valle",
  valli: "valle",
};

// La ricerca testuale (es. "Lombardia", "Como", "20100", "Val d'Elsa",
// "mare") deve guardare TUTTO il database, non solo le strutture già
// caricate per rating: `localita` contiene "Comune, Provincia, Regione" per
// intero (basta per cercare per regione), più zona turistica, CAP e
// ambiente (mare/collina/montagna/valle, calcolato sul sito).
// Stesso bug di `caricaStrutture` e stessa correzione: una ricerca testuale
// con un filtro tipo attivo (es. cercare "Trentino" con "Bivacchi" scelto)
// senza `tipi` guardava solo i primi ~25 rifugi trovati (100/4, qualunque
// tipo), che potevano non includere i bivacchi anche se la ricerca ne
// avrebbe trovati altrove nello stesso risultato.
export async function cercaStrutture({ termine, limite = 100, servizi = [], tipi = [] } = {}) {
  const pulito = termine.trim().replace(/[,(){}%]/g, " ").trim();
  if (!pulito) return [];
  const pattern = `%${pulito}%`;
  const ambiente = PAROLE_AMBIENTE[pulito.toLowerCase()];
  const conServiziAttivi = servizi.length > 0;

  const tipiCampeggioScelti = tipi.map((t) => TIPO_STRUTTURA_CAMPEGGIO[t]).filter(Boolean);
  const tipiRifugioScelti = tipi.flatMap((t) => TIPO_RIFUGIO[t] || []);
  // Una tabella si salta solo se sono scelti SOLO tipi dell'altra (una
  // selezione mista tra le due tabelle va interrogata su entrambe, non
  // saltata: altrimenti si ricade nello stesso bug per quella combinazione).
  const saltaCampeggi = tipiCampeggioScelti.length === 0 && tipiRifugioScelti.length > 0;
  const saltaRifugi = tipiRifugioScelti.length === 0 && tipiCampeggioScelti.length > 0;
  const soloRifugi = tipiRifugioScelti.length > 0 && tipiCampeggioScelti.length === 0;
  const limiteRifugi = soloRifugi ? limite : Math.round(limite / 4);
  // I rifugi non hanno mai `amenities`: con un filtro servizi attivo non
  // potrebbero comunque mai comparire, a prescindere dal tipo scelto.
  const saltaRifugiDelTutto = saltaRifugi || conServiziAttivi;

  let condizioniCampeggi = `nome.ilike.${pattern},localita.ilike.${pattern},zona_turistica.ilike.${pattern},cap.ilike.${pattern}`;
  if (ambiente) condizioniCampeggi += `,ambiente_calcolato.cs.{${ambiente}}`;

  let queryCampeggi = supabase.from("campeggi_pubblici").select(COLONNE_CAMPEGGIO).or(condizioniCampeggi).order("rating", { ascending: false });
  if (tipiCampeggioScelti.length > 0) queryCampeggi = queryCampeggi.in("tipo_struttura", tipiCampeggioScelti);
  queryCampeggi = conServizi(queryCampeggi, servizi).limit(limite);

  let queryRifugi = supabase
    .from("rifugi")
    .select(COLONNE_RIFUGIO)
    .eq("stato", "approvato")
    .or(`nome.ilike.${pattern},comune.ilike.${pattern},provincia.ilike.${pattern}`);
  if (tipiRifugioScelti.length > 0) queryRifugi = queryRifugi.in("tipo", tipiRifugioScelti);
  queryRifugi = queryRifugi.limit(limiteRifugi);

  const [campeggiRes, rifugiRes] = await Promise.all([
    saltaCampeggi ? Promise.resolve({ data: [], error: null }) : queryCampeggi,
    saltaRifugiDelTutto ? Promise.resolve({ data: [], error: null }) : queryRifugi,
  ]);

  if (campeggiRes.error) throw campeggiRes.error;
  if (rifugiRes.error) throw rifugiRes.error;

  const campeggi = (campeggiRes.data || []).map(normalizzaCampeggio);
  const rifugi = (rifugiRes.data || []).map(normalizzaRifugio);

  return [...campeggi, ...rifugi];
}

// "Vicino a me ora" deve guardare TUTTE le strutture in un raggio dalla
// posizione, non solo quelle già caricate per rating (altrimenti una
// struttura vicina ma senza recensioni non entra mai in gioco). Filtro
// via bounding box lat/lng (niente PostGIS), poi l'ordinamento preciso per
// distanza resta lato app.
// Stesso bug di `caricaStrutture` (vedi sopra) e stessa correzione: senza
// `tipi`, "vicino a me" + un filtro tipo attivo (es. "Bivacchi") filtrava
// lato app solo i primi ~37 rifugi del riquadro (150/4, qualunque tipo),
// quindi poteva mostrarne pochissimi o nessuno anche se ce n'erano di più
// più lontani nello stesso riquadro ma tagliati fuori dal limite.
export async function caricaStruttureVicine({ lat, lng, raggioKm = 80, limite = 150, servizi = [], tipi = [] } = {}) {
  const deltaLat = raggioKm / 111;
  const deltaLng = raggioKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const conServiziAttivi = servizi.length > 0;

  const tipiCampeggioScelti = tipi.map((t) => TIPO_STRUTTURA_CAMPEGGIO[t]).filter(Boolean);
  const tipiRifugioScelti = tipi.flatMap((t) => TIPO_RIFUGIO[t] || []);
  // Una tabella si salta solo se sono scelti SOLO tipi dell'altra (una
  // selezione mista tra le due tabelle va interrogata su entrambe, non
  // saltata: altrimenti si ricade nello stesso bug per quella combinazione).
  const saltaCampeggi = tipiCampeggioScelti.length === 0 && tipiRifugioScelti.length > 0;
  const saltaRifugi = tipiRifugioScelti.length === 0 && tipiCampeggioScelti.length > 0;
  const soloRifugi = tipiRifugioScelti.length > 0 && tipiCampeggioScelti.length === 0;
  const limiteRifugi = soloRifugi ? limite : Math.round(limite / 4);
  // I rifugi non hanno mai `amenities`: con un filtro servizi attivo non
  // potrebbero comunque mai comparire, a prescindere dal tipo scelto.
  const saltaRifugiDelTutto = saltaRifugi || conServiziAttivi;

  let queryCampeggi = supabase
    .from("campeggi_pubblici")
    .select(COLONNE_CAMPEGGIO)
    .gte("lat", lat - deltaLat)
    .lte("lat", lat + deltaLat)
    .gte("lng", lng - deltaLng)
    .lte("lng", lng + deltaLng);
  if (tipiCampeggioScelti.length > 0) queryCampeggi = queryCampeggi.in("tipo_struttura", tipiCampeggioScelti);
  queryCampeggi = conServizi(queryCampeggi, servizi).limit(limite);

  let queryRifugi = supabase
    .from("rifugi")
    .select(COLONNE_RIFUGIO)
    .eq("stato", "approvato")
    .gte("lat", lat - deltaLat)
    .lte("lat", lat + deltaLat)
    .gte("lng", lng - deltaLng)
    .lte("lng", lng + deltaLng);
  if (tipiRifugioScelti.length > 0) queryRifugi = queryRifugi.in("tipo", tipiRifugioScelti);
  queryRifugi = queryRifugi.limit(limiteRifugi);

  const [campeggiRes, rifugiRes] = await Promise.all([
    saltaCampeggi ? Promise.resolve({ data: [], error: null }) : queryCampeggi,
    saltaRifugiDelTutto ? Promise.resolve({ data: [], error: null }) : queryRifugi,
  ]);

  if (campeggiRes.error) throw campeggiRes.error;
  if (rifugiRes.error) throw rifugiRes.error;

  const campeggi = (campeggiRes.data || []).map(normalizzaCampeggio);
  const rifugi = (rifugiRes.data || []).map(normalizzaRifugio);

  return [...campeggi, ...rifugi];
}

function formattaOrario(t) {
  return t ? t.slice(0, 5) : null;
}

// Dettaglio completo per la Scheda: le liste caricano solo i campi
// essenziali (payload leggero), qui si va a prendere tutto il resto solo
// per la struttura che si sta davvero guardando.
export async function caricaDettaglioStruttura({ origine, idOriginale }) {
  if (origine === "rifugi") {
    const { data, error } = await supabase.from("rifugi").select(COLONNE_DETTAGLIO_RIFUGIO).eq("id", idOriginale).single();
    if (error) throw error;
    return {
      quotaM: data.quota_m,
      regione: data.regione,
      proprietario: data.proprietario,
      periodoApertura: data.periodo_apertura,
      postiLetto: data.posti_letto,
      ristoro: data.ristoro,
      ristoroNote: data.ristoro_note,
      sitoWeb: data.sito_web,
      telefono: data.telefono,
      avvisoVerifica: data.avviso_verifica,
      notaVerifica: data.nota_verifica,
    };
  }

  const { data, error } = await supabase.from("campeggi_pubblici").select(COLONNE_DETTAGLIO_CAMPEGGIO).eq("id", idOriginale).single();
  if (error) throw error;

  return {
    indirizzo: data.indirizzo,
    cap: data.cap,
    sitoWeb: data.sito_web,
    descrizioneEstesa: data.chi_siamo_testo,
    amenities: data.amenities || [],
    verificato: data.verificato,
    chiusaTemporaneamente: data.chiusa_temporaneamente,
    chiusaTemporaneamenteMotivo: data.chiusa_temporaneamente_motivo,
    divietoCamper: data.divieto_camper,
    divietoCamperMotivo: data.divieto_camper_motivo,
    altezzaMassimaM: data.altezza_massima_m,
    piazzolaLunghezzaMax: data.piazzola_lunghezza_max,
    piazzolaLarghezzaMax: data.piazzola_larghezza_max,
    orarioCheckin: formattaOrario(data.orario_checkin),
    orarioCheckout: formattaOrario(data.orario_checkout),
    lateCheckoutDisponibile: data.late_checkout_disponibile,
    lateCheckoutOrario: formattaOrario(data.late_checkout_orario),
    lateCheckoutAPagamento: data.late_checkout_a_pagamento,
    lateCheckoutPrezzo: data.late_checkout_prezzo,
    periodoAperturaTipo: data.periodo_apertura_tipo,
    aperturaMeseInizio: data.apertura_mese_inizio,
    aperturaMeseFine: data.apertura_mese_fine,
    fermataBusVicina: data.fermata_bus_vicina,
    stazioneTrenoVicina: data.stazione_treno_vicina,
    linguaParlate: data.lingue_parlate || [],
    attivitaVicinanze: data.attivita_vicinanze || [],
    badgeCulturaleAnno: data.badge_culturale_anno,
    zonaTuristica: data.zona_turistica,
    tipoAmbiente: data.tipo_ambiente || [],
    categorieInteresse: data.categorie_interesse || [],
    haAlloggiFissi: data.ha_alloggi_fissi,
    haEventiFuturi: data.ha_eventi_futuri,
    parcheggioTariffa: data.parcheggio_tariffa,
    parcheggioPrezzoTesto: data.parcheggio_prezzo_testo,
    parcheggioPosti: data.parcheggio_posti,
    parcheggioSorvegliato: data.parcheggio_sorvegliato,
    parcheggioSuperficie: data.parcheggio_superficie,
    parcheggioIlluminato: data.parcheggio_illuminato,
    camperServiceNonOspiti: data.camper_service_non_ospiti,
    camperServiceScaricoNere: data.camper_service_non_ospiti_scarico_nere,
    camperServiceScaricoGrigie: data.camper_service_non_ospiti_scarico_grigie,
    camperServiceCaricoAcqua: data.camper_service_non_ospiti_carico_acqua,
    camperServiceCorrente: data.camper_service_non_ospiti_corrente,
    camperServiceAltro: data.camper_service_non_ospiti_altro,
    camperServiceCosto: data.camper_service_non_ospiti_costo,
  };
}
