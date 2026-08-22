/**
 * LE TEXTE LONG DU GLOSSAIRE — `CNT-001`
 *
 * ── POURQUOI UN FICHIER SÉPARÉ, ET NON UN CHAMP DE PLUS SUR `Entree` ──────
 *
 * `Entree` porte deux phrases dont la forme est garantie AU TYPE : une
 * troisième ne compile pas, une valeur réglementaire écrite en clair non plus.
 * C'est la garantie que `docs/ADR.md`, ADR-007, résume ainsi — « il n'existe
 * aucun chemin par lequel du texte libre atteindrait une bulle ».
 *
 * Ajouter à `Entree` un champ de texte long, fût-il optionnel, ouvrirait ce
 * chemin : la bulle recevrait un objet portant du texte non contraint, et rien
 * — ni type, ni test — n'empêcherait un rendu ultérieur de l'afficher. La
 * contrainte des deux phrases cesserait d'être une propriété de la donnée pour
 * redevenir une discipline de composant.
 *
 * Les deux contenus sont donc deux données distinctes, reliées par la clé.
 * Voir `docs/ADR.md`, ADR-009.
 *
 * ── CE QUE CE FICHIER GARANTIT QUAND MÊME ────────────────────────────────
 *
 * Le texte long est libre de forme, pas de fond. Deux gardes le tiennent :
 *
 * 1. `DEVELOPPEMENTS` satisfait `Record<CleGlossaire, Developpement>` : une
 *    entrée ajoutée au glossaire sans son développement arrête le typecheck.
 * 2. Les jetons sont vérifiés au type contre `CleValeur` : un développement qui
 *    invoque une valeur inconnue de `src/content/valeurs.ts` ne compile pas.
 *    Aucun taux, seuil ou barème ne s'écrit donc ici non plus.
 *
 * Le reste — pas de recommandation, `voirAussi` qui pointe sur des clés
 * existantes, thèmes tous peuplés — tient à l'exécution, dans
 * `src/content/__tests__/developpements.test.ts`.
 */

import type { CleGlossaire, Jetons } from "./glossaire";
import { VALEURS, type CleValeur } from "./valeurs";
import type { Famille } from "@/components/ui/taxonomie";

/* ── Les thèmes ───────────────────────────────────────────────────────────── */

/**
 * Le glossaire est groupé par thème, et non rangé alphabétiquement.
 *
 * L'ordre alphabétique sert à RETROUVER un terme qu'on connaît déjà de nom ;
 * l'index en tête de page le donne. Le corps sert à en DÉCOUVRIR : « caution »,
 * « hypothèque » et « mainlevée » ne s'éclairent que côte à côte, et l'ordre
 * alphabétique les sépare de six écrans. La thèse du produit — réunir ce que
 * les simulateurs dispersent, `docs/CONTEXT.md` §2 — s'applique d'abord à ses
 * propres contenus.
 *
 * L'ordre des thèmes suit celui de l'opération : on emprunte, on paie,
 * on assure, on garantit, on passe les contrôles, on achète, on détient.
 */
export const THEMES = [
  {
    cle: "pret",
    titre: "Le prêt et son remboursement",
    chapeau: "Ce qu'on emprunte, sur combien de temps, et comment la dette s'éteint.",
  },
  {
    cle: "cout",
    titre: "Ce que le crédit coûte",
    chapeau: "Les postes qui s'ajoutent au capital, et les taux qui permettent de les comparer.",
  },
  {
    cle: "assurance",
    titre: "L'assurance emprunteur",
    chapeau: "Le poste le plus négociable d'un crédit, et le plus rarement renégocié.",
  },
  {
    cle: "garanties",
    titre: "Les garanties du prêteur",
    chapeau: "Ce que la banque prend en sûreté, ce que cela coûte à l'entrée et à la sortie.",
  },
  {
    cle: "octroi",
    titre: "Ce que la règle impose",
    chapeau: "Les seuils qui s'adressent aux banques, et que l'emprunteur subit sans les connaître.",
  },
  {
    cle: "acquisition",
    titre: "Acquérir : frais, taxes et aides",
    chapeau: "Ce qui se paie au notaire et au fisc, et ce que l'État prête sans intérêt.",
  },
  {
    cle: "patrimoine",
    titre: "Détenir, revendre, comparer",
    chapeau: "Ce qui pèse après l'achat, et ce qui décide au moment de la revente.",
  },
] as const satisfies readonly {
  readonly cle: string;
  readonly titre: string;
  readonly chapeau: string;
}[];

export type Theme = (typeof THEMES)[number]["cle"];

/* ── Le type d'un développement ───────────────────────────────────────────── */

export interface Developpement {
  /** Le groupe dans lequel l'entrée est présentée sur `/glossaire`. */
  readonly theme: Theme;
  /**
   * La famille de la taxonomie, quand le terme désigne un paramètre.
   *
   * Absente pour les termes qui désignent un résultat ou une notion — une
   * mensualité ne se négocie pas, elle se calcule. Étiqueter tout le glossaire
   * de force rendrait l'étiquette insignifiante là où elle porte le sens.
   */
  readonly famille?: Famille;
  /** Un ou plusieurs paragraphes. Les jetons y sont substitués à l'affichage. */
  readonly paragraphes: readonly string[];
  /** Renvois vers d'autres entrées, rendus en liens d'ancre. */
  readonly voirAussi: readonly CleGlossaire[];
}

/**
 * Constructeur d'un développement.
 *
 * `Jetons<P[number]> extends CleValeur` n'est pas décoratif : c'est ce qui
 * empêche d'écrire `{plafondPtz}` là où `src/content/valeurs.ts` n'expose rien
 * de tel. Le jeton sortirait tel quel à l'écran, et la page annoncerait un
 * seuil manquant sans que rien ne rougisse. Ici, elle ne compile pas.
 *
 * Le modificateur `const` sur `P` est indispensable : sans lui, le tableau
 * s'infère en `string[]`, les littéraux se perdent, et la vérification des
 * jetons ne porte plus sur rien.
 */
export function developpement<const P extends readonly string[]>(d: {
  readonly theme: Theme;
  readonly famille?: Famille;
  readonly paragraphes: P & (Jetons<P[number]> extends CleValeur ? unknown : never);
  readonly voirAussi?: readonly CleGlossaire[];
}): Developpement {
  return {
    theme: d.theme,
    ...(d.famille === undefined ? {} : { famille: d.famille }),
    paragraphes: d.paragraphes,
    voirAussi: d.voirAussi ?? [],
  };
}

/**
 * Les paragraphes d'un développement, valeurs substituées.
 *
 * Le type interdit déjà un jeton inconnu ; ce garde-fou couvre l'appel non
 * typé, exactement comme `avec()` le fait pour les bulles. Un jeton qui
 * traverserait sans valeur s'afficherait tel quel au milieu d'une phrase.
 */
export function rendre(d: Developpement): readonly string[] {
  return d.paragraphes.map((p) =>
    p.replace(/\{(\w+)\}/g, (_, cle: string) => {
      const valeur = (VALEURS as Readonly<Record<string, string>>)[cle];
      if (valeur === undefined) throw new Error(`Jeton « ${cle} » sans valeur réglementaire`);
      return valeur;
    }),
  );
}

/* ── Les développements ───────────────────────────────────────────────────── */

export const DEVELOPPEMENTS = {
  /* ── Le prêt et son remboursement ─────────────────────────────────────── */

  apport: developpement({
    theme: "pret",
    famille: "contraint",
    paragraphes: [
      "L'apport sert d'abord à couvrir ce que la banque finance mal : les frais d'acquisition, les frais de garantie, les frais de dossier. Ce qui subsiste au-delà vient seulement ensuite en déduction du capital emprunté.",
      "Son effet sur le coût total n'est donc pas proportionnel à son montant. Chaque euro qui réduit le capital remplace un euro emprunté au taux du crédit pendant toute sa durée : c'est cet intérêt évité, et non la baisse de la mensualité, qui mesure ce qu'il rapporte.",
    ],
    voirAussi: ["capaciteEmprunt", "fraisAcquisition", "coutOpportunite"],
  }),

  mensualite: developpement({
    theme: "pret",
    paragraphes: [
      "Une échéance de prêt à annuité constante contient trois choses de nature différente : du capital, qui vous revient sous forme de bien ; des intérêts, qui rémunèrent le prêteur ; une prime d'assurance, qui achète une couverture. Seuls les deux derniers postes sont un coût.",
      "Le montant de l'échéance ne bouge pas, mais sa composition, si. C'est pourquoi comparer deux offres sur la seule mensualité ne prouve rien : à mensualité égale, la durée, le taux et l'assurance peuvent différer du tout au tout.",
    ],
    voirAussi: ["amortissement", "coutDuCredit", "taeg"],
  }),

  amortissement: developpement({
    theme: "pret",
    paragraphes: [
      "Les intérêts d'une échéance se calculent sur le capital restant dû au début du mois. Ce qui reste de l'échéance après les avoir payés rembourse du capital, ce qui réduit l'assiette du mois suivant, ce qui laisse davantage de place au capital le mois d'après.",
      "La progression est géométrique, pas linéaire. La conséquence pratique tient en une phrase : un euro remboursé par anticipation économise d'autant plus d'intérêts qu'il reste d'échéances devant lui.",
    ],
    voirAussi: ["capitalRestantDu", "remboursementAnticipe", "mensualite"],
  }),

  capitalRestantDu: developpement({
    theme: "pret",
    paragraphes: [
      "Le capital restant dû est la seule mesure de ce que l'on doit vraiment. Il ne contient aucun intérêt futur : ceux-ci ne sont pas dus tant que le temps ne s'est pas écoulé, et c'est précisément ce qui rend un remboursement anticipé possible.",
      "Il sert d'assiette à trois calculs distincts : les intérêts de chaque échéance, l'indemnité de remboursement anticipé, et la prime d'assurance lorsque le contrat retient cette base plutôt que le capital initial.",
    ],
    voirAussi: ["amortissement", "ira", "baseAssurance"],
  }),

  duree: developpement({
    theme: "pret",
    famille: "contraint",
    paragraphes: [
      "Allonger la durée étale le capital sur davantage d'échéances : la mensualité baisse, et le taux d'effort avec elle. En contrepartie, le capital reste élevé plus longtemps, et les intérêts se calculent dessus à chaque mois supplémentaire.",
      "Le HCSF plafonne la durée à {plafond}, portée à {derogatoire} pour une acquisition dans le neuf ou pour des travaux atteignant {partTravaux} du montant emprunté. Le plafond s'impose à la banque et non à l'emprunteur : c'est une norme d'octroi, et une part de la production trimestrielle peut y déroger.",
    ],
    voirAussi: ["hcsf", "tauxEffort", "travaux"],
  }),

  capaciteEmprunt: developpement({
    theme: "pret",
    paragraphes: [
      "La capacité d'emprunt n'est pas une donnée du dossier, c'est le résultat d'un calcul inverse. On part de la mensualité que le plafond d'endettement autorise, on en retire l'assurance, et on cherche le capital que le solde rembourse au taux et à la durée retenus.",
      "Elle bouge donc dès qu'un des trois paramètres change. Deux banques peuvent l'annoncer différemment sans qu'aucune se trompe : elles ne retiennent ni les mêmes revenus, ni les mêmes charges, ni le même reste à vivre.",
    ],
    voirAussi: ["tauxEffort", "resteAVivre", "revenuFoyer"],
  }),

  differeAmortissement: developpement({
    theme: "pret",
    famille: "negociable",
    paragraphes: [
      "Un différé fait coïncider le début du remboursement avec la disponibilité du bien : une construction qu'on ne peut pas encore habiter, un logement en travaux, un loyer qu'on continue de payer ailleurs.",
      "Il a un prix, et ce prix dépend de sa forme. En différé partiel, les intérêts sont réglés chaque mois et le capital ne bouge pas. En différé total, ils s'ajoutent au capital dû et produisent eux-mêmes des intérêts : le coût final s'en trouve nettement plus élevé.",
    ],
    voirAussi: ["vefa", "travaux", "coutDuCredit"],
  }),

  pretRelais: developpement({
    theme: "pret",
    famille: "contraint",
    paragraphes: [
      "Le prêt relais finance l'achat avant la vente. La banque avance une fraction de la valeur estimée du bien mis en vente, assortie d'une décote qui absorbe le risque d'une estimation optimiste.",
      "Son plafond d'usure, {usureRelais} pour le trimestre {trimestreUsure}, est le plus élevé de toutes les catégories publiées, et cet écart traduit le risque. Si la vente ne se fait pas dans le délai prévu, la dette reste due : c'est la seule configuration où l'on peut se retrouver avec deux biens et deux crédits.",
    ],
    voirAussi: ["tauxUsure", "capaciteEmprunt"],
  }),

  lissage: developpement({
    theme: "pret",
    famille: "negociable",
    paragraphes: [
      "Une opération se finance rarement par un seul prêt : un prêt à taux zéro, un prêt employeur ou un prêt réglementé s'ajoutent au prêt principal, avec des durées plus courtes. Sans lissage, la charge mensuelle totale forme des paliers descendants.",
      "Le lissage ajuste l'échéance du prêt long pour que la somme reste plate d'un bout à l'autre. Les banques le pratiquent parce que c'est cette somme, et non chaque prêt pris isolément, qui entre dans le calcul du taux d'effort.",
    ],
    voirAussi: ["pretTauxZero", "tauxEffort", "mensualite"],
  }),

  tauxVariableCape: developpement({
    theme: "pret",
    famille: "negociable",
    paragraphes: [
      "Un taux variable suit un indice de marché. Le cap borne l'amplitude de sa variation par rapport au taux de départ, en points : un cap d'un point signifie que le taux ne dépassera jamais le taux initial majoré d'un point, quelle que soit l'évolution de l'indice.",
      "Le cap se paie par un taux de départ plus élevé qu'un variable nu. Ce qui varie ensuite peut être la mensualité, la durée, ou les deux — le contrat le dit, et ce détail change entièrement le risque supporté.",
    ],
    voirAussi: ["tauxNominal", "taeg"],
  }),

  offreDePret: developpement({
    theme: "pret",
    famille: "reglementaire",
    paragraphes: [
      "L'offre de prêt est un document dont le contenu est fixé par la loi. Elle ouvre un délai de réflexion incompressible : l'emprunteur ne peut pas l'accepter avant son expiration, même s'il le souhaite, et une acceptation anticipée est sans valeur.",
      "Pendant toute sa durée de validité, la banque reste tenue par les conditions qu'elle a émises. C'est le moment où le taux cesse d'être une hypothèse, bien avant la signature de l'acte chez le notaire.",
    ],
    voirAussi: ["conditionSuspensive", "taeg"],
  }),

  conditionSuspensive: developpement({
    theme: "pret",
    famille: "negociable",
    paragraphes: [
      "La condition suspensive d'obtention de prêt protège l'acquéreur qui n'obtient pas son financement : la vente est annulée et le dépôt de garantie restitué.",
      "Sa rédaction fait tout. Elle nomme un montant emprunté, un taux maximal et un délai ; un refus obtenu pour un montant supérieur, ou à un taux supérieur à celui qui y figure, ne suffit pas à la faire jouer.",
    ],
    voirAussi: ["offreDePret"],
  }),

  /* ── Ce que le crédit coûte ───────────────────────────────────────────── */

  tauxNominal: developpement({
    theme: "cout",
    famille: "negociable",
    paragraphes: [
      "Le taux nominal rémunère le capital prêté, et lui seul. Il ne comprend ni l'assurance, ni les frais de dossier, ni la garantie, ce qui explique que deux offres au même taux nominal puissent coûter très différemment.",
      "Il se négocie, et il se négocie tôt : une fois l'offre émise, la marge de discussion s'est refermée. C'est aussi le paramètre auquel le coût total est le plus sensible sur les longues durées.",
    ],
    voirAussi: ["taeg", "tauxUsure", "coutDuCredit"],
  }),

  fraisDossier: developpement({
    theme: "cout",
    famille: "negociable",
    paragraphes: [
      "Les frais de dossier rémunèrent l'instruction de la demande. Ils s'expriment en pourcentage du capital ou en forfait, souvent avec un plancher et un plafond propres à chaque établissement.",
      "Ils entrent dans l'assiette du TAEG. Les réduire n'allège donc pas seulement la facture : cela éloigne aussi le dossier du plafond d'usure, ce qui compte quand celui-ci est proche.",
    ],
    voirAussi: ["taeg", "tauxUsure"],
  }),

  coutDuCredit: developpement({
    theme: "cout",
    paragraphes: [
      "Le coût du crédit additionne tout ce qui est versé au-delà du capital emprunté : intérêts, primes d'assurance, frais de dossier, frais de garantie.",
      "Il ne comprend pas les frais d'acquisition, qui se paient au notaire et existeraient même sans emprunt. Confondre les deux fausse toute comparaison entre un achat financé et un achat comptant.",
    ],
    voirAussi: ["fraisAcquisition", "taeg", "coutOpportunite"],
  }),

  taeg: developpement({
    theme: "cout",
    paragraphes: [
      "Le TAEG est le taux qui, appliqué à l'échéancier, rend la somme actualisée des versements égale au capital réellement mis à disposition. Il se cherche par approximations successives : il n'existe pas de formule fermée.",
      "Sa vertu est d'être unique. Deux offres se comparent sur ce nombre seul, quelle que soit la façon dont chacune répartit sa marge entre le taux, l'assurance et les frais. C'est aussi lui, et non le taux nominal, que plafonne le taux d'usure.",
    ],
    voirAussi: ["taea", "tauxUsure", "tauxNominal"],
  }),

  ira: developpement({
    theme: "cout",
    famille: "reglementaire",
    paragraphes: [
      "L'indemnité compense au prêteur les intérêts qu'il n'encaissera pas. La loi la borne par un double plafond dont c'est le plus faible qui s'applique : {plafondIra} du capital restant dû avant l'opération, ou {moisInteretsIra} d'intérêts sur le capital remboursé au taux moyen du prêt.",
      "Plusieurs situations l'écartent entièrement : la vente du bien à la suite d'une mutation professionnelle, la cessation forcée d'activité, le décès de l'emprunteur ou de son conjoint. Un prêt à taux zéro n'en produit aucune, faute d'intérêts à compenser.",
    ],
    voirAussi: ["remboursementAnticipe", "capitalRestantDu", "pretTauxZero"],
  }),

  remboursementAnticipe: developpement({
    theme: "cout",
    famille: "negociable",
    paragraphes: [
      "Le droit de rembourser par anticipation ne se supprime pas par contrat. Celui-ci peut en revanche écarter les versements partiels inférieurs à {partMinimale} du montant initial du prêt, et la clause est très répandue ; elle ne vaut jamais pour le solde.",
      "Le gain d'un versement n'est pas l'économie d'intérêts brute. Il faut en retirer l'indemnité éventuelle, puis le rendement auquel la somme renonce en quittant son placement — c'est cette troisième mesure qui décide, et elle dépend d'hypothèses que personne ne connaît d'avance.",
    ],
    voirAussi: ["ira", "coutOpportunite", "amortissement"],
  }),

  coutOpportunite: developpement({
    theme: "cout",
    paragraphes: [
      "Le coût d'opportunité rend comparables deux emplois d'une même somme. Rembourser un crédit rapporte, avec certitude, le taux de ce crédit ; placer la même somme rapporte le rendement du placement, avec son risque.",
      "C'est l'écart entre les deux, et non le montant des intérêts économisés, qui mesure le gain réel de l'opération. Une comparaison de ce type repose sur des hypothèses de rendement : elle se lit en fourchette, jamais en chiffre unique.",
    ],
    voirAussi: ["remboursementAnticipe", "effetLevier"],
  }),

  /* ── L'assurance emprunteur ───────────────────────────────────────────── */

  assuranceEmprunteur: developpement({
    theme: "assurance",
    famille: "negociable",
    paragraphes: [
      "L'assurance emprunteur couvre le prêteur contre le décès, l'invalidité, l'incapacité de travail, et parfois la perte d'emploi. Aucun texte ne l'impose ; aucune banque ne prête sans elle sur un crédit immobilier.",
      "La loi Lemoine autorise la résiliation et le changement à tout moment, sans frais ni préavis, pendant toute la vie du prêt. C'est le seul poste d'un crédit qui reste ouvert à la négociation après la signature.",
    ],
    voirAussi: ["delegationAssurance", "taea", "questionnaireSante"],
  }),

  baseAssurance: developpement({
    theme: "assurance",
    famille: "negociable",
    paragraphes: [
      "Deux contrats affichant le même taux ne coûtent pas la même chose selon l'assiette qu'ils retiennent. Sur le capital initial, la prime est constante du premier au dernier mois. Sur le capital restant dû, elle décroît avec la dette.",
      "L'écart cumulé se compte en milliers d'euros sur un prêt long, et il n'apparaît nulle part dans le taux affiché. Le TAEA le rend visible, parce qu'il porte sur le coût effectivement supporté.",
    ],
    voirAussi: ["taea", "quotite", "capitalRestantDu"],
  }),

  taea: developpement({
    theme: "assurance",
    paragraphes: [
      "Le TAEA isole, à l'intérieur du TAEG, ce que l'assurance coûte à elle seule. Il se lit comme un taux annuel et se compare directement d'un contrat à l'autre.",
      "C'est la seule mesure qui neutralise en même temps la base de calcul, les quotités et la structure de la prime. Un taux d'assurance affiché ne dit rien tant qu'on ignore sur quoi il s'applique.",
    ],
    voirAussi: ["baseAssurance", "taeg", "delegationAssurance"],
  }),

  quotite: developpement({
    theme: "assurance",
    famille: "negociable",
    paragraphes: [
      "La quotité est la part du capital couverte pour chaque tête assurée. Un emprunteur seul est couvert en totalité ; à deux, la couverture se répartit librement entre les têtes et peut aller jusqu'au double du capital.",
      "La prime suit la couverture totale, pas le nombre d'emprunteurs. Redistribuer les quotités entre deux têtes d'âges ou d'états de santé différents change le prix sans changer le capital garanti.",
    ],
    voirAussi: ["assuranceEmprunteur", "taea"],
  }),

  delegationAssurance: developpement({
    theme: "assurance",
    famille: "negociable",
    paragraphes: [
      "Le contrat de groupe de la banque mutualise le risque sur l'ensemble de sa clientèle ; un contrat individuel le tarife selon l'âge, la profession et l'état de santé. Pour un emprunteur jeune et sans risque particulier, l'écart est net : les taux observés vont de {tauxGroupe} en contrat de groupe à {tauxDelegation} en délégation.",
      "Le seul motif de refus admis est l'équivalence insuffisante des garanties, appréciée sur une liste de critères publiée par le comité consultatif du secteur financier, et le refus doit être motivé. Le taux du prêt ne peut pas être relevé en représailles d'une délégation.",
    ],
    voirAussi: ["assuranceEmprunteur", "taea", "questionnaireSante"],
  }),

  questionnaireSante: developpement({
    theme: "assurance",
    famille: "reglementaire",
    paragraphes: [
      "Le questionnaire de santé conditionne la tarification et les exclusions. La loi Lemoine le supprime lorsque le capital assuré par personne reste sous {plafondLemoine} et que le remboursement s'achève avant les {ageTermeLemoine} de l'emprunteur.",
      "La même loi a raccourci le droit à l'oubli pour les pathologies cancéreuses et l'hépatite virale C. Hors de ces cas, une pathologie déclarée peut donner lieu à une surprime ou à une exclusion, dont la portée exacte se lit dans le contrat avant sa signature.",
    ],
    voirAussi: ["assuranceEmprunteur", "delegationAssurance"],
  }),

  /* ── Les garanties du prêteur ─────────────────────────────────────────── */

  garantie: developpement({
    theme: "garanties",
    famille: "negociable",
    paragraphes: [
      "Le prêteur exige une sûreté qui lui permette de récupérer sa créance en cas de défaillance. Trois formes coexistent : la caution d'un organisme, l'hypothèque sur le bien, et le nantissement d'un contrat d'épargne.",
      "Leurs coûts d'entrée se ressemblent — de l'ordre de {coutCaution} du capital pour la caution, {coutHypotheque} pour l'hypothèque, {coutNantissement} pour le nantissement — mais leurs profils diffèrent dans le temps. La caution restitue une part au terme ; l'hypothèque coûte une mainlevée si le bien est vendu avant.",
    ],
    voirAussi: ["caution", "hypotheque", "mainlevee"],
  }),

  caution: developpement({
    theme: "garanties",
    famille: "negociable",
    paragraphes: [
      "La caution évite l'acte notarié et la publicité foncière : sa mise en place est rapide et ne laisse aucune trace sur le bien. Elle se paie à l'entrée, autour de {coutCaution} du capital emprunté.",
      "Cette contribution se partage entre une commission, acquise à l'organisme, et une part versée au fonds mutuel de garantie, dont une fraction — de l'ordre de {restitutionCaution} — revient à l'emprunteur au terme si aucun incident n'est survenu. L'organisme qui a dû indemniser la banque conserve un recours contre l'emprunteur.",
    ],
    voirAussi: ["fondsMutuelGarantie", "garantie", "hypotheque"],
  }),

  hypotheque: developpement({
    theme: "garanties",
    famille: "negociable",
    paragraphes: [
      "L'hypothèque est prise par acte notarié et publiée au fichier immobilier. Son coût, de l'ordre de {coutHypotheque} du capital garanti, est en grande partie fiscal : la taxe de publicité foncière en constitue le poste principal.",
      "Elle s'éteint d'elle-même un certain temps après la dernière échéance, sans frais ni démarche. Vendre ou solder avant ce terme oblige en revanche à une mainlevée, facturée autour de {coutMainlevee} du capital initialement garanti.",
    ],
    voirAussi: ["mainlevee", "caution", "garantie"],
  }),

  mainlevee: developpement({
    theme: "garanties",
    famille: "contraint",
    paragraphes: [
      "La mainlevée est l'acte par lequel le créancier reconnaît être payé et libère le bien de sa sûreté. Elle est indispensable pour vendre un bien encore hypothéqué, l'acquéreur ne pouvant pas reprendre l'hypothèque du vendeur.",
      "Son coût, autour de {coutMainlevee} du capital initialement garanti, s'ajoute aux frais de vente. C'est ce poste qui fait dépendre l'arbitrage entre caution et hypothèque de l'horizon de détention, et non du seul prix d'entrée.",
    ],
    voirAussi: ["hypotheque", "garantie", "plusValue"],
  }),

  fondsMutuelGarantie: developpement({
    theme: "garanties",
    paragraphes: [
      "Les organismes de caution ne sont pas des assureurs : ils mutualisent. Chaque emprunteur verse une contribution au fonds, et c'est ce fonds qui indemnise la banque lorsque l'un d'eux cesse de payer.",
      "La contribution est distincte de la commission, qui rémunère le service et reste acquise. Seule la part versée au fonds peut revenir à l'emprunteur au terme, et la fraction restituée dépend de la sinistralité constatée sur la période.",
    ],
    voirAussi: ["caution", "garantie"],
  }),

  /* ── Ce que la règle impose ───────────────────────────────────────────── */

  tauxEffort: developpement({
    theme: "octroi",
    famille: "reglementaire",
    paragraphes: [
      "Le taux d'effort rapporte l'ensemble des charges d'emprunt — mensualité, assurance, crédits en cours — aux revenus nets du foyer. Le HCSF le plafonne à {plafondEndettement}.",
      "La norme s'adresse aux banques et non aux emprunteurs : {margeDerogation} de la production trimestrielle peut y déroger, et cette marge est prioritairement réservée à l'acquisition d'une résidence principale par un primo-accédant. Un dossier au-dessus du plafond n'est pas hors la loi, il est hors norme.",
    ],
    voirAussi: ["hcsf", "resteAVivre", "revenuFoyer"],
  }),

  revenuFoyer: developpement({
    theme: "octroi",
    famille: "contraint",
    paragraphes: [
      "Les revenus retenus ne sont pas ceux de l'avis d'imposition. Les salaires stables comptent en entier ; les revenus variables sont lissés sur plusieurs exercices ; les revenus locatifs ne sont retenus qu'après un abattement forfaitaire.",
      "Ce périmètre varie d'un établissement à l'autre, et c'est l'une des raisons pour lesquelles deux banques annoncent des capacités différentes sur un dossier identique.",
    ],
    voirAussi: ["tauxEffort", "capaciteEmprunt", "resteAVivre"],
  }),

  resteAVivre: developpement({
    theme: "octroi",
    famille: "contraint",
    paragraphes: [
      "Le reste à vivre est le contrepoids du taux d'effort. Un même ratio ne pèse pas de la même façon sur des revenus modestes et sur des revenus élevés : ce qui subsiste après le crédit n'est pas proportionnel au revenu.",
      "Aucun texte ne le définit ni ne le chiffre. Chaque banque pose son propre seuil, souvent exprimé par personne du foyer et majoré par enfant, et ce seuil peut refuser un dossier que le plafond d'endettement acceptait.",
    ],
    voirAussi: ["tauxEffort", "revenuFoyer", "capaciteEmprunt"],
  }),

  sautDeCharge: developpement({
    theme: "octroi",
    famille: "contraint",
    paragraphes: [
      "Le saut de charge compare la future mensualité à la charge de logement actuelle, loyer ou crédit en cours. Il mesure l'effort supplémentaire réellement demandé au foyer, là où le taux d'effort ne mesure qu'un rapport.",
      "Un saut faible ou négatif rassure : le foyer a déjà démontré qu'il supportait cette charge. Un saut important attire l'examen même sous le plafond, et l'épargne accumulée pendant la période de location sert alors de démonstration.",
    ],
    voirAussi: ["tauxEffort", "resteAVivre"],
  }),

  tauxUsure: developpement({
    theme: "octroi",
    famille: "reglementaire",
    paragraphes: [
      "Le taux d'usure est le TAEG maximal légal. La Banque de France le publie par catégorie de prêt et par trimestre, en majorant d'un tiers les taux effectifs moyens pratiqués au trimestre précédent.",
      "Pour le trimestre {trimestreUsure}, le seuil des prêts à taux fixe de vingt ans et plus s'établit à {usureLongue}, celui des prêts de dix à vingt ans à {usureMoyenne}. Comme il porte sur le TAEG complet, un dossier peut le franchir à cause de l'assurance seule, taux nominal inchangé — et c'est ainsi que la plupart des refus surviennent.",
    ],
    voirAussi: ["taeg", "taea", "pretRelais"],
  }),

  hcsf: developpement({
    theme: "octroi",
    famille: "reglementaire",
    paragraphes: [
      "Le Haut Conseil de stabilité financière est une autorité macroprudentielle. Ses décisions ne s'adressent pas aux emprunteurs mais aux établissements prêteurs, dont elles encadrent la production de crédit.",
      "Deux normes structurent le crédit immobilier : un taux d'effort plafonné à {plafondEndettement} et une durée plafonnée à {plafond}, portée à {derogatoire} dans les cas prévus. Une part de la production trimestrielle, {margeDerogation}, échappe à ces deux plafonds.",
    ],
    voirAussi: ["tauxEffort", "duree", "travaux"],
  }),

  travaux: developpement({
    theme: "octroi",
    famille: "contraint",
    paragraphes: [
      "La durée dérogatoire s'ouvre lorsque l'opération porte sur du neuf, sur une construction, ou sur un logement dont les travaux représentent au moins {partTravaux} du montant emprunté.",
      "La durée passe alors de {plafond} à {derogatoire}. Le seuil s'apprécie sur devis, et il a déjà été abaissé une fois depuis l'entrée en vigueur des normes : c'est le genre de valeur qu'une décision déplace sans préavis, et qui n'a donc rien à faire écrite dans un texte.",
    ],
    voirAussi: ["duree", "hcsf", "vefa"],
  }),

  /* ── Acquérir : frais, taxes et aides ─────────────────────────────────── */

  fraisAcquisition: developpement({
    theme: "acquisition",
    paragraphes: [
      "Les frais d'acquisition réunissent quatre postes : les droits de mutation, qui vont au département et à la commune ; la contribution de sécurité immobilière ; les débours avancés par le notaire ; et ses émoluments, seule part qui le rémunère.",
      "Ils pèsent {fraisAncien} du prix dans l'ancien et {fraisNeuf} dans le neuf. La fiscalité en représente de loin la plus grande part, et c'est pourquoi l'appellation courante de « frais de notaire » induit systématiquement en erreur sur ce qui est négociable.",
    ],
    voirAussi: ["droitsMutation", "emolumentsNotaire", "mobilier"],
  }),

  droitsMutation: developpement({
    theme: "acquisition",
    famille: "reglementaire",
    paragraphes: [
      "Les droits de mutation à titre onéreux se composent d'une part départementale, d'une part communale et d'un prélèvement pour frais d'assiette. La loi de finances a ouvert aux départements la faculté de relever leur part, et tous ne l'ont pas exercée.",
      "Le taux total atteint {dmtoPlein} là où la hausse a été votée, {dmtoStandard} ailleurs, et {dmtoReduit} dans les départements historiquement à taux réduit. Les primo-accédants en sont exclus de plein droit et restent à {dmtoPrimo}. Dans le neuf, ce sont la taxe de publicité foncière et son taux de {publiciteFonciere} qui s'appliquent à la place.",
    ],
    voirAussi: ["fraisAcquisition", "mobilier", "pretTauxZero"],
  }),

  emolumentsNotaire: developpement({
    theme: "acquisition",
    famille: "negociable",
    paragraphes: [
      "Les émoluments sont tarifés par décret, en tranches dégressives : la même vente donne le même émolument chez n'importe quel notaire. C'est ce qui rend l'idée de « faire jouer la concurrence » inopérante sur l'essentiel du poste.",
      "Une remise reste possible sur la seule fraction du prix au-delà de {seuilRemiseEmoluments}, dans la limite de {remiseEmoluments}. Elle est facultative, mais le notaire qui l'accorde doit l'appliquer à tous ses clients pour une prestation de même nature.",
    ],
    voirAussi: ["fraisAcquisition", "mobilier"],
  }),

  mobilier: developpement({
    theme: "acquisition",
    famille: "negociable",
    paragraphes: [
      "Les droits de mutation portent sur le prix de l'immeuble. Le mobilier vendu avec lui — cuisine équipée, meubles de salle de bains, équipements amovibles — sort de cette assiette, ce qui réduit la taxe due.",
      "La déduction se justifie par un inventaire chiffré, pièce par pièce, à la valeur d'occasion. La pratique la contient sous {partMobilier} du prix ; au-delà, elle appelle une justification que l'administration peut contrôler, et le redressement porte alors sur les droits éludés.",
    ],
    voirAussi: ["droitsMutation", "fraisAcquisition"],
  }),

  pretTauxZero: developpement({
    theme: "acquisition",
    famille: "reglementaire",
    paragraphes: [
      "Le prêt à taux zéro est un prêt sans intérêt dont l'État prend le coût en charge. Il ne finance jamais l'opération entière : il complète un prêt principal, et la plupart des banques le comptent comme de l'apport dans leur analyse.",
      "Trois paramètres le déterminent : la nature du logement, la composition du foyer et les revenus. La zone géographique n'agit ni sur la quotité ni sur la durée, mais sur le plafond d'opération retenu et sur les seuils de tranche de revenus — c'est le contresens le plus répandu à son sujet.",
    ],
    voirAussi: ["lissage", "droitsMutation", "ira"],
  }),

  vefa: developpement({
    theme: "acquisition",
    famille: "contraint",
    paragraphes: [
      "Dans une vente en l'état futur d'achèvement, l'acquéreur devient propriétaire du sol dès la signature, puis des constructions au fur et à mesure de leur exécution. Le prix se libère par appels de fonds calés sur l'avancement.",
      "Le crédit ne se débloque donc pas d'un coup : jusqu'à la livraison, l'emprunteur paie des intérêts intercalaires sur les seules sommes déjà versées, avant que l'amortissement ne commence. L'opération ouvre la durée dérogatoire du HCSF.",
    ],
    voirAussi: ["differeAmortissement", "travaux", "fraisAcquisition"],
  }),

  /* ── Détenir, revendre, comparer ──────────────────────────────────────── */

  plusValue: developpement({
    theme: "patrimoine",
    famille: "reglementaire",
    paragraphes: [
      "La plus-value imposable n'est pas l'écart brut entre deux prix. Le prix d'acquisition se majore des frais d'acquisition et des travaux réalisés, selon des règles de justification précises, ce qui réduit d'autant l'assiette.",
      "La résidence principale en est exonérée, sans condition de durée de détention. Pour tout autre bien, la plus-value supporte l'impôt sur le revenu et les prélèvements sociaux, chacun avec son propre barème d'abattement.",
    ],
    voirAussi: ["abattementDuree", "prelevementsSociaux", "taxeFonciere"],
  }),

  prelevementsSociaux: developpement({
    theme: "patrimoine",
    famille: "reglementaire",
    paragraphes: [
      "Les prélèvements sociaux frappent les revenus du capital et du patrimoine, indépendamment de l'impôt sur le revenu et sans lien avec la tranche marginale du foyer.",
      "Sur une plus-value immobilière, ils suivent leur propre calendrier d'abattement, plus lent que celui de l'impôt. Un bien peut donc être totalement exonéré d'impôt sur le revenu tout en restant soumis aux prélèvements sociaux plusieurs années encore.",
    ],
    voirAussi: ["plusValue", "abattementDuree"],
  }),

  abattementDuree: developpement({
    theme: "patrimoine",
    famille: "reglementaire",
    paragraphes: [
      "L'abattement pour durée de détention réduit la plus-value imposable année après année, au-delà d'un seuil de détention en deçà duquel il ne joue pas du tout.",
      "Deux barèmes coexistent, l'un pour l'impôt sur le revenu, l'autre pour les prélèvements sociaux, et ils n'atteignent pas l'exonération totale la même année. Une revente calée sur la première échéance laisse subsister la seconde imposition.",
    ],
    voirAussi: ["plusValue", "prelevementsSociaux"],
  }),

  effetLevier: developpement({
    theme: "patrimoine",
    paragraphes: [
      "Le levier vient de ce qu'un crédit fait travailler une valeur bien supérieure à la somme immobilisée. Une variation de prix se rapporte au bien entier, tandis que le gain se mesure sur le seul apport : le rapport des deux est le levier.",
      "L'amplification joue à l'identique dans l'autre sens, et la dette, elle, ne se déprécie pas avec le bien. Le levier n'est favorable que tant que le rendement total du bien dépasse le coût complet de la dette qui le finance — une condition, pas une propriété.",
    ],
    voirAussi: ["coutOpportunite", "coutDuCredit", "plusValue"],
  }),

  taxeFonciere: developpement({
    theme: "patrimoine",
    famille: "reglementaire",
    paragraphes: [
      "La taxe foncière est établie au nom de celui qui est propriétaire au 1er janvier de l'année. Une vente en cours d'année n'y change rien : sa répartition entre vendeur et acquéreur relève d'une convention entre eux, pas de l'administration.",
      "Son assiette est la valeur locative cadastrale, revalorisée chaque année, à laquelle s'appliquent des taux votés par les collectivités. C'est une charge récurrente de la détention, absente de la mensualité comme du TAEG, et décisive dans une comparaison entre acheter et louer.",
    ],
    voirAussi: ["plusValue", "coutDuCredit"],
  }),
} as const satisfies Readonly<Record<CleGlossaire, Developpement>>;
