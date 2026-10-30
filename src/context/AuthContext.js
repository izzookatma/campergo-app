import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCaricamento(false);
    });
    const { data: iscrizione } = supabase.auth.onAuthStateChange((_evento, nuovaSessione) => {
      setSession(nuovaSessione);
    });
    return () => iscrizione.subscription.unsubscribe();
  }, []);

  const accedi = (email, password) => supabase.auth.signInWithPassword({ email, password });

  const registrati = (email, password, nome) =>
    supabase.auth.signUp({ email, password, options: { data: { nome } } });

  const esci = () => supabase.auth.signOut();

  // Stessa logica del sito (AccountArea.jsx): il link porta alla pagina
  // di reimpostazione del sito, non serve costruire un deep link dentro
  // l'app — dopo aver cambiato la password lì, si torna ad accedere qui.
  const recuperaPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://naturago.it/reimposta-password" });

  // Stessa RPC del sito (elimina_mio_account): richiede di aver appena
  // verificato la password (fatto dalla schermata chiamante) e il testo
  // di conferma esatto "CANCELLA".
  const eliminaAccount = (testoConferma) => supabase.rpc("elimina_mio_account", { p_conferma: testoConferma });

  return (
    <AuthContext.Provider value={{ session, caricamento, accedi, registrati, esci, recuperaPassword, eliminaAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
