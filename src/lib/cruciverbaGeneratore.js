// Genera schemi di cruciverba "veri" (parole che si incrociano sulla
// lettera giusta, non uno schema fisso) incrociando via via le parole
// della banca (vedi cruciverbaBanca.js) in una griglia vuota, un po' come
// fanno i generatori di cruciverba classici: si piazza una prima parola al
// centro, poi si cercano incroci validi per le altre finché si raggiunge
// l'obiettivo di parole del livello scelto (o non se ne trovano più).

export const LIVELLI_CRUCIVERBA = {
  facile: { dimensione: 7, paroleObiettivo: 5, paroleMinime: 4 },
  medio: { dimensione: 9, paroleObiettivo: 8, paroleMinime: 6 },
  difficile: { dimensione: 11, paroleObiettivo: 11, paroleMinime: 8 },
};

function mescola(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function creaGrigliaVuota(dimensione) {
  return Array.from({ length: dimensione }, () => Array(dimensione).fill(null));
}

// Una parola si può piazzare se entra nella griglia, non "sbatte" contro la
// fine/l'inizio di un'altra parola nella stessa direzione, ogni lettera
// combacia con quella già presente (se la cella non è vuota) e le celle
// vuote attraversate non hanno un'altra lettera subito affiancata di lato
// (altrimenti la parola toccherebbe un'altra parola senza un vero incrocio).
function puoPiazzare(grid, dimensione, parola, riga, colonna, direzione, richiedeIncrocio) {
  const dr = direzione === "vert" ? 1 : 0;
  const dc = direzione === "orizz" ? 1 : 0;
  const rigaFine = riga + dr * (parola.length - 1);
  const colonnaFine = colonna + dc * (parola.length - 1);
  if (riga < 0 || colonna < 0 || rigaFine >= dimensione || colonnaFine >= dimensione) return false;

  const rPrima = riga - dr;
  const cPrima = colonna - dc;
  if (rPrima >= 0 && cPrima >= 0 && rPrima < dimensione && cPrima < dimensione && grid[rPrima][cPrima] != null) return false;
  const rDopo = riga + dr * parola.length;
  const cDopo = colonna + dc * parola.length;
  if (rDopo >= 0 && cDopo >= 0 && rDopo < dimensione && cDopo < dimensione && grid[rDopo][cDopo] != null) return false;

  let incroci = 0;
  for (let i = 0; i < parola.length; i++) {
    const r = riga + dr * i;
    const c = colonna + dc * i;
    const esistente = grid[r][c];
    if (esistente != null) {
      if (esistente !== parola[i]) return false;
      incroci++;
    } else if (direzione === "orizz") {
      if (r - 1 >= 0 && grid[r - 1][c] != null) return false;
      if (r + 1 < dimensione && grid[r + 1][c] != null) return false;
    } else {
      if (c - 1 >= 0 && grid[r][c - 1] != null) return false;
      if (c + 1 < dimensione && grid[r][c + 1] != null) return false;
    }
  }
  return richiedeIncrocio ? incroci > 0 : true;
}

function trovaPosizione(grid, dimensione, parola) {
  for (let i = 0; i < parola.length; i++) {
    const lettera = parola[i];
    for (let r = 0; r < dimensione; r++) {
      for (let c = 0; c < dimensione; c++) {
        if (grid[r][c] !== lettera) continue;
        if (puoPiazzare(grid, dimensione, parola, r, c - i, "orizz", true)) return { riga: r, colonna: c - i, direzione: "orizz" };
        if (puoPiazzare(grid, dimensione, parola, r - i, c, "vert", true)) return { riga: r - i, colonna: c, direzione: "vert" };
      }
    }
  }
  return null;
}

function scrivi(grid, parola, riga, colonna, direzione) {
  const dr = direzione === "vert" ? 1 : 0;
  const dc = direzione === "orizz" ? 1 : 0;
  for (let i = 0; i < parola.length; i++) {
    grid[riga + dr * i][colonna + dc * i] = parola[i];
  }
}

function assegnaNumeri(dimensione, piazzate) {
  const inizi = new Map(); // "r-c" -> numero
  let numero = 1;
  const chiavi = piazzate
    .map((p) => `${p.riga}-${p.colonna}`)
    .filter((chiave, indice, lista) => lista.indexOf(chiave) === indice);
  // Numerare in ordine di lettura (riga poi colonna), non nell'ordine di piazzamento.
  const posizioni = chiavi
    .map((chiave) => {
      const [r, c] = chiave.split("-").map(Number);
      return { chiave, r, c };
    })
    .sort((a, b) => (a.r === b.r ? a.c - b.c : a.r - b.r));
  for (const { chiave } of posizioni) {
    inizi.set(chiave, numero);
    numero++;
  }
  return piazzate.map((p) => ({ ...p, numero: inizi.get(`${p.riga}-${p.colonna}`) }));
}

function generaUnTentativo(banca, config) {
  const { dimensione, paroleObiettivo } = config;
  const bancaValida = banca.filter((v) => v.parola.length <= dimensione - 2);
  if (bancaValida.length === 0) return null;
  const grid = creaGrigliaVuota(dimensione);
  const bancaMescolata = mescola(bancaValida);

  const prima = bancaMescolata.find((v) => v.parola.length >= 4) || bancaMescolata[0];
  const rigaIniziale = Math.floor(dimensione / 2);
  const colonnaIniziale = Math.floor((dimensione - prima.parola.length) / 2);
  scrivi(grid, prima.parola, rigaIniziale, colonnaIniziale, "orizz");

  const piazzate = [{ ...prima, riga: rigaIniziale, colonna: colonnaIniziale, direzione: "orizz" }];
  const usate = new Set([prima.parola]);

  for (const candidata of bancaMescolata) {
    if (piazzate.length >= paroleObiettivo) break;
    if (usate.has(candidata.parola)) continue;
    const posizione = trovaPosizione(grid, dimensione, candidata.parola);
    if (!posizione) continue;
    scrivi(grid, candidata.parola, posizione.riga, posizione.colonna, posizione.direzione);
    piazzate.push({ ...candidata, ...posizione });
    usate.add(candidata.parola);
  }

  return { dimensione, piazzate };
}

// Prova più volte (lo schema è casuale: un tentativo può uscire più povero
// di un altro) e tiene il risultato con più parole piazzate.
export function generaSchema(banca, livello, tentativi = 10) {
  const config = LIVELLI_CRUCIVERBA[livello];
  let migliore = null;
  for (let i = 0; i < tentativi; i++) {
    const tentativo = generaUnTentativo(banca, config);
    if (!tentativo) continue;
    if (!migliore || tentativo.piazzate.length > migliore.piazzate.length) migliore = tentativo;
    if (migliore.piazzate.length >= config.paroleObiettivo) break;
  }
  if (!migliore || migliore.piazzate.length < config.paroleMinime) return null;

  const parole = assegnaNumeri(migliore.dimensione, migliore.piazzate).map((p) => ({
    numero: p.numero,
    direzione: p.direzione,
    riga: p.riga,
    colonna: p.colonna,
    risposta: p.parola,
    indizio: p.indizio,
  }));
  return { dimensione: migliore.dimensione, parole };
}

export function costruisciGrigliaCelle(dimensione, parole) {
  const celle = Array.from({ length: dimensione }, () => Array(dimensione).fill(null));
  for (const p of parole) {
    for (let i = 0; i < p.risposta.length; i++) {
      const r = p.direzione === "vert" ? p.riga + i : p.riga;
      const c = p.direzione === "orizz" ? p.colonna + i : p.colonna;
      celle[r][c] = { lettera: p.risposta[i], numero: i === 0 ? p.numero : celle[r][c]?.numero };
    }
  }
  return celle;
}
