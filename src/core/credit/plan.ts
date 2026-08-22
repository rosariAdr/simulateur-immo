/**
 * PLAN DE FINANCEMENT — agrégation des prêts, de l'assurance et des frais.
 *
 * Point d'entrée du module crédit. Compose les briques des autres fichiers ;
 * ne contient aucune formule qui lui soit propre.
 */

import { type Cents, applyPct, sum } from "../money";
import type { FiscalParams, LoanKind } from "../fiscal/params";
import { MARKET_2026, type MarketAssumptions } from "../assumptions/market";
import { type LoanSpec, type ScheduleRow, amortize } from "./schedule";
import { type InsuranceSpec, premiumSchedule } from "./insurance";
import { apr, taea } from "./apr";
import { type HcsfCheck, type UsuryCheck, checkHcsf, checkUsury } from "./constraints";

/* ── Garantie ─────────────────────────────────────────────────────────────── */

export type GuaranteeKind = "suretyship" | "mortgage" | "pledge";

export interface GuaranteeCost {
  readonly kind: GuaranteeKind;
  readonly cost: Cents;
  /** Part restituée au terme (fonds mutuel de garantie d'un organisme de caution). */
  readonly refundAtTerm: Cents;
  /** Coût de mainlevée en cas de revente avant terme. Nul hors hypothèque. */
  readonly releaseCostOnEarlySale: Cents;
}

/**
 * Coûts de garantie.
 *
 * ⚠️ Le dernier paramètre n'est PAS un millésime fiscal : ce sont des hypothèses
 * de MARCHÉ. Aucun texte ne fixe ces valeurs, les barèmes réels des organismes de
 * caution sont progressifs et dépendent du montant. La séparation d'avec
 * `FiscalParams` est la raison d'être de `FIS-005` — voir ADR-008 et
 * `src/core/assumptions/market.ts`, où chaque valeur porte son intervalle observé
 * et sa provenance.
 */
export function guaranteeCost(
  kind: GuaranteeKind,
  guaranteedPrincipal: Cents,
  propertyPrice: Cents,
  hypotheses: MarketAssumptions,
): GuaranteeCost {
  const g = hypotheses.guarantee;
  if (kind === "suretyship") {
    const cost = applyPct(guaranteedPrincipal, g.suretyshipCostPct.valeur);
    return {
      kind,
      cost,
      refundAtTerm: applyPct(cost, g.suretyshipRefundPct.valeur),
      releaseCostOnEarlySale: 0,
    };
  }
  if (kind === "mortgage") {
    return {
      kind,
      cost: applyPct(guaranteedPrincipal, g.mortgageCostPct.valeur),
      refundAtTerm: 0,
      releaseCostOnEarlySale: applyPct(propertyPrice, g.mortgageReleasePct.valeur),
    };
  }
  return {
    kind,
    cost: applyPct(guaranteedPrincipal, g.pledgeCostPct.valeur),
    refundAtTerm: 0,
    releaseCostOnEarlySale: 0,
  };
}

/* ── Entrée / sortie ──────────────────────────────────────────────────────── */

export interface CreditPlanInput {
  readonly loans: readonly LoanSpec[];
  readonly insurance: InsuranceSpec;
  readonly guarantee: GuaranteeKind;
  readonly arrangementFee: Cents;
  readonly brokerageFee?: Cents;
  readonly propertyPrice: Cents;
  readonly netMonthlyIncome: Cents;
  readonly otherDebtService?: Cents;
  /**
   * Hypothèses de marché — coûts de garantie. Optionnelles : à défaut, celles du
   * relevé courant. Le paramètre existe pour que l'appelant puisse les lui
   * substituer, ce qu'aucune valeur réglementaire ne permettrait. Voir FIS-005.
   */
  readonly marketAssumptions?: MarketAssumptions;
  readonly loanKind?: LoanKind;
  readonly eligibleForExtendedDuration?: boolean;
}

export interface ConsolidatedRow {
  readonly month: number;
  readonly year: number;
  readonly interest: Cents;
  readonly principal: Cents;
  readonly insurance: Cents;
  readonly payment: Cents;
  readonly balance: Cents;
}

export interface AnnualRow {
  readonly year: number;
  readonly interest: Cents;
  readonly principal: Cents;
  readonly insurance: Cents;
  readonly payment: Cents;
  readonly closingBalance: Cents;
}

export interface CreditPlan {
  readonly vintage: string;
  readonly perLoan: ReadonlyMap<string, readonly ScheduleRow[]>;
  readonly rows: readonly ConsolidatedRow[];
  readonly annual: readonly AnnualRow[];
  readonly totalPrincipal: Cents;
  readonly totalInterest: Cents;
  readonly totalInsurance: Cents;
  readonly upfrontFees: Cents;
  readonly guarantee: GuaranteeCost;
  /** Intérêts + assurance + frais initiaux. N'inclut pas les frais d'acquisition. */
  readonly totalCreditCost: Cents;
  readonly firstPayment: Cents;
  readonly maxPayment: Cents;
  readonly aprPct: number;
  readonly taeaPct: number;
  /** Premier mois où la part de capital atteint ou dépasse les intérêts. */
  readonly crossoverMonth: number | null;
  readonly usury: UsuryCheck;
  readonly hcsf: HcsfCheck;
}

/**
 * Consolide plusieurs prêts en un plan unique.
 *
 * POINT CLÉ : avec un prêt à taux zéro assorti d'un différé, la mensualité TOTALE
 * augmente à la fin du différé. C'est `maxPayment` qui doit être confronté au
 * plafond d'endettement, jamais `firstPayment`.
 *
 * En pratique, les banques lissent l'ensemble pour produire une mensualité
 * constante. Le lissage n'est pas modélisé ici : le plan décrit les prêts tels
 * qu'ils sont contractés. L'interface doit proposer les deux lectures.
 */
export function buildCreditPlan(input: CreditPlanInput, p: FiscalParams): CreditPlan {
  const perLoan = new Map<string, readonly ScheduleRow[]>();
  for (const loan of input.loans) perLoan.set(loan.id, amortize(loan));

  const horizon = Math.max(0, ...[...perLoan.values()].map((s) => s.length));
  const totalPrincipal = sum(input.loans.map((l) => l.principal));

  // Capital restant dû consolidé à l'ouverture de chaque mois.
  const openingBalances: Cents[] = [];
  const closingBalances: Cents[] = [];
  for (let m = 1; m <= horizon; m++) {
    let closing = 0;
    for (const s of perLoan.values()) closing += s[m - 1]?.balance ?? 0;
    openingBalances.push(m === 1 ? totalPrincipal : (closingBalances[m - 2] ?? 0));
    closingBalances.push(closing);
  }

  const premiums = premiumSchedule(totalPrincipal, openingBalances, input.insurance);

  const rows: ConsolidatedRow[] = [];
  for (let m = 1; m <= horizon; m++) {
    let interest = 0, principal = 0, payment = 0;
    for (const s of perLoan.values()) {
      const r = s[m - 1];
      if (!r) continue;
      interest += r.interest;
      principal += r.principal;
      payment += r.payment;
    }
    const ins = premiums[m - 1] ?? 0;
    rows.push({
      month: m, year: Math.ceil(m / 12),
      interest, principal, insurance: ins,
      payment: payment + ins,
      balance: closingBalances[m - 1] ?? 0,
    });
  }

  const guarantee = guaranteeCost(
    input.guarantee,
    totalPrincipal,
    input.propertyPrice,
    input.marketAssumptions ?? MARKET_2026,
  );
  const upfrontFees = input.arrangementFee + guarantee.cost + (input.brokerageFee ?? 0);

  const totalInterest = sum(rows.map((r) => r.interest));
  const totalInsurance = sum(rows.map((r) => r.insurance));

  // TAEG : capital reçu net des frais initiaux, échéances assurance comprise.
  // Les frais de notaire sont volontairement absents (art. R314-5).
  const netAdvanced = totalPrincipal - upfrontFees;
  const aprPct = apr({ netAdvanced, payments: rows.map((r) => r.payment) });
  const taeaPct = taea(
    { netAdvanced, payments: rows.map((r) => r.payment) },
    { netAdvanced, payments: rows.map((r) => r.payment - r.insurance) },
  );

  const payments = rows.map((r) => r.payment);
  const maxPayment = payments.length ? Math.max(...payments) : 0;
  const crossover = rows.findIndex((r) => r.principal > 0 && r.principal >= r.interest);

  return {
    vintage: p.vintage,
    perLoan,
    rows,
    annual: aggregateByYear(rows),
    totalPrincipal,
    totalInterest,
    totalInsurance,
    upfrontFees,
    guarantee,
    totalCreditCost: totalInterest + totalInsurance + upfrontFees,
    firstPayment: payments[0] ?? 0,
    maxPayment,
    aprPct,
    taeaPct,
    crossoverMonth: crossover >= 0 ? crossover + 1 : null,
    usury: checkUsury(aprPct, input.loanKind ?? "fixed", horizon, p),
    hcsf: checkHcsf(
      {
        maxMonthlyPayment: maxPayment,
        otherDebtService: input.otherDebtService ?? 0,
        netMonthlyIncome: input.netMonthlyIncome,
        durationMonths: horizon,
        ...(input.eligibleForExtendedDuration !== undefined
          ? { eligibleForExtendedDuration: input.eligibleForExtendedDuration }
          : {}),
      },
      p,
    ),
  };
}

function aggregateByYear(rows: readonly ConsolidatedRow[]): AnnualRow[] {
  const out: AnnualRow[] = [];
  const years = new Set(rows.map((r) => r.year));
  for (const year of [...years].sort((a, b) => a - b)) {
    const g = rows.filter((r) => r.year === year);
    out.push({
      year,
      interest: sum(g.map((r) => r.interest)),
      principal: sum(g.map((r) => r.principal)),
      insurance: sum(g.map((r) => r.insurance)),
      payment: sum(g.map((r) => r.payment)),
      closingBalance: g[g.length - 1]?.balance ?? 0,
    });
  }
  return out;
}
