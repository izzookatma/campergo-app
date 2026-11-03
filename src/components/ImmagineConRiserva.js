import { useState } from "react";
import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { urlImmagineRidimensionata } from "../lib/immagini";

// Al posto di `{url ? <Image .../> : <Ionicons .../>}` ripetuto in ogni
// schermata: oltre a mostrare l'icona quando manca la foto, la mostra anche
// se la foto c'è ma il link è rotto (altrimenti resta un riquadro vuoto, non
// distinguibile da un caricamento bloccato) e chiede a Wikimedia una
// versione più leggera invece del file originale.
export default function ImmagineConRiserva({
  uri,
  larghezza = 400,
  style,
  icona = "image-outline",
  iconaDimensione = 22,
  iconaColore,
}) {
  const [rotta, setRotta] = useState(false);
  const urlOttimizzato = urlImmagineRidimensionata(uri, larghezza);

  if (!urlOttimizzato || rotta) {
    // icona=null: alcuni sfondi (es. la card in evidenza del Blog) hanno già
    // un colore di riserva sotto un testo in sovraimpressione, dove
    // un'icona centrata stonerebbe più di un riquadro vuoto. Uno View vuoto
    // (invece di null) mantiene comunque le stesse dimensioni dell'immagine
    // mancata, così il resto della pagina non si sposta.
    return icona ? <Ionicons name={icona} size={iconaDimensione} color={iconaColore} /> : <View style={style} />;
  }

  return <Image source={{ uri: urlOttimizzato }} style={style} onError={() => setRotta(true)} />;
}
