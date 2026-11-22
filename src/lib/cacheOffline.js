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

export async function rimuoviDallaCache(chiave) {
  try {
    await AsyncStorage.removeItem(PREFISSO + chiave);
  } catch (e) {
    console.error("Errore nel rimuovere dalla cache offline:", e);
  }
}

// Tutte le chiavi salvate che iniziano con un dato prefisso (es.
// "itinerario_offline_"), senza dover tenere un indice a parte da
// mantenere sincronizzato: AsyncStorage.getAllKeys() basta.
export async function elencaChiaviCache(prefissoChiave) {
  try {
    const tutte = await AsyncStorage.getAllKeys();
    return tutte.filter((k) => k.startsWith(PREFISSO + prefissoChiave)).map((k) => k.slice(PREFISSO.length));
  } catch {
    return [];
  }
}

// Carica dalla rete e, se manca la connessione (o il server non risponde),
// ricade sull'ultima copia salvata. Se non c'è nemmeno quella, l'errore
// originale arriva alla schermata come prima. `salta`: ricerche libere e
// simili, che non vale la pena tenere in memoria.
export async function conCache(chiave, caricatore, { salta = false } = {}) {
  if (salta) return caricatore();
  try {
    const dati = await caricatore();
    salvaInCache(chiave, dati);
    return dati;
  } catch (errore) {
    const copia = await leggiDaCache(chiave);
    if (copia) return copia.dati;
    throw errore;
  }
}
