import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MARKET_2026 } from "../market";
import { PARAMS_2026 } from "../../fiscal/params";

/**
 * LA SÉPARATION LOI / MARCHÉ — `FIS-005`
 *
 * Ce que ces tests gardent n'est pas un calcul, c'est une frontière. Elle est
 * facile à refranchir sans y penser : la prochaine fois qu'une valeur de marché
 * sera nécessaire, le réflexe sera de l'ajouter dans `params.ts`, où il y a déjà
 * tout le reste.
 *
 * Voir `docs/ADR.md`, ADR-008.
 */

const PARAMS_SRC = readFileSync(join(process.cwd(), "src/core/fiscal/params.ts"), "utf8");

describe("le millésime fiscal ne contient que des valeurs de loi", () => {
  it("ne porte plus les coûts de garantie", () => {
    // Le champ a disparu du type ; ce test garde la VALEUR, au cas où quelqu'un
    // le rétablirait par un `as` ou un élargissement de type.
    expect(Object.keys(PARAMS_2026)).not.toContain("guarantee");
  });

  it("n'a plus de valeur en attente de vérification faute de source", () => {
    // Le `TODO_VERIFY` des garanties était insoluble : vérifier « à la source »
    // suppose une source qui fasse autorité, et il n'y en a pas pour une grille
    // commerciale. Les `TODO_VERIFY` restants portent tous sur du droit, donc
    // sur quelque chose qui se vérifie vraiment.
    // On compte le MARQUEUR `@todo TODO_VERIFY`, pas le mot : le fichier
    // mentionne aussi la convention en prose, et compter les occurrences
    // brutes ferait rougir ce test au premier commentaire qui en parle.
    const restants = PARAMS_SRC.match(/@todo\s+TODO_VERIFY/g) ?? [];
    expect(PARAMS_SRC).not.toMatch(/@todo\s+TODO_VERIFY[^\n]*caution/i);
    expect(
      restants.length,
      "le compte de valeurs à vérifier a changé — mettre à jour docs/TASKS.md, ticket FIS-002",
    ).toBe(2);
  });

  it("ne contient plus aucune fourchette indicative", () => {
    // La phrase inscrite dans params.ts — « ce fichier ne contient plus que des
    // valeurs dont un article peut être cité » — doit rester vraie. Trois séries
    // l'ont quitté : garanties, taux d'assurance, frais d'acquisition. Une
    // quatrième glisserait sans bruit.
    expect(PARAMS_SRC).not.toMatch(/fourchettes? indicatives?/i);
    expect(PARAMS_SRC).not.toMatch(/pas des valeurs réglementaires/i);
  });

  it("garde une trace écrite du déplacement", () => {
    // Un champ qui disparaît sans explication ressemble à un oubli. Celui-ci
    // doit rester lisible dans le fichier qui l'a perdu.
    expect(PARAMS_SRC).toMatch(/FIS-005/);
    expect(PARAMS_SRC).toMatch(/assumptions\/market/);
  });
});

describe("chaque hypothèse de marché déclare ce qu'elle vaut", () => {
  const hypotheses = Object.entries(MARKET_2026.guarantee);

  it("porte un relevé daté, et non un millésime légal", () => {
    // Ces valeurs n'ont pas d'exercice : elles ont une date de lecture.
    expect(MARKET_2026.releve).toMatch(/^\d{4}-\d{2}$/);
  });

  it("couvre les cinq coûts de garantie", () => {
    expect(hypotheses).toHaveLength(5);
  });

  for (const [nom, h] of hypotheses) {
    describe(nom, () => {
      it("annonce une provenance lisible", () => {
        // Une phrase, pas un mot-clé : elle doit pouvoir être montrée à
        // l'utilisateur telle quelle.
        expect(h.provenance.length, "provenance trop courte pour dire quoi que ce soit").toBeGreaterThan(
          60,
        );
        expect(h.provenance.trim().endsWith(".")).toBe(true);
      });

      it("annonce une fiabilité, et pas la plus flatteuse par défaut", () => {
        expect(["observee", "estimee"]).toContain(h.fiabilite);
      });

      it("tient dans l'intervalle qu'elle déclare", () => {
        // L'invariant qui compte. Modifier une valeur sans toucher à son
        // intervalle — ou l'inverse — est l'erreur qu'on commet en relisant vite
        // une grille tarifaire, et elle ne se voit pas à l'œil.
        const [bas, haut] = h.intervalle;
        expect(bas, `${nom} : intervalle inversé`).toBeLessThanOrEqual(haut);
        expect(h.valeur, `${nom} : valeur hors de son propre intervalle`).toBeGreaterThanOrEqual(bas);
        expect(h.valeur, `${nom} : valeur hors de son propre intervalle`).toBeLessThanOrEqual(haut);
      });

      it("reste un pourcentage plausible", () => {
        expect(h.valeur).toBeGreaterThanOrEqual(0);
        expect(h.valeur).toBeLessThanOrEqual(100);
      });
    });
  }
});

describe("le déplacement ne change aucun chiffre", () => {
  it("reprend à l'identique les valeurs qui vivaient dans params.ts", () => {
    // Un refactoring qui corrige au passage est un refactoring qu'on ne peut plus
    // relire. Ces cinq valeurs sont celles du 22 août 2026, avant déplacement ;
    // les recouper sur des grilles publiées est un autre travail, et il reste à
    // faire.
    const g = MARKET_2026.guarantee;
    expect(g.suretyshipCostPct.valeur).toBe(1.25);
    expect(g.suretyshipRefundPct.valeur).toBe(55);
    expect(g.mortgageCostPct.valeur).toBe(1.5);
    expect(g.mortgageReleasePct.valeur).toBe(0.4);
    expect(g.pledgeCostPct.valeur).toBe(0.3);
  });
});
