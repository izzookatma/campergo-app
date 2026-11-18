// strutture.js importa il client Supabase reale (serve solo alle funzioni
// che fanno query, non a normalizzaCampeggio): lo sostituiamo con un finto,
// altrimenti createClient() andrebbe in errore senza le variabili
// EXPO_PUBLIC_SUPABASE_URL/ANON_KEY dell'ambiente di test.
jest.mock("../supabase", () => ({ supabase: {} }));

// eslint-disable-next-line import/first -- jest.mock deve precedere l'import che mocka
import { normalizzaCampeggio, ETICHETTE_TIPO, ETICHETTA_RIFUGIO } from "../strutture";

describe("normalizzaCampeggio", () => {
  const rigaBase = {
    id: 42,
    tipo_struttura: "agricampeggio",
    nome: "Agricampeggio Le Querce",
    localita: "Pontremoli (MS)",
    prezzo_da: 18,
    prezzo: 25,
    foto_url: "https://example.com/foto.jpg",
    lat: 44.38,
    lng: 9.88,
    rating: 4.6,
    recensioni: 12,
    telefono: "0123456789",
    descrizione: "Un bel posto tranquillo.",
    ha_promo_attiva: true,
    amenities: ["elettricita", "piscina"],
    periodo_apertura_tipo: "stagionale",
    apertura_mese_inizio: 4,
    apertura_mese_fine: 9,
  };

  test("traduce il tipo struttura con l'etichetta italiana", () => {
    expect(normalizzaCampeggio(rigaBase).tipo).toBe(ETICHETTE_TIPO.agricampeggio);
  });

  test("id diventa un id composito stabile, idOriginale resta il numero vero", () => {
    const risultato = normalizzaCampeggio(rigaBase);
    expect(risultato.id).toBe("campeggio-42");
    expect(risultato.idOriginale).toBe(42);
  });

  test("usa prezzo_da quando c'è, non il prezzo pieno", () => {
    expect(normalizzaCampeggio(rigaBase).prezzo).toBe(18);
  });

  test("senza prezzo_da ricade sul prezzo pieno, poi su null", () => {
    expect(normalizzaCampeggio({ ...rigaBase, prezzo_da: null }).prezzo).toBe(25);
    expect(normalizzaCampeggio({ ...rigaBase, prezzo_da: null, prezzo: null }).prezzo).toBeNull();
  });

  test("tipo_struttura non riconosciuto ricade su 'Struttura', non va in crash", () => {
    expect(normalizzaCampeggio({ ...rigaBase, tipo_struttura: "qualcosa_di_nuovo" }).tipo).toBe("Struttura");
  });

  test("amenities non è un array (dato sporco dal database) → lista vuota, non un crash a valle", () => {
    expect(normalizzaCampeggio({ ...rigaBase, amenities: null }).servizi).toEqual([]);
  });

  test("ha_promo_attiva diventa un booleano vero, qualunque sia il valore grezzo", () => {
    expect(normalizzaCampeggio({ ...rigaBase, ha_promo_attiva: 1 }).haPromoAttiva).toBe(false);
    expect(normalizzaCampeggio({ ...rigaBase, ha_promo_attiva: true }).haPromoAttiva).toBe(true);
  });
});

describe("ETICHETTA_RIFUGIO", () => {
  test("'capanna' confluisce in 'Rifugio' (troppo poche schede per una tessera propria)", () => {
    expect(ETICHETTA_RIFUGIO.capanna).toBe("Rifugio");
    expect(ETICHETTA_RIFUGIO.rifugio).toBe("Rifugio");
    expect(ETICHETTA_RIFUGIO.bivacco).toBe("Bivacco");
  });
});
