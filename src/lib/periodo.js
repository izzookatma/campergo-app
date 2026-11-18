// Date del soggiorno ("YYYY-MM-DD", ora locale: mai toISOString, che
// sposterebbe il giorno per il fuso).
export const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export function isoDaData(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

export function dataDaIso(iso) {
  const [a, m, g] = iso.split("-").map(Number);
  return new Date(a, m - 1, g);
}

export function etichettaData(iso) {
  if (!iso) return "";
  const d = dataDaIso(iso);
  return `${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}

export function numeroNotti(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return Math.round((dataDaIso(checkOut) - dataDaIso(checkIn)) / 86400000);
}

// Stessa regola del sito (apertoNelPeriodo in src/App.jsx): vero se la
// struttura è aperta per tutte le notti del soggiorno (tutto l'anno, o ogni
// mese toccato dal soggiorno dentro l'intervallo stagionale, anche a
// cavallo dell'anno). Senza date non filtra nulla.
export function apertoNelPeriodo(struttura, checkIn, checkOut) {
  if (!checkIn || !checkOut) return true;
  if (struttura.periodoAperturaTipo !== "stagionale") return true;
  const inizio = dataDaIso(checkIn);
  const fineEsclusa = dataDaIso(checkOut);
  if (fineEsclusa <= inizio) return true;
  const ultimaNotte = new Date(fineEsclusa);
  ultimaNotte.setDate(ultimaNotte.getDate() - 1);
  const meseInizio = struttura.aperturaMeseInizio || 1;
  const meseFine = struttura.aperturaMeseFine || 12;
  const cursore = new Date(inizio.getFullYear(), inizio.getMonth(), 1);
  const limite = new Date(ultimaNotte.getFullYear(), ultimaNotte.getMonth(), 1);
  while (cursore <= limite) {
    const mese = cursore.getMonth() + 1;
    const aperto = meseInizio <= meseFine ? mese >= meseInizio && mese <= meseFine : mese >= meseInizio || mese <= meseFine;
    if (!aperto) return false;
    cursore.setMonth(cursore.getMonth() + 1);
  }
  return true;
}
