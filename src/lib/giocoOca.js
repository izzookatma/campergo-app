// Motore del "Sentiero del campeggio": un gioco dell'oca con le domande,
// come un Trivial Pursuit in miniatura — le domande sono le stesse della
// banca del Cruciverba/Impiccato (indizio → parola), qui trasformate in
// scelta multipla con 3 parole sbagliate come distrattori.

export const DIMENSIONE_PERCORSO = 24;
export const COLONNE_TABELLONE = 4;

export function tipoCella(numero) {
  if (numero >= DIMENSIONE_PERCORSO) return "arrivo";
  if (numero % 6 === 0) return "riposo";
  return "domanda";
}

// Righe del tabellone a serpentina (su e giù), ognuna con i numeri delle
// caselle nell'ordine visivo da sinistra a destra.
export function generaTabellone() {
  const righe = DIMENSIONE_PERCORSO / COLONNE_TABELLONE;
  const celle = [];
  for (let r = 0; r < righe; r++) {
    const riga = [];
    for (let c = 0; c < COLONNE_TABELLONE; c++) riga.push(r * COLONNE_TABELLONE + c + 1);
    if (r % 2 === 1) riga.reverse();
    celle.push(riga);
  }
  return celle;
}

const PROBABILITA_CORRETTA_COMPUTER = { facile: 0.3, medio: 0.55, difficile: 0.82 };

export function probabilitaComputer(livello) {
  return PROBABILITA_CORRETTA_COMPUTER[livello] ?? 0.55;
}

function mescola(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Sceglie una domanda non ancora usata in questa partita e costruisce 4
// opzioni (la risposta vera + 3 parole sbagliate, di preferenza della
// stessa lunghezza, così la lunghezza non tradisce la risposta).
export function nuovaDomanda(banca, paroleUsate) {
  const disponibili = banca.filter((v) => !paroleUsate.includes(v.parola));
  const lista = disponibili.length > 0 ? disponibili : banca;
  const scelta = lista[Math.floor(Math.random() * lista.length)];

  const stessaLunghezza = banca.filter((v) => v.parola !== scelta.parola && v.parola.length === scelta.parola.length);
  const bacino = stessaLunghezza.length >= 3 ? stessaLunghezza : banca.filter((v) => v.parola !== scelta.parola);
  const distrattori = mescola(bacino)
    .slice(0, 3)
    .map((v) => v.parola);

  return {
    indizio: scelta.indizio,
    risposta: scelta.parola,
    opzioni: mescola([scelta.parola, ...distrattori]),
  };
}
