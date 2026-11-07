import { createContext, useContext, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
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

  // Login Google/Facebook: apre il browser di sistema sulla pagina del
  // provider (stesso giro OAuth del sito), poi il provider rimanda a un
  // indirizzo "naturago://auth-callback" che riapre l'app con i token
  // nel frammento dell'URL (#access_token=...&refresh_token=...) invece
  // che nella querystring — da qui li leggiamo a mano e creiamo la
  // sessione con setSession, perché detectSessionInUrl è disattivato
  // (non ha senso su un URL che non passa mai dal browser dell'app).
  const accediConProvider = async (provider) => {
    const redirectTo = Linking.createURL("auth-callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { error };

    const risultato = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (risultato.type !== "success" || !risultato.url) return { error: null };

    const indiceFrammento = risultato.url.indexOf("#");
    const parametri = new URLSearchParams(indiceFrammento === -1 ? "" : risultato.url.slice(indiceFrammento + 1));
    const access_token = parametri.get("access_token");
    const refresh_token = parametri.get("refresh_token");
    if (!access_token || !refresh_token) return { error: { message: "Accesso non riuscito, riprova." } };

    return supabase.auth.setSession({ access_token, refresh_token });
  };

  const accediConGoogle = () => accediConProvider("google");
  const accediConFacebook = () => accediConProvider("facebook");

  // Stessa logica del sito (AccountArea.jsx): il link porta alla pagina
  // di reimpostazione del sito, non serve costruire un deep link dentro
  // l'app — dopo aver cambiato la password lì, si torna ad accedere qui.
  // www.naturago.it, non naturago.it: Supabase controlla `redirectTo`
  // contro l'elenco degli URL consentiti configurato nel progetto, che
  // probabilmente elenca il dominio canonico — naturago.it è solo un
  // redirect 308 a livello Vercel, un controllo "a stringa" lato Supabase
  // lo vedrebbe come un dominio diverso.
  const recuperaPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://www.naturago.it/reimposta-password" });

  // Stessa RPC del sito (elimina_mio_account): richiede di aver appena
  // verificato la password (fatto dalla schermata chiamante) e il testo
  // di conferma esatto "CANCELLA".
  const eliminaAccount = (testoConferma) => supabase.rpc("elimina_mio_account", { p_conferma: testoConferma });

  return (
    <AuthContext.Provider
      value={{ session, caricamento, accedi, registrati, esci, recuperaPassword, eliminaAccount, accediConGoogle, accediConFacebook }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
