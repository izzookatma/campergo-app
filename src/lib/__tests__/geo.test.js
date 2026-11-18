import { distanzaKm } from "../geo";

describe("distanzaKm", () => {
  test("stesso punto = 0 km", () => {
    expect(distanzaKm(45.4642, 9.19, 45.4642, 9.19)).toBeCloseTo(0, 5);
  });

  test("Milano → Roma, circa 480 km in linea d'aria", () => {
    const km = distanzaKm(45.4642, 9.19, 41.9028, 12.4964);
    expect(km).toBeGreaterThan(450);
    expect(km).toBeLessThan(510);
  });

  test("è simmetrica (A→B = B→A)", () => {
    const aB = distanzaKm(45.4642, 9.19, 41.9028, 12.4964);
    const bA = distanzaKm(41.9028, 12.4964, 45.4642, 9.19);
    expect(aB).toBeCloseTo(bA, 9);
  });

  test("attraversare l'antimeridiano/il cambio di segno della longitudine non dà risultati assurdi", () => {
    // Paderno Dugnano, usato dal vivo nei test manuali del progetto
    // (vedi memoria "Vicino a me ora"): una struttura a ~5 km di distanza
    // deve restare un numero piccolo, non far scattare un bug di segno.
    const km = distanzaKm(45.5833, 9.1667, 45.62, 9.2);
    expect(km).toBeGreaterThan(0);
    expect(km).toBeLessThan(10);
  });
});
