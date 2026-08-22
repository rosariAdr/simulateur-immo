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

/**
 * Les noms des jetons d'une chaîne, extraits au type.
 *
 * Exporté depuis `CNT-001` : le texte long du glossaire pose les mêmes jetons
 * que les bulles, et son constructeur vérifie au type qu'ils sont connus.
 */
export type Jetons<S extends string> = S extends `${string}{${infer J}}${infer R}`
  ? J | Jetons<R>
  : never;

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

  /* ── Le prêt et son remboursement — `CNT-001` ───────────────────────────── */

  capaciteEmprunt: entree({
    terme: "capacité d'emprunt",
    accroche: "C'est le capital qu'une banque accepte de prêter, et non celui que le projet réclame.",
    suite: "Elle se déduit de la mensualité maximale admise, de la durée retenue et du taux du moment, et bouge donc dès que l'un des trois change.",
  }),

  differeAmortissement: entree({
    terme: "différé d'amortissement",
    accroche: "Pendant le différé, l'échéance ne rembourse aucun capital.",
    suite: "Le différé partiel ne règle que les intérêts et l'assurance, le différé total ne règle rien et laisse les intérêts s'ajouter au capital dû.",
  }),

  pretRelais: entree({
    terme: "prêt relais",
    accroche: "Il avance une fraction du prix du bien qu'on met en vente, en attendant que la vente se fasse.",
    suite: "Il se solde en une fois, son plafond d'usure est le plus élevé de toutes les catégories publiées, et l'absence d'acheteur au terme reste à la charge de l'emprunteur.",
  }),

  lissage: entree({
    terme: "lissage de prêts",
    accroche: "Le lissage fait cohabiter plusieurs prêts de durées différentes sous une mensualité totale constante.",
    suite: "Le prêt long occupe la place que les prêts courts libèrent en s'éteignant, ce qui supprime la marche d'escalier que l'emprunteur subirait sinon.",
  }),

  tauxVariableCape: entree({
    terme: "taux variable capé",
    accroche: "Un taux variable capé ne peut pas s'écarter de son taux initial au-delà d'une borne inscrite au contrat.",
    suite: "La borne s'exprime en points, à la hausse et parfois aussi à la baisse, et c'est elle qui sépare un variable encadré d'un variable nu.",
  }),

  offreDePret: entree({
    terme: "offre de prêt",
    accroche: "L'offre est l'engagement écrit de la banque, et elle ouvre un délai de réflexion pendant lequel elle ne peut pas être acceptée.",
    suite: "Ses conditions sont maintenues pendant toute sa durée de validité, ce qui fige le taux bien avant la signature chez le notaire.",
  }),

  conditionSuspensive: entree({
    terme: "condition suspensive de prêt",
    accroche: "Elle annule la vente, sans pénalité, si le crédit est refusé.",
    suite: "Elle nomme un montant, un taux plafond et un délai : un refus obtenu sur des conditions plus larges que celles-là ne la déclenche pas.",
  }),

  /* ── Ce que coûte le crédit ─────────────────────────────────────────────── */

  coutOpportunite: entree({
    terme: "coût d'opportunité",
    accroche: "C'est le rendement auquel on renonce en affectant une somme à un usage plutôt qu'à un autre.",
    suite: "Un euro remboursé par anticipation économise le taux du crédit et perd celui du placement qu'il aurait alimenté, et c'est l'écart des deux qui fait le gain réel.",
  }),

  /* ── L'assurance emprunteur ─────────────────────────────────────────────── */

  delegationAssurance: entree({
    terme: "délégation d'assurance",
    accroche: "C'est le fait d'assurer son prêt ailleurs qu'auprès de la banque qui le consent.",
    suite: "La banque ne peut la refuser que si les garanties proposées sont moins étendues que celles de son contrat de groupe, et son refus doit être motivé par écrit.",
  }),

  /* ── Les garanties du prêteur ───────────────────────────────────────────── */

  caution: entree({
    terme: "caution",
    accroche: "Un organisme s'engage à payer la banque à la place de l'emprunteur défaillant.",
    suite: "Elle ne grève pas le bien, se met en place sans acte notarié, et une part de ce qui est versé au départ revient à l'emprunteur au terme du prêt.",
  }),

  hypotheque: entree({
    terme: "hypothèque",
    accroche: "L'hypothèque donne au prêteur un droit sur le bien lui-même, inscrit au fichier immobilier.",
    suite: "Elle se paie en frais d'acte et en taxe de publicité foncière, et elle survit au remboursement jusqu'à sa mainlevée ou son extinction automatique.",
  }),

  mainlevee: entree({
    terme: "mainlevée",
    accroche: "C'est l'acte notarié qui efface une hypothèque avant son extinction automatique.",
    suite: "Elle n'est due que si le bien est vendu ou le prêt soldé avant le terme, et son prix se calcule sur le capital initialement garanti.",
  }),

  fondsMutuelGarantie: entree({
    terme: "fonds mutuel de garantie",
    accroche: "C'est la réserve commune dans laquelle un organisme de caution puise pour indemniser les banques.",
    suite: "Chaque emprunteur y verse une contribution à la mise en place du prêt, et c'est cette part-là, et non la commission, qui peut lui être restituée au terme.",
  }),

  /* ── Ce que la règle impose ─────────────────────────────────────────────── */

  resteAVivre: entree({
    terme: "reste à vivre",
    accroche: "C'est ce qui subsiste des revenus une fois les charges de crédit payées.",
    suite: "Aucun texte ne le définit ni ne le chiffre : chaque banque pose son propre seuil, souvent par personne du foyer, et ce seuil mord parfois avant le plafond d'endettement.",
  }),

  sautDeCharge: entree({
    terme: "saut de charge",
    accroche: "C'est l'écart entre le loyer payé aujourd'hui et la mensualité qui le remplacerait.",
    suite: "Un saut important pèse dans l'examen du dossier même quand le taux d'effort reste sous le plafond, parce que l'emprunteur ne l'a jamais éprouvé.",
  }),

  /* ── Acquérir : frais, taxes et aides ───────────────────────────────────── */

  pretTauxZero: entree({
    terme: "prêt à taux zéro",
    accroche: "C'est un prêt sans intérêt ni frais de dossier, réservé aux primo-accédants sous conditions de ressources.",
    suite: "La zone géographique ne fixe pas sa quotité mais le plafond d'opération et les seuils de tranche de revenus, contrairement à ce qu'on lit partout.",
  }),

  vefa: entree({
    terme: "vente en l'état futur d'achèvement",
    accroche: "L'acheteur devient propriétaire au fur et à mesure que la construction s'élève.",
    suite: "Le prix se règle par appels de fonds échelonnés sur l'avancement, ce qui décale les intérêts du prêt et ouvre la durée dérogatoire du HCSF.",
  }),

  /* ── Détenir, revendre, comparer ────────────────────────────────────────── */

  plusValue: entree({
    terme: "plus-value immobilière",
    accroche: "C'est l'écart entre le prix de vente et le prix d'acquisition majoré des frais et travaux admis.",
    suite: "La résidence principale en est exonérée ; tout autre bien supporte l'impôt sur le revenu et les prélèvements sociaux, sur deux assiettes qui ne diminuent pas au même rythme.",
  }),

  prelevementsSociaux: entree({
    terme: "prélèvements sociaux",
    accroche: "Ils frappent les revenus du patrimoine en plus de l'impôt sur le revenu.",
    suite: "Sur une plus-value immobilière, leur abattement pour durée de détention court plus longtemps que celui de l'impôt, si bien que les deux exonérations ne tombent pas la même année.",
  }),

  abattementDuree: entree({
    terme: "abattement pour durée de détention",
    accroche: "Il efface progressivement la plus-value imposable à mesure que la détention se prolonge.",
    suite: "Deux barèmes courent en parallèle, l'un pour l'impôt sur le revenu, l'autre pour les prélèvements sociaux, et ils n'atteignent pas l'exonération totale au même moment.",
  }),

  effetLevier: entree({
    terme: "effet de levier",
    accroche: "Le levier fait porter la performance sur la valeur entière du bien alors que seul l'apport est immobilisé.",
    suite: "Il amplifie le résultat dans les deux sens, et il ne joue en faveur de l'emprunteur que tant que le rendement du bien dépasse le coût de la dette qui le finance.",
  }),

  taxeFonciere: entree({
    terme: "taxe foncière",
    accroche: "Elle est due par celui qui est propriétaire au 1er janvier, que le bien soit occupé ou non.",
    suite: "Elle repose sur la valeur locative cadastrale et sur des taux votés localement, et elle n'entre ni dans la mensualité ni dans le TAEG.",
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

  /* ── `CNT-001` ──────────────────────────────────────────────────────────── */

  ira: entreeParametree({
    terme: "indemnité de remboursement anticipé",
    accroche: "Solder un prêt avant son terme ouvre droit à une indemnité, que la loi plafonne au plus faible de deux calculs.",
    suite: "Le premier vaut {plafondIra} du capital restant dû avant l'opération, le second {moisInteretsIra} d'intérêts sur le capital remboursé au taux moyen du prêt.",
  }),

  remboursementAnticipe: entreeParametree({
    terme: "remboursement anticipé",
    accroche: "Il se fait à tout moment, mais le contrat peut refuser les versements inférieurs à {partMinimale} du montant initial du prêt.",
    suite: "Cette restriction ne vaut jamais pour le solde, qui peut être versé quel qu'en soit le montant.",
  }),

  questionnaireSante: entreeParametree({
    terme: "questionnaire de santé",
    accroche: "La loi Lemoine le supprime sous {plafondLemoine} de capital assuré par personne.",
    suite: "La dispense suppose en outre que le remboursement s'achève avant les {ageTermeLemoine} de l'emprunteur.",
  }),

  droitsMutation: entreeParametree({
    terme: "droits de mutation",
    accroche: "C'est la taxe que perçoivent le département et la commune sur une vente dans l'ancien.",
    suite: "Leur taux total va de {dmtoReduit} à {dmtoPlein} du prix selon que le département a voté ou non la hausse ouverte par la loi de finances.",
  }),

  fraisAcquisition: entreeParametree({
    terme: "frais d'acquisition",
    accroche: "Les frais dits « de notaire » sont surtout des taxes, et le notaire n'en garde qu'une fraction.",
    suite: "Ils pèsent {fraisAncien} du prix dans l'ancien contre {fraisNeuf} dans le neuf, où la taxe de publicité foncière remplace les droits de mutation.",
  }),

  emolumentsNotaire: entreeParametree({
    terme: "émoluments du notaire",
    accroche: "Ce sont la part tarifée du notaire, et la seule fraction négociable des frais d'acquisition.",
    suite: "La remise atteint au plus {remiseEmoluments}, sur la seule fraction du prix au-delà de {seuilRemiseEmoluments}, et le notaire qui l'accorde doit l'accorder à tous ses clients.",
  }),

  mobilier: entreeParametree({
    terme: "mobilier déduit du prix",
    accroche: "Le mobilier vendu avec le bien sort de l'assiette des droits de mutation.",
    suite: "La déduction suppose un inventaire chiffré et vérifiable, et la pratique la contient sous {partMobilier} du prix.",
  }),
} as const;

/** Toutes les entrées, prêtes ou paramétrées. Les invariants portent sur cet ensemble. */
export const TOUTES_LES_ENTREES: readonly (Entree | EntreeParametree<string, string>)[] = [
  ...Object.values(GLOSSAIRE),
  ...Object.values(GLOSSAIRE_PARAMETRE),
];

/** Plafond de longueur d'une phrase de bulle. Au-delà, ce n'est plus une bulle. */
export const LONGUEUR_MAX_PHRASE = 200;

/* ── Le chemin vers la page du glossaire — `CNT-001` ──────────────────────── */

/** La clé d'une entrée, prête ou paramétrée. */
export type CleGlossaire = keyof typeof GLOSSAIRE | keyof typeof GLOSSAIRE_PARAMETRE;

/** Toutes les clés, dans l'ordre de déclaration. */
export const CLES_GLOSSAIRE: readonly CleGlossaire[] = [
  ...(Object.keys(GLOSSAIRE) as (keyof typeof GLOSSAIRE)[]),
  ...(Object.keys(GLOSSAIRE_PARAMETRE) as (keyof typeof GLOSSAIRE_PARAMETRE)[]),
];

/**
 * L'ancre d'un terme sur `/glossaire`.
 *
 * Dérivée du terme et non d'une clé écrite à la main : une ancre saisie deux
 * fois finit par diverger du titre qu'elle désigne, et le lien d'une bulle
 * tombe alors sur du vide sans que rien ne le signale. L'unicité est vérifiée
 * par `src/content/__tests__/glossaire.test.ts` — deux termes distincts ne
 * doivent pas se réduire à la même ancre.
 *
 * Le résultat ne dépend d'aucune locale : la décomposition retire les accents,
 * et tout ce qui n'est ni lettre latine ni chiffre devient un tiret. Une
 * apostrophe compte comme une coupure, « taux d'usure » donnant « taux-d-usure ».
 */
/**
 * Les signes diacritiques que la décomposition NFD détache de leur lettre.
 *
 * Écrits en échappements plutôt qu'en clair : un intervalle de caractères
 * combinants posé littéralement dans le source est invisible à la relecture et
 * se perd au premier changement d'encodage.
 */
const DIACRITIQUES = new RegExp("[\\u0300-\\u036f]", "gu");

export function ancre(terme: string): string {
  return terme
    .normalize("NFD")
    .replace(DIACRITIQUES, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

/** L'adresse complète d'un terme sur la page du glossaire. */
export const lienGlossaire = (terme: string): string => `/glossaire#${ancre(terme)}`;
