import { describe, it, expect } from "vitest";
import { euros, toEuros, sum } from "../../money";
import { PARAMS_2026 as P } from "../../fiscal/params";
import { amortize, monthlyPayment } from "../schedule";
import { monthlyPremium } from "../insurance";
import { apr } from "../apr";
import { buildCreditPlan } from "../plan";
import { prepaymentPenalty, isBelowContractualMinimum, checkUsury } from "../constraints";

describe("annuité constante", () => {
  it("reproduit le cas de référence 150 000 € / 4 % / 20 ans", () => {
    // Cas cité par La finance pour tous dans son exemple de remboursement anticipé.
    const m = monthlyPayment(euros(150_000), 4, 240);
    expect(toEuros(m)).toBeCloseTo(908.97, 1);
  });

  it("dégénère correctement à taux nul", () => {
    expect(monthlyPayment(euros(120_000), 0, 240)).toBe(euros(500));
  });

  it("rend 0 pour une durée ou un capital nul", () => {
    expect(monthlyPayment(euros(100_000), 3, 0)).toBe(0);
    expect(monthlyPayment(0, 3, 240)).toBe(0);
  });
});

describe("échéancier", () => {
  const spec = { id: "main", label: "Prêt principal", principal: euros(200_000), annualRatePct: 3.35, months: 240 };

  it("solde exactement le capital", () => {
    const rows = amortize(spec);
    expect(rows[rows.length - 1]?.balance).toBe(0);
    expect(sum(rows.map((r) => r.principal))).toBe(spec.principal);
  });

  it("décroît de façon monotone", () => {
    const rows = amortize(spec);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.balance).toBeLessThanOrEqual(rows[i - 1]!.balance);
    }
  });

  /**
   * DÉCOUVERTE À L'ÉCRITURE DES TESTS.
   *
   * L'affirmation « au début on rembourse surtout des intérêts » n'est PAS
   * universelle. Elle est vraie si et seulement si (1 + r)^n > 2, c'est-à-dire
   * si le capital ferait plus que doubler sur la durée du prêt aux conditions
   * du crédit.
   *
   * Démonstration : intérêts₁ > capital₁ ⟺ C·r > M − C·r ⟺ M < 2·C·r
   *   ⟺ C·r / (1 − (1+r)^(−n)) < 2·C·r
   *   ⟺ 1 − (1+r)^(−n) > 1/2  ⟺  (1+r)^n > 2
   *
   * À 3,35 % sur 20 ans, le facteur vaut environ 1,95 : la part de capital
   * dépasse les intérêts DÈS LA PREMIÈRE ÉCHÉANCE. L'intuition ne tient qu'aux
   * taux élevés ou sur les durées longues.
   *
   * Conséquence produit : l'interface ne doit pas énoncer cette règle comme un
   * fait, mais l'afficher comme un résultat calculé pour la configuration saisie.
   */
  const doublingFactor = (annualPct: number, n: number) => Math.pow(1 + annualPct / 100 / 12, n);

  it("ne commence PAS par payer surtout des intérêts à 3,35 % sur 20 ans", () => {
    expect(doublingFactor(3.35, 240)).toBeLessThan(2);
    const first = amortize(spec)[0]!;
    expect(first.principal).toBeGreaterThan(first.interest);
  });

  it("commence bien par payer surtout des intérêts à 4,5 % sur 25 ans", () => {
    expect(doublingFactor(4.5, 300)).toBeGreaterThan(2);
    const first = amortize({ ...spec, annualRatePct: 4.5, months: 300 })[0]!;
    expect(first.interest).toBeGreaterThan(first.principal);
  });

  it("la bascule survient au premier mois exactement quand (1+r)^n ≤ 2", () => {
    for (const [rate, n] of [[2, 180], [3.35, 240], [4.5, 300], [6, 300], [1, 120]] as const) {
      const first = amortize({ id: "t", label: "t", principal: euros(200_000), annualRatePct: rate, months: n })[0]!;
      const interestDominates = first.interest > first.principal;
      expect(interestDominates).toBe(doublingFactor(rate, n) > 2);
    }
  });

  it("applique un différé total sans échéance et capitalise les intérêts si le taux est non nul", () => {
    const rows = amortize({ ...spec, deferredMonths: 12, deferral: "total" });
    expect(rows.slice(0, 12).every((r) => r.payment === 0)).toBe(true);
    expect(rows[11]!.balance).toBeGreaterThan(spec.principal);
  });

  it("ne capitalise rien sur un prêt à taux zéro en différé", () => {
    const ptz = amortize({ id: "ptz", label: "PTZ", principal: euros(40_000), annualRatePct: 0, months: 240, deferredMonths: 120, deferral: "total" });
    expect(ptz[119]!.balance).toBe(euros(40_000));
    expect(sum(ptz.map((r) => r.interest))).toBe(0);
    expect(ptz[ptz.length - 1]!.balance).toBe(0);
  });

  it("ne paie que les intérêts pendant un différé partiel", () => {
    const rows = amortize({ ...spec, deferredMonths: 6, deferral: "interest" });
    expect(rows.slice(0, 6).every((r) => r.principal === 0 && r.payment === r.interest)).toBe(true);
    expect(rows[5]!.balance).toBe(spec.principal);
  });
});

describe("assurance emprunteur", () => {
  const capital = euros(200_000);

  it("calcule une prime constante sur capital initial", () => {
    const spec = { annualRatePct: 0.34, basis: "initial" as const, coveragePct: 100 };
    expect(toEuros(monthlyPremium(capital, spec))).toBeCloseTo(56.67, 2);
  });

  /**
   * L'arrondi au centime a lieu UNE SEULE FOIS, en fin de calcul. Doubler la
   * quotité ne double donc pas exactement une prime déjà arrondie : l'écart
   * peut atteindre un centime. C'est le comportement correct — arrondir avant
   * d'appliquer la quotité introduirait une erreur bien plus grande, accumulée
   * sur 300 échéances.
   */
  it("double la prime à quotité 200 %, à l'arrondi près", () => {
    const a = monthlyPremium(capital, { annualRatePct: 0.34, basis: "initial", coveragePct: 100 });
    const b = monthlyPremium(capital, { annualRatePct: 0.34, basis: "initial", coveragePct: 200 });
    expect(Math.abs(b - a * 2)).toBeLessThanOrEqual(1);
  });

  it("coûte nettement moins cher sur capital restant dû, à taux identique", () => {
    const base = { id: "m", label: "m", principal: capital, annualRatePct: 3.35, months: 300 };
    const common = { arrangementFee: euros(1200), guarantee: "suretyship" as const, propertyPrice: euros(250_000), netMonthlyIncome: euros(5000) };
    const initial = buildCreditPlan({ ...common, loans: [base], insurance: { annualRatePct: 0.34, basis: "initial", coveragePct: 100 } }, P);
    const outstanding = buildCreditPlan({ ...common, loans: [base], insurance: { annualRatePct: 0.34, basis: "outstanding", coveragePct: 100 } }, P);
    const gap = 1 - outstanding.totalInsurance / initial.totalInsurance;
    // Les sources de marché annoncent 30 à 45 % d'écart sur 25 ans.
    expect(gap).toBeGreaterThan(0.3);
    expect(gap).toBeLessThan(0.5);
  });
});

describe("TAEG", () => {
  it("égale le taux nominal en l'absence de tout frais", () => {
    const rows = amortize({ id: "m", label: "m", principal: euros(200_000), annualRatePct: 3, months: 240 });
    const value = apr({ netAdvanced: euros(200_000), payments: rows.map((r) => r.payment) });
    // Équivalence actuarielle contre taux nominal proportionnel : léger écart attendu.
    expect(value).toBeGreaterThan(3);
    expect(value).toBeLessThan(3.1);
  });

  it("dépasse le taux nominal dès qu'il existe des frais", () => {
    const plan = buildCreditPlan(
      {
        loans: [{ id: "m", label: "m", principal: euros(200_000), annualRatePct: 3.35, months: 240 }],
        insurance: { annualRatePct: 0.34, basis: "initial", coveragePct: 100 },
        guarantee: "suretyship", arrangementFee: euros(1200),
        propertyPrice: euros(250_000), netMonthlyIncome: euros(5000),
      },
      P,
    );
    expect(plan.aprPct).toBeGreaterThan(3.35);
    expect(plan.taeaPct).toBeGreaterThan(0);
  });
});

describe("contraintes réglementaires", () => {
  it("retient le plafond d'indemnité le plus faible", () => {
    // 6 mois d'intérêts sur 50 000 € à 3,35 % = 837,50 €
    // 3 % de 150 000 € de capital restant dû = 4 500 €
    const pen = prepaymentPenalty(euros(50_000), euros(150_000), 3.35, P);
    expect(toEuros(pen.amount)).toBeCloseTo(837.5, 2);
    expect(pen.bindingCap).toBe("interest");
  });

  it("annule l'indemnité en cas de mutation professionnelle", () => {
    const pen = prepaymentPenalty(euros(50_000), euros(150_000), 3.35, P, "professional-relocation");
    expect(pen.amount).toBe(0);
    expect(pen.legallyExempt).toBe(true);
  });

  it("mesure le seuil contractuel sur le montant initial, pas sur le restant dû", () => {
    // 15 000 € = 7,5 % d'un prêt initial de 200 000 € → sous le seuil des 10 %,
    // alors même que cela représente 20 % du capital restant dû de 75 000 €.
    expect(isBelowContractualMinimum(euros(15_000), euros(200_000), euros(75_000), P)).toBe(true);
    // …mais un solde intégral n'est jamais bloqué.
    expect(isBelowContractualMinimum(euros(75_000), euros(200_000), euros(75_000), P)).toBe(false);
  });

  it("applique le seuil d'usure de la bonne tranche de durée", () => {
    expect(checkUsury(4.5, "fixed", 96, P).threshold).toBe(P.usury.fixedUnder10y);
    expect(checkUsury(4.5, "fixed", 180, P).threshold).toBe(P.usury.fixed10to20y);
    expect(checkUsury(4.5, "fixed", 300, P).threshold).toBe(P.usury.fixed20yPlus);
    expect(checkUsury(4.5, "bridge", 24, P).threshold).toBe(P.usury.bridge);
  });

  it("intègre l'assurance dans le taux d'effort", () => {
    const plan = buildCreditPlan(
      {
        loans: [{ id: "m", label: "m", principal: euros(250_000), annualRatePct: 3.35, months: 240 }],
        insurance: { annualRatePct: 0.34, basis: "initial", coveragePct: 100 },
        guarantee: "suretyship", arrangementFee: euros(1200),
        propertyPrice: euros(300_000), netMonthlyIncome: euros(4000),
      },
      P,
    );
    expect(plan.hcsf.debtRatioPct).toBeGreaterThan(35);
    expect(plan.hcsf.compliant).toBe(false);
  });
});

describe("plan consolidé avec PTZ", () => {
  const plan = buildCreditPlan(
    {
      loans: [
        { id: "main", label: "Prêt principal", principal: euros(200_000), annualRatePct: 3.35, months: 240 },
        { id: "ptz", label: "PTZ", principal: euros(40_000), annualRatePct: 0, months: 240, deferredMonths: 120, deferral: "total" },
      ],
      insurance: { annualRatePct: 0.34, basis: "initial", coveragePct: 100 },
      guarantee: "suretyship", arrangementFee: euros(1200),
      propertyPrice: euros(280_000), netMonthlyIncome: euros(6000),
    },
    P,
  );

  it("fait grimper la mensualité à la fin du différé", () => {
    expect(plan.maxPayment).toBeGreaterThan(plan.firstPayment);
    expect(plan.rows[120]!.payment).toBeGreaterThan(plan.rows[119]!.payment);
  });

  it("confronte la mensualité MAXIMALE au plafond d'endettement", () => {
    const ratioOnMax = (plan.maxPayment / euros(6000)) * 100;
    expect(plan.hcsf.debtRatioPct).toBeCloseTo(ratioOnMax, 5);
  });

  it("amortit intégralement les deux prêts", () => {
    expect(plan.rows[plan.rows.length - 1]!.balance).toBe(0);
    expect(sum(plan.rows.map((r) => r.principal))).toBe(euros(240_000));
  });

  it("restitue une part de la caution au terme", () => {
    expect(plan.guarantee.refundAtTerm).toBeGreaterThan(0);
    expect(plan.guarantee.releaseCostOnEarlySale).toBe(0);
  });
});
