/**
 * ARRONDI À L'EURO — `FIS-008`
 *
 * `roundToEuros` est la seule fonction ajoutée à `money.ts`, fichier gelé au
 * sens d'ADR-004. Elle porte une règle de droit et non une commodité :
 *
 *   « Les bases des impositions de toute nature sont arrondies à l'euro le plus
 *   proche. La fraction d'euro égale à 0,50 est comptée pour 1. »
 *   — CGI, art. 1649 undecies
 *
 * Ce fichier garde les deux moitiés de cette phrase, et le fait que le résultat
 * reste exprimé en centimes. Les autres fonctions de `money.ts` ne sont pas
 * retouchées et leurs gardes vivent ailleurs.
 */

import { describe, it, expect } from "vitest";
import { euros, roundToEuros } from "../money";

describe("`roundToEuros` — l'arrondi des assiettes d'imposition", () => {
  it("rend des centimes, et toujours un multiple de cent", () => {
    // La sortie reste dans l'unité du moteur : un euro entier vaut 100.
    expect(roundToEuros(euros(50_000.1))).toBe(5_000_000);
    for (const c of [0, 1, 49, 50, 51, 99, 100, 1_234_567]) {
      expect(roundToEuros(c) % 100, `${c} centimes`).toBe(0);
    }
  });

  it("la fraction de 0,50 € est comptée pour 1, et 0,49 € ne l'est pas", () => {
    // Le cœur du texte, et la seule décision que la fonction prend.
    expect(roundToEuros(euros(50_000.49))).toBe(euros(50_000));
    expect(roundToEuros(euros(50_000.5))).toBe(euros(50_001));
    expect(roundToEuros(euros(50_000.51))).toBe(euros(50_001));
    expect(roundToEuros(euros(0.5))).toBe(euros(1));
    expect(roundToEuros(euros(0.49))).toBe(0);
  });

  it("ne bouge pas un montant déjà entier : l'opération est idempotente", () => {
    // Ce que la surtaxe exploite pour arrondir une seconde fois sans risque.
    for (const e of [0, 1, 50_000, 50_001, 260_000]) {
      expect(roundToEuros(euros(e))).toBe(euros(e));
      expect(roundToEuros(roundToEuros(euros(e) + 37))).toBe(roundToEuros(euros(e) + 37));
    }
  });

  it("reste monotone : arrondir ne peut pas inverser deux montants", () => {
    // C'est ce qui permet à la surtaxe de rester croissante avec l'assiette.
    let precedent = -1;
    for (let c = 0; c <= 100_000; c += 7) {
      const courant = roundToEuros(c);
      expect(courant).toBeGreaterThanOrEqual(precedent);
      precedent = courant;
    }
  });

  it("respecte les conventions d'arrondi nommées de `money.ts`", () => {
    expect(roundToEuros(euros(1.5), "half-up")).toBe(euros(2));
    expect(roundToEuros(euros(1.5), "half-even")).toBe(euros(2));
    expect(roundToEuros(euros(2.5), "half-even")).toBe(euros(2));
    expect(roundToEuros(euros(1.99), "down")).toBe(euros(1));
  });

  it("refuse un montant hors du domaine entier exact", () => {
    expect(() => roundToEuros(Number.MAX_SAFE_INTEGER * 2)).toThrow(RangeError);
    expect(() => roundToEuros(Number.NaN)).toThrow(RangeError);
  });
});
