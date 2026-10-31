import { supabase } from "./supabase";

// "Fai una domanda" (stessa RPC del sito, src/DomandaPage.jsx): chiunque,
// anche senza account, scrive una domanda e la riceviamo su info@naturago.it
// con "Rispondi" diretto a chi ha scritto. p_trappola (campo civetta
// anti-spam sul sito) non serve lato app: qui si passa sempre vuoto.
export async function inviaDomanda({ email, messaggio, nome, lingua = "it" }) {
  const { data, error } = await supabase.rpc("invia_domanda_sito", {
    p_email: email,
    p_messaggio: messaggio,
    p_nome: nome || null,
    p_lingua: lingua,
    p_trappola: "",
  });
  if (error) throw error;
  if (data === "non_valida") throw new Error("L'indirizzo email non è valido.");
  if (data === "troppe") throw new Error("Troppe domande inviate di recente: riprova più tardi.");
  if (data !== "ok") throw new Error("Non è stato possibile inviare la domanda.");
  return true;
}
