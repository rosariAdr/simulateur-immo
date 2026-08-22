/**
 * SCÉNARIO DE VENTE À L'HORIZON — `ENG-012`
 *
 * Premier des trois scénarios de sortie du niveau approfondi de
 * « acheter ou louer » : `docs/03-spec-domaine.md` §2.
 *
 *   « Valeur appréciée, moins les frais d'agence, le capital restant dû, les
 *     indemnités de remboursement anticipé et la mainlevée éventuelle, plus la
 *     restitution du fonds de garantie. »
 *
 * ═══ CE QUE CE MODULE PRODUIT, ET POURQUOI CE N'EST PAS UN TOTAL ═══
 *
 * Le produit net d'une vente est un chiffre que personne ne peut vérifier de
 * tête : six postes s'y additionnent, deux dans un sens et quatre dans l'autre,
 * et deux d'entre eux — l'indemnité de remboursement anticipé et la mainlevée —
 * sont ignorés de la plupart des vendeurs jusqu'au décompte du notaire.
 *
 * Le module rend donc **chaque poste séparément**, et le total n'est que leur
 * somme algébrique. L'interface doit pouvoir montrer d'où vient chaque euro
 * retranché ; un seul nombre en sortie rendrait cette pédagogie impossible et
 * ferait exactement ce que le produit existe pour éviter.
 *
 * ═══ CE QU'IL NE RECALCULE PAS ═══
 *
 * Rien de ce qui existe déjà. Le capital restant dû est **lu** dans les lignes
 * d'un `CreditPlan`, jamais réamorti. La mainlevée et la restitution du fonds
 * mutuel sortent du `GuaranteeCost` que le moteur crédit a construit.
 * L'indemnité de remboursement anticipé est calculée par `prepaymentPenalty`,
 * avec son double plafond légal. Ce fichier compose ; il n'a aucune formule
 * financière qui lui soit propre, hormis la capitalisation de l'appréciation.
 *
 * ═══ LE PRODUIT NET PEUT ÊTRE NÉGATIF ═══
 *
 * Et ce n'est pas une erreur, c'est le résultat. Une vente précoce, un marché
 * qui a reculé, des frais d'agence sur un prix amputé : le vendeur peut devoir
 * apporter de l'argent pour solder son prêt. Aucun plancher n'est posé sur le
 * total. Poser un plancher à zéro reviendrait à cacher le seul cas où le
 * chiffre change une décision.
 *
 * Les postes pris isolément, eux, sont plafonnés à zéro : une commission
 * négative ou une valeur de bien négative n'ont pas de sens et ne diraient rien.
 *
 * ═══ LA FISCALITÉ, ET LA LIGNE QUE CE MODULE NE FRANCHIT PAS ═══
 *
 * Ce module traite **le cas de la résidence principale**, exonéré de plus-value
 * sans condition de durée de détention (CGI, art. 150 U, II, 1°). Le cas
 * imposable — abattements par durée de détention, deux barèmes distincts,
 * surtaxe — est le ticket `ENG-014` et vit dans `plus-value.ts`.
 *
 * `RegimePlusValue` est la place laissée pour lui : une union discriminée dont
 * la branche `imposable` reçoit un **montant déjà calculé**. Ce module ne
 * l'importe pas, ne le devine pas, et ne le met pas à zéro en silence. Voir le
 * commentaire du type.
 *
 * ═══ AUCUNE RECOMMANDATION ═══
 *
 * Le module chiffre une vente à un horizon donné. Il ne dit pas s'il faut
 * vendre, ne compare pas deux horizons, ne désigne aucun moment favorable.
 */

import { type Cents, roundCents, sum } from "../money";
import { MARKET_2026, type MarketAssumptions } from "../assumptions/market";
import type { FiscalParams } from "../fiscal/params";
import type { CreditPlan } from "../credit/plan";
import {
  type ExemptionReason,
  type PrepaymentPenalty,
  prepaymentPenalty,
} from "../credit/constraints";

/* ── Ce que le module lit d'un plan de financement ────────────────────────── */

/**
 * Le strict nécessaire, et rien de plus — même discipline que
 * `EcheancierRepris` dans `types.ts`.
 *
 * Un `CreditPlan` complet satisfait ce type tel quel. Le restreindre ici dit la
 * vérité sur le couplage : **aucune ligne n'est recalculée**, et un test peut
 * fournir un échéancier synthétique sans monter un plan entier.
 *
 * `totalPrincipal` est indispensable au cas de l'horizon zéro : `rows[m − 1]`
 * porte le capital restant dû *après* le mois `m`, et il n'existe donc aucune
 * ligne décrivant l'instant qui précède la première échéance.
 */
export type PlanRepris = Pick<CreditPlan, "rows" | "guarantee" | "totalPrincipal">;

/**
 * Le crédit tel que la vente le solde.
 *
 * `tauxMoyenAnnuelPct` est **obligatoire**. L'article R313-25 plafonne
 * l'indemnité à « un semestre d'intérêt sur le capital remboursé au taux moyen
 * du prêt » : sans ce taux, il n'y a pas de plafond, et une valeur par défaut à
 * zéro annulerait silencieusement l'indemnité. Un champ requis force l'appelant
 * à dire ce qu'il sait plutôt qu'à hériter d'un chiffre faux.
 *
 * Sur un financement à plusieurs lignes — prêt principal et prêt à taux zéro —
 * ce taux est celui, pondéré, que le contrat retient. Le module ne le calcule
 * pas : il ne connaît pas les conventions de pondération de l'établissement.
 */
export interface CreditReprisPourVente {
  readonly plan: PlanRepris;
  /** Taux moyen annuel du prêt, en pourcentage. Sert au plafond « six mois d'intérêts ». */
  readonly tauxMoyenAnnuelPct: number;
  /**
   * Motif d'exonération de plein droit de l'indemnité — mutation professionnelle,
   * décès, cessation forcée d'activité (art. L313-47). Défaut : aucun.
   */
  readonly motifExoneration?: ExemptionReason;
  /** Le contrat renonce contractuellement à l'indemnité. Défaut : non. */
  readonly indemniteContractuellementExclue?: boolean;
}

/* ── Régime de plus-value ─────────────────────────────────────────────────── */

/**
 * ⚠️ LA PLACE LAISSÉE À `ENG-014`.
 *
 * Ce module ne sait calculer qu'une chose en matière de plus-value : **zéro**,
 * parce que la cession d'une résidence principale est exonérée. Tout le reste —
 * prix d'acquisition majoré, deux barèmes d'abattement aux cadences et aux
 * durées d'exonération différentes, surtaxe à dix tranches, taux des
 * prélèvements sociaux selon la résidence fiscale — est le ticket `ENG-014`,
 * écrit dans `plus-value.ts`.
 *
 * D'où cette union discriminée, et non un champ `impot?: Cents` optionnel :
 *
 * - **`residence-principale`** : l'exonération s'applique, l'impôt vaut zéro, et
 *   ce zéro est *calculé* par ce module, pas subi par omission.
 * - **`imposable`** : le montant vient d'ailleurs, entier, et le module se
 *   contente de le retrancher. Il ne l'estime pas, ne le plafonne pas, ne
 *   l'interprète pas.
 *
 * Un champ optionnel aurait confondu les deux cas : « pas d'impôt renseigné » et
 * « pas d'impôt dû » sont deux situations différentes, et la première est un
 * oubli. L'union rend l'oubli impossible à écrire.
 */
export type RegimePlusValue =
  | {
      readonly nature: "residence-principale";
      /**
       * Mois écoulés entre le déménagement et la cession. `undefined` — la valeur
       * par défaut — signifie que le bien est occupé au jour de la cession, cas où
       * l'exonération ne souffre aucune condition de délai.
       */
      readonly moisDepuisDemenagement?: number;
    }
  | {
      readonly nature: "imposable";
      /**
       * Impôt total de plus-value, prélèvements sociaux et surtaxe compris,
       * calculé en amont. Jamais négatif : un impôt négatif n'est pas un
       * remboursement, c'est une erreur de saisie, et le plancher l'absorbe.
       */
      readonly impotTotal: Cents;
      /** D'où vient ce montant, pour que l'interface puisse le tracer. */
      readonly origine?: string;
    };

/**
 * Ce que le module a retenu de l'exonération, et la réserve qui l'accompagne.
 *
 * `delaiNormalMois` est lu dans `fiscal/params.ts` et jamais écrit en dur. Il
 * relève de la **doctrine** — BOFiP, BOI-RFPI-PVI-10-40-10 § 190 — et non d'un
 * seuil opposable : il s'apprécie au cas par cas, selon le marché local, le prix
 * demandé et les diligences du vendeur. Le module le rend pour que l'interface
 * puisse dire cela, jamais pour qu'elle le présente comme une règle.
 */
export interface ExonerationResidencePrincipale {
  /** L'exonération est-elle acquise dans la configuration décrite ? */
  readonly acquise: boolean;
  /** Délai normal de vente retenu par la doctrine, en mois. Vient de `params.ts`. */
  readonly delaiNormalMois: number;
  /** Mois écoulés depuis le déménagement. `null` : bien occupé au jour de la cession. */
  readonly moisDepuisDemenagement: number | null;
  /** Réserve à afficher telle quelle. `null` quand il n'y en a pas. */
  readonly reserve: string | null;
}

/**
 * Réserve inscrite quand le bien a été quitté depuis plus longtemps que le délai
 * normal de vente. Elle constate, elle ne conclut pas : le délai n'étant pas un
 * seuil opposable, le module ne peut ni maintenir l'exonération d'office ni la
 * refuser d'office. Il refuse en revanche d'inventer un impôt qu'il ne sait pas
 * calculer, et renvoie l'appelant vers le régime imposable.
 */
const RESERVE_DELAI_DEPASSE =
  "Le bien a été quitté depuis plus longtemps que le délai normal de vente retenu par la " +
  "doctrine. Ce délai n'est pas un seuil opposable et s'apprécie au cas par cas ; " +
  "l'exonération n'est pour autant plus acquise de plein droit. L'impôt éventuel doit être " +
  "fourni par le régime imposable, que ce module ne calcule pas.";

/* ── Entrée ───────────────────────────────────────────────────────────────── */

export interface EntreeVente {
  /**
   * Horizon de la vente, en mois depuis le déblocage des fonds. Zéro est un
   * horizon valide : il chiffre la revente immédiate, celle qui coûte le plus
   * cher et qu'aucun simulateur ne montre.
   */
  readonly horizonMois: number;
  /** Valeur du bien au départ. Prix payé, ou valeur estimée. */
  readonly valeurInitiale: Cents;
  /**
   * Appréciation annuelle du bien, en pourcentage. **Obligatoire, sans valeur
   * par défaut** : retenir une valeur ici reviendrait à publier une prévision de
   * marché, ce que `docs/CONTEXT.md` §8 interdit. Les ordres de grandeur observés
   * sont exportés par `assumptions/market.ts` — l'interface les propose,
   * l'utilisateur choisit son point, le moteur ne les lit pas.
   *
   * Une valeur négative est parfaitement recevable : les marchés reculent.
   */
  readonly appreciationAnnuellePct: number;
  /**
   * Commission d'agence à la revente, en pourcentage du prix de cession.
   * À défaut : l'hypothèse de marché. Zéro chiffre la vente de particulier à
   * particulier.
   */
  readonly commissionAgencePct?: number;
  /** Crédit à solder. Absent pour un achat comptant : tous ses postes valent alors zéro. */
  readonly credit?: CreditReprisPourVente;
  /** Régime de plus-value. Défaut : résidence principale, bien occupé au jour de la cession. */
  readonly regimePlusValue?: RegimePlusValue;
  /** Hypothèses de marché employées. À défaut : le relevé courant. */
  readonly hypotheses?: MarketAssumptions;
}

/* ── Sortie ───────────────────────────────────────────────────────────────── */

/**
 * Les six postes de la spécification, plus l'impôt, chacun en valeur ABSOLUE.
 *
 * Le signe n'est pas porté par les montants mais par le commentaire de chaque
 * champ et par la formule de `produitNet`. Un poste négatif dans cette structure
 * signalerait une entrée absurde, jamais un sens de flux — et la lecture d'un
 * tableau où certaines lignes sont signées et d'autres pas est la première
 * source d'erreur d'un décompte de vente.
 */
export interface PostesDeVente {
  /** **+** Prix de cession retenu, c'est-à-dire la valeur appréciée. */
  readonly prixDeCession: Cents;
  /** **−** Commission d'agence, assise sur le prix de cession. */
  readonly commissionAgence: Cents;
  /** **−** Capital restant dû à l'horizon, lu dans l'échéancier. */
  readonly capitalRestantDu: Cents;
  /** **−** Indemnité de remboursement anticipé, sous son double plafond légal. */
  readonly indemniteRemboursementAnticipe: Cents;
  /** **−** Mainlevée d'hypothèque. Nulle hors hypothèque, et nulle au terme du prêt. */
  readonly mainlevee: Cents;
  /** **+** Restitution du fonds mutuel de garantie. Nulle hors caution. */
  readonly restitutionFondsGarantie: Cents;
  /** **−** Impôt de plus-value. Nul en résidence principale exonérée. */
  readonly impotPlusValue: Cents;
}

/** Paramètres effectivement retenus, pour que l'interface puisse les afficher. */
export interface ParametresVente {
  readonly appreciationAnnuellePct: number;
  readonly commissionAgencePct: number;
  /** Date du relevé des hypothèses de marché employées. */
  readonly releveHypotheses: string;
  /** Millésime fiscal employé. */
  readonly millesimeFiscal: string;
  /**
   * La vente intervient-elle avant la dernière échéance du prêt ? C'est ce qui
   * déclenche l'indemnité et la mainlevée, et c'est le fait le moins intuitif
   * du décompte.
   */
  readonly avantTermeDuCredit: boolean;
}

export interface ProduitDeVente {
  readonly horizonMois: number;
  readonly valeurInitiale: Cents;
  /** Valeur du bien à l'horizon, appréciation capitalisée. */
  readonly valeurAppreciee: Cents;
  /** `valeurAppreciee − valeurInitiale`. Négatif quand le marché a reculé. */
  readonly appreciationBrute: Cents;
  readonly postes: PostesDeVente;
  /**
   * Somme algébrique des postes. **Peut être négatif**, et c'est alors une
   * information : le vendeur doit apporter cette somme pour solder son prêt.
   */
  readonly produitNet: Cents;
  /**
   * Détail de l'indemnité — quel plafond a mordu, et lequel des deux. `null`
   * quand il n'y a pas de crédit à solder. Pédagogiquement utile à afficher :
   * c'est le poste que les vendeurs découvrent chez le notaire.
   */
  readonly detailIndemnite: PrepaymentPenalty | null;
  readonly exoneration: ExonerationResidencePrincipale;
  readonly parametres: ParametresVente;
}

/* ── Outils ───────────────────────────────────────────────────────────────── */

/** Un poste ne descend pas sous zéro. Le TOTAL, lui, le peut — c'est tout le propos. */
const plancherZero = (v: Cents): Cents => (v > 0 ? v : 0);

/**
 * Valeur du bien après `mois` mois d'appréciation annuelle composée.
 *
 *     valeur = valeurInitiale × (1 + a)^(mois / 12)
 *
 * Un seul arrondi, en fin de calcul. Composer année par année en arrondissant à
 * chaque pas ferait dériver le résultat de plusieurs euros sur vingt ans, et
 * l'exposant fractionnaire est ce qui permet un horizon qui ne tombe pas sur une
 * année pleine.
 *
 * Une appréciation de −100 % ou moins rendrait la base nulle ou négative ; la
 * puissance fractionnaire d'une base négative n'est pas un réel, et le résultat
 * serait `NaN`. Le cas est ramené à zéro : un bien ne vaut pas moins que rien.
 */
export function valeurAppreciee(
  valeurInitiale: Cents,
  appreciationAnnuellePct: number,
  mois: number,
): Cents {
  const base = plancherZero(valeurInitiale);
  if (base === 0) return 0;
  if (mois <= 0 || appreciationAnnuellePct === 0) return base;
  const facteurAnnuel = 1 + appreciationAnnuellePct / 100;
  if (facteurAnnuel <= 0) return 0;
  return plancherZero(roundCents(base * Math.pow(facteurAnnuel, mois / 12)));
}

/**
 * Capital restant dû à l'horizon, LU dans l'échéancier.
 *
 * `rows[m − 1].balance` est le solde *après* la `m`-ième échéance. À l'horizon
 * zéro, aucune échéance n'a été payée et le solde est le capital emprunté :
 * c'est le seul instant que les lignes ne décrivent pas, d'où `totalPrincipal`.
 * Au-delà de la dernière ligne, le prêt est soldé et le solde vaut zéro.
 */
function capitalRestantDu(plan: PlanRepris, horizonMois: number): Cents {
  if (horizonMois <= 0) return plancherZero(plan.totalPrincipal);
  return plancherZero(plan.rows[horizonMois - 1]?.balance ?? 0);
}

/* ── Calcul ───────────────────────────────────────────────────────────────── */

/**
 * Chiffre le produit net d'une vente à un horizon donné, poste par poste.
 *
 * Fonction pure. Elle ne réamortit rien, ne recalcule aucune mensualité, et ne
 * conclut rien sur l'opportunité de vendre.
 */
export function produitDeVente(entree: EntreeVente, p: FiscalParams): ProduitDeVente {
  const horizonMois = Math.max(0, Math.floor(entree.horizonMois));
  const marche = entree.hypotheses ?? MARKET_2026;
  const commissionAgencePct = plancherZero(
    entree.commissionAgencePct ?? marche.vente.commissionAgencePct.valeur,
  );

  const valeurInitiale = plancherZero(entree.valeurInitiale);
  const prixDeCession = valeurAppreciee(
    valeurInitiale,
    entree.appreciationAnnuellePct,
    horizonMois,
  );
  // Un seul arrondi : la commission est assise sur le prix de cession déjà arrondi,
  // qui est celui que l'acte portera et sur lequel l'agence facturera réellement.
  const commissionAgence = plancherZero(roundCents((prixDeCession * commissionAgencePct) / 100));

  /* ── Ce que le crédit prélève ──────────────────────────────────────────── */

  const credit = entree.credit;
  const dureeEcheancier = credit?.plan.rows.length ?? 0;
  // « Avant terme » se lit sur la DURÉE, pas sur le solde. Un solde nul par
  // construction — prêt de capital nul — ne fait pas d'une vente précoce une
  // vente au terme, et c'est bien la sortie anticipée qui déclenche la mainlevée.
  const avantTermeDuCredit = credit !== undefined && horizonMois < dureeEcheancier;

  const crd = credit ? capitalRestantDu(credit.plan, horizonMois) : 0;

  const detailIndemnite: PrepaymentPenalty | null = credit
    ? prepaymentPenalty(
        // La vente solde le prêt : le capital remboursé EST le capital restant dû,
        // et le capital restant dû « avant remboursement » est le même. Les deux
        // plafonds légaux s'appliquent donc à la même assiette.
        crd,
        crd,
        credit.tauxMoyenAnnuelPct,
        p,
        credit.motifExoneration ?? "none",
        credit.indemniteContractuellementExclue ?? false,
      )
    : null;
  // Aucune indemnité n'est due si le prêt est arrivé à son terme : il n'y a plus
  // rien à rembourser par anticipation. Le capital restant dû est alors nul et
  // `prepaymentPenalty` rend zéro de lui-même ; la condition explicite garde le
  // cas où un échéancier mal formé porterait un solde résiduel après sa fin.
  const indemniteRemboursementAnticipe = avantTermeDuCredit
    ? plancherZero(detailIndemnite?.amount ?? 0)
    : 0;

  /* ── Ce que la garantie coûte et rend ──────────────────────────────────── */

  const garantie = credit?.plan.guarantee;

  // Mainlevée : due seulement si la vente précède le terme. Passé la dernière
  // échéance, l'inscription hypothécaire s'éteint d'elle-même et il n'y a pas
  // d'acte de mainlevée à payer. Le moteur crédit a déjà chiffré ce poste — il
  // est nul hors hypothèque — et ce module ne fait que décider s'il est dû.
  const mainlevee = avantTermeDuCredit ? plancherZero(garantie?.releaseCostOnEarlySale ?? 0) : 0;

  // Restitution du fonds mutuel : elle est acquise à l'extinction du prêt, et la
  // vente l'éteint tout autant que sa dernière échéance. Le champ du moteur
  // crédit s'appelle `refundAtTerm` parce que c'est le cas ordinaire ; il n'est
  // nul que pour les garanties qui n'alimentent aucun fonds — hypothèque,
  // nantissement. La part réellement restituée varie selon l'organisme et
  // l'absence d'incident : c'est une hypothèse de marché, déclarée comme telle.
  const restitutionFondsGarantie = plancherZero(garantie?.refundAtTerm ?? 0);

  /* ── Fiscalité ─────────────────────────────────────────────────────────── */

  const regime: RegimePlusValue = entree.regimePlusValue ?? { nature: "residence-principale" };
  const exoneration = evaluerExoneration(regime, p);
  const impotPlusValue =
    regime.nature === "imposable" ? plancherZero(regime.impotTotal) : 0;

  /* ── Décompte ──────────────────────────────────────────────────────────── */

  const postes: PostesDeVente = {
    prixDeCession,
    commissionAgence,
    capitalRestantDu: crd,
    indemniteRemboursementAnticipe,
    mainlevee,
    restitutionFondsGarantie,
    impotPlusValue,
  };

  // Somme algébrique, sans plancher. Le résultat négatif est une sortie légitime.
  const produitNet = sum([
    postes.prixDeCession,
    -postes.commissionAgence,
    -postes.capitalRestantDu,
    -postes.indemniteRemboursementAnticipe,
    -postes.mainlevee,
    postes.restitutionFondsGarantie,
    -postes.impotPlusValue,
  ]);

  return {
    horizonMois,
    valeurInitiale,
    valeurAppreciee: prixDeCession,
    appreciationBrute: prixDeCession - valeurInitiale,
    postes,
    produitNet,
    detailIndemnite,
    exoneration,
    parametres: {
      appreciationAnnuellePct: entree.appreciationAnnuellePct,
      commissionAgencePct,
      releveHypotheses: marche.releve,
      millesimeFiscal: p.vintage,
      avantTermeDuCredit,
    },
  };
}

/**
 * Statut de l'exonération de résidence principale.
 *
 * L'exonération de l'art. 150 U, II, 1° ne pose **aucune condition de durée de
 * détention** — c'est l'idée fausse la plus répandue sur la plus-value
 * immobilière, entretenue par la confusion avec les abattements du régime de
 * droit commun, qui, eux, courent sur vingt-deux et trente ans.
 *
 * La seule réserve porte sur le bien déjà quitté : la doctrine admet
 * l'exonération s'il est cédé dans un « délai normal » de vente. Ce délai est
 * lu dans `params.ts`, et il n'est pas opposable comme un seuil.
 */
function evaluerExoneration(
  regime: RegimePlusValue,
  p: FiscalParams,
): ExonerationResidencePrincipale {
  const delaiNormalMois =
    p.realEstateCapitalGains.mainResidenceExemption.normalSaleDelayMonths;

  if (regime.nature === "imposable") {
    return { acquise: false, delaiNormalMois, moisDepuisDemenagement: null, reserve: null };
  }

  const depuis = regime.moisDepuisDemenagement;
  if (depuis === undefined) {
    // Bien occupé au jour de la cession : le texte s'applique sans réserve.
    return { acquise: true, delaiNormalMois, moisDepuisDemenagement: null, reserve: null };
  }

  const mois = Math.max(0, Math.floor(depuis));
  const dansLeDelai = mois <= delaiNormalMois;
  return {
    acquise: dansLeDelai,
    delaiNormalMois,
    moisDepuisDemenagement: mois,
    reserve: dansLeDelai ? null : RESERVE_DELAI_DEPASSE,
  };
}
