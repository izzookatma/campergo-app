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
