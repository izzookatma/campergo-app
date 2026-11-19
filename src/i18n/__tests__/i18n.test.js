import it from "../it";
import en from "../en";
import fr from "../fr";
import de from "../de";
import nl from "../nl";

// it.js è la fonte di verità (vedi i18n.js): se un'altra lingua perde una
// chiave o ne aggiunge una per errore, questo test lo segnala subito,
// invece di scoprirlo mesi dopo con una chiave nuda in produzione.
describe("dizionari delle lingue", () => {
  const chiaviIt = Object.keys(it).sort();

  test.each([
    ["en", en],
    ["fr", fr],
    ["de", de],
    ["nl", nl],
  ])("%s ha esattamente le stesse chiavi di it", (_nome, dizionario) => {
    expect(Object.keys(dizionario).sort()).toEqual(chiaviIt);
  });

  test.each([
    ["it", it],
    ["en", en],
    ["fr", fr],
    ["de", de],
    ["nl", nl],
  ])("%s non ha testi vuoti", (_nome, dizionario) => {
    for (const testo of Object.values(dizionario)) {
      expect(typeof testo).toBe("string");
      expect(testo.trim().length).toBeGreaterThan(0);
    }
  });
});
