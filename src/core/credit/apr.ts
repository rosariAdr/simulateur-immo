/**
 * TAEG — TAUX ANNUEL EFFECTIF GLOBAL
 *
 * @source Code de la consommation, art. R314-3 :
 *   « le taux annuel effectif global est calculé à terme échu, exprimé pour cent
 *   unités monétaires, selon la méthode d'équivalence définie par la formule
 *   figurant en annexe au présent code. Le taux annuel effectif global est calculé
 *   actuariellement et assure, selon la méthode des intérêts composés, l'égalité
 *   entre, d'une part, les sommes prêtées et, d'autre part, tous les versements
 *   dus par l'emprunteur. »
 *
 * @source Code de la consommation, art. R314-4 — frais INCLUS : frais de dossier,
 *   sommes versées aux intermédiaires, assurance et garanties obligatoires,
 *   tenue de compte imposée, évaluation du bien.
 *
 * @source Code de la consommation, art. R314-5 — frais EXCLUS : frais liés à
 *   l'acquisition de l'immeuble, taxes et frais d'acte notarié.
 *   → Les frais de notaire n'entrent PAS dans le TAEG. Erreur la plus fréquente.
 *
 * @source Annexe à l'art. R314-3 — un mois normalisé compte 365/12 jours, soit
 *   30,41666 jours ; le résultat s'exprime avec au moins une décimale.
 *
 * ── LIMITE ASSUMÉE DE CETTE IMPLÉMENTATION ──────────────────────────────────
 * Le texte raisonne en fractions d'années calculées sur des mois normalisés.
 * L'implémentation ci-dessous suppose des échéances mensuelles régulières et
 * annualise par (1 + ρ)^12. Les deux approches coïncident pour un prêt mensuel
 * classique et divergent marginalement en présence d'échéances irrégulières,
 * de déblocages échelonnés ou d'une première échéance décalée.
 *
 * Le résultat doit donc être présenté comme une ESTIMATION, jamais comme le TAEG
 * contractuel. Un écart de quelques centièmes avec l'offre de prêt est normal.
 */

import type { Cents } from "../money";

export interface AprInput {
  /**
   * Sommes effectivement mises à disposition, nettes des frais retenus au départ
   * (frais de dossier, coût de garantie, courtage).
   */
  readonly netAdvanced: Cents;
  /** Échéances mensuelles successives, assurance obligatoire incluse. */
  readonly payments: readonly Cents[];
}

/** Valeur actuelle nette des échéances, actualisées au taux mensuel r, moins le capital reçu. */
function npv(r: number, input: AprInput): number {
  let acc = 0;
  for (let i = 0; i < input.payments.length; i++) {
    acc += (input.payments[i] ?? 0) / Math.pow(1 + r, i + 1);
  }
  return acc - input.netAdvanced;
}

/**
 * Résout le taux périodique mensuel annulant la VAN, par dichotomie.
 *
 * La fonction est strictement décroissante en r sur le domaine utile, ce qui
 * garantit l'unicité de la racine et la convergence de la dichotomie.
 *
 * @returns le taux mensuel, ou NaN si aucune racine dans [0, hi].
 */
export function periodicRate(input: AprInput, hi = 0.05, iterations = 200): number {
  if (input.netAdvanced <= 0 || input.payments.length === 0) return Number.NaN;
  if (npv(0, input) < 0) return Number.NaN; // le total remboursé est inférieur au capital reçu
  if (npv(hi, input) > 0) return Number.NaN; // racine hors du domaine exploré

  let lo = 0;
  let high = hi;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + high) / 2;
    if (npv(mid, input) > 0) lo = mid;
    else high = mid;
  }
  return (lo + high) / 2;
}

/**
 * TAEG annuel en pourcentage, par équivalence : TAEG = (1 + ρ)^12 − 1.
 *
 * Méthode d'équivalence (et non proportionnelle) : c'est bien ce qu'impose
 * l'art. R314-3, contrairement au taux nominal qui est proportionnel.
 */
export function apr(input: AprInput): number {
  const r = periodicRate(input);
  return Number.isFinite(r) ? (Math.pow(1 + r, 12) - 1) * 100 : Number.NaN;
}

/**
 * TAEA — part du TAEG imputable à la seule assurance.
 *
 * @source Code de la consommation, art. L313-8 et suivants.
 * Calculé par différence entre le TAEG assurance comprise et le TAEG hors assurance.
 * C'est le seul indicateur permettant de comparer deux offres dont les bases de
 * calcul diffèrent (capital initial contre capital restant dû).
 */
export function taea(withInsurance: AprInput, withoutInsurance: AprInput): number {
  const a = apr(withInsurance);
  const b = apr(withoutInsurance);
  return Number.isFinite(a) && Number.isFinite(b) ? a - b : Number.NaN;
}
