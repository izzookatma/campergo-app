import AsyncStorage from "@react-native-async-storage/async-storage";

// Modalità offline minima (Fase 3 del piano): salva l'ultimo elenco di
// strutture caricato con successo, così resta consultabile anche senza
// connessione, invece di mostrare solo un errore.
const PREFISSO = "naturago_cache_";

export async function salvaInCache(chiave, dati) {
  try {
    await AsyncStorage.setItem(PREFISSO + chiave, JSON.stringify({ dati, salvatoIl: Date.now() }));
  } catch (e) {
    console.error("Errore nel salvare la cache offline:", e);
  }
}

// Torna { dati, salvatoIl } oppure null se non c'è nulla in cache.
export async function leggiDaCache(chiave) {
  try {
    const grezzo = await AsyncStorage.getItem(PREFISSO + chiave);
    return grezzo ? JSON.parse(grezzo) : null;
  } catch {
    return null;
  }
}
