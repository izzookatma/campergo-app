// Percorso stradale vero tra più tappe (OSRM, nessuna chiave richiesta):
// stessa logica del sito (src/percorsoViaggio.js nel repo campergo), usata
// sia dalla mappa dell'itinerario (MappaItinerario.js) sia da "Creami un
// percorso" nella schermata Mappa (MappaScreen.js) - un solo posto dove è
// scritta in questo repo.

import { geocodificaInversa } from "./geocodifica";

// Deve restare uguale a TAPPE_MASSIME nella edge function genera-itinerario-ia
// (repo campergo): è il tetto di tappe che quella funzione accetta comunque.
export const TAPPE_MASSIME = 5;

export function distanzaKmPunti(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}

// Percorso stradale vero tra le tappe (in ordine), con anche km e minuti di
// guida presi dalla risposta OSRM (come sul sito, src/percorsoViaggio.js:
// niente di ricalcolato). Punti nello stesso formato di
// geocodificaOCoordinate ({lat,lng}); chi disegna la mappa
// (react-native-maps vuole {latitude,longitude}) converte all'uso.
export async function percorsoStradaleConDati(tappe) {
  const coordinate = tappe.map((t) => `${t.lng},${t.lat}`).join(";");
  const risposta = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinate}?overview=full&geometries=geojson`);
  const dati = await risposta.json();
  const rotta = dati?.routes?.[0];
  const geometria = rotta?.geometry?.coordinates;
  if (!geometria || geometria.length < 2) return null;
  return {
    punti: geometria.map(([lng, lat]) => ({ lat, lng })),
    distanzaKm: rotta.distance != null ? rotta.distance / 1000 : null,
    minuti: rotta.duration != null ? Math.round(rotta.duration / 60) : null,
  };
}

// Percorso stradale vero per UN ELENCO ORDINATO di punti, con km e minuti di
// OGNI tratto (da un punto al successivo, nell'ordine dato da chi pianifica).
// Serve a "Crea la tua vacanza": una sola chiamata OSRM per tutto il viaggio.
// Restituisce { punti, tratte: [{ km, minuti }], distanzaKm, minuti } o null.
export async function percorsoConTratte(puntiOrdinati) {
  if (!puntiOrdinati || puntiOrdinati.length < 2) return null;
  const coordinate = puntiOrdinati.map((t) => `${t.lng},${t.lat}`).join(";");
  const risposta = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinate}?overview=full&geometries=geojson`);
  const dati = await risposta.json();
  const rotta = dati?.routes?.[0];
  const geometria = rotta?.geometry?.coordinates;
  if (!rotta || !geometria || geometria.length < 2 || !Array.isArray(rotta.legs)) return null;
  return {
    punti: geometria.map(([lng, lat]) => ({ lat, lng })),
    tratte: rotta.legs.map((l) => ({ km: l.distance / 1000, minuti: Math.round(l.duration / 60) })),
    distanzaKm: rotta.distance / 1000,
    minuti: Math.round(rotta.duration / 60),
  };
}

// Solo i punti, come prima: le mappe che non mostrano km e tempo non cambiano.
export async function percorsoStradale(tappe) {
  const risultato = await percorsoStradaleConDati(tappe);
  return risultato ? risultato.punti : null;
}

// "Da Milano a Napoli in 7 giorni" nominava solo partenza e arrivo: senza
// tappe intermedie vere il piano finiva per dividere i giorni solo tra
// Milano e Napoli, invece di muoversi lungo la strada come un vero viaggio
// su più giorni. Qui si trovano tappe intermedie reali (sulla strada vera
// tra le tappe nominate, non a caso) quando i giorni richiesti sono più
// delle tappe che chi visita ha nominato.
export async function aggiungiTappeIntermedie(tappeNominate, giorni) {
  if (tappeNominate.length < 2) return tappeNominate;
  // +1: la partenza non è una giornata di visita (vedi genera-itinerario-ia),
  // quindi servono tante tappe da visitare quanti sono i giorni.
  const totaliDesiderate = Math.min(giorni + 1, TAPPE_MASSIME);
  const daAggiungere = totaliDesiderate - tappeNominate.length;
  if (daAggiungere <= 0) return tappeNominate;

  const percorso = await percorsoStradale(tappeNominate);
  if (!percorso) return tappeNominate;

  const cumulativa = [0];
  for (let i = 1; i < percorso.length; i++) cumulativa.push(cumulativa[i - 1] + distanzaKmPunti(percorso[i - 1], percorso[i]));
  const totaleKm = cumulativa[cumulativa.length - 1];

  const posizioneSullaStrada = (punto) => {
    let indiceMigliore = 0;
    let distanzaMigliore = Infinity;
    for (let i = 0; i < percorso.length; i++) {
      const d = distanzaKmPunti(percorso[i], punto);
      if (d < distanzaMigliore) {
        distanzaMigliore = d;
        indiceMigliore = i;
      }
    }
    return cumulativa[indiceMigliore];
  };

  const ancore = tappeNominate.map((t) => ({ ...t, posizione: posizioneSullaStrada(t) }));

  const puntiIntermedi = [];
  for (let k = 1; k <= daAggiungere; k++) {
    const target = (totaleKm * k) / (daAggiungere + 1);
    let indice = cumulativa.findIndex((d) => d >= target);
    if (indice === -1) indice = percorso.length - 1;
    puntiIntermedi.push({ ...percorso[indice], posizione: cumulativa[indice] });
  }

  const intermediConNome = await Promise.all(
    puntiIntermedi.map(async (p) => ({ ...p, nome: (await geocodificaInversa(p.lat, p.lng)) || "Tappa lungo il percorso" }))
  );

  // Scarta una tappa (nominata o intermedia) troppo vicina alla precedente
  // sulla strada: evita doppioni quando un punto intermedio cade quasi
  // sopra una tappa già nominata.
  return [...ancore, ...intermediConNome]
    .sort((a, b) => a.posizione - b.posizione)
    .filter((t, i, arr) => i === 0 || t.posizione - arr[i - 1].posizione > 15);
}
