// Ponte tra le schede (struttura, museo, borgo...) e "Crea la tua vacanza":
// dalla scheda si tocca «Aggiungi al percorso» e il posto arriva nella
// vacanza che si sta compilando, che resta aperta (con tutto il suo stato)
// sotto la scheda nella pila di schermate. Niente va passato nei parametri
// di navigazione se non dati semplici ({ giorno, ruolo }).

const ascoltatori = new Set();

// Chiamata da CreaVacanzaScreen: riceve (richiesta, luogo). Restituisce
// la funzione per disiscriversi.
export function iscriviAggiuntaLuogo(funzione) {
  ascoltatori.add(funzione);
  return () => ascoltatori.delete(funzione);
}

// Chiamata dalle schede. richiesta = { giorno, ruolo }, luogo = { tipo, id, nome, lat, lng, ... }.
export function aggiungiLuogoAlPercorso(richiesta, luogo) {
  ascoltatori.forEach((funzione) => funzione(richiesta, luogo));
}

// Luogo semplice (quello salvato nella vacanza) da una scheda struttura.
// Si tiene anche la scheda completa: serve per riaprirla più tardi dal
// percorso, senza altre richieste.
export function luogoDaStruttura(struttura) {
  if (!struttura || struttura.lat == null || struttura.lng == null) return null;
  return {
    tipo: "struttura",
    id: struttura.idOriginale ?? struttura.id,
    nome: struttura.nome,
    localita: struttura.localita || "",
    lat: Number(struttura.lat),
    lng: Number(struttura.lng),
    struttura,
  };
}

export function luogoDaSchedaCulturale(scheda) {
  if (!scheda || scheda.lat == null || scheda.lng == null) return null;
  return {
    tipo: "cultura",
    id: scheda.id,
    nome: scheda.titolo,
    localita: scheda.citta || "",
    lat: Number(scheda.lat),
    lng: Number(scheda.lng),
  };
}
