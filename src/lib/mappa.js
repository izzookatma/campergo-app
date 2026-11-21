// URL per aprire una struttura nell'app di mappe scelta (Google, Apple o
// Waze), condiviso tra Scheda e Prenotazioni perché la logica è identica.
// Link universali: se l'app è installata si apre lei, altrimenti il sito.
export function urlMappa(struttura, motoreMappa) {
  if (struttura?.lat == null || struttura?.lng == null) return null;
  if (motoreMappa === "google") {
    return `https://www.google.com/maps/search/?api=1&query=${struttura.lat},${struttura.lng}`;
  }
  if (motoreMappa === "waze") {
    return `https://waze.com/ul?ll=${struttura.lat},${struttura.lng}&navigate=yes`;
  }
  return `https://maps.apple.com/?q=${encodeURIComponent(struttura.nome)}&ll=${struttura.lat},${struttura.lng}`;
}

// Navigazione lungo tutte le tappe, nell'app di mappe scelta. Google accetta
// tappe intermedie; Apple Maps le accetta con "to:"; Waze ha una sola
// destinazione, quindi porta alla prima tappa. Senza almeno una tappa con
// coordinate restituisce null.
export function urlPercorso(tappe, motoreMappa) {
  const punti = (tappe || []).filter((p) => p?.lat != null && p?.lng != null);
  if (punti.length === 0) return null;
  const ll = (p) => `${p.lat},${p.lng}`;
  if (punti.length === 1) return urlMappa({ nome: punti[0].nome || "", lat: punti[0].lat, lng: punti[0].lng }, motoreMappa);
  const prima = punti[0];
  const ultima = punti[punti.length - 1];
  const intermedie = punti.slice(1, -1);
  if (motoreMappa === "waze") return `https://waze.com/ul?ll=${ll(prima)}&navigate=yes`;
  if (motoreMappa === "google") {
    const waypoints = intermedie.length ? `&waypoints=${encodeURIComponent(intermedie.map(ll).join("|"))}` : "";
    return `https://www.google.com/maps/dir/?api=1&origin=${ll(prima)}&destination=${ll(ultima)}${waypoints}&travelmode=driving`;
  }
  const destinazioni = [...intermedie, ultima].map(ll).join("+to:");
  return `https://maps.apple.com/?saddr=${ll(prima)}&daddr=${destinazioni}&dirflg=d`;
}
