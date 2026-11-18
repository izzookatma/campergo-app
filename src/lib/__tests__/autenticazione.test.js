import { estraiTokenDaCallback } from "../autenticazione";

// Login Google/Facebook (AuthContext.js, accediConProvider): i token
// tornano nel FRAMMENTO della URL di callback, non nella querystring
// (detectSessionInUrl è disattivato apposta). Un regressione qui
// romperebbe silenziosamente l'accesso social, senza che nessun errore
// di rete lo segnali: per questo merita un test suo.
describe("estraiTokenDaCallback", () => {
  test("estrae access_token e refresh_token dal frammento", () => {
    const url = "naturago://auth-callback#access_token=AAA111&refresh_token=BBB222&token_type=bearer";
    expect(estraiTokenDaCallback(url)).toEqual({ access_token: "AAA111", refresh_token: "BBB222" });
  });

  test("nessun frammento → entrambi i token nulli", () => {
    expect(estraiTokenDaCallback("naturago://auth-callback")).toEqual({
      access_token: null,
      refresh_token: null,
    });
  });

  test("frammento vuoto (solo #) → entrambi i token nulli", () => {
    expect(estraiTokenDaCallback("naturago://auth-callback#")).toEqual({
      access_token: null,
      refresh_token: null,
    });
  });

  test("manca solo il refresh_token (es. provider che cambia risposta): non deve inventarlo", () => {
    const url = "naturago://auth-callback#access_token=AAA111";
    expect(estraiTokenDaCallback(url)).toEqual({ access_token: "AAA111", refresh_token: null });
  });

  test("ignora parametri prima del #, usa solo quelli nel frammento", () => {
    const url = "naturago://auth-callback?access_token=NONVALIDO#access_token=VALIDO&refresh_token=VALIDO2";
    expect(estraiTokenDaCallback(url)).toEqual({ access_token: "VALIDO", refresh_token: "VALIDO2" });
  });
});
