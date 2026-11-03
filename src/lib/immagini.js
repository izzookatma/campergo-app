// Molte foto delle schede (quasi tutte quelle "generiche", prese da Wikimedia
// Commons in fase di import) sono salvate come URL del file originale, che
// pesa svariati MB anche per una miniatura di poche decine di pixel.
// Wikimedia genera comunque, su richiesta, una versione ridimensionata reale
// (non solo scalata dal browser) raggiungibile con un URL prevedibile: la
// trasformiamo qui, senza toccare i dati salvati nel database.
const URL_ORIGINALE_WIKIMEDIA =
  /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)$/i;

// Wikimedia non genera più una miniatura a qualunque larghezza si chieda:
// da qualche tempo accetta solo queste larghezze (richiesta una volta,
// verificato dal vivo contro più file - altre larghezze "di buon senso"
// come 150, 220 o 300 rispondono 400 con "Use thumbnail sizes listed on
// https://w.wiki/GHai"). Si arrotonda sempre verso la più vicina per eccesso.
const LARGHEZZE_VALIDE_WIKIMEDIA = [60, 120, 250, 500, 960, 1280, 1920];

function larghezzaValidaWikimedia(larghezza) {
  return LARGHEZZE_VALIDE_WIKIMEDIA.find((l) => l >= larghezza) || LARGHEZZE_VALIDE_WIKIMEDIA.at(-1);
}

export function urlImmagineRidimensionata(url, larghezza = 400) {
  if (!url) return url;

  const corrispondenza = url.match(URL_ORIGINALE_WIKIMEDIA);
  if (!corrispondenza) return url;

  const [, cartella1, cartella2, nomeFile] = corrispondenza;
  const larghezzaValida = larghezzaValidaWikimedia(larghezza);
  const estensione = nomeFile.split(".").pop()?.toLowerCase();
  // I file vettoriali vengono convertiti in PNG dal ridimensionatore di
  // Wikimedia: il nome del file miniatura porta sia l'estensione originale
  // sia quella nuova (è così che Wikimedia costruisce l'URL).
  const nomeFileMiniatura =
    estensione === "svg" ? `${larghezzaValida}px-${nomeFile}.png` : `${larghezzaValida}px-${nomeFile}`;

  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${cartella1}/${cartella2}/${nomeFile}/${nomeFileMiniatura}`;
}
