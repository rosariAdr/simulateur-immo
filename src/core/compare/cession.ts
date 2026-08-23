/**
 * ASSEMBLAGE DE LA CESSION — `ENG-027`
 *
 * Le chaînon manquant entre `vente.ts` (`ENG-012`) et `plus-value.ts`
 * (`ENG-014`, `ENG-016`).
 *
 * ═══ LE TROU QUE CE FICHIER BOUCHE ═══
 *
 * `vente.ts` décompose une vente en sept postes et ne sait traiter qu'un seul
 * régime de plus-value : la résidence principale exonérée. Pour le cas
 * imposable, son union `RegimePlusValue` demande un `impotTotal` **déjà
 * calculé**. `plus-value.ts` sait précisément calculer cet impôt. Rien ne
 * reliait les deux, et composer les deux modules à la main laissait à
 * l'appelant quatre occasions de se tromper :
 *
 *   1. saisir deux fois le prix — la valeur appréciée d'un côté, le prix de
 *      cession de l'autre — et les laisser diverger ;
 *   2. saisir une durée de détention sans rapport avec l'horizon de la vente,
 *      donc appliquer les abattements d'une autre opération ;
 *   3. oublier que la commission d'agence et la mainlevée sont **déductibles
 *      du prix de cession** au sens de l'art. 150 VA, III — ou les déduire
 *      deux fois ;
 *   4. construire un jeton de forfait sur une situation, et l'employer dans un
 *      calcul portant sur une autre.
 *
 * Ce module supprime les quatre en supprimant la saisie : aucune de ces
 * grandeurs n'existe dans son entrée. Elles sont **dérivées** de la
 * description unique de la vente, telle que `produitDeVente` l'a normalisée.
 *
 * ═══ RIEN N'EST RECALCULÉ, ET LE PRIX EST PRIS À LA SOURCE ═══
 *
 * Ce fichier n'a **aucune formule financière ni fiscale**. Il appelle
 * `produitDeVente` et `calculerPlusValue`, et se contente de brancher la
 * sortie du premier sur l'entrée du second.
 *
 * D'où deux appels à `produitDeVente` dans le cas imposable, et non un :
 *
 *   PASSE 1   la vente avec un impôt provisoire de zéro. Son seul objet est de
 *             produire le prix de cession, la commission et la mainlevée —
 *             ceux que l'acte portera, arrondis une seule fois.
 *   PASSE 2   la même vente, l'impôt calculé entre-temps mis à sa place.
 *
 * L'alternative aurait été de rappeler `valeurAppreciee` puis de réappliquer le
 * taux de commission ici. Elle réécrit deux calculs qui existent, et deux
 * arrondis avec eux. Un second appel d'une fonction pure ne coûte rien et
 * garantit que le prix soumis à l'impôt est **exactement** celui du décompte.
 *
 * Corollaire vérifié par test : les deux passes ne diffèrent que par
 * `impotPlusValue`. Rien dans la vente ne dépend de l'impôt, et l'impôt ne
 * rétroagit donc pas sur son assiette.
 *
 * ═══ LE CAS EXONÉRÉ EST UN CAS, PAS UN CHEMIN ═══
 *
 * `RegimeDeCession` est une union discriminée, comme `RegimePlusValue` dont
 * elle reprend le mot `nature`. L'appelant décrit une situation — résidence
 * principale, ou bien imposable avec sa nature, la qualité du cédant et son
 * régime social — et n'a jamais à choisir entre deux fonctions. En résidence
 * principale, `plusValue` vaut `null` : aucun impôt n'a été calculé, et ce
 * `null` se distingue d'un zéro qui, lui, aurait été calculé.
 *
 * ═══ LES RÉSERVES REMONTENT, ET ELLES DISENT D'OÙ ELLES VIENNENT ═══
 *
 * Les deux modules signalent ce qu'ils ne savent pas traiter :
 * `ImpositionPlusValue.nonModelise` d'un côté, `ProduitDeVente.exoneration.reserve`
 * de l'autre. Elles ressortent ici dans une liste de `Reserve`, chacune
 * étiquetée de sa provenance — `"vente"`, `"plus-value"` ou `"cession"` pour
 * celles que l'assemblage ajoute lui-même. Ni perdues, ni concaténées en une
 * chaîne que personne ne lira.
 *
 * ═══ AUCUNE RECOMMANDATION ═══
 *
 * Comme `vente.ts` — ADR-014 — ce module chiffre **une** cession à **un**
 * horizon. Il ne compare pas deux horizons, ne désigne aucun moment favorable,
 * et ne dit pas qu'un régime est préférable à un autre. Un appelant qui balaie
 * l'horizon pour tracer une courbe le fait sous sa responsabilité : le maximum
 * de cette courbe n'est pas un conseil de vente.
 */

import type { Cents } from "../money";
import type { FiscalParams } from "../fiscal/params";
import {
  type EntreeVente,
  type ProduitDeVente,
  produitDeVente,
} from "./vente";
import {
  type EntreePlusValue,
  type ImpositionPlusValue,
  type MajorationFraisAcquisition,
  type MajorationTravaux,
  type NatureDuBien,
  type QualiteDuCedant,
  type RegimeSocialDuCedant,
  type SituationDuCedant,
  calculerPlusValue,
  fraisAcquisitionForfaitaires,
  fraisAcquisitionReels,
  travauxForfaitaires,
  travauxReels,
} from "./plus-value";

/* ── Ce que l'appelant choisit encore, et ce qu'il ne choisit plus ────────── */

/**
 * Mode de majoration du prix d'acquisition, **sans jeton**.
 *
 * C'est ici que se joue la propriété que ce module existe pour garantir.
 * `plus-value.ts` n'accepte un forfait qu'au travers d'un jeton non
 * falsifiable, construit par `travauxForfaitaires(situation)` ou
 * `fraisAcquisitionForfaitaires(situation)` — donc **pour une** situation, avec
 * sa durée de détention. Rien n'empêchait d'ouvrir le jeton sur un bien détenu
 * douze ans et de s'en servir dans un calcul portant sur deux ans ; le second
 * verrou de `calculerPlusValue` refuse alors, mais il refuse *après coup*.
 *
 * Ici, l'appelant ne peut pas se tromper de situation parce qu'il n'en fournit
 * aucune : il dit « forfait » ou « réel », et l'assemblage construit le jeton
 * sur la situation qu'il vient lui-même de dériver de l'horizon. Il n'existe
 * aucun champ où glisser un jeton étranger.
 *
 * Conséquence assumée : un forfait hors de son champ **lève**
 * `ForfaitHorsChampError`, exactement comme dans `plus-value.ts` — ADR-013 a
 * tranché contre la retombée silencieuse. L'interface qui laisse choisir le
 * mode doit interroger `situationDeCession` puis les fonctions
 * `motifExclusionForfait…` pour griser l'option, plutôt que de rattraper
 * l'exception. Un appelant qui balaie l'horizon rencontrera ce refus sur les
 * cinq premières années, et c'est le comportement juste : le forfait travaux
 * n'y est pas ouvert.
 */
export type ModeMajoration =
  | { readonly mode: "reel"; readonly montant: Cents }
  | { readonly mode: "forfait" };

/**
 * Régime de la cession. Union discriminée, même discriminant que
 * `RegimePlusValue` dans `vente.ts` : `nature`.
 *
 * Ce qui **n'y figure pas** est aussi important que ce qui y figure. Ni prix de
 * cession, ni prix d'acquisition, ni durée de détention, ni frais de cession,
 * ni millésime fiscal : ces cinq grandeurs sont dérivées, et il n'existe donc
 * aucune place où en écrire une seconde version.
 */
export type RegimeDeCession =
  | {
      readonly nature: "residence-principale";
      /**
       * Mois écoulés entre le déménagement et la cession. Absent — le cas
       * ordinaire — signifie que le bien est occupé au jour de la cession.
       * Transmis tel quel à `vente.ts`, qui en tire le statut de l'exonération.
       */
      readonly moisDepuisDemenagement?: number;
    }
  | {
      readonly nature: "imposable";
      /** Bâti, non bâti ou terrain à bâtir. Commande le forfait travaux et la surtaxe. */
      readonly natureDuBien: NatureDuBien;
      /** Commande l'ouverture du forfait de frais d'acquisition. */
      readonly qualiteDuCedant: QualiteDuCedant;
      /** Commande le taux des prélèvements sociaux — `ENG-016`. */
      readonly regimeSocial: RegimeSocialDuCedant;
      readonly fraisAcquisition: ModeMajoration;
      readonly travaux: ModeMajoration;
    };

/**
 * Description **unique** de la cession.
 *
 * `vente` est repris tel quel de `EntreeVente`, amputé de son seul champ
 * fiscal. Ce n'est pas une commodité d'écriture : reproduire ses champs ici
 * aurait recréé la divergence que le module supprime, et le jour où `vente.ts`
 * en gagne un, `Omit` le fait apparaître sans que personne ait à y penser.
 *
 * ⚠️ `EntreeVente.horizonMois` compte les mois depuis le **déblocage des
 * fonds**, qui est aussi la date d'acquisition : c'est de là que les lignes du
 * plan de financement sont numérotées. Un bien déjà détenu avant le début de la
 * projection est donc hors du domaine de ce module — voir ADR-016.
 */
export interface EntreeCession {
  /** La vente, décrite une fois. Son régime fiscal vit dans `regime`. */
  readonly vente: Omit<EntreeVente, "regimePlusValue">;
  readonly regime: RegimeDeCession;
  /**
   * Frais de cession **autres** que la commission d'agence et la mainlevée, que
   * l'assemblage tire déjà du décompte de vente : diagnostics obligatoires,
   * honoraires d'architecte, indemnité d'éviction. Défaut zéro.
   *
   * Sans effet en résidence principale exonérée, où aucune assiette n'est
   * calculée.
   *
   * @source CGI, art. 150 VA, III, et annexe III, art. 41 duovicies H — liste
   *         limitative des frais admis en diminution du prix de cession.
   */
  readonly autresFraisDeCession?: Cents;
}

/* ── Sortie ───────────────────────────────────────────────────────────────── */

/** D'où vient une réserve. L'appelant doit pouvoir le dire. */
export type SourceDeReserve = "vente" | "plus-value" | "cession";

export interface Reserve {
  readonly source: SourceDeReserve;
  /** Texte français, destiné à être affiché tel quel. */
  readonly texte: string;
}

/**
 * Les frais venus en diminution du prix de cession, poste par poste.
 *
 * Même discipline que `PostesDeVente` : le total n'est que la somme, et
 * l'interface doit pouvoir montrer d'où vient chaque euro. Les deux premiers
 * postes sont **lus** dans le décompte de vente, jamais recalculés.
 *
 * ⚠️ L'indemnité de remboursement anticipé n'y figure pas, et son absence est
 * une décision. La liste de l'art. 41 duovicies H de l'annexe III est
 * limitative et ne la mentionne pas : elle sort du produit du vendeur sans
 * réduire son impôt. C'est précisément le genre de poste qu'un assemblage écrit
 * à la main range du mauvais côté.
 */
export interface FraisDeCessionDeduits {
  /** Commission d'agence, reprise du décompte de vente. */
  readonly commissionAgence: Cents;
  /** Mainlevée d'hypothèque, reprise du décompte de vente. Nulle hors vente anticipée. */
  readonly mainlevee: Cents;
  /** Autres frais saisis par l'appelant. */
  readonly autres: Cents;
  /** Somme des trois. C'est le `fraisDeCession` soumis à `calculerPlusValue`. */
  readonly total: Cents;
}

/**
 * Les grandeurs que l'assemblage a dérivées, rendues pour être vérifiables.
 *
 * Elles ne sont pas là pour décorer : c'est la preuve, lisible par l'appelant
 * comme par un test, que la durée de détention soumise aux abattements est bien
 * l'horizon de la vente et que le prix d'acquisition est bien la valeur
 * initiale. Une sortie qui tairait ces valeurs demanderait de croire le module
 * sur parole.
 */
export interface GrandeursPartagees {
  /** Horizon de la vente, normalisé par `produitDeVente`. */
  readonly horizonMois: number;
  /** Durée de détention soumise aux abattements. **Égale à `horizonMois`.** */
  readonly dureeDetentionMois: number;
  /** Valeur du bien au départ, normalisée par `produitDeVente`. */
  readonly valeurInitiale: Cents;
  /** Prix d'acquisition soumis aux majorations. **Égal à `valeurInitiale`.** */
  readonly prixAcquisition: Cents;
  /** Prix de cession, tel que le décompte de vente l'a arrêté. */
  readonly prixDeCession: Cents;
}

export interface CessionChiffree {
  /**
   * Le décompte de vente complet, impôt de plus-value **inclus** dans ses
   * postes et dans son produit net. C'est la sortie de `vente.ts`, non
   * retouchée.
   */
  readonly produitDeVente: ProduitDeVente;
  /**
   * L'imposition, avec ses deux assiettes. `null` en résidence principale : ce
   * n'est pas un impôt nul, c'est un impôt qui n'a pas eu lieu d'être calculé,
   * et les deux ne se lisent pas pareil.
   */
  readonly plusValue: ImpositionPlusValue | null;
  /** Détail des frais déduits du prix de cession. `null` quand aucune assiette n'est calculée. */
  readonly fraisDeCession: FraisDeCessionDeduits | null;
  /** La situation soumise aux forfaits et aux abattements. `null` en résidence principale. */
  readonly situation: SituationDuCedant | null;
  readonly grandeurs: GrandeursPartagees;
  /** Réserves des deux modules et de l'assemblage. Jamais vide. */
  readonly reserves: readonly Reserve[];
}

/* ── Ce que l'assemblage lui-même ne modélise pas ─────────────────────────── */

/**
 * Réserves propres à l'assemblage, nommées une fois.
 *
 * Elles disent ce que le **branchement** laisse de côté, et non ce que l'un ou
 * l'autre module ignore : ces deux-là ont déjà leurs listes.
 */
export const HORS_MODELE_CESSION = {
  fraisDeCessionComposes:
    "Les frais venus en diminution du prix de cession sont la commission d'agence et la mainlevée reprises du décompte de vente, augmentées des autres frais saisis. L'indemnité de remboursement anticipé n'en fait pas partie : elle réduit le produit du vendeur sans réduire son imposition.",
  commissionALaChargeDuVendeur:
    "La commission d'agence n'est déductible que si le mandat la met à la charge du vendeur. Le décompte de vente la retranche toujours de son produit, et ce calcul la traite donc comme telle.",
  exonerationNonAcquise:
    "L'exonération de résidence principale n'étant plus acquise de plein droit, aucun impôt n'est chiffré ici. Ce module ne bascule pas d'office vers le régime imposable : la nature du bien, la qualité du cédant et son régime social ne sont pas connus dans cette description. Les décrire fait entrer la cession par le régime imposable, qui rend le montant.",
  residencePrincipaleNonVerifiee:
    "L'exonération suppose que le bien constitue la résidence principale effective et habituelle du cédant. Ce point relève des faits et n'est pas vérifié ici. Les dépendances immédiates et nécessaires cédées en même temps suivent le même régime, distinction que ce calcul ne fait pas.",
} as const;

/* ── Dérivation des grandeurs partagées ───────────────────────────────────── */

/**
 * La situation du cédant, **dérivée** de la description de la cession.
 *
 * Exportée pour que l'interface puisse griser un forfait indisponible en
 * interrogeant `motifExclusionForfaitTravaux` ou
 * `motifExclusionForfaitFraisAcquisition`, plutôt que de provoquer une
 * exception pour l'apprendre. C'est la même situation que le calcul emploiera :
 * il n'y en a pas deux.
 *
 * `null` en résidence principale — aucune situation n'est à établir, puisque
 * aucun forfait ni abattement n'entre en jeu.
 *
 * L'horizon est normalisé comme `produitDeVente` le normalise — entier, jamais
 * négatif —, sans quoi un horizon de 60,5 mois ouvrirait ici un forfait que le
 * calcul refuserait ensuite.
 */
export function situationDeCession(entree: EntreeCession): SituationDuCedant | null {
  if (entree.regime.nature === "residence-principale") return null;
  return {
    nature: entree.regime.natureDuBien,
    qualiteDuCedant: entree.regime.qualiteDuCedant,
    dureeDetentionMois: horizonNormalise(entree.vente.horizonMois),
  };
}

/**
 * Même normalisation que `produitDeVente` applique à son horizon.
 *
 * Répétée ici parce que `vente.ts` ne l'expose pas, et vérifiée par un test de
 * propriété qui confronte cette valeur à `ProduitDeVente.horizonMois` sur des
 * tirages aléatoires. C'est le seul endroit du fichier qui refait un geste au
 * lieu de le reprendre ; le calcul, lui, ne s'en sert pas — il lit l'horizon
 * dans la sortie de la passe 1.
 */
function horizonNormalise(horizonMois: number): number {
  return Math.max(0, Math.floor(horizonMois));
}

/** Un poste de frais ne descend pas sous zéro. Même règle que dans `vente.ts`. */
const plancherZero = (v: Cents): Cents => (v > 0 ? v : 0);

/**
 * Transforme un choix de mode en majoration, jeton compris.
 *
 * Le jeton est construit **sur la situation dérivée**, et sur aucune autre. Les
 * deux fonctions appelées lèvent `ForfaitHorsChampError` hors de leur champ,
 * et ce fichier ne rattrape pas : la décision d'ADR-013 vaut aussi ici.
 */
function majorationFrais(
  choix: ModeMajoration,
  situation: SituationDuCedant,
  p: FiscalParams,
): MajorationFraisAcquisition {
  return choix.mode === "reel"
    ? fraisAcquisitionReels(choix.montant)
    : fraisAcquisitionForfaitaires(situation, p);
}

function majorationTravaux(
  choix: ModeMajoration,
  situation: SituationDuCedant,
  p: FiscalParams,
): MajorationTravaux {
  return choix.mode === "reel" ? travauxReels(choix.montant) : travauxForfaitaires(situation, p);
}

/* ── Calcul ───────────────────────────────────────────────────────────────── */

/**
 * Chiffre une cession de bout en bout : le décompte de vente et, s'il y a lieu,
 * l'imposition de la plus-value qui s'en déduit.
 *
 * Fonction pure. Lève `ForfaitHorsChampError` si un forfait est demandé hors de
 * son champ, et `RangeError` sur une entrée hors domaine — les deux viennent de
 * `plus-value.ts` et ne sont pas rattrapées.
 */
export function chiffrerCession(entree: EntreeCession, p: FiscalParams): CessionChiffree {
  const regime = entree.regime;

  /* ── Résidence principale : une seule passe, aucun impôt à calculer ────── */

  if (regime.nature === "residence-principale") {
    const produit = produitDeVente(
      {
        ...entree.vente,
        // `exactOptionalPropertyTypes` est actif : écrire le champ à
        // `undefined` n'est PAS l'omettre, et `vente.ts` distingue les deux —
        // absent veut dire « bien occupé au jour de la cession ».
        regimePlusValue:
          regime.moisDepuisDemenagement === undefined
            ? { nature: "residence-principale" }
            : {
                nature: "residence-principale",
                moisDepuisDemenagement: regime.moisDepuisDemenagement,
              },
      },
      p,
    );

    const reserves: Reserve[] = [
      { source: "cession", texte: HORS_MODELE_CESSION.residencePrincipaleNonVerifiee },
    ];
    // La réserve du délai normal de vente vient de `vente.ts`, et elle est
    // rendue telle qu'il l'a rédigée. L'assemblage y ajoute la sienne : il
    // pourrait calculer l'impôt, il n'a pas de quoi le faire depuis cette
    // description, et il ne bascule pas de régime à la place de l'appelant.
    if (produit.exoneration.reserve !== null) {
      reserves.push({ source: "vente", texte: produit.exoneration.reserve });
      reserves.push({ source: "cession", texte: HORS_MODELE_CESSION.exonerationNonAcquise });
    }

    return {
      produitDeVente: produit,
      plusValue: null,
      fraisDeCession: null,
      situation: null,
      grandeurs: grandeurs(produit, produit.valeurInitiale),
      reserves,
    };
  }

  /* ── Passe 1 : la vente, impôt provisoirement nul ──────────────────────── */

  // Le régime `imposable` avec un impôt de zéro, et non le régime de résidence
  // principale : ce dernier renseignerait `exoneration.acquise` à `true` dans
  // une sortie qu'on jette de toute façon, mais surtout il ferait dépendre la
  // passe 1 d'une branche que le résultat final n'emprunte pas.
  const passe1 = produitDeVente(
    {
      ...entree.vente,
      regimePlusValue: { nature: "imposable", impotTotal: 0, origine: ORIGINE_PROVISOIRE },
    },
    p,
  );

  /* ── Les grandeurs partagées, dérivées de cette passe et d'elle seule ──── */

  // `passe1.horizonMois` et `passe1.valeurInitiale` sont les valeurs NORMALISÉES
  // par `produitDeVente`. Les relire dans `entree.vente` rouvrirait l'écart
  // d'un demi-mois ou d'un montant négatif entre ce que la vente a compté et ce
  // que l'impôt compterait.
  const situation: SituationDuCedant = {
    nature: regime.natureDuBien,
    qualiteDuCedant: regime.qualiteDuCedant,
    dureeDetentionMois: passe1.horizonMois,
  };
  const prixAcquisition = passe1.valeurInitiale;

  const fraisDeCession: FraisDeCessionDeduits = fraisDeduits(
    passe1,
    plancherZero(entree.autresFraisDeCession ?? 0),
  );

  /* ── L'imposition ──────────────────────────────────────────────────────── */

  const entreePlusValue: EntreePlusValue = {
    ...situation,
    prixDeCession: passe1.postes.prixDeCession,
    fraisDeCession: fraisDeCession.total,
    prixAcquisition,
    fraisAcquisition: majorationFrais(regime.fraisAcquisition, situation, p),
    travaux: majorationTravaux(regime.travaux, situation, p),
    regimeSocial: regime.regimeSocial,
    // Le millésime est celui de la vente. Aucun champ de l'entrée ne permet
    // d'en désigner un autre : deux millésimes dans un même décompte
    // produiraient un chiffre qui n'a jamais existé.
    params: p,
  };
  const plusValue = calculerPlusValue(entreePlusValue);

  /* ── Passe 2 : la même vente, l'impôt à sa place ───────────────────────── */

  const produit = produitDeVente(
    {
      ...entree.vente,
      regimePlusValue: {
        nature: "imposable",
        impotTotal: plusValue.total,
        origine: origine(plusValue),
      },
    },
    p,
  );

  const reserves: Reserve[] = [
    { source: "cession", texte: HORS_MODELE_CESSION.fraisDeCessionComposes },
    ...(fraisDeCession.commissionAgence > 0
      ? [{ source: "cession" as const, texte: HORS_MODELE_CESSION.commissionALaChargeDuVendeur }]
      : []),
    ...plusValue.nonModelise.map((texte) => ({ source: "plus-value" as const, texte })),
  ];

  return {
    produitDeVente: produit,
    plusValue,
    fraisDeCession,
    situation,
    grandeurs: grandeurs(produit, prixAcquisition),
    reserves,
  };
}

/* ── Rouages ──────────────────────────────────────────────────────────────── */

/** Origine inscrite dans la sortie de vente de la passe jetée. Ne sort jamais. */
const ORIGINE_PROVISOIRE = "cession.ts — passe provisoire, impôt non encore calculé";

/**
 * Trace du calcul, portée par `RegimePlusValue.origine` jusqu'à l'interface.
 *
 * Le millésime y figure parce que c'est la seule chose qui puisse changer le
 * montant sans que rien d'autre bouge dans la description de la cession.
 */
function origine(plusValue: ImpositionPlusValue): string {
  return `plus-value.ts — calculerPlusValue, millésime ${plusValue.millesime}`;
}

/**
 * Les frais déductibles, **lus** dans les postes de la vente.
 *
 * Aucun des deux montants n'est recalculé : ce sont ceux que le décompte
 * retranche du produit du vendeur, à l'euro et au centime près.
 */
function fraisDeduits(passe1: ProduitDeVente, autres: Cents): FraisDeCessionDeduits {
  const commissionAgence = passe1.postes.commissionAgence;
  const mainlevee = passe1.postes.mainlevee;
  return {
    commissionAgence,
    mainlevee,
    autres,
    total: commissionAgence + mainlevee + autres,
  };
}

function grandeurs(produit: ProduitDeVente, prixAcquisition: Cents): GrandeursPartagees {
  return {
    horizonMois: produit.horizonMois,
    // L'égalité est le contrat du module, pas une coïncidence : l'horizon de la
    // vente court depuis le déblocage des fonds, qui est la date d'acquisition.
    dureeDetentionMois: produit.horizonMois,
    valeurInitiale: produit.valeurInitiale,
    prixAcquisition,
    prixDeCession: produit.postes.prixDeCession,
  };
}
