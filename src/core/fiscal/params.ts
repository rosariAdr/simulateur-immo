/**
 * PARAMÈTRES RÉGLEMENTAIRES VERSIONNÉS
 *
 * Règle de séparation : ce fichier ne contient AUCUNE logique. Uniquement des
 * valeurs susceptibles d'être modifiées par une loi de finances.
 *
 * Test d'appartenance : si le législateur peut changer la valeur sans qu'on
 * réécrive une fonction, elle appartient ici.
 *
 * ⚠️ Ces valeurs proviennent d'une recherche web d'août 2026 (sources secondaires).
 * Chaque entrée marquée TODO_VERIFY doit être confrontée à une source officielle
 * (legifrance.gouv.fr, bofip.impots.gouv.fr, service-public.fr, banque-france.fr)
 * avant toute mise en ligne.
 */

export type LoanKind = "fixed" | "variable" | "bridge";

export interface UsuryThresholds {
  /** Trimestre d'application, ex. "2026-T3". */
  readonly quarter: string;
  readonly from: string;
  readonly to: string;
  /** Seuils de TAEG par catégorie, en pourcentage. */
  readonly fixedUnder10y: number;
  readonly fixed10to20y: number;
  readonly fixed20yPlus: number;
  readonly variable: number;
  readonly bridge: number;
}

export interface FiscalParams {
  readonly vintage: string;
  readonly verifiedAt: string;

  /**
   * Taux d'usure — TAEG maximal légal.
   * @source Banque de France, avis publié au JO fin juin 2026 (T3 2026).
   * @source Code de la consommation, art. L314-6 (calcul : taux moyens pratiqués majorés d'un tiers).
   * @see https://www.banque-france.fr/fr/statistiques/taux-et-cours/taux-dusure-2026-q3
   */
  readonly usury: UsuryThresholds;

  /**
   * Normes d'octroi du Haut Conseil de Stabilité Financière.
   * @source HCSF, normes contraignantes depuis janvier 2022, maintien confirmé en mars 2026.
   * @source Décision HCSF du 18 décembre 2023 (seuil travaux abaissé de 25 % à 10 %).
   */
  readonly hcsf: {
    readonly maxDebtRatioPct: number;
    readonly maxDurationMonths: number;
    /** VEFA, construction, ou travaux ≥ seuil ci-dessous. */
    readonly maxDurationDerogatoryMonths: number;
    readonly derogatoryWorksSharePct: number;
    /** Part de la production trimestrielle pouvant déroger. */
    readonly flexibilityMarginPct: number;
  };

  /**
   * Indemnités de remboursement anticipé.
   * @source Code de la consommation, art. R313-25 (double plafond).
   * @source Code de la consommation, art. L313-47 (droit au remboursement, seuil des 10 %).
   * @source Code de la consommation, art. L313-48 (exonérations légales).
   */
  readonly prepayment: {
    /** Plafond en pourcentage du capital restant dû AVANT remboursement. */
    readonly capPctOutstanding: number;
    /** Plafond exprimé en mois d'intérêts sur le capital remboursé, au taux moyen du prêt. */
    readonly capMonthsOfInterest: number;
    /**
     * Le contrat PEUT interdire les remboursements ≤ ce pourcentage du montant
     * INITIAL du prêt (et non du capital restant dû), sauf s'il s'agit du solde.
     * Faculté contractuelle très répandue, pas une obligation légale.
     */
    readonly contractualMinPctOfInitial: number;
  };

  /**
   * Assurance emprunteur.
   * @source Code de la consommation, art. L313-8 et s. (TAEA obligatoire).
   * @source Loi n° 2022-270 du 28 février 2022 dite loi Lemoine.
   */
  readonly borrowerInsurance: {
    /** Suppression du questionnaire de santé sous ce montant, par assuré. */
    readonly lemoineNoHealthFormThreshold: Cents;
    /** …et à condition que le terme du prêt survienne avant cet âge. */
    readonly lemoineMaxAgeAtTerm: number;
    /*
     * Les fourchettes de taux d'assurance ont quitté ce fichier avec les coûts de
     * garantie — `FIS-005`. Elles étaient annotées « indicatives, pas des valeurs
     * réglementaires », ce qui suffisait à dire qu'elles n'étaient pas à leur
     * place. Voir `src/core/assumptions/market.ts`.
     */
  };

  /**
   * Droits de mutation à titre onéreux et frais d'acquisition.
   * @source Loi de finances 2025 (faculté départementale de relever de 4,50 % à 5,00 %).
   * @source Tableau DGFiP, relevés départementaux 2026.
   * @todo TODO_VERIFY date de fin de la hausse : les sources divergent entre
   *       le 31 mars 2028 et le 30 avril 2028.
   * @todo TODO_VERIFY liste exacte des départements à taux réduit.
   */
  readonly transferTax: {
    /** Taux total dans les départements ayant voté la hausse. */
    readonly oldFullPct: number;
    /** Départements n'ayant pas voté la hausse. */
    readonly oldStandardPct: number;
    /** Départements à taux historiquement réduit. */
    readonly oldReducedPct: number;
    /** Primo-accédants : exclus de plein droit de la hausse de 0,5 point. */
    readonly firstTimeBuyerPct: number;
    /** Neuf : taxe de publicité foncière, pas de DMTO. */
    readonly newBuildLandRegistryPct: number;
    /* Les frais d'acquisition totaux sont partis avec les autres fourchettes — FIS-005. */
    /** Part du prix pouvant être retirée de l'assiette au titre du mobilier, sur inventaire. */
    readonly furnitureDeductionMaxPct: number;
    /**
     * Remise possible sur les émoluments, sur la fraction du prix au-delà du seuil.
     * @source Code de commerce, art. L444-2.
     */
    readonly notaryDiscountMaxPct: number;
    readonly notaryDiscountThreshold: Cents;
  };

  /*
   * Les coûts de garantie ont quitté ce fichier le 22 août 2026 — `FIS-005`.
   *
   * Ils vivent dans `src/core/assumptions/market.ts`. Aucun texte ne les fixe :
   * ce sont des grilles commerciales, révisables sans loi de finances. Les
   * garder ici revenait à leur prêter l'autorité des valeurs qui les entourent,
   * et leur `TODO_VERIFY` était insoluble faute de source qui fasse autorité.
   *
   * Ce fichier ne contient plus que des valeurs dont un article peut être cité.
   * Voir `docs/ADR.md`, ADR-008.
   */

  /**
   * TAEG.
   * @source Code de la consommation, art. R314-3 (méthode d'équivalence actuarielle).
   * @source Code de la consommation, art. R314-4 (frais inclus).
   * @source Code de la consommation, art. R314-5 (frais exclus : acquisition, actes notariés).
   * @source Annexe à l'art. R314-3 (mois normalisé de 365/12 jours, arrondi à une décimale).
   */
  readonly apr: {
    readonly normalizedMonthDays: number;
    readonly displayDecimals: number;
  };
}

import type { Cents } from "../money";
import { euros } from "../money";

export const PARAMS_2026: FiscalParams = {
  vintage: "2026",
  verifiedAt: "2026-08-19",

  usury: {
    quarter: "2026-T3",
    from: "2026-07-01",
    to: "2026-09-30",
    fixedUnder10y: 4.07,
    fixed10to20y: 4.57,
    fixed20yPlus: 5.29,
    variable: 5.28,
    bridge: 6.39,
  },

  hcsf: {
    maxDebtRatioPct: 35,
    maxDurationMonths: 25 * 12,
    maxDurationDerogatoryMonths: 27 * 12,
    derogatoryWorksSharePct: 10,
    flexibilityMarginPct: 20,
  },

  prepayment: {
    capPctOutstanding: 3,
    capMonthsOfInterest: 6,
    contractualMinPctOfInitial: 10,
  },

  borrowerInsurance: {
    lemoineNoHealthFormThreshold: euros(200_000),
    lemoineMaxAgeAtTerm: 60,
  },

  transferTax: {
    oldFullPct: 6.32,
    oldStandardPct: 5.81,
    oldReducedPct: 5.09,
    firstTimeBuyerPct: 5.81,
    newBuildLandRegistryPct: 0.715,
    furnitureDeductionMaxPct: 5,
    notaryDiscountMaxPct: 20,
    notaryDiscountThreshold: euros(100_000),
  },

  apr: {
    normalizedMonthDays: 365 / 12,
    displayDecimals: 1,
  },
};
