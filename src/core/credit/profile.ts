/**
 * PROFIL D'AMORTISSEMENT — antériorité des intérêts et levier du remboursement anticipé.
 *
 * Ce module répond à une question que le tableau d'amortissement pose sans y
 * répondre : à quel point les intérêts sont-ils concentrés au début, et que
 * vaut concrètement un euro remboursé en avance ?
 *
 * C'est la base de décision du module « remboursements anticipés ». Sans lui,
 * l'utilisateur ne peut pas comprendre pourquoi la date d'un versement compte
 * davantage que son montant.
 */

import { type Cents, type PercentPerYear, monthlyRate, roundCents, sum } from "../money";

/** Forme minimale attendue : compatible avec ScheduleRow comme avec ConsolidatedRow. */
export interface AmortisationLike {
  readonly month: number;
  readonly interest: Cents;
  readonly principal: Cents;
  readonly payment: Cents;
}

/* ── Fenêtres ─────────────────────────────────────────────────────────────── */

export interface Window {
  readonly from: number;
  readonly to: number;
  readonly interest: Cents;
  readonly principal: Cents;
  readonly payment: Cents;
  /** Part des intérêts dans les échéances de la fenêtre, en pourcentage. */
  readonly interestSharePct: number;
}

/** Agrège une plage de mois, bornes incluses. */
export function windowOf(rows: readonly AmortisationLike[], from: number, to: number): Window {
  const slice = rows.filter((r) => r.month >= from && r.month <= to);
  const interest = sum(slice.map((r) => r.interest));
  const principal = sum(slice.map((r) => r.principal));
  const payment = sum(slice.map((r) => r.payment));
  return {
    from, to, interest, principal, payment,
    interestSharePct: payment > 0 ? (interest / payment) * 100 : 0,
  };
}

/* ── Profil complet ───────────────────────────────────────────────────────── */

export interface AmortisationProfile {
  /** Fenêtre demandée en tête de prêt (10 échéances par défaut). */
  readonly opening: Window;
  /** Même largeur de fenêtre, en fin de prêt. */
  readonly closing: Window;
  /**
   * Rapport entre la part d'intérêts d'ouverture et celle de clôture.
   * Un rapport de 40 signifie que les premières échéances contiennent
   * quarante fois plus d'intérêts, en proportion, que les dernières.
   */
  readonly openingToClosingRatio: number;

  /** Premier mois où la part de capital atteint ou dépasse les intérêts. */
  readonly crossoverMonth: number | null;
  /** Mois où la moitié des intérêts totaux a été payée. */
  readonly interestMidpointMonth: number;
  /** Mois où la moitié du capital a été remboursée. */
  readonly principalMidpointMonth: number;
  /**
   * Asymétrie : écart entre les deux médianes, en mois.
   * Positif = les intérêts sont payés avant que le capital ne soit remboursé.
   * C'est la mesure directe de l'antériorité des intérêts.
   */
  readonly skewMonths: number;

  /** Part des intérêts totaux payée dans le premier tiers de la durée. */
  readonly interestPaidInFirstThirdPct: number;
  /** Part du capital remboursée dans le premier tiers de la durée. */
  readonly principalRepaidInFirstThirdPct: number;

  /**
   * Facteur (1 + r)^n. Détermine si la toute première échéance contient plus
   * d'intérêts que de capital — voir `frontLoadedFromFirstPayment`.
   */
  readonly doublingFactor: number;
  /**
   * Vrai si les intérêts dominent DÈS la première échéance.
   *
   * Démonstration : intérêts₁ > capital₁ ⟺ C·r > M − C·r ⟺ M < 2·C·r
   *   ⟺ C·r / (1 − (1+r)^−n) < 2·C·r ⟺ (1+r)^n > 2
   *
   * Seuils utiles : environ 3,47 % sur 20 ans, environ 2,78 % sur 25 ans.
   * En dessous, la part de capital l'emporte immédiatement — sans que cela
   * retire quoi que ce soit à l'antériorité des intérêts, qui reste massive.
   */
  readonly frontLoadedFromFirstPayment: boolean;
}

export function amortisationProfile(
  rows: readonly AmortisationLike[],
  annualRatePct: PercentPerYear,
  windowSize = 10,
): AmortisationProfile {
  const n = rows.length;
  if (n === 0) {
    const empty = windowOf([], 0, 0);
    return {
      opening: empty, closing: empty, openingToClosingRatio: 0,
      crossoverMonth: null, interestMidpointMonth: 0, principalMidpointMonth: 0,
      skewMonths: 0, interestPaidInFirstThirdPct: 0, principalRepaidInFirstThirdPct: 0,
      doublingFactor: 1, frontLoadedFromFirstPayment: false,
    };
  }

  const w = Math.min(windowSize, n);
  const opening = windowOf(rows, 1, w);
  const closing = windowOf(rows, n - w + 1, n);

  const totalInterest = sum(rows.map((r) => r.interest));
  const totalPrincipal = sum(rows.map((r) => r.principal));

  const midpoint = (pick: (r: AmortisationLike) => Cents, total: Cents): number => {
    if (total <= 0) return 0;
    let acc = 0;
    for (const r of rows) {
      acc += pick(r);
      if (acc * 2 >= total) return r.month;
    }
    return n;
  };

  const interestMidpointMonth = midpoint((r) => r.interest, totalInterest);
  const principalMidpointMonth = midpoint((r) => r.principal, totalPrincipal);

  const third = Math.max(1, Math.round(n / 3));
  const firstThird = windowOf(rows, 1, third);

  const crossoverIndex = rows.findIndex((r) => r.principal > 0 && r.principal >= r.interest);
  const r = monthlyRate(annualRatePct);

  return {
    opening,
    closing,
    openingToClosingRatio:
      closing.interestSharePct > 0 ? opening.interestSharePct / closing.interestSharePct : Number.POSITIVE_INFINITY,
    crossoverMonth: crossoverIndex >= 0 ? crossoverIndex + 1 : null,
    interestMidpointMonth,
    principalMidpointMonth,
    skewMonths: principalMidpointMonth - interestMidpointMonth,
    interestPaidInFirstThirdPct: totalInterest > 0 ? (firstThird.interest / totalInterest) * 100 : 0,
    principalRepaidInFirstThirdPct: totalPrincipal > 0 ? (firstThird.principal / totalPrincipal) * 100 : 0,
    doublingFactor: Math.pow(1 + r, n),
    frontLoadedFromFirstPayment: Math.pow(1 + r, n) > 2,
  };
}

/* ── Jalons de seuil ──────────────────────────────────────────────────────── */

export interface Milestone {
  /** Seuil visé : part des intérêts dans l'échéance, en pourcentage. */
  readonly thresholdPct: number;
  /** Premier mois où la part d'intérêts passe sous le seuil. */
  readonly month: number | null;
  readonly year: number | null;
  /** Part réellement atteinte ce mois-là. */
  readonly reachedSharePct: number;
  /** Fraction de la durée totale écoulée à cette date. */
  readonly durationElapsedPct: number;
  /** Fraction du capital total déjà remboursée à cette date. */
  readonly principalRepaidPct: number;
  /** Fraction des intérêts totaux déjà payée à cette date. */
  readonly interestPaidPct: number;
}

/**
 * Repère les moments où la part des intérêts dans l'échéance passe sous des
 * seuils donnés. C'est la traduction chiffrée de l'intuition « à partir de là,
 * je rembourse vraiment mon crédit ».
 *
 * Le jalon à 50 % coïncide avec la bascule capital/intérêts. Les jalons à 15 %
 * et 10 % marquent le moment où l'échéance devient presque intégralement de
 * l'épargne forcée.
 *
 * ── ATTENTION À L'INVERSION ─────────────────────────────────────────────────
 * Ces jalons décrivent la CONSTITUTION du patrimoine. Ils ne désignent PAS le
 * bon moment pour un remboursement anticipé — c'est même l'inverse. Un
 * versement est d'autant plus efficace que les intérêts restants sont
 * nombreux, donc TÔT. Voir `prepaymentEfficiencyWindows`.
 *
 * Les deux lectures sont utiles et complémentaires, à condition de ne pas les
 * confondre : l'une raconte où en est le crédit, l'autre où agir.
 */
export function interestShareMilestones(
  rows: readonly AmortisationLike[],
  thresholds: readonly number[] = [50, 25, 15, 10, 5],
): Milestone[] {
  const n = rows.length;
  const totalPrincipal = sum(rows.map((r) => r.principal));
  const totalInterest = sum(rows.map((r) => r.interest));

  return thresholds.map((thresholdPct) => {
    let principalAcc = 0;
    let interestAcc = 0;
    for (const row of rows) {
      principalAcc += row.principal;
      interestAcc += row.interest;
      const share = row.payment > 0 ? (row.interest / row.payment) * 100 : 0;
      if (share < thresholdPct) {
        return {
          thresholdPct,
          month: row.month,
          year: Math.ceil(row.month / 12),
          reachedSharePct: share,
          durationElapsedPct: n > 0 ? (row.month / n) * 100 : 0,
          principalRepaidPct: totalPrincipal > 0 ? (principalAcc / totalPrincipal) * 100 : 0,
          interestPaidPct: totalInterest > 0 ? (interestAcc / totalInterest) * 100 : 0,
        };
      }
    }
    return {
      thresholdPct, month: null, year: null, reachedSharePct: 0,
      durationElapsedPct: 0, principalRepaidPct: 0, interestPaidPct: 0,
    };
  });
}

/* ── Fenêtres d'efficacité du remboursement anticipé ──────────────────────── */

export interface PrepaymentWindow {
  /** Rendement visé : intérêts économisés rapportés au montant remboursé, en %. */
  readonly yieldThresholdPct: number;
  /** Dernier mois où un versement atteint encore ce rendement. */
  readonly lastMonth: number | null;
  readonly lastYear: number | null;
  /** Fraction de la durée pendant laquelle la fenêtre reste ouverte. */
  readonly windowSharePct: number;
}

/**
 * Jusqu'à quand un versement anticipé rapporte-t-il au moins X % ?
 *
 * Un euro remboursé à k mois du terme économise (1+r)^k − 1 euros d'intérêts.
 * Le seuil de rendement T est donc atteint tant que :
 *
 *     k ≥ ln(1 + T/100) / ln(1 + r)
 *
 * Le miroir exact des jalons de seuil, et la bonne grille de lecture pour
 * décider QUAND verser. Un seuil de 100 % signifie qu'un euro remboursé
 * économise un euro d'intérêts.
 */
export function prepaymentEfficiencyWindows(
  annualRatePct: PercentPerYear,
  totalMonths: number,
  yieldThresholds: readonly number[] = [100, 50, 25, 10],
): PrepaymentWindow[] {
  const r = monthlyRate(annualRatePct);
  return yieldThresholds.map((yieldThresholdPct) => {
    if (r <= 0 || totalMonths <= 0) {
      return { yieldThresholdPct, lastMonth: null, lastYear: null, windowSharePct: 0 };
    }
    const requiredRemaining = Math.log(1 + yieldThresholdPct / 100) / Math.log(1 + r);
    const lastMonth = Math.floor(totalMonths - requiredRemaining);
    if (lastMonth < 1) {
      return { yieldThresholdPct, lastMonth: null, lastYear: null, windowSharePct: 0 };
    }
    return {
      yieldThresholdPct,
      lastMonth,
      lastYear: Math.ceil(lastMonth / 12),
      windowSharePct: (lastMonth / totalMonths) * 100,
    };
  });
}

/* ── Levier du remboursement anticipé ─────────────────────────────────────── */

/**
 * Économie MARGINALE : ce que rapporte UN euro remboursé à k mois du terme.
 *
 *     économie par euro = (1 + r)^k − 1
 *
 * INTUITION : cet euro de capital, s'il était resté, aurait produit des
 * intérêts composés au taux r pendant les k mois restants. Le retirer supprime
 * exactement cette accumulation.
 *
 * C'est la formulation la plus parlante du principe « rembourser tôt rapporte
 * davantage », et elle est EXACTE pour un euro marginal. Elle ne l'est pas pour
 * un versement conséquent — voir `interestSavedByPrepayment`.
 */
export function marginalInterestSavedPerEuro(
  annualRatePct: PercentPerYear,
  remainingMonths: number,
): number {
  if (remainingMonths <= 0) return 0;
  return Math.pow(1 + monthlyRate(annualRatePct), remainingMonths) - 1;
}

/**
 * Intérêts économisés par un versement anticipé, en mode « réduire la durée ».
 *
 *     économie = M · ln(1 + (P·r / M) · (1 + r)^k) / ln(1 + r) − P
 *
 * où P = montant remboursé, M = mensualité, r = taux mensuel, k = mois restants.
 *
 * ── POURQUOI PAS SIMPLEMENT P × ((1+r)^k − 1) ? ─────────────────────────────
 * Parce que cette expression, exacte pour un euro marginal, SURESTIME
 * l'économie d'un versement conséquent. La raison est instructive : un gros
 * versement raccourcit le prêt, donc réduit la fenêtre pendant laquelle le
 * capital restant aurait produit des intérêts. Chaque euro supplémentaire
 * rapporte donc un peu moins que le précédent — un rendement décroissant.
 *
 * Ordre de grandeur : sur 250 000 € à 4 % sur 20 ans, un versement de 30 000 €
 * au mois 60 économise environ 21 700 € ; l'approximation marginale annonce
 * 24 600 €, soit 13 % de trop. L'écart est négligeable pour de petits montants
 * et devient significatif au-delà de 10 % du capital restant dû.
 *
 * ── DÉRIVATION ──────────────────────────────────────────────────────────────
 * Le solde B à k mois du terme vérifie  B = M·(1 − (1+r)^−k) / r.
 * Après versement, le solde B − P correspond à une durée résiduelle k' :
 *   (1+r)^−k' = (1+r)^−k + P·r/M
 * L'économie est la valeur des échéances supprimées, moins le versement :
 *   économie = M·(k − k') − P
 * d'où la forme fermée ci-dessus.
 *
 * Le résultat est en durée CONTINUE ; un échéancier réel travaille en mois
 * entiers avec une échéance résiduelle. L'écart reste inférieur à une échéance.
 */
export function interestSavedByPrepayment(
  amount: Cents,
  annualRatePct: PercentPerYear,
  remainingMonths: number,
  monthlyPaymentAmount: Cents,
): Cents {
  if (amount <= 0 || remainingMonths <= 0 || monthlyPaymentAmount <= 0) return 0;
  const r = monthlyRate(annualRatePct);
  if (r === 0) return 0; // un prêt à taux zéro ne fait économiser aucun intérêt

  const growth = Math.pow(1 + r, remainingMonths);
  const shortened = Math.log(1 + (amount * r * growth) / monthlyPaymentAmount) / Math.log(1 + r);
  const cancelledPayments = monthlyPaymentAmount * Math.min(shortened, remainingMonths);
  return roundCents(Math.max(0, cancelledPayments - amount));
}

export interface LeveragePoint {
  readonly month: number;
  /** Capital restant dû à cette date. */
  readonly outstanding: Cents;
  /** Intérêts économisés par un versement de 1 000 € à cette date. */
  readonly savedPerThousand: Cents;
  /** Rendement implicite du versement, en pourcentage du montant remboursé. */
  readonly yieldPct: number;
}

/**
 * Courbe du levier sur toute la durée du prêt.
 *
 * Alimente la frise du module « remboursements anticipés » : chaque date y porte
 * la valeur réelle d'un versement, ce qui rend la décision lisible sans recalculer
 * un échéancier complet à chaque interaction.
 */
export function prepaymentLeverageCurve(
  rows: readonly AmortisationLike[],
  annualRatePct: PercentPerYear,
  monthlyPaymentAmount: Cents,
  outstandingByMonth: readonly Cents[],
  step = 12,
): LeveragePoint[] {
  const out: LeveragePoint[] = [];
  const unit = 100_000; // 1 000 € en centimes
  const total = rows.length;
  for (let m = step; m < total; m += step) {
    const saved = interestSavedByPrepayment(unit, annualRatePct, total - m, monthlyPaymentAmount);
    out.push({
      month: m,
      outstanding: outstandingByMonth[m - 1] ?? 0,
      savedPerThousand: saved,
      yieldPct: (saved / unit) * 100,
    });
  }
  return out;
}

/**
 * Le remboursement anticipé équivaut à un placement sans risque au taux du prêt.
 *
 * Renvoie l'écart, en points, entre le taux du crédit et le rendement NET du
 * placement alternatif. Positif : rembourser crée de la valeur. Négatif :
 * rembourser en détruit, même si le compteur d'intérêts économisés dit l'inverse.
 *
 * C'est l'arbitrage que le produit doit rendre visible, parce qu'il contredit
 * l'intuition qu'un intérêt économisé est toujours un gain.
 */
export function prepaymentArbitragePoints(
  loanAnnualRatePct: PercentPerYear,
  investmentGrossAnnualRatePct: PercentPerYear,
  investmentTaxPct = 0,
): number {
  const net = investmentGrossAnnualRatePct * (1 - investmentTaxPct / 100);
  return loanAnnualRatePct - net;
}
