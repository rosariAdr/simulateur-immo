/**
 * CONTRAINTES RÉGLEMENTAIRES D'OCTROI
 *
 * Ce module porte la catégorie « réglementaire » de la taxonomie produit :
 * ce qui s'impose et ne se négocie pas.
 */

import type { Cents } from "../money";
import type { FiscalParams, LoanKind } from "../fiscal/params";

/* ── Taux d'usure ─────────────────────────────────────────────────────────── */

/**
 * Le taux d'usure plafonne le TAEG, PAS le taux nominal.
 *
 * @source Code de la consommation, art. L314-6 : seuil calculé chaque trimestre
 *   par la Banque de France à partir de la moyenne pondérée des TAEG pratiqués,
 *   augmentée d'un tiers.
 *
 * ENJEU PÉDAGOGIQUE : puisque le TAEG intègre l'assurance emprunteur, la garantie
 * et les frais de dossier, un dossier peut buter sur l'usure à cause de son
 * assurance alors même que le taux nominal est très raisonnable. C'est la cause
 * de refus la moins bien comprise des emprunteurs.
 */
export function usuryThreshold(
  kind: LoanKind,
  months: number,
  p: FiscalParams,
): number {
  const u = p.usury;
  if (kind === "bridge") return u.bridge;
  if (kind === "variable") return u.variable;
  if (months < 120) return u.fixedUnder10y;
  if (months < 240) return u.fixed10to20y;
  return u.fixed20yPlus;
}

export interface UsuryCheck {
  readonly threshold: number;
  readonly apr: number;
  readonly compliant: boolean;
  /** Marge restante en points de pourcentage. Négative si le seuil est franchi. */
  readonly headroomPoints: number;
  readonly quarter: string;
}

export function checkUsury(
  aprPct: number,
  kind: LoanKind,
  months: number,
  p: FiscalParams,
): UsuryCheck {
  const threshold = usuryThreshold(kind, months, p);
  return {
    threshold,
    apr: aprPct,
    compliant: Number.isFinite(aprPct) ? aprPct <= threshold : true,
    headroomPoints: threshold - aprPct,
    quarter: p.usury.quarter,
  };
}

/* ── Normes HCSF ──────────────────────────────────────────────────────────── */

export interface HcsfInput {
  /** Mensualité maximale sur la durée, ASSURANCE COMPRISE. */
  readonly maxMonthlyPayment: Cents;
  /** Autres charges de crédit mensuelles. */
  readonly otherDebtService: Cents;
  readonly netMonthlyIncome: Cents;
  readonly durationMonths: number;
  /** VEFA, construction, ou travaux atteignant le seuil dérogatoire. */
  readonly eligibleForExtendedDuration?: boolean;
}

export interface HcsfCheck {
  readonly debtRatioPct: number;
  readonly maxDebtRatioPct: number;
  readonly debtRatioCompliant: boolean;
  readonly maxDurationMonths: number;
  readonly durationCompliant: boolean;
  readonly compliant: boolean;
  /**
   * Une non-conformité n'est pas rédhibitoire : les banques disposent d'une
   * marge de dérogation portant sur une part de leur production trimestrielle,
   * prioritairement affectée à la résidence principale et aux primo-accédants.
   */
  readonly flexibilityMarginPct: number;
}

/**
 * Taux d'effort et durée maximale.
 *
 * @source HCSF, normes contraignantes pour les établissements depuis janvier 2022,
 *   maintien confirmé lors de la réunion de mars 2026.
 * @source Décision HCSF du 18 décembre 2023 : durée portée à 27 ans lorsque les
 *   travaux représentent au moins 10 % du montant emprunté (seuil abaissé de 25 %).
 *
 * NON MODÉLISÉ : le critère de « reste à vivre », appliqué par les banques mais
 * non normé, et qui peut être plus contraignant que le ratio lui-même.
 */
export function checkHcsf(input: HcsfInput, p: FiscalParams): HcsfCheck {
  const income = input.netMonthlyIncome;
  const ratio = income > 0
    ? ((input.maxMonthlyPayment + input.otherDebtService) / income) * 100
    : Number.POSITIVE_INFINITY;

  const maxDuration = input.eligibleForExtendedDuration
    ? p.hcsf.maxDurationDerogatoryMonths
    : p.hcsf.maxDurationMonths;

  const debtOk = ratio <= p.hcsf.maxDebtRatioPct;
  const durationOk = input.durationMonths <= maxDuration;

  return {
    debtRatioPct: ratio,
    maxDebtRatioPct: p.hcsf.maxDebtRatioPct,
    debtRatioCompliant: debtOk,
    maxDurationMonths: maxDuration,
    durationCompliant: durationOk,
    compliant: debtOk && durationOk,
    flexibilityMarginPct: p.hcsf.flexibilityMarginPct,
  };
}

/* ── Remboursement anticipé ───────────────────────────────────────────────── */

export interface PrepaymentPenalty {
  readonly amount: Cents;
  readonly capByOutstanding: Cents;
  readonly capByInterest: Cents;
  /** Quel plafond a mordu. Pédagogiquement utile à afficher. */
  readonly bindingCap: "outstanding" | "interest";
  readonly legallyExempt: boolean;
}

/**
 * Motifs d'exonération de plein droit.
 *
 * @source Code de la consommation, art. L313-47 : aucune indemnité n'est due
 *   lorsque le remboursement est motivé par la vente du bien faisant suite à un
 *   changement du lieu d'activité professionnelle de l'emprunteur ou de son
 *   conjoint, par le décès, ou par la cessation forcée de l'activité
 *   professionnelle de ces derniers.
 *
 * Ces exonérations s'appliquent même si le contrat ne les mentionne pas.
 */
export type ExemptionReason =
  | "professional-relocation"
  | "forced-activity-cessation"
  | "death"
  | "none";

/**
 * Indemnité de remboursement anticipé.
 *
 * @source Code de la consommation, art. R313-25 :
 *   « l'indemnité […] ne peut excéder la valeur d'un semestre d'intérêt sur le
 *   capital remboursé au taux moyen du prêt, sans pouvoir dépasser 3 % du capital
 *   restant dû avant le remboursement. »
 *
 *   IRA = min( capitalRemboursé × taux × 6/12 , capitalRestantDûAvant × 3 % )
 *
 * NON MODÉLISÉ : pour les prêts à taux variable, des intérêts compensateurs
 * peuvent s'ajouter (R313-25, alinéa 2).
 */
export function prepaymentPenalty(
  repaid: Cents,
  outstandingBefore: Cents,
  annualRatePct: number,
  p: FiscalParams,
  exemption: ExemptionReason = "none",
  contractuallyWaived = false,
): PrepaymentPenalty {
  const capByInterest = Math.round(
    (repaid * annualRatePct * p.prepayment.capMonthsOfInterest) / 100 / 12,
  );
  const capByOutstanding = Math.round(
    (outstandingBefore * p.prepayment.capPctOutstanding) / 100,
  );
  const legallyExempt = exemption !== "none";
  const amount = legallyExempt || contractuallyWaived
    ? 0
    : Math.min(capByInterest, capByOutstanding);

  return {
    amount,
    capByOutstanding,
    capByInterest,
    bindingCap: capByInterest <= capByOutstanding ? "interest" : "outstanding",
    legallyExempt,
  };
}

/**
 * Le contrat peut-il refuser ce remboursement partiel ?
 *
 * @source Code de la consommation, art. L313-47 : « Le contrat de prêt peut
 *   interdire les remboursements égaux ou inférieurs à 10 % du montant initial
 *   du prêt, sauf s'il s'agit de son solde. »
 *
 * ATTENTION : le seuil porte sur le montant INITIAL du prêt, pas sur le capital
 * restant dû. Confusion très répandue, y compris dans des sources sérieuses.
 * Il s'agit d'une faculté contractuelle, pas d'une interdiction légale.
 */
export function isBelowContractualMinimum(
  repaid: Cents,
  initialPrincipal: Cents,
  outstandingBefore: Cents,
  p: FiscalParams,
): boolean {
  const isFullSettlement = repaid >= outstandingBefore;
  if (isFullSettlement) return false;
  return repaid <= (initialPrincipal * p.prepayment.contractualMinPctOfInitial) / 100;
}
