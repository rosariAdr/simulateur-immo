/**
 * SCÉNARIO DE LOCATION COURTE DURÉE — `ENG-015`.
 *
 * ═══ CE QUE CE FICHIER ASSEMBLE ═══
 *
 * La troisième sortie de l'analyse patrimoniale, comme la spécification
 * l'écrit : « revenus fonction du tarif et du taux d'occupation, moins la
 * commission de plateforme et les honoraires de conciergerie, moins les charges
 * d'exploitation, moins l'ameublement initial » (`docs/03-spec-domaine.md` §2).
 * Même squelette que la longue durée (`ENG-029`) : chaque année est un pli de
 * `calculerImpotLocatif`, la revente un appel à `chiffrerCession`.
 *
 * ═══ CE QUI CHANGE, ET QUI FAIT LA COURTE DURÉE ═══
 *
 * **Le taux d'occupation est obligatoire et sans défaut.** Il dépend de
 * l'adresse et de la saison plus que de toute moyenne : en publier une serait
 * une prévision. Même discipline que l'appréciation — la fourchette du relevé
 * encadre, l'utilisateur choisit.
 *
 * **Le propriétaire paie tout.** Pas de charges récupérables ici : énergie,
 * copropriété entière, consommables entrent dans `chargesExploitationAnnuelles`.
 *
 * **L'ameublement sort en caisse l'année 1** et, au régime réel, s'amortit sur
 * la durée d'usage du mobilier. À la revente, **seul l'amortissement du bâti se
 * réintègre** : le III de l'art. 150 VB minore le prix d'acquisition de
 * l'immeuble cédé, et le mobilier n'est pas dans cette assiette. Quand le
 * plafond de l'art. 39 C n'a pas tout laissé déduire, la part déduite est
 * réputée s'imputer d'abord sur le bâti — convention prudente, déclarée : elle
 * majore l'impôt de revente plutôt que de le minorer.
 *
 * **Les seuils mordent plus tôt.** Le micro du meublé de tourisme non classé
 * s'arrête à 15 000 € ; au-delà de 23 000 € de recettes, l'affiliation aux
 * indépendants remplace les prélèvements sociaux. `ENG-013` lève ces alertes ;
 * ce fichier les laisse remonter, année par année.
 */

import type { Cents } from "../money";
import { applyPct, assertSafe, roundCents } from "../money";
import type { FiscalParams } from "../fiscal/params";
import { PARAMS_2026 } from "../fiscal/params";
import type { MarketAssumptions } from "../assumptions/market";
import { MARKET_2026 } from "../assumptions/market";
import type { IndexationsDetention } from "./types";
import type { RegimeLocatif, ImpotAnneeLocative } from "./regimes-locatifs";
import { calculerImpotLocatif } from "./regimes-locatifs";
import type { CreditReprisPourVente } from "./vente";
import { valeurAppreciee } from "./vente";
import type { CessionChiffree, ModeMajoration, Reserve } from "./cession";
import { chiffrerCession } from "./cession";
import type { RegimeSocialDuCedant } from "./plus-value";
import { indexe } from "./location-longue-duree";

/* ── Entrée ───────────────────────────────────────────────────────────────── */

export interface EntreeLocationCourteDuree {
  /** Crédit en cours, décrit une seule fois — série et cession y lisent chacune leur part. */
  readonly credit?: CreditReprisPourVente;
  /** Premier mois d'exploitation, compté depuis le déblocage des fonds, à partir de 1. */
  readonly moisMiseEnLocation: number;
  /** Durée d'exploitation, en années entières. La revente suit la dernière. */
  readonly dureeLocationAnnees: number;
  /** Tarif par nuit, la première année. Aucune hypothèse ne le remplace : il est local. */
  readonly tarifNuitee: Cents;
  /**
   * Taux d'occupation annuel, en % des nuits. **Obligatoire, sans défaut** : le
   * relevé de marché n'en publie qu'une fourchette, délibérément sans centre.
   */
  readonly tauxOccupationPct: number;
  readonly valeurInitiale: Cents;
  /** Appréciation annuelle, en %. Obligatoire et sans défaut, comme partout. */
  readonly appreciationAnnuellePct: number;
  /** Meublé de tourisme (classé ou non) au micro, ou réel meublé. Rien d'autre. */
  readonly regime: RegimeLocatif;
  readonly tmiPct: number;
  readonly regimeSocial: RegimeSocialDuCedant;
  readonly taxeFonciereAnnuelle: Cents;
  /**
   * Charges d'exploitation annuelles, TOUT compris : copropriété entière,
   * énergie, eau, accès internet, consommables. En courte durée, rien n'est
   * récupérable — le propriétaire paie tout.
   */
  readonly chargesExploitationAnnuelles: Cents;
  readonly assurancePnoAnnuelle: Cents;
  /** Ameublement et équipement initial. Décaissé l'année 1, amorti au réel. */
  readonly ameublementInitial: Cents;
  /** En % de `valeurInitiale`, par an. À défaut : hypothèse de marché. */
  readonly provisionTravauxPctAnnuel?: number;
  /** Commission de plateforme, en % des revenus bruts. À défaut : hypothèse. */
  readonly commissionPlateformePctRevenus?: number;
  /** Conciergerie, en % des revenus bruts. À défaut : hypothèse. Zéro : gestion en direct. */
  readonly conciergeriePctRevenus?: number;
  /** Dotation annuelle du bâti au réel, en % de la part amortissable. À défaut : hypothèse. */
  readonly amortissementAnnuelPct?: number;
  /** Part amortissable du bien, en %. À défaut : hypothèse. */
  readonly partAmortissableDuBienPct?: number;
  /** Durée d'amortissement du mobilier, en années. À défaut : hypothèse. */
  readonly amortissementMobilierAnnees?: number;
  /** Surcharge partielle des indexations. Le tarif suit l'indexation du loyer. */
  readonly indexations?: Partial<IndexationsDetention>;
  readonly commissionAgencePct?: number;
  readonly fraisAcquisition: ModeMajoration;
  readonly travaux: ModeMajoration;
  readonly autresFraisDeCession?: Cents;
  readonly hypotheses?: MarketAssumptions;
  readonly params?: FiscalParams;
}

/* ── Sortie ───────────────────────────────────────────────────────────────── */

/** Une année d'exploitation, poste par poste. Tous les montants sont absolus. */
export interface AnneeCourteDuree {
  readonly annee: number;
  /** **+** Tarif indexé × 365 nuits × taux d'occupation. */
  readonly revenusBruts: Cents;
  /** **−** Commission de plateforme. */
  readonly commissionPlateforme: Cents;
  /** **−** Honoraires de conciergerie. */
  readonly conciergerie: Cents;
  /** **−** Charges d'exploitation, taxe foncière, PNO, provision travaux. */
  readonly chargesProprietaire: Cents;
  /** **−** Ameublement initial. Non nul la première année seulement. */
  readonly ameublement: Cents;
  /** **−** Échéances de crédit de l'année, assurance comprise. */
  readonly mensualites: Cents;
  /** Part d'intérêts et d'assurance des échéances — déductible au réel. */
  readonly interetsEtAssurance: Cents;
  readonly impot: ImpotAnneeLocative;
  /** Revenus − commission − conciergerie − charges − ameublement − mensualités − impôt. */
  readonly fluxNet: Cents;
  readonly cumulFluxNet: Cents;
}

export interface TotauxCourteDuree {
  readonly revenusBruts: Cents;
  readonly commissionPlateforme: Cents;
  readonly conciergerie: Cents;
  readonly chargesProprietaire: Cents;
  readonly ameublement: Cents;
  readonly mensualites: Cents;
  readonly impots: Cents;
  readonly fluxNet: Cents;
}

export interface ParametresCourteDuree {
  readonly tauxOccupationPct: number;
  readonly commissionPlateformePctRevenus: number;
  readonly conciergeriePctRevenus: number;
  readonly provisionTravauxPctAnnuel: number;
  readonly indexations: IndexationsDetention;
  /** Présents au réel meublé seulement. */
  readonly amortissementAnnuelPct: number | null;
  readonly partAmortissableDuBienPct: number | null;
  readonly amortissementMobilierAnnees: number | null;
  readonly releveHypotheses: string;
  readonly millesimeFiscal: string;
}

export interface LocationCourteDuree {
  readonly moisMiseEnLocation: number;
  readonly horizonCessionMois: number;
  readonly annees: readonly AnneeCourteDuree[];
  readonly totaux: TotauxCourteDuree;
  /**
   * Les amortissements au réel, bâti et mobilier séparés — parce qu'à la
   * revente, seul le bâti minore le prix d'acquisition.
   */
  readonly amortissements: {
    readonly dotationBatiAnnuelle: Cents;
    readonly dotationMobilierTotale: Cents;
    readonly deduitsCumules: Cents;
    /** Part des déductions imputée au bâti — celle qui se réintègre. */
    readonly batiDeduitsCumules: Cents;
    readonly reporteRestant: Cents;
  };
  readonly cession: CessionChiffree;
  readonly parametres: ParametresCourteDuree;
  readonly reserves: readonly Reserve[];
}

/* ── Réserves ─────────────────────────────────────────────────────────────── */

const RESERVES_COURTE_DUREE = {
  saisonnalite:
    "Le taux d'occupation et le tarif sont tenus constants sur l'année — hors indexation " +
    "annuelle — quand la réalité est saisonnière : le résultat est une moyenne, pas un " +
    "calendrier.",
  reglementationLocale:
    "La réglementation locale n'est pas modélisée : autorisation de changement d'usage, " +
    "enregistrement, limite des cent vingt nuits pour une résidence principale, quotas de " +
    "certaines communes. Elle peut interdire ce que ce calcul chiffre.",
  taxeDeSejour:
    "La taxe de séjour, collectée auprès du voyageur et reversée, est réputée neutre et " +
    "n'apparaît pas. La cotisation foncière des entreprises, elle, est due et non calculée.",
  tvaParaHoteliere:
    "Les prestations para-hôtelières — petit-déjeuner, ménage quotidien, linge, accueil — " +
    "peuvent rendre l'activité assujettie à la TVA : non modélisé.",
  mobilierHorsReintegration:
    "Seul l'amortissement du bâti minore le prix d'acquisition à la revente (art. 150 VB, " +
    "III) : le mobilier a son propre sort, et sa revente éventuelle n'est pas modélisée. " +
    "Quand le plafond de l'art. 39 C n'a pas tout laissé déduire, la part déduite est " +
    "réputée s'imputer d'abord sur le bâti — convention prudente, qui majore l'impôt de " +
    "revente plutôt que de le minorer.",
  exonerationPerdue:
    "Exploité en meublé de tourisme, le bien n'est pas la résidence principale du cédant : " +
    "la plus-value de la revente est imposée sur toute la durée de détention — les " +
    "abattements, eux, courent depuis l'acquisition.",
  bienEtCedantFixes:
    "Le bien est bâti et le cédant une personne physique : la revente est chiffrée dans ce " +
    "cadre, comme le reste du module.",
  provisionDeductible:
    "Au régime réel, la provision pour travaux tient lieu de dépenses d'entretien " +
    "déductibles. L'administration, elle, ne déduit que des dépenses réellement payées.",
} as const;

/* ── Calcul ───────────────────────────────────────────────────────────────── */

function exigerEntierAuMoinsUn(valeur: number, contexte: string): number {
  if (!Number.isInteger(valeur) || valeur < 1) {
    throw new RangeError(`${contexte} : entier supérieur ou égal à 1 attendu, reçu ${valeur}`);
  }
  return valeur;
}

function exigerMontantPositifOuNul(valeur: Cents, contexte: string): Cents {
  assertSafe(valeur, contexte);
  if (valeur < 0) throw new RangeError(`${contexte} : montant négatif`);
  return valeur;
}

/**
 * Projette l'exploitation en courte durée, puis la revente.
 *
 * Fonction pure. Lève `RangeError` hors domaine — dont tout régime qui n'est
 * pas un meublé : la courte durée se loue meublée, et la longue durée a son
 * propre scénario (`ENG-029`).
 */
export function projeterLocationCourteDuree(
  entree: EntreeLocationCourteDuree,
): LocationCourteDuree {
  const params = entree.params ?? PARAMS_2026;
  const marche = entree.hypotheses ?? MARKET_2026;

  /* ── Domaine ───────────────────────────────────────────────────────────── */

  const moisMiseEnLocation = exigerEntierAuMoinsUn(entree.moisMiseEnLocation, "mois de mise en location");
  const dureeAnnees = exigerEntierAuMoinsUn(entree.dureeLocationAnnees, "durée d'exploitation en années");
  const tarifNuitee = exigerMontantPositifOuNul(entree.tarifNuitee, "tarif par nuit");
  const valeurInitiale = exigerMontantPositifOuNul(entree.valeurInitiale, "valeur initiale");
  const taxeFonciere = exigerMontantPositifOuNul(entree.taxeFonciereAnnuelle, "taxe foncière annuelle");
  const chargesExploitation = exigerMontantPositifOuNul(
    entree.chargesExploitationAnnuelles,
    "charges d'exploitation annuelles",
  );
  const pno = exigerMontantPositifOuNul(entree.assurancePnoAnnuelle, "assurance propriétaire non occupant");
  const ameublement = exigerMontantPositifOuNul(entree.ameublementInitial, "ameublement initial");

  if (!Number.isFinite(entree.tauxOccupationPct) || entree.tauxOccupationPct < 0 || entree.tauxOccupationPct > 100) {
    throw new RangeError(`taux d'occupation invraisemblable : ${entree.tauxOccupationPct} %`);
  }

  const regimeAdmis =
    entree.regime.type === "reel-meuble" ||
    (entree.regime.type === "micro-bic" && entree.regime.categorie !== "longue-duree");
  if (!regimeAdmis) {
    throw new RangeError(
      "la courte durée se loue meublée, en meublé de tourisme au micro ou au réel — la " +
        "location nue et la longue durée ont leurs propres régimes (ENG-013, ENG-029)",
    );
  }

  /* ── Hypothèses retenues ───────────────────────────────────────────────── */

  const commissionPct =
    entree.commissionPlateformePctRevenus ?? marche.location.commissionPlateformePctRevenus.valeur;
  const conciergeriePct =
    entree.conciergeriePctRevenus ?? marche.location.conciergeriePctRevenus.valeur;
  const provisionPct =
    entree.provisionTravauxPctAnnuel ?? marche.detention.provisionTravauxPctAnnuel.valeur;
  const indexations: IndexationsDetention = {
    loyerPctAnnuel:
      entree.indexations?.loyerPctAnnuel ?? marche.detention.indexationLoyerPctAnnuel.valeur,
    taxeFoncierePctAnnuel:
      entree.indexations?.taxeFoncierePctAnnuel ??
      marche.detention.indexationTaxeFoncierePctAnnuel.valeur,
    chargesPctAnnuel:
      entree.indexations?.chargesPctAnnuel ?? marche.detention.indexationChargesPctAnnuel.valeur,
  };

  const auReel = entree.regime.type === "reel-meuble";
  const tauxAmortissement =
    entree.amortissementAnnuelPct ?? marche.location.amortissementAnnuelPct.valeur;
  const partAmortissable =
    entree.partAmortissableDuBienPct ?? marche.location.partAmortissableDuBienPct.valeur;
  const mobilierAnnees = exigerEntierAuMoinsUn(
    entree.amortissementMobilierAnnees ?? marche.location.amortissementMobilierAnnees.valeur,
    "durée d'amortissement du mobilier",
  );

  const valeurVenaleMiseEnLocation = valeurAppreciee(
    valeurInitiale,
    entree.appreciationAnnuellePct,
    moisMiseEnLocation - 1,
  );
  const dotationBati = auReel
    ? applyPct(applyPct(valeurVenaleMiseEnLocation, partAmortissable), tauxAmortissement)
    : 0;

  /**
   * Dotation mobilier de l'année `k`, par différence de cumuls arrondis : la
   * somme des dotations vaut EXACTEMENT l'ameublement au terme — même
   * discipline que la dernière échéance d'un prêt, qui solde.
   */
  const dotationMobilier = (k: number): Cents => {
    if (!auReel || k > mobilierAnnees) return 0;
    const cumul = (n: number): Cents => roundCents((ameublement * n) / mobilierAnnees);
    return cumul(k) - cumul(k - 1);
  };

  const anneesAvantLocation = Math.floor((moisMiseEnLocation - 1) / 12);
  const rows = entree.credit?.plan.rows ?? [];

  /* ── La série annuelle ─────────────────────────────────────────────────── */

  const annees: AnneeCourteDuree[] = [];
  let amortissementReporte: Cents = 0;
  let deduitsCumules: Cents = 0;
  let dotationBatiCumulee: Cents = 0;
  let dotationMobilierTotale: Cents = 0;
  let cumulFluxNet: Cents = 0;

  for (let k = 1; k <= dureeAnnees; k += 1) {
    const derive = anneesAvantLocation + k - 1;

    // 365 nuits par an — l'année bissextile n'ajoute pas une nuit qui compte.
    const tarifIndexe = indexe(tarifNuitee, indexations.loyerPctAnnuel, k - 1);
    const revenusBruts = applyPct(365 * tarifIndexe, entree.tauxOccupationPct);
    const commissionPlateforme = applyPct(revenusBruts, commissionPct);
    const conciergerie = applyPct(revenusBruts, conciergeriePct);

    const taxe = indexe(taxeFonciere, indexations.taxeFoncierePctAnnuel, derive);
    const exploitation = indexe(chargesExploitation, indexations.chargesPctAnnuel, derive);
    const assurancePno = indexe(pno, indexations.chargesPctAnnuel, derive);
    const provision = indexe(applyPct(valeurInitiale, provisionPct), indexations.chargesPctAnnuel, derive);
    const chargesProprietaire = taxe + exploitation + assurancePno + provision;

    const premierMois = moisMiseEnLocation + (k - 1) * 12;
    const dernierMois = premierMois + 11;
    let mensualites: Cents = 0;
    let interetsEtAssurance: Cents = 0;
    for (const row of rows) {
      if (row.month >= premierMois && row.month <= dernierMois) {
        mensualites += row.payment;
        interetsEtAssurance += row.interest + row.insurance;
      }
    }

    const dotationDeLAnnee = dotationBati + dotationMobilier(k);
    dotationBatiCumulee += dotationBati;
    dotationMobilierTotale += dotationMobilier(k);

    const impot = calculerImpotLocatif({
      regime: entree.regime,
      recettesAnnuelles: revenusBruts,
      chargesDeductiblesAnnuelles:
        commissionPlateforme + conciergerie + chargesProprietaire,
      interetsEmpruntAnnuels: interetsEtAssurance,
      amortissementAnnuel: dotationDeLAnnee,
      tmiPct: entree.tmiPct,
      amortissementAnterieurReporte: amortissementReporte,
      params,
    });

    amortissementReporte = impot.amortissementReporte;
    deduitsCumules += impot.amortissementDeduit;

    const ameublementDeLAnnee = k === 1 ? ameublement : 0;
    const fluxNet =
      revenusBruts -
      commissionPlateforme -
      conciergerie -
      chargesProprietaire -
      ameublementDeLAnnee -
      mensualites -
      impot.impotTotal;
    cumulFluxNet += fluxNet;

    annees.push({
      annee: k,
      revenusBruts,
      commissionPlateforme,
      conciergerie,
      chargesProprietaire,
      ameublement: ameublementDeLAnnee,
      mensualites,
      interetsEtAssurance,
      impot,
      fluxNet,
      cumulFluxNet,
    });
  }

  // Seul le bâti se réintègre, et les déductions lui sont imputées d'abord —
  // la convention prudente annoncée en tête de fichier.
  const batiDeduitsCumules = Math.min(deduitsCumules, dotationBatiCumulee);

  /* ── La revente ────────────────────────────────────────────────────────── */

  const horizonCessionMois = moisMiseEnLocation - 1 + 12 * dureeAnnees;

  const cession = chiffrerCession(
    {
      vente: {
        horizonMois: horizonCessionMois,
        valeurInitiale,
        appreciationAnnuellePct: entree.appreciationAnnuellePct,
        ...(entree.commissionAgencePct !== undefined
          ? { commissionAgencePct: entree.commissionAgencePct }
          : {}),
        ...(entree.credit !== undefined ? { credit: entree.credit } : {}),
        hypotheses: marche,
      },
      regime: {
        nature: "imposable",
        natureDuBien: "immeuble-bati",
        qualiteDuCedant: "personne-physique",
        regimeSocial: entree.regimeSocial,
        fraisAcquisition: entree.fraisAcquisition,
        travaux: entree.travaux,
        ...(batiDeduitsCumules > 0 ? { amortissementsDeduits: batiDeduitsCumules } : {}),
      },
      ...(entree.autresFraisDeCession !== undefined
        ? { autresFraisDeCession: entree.autresFraisDeCession }
        : {}),
    },
    params,
  );

  /* ── Totaux et réserves ────────────────────────────────────────────────── */

  const totaux: TotauxCourteDuree = {
    revenusBruts: annees.reduce((s, a) => s + a.revenusBruts, 0),
    commissionPlateforme: annees.reduce((s, a) => s + a.commissionPlateforme, 0),
    conciergerie: annees.reduce((s, a) => s + a.conciergerie, 0),
    chargesProprietaire: annees.reduce((s, a) => s + a.chargesProprietaire, 0),
    ameublement,
    mensualites: annees.reduce((s, a) => s + a.mensualites, 0),
    impots: annees.reduce((s, a) => s + a.impot.impotTotal, 0),
    fluxNet: cumulFluxNet,
  };

  const reserves: Reserve[] = [
    { source: "location", texte: RESERVES_COURTE_DUREE.saisonnalite },
    { source: "location", texte: RESERVES_COURTE_DUREE.reglementationLocale },
    { source: "location", texte: RESERVES_COURTE_DUREE.taxeDeSejour },
    { source: "location", texte: RESERVES_COURTE_DUREE.tvaParaHoteliere },
    { source: "location", texte: RESERVES_COURTE_DUREE.exonerationPerdue },
    { source: "location", texte: RESERVES_COURTE_DUREE.bienEtCedantFixes },
  ];
  if (auReel) {
    reserves.push(
      { source: "location", texte: RESERVES_COURTE_DUREE.mobilierHorsReintegration },
      { source: "location", texte: RESERVES_COURTE_DUREE.provisionDeductible },
    );
  }
  const dejaVues = new Set<string>();
  for (const annee of annees) {
    for (const texte of annee.impot.nonModelise) {
      if (!dejaVues.has(texte)) {
        dejaVues.add(texte);
        reserves.push({ source: "location", texte });
      }
    }
  }
  reserves.push(...cession.reserves);

  return {
    moisMiseEnLocation,
    horizonCessionMois,
    annees,
    totaux,
    amortissements: {
      dotationBatiAnnuelle: dotationBati,
      dotationMobilierTotale,
      deduitsCumules,
      batiDeduitsCumules,
      reporteRestant: amortissementReporte,
    },
    cession,
    parametres: {
      tauxOccupationPct: entree.tauxOccupationPct,
      commissionPlateformePctRevenus: commissionPct,
      conciergeriePctRevenus: conciergeriePct,
      provisionTravauxPctAnnuel: provisionPct,
      indexations,
      amortissementAnnuelPct: auReel ? tauxAmortissement : null,
      partAmortissableDuBienPct: auReel ? partAmortissable : null,
      amortissementMobilierAnnees: auReel ? mobilierAnnees : null,
      releveHypotheses: marche.releve,
      millesimeFiscal: params.vintage,
    },
    reserves,
  };
}
