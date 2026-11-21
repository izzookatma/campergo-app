import { nuovaVacanza, giornoVuoto, dataDelGiorno, sequenzaPunti, totaliPerGiorno, pianoDaVacanza, vacanzaDaPiano, formattaKm, formattaTempo } from "../vacanza";

const luogo = (nome, lat, lng) => ({ tipo: "libero", id: null, nome, localita: "", lat, lng });

describe("vacanza personale", () => {
  test("la data di ogni giorno parte dalla data di partenza", () => {
    expect(dataDelGiorno("2027-07-30", 1)).toBe("2027-07-30");
    expect(dataDelGiorno("2027-07-30", 3)).toBe("2027-08-01");
    expect(dataDelGiorno(null, 2)).toBeNull();
  });

  test("la sequenza segue l'ordine scelto: posti del giorno, poi dove dormire", () => {
    const v = nuovaVacanza();
    v.giorni[0].luoghi = [luogo("A", 1, 1), luogo("B", 2, 2)];
    v.giorni[0].dormire = luogo("Campeggio", 3, 3);
    v.giorni.push({ ...giornoVuoto(2), luoghi: [luogo("C", 4, 4)] });
    expect(sequenzaPunti(v).map((p) => p.luogo.nome)).toEqual(["A", "B", "Campeggio", "C"]);
  });

  test("i totali del giorno sommano i tratti che arrivano ai suoi punti", () => {
    const v = nuovaVacanza();
    v.giorni[0].luoghi = [luogo("A", 1, 1), luogo("B", 2, 2)];
    v.giorni[0].dormire = luogo("Campeggio", 3, 3);
    v.giorni.push({ ...giornoVuoto(2), luoghi: [luogo("C", 4, 4)] });
    const tratte = [
      { km: 10, minuti: 12 }, // A→B (giorno 1)
      { km: 5, minuti: 6 }, // B→Campeggio (giorno 1)
      { km: 40, minuti: 45 }, // Campeggio→C (giorno 2)
    ];
    const t = totaliPerGiorno(sequenzaPunti(v), tratte);
    expect(t[1]).toEqual({ km: 15, minuti: 18 });
    expect(t[2]).toEqual({ km: 40, minuti: 45 });
  });

  test("si salva come piano personale e si riapre uguale", () => {
    const v = nuovaVacanza();
    v.titolo = "Toscana";
    v.dataInizio = "2027-07-30";
    v.giorni[0].appunti = "Prenotare la cena";
    v.giorni[0].luoghi = [luogo("A", 1, 1)];
    const piano = pianoDaVacanza(v, { km: 123.4, minuti: 90 });
    expect(piano.tipo).toBe("personale");
    expect(piano.totale).toEqual({ km: 123, minuti: 90 });
    expect(vacanzaDaPiano(piano)).toEqual(v);
  });

  test("la partenza non è una tappa del Giorno 1: il primo tratto conta nel Giorno 1", () => {
    const v = nuovaVacanza();
    v.partenza = luogo("Casa", 0, 0);
    v.giorni[0].luoghi = [luogo("A", 1, 1)];
    const punti = sequenzaPunti(v);
    expect(punti.map((p) => p.ruolo)).toEqual(["partenza", "visita"]);
    expect(punti[0].giorno).toBe(0);
    const t = totaliPerGiorno(punti, [{ km: 30, minuti: 35 }]);
    expect(t[1]).toEqual({ km: 30, minuti: 35 });
    expect(t[0]).toBeUndefined();
    expect(vacanzaDaPiano(pianoDaVacanza(v, null)).partenza.nome).toBe("Casa");
  });

  test("formati km e tempo", () => {
    expect(formattaKm(4.26)).toBe("4,3 km");
    expect(formattaKm(120.4)).toBe("120 km");
    expect(formattaTempo(95)).toBe("1 h 35 min");
    expect(formattaTempo(40)).toBe("40 min");
  });
});
