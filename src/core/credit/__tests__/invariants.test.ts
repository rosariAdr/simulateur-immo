/**
 * TESTS DE PROPRIÉTÉS
 *
 * Ces tests ne vérifient pas des valeurs mais des VÉRITÉS qui doivent tenir sur
 * n'importe quelle entrée. C'est ce qui débusque les cas limites qu'on n'imagine
 * pas : taux nul, durée d'un mois, différé égal à la durée totale.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { sum } from "../../money";
import { PARAMS_2026 as P } from "../../fiscal/params";
import { amortize, monthlyPayment } from "../schedule";
import { apr } from "../apr";
import { prepaymentPenalty } from "../constraints";

const principal = fc.integer({ min: 100_00, max: 2_000_000_00 });
/**
 * Domaine réaliste. Un test précédent a généré un taux dénormal (3e-321 %) qui
 * annulait le dénominateur de l'annuité — cas corrigé dans le moteur, mais qui
 * n'a aucun sens métier. On borne donc le générateur au domaine réel, et on
 * teste le taux nul séparément.
 */
const rate = fc.oneof(
  fc.constant(0),
  fc.double({ min: 0.01, max: 15, noNaN: true, noDefaultInfinity: true }),
);
const months = fc.integer({ min: 1, max: 360 });

describe("invariants de l'échéancier", () => {
  it("la somme des parts de capital égale le capital emprunté", () => {
    fc.assert(
      fc.property(principal, rate, months, (c, r, n) => {
        const rows = amortize({ id: "x", label: "x", principal: c, annualRatePct: r, months: n });
        return sum(rows.map((row) => row.principal)) === c;
      }),
      { numRuns: 500 },
    );
  });

  it("le capital restant dû est décroissant et atteint exactement zéro", () => {
    fc.assert(
      fc.property(principal, rate, months, (c, r, n) => {
        const rows = amortize({ id: "x", label: "x", principal: c, annualRatePct: r, months: n });
        for (let i = 1; i < rows.length; i++) {
          if (rows[i]!.balance > rows[i - 1]!.balance) return false;
        }
        return rows[rows.length - 1]!.balance === 0;
      }),
      { numRuns: 500 },
    );
  });

  it("aucune part de capital n'est négative", () => {
    fc.assert(
      fc.property(principal, rate, months, (c, r, n) => {
        const rows = amortize({ id: "x", label: "x", principal: c, annualRatePct: r, months: n });
        return rows.every((row) => row.principal >= 0 && row.interest >= 0);
      }),
      { numRuns: 300 },
    );
  });

  it("un taux nul ne produit aucun intérêt", () => {
    fc.assert(
      fc.property(principal, months, (c, n) => {
        const rows = amortize({ id: "x", label: "x", principal: c, annualRatePct: 0, months: n });
        return sum(rows.map((row) => row.interest)) === 0;
      }),
      { numRuns: 200 },
    );
  });

  it("allonger la durée augmente le total des intérêts", () => {
    fc.assert(
      fc.property(principal, fc.double({ min: 0.5, max: 10, noNaN: true, noDefaultInfinity: true }), months, (c, r, n) => {
        const short = sum(amortize({ id: "a", label: "a", principal: c, annualRatePct: r, months: n }).map((x) => x.interest));
        const long = sum(amortize({ id: "b", label: "b", principal: c, annualRatePct: r, months: n + 12 }).map((x) => x.interest));
        return long >= short;
      }),
      { numRuns: 300 },
    );
  });

  it("un différé total ne réduit jamais le coût total", () => {
    fc.assert(
      fc.property(principal, fc.double({ min: 0.5, max: 10, noNaN: true, noDefaultInfinity: true }), fc.integer({ min: 24, max: 300 }), (c, r, n) => {
        const plain = sum(amortize({ id: "a", label: "a", principal: c, annualRatePct: r, months: n }).map((x) => x.interest));
        const deferred = amortize({ id: "b", label: "b", principal: c, annualRatePct: r, months: n, deferredMonths: 12, deferral: "total" });
        const deferredCost = sum(deferred.map((x) => x.interest + x.capitalized));
        return deferredCost >= plain;
      }),
      { numRuns: 300 },
    );
  });
});

describe("invariants du TAEG", () => {
  it("est supérieur ou égal au taux nominal dès qu'il existe des frais", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50_000_00, max: 500_000_00 }),
        fc.double({ min: 0.5, max: 8, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 60, max: 300 }),
        fc.integer({ min: 0, max: 5_000_00 }),
        (c, r, n, fees) => {
          const rows = amortize({ id: "x", label: "x", principal: c, annualRatePct: r, months: n });
          const value = apr({ netAdvanced: c - fees, payments: rows.map((x) => x.payment) });
          return !Number.isFinite(value) || value >= r - 1e-9;
        },
      ),
      { numRuns: 300 },
    );
  });

  it("croît avec les frais initiaux", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100_000_00, max: 400_000_00 }),
        fc.double({ min: 1, max: 6, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 120, max: 300 }),
        (c, r, n) => {
          const rows = amortize({ id: "x", label: "x", principal: c, annualRatePct: r, months: n });
          const pay = rows.map((x) => x.payment);
          const low = apr({ netAdvanced: c - 100_00, payments: pay });
          const high = apr({ netAdvanced: c - 3_000_00, payments: pay });
          return high >= low;
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("invariants des indemnités", () => {
  it("respectent simultanément les deux plafonds légaux", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_00, max: 300_000_00 }),
        fc.integer({ min: 1_000_00, max: 300_000_00 }),
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        (repaid, outstanding, r) => {
          const pen = prepaymentPenalty(Math.min(repaid, outstanding), outstanding, r, P);
          const capA = (Math.min(repaid, outstanding) * r * 6) / 100 / 12;
          const capB = (outstanding * 3) / 100;
          return pen.amount <= Math.ceil(capA) + 1 && pen.amount <= Math.ceil(capB) + 1;
        },
      ),
      { numRuns: 500 },
    );
  });

  it("sont nulles sur un prêt à taux zéro", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1_000_00, max: 100_000_00 }), (repaid) => {
        return prepaymentPenalty(repaid, repaid * 2, 0, P).amount === 0;
      }),
      { numRuns: 100 },
    );
  });
});

describe("cas limites", () => {
  it("supporte une durée d'un mois", () => {
    const rows = amortize({ id: "x", label: "x", principal: 100_000_00, annualRatePct: 3, months: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.balance).toBe(0);
    expect(rows[0]!.principal).toBe(100_000_00);
  });

  it("supporte un différé égal à la durée totale", () => {
    const rows = amortize({ id: "x", label: "x", principal: 100_000_00, annualRatePct: 0, months: 60, deferredMonths: 60, deferral: "total" });
    expect(rows).toHaveLength(60);
    expect(rows[59]!.balance).toBe(100_000_00); // rien n'a été remboursé : le modèle ne masque pas l'anomalie
  });

  it("ne produit ni NaN ni infini sur capital ou durée nuls", () => {
    expect(amortize({ id: "x", label: "x", principal: 0, annualRatePct: 3, months: 240 })).toEqual([]);
    expect(monthlyPayment(0, 3, 0)).toBe(0);
  });
});
