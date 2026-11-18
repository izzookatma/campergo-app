// Estratta da AuthContext.js per poterla testare da sola, senza dover
// montare tutto il provider React: analizza la URL di ritorno del login
// Google/Facebook (naturago://auth-callback#access_token=...&refresh_token=...),
// dove i token arrivano nel frammento perché detectSessionInUrl è
// disattivato (vedi commento in AuthContext.js).
export function estraiTokenDaCallback(url) {
  const indiceFrammento = url.indexOf("#");
  const parametri = new URLSearchParams(indiceFrammento === -1 ? "" : url.slice(indiceFrammento + 1));
  return {
    access_token: parametri.get("access_token"),
    refresh_token: parametri.get("refresh_token"),
  };
}
