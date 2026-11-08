// Stessa logica del sito (src/geocoding.js): accetta coordinate dirette
// ("45.44, 12.33") o un indirizzo/nome di luogo libero da passare al
// geocoding gratuito di Nominatim (OpenStreetMap), vedi anche CLAUDE.md.
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
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(testo)}&format=json&limit=1&countrycodes=it`
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
export async function suggerimentiLuogo(testo) {
  const t = testo.trim();
  if (t.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(t)}&format=json&limit=5&countrycodes=it&addressdetails=1`
    );
    const data = await res.json();
    if (!Array.isArray(data)) return [];
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
  } catch {
    return [];
  }
}

// Il contrario di sopra: da coordinate al nome del paese/città più vicino,
// per dare un nome leggibile a una tappa calcolata lungo un percorso (mai
// nominata da chi visita) — stessa logica del sito (src/geocoding.js).
// Nessun nome trovato → null, chi chiama decide il ripiego.
export async function geocodificaInversa(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=it`
    );
    const data = await res.json();
    const a = data?.address;
    return a?.city || a?.town || a?.village || a?.municipality || a?.county || null;
  } catch {
    return null;
  }
}
