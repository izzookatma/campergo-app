// Elenco delle lingue dell'app, stesso elenco e stesso principio del sito
// (src/i18n/lingue.js su naturago.it): l'italiano è la lingua di base, tutto
// ciò che non è ancora tradotto resta in italiano invece di mostrare una
// chiave nuda. "nome" è scritto nella lingua stessa (così chi non capisce
// l'italiano riconosce la propria lingua nel selettore).
export const LINGUA_BASE = "it";

export const LINGUE = [
  { codice: "it", nome: "Italiano" },
  { codice: "en", nome: "English" },
  { codice: "fr", nome: "Français" },
  { codice: "de", nome: "Deutsch" },
  { codice: "nl", nome: "Nederlands" },
];
