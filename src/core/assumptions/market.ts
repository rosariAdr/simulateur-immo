/**
 * HYPOTHÈSES DE MARCHÉ — `FIS-005`
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═══
 *
 * `fiscal/params.ts` contient des valeurs **que la loi fixe**. Chacune porte un
 * `@source` renvoyant à un article, et sa mise à jour est un fait daté : la loi
 * de finances change, on change la valeur.
 *
 * Les coûts de garantie ne sont pas de cette nature. **Aucun texte ne les fixe.**
 * Un organisme de caution publie une grille commerciale, progressive, qu'il
 * révise quand il veut ; un notaire facture une inscription hypothécaire selon un
 * barème qui mêle émoluments, taxe de publicité foncière et débours. Ce sont des
 * ordres de grandeur observés, pas des règles.
 *
 * Les avoir logés dans `FiscalParams` créait trois problèmes, dont un seul aurait
 * suffi :
 *
 * 1. **Rien ne les distinguait du reste.** Un lecteur de `params.ts` ne pouvait
 *    pas savoir, sans lire les commentaires, quelles valeurs opposer à une banque
 *    et lesquelles ne sont qu'une estimation de notre part.
 * 2. **Leur `TODO_VERIFY` était insoluble.** Vérifier « à la source » suppose une
 *    source qui fasse autorité. Il n'y en a pas : il n'y a que des grilles
 *    commerciales, divergentes et datées du jour où on les a lues.
 * 3. **Elles n'auraient jamais dû être immuables.** Une valeur négociable a
 *    vocation à devenir un paramètre que l'utilisateur ajuste. Enfermée dans le
 *    millésime fiscal, elle ne le pouvait pas.
 *
 * ═══ CE QUE CE FICHIER PROMET, ET CE QU'IL NE PROMET PAS ═══
 *
 * Il ne promet pas l'exactitude. Il promet que l'imprécision est **déclarée** :
 * chaque valeur porte son intervalle observé et la manière dont elle a été
 * obtenue. Une estimation qui s'annonce comme telle vaut mieux qu'une estimation
 * déguisée en règle.
 *
 * Voir `docs/ADR.md`, ADR-008.
 */

/**
 * Le degré de confiance d'une hypothèse. Il n'est pas décoratif : l'interface
 * doit pouvoir dire à l'utilisateur ce qu'elle sait et ce qu'elle suppose.
 */
export type Fiabilite =
  /** Relevé sur des grilles publiées, plusieurs établissements concordants. */
  | "observee"
  /** Ordre de grandeur communément admis, non recoupé sur des sources primaires. */
  | "estimee";

export interface HypotheseChiffree {
  readonly valeur: number;
  /** Intervalle observé sur le marché, bornes comprises. */
  readonly intervalle: readonly [number, number];
  readonly fiabilite: Fiabilite;
  /** D'où vient le chiffre, en une phrase lisible par un non-technicien. */
  readonly provenance: string;
}

export interface GuaranteeAssumptions {
  /** Commission + contribution au fonds mutuel, en % du capital garanti. */
  readonly suretyshipCostPct: HypotheseChiffree;
  /** Part de la contribution restituée au terme, en % du coût. */
  readonly suretyshipRefundPct: HypotheseChiffree;
  /** Inscription hypothécaire, en % du capital garanti. */
  readonly mortgageCostPct: HypotheseChiffree;
  /** Mainlevée en cas de revente avant terme, en % du prix du bien. */
  readonly mortgageReleasePct: HypotheseChiffree;
  /** Frais de nantissement, en % du capital garanti. */
  readonly pledgeCostPct: HypotheseChiffree;
}

/**
 * Une fourchette observée, sans valeur centrale.
 *
 * Certaines hypothèses n'ont pas de « bonne » valeur, seulement un intervalle où
 * l'on trouve les offres. Leur donner une valeur unique reviendrait à inventer
 * une moyenne que personne n'a mesurée.
 */
export interface FourchetteObservee {
  readonly intervalle: readonly [number, number];
  readonly fiabilite: Fiabilite;
  readonly provenance: string;
}

export interface InsuranceAssumptions {
  /** Contrat de groupe de la banque, en % du capital initial et par an. */
  readonly groupRatePct: FourchetteObservee;
  /** Délégation d'assurance, même assiette. */
  readonly delegationRatePct: FourchetteObservee;
}

export interface AcquisitionAssumptions {
  /** Frais d'acquisition totaux dans l'ancien, en % du prix. */
  readonly totalFeesOldPct: FourchetteObservee;
  /** Idem dans le neuf, où il n'y a pas de droits de mutation. */
  readonly totalFeesNewPct: FourchetteObservee;
}

export interface MarketAssumptions {
  /** Date du relevé, et non millésime légal : ces valeurs n'ont pas d'exercice. */
  readonly releve: string;
  readonly guarantee: GuaranteeAssumptions;
  readonly insurance: InsuranceAssumptions;
  readonly acquisition: AcquisitionAssumptions;
}

/**
 * Valeurs en vigueur dans le simulateur.
 *
 * Elles reprennent, sans les modifier, celles qui vivaient dans
 * `fiscal/params.ts` jusqu'au 22 août 2026. Le déplacement ne les corrige pas —
 * il les qualifie. Les recouper sur des grilles publiées reste à faire, et c'est
 * désormais un travail borné : il porte sur ce fichier, et sur lui seul.
 */
export const MARKET_2026: MarketAssumptions = {
  releve: "2026-08",

  guarantee: {
    suretyshipCostPct: {
      valeur: 1.25,
      intervalle: [1.0, 1.5],
      fiabilite: "estimee",
      provenance:
        "Ordre de grandeur communément retenu pour un organisme de caution. Les grilles " +
        "réelles sont progressives et dépendent du montant emprunté ; ce taux unique est " +
        "une simplification.",
    },
    suretyshipRefundPct: {
      valeur: 55,
      intervalle: [0, 75],
      fiabilite: "estimee",
      provenance:
        "Part de la contribution au fonds mutuel restituée au terme. Elle varie fortement " +
        "selon l'organisme et l'absence d'incident, et peut être nulle.",
    },
    mortgageCostPct: {
      valeur: 1.5,
      intervalle: [1.2, 2.0],
      fiabilite: "estimee",
      provenance:
        "Inscription hypothécaire : émoluments du notaire, taxe de publicité foncière et " +
        "débours réunis. La part taxée est réglementée, l'ensemble ne l'est pas.",
    },
    mortgageReleasePct: {
      valeur: 0.4,
      intervalle: [0.3, 0.7],
      fiabilite: "estimee",
      provenance:
        "Mainlevée d'hypothèque en cas de revente avant le terme du prêt. Assise sur le " +
        "prix du bien, non sur le capital restant dû.",
    },
    pledgeCostPct: {
      valeur: 0.3,
      intervalle: [0.1, 0.5],
      fiabilite: "estimee",
      provenance:
        "Nantissement d'un contrat d'épargne. Ni acte notarié ni fonds mutuel à alimenter, " +
        "d'où un coût d'entrée nettement inférieur aux deux autres garanties.",
    },
  },

  insurance: {
    groupRatePct: {
      intervalle: [0.3, 0.42],
      fiabilite: "estimee",
      provenance:
        "Contrat de groupe d'une banque, taux annuel sur capital initial. ⚠️ La borne " +
        "basse est contredite par un cas réel : l'exemple représentatif publié par la " +
        "Société Générale donne 0,26 % pour un emprunteur de 35 ans. Voir ENG-008, et le " +
        "ticket FIS-006 qui porte le recoupement.",
    },
    delegationRatePct: {
      intervalle: [0.1, 0.2],
      fiabilite: "estimee",
      provenance:
        "Délégation d'assurance, même assiette. L'écart avec le contrat de groupe est ce " +
        "que la loi Lemoine permet d'aller chercher ; il varie fortement avec l'âge et " +
        "l'état de santé, que ces bornes n'expriment pas.",
    },
  },

  acquisition: {
    totalFeesOldPct: {
      intervalle: [7, 8.5],
      fiabilite: "estimee",
      provenance:
        "Frais d'acquisition dans l'ancien, tous postes réunis. Leur plus grosse part — les " +
        "droits de mutation — est réglementée et vit dans `fiscal/params.ts` ; le total, lui, " +
        "dépend aussi des émoluments négociés et des débours, et reste une estimation.",
    },
    totalFeesNewPct: {
      intervalle: [2, 3],
      fiabilite: "estimee",
      provenance:
        "Frais d'acquisition dans le neuf, où la taxe de publicité foncière remplace les " +
        "droits de mutation. Même réserve : la part réglementée est connue, le total ne l'est pas.",
    },
  },
};

/** Raccourci de lecture : la valeur seule, quand le contexte suffit. */
export const valeur = (h: HypotheseChiffree): number => h.valeur;
