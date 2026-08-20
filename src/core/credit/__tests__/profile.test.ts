/**
 * Tests calibrés sur le domaine réel du produit :
 * durées de 20 à 25 ans, taux de 3 % à 5 %.
 */

import { describe, it, expect } from "vitest";
import { euros, toEuros, sum, parseAmount, amountFromInput, roundCents } from "../../money";
import { amortize, monthlyPayment } from "../schedule";
import {
  amortisationProfile,
  windowOf,
  interestSavedByPrepayment,
  marginalInterestSavedPerEuro,
  prepaymentLeverageCurve,
  prepaymentArbitragePoints,
  interestShareMilestones,
  prepaymentEfficiencyWindows,
} from "../profile";

const CAPITAL = euros(250_000);
const build = (ratePct: number, years: number) =>
  amortize({ id: "m", label: "m", principal: CAPITAL, annualRatePct: ratePct, months: years * 12 });

describe("représentation décimale scalée", () => {
  it("analyse une saisie sans passer par un flottant", () => {
    expect(parseAmount("10000,54")).toEqual({ mantissa: 1000054, exponent: -2 });
    expect(parseAmount("10 000,54")).toEqual({ mantissa: 1000054, exponent: -2 });
    expect(amountFromInput("10000,54")).toBe(1000054);
  });

  it("évite l'erreur de parseFloat", () => {
    // parseFloat("10000.54") vaut 10000.539999999999
    expect(amountFromInput("10000,54")).toBe(1000054);
    expect(amountFromInput("0,07") * 100).toBe(700);
  });

  it("gère une précision supérieure au centime par arrondi explicite", () => {
    expect(amountFromInput("1,005", "half-up")).toBe(101);
    expect(amountFromInput("1,005", "down")).toBe(100);
    expect(amountFromInput("1,005", "half-even")).toBe(100);
  });

  it("refuse une saisie illisible", () => {
    expect(() => parseAmount("abc")).toThrow(SyntaxError);
    expect(() => parseAmount("")).toThrow(SyntaxError);
  });

  it("reste dans le domaine exact des entiers", () => {
    expect(() => roundCents(Number.MAX_SAFE_INTEGER * 2)).toThrow(RangeError);
  });
});

describe("antériorité des intérêts sur le domaine réel du produit", () => {
  const cases = [
    [3.0, 20], [3.5, 20], [4.0, 20], [4.5, 20], [5.0, 20],
    [3.0, 25], [3.5, 25], [4.0, 25], [4.5, 25], [5.0, 25],
  ] as const;

  it.each(cases)("à %s %% sur %s ans, les 10 premières échéances contiennent plus d'intérêts que les 10 dernières", (rate, years) => {
    const rows = build(rate, years);
    const p = amortisationProfile(rows, rate, 10);
    expect(p.opening.interestSharePct).toBeGreaterThan(p.closing.interestSharePct);
    // Le rapport est massif sur tout le domaine : au moins vingt fois.
    expect(p.openingToClosingRatio).toBeGreaterThan(20);
  });

  it.each(cases)("à %s %% sur %s ans, la moitié des intérêts est payée bien avant la moitié du capital", (rate, years) => {
    const p = amortisationProfile(build(rate, years), rate, 10);
    expect(p.skewMonths).toBeGreaterThan(24); // au moins deux ans d'écart
  });

  it.each(cases)("à %s %% sur %s ans, le premier tiers concentre les intérêts", (rate, years) => {
    const p = amortisationProfile(build(rate, years), rate, 10);
    expect(p.interestPaidInFirstThirdPct).toBeGreaterThan(45);
    expect(p.principalRepaidInFirstThirdPct).toBeLessThan(30);
    expect(p.interestPaidInFirstThirdPct).toBeGreaterThan(p.principalRepaidInFirstThirdPct);
  });

  it("mesure correctement un cas de référence : 4 % sur 25 ans", () => {
    const rows = build(4, 25);
    const p = amortisationProfile(rows, 4, 10);
    const first10 = windowOf(rows, 1, 10);
    const last10 = windowOf(rows, 291, 300);
    // Les premières échéances sont massivement composées d'intérêts…
    expect(first10.interestSharePct).toBeGreaterThan(60);
    // …et les dernières n'en contiennent presque plus.
    expect(last10.interestSharePct).toBeLessThan(2);
    expect(p.frontLoadedFromFirstPayment).toBe(true);
  });

  /**
   * Le seuil (1+r)^n > 2 ne concerne QUE la toute première échéance.
   * L'antériorité globale des intérêts existe dans tous les cas — c'est ce que
   * vérifient les tests précédents. Les deux notions sont distinctes et doivent
   * le rester dans l'interface.
   */
  it("distingue la domination dès la première échéance de l'antériorité globale", () => {
    const p20 = amortisationProfile(build(3.0, 20), 3.0, 10);
    expect(p20.frontLoadedFromFirstPayment).toBe(false); // (1+r)^n ≈ 1,82
    expect(p20.crossoverMonth).toBe(1);
    // Et pourtant l'antériorité reste écrasante :
    expect(p20.openingToClosingRatio).toBeGreaterThan(20);
    expect(p20.skewMonths).toBeGreaterThan(24);
  });

  it("situe le seuil de bascule autour de 3,47 % sur 20 ans", () => {
    expect(amortisationProfile(build(3.4, 20), 3.4, 10).frontLoadedFromFirstPayment).toBe(false);
    expect(amortisationProfile(build(3.5, 20), 3.5, 10).frontLoadedFromFirstPayment).toBe(true);
  });

  it("situe le seuil autour de 2,78 % sur 25 ans", () => {
    expect(amortisationProfile(build(2.7, 25), 2.7, 10).frontLoadedFromFirstPayment).toBe(false);
    expect(amortisationProfile(build(2.9, 25), 2.9, 10).frontLoadedFromFirstPayment).toBe(true);
  });
});

describe("levier du remboursement anticipé", () => {
  /**
   * Test le plus important du module : la formule fermée
   *   économie = montant × ((1+r)^k − 1)
   * doit reproduire ce que donne un recalcul complet de l'échéancier.
   */
  it.each([[3.0, 20], [4.0, 20], [3.5, 25], [5.0, 25]] as const)(
    "la formule fermée reproduit le recalcul d'échéancier à %s %% sur %s ans",
    (rate, years) => {
      const months = years * 12;
      const baseline = build(rate, years);
      const totalInterestBaseline = sum(baseline.map((r) => r.interest));

      const atMonth = 60;
      const prepaid = euros(30_000);
      const payment = monthlyPayment(CAPITAL, rate, months);
      const balanceAfter = baseline[atMonth - 1]!.balance - prepaid;

      // Recalcul complet : même mensualité, capital réduit, durée raccourcie.
      const r = rate / 100 / 12;
      let bal = balanceAfter;
      let interestAfter = 0;
      for (let m = atMonth + 1; m <= months && bal > 0; m++) {
        const i = roundCents(bal * r);
        bal -= Math.min(payment - i, bal);
        interestAfter += i;
      }
      const interestBefore = sum(baseline.slice(0, atMonth).map((x) => x.interest));
      const actual = totalInterestBaseline - (interestBefore + interestAfter);

      const formula = interestSavedByPrepayment(prepaid, rate, months - atMonth, payment);

      // Moins de 0,5 % d'écart : la formule raisonne en durée continue,
      // le recalcul en mois entiers avec échéance résiduelle.
      expect(Math.abs(formula - actual) / actual).toBeLessThan(0.005);
    },
  );

  /**
   * L'approximation marginale — celle qu'on lit partout — est exacte pour un
   * euro, et surestime un versement conséquent. Test de non-régression sur
   * l'erreur que contenait la première version de ce moteur.
   */
  it("l'approximation marginale surestime les versements conséquents", () => {
    const months = 240;
    const payment = monthlyPayment(CAPITAL, 4, months);
    const prepaid = euros(30_000);
    const exact = interestSavedByPrepayment(prepaid, 4, 180, payment);
    const naive = prepaid * marginalInterestSavedPerEuro(4, 180);
    expect(naive).toBeGreaterThan(exact);
    expect((naive - exact) / exact).toBeGreaterThan(0.1); // plus de 10 % de surestimation
  });

  it("l'approximation marginale reste juste pour de petits montants", () => {
    const payment = monthlyPayment(CAPITAL, 4, 240);
    const small = euros(500);
    const exact = interestSavedByPrepayment(small, 4, 180, payment);
    const naive = small * marginalInterestSavedPerEuro(4, 180);
    expect(Math.abs(naive - exact) / exact).toBeLessThan(0.01);
  });

  it("décroît exponentiellement avec la date du versement", () => {
    const rows = build(4, 25);
    const payment = monthlyPayment(CAPITAL, 4, 300);
    const balances = rows.map((r) => r.balance);
    const curve = prepaymentLeverageCurve(rows, 4, payment, balances, 12);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]!.savedPerThousand).toBeLessThan(curve[i - 1]!.savedPerThousand);
    }
    // 1 000 € versés à un an rapportent plusieurs fois ce qu'ils rapportent à quinze ans.
    const atYear1 = curve[0]!.savedPerThousand;
    const atYear15 = curve.find((c) => c.month === 180)!.savedPerThousand;
    expect(atYear1 / atYear15).toBeGreaterThan(3);
  });

  it("chiffre le levier de façon lisible à 4 % sur 25 ans", () => {
    const payment = monthlyPayment(CAPITAL, 4, 300);
    const early = interestSavedByPrepayment(euros(1000), 4, 288, payment);
    const late = interestSavedByPrepayment(euros(1000), 4, 60, payment);
    expect(toEuros(early)).toBeGreaterThan(1500);
    expect(toEuros(late)).toBeLessThan(300);
    expect(early / late).toBeGreaterThan(5);
  });

  it("ne produit aucune économie sur un prêt à taux zéro", () => {
    expect(interestSavedByPrepayment(euros(40_000), 0, 240, euros(500))).toBe(0);
  });

  it("mesure l'arbitrage contre un placement alternatif", () => {
    // Crédit à 3,35 %, placement à 5 % brut imposé au prélèvement forfaitaire.
    expect(prepaymentArbitragePoints(3.35, 5, 30)).toBeCloseTo(-0.15, 2);
    // Le même crédit contre un placement à 3 % net.
    expect(prepaymentArbitragePoints(3.35, 3, 0)).toBeCloseTo(0.35, 2);
  });
});

describe("sensibilité à la convention d'arrondi", () => {
  it("l'écart entre conventions reste marginal sur 300 échéances", () => {
    const spec = { id: "m", label: "m", principal: CAPITAL, annualRatePct: 4, months: 300 };
    const up = sum(amortize({ ...spec, rounding: "half-up" }).map((r) => r.interest));
    const even = sum(amortize({ ...spec, rounding: "half-even" }).map((r) => r.interest));
    const down = sum(amortize({ ...spec, rounding: "down" }).map((r) => r.interest));
    // Quelques euros au plus sur un coût total de plusieurs dizaines de milliers.
    expect(Math.abs(up - even)).toBeLessThan(euros(5));
    expect(Math.abs(up - down)).toBeLessThan(euros(500));
  });

  it("toutes les conventions soldent exactement le capital", () => {
    for (const rounding of ["half-up", "half-even", "down"] as const) {
      const rows = amortize({ id: "m", label: "m", principal: CAPITAL, annualRatePct: 4, months: 300, rounding });
      expect(rows[rows.length - 1]!.balance).toBe(0);
      expect(sum(rows.map((r) => r.principal))).toBe(CAPITAL);
    }
  });
});

describe("jalons de seuil et fenêtres d'efficacité", () => {
  const rows = build(4, 25);

  it("repère le moment où la part d'intérêts passe sous chaque seuil", () => {
    const m = interestShareMilestones(rows, [50, 25, 15, 10]);
    for (const jalon of m) {
      expect(jalon.month).not.toBeNull();
      expect(jalon.reachedSharePct).toBeLessThan(jalon.thresholdPct);
    }
    // Les jalons se succèdent dans l'ordre.
    for (let i = 1; i < m.length; i++) {
      expect(m[i]!.month!).toBeGreaterThan(m[i - 1]!.month!);
    }
  });

  it("le jalon à 50 % coïncide avec la bascule capital/intérêts", () => {
    const p = amortisationProfile(rows, 4, 10);
    const j50 = interestShareMilestones(rows, [50])[0]!;
    expect(j50.month).toBe(p.crossoverMonth);
  });

  it("au jalon des 15 %, l'essentiel des intérêts est déjà payé", () => {
    const j = interestShareMilestones(rows, [15])[0]!;
    expect(j.interestPaidPct).toBeGreaterThan(75);
    expect(j.principalRepaidPct).toBeGreaterThan(50);
  });

  /** Le point conceptuel central : les deux lectures sont inverses. */
  it("les jalons de constitution et les fenêtres d'action pointent en sens opposés", () => {
    const j15 = interestShareMilestones(rows, [15])[0]!;
    const w50 = prepaymentEfficiencyWindows(4, 300, [50])[0]!;
    // Quand la part d'intérêts devient faible, la fenêtre d'un versement à 50 % est déjà refermée.
    expect(j15.month!).toBeGreaterThan(w50.lastMonth!);
  });

  it("calcule la fenêtre d'efficacité par la formule inverse", () => {
    const windows = prepaymentEfficiencyWindows(4, 300, [100, 50, 25]);
    // Plus le rendement exigé est élevé, plus la fenêtre se referme tôt.
    expect(windows[0]!.lastMonth!).toBeLessThan(windows[1]!.lastMonth!);
    expect(windows[1]!.lastMonth!).toBeLessThan(windows[2]!.lastMonth!);
    // Vérification croisée avec le calcul direct du levier.
    const payment = monthlyPayment(CAPITAL, 4, 300);
    const atLimit = interestSavedByPrepayment(euros(1000), 4, 300 - windows[1]!.lastMonth!, payment);
    expect(toEuros(atLimit)).toBeGreaterThan(480);
    expect(toEuros(atLimit)).toBeLessThan(520);
  });

  it("ne produit aucune fenêtre sur un prêt à taux zéro", () => {
    expect(prepaymentEfficiencyWindows(0, 240, [50])[0]!.lastMonth).toBeNull();
  });
});
