import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { urlImmagineRidimensionata } from "../lib/immagini";
import { richiediPosto, eDaWikimedia } from "../lib/codaImmagini";

const TENTATIVI_MASSIMI = 4;

// Al posto di `{url ? <Image .../> : <Ionicons .../>}` ripetuto in ogni
// schermata: oltre a mostrare l'icona quando manca la foto, la mostra anche
// se la foto c'è ma il link è rotto (altrimenti resta un riquadro vuoto, non
// distinguibile da un caricamento bloccato) e chiede a Wikimedia una
// versione più leggera invece del file originale.
//
// Wikimedia risponde 403 alle richieste con l'identità predefinita del client
// HTTP di Android ("okhttp/…"), quindi su Android nessuna foto Wikimedia si
// vedeva (verificato il 17/11/2026: okhttp 403, nome descrittivo 200). Per
// ogni foto si manda un User-Agent descrittivo, come chiede la loro policy.
const INTESTAZIONI_FOTO = { "User-Agent": "NaturaGo/1.0 (https://naturago.it)" };

export default function ImmagineConRiserva({
  uri,
  larghezza = 400,
  style,
  icona = "image-outline",
  iconaDimensione = 22,
  iconaColore,
}) {
  const [rotta, setRotta] = useState(false);
  const [tentativo, setTentativo] = useState(0);
  const urlOttimizzato = urlImmagineRidimensionata(uri, larghezza);

  // Le foto di Wikimedia partono una alla volta (vedi codaImmagini.js) e, se
  // vengono rifiutate, si riprovano con un po' di pausa.
  const dalLimitatore = eDaWikimedia(urlOttimizzato);
  const [turno, setTurno] = useState(!dalLimitatore);
  const rilascia = useRef(null);
  const timerRiprova = useRef(null);
  useEffect(() => {
    if (!dalLimitatore) return undefined;
    const annulla = richiediPosto((r) => {
      rilascia.current = r;
      setTurno(true);
    });
    return () => {
      annulla();
      rilascia.current?.();
      clearTimeout(timerRiprova.current);
    };
  }, [dalLimitatore, urlOttimizzato, tentativo]);

  const finito = () => {
    rilascia.current?.();
    rilascia.current = null;
  };
  const fallita = () => {
    finito();
    if (dalLimitatore && tentativo < TENTATIVI_MASSIMI) {
      timerRiprova.current = setTimeout(() => {
        setTurno(false);
        setTentativo((n) => n + 1);
      }, 1200 * (tentativo + 1));
    } else {
      setRotta(true);
    }
  };

  if (!urlOttimizzato || rotta) {
    // icona=null: alcuni sfondi (es. la card in evidenza del Blog) hanno già
    // un colore di riserva sotto un testo in sovraimpressione, dove
    // un'icona centrata stonerebbe più di un riquadro vuoto. Uno View vuoto
    // (invece di null) mantiene comunque le stesse dimensioni dell'immagine
    // mancata, così il resto della pagina non si sposta.
    return icona ? <Ionicons name={icona} size={iconaDimensione} color={iconaColore} /> : <View style={style} />;
  }

  if (!turno) return <View style={style} />;

  return (
    <Image
      key={tentativo}
      source={{ uri: urlOttimizzato, headers: INTESTAZIONI_FOTO }}
      style={style}
      onLoad={finito}
      onError={fallita}
      transition={200}
      cachePolicy="memory-disk"
    />
  );
}
