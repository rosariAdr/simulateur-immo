/**
 * PORTEFEUILLE DU LOCATAIRE DE RÉFÉRENCE — `ENG-011`
 *
 * ═══ CE QUE CE MODULE EXISTE POUR DIRE ═══
 *
 * Comparer une mensualité à un loyer est un raisonnement faux, et c'est celui
 * que font tous les simulateurs. Le raisonnement juste demande un adversaire
 * explicite : **le locataire de référence**.
 *
 * Il place l'apport que l'acquéreur a versé au notaire, puis, chaque mois,
 * l'écart entre le coût de propriétaire et son propre loyer, à un rendement net
 * d'impôt. Il fait donc exactement le même effort financier, euro pour euro et
 * mois pour mois. À l'horizon, on compare deux patrimoines constitués par le
 * même effort — pas une mensualité à un loyer.
 *
 * C'est la seule comparaison honnête : elle rend le coût d'opportunité
 * explicite. Sans elle, l'apport de l'acquéreur apparaît comme un chiffre nul,
 * alors qu'il aurait pu travailler ailleurs.
 *
 * Ce module ne connaît ni bien immobilier, ni crédit, ni loyer. Il reçoit une
 * série de versements mensuels et un rendement, et rend une trajectoire de
 * valeur. C'est `detention.ts` qui produit la série ; c'est l'appelant qui
 * compare. **Ce module ne conclut rien** : il n'existe ici aucun champ
 * « gagnant », aucun écart signé, aucune formulation d'arbitrage.
 *
 * ═══ LES TROIS DÉCISIONS DE MODÉLISATION ═══
 *
 * ── 1. LE VERSEMENT PEUT ÊTRE NÉGATIF, ET LE PORTEFEUILLE NE PEUT PAS ───────
 *
 * Certains mois, être propriétaire coûte MOINS cher que louer — un taux bas,
 * un loyer de marché élevé, ou simplement le prêt arrivé à son terme. Le
 * locataire de référence doit alors *retirer* de son portefeuille pour que
 * l'effort reste identique de part et d'autre. D'où des versements négatifs.
 *
 * Que se passe-t-il quand le portefeuille tombe à zéro et que le retrait
 * demandé dépasse ce qui reste ?
 *
 * **Décision : le retrait est tronqué à la valeur disponible, la valeur reste à
 * zéro, et la part non financée est rendue explicitement.**
 *
 * Le refus vise l'alternative : laisser la valeur devenir négative. Une valeur
 * négative n'est pas un portefeuille, c'est un crédit à la consommation — avec
 * son taux, sa durée, son assurance, dont ce module ne sait rien. Lui appliquer
 * le rendement des marchés produirait deux absurdités selon le signe : à
 * rendement positif, la dette *rapporterait* ; à rendement négatif, elle
 * s'effacerait toute seule. Dans les deux cas le chiffre final resterait
 * plausible et serait faux, ce qui est le pire des défauts pour un simulateur.
 *
 * Tronquer expose au contraire la rupture au lieu de la lisser : à partir de
 * `moisEpuisement`, l'hypothèse « effort d'épargne identique » ne tient plus,
 * et l'interface doit le dire. `nonFinance` chiffre exactement ce qui manque.
 * Un mode « découvert » supposerait un taux d'emprunt en paramètre : ce serait
 * un autre modèle, pas une option de celui-ci.
 *
 * ── 2. LE RENDEMENT EST UNE HYPOTHÈSE, PAS UNE DONNÉE ───────────────────────
 *
 * Il entre en paramètre, obligatoire, sans valeur par défaut. **Aucune fonction
 * de ce fichier ne suppose un rendement.** Les ordres de grandeur publiés plus
 * bas (`RENDEMENTS_NETS_OBSERVES`) sont des données exportées, jamais lues par
 * le calcul : l'interface les propose, l'utilisateur les remplace, le moteur ne
 * les connaît pas. `docs/CONTEXT.md` §8 : « pas de prévision de marché ».
 *
 * ── 3. LE RENDEMENT ENTRE **NET D'IMPÔT** ══════════════════════════════════
 *
 * ⚠️ AVERTISSEMENT À QUI REPRENDRA CE FICHIER ⚠️
 *
 * `rendementAnnuelNetPct` est déjà **net de toute fiscalité**. Ce module
 * n'applique aucun prélèvement, aucun abattement, aucun forfait, et ne doit
 * jamais en appliquer. La modélisation des enveloppes — plan d'épargne en
 * actions après cinq ans, assurance-vie après huit ans, compte-titres au
 * prélèvement forfaitaire unique — est le ticket `ENG-023`, phase 5.
 *
 * Quand `ENG-023` arrivera, il produira un rendement net à partir d'un
 * rendement brut et d'une enveloppe, **en amont** de ce module. Il ne doit rien
 * retrancher ici. Retrancher deux fois est l'erreur qui ne se voit pas : le
 * résultat reste vraisemblable, et il est faux d'un quart.
 */

import {
  type Cents,
  type PercentPerYear,
  type RoundingMode,
  assertSafe,
  roundCents,
} from "../money";

/* ── Hypothèses de rendement ──────────────────────────────────────────────── */

/**
 * ⚠️ EMPLACEMENT PROVISOIRE.
 *
 * Ces fourchettes relèvent de `src/core/assumptions/market.ts` (ADR-008 : la loi
 * et le marché ne vivent pas dans le même fichier). Elles sont déclarées ici
 * parce que ce fichier était pris par un autre chantier au moment d'écrire
 * `ENG-011`. **À déplacer**, sans les modifier, dès que les deux branches sont
 * réunies. Le type ci-dessous reproduit volontairement la forme de
 * `FourchetteObservee` pour que le déplacement soit mécanique.
 */
export interface FourchetteDeRendement {
  /** Bornes observées, en pourcentage annuel net d'impôt, bornes comprises. */
  readonly intervalle: readonly [number, number];
  /** `observee` : relevé sur des séries publiées. `estimee` : ordre de grandeur. */
  readonly fiabilite: "observee" | "estimee";
  /** D'où vient le chiffre, en une phrase lisible par un non-technicien. */
  readonly provenance: string;
}

/**
 * Ordres de grandeur proposés à l'utilisateur, **jamais employés par le calcul**.
 *
 * Il n'y a pas de valeur centrale, et c'en est le sujet : donner une valeur
 * unique reviendrait à publier une prévision. L'interface montre l'intervalle,
 * l'utilisateur choisit son point, et le résultat porte l'hypothèse retenue.
 */
export const RENDEMENTS_NETS_OBSERVES: Readonly<Record<string, FourchetteDeRendement>> = {
  /** Support à capital garanti, type fonds en euros. */
  sansRisque: {
    intervalle: [1.5, 3],
    fiabilite: "estimee",
    provenance:
      "Ordre de grandeur pour un support à capital garanti, net des prélèvements. " +
      "Non recoupé sur des sources primaires : à confronter aux rendements publiés " +
      "par les assureurs, voir le ticket de recoupement des hypothèses de marché.",
  },
  /** Portefeuille d'actions diversifié, détenu longtemps. */
  actionsDiversifiees: {
    intervalle: [4, 7],
    fiabilite: "estimee",
    provenance:
      "Ordre de grandeur communément retenu pour un portefeuille d'actions " +
      "diversifié détenu sur longue période, net d'impôt et de frais. Cette " +
      "fourchette est une espérance : elle ne dit rien de la dispersion, que seule " +
      "une simulation de trajectoires rend visible (phase 5).",
  },
};

/* ── Conversion du rendement annuel en rendement mensuel ──────────────────── */

/**
 * Rendement mensuel **équivalent actuariel** d'un rendement annuel.
 *
 *     rₘ = (1 + rₐ)^(1/12) − 1
 *
 * ⚠️ Ce n'est PAS `monthlyRate` de `money.ts`, et la différence est volontaire.
 *
 * Le moteur crédit divise par douze parce qu'un contrat de prêt français le
 * stipule ainsi : le taux mensuel proportionnel est une convention contractuelle
 * (art. R314-3 du Code de la consommation), pas une propriété des nombres.
 *
 * Un rendement de portefeuille n'a pas de contrat. « 5 % par an » y signifie
 * exactement 5 % au bout d'un an. Diviser par douze puis capitaliser douze fois
 * rendrait 5,1162 % — on aurait fabriqué 0,116 point de performance à partir de
 * rien, et l'erreur croît avec le rendement supposé : +0,229 point à 7 %.
 * Mesuré sur 300 mois (apport 50 000 €, versements de 500 €, 5 % net) : la
 * convention proportionnelle rend 471 819,38 € contre 462 185,01 €, soit
 * **2,08 % de capital final en trop**, dans le sens qui flatte les marchés face
 * à la pierre. Le module refuse ce biais.
 *
 * @param rendementAnnuelNetPct rendement annuel net d'impôt, en % (5 = 5 %).
 */
export function tauxMensuelEquivalent(rendementAnnuelNetPct: PercentPerYear): number {
  if (!Number.isFinite(rendementAnnuelNetPct)) {
    throw new RangeError("tauxMensuelEquivalent : rendement non fini");
  }
  const annuel = rendementAnnuelNetPct / 100;
  // Perdre 100 % ou plus en un an ne laisse rien à capitaliser : la racine
  // douzième n'est pas définie sur un facteur négatif, et le domaine métier
  // s'arrête bien avant. On refuse au lieu de rendre un NaN qui voyagerait.
  if (annuel <= -1) {
    throw new RangeError(
      `tauxMensuelEquivalent : rendement annuel de ${rendementAnnuelNetPct} %, ` +
        "soit une perte totale ou davantage. Hors domaine.",
    );
  }
  if (annuel === 0) return 0;
  return Math.pow(1 + annuel, 1 / 12) - 1;
}

/* ── Entrée ───────────────────────────────────────────────────────────────── */

export interface EntreePortefeuille {
  /**
   * Somme placée à l'ouverture, en centimes. C'est l'apport que l'acquéreur a,
   * lui, versé au notaire. Doit être positive ou nulle : on ne place pas une
   * dette.
   */
  readonly apport: Cents;
  /**
   * Versement de chaque mois, en centimes, dans l'ordre. Un élément par mois.
   * **Positif** : le locataire de référence épargne l'écart d'effort.
   * **Négatif** : être propriétaire coûtait moins cher ce mois-là, il retire.
   * Un tableau vide est licite : l'horizon est alors nul.
   */
  readonly versements: readonly Cents[];
  /**
   * Rendement annuel **net d'impôt**, en pourcentage (5 = 5 %). Hypothèse de
   * l'utilisateur, sans valeur par défaut. Peut être négatif. Voir l'en-tête du
   * fichier, décision de modélisation n° 3 : aucune fiscalité ne s'applique ici.
   */
  readonly rendementAnnuelNetPct: PercentPerYear;
  /** Convention d'arrondi. Voir `money.ts`. Défaut : arrondi commercial. */
  readonly rounding?: RoundingMode;
}

/* ── Sortie ───────────────────────────────────────────────────────────────── */

export interface EcheancePortefeuille {
  /** 0 pour l'ouverture — le seul mois où l'apport entre —, puis 1, 2, … */
  readonly mois: number;
  /** Ce que le locataire de référence aurait dû verser ou retirer ce mois-là. */
  readonly versementDemande: Cents;
  /** Ce qu'il a pu verser ou retirer. Diffère du précédent si le solde manquait. */
  readonly versementRealise: Cents;
  /** Part du retrait que le portefeuille n'a pas pu financer. Toujours ≥ 0. */
  readonly nonFinance: Cents;
  /** Gain du mois, arrondi au centime. Négatif si le rendement l'est. */
  readonly rendement: Cents;
  /** Effort d'épargne réel cumulé, apport compris. Peut décroître sur retraits. */
  readonly capitalVerse: Cents;
  /** Cumul des rendements mensuels. Nul si le rendement est nul. */
  readonly gains: Cents;
  /** Valeur du portefeuille après l'échéance. Vaut `capitalVerse + gains`, au centime. */
  readonly valeur: Cents;
}

export interface Portefeuille {
  /** Une ligne par mois, **plus** la ligne d'ouverture au mois 0. */
  readonly echeances: readonly EcheancePortefeuille[];
  /** Effort d'épargne réel total : apport + versements effectivement réalisés. */
  readonly capitalVerse: Cents;
  /** Gains cumulés à l'horizon. */
  readonly gains: Cents;
  /** Valeur finale. Vaut `capitalVerse + gains`, au centime. */
  readonly valeur: Cents;
  /** Total de ce que le portefeuille n'a pas pu financer. Toujours ≥ 0. */
  readonly nonFinance: Cents;
  /**
   * Premier mois où un retrait a dû être tronqué faute de solde, ou `null` si
   * le portefeuille a tenu tout l'horizon.
   *
   * À partir de ce mois, l'hypothèse d'effort identique ne tient plus et la
   * comparaison cesse d'être une comparaison. L'interface doit le signaler
   * plutôt que d'afficher un écart final comme si de rien n'était.
   */
  readonly moisEpuisement: number | null;
}

/* ── Le calcul ────────────────────────────────────────────────────────────── */

/**
 * Construit la trajectoire du portefeuille du locataire de référence.
 *
 * ── ORDRE DE CALCUL, ET POURQUOI CELUI-LÀ ───────────────────────────────────
 *
 * Mois 0 : l'apport entre. Il ne produit aucun rendement ce mois-là.
 * Mois m ≥ 1, dans cet ordre :
 *   1. le rendement s'applique à la valeur d'ouverture ;
 *   2. le versement du mois s'ajoute — ou se retire — ensuite.
 *
 * Un versement ne rapporte donc rien le mois où il est fait. C'est la
 * convention du terme échu, celle de l'échéancier de crédit (`credit/schedule.ts`,
 * où les intérêts portent sur le capital restant dû d'ouverture). Les deux
 * côtés de la comparaison suivent ainsi la même règle de calendrier, ce qui est
 * la condition pour que l'écart final signifie quelque chose. La convention
 * inverse — verser puis capitaliser — avantagerait mécaniquement le locataire
 * d'un mois de rendement sur chaque versement.
 *
 * ── ARRONDI : POURQUOI CHAQUE MOIS, ET PAS SEULEMENT À L'AFFICHAGE ──────────
 *
 * Capitaliser sur 300 mois est l'endroit exact où une erreur d'arrondi devient
 * visible. Deux conventions étaient possibles.
 *
 * Porter la valeur en flottant et n'arrondir qu'à l'affichage donnerait la
 * capitalisation « mathématique ». Mais alors `capitalVerse + gains` ne
 * retomberait plus sur `valeur` au centime : trois nombres arrondis
 * séparément, et l'interface afficherait une somme qui ne se vérifie pas. Un
 * utilisateur qui additionne deux chiffres affichés et n'obtient pas le
 * troisième a raison de ne plus croire le reste.
 *
 * **Convention retenue : le gain de chaque mois est arrondi au centime et
 * s'ajoute à un solde entier**, comme les intérêts d'une échéance bancaire.
 * L'invariant `capitalVerse + gains = valeur` tient alors **par construction**,
 * à tout mois et à tout rendement — ce n'est pas une propriété qu'on espère,
 * c'est la même série d'entiers lue de deux façons.
 *
 * Le prix payé est un écart déterministe avec la capitalisation en flottant.
 * Mesuré, et gardé par un test : sur 300 mois, un apport de 50 000 € et 300
 * versements de 500 € à 5 % net, la valeur entière vaut **462 185,00 €** contre
 * 462 185,0073 € en flottant — **moins d'un centime d'écart**, soit 1,6 × 10⁻⁸
 * du résultat. L'arrondi commercial ne biaise pas dans un sens : il se compense
 * d'un mois à l'autre au lieu de s'accumuler.
 *
 * L'ordre de grandeur est le bon : l'erreur possible est d'un demi-centime par
 * mois, capitalisée sur le reste de l'horizon. Elle reste à quatre ordres de
 * grandeur sous les 5 € que le projet s'autorise entre conventions d'arrondi
 * sur 300 échéances.
 *
 * @throws RangeError si l'apport est négatif, si un montant n'est pas un entier
 *         de centimes, ou si le rendement sort du domaine (perte ≥ 100 % par an).
 */
export function construirePortefeuille(entree: EntreePortefeuille): Portefeuille {
  const { apport, versements, rendementAnnuelNetPct } = entree;
  const mode: RoundingMode = entree.rounding ?? "half-up";

  if (!Number.isInteger(apport)) {
    throw new RangeError("construirePortefeuille : l'apport n'est pas un entier de centimes");
  }
  if (apport < 0) {
    throw new RangeError(
      `construirePortefeuille : apport négatif (${apport} centimes). On ne place pas une dette ; ` +
        "un effort d'épargne négatif se porte sur les versements, pas sur l'apport.",
    );
  }
  assertSafe(apport, "construirePortefeuille (apport)");

  const r = tauxMensuelEquivalent(rendementAnnuelNetPct);

  const echeances: EcheancePortefeuille[] = [];

  let valeur: Cents = apport;
  let capitalVerse: Cents = apport;
  let gains: Cents = 0;
  let nonFinanceCumule: Cents = 0;
  let moisEpuisement: number | null = null;

  echeances.push({
    mois: 0,
    versementDemande: apport,
    versementRealise: apport,
    nonFinance: 0,
    rendement: 0,
    capitalVerse,
    gains,
    valeur,
  });

  for (let m = 1; m <= versements.length; m++) {
    const demande = versements[m - 1] as Cents;
    if (!Number.isInteger(demande)) {
      throw new RangeError(
        `construirePortefeuille : le versement du mois ${m} n'est pas un entier de centimes`,
      );
    }
    assertSafe(demande, `construirePortefeuille (versement ${m})`);

    // 1. Le rendement porte sur la valeur d'ouverture, arrondi au centime.
    //    Le solde étant toujours positif ou nul et |r| < 1, une perte ne peut
    //    pas dépasser le solde : la valeur ne devient jamais négative par ce
    //    chemin. Seul un retrait pourrait l'y conduire — c'est l'objet du 2.
    const rendement = valeur === 0 || r === 0 ? 0 : roundCents(valeur * r, mode);
    valeur += rendement;
    gains += rendement;

    // 2. Le versement. Un retrait ne descend pas sous zéro : il est tronqué à
    //    ce qui reste, et le manque est rendu explicite plutôt qu'absorbé.
    let realise = demande;
    let nonFinance: Cents = 0;
    if (demande < 0 && -demande > valeur) {
      realise = -valeur;
      nonFinance = -demande - valeur;
      if (moisEpuisement === null) moisEpuisement = m;
    }
    valeur += realise;
    capitalVerse += realise;
    nonFinanceCumule += nonFinance;

    assertSafe(valeur, `construirePortefeuille (valeur au mois ${m})`);

    echeances.push({
      mois: m,
      versementDemande: demande,
      versementRealise: realise,
      nonFinance,
      rendement,
      capitalVerse,
      gains,
      valeur,
    });
  }

  return {
    echeances,
    capitalVerse,
    gains,
    valeur,
    nonFinance: nonFinanceCumule,
    moisEpuisement,
  };
}

/* ── Lectures ─────────────────────────────────────────────────────────────── */

/**
 * L'échéance d'un mois donné, ou `undefined` s'il est hors de l'horizon.
 * Le mois 0 est l'ouverture ; il existe toujours.
 */
export function echeanceAuMois(
  portefeuille: Portefeuille,
  mois: number,
): EcheancePortefeuille | undefined {
  return portefeuille.echeances[mois];
}

/**
 * Série des valeurs de fin d'année civile du portefeuille, mois 12, 24, 36…
 *
 * Utile aux courbes : une trajectoire de 300 points ne se lit pas, et l'année
 * est l'unité dans laquelle un horizon d'acquisition se pense. Le mois 0 n'y
 * figure pas — il n'est pas une fin d'année.
 */
export function valeursAnnuelles(portefeuille: Portefeuille): Cents[] {
  const sortie: Cents[] = [];
  for (let m = 12; m < portefeuille.echeances.length; m += 12) {
    sortie.push((portefeuille.echeances[m] as EcheancePortefeuille).valeur);
  }
  return sortie;
}
