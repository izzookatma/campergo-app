// Stessi servizi del pannello filtri del sito (colonna `amenities`, array
// testo su campeggi_pubblici — vedi AMENITY_META in src/App.jsx), ma solo
// le voci che oggi hanno davvero almeno una struttura (verificato dal
// vivo sul database), raggruppate come sul sito per restare pratiche con
// un elenco altrimenti troppo lungo. I rifugi non hanno questi servizi
// (niente colonna amenities), restano fuori quando un filtro è attivo.
export const CATEGORIE_FILTRI_SERVIZI = [
  {
    titolo: "Comfort",
    icona: "home-outline",
    voci: [
      { chiave: "elettricita", etichetta: "Corrente elettrica" },
      { chiave: "acquaPotabile", etichetta: "Acqua potabile" },
      { chiave: "docce", etichetta: "Docce calde" },
      { chiave: "bagni", etichetta: "Bagni" },
      { chiave: "wifi", etichetta: "Wi-Fi" },
      { chiave: "lavatrici", etichetta: "Lavatrici" },
      { chiave: "lavapiatti", etichetta: "Lavapiatti" },
    ],
  },
  {
    titolo: "Servizi camper",
    icona: "water-outline",
    voci: [
      { chiave: "camperService", etichetta: "Camper service" },
      { chiave: "caricoAcqua", etichetta: "Carico acqua" },
      { chiave: "scaricoAcqueNere", etichetta: "Scarico acque nere" },
      { chiave: "scaricoAcqueGrigie", etichetta: "Scarico acque grigie" },
      { chiave: "scaricoWcChimico", etichetta: "Scarico WC chimico" },
      { chiave: "scaricoPozzetto", etichetta: "Scarico pozzetto" },
    ],
  },
  {
    titolo: "Ristorazione",
    icona: "restaurant-outline",
    voci: [
      { chiave: "ristorante", etichetta: "Ristorante interno" },
      { chiave: "bar", etichetta: "Bar" },
      { chiave: "selfService", etichetta: "Self service" },
      { chiave: "market", etichetta: "Market/minimarket" },
    ],
  },
  {
    titolo: "Sport e tempo libero",
    icona: "basketball-outline",
    voci: [
      { chiave: "piscina", etichetta: "Piscina" },
      { chiave: "giochiBambini", etichetta: "Giochi bambini" },
      { chiave: "campoTennis", etichetta: "Campo tennis" },
      { chiave: "padel", etichetta: "Padel" },
      { chiave: "noleggioBici", etichetta: "Noleggio bici" },
      { chiave: "lavaggioBici", etichetta: "Lavaggio bici" },
      { chiave: "spiaggia", etichetta: "Accesso diretto in spiaggia" },
    ],
  },
  {
    titolo: "Animali",
    icona: "paw-outline",
    voci: [
      { chiave: "petFriendly", etichetta: "Pet-friendly" },
      { chiave: "animaliAmmessi", etichetta: "Animali ammessi" },
      { chiave: "zonaCani", etichetta: "Zona cani" },
      { chiave: "lavaggioCani", etichetta: "Lavaggio cani" },
    ],
  },
  {
    titolo: "Struttura e regole",
    icona: "shield-checkmark-outline",
    voci: [
      { chiave: "adattoFamiglie", etichetta: "Adatto alle famiglie" },
      { chiave: "apertoTuttoAnno", etichetta: "Aperto tutto l'anno" },
      { chiave: "accessibile", etichetta: "Accessibile alle carrozzine" },
      { chiave: "acsi", etichetta: "Convenzionato ACSI" },
    ],
  },
];

// Stessa lista ma appiattita chiave → etichetta: serve nella Scheda per
// mostrare i servizi veri di una struttura (l'array `amenities`), senza
// ripetere le etichette una seconda volta.
export const ETICHETTA_SERVIZIO = CATEGORIE_FILTRI_SERVIZI.reduce((mappa, categoria) => {
  for (const voce of categoria.voci) mappa[voce.chiave] = voce.etichetta;
  return mappa;
}, {});
