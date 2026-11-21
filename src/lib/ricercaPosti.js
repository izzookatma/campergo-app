// Logica della ricerca dei posti per "Crea la tua vacanza" (app). Stessa
// logica del sito (repo campergo, src/ricercaPosti.js). Due idee:
//  1. chi cerca "Lodi" vuole Lodi, non "Piani di CLODIa": una parola deve
//     COMINCIARE con quello che si scrive (non basta contenerlo);
//  2. chi sta pianificando vuole posti VICINI al punto in cui è nel viaggio
//     (es. dove dormire dopo Lodi): l'elenco della zona, per distanza.
// Funzioni pure (niente rete): l'accesso ai dati sta in cercaPosti.js.

export function normalizza(testo) {
  return (testo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function paroleDi(testo) {
  return normalizza(testo)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Ogni parola cercata deve cominciare una parola del testo ("area lodi" trova
// "Area Sosta Camper Lodi"; "lodi" NON trova "Clodia").
export function paroleIniziano(testo, termine) {
  const parole = paroleDi(testo);
  const cercate = paroleDi(termine);
  if (cercate.length === 0) return false;
  return cercate.every((c) => parole.some((p) => p.startsWith(c)));
}

export function distanzaKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function formattaDistanza(km) {
  if (km == null) return "";
  return km < 10 ? `a ${km.toFixed(1).replace(".", ",")} km` : `a ${Math.round(km)} km`;
}

// Rilevanza di un risultato rispetto a quello scritto (più basso = meglio):
// 0 la città è proprio quella; 1 il nome comincia così; 2 una parola del nome
// o della località comincia così; 3 solo la zona; null = non c'entra.
export function rilevanza({ nome, localita, zona }, termine) {
  const t = normalizza(termine).trim();
  if (!t) return null;
  const cittaPrincipale = normalizza((localita || "").split(",")[0]).trim();
  if (cittaPrincipale === t) return 0;
  if (normalizza(nome).startsWith(t)) return 1;
  if (paroleIniziano(nome, termine) || paroleIniziano(localita, termine)) return 2;
  if (paroleIniziano(zona, termine)) return 3;
  return null;
}

// Tiene solo i risultati pertinenti e li ordina: prima per rilevanza, poi per
// vicinanza al punto di riferimento (se c'è). `leggi(item)` → { nome, localita, zona, lat, lng }.
export function filtraEOrdinaPerTesto(elementi, termine, centro, leggi) {
  const conPunteggio = elementi
    .map((el) => {
      const dati = leggi(el);
      const r = rilevanza(dati, termine);
      const d = centro && dati.lat != null && dati.lng != null ? distanzaKm(centro, { lat: Number(dati.lat), lng: Number(dati.lng) }) : null;
      return { el, r, d };
    })
    .filter((x) => x.r !== null);
  conPunteggio.sort((a, b) => a.r - b.r || (a.d ?? 1e9) - (b.d ?? 1e9));
  return conPunteggio.map((x) => ({ ...x.el, distanzaKm: x.d }));
}

// Posti entro un raggio dal punto, dal più vicino. `leggi(item)` → { lat, lng }.
export function ordinaPerVicinanza(elementi, centro, raggioKm, leggi) {
  return elementi
    .map((el) => {
      const { lat, lng } = leggi(el);
      return { el, d: lat == null || lng == null ? null : distanzaKm(centro, { lat: Number(lat), lng: Number(lng) }) };
    })
    .filter((x) => x.d !== null && x.d <= raggioKm)
    .sort((a, b) => a.d - b.d)
    .map((x) => ({ ...x.el, distanzaKm: x.d }));
}

// Tra i luoghi proposti da una ricerca di indirizzi, quello che corrisponde
// a quanto scritto ("Lodi, Lombardia" per "lodi"): è l'AREA di cui si
// vogliono i posti vicini.
export function areaCercata(luoghi, termine) {
  return (luoghi || []).find((l) => paroleIniziano(l.nome, termine)) || null;
}
