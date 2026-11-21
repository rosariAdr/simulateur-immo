import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARAMS_2026 } from "../params";

/**
 * LE BARÈME DE L'IMPÔT SUR LE REVENU — `FIS-012`
 *
 * Les taux marginaux vivaient dans `src/lib/patrimoine.ts`, sans source ni date :
 * la seule valeur réglementaire du simulateur à échapper à `src/core/fiscal/`.
 * Ils entrent dans `params.ts`, et ce test les confronte au texte.
 *
 * Seuls les TAUX sont reportés. Les limites des fractions sont revalorisées
 * chaque année, et le simulateur ne les emploie pas : la tranche marginale est
 * choisie par l'utilisateur, jamais calculée. Reporter des limites qu'aucun
 * calcul ne lit, ce serait une valeur à tenir à jour sans que rien ne casse le
 * jour où elle est fausse.
 */

const PARAMS_SRC = readFileSync(join(process.cwd(), "src/core/fiscal/params.ts"), "utf8");

const ir = PARAMS_2026.incomeTax;

describe("barème de l'impôt sur le revenu", () => {
  it("porte les quatre taux que l'article 197, I, 1 écrit en toutes lettres", () => {
    // CGI, art. 197, I, 1, version en vigueur depuis le 21 février 2026 (loi
    // n° 2026-103 du 19 février 2026, art. 4) : « 11 % », « 30 % », « 41 % », « 45 % ».
    expect(ir.marginalRatesPct.filter((t) => t > 0)).toEqual([11, 30, 41, 45]);
  });

  it("ouvre sur la fraction non imposée, celle qui n'excède pas le premier seuil", () => {
    // L'article n'écrit pas « 0 % » : il n'impose que « la fraction de chaque part
    // de revenu qui excède » le premier seuil. Un foyer dont toute la part reste
    // sous ce seuil a une tranche marginale nulle, et l'interface doit la proposer.
    expect(ir.marginalRatesPct[0]).toBe(0);
  });

  it("monte strictement, sans doublon", () => {
    const taux = ir.marginalRatesPct;
    for (let i = 1; i < taux.length; i++) expect(taux[i]).toBeGreaterThan(taux[i - 1] ?? Infinity);
  });

  it("cite l'article et sa version", () => {
    const deplie = PARAMS_SRC.replace(/\n\s*\*\s?/g, " ").replace(/\s+/g, " ");
    expect(deplie).toContain("art. 197, I, 1");
    expect(deplie).toContain("n° 2026-103 du 19 février 2026");
    expect(deplie).toContain("LEGIARTI000053542636");
  });
});
