/**
 * PORTEFEUILLE DU LOCATAIRE DE RÉFÉRENCE — `ENG-011`
 *
 * Deux familles, et elles ne se remplacent pas.
 *
 * **Cas de référence** : des chiffres qu'on peut refaire à la main, le calcul
 * écrit en commentaire au-dessus de l'attente. Ils attrapent une formule fausse,
 * qu'aucun invariant ne verrait — une capitalisation systématiquement décalée
 * d'un mois reste parfaitement monotone et parfaitement additive.
 *
 * **Invariants sous `fast-check`** : des vérités qui doivent tenir sur
 * n'importe quelle entrée. Le plus important d'entre eux,
 * `capitalVerse + gains = valeur` au centime, est celui qui attrape les dérives
 * d'arrondi — la classe de défaut qui ne se voit sur aucun exemple choisi et
 * qui fait mentir un chiffre affiché.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  RENDEMENTS_NETS_OBSERVES,
  construirePortefeuille,
  echeanceAuMois,
  tauxMensuelEquivalent,
  valeursAnnuelles,
  type EcheancePortefeuille,
} from "../portefeuille";

const derniere = (e: readonly EcheancePortefeuille[]): EcheancePortefeuille =>
  e[e.length - 1] as EcheancePortefeuille;

/* ══ 1. Cas de référence ═══════════════════════════════════════════════════ */

describe("cas de référence — rendement nul", () => {
  it("un rendement nul rend une valeur égale au capital versé, au centime", () => {
    // Apport 10 000 €, puis 12 versements de 500 €. Rien ne fructifie.
    //   capital versé = 10 000 + 12 × 500 = 16 000 €
    //   gains         = 0
    //   valeur        = 16 000 €
    const p = construirePortefeuille({
      apport: 10_000_00,
      versements: Array.from({ length: 12 }, () => 500_00),
      rendementAnnuelNetPct: 0,
    });
    expect(p.capitalVerse).toBe(16_000_00);
    expect(p.gains).toBe(0);
    expect(p.valeur).toBe(16_000_00);
    expect(p.valeur).toBe(p.capitalVerse + p.gains);
  });

  it("chaque échéance porte le cumul exact, mois après mois", () => {
    const p = construirePortefeuille({
      apport: 1_000_00,
      versements: [100_00, 200_00, 300_00],
      rendementAnnuelNetPct: 0,
    });
    // Mois 0 : 1 000 · mois 1 : 1 100 · mois 2 : 1 300 · mois 3 : 1 600
    expect(p.echeances.map((e) => e.valeur)).toEqual([1_000_00, 1_100_00, 1_300_00, 1_600_00]);
    expect(p.echeances.every((e) => e.gains === 0)).toBe(true);
  });
});

describe("cas de référence — la capitalisation", () => {
  it("un mois à 12 % net rend 949 centimes sur 1 000 €", () => {
    // Rendement mensuel équivalent actuariel :
    //   r = 1,12^(1/12) − 1 = 0,009488792934583046
    // Gain du mois 1, sur la valeur d'ouverture de 100 000 centimes :
    //   100 000 × 0,009488792934583046 = 948,8792934…  →  949 (arrondi commercial)
    const p = construirePortefeuille({
      apport: 1_000_00,
      versements: [0],
      rendementAnnuelNetPct: 12,
    });
    expect(p.gains).toBe(949);
    expect(p.valeur).toBe(100_949);
    expect(p.capitalVerse).toBe(100_000);
  });

  it("douze mois à 12 % rendent exactement 12 % — l'équivalence actuarielle tient", () => {
    // C'est le sens même de la conversion : « 12 % par an » doit valoir 12 % au
    // bout de douze mois. 100 000 € placés et laissés en place → 112 000 €.
    // À l'arrondi près du chemin : douze arrondis au centime en chemin.
    const p = construirePortefeuille({
      apport: 100_000_00,
      versements: Array.from({ length: 12 }, () => 0),
      rendementAnnuelNetPct: 12,
    });
    expect(Math.abs(p.valeur - 112_000_00)).toBeLessThanOrEqual(6); // ≤ 6 centimes
  });

  it("un versement ne rapporte rien le mois où il est fait — convention du terme échu", () => {
    // Apport nul, un seul versement de 100 € au mois 1. La valeur d'ouverture
    // du mois 1 est zéro : le rendement porte sur zéro, quel qu'il soit.
    const p = construirePortefeuille({
      apport: 0,
      versements: [100_00],
      rendementAnnuelNetPct: 7,
    });
    expect(p.gains).toBe(0);
    expect(p.valeur).toBe(100_00);
  });

  it("le rendement porte sur la valeur d'ouverture, pas sur la valeur de clôture", () => {
    // Apport 10 000 €, versement de 10 000 € au mois 1, 6 % net.
    //   r = 1,06^(1/12) − 1 = 0,004867550565343048
    //   gain = 1 000 000 × r = 4 867,55…  →  4 868 centimes (48,68 €)
    // Un gain de 9 735 centimes signalerait que le versement a été capitalisé
    // le mois de son propre versement.
    const p = construirePortefeuille({
      apport: 10_000_00,
      versements: [10_000_00],
      rendementAnnuelNetPct: 6,
    });
    expect(p.gains).toBe(4_868);
    expect(p.valeur).toBe(20_048_68);
    expect(p.capitalVerse).toBe(20_000_00);
  });
});

describe("cas de référence — le rendement mensuel équivalent", () => {
  it("n'est pas le taux proportionnel du crédit, et l'écart est chiffré", () => {
    // Proportionnel : 5 / 12 / 100 = 0,0041666…  → capitalisé 12 fois : 5,1162 %
    // Équivalent    : 1,05^(1/12) − 1            → capitalisé 12 fois : 5,0000 %
    const equivalent = tauxMensuelEquivalent(5);
    const proportionnel = 5 / 100 / 12;
    expect(equivalent).toBeLessThan(proportionnel);
    expect((Math.pow(1 + equivalent, 12) - 1) * 100).toBeCloseTo(5, 10);
    expect((Math.pow(1 + proportionnel, 12) - 1) * 100).toBeCloseTo(5.116189788, 6);
  });

  it("vaut zéro pour un rendement nul, et non un epsilon", () => {
    expect(tauxMensuelEquivalent(0)).toBe(0);
  });

  it("est négatif pour un rendement négatif", () => {
    expect(tauxMensuelEquivalent(-12)).toBeLessThan(0);
    expect(Math.pow(1 + tauxMensuelEquivalent(-12), 12)).toBeCloseTo(0.88, 12);
  });
});

describe("cas de référence — le portefeuille épuisé", () => {
  it("tronque le retrait à ce qui reste, et rend le manque explicite", () => {
    // Apport 1 000 €, rendement nul, deux retraits de 600 €.
    //   mois 1 : 1 000 − 600 = 400 €, rien ne manque
    //   mois 2 : 600 demandés, 400 disponibles → 400 retirés, 200 non financés
    const p = construirePortefeuille({
      apport: 1_000_00,
      versements: [-600_00, -600_00],
      rendementAnnuelNetPct: 0,
    });
    expect(p.echeances.map((e) => e.valeur)).toEqual([1_000_00, 400_00, 0]);
    expect(p.echeances.map((e) => e.versementRealise)).toEqual([1_000_00, -600_00, -400_00]);
    expect(p.echeances.map((e) => e.nonFinance)).toEqual([0, 0, 200_00]);
    expect(p.nonFinance).toBe(200_00);
    expect(p.moisEpuisement).toBe(2);
    // Le capital versé est l'effort RÉEL : il ne compte pas les 200 € qu'il n'a
    // pas pu retirer. C'est ce qui garde l'égalité capital + gains = valeur.
    expect(p.capitalVerse).toBe(0);
    expect(p.capitalVerse + p.gains).toBe(p.valeur);
  });

  it("un portefeuille qui tient tout l'horizon ne signale aucun épuisement", () => {
    // Même série, apport suffisant : 1 500 € − 600 − 600 = 300 €.
    const p = construirePortefeuille({
      apport: 1_500_00,
      versements: [-600_00, -600_00],
      rendementAnnuelNetPct: 0,
    });
    expect(p.valeur).toBe(300_00);
    expect(p.nonFinance).toBe(0);
    expect(p.moisEpuisement).toBeNull();
    expect(p.echeances.every((e) => e.versementRealise === e.versementDemande)).toBe(true);
  });

  it("reste à zéro et continue de compter le manque une fois épuisé", () => {
    const p = construirePortefeuille({
      apport: 100_00,
      versements: [-500_00, -500_00, -500_00],
      rendementAnnuelNetPct: 4,
    });
    expect(p.valeur).toBe(0);
    expect(p.moisEpuisement).toBe(1);
    // Le rendement du mois 1 s'applique AVANT le retrait, sur les 100 € présents :
    //   r = 1,04^(1/12) − 1 = 0,00327374…  →  10 000 × r = 32,73…  →  33 centimes
    //   disponible = 100,33 €, demandé 500 € → il manque 399,67 €
    // Puis 500 € manquants à chacun des deux mois suivants, sur un solde vide.
    expect(p.echeances[1]!.rendement).toBe(33);
    expect(p.nonFinance).toBe(399_67 + 500_00 + 500_00);
    // Un portefeuille vide ne produit plus aucun rendement : rien ne se
    // capitalise sur zéro, et surtout rien ne se capitalise sur une dette.
    expect(p.echeances.slice(2).every((e) => e.rendement === 0)).toBe(true);
  });

  it("un retrait exactement égal au solde n'est pas un épuisement", () => {
    // Le manque est nul : la comparaison tient encore, tout juste.
    const p = construirePortefeuille({
      apport: 500_00,
      versements: [-500_00],
      rendementAnnuelNetPct: 0,
    });
    expect(p.valeur).toBe(0);
    expect(p.nonFinance).toBe(0);
    expect(p.moisEpuisement).toBeNull();
  });
});

describe("cas de référence — la convention d'arrondi", () => {
  it("la dérive sur 300 mois reste sous le centime", () => {
    // 300 mois est l'endroit où une erreur d'arrondi devient visible si elle
    // s'accumule. Référence : la même capitalisation menée en flottant, sans
    // aucun arrondi intermédiaire.
    const apport = 50_000_00;
    const versements = Array.from({ length: 300 }, () => 500_00);
    const p = construirePortefeuille({ apport, versements, rendementAnnuelNetPct: 5 });

    const r = tauxMensuelEquivalent(5);
    let flottant = apport;
    for (let i = 0; i < 300; i++) flottant = flottant * (1 + r) + 500_00;

    // 462 185,00 € contre 462 185,0073 € : 0,73 centime, soit 1,6 × 10⁻⁸.
    expect(p.valeur).toBe(462_185_00);
    expect(Math.abs(p.valeur - flottant)).toBeLessThan(1);
    // Très loin des 5 € que le projet s'autorise entre conventions d'arrondi.
    expect(Math.abs(p.valeur - flottant) / 100).toBeLessThan(5);
  });

  it("les trois conventions d'arrondi restent à quelques centimes l'une de l'autre", () => {
    const versements = Array.from({ length: 300 }, () => 500_00);
    const base = { apport: 50_000_00, versements, rendementAnnuelNetPct: 5 } as const;
    const hautBas = construirePortefeuille({ ...base, rounding: "half-up" }).valeur;
    const pair = construirePortefeuille({ ...base, rounding: "half-even" }).valeur;
    const bas = construirePortefeuille({ ...base, rounding: "down" }).valeur;
    expect(Math.abs(hautBas - pair)).toBeLessThan(500); // < 5 €
    expect(Math.abs(hautBas - bas)).toBeLessThan(500);
    // La troncature ne peut que perdre : elle borne le résultat par le bas.
    expect(bas).toBeLessThanOrEqual(hautBas);
  });
});

describe("cas de référence — rendement négatif", () => {
  it("les gains sont négatifs et la valeur passe sous le capital versé", () => {
    // 1,06⁻¹ ... rendement de −6 % net : r = 0,94^(1/12) − 1 < 0
    const p = construirePortefeuille({
      apport: 10_000_00,
      versements: Array.from({ length: 12 }, () => 0),
      rendementAnnuelNetPct: -6,
    });
    expect(p.gains).toBeLessThan(0);
    expect(p.valeur).toBeLessThan(p.capitalVerse);
    expect(p.capitalVerse + p.gains).toBe(p.valeur);
    // Douze mois à −6 % l'an : 10 000 → 9 400 €, à l'arrondi du chemin près.
    expect(Math.abs(p.valeur - 9_400_00)).toBeLessThanOrEqual(6);
  });
});

/* ══ 2. Cas limites ════════════════════════════════════════════════════════ */

describe("cas limites", () => {
  it("horizon nul : la seule échéance est l'ouverture", () => {
    const p = construirePortefeuille({
      apport: 25_000_00,
      versements: [],
      rendementAnnuelNetPct: 6,
    });
    expect(p.echeances).toHaveLength(1);
    expect(p.echeances[0]!.mois).toBe(0);
    expect(p.valeur).toBe(25_000_00);
    expect(p.gains).toBe(0);
    expect(p.moisEpuisement).toBeNull();
  });

  it("apport nul et horizon nul : tout est à zéro, rien n'explose", () => {
    const p = construirePortefeuille({ apport: 0, versements: [], rendementAnnuelNetPct: 5 });
    expect(p.valeur).toBe(0);
    expect(p.capitalVerse).toBe(0);
    expect(p.gains).toBe(0);
    expect(p.echeances).toHaveLength(1);
  });

  it("apport nul : le locataire de référence part de zéro comme un autre", () => {
    const p = construirePortefeuille({
      apport: 0,
      versements: Array.from({ length: 24 }, () => 400_00),
      rendementAnnuelNetPct: 5,
    });
    expect(p.capitalVerse).toBe(9_600_00);
    expect(p.gains).toBeGreaterThan(0);
    expect(p.capitalVerse + p.gains).toBe(p.valeur);
  });

  it("un seul mois", () => {
    const p = construirePortefeuille({
      apport: 1_000_00,
      versements: [50_00],
      rendementAnnuelNetPct: 5,
    });
    expect(p.echeances).toHaveLength(2);
    expect(p.capitalVerse).toBe(1_050_00);
  });

  it("tous les versements négatifs : le portefeuille se vide, sans jamais passer sous zéro", () => {
    const p = construirePortefeuille({
      apport: 5_000_00,
      versements: Array.from({ length: 60 }, () => -200_00),
      rendementAnnuelNetPct: 3,
    });
    expect(p.valeur).toBe(0);
    expect(p.echeances.every((e) => e.valeur >= 0)).toBe(true);
    expect(p.moisEpuisement).not.toBeNull();
    expect(p.nonFinance).toBeGreaterThan(0);
  });

  it("un rendement nul sur un portefeuille vide ne produit pas de −0", () => {
    // Object.is(-0, 0) est faux : un −0 qui remonte jusqu'à l'affichage
    // produirait « −0,00 € », et un test d'égalité stricte passerait quand même.
    const p = construirePortefeuille({
      apport: 0,
      versements: [0, 0],
      rendementAnnuelNetPct: -5,
    });
    expect(p.echeances.every((e) => Object.is(e.rendement, 0))).toBe(true);
    expect(Object.is(p.valeur, 0)).toBe(true);
  });
});

/* ══ 3. Les gardes ═════════════════════════════════════════════════════════ */

describe("gardes d'entrée", () => {
  it("refuse un apport négatif", () => {
    expect(() =>
      construirePortefeuille({ apport: -1, versements: [], rendementAnnuelNetPct: 5 }),
    ).toThrow(RangeError);
  });

  it("refuse un montant qui n'est pas un entier de centimes", () => {
    expect(() =>
      construirePortefeuille({ apport: 1_000_00.5, versements: [], rendementAnnuelNetPct: 5 }),
    ).toThrow(RangeError);
    expect(() =>
      construirePortefeuille({ apport: 0, versements: [10.5], rendementAnnuelNetPct: 5 }),
    ).toThrow(/mois 1/);
  });

  it("refuse un rendement hors domaine plutôt que de rendre un NaN", () => {
    // (1 + r)^(1/12) n'est pas défini sur un facteur négatif : sans garde, la
    // racine douzième rendrait NaN, qui se propagerait jusqu'à l'affichage
    // sans jamais lever d'erreur.
    expect(() => tauxMensuelEquivalent(-100)).toThrow(RangeError);
    expect(() => tauxMensuelEquivalent(-150)).toThrow(RangeError);
    expect(() => tauxMensuelEquivalent(Number.NaN)).toThrow(RangeError);
    expect(() =>
      construirePortefeuille({ apport: 100, versements: [], rendementAnnuelNetPct: -100 }),
    ).toThrow(RangeError);
  });

  it("accepte une perte annuelle proche de la totalité", () => {
    expect(() => tauxMensuelEquivalent(-99.9)).not.toThrow();
  });
});

/* ══ 4. Invariants sous fast-check ═════════════════════════════════════════ */

const apport = fc.integer({ min: 0, max: 500_000_00 });
const versementPositif = fc.integer({ min: 0, max: 5_000_00 });
const versementQuelconque = fc.integer({ min: -5_000_00, max: 5_000_00 });
/**
 * Domaine réaliste. Le générateur exclut la perte totale annuelle, refusée par
 * le moteur, et se borne à des ordres de grandeur qu'un utilisateur peut saisir.
 */
const rendement = fc.oneof(
  fc.constant(0),
  fc.double({ min: -30, max: 30, noNaN: true, noDefaultInfinity: true }),
);
const serie = (element: fc.Arbitrary<number>) => fc.array(element, { minLength: 0, maxLength: 360 });

describe("invariants du portefeuille", () => {
  it("capital versé + gains = valeur, au centime, à chaque échéance", () => {
    // L'invariant qui attrape les dérives d'arrondi. Un solde porté en flottant
    // et arrondi seulement à la lecture le casse dès les premiers mois.
    fc.assert(
      fc.property(apport, serie(versementQuelconque), rendement, (a, v, r) => {
        const p = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: r });
        return p.echeances.every((e) => e.capitalVerse + e.gains === e.valeur);
      }),
      { numRuns: 500 },
    );
  });

  it("tous les montants rendus sont des entiers de centimes", () => {
    fc.assert(
      fc.property(apport, serie(versementQuelconque), rendement, (a, v, r) => {
        const p = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: r });
        return p.echeances.every(
          (e) =>
            Number.isInteger(e.valeur) &&
            Number.isInteger(e.gains) &&
            Number.isInteger(e.capitalVerse) &&
            Number.isInteger(e.rendement) &&
            Number.isInteger(e.nonFinance) &&
            Number.isInteger(e.versementRealise),
        );
      }),
      { numRuns: 300 },
    );
  });

  it("les gains sont nuls à rendement nul, et la valeur est le capital versé", () => {
    fc.assert(
      fc.property(apport, serie(versementQuelconque), (a, v) => {
        const p = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: 0 });
        return p.gains === 0 && p.valeur === p.capitalVerse;
      }),
      { numRuns: 300 },
    );
  });

  it("la valeur est monotone croissante si les versements et le rendement sont positifs", () => {
    fc.assert(
      fc.property(
        apport,
        serie(versementPositif),
        fc.double({ min: 0, max: 20, noNaN: true, noDefaultInfinity: true }),
        (a, v, r) => {
          const p = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: r });
          for (let i = 1; i < p.echeances.length; i++) {
            if (p.echeances[i]!.valeur < p.echeances[i - 1]!.valeur) return false;
          }
          return true;
        },
      ),
      { numRuns: 400 },
    );
  });

  it("la valeur est monotone décroissante si les versements sont négatifs et le rendement nul", () => {
    fc.assert(
      fc.property(apport, serie(fc.integer({ min: -5_000_00, max: 0 })), (a, v) => {
        const p = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: 0 });
        for (let i = 1; i < p.echeances.length; i++) {
          if (p.echeances[i]!.valeur > p.echeances[i - 1]!.valeur) return false;
        }
        return true;
      }),
      { numRuns: 300 },
    );
  });

  it("la valeur ne devient jamais négative — un portefeuille n'est pas un crédit", () => {
    fc.assert(
      fc.property(apport, serie(versementQuelconque), rendement, (a, v, r) => {
        const p = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: r });
        return p.echeances.every((e) => e.valeur >= 0);
      }),
      { numRuns: 500 },
    );
  });

  it("le manque non financé est positif, et n'apparaît qu'à partir du mois d'épuisement", () => {
    fc.assert(
      fc.property(apport, serie(versementQuelconque), rendement, (a, v, r) => {
        const p = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: r });
        if (p.echeances.some((e) => e.nonFinance < 0)) return false;
        const premier = p.echeances.find((e) => e.nonFinance > 0);
        if (premier === undefined) return p.moisEpuisement === null && p.nonFinance === 0;
        return p.moisEpuisement === premier.mois && p.nonFinance > 0;
      }),
      { numRuns: 400 },
    );
  });

  it("le versement réalisé ne dépasse jamais le versement demandé, en valeur retirée", () => {
    // Tronquer un retrait ne peut que le réduire : jamais l'inverse, et jamais
    // un versement positif ne se transforme en autre chose.
    fc.assert(
      fc.property(apport, serie(versementQuelconque), rendement, (a, v, r) => {
        const p = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: r });
        return p.echeances
          .slice(1)
          .every(
            (e) =>
              e.versementRealise >= e.versementDemande &&
              e.versementRealise - e.versementDemande === e.nonFinance,
          );
      }),
      { numRuns: 300 },
    );
  });

  it("la série compte un mois de plus que les versements : l'ouverture", () => {
    fc.assert(
      fc.property(apport, serie(versementQuelconque), rendement, (a, v, r) => {
        const p = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: r });
        return (
          p.echeances.length === v.length + 1 &&
          p.echeances.every((e, i) => e.mois === i) &&
          derniere(p.echeances).valeur === p.valeur
        );
      }),
      { numRuns: 200 },
    );
  });

  it("un apport plus grand ne rend jamais un portefeuille plus petit", () => {
    fc.assert(
      fc.property(
        apport,
        fc.integer({ min: 0, max: 100_000_00 }),
        serie(versementQuelconque),
        fc.double({ min: 0, max: 20, noNaN: true, noDefaultInfinity: true }),
        (a, delta, v, r) => {
          const petit = construirePortefeuille({
            apport: a,
            versements: v,
            rendementAnnuelNetPct: r,
          });
          const grand = construirePortefeuille({
            apport: a + delta,
            versements: v,
            rendementAnnuelNetPct: r,
          });
          return grand.valeur >= petit.valeur;
        },
      ),
      { numRuns: 300 },
    );
  });

  it("la fonction est pure : même entrée, même sortie, et l'entrée n'est pas modifiée", () => {
    fc.assert(
      fc.property(apport, serie(versementQuelconque), rendement, (a, v, r) => {
        const copie = [...v];
        const un = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: r });
        const deux = construirePortefeuille({ apport: a, versements: v, rendementAnnuelNetPct: r });
        return JSON.stringify(un) === JSON.stringify(deux) && v.every((x, i) => x === copie[i]);
      }),
      { numRuns: 200 },
    );
  });
});

/* ══ 5. Lectures ═══════════════════════════════════════════════════════════ */

describe("lectures", () => {
  it("échéance au mois : l'ouverture existe toujours, l'au-delà de l'horizon non", () => {
    const p = construirePortefeuille({
      apport: 1_000_00,
      versements: [100_00, 100_00],
      rendementAnnuelNetPct: 0,
    });
    expect(echeanceAuMois(p, 0)?.valeur).toBe(1_000_00);
    expect(echeanceAuMois(p, 2)?.valeur).toBe(1_200_00);
    expect(echeanceAuMois(p, 3)).toBeUndefined();
  });

  it("valeurs annuelles : une par fin d'année civile, sans le mois d'ouverture", () => {
    const p = construirePortefeuille({
      apport: 0,
      versements: Array.from({ length: 30 }, () => 100_00),
      rendementAnnuelNetPct: 0,
    });
    // Mois 12 → 1 200 €, mois 24 → 2 400 €. Les six mois orphelins sont exclus.
    expect(valeursAnnuelles(p)).toEqual([1_200_00, 2_400_00]);
  });

  it("valeurs annuelles : rien à rendre sur un horizon de moins d'un an", () => {
    const p = construirePortefeuille({
      apport: 1_000_00,
      versements: Array.from({ length: 11 }, () => 100_00),
      rendementAnnuelNetPct: 3,
    });
    expect(valeursAnnuelles(p)).toEqual([]);
  });
});

/* ══ 6. Ce que le module refuse de faire ═══════════════════════════════════ */

describe("le module calcule, il ne conclut pas", () => {
  it("ne rend aucun jugement, aucun gagnant, aucune recommandation", () => {
    // `docs/CONTEXT.md` §8 : le produit calcule et explique, l'utilisateur décide.
    // Une garde de forme, parce que le champ de trop s'ajoute sans discussion et
    // ne se retire plus une fois que l'interface s'y appuie.
    const p = construirePortefeuille({
      apport: 10_000_00,
      versements: [100_00],
      rendementAnnuelNetPct: 5,
    });
    const interdits = ["gagnant", "meilleur", "recommandation", "conseil", "verdict", "avantage"];
    const cles = [...Object.keys(p), ...Object.keys(p.echeances[0] as object)];
    expect(cles.filter((c) => interdits.some((i) => c.toLowerCase().includes(i)))).toEqual([]);
  });

  it("les hypothèses de rendement sont des données exportées, jamais un défaut de calcul", () => {
    // Aucune signature n'a de rendement par défaut : l'omettre ne compile pas.
    // Ce qui reste vérifiable à l'exécution, c'est que les fourchettes publiées
    // sont bien des fourchettes, et qu'elles annoncent leur fiabilité.
    for (const h of Object.values(RENDEMENTS_NETS_OBSERVES)) {
      expect(h.intervalle[0]).toBeLessThan(h.intervalle[1]);
      expect(["observee", "estimee"]).toContain(h.fiabilite);
      expect(h.provenance.length).toBeGreaterThan(40);
    }
  });
});
