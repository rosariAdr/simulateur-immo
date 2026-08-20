/**
 * ÉCHÉANCIER D'AMORTISSEMENT
 *
 * Règles pures. Aucun paramètre réglementaire n'intervient ici : la formule de
 * l'annuité constante s'écrit à l'identique quelle que soit l'année.
 */

import { type Cents, type PercentPerYear, type RoundingMode, monthlyRate, roundCents } from "../money";

export type DeferralKind = "none" | "interest" | "total";

export interface LoanSpec {
  readonly id: string;
  readonly label: string;
  readonly principal: Cents;
  readonly annualRatePct: PercentPerYear;
  /** Durée totale, différé inclus. */
  readonly months: number;
  readonly deferredMonths?: number;
  readonly deferral?: DeferralKind;
  /** Convention d'arrondi du contrat. Voir money.ts. Défaut : arrondi commercial. */
  readonly rounding?: RoundingMode;
}

export interface ScheduleRow {
  readonly month: number;
  readonly year: number;
  readonly interest: Cents;
  readonly principal: Cents;
  /** Intérêts capitalisés pendant un différé total. */
  readonly capitalized: Cents;
  readonly payment: Cents;
  /** Capital restant dû après l'échéance. */
  readonly balance: Cents;
}

/**
 * Annuité constante (mensualité hors assurance).
 *
 *   r = taux annuel / 12
 *   M = C × r / (1 − (1 + r)^(−n))
 *
 * Cas r = 0 : M = C / n. Il ne s'agit pas d'une exception ad hoc mais de la
 * limite de la formule quand r tend vers 0 ; le prêt à taux zéro l'utilise.
 *
 * @source Formule actuarielle standard de l'annuité constante à terme échu.
 *         Cohérente avec le mode de calcul décrit à l'art. R314-3 du Code de la
 *         consommation (intérêts calculés à terme échu, méthode des intérêts composés).
 */
export function monthlyPayment(
  principal: Cents,
  annualRatePct: PercentPerYear,
  months: number,
  rounding: RoundingMode = "half-up",
): Cents {
  if (principal <= 0 || months <= 0) return 0;
  const r = monthlyRate(annualRatePct);
  // Un taux indiscernable de zéro à la précision du flottant SE COMPORTE comme zéro :
  // (1 + r) vaut alors exactement 1 et le dénominateur s'annule. Ce n'est pas un cas
  // métier, mais un test de propriété sur entrées aléatoires l'a exhibé (taux dénormal).
  const denominator = 1 - Math.pow(1 + r, -months);
  if (r === 0 || denominator === 0) return roundCents(principal / months, rounding);
  return roundCents((principal * r) / denominator, rounding);
}

/**
 * Construit l'échéancier complet d'un prêt.
 *
 * Ordre de calcul de chaque échéance, conforme à la pratique bancaire :
 *   1. intérêts sur le capital restant dû d'ouverture
 *   2. part de capital = mensualité − intérêts
 *   3. le capital restant dû diminue d'autant
 *
 * DIFFÉRÉ
 *   - "total"    : aucune échéance. Si le taux est non nul, les intérêts sont
 *                  capitalisés dans le capital restant dû. Le prêt à taux zéro
 *                  étant à 0 %, rien ne se capitalise dans son cas.
 *   - "interest" : seuls les intérêts sont payés, le capital reste intact.
 *
 * DERNIÈRE ÉCHÉANCE
 *   Elle solde exactement le capital restant dû. C'est ce qui garantit que la
 *   somme des parts de capital égale le capital emprunté, au centime près
 *   (invariant testé).
 */
export function amortize(spec: LoanSpec): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  if (spec.principal <= 0 || spec.months <= 0) return rows;

  const r = monthlyRate(spec.annualRatePct);
  const deferred = Math.min(spec.deferredMonths ?? 0, spec.months);
  const kind: DeferralKind = spec.deferral ?? (deferred > 0 ? "total" : "none");
  const mode: RoundingMode = spec.rounding ?? "half-up";

  let balance = spec.principal;

  for (let m = 1; m <= deferred; m++) {
    const interest = roundCents(balance * r, mode);
    if (kind === "total") {
      balance += interest;
      rows.push({
        month: m, year: Math.ceil(m / 12),
        interest: 0, principal: 0, capitalized: interest, payment: 0, balance,
      });
    } else {
      rows.push({
        month: m, year: Math.ceil(m / 12),
        interest, principal: 0, capitalized: 0, payment: interest, balance,
      });
    }
  }

  const amortMonths = spec.months - deferred;
  if (amortMonths <= 0) return rows;

  const payment = monthlyPayment(balance, spec.annualRatePct, amortMonths, mode);

  for (let k = 1; k <= amortMonths; k++) {
    const m = deferred + k;
    const interest = roundCents(balance * r, mode);
    const isLast = k === amortMonths;
    const principal = isLast ? balance : Math.min(payment - interest, balance);
    balance -= principal;
    rows.push({
      month: m, year: Math.ceil(m / 12),
      interest, principal, capitalized: 0,
      payment: interest + principal,
      balance,
    });
  }

  return rows;
}
