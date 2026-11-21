import { paroleIniziano, rilevanza, filtraEOrdinaPerTesto, ordinaPerVicinanza, areaCercata, formattaDistanza } from "../ricercaPosti";

describe("ricerca dei posti", () => {
  test("«lodi» trova Lodi ma non Clodia: la parola deve cominciare così", () => {
    expect(paroleIniziano("Area Sosta Camper Lodi", "lodi")).toBe(true);
    expect(paroleIniziano("Piani di Clodia", "lodi")).toBe(false);
    expect(paroleIniziano("Parcheggio San Colombano al Lambro", "san colom")).toBe(true);
    expect(paroleIniziano("Città dell'Èlba", "elba")).toBe(true); // accenti
  });

  test("rilevanza: la città giusta batte il nome, il nome batte la zona", () => {
    expect(rilevanza({ nome: "X", localita: "Lodi, Lombardia", zona: "" }, "lodi")).toBe(0);
    expect(rilevanza({ nome: "Lodi Camper", localita: "Pavia", zona: "" }, "lodi")).toBe(1);
    expect(rilevanza({ nome: "Area Lodi Vecchio", localita: "Pavia", zona: "" }, "lodi")).toBe(2);
    expect(rilevanza({ nome: "Laghetto", localita: "Livraga, Lodigiano", zona: "Lodigiano" }, "lodigiano")).toBe(2);
    expect(rilevanza({ nome: "Piani di Clodia", localita: "Lazise", zona: "Garda" }, "lodi")).toBeNull();
  });

  test("filtra e ordina: prima la rilevanza, poi la distanza dal punto", () => {
    const el = [
      { nome: "Area Lodi Vecchio", localita: "Pavia", lat: 45.2, lng: 9.5 },
      { nome: "Piani di Clodia", localita: "Lazise", lat: 45.49, lng: 10.73 },
      { nome: "Camper", localita: "Lodi, Lombardia", lat: 45.31, lng: 9.5 },
    ];
    const r = filtraEOrdinaPerTesto(el, "lodi", { lat: 45.31, lng: 9.5 }, (x) => ({ nome: x.nome, localita: x.localita, zona: "", lat: x.lat, lng: x.lng }));
    expect(r.map((x) => x.nome)).toEqual(["Camper", "Area Lodi Vecchio"]);
    expect(r[0].distanzaKm).toBeLessThan(1);
  });

  test("ordina per vicinanza e scarta quello oltre il raggio", () => {
    const centro = { lat: 45.31, lng: 9.5 };
    const el = [
      { id: 1, lat: 45.0, lng: 9.5 },
      { id: 2, lat: 45.32, lng: 9.5 },
      { id: 3, lat: 41.9, lng: 12.5 },
    ];
    const r = ordinaPerVicinanza(el, centro, 50, (x) => x);
    expect(r.map((x) => x.id)).toEqual([2, 1]);
  });

  test("l'area è la città scritta, non un nome che la contiene a metà", () => {
    const luoghi = [{ nome: "Clodia, Veneto" }, { nome: "Lodi, Lombardia", lat: 45.3, lng: 9.5 }];
    expect(areaCercata(luoghi, "lodi").nome).toBe("Lodi, Lombardia");
    expect(areaCercata([{ nome: "Clodia" }], "lodi")).toBeNull();
    expect(formattaDistanza(6.04)).toBe("a 6,0 km");
    expect(formattaDistanza(24.4)).toBe("a 24 km");
  });
});
