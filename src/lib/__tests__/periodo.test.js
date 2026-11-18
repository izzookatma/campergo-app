import { isoDaData, dataDaIso, etichettaData, numeroNotti, apertoNelPeriodo } from "../periodo";

describe("isoDaData / dataDaIso", () => {
  test("andata e ritorno preserva il giorno (nessuno slittamento di fuso)", () => {
    const d = new Date(2026, 11, 24); // 24 dicembre 2026, ora locale
    expect(isoDaData(d)).toBe("2026-12-24");
    expect(dataDaIso("2026-12-24").getDate()).toBe(24);
    expect(dataDaIso("2026-12-24").getMonth()).toBe(11);
  });

  test("mesi e giorni a una cifra hanno lo zero davanti", () => {
    expect(isoDaData(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("etichettaData", () => {
  test("stringa vuota senza data", () => {
    expect(etichettaData(null)).toBe("");
    expect(etichettaData(undefined)).toBe("");
  });

  test("formato giorno + mese abbreviato in italiano", () => {
    expect(etichettaData("2026-12-24")).toBe("24 dic");
    expect(etichettaData("2026-01-05")).toBe("5 gen");
  });
});

describe("numeroNotti", () => {
  test("0 se mancano le date", () => {
    expect(numeroNotti(null, "2026-12-24")).toBe(0);
    expect(numeroNotti("2026-12-24", null)).toBe(0);
  });

  test("conta le notti, non i giorni di calendario", () => {
    expect(numeroNotti("2026-12-24", "2026-12-27")).toBe(3);
  });

  test("funziona a cavallo di un cambio di mese", () => {
    expect(numeroNotti("2026-12-30", "2027-01-02")).toBe(3);
  });
});

describe("apertoNelPeriodo", () => {
  test("senza date non filtra mai nulla", () => {
    expect(apertoNelPeriodo({ periodoAperturaTipo: "stagionale" }, null, null)).toBe(true);
  });

  test("struttura aperta tutto l'anno: sempre aperta", () => {
    expect(apertoNelPeriodo({ periodoAperturaTipo: "tutto_anno" }, "2026-01-10", "2026-01-15")).toBe(true);
  });

  test("stagionale, soggiorno dentro l'intervallo: aperta", () => {
    const struttura = { periodoAperturaTipo: "stagionale", aperturaMeseInizio: 4, aperturaMeseFine: 9 };
    expect(apertoNelPeriodo(struttura, "2026-07-01", "2026-07-08")).toBe(true);
  });

  test("stagionale, soggiorno fuori dall'intervallo: chiusa", () => {
    const struttura = { periodoAperturaTipo: "stagionale", aperturaMeseInizio: 4, aperturaMeseFine: 9 };
    expect(apertoNelPeriodo(struttura, "2026-12-20", "2026-12-27")).toBe(false);
  });

  test("stagione a cavallo dell'anno (es. inverno: nov-mar)", () => {
    const struttura = { periodoAperturaTipo: "stagionale", aperturaMeseInizio: 11, aperturaMeseFine: 3 };
    expect(apertoNelPeriodo(struttura, "2026-12-20", "2026-12-27")).toBe(true);
    expect(apertoNelPeriodo(struttura, "2026-07-01", "2026-07-08")).toBe(false);
  });

  test("soggiorno che copre più mesi: tutti devono essere aperti", () => {
    const struttura = { periodoAperturaTipo: "stagionale", aperturaMeseInizio: 4, aperturaMeseFine: 9 };
    // L'ultima notte (29 settembre) è dentro, ma il soggiorno arriva fino
    // al check-out del 2 ottobre: ottobre non è aperto.
    expect(apertoNelPeriodo(struttura, "2026-09-25", "2026-10-02")).toBe(false);
  });
});
