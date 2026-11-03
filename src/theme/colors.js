export const colori = {
  blu: "#00587C",
  bluChiaro: "#EAF4FA",
  arancio: "#E08A3E",
  arancioChiaro: "#FBF2E8",
  testo: "#111827",
  testoSecondario: "#6b7280",
  grigioSfondo: "#f8fafc",
  bordo: "#e5e7eb",
  rosso: "#ef4444",
  bianco: "#ffffff",
};

// Ombra morbida unica per tutte le card/riquadri bianchi dell'app (prima
// quasi nessuna schermata ne aveva una, risultavano piatte sullo sfondo
// grigio): stessa leggerezza ovunque, non pensata per badge/pulsanti piccoli.
export const ombraCard = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 2,
};

// Raggio standard delle card di contenuto, usato al posto dei vari 10-14
// sparsi nelle schermate, per un arrotondamento coerente in tutta l'app.
export const raggioCard = 16;
