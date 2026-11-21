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
    telefono: struttura.telefono || null,
    // Pagina della struttura sul sito (per prenotare con le date già inserite).
    urlSito: struttura.origine === "campeggi_pubblici" ? `/esplora?apri=${struttura.idOriginale}` : null,
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

// Un sentiero o percorso 4x4: il punto è il suo INIZIO (dove si lascia il
// camper). `itinerario` ha i campi dell'app (titolo, regione, categoria,
// modalita, lunghezzaKm, dislivelloM); `inizio` = { lat, lng }.
export function luogoDaItinerario(itinerario, inizio) {
  if (!itinerario || !inizio || inizio.lat == null || inizio.lng == null) return null;
  return {
    tipo: "itinerario",
    id: itinerario.id,
    nome: itinerario.titolo ?? itinerario.nome,
    localita: itinerario.regione ?? itinerario.localita ?? "",
    lat: Number(inizio.lat),
    lng: Number(inizio.lng),
    itinerario: {
      categoria: itinerario.categoria,
      modalita: itinerario.modalita ?? null,
      lunghezzaKm: itinerario.lunghezzaKm ?? null,
      dislivelloM: itinerario.dislivelloM ?? null,
    },
    urlSito: `/itinerario/${itinerario.id}`,
  };
}

// "Sentiero a piedi · 8,5 km · ↑420 m": cosa mostrare sotto il nome di un
// itinerario (nelle liste e nel percorso). Per i posti salvati dal sito c'è già `info`.
export function infoLuogo(luogo, t) {
  if (luogo?.itinerario) {
    const it = luogo.itinerario;
    const tipo = it.categoria === "percorso_4x4" ? t("vacanza.percorso4x4") : it.modalita === "bici" ? t("vacanza.sentieroBici") : t("vacanza.sentieroPiedi");
    const km = it.lunghezzaKm != null ? `${Number(it.lunghezzaKm).toFixed(1).replace(".", ",").replace(",0", "")} km` : null;
    const dislivello = it.dislivelloM != null ? `↑${Math.round(Number(it.dislivelloM))} m` : null;
    return [tipo, km, dislivello].filter(Boolean).join(" · ");
  }
  return luogo?.info || "";
}
