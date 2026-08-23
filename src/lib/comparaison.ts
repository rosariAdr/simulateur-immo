/**
 * LE SCÉNARIO « ACHETER OU LOUER » VIT DANS L'URL — `VIZ-003`
 *
 * Même promesse que `src/lib/scenario.ts` pour le module crédit : pas de compte,
 * pas de base, pas de stockage local. Un scénario de comparaison est entièrement
 * décrit par l'adresse de la page, et les montants y sont en EUROS, jamais en
 * centimes — `ly=950` se lit, `ly=95000` ne se lit pas.
 *
 * ═══ POURQUOI CE FICHIER N'IMPORTE PAS `nuqs`, ET POURQUOI C'EST LE SUJET ═══
 *
 * `src/lib/scenario.ts` déclare ses parseurs `nuqs` au premier niveau. Toute
 * chaîne d'imports qui l'atteint traîne donc `nuqs` avec elle, et un composant
 * **serveur** qui la traverse ne compile pas. La dette est connue et n'est pas
 * traitée ici.
 *
 * Elle n'est pas non plus reproduite : ce module ne contient que du TypeScript
 * pur — des valeurs, des bornes, et la traduction vers le moteur. Les parseurs
 * `nuqs`, qui sont un détail de la couche cliente, vivent dans
 * `src/components/comparaison/useComparaison.ts`, sous `"use client"`. La page
 * serveur peut donc lire `DEFAUTS` sans rien entraîner derrière elle.
 *
 * ═══ CE QUI ENTRE DANS L'URL, ET CE QUI N'Y ENTRE PAS ═══
 *
 * Règle d'ADR-005 : **ce qui change un chiffre y entre, ce qui change un cadrage
 * n'y entre pas.** Sont donc dehors, et le restent :
 *
 *   — la lecture retenue (décaissement ou fonds perdus). Les deux séries sont
 *     calculées ensemble et les DEUX années de croisement sont affichées en
 *     permanence : la bascule ne change aucun chiffre, elle change lequel on
 *     regarde. C'est la définition même d'un cadrage.
 *   — l'année lue sous les courbes, exactement comme le curseur du ruban.
 *
 * Y entrent en revanche les dix-sept paramètres ci-dessous, sans exception :
 * chacun déplace une courbe.
 */

import { MARKET_2026 } from "@/core/assumptions/market";
import type { CreditPlanInput } from "@/core/credit/plan";
import type { EcheancierRepris, EntreeDetention } from "@/core/compare/types";
import { euros, type Cents } from "@/core/money";

/* ── Le scénario de départ ────────────────────────────────────────────────── */

const M = MARKET_2026.detention;

/**
 * Scénario d'ouverture. Comme celui de `/credit`, il n'a rien d'universel : il
 * est plausible, et il est là pour qu'un primo-accédant se reconnaisse sans
 * avoir rien saisi.
 *
 * **Les cinq premières valeurs sont celles que `/credit` ouvre par défaut.** Le
 * même ménage se retrouve donc dans les deux modules, et l'écran de comparaison
 * s'ouvre sur la mensualité que l'utilisateur vient de voir. Elles ne sont pas
 * importées de `src/lib/scenario.ts` — cet import ferait entrer `nuqs` ici, et
 * avec lui la dette décrite en tête de fichier. La copie est donc assumée, et
 * elle est **gardée** : `tests/e2e/comparaison.spec.ts` compare la mensualité
 * affichée par les deux modules et rougit si l'une des deux dérive.
 *
 * Les trois indexations et la provision pour travaux ne sont pas choisies non
 * plus : elles sont lues dans `src/core/assumptions/market.ts`, avec leur
 * intervalle et leur provenance. Une hypothèse de marché recopiée en dur ici
 * cesserait d'être révisable au seul endroit prévu pour ça.
 */
export const DEFAUTS = {
  /* Le bien et son financement — repris à l'identique de `/credit`. */
  prix: 205_000,
  apport: 25_000,
  taux: 3.2,
  dureeMois: 240,
  assuranceTaux: 0.3,

  /* La durée de projection. Volontairement plus longue que le prêt : c'est
     souvent après la dernière échéance que le décaissement du propriétaire
     s'effondre, et donc là que le croisement se produit. */
  horizonAnnees: 30,

  /* Ce que coûte la propriété, hors crédit. Montants annuels, sauf mention. */
  taxeFonciere: 1_400,
  chargesCopropriete: 900,
  assuranceHabitation: 260,
  provisionTravauxPct: M.provisionTravauxPctAnnuel.valeur,
  /* Frais d'entrée jamais récupérés. Zéro, comme le « niveau simple » de
     `docs/03-spec-domaine.md` §2 — et c'est optimiste de plusieurs années sur un
     bien ancien. L'interface le dit à côté du champ, elle ne le tait pas. */
  fraisEntree: 0,

  /* Ce que coûte la location. Le loyer place le rendement brut du bien à 5,0 %
     — au milieu de la fourchette qu'on observe en France, et c'est ce rapport-là
     qui gouverne l'écran : un loyer choisi haut ou bas déplace le croisement de
     dix ans sans qu'on s'en aperçoive. */
  loyer: 850,
  chargesLocatives: 100,
  assuranceLocataire: 140,

  /* Vitesses de dérive annuelle, en %. Les deux côtés s'indexent — ADR-012. */
  indexationLoyer: M.indexationLoyerPctAnnuel.valeur,
  indexationTaxeFonciere: M.indexationTaxeFoncierePctAnnuel.valeur,
  indexationCharges: M.indexationChargesPctAnnuel.valeur,
} as const;

export type Comparaison = { -readonly [K in keyof typeof DEFAUTS]: number };

/**
 * Clés courtes dans l'URL, noms lisibles dans le code.
 *
 * Les cinq premières reprennent celles de `/credit` — `px`, `ap`, `tx`, `du`,
 * `as` — parce qu'elles désignent exactement les mêmes grandeurs. Deux clés
 * identiques pour deux sens différents seraient un piège ; deux clés différentes
 * pour le même sens seraient une gêne.
 */
export const CLES_URL = {
  prix: "px",
  apport: "ap",
  taux: "tx",
  dureeMois: "du",
  assuranceTaux: "as",
  horizonAnnees: "hz",
  taxeFonciere: "tf",
  chargesCopropriete: "cc",
  assuranceHabitation: "ah",
  provisionTravauxPct: "pt",
  fraisEntree: "fe",
  loyer: "ly",
  chargesLocatives: "cl",
  assuranceLocataire: "al",
  indexationLoyer: "il",
  indexationTaxeFonciere: "it",
  indexationCharges: "ic",
} as const satisfies Readonly<Record<keyof Comparaison, string>>;

/* ── Bornes ───────────────────────────────────────────────────────────────── */

/**
 * Une URL est du texte que n'importe qui peut écrire. Ces bornes ne valident pas
 * une saisie : elles empêchent qu'une adresse trafiquée fasse tourner le moteur
 * sur des entrées absurdes.
 *
 * Les trois indexations sont bornées à ±25 % par an, et ce n'est pas une
 * politesse. `ENG-010` a laissé une réserve explicite : au-delà de quelques
 * centaines de pour cent sur trente ans, les cumuls dépassent 2⁵³ centimes et
 * `sum` lève une `RangeError` plutôt que d'additionner faux. Le moteur a raison
 * de refuser ; c'est à l'interface de ne pas lui présenter ça, et c'est ici.
 */
export const BORNES: Readonly<Record<keyof Comparaison, { min: number; max: number }>> = {
  prix: { min: 0, max: 50_000_000 },
  apport: { min: 0, max: 50_000_000 },
  taux: { min: 0, max: 25 },
  dureeMois: { min: 1, max: 420 },
  assuranceTaux: { min: 0, max: 5 },
  horizonAnnees: { min: 1, max: 40 },
  taxeFonciere: { min: 0, max: 200_000 },
  chargesCopropriete: { min: 0, max: 200_000 },
  assuranceHabitation: { min: 0, max: 100_000 },
  provisionTravauxPct: { min: 0, max: 10 },
  fraisEntree: { min: 0, max: 5_000_000 },
  loyer: { min: 0, max: 100_000 },
  chargesLocatives: { min: 0, max: 100_000 },
  assuranceLocataire: { min: 0, max: 100_000 },
  indexationLoyer: { min: -25, max: 25 },
  indexationTaxeFonciere: { min: -25, max: 25 },
  indexationCharges: { min: -25, max: 25 },
};

/** Les quatre grandeurs qui se comptent en entiers : un demi-mois n'existe pas. */
const ENTIERS: readonly (keyof Comparaison)[] = ["dureeMois", "horizonAnnees"];

const borne = (valeur: number, min: number, max: number): number =>
  Number.isFinite(valeur) ? Math.min(Math.max(valeur, min), max) : min;

/** Ramène un scénario dans ses bornes, sans jamais échouer. */
export function assainir(scenario: Comparaison): Comparaison {
  const sortie = { ...scenario };
  for (const cle of Object.keys(DEFAUTS) as (keyof Comparaison)[]) {
    const b = BORNES[cle];
    const valeur = borne(scenario[cle], b.min, b.max);
    sortie[cle] = ENTIERS.includes(cle) ? Math.round(valeur) : valeur;
  }
  return sortie;
}

/* ── Passage au moteur ────────────────────────────────────────────────────── */

/** Capital emprunté : le prix moins l'apport, jamais négatif. */
export const capitalEmprunte = (s: Comparaison): Cents =>
  euros(Math.max(s.prix - s.apport, 0));

/**
 * Traduit le volet « financement » en entrée du moteur crédit.
 *
 * Deux absences volontaires. La **garantie** et les **frais de dossier** ne
 * figurent pas : ils n'entrent ni dans l'échéance ni dans `plan.rows`, seul
 * matériau que `comparerDetention` lit. Ils appartiennent aux frais d'entrée, et
 * l'utilisateur les saisit là — une seule fois, sous un seul nom, plutôt que
 * deux fois sous deux noms.
 *
 * `netMonthlyIncome` est nul : ce module ne contrôle aucun plafond
 * d'endettement, c'est le travail de `/credit`. Le champ est requis par le type,
 * pas par le calcul qui nous intéresse.
 */
export function versEntreeCredit(brut: Comparaison): CreditPlanInput {
  const s = assainir(brut);
  return {
    loans: [
      {
        id: "principal",
        label: "Prêt principal",
        principal: capitalEmprunte(s),
        annualRatePct: s.taux,
        months: s.dureeMois,
      },
    ],
    insurance: { annualRatePct: s.assuranceTaux, basis: "initial", coveragePct: 100 },
    guarantee: "suretyship",
    arrangementFee: 0,
    propertyPrice: euros(s.prix),
    netMonthlyIncome: 0,
  };
}

/**
 * Traduit le scénario en entrée de `comparerDetention`.
 *
 * L'échéancier est **repris**, jamais recalculé : c'est ce que dit le type
 * `EcheancierRepris` du moteur, et c'est ce qui garantit que la mensualité lue
 * ici est au centime celle que `/credit` affiche.
 *
 * Les trois indexations sont passées explicitement, y compris quand elles valent
 * leur valeur par défaut. Le moteur accepte de les compléter lui-même ; ne pas
 * s'en remettre à lui rend l'interface responsable de ce qu'elle affiche —
 * l'écran montre trois vitesses, ce sont ces trois-là qui servent.
 */
export function versEntreeDetention(
  brut: Comparaison,
  echeancier: EcheancierRepris,
): EntreeDetention {
  const s = assainir(brut);
  return {
    horizonMois: s.horizonAnnees * 12,
    proprietaire: {
      plan: echeancier,
      valeurBien: euros(s.prix),
      taxeFonciereAnnuelle: euros(s.taxeFonciere),
      chargesCoproprieteAnnuelles: euros(s.chargesCopropriete),
      assuranceHabitationAnnuelle: euros(s.assuranceHabitation),
      provisionTravauxPctAnnuel: s.provisionTravauxPct,
      fraisInitiauxNonRecuperables: euros(s.fraisEntree),
    },
    locataire: {
      loyerMensuelHorsCharges: euros(s.loyer),
      chargesLocativesMensuelles: euros(s.chargesLocatives),
      assuranceHabitationAnnuelle: euros(s.assuranceLocataire),
    },
    indexations: {
      loyerPctAnnuel: s.indexationLoyer,
      taxeFoncierePctAnnuel: s.indexationTaxeFonciere,
      chargesPctAnnuel: s.indexationCharges,
    },
  };
}

/* ── Les deux lectures ────────────────────────────────────────────────────── */

/**
 * Les deux façons de lire le même détail mensuel — ADR-012.
 *
 * Ce n'est pas un réglage d'affichage parmi d'autres : c'est le sujet du module.
 * Le type vit ici, à côté du scénario, plutôt que dans le composant, parce que
 * les libellés et la question à laquelle chaque lecture répond sont du contenu,
 * pas de la mise en page.
 */
export const LECTURES = ["decaissement", "fondsPerdus"] as const;
export type Lecture = (typeof LECTURES)[number];

export interface DescriptionLecture {
  readonly cle: Lecture;
  /** Nom court, celui de la bascule. */
  readonly libelle: string;
  /** La question à laquelle cette lecture répond, en une phrase. */
  readonly question: string;
  /** Ce qu'elle a de faux si on ne lit qu'elle. */
  readonly angleMort: string;
}

export const DESCRIPTION_LECTURE: Readonly<Record<Lecture, DescriptionLecture>> = {
  decaissement: {
    cle: "decaissement",
    libelle: "Décaissement",
    question: "Tout ce qui sort du compte — répond à « est-ce que je peux payer ».",
    angleMort:
      "Elle compte la part de capital comme une dépense, alors que cet argent change " +
      "de poche au lieu d'être consommé.",
  },
  fondsPerdus: {
    cle: "fondsPerdus",
    libelle: "Fonds perdus",
    question:
      "Le décaissement moins la part de capital — intérêts, assurances, charges, taxe " +
      "foncière, entretien.",
    angleMort:
      "Elle oublie que la somme immobilisée dans le bien n'est plus disponible pour " +
      "autre chose ; ce coût d'opportunité n'est pas mesuré à ce niveau.",
  },
};
