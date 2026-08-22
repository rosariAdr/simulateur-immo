/**
 * LES VALEURS RÉGLEMENTAIRES QUE LE CONTENU CITE — `CNT-001`
 *
 * Un seul dictionnaire, alimenté par `src/core/fiscal/params.ts` et mis en forme
 * par `src/lib/format.ts`. Aucun texte du répertoire `src/content/` n'écrit un
 * taux, un seuil ou un barème : il pose un jeton `{ainsi}` et le reçoit d'ici.
 *
 * ── POURQUOI UN DICTIONNAIRE GLOBAL PLUTÔT QUE DES VALEURS PAR APPEL ──────
 *
 * Les bulles du module crédit reçoivent leurs valeurs à l'endroit qui les
 * affiche : le panneau de paramètres tient déjà le millésime, et le lecteur du
 * composant voit d'où sort le chiffre. La page du glossaire, elle, affiche
 * QUARANTE-HUIT entrées d'un coup ; les câbler une à une la transformerait en
 * table de correspondance, et l'oubli d'un jeton n'aurait plus de coupable.
 *
 * Le dictionnaire déplace la garantie au type : `GLOSSAIRE_RENDU`, plus bas,
 * substitue chaque entrée paramétrée avec cet objet, et `avec()` refuse de
 * compiler si un jeton n'y trouve pas sa clé. Un terme ajouté avec un jeton
 * inconnu arrête `npm run typecheck`, pas le lecteur.
 *
 * ── CE QUI N'A PAS SA PLACE ICI ──────────────────────────────────────────
 *
 * Une valeur qui ne vient pas de `params.ts` n'entre pas dans ce fichier : elle
 * y prendrait l'apparence d'une donnée sourcée sans en être une. Un contenu qui
 * aurait besoin d'un chiffre absent de `params.ts` se réécrit sans le chiffre.
 */

import { avec, GLOSSAIRE, GLOSSAIRE_PARAMETRE, type CleGlossaire, type Entree } from "./glossaire";
import { PARAMS_2026 } from "@/core/fiscal/params";
// Les valeurs qu'aucun texte ne fixe vivent à part — voir ADR-008, FIS-005. La
// distinction n'est pas rangée : elle est ce que le glossaire doit pouvoir dire
// à l'utilisateur quand il demande d'où sort un chiffre.
import { MARKET_2026 } from "@/core/assumptions/market";
import { formatDuree, formatEurosCourt, formatPourcentage } from "@/lib/format";

const P = PARAMS_2026;
const M = MARKET_2026;

/** Une fourchette « 7,0 % à 8,5 % », telle que les hypothèses de marché les expriment. */
const fourchette = ([bas, haut]: readonly [number, number], decimales: 1 | 2 = 1): string =>
  `${formatPourcentage(bas, decimales)} à ${formatPourcentage(haut, decimales)}`;

export const VALEURS = {
  /* Millésime et trimestre — ce que l'interface doit pouvoir dater. */
  millesime: P.vintage,

  /*
   * Normes d'octroi du HCSF. Les trois premiers noms sont ceux qu'employaient
   * déjà les entrées « durée » et « travaux inclus » : les renommer aurait
   * cassé leurs appels dans `PanneauParametres`, sans rien gagner.
   */
  plafond: formatDuree(P.hcsf.maxDurationMonths),
  derogatoire: formatDuree(P.hcsf.maxDurationDerogatoryMonths),
  partTravaux: formatPourcentage(P.hcsf.derogatoryWorksSharePct, 1),
  plafondEndettement: formatPourcentage(P.hcsf.maxDebtRatioPct, 1),
  margeDerogation: formatPourcentage(P.hcsf.flexibilityMarginPct, 1),

  /* Remboursement anticipé — le double plafond légal. */
  plafondIra: formatPourcentage(P.prepayment.capPctOutstanding, 1),
  moisInteretsIra: `${P.prepayment.capMonthsOfInterest} mois`,
  partMinimale: formatPourcentage(P.prepayment.contractualMinPctOfInitial, 1),

  /* Assurance emprunteur. */
  plafondLemoine: formatEurosCourt(P.borrowerInsurance.lemoineNoHealthFormThreshold),
  ageTermeLemoine: `${P.borrowerInsurance.lemoineMaxAgeAtTerm} ans`,
  tauxGroupe: fourchette(M.insurance.groupRatePct.intervalle, 2),
  tauxDelegation: fourchette(M.insurance.delegationRatePct.intervalle, 2),

  /* Garanties. */
  coutCaution: formatPourcentage(M.guarantee.suretyshipCostPct.valeur, 2),
  restitutionCaution: formatPourcentage(M.guarantee.suretyshipRefundPct.valeur, 1),
  coutHypotheque: formatPourcentage(M.guarantee.mortgageCostPct.valeur, 2),
  coutMainlevee: formatPourcentage(M.guarantee.mortgageReleasePct.valeur, 2),
  coutNantissement: formatPourcentage(M.guarantee.pledgeCostPct.valeur, 2),

  /* Droits de mutation et frais d'acquisition. */
  dmtoPlein: formatPourcentage(P.transferTax.oldFullPct, 2),
  dmtoStandard: formatPourcentage(P.transferTax.oldStandardPct, 2),
  dmtoReduit: formatPourcentage(P.transferTax.oldReducedPct, 2),
  dmtoPrimo: formatPourcentage(P.transferTax.firstTimeBuyerPct, 2),
  publiciteFonciere: formatPourcentage(P.transferTax.newBuildLandRegistryPct, 2),
  fraisAncien: fourchette(M.acquisition.totalFeesOldPct.intervalle, 1),
  fraisNeuf: fourchette(M.acquisition.totalFeesNewPct.intervalle, 1),
  partMobilier: formatPourcentage(P.transferTax.furnitureDeductionMaxPct, 1),
  remiseEmoluments: formatPourcentage(P.transferTax.notaryDiscountMaxPct, 1),
  seuilRemiseEmoluments: formatEurosCourt(P.transferTax.notaryDiscountThreshold),

  /* Taux d'usure du trimestre en vigueur. */
  trimestreUsure: P.usury.quarter,
  usureCourte: formatPourcentage(P.usury.fixedUnder10y, 2),
  usureMoyenne: formatPourcentage(P.usury.fixed10to20y, 2),
  usureLongue: formatPourcentage(P.usury.fixed20yPlus, 2),
  usureVariable: formatPourcentage(P.usury.variable, 2),
  usureRelais: formatPourcentage(P.usury.bridge, 2),
} as const satisfies Readonly<Record<string, string>>;

/** Les noms de jetons qu'un contenu a le droit d'employer. */
export type CleValeur = keyof typeof VALEURS;

/**
 * Les entrées paramétrées, une fois leurs valeurs substituées.
 *
 * Chaque ligne est un appel à `avec()`, donc chaque ligne est vérifiée : un
 * jeton absent de `VALEURS` ne compile pas. Le `satisfies` final ferme la
 * boucle dans l'autre sens — ajouter une entrée à `GLOSSAIRE_PARAMETRE` sans
 * la rendre ici arrête le typecheck.
 */
export const GLOSSAIRE_RENDU = {
  duree: avec(GLOSSAIRE_PARAMETRE.duree, VALEURS),
  travaux: avec(GLOSSAIRE_PARAMETRE.travaux, VALEURS),
  ira: avec(GLOSSAIRE_PARAMETRE.ira, VALEURS),
  remboursementAnticipe: avec(GLOSSAIRE_PARAMETRE.remboursementAnticipe, VALEURS),
  questionnaireSante: avec(GLOSSAIRE_PARAMETRE.questionnaireSante, VALEURS),
  droitsMutation: avec(GLOSSAIRE_PARAMETRE.droitsMutation, VALEURS),
  fraisAcquisition: avec(GLOSSAIRE_PARAMETRE.fraisAcquisition, VALEURS),
  emolumentsNotaire: avec(GLOSSAIRE_PARAMETRE.emolumentsNotaire, VALEURS),
  mobilier: avec(GLOSSAIRE_PARAMETRE.mobilier, VALEURS),
} as const satisfies Readonly<Record<keyof typeof GLOSSAIRE_PARAMETRE, Entree>>;

/**
 * Toutes les entrées, prêtes à afficher, quelle que soit leur famille d'origine.
 *
 * La distinction entre `GLOSSAIRE` et `GLOSSAIRE_PARAMETRE` sert à la
 * compilation ; elle n'a aucun sens pour un lecteur du glossaire, qui voit
 * quarante-huit définitions et pas deux listes. La page consomme cet objet-ci.
 */
export const ENTREES: Readonly<Record<CleGlossaire, Entree>> = {
  ...GLOSSAIRE,
  ...GLOSSAIRE_RENDU,
};
