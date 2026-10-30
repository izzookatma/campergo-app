// Messaggi di errore comprensibili per l'app: stessa regola del sito (vedi
// src/erroriComprensibili.js nel repo campergo) - mai error.message grezzo
// davanti all'utente, il dettaglio tecnico resta solo in console.error.

function testoDi(err) {
  if (err == null) return "";
  if (typeof err === "string") return err;
  return [err.message, err.details, err.hint, err.error_description].filter((v) => typeof v === "string").join(" | ");
}

export function messaggioErroreComprensibile(err, azione) {
  console.error("[NaturaGo app] Errore:", azione || "", err);
  const testo = testoDi(err);
  const codice = String(err?.code ?? "");

  const concludi = (frase) => (azione ? `${azione} ${frase}` : frase);

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
