import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { euros } from "../../money";
import { PARAMS_2026 } from "../../fiscal/params";
import {
  calculerImpotLocatif,
  eligibiliteMicro,
  natureDuRegime,
  seuilMicro,
  type EntreeAnneeLocative,
  type RegimeLocatif,
} from "../regimes-locatifs";

/**
 * RÉGIMES FISCAUX LOCATIFS — `ENG-013`
 *
 * Trois familles de tests :
 *
 * 1. **Cas de référence.** Chaque montant attendu est dérivé À LA MAIN de la
 *    règle que le texte énonce — jamais recopié du moteur. Les règles :
 *    art. 32 (micro-foncier, 30 %), art. 50-0 (micro-BIC, 50 % / 30 %,
 *    minimum 305 €), art. 39 C, II (l'amortissement ne crée pas de déficit),
 *    art. 1649 undecies (base arrondie à l'euro), art. L136-8, IV du CSS
 *    (17,2 % en nue, 18,6 % en meublée). Voir
 *    `docs/reference/FIS-010-verification.md`.
 *
 * 2. **Invariants de conservation.** Rien ne se perd : l'amortissement entre en
 *    dotation et report, ressort en déduit et report ; le déficit foncier
 *    ressort exactement pour ce qui n'a pas pu s'imputer.
 *
 * 3. **Propriétés fast-check.** Les bornes tiennent sur tout l'espace d'entrée,
 *    pas seulement sur les cas qu'on a pensé à écrire.
 */

const TMI = 30;

function entree(e: Partial<EntreeAnneeLocative> & { regime: RegimeLocatif }): EntreeAnneeLocative {
  return { recettesAnnuelles: euros(12_000), tmiPct: TMI, ...e };
}

// ═══════════════════════════════════════════════════════════════════════════
// Micro-foncier — art. 32
// ═══════════════════════════════════════════════════════════════════════════

describe("micro-foncier", () => {
  it("abat 30 % et impose le reste au TMI et à 17,2 %", () => {
    // 12 000 € de loyers : abattement 3 600 €, base 8 400 €.
    // IR à TMI 30 % : 2 520 €. PS à 17,2 % : 1 444,80 €. Total 3 964,80 €.
    const r = calculerImpotLocatif(entree({ regime: { type: "micro-foncier" } }));
    expect(r.abattement).toBe(euros(3_600));
    expect(r.baseImposable).toBe(euros(8_400));
    expect(r.impotRevenu).toBe(euros(2_520));
    expect(r.tauxPrelevementsSociauxPct).toBe(17.2);
    expect(r.prelevementsSociaux).toBe(euros(1_444.8));
    expect(r.impotTotal).toBe(euros(3_964.8));
    expect(r.nature).toBe("nue");
  });

  it("n'a PAS d'abattement minimum : le plancher de 305 € appartient au micro-BIC", () => {
    // 500 € de loyers : abattement 150 €, pas 305 €. La confusion entre les deux
    // articles est exactement le genre d'erreur qu'un simulateur recopie.
    const r = calculerImpotLocatif(
      entree({ regime: { type: "micro-foncier" }, recettesAnnuelles: euros(500) }),
    );
    expect(r.abattement).toBe(euros(150));
    expect(r.baseImposable).toBe(euros(350));
  });

  it("arrondit sa base à l'euro, comme toute base d'imposition", () => {
    // 28 001 € × 30 % = 8 400,30 € ; base 19 600,70 € → 19 601 € (art. 1649
    // undecies, la fraction de 0,50 € comptant pour 1 — même règle qu'ADR-018).
    const r = calculerImpotLocatif(
      entree({ regime: { type: "micro-foncier" }, recettesAnnuelles: euros(28_001) }),
    );
    expect(r.baseImposable).toBe(euros(19_601));
  });

  it("signale le dépassement du seuil de 15 000 € sans refuser de calculer", () => {
    const sous = calculerImpotLocatif(
      entree({ regime: { type: "micro-foncier" }, recettesAnnuelles: euros(15_000) }),
    );
    expect(sous.alertes).toHaveLength(0);

    const dessus = calculerImpotLocatif(
      entree({ regime: { type: "micro-foncier" }, recettesAnnuelles: euros(15_001) }),
    );
    expect(dessus.alertes).toEqual([
      { type: "micro-ineligible", seuil: euros(15_000), recettes: euros(15_001) },
    ]);
    expect(dessus.baseImposable).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Micro-BIC — art. 50-0
// ═══════════════════════════════════════════════════════════════════════════

describe("micro-BIC", () => {
  it("abat 50 % en longue durée et impose à 18,6 % — pas 17,2", () => {
    // 12 000 € : abattement 6 000 €, base 6 000 €. IR 1 800 €. PS 18,6 % :
    // 1 116 €. La meublée est au droit commun du IV de l'art. L136-8 — c'est
    // l'écart que le module enseigne.
    const r = calculerImpotLocatif(
      entree({ regime: { type: "micro-bic", categorie: "longue-duree" } }),
    );
    expect(r.abattement).toBe(euros(6_000));
    expect(r.baseImposable).toBe(euros(6_000));
    expect(r.impotRevenu).toBe(euros(1_800));
    expect(r.tauxPrelevementsSociauxPct).toBe(18.6);
    expect(r.prelevementsSociaux).toBe(euros(1_116));
    expect(r.nature).toBe("meublee");
  });

  it("abat 30 % seulement pour le tourisme non classé", () => {
    const r = calculerImpotLocatif(
      entree({ regime: { type: "micro-bic", categorie: "tourisme-non-classe" } }),
    );
    expect(r.abattement).toBe(euros(3_600));
    expect(r.baseImposable).toBe(euros(8_400));
  });

  it("traite le tourisme classé comme la longue durée — même 2° de l'article", () => {
    const classe = calculerImpotLocatif(
      entree({ regime: { type: "micro-bic", categorie: "tourisme-classe" } }),
    );
    const longue = calculerImpotLocatif(
      entree({ regime: { type: "micro-bic", categorie: "longue-duree" } }),
    );
    expect(classe.abattement).toBe(longue.abattement);
    expect(classe.baseImposable).toBe(longue.baseImposable);
  });

  it("garantit l'abattement minimum de 305 €, sans jamais dépasser les recettes", () => {
    // 500 € en longue durée : 50 % donnerait 250 €, le plancher porte à 305 €.
    const petit = calculerImpotLocatif(
      entree({ regime: { type: "micro-bic", categorie: "longue-duree" }, recettesAnnuelles: euros(500) }),
    );
    expect(petit.abattement).toBe(euros(305));
    expect(petit.baseImposable).toBe(euros(195));

    // 200 € : l'abattement s'arrête aux recettes, la base est nulle — pas négative.
    const minuscule = calculerImpotLocatif(
      entree({ regime: { type: "micro-bic", categorie: "longue-duree" }, recettesAnnuelles: euros(200) }),
    );
    expect(minuscule.abattement).toBe(euros(200));
    expect(minuscule.baseImposable).toBe(0);
    expect(minuscule.impotTotal).toBe(0);
  });

  it("applique à chaque catégorie son seuil : 83 600 € ou 15 000 €", () => {
    const cas = [
      { categorie: "longue-duree", seuil: euros(83_600) },
      { categorie: "tourisme-classe", seuil: euros(83_600) },
      { categorie: "tourisme-non-classe", seuil: euros(15_000) },
    ] as const;
    for (const { categorie, seuil } of cas) {
      const regime: RegimeLocatif = { type: "micro-bic", categorie };
      expect(seuilMicro(regime)).toBe(seuil);
      expect(eligibiliteMicro(seuil, regime)?.eligible).toBe(true);
      expect(eligibiliteMicro(seuil + euros(1), regime)?.eligible).toBe(false);
    }
  });

  it("signale l'affiliation de la courte durée au-delà de 23 000 €, jamais en longue durée", () => {
    const nonClasse25k = calculerImpotLocatif(
      entree({
        regime: { type: "micro-bic", categorie: "tourisme-non-classe" },
        recettesAnnuelles: euros(25_000),
      }),
    );
    // 25 000 € en non classé : les DEUX seuils sont franchis.
    expect(nonClasse25k.alertes).toContainEqual({
      type: "micro-ineligible",
      seuil: euros(15_000),
      recettes: euros(25_000),
    });
    expect(nonClasse25k.alertes).toContainEqual({
      type: "affiliation-courte-duree",
      seuil: euros(23_000),
      recettes: euros(25_000),
    });

    const classe25k = calculerImpotLocatif(
      entree({
        regime: { type: "micro-bic", categorie: "tourisme-classe" },
        recettesAnnuelles: euros(25_000),
      }),
    );
    // Classé : sous le seuil micro, mais l'affiliation se signale quand même.
    expect(classe25k.alertes).toEqual([
      { type: "affiliation-courte-duree", seuil: euros(23_000), recettes: euros(25_000) },
    ]);

    const longue25k = calculerImpotLocatif(
      entree({
        regime: { type: "micro-bic", categorie: "longue-duree" },
        recettesAnnuelles: euros(25_000),
      }),
    );
    expect(longue25k.alertes).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Réel, location nue
// ═══════════════════════════════════════════════════════════════════════════

describe("réel, location nue", () => {
  it("déduit charges et intérêts, et reste à 17,2 % de prélèvements sociaux", () => {
    // 12 000 − 3 000 − 5 000 = 4 000 €. IR 1 200 €, PS 688 €.
    const r = calculerImpotLocatif(
      entree({
        regime: { type: "reel-nu" },
        chargesDeductiblesAnnuelles: euros(3_000),
        interetsEmpruntAnnuels: euros(5_000),
      }),
    );
    expect(r.baseImposable).toBe(euros(4_000));
    expect(r.impotRevenu).toBe(euros(1_200));
    expect(r.tauxPrelevementsSociauxPct).toBe(17.2);
    expect(r.prelevementsSociaux).toBe(euros(688));
    expect(r.deficitFoncierReporte).toBe(0);
  });

  it("transforme un résultat négatif en report, jamais en impôt négatif", () => {
    // 8 000 − 4 000 − 6 000 = −2 000 € : base nulle, 2 000 € reportés.
    const r = calculerImpotLocatif(
      entree({
        regime: { type: "reel-nu" },
        recettesAnnuelles: euros(8_000),
        chargesDeductiblesAnnuelles: euros(4_000),
        interetsEmpruntAnnuels: euros(6_000),
      }),
    );
    expect(r.baseImposable).toBe(0);
    expect(r.impotRevenu).toBe(0);
    expect(r.prelevementsSociaux).toBe(0);
    expect(r.deficitFoncierReporte).toBe(euros(2_000));
    expect(r.nonModelise.join(" ")).toContain("10 700");
  });

  it("impute le déficit reporté sur l'année suivante, et rend l'excédent", () => {
    // Année suivante : 12 000 − 3 000 − 5 000 = 4 000, moins 2 000 reportés → 2 000.
    const suite = calculerImpotLocatif(
      entree({
        regime: { type: "reel-nu" },
        chargesDeductiblesAnnuelles: euros(3_000),
        interetsEmpruntAnnuels: euros(5_000),
        deficitFoncierAnterieur: euros(2_000),
      }),
    );
    expect(suite.baseImposable).toBe(euros(2_000));
    expect(suite.deficitFoncierReporte).toBe(0);

    // Report plus grand que le résultat : la base tombe à zéro et le solde repart.
    const englouti = calculerImpotLocatif(
      entree({
        regime: { type: "reel-nu" },
        chargesDeductiblesAnnuelles: euros(3_000),
        interetsEmpruntAnnuels: euros(5_000),
        deficitFoncierAnterieur: euros(9_000),
      }),
    );
    expect(englouti.baseImposable).toBe(0);
    expect(englouti.deficitFoncierReporte).toBe(euros(5_000));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Réel, location meublée — art. 39 C
// ═══════════════════════════════════════════════════════════════════════════

describe("réel, location meublée", () => {
  it("plafonne l'amortissement au résultat avant amortissement : base nulle, jamais négative", () => {
    // 12 000 − 2 000 − 4 000 = 6 000 € avant amortissement. Dotation 9 000 € :
    // 6 000 déduits, base 0, 3 000 reportés sans limite de durée (art. 39 C, II).
    const r = calculerImpotLocatif(
      entree({
        regime: { type: "reel-meuble" },
        chargesDeductiblesAnnuelles: euros(2_000),
        interetsEmpruntAnnuels: euros(4_000),
        amortissementAnnuel: euros(9_000),
      }),
    );
    expect(r.amortissementDeduit).toBe(euros(6_000));
    expect(r.baseImposable).toBe(0);
    expect(r.impotTotal).toBe(0);
    expect(r.amortissementReporte).toBe(euros(3_000));
    expect(r.nature).toBe("meublee");
    expect(r.tauxPrelevementsSociauxPct).toBe(18.6);
  });

  it("consomme le report des années précédentes avant d'en produire un nouveau", () => {
    // Même année, mais 3 000 € de report antérieur : 12 000 € disponibles,
    // 6 000 déduits, 6 000 repartent.
    const r = calculerImpotLocatif(
      entree({
        regime: { type: "reel-meuble" },
        chargesDeductiblesAnnuelles: euros(2_000),
        interetsEmpruntAnnuels: euros(4_000),
        amortissementAnnuel: euros(9_000),
        amortissementAnterieurReporte: euros(3_000),
      }),
    );
    expect(r.amortissementDeduit).toBe(euros(6_000));
    expect(r.amortissementReporte).toBe(euros(6_000));
  });

  it("laisse une base positive quand l'amortissement ne suffit pas à l'annuler", () => {
    // 6 000 € avant amortissement, dotation 3 500 € : base 2 500 €.
    const r = calculerImpotLocatif(
      entree({
        regime: { type: "reel-meuble" },
        chargesDeductiblesAnnuelles: euros(2_000),
        interetsEmpruntAnnuels: euros(4_000),
        amortissementAnnuel: euros(3_500),
      }),
    );
    expect(r.amortissementDeduit).toBe(euros(3_500));
    expect(r.amortissementReporte).toBe(0);
    expect(r.baseImposable).toBe(euros(2_500));
  });

  it("ne déduit rien quand charges et intérêts dépassent déjà les loyers, et le dit", () => {
    // 3 000 − 2 000 − 2 000 = −1 000 € : l'amortissement ne peut pas aggraver ce
    // déficit. Tout part en report, et la limite du suivi est déclarée.
    const r = calculerImpotLocatif(
      entree({
        regime: { type: "reel-meuble" },
        recettesAnnuelles: euros(3_000),
        chargesDeductiblesAnnuelles: euros(2_000),
        interetsEmpruntAnnuels: euros(2_000),
        amortissementAnnuel: euros(5_000),
      }),
    );
    expect(r.amortissementDeduit).toBe(0);
    expect(r.amortissementReporte).toBe(euros(5_000));
    expect(r.baseImposable).toBe(0);
    expect(r.nonModelise.join(" ")).toContain("déficit hors amortissement");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Ce que les quatre régimes partagent
// ═══════════════════════════════════════════════════════════════════════════

describe("transversal", () => {
  const REGIMES: readonly RegimeLocatif[] = [
    { type: "micro-foncier" },
    { type: "reel-nu" },
    { type: "micro-bic", categorie: "longue-duree" },
    { type: "micro-bic", categorie: "tourisme-classe" },
    { type: "micro-bic", categorie: "tourisme-non-classe" },
    { type: "reel-meuble" },
  ];

  it("prend son taux de prélèvements sociaux dans params, par nature de location", () => {
    // Le taux n'est pas écrit dans le moteur : il vient de `socialLevies`, et la
    // nature — nue ou meublée — choisit l'entrée. C'est la règle de FIS-010.
    for (const regime of REGIMES) {
      const r = calculerImpotLocatif(entree({ regime }));
      const attendu =
        natureDuRegime(regime) === "nue"
          ? PARAMS_2026.socialLevies.realEstate.totalPct
          : PARAMS_2026.socialLevies.patrimony.totalPct;
      expect(r.tauxPrelevementsSociauxPct, `taux inattendu pour ${regime.type}`).toBe(attendu);
    }
  });

  it("fait payer des prélèvements sociaux même à TMI nul — le piège du non-imposable", () => {
    const r = calculerImpotLocatif(entree({ regime: { type: "micro-foncier" }, tmiPct: 0 }));
    expect(r.impotRevenu).toBe(0);
    expect(r.prelevementsSociaux).toBeGreaterThan(0);
  });

  it("refuse les entrées qui n'ont pas de sens", () => {
    expect(() =>
      calculerImpotLocatif(entree({ regime: { type: "micro-foncier" }, recettesAnnuelles: -1 })),
    ).toThrow(RangeError);
    expect(() =>
      calculerImpotLocatif(entree({ regime: { type: "micro-foncier" }, tmiPct: 75 })),
    ).toThrow(RangeError);
  });

  it("date chaque résultat de son millésime", () => {
    const r = calculerImpotLocatif(entree({ regime: { type: "reel-nu" } }));
    expect(r.millesime).toBe(PARAMS_2026.vintage);
  });

  // ── Propriétés ──────────────────────────────────────────────────────────

  const centimes = (max: number) => fc.integer({ min: 0, max });

  it("propriété : la base reste entre zéro et les recettes, sur tout l'espace d'entrée", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...REGIMES),
        centimes(euros(300_000)),
        centimes(euros(60_000)),
        centimes(euros(60_000)),
        centimes(euros(60_000)),
        (regime, recettes, charges, interets, dotation) => {
          const r = calculerImpotLocatif({
            regime,
            recettesAnnuelles: recettes,
            chargesDeductiblesAnnuelles: charges,
            interetsEmpruntAnnuels: interets,
            amortissementAnnuel: dotation,
            tmiPct: TMI,
          });
          expect(r.baseImposable).toBeGreaterThanOrEqual(0);
          // L'arrondi à l'euro peut porter la base jusqu'à 50 centimes au-dessus
          // du résultat exact, jamais davantage.
          expect(r.baseImposable).toBeLessThanOrEqual(recettes + 50);
          expect(r.impotRevenu).toBeGreaterThanOrEqual(0);
          expect(r.prelevementsSociaux).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it("propriété : l'amortissement se conserve — dotation + report entrant = déduit + report sortant", () => {
    fc.assert(
      fc.property(
        centimes(euros(100_000)),
        centimes(euros(40_000)),
        centimes(euros(40_000)),
        centimes(euros(50_000)),
        centimes(euros(80_000)),
        (recettes, charges, interets, dotation, reportEntrant) => {
          const r = calculerImpotLocatif({
            regime: { type: "reel-meuble" },
            recettesAnnuelles: recettes,
            chargesDeductiblesAnnuelles: charges,
            interetsEmpruntAnnuels: interets,
            amortissementAnnuel: dotation,
            amortissementAnterieurReporte: reportEntrant,
            tmiPct: TMI,
          });
          expect(r.amortissementDeduit + r.amortissementReporte).toBe(dotation + reportEntrant);
          expect(r.amortissementDeduit).toBeGreaterThanOrEqual(0);
          expect(r.amortissementReporte).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it("propriété : le déficit foncier sort exactement pour ce qui n'a pas pu s'imputer", () => {
    fc.assert(
      fc.property(
        centimes(euros(100_000)),
        centimes(euros(60_000)),
        centimes(euros(60_000)),
        centimes(euros(60_000)),
        (recettes, charges, interets, reportEntrant) => {
          const r = calculerImpotLocatif({
            regime: { type: "reel-nu" },
            recettesAnnuelles: recettes,
            chargesDeductiblesAnnuelles: charges,
            interetsEmpruntAnnuels: interets,
            deficitFoncierAnterieur: reportEntrant,
            tmiPct: TMI,
          });
          const resultat = recettes - charges - interets - reportEntrant;
          expect(r.deficitFoncierReporte).toBe(Math.max(0, -resultat));
          // La base vaut le résultat positif, à l'arrondi d'euro près.
          expect(Math.abs(r.baseImposable - Math.max(0, resultat))).toBeLessThanOrEqual(50);
        },
      ),
    );
  });

  it("propriété : au micro, plus de recettes n'allège jamais l'impôt", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { type: "micro-foncier" } as RegimeLocatif,
          { type: "micro-bic", categorie: "longue-duree" } as RegimeLocatif,
          { type: "micro-bic", categorie: "tourisme-non-classe" } as RegimeLocatif,
        ),
        centimes(euros(200_000)),
        centimes(euros(5_000)),
        (regime, recettes, surcroit) => {
          const avant = calculerImpotLocatif(
            entree({ regime, recettesAnnuelles: recettes }),
          ).impotTotal;
          const apres = calculerImpotLocatif(
            entree({ regime, recettesAnnuelles: recettes + surcroit }),
          ).impotTotal;
          expect(apres).toBeGreaterThanOrEqual(avant);
        },
      ),
    );
  });
});
