import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * LES DOCUMENTS DE DESIGN N'EXISTENT QU'EN UN EXEMPLAIRE — `ADR-023`
 *
 * La compétence `impeccable` est adoptée par ce dépôt, subordonnée à ses
 * documents. Deux de ses commandes écrivent des fichiers que le projet possède
 * déjà sous d'autres noms : `init` produit un `PRODUCT.md`, `document` un
 * `DESIGN.md`. Ici, le produit se décrit dans `docs/CONTEXT.md` et le design
 * dans `docs/01-brief-design.md` et `docs/06-design-system.md`.
 *
 * Deux descriptions d'une même décision divergent au premier changement, et la
 * seconde n'est découverte périmée que par l'erreur qu'elle a causée. C'est le
 * motif d'ADR-008 et d'ADR-010, appliqué cette fois à de la documentation.
 *
 * Cette garde existe pour le geste le plus probable : une session future qui
 * lance `init` par réflexe et laisse le fichier. Elle rougit à la porte, et son
 * message renvoie à la décision plutôt que d'annoncer un fichier manquant.
 */

const RACINE = process.cwd();

/** Là où les commandes de la compétence écriraient, et où un lecteur chercherait. */
const EMPLACEMENTS = ["", "docs", "src"] as const;

const NOMS_CONCURRENTS = ["PRODUCT.md", "DESIGN.md"] as const;

describe("aucun document de design concurrent — ADR-023", () => {
  for (const nom of NOMS_CONCURRENTS) {
    for (const dossier of EMPLACEMENTS) {
      const chemin = join(RACINE, dossier, nom);
      const affiche = dossier === "" ? nom : `${dossier}/${nom}`;

      it(`${affiche} n'existe pas`, () => {
        expect(
          existsSync(chemin),
          `${affiche} a été créé. Ce dépôt décrit son produit dans docs/CONTEXT.md et ` +
            "son design dans docs/01-brief-design.md — voir ADR-023, point 2. Reverser " +
            "le contenu utile dans le document existant, puis supprimer celui-ci.",
        ).toBe(false);
      });
    }
  }
});

describe("la règle d'emploi de la compétence reste écrite là où on la lit", () => {
  /**
   * Une règle de procédé ne vit que dans le fichier de contexte qui la porte.
   * Retirée de `CLAUDE.md`, elle cesse d'être appliquée sans qu'aucun fichier de
   * code ne bouge — c'est le seul endroit où un test peut la retenir.
   */
  const CLAUDE_MD = readFileSync(join(RACINE, "CLAUDE.md"), "utf8");
  const ADR = readFileSync(join(RACINE, "docs/ADR.md"), "utf8");

  it("CLAUDE.md nomme la compétence, son interdit et sa décision", () => {
    expect(CLAUDE_MD, "la règle d'emploi d'`impeccable` a quitté CLAUDE.md").toContain(
      "impeccable",
    );
    expect(CLAUDE_MD, "l'interdit d'écrire un PRODUCT.md a disparu").toContain("PRODUCT.md");
    expect(CLAUDE_MD, "le renvoi à la décision a disparu").toContain("ADR-023");
  });

  it("ADR-023 existe et porte sa justification", () => {
    expect(ADR).toContain("## ADR-023");
    // Une décision sans sa raison est une consigne : ce dépôt écrit les deux.
    const section = ADR.slice(ADR.indexOf("## ADR-023"));
    expect(section, "ADR-023 sans section de justification").toContain("### Justification");
  });
});
