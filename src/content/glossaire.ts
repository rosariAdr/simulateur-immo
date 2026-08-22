/**
 * GLOSSAIRE DES INFOBULLES — `UI-005`
 *
 * Tout le texte que les pastilles « i » affichent vit ici, et nulle part
 * ailleurs. Un terme n'a donc qu'une définition, quel que soit le module où il
 * apparaît : c'est la condition pour que la pédagogie soit constante plutôt que
 * réécrite champ par champ.
 *
 * ── LA RÈGLE DES DEUX PHRASES EST PORTÉE PAR LE TYPE ──────────────────────
 *
 * La charte (`docs/06-design-system.md` §8) donne à la bulle « deux phrases —
 * jamais plus ». Une entrée n'est donc pas un bloc de texte libre : c'est une
 * `accroche` (rendue en gras) et une `suite`, chacune contrainte au type à
 * n'être qu'UNE phrase, terminée par une ponctuation. Une troisième phrase ne
 * compile pas. La contrainte n'est pas un garde-fou de relecture : elle est
 * inexprimable autrement, et c'est elle qui force le resserrement du propos.
 *
 * ── AUCUNE VALEUR RÉGLEMENTAIRE ÉCRITE EN DUR ─────────────────────────────
 *
 * Un contenu qui a besoin d'un seuil, d'un taux ou d'un barème ne l'écrit pas :
 * il pose un jeton `{ainsi}` et le reçoit à l'affichage par `avec()`, depuis
 * `src/core/fiscal/`. Les deux familles sont séparées — `GLOSSAIRE` pour les
 * entrées prêtes, `GLOSSAIRE_PARAMETRE` pour celles qui attendent une valeur —
 * et là encore le type mord : un jeton dans une entrée de `GLOSSAIRE` ne
 * compile pas, et `avec()` n'accepte ni d'oublier une valeur ni d'en inventer.
 *
 * Ce que le glossaire ne fait pas : recommander. Il décrit une mécanique et
 * laisse la décision à l'utilisateur (`docs/CONTEXT.md` §8).
 */

/* ── Le type qui rend la faute inexprimable ───────────────────────────────── */

/** Une phrase se termine. Sans ponctuation finale, ce n'en est pas une. */
type Terminee<S extends string> = S extends `${string}${"." | "…" | "!" | "?"}` ? S : never;

/**
 * Une ponctuation finale suivie d'une espace, c'est une phrase de plus.
 *
 * Conséquence assumée : aucune abréviation pointée (« art. L314-6 ») ne peut
 * figurer dans une bulle. Elle serait lue comme une coupure de phrase, et le
 * fichier ne compilerait pas. Les références réglementaires vivent dans les
 * commentaires du moteur, pas dans le texte affiché.
 */
type Coupee<S extends string> = S extends `${string}. ${string}`
  ? true
  : S extends `${string}… ${string}`
    ? true
    : S extends `${string}! ${string}`
      ? true
      : S extends `${string}? ${string}`
        ? true
        : false;

/** Exactement une phrase : terminée, et non coupée. */
type UnePhrase<S extends string> = Coupee<S> extends true ? never : Terminee<S>;

/** Une valeur attendue se note entre accolades : `{plafond}`. Une entrée prête n'en porte aucune. */
type SansJeton<S extends string> = S extends `${string}{${string}}${string}` ? never : S;

/** Les noms des jetons d'une chaîne, extraits au type. */
type Jetons<S extends string> = S extends `${string}{${infer J}}${infer R}` ? J | Jetons<R> : never;

/* ── Les entrées ──────────────────────────────────────────────────────────── */

/** Une entrée prête à l'affichage : deux phrases, plus aucune valeur à recevoir. */
export interface Entree {
  /** Le terme tel qu'on le prononce, pour l'intitulé du bouton. */
  readonly terme: string;
  /** Première phrase, rendue en gras : ce qu'il faut retenir si on ne lit que ça. */
  readonly accroche: string;
  /** Seconde phrase : la mécanique, ou la conséquence. */
  readonly suite: string;
}

/** Une entrée dont une phrase attend une valeur réglementaire. */
export interface EntreeParametree<A extends string, S extends string> {
  readonly terme: string;
  readonly accroche: A;
  readonly suite: S;
}

/**
 * Constructeur d'une entrée prête. Le type des deux phrases s'infère du
 * littéral, ce qui permet aux contraintes ci-dessus de mordre à la compilation.
 */
export function entree<A extends string, S extends string>(e: {
  readonly terme: string;
  readonly accroche: A & UnePhrase<A> & SansJeton<A>;
  readonly suite: S & UnePhrase<S> & SansJeton<S>;
}): Entree {
  return { terme: e.terme, accroche: e.accroche, suite: e.suite };
}

/**
 * Constructeur d'une entrée paramétrée.
 *
 * La règle des deux phrases s'applique ici aussi. Le sens inverse de
 * `SansJeton` — « une entrée paramétrée porte au moins un jeton » — n'est pas
 * exprimable sans faire échouer l'inférence de `A` et `S` ; il est vérifié par
 * `src/content/__tests__/glossaire.test.ts`, et son enjeu est mince : une
 * entrée sans jeton traverserait `avec()` inchangée.
 */
export function entreeParametree<A extends string, S extends string>(e: {
  readonly terme: string;
  readonly accroche: A & UnePhrase<A>;
  readonly suite: S & UnePhrase<S>;
}): EntreeParametree<A, S> {
  return { terme: e.terme, accroche: e.accroche, suite: e.suite };
}

/**
 * Substitue les valeurs attendues et rend une entrée affichable.
 *
 * Les clés du second argument sont exactement les jetons du texte : en oublier
 * une ne compile pas, en inventer une non plus. C'est ce qui garantit qu'un
 * seuil réglementaire vient toujours de `src/core/fiscal/` et jamais du texte.
 */
export function avec<A extends string, S extends string>(
  e: EntreeParametree<A, S>,
  valeurs: Readonly<Record<Jetons<A | S>, string>>,
): Entree {
  const remplacer = (texte: string): string =>
    texte.replace(/\{(\w+)\}/g, (_, cle: string) => {
      const valeur = (valeurs as Readonly<Record<string, string>>)[cle];
      // Un jeton sans valeur s'afficherait tel quel dans la bulle. Le type
      // l'empêche déjà ; ce garde-fou couvre l'appel non typé.
      if (valeur === undefined) throw new Error(`Jeton « ${cle} » sans valeur dans « ${e.terme} »`);
      return valeur;
    });
  return { terme: e.terme, accroche: remplacer(e.accroche), suite: remplacer(e.suite) };
}

/* ── Le vocabulaire du module crédit ──────────────────────────────────────── */

export const GLOSSAIRE = {
  apport: entree({
    terme: "apport",
    accroche: "L'apport ne réduit pas que la mensualité.",
    suite: "Il réduit le capital emprunté, donc les intérêts que ce capital aurait produits pendant toute la durée.",
  }),

  tauxNominal: entree({
    terme: "taux nominal",
    accroche: "Il se négocie, et c'est le levier le plus rentable.",
    suite: "Un dixième de point sur vingt ans pèse environ 2 200 € sur un prêt de 180 000 €.",
  }),

  assuranceEmprunteur: entree({
    terme: "assurance emprunteur",
    accroche: "La loi Lemoine permet d'en changer à tout moment, sans frais.",
    suite: "Une délégation coûte souvent la moitié du contrat de groupe proposé par la banque.",
  }),

  baseAssurance: entree({
    terme: "base de calcul de l'assurance",
    accroche: "Elle compte plus que le taux affiché.",
    suite: "Sur le capital initial la prime ne bouge jamais ; sur le capital restant dû elle décroît, et l'écart atteint 30 à 45 % du coût total.",
  }),

  garantie: entree({
    terme: "garantie",
    accroche: "La caution restitue une part au terme, l'hypothèque coûte une mainlevée en cas de revente anticipée.",
    suite: "Le prix affiché ne suffit donc pas à les départager : l'horizon de détention pèse autant que lui.",
  }),

  revenuFoyer: entree({
    terme: "revenu net mensuel du foyer",
    accroche: "Le taux d'effort se calcule dessus, assurance comprise.",
    suite: "Les banques y ajoutent le reste à vivre, qui n'est pas normé et qui peut être plus contraignant que le ratio.",
  }),

  fraisDossier: entree({
    terme: "frais de dossier",
    accroche: "Ils se négocient, et parfois s'annulent.",
    suite: "Ils entrent dans le TAEG, donc les réduire éloigne du plafond d'usure.",
  }),

  mensualite: entree({
    terme: "mensualité",
    accroche: "La mensualité n'est pas le coût du crédit.",
    suite: "Elle mêle le capital, qui vous revient, aux intérêts et à l'assurance, qui sont le prix de l'emprunt.",
  }),

  coutDuCredit: entree({
    terme: "coût du crédit",
    accroche: "Intérêts, assurance, frais et garantie réunis.",
    suite: "Il n'inclut pas les frais d'acquisition, qui se paient au notaire et non à la banque.",
  }),

  /**
   * Trois phrases avant `UI-005`, deux depuis. Ce qui est parti — « aucune
   * banque n'a le droit de prêter au-delà » — n'est pas perdu : c'est la
   * définition même du taux d'usure, et elle a désormais son entrée.
   */
  taeg: entree({
    terme: "TAEG",
    accroche: "Le seul taux qui permette de comparer deux offres.",
    suite: "Il réunit le taux nominal, l'assurance, les frais et la garantie, et c'est lui — non le taux nominal — que plafonne le taux d'usure.",
  }),

  tauxEffort: entree({
    terme: "taux d'effort",
    accroche: "La part de vos revenus qui part dans le crédit, assurance comprise.",
    suite: "Le plafond s'impose aux banques et non à vous : elles disposent d'une marge de dérogation, prioritairement réservée aux primo-accédants.",
  }),

  taea: entree({
    terme: "TAEA",
    accroche: "Le TAEA isole ce que coûte l'assurance seule à l'intérieur du TAEG.",
    suite: "C'est lui qu'il faut comparer d'un contrat à l'autre quand on fait jouer la loi Lemoine.",
  }),

  /* Termes que le module employait sans les expliquer. */

  capitalRestantDu: entree({
    terme: "capital restant dû",
    accroche: "Ce qu'il vous reste à rembourser à une date donnée, intérêts futurs exclus.",
    suite: "C'est sur lui que se calculent les intérêts de chaque échéance, l'indemnité de remboursement anticipé, et l'assurance lorsqu'elle n'est pas assise sur le capital initial.",
  }),

  amortissement: entree({
    terme: "amortissement",
    accroche: "L'amortissement est la part de l'échéance qui rembourse vraiment le capital.",
    suite: "Elle est faible au début et grandit à chaque échéance, parce que les intérêts se calculent sur un capital qui diminue.",
  }),

  tauxUsure: entree({
    terme: "taux d'usure",
    accroche: "Il plafonne le TAEG complet, assurance et frais compris, et non le seul taux nominal.",
    suite: "La Banque de France le publie chaque trimestre, et aucune banque n'a le droit de prêter au-delà.",
  }),

  hcsf: entree({
    terme: "HCSF",
    accroche: "Le Haut Conseil de stabilité financière fixe les normes d'octroi que les banques doivent suivre.",
    suite: "Elles portent sur le taux d'effort et sur la durée, et une part de la production trimestrielle peut y déroger.",
  }),

  quotite: entree({
    terme: "quotité",
    accroche: "C'est la part du capital que l'assurance couvre pour chaque emprunteur.",
    suite: "À deux, la répartition entre les têtes se négocie, et c'est la couverture totale retenue qui détermine la prime.",
  }),
} as const satisfies Readonly<Record<string, Entree>>;

/* ── Les entrées qui attendent une valeur réglementaire ───────────────────── */

export const GLOSSAIRE_PARAMETRE = {
  duree: entreeParametree({
    terme: "durée",
    accroche: "Allonger réduit la mensualité et augmente le coût total.",
    suite: "Le HCSF plafonne la durée à {plafond}, {derogatoire} lorsque des travaux atteignent {partTravaux} du montant emprunté.",
  }),

  travaux: entreeParametree({
    terme: "travaux inclus",
    accroche: "Des travaux atteignant {partTravaux} du montant emprunté ouvrent la durée dérogatoire.",
    suite: "Elle porte le plafond du HCSF de {plafond} à {derogatoire}.",
  }),
} as const;

/** Toutes les entrées, prêtes ou paramétrées. Les invariants portent sur cet ensemble. */
export const TOUTES_LES_ENTREES: readonly (Entree | EntreeParametree<string, string>)[] = [
  ...Object.values(GLOSSAIRE),
  ...Object.values(GLOSSAIRE_PARAMETRE),
];

/** Plafond de longueur d'une phrase de bulle. Au-delà, ce n'est plus une bulle. */
export const LONGUEUR_MAX_PHRASE = 200;
