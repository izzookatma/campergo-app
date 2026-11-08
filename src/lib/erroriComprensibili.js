// Messaggi di errore comprensibili per l'app: stessa regola del sito (vedi
// src/erroriComprensibili.js nel repo campergo) - mai error.message grezzo
// davanti all'utente, il dettaglio tecnico resta solo in console.error.

function testoDi(err) {
  if (err == null) return "";
  if (typeof err === "string") return err;
  return [err.message, err.details, err.hint, err.error_description].filter((v) => typeof v === "string").join(" | ");
}

// Testo che non deve mai comparire davanti a chi usa l'app: nomi di
// vincoli/tabelle, sigle del database, frammenti di codice, risposte JSON.
const TESTO_TECNICO =
  /violates|constraint|relation "|column "|schema cache|syntax error|sqlstate|pgrst|\bjwt\b|stack|typeerror|referenceerror|undefined|\bnull\b|_fkey|_pkey|_key\b|\bpublic\.|\bauth\.|http \d{3}|econn|enotfound|\{|\}|\bat .+\(.+:\d+:\d+\)|\berror:/i;

// Le funzioni Edge del progetto (genera-itinerario-ia, ecc.) mandano già
// frasi italiane pronte per chi usa l'app ("Non ho trovato strutture
// NaturaGo entro 35 km...", "Il pianificatore IA ha raggiunto il limite
// di oggi..."): prima questo file le buttava via sostituendole sempre con
// un messaggio generico — segnalato dal vivo, "Genera il piano" falliva
// senza mai spiegare perché davvero.
const SEMBRA_ITALIANO =
  /\b(il|lo|la|le|un|una|non|è|di|del|della|dei|per|con|che|nel|nella|già|più|può|puoi|devi|dati|mancant[ei]|obbligatori[oae]?|valid[ao]|trovat[ao]|riprova|impossibile|errore|password|limite|oggi|domani)\b|[àèéìòù]/i;

export function messaggioErroreComprensibile(err, azione) {
  console.error("[NaturaGo app] Errore:", azione || "", err);
  const testo = testoDi(err);
  const codice = String(err?.code ?? "");

  const concludi = (frase) => (azione ? `${azione} ${frase}` : frase);

  if (testo && !TESTO_TECNICO.test(testo) && SEMBRA_ITALIANO.test(testo)) {
    const frase = testo.trim();
    return concludi(/[.!?…]$/.test(frase) ? frase : `${frase}.`);
  }

  if (/failed to fetch|network/i.test(testo)) {
    return concludi("Controlla la connessione a internet.");
  }
  if (/already registered|already been registered/i.test(testo) || codice === "user_already_exists") {
    return "Questa email è già registrata: prova ad accedere invece di registrarti.";
  }
  if (/invalid login credentials/i.test(testo)) {
    return "Email o password non corrette.";
  }
  if (/email not confirmed/i.test(testo)) {
    return "Devi confermare l'email prima di accedere: controlla la posta.";
  }
  if (/password should (be|contain)|weak password/i.test(testo)) {
    return "La password è troppo debole: usa almeno 6 caratteri.";
  }
  if (/invalid email/i.test(testo)) {
    return "L'indirizzo email non è valido.";
  }
  if (/rate limit|too many requests/i.test(testo)) {
    return "Troppi tentativi: riprova tra qualche minuto.";
  }
  if (/jwt|session|refresh.?token/i.test(testo)) {
    return "La sessione è scaduta: accedi di nuovo.";
  }
  return concludi("Qualcosa non ha funzionato, riprova tra poco.");
}
