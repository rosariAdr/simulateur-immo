/**
 * TYPES DU MODULE « ACHETER OU LOUER »
 *
 * ═══ LA DISTINCTION QUI STRUCTURE TOUT CE FICHIER ═══
 *
 * Comparer une mensualité de crédit à un loyer est **faux**, et c'est la
 * comparaison que tout le monde fait. La part de capital d'une échéance sort du
 * compte, mais elle ne disparaît pas : elle change de poche. C'est de l'épargne
 * contrainte, pas une dépense.
 *
 * Le module produit donc **deux lectures**, jamais une seule :
 *
 *   DÉCAISSEMENT   tout ce qui sort du compte. C'est le chiffre qui décide si
 *                  le budget passe le mois prochain. Il est plus élevé pour le
 *                  propriétaire, et cela ne dit rien de la richesse produite.
 *
 *   FONDS PERDUS   le décaissement moins la part de capital. Intérêts,
 *                  assurances, charges, taxe foncière, entretien : ce qui est
 *                  consommé et ne revient jamais. C'est la lecture qui répond à
 *                  « est-ce que je jette mon argent par les fenêtres en louant ».
 *
 * Aucune des deux n'est « la bonne ». Le décaissement seul fait passer l'achat
 * pour un gouffre ; les fonds perdus seuls le font passer pour gratuit, en
 * oubliant que l'argent immobilisé n'est plus disponible. Les afficher ensemble
 * est le seul choix honnête — voir `docs/ADR.md`, ADR-012.
 *
 * ═══ CE QUE CES TYPES NE PORTENT PAS ═══
 *
 * Aucun champ ne désigne un gagnant. La comparaison de niveau simple ignore
 * délibérément l'appréciation du bien, le coût d'opportunité de l'apport, la
 * fiscalité et la revente — tout cela relève du niveau approfondi
 * (`docs/03-spec-domaine.md` §2). Un `meilleurChoix` calculé ici serait faux,
 * et le produit ne recommande rien de toute façon.
 */

import type { Cents } from "../money";
import type { CreditPlan } from "../credit/plan";
import type { MarketAssumptions } from "../assumptions/market";

/* ── Échéancier repris ────────────────────────────────────────────────────── */

/**
 * Ce que le module lit d'un plan de financement, et rien de plus.
 *
 * Un `CreditPlan` complet satisfait ce type tel quel — c'est ce qu'on passe en
 * pratique. Le restreindre ici dit la vérité sur le couplage : **aucune
 * mensualité n'est recalculée**, les lignes sont reprises telles que le moteur
 * crédit les a produites. Un test peut donc fournir un échéancier synthétique
 * sans monter un plan entier, et le moteur crédit peut gagner des champs sans
 * que ce module s'en aperçoive.
 */
export type EcheancierRepris = Pick<CreditPlan, "rows">;

/* ── Indexations ──────────────────────────────────────────────────────────── */

/**
 * Vitesse de dérive annuelle de chaque famille de postes, en pourcentage.
 *
 * ⚠️ POINT DE MODÉLISATION. La spécification ne demande d'indexer que le loyer.
 * S'y tenir serait un biais : indexer le loyer à 2 % et geler la taxe foncière
 * fait arriver l'année de croisement des années trop tôt, et toujours dans le
 * même sens — en faveur de l'achat. Les deux côtés sont donc indexés, et une
 * indexation nulle se demande explicitement plutôt qu'elle ne s'obtient par
 * omission. Voir ADR-012.
 *
 * Une valeur négative est acceptée : la déflation existe, et un loyer peut
 * baisser à la relocation.
 */
export interface IndexationsDetention {
  /** Révision annuelle du loyer. */
  readonly loyerPctAnnuel: number;
  /** Dérive de la taxe foncière — taux votés et revalorisation des bases. */
  readonly taxeFoncierePctAnnuel: number;
  /**
   * Dérive des charges, assurances et provision pour travaux. Une seule valeur
   * pour les deux côtés : ces postes sont de même nature chez le propriétaire et
   * chez le locataire.
   */
  readonly chargesPctAnnuel: number;
}

/* ── Entrées ──────────────────────────────────────────────────────────────── */

export interface EntreeProprietaire {
  /**
   * Plan de financement déjà construit. **Le module ne recalcule aucune
   * mensualité** : il lit `plan.rows` mois par mois. Absent pour un achat
   * comptant, auquel cas le propriétaire n'a ni intérêts ni part de capital, et
   * ses deux lectures se confondent comme celles du locataire.
   */
  readonly plan?: EcheancierRepris;
  /** Assiette de la provision pour travaux. Prix payé, ou valeur estimée. */
  readonly valeurBien: Cents;
  /** Montant annuel, saisi par l'utilisateur : il dépend de la commune. */
  readonly taxeFonciereAnnuelle: Cents;
  /**
   * Charges de copropriété **non récupérables** sur un locataire, montant annuel.
   * Les charges récupérables sont exclues par construction : elles sont payées
   * par l'occupant dans les deux mondes et s'annuleraient dans la comparaison.
   */
  readonly chargesCoproprieteAnnuelles: Cents;
  /** Assurance habitation du propriétaire occupant, montant annuel. */
  readonly assuranceHabitationAnnuelle: Cents;
  /** En % de `valeurBien`, par an. À défaut : hypothèse de marché. */
  readonly provisionTravauxPctAnnuel?: number;
  /**
   * Frais d'entrée jamais récupérés — droits de mutation, émoluments, frais de
   * dossier, coût de garantie. Imputés en totalité au premier mois, dans les
   * DEUX lectures : ils sortent du compte et ne reviennent pas.
   *
   * Défaut zéro, ce qui reproduit exactement le « niveau simple » de la
   * spécification. Les laisser à zéro rend l'année de croisement optimiste de
   * plusieurs années sur un bien ancien ; l'interface doit le dire.
   */
  readonly fraisInitiauxNonRecuperables?: Cents;
}

export interface EntreeLocataire {
  /** Loyer hors charges, montant mensuel de la première année. */
  readonly loyerMensuelHorsCharges: Cents;
  /** Provision pour charges locatives, montant mensuel. */
  readonly chargesLocativesMensuelles: Cents;
  /** Assurance habitation du locataire, montant annuel. */
  readonly assuranceHabitationAnnuelle: Cents;
}

export interface EntreeDetention {
  /**
   * Durée de projection, en mois. Peut dépasser la durée du crédit — c'est même
   * l'intérêt : une fois le prêt soldé, le décaissement du propriétaire s'effondre
   * et le croisement se produit souvent là.
   */
  readonly horizonMois: number;
  readonly proprietaire: EntreeProprietaire;
  readonly locataire: EntreeLocataire;
  /** Surcharge partielle des indexations. Les champs absents viennent du marché. */
  readonly indexations?: Partial<IndexationsDetention>;
  /** Hypothèses de marché employées. À défaut : le relevé courant. */
  readonly hypotheses?: MarketAssumptions;
}

/* ── Sorties, côté propriétaire ───────────────────────────────────────────── */

/**
 * Un mois de détention, poste par poste.
 *
 * `decaissement` et `fondsPerdus` ne sont pas deux totaux concurrents mais deux
 * agrégations du même détail ; leur différence est exactement `capital`.
 */
export interface MoisProprietaire {
  readonly interets: Cents;
  /** Part de capital de l'échéance. Épargne contrainte, PAS une dépense. */
  readonly capital: Cents;
  readonly assuranceEmprunteur: Cents;
  readonly taxeFonciere: Cents;
  readonly chargesCopropriete: Cents;
  readonly provisionTravaux: Cents;
  readonly assuranceHabitation: Cents;
  /** Non nul au premier mois seulement. */
  readonly fraisInitiaux: Cents;
  /** Somme de tous les postes ci-dessus, capital compris. */
  readonly decaissement: Cents;
  /** `decaissement − capital`. */
  readonly fondsPerdus: Cents;
}

export interface MoisLocataire {
  readonly loyer: Cents;
  readonly chargesLocatives: Cents;
  readonly assuranceHabitation: Cents;
  readonly decaissement: Cents;
  /**
   * Rigoureusement égal à `decaissement`. Le champ existe pour que les deux
   * séries se lisent avec le même nom de champ, et parce que cette égalité EST
   * l'enseignement : le locataire ne constitue rien, tout ce qu'il verse est
   * consommé.
   */
  readonly fondsPerdus: Cents;
}

/** Un mois de la comparaison, les deux côtés alignés. */
export interface MoisDetention {
  /** Rang du mois, à partir de 1. */
  readonly mois: number;
  /** Année civile du projet, à partir de 1. Même convention que `CreditPlan`. */
  readonly annee: number;
  readonly proprietaire: MoisProprietaire;
  readonly locataire: MoisLocataire;
}

/* ── Sorties, agrégation annuelle ─────────────────────────────────────────── */

export interface AnneeProprietaire extends MoisProprietaire {
  readonly cumulDecaissement: Cents;
  readonly cumulFondsPerdus: Cents;
}

export interface AnneeLocataire extends MoisLocataire {
  readonly cumulDecaissement: Cents;
  readonly cumulFondsPerdus: Cents;
}

export interface AnneeDetention {
  readonly annee: number;
  /** Nombre de mois effectivement couverts. Inférieur à 12 sur une année tronquée. */
  readonly moisCouverts: number;
  readonly proprietaire: AnneeProprietaire;
  readonly locataire: AnneeLocataire;
  /** Cumul propriétaire − cumul locataire. Positif : le propriétaire a plus décaissé. */
  readonly ecartCumulDecaissement: Cents;
  /** Idem sur les fonds perdus. Positif : le propriétaire a plus consommé. */
  readonly ecartCumulFondsPerdus: Cents;
}

/* ── Croisement ───────────────────────────────────────────────────────────── */

/**
 * Première année où le cumul du propriétaire atteint ou passe sous celui du
 * locataire. `null` quand le croisement n'a pas lieu dans l'horizon projeté.
 *
 * Deux valeurs, parce qu'il y a deux lectures, et qu'elles ne se croisent
 * presque jamais la même année. C'est la mesure la plus directe du biais que ce
 * module existe pour corriger.
 */
export interface AnneesDeCroisement {
  readonly decaissement: number | null;
  readonly fondsPerdus: number | null;
}

/* ── Totaux ───────────────────────────────────────────────────────────────── */

export interface TotauxProprietaire {
  readonly interets: Cents;
  readonly capital: Cents;
  readonly assuranceEmprunteur: Cents;
  readonly taxeFonciere: Cents;
  readonly chargesCopropriete: Cents;
  readonly provisionTravaux: Cents;
  readonly assuranceHabitation: Cents;
  readonly fraisInitiaux: Cents;
  readonly decaissement: Cents;
  readonly fondsPerdus: Cents;
  /**
   * `decaissement − fondsPerdus`, c'est-à-dire le capital remboursé sur
   * l'horizon.
   *
   * ⚠️ Ce n'est PAS un patrimoine, et l'interface ne doit jamais le présenter
   * comme tel. Le bien peut valoir moins que sa valeur d'achat, et cette somme
   * ignore l'appréciation comme les frais de revente. C'est seulement la part du
   * décaissement qui n'a pas été consommée.
   */
  readonly capitalConstitue: Cents;
}

export interface TotauxLocataire {
  readonly loyer: Cents;
  readonly chargesLocatives: Cents;
  readonly assuranceHabitation: Cents;
  readonly decaissement: Cents;
  readonly fondsPerdus: Cents;
}

/* ── Résultat ─────────────────────────────────────────────────────────────── */

/** Paramètres effectivement retenus, pour que l'interface puisse les afficher. */
export interface ParametresRetenus {
  readonly indexations: IndexationsDetention;
  readonly provisionTravauxPctAnnuel: number;
  /** Date du relevé des hypothèses de marché employées. */
  readonly releveHypotheses: string;
}

export interface ComparaisonDetention {
  readonly horizonMois: number;
  /** Séries mensuelles. Utiles au module patrimonial, qui raisonne au mois. */
  readonly mois: readonly MoisDetention[];
  /** Les deux séries annuelles demandées par la spécification. */
  readonly annees: readonly AnneeDetention[];
  readonly croisement: AnneesDeCroisement;
  readonly totaux: {
    readonly proprietaire: TotauxProprietaire;
    readonly locataire: TotauxLocataire;
    /** Positif : le propriétaire a décaissé davantage sur tout l'horizon. */
    readonly ecartDecaissement: Cents;
    /** Positif : le propriétaire a consommé davantage sur tout l'horizon. */
    readonly ecartFondsPerdus: Cents;
  };
  readonly parametres: ParametresRetenus;
}
