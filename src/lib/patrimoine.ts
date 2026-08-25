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
  projeterLocationCourteDuree,
  type EntreeLocationCourteDuree,
  type LocationCourteDuree,
} from "@/core/compare/location-courte-duree";
import {
  projeterLocationLongueDuree,
  type EntreeLocationLongueDuree,
  type LocationLongueDuree,
} from "@/core/compare/location-longue-duree";
import {
  motifExclusionForfaitFraisAcquisition,
  motifExclusionForfaitTravaux,
} from "@/core/compare/plus-value";
import type { RegimeLocatif } from "@/core/compare/regimes-locatifs";
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

/* ── Les sorties locatives — `UI-024`/`UI-025`, ADR-022 ───────────────────── */

/**
 * La sortie que l'écran regarde. Elle ne change aucun chiffre du moteur, mais
 * elle change ceux que l'écran montre : un lien partagé doit ouvrir sur ce que
 * l'expéditeur regardait — c'est là que passe la frontière d'ADR-005.
 */
export const SORTIES_REGARDEES = ["vente", "longue-duree", "courte-duree"] as const;
export type SortieRegardee = (typeof SORTIES_REGARDEES)[number];

export const REGIMES_LONGUE_DUREE = ["micro-foncier", "reel-nu", "micro-bic", "reel-meuble"] as const;
export type RegimeLongueDuree = (typeof REGIMES_LONGUE_DUREE)[number];

export const REGIMES_COURTE_DUREE = ["tourisme-classe", "tourisme-non-classe", "reel-meuble"] as const;
export type RegimeCourteDuree = (typeof REGIMES_COURTE_DUREE)[number];

/** Les cinq taux du barème de l'impôt sur le revenu. Une liste dit d'où ils viennent. */
export const TAUX_MARGINAUX = [0, 11, 30, 41, 45] as const;

/** Durées de mise en location proposées, en années. */
export const DUREES_LOCATION = [1, 2, 3, 5, 8, 10, 15, 20] as const;

const L = MARKET_2026.location;

export const DEFAUTS_LOCATION = {
  sortieRegardee: "vente" as SortieRegardee,
  dureeLocationAnnees: 8,
  /** Taux marginal d'imposition du foyer, en %. */
  tmi: 30,
  /** Loyer mensuel de marché du bien, hors charges, en euros. */
  loyerMarche: 1_000,
  regimeLongueDuree: "micro-foncier" as RegimeLongueDuree,
  regimeCourteDuree: "tourisme-classe" as RegimeCourteDuree,
  /** Tarif par nuit, en euros. */
  tarifNuitee: 90,
  /**
   * Taux d'occupation annuel, en %. Milieu de la fourchette observée, faute de
   * valeur centrale — même discipline que l'appréciation, et même absence
   * d'autorité, déclarée à côté du champ.
   */
  tauxOccupation: milieu(L.tauxOccupationPct.intervalle),
  /** Ameublement et équipement initial, en euros. */
  ameublement: 8_000,
  /** Charges d'exploitation annuelles en courte durée, tout compris, en euros. */
  chargesExploitation: 2_400,
} as const;

export type Location = {
  sortieRegardee: SortieRegardee;
  dureeLocationAnnees: number;
  tmi: number;
  loyerMarche: number;
  regimeLongueDuree: RegimeLongueDuree;
  regimeCourteDuree: RegimeCourteDuree;
  tarifNuitee: number;
  tauxOccupation: number;
  ameublement: number;
  chargesExploitation: number;
};

/** Clés courtes. Aucune collision avec les dix-sept du niveau simple ni les huit de la sortie. */
export const CLES_LOCATION = {
  sortieRegardee: "so",
  dureeLocationAnnees: "dl",
  tmi: "tm",
  loyerMarche: "lm",
  regimeLongueDuree: "rl",
  regimeCourteDuree: "rc",
  tarifNuitee: "tn",
  tauxOccupation: "oc",
  ameublement: "am",
  chargesExploitation: "ce",
} as const satisfies Readonly<Record<keyof Location, string>>;

const BORNES_LOCATION = {
  loyerMarche: { min: 0, max: 100_000 },
  tarifNuitee: { min: 0, max: 10_000 },
  tauxOccupation: { min: 0, max: 100 },
  ameublement: { min: 0, max: 1_000_000 },
  chargesExploitation: { min: 0, max: 200_000 },
} as const;

export function assainirLocation(brut: Location): Location {
  const duree = (DUREES_LOCATION as readonly number[]).includes(brut.dureeLocationAnnees)
    ? brut.dureeLocationAnnees
    : DEFAUTS_LOCATION.dureeLocationAnnees;
  const tmi = (TAUX_MARGINAUX as readonly number[]).includes(brut.tmi)
    ? brut.tmi
    : DEFAUTS_LOCATION.tmi;
  return {
    sortieRegardee: SORTIES_REGARDEES.includes(brut.sortieRegardee)
      ? brut.sortieRegardee
      : DEFAUTS_LOCATION.sortieRegardee,
    dureeLocationAnnees: duree,
    tmi,
    loyerMarche: Math.round(
      borne(brut.loyerMarche, BORNES_LOCATION.loyerMarche.min, BORNES_LOCATION.loyerMarche.max),
    ),
    regimeLongueDuree: REGIMES_LONGUE_DUREE.includes(brut.regimeLongueDuree)
      ? brut.regimeLongueDuree
      : DEFAUTS_LOCATION.regimeLongueDuree,
    regimeCourteDuree: REGIMES_COURTE_DUREE.includes(brut.regimeCourteDuree)
      ? brut.regimeCourteDuree
      : DEFAUTS_LOCATION.regimeCourteDuree,
    tarifNuitee: Math.round(
      borne(brut.tarifNuitee, BORNES_LOCATION.tarifNuitee.min, BORNES_LOCATION.tarifNuitee.max),
    ),
    tauxOccupation: borne(
      brut.tauxOccupation,
      BORNES_LOCATION.tauxOccupation.min,
      BORNES_LOCATION.tauxOccupation.max,
    ),
    ameublement: Math.round(
      borne(brut.ameublement, BORNES_LOCATION.ameublement.min, BORNES_LOCATION.ameublement.max),
    ),
    chargesExploitation: Math.round(
      borne(
        brut.chargesExploitation,
        BORNES_LOCATION.chargesExploitation.min,
        BORNES_LOCATION.chargesExploitation.max,
      ),
    ),
  };
}

/* ── Passage aux moteurs locatifs ─────────────────────────────────────────── */

function regimeLocatifLongueDuree(r: RegimeLongueDuree): RegimeLocatif {
  return r === "micro-bic" ? { type: "micro-bic", categorie: "longue-duree" } : { type: r };
}

function regimeLocatifCourteDuree(r: RegimeCourteDuree): RegimeLocatif {
  return r === "reel-meuble" ? { type: "reel-meuble" } : { type: "micro-bic", categorie: r };
}

/**
 * Ce que les deux scénarios locatifs partagent, dérivé des clés existantes.
 *
 * Rien n'est redemandé : la taxe foncière, les charges, l'assurance — qui tient
 * lieu d'assurance propriétaire non occupant, approximation déclarée par le
 * moteur et par l'écran —, la provision, les indexations, le prix et le plan
 * viennent du niveau simple ; l'appréciation, la commission d'agence et les
 * majorations viennent de la sortie de vente. La mise en location commence le
 * mois qui suit l'horizon projeté : c'est la question posée — « et si, à
 * l'horizon, je louais au lieu de vendre ? ».
 */
function socleLocatif(s: Comparaison, sortie: Sortie, plan: CreditPlan) {
  return {
    credit: { plan, tauxMoyenAnnuelPct: s.taux },
    moisMiseEnLocation: s.horizonAnnees * 12 + 1,
    valeurInitiale: euros(s.prix),
    appreciationAnnuellePct: sortie.appreciation,
    regimeSocial: "affilie-france" as const,
    taxeFonciereAnnuelle: euros(s.taxeFonciere),
    assurancePnoAnnuelle: euros(s.assuranceHabitation),
    provisionTravauxPctAnnuel: s.provisionTravauxPct,
    indexations: {
      loyerPctAnnuel: s.indexationLoyer,
      taxeFoncierePctAnnuel: s.indexationTaxeFonciere,
      chargesPctAnnuel: s.indexationCharges,
    },
    commissionAgencePct: sortie.commissionAgence,
    fraisAcquisition: majoration(sortie.modeFrais, sortie.fraisAcquisitionReels),
    travaux: majoration(sortie.modeTravaux, sortie.travauxReels),
  };
}

export function versEntreeLongueDuree(
  brut: Comparaison,
  brutSortie: Sortie,
  brutLocation: Location,
  plan: CreditPlan,
): EntreeLocationLongueDuree {
  const s = assainir(brut);
  const sortie = assainirSortie(brutSortie);
  const loc = assainirLocation(brutLocation);
  return {
    ...socleLocatif(s, sortie, plan),
    dureeLocationAnnees: loc.dureeLocationAnnees,
    loyerMensuelMarche: euros(loc.loyerMarche),
    regime: regimeLocatifLongueDuree(loc.regimeLongueDuree),
    tmiPct: loc.tmi,
    chargesCoproprieteAnnuelles: euros(s.chargesCopropriete),
  };
}

export function versEntreeCourteDuree(
  brut: Comparaison,
  brutSortie: Sortie,
  brutLocation: Location,
  plan: CreditPlan,
): EntreeLocationCourteDuree {
  const s = assainir(brut);
  const sortie = assainirSortie(brutSortie);
  const loc = assainirLocation(brutLocation);
  return {
    ...socleLocatif(s, sortie, plan),
    dureeLocationAnnees: loc.dureeLocationAnnees,
    tarifNuitee: euros(loc.tarifNuitee),
    tauxOccupationPct: loc.tauxOccupation,
    regime: regimeLocatifCourteDuree(loc.regimeCourteDuree),
    tmiPct: loc.tmi,
    chargesExploitationAnnuelles: euros(loc.chargesExploitation),
    ameublementInitial: euros(loc.ameublement),
  };
}

/**
 * Pourquoi la revente locative n'est pas chiffrable, ou `null` si elle l'est.
 *
 * Même discipline que `motifNonChiffrable` : `ForfaitHorsChampError` ne se
 * rattrape pas, il s'anticipe. La revente locative est toujours imposable —
 * mettre en location fait perdre l'exonération —, et elle reprend les
 * majorations saisies pour la vente : un forfait travaux demandé sur une durée
 * totale trop courte la fermerait, et l'écran doit l'écrire.
 */
export function motifSortieLocativeNonChiffrable(
  brutSortie: Sortie,
  horizonCessionMois: number,
): string | null {
  const sortie = assainirSortie(brutSortie);
  const situation = {
    nature: "immeuble-bati",
    qualiteDuCedant: "personne-physique",
    dureeDetentionMois: horizonCessionMois,
  } as const;
  if (sortie.modeTravaux === "forfait") {
    const motif = motifExclusionForfaitTravaux(situation, PARAMS_2026);
    if (motif !== null) return motif;
  }
  if (sortie.modeFrais === "forfait") {
    const motif = motifExclusionForfaitFraisAcquisition(situation);
    if (motif !== null) return motif;
  }
  return null;
}

/** Un scénario locatif chiffré, ou le motif écrit de son refus. */
export interface SortieLocativeAnalysee<T> {
  readonly resultat: T | null;
  readonly motifNonChiffrable: string | null;
}

export function analyserLongueDuree(
  brut: Comparaison,
  brutSortie: Sortie,
  brutLocation: Location,
  plan: CreditPlan,
): SortieLocativeAnalysee<LocationLongueDuree> {
  const entree = versEntreeLongueDuree(brut, brutSortie, brutLocation, plan);
  const horizonCession = entree.moisMiseEnLocation - 1 + 12 * entree.dureeLocationAnnees;
  const motif = motifSortieLocativeNonChiffrable(brutSortie, horizonCession);
  if (motif !== null) return { resultat: null, motifNonChiffrable: motif };
  return { resultat: projeterLocationLongueDuree(entree), motifNonChiffrable: null };
}

export function analyserCourteDuree(
  brut: Comparaison,
  brutSortie: Sortie,
  brutLocation: Location,
  plan: CreditPlan,
): SortieLocativeAnalysee<LocationCourteDuree> {
  const entree = versEntreeCourteDuree(brut, brutSortie, brutLocation, plan);
  const horizonCession = entree.moisMiseEnLocation - 1 + 12 * entree.dureeLocationAnnees;
  const motif = motifSortieLocativeNonChiffrable(brutSortie, horizonCession);
  if (motif !== null) return { resultat: null, motifNonChiffrable: motif };
  return { resultat: projeterLocationCourteDuree(entree), motifNonChiffrable: null };
}

/* ── Les trois sorties de la spécification ────────────────────────────────── */

/**
 * `docs/03-spec-domaine.md` §2 annonce trois sorties. **Les trois sont
 * modélisées** depuis le 25 août 2026 — `ENG-027` pour la vente, `ENG-029` et
 * `ENG-015` pour les deux locations, câblées par `UI-025`.
 *
 * La liste reste la source unique de cet état — leçon d'`UI-014` : la phrase du
 * bandeau, la prose de la section et la description de la page s'en déduisent.
 * Chaque texte décrit ce qui est calculé ET où s'arrête le calcul, jamais une
 * promesse.
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
      "Chiffrée poste par poste : prix de cession apprécié, commission d'agence, capital " +
      "restant dû lu dans l'échéancier, indemnité de remboursement anticipé sous son double " +
      "plafond légal, mainlevée d'hypothèque, restitution du fonds de garantie, impôt de " +
      "plus-value. Le total peut être négatif, et il est rendu tel quel.",
  },
  {
    cle: "location-longue-duree",
    nom: "Location longue durée",
    modelisee: true,
    texte:
      "Chiffrée année par année : loyers nets de vacance et de gestion, charges non " +
      "récupérables, mensualité toujours due, impôt selon le régime — micro-foncier, réel nu, " +
      "micro-BIC ou réel meublé, où l'amortissement annule souvent la base avant de minorer le " +
      "prix d'acquisition à la revente. La location nue paie 17,2 % de prélèvements sociaux, " +
      "la meublée 18,6 %. La revente au terme est imposée : l'exonération de résidence " +
      "principale est perdue.",
  },
  {
    cle: "location-courte-duree",
    nom: "Location courte durée",
    modelisee: true,
    texte:
      "Chiffrée à partir d'un tarif et d'un taux d'occupation — sans valeur centrale, comme " +
      "l'appréciation : personne ne connaît l'occupation d'un bien précis. Commission de " +
      "plateforme et conciergerie en hypothèses déclarées, charges d'exploitation en entier, " +
      "ameublement décaissé la première année et amorti au réel. Les seuils mordent tôt : " +
      "micro non classé fermé à 15 000 €, affiliation aux indépendants signalée à 23 000 €.",
  },
];
