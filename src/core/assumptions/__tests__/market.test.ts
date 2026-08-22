import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MARKET_2026 } from "../market";
import type { FourchetteObservee, HypotheseChiffree } from "../market";

/** Ce que porte une entrée d'hypothèse, avec ou sans valeur centrale. */
type Hypothese = HypotheseChiffree | FourchetteObservee;
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
  it("porte un relevé daté, et non un millésime légal", () => {
    // Ces valeurs n'ont pas d'exercice : elles ont une date de lecture.
    expect(MARKET_2026.releve).toMatch(/^\d{4}-\d{2}$/);
  });

  it("couvre les cinq coûts de garantie", () => {
    expect(Object.keys(MARKET_2026.guarantee)).toHaveLength(5);
  });

  /**
   * La garde parcourt TOUS les blocs, pas seulement `guarantee`.
   *
   * Elle ne les nommait pas : elle itérait sur `MARKET_2026.guarantee`, si bien
   * que les blocs ajoutés ensuite — `insurance`, `acquisition`, `detention` —
   * échappaient à chacune de ses vérifications sans qu'aucun test ne rougisse.
   * Le défaut a été signalé par l'agent qui a écrit `detention`, dont les quatre
   * entrées en furent la première démonstration.
   *
   * Le parcours part donc de la structure, ce qui fait entrer dans la garde tout
   * bloc futur du seul fait de son existence. Le prochain n'aura rien à faire.
   */
  const blocs = Object.entries(MARKET_2026).filter(
    (paire): paire is [string, Record<string, Hypothese>] => typeof paire[1] === "object",
  );

  it("ne laisse aucun bloc hors de portée de cette garde", () => {
    // Si ce compte cesse de correspondre, c'est qu'un bloc a été ajouté ou
    // retiré — et il faut le regarder, pas ajuster le chiffre par réflexe.
    expect(blocs.map(([nom]) => nom).sort()).toEqual([
      "acquisition",
      "detention",
      "guarantee",
      "insurance",
    ]);
  });

  for (const [bloc, entrees] of blocs) {
    for (const [nom, h] of Object.entries(entrees)) {
      describe(`${bloc}.${nom}`, () => {
        it("annonce une provenance lisible", () => {
          // Une phrase, pas un mot-clé : elle doit pouvoir être montrée à
          // l'utilisateur telle quelle quand il demande d'où sort un chiffre.
          expect(
            h.provenance.length,
            "provenance trop courte pour dire quoi que ce soit",
          ).toBeGreaterThan(60);
          expect(h.provenance.trim().endsWith("."), "provenance non terminée").toBe(true);
        });

        it("annonce une fiabilité, et pas la plus flatteuse par défaut", () => {
          expect(["observee", "estimee"]).toContain(h.fiabilite);
        });

        it("déclare un intervalle ordonné et plausible", () => {
          const [bas, haut] = h.intervalle;
          expect(bas, `${bloc}.${nom} : intervalle inversé`).toBeLessThanOrEqual(haut);
          expect(bas, `${bloc}.${nom} : borne basse négative`).toBeGreaterThanOrEqual(0);
          expect(haut, `${bloc}.${nom} : borne haute invraisemblable`).toBeLessThanOrEqual(100);
        });

        it("tient dans l'intervalle qu'elle déclare", () => {
          // L'invariant qui compte, pour les hypothèses qui portent une valeur
          // centrale. Modifier une valeur sans toucher à son intervalle — ou
          // l'inverse — est l'erreur qu'on commet en relisant vite une grille
          // tarifaire, et elle ne se voit pas à l'œil.
          //
          // Les fourchettes sans valeur centrale sautent ce test : leur donner
          // une moyenne inventée serait précisément ce que le type refuse.
          if (!("valeur" in h)) return;
          const [bas, haut] = h.intervalle;
          expect(h.valeur, `${bloc}.${nom} : valeur hors de son propre intervalle`).toBeGreaterThanOrEqual(bas);
          expect(h.valeur, `${bloc}.${nom} : valeur hors de son propre intervalle`).toBeLessThanOrEqual(haut);
        });
      });
    }
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
