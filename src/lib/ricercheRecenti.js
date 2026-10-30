import AsyncStorage from "@react-native-async-storage/async-storage";

const CHIAVE = "naturago_ricerche_recenti";
const MASSIMO = 8;

export async function caricaRicercheRecenti() {
  try {
    const grezzo = await AsyncStorage.getItem(CHIAVE);
    return grezzo ? JSON.parse(grezzo) : [];
  } catch {
    return [];
  }
}

// Aggiunge in cima, senza doppioni (confronto senza maiuscole/minuscole),
// tiene solo le ultime MASSIMO.
export async function salvaRicercaRecente(termine) {
  const pulito = termine.trim();
  if (!pulito) return caricaRicercheRecenti();
  const attuali = await caricaRicercheRecenti();
  const senzaDoppioni = attuali.filter((t) => t.toLowerCase() !== pulito.toLowerCase());
  const aggiornate = [pulito, ...senzaDoppioni].slice(0, MASSIMO);
  try {
    await AsyncStorage.setItem(CHIAVE, JSON.stringify(aggiornate));
  } catch (e) {
    console.error("Errore nel salvare le ricerche recenti:", e);
  }
  return aggiornate;
}

export async function cancellaRicercheRecenti() {
  try {
    await AsyncStorage.removeItem(CHIAVE);
  } catch (e) {
    console.error("Errore nel cancellare le ricerche recenti:", e);
  }
  return [];
}
