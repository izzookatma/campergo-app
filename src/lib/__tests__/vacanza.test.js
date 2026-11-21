import { trovaBersaglio, spostaLuogo, prossimoStatoPrenotazione, conLuogoCambiato, riassuntoPrenotazioni, urlPrenotazione, leggiLinkGoogleMaps, urlGoogleMaps, intervalloDate, nuovaVacanza, giornoVuoto, dataDelGiorno, sequenzaPunti, totaliPerGiorno, pianoDaVacanza, vacanzaDaPiano, formattaKm, formattaTempo } from "../vacanza";

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
    const { giorni, trasferimenti } = totaliPerGiorno(sequenzaPunti(v), tratte);
    // Dentro il giorno 1: A→B e B→Campeggio. Il tratto Campeggio→C è il
    // trasferimento verso il giorno 2, non parte di un giorno.
    expect(giorni[1]).toEqual({ km: 15, minuti: 18 });
    expect(giorni[2]).toBeUndefined();
    expect(trasferimenti[2]).toEqual({ km: 40, minuti: 45 });
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
    const { giorni, trasferimenti } = totaliPerGiorno(punti, [{ km: 30, minuti: 35 }]);
    expect(trasferimenti[1]).toEqual({ km: 30, minuti: 35 });
    expect(giorni[1]).toBeUndefined();
    expect(vacanzaDaPiano(pianoDaVacanza(v, null)).partenza.nome).toBe("Casa");
  });

  test("l'arrivo finale chiude il viaggio e il suo tratto è un trasferimento", () => {
    const v = nuovaVacanza();
    v.partenza = luogo("Casa", 0, 0);
    v.arrivo = luogo("Casa di nuovo", 0, 0);
    v.giorni[0].luoghi = [luogo("A", 1, 1)];
    const punti = sequenzaPunti(v);
    expect(punti.map((p) => p.ruolo)).toEqual(["partenza", "visita", "arrivo"]);
    const { trasferimenti } = totaliPerGiorno(punti, [{ km: 30, minuti: 35 }, { km: 31, minuti: 36 }]);
    expect(trasferimenti[1]).toEqual({ km: 30, minuti: 35 });
    expect(trasferimenti.arrivo).toEqual({ km: 31, minuti: 36 });
    expect(vacanzaDaPiano(pianoDaVacanza(v, null)).arrivo.nome).toBe("Casa di nuovo");
  });

  test("l'intervallo di date sotto il nome della vacanza", () => {
    expect(intervalloDate({ dataInizio: "2027-07-12", giorniRichiesti: 3 })).toBe("12 lug – 14 lug 2027");
    expect(intervalloDate({ dataInizio: "2027-07-12", giorniRichiesti: 1 })).toBe("12 lug 2027");
    expect(intervalloDate({ dataInizio: null, giorniRichiesti: 3 })).toBe("");
  });

  test("formati km e tempo", () => {
    expect(formattaKm(4.26)).toBe("4,3 km");
    expect(formattaKm(120.4)).toBe("120 km");
    expect(formattaTempo(95)).toBe("1 h 35 min");
    expect(formattaTempo(40)).toBe("40 min");
  });

  test("link di Google Maps: coordinate e nome", () => {
    const r = leggiLinkGoogleMaps("https://www.google.com/maps/place/Ristorante+Da+Mario/@44.4949,11.3426,17z/data=!3d44.4950!4d11.3427");
    expect(r).toEqual({ lat: 44.495, lng: 11.3427, nome: "Ristorante Da Mario" });
    expect(leggiLinkGoogleMaps("https://www.google.com/maps?q=45.1,9.2")).toEqual({ lat: 45.1, lng: 9.2, nome: "Posto da Google Maps" });
    expect(leggiLinkGoogleMaps("https://esempio.it/non-maps")).toBeNull();
    expect(leggiLinkGoogleMaps("https://www.google.com/maps/place/Roma")).toBeNull();
  });

  test("apertura di Google Maps vicino al punto", () => {
    expect(urlGoogleMaps({ lat: 44.4949, lng: 11.3426 }, "dormire")).toContain("/@44.49490,11.34260,12z");
    expect(urlGoogleMaps(null, "visita")).toContain("cosa%20visitare");
  });

  test("spostare un posto: nello stesso giorno e in un altro", () => {
    const v = nuovaVacanza();
    v.giorni[0].luoghi = [luogo("A", 1, 1), luogo("B", 2, 2), luogo("C", 3, 3)];
    v.giorni.push(giornoVuoto(2));
    // C prima di A
    expect(spostaLuogo(v, { giorno: 1, indice: 2 }, { giorno: 1, indice: 0 }).giorni[0].luoghi.map((l) => l.nome)).toEqual(["C", "A", "B"]);
    // A dopo C (indice di arrivo 3 = in fondo, e si toglie quello di partenza)
    expect(spostaLuogo(v, { giorno: 1, indice: 0 }, { giorno: 1, indice: 3 }).giorni[0].luoghi.map((l) => l.nome)).toEqual(["B", "C", "A"]);
    // B nel giorno 2
    const w = spostaLuogo(v, { giorno: 1, indice: 1 }, { giorno: 2, indice: 0 });
    expect(w.giorni[0].luoghi.map((l) => l.nome)).toEqual(["A", "C"]);
    expect(w.giorni[1].luoghi.map((l) => l.nome)).toEqual(["B"]);
    // l'originale non cambia
    expect(v.giorni[0].luoghi).toHaveLength(3);
  });

  test("prenotazioni: cambio di stato, nota, conteggio e pagina con le date", () => {
    expect([null, "da_prenotare", "prenotato"].map((x) => prossimoStatoPrenotazione(x))).toEqual(["da_prenotare", "prenotato", null]);
    const v = nuovaVacanza();
    v.dataInizio = "2027-07-12";
    v.giorni[0].dormire = { ...luogo("Campeggio", 1, 1), tipo: "struttura", urlSito: "/esplora?apri=77" };
    v.giorni[0].luoghi = [luogo("A", 2, 2)];
    const w = conLuogoCambiato(conLuogoCambiato(v, 1, "dormire", null, () => ({ prenotazione: { stato: "prenotato", nota: "n. 1" } })), 1, "visita", 0, () => ({ prenotazione: { stato: "da_prenotare", nota: "" } }));
    expect(riassuntoPrenotazioni(w)).toEqual({ daFare: 1, fatte: 1 });
    expect(urlPrenotazione(w.giorni[0].dormire, "2027-07-12", true)).toBe("https://www.naturago.it/esplora?apri=77&checkin=2027-07-12&checkout=2027-07-13");
    expect(urlPrenotazione(w.giorni[0].dormire, null, true)).toBe("https://www.naturago.it/esplora?apri=77");
    expect(urlPrenotazione({ tipo: "libero" }, "2027-07-12", true)).toBeNull();
  });

  test("trascinare: dove cadrebbe il posto sotto il dito", () => {
    // Giorno 1: due righe (y 100-160 e 170-230); giorno 2 vuoto (sezione y 300-380).
    const mis = {
      righe: [
        { giorno: 1, indice: 0, y: 100, h: 60 },
        { giorno: 1, indice: 1, y: 170, h: 60 },
      ],
      sezioni: [
        { giorno: 1, y: 90, h: 150 },
        { giorno: 2, y: 300, h: 80 },
      ],
      quanti: { 1: 2, 2: 0 },
    };
    expect(trovaBersaglio(mis, 110)).toEqual({ giorno: 1, indice: 0 }); // metà alta della prima: prima di lei
    expect(trovaBersaglio(mis, 150)).toEqual({ giorno: 1, indice: 1 }); // metà bassa della prima: dopo di lei
    expect(trovaBersaglio(mis, 225)).toEqual({ giorno: 1, indice: 2 }); // in fondo al giorno 1
    expect(trovaBersaglio(mis, 330)).toEqual({ giorno: 2, indice: 0 }); // giorno vuoto: in fondo
    expect(trovaBersaglio(mis, 600)).toBeNull(); // fuori da tutto
    // La pagina è scorsa di 50: le posizioni misurate salgono di 50.
    expect(trovaBersaglio(mis, 60, 50)).toEqual({ giorno: 1, indice: 0 });
  });
});
