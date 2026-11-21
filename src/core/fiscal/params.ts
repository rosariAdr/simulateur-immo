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

/**
 * Décomposition d'un taux de prélèvements sociaux.
 *
 * Le total n'est pas dérivé : il est écrit, et un test vérifie qu'il vaut bien la
 * somme des trois composantes. Une décomposition qui ne se recompose pas est une
 * décomposition fausse, et c'est l'erreur qu'on commet en recopiant un taux global
 * sans toucher aux parts.
 */
export interface SocialLevyBreakdown {
  /** Contribution sociale généralisée. */
  readonly csgPct: number;
  /** Contribution pour le remboursement de la dette sociale. */
  readonly crdsPct: number;
  /** Prélèvement de solidarité. */
  readonly solidarityPct: number;
  /** Somme des trois, écrite et non calculée. */
  readonly totalPct: number;
}

/**
 * Une tranche d'un barème d'abattement pour durée de détention.
 *
 * Le taux est acquis PAR ANNÉE de détention comprise dans la tranche, bornes
 * incluses. Il ne s'agit donc pas d'un barème par paliers : les tranches
 * s'additionnent au fil de la détention.
 */
export interface HoldingPeriodStep {
  /** Première année de détention concernée, incluse. */
  readonly fromYear: number;
  /** Dernière année de détention concernée, incluse. */
  readonly toYear: number;
  /** Abattement acquis par année de détention de la tranche, en pourcentage. */
  readonly ratePctPerYear: number;
}

/**
 * Un barème d'abattement pour durée de détention.
 *
 * Il y en a DEUX, et ils diffèrent — cadence et durée d'exonération. Les confondre
 * est l'erreur classique du calcul de plus-value immobilière : elle donne un
 * résultat juste jusqu'à la vingt-deuxième année, puis faux jusqu'à la trentième.
 */
export interface HoldingPeriodAllowance {
  readonly steps: readonly HoldingPeriodStep[];
  /** Durée de détention au terme de laquelle l'abattement atteint 100 %, en années. */
  readonly fullExemptionYear: number;
}

/**
 * Une tranche du barème de la surtaxe sur les plus-values immobilières élevées.
 *
 * Le taux s'applique à la TOTALITÉ de la plus-value imposable, pas à la seule
 * fraction excédant la borne basse. Une tranche sur deux porte une décote de
 * lissage qui amortit l'effet de seuil : `taxe = taux × PV − (borne haute − PV) × coefficient`.
 */
export interface SurtaxBracket {
  /** Borne basse de plus-value imposable, incluse. */
  readonly fromCents: Cents;
  /** Borne haute, incluse. `null` sur la dernière tranche, non bornée. */
  readonly toCents: Cents | null;
  /** Taux appliqué à la totalité de la plus-value imposable, en pourcentage. */
  readonly ratePct: number;
  /**
   * Coefficient de la décote de lissage, appliqué à l'écart entre la borne haute
   * et la plus-value. Vaut 0 sur les tranches sans lissage.
   */
  readonly smoothingCoefficient: number;
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

  /**
   * Prélèvements sociaux sur les revenus du patrimoine et les produits de placement.
   *
   * ⚠️ Le taux global n'est PAS unique depuis les revenus 2025. Le 2° du I de
   * l'article L136-8 porte la CSG à 10,6 %, mais le IV du même article y déroge et
   * la maintient à 9,2 % pour, entre autres, les revenus fonciers et les plus-values
   * immobilières. Deux taux coexistent donc — 18,6 % et 17,2 % — et c'est le second
   * qui concerne ce produit.
   *
   * @source Code de la sécurité sociale, art. L136-8, I, 2° (CSG à 10,6 %).
   * @source Code de la sécurité sociale, art. L136-8, IV (dérogation à 9,2 %).
   * @see https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006173099
   * @see https://www.service-public.gouv.fr/particuliers/vosdroits/F2329
   */
  readonly socialLevies: {
    /**
     * Régime de droit commun des revenus du patrimoine et produits de placement.
     * @source Code de la sécurité sociale, art. L136-8, I, 2° — CSG 10,6 %.
     * @source service-public.gouv.fr, fiche F2329, mise à jour du 30 juin 2026 — total 18,6 %.
     * @see https://www.service-public.gouv.fr/particuliers/vosdroits/F2329
     */
    readonly patrimony: SocialLevyBreakdown;

    /**
     * Régime dérogatoire des revenus fonciers et des plus-values immobilières.
     * C'est celui qu'applique ce simulateur.
     * @source Code de la sécurité sociale, art. L136-8, IV — CSG maintenue à 9,2 %.
     * @source impots.gouv.fr, « Je donne un bien en location. Dois-je payer des
     *         prélèvements sociaux ? » — location nue : « 17,2 % (CSG 9,2 %, CRDS 0,5 %
     *         et prélèvement de solidarité 7,5 %) ».
     * @see https://www.impots.gouv.fr/particulier/questions/je-donne-un-bien-en-location-dois-je-payer-des-prelevements-sociaux
     */
    readonly realEstate: SocialLevyBreakdown;

    /**
     * Taux réduit des personnes affiliées à un régime obligatoire de sécurité sociale
     * d'un État de l'EEE ou de Suisse : exonérées de CSG et de CRDS, elles ne
     * supportent que le prélèvement de solidarité.
     * @source Loi n° 2018-1203 du 22 décembre 2018 de financement de la sécurité
     *         sociale pour 2019, art. 26 — exonération applicable depuis le 1er janvier 2019.
     * @source impots.gouv.fr, « Je suis non-résident, suis-je redevable des prélèvements
     *         sociaux ? » — « un prélèvement de solidarité au taux de 7,5 % ».
     * @see https://www.impots.gouv.fr/international-particulier/questions/je-suis-non-resident-suis-je-redevable-des-contributions
     */
    readonly eeaReducedPct: number;
  };

  /**
   * Impôt sur le revenu — barème progressif (`FIS-012`, vérifié le 19 novembre 2026).
   *
   * Report dans ce fichier gelé (ADR-004) d'une valeur qui vivait sans source dans
   * `src/lib/patrimoine.ts` : la seule valeur réglementaire du simulateur hors de
   * `src/core/fiscal/` (revue system design du 18 novembre 2026, constat SIM-02).
   */
  readonly incomeTax: {
    /**
     * Taux marginaux du barème, en pourcentage, dans l'ordre des fractions.
     *
     * Le premier, 0 %, n'est pas écrit dans l'article : il est la fraction que
     * l'article n'impose pas, « la fraction de chaque part de revenu qui excède »
     * le premier seuil étant seule taxée. Les quatre suivants y sont en toutes lettres.
     *
     * Les LIMITES des fractions ne sont pas reportées : revalorisées chaque année,
     * elles ne servent à aucun calcul du simulateur, où la tranche marginale est
     * choisie par l'utilisateur.
     * @source Code général des impôts, art. 197, I, 1 — « 11 % », « 30 % », « 41 % »,
     *         « 45 % ». Version en vigueur depuis le 21 février 2026, modifiée par la
     *         loi n° 2026-103 du 19 février 2026 de finances pour 2026, art. 4.
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053542636
     */
    readonly marginalRatesPct: readonly number[];
  };

  /**
   * Imposition des revenus locatifs — les régimes micro du module « louer plutôt
   * que vendre » (`FIS-010`, vérifié le 25 août 2026).
   *
   * Le taux de prélèvements sociaux N'EST PAS ici : il se lit dans `socialLevies`,
   * et le régime commande lequel. La location NUE est au taux dérogatoire
   * (`realEstate`, 17,2 %) : le IV de l'art. L136-8 vise les revenus fonciers du
   * a du I de l'art. L136-6. La location MEUBLÉE non professionnelle est au droit
   * commun (`patrimony`, 18,6 %) : ses bénéfices relèvent du f du même I, que la
   * dérogation ne cite pas. Une nue à 17,2 % et une meublée à 18,6 % — la
   * différence est contre-intuitive, vérifiée, et fait partie de ce que le module
   * enseigne.
   * @source Code de la sécurité sociale, art. L136-8, IV — liste limitative de la
   *         dérogation. Version en vigueur au 21 février 2026.
   * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042683546
   */
  readonly rentalIncome: {
    /**
     * Micro-foncier — location nue. Seuil de revenu brut foncier annuel du foyer,
     * écrit en dur dans l'article, sans clause d'actualisation.
     * @source Code général des impôts, art. 32 — revenu brut qui « n'excède pas
     *         15 000 € », « abattement de 30 % ». Version en vigueur au
     *         21 février 2026 (loi n° 2026-103 du 19 février 2026).
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048847610
     */
    readonly microFoncier: {
      /** Seuil de revenu brut foncier annuel du foyer fiscal. */
      readonly grossIncomeThresholdCents: Cents;
      readonly allowancePct: number;
    };

    /**
     * Micro-BIC — location meublée. L'article range la longue durée et le meublé
     * de tourisme CLASSÉ au même seuil actualisable (2°), et le meublé de tourisme
     * NON CLASSÉ au 1° bis, dont le seuil est expressément exclu de
     * l'actualisation triennale — aligné sur le micro-foncier par la loi Le Meur.
     * Les chambres d'hôtes sont hors périmètre du module.
     * @source Code général des impôts, art. 50-0 — version en vigueur au
     *         1er juillet 2026, actualisation triennale du décret n° 2026-562 du
     *         29 juin 2026 : 83 600 € (2°), 15 000 € (1° bis), abattements 50 %
     *         et 30 %, abattement minimum de 305 €.
     * @source Loi n° 2024-1039 du 19 novembre 2024, dite Le Meur — meublés de
     *         tourisme non classés au 1° bis, 15 000 € et 30 %.
     * @source service-public.gouv.fr, fiche F32744 vérifiée le 15 avril 2026 —
     *         table des revenus 2026 : 83 600 € / 50 % pour la longue durée et
     *         les classés, 15 000 € / 30 % pour les non classés.
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048844097
     * @see https://www.service-public.gouv.fr/particuliers/vosdroits/F32744
     */
    readonly microBic: {
      readonly longTermThresholdCents: Cents;
      readonly longTermAllowancePct: number;
      readonly classifiedTourismThresholdCents: Cents;
      readonly classifiedTourismAllowancePct: number;
      readonly unclassifiedTourismThresholdCents: Cents;
      readonly unclassifiedTourismAllowancePct: number;
      readonly minimumAllowanceCents: Cents;
    };

    /**
     * Location meublée de COURTE durée : au-delà de ce seuil de recettes
     * annuelles, l'affiliation à la sécurité sociale des indépendants remplace
     * les prélèvements sociaux. Un autre monde de cotisations, que le module ne
     * modélise pas et doit signaler au franchissement.
     * @source Code de la sécurité sociale, art. L611-1, 6° — location « à une
     *         clientèle y effectuant un séjour à la journée, à la semaine ou au
     *         mois », par renvoi au seuil du 1° du 2 du IV de l'art. 155 du CGI,
     *         soit 23 000 €. Version en vigueur au 21 février 2026.
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042683852
     */
    readonly shortTermSocialAffiliationThresholdCents: Cents;
  };

  /**
   * Plus-value immobilière des particuliers, hors résidence principale.
   *
   * @source Code général des impôts, art. 150 U à 150 VH.
   * @see https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006197216/
   */
  readonly realEstateCapitalGains: {
    /**
     * Taux forfaitaire d'imposition à l'impôt sur le revenu.
     * @source Code général des impôts, art. 200 B — « taxées à un taux forfaitaire de 19 % ».
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000030061684
     */
    readonly incomeTaxRatePct: number;

    /**
     * Abattement pour durée de détention — IMPÔT SUR LE REVENU.
     * Exonération totale au terme de la 22e année.
     * @source Code général des impôts, art. 150 VC, I — « 6 % pour chaque année de
     *         détention au-delà de la cinquième » et « 4 % au titre de la vingt-deuxième
     *         année de détention ». Version en vigueur depuis le 1er janvier 2014.
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047970756
     */
    readonly incomeTaxAllowance: HoldingPeriodAllowance;

    /**
     * Abattement pour durée de détention — PRÉLÈVEMENTS SOCIAUX.
     * Cadence et durée DIFFÉRENTES de celles de l'impôt sur le revenu : exonération
     * totale au terme de la 30e année seulement.
     * @source Code de la sécurité sociale, art. L136-7, VI, 2° — « 1,65 % pour chaque
     *         année de détention au-delà de la cinquième », « 1,60 % pour la vingt-deuxième
     *         année de détention », « 9 % pour chaque année de détention au-delà de la
     *         vingt-deuxième ». Version en vigueur au 21 février 2026.
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047288474
     */
    readonly socialLevyAllowance: HoldingPeriodAllowance;

    /**
     * Taxe sur les plus-values immobilières élevées. Elle s'ajoute à l'impôt sur le
     * revenu et aux prélèvements sociaux, et ne frappe pas les terrains à bâtir.
     * @source Code général des impôts, art. 1609 nonies G. Version en vigueur depuis
     *         le 1er janvier 2024, article non abrogé.
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048806252
     * @see https://bofip.impots.gouv.fr/bofip/8597-PGP.html/identifiant=BOI-RFPI-TPVIE-20-20180824
     */
    readonly surtax: {
      /**
       * Seuil de déclenchement : la taxe n'est due que si la plus-value imposable
       * est STRICTEMENT SUPÉRIEURE à ce montant.
       * @source Code général des impôts, art. 1609 nonies G, III — barème applicable
       *         aux plus-values imposables « supérieur[es] à 50 000 € ».
       */
      readonly thresholdCents: Cents;
      /**
       * Barème complet, dix tranches.
       * @source Code général des impôts, art. 1609 nonies G, III (tableau).
       */
      readonly brackets: readonly SurtaxBracket[];
    };

    /**
     * Exonération de la résidence principale.
     * @source Code général des impôts, art. 150 U, II, 1° — sont exonérés les immeubles
     *         « qui constituent la résidence principale du cédant au jour de la cession ».
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052866677
     */
    readonly mainResidenceExemption: {
      /**
       * Le texte n'exige pas d'occupation au jour de la cession lorsque le bien a été
       * quitté, à condition qu'il soit cédé dans un « délai normal » de vente. Ce délai
       * relève de la DOCTRINE, non de la loi : il n'est pas opposable comme un seuil et
       * s'apprécie au cas par cas (marché local, prix demandé, diligences du vendeur).
       * @source BOFiP, BOI-RFPI-PVI-10-40-10 § 190 — « dans un contexte économique
       *         normal, un délai d'une année constitue en principe le délai maximal ».
       * @see https://bofip.impots.gouv.fr/bofip/4307-PGP.html/identifiant=BOI-RFPI-PVI-10-40-10-20230627
       */
      readonly normalSaleDelayMonths: number;
    };

    /**
     * Forfaits de majoration du prix d'acquisition, utilisables à défaut de justificatifs.
     * @source Code général des impôts, art. 150 VB, II. Version en vigueur au 21 février 2026.
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053544785
     */
    readonly acquisitionPriceUplift: {
      /**
       * Frais d'acquisition. Forfait de plein droit, sans condition de durée de détention.
       * @source Code général des impôts, art. 150 VB, II, 3° — frais « que le cédant peut
       *         fixer forfaitairement à 7,5 % du prix d'acquisition ».
       */
      readonly acquisitionCostsFlatPct: number;
      /**
       * Travaux. Forfait subordonné à une durée de détention, et réservé aux immeubles BÂTIS.
       * @source Code général des impôts, art. 150 VB, II, 4° — « lorsque le contribuable,
       *         qui cède un immeuble bâti plus de cinq ans après son acquisition, n'est pas
       *         en état d'apporter la justification de ces dépenses, une majoration égale à
       *         15 % du prix d'acquisition est pratiquée ».
       */
      readonly worksFlatPct: number;
      /** Durée de détention à dépasser pour que le forfait travaux soit ouvert, en années. */
      readonly worksFlatMinHoldingYears: number;
    };

    /**
     * Abattement exceptionnel en zone tendue — EN VIGUEUR au millésime 2026, prorogé.
     *
     * ⚠️ Il est très étroitement conditionné : il suppose que l'ACQUÉREUR s'engage à
     * démolir ou réhabiliter pour construire du logement COLLECTIF. Ce n'est pas un
     * abattement de droit commun applicable à une revente ordinaire.
     *
     * @source Code général des impôts, art. 150 VE, modifié par la loi n° 2026-103 du
     *         19 février 2026 de finances pour 2026. Version en vigueur au 21 février 2026.
     * @see https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053544979
     * @source Arrêté du 5 juin 2025 déterminant les communes classées dans des zones
     *         se caractérisant par un déséquilibre important entre l'offre et la demande
     *         de logements, pour l'application des art. 150 U et 150 VE du CGI.
     * @see https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051698945
     *
     * PIÈGE DE LECTURE, résolu et consigné ici pour qu'il ne se repose pas. Le rescrit
     * BOI-RES-RFPI-000242, publié le 31 décembre 2025, borne la promesse au
     * 31 décembre 2025 et tolère les promesses signées jusqu'à la promulgation de la
     * loi de finances pour 2026. Il est ANTÉRIEUR à cette loi, qui a ensuite prorogé le
     * dispositif : le texte de l'article, en vigueur depuis le 21 février 2026, dit
     * « à compter du 1er janvier 2024 et au plus tard le 31 décembre 2027 ». C'est
     * cette date-là qui est retenue. La divergence est chronologique, pas réelle.
     * @see https://bofip.impots.gouv.fr/bofip/14916-PGP.html/identifiant=BOI-RES-RFPI-000242-20251231
     */
    readonly exceptionalZoneAllowance: {
      /** Cessions en zone tendue (art. 150 VE, I, A, 1°). */
      readonly tightZonePct: number;
      /** Cessions dans le périmètre d'une grande opération d'urbanisme ou d'une ORT (2°). */
      readonly urbanOperationPct: number;
      /**
       * Taux majoré, lorsque le cessionnaire s'engage à affecter au logement social,
       * en bail réel solidaire ou intermédiaire au moins la part de surface ci-dessous.
       */
      readonly socialHousingCommitmentPct: number;
      /** Part minimale de la surface totale du programme à affecter, en pourcentage. */
      readonly socialHousingMinShareOfProgramPct: number;
      /** Première date à laquelle la promesse peut avoir acquis date certaine. */
      readonly promiseFrom: string;
      /** Dernière date à laquelle la promesse peut avoir acquis date certaine. */
      readonly promiseTo: string;
      /**
       * La cession doit intervenir au plus tard le 31 décembre de la Nième année suivant
       * celle où la promesse a acquis date certaine.
       */
      readonly saleDeadlineYearsAfterPromise: number;
      /** Délai d'achèvement des constructions à compter de l'acquisition, en années. */
      readonly completionYears: number;
    };
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

  socialLevies: {
    patrimony: {
      csgPct: 10.6,
      crdsPct: 0.5,
      solidarityPct: 7.5,
      totalPct: 18.6,
    },
    realEstate: {
      csgPct: 9.2,
      crdsPct: 0.5,
      solidarityPct: 7.5,
      totalPct: 17.2,
    },
    eeaReducedPct: 7.5,
  },

  incomeTax: {
    marginalRatesPct: [0, 11, 30, 41, 45],
  },

  rentalIncome: {
    microFoncier: {
      grossIncomeThresholdCents: euros(15_000),
      allowancePct: 30,
    },
    microBic: {
      longTermThresholdCents: euros(83_600),
      longTermAllowancePct: 50,
      classifiedTourismThresholdCents: euros(83_600),
      classifiedTourismAllowancePct: 50,
      unclassifiedTourismThresholdCents: euros(15_000),
      unclassifiedTourismAllowancePct: 30,
      minimumAllowanceCents: euros(305),
    },
    shortTermSocialAffiliationThresholdCents: euros(23_000),
  },

  realEstateCapitalGains: {
    incomeTaxRatePct: 19,

    incomeTaxAllowance: {
      steps: [
        { fromYear: 6, toYear: 21, ratePctPerYear: 6 },
        { fromYear: 22, toYear: 22, ratePctPerYear: 4 },
      ],
      fullExemptionYear: 22,
    },

    socialLevyAllowance: {
      steps: [
        { fromYear: 6, toYear: 21, ratePctPerYear: 1.65 },
        { fromYear: 22, toYear: 22, ratePctPerYear: 1.6 },
        { fromYear: 23, toYear: 30, ratePctPerYear: 9 },
      ],
      fullExemptionYear: 30,
    },

    surtax: {
      thresholdCents: euros(50_000),
      brackets: [
        { fromCents: euros(50_001), toCents: euros(60_000), ratePct: 2, smoothingCoefficient: 1 / 20 },
        { fromCents: euros(60_001), toCents: euros(100_000), ratePct: 2, smoothingCoefficient: 0 },
        { fromCents: euros(100_001), toCents: euros(110_000), ratePct: 3, smoothingCoefficient: 1 / 10 },
        { fromCents: euros(110_001), toCents: euros(150_000), ratePct: 3, smoothingCoefficient: 0 },
        { fromCents: euros(150_001), toCents: euros(160_000), ratePct: 4, smoothingCoefficient: 15 / 100 },
        { fromCents: euros(160_001), toCents: euros(200_000), ratePct: 4, smoothingCoefficient: 0 },
        { fromCents: euros(200_001), toCents: euros(210_000), ratePct: 5, smoothingCoefficient: 20 / 100 },
        { fromCents: euros(210_001), toCents: euros(250_000), ratePct: 5, smoothingCoefficient: 0 },
        { fromCents: euros(250_001), toCents: euros(260_000), ratePct: 6, smoothingCoefficient: 25 / 100 },
        { fromCents: euros(260_001), toCents: null, ratePct: 6, smoothingCoefficient: 0 },
      ],
    },

    mainResidenceExemption: {
      normalSaleDelayMonths: 12,
    },

    acquisitionPriceUplift: {
      acquisitionCostsFlatPct: 7.5,
      worksFlatPct: 15,
      worksFlatMinHoldingYears: 5,
    },

    exceptionalZoneAllowance: {
      tightZonePct: 60,
      urbanOperationPct: 75,
      socialHousingCommitmentPct: 85,
      socialHousingMinShareOfProgramPct: 50,
      promiseFrom: "2024-01-01",
      promiseTo: "2027-12-31",
      saleDeadlineYearsAfterPromise: 2,
      completionYears: 4,
    },
  },
};
