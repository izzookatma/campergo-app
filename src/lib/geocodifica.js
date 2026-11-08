// Stessa logica del sito (src/geocoding.js): accetta coordinate dirette
// ("45.44, 12.33") o un indirizzo/nome di luogo libero da passare al
// geocoding gratuito di Nominatim (OpenStreetMap), vedi anche CLAUDE.md.

// La policy d'uso di Nominatim (gratuito) richiede di identificare
// l'applicazione con un User-Agent/Referer validi, altrimenti rifiuta la
// richiesta in silenzio — provato dal vivo sull'app nativa (niente
// suggerimenti, nessun errore: il fetch andava a buon fine ma Nominatim
// restituiva un risultato vuoto/bloccato). Il browser manda già da solo un
// User-Agent/Referer accettabili (il sito funzionava senza), l'app nativa no.
const INTESTAZIONI_NOMINATIM = {
  "User-Agent": "NaturaGo-App/1.0 (https://naturago.it; info@naturago.it)",
  Referer: "https://naturago.it",
};

function analizzaCoordinate(testo) {
  const m = testo.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export async function geocodificaOCoordinate(testo) {
  const coordinate = analizzaCoordinate(testo);
  if (coordinate) return coordinate;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(testo)}&format=json&limit=1&countrycodes=it`,
      { headers: INTESTAZIONI_NOMINATIM }
    );
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// Più risultati (non solo il primo) mentre chi visita scrive un luogo, per
// la precompilazione di partenza/arrivo in "Pianifica il tuo viaggio": un
// nome breve e leggibile (città/paese + regione, non l'indirizzo completo
// di Nominatim) insieme alle coordinate già pronte, così scegliendo un
// suggerimento non serve geocodificare di nuovo.
// A differenza delle altre funzioni di questo file, qui l'errore non si
// inghiotte in un ripiego silenzioso (null/[]): i suggerimenti sono l'unico
// modo per scegliere partenza/arrivo nel form, quindi se falliscono deve
// vedersi perché, non sparire senza spiegazione — chi chiama (il campo nello
// schermo) mostra il messaggio dell'errore.
export async function suggerimentiLuogo(testo) {
  const t = testo.trim();
  if (t.length < 3) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(t)}&format=json&limit=5&countrycodes=it&addressdetails=1`,
    { headers: INTESTAZIONI_NOMINATIM }
  );
  if (!res.ok) throw new Error(`Nominatim ha risposto ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Risposta di Nominatim non valida");
  const viste = new Set();
  return data
    .map((r) => {
      const a = r.address || {};
      const principale = a.city || a.town || a.village || a.municipality || a.county || r.display_name.split(",")[0];
      const nome = a.state && a.state !== principale ? `${principale}, ${a.state}` : principale;
      return { nome, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    })
    // Nominatim a volte restituisce più righe con lo stesso nome breve
    // (un centro abitato e un confine amministrativo, es.): nella lista
    // dei suggerimenti non si distinguerebbero, si tiene solo la prima.
    .filter((s) => {
      if (!s.nome || !Number.isFinite(s.lat) || !Number.isFinite(s.lng) || viste.has(s.nome)) return false;
      viste.add(s.nome);
      return true;
    });
}

// Il contrario di sopra: da coordinate al nome del paese/città più vicino,
// per dare un nome leggibile a una tappa calcolata lungo un percorso (mai
// nominata da chi visita) — stessa logica del sito (src/geocoding.js).
// Nessun nome trovato → null, chi chiama decide il ripiego.
export async function geocodificaInversa(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=it`,
      { headers: INTESTAZIONI_NOMINATIM }
    );
    const data = await res.json();
    const a = data?.address;
    return a?.city || a?.town || a?.village || a?.municipality || a?.county || null;
  } catch {
    return null;
  }
}
