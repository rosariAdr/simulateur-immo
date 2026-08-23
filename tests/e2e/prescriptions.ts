/**
 * LES TOURNURES QUE LE PRODUIT S'INTERDIT
 *
 * `docs/CONTEXT.md` §8 : « le produit calcule et explique, l'utilisateur décide.
 * “Dans cette configuration, l'écart est de X”, jamais “vous devriez”. » C'est
 * la règle la plus importante du projet, et celle qu'un écran de comparaison
 * enfreint le plus facilement.
 *
 * Cette liste vivait dans `tests/e2e/comparaison.spec.ts`. `UI-007` l'a sortie
 * ici pour que les deux niveaux du module « acheter ou louer » lisent la même —
 * une garde recopiée est une garde qui diverge, et c'est le niveau approfondi
 * qui aurait gardé la version courte.
 *
 * Elle n'est pas un fichier de test : Playwright ne collecte que `*.spec.ts`.
 */

/**
 * Le socle, commun à tout le produit.
 *
 * Les dix premières sont celles de `tests/e2e/fiche-credit.spec.ts` et de
 * `src/content/__tests__/fiche-credit.test.ts`.
 */
export const PRESCRIPTIONS_GENERALES: readonly RegExp[] = [
  /\bvous devriez\b/iu,
  /\bnous (?:vous )?(?:recommandons|conseillons)\b/iu,
  /\ble meilleur choix\b/iu,
  /\bil (?:vous )?faut\b/iu,
  /\bmieux vaut\b/iu,
  /\bpréférez\b/iu,
  /\bchoisissez\b/iu,
  /\bévitez\b/iu,
  /\bn['’]hésitez pas\b/iu,
  /\bvous avez (?:tout )?intérêt à\b/iu,
];

/**
 * Propres à un écran qui compare deux options.
 *
 * « À partir de l'année 12, acheter devient rentable » est la phrase que tous
 * les comparateurs écrivent, et elle est fausse deux fois : le niveau simple ne
 * mesure ni l'appréciation du bien, ni les frais de revente, ni le coût
 * d'opportunité de l'apport, et le produit ne désigne pas de gagnant.
 */
export const PRESCRIPTIONS_COMPARAISON: readonly RegExp[] = [
  /\brentab/iu,
  /\bgagnant\b/iu,
  /\bl['’]emporte\b/iu,
  /\bplus avantageux\b/iu,
];

/**
 * Propres au niveau patrimonial — `UI-007`.
 *
 * Cinq façons de déraper que le niveau simple ne pouvait pas offrir, parce
 * qu'il ne parlait ni de patrimoine, ni d'avenir, ni de moment de vente.
 *
 *   `vous aurez / gagnerez / perdrez` — une hypothèse énoncée comme un fait
 *   futur. C'est exactement ce que `docs/CONTEXT.md` §7 appelle un mensonge par
 *   excès de précision : « afficher “vous gagnerez 84 320 €” est un mensonge ».
 *   `vaut le coup`, `bon investissement`, `bon placement`, `plus riche` — le
 *   verdict patrimonial, sous ses quatre formes familières.
 *   `moment idéal / optimal / opportun / propice`, `au bon moment` — le piège
 *   propre à cet écran, et `cession.ts` le nomme lui-même : « un appelant qui
 *   balaie l'horizon pour tracer une courbe le fait sous sa responsabilité : le
 *   maximum de cette courbe n'est pas un conseil de vente ».
 */
export const PRESCRIPTIONS_PATRIMOINE: readonly RegExp[] = [
  /\bvous (?:aurez|gagnerez|perdrez)\b/iu,
  /\bvaut le coup\b/iu,
  /\bbon (?:investissement|placement)\b/iu,
  /\bplus riche\b/iu,
  /\bmoment (?:idéal|optimal|opportun|propice)\b/iu,
  /\bau bon moment\b/iu,
];
