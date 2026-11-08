// Logica del Tris, riusabile sia per la modalità "contro il computer" che
// per trovare automaticamente righe vincenti da evidenziare (2 giocatori
// incluso). Il tabellone è un array di 9 celle: null, "X" o "O".

const LINEE_VINCENTI = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function trovaLineaVincente(celle) {
  for (const linea of LINEE_VINCENTI) {
    const [a, b, c] = linea;
    if (celle[a] && celle[a] === celle[b] && celle[a] === celle[c]) {
      return { giocatore: celle[a], linea };
    }
  }
  return null;
}

export function celleLibere(celle) {
  return celle.reduce((acc, v, i) => (v ? acc : [...acc, i]), []);
}

export function partitaFinita(celle) {
  if (trovaLineaVincente(celle)) return true;
  return celleLibere(celle).length === 0;
}

// Minimax completo: il computer (giocatore "O") non perde mai se giocato
// a livello "difficile". Il tabellone del Tris ha solo 9 celle, quindi
// esplorare tutto l'albero delle mosse costa pochissimo.
function minimax(celle, giocatore) {
  const vincitore = trovaLineaVincente(celle);
  if (vincitore) return { punteggio: vincitore.giocatore === "O" ? 1 : -1 };
  const libere = celleLibere(celle);
  if (libere.length === 0) return { punteggio: 0 };

  let migliore = null;
  for (const indice of libere) {
    const nuoveCelle = [...celle];
    nuoveCelle[indice] = giocatore;
    const risultato = minimax(nuoveCelle, giocatore === "O" ? "X" : "O");
    const candidato = { indice, punteggio: risultato.punteggio };
    if (!migliore) {
      migliore = candidato;
      continue;
    }
    const megliorePerO = giocatore === "O" && candidato.punteggio > migliore.punteggio;
    const megliorePerX = giocatore === "X" && candidato.punteggio < migliore.punteggio;
    if (megliorePerO || megliorePerX) migliore = candidato;
  }
  return migliore;
}

function mossaMigliore(celle) {
  return minimax(celle, "O").indice;
}

function mossaCasuale(celle) {
  const libere = celleLibere(celle);
  return libere[Math.floor(Math.random() * libere.length)];
}

// "Facile": il computer a volte sbaglia (può essere battuto), ma non è
// stupido — cerca comunque di vincere o bloccare la maggior parte delle
// volte, altrimenti l'avversario lo batte troppo in fretta per sembrare
// un gioco vero.
function mossaFacile(celle) {
  const puoVincereSubito = celleLibere(celle).some((indice) => {
    const prova = [...celle];
    prova[indice] = "O";
    return trovaLineaVincente(prova)?.giocatore === "O";
  });
  if (puoVincereSubito && Math.random() < 0.6) return mossaMigliore(celle);

  const deveBloccare = celleLibere(celle).some((indice) => {
    const prova = [...celle];
    prova[indice] = "X";
    return trovaLineaVincente(prova)?.giocatore === "X";
  });
  if (deveBloccare && Math.random() < 0.5) return mossaMigliore(celle);

  return mossaCasuale(celle);
}

export function mossaIA(celle, livello) {
  if (celleLibere(celle).length === 0) return -1;
  return livello === "difficile" ? mossaMigliore(celle) : mossaFacile(celle);
}
