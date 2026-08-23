/**
 * LE SCÉNARIO DE SORTIE VIT DANS L'URL — `UI-007`
 *
 * Prolongement de `src/lib/comparaison.ts`, et rien d'autre. Les dix-sept
 * paramètres du niveau simple restent définis là-bas, sous les mêmes clés
 * courtes ; ce fichier n'en ajoute que **sept**, ceux dont le niveau approfondi
 * a besoin pour chiffrer une sortie.
 *
 * Même discipline qu'en face : aucun parseur `nuqs` au premier niveau, donc la
 * page serveur de `/comparaison/patrimoine` peut lire `DEFAUTS_SORTIE` pour sa
 * description sans entraîner la couche cliente derrière elle. Les parseurs
 * vivent dans `src/components/patrimoine/usePatrimoine.ts`.
 *
 * ═══ LES DEUX HYPOTHÈSES QUI N'ONT PAS DE VALEUR CENTRALE ═══
 *
 * `src/core/assumptions/market.ts` distingue deux formes. Une `HypotheseChiffree`
 * porte une **valeur** et son intervalle : la commission d'agence en est une, les
 * barèmes sont affichés en vitrine. Une `FourchetteObservee` ne porte **que** son
 * intervalle, parce que publier un point central reviendrait à publier une
 * prévision de marché — ce que `docs/CONTEXT.md` §8 exclut.
 *
 * Les deux hypothèses qui décident de la réponse de cet écran sont précisément
 * de la seconde espèce : l'appréciation du bien et le rendement du portefeuille.
 * Le simulateur **refuse** de leur donner un point.
 *
 * Il faut pourtant bien ouvrir sur quelque chose. Le point d'ouverture retenu
 * est le **milieu de l'intervalle observé**, et il est calculé ici, dans
 * l'interface, jamais dans `market.ts` : c'est une commodité d'écran, elle
 * n'acquiert aucune autorité en étant écrite, et le bloc de limite le dit en
 * toutes lettres à côté du contrôle. Voir ADR-020.
 *
 * ═══ LE RENDEMENT COUVRE LES DEUX SUPPORTS, ET N'EN CHOISIT AUCUN ═══
 *
 * `MARKET_2026.rendements` relève deux fourchettes : un support à capital
 * garanti et un portefeuille d'actions diversifié. Un sélecteur aurait obligé
 * l'écran à en désigner un par défaut, c'est-à-dire à décider pour le lecteur ce
 * que fait son adversaire. L'intervalle de référence affiché est donc l'**union**
 * des deux, les deux sont nommés à côté, et le curseur est libre.
 */

import { MARKET_2026 } from "@/core/assumptions/market";
import {
  chiffrerCession,
  situationDeCession,
  type CessionChiffree,
  type EntreeCession,
  type ModeMajoration,
  type RegimeDeCession,
  type Reserve,
} from "@/core/compare/cession";
import {
  motifExclusionForfaitFraisAcquisition,
  motifExclusionForfaitTravaux,
} from "@/core/compare/plus-value";
import {
  construirePortefeuille,
  type Portefeuille,
} from "@/core/compare/portefeuille";
import type { ComparaisonDetention } from "@/core/compare/types";
import type { CreditPlan } from "@/core/credit/plan";
import { PARAMS_2026 } from "@/core/fiscal/params";
import { euros, type Cents } from "@/core/money";
import { assainir, type Comparaison } from "@/lib/comparaison";

/* ── Les deux intervalles qui gouvernent l'écran ──────────────────────────── */

const V = MARKET_2026.vente;
const R = MARKET_2026.rendements;

/** Intervalle d'appréciation observé, tel quel. */
export const INTERVALLE_APPRECIATION: readonly [number, number] =
  V.appreciationAnnuellePct.intervalle;

/**
 * Union des deux fourchettes de rendement relevées.
 *
 * Calculée, jamais recopiée : une troisième paire de bornes écrite en dur ici
 * cesserait de suivre `market.ts` le jour où l'une des deux bouge.
 */
export const INTERVALLE_RENDEMENT: readonly [number, number] = [
  Math.min(R.sansRisque.intervalle[0], R.actionsDiversifiees.intervalle[0]),
  Math.max(R.sansRisque.intervalle[1], R.actionsDiversifiees.intervalle[1]),
];

/**
 * Milieu d'un intervalle observé.
 *
 * ⚠️ Ce n'est pas une valeur centrale, et la distinction n'est pas rhétorique :
 * une valeur centrale prétend décrire le marché, ce milieu-ci ne décrit que
 * l'intervalle. Il sert de point d'ouverture parce qu'il en faut un, et l'écran
 * annonce qu'il n'a aucune autorité.
 */
export const milieu = ([bas, haut]: readonly [number, number]): number =>
  Math.round(((bas + haut) / 2) * 100) / 100;

/* ── Le scénario de sortie ────────────────────────────────────────────────── */

/** Les deux régimes que le moteur sait chiffrer. Un troisième n'existe pas. */
export const REGIMES = ["residence-principale", "imposable"] as const;
export type RegimeSortie = (typeof REGIMES)[number];

/** Réel avec justificatifs, ou forfait légal. Le forfait n'est pas toujours ouvert. */
export const MODES = ["reel", "forfait"] as const;
export type ModeSaisi = (typeof MODES)[number];

export const DEFAUTS_SORTIE = {
  /**
   * Appréciation annuelle du bien, en %. Milieu de l'intervalle observé, faute
   * de valeur centrale publiée. C'est l'hypothèse la plus sensible de l'écran.
   */
  appreciation: milieu(INTERVALLE_APPRECIATION),
  /** Rendement annuel net d'impôt du portefeuille, en %. Milieu de l'union. */
  rendement: milieu(INTERVALLE_RENDEMENT),
  /** Commission d'agence à la revente. Celle-ci, elle, a une valeur observée. */
  commissionAgence: V.commissionAgencePct.valeur,
  /** Régime de la cession. La résidence principale est le cas de ce module. */
  regime: "residence-principale" as RegimeSortie,
  /** Majoration des frais d'acquisition : forfait de 7,5 %, ou montant réel. */
  modeFrais: "forfait" as ModeSaisi,
  fraisAcquisitionReels: 0,
  /**
   * Majoration des travaux. **Réel par défaut, à zéro**, et ce n'est pas une
   * timidité : le forfait de 15 % suppose une détention de plus de cinq ans, et
   * un écran qui balaie l'horizon depuis l'année 1 ne peut pas l'ouvrir partout.
   */
  modeTravaux: "reel" as ModeSaisi,
  travauxReels: 0,
} as const;

export type Sortie = {
  appreciation: number;
  rendement: number;
  commissionAgence: number;
  regime: RegimeSortie;
  modeFrais: ModeSaisi;
  fraisAcquisitionReels: number;
  modeTravaux: ModeSaisi;
  travauxReels: number;
};

/**
 * Clés courtes. Aucune ne collisionne avec les dix-sept de `CLES_URL` : `ap`
 * désigne déjà l'apport, d'où `av` pour l'appréciation de la valeur.
 */
export const CLES_SORTIE = {
  appreciation: "av",
  rendement: "rd",
  commissionAgence: "ca",
  regime: "rg",
  modeFrais: "mf",
  fraisAcquisitionReels: "fr",
  modeTravaux: "mt",
  travauxReels: "tr",
} as const satisfies Readonly<Record<keyof Sortie, string>>;

const BORNES_SORTIE = {
  appreciation: { min: -10, max: 10 },
  rendement: { min: -10, max: 15 },
  commissionAgence: { min: 0, max: 15 },
  fraisAcquisitionReels: { min: 0, max: 5_000_000 },
  travauxReels: { min: 0, max: 5_000_000 },
} as const;

const borne = (v: number, min: number, max: number): number =>
  Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min;

/**
 * Ramène un scénario de sortie dans ses bornes, sans jamais échouer.
 *
 * Une URL est du texte que n'importe qui peut écrire, et `-100 %` d'appréciation
 * annuelle sur trente ans n'est pas une hypothèse : c'est une entrée que le
 * moteur refuserait. Les bornes sont là pour ne pas la lui présenter.
 */
export function assainirSortie(brut: Sortie): Sortie {
  return {
    appreciation: borne(brut.appreciation, BORNES_SORTIE.appreciation.min, BORNES_SORTIE.appreciation.max),
    rendement: borne(brut.rendement, BORNES_SORTIE.rendement.min, BORNES_SORTIE.rendement.max),
    commissionAgence: borne(
      brut.commissionAgence,
      BORNES_SORTIE.commissionAgence.min,
      BORNES_SORTIE.commissionAgence.max,
    ),
    regime: REGIMES.includes(brut.regime) ? brut.regime : DEFAUTS_SORTIE.regime,
    modeFrais: MODES.includes(brut.modeFrais) ? brut.modeFrais : DEFAUTS_SORTIE.modeFrais,
    fraisAcquisitionReels: Math.round(
      borne(
        brut.fraisAcquisitionReels,
        BORNES_SORTIE.fraisAcquisitionReels.min,
        BORNES_SORTIE.fraisAcquisitionReels.max,
      ),
    ),
    modeTravaux: MODES.includes(brut.modeTravaux) ? brut.modeTravaux : DEFAUTS_SORTIE.modeTravaux,
    travauxReels: Math.round(
      borne(brut.travauxReels, BORNES_SORTIE.travauxReels.min, BORNES_SORTIE.travauxReels.max),
    ),
  };
}

/* ── Passage au moteur ────────────────────────────────────────────────────── */

const majoration = (mode: ModeSaisi, montant: number): ModeMajoration =>
  mode === "reel" ? { mode: "reel", montant: euros(montant) } : { mode: "forfait" };

/**
 * Le régime de cession, tel que `cession.ts` l'attend.
 *
 * Trois grandeurs y sont **fixées** et non saisies, et l'écran le déclare dans
 * ses limites plutôt que d'ouvrir des champs qu'il ne saurait pas expliquer :
 * la nature du bien — un immeuble bâti —, la qualité du cédant — une personne
 * physique — et le régime social — une affiliation en France. Le moteur sait
 * traiter les autres cas ; cet écran ne les propose pas.
 */
function regimeDeCession(s: Sortie): RegimeDeCession {
  if (s.regime === "residence-principale") return { nature: "residence-principale" };
  return {
    nature: "imposable",
    natureDuBien: "immeuble-bati",
    qualiteDuCedant: "personne-physique",
    regimeSocial: "affilie-france",
    fraisAcquisition: majoration(s.modeFrais, s.fraisAcquisitionReels),
    travaux: majoration(s.modeTravaux, s.travauxReels),
  };
}

/**
 * Décrit la cession du bien à l'issue de `horizonMois`.
 *
 * `tauxMoyenAnnuelPct` est le taux nominal du prêt, et ce n'est pas une
 * approximation : le financement de ce module n'a qu'une ligne, donc le taux
 * moyen du prêt **est** son taux nominal. Le champ est obligatoire côté moteur
 * parce qu'il plafonne l'indemnité de remboursement anticipé (art. R313-25) ;
 * une valeur par défaut à zéro l'annulerait en silence.
 */
export function versEntreeCession(
  brut: Comparaison,
  brutSortie: Sortie,
  plan: CreditPlan,
  horizonMois: number,
): EntreeCession {
  const s = assainir(brut);
  const sortie = assainirSortie(brutSortie);
  return {
    vente: {
      horizonMois,
      valeurInitiale: euros(s.prix),
      appreciationAnnuellePct: sortie.appreciation,
      commissionAgencePct: sortie.commissionAgence,
      credit: { plan, tauxMoyenAnnuelPct: s.taux },
    },
    regime: regimeDeCession(sortie),
  };
}

/* ── Le refus du forfait, demandé AVANT de calculer ───────────────────────── */

/**
 * Pourquoi cette cession-là n'est pas chiffrable, ou `null` si elle l'est.
 *
 * ⚠️ **C'est la fonction qui empêche cet écran de tomber.** `chiffrerCession`
 * lève `ForfaitHorsChampError` quand un forfait de majoration est demandé hors
 * de son champ — le forfait travaux suppose une détention de **plus** de cinq
 * ans —, et un écran qui balaie l'horizon depuis l'année 1 rencontre ce refus
 * cinq fois sur trente.
 *
 * ADR-013 a tranché contre la retombée silencieuse : le refus ne se rattrape
 * pas, il s'anticipe. `situationDeCession` est exportée exactement pour ça, et
 * les deux fonctions `motifExclusion…` rendent le motif en français, prêt à être
 * affiché. Aucun `try` dans ce fichier, et aucun ailleurs : une année non
 * chiffrable n'est pas chiffrée, et l'écran écrit pourquoi.
 */
export function motifNonChiffrable(entree: EntreeCession): string | null {
  const situation = situationDeCession(entree);
  if (situation === null) return null;
  if (entree.regime.nature !== "imposable") return null;

  if (entree.regime.travaux.mode === "forfait") {
    const motif = motifExclusionForfaitTravaux(situation, PARAMS_2026);
    if (motif !== null) return motif;
  }
  if (entree.regime.fraisAcquisition.mode === "forfait") {
    const motif = motifExclusionForfaitFraisAcquisition(situation);
    if (motif !== null) return motif;
  }
  return null;
}

/* ── Sortie de l'analyse ──────────────────────────────────────────────────── */

export interface AnneePatrimoine {
  readonly annee: number;
  /**
   * Décompte complet de la vente à la fin de cette année. `null` quand la
   * description choisie n'est pas chiffrable à cette durée de détention.
   */
  readonly cession: CessionChiffree | null;
  /** Produit net de la vente. **Peut être négatif** : vendre tôt coûte. */
  readonly proprietaire: Cents | null;
  /** Le même produit net aux deux bornes de l'intervalle d'appréciation. */
  readonly proprietaireIntervalle: readonly [Cents, Cents] | null;
  /** Valeur du portefeuille du locataire de référence, au point retenu. */
  readonly locataire: Cents;
  /** La même valeur aux deux bornes de l'intervalle de rendement. */
  readonly locataireIntervalle: readonly [Cents, Cents];
  /** `proprietaire − locataire`. `null` quand l'année n'est pas chiffrable. */
  readonly ecart: Cents | null;
}

export interface AnalysePatrimoine {
  readonly annees: readonly AnneePatrimoine[];
  readonly horizonAnnees: number;
  /** Le portefeuille au point de rendement retenu, avec son épuisement éventuel. */
  readonly portefeuille: Portefeuille;
  /**
   * Première année où le patrimoine du propriétaire atteint ou dépasse celui du
   * locataire de référence, ou `null` s'il ne le fait pas dans l'horizon.
   *
   * ⚠️ Ce n'est pas un seuil de rentabilité et l'écran ne doit pas le présenter
   * ainsi : c'est l'année où deux nombres se croisent, sous deux hypothèses que
   * personne ne connaît.
   */
  readonly croisement: number | null;
  /** Motif du refus de forfait, s'il en a écarté au moins une année. */
  readonly motifForfait: string | null;
  /** Première année chiffrable, `null` si aucune ne l'est. */
  readonly premiereAnneeChiffrable: number | null;
  /** Réserves du moteur à l'horizon, étiquetées de leur provenance. */
  readonly reserves: readonly Reserve[];
  /** Écart de cumul de décaissement à l'horizon — le chiffre du niveau simple. */
  readonly ecartNiveauSimple: Cents;
  /** Hypothèses effectivement retenues, pour que l'écran puisse les afficher. */
  readonly hypotheses: {
    readonly appreciationPct: number;
    readonly rendementPct: number;
    readonly intervalleAppreciation: readonly [number, number];
    readonly intervalleRendement: readonly [number, number];
  };
}

/* ── Le calcul ────────────────────────────────────────────────────────────── */

/**
 * Le portefeuille du locataire de référence à un rendement donné.
 *
 * Les versements sont l'écart **de décaissement** mois par mois, et non l'écart
 * de fonds perdus. C'est la définition de la spécification — « chaque mois
 * l'écart entre le coût de propriétaire et son loyer » — et c'est la seule qui
 * fasse tenir la comparaison : les deux ménages doivent sortir la même somme de
 * leur compte le même mois, sans quoi on ne compare plus deux patrimoines
 * constitués par le même effort.
 */
function portefeuilleA(
  comparaison: ComparaisonDetention,
  apport: Cents,
  rendementPct: number,
): Portefeuille {
  const versements = comparaison.mois.map(
    (m) => m.proprietaire.decaissement - m.locataire.decaissement,
  );
  return construirePortefeuille({
    apport,
    versements,
    rendementAnnuelNetPct: rendementPct,
  });
}

/** Valeur du portefeuille à la fin de l'année `annee`, ou sa dernière valeur connue. */
function valeurALAnnee(p: Portefeuille, annee: number): Cents {
  const ligne = p.echeances[annee * 12] ?? p.echeances[p.echeances.length - 1];
  return ligne?.valeur ?? 0;
}

/**
 * Produit net de la vente à un horizon et à une appréciation donnés, ou `null`
 * si la description n'est pas chiffrable à cette durée de détention.
 */
function venteA(
  scenario: Comparaison,
  sortie: Sortie,
  plan: CreditPlan,
  horizonMois: number,
): CessionChiffree | null {
  const entree = versEntreeCession(scenario, sortie, plan, horizonMois);
  if (motifNonChiffrable(entree) !== null) return null;
  return chiffrerCession(entree, PARAMS_2026);
}

/**
 * Compose les deux moteurs et rend la trajectoire des deux patrimoines.
 *
 * **Rien n'est recalculé ici.** `comparerDetention` a produit les flux,
 * `construirePortefeuille` les capitalise, `chiffrerCession` chiffre la vente.
 * Ce fichier branche, borne, et balaie l'horizon.
 *
 * Cinq balayages, et pas un de plus : la vente au point d'appréciation retenu
 * et à ses deux bornes, le portefeuille au point de rendement retenu et à ses
 * deux bornes. Le patrimoine du propriétaire ne dépend pas du rendement du
 * portefeuille, ni l'inverse : les deux fourchettes sont indépendantes et ne se
 * croisent pas en quatre combinaisons.
 */
export function analyserPatrimoine(
  brut: Comparaison,
  brutSortie: Sortie,
  plan: CreditPlan,
  comparaison: ComparaisonDetention,
): AnalysePatrimoine {
  const scenario = assainir(brut);
  const sortie = assainirSortie(brutSortie);
  const apport = euros(scenario.prix >= scenario.apport ? scenario.apport : scenario.prix);

  const [rendementBas, rendementHaut] = INTERVALLE_RENDEMENT;
  const portefeuille = portefeuilleA(comparaison, apport, sortie.rendement);
  const portefeuilleBas = portefeuilleA(comparaison, apport, rendementBas);
  const portefeuilleHaut = portefeuilleA(comparaison, apport, rendementHaut);

  const [apprBas, apprHaut] = INTERVALLE_APPRECIATION;
  const auxBornes = (annee: number): readonly [CessionChiffree | null, CessionChiffree | null] => [
    venteA(scenario, { ...sortie, appreciation: apprBas }, plan, annee * 12),
    venteA(scenario, { ...sortie, appreciation: apprHaut }, plan, annee * 12),
  ];

  const annees: AnneePatrimoine[] = [];
  let croisement: number | null = null;
  let motifForfait: string | null = null;
  let premiereAnneeChiffrable: number | null = null;

  for (let annee = 1; annee <= scenario.horizonAnnees; annee++) {
    const entree = versEntreeCession(scenario, sortie, plan, annee * 12);
    const motif = motifNonChiffrable(entree);
    if (motif !== null && motifForfait === null) motifForfait = motif;

    const cession = motif === null ? chiffrerCession(entree, PARAMS_2026) : null;
    const proprietaire = cession === null ? null : cession.produitDeVente.produitNet;
    if (cession !== null && premiereAnneeChiffrable === null) premiereAnneeChiffrable = annee;

    const [bas, haut] = cession === null ? [null, null] : auxBornes(annee);
    const locataire = valeurALAnnee(portefeuille, annee);
    const ecart = proprietaire === null ? null : proprietaire - locataire;

    if (croisement === null && proprietaire !== null && proprietaire >= locataire) {
      croisement = annee;
    }

    annees.push({
      annee,
      cession,
      proprietaire,
      proprietaireIntervalle:
        bas === null || haut === null
          ? null
          : [bas.produitDeVente.produitNet, haut.produitDeVente.produitNet],
      locataire,
      locataireIntervalle: [
        valeurALAnnee(portefeuilleBas, annee),
        valeurALAnnee(portefeuilleHaut, annee),
      ],
      ecart,
    });
  }

  const derniere = annees[annees.length - 1];

  return {
    annees,
    horizonAnnees: scenario.horizonAnnees,
    portefeuille,
    croisement,
    motifForfait,
    premiereAnneeChiffrable,
    reserves: derniere?.cession?.reserves ?? [],
    ecartNiveauSimple: comparaison.totaux.ecartDecaissement,
    hypotheses: {
      appreciationPct: sortie.appreciation,
      rendementPct: sortie.rendement,
      intervalleAppreciation: INTERVALLE_APPRECIATION,
      intervalleRendement: INTERVALLE_RENDEMENT,
    },
  };
}

/* ── Les trois sorties de la spécification ────────────────────────────────── */

/**
 * `docs/03-spec-domaine.md` §2 annonce trois sorties. **Une seule est
 * modélisée**, et cette liste existe pour que l'écran le dise en toutes lettres
 * plutôt que de laisser deviner.
 *
 * Ce n'est pas une liste de « prochainement ». `UI-014` vient de corriger un
 * écran qui annonçait « à venir » un module déjà livré ; l'erreur inverse — un
 * calcul esquissé qui n'existe pas — serait pire, parce qu'elle porterait sur un
 * chiffre. Les deux sorties non modélisées ne sont donc ni grisées, ni
 * approchées, ni datées : elles sont décrites, et déclarées absentes.
 */
export interface Sortie3 {
  readonly cle: string;
  readonly nom: string;
  readonly modelisee: boolean;
  readonly texte: string;
}

export const TROIS_SORTIES: readonly Sortie3[] = [
  {
    cle: "vente",
    nom: "Vente à l'horizon",
    modelisee: true,
    texte:
      "Chiffrée ici, poste par poste : prix de cession apprécié, commission d'agence, capital " +
      "restant dû lu dans l'échéancier, indemnité de remboursement anticipé sous son double " +
      "plafond légal, mainlevée d'hypothèque, restitution du fonds de garantie, impôt de " +
      "plus-value. Le total peut être négatif, et il est rendu tel quel.",
  },
  {
    cle: "location-longue-duree",
    nom: "Location longue durée",
    modelisee: false,
    texte:
      "N'existe pas dans ce simulateur. Il faudrait des loyers nets de vacance et de gestion, " +
      "les charges non récupérables, la mensualité toujours due, et l'impôt selon le régime — " +
      "micro-foncier, réel avec intérêts déductibles, micro-BIC ou réel meublé où " +
      "l'amortissement annule souvent la base imposable avant de s'ajouter à la plus-value. " +
      "Rien de tout cela n'est calculé, et aucun chiffre de cette page n'en approche le " +
      "résultat.",
  },
  {
    cle: "location-courte-duree",
    nom: "Location courte durée",
    modelisee: false,
    texte:
      "N'existe pas non plus. Il faudrait un tarif, un taux d'occupation, la commission de la " +
      "plateforme, les honoraires de conciergerie, les charges d'exploitation et l'ameublement " +
      "initial, sans compter les régimes des meublés de tourisme, dont les abattements ont " +
      "changé récemment. Aucun de ces paramètres n'est saisissable ici.",
  },
];
