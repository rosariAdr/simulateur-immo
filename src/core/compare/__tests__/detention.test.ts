/**
 * COÛTS DE DÉTENTION — CAS DE RÉFÉRENCE — `ENG-010`
 *
 * Chaque cas est calculé à la main dans son commentaire. Un test qui recopie ce
 * que le code produit ne prouve rien ; celui-ci doit pouvoir être refait sur une
 * feuille de papier.
 *
 * Les scénarios sont volontairement dépouillés — postes à zéro, montants ronds,
 * indexations nulles sauf quand c'est elles qu'on teste. Un cas réaliste ferait
 * un beau test et un mauvais témoin : on ne saurait plus quelle ligne a bougé.
 */

import { describe, it, expect } from "vitest";
import { euros } from "../../money";
import type { ConsolidatedRow } from "../../credit/plan";
import { comparerDetention } from "../detention";
import type { EcheancierRepris, EntreeDetention } from "../types";

/* ── Outils de scénario ───────────────────────────────────────────────────── */

/**
 * Échéancier synthétique à échéance constante.
 *
 * Le module ne recalcule aucune mensualité : il lit les lignes qu'on lui donne.
 * On peut donc lui en fournir de parfaitement rondes, ce qui rend les totaux
 * vérifiables de tête. Le `balance` n'est pas lu et vaut zéro.
 */
function echeancier(mois: number, interets: number, capital: number, assurance: number): EcheancierRepris {
  const rows: ConsolidatedRow[] = [];
  for (let m = 1; m <= mois; m++) {
    rows.push({
      month: m,
      year: Math.ceil(m / 12),
      interest: euros(interets),
      principal: euros(capital),
      insurance: euros(assurance),
      payment: euros(interets) + euros(capital) + euros(assurance),
      balance: 0,
    });
  }
  return { rows };
}

/** Scénario neutre : tout à zéro, indexations comprises. On n'allume qu'un poste à la fois. */
const NEUTRE: EntreeDetention = {
  horizonMois: 12,
  proprietaire: {
    valeurBien: 0,
    taxeFonciereAnnuelle: 0,
    chargesCoproprieteAnnuelles: 0,
    assuranceHabitationAnnuelle: 0,
    provisionTravauxPctAnnuel: 0,
  },
  locataire: {
    loyerMensuelHorsCharges: 0,
    chargesLocativesMensuelles: 0,
    assuranceHabitationAnnuelle: 0,
  },
  indexations: { loyerPctAnnuel: 0, taxeFoncierePctAnnuel: 0, chargesPctAnnuel: 0 },
};

/* ── Cas A ────────────────────────────────────────────────────────────────── */

describe("cas A — achat comptant, aucune indexation", () => {
  /**
   * Propriétaire, par an :
   *   taxe foncière              1 200 €
   *   charges de copropriété       600 €
   *   provision travaux   1 % × 200 000 = 2 000 €
   *   assurance habitation         240 €
   *                             ─────────
   *                              4 040 €
   *
   * Locataire, par an :
   *   loyer                800 × 12 = 9 600 €
   *   charges locatives    100 × 12 = 1 200 €
   *   assurance habitation             120 €
   *                                ─────────
   *                                 10 920 €
   *
   * Sans crédit, il n'y a pas de part de capital : les deux lectures se
   * confondent des deux côtés.
   */
  const r = comparerDetention({
    ...NEUTRE,
    horizonMois: 24,
    proprietaire: {
      valeurBien: euros(200_000),
      taxeFonciereAnnuelle: euros(1_200),
      chargesCoproprieteAnnuelles: euros(600),
      assuranceHabitationAnnuelle: euros(240),
      provisionTravauxPctAnnuel: 1,
    },
    locataire: {
      loyerMensuelHorsCharges: euros(800),
      chargesLocativesMensuelles: euros(100),
      assuranceHabitationAnnuelle: euros(120),
    },
  });

  it("porte le coût annuel du propriétaire à 4 040 €", () => {
    expect(r.annees[0]!.proprietaire.decaissement).toBe(euros(4_040));
    expect(r.annees[0]!.proprietaire.provisionTravaux).toBe(euros(2_000));
  });

  it("porte le coût annuel du locataire à 10 920 €", () => {
    expect(r.annees[0]!.locataire.decaissement).toBe(euros(10_920));
  });

  it("confond les deux lectures faute de crédit", () => {
    expect(r.totaux.proprietaire.fondsPerdus).toBe(r.totaux.proprietaire.decaissement);
    expect(r.totaux.proprietaire.capitalConstitue).toBe(0);
  });

  it("croise dès la première année, dans les deux lectures", () => {
    // 4 040 € < 10 920 € : l'achat comptant est moins cher tout de suite. Le
    // niveau simple ne voit pas ce que coûtait le capital immobilisé.
    expect(r.croisement).toEqual({ decaissement: 1, fondsPerdus: 1 });
  });

  it("répète la même année sur l'horizon, et cumule", () => {
    expect(r.annees).toHaveLength(2);
    expect(r.annees[1]!.proprietaire.decaissement).toBe(euros(4_040));
    expect(r.annees[1]!.proprietaire.cumulDecaissement).toBe(euros(8_080));
    expect(r.annees[1]!.locataire.cumulDecaissement).toBe(euros(21_840));
    expect(r.annees[1]!.ecartCumulDecaissement).toBe(euros(8_080) - euros(21_840));
  });
});

/* ── Cas B ────────────────────────────────────────────────────────────────── */

describe("cas B — le cas qui justifie le module", () => {
  /**
   * Crédit : 12 échéances de 400 € d'intérêts + 600 € de capital + 40 €
   * d'assurance emprunteur. Taxe foncière 1 200 €/an, soit 100 €/mois. Rien
   * d'autre. Locataire : 900 €/mois, rien d'autre.
   *
   * Propriétaire, par mois :
   *   décaissement   400 + 600 + 40 + 100 = 1 140 €
   *   fonds perdus   1 140 − 600          =   540 €
   *
   * Sur douze mois :
   *   décaissement   13 680 €      capital constitué  7 200 €
   *   fonds perdus    6 480 €
   *
   * Locataire sur douze mois : 10 800 €, décaissement ET fonds perdus.
   *
   * LES DEUX LECTURES DISENT L'INVERSE L'UNE DE L'AUTRE :
   *   au décaissement, le propriétaire paye 2 880 € de plus ;
   *   en fonds perdus, il consomme 4 320 € de moins.
   * Les deux chiffres sont exacts. Aucun ne suffit.
   */
  const r = comparerDetention({
    ...NEUTRE,
    proprietaire: {
      ...NEUTRE.proprietaire,
      plan: echeancier(12, 400, 600, 40),
      valeurBien: euros(250_000),
      taxeFonciereAnnuelle: euros(1_200),
    },
    locataire: { ...NEUTRE.locataire, loyerMensuelHorsCharges: euros(900) },
  });

  it("décaisse 1 140 € par mois et en perd 540 €", () => {
    const m = r.mois[0]!.proprietaire;
    expect(m.decaissement).toBe(euros(1_140));
    expect(m.fondsPerdus).toBe(euros(540));
    expect(m.decaissement - m.fondsPerdus).toBe(m.capital);
  });

  it("totalise 13 680 € décaissés, 6 480 € perdus, 7 200 € constitués", () => {
    expect(r.totaux.proprietaire.decaissement).toBe(euros(13_680));
    expect(r.totaux.proprietaire.fondsPerdus).toBe(euros(6_480));
    expect(r.totaux.proprietaire.capitalConstitue).toBe(euros(7_200));
  });

  it("ne constitue rien côté locataire", () => {
    expect(r.totaux.locataire.decaissement).toBe(euros(10_800));
    expect(r.totaux.locataire.fondsPerdus).toBe(euros(10_800));
  });

  it("croise en fonds perdus, jamais au décaissement", () => {
    // C'est tout le ticket dans une assertion. Le même ménage, le même mois :
    // « je paye 240 € de plus que mon voisin locataire » et « je consomme 360 €
    // de moins que lui » sont vrais en même temps.
    expect(r.croisement.decaissement).toBeNull();
    expect(r.croisement.fondsPerdus).toBe(1);
  });

  it("chiffre les deux écarts sans en désigner un", () => {
    expect(r.totaux.ecartDecaissement).toBe(euros(2_880));
    expect(r.totaux.ecartFondsPerdus).toBe(-euros(4_320));
  });
});

/* ── Cas C ────────────────────────────────────────────────────────────────── */

describe("cas C — indexation du loyer, composée depuis la base", () => {
  /**
   * Loyer 1 000 €/mois, révisé de 2 % par an, trois ans.
   *   année 1   1 000,00 × 12 = 12 000,00 €
   *   année 2   1 000 × 1,02        = 1 020,00 → 12 240,00 €
   *   année 3   1 000 × 1,02²       = 1 040,40 → 12 484,80 €
   *                                              ──────────
   *                                              36 724,80 €
   *
   * Composé depuis la base et non d'année en année : arrondir chaque année puis
   * réindexer l'arrondi ferait dériver la série sur trente ans.
   */
  const r = comparerDetention({
    ...NEUTRE,
    horizonMois: 36,
    locataire: { ...NEUTRE.locataire, loyerMensuelHorsCharges: euros(1_000) },
    indexations: { ...NEUTRE.indexations, loyerPctAnnuel: 2 },
  });

  it("suit la progression attendue, année par année", () => {
    expect(r.annees[0]!.locataire.loyer).toBe(euros(12_000));
    expect(r.annees[1]!.locataire.loyer).toBe(euros(12_240));
    expect(r.annees[2]!.locataire.loyer).toBe(euros(12_484.8));
  });

  it("totalise 36 724,80 €", () => {
    expect(r.totaux.locataire.loyer).toBe(euros(36_724.8));
  });

  it("accepte une révision négative sans produire de loyer négatif", () => {
    // Un loyer peut baisser à la relocation. −5 % par an : 1 000 → 950 → 902,50.
    const baisse = comparerDetention({
      ...NEUTRE,
      horizonMois: 36,
      locataire: { ...NEUTRE.locataire, loyerMensuelHorsCharges: euros(1_000) },
      indexations: { ...NEUTRE.indexations, loyerPctAnnuel: -5 },
    });
    expect(baisse.annees[1]!.locataire.loyer).toBe(euros(11_400));
    expect(baisse.annees[2]!.locataire.loyer).toBe(euros(10_830));
  });
});

/* ── Cas D ────────────────────────────────────────────────────────────────── */

describe("cas D — la taxe foncière dérive aussi", () => {
  /**
   * 1 200 € la première année, 3 % par an :
   *   année 1   1 200,00 €
   *   année 2   1 236,00 €
   *   année 3   1 273,08 €   (1 200 × 1,03² = 1 273,08)
   *
   * Geler ce poste pendant qu'on révise le loyer avancerait l'année de
   * croisement, et toujours dans le même sens. Voir ADR-011.
   */
  const r = comparerDetention({
    ...NEUTRE,
    horizonMois: 36,
    proprietaire: { ...NEUTRE.proprietaire, taxeFonciereAnnuelle: euros(1_200) },
    indexations: { ...NEUTRE.indexations, taxeFoncierePctAnnuel: 3 },
  });

  it("progresse de 3 % par an", () => {
    expect(r.annees[0]!.proprietaire.taxeFonciere).toBe(euros(1_200));
    expect(r.annees[1]!.proprietaire.taxeFonciere).toBe(euros(1_236));
    expect(r.annees[2]!.proprietaire.taxeFonciere).toBe(euros(1_273.08));
  });
});

/* ── Cas E ────────────────────────────────────────────────────────────────── */

describe("cas E — ventilation au centime", () => {
  /**
   * 1 234,57 € annuels, soit 123 457 centimes, ne se divisent pas par douze.
   *   123 457 / 12 = 10 288,08…  → onze mois à 102,88 €
   *   résidu 123 457 − 11 × 10 288 − 10 288 = 1 centime sur le douzième mois
   * La somme des douze mois doit rendre exactement 123 457.
   */
  const r = comparerDetention({
    ...NEUTRE,
    proprietaire: { ...NEUTRE.proprietaire, taxeFonciereAnnuelle: 123_457 },
  });

  it("rend exactement le montant annuel saisi", () => {
    expect(r.annees[0]!.proprietaire.taxeFonciere).toBe(123_457);
  });

  it("place le résidu sur le dernier mois, comme une dernière échéance", () => {
    expect(r.mois[0]!.proprietaire.taxeFonciere).toBe(10_288);
    expect(r.mois[10]!.proprietaire.taxeFonciere).toBe(10_288);
    expect(r.mois[11]!.proprietaire.taxeFonciere).toBe(10_289);
  });
});

/* ── Cas F ────────────────────────────────────────────────────────────────── */

describe("cas F — l'horizon dépasse le crédit", () => {
  /**
   * Crédit de 12 mois, horizon de 24. À partir du treizième mois, l'échéance
   * disparaît et le décaissement du propriétaire tombe à la seule taxe foncière.
   * C'est en pratique là que le croisement se produit sur un vrai scénario, et
   * un module qui s'arrêterait au terme du prêt ne le verrait jamais.
   */
  const r = comparerDetention({
    ...NEUTRE,
    horizonMois: 24,
    proprietaire: {
      ...NEUTRE.proprietaire,
      plan: echeancier(12, 400, 600, 40),
      taxeFonciereAnnuelle: euros(1_200),
    },
    locataire: { ...NEUTRE.locataire, loyerMensuelHorsCharges: euros(900) },
  });

  it("solde l'échéance passé le terme", () => {
    expect(r.mois[11]!.proprietaire.interets).toBe(euros(400));
    expect(r.mois[12]!.proprietaire.interets).toBe(0);
    expect(r.mois[12]!.proprietaire.capital).toBe(0);
    expect(r.mois[12]!.proprietaire.decaissement).toBe(euros(100));
  });

  it("fait croiser le décaissement la deuxième année", () => {
    // Cumul propriétaire : 13 680 + 1 200 = 14 880 €.
    // Cumul locataire    : 10 800 × 2     = 21 600 €.
    expect(r.annees[1]!.proprietaire.cumulDecaissement).toBe(euros(14_880));
    expect(r.annees[1]!.locataire.cumulDecaissement).toBe(euros(21_600));
    expect(r.croisement.decaissement).toBe(2);
  });
});

/* ── Cas G ────────────────────────────────────────────────────────────────── */

describe("cas G — les frais d'entrée, absents par défaut", () => {
  /**
   * Frais d'acquisition 16 000 €, imputés au premier mois dans les DEUX
   * lectures : ils sortent du compte et ne reviennent jamais. C'est le poste qui
   * déplace le plus l'année de croisement, et le laisser à zéro — ce que fait le
   * niveau simple de la spécification — la rend optimiste.
   */
  const sansFrais = comparerDetention({
    ...NEUTRE,
    proprietaire: { ...NEUTRE.proprietaire, taxeFonciereAnnuelle: euros(1_200) },
  });
  const avecFrais = comparerDetention({
    ...NEUTRE,
    proprietaire: {
      ...NEUTRE.proprietaire,
      taxeFonciereAnnuelle: euros(1_200),
      fraisInitiauxNonRecuperables: euros(16_000),
    },
  });

  it("vaut zéro tant qu'on ne les saisit pas", () => {
    expect(sansFrais.totaux.proprietaire.fraisInitiaux).toBe(0);
  });

  it("les impute intégralement au premier mois", () => {
    expect(avecFrais.mois[0]!.proprietaire.fraisInitiaux).toBe(euros(16_000));
    expect(avecFrais.mois[1]!.proprietaire.fraisInitiaux).toBe(0);
  });

  it("les compte comme fonds perdus, et non comme capital constitué", () => {
    expect(avecFrais.totaux.proprietaire.fondsPerdus - sansFrais.totaux.proprietaire.fondsPerdus).toBe(
      euros(16_000),
    );
    expect(avecFrais.totaux.proprietaire.capitalConstitue).toBe(
      sansFrais.totaux.proprietaire.capitalConstitue,
    );
  });
});

/* ── Hypothèses de marché ─────────────────────────────────────────────────── */

describe("les valeurs par défaut viennent du marché, pas du code", () => {
  it("reprend les indexations du relevé quand elles ne sont pas fournies", () => {
    const r = comparerDetention({
      horizonMois: 12,
      proprietaire: {
        valeurBien: euros(200_000),
        taxeFonciereAnnuelle: euros(1_200),
        chargesCoproprieteAnnuelles: 0,
        assuranceHabitationAnnuelle: 0,
      },
      locataire: {
        loyerMensuelHorsCharges: euros(900),
        chargesLocativesMensuelles: 0,
        assuranceHabitationAnnuelle: 0,
      },
    });
    // Aucune assertion sur la VALEUR : elle vit dans market.ts et peut y bouger.
    // Ce qui est gardé, c'est qu'elle en vienne et qu'elle soit rapportée.
    expect(r.parametres.indexations.loyerPctAnnuel).toBeTypeOf("number");
    expect(r.parametres.provisionTravauxPctAnnuel).toBeGreaterThan(0);
    expect(r.parametres.releveHypotheses).toMatch(/^\d{4}-\d{2}$/);
  });

  it("laisse l'appelant substituer ses propres indexations, poste par poste", () => {
    const r = comparerDetention({
      ...NEUTRE,
      indexations: { loyerPctAnnuel: 7 },
    });
    expect(r.parametres.indexations.loyerPctAnnuel).toBe(7);
    // Les deux autres restent celles du marché : la surcharge est partielle.
    expect(r.parametres.indexations.taxeFoncierePctAnnuel).not.toBe(7);
  });
});

/* ── Cas limites ──────────────────────────────────────────────────────────── */

describe("cas limites", () => {
  it("supporte un horizon nul", () => {
    const r = comparerDetention({ ...NEUTRE, horizonMois: 0 });
    expect(r.mois).toHaveLength(0);
    expect(r.annees).toHaveLength(0);
    expect(r.croisement).toEqual({ decaissement: null, fondsPerdus: null });
    expect(r.totaux.proprietaire.decaissement).toBe(0);
    expect(r.totaux.ecartFondsPerdus).toBe(0);
  });

  it("supporte un horizon d'un seul mois", () => {
    const r = comparerDetention({
      ...NEUTRE,
      horizonMois: 1,
      proprietaire: { ...NEUTRE.proprietaire, taxeFonciereAnnuelle: euros(1_200) },
    });
    expect(r.mois).toHaveLength(1);
    expect(r.annees).toHaveLength(1);
    expect(r.annees[0]!.moisCouverts).toBe(1);
    // Un douzième de la taxe, pas la taxe entière : l'année est tronquée.
    expect(r.annees[0]!.proprietaire.taxeFonciere).toBe(euros(100));
  });

  it("tronque un horizon fractionnaire plutôt que de produire un demi-mois", () => {
    expect(comparerDetention({ ...NEUTRE, horizonMois: 18.9 }).mois).toHaveLength(18);
  });

  it("traite un horizon négatif comme un horizon nul", () => {
    expect(comparerDetention({ ...NEUTRE, horizonMois: -12 }).mois).toHaveLength(0);
  });

  it("ne provisionne rien sur un bien de valeur nulle", () => {
    const r = comparerDetention({
      ...NEUTRE,
      proprietaire: { ...NEUTRE.proprietaire, valeurBien: 0, provisionTravauxPctAnnuel: 1 },
    });
    expect(r.totaux.proprietaire.provisionTravaux).toBe(0);
  });

  it("ramène au plancher zéro un poste saisi négatif", () => {
    // Une charge négative n'est pas un revenu : c'est une faute de saisie. Le
    // plancher vaut mieux qu'un coût négatif qui se propagerait au croisement.
    const r = comparerDetention({
      ...NEUTRE,
      proprietaire: { ...NEUTRE.proprietaire, taxeFonciereAnnuelle: -euros(1_200) },
      locataire: { ...NEUTRE.locataire, loyerMensuelHorsCharges: -euros(900) },
    });
    expect(r.totaux.proprietaire.decaissement).toBe(0);
    expect(r.totaux.locataire.decaissement).toBe(0);
  });

  it("ramène au plancher zéro une indexation inférieure à −100 %", () => {
    // Le facteur (1 + i) deviendrait négatif et le coût avec lui. Absurde, mais
    // atteignable depuis un champ de saisie.
    const r = comparerDetention({
      ...NEUTRE,
      horizonMois: 24,
      locataire: { ...NEUTRE.locataire, loyerMensuelHorsCharges: euros(900) },
      indexations: { ...NEUTRE.indexations, loyerPctAnnuel: -250 },
    });
    expect(r.annees[0]!.locataire.loyer).toBe(euros(10_800));
    expect(r.annees[1]!.locataire.loyer).toBe(0);
  });

  it("refuse bruyamment une indexation non finie plutôt que de rendre NaN", () => {
    // `roundCents` appelle `assertSafe`. Une saisie illisible remontée jusqu'ici
    // doit casser, pas se propager en NaN jusqu'à l'affichage.
    expect(() =>
      comparerDetention({
        ...NEUTRE,
        horizonMois: 24,
        locataire: { ...NEUTRE.locataire, loyerMensuelHorsCharges: euros(900) },
        indexations: { ...NEUTRE.indexations, loyerPctAnnuel: Number.NaN },
      }),
    ).toThrow(RangeError);
  });

  it("ne croise jamais face à un loyer nul, dès que la propriété coûte quelque chose", () => {
    // ⚠️ CONTRE-INTUITIF, ET C'EST LE BON SENS. Un loyer nul rend le locataire
    // gratuit : le cumul du propriétaire ne peut pas passer sous zéro tant qu'il
    // dépense quoi que ce soit. Le croisement n'existe pas, et le module le dit
    // par `null` plutôt que d'inventer une année.
    const r = comparerDetention({
      ...NEUTRE,
      horizonMois: 600,
      proprietaire: { ...NEUTRE.proprietaire, taxeFonciereAnnuelle: euros(1_200) },
    });
    expect(r.croisement).toEqual({ decaissement: null, fondsPerdus: null });
  });

  it("croise dès la première année quand les deux côtés sont gratuits", () => {
    // Cas dégénéré assumé : les deux cumuls valent zéro, ils sont donc égaux, et
    // l'égalité compte comme un croisement. Répondre « jamais » serait plus
    // trompeur.
    const r = comparerDetention(NEUTRE);
    expect(r.croisement).toEqual({ decaissement: 1, fondsPerdus: 1 });
  });
});
