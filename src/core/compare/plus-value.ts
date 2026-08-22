/**
 * PLUS-VALUE IMMOBILIÈRE HORS RÉSIDENCE PRINCIPALE — `ENG-014` et `ENG-016`
 *
 * Spécification : `docs/03-spec-domaine.md` §2, « Plus-value hors résidence
 * principale ». Valeurs : `src/core/fiscal/params.ts`, millésime 2026.
 *
 * ═══ CE QUE CE MODULE CALCULE ═══
 *
 * L'imposition d'une cession d'immeuble par un particulier, pour un bien qui
 * **n'est pas** sa résidence principale. Trois impositions distinctes, qui se
 * cumulent et qui ne partagent PAS la même assiette :
 *
 *   IMPÔT SUR LE REVENU     taux forfaitaire, sur la plus-value diminuée de
 *                           l'abattement de l'art. 150 VC.
 *   PRÉLÈVEMENTS SOCIAUX    sur la plus-value diminuée d'un abattement
 *                           DIFFÉRENT, celui de l'art. L136-7 du CSS.
 *   SURTAXE                 sur l'assiette de l'impôt sur le revenu, au-delà
 *                           d'un seuil, hors terrains à bâtir.
 *
 * ═══ LE PIÈGE CENTRAL : DEUX ABATTEMENTS, DEUX ASSIETTES ═══
 *
 * Les deux barèmes n'ont ni la même cadence ni la même durée d'exonération. Le
 * fiscal court sur 22 ans, le social sur 30. À 22 ans de détention, le vendeur
 * ne doit plus un euro d'impôt sur le revenu et doit encore des prélèvements
 * sociaux sur 72 % de sa plus-value.
 *
 * Un module qui ne produirait qu'une « plus-value imposable » se tromperait de
 * moitié entre la 22e et la 30e année, et de façon parfaitement vraisemblable.
 * D'où deux champs, nommés en toutes lettres — `baseImpotRevenu` et
 * `basePrelevementsSociaux` — et jamais un seul. Voir ADR-013.
 *
 * ═══ CE QU'IL NE CALCULE PAS, ET QU'IL LE DIT ═══
 *
 * `nonModelise` est un champ de sortie, pas un commentaire. Chaque résultat
 * transporte la liste de ce que le calcul a laissé de côté pour cette
 * configuration-là, en français, destinée à être affichée. Le motif est dans le
 * positionnement du produit : un simulateur qui tait ses trous laisse croire à
 * une exhaustivité qu'il n'a pas, et c'est exactement le défaut que ce produit
 * reproche aux autres.
 *
 * La liste complète des points hors modèle est en fin de fichier, dans
 * `HORS_MODELE`.
 *
 * ═══ AUCUNE RECOMMANDATION ═══
 *
 * Ce module chiffre un impôt. Il ne dit pas s'il faut vendre, ni quand, ni sous
 * quel statut. Aucune sortie ne compare deux dates de cession, aucune ne
 * désigne un optimum.
 */

import { type Cents, applyPct, assertSafe, roundCents } from "../money";
import { PARAMS_2026, type FiscalParams, type HoldingPeriodAllowance } from "../fiscal/params";

/* ── Description de l'opération ───────────────────────────────────────────── */

/**
 * Nature du bien cédé.
 *
 * Elle porte deux conséquences fiscales opposées, et c'est pourquoi elle est un
 * champ obligatoire plutôt qu'une option :
 *
 * - le forfait travaux de 15 % n'est ouvert qu'aux immeubles **bâtis** ;
 * - la surtaxe sur les plus-values élevées ne frappe **pas** les terrains à bâtir.
 */
export type NatureDuBien = "immeuble-bati" | "immeuble-non-bati" | "terrain-a-batir";

/**
 * Qualité du cédant, pour les seules restrictions que ce module applique.
 *
 * Le forfait de frais d'acquisition de 7,5 % n'est pas ouvert aux immeubles
 * détenus par un fonds de placement immobilier. La restriction figure dans les
 * commentaires de `params.ts` sans figurer dans sa structure — dette signalée
 * par `FIS-007` et traitée ici.
 */
export type QualiteDuCedant = "personne-physique" | "fonds-de-placement-immobilier";

/**
 * Régime de sécurité sociale d'affiliation du cédant — `ENG-016`.
 *
 * ⚠️ Ce champ commande le TAUX des prélèvements sociaux, et lui seul. Il ne dit
 * rien de la résidence fiscale, qui gouverne d'autres règles que ce module ne
 * modélise pas (voir `HORS_MODELE`).
 *
 * - `affilie-france` : taux plein du régime dérogatoire immobilier.
 * - `affilie-eee-suisse` : affiliation à un régime obligatoire de sécurité
 *   sociale d'un État de l'Espace économique européen, du Royaume-Uni ou de
 *   Suisse. Exonération de CSG et de CRDS, seul subsiste le prélèvement de
 *   solidarité.
 *
 * La spécification dit que ce point « doit être vérifié cas par cas ». Le module
 * applique donc une règle explicite à deux branches, et déclare dans
 * `nonModelise` tout ce qui, en pratique, peut la faire tomber : conventions
 * bilatérales, régimes d'affiliation mixtes, situations de détachement.
 */
export type RegimeSocialDuCedant = "affilie-france" | "affilie-eee-suisse";

/** Les trois faits dont dépend l'ouverture d'un forfait de majoration. */
export interface SituationDuCedant {
  readonly nature: NatureDuBien;
  readonly qualiteDuCedant: QualiteDuCedant;
  /**
   * Durée de détention en MOIS entiers, pas en années.
   *
   * Le mois est ici la bonne unité et l'année ne l'est pas : le forfait travaux
   * suppose une détention de « plus de cinq ans », qu'une durée exprimée en
   * années révolues ne sait pas distinguer d'une détention de cinq ans tout
   * juste. Cinq ans et trois mois ouvrent le forfait ; cinq ans jour pour jour
   * ne l'ouvrent pas, et les deux valent 5 en années révolues.
   *
   * Les abattements, eux, se comptent en années révolues — `anneesRevolues`.
   */
  readonly dureeDetentionMois: number;
}

/* ── Les forfaits, et ce qui les empêche d'être appliqués hors champ ──────── */

/**
 * Marque de conformité. Symbole privé au module : aucun appelant ne peut le
 * nommer, donc aucun appelant ne peut fabriquer un jeton de forfait à la main.
 *
 * C'est le premier des deux verrous. Le second est un contrôle à l'exécution
 * dans `calculerPlusValue`, parce que le type seul ne suffit pas : rien
 * n'empêcherait de produire un jeton sur un bien détenu douze ans, puis de
 * l'employer dans un calcul portant sur une détention de deux ans.
 */
const marqueForfait: unique symbol = Symbol("forfait de majoration vérifié");

/** Jeton attestant que le forfait de frais d'acquisition est dans son champ. */
export interface ForfaitFraisAcquisitionAutorise {
  readonly [marqueForfait]: "frais-acquisition";
  readonly tauxPct: number;
}

/** Jeton attestant que le forfait travaux est dans son champ. */
export interface ForfaitTravauxAutorise {
  readonly [marqueForfait]: "travaux";
  readonly tauxPct: number;
}

/**
 * Majoration du prix d'acquisition au titre des frais d'acquisition.
 *
 * Union discriminée : le mode réel porte un montant, le mode forfaitaire porte
 * un jeton et **aucun montant**. On ne peut donc ni oublier le montant réel, ni
 * en glisser un à côté d'un forfait.
 */
export type MajorationFraisAcquisition =
  | { readonly mode: "reel"; readonly montant: Cents }
  | { readonly mode: "forfait"; readonly jeton: ForfaitFraisAcquisitionAutorise };

/** Majoration du prix d'acquisition au titre des travaux. Même construction. */
export type MajorationTravaux =
  | { readonly mode: "reel"; readonly montant: Cents }
  | { readonly mode: "forfait"; readonly jeton: ForfaitTravauxAutorise };

/** Levée lorsqu'un forfait est demandé hors de son champ d'application. */
export class ForfaitHorsChampError extends Error {
  readonly forfait: "frais-acquisition" | "travaux";
  readonly motif: string;

  constructor(forfait: "frais-acquisition" | "travaux", motif: string) {
    super(`Forfait « ${forfait} » hors champ : ${motif}`);
    this.name = "ForfaitHorsChampError";
    this.forfait = forfait;
    this.motif = motif;
  }
}

/**
 * Motif d'exclusion du forfait de frais d'acquisition, ou `null` s'il est ouvert.
 *
 * Rendu séparément du constructeur pour que l'interface puisse griser une option
 * et en dire la raison, sans avoir à provoquer une exception pour le savoir.
 */
export function motifExclusionForfaitFraisAcquisition(
  situation: SituationDuCedant,
): string | null {
  if (situation.qualiteDuCedant === "fonds-de-placement-immobilier") {
    return "le forfait de 7,5 % n'est pas ouvert aux immeubles détenus par un fonds de placement immobilier (CGI, art. 150 VB, II, 3°)";
  }
  return null;
}

/**
 * Motif d'exclusion du forfait travaux, ou `null` s'il est ouvert.
 *
 * Deux conditions cumulatives, et la seconde est stricte : le texte dit « plus
 * de cinq ans », pas « cinq ans au moins ». Une détention de soixante mois
 * exactement n'ouvre donc rien.
 */
export function motifExclusionForfaitTravaux(
  situation: SituationDuCedant,
  params: FiscalParams = PARAMS_2026,
): string | null {
  const { worksFlatMinHoldingYears } = params.realEstateCapitalGains.acquisitionPriceUplift;
  if (situation.nature !== "immeuble-bati") {
    return "le forfait de 15 % est réservé aux immeubles bâtis (CGI, art. 150 VB, II, 4°)";
  }
  const minimumMois = worksFlatMinHoldingYears * MOIS_PAR_AN;
  if (situation.dureeDetentionMois <= minimumMois) {
    return `le forfait de 15 % suppose une détention de plus de ${worksFlatMinHoldingYears} ans, soit plus de ${minimumMois} mois (CGI, art. 150 VB, II, 4°)`;
  }
  return null;
}

/** Frais d'acquisition réels, justificatifs à l'appui. */
export function fraisAcquisitionReels(montant: Cents): MajorationFraisAcquisition {
  return { mode: "reel", montant: exigerMontant(montant, "frais d'acquisition réels") };
}

/**
 * Forfait de frais d'acquisition, **sous condition**.
 *
 * Lève `ForfaitHorsChampError` si la situation l'exclut. Il n'existe aucun autre
 * chemin pour obtenir le jeton.
 */
export function fraisAcquisitionForfaitaires(
  situation: SituationDuCedant,
  params: FiscalParams = PARAMS_2026,
): MajorationFraisAcquisition {
  const motif = motifExclusionForfaitFraisAcquisition(situation);
  if (motif !== null) throw new ForfaitHorsChampError("frais-acquisition", motif);
  return {
    mode: "forfait",
    jeton: {
      [marqueForfait]: "frais-acquisition",
      tauxPct: params.realEstateCapitalGains.acquisitionPriceUplift.acquisitionCostsFlatPct,
    },
  };
}

/** Travaux réels, justificatifs à l'appui. */
export function travauxReels(montant: Cents): MajorationTravaux {
  return { mode: "reel", montant: exigerMontant(montant, "travaux réels") };
}

/** Forfait travaux, **sous condition**. Lève `ForfaitHorsChampError` hors champ. */
export function travauxForfaitaires(
  situation: SituationDuCedant,
  params: FiscalParams = PARAMS_2026,
): MajorationTravaux {
  const motif = motifExclusionForfaitTravaux(situation, params);
  if (motif !== null) throw new ForfaitHorsChampError("travaux", motif);
  return {
    mode: "forfait",
    jeton: {
      [marqueForfait]: "travaux",
      tauxPct: params.realEstateCapitalGains.acquisitionPriceUplift.worksFlatPct,
    },
  };
}

/* ── Entrée ───────────────────────────────────────────────────────────────── */

export interface EntreePlusValue extends SituationDuCedant {
  /** Prix stipulé dans l'acte de cession. */
  readonly prixDeCession: Cents;
  /**
   * Frais supportés par le vendeur à la cession et venant en diminution du prix :
   * diagnostics obligatoires, mainlevée d'hypothèque, commission d'agence
   * lorsqu'elle est à sa charge (CGI, art. 150 VA, III). Défaut zéro.
   */
  readonly fraisDeCession?: Cents;
  /** Prix stipulé dans l'acte d'acquisition, ou valeur retenue pour les droits. */
  readonly prixAcquisition: Cents;
  readonly fraisAcquisition: MajorationFraisAcquisition;
  readonly travaux: MajorationTravaux;
  /** Commande le taux des prélèvements sociaux — `ENG-016`. */
  readonly regimeSocial: RegimeSocialDuCedant;
  /** Millésime employé. À défaut, celui en vigueur. */
  readonly params?: FiscalParams;
}

/* ── Sortie ───────────────────────────────────────────────────────────────── */

export interface AssiettePlusValue {
  /** Prix de cession diminué des frais de cession. */
  readonly prixDeCessionNet: Cents;
  readonly majorationFraisAcquisition: Cents;
  readonly majorationTravaux: Cents;
  /** Prix d'acquisition augmenté des deux majorations. */
  readonly prixAcquisitionMajore: Cents;
  /**
   * `prixDeCessionNet − prixAcquisitionMajore`. **Peut être négative** : c'est
   * une moins-value, et le résultat le dit.
   */
  readonly plusValueBrute: Cents;
}

/** Un abattement pour durée de détention, appliqué à la plus-value brute. */
export interface AbattementApplique {
  /** Années de détention révolues retenues. */
  readonly anneesDetention: number;
  /** Abattement cumulé, en pourcentage, plafonné à 100. */
  readonly tauxPct: number;
  readonly montant: Cents;
  /** `plusValueBrute − montant`. Jamais négatif. */
  readonly base: Cents;
  readonly exonerationTotale: boolean;
  /** Durée au terme de laquelle CE barème atteint 100 %. */
  readonly anneeExonerationTotale: number;
}

export interface ImpositionPlusValue {
  readonly assiette: AssiettePlusValue;
  /**
   * Vrai quand la plus-value brute est nulle ou négative. Aucune imposition
   * n'est alors due, et la moins-value ne s'impute sur rien (CGI, art. 150 VD).
   */
  readonly moinsValue: boolean;

  /** Barème de l'art. 150 VC — 22 ans. */
  readonly abattementImpotRevenu: AbattementApplique;
  /** Barème de l'art. L136-7 du CSS — 30 ans. Cadence et durée DIFFÉRENTES. */
  readonly abattementPrelevementsSociaux: AbattementApplique;

  /** Assiette de l'impôt sur le revenu. Aussi celle de la surtaxe. */
  readonly baseImpotRevenu: Cents;
  /** Assiette des prélèvements sociaux. Distincte de la précédente. */
  readonly basePrelevementsSociaux: Cents;

  readonly impotRevenu: Cents;
  readonly prelevementsSociaux: Cents;
  readonly surtaxe: Cents;
  /** Somme des trois. */
  readonly total: Cents;

  readonly taux: {
    readonly impotRevenuPct: number;
    readonly prelevementsSociauxPct: number;
    readonly regimeSocial: RegimeSocialDuCedant;
  };
  /** Faux pour un terrain à bâtir, que la surtaxe ne frappe pas. */
  readonly surtaxeApplicable: boolean;

  /**
   * Ce que ce calcul n'a pas modélisé, en français, prêt à être affiché à côté
   * du résultat. Toujours non vide.
   */
  readonly nonModelise: readonly string[];

  readonly millesime: string;
}

/* ── Outils publics ───────────────────────────────────────────────────────── */

const MOIS_PAR_AN = 12;

/** Années de détention révolues. Le mois entamé ne compte pas. */
export function anneesRevolues(dureeDetentionMois: number): number {
  return Math.floor(exigerEntierPositif(dureeDetentionMois, "durée de détention en mois") / MOIS_PAR_AN);
}

/**
 * Abattement cumulé d'un barème, en pourcentage, après `annees` années révolues.
 *
 * Les tranches ne sont pas des paliers : chacune donne un taux **par année de
 * détention comprise en son sein**, et elles s'additionnent au fil du temps.
 *
 * Le cumul est arrondi à 10⁻⁶ avant plafonnement : les taux portent deux
 * décimales, et seize additions de 1,65 en binaire ne rendent pas exactement
 * 26,4. Sans cet arrondi, le barème social ne solderait pas à 100 % à 30 ans.
 */
export function abattementPourDureeDetentionPct(
  bareme: HoldingPeriodAllowance,
  annees: number,
): number {
  let total = 0;
  for (const tranche of bareme.steps) {
    const fin = Math.min(tranche.toYear, annees);
    if (fin >= tranche.fromYear) total += (fin - tranche.fromYear + 1) * tranche.ratePctPerYear;
  }
  return Math.min(100, Math.round(total * 1e6) / 1e6);
}

/** Taux de prélèvements sociaux applicable au régime d'affiliation — `ENG-016`. */
export function tauxPrelevementsSociauxPct(
  regime: RegimeSocialDuCedant,
  params: FiscalParams = PARAMS_2026,
): number {
  return regime === "affilie-eee-suisse"
    ? params.socialLevies.eeaReducedPct
    : params.socialLevies.realEstate.totalPct;
}

/**
 * Surtaxe sur les plus-values immobilières élevées (CGI, art. 1609 nonies G).
 *
 * L'assiette est la plus-value imposable **à l'impôt sur le revenu**, celle des
 * articles 150 V à 150 VD : l'abattement social n'y entre pas.
 *
 * Le taux frappe la TOTALITÉ de l'assiette et non la seule fraction excédant la
 * borne basse. Sans correctif, le passage de 2 % à 3 % à 100 000 € coûterait
 * 1 000 € pour un euro de plus-value supplémentaire. D'où la décote de lissage,
 * appliquée sur une tranche étroite sur deux :
 *
 *     taxe = taux × assiette − coefficient × (borne haute − assiette)
 *
 * ⚠️ Le barème reste discontinu à son SEUIL D'ENTRÉE : rien à 50 000 €, environ
 * 500 € à 50 001 €. La décote de la première tranche vaut 1/20 là où la
 * continuité aurait demandé 1/10. C'est dans le texte, pas dans notre lecture :
 * on le constate et on ne le corrige pas.
 */
export function surtaxeSurPlusValue(
  baseImpotRevenu: Cents,
  params: FiscalParams = PARAMS_2026,
): Cents {
  const { thresholdCents, brackets } = params.realEstateCapitalGains.surtax;
  if (baseImpotRevenu <= thresholdCents) return 0;

  const tranche = brackets.find(
    (b) => baseImpotRevenu >= b.fromCents && (b.toCents === null || baseImpotRevenu <= b.toCents),
  );
  if (tranche === undefined) {
    // Le barème de `params.ts` est contigu et sa dernière tranche est non bornée ;
    // n'arriver ici signalerait un barème mutilé, pas une plus-value exotique.
    throw new RangeError(
      `surtaxe : aucune tranche du barème ne couvre une assiette de ${baseImpotRevenu} centimes`,
    );
  }

  const borneHaute = tranche.toCents ?? 0;
  const brut = (tranche.ratePct / 100) * baseImpotRevenu;
  const decote = tranche.smoothingCoefficient * (borneHaute - baseImpotRevenu);
  const taxe = roundCents(brut - decote);
  return taxe > 0 ? taxe : 0;
}

/* ── Calcul ───────────────────────────────────────────────────────────────── */

/**
 * Impose la plus-value d'un bien qui n'est pas la résidence principale du cédant.
 *
 * Fonction pure. Lève `ForfaitHorsChampError` si un forfait est présenté pour une
 * situation qui ne l'ouvre pas, et `RangeError` sur une entrée hors domaine.
 */
export function calculerPlusValue(entree: EntreePlusValue): ImpositionPlusValue {
  const params = entree.params ?? PARAMS_2026;
  const pv = params.realEstateCapitalGains;

  const situation: SituationDuCedant = {
    nature: entree.nature,
    qualiteDuCedant: entree.qualiteDuCedant,
    dureeDetentionMois: exigerEntierPositif(entree.dureeDetentionMois, "durée de détention en mois"),
  };

  const prixDeCession = exigerMontant(entree.prixDeCession, "prix de cession");
  const fraisDeCession = exigerMontant(entree.fraisDeCession ?? 0, "frais de cession");
  const prixAcquisition = exigerMontant(entree.prixAcquisition, "prix d'acquisition");

  // ── Le second verrou des forfaits ──────────────────────────────────────────
  // Le jeton prouve qu'un forfait a été ouvert POUR UNE situation ; il ne prouve
  // pas que c'est celle-ci. On revérifie donc les conditions sur l'entrée
  // effectivement soumise au calcul, sans quoi il suffirait de construire le
  // jeton sur un bien bâti détenu douze ans pour majorer de 15 % un terrain
  // détenu deux ans.
  const majorationFraisAcquisition =
    entree.fraisAcquisition.mode === "reel"
      ? entree.fraisAcquisition.montant
      : forfaitFraisVerifie(entree.fraisAcquisition.jeton, situation, prixAcquisition);

  const majorationTravaux =
    entree.travaux.mode === "reel"
      ? entree.travaux.montant
      : forfaitTravauxVerifie(entree.travaux.jeton, situation, prixAcquisition, params);

  const prixDeCessionNet = prixDeCession - fraisDeCession;
  const prixAcquisitionMajore = prixAcquisition + majorationFraisAcquisition + majorationTravaux;
  const plusValueBrute = prixDeCessionNet - prixAcquisitionMajore;
  assertSafe(plusValueBrute, "plus-value brute");

  const assiette: AssiettePlusValue = {
    prixDeCessionNet,
    majorationFraisAcquisition,
    majorationTravaux,
    prixAcquisitionMajore,
    plusValueBrute,
  };

  const annees = anneesRevolues(situation.dureeDetentionMois);
  const imposable = plusValueBrute > 0 ? plusValueBrute : 0;
  const moinsValue = plusValueBrute <= 0;

  const abattementImpotRevenu = appliquerAbattement(pv.incomeTaxAllowance, annees, imposable);
  const abattementPrelevementsSociaux = appliquerAbattement(
    pv.socialLevyAllowance,
    annees,
    imposable,
  );

  const baseImpotRevenu = abattementImpotRevenu.base;
  const basePrelevementsSociaux = abattementPrelevementsSociaux.base;

  const impotRevenuPct = pv.incomeTaxRatePct;
  const prelevementsSociauxPct = tauxPrelevementsSociauxPct(entree.regimeSocial, params);

  const impotRevenu = applyPct(baseImpotRevenu, impotRevenuPct);
  const prelevementsSociaux = applyPct(basePrelevementsSociaux, prelevementsSociauxPct);

  // La surtaxe ne frappe pas les terrains à bâtir (art. 1609 nonies G, I).
  const surtaxeApplicable = situation.nature !== "terrain-a-batir";
  const surtaxe = surtaxeApplicable ? surtaxeSurPlusValue(baseImpotRevenu, params) : 0;

  return {
    assiette,
    moinsValue,
    abattementImpotRevenu,
    abattementPrelevementsSociaux,
    baseImpotRevenu,
    basePrelevementsSociaux,
    impotRevenu,
    prelevementsSociaux,
    surtaxe,
    total: impotRevenu + prelevementsSociaux + surtaxe,
    taux: {
      impotRevenuPct,
      prelevementsSociauxPct,
      regimeSocial: entree.regimeSocial,
    },
    surtaxeApplicable,
    nonModelise: pointsHorsModele(entree, situation, moinsValue),
    millesime: params.vintage,
  };
}

/* ── Rouages ──────────────────────────────────────────────────────────────── */

function appliquerAbattement(
  bareme: HoldingPeriodAllowance,
  annees: number,
  plusValue: Cents,
): AbattementApplique {
  const tauxPct = abattementPourDureeDetentionPct(bareme, annees);
  // Un seul arrondi, et la soustraction plutôt qu'un second `applyPct` : ainsi
  // `montant + base === plusValue` au centime, quel que soit le taux.
  const montant = applyPct(plusValue, tauxPct);
  return {
    anneesDetention: annees,
    tauxPct,
    montant,
    base: plusValue - montant,
    exonerationTotale: tauxPct >= 100,
    anneeExonerationTotale: bareme.fullExemptionYear,
  };
}

function forfaitFraisVerifie(
  jeton: ForfaitFraisAcquisitionAutorise,
  situation: SituationDuCedant,
  prixAcquisition: Cents,
): Cents {
  const motif = motifExclusionForfaitFraisAcquisition(situation);
  if (motif !== null) throw new ForfaitHorsChampError("frais-acquisition", motif);
  return applyPct(prixAcquisition, jeton.tauxPct);
}

function forfaitTravauxVerifie(
  jeton: ForfaitTravauxAutorise,
  situation: SituationDuCedant,
  prixAcquisition: Cents,
  params: FiscalParams,
): Cents {
  const motif = motifExclusionForfaitTravaux(situation, params);
  if (motif !== null) throw new ForfaitHorsChampError("travaux", motif);
  return applyPct(prixAcquisition, jeton.tauxPct);
}

function exigerMontant(montant: Cents, quoi: string): Cents {
  assertSafe(montant, quoi);
  if (!Number.isInteger(montant)) throw new RangeError(`${quoi} : montant non entier en centimes`);
  if (montant < 0) throw new RangeError(`${quoi} : montant négatif`);
  return montant;
}

function exigerEntierPositif(valeur: number, quoi: string): number {
  assertSafe(valeur, quoi);
  if (!Number.isInteger(valeur)) throw new RangeError(`${quoi} : valeur non entière`);
  if (valeur < 0) throw new RangeError(`${quoi} : valeur négative`);
  return valeur;
}

/* ── Ce que le module ne modélise pas ─────────────────────────────────────── */

/**
 * Les points hors modèle, nommés une fois, réutilisés partout.
 *
 * Ils sont écrits pour être lus par un utilisateur, pas par un fiscaliste : une
 * phrase, ce qu'elle change, et jamais de conseil.
 */
export const HORS_MODELE = {
  residencePrincipale:
    "Ce calcul suppose que le bien n'est pas la résidence principale du cédant. L'exonération de la résidence principale n'est pas appliquée ici.",
  exonerationsParticulieres:
    "Les exonérations tenant à la personne ou à l'opération ne sont pas modélisées : cession de faible montant, retraités et invalides sous condition de ressources, première cession d'un logement autre que la résidence principale sous condition de remploi, expropriation, cession au profit d'un organisme de logement social.",
  abattementExceptionnel:
    "L'abattement exceptionnel en zone tendue n'est pas appliqué : il dépend d'un engagement de démolition ou de reconstruction pris par l'acquéreur, que ce simulateur ne connaît pas.",
  amortissementsLmnp:
    "Les amortissements déduits sous le régime réel de la location meublée ne sont pas réintégrés au calcul. Pour un bien loué meublé au réel, la plus-value imposable est donc sous-estimée ici.",
  majorationsDiverses:
    "Seuls les frais d'acquisition et les travaux majorent le prix d'acquisition. Les frais de voirie, réseaux et distribution n'entrent pas dans ce calcul, et les travaux déjà déduits des revenus fonciers ne devraient pas y entrer non plus : c'est à la saisie de les écarter.",
  nonResidents:
    "Le régime des non-résidents n'est modélisé que par le taux des prélèvements sociaux. Ne sont pris en compte ni les conventions fiscales bilatérales, ni le prélèvement dû par les non-résidents, ni l'obligation de représentant fiscal, ni l'exonération propre à la cession d'un logement en France par un non-résident.",
  affiliationVerifiee:
    "Le taux réduit suppose une affiliation à un régime obligatoire de sécurité sociale de l'Espace économique européen, du Royaume-Uni ou de Suisse, sans affiliation française. Les situations mixtes, les détachements et les cas réglés par convention doivent être vérifiés cas par cas.",
  moinsValueNonImputable:
    "La plus-value est nulle ou négative : aucune imposition n'est due, et une moins-value immobilière ne s'impute ni sur une autre plus-value ni sur le revenu global.",
  surtaxeTerrain:
    "La surtaxe sur les plus-values élevées n'est pas due sur un terrain à bâtir. Elle n'est donc pas comptée ici.",
  fraisReels:
    "Les frais et travaux réels sont repris tels qu'ils sont saisis. Ce module ne vérifie ni leur nature déductible, ni l'existence des justificatifs, que l'administration peut exiger.",
} as const;

function pointsHorsModele(
  entree: EntreePlusValue,
  situation: SituationDuCedant,
  moinsValue: boolean,
): readonly string[] {
  const points: string[] = [
    HORS_MODELE.residencePrincipale,
    HORS_MODELE.exonerationsParticulieres,
    HORS_MODELE.abattementExceptionnel,
    HORS_MODELE.amortissementsLmnp,
    HORS_MODELE.majorationsDiverses,
    HORS_MODELE.fraisReels,
  ];
  if (entree.regimeSocial === "affilie-eee-suisse") {
    points.push(HORS_MODELE.nonResidents, HORS_MODELE.affiliationVerifiee);
  }
  if (situation.nature === "terrain-a-batir") points.push(HORS_MODELE.surtaxeTerrain);
  if (moinsValue) points.push(HORS_MODELE.moinsValueNonImputable);
  return points;
}
