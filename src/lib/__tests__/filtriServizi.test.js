import { CATEGORIE_FILTRI_SERVIZI, ETICHETTA_SERVIZIO } from "../filtriServizi";

// CATEGORIE_FILTRI_SERVIZI alimenta sia il pannello filtri (ModaleFiltriEsplora)
// sia, tramite ETICHETTA_SERVIZIO (derivata con un reduce), i badge servizi
// nella Scheda struttura: una `chiave` duplicata in due categorie diverse
// non darebbe un errore visibile, solo un'etichetta "rubata" in silenzio
// (l'ultima categoria vince nel reduce) e una React key doppia nel pannello
// filtri. Questa suite esiste per intercettare quel tipo di errore quando
// si aggiunge un nuovo servizio.
describe("CATEGORIE_FILTRI_SERVIZI", () => {
  const tutteLeVoci = CATEGORIE_FILTRI_SERVIZI.flatMap((categoria) => categoria.voci);

  test("ogni categoria ha titolo, icona e almeno una voce", () => {
    for (const categoria of CATEGORIE_FILTRI_SERVIZI) {
      expect(typeof categoria.titolo).toBe("string");
      expect(categoria.titolo.length).toBeGreaterThan(0);
      expect(typeof categoria.icona).toBe("string");
      expect(categoria.voci.length).toBeGreaterThan(0);
    }
  });

  test("ogni voce ha una chiave e un'etichetta non vuote", () => {
    for (const voce of tutteLeVoci) {
      expect(typeof voce.chiave).toBe("string");
      expect(voce.chiave.length).toBeGreaterThan(0);
      expect(typeof voce.etichetta).toBe("string");
      expect(voce.etichetta.length).toBeGreaterThan(0);
    }
  });

  test("nessuna chiave si ripete tra categorie diverse", () => {
    const chiavi = tutteLeVoci.map((v) => v.chiave);
    const chiaviUniche = new Set(chiavi);
    expect(chiaviUniche.size).toBe(chiavi.length);
  });

  test("ETICHETTA_SERVIZIO contiene esattamente le stesse chiavi (nessuna persa nel reduce)", () => {
    const chiaviAttese = tutteLeVoci.map((v) => v.chiave).sort();
    const chiaviMappa = Object.keys(ETICHETTA_SERVIZIO).sort();
    expect(chiaviMappa).toEqual(chiaviAttese);
  });
});
