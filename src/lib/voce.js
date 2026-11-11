// Dettatura col microfono e lettura ad alta voce: stesso ruolo del
// src/voce.js del sito, ma con i moduli nativi (il sito nel browser non ha
// queste API su iOS). Un solo punto da cui chiedere "si può?" e "fai X": chi
// lo usa (RicercaIA, CreaPercorso) non deve sapere come è fatto sotto.
import {
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import * as Speech from "expo-speech";

export function dettaturaDisponibile() {
  return ExpoSpeechRecognitionModule.isRecognitionAvailable();
}

// Ritorna null se non è riuscita a partire (onErrore è già stato chiamato),
// altrimenti un oggetto con ferma() per fermarla a mano.
export async function avviaDettatura({ lingua, onRisultato, onErrore, onFine }) {
  try {
    const permesso = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permesso.granted) {
      onErrore?.();
      return null;
    }
  } catch {
    onErrore?.();
    return null;
  }

  const listenerRisultato = ExpoSpeechRecognitionModule.addListener("result", (evento) => {
    const frase = evento.results?.[0]?.transcript;
    if (frase) onRisultato(frase);
  });
  const listenerErrore = ExpoSpeechRecognitionModule.addListener("error", () => onErrore?.());
  const listenerFine = ExpoSpeechRecognitionModule.addListener("end", () => onFine?.());

  const rimuoviListener = () => {
    listenerRisultato.remove();
    listenerErrore.remove();
    listenerFine.remove();
  };

  try {
    ExpoSpeechRecognitionModule.start({ lang: lingua, interimResults: false, continuous: false });
  } catch {
    rimuoviListener();
    onErrore?.();
    return null;
  }

  return {
    ferma: () => {
      rimuoviListener();
      ExpoSpeechRecognitionModule.stop();
    },
  };
}

export function letturaDisponibile() {
  return true;
}

export function leggi(testo, lingua) {
  if (!testo) return Promise.resolve();
  Speech.stop();
  return new Promise((risolvi) => {
    Speech.speak(testo, { language: lingua, onDone: risolvi, onStopped: risolvi, onError: risolvi });
  });
}

export function fermaLettura() {
  Speech.stop();
}
