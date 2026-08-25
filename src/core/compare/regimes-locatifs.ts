/**
 * RÉGIMES FISCAUX LOCATIFS — l'impôt d'une année de location, régime par régime.
 *
 * ═══ CE QUE CE FICHIER CALCULE ═══
 *
 * Une année de location produit des recettes, supporte des charges, et l'impôt
 * dépend du RÉGIME — quatre possibles, deux par nature de location :
 *
 *   nue      micro-foncier (abattement forfaitaire) ou réel (charges et intérêts)
 *   meublée  micro-BIC (abattement par catégorie) ou réel (charges, intérêts
 *            ET amortissement du bien)
 *
 * La fonction est ANNUELLE et sans état : les reports — déficit foncier, part
 * d'amortissement non déduite — entrent et sortent en clair, et c'est l'appelant
 * qui les fait circuler d'une année à l'autre. Un échéancier de scénario est un
 * pli de cette fonction, pas une boucle cachée dedans.
 *
 * ═══ LES DEUX RÈGLES QUE TOUT LE MONDE IGNORE, ET QUE CE FICHIER PORTE ═══
 *
 * **La nue et la meublée ne paient pas les mêmes prélèvements sociaux.** La
 * dérogation à 17,2 % du IV de l'art. L136-8 du CSS vise les revenus fonciers
 * (a du I de l'art. L136-6) ; les bénéfices de la location meublée non
 * professionnelle relèvent du f du même I, qu'elle ne cite pas : droit commun,
 * 18,6 %. Voir `docs/reference/FIS-010-verification.md`, point 4.
 *
 * **L'amortissement du meublé ne crée jamais de déficit.** L'art. 39 C, II du
 * CGI plafonne l'amortissement déductible au résultat avant amortissement ;
 * l'excédent se reporte SANS limite de durée. C'est pour cela que le réel meublé
 * « annule souvent la base » — il l'annule, il ne la rend pas négative. La part
 * effectivement déduite se cumule chez l'appelant : elle minore le prix
 * d'acquisition à la revente (art. 150 VB, III — voir FIS-010, point 3).
 *
 * ═══ CE QUE CE FICHIER NE CALCULE PAS ═══
 *
 * Il rend l'impôt d'UNE année, jamais un conseil. Les seuils franchis sortent en
 * alertes typées ; ce qui n'est pas modélisé sort en toutes lettres dans
 * `nonModelise`, comme partout dans le module.
 */

import type { Cents } from "../money";
import { applyPct, assertSafe, roundToEuros } from "../money";
import type { FiscalParams } from "../fiscal/params";
import { PARAMS_2026 } from "../fiscal/params";

/* ── Régimes ──────────────────────────────────────────────────────────────── */

/** Catégories du micro-BIC, telles que l'art. 50-0 les range depuis la loi Le Meur. */
export type CategorieMeublee = "longue-duree" | "tourisme-classe" | "tourisme-non-classe";

/**
 * Union discriminée des quatre régimes. Le régime est une DONNÉE de l'entrée,
 * jamais un choix du moteur : décider du « meilleur régime » serait une
 * recommandation, et le produit n'en fait pas. Il calcule les deux mondes,
 * l'utilisateur regarde.
 */
export type RegimeLocatif =
  | { readonly type: "micro-foncier" }
  | { readonly type: "reel-nu" }
  | { readonly type: "micro-bic"; readonly categorie: CategorieMeublee }
  | { readonly type: "reel-meuble" };

/** La nature de la location — elle commande le taux de prélèvements sociaux. */
export type NatureLocation = "nue" | "meublee";

export function natureDuRegime(regime: RegimeLocatif): NatureLocation {
  return regime.type === "micro-foncier" || regime.type === "reel-nu" ? "nue" : "meublee";
}

/* ── Entrée ───────────────────────────────────────────────────────────────── */

export interface EntreeAnneeLocative {
  readonly regime: RegimeLocatif;
  /** Recettes brutes encaissées dans l'année — loyers, avant toute charge. */
  readonly recettesAnnuelles: Cents;
  /**
   * Charges déductibles de l'année, hors intérêts d'emprunt : copropriété, taxe
   * foncière, assurance propriétaire non occupant, frais de gestion, entretien.
   * Ignorées au micro — c'est le sens même de l'abattement forfaitaire.
   */
  readonly chargesDeductiblesAnnuelles?: Cents;
  /**
   * Intérêts et assurance emprunteur de l'année. Déductibles au réel seulement —
   * et c'est ce qui change tout dans les premières années d'un crédit.
   */
  readonly interetsEmpruntAnnuels?: Cents;
  /** Dotation d'amortissement de l'année. Réel meublé uniquement. */
  readonly amortissementAnnuel?: Cents;
  /**
   * Taux marginal d'imposition du foyer, en pourcentage. Il vient de
   * l'utilisateur : le simulateur ne connaît pas le foyer et ne veut pas le
   * connaître.
   */
  readonly tmiPct: number;
  /** Déficit foncier reporté des années antérieures. Réel nu uniquement. */
  readonly deficitFoncierAnterieur?: Cents;
  /** Amortissement non déduit reporté (art. 39 C). Réel meublé uniquement. */
  readonly amortissementAnterieurReporte?: Cents;
  /** Paramètres réglementaires. À défaut : le millésime courant. */
  readonly params?: FiscalParams;
}

/* ── Alertes ──────────────────────────────────────────────────────────────── */

/**
 * Un franchissement de seuil réglementaire, jamais un jugement. L'interface les
 * affiche avec le seuil et la valeur, et laisse l'utilisateur conclure.
 */
export type AlerteLocative =
  | {
      /** Les recettes dépassent le seuil du régime micro demandé : le réel s'impose. */
      readonly type: "micro-ineligible";
      readonly seuil: Cents;
      readonly recettes: Cents;
    }
  | {
      /**
       * Location de courte durée au-delà du seuil d'affiliation : les
       * prélèvements sociaux cèdent la place aux cotisations des indépendants,
       * que ce module ne calcule pas.
       */
      readonly type: "affiliation-courte-duree";
      readonly seuil: Cents;
      readonly recettes: Cents;
    };

/* ── Sortie ───────────────────────────────────────────────────────────────── */

export interface ImpotAnneeLocative {
  readonly regime: RegimeLocatif;
  readonly nature: NatureLocation;
  /**
   * Abattement forfaitaire effectivement appliqué. Nul au réel. Au micro-BIC il
   * vaut au moins 305 € (art. 50-0), jamais plus que les recettes.
   */
  readonly abattement: Cents;
  /**
   * Base imposable de l'année, arrondie à l'euro — art. 1649 undecies du CGI,
   * même règle que la plus-value (voir ADR-018). Jamais négative : ce qui
   * dépasse part en report, pas en impôt négatif.
   */
  readonly baseImposable: Cents;
  /** `baseImposable × TMI`. */
  readonly impotRevenu: Cents;
  /** `baseImposable × taux`, le taux dépendant de la NATURE de la location. */
  readonly prelevementsSociaux: Cents;
  /** 17,2 % en nue, 18,6 % en meublée — l'écart que le module enseigne. */
  readonly tauxPrelevementsSociauxPct: number;
  readonly impotTotal: Cents;
  /** Réel nu : déficit à reporter sur les revenus fonciers des années suivantes. */
  readonly deficitFoncierReporte: Cents;
  /** Réel meublé : part d'amortissement déduite cette année (plafond 39 C)… */
  readonly amortissementDeduit: Cents;
  /** …et part reportée sans limite de durée. */
  readonly amortissementReporte: Cents;
  readonly alertes: readonly AlerteLocative[];
  /** Ce que le calcul ne chiffre pas, en toutes lettres. */
  readonly nonModelise: readonly string[];
  readonly millesime: string;
}

/* ── Éligibilité au micro ─────────────────────────────────────────────────── */

export interface EligibiliteMicro {
  readonly eligible: boolean;
  readonly seuil: Cents;
}

/**
 * Le seuil du régime micro demandé. Rendu séparément pour que l'interface
 * puisse griser une option AVANT de calculer, avec le seuil en clair.
 */
export function seuilMicro(
  regime: RegimeLocatif,
  params: FiscalParams = PARAMS_2026,
): Cents | null {
  const r = params.rentalIncome;
  if (regime.type === "reel-nu" || regime.type === "reel-meuble") return null;
  if (regime.type === "micro-foncier") return r.microFoncier.grossIncomeThresholdCents;
  switch (regime.categorie) {
    case "longue-duree":
      return r.microBic.longTermThresholdCents;
    case "tourisme-classe":
      return r.microBic.classifiedTourismThresholdCents;
    case "tourisme-non-classe":
      return r.microBic.unclassifiedTourismThresholdCents;
  }
}

export function eligibiliteMicro(
  recettesAnnuelles: Cents,
  regime: RegimeLocatif,
  params: FiscalParams = PARAMS_2026,
): EligibiliteMicro | null {
  const seuil = seuilMicro(regime, params);
  if (seuil === null) return null;
  return { eligible: recettesAnnuelles <= seuil, seuil };
}

/* ── Calcul ───────────────────────────────────────────────────────────────── */

function exigerPositifOuNul(valeur: Cents, contexte: string): Cents {
  assertSafe(valeur, contexte);
  if (valeur < 0) throw new RangeError(`${contexte} : montant négatif`);
  return valeur;
}

function abattementMicroBic(
  recettes: Cents,
  categorie: CategorieMeublee,
  params: FiscalParams,
): Cents {
  const bic = params.rentalIncome.microBic;
  const pct =
    categorie === "tourisme-non-classe"
      ? bic.unclassifiedTourismAllowancePct
      : categorie === "tourisme-classe"
        ? bic.classifiedTourismAllowancePct
        : bic.longTermAllowancePct;
  // L'abattement vaut au moins 305 € (art. 50-0), mais jamais plus que les
  // recettes : un abattement qui dépasse l'assiette ne crée pas un déficit.
  return Math.min(recettes, Math.max(applyPct(recettes, pct), bic.minimumAllowanceCents));
}

/**
 * L'impôt d'une année de location, pour le régime demandé.
 *
 * La fonction calcule le régime QU'ON LUI DONNE, même si les recettes en
 * dépassent le seuil — l'inéligibilité sort en alerte, et l'appelant décide de
 * montrer la bascule. Refuser de calculer serait confondre le calcul et la
 * règle ; les montrer ensemble est précisément le travail de l'interface.
 */
export function calculerImpotLocatif(entree: EntreeAnneeLocative): ImpotAnneeLocative {
  const params = entree.params ?? PARAMS_2026;
  const regime = entree.regime;
  const nature = natureDuRegime(regime);

  const recettes = exigerPositifOuNul(entree.recettesAnnuelles, "recettes annuelles");
  const charges = exigerPositifOuNul(entree.chargesDeductiblesAnnuelles ?? 0, "charges déductibles");
  const interets = exigerPositifOuNul(entree.interetsEmpruntAnnuels ?? 0, "intérêts d'emprunt");
  const dotation = exigerPositifOuNul(entree.amortissementAnnuel ?? 0, "amortissement annuel");
  const deficitAnterieur = exigerPositifOuNul(
    entree.deficitFoncierAnterieur ?? 0,
    "déficit foncier antérieur",
  );
  const amortissementAnterieur = exigerPositifOuNul(
    entree.amortissementAnterieurReporte ?? 0,
    "amortissement reporté",
  );
  if (!Number.isFinite(entree.tmiPct) || entree.tmiPct < 0 || entree.tmiPct > 60) {
    throw new RangeError(`taux marginal d'imposition invraisemblable : ${entree.tmiPct} %`);
  }

  const alertes: AlerteLocative[] = [];
  const nonModelise: string[] = [];

  const eligibilite = eligibiliteMicro(recettes, regime, params);
  if (eligibilite !== null && !eligibilite.eligible) {
    alertes.push({ type: "micro-ineligible", seuil: eligibilite.seuil, recettes });
  }

  // Courte durée : au-delà du seuil, l'affiliation aux indépendants remplace les
  // prélèvements sociaux (CSS, art. L611-1, 6°). On calcule quand même — avec
  // l'alerte — parce qu'un calcul arrêté n'apprend rien.
  if (regime.type === "micro-bic" && regime.categorie !== "longue-duree") {
    const seuilAffiliation = params.rentalIncome.shortTermSocialAffiliationThresholdCents;
    if (recettes > seuilAffiliation) {
      alertes.push({ type: "affiliation-courte-duree", seuil: seuilAffiliation, recettes });
      nonModelise.push(
        "au-delà du seuil d'affiliation, les cotisations sociales des indépendants remplacent " +
          "les prélèvements sociaux ; elles ne sont pas calculées ici",
      );
    }
  }

  let abattement: Cents = 0;
  let resultat: Cents = 0;
  let deficitFoncierReporte: Cents = 0;
  let amortissementDeduit: Cents = 0;
  let amortissementReporte: Cents = 0;

  switch (regime.type) {
    case "micro-foncier": {
      // Art. 32 du CGI : 30 %, sans abattement minimum — le plancher de 305 €
      // appartient au micro-BIC, pas au foncier.
      abattement = applyPct(recettes, params.rentalIncome.microFoncier.allowancePct);
      resultat = recettes - abattement;
      break;
    }
    case "micro-bic": {
      abattement = abattementMicroBic(recettes, regime.categorie, params);
      resultat = recettes - abattement;
      break;
    }
    case "reel-nu": {
      // Résultat foncier de l'année, puis imputation du report antérieur.
      const resultatAvantReport = recettes - charges - interets;
      const apresReport = resultatAvantReport - deficitAnterieur;
      resultat = Math.max(0, apresReport);
      deficitFoncierReporte = Math.max(0, -apresReport);
      nonModelise.push(
        "l'imputation du déficit foncier hors intérêts sur le revenu global (art. 156, I, 3° " +
          "du CGI, plafonnée à 10 700 €) n'est pas modélisée : tout le déficit est reporté sur " +
          "les revenus fonciers suivants, ce qui retarde l'avantage",
        "l'expiration décennale des déficits reportés n'est pas modélisée",
      );
      break;
    }
    case "reel-meuble": {
      // Art. 39 C, II du CGI : l'amortissement ne peut ni créer ni aggraver un
      // déficit. Il se déduit dans la limite du résultat avant amortissement,
      // l'excédent se reporte sans limite de durée.
      const resultatAvantAmortissement = recettes - charges - interets;
      const amortissementDisponible = dotation + amortissementAnterieur;
      amortissementDeduit = Math.min(
        amortissementDisponible,
        Math.max(0, resultatAvantAmortissement),
      );
      amortissementReporte = amortissementDisponible - amortissementDeduit;
      resultat = Math.max(0, resultatAvantAmortissement - amortissementDeduit);
      if (resultatAvantAmortissement < 0) {
        // Un déficit HORS amortissement (charges et intérêts supérieurs aux
        // loyers) existe fiscalement — imputable sur les seuls bénéfices de
        // même nature pendant dix ans — mais son suivi n'est pas modélisé.
        nonModelise.push(
          "le déficit hors amortissement du meublé (imputable sur les bénéfices de location " +
            "meublée non professionnelle des dix années suivantes) n'est pas reporté par ce " +
            "calcul : l'impôt des années bénéficiaires suivantes est donc légèrement surestimé",
        );
      }
      nonModelise.push(
        "la cotisation foncière des entreprises, due par le loueur en meublé, n'est pas calculée",
        "le passage en loueur en meublé professionnel (recettes supérieures à 23 000 € ET " +
          "aux autres revenus d'activité du foyer, art. 155, IV du CGI) n'est pas modélisé",
      );
      break;
    }
  }

  // Art. 1649 undecies du CGI : les bases d'imposition s'arrondissent à l'euro,
  // la fraction de 0,50 € comptant pour 1. Même règle que la plus-value (ADR-018).
  const baseImposable = roundToEuros(Math.max(0, resultat));

  // Le taux de prélèvements sociaux suit la NATURE de la location, pas le
  // régime d'assiette : une nue au réel reste à 17,2 %, une meublée au micro
  // passe à 18,6 %. Voir l'en-tête du fichier et FIS-010, point 4.
  const tauxPs =
    nature === "nue"
      ? params.socialLevies.realEstate.totalPct
      : params.socialLevies.patrimony.totalPct;

  const impotRevenu = applyPct(baseImposable, entree.tmiPct);
  const prelevementsSociaux = applyPct(baseImposable, tauxPs);

  if (nature === "meublee") {
    nonModelise.push(
      "les recettes d'un affilié EEE ou Suisse restent comptées aux prélèvements sociaux " +
        "de droit commun : l'exonération de CSG-CRDS des non-résidents n'est pas appliquée " +
        "aux revenus locatifs",
    );
  }

  return {
    regime,
    nature,
    abattement,
    baseImposable,
    impotRevenu,
    prelevementsSociaux,
    tauxPrelevementsSociauxPct: tauxPs,
    impotTotal: impotRevenu + prelevementsSociaux,
    deficitFoncierReporte,
    amortissementDeduit,
    amortissementReporte,
    alertes,
    nonModelise,
    millesime: params.vintage,
  };
}
