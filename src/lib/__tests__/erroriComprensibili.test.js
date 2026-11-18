import { messaggioErroreComprensibile } from "../erroriComprensibili";

// Regola fissa del progetto (CLAUDE.md): mai error.message grezzo davanti a
// chi usa l'app. Questa suite esiste soprattutto per impedire una
// regressione silenziosa su questa regola, più che per il testo esatto.
describe("messaggioErroreComprensibile", () => {
  const SPIA_CONSOLE = jest.spyOn(console, "error").mockImplementation(() => {});
  afterEach(() => SPIA_CONSOLE.mockClear());
  afterAll(() => SPIA_CONSOLE.mockRestore());

  test("non lascia mai passare un dettaglio tecnico del database", () => {
    const erroreTecnico = {
      message: 'duplicate key value violates unique constraint "campeggi_pubblici_pkey"',
    };
    const messaggio = messaggioErroreComprensibile(erroreTecnico);
    expect(messaggio.toLowerCase()).not.toMatch(/constraint|pkey|violates/);
  });

  test("non lascia mai passare uno stack trace o un TypeError", () => {
    const messaggio = messaggioErroreComprensibile(new TypeError("Cannot read properties of undefined (reading 'foo')"));
    expect(messaggio.toLowerCase()).not.toMatch(/typeerror|undefined|reading/);
  });

  test("email/password errate → messaggio dedicato", () => {
    expect(messaggioErroreComprensibile({ message: "Invalid login credentials" })).toBe("Email o password non corrette.");
  });

  test("email già registrata → messaggio dedicato, riconosce anche solo il codice", () => {
    expect(messaggioErroreComprensibile({ code: "user_already_exists" })).toBe(
      "Questa email è già registrata: prova ad accedere invece di registrarti."
    );
  });

  test("nessuna connessione → messaggio dedicato", () => {
    expect(messaggioErroreComprensibile(new TypeError("Failed to fetch"))).toBe("Controlla la connessione a internet.");
  });

  test("sessione scaduta (jwt/refresh token) → messaggio dedicato", () => {
    expect(messaggioErroreComprensibile({ message: "JWT expired" })).toBe("La sessione è scaduta: accedi di nuovo.");
  });

  test("un messaggio in italiano già pronto (funzione Edge) passa quasi invariato", () => {
    const messaggio = messaggioErroreComprensibile({
      message: "Non ho trovato strutture NaturaGo entro 35 km da questa zona.",
    });
    expect(messaggio).toBe("Non ho trovato strutture NaturaGo entro 35 km da questa zona.");
  });

  test("un messaggio che sembra italiano ma contiene un frammento tecnico non passa comunque", () => {
    const messaggio = messaggioErroreComprensibile({
      message: 'non è stato possibile, column "foo_bar" does not exist',
    });
    expect(messaggio).toBe("Qualcosa non ha funzionato, riprova tra poco.");
  });

  test("errore vuoto/nullo non va in crash, torna il messaggio generico", () => {
    expect(() => messaggioErroreComprensibile(null)).not.toThrow();
    expect(messaggioErroreComprensibile(null)).toBe("Qualcosa non ha funzionato, riprova tra poco.");
  });

  test("con 'azione' il messaggio generico/italiano viene anteposto", () => {
    const messaggio = messaggioErroreComprensibile({ message: "Errore inatteso" }, "Impossibile salvare i preferiti:");
    expect(messaggio.startsWith("Impossibile salvare i preferiti:")).toBe(true);
  });
});
