// Logica del "Gioco delle coppie" (memory), condivisa tra la modalità
// "contro il computer" e il controllo delle carte in generale.

export function creaMazzo(set, numeroCoppie) {
  const scelte = set.slice(0, numeroCoppie);
  const carte = scelte.flatMap((foto, indice) => [
    { id: `${indice}-a`, coppiaId: indice, immagine: foto.url, scoperta: false, abbinata: false },
    { id: `${indice}-b`, coppiaId: indice, immagine: foto.url, scoperta: false, abbinata: false },
  ]);
  // Mescola (Fisher-Yates): l'ordine deve essere casuale a ogni partita,
  // non solo "a coppie adiacenti" come restituito da flatMap sopra.
  for (let i = carte.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [carte[i], carte[j]] = [carte[j], carte[i]];
  }
  return carte;
}

// "memoria" è { [coppiaId]: [indici delle carte di quella coppia già viste] },
// costruita via via che le carte vengono scoperte (da chiunque le scopra:
// in un memory vero entrambi i giocatori vedono gli stessi tentativi).
export function aggiornaMemoria(memoria, indice, coppiaId) {
  const esistenti = memoria[coppiaId] || [];
  if (esistenti.includes(indice)) return memoria;
  return { ...memoria, [coppiaId]: [...esistenti, indice] };
}

// "difficile": il computer ricorda quasi sempre le coppie già viste.
// "facile": se ne dimentica spesso, resta battibile.
const PROBABILITA_RICORDO = { facile: 0.35, difficile: 0.85 };

export function sceglieIndiceIA(carte, memoria, livello, indiceGiaScelto) {
  const disponibili = carte
    .map((_, i) => i)
    .filter((i) => !carte[i].abbinata && !carte[i].scoperta && i !== indiceGiaScelto);
  if (disponibili.length === 0) return -1;

  const ricordaBene = Math.random() < PROBABILITA_RICORDO[livello];

  if (indiceGiaScelto != null) {
    const coppiaId = carte[indiceGiaScelto].coppiaId;
    const notoAbbinato = (memoria[coppiaId] || []).find((i) => disponibili.includes(i));
    if (notoAbbinato != null && ricordaBene) return notoAbbinato;
    return disponibili[Math.floor(Math.random() * disponibili.length)];
  }

  if (ricordaBene) {
    for (const coppiaId of Object.keys(memoria)) {
      const indici = memoria[coppiaId].filter((i) => disponibili.includes(i));
      if (indici.length >= 2) return indici[0];
    }
  }
  return disponibili[Math.floor(Math.random() * disponibili.length)];
}
