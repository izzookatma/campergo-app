import { supabase } from "./supabase";

// Blog NaturaGo (tabella `articoli_blog`, sola lettura — stessa tabella e
// stesse colonne di src/Blog.jsx / src/ArticoloBlog.jsx sul sito).

// Rubriche fisse (src/blogRubriche.js sul sito): testo libero nel database,
// un valore senza corrispondenza qui si mostra comunque, col proprio testo.
const RUBRICHE_BLOG = {
  "laghi-e-mare": "Laghi e mare",
  montagna: "Montagna",
  "agriturismi-e-agricampeggi": "Agriturismi e agricampeggi",
  "itinerari-4x4": "Itinerari e 4x4",
  "weekend-e-itinerari": "Weekend e itinerari",
  "consigli-pratici": "Consigli pratici",
  "guida-naturago": "Guida a NaturaGo",
};

export const etichettaRubrica = (rubrica) => (rubrica ? RUBRICHE_BLOG[rubrica] || rubrica : null);

const COLONNE_ELENCO = "slug,titolo,estratto,rubrica,foto_copertina,in_evidenza,data_pubblicazione";
const COLONNE_SCHEDA =
  "id,slug,titolo,estratto,contenuto,rubrica,foto_copertina,foto_credito,regione,categoria_collegata,link_cta_href,link_cta_testo,mi_piace,data_pubblicazione";

export async function caricaArticoli() {
  const { data, error } = await supabase
    .from("articoli_blog")
    .select(COLONNE_ELENCO)
    .eq("stato", "pubblicato")
    .order("data_pubblicazione", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function caricaArticolo(slug) {
  const { data, error } = await supabase
    .from("articoli_blog")
    .select(COLONNE_SCHEDA)
    .eq("slug", slug)
    .eq("stato", "pubblicato")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function caricaArticoliCorrelati(rubrica, slugDaEscludere) {
  if (!rubrica) return [];
  const { data, error } = await supabase
    .from("articoli_blog")
    .select("slug,titolo,foto_copertina,rubrica")
    .eq("stato", "pubblicato")
    .eq("rubrica", rubrica)
    .neq("slug", slugDaEscludere)
    .order("data_pubblicazione", { ascending: false })
    .limit(3);
  if (error) throw error;
  return data || [];
}

// RPC pubblica (migrazione 247): contatore "Mi piace", nessun account
// richiesto. Il blocco al secondo tocco resta responsabilità della
// schermata (stessa logica del sito, lato client).
export async function incrementaMiPiace(slug) {
  const { data, error } = await supabase.rpc("incrementa_mi_piace_blog", { p_slug: slug });
  if (error) throw error;
  return typeof data === "number" ? data : null;
}

// Spezza il corpo dell'articolo negli stessi blocchi del sito
// (paragrafiArticolo in src/seoSchede.js): paragrafi separati da una riga
// vuota. Un paragrafo che comincia con "## " è un sottotitolo, uno nella
// forma "![credito](url)" è una foto, il resto è testo normale (che può
// contenere link "[testo](/percorso)").
export function paragrafiArticolo(contenuto) {
  return (contenuto || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Link di invito sotto l'articolo (stessa logica di LinkElencoCollegato nel
// sito): se l'articolo specifica un link_cta_href esplicito usa quello,
// altrimenti lo ricostruisce da categoria_collegata + regione (già uno slug
// nel database). Apre sempre il sito in browser: l'app non replica le
// pagine elenco per categoria/regione del sito.
export function urlCtaArticolo(articolo) {
  if (articolo.link_cta_href) return `https://www.naturago.it${articolo.link_cta_href}`;
  if (!articolo.categoria_collegata) return null;
  const percorso = `/${articolo.categoria_collegata}${articolo.regione ? `/${articolo.regione}` : ""}`;
  return `https://www.naturago.it${percorso}`;
}

export function testoCtaArticolo(articolo) {
  if (articolo.link_cta_testo) return articolo.link_cta_testo;
  return articolo.categoria_collegata ? "Scopri di più su NaturaGo.it" : null;
}
