/**
 * SCÉNARIO « LOUER PLUTÔT QUE VENDRE » — la location longue durée, année par
 * année, puis la revente. `ENG-029`.
 *
 * ═══ CE QUE CE FICHIER ASSEMBLE ═══
 *
 * À l'horizon de la comparaison, le propriétaire peut vendre — c'est `ENG-027` —
 * ou garder le bien et le mettre en location. Ce fichier chiffre la seconde
 * branche, comme la spécification l'écrit : « loyers nets de vacance et de
 * gestion, moins les charges, moins la mensualité toujours due, moins l'impôt
 * selon le régime. Revente en fin de période avec plus-value désormais
 * imposable » (`docs/03-spec-domaine.md` §2).
 *
 * Chaque année de location est un pli de `calculerImpotLocatif` (`ENG-013`) :
 * les reports — déficit foncier, amortissement non déduit — circulent d'une
 * année à la suivante ici, et nulle part ailleurs. La revente est un appel à
 * `chiffrerCession` (`ENG-027`) : aucune grandeur de la vente n'est recalculée,
 * et les amortissements déduits pendant la location y entrent en minoration du
 * prix d'acquisition (art. 150 VB, III), cumulés par ce fichier parce qu'il est
 * le seul à les connaître.
 *
 * ═══ LES DEUX ENSEIGNEMENTS QUE LA SORTIE DOIT PORTER ═══
 *
 * **La mensualité est toujours due.** Le loyer encaissé ne remplace pas
 * l'échéance : il s'y ajoute d'un côté quand elle sort de l'autre, et le flux
 * net d'une année de location peut être négatif tant que le crédit court. C'est
 * le fait que le champ `fluxNet` a le droit de montrer en négatif.
 *
 * **La mise en location coûte l'exonération.** Le bien cesse d'être la
 * résidence principale : la plus-value de la revente est imposée sur TOUTE la
 * durée de détention — les abattements courent depuis l'acquisition, mais
 * l'exonération est perdue. Le scénario le dit dans ses réserves plutôt que de
 * le laisser découvrir dans le chiffre.
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

/* ── Entrée ───────────────────────────────────────────────────────────────── */

export interface EntreeLocationLongueDuree {
  /**
   * Crédit en cours, décrit une seule fois : la série y lit les échéances et la
   * part d'intérêts, la cession y lit le capital restant dû, l'indemnité et la
   * garantie. Absent pour un achat comptant.
   */
  readonly credit?: CreditReprisPourVente;
  /** Premier mois de location, compté depuis le déblocage des fonds, à partir de 1. */
  readonly moisMiseEnLocation: number;
  /** Durée de la mise en location, en années entières. La revente suit la dernière. */
  readonly dureeLocationAnnees: number;
  /**
   * Loyer mensuel de marché du bien, HORS charges récupérables, au premier mois
   * de location. Il est ensuite indexé chaque année de location.
   */
  readonly loyerMensuelMarche: Cents;
  /** Valeur du bien au déblocage — assiette de l'appréciation et de la plus-value. */
  readonly valeurInitiale: Cents;
  /**
   * Appréciation annuelle, en %. Obligatoire et sans défaut, comme partout :
   * une valeur par défaut serait une prévision de marché.
   */
  readonly appreciationAnnuellePct: number;
  /** Régime fiscal de la location. Les catégories de tourisme sont refusées ici. */
  readonly regime: RegimeLocatif;
  /** Taux marginal d'imposition du foyer, en %. */
  readonly tmiPct: number;
  /** Commande le taux des prélèvements sociaux de la plus-value — `ENG-016`. */
  readonly regimeSocial: RegimeSocialDuCedant;
  /** Montants annuels au déblocage ; ils dérivent ensuite avec leur indexation. */
  readonly taxeFonciereAnnuelle: Cents;
  /** Charges de copropriété NON récupérables sur le locataire. */
  readonly chargesCoproprieteAnnuelles: Cents;
  /** Assurance propriétaire non occupant. */
  readonly assurancePnoAnnuelle: Cents;
  /** En % de `valeurInitiale`, par an. À défaut : hypothèse de marché. */
  readonly provisionTravauxPctAnnuel?: number;
  /** Loyers perdus entre deux locataires, en % des loyers. À défaut : hypothèse. */
  readonly vacanceLocativePctLoyers?: number;
  /** Honoraires de gestion, en % des loyers encaissés. À défaut : hypothèse. */
  readonly fraisGestionPctLoyers?: number;
  /** Dotation annuelle du réel meublé, en % de la part amortissable. À défaut : hypothèse. */
  readonly amortissementAnnuelPct?: number;
  /** Part amortissable du bien, en %. À défaut : hypothèse. */
  readonly partAmortissableDuBienPct?: number;
  /** Surcharge partielle des indexations. Les champs absents viennent du marché. */
  readonly indexations?: Partial<IndexationsDetention>;
  /** Commission d'agence à la revente. À défaut : hypothèse de marché. */
  readonly commissionAgencePct?: number;
  /** Majoration du prix d'acquisition — frais réels ou forfait de 7,5 %. */
  readonly fraisAcquisition: ModeMajoration;
  /** Majoration travaux — réels ou forfait de 15 % après cinq ans. */
  readonly travaux: ModeMajoration;
  /** Frais de cession autres que commission et mainlevée. Défaut zéro. */
  readonly autresFraisDeCession?: Cents;
  readonly hypotheses?: MarketAssumptions;
  readonly params?: FiscalParams;
}

/* ── Sortie ───────────────────────────────────────────────────────────────── */

/** Une année de location, poste par poste. Tous les montants sont absolus. */
export interface AnneeDeLocation {
  /** Rang dans la location, à partir de 1. */
  readonly annee: number;
  /** **+** Douze loyers de l'année, avant vacance. */
  readonly loyersBruts: Cents;
  /** **−** Loyers perdus entre deux locataires. */
  readonly vacance: Cents;
  /** **+** `loyersBruts − vacance` : ce qui est réellement encaissé, et imposé. */
  readonly loyersEncaisses: Cents;
  /** **−** Honoraires de gestion, assis sur les loyers encaissés. */
  readonly fraisGestion: Cents;
  /** **−** Taxe foncière, copropriété non récupérable, assurance PNO, provision travaux. */
  readonly chargesProprietaire: Cents;
  /** **−** Échéances de crédit de l'année, assurance comprise. La mensualité toujours due. */
  readonly mensualites: Cents;
  /** Part d'intérêts et d'assurance des échéances — la part déductible au réel. */
  readonly interetsEtAssurance: Cents;
  /** L'impôt de l'année, tel qu'`ENG-013` l'a rendu — alertes et réserves comprises. */
  readonly impot: ImpotAnneeLocative;
  /** `loyersEncaisses − fraisGestion − chargesProprietaire − mensualites − impôt`. Peut être négatif. */
  readonly fluxNet: Cents;
  readonly cumulFluxNet: Cents;
}

export interface TotauxLocation {
  readonly loyersBruts: Cents;
  readonly vacance: Cents;
  readonly loyersEncaisses: Cents;
  readonly fraisGestion: Cents;
  readonly chargesProprietaire: Cents;
  readonly mensualites: Cents;
  readonly impots: Cents;
  readonly fluxNet: Cents;
}

/** Paramètres effectivement retenus, pour que l'interface puisse les afficher. */
export interface ParametresLocation {
  readonly vacanceLocativePctLoyers: number;
  readonly fraisGestionPctLoyers: number;
  readonly provisionTravauxPctAnnuel: number;
  readonly indexations: IndexationsDetention;
  /** Présents au réel meublé seulement. */
  readonly amortissementAnnuelPct: number | null;
  readonly partAmortissableDuBienPct: number | null;
  readonly releveHypotheses: string;
  readonly millesimeFiscal: string;
}

export interface LocationLongueDuree {
  readonly moisMiseEnLocation: number;
  /** Mois de la revente, depuis le déblocage : `moisMiseEnLocation − 1 + 12 × années`. */
  readonly horizonCessionMois: number;
  readonly annees: readonly AnneeDeLocation[];
  readonly totaux: TotauxLocation;
  /**
   * Ce que la location laisse derrière elle au moment de vendre : les
   * amortissements effectivement déduits — ils minorent le prix d'acquisition
   * dans la cession ci-dessous — et les reports que la fin de la location rend
   * caducs pour ce calcul.
   */
  readonly amortissements: {
    readonly dotationAnnuelle: Cents;
    readonly deduitsCumules: Cents;
    readonly reporteRestant: Cents;
  };
  readonly deficitFoncierRestant: Cents;
  /** La revente, chiffrée par `ENG-027`, impôt de plus-value compris. */
  readonly cession: CessionChiffree;
  readonly parametres: ParametresLocation;
  /** Les réserves du scénario, puis celles de l'impôt, puis celles de la cession. */
  readonly reserves: readonly Reserve[];
}

/* ── Réserves ─────────────────────────────────────────────────────────────── */

const RESERVES_LOCATION = {
  chargesRecuperables:
    "Les loyers sont comptés hors charges récupérables, et seules les charges de copropriété " +
    "non récupérables entrent dans les dépenses : ce que le locataire rembourse n'apparaît " +
    "d'aucun côté.",
  provisionDeductible:
    "Au régime réel, la provision pour travaux tient lieu de dépenses d'entretien " +
    "déductibles. L'administration, elle, ne déduit que des dépenses réellement payées : " +
    "l'impôt d'une année à gros travaux s'écarte de cette moyenne.",
  miseEnLocationNonModelisee:
    "Les honoraires de mise en location, la garantie loyers impayés et les impayés " +
    "eux-mêmes ne sont pas modélisés.",
  exonerationPerdue:
    "Mis en location, le bien cesse d'être la résidence principale : l'exonération de " +
    "plus-value est perdue, et la revente est imposée sur toute la durée de détention — " +
    "les abattements, eux, courent depuis l'acquisition.",
  assietteAmortissement:
    "L'assiette de l'amortissement est la valeur vénale estimée à la mise en location — la " +
    "valeur initiale appréciée jusque-là —, convention de praticien qu'aucun texte ne publie.",
  bienEtCedantFixes:
    "Le bien est bâti et le cédant une personne physique : la revente est chiffrée dans ce " +
    "cadre, comme le reste du module.",
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

/** Montant dérivé de `annees` pas d'indexation annuelle. Partagé avec `ENG-015`. */
export function indexe(montant: Cents, pctAnnuel: number, annees: number): Cents {
  if (annees <= 0 || pctAnnuel === 0) return montant;
  const facteur = Math.pow(1 + pctAnnuel / 100, annees);
  return roundCents(montant * facteur);
}

/**
 * Projette la mise en location longue durée, puis la revente.
 *
 * Fonction pure. Lève `RangeError` sur une entrée hors domaine — dont un régime
 * de meublé de tourisme, qui décrit une location de courte durée (`ENG-015`) et
 * n'a rien à faire ici. Propage `ForfaitHorsChampError` si un forfait est
 * demandé pour une situation qui ne l'ouvre pas, comme `ENG-027`.
 */
export function projeterLocationLongueDuree(entree: EntreeLocationLongueDuree): LocationLongueDuree {
  const params = entree.params ?? PARAMS_2026;
  const marche = entree.hypotheses ?? MARKET_2026;

  /* ── Domaine ───────────────────────────────────────────────────────────── */

  const moisMiseEnLocation = exigerEntierAuMoinsUn(entree.moisMiseEnLocation, "mois de mise en location");
  const dureeAnnees = exigerEntierAuMoinsUn(entree.dureeLocationAnnees, "durée de location en années");
  const loyerMensuel = exigerMontantPositifOuNul(entree.loyerMensuelMarche, "loyer mensuel de marché");
  const valeurInitiale = exigerMontantPositifOuNul(entree.valeurInitiale, "valeur initiale");
  const taxeFonciere = exigerMontantPositifOuNul(entree.taxeFonciereAnnuelle, "taxe foncière annuelle");
  const copropriete = exigerMontantPositifOuNul(
    entree.chargesCoproprieteAnnuelles,
    "charges de copropriété annuelles",
  );
  const pno = exigerMontantPositifOuNul(entree.assurancePnoAnnuelle, "assurance propriétaire non occupant");

  if (entree.regime.type === "micro-bic" && entree.regime.categorie !== "longue-duree") {
    throw new RangeError(
      "un scénario de location longue durée ne relève pas des catégories de meublé de tourisme — " +
        "voir le scénario de courte durée (ENG-015)",
    );
  }

  /* ── Hypothèses retenues ───────────────────────────────────────────────── */

  const vacancePct = entree.vacanceLocativePctLoyers ?? marche.location.vacanceLocativePctLoyers.valeur;
  const gestionPct = entree.fraisGestionPctLoyers ?? marche.location.fraisGestionPctLoyers.valeur;
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

  const auReelMeuble = entree.regime.type === "reel-meuble";
  const tauxAmortissement =
    entree.amortissementAnnuelPct ?? marche.location.amortissementAnnuelPct.valeur;
  const partAmortissable =
    entree.partAmortissableDuBienPct ?? marche.location.partAmortissableDuBienPct.valeur;

  // Assiette de l'amortissement : la valeur vénale au premier jour de la
  // location — la valeur initiale appréciée jusque-là. Convention déclarée
  // dans les réserves.
  const valeurVenaleMiseEnLocation = valeurAppreciee(
    valeurInitiale,
    entree.appreciationAnnuellePct,
    moisMiseEnLocation - 1,
  );
  const dotationAnnuelle = auReelMeuble
    ? applyPct(applyPct(valeurVenaleMiseEnLocation, partAmortissable), tauxAmortissement)
    : 0;

  // Les montants annuels sont saisis au déblocage ; à la mise en location, ils
  // ont déjà dérivé. Même pas annuel que la comparaison de détention.
  const anneesAvantLocation = Math.floor((moisMiseEnLocation - 1) / 12);

  const rows = entree.credit?.plan.rows ?? [];

  /* ── La série annuelle ─────────────────────────────────────────────────── */

  const annees: AnneeDeLocation[] = [];
  let deficitReporte: Cents = 0;
  let amortissementReporte: Cents = 0;
  let amortissementsDeduitsCumules: Cents = 0;
  let cumulFluxNet: Cents = 0;

  for (let k = 1; k <= dureeAnnees; k += 1) {
    const derive = anneesAvantLocation + k - 1;

    const loyersBruts = indexe(12 * loyerMensuel, indexations.loyerPctAnnuel, k - 1);
    const vacance = applyPct(loyersBruts, vacancePct);
    const loyersEncaisses = loyersBruts - vacance;
    const fraisGestion = applyPct(loyersEncaisses, gestionPct);

    const taxe = indexe(taxeFonciere, indexations.taxeFoncierePctAnnuel, derive);
    const copro = indexe(copropriete, indexations.chargesPctAnnuel, derive);
    const assurancePno = indexe(pno, indexations.chargesPctAnnuel, derive);
    const provision = indexe(applyPct(valeurInitiale, provisionPct), indexations.chargesPctAnnuel, derive);
    const chargesProprietaire = taxe + copro + assurancePno + provision;

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

    const impot = calculerImpotLocatif({
      regime: entree.regime,
      recettesAnnuelles: loyersEncaisses,
      chargesDeductiblesAnnuelles: fraisGestion + chargesProprietaire,
      interetsEmpruntAnnuels: interetsEtAssurance,
      amortissementAnnuel: dotationAnnuelle,
      tmiPct: entree.tmiPct,
      deficitFoncierAnterieur: deficitReporte,
      amortissementAnterieurReporte: amortissementReporte,
      params,
    });

    deficitReporte = impot.deficitFoncierReporte;
    amortissementReporte = impot.amortissementReporte;
    amortissementsDeduitsCumules += impot.amortissementDeduit;

    const fluxNet =
      loyersEncaisses - fraisGestion - chargesProprietaire - mensualites - impot.impotTotal;
    cumulFluxNet += fluxNet;

    annees.push({
      annee: k,
      loyersBruts,
      vacance,
      loyersEncaisses,
      fraisGestion,
      chargesProprietaire,
      mensualites,
      interetsEtAssurance,
      impot,
      fluxNet,
      cumulFluxNet,
    });
  }

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
        ...(amortissementsDeduitsCumules > 0
          ? { amortissementsDeduits: amortissementsDeduitsCumules }
          : {}),
      },
      ...(entree.autresFraisDeCession !== undefined
        ? { autresFraisDeCession: entree.autresFraisDeCession }
        : {}),
    },
    params,
  );

  /* ── Totaux et réserves ────────────────────────────────────────────────── */

  const totaux: TotauxLocation = {
    loyersBruts: annees.reduce((s, a) => s + a.loyersBruts, 0),
    vacance: annees.reduce((s, a) => s + a.vacance, 0),
    loyersEncaisses: annees.reduce((s, a) => s + a.loyersEncaisses, 0),
    fraisGestion: annees.reduce((s, a) => s + a.fraisGestion, 0),
    chargesProprietaire: annees.reduce((s, a) => s + a.chargesProprietaire, 0),
    mensualites: annees.reduce((s, a) => s + a.mensualites, 0),
    impots: annees.reduce((s, a) => s + a.impot.impotTotal, 0),
    fluxNet: cumulFluxNet,
  };

  const reserves: Reserve[] = [
    { source: "location", texte: RESERVES_LOCATION.chargesRecuperables },
    { source: "location", texte: RESERVES_LOCATION.miseEnLocationNonModelisee },
    { source: "location", texte: RESERVES_LOCATION.exonerationPerdue },
    { source: "location", texte: RESERVES_LOCATION.bienEtCedantFixes },
  ];
  // La provision ne joue fiscalement qu'au réel — au micro, l'abattement
  // forfaitaire l'ignore de toute façon.
  if (entree.regime.type === "reel-nu" || auReelMeuble) {
    reserves.push({ source: "location", texte: RESERVES_LOCATION.provisionDeductible });
  }
  if (auReelMeuble) {
    reserves.push({ source: "location", texte: RESERVES_LOCATION.assietteAmortissement });
  }
  // Les limites que l'impôt annuel a déclarées, une seule fois chacune.
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
      dotationAnnuelle,
      deduitsCumules: amortissementsDeduitsCumules,
      reporteRestant: amortissementReporte,
    },
    deficitFoncierRestant: deficitReporte,
    cession,
    parametres: {
      vacanceLocativePctLoyers: vacancePct,
      fraisGestionPctLoyers: gestionPct,
      provisionTravauxPctAnnuel: provisionPct,
      indexations,
      amortissementAnnuelPct: auReelMeuble ? tauxAmortissement : null,
      partAmortissableDuBienPct: auReelMeuble ? partAmortissable : null,
      releveHypotheses: marche.releve,
      millesimeFiscal: params.vintage,
    },
    reserves,
  };
}
