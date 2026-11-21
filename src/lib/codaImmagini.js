// Wikimedia rifiuta (429) le raffiche di richieste: aprendo una lista con
// decine di card, la maggior parte delle foto non si caricava (provato dal
// vivo: 41 rifiuti su 60 richieste insieme). Qui le foto di Wikimedia si
// scaricano poche alla volta; chi chiede deve restituire il posto (rilascia)
// appena la foto è caricata o fallita.
// Misurato dal vivo: una richiesta ogni ~0,4 s passa sempre (30 su 30), a raffica
// no (fino a 47 rifiuti su 60).
const MASSIMO_CONTEMPORANEE = 2;
const PAUSA_TRA_PARTENZE_MS = 350;
const TEMPO_MASSIMO_MS = 10000; // se nessuno rilascia, il posto torna libero da solo
const attesa = [];
let inCorso = 0;
let ultimaPartenza = 0;
let inAttesaDiPartire = false;

function avanza() {
  if (inAttesaDiPartire) return;
  while (inCorso < MASSIMO_CONTEMPORANEE && attesa.length > 0) {
    const pausa = ultimaPartenza + PAUSA_TRA_PARTENZE_MS - Date.now();
    if (pausa > 0) {
      inAttesaDiPartire = true;
      setTimeout(() => {
        inAttesaDiPartire = false;
        avanza();
      }, pausa);
      return;
    }
    ultimaPartenza = Date.now();
    const richiesta = attesa.shift();
    inCorso += 1;
    let rilasciato = false;
    const rilascia = () => {
      if (rilasciato) return;
      rilasciato = true;
      clearTimeout(timer);
      inCorso -= 1;
      avanza();
    };
    const timer = setTimeout(rilascia, TEMPO_MASSIMO_MS);
    richiesta.concedi(rilascia);
  }
}

export function richiediPosto(concedi) {
  const richiesta = { concedi };
  attesa.push(richiesta);
  avanza();
  return () => {
    const i = attesa.indexOf(richiesta);
    if (i >= 0) attesa.splice(i, 1);
  };
}

export function eDaWikimedia(url) {
  return typeof url === "string" && url.includes("wikimedia.org");
}
