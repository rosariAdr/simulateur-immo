/**
 * LES CHIFFRES DE LA FICHE « COMPRENDRE LE CRÉDIT » — `CNT-002`
 *
 * Une fiche pédagogique est un texte, et un texte ment plus longtemps qu'un
 * calcul : personne ne relit un paragraphe à la prochaine loi de finances. Ce
 * module existe pour que la fiche n'ait aucun chiffre à écrire.
 *
 * ── DEUX FAMILLES DE CHIFFRES, DEUX PROVENANCES ───────────────────────────
 *
 * **Les valeurs réglementaires** — plafond d'endettement, durée maximale, seuils
 * d'usure, seuils de la loi Lemoine — sont lues dans `src/core/fiscal/params.ts`,
 * datées et sourcées là-bas. Aucune n'est recopiée ici.
 *
 * **Les chiffres d'exemple** — mensualité, part d'intérêts, coût de l'assurance,
 * prix des garanties — sont *calculés* par le moteur sur le scénario par défaut
 * du simulateur, celui qu'un lecteur voit en ouvrant `/credit` sans rien saisir.
 * La fiche peut donc dire « reproduisez-le » sans mentir, et le test de bout en
 * bout vérifie que la mensualité annoncée par la fiche est bien celle que le
 * module affiche.
 *
 * ── CE QUE CE MODULE NE FAIT PAS ──────────────────────────────────────────
 *
 * Il ne recommande rien, et ne formule aucun conseil (`docs/CONTEXT.md` §8).
 * `src/content/__tests__/fiche-credit.test.ts` échoue si une tournure
 * prescriptive s'y glisse, et son pendant de bout en bout balaie la page rendue.
 */

import { usuryThreshold } from "@/core/credit/constraints";
import {
  buildCreditPlan,
  guaranteeCost,
  type CreditPlanInput,
  type GuaranteeKind,
} from "@/core/credit/plan";
import { PARAMS_2026 } from "@/core/fiscal/params";
// Les fourchettes de marché ne sont pas des valeurs de loi et ne vivent donc pas
// dans le millésime fiscal. Voir ADR-008, FIS-005.
import { MARKET_2026 } from "@/core/assumptions/market";
import { euros, type Cents } from "@/core/money";
import type { Famille } from "@/components/ui/taxonomie";

/** Dernière révision **éditoriale** de la fiche. Les barèmes portent leur propre date. */
export const MAJ_FICHE = "22 août 2026";

/** Le millésime sur lequel la fiche raisonne. Un seul, et il s'affiche. */
export const PARAMS = PARAMS_2026;

/* ── Le scénario d'exemple ────────────────────────────────────────────────── */

/**
 * Exactement le scénario que `/credit` ouvre par défaut.
 *
 * ── POURQUOI IL EST RÉÉCRIT ICI PLUTÔT QU'IMPORTÉ ─────────────────────────
 *
 * `src/lib/scenario.ts` porte les défauts du simulateur, mais il importe `nuqs`
 * au premier niveau : l'importer depuis un composant serveur fait échouer la
 * collecte des données de page à la compilation. La fiche est prérendue, elle ne
 * lit aucune URL, et n'a donc rien à faire d'un analyseur de paramètres.
 *
 * La cohérence n'est pas laissée à la vigilance : `fiche-credit.test.ts` compare
 * cette entrée à `versEntreeMoteur(DEFAUTS)` et rougit si les deux divergent.
 * L'égalité est aussi vérifiée de bout en bout — la mensualité annoncée par la
 * fiche doit être celle que `/credit` affiche sans qu'on y touche.
 */
export const ENTREE_REFERENCE: CreditPlanInput = {
  loans: [
    {
      id: "principal",
      label: "Prêt principal",
      principal: euros(180_000),
      annualRatePct: 3.2,
      months: 240,
    },
  ],
  insurance: { annualRatePct: 0.3, basis: "initial", coveragePct: 100 },
  guarantee: "suretyship",
  arrangementFee: euros(900),
  propertyPrice: euros(205_000),
  netMonthlyIncome: euros(3_800),
  otherDebtService: euros(0),
};

/** Le même prêt, assurance assise sur le capital restant dû. */
const ENTREE_ASSURANCE_DEGRESSIVE: CreditPlanInput = {
  ...ENTREE_REFERENCE,
  insurance: { ...ENTREE_REFERENCE.insurance, basis: "outstanding" },
};

export const PLAN = buildCreditPlan(ENTREE_REFERENCE, PARAMS);

const PLAN_ASSURANCE_DEGRESSIVE = buildCreditPlan(ENTREE_ASSURANCE_DEGRESSIVE, PARAMS);

/**
 * Ce que la fiche a besoin de dire du scénario, dérivé de l'entrée du moteur.
 *
 * Rien n'est saisi deux fois : l'apport est ce que le prix laisse au-delà du
 * capital emprunté, la durée est celle du prêt. Un exemple modifié se modifie
 * en un seul endroit.
 */
export const EXEMPLE = {
  prix: ENTREE_REFERENCE.propertyPrice,
  apport: ENTREE_REFERENCE.propertyPrice - PLAN.totalPrincipal,
  capitalEmprunte: PLAN.totalPrincipal,
  tauxPct: ENTREE_REFERENCE.loans[0]?.annualRatePct ?? 0,
  dureeMois: ENTREE_REFERENCE.loans[0]?.months ?? 0,
  fraisDossier: ENTREE_REFERENCE.arrangementFee,
  revenu: ENTREE_REFERENCE.netMonthlyIncome,
} as const;

/* ── Comment se forme une mensualité ──────────────────────────────────────── */

const premiereAnnee = PLAN.annual[0];
const derniereAnnee = PLAN.annual[PLAN.annual.length - 1];

/** Une année d'échéancier, réduite à ce que la fiche en montre. */
export interface AnneeLue {
  readonly rang: number;
  readonly libelle: string;
  readonly interets: Cents;
  readonly capital: Cents;
  /** Part d'intérêts dans le total intérêts + capital de l'année, en pourcentage. */
  readonly partInterets: number;
}

const lireAnnee = (
  rang: number,
  libelle: string,
  ligne: { readonly interest: Cents; readonly principal: Cents } | undefined,
): AnneeLue => {
  const interets = ligne?.interest ?? 0;
  const capital = ligne?.principal ?? 0;
  const total = interets + capital;
  return {
    rang,
    libelle,
    interets,
    capital,
    partInterets: total > 0 ? (interets / total) * 100 : 0,
  };
};

export const PREMIERE_ANNEE = lireAnnee(1, "La première année", premiereAnnee);
export const DERNIERE_ANNEE = lireAnnee(
  PLAN.annual.length,
  "La dernière année",
  derniereAnnee,
);

/**
 * Combien de fois la première année pèse-t-elle plus d'intérêts que la dernière,
 * à proportion. C'est l'antériorité des intérêts, chiffrée.
 */
export const RAPPORT_ANTERIORITE =
  DERNIERE_ANNEE.partInterets > 0
    ? PREMIERE_ANNEE.partInterets / DERNIERE_ANNEE.partInterets
    : Number.POSITIVE_INFINITY;

/**
 * Le mois où la part de capital rattrape les intérêts.
 *
 * Sur ce scénario il vaut 1 : la part de capital l'emporte dès la première
 * échéance, ce qui contredit l'idée reçue sans rien retirer à l'antériorité
 * ci-dessus. Les deux affirmations sont distinctes, et les confondre est
 * l'erreur la plus répandue sur le sujet — d'où le fait qu'elle soit *calculée*
 * plutôt qu'affirmée.
 */
export const MOIS_DE_BASCULE = PLAN.crossoverMonth;

/* ── L'assurance emprunteur ───────────────────────────────────────────────── */

export const ASSURANCE = {
  /** Coût total, prime assise sur le capital initial. */
  surCapitalInitial: PLAN.totalInsurance,
  /** Coût total, prime assise sur le capital restant dû, à taux affiché identique. */
  surCapitalRestantDu: PLAN_ASSURANCE_DEGRESSIVE.totalInsurance,
  /** Écart entre les deux, en pourcentage du coût sur capital initial. */
  ecartPct:
    PLAN.totalInsurance > 0
      ? ((PLAN.totalInsurance - PLAN_ASSURANCE_DEGRESSIVE.totalInsurance) / PLAN.totalInsurance) *
        100
      : 0,
  /** Taux affiché, identique dans les deux cas — c'est tout le propos. */
  tauxPct: ENTREE_REFERENCE.insurance.annualRatePct,
  taeaPct: PLAN.taeaPct,
  /** Fourchettes observées, non réglementaires : chacune porte sa provenance. */
  fourchetteGroupePct: MARKET_2026.insurance.groupRatePct.intervalle,
  fourchetteDelegationPct: MARKET_2026.insurance.delegationRatePct.intervalle,
  /** Loi Lemoine : seuils de suppression du questionnaire de santé. */
  lemoineSeuil: PARAMS.borrowerInsurance.lemoineNoHealthFormThreshold,
  lemoineAgeAuTerme: PARAMS.borrowerInsurance.lemoineMaxAgeAtTerm,
} as const;

/* ── Les trois garanties ──────────────────────────────────────────────────── */

export interface GarantieComparee {
  readonly cle: GuaranteeKind;
  readonly nom: string;
  /** Ce qu'elle coûte à la signature. */
  readonly cout: Cents;
  /** Ce qu'elle restitue au terme du prêt. Nul hors caution. */
  readonly restitue: Cents;
  /** Ce qu'elle coûte en plus si le bien est revendu avant le terme. Nul hors hypothèque. */
  readonly mainlevee: Cents;
  /** Coût net si le prêt va jusqu'à son terme. */
  readonly netAuTerme: Cents;
  /** Coût net en cas de revente avant le terme. */
  readonly netEnCasDeRevente: Cents;
}

const NOMS_GARANTIE: Readonly<Record<GuaranteeKind, string>> = {
  suretyship: "Caution",
  mortgage: "Hypothèque",
  pledge: "Nantissement",
};

const comparer = (cle: GuaranteeKind): GarantieComparee => {
  const g = guaranteeCost(cle, PLAN.totalPrincipal, ENTREE_REFERENCE.propertyPrice, MARKET_2026);
  return {
    cle,
    nom: NOMS_GARANTIE[cle],
    cout: g.cost,
    restitue: g.refundAtTerm,
    mainlevee: g.releaseCostOnEarlySale,
    netAuTerme: g.cost - g.refundAtTerm,
    // La restitution du fonds mutuel n'intervient qu'au terme : une revente
    // anticipée la laisse de côté, et c'est là que l'arbitrage se joue.
    netEnCasDeRevente: g.cost + g.releaseCostOnEarlySale,
  };
};

export const GARANTIES: readonly GarantieComparee[] = [
  comparer("suretyship"),
  comparer("mortgage"),
  comparer("pledge"),
];

/* ── Les deux plafonds ────────────────────────────────────────────────────── */

export interface TrancheUsure {
  readonly libelle: string;
  readonly seuilPct: number;
}

/**
 * Les seuils, lus par la fonction du moteur plutôt que dans la table.
 *
 * Passer par `usuryThreshold` fait porter au moteur la correspondance entre une
 * durée et sa tranche : si le découpage change, la fiche suit sans être rouverte.
 */
export const TRANCHES_USURE: readonly TrancheUsure[] = [
  { libelle: "moins de 10 ans", seuilPct: usuryThreshold("fixed", 108, PARAMS) },
  { libelle: "de 10 ans à moins de 20 ans", seuilPct: usuryThreshold("fixed", 180, PARAMS) },
  { libelle: "20 ans et plus", seuilPct: usuryThreshold("fixed", 300, PARAMS) },
];

export const USURE = {
  trimestre: PARAMS.usury.quarter,
  du: PARAMS.usury.from,
  au: PARAMS.usury.to,
  /** Le seuil qui s'applique au scénario d'exemple, et la marge qu'il lui laisse. */
  seuilDuScenarioPct: PLAN.usury.threshold,
  taegDuScenarioPct: PLAN.aprPct,
  margePoints: PLAN.usury.headroomPoints,
} as const;

export const EFFORT = {
  plafondPct: PARAMS.hcsf.maxDebtRatioPct,
  dureeMaxMois: PARAMS.hcsf.maxDurationMonths,
  dureeDerogatoireMois: PARAMS.hcsf.maxDurationDerogatoryMonths,
  partTravauxPct: PARAMS.hcsf.derogatoryWorksSharePct,
  margeDerogationPct: PARAMS.hcsf.flexibilityMarginPct,
  /** Le taux d'effort du scénario d'exemple, assurance comprise. */
  duScenarioPct: PLAN.hcsf.debtRatioPct,
} as const;

/* ── L'appartenance des notions aux trois familles ────────────────────────── */

/**
 * De quelle famille relève chaque notion de la fiche.
 *
 * Les libellés ne sont pas réécrits ici : ils viennent de
 * `src/components/ui/taxonomie.ts`, la même source que les champs de saisie et
 * que la page d'accueil. Une famille renommée là-bas se renomme partout.
 *
 * Une notion peut relever de deux familles à la fois, et c'est fréquent : la
 * mensualité se forme à partir d'un taux qui se négocie et d'une durée qui
 * dépend du projet. Les aplatir sur une seule famille serait plus simple et
 * faux.
 */
export type SectionFiche = "mensualite" | "taeg" | "assurance" | "garantie" | "plafonds";

export const FAMILLES_PAR_SECTION: Readonly<Record<SectionFiche, readonly Famille[]>> = {
  mensualite: ["negociable", "contraint"],
  taeg: ["reglementaire", "negociable"],
  assurance: ["negociable"],
  garantie: ["negociable"],
  plafonds: ["reglementaire"],
};
