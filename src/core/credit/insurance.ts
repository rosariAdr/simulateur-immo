/**
 * ASSURANCE EMPRUNTEUR
 *
 * Deuxième poste de coût d'un crédit après les intérêts, et le plus mal compris.
 * Le paramètre décisif n'est pas le taux affiché mais la BASE de calcul.
 *
 * @source Code de la consommation, art. L313-8 et suivants (TAEA obligatoire).
 * @source Loi n° 2022-270 du 28 février 2022 dite loi Lemoine.
 */

import { type Cents, type PercentPerYear, type RoundingMode, roundCents } from "../money";

/**
 * - "initial"     : prime constante calculée sur le capital emprunté d'origine.
 *                   Pratique majoritaire des contrats groupe bancaires.
 * - "outstanding" : prime dégressive calculée sur le capital restant dû.
 *                   Pratique fréquente des délégations d'assurance.
 *
 * À taux affiché identique, l'écart de coût total atteint 30 à 45 % sur la durée.
 *
 * NOTE : le mode de cotisation et la base de calcul sont en principe indépendants.
 * L'association décrite ci-dessus reflète une pratique de marché, pas une règle.
 */
export type InsuranceBasis = "initial" | "outstanding";

export interface InsuranceSpec {
  readonly annualRatePct: PercentPerYear;
  readonly basis: InsuranceBasis;
  /**
   * Quotité assurée, en pourcentage. Peut dépasser 100 :
   * deux emprunteurs couverts chacun intégralement donnent 200 %.
   */
  readonly coveragePct: number;
}

/**
 * Prime mensuelle.
 *
 *   prime = base × (taux annuel / 100 / 12) × (quotité / 100)
 */
export function monthlyPremium(
  basisAmount: Cents,
  spec: InsuranceSpec,
  rounding: RoundingMode = "half-up",
): Cents {
  if (basisAmount <= 0) return 0;
  return roundCents((basisAmount * (spec.annualRatePct / 100 / 12) * spec.coveragePct) / 100, rounding);
}

/**
 * Série des primes sur toute la durée.
 *
 * @param initialCapital capital total assuré à l'origine
 * @param outstandingByMonth capital restant dû à l'OUVERTURE de chaque mois
 *        (c'est-à-dire le solde de clôture du mois précédent), car la prime du
 *        mois m se calcule sur le capital dû avant l'échéance de ce mois.
 */
export function premiumSchedule(
  initialCapital: Cents,
  outstandingByMonth: readonly Cents[],
  spec: InsuranceSpec,
): Cents[] {
  return outstandingByMonth.map((outstanding) =>
    monthlyPremium(spec.basis === "initial" ? initialCapital : outstanding, spec),
  );
}

/**
 * Éligibilité à la suppression du questionnaire de santé.
 *
 * @source Loi Lemoine : questionnaire supprimé si la part assurée n'excède pas
 *         200 000 € PAR ASSURÉ et si le terme du prêt survient avant le
 *         60e anniversaire de l'emprunteur.
 */
export function isHealthFormWaived(
  insuredShare: Cents,
  ageAtTerm: number,
  threshold: Cents,
  maxAge: number,
): boolean {
  return insuredShare <= threshold && ageAtTerm < maxAge;
}
