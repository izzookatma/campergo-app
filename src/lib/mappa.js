// URL per aprire una struttura nell'app di mappe scelta (Google, Apple o
// Waze), condiviso tra Scheda e Prenotazioni perché la logica è identica.
// Link universali: se l'app è installata si apre lei, altrimenti il sito.
export function urlMappa(struttura, motoreMappa) {
  if (!struttura?.lat || !struttura?.lng) return null;
  if (motoreMappa === "google") {
    return `https://www.google.com/maps/search/?api=1&query=${struttura.lat},${struttura.lng}`;
  }
  if (motoreMappa === "waze") {
    return `https://waze.com/ul?ll=${struttura.lat},${struttura.lng}&navigate=yes`;
  }
  return `https://maps.apple.com/?q=${encodeURIComponent(struttura.nome)}&ll=${struttura.lat},${struttura.lng}`;
}
