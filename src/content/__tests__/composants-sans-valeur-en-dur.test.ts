import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { VALEUR_EN_DUR } from "./valeur-en-dur";

/**
 * AUCUNE VALEUR RÉGLEMENTAIRE ÉCRITE DANS UN COMPOSANT — `FIS-012`
 *
 * La garde anti-chiffre ne parcourait que `src/content/`. Les textes d'aide des
 * composants lui échappaient, et la revue system design du 18 novembre 2026 en a
 * trouvé dix-sept dans `src/components/patrimoine/` — abattements, taux de
 * prélèvements sociaux, forfaits, durées d'exonération, seuil de la surtaxe.
 * Tous concordaient avec `params.ts`. C'est précisément le risque : à la
 * prochaine loi de finances, le calcul aurait suivi `params.ts` et le texte
 * affiché à côté serait resté à l'ancienne valeur.
 *
 * La règle est celle de `CLAUDE.md` : un taux, un seuil, un abattement ou un
 * barème vit dans `src/core/fiscal/`, et un composant le reçoit par un jeton —
 * une clé de `VALEURS` (`src/content/valeurs.ts`), ou la valeur de `params.ts`
 * mise en forme à l'endroit qui l'affiche.
 *
 * ── CE QUE LA GARDE LIT ───────────────────────────────────────────────────
 *
 * Le code, commentaires retirés : un commentaire qui raconte « 36 031 € sur le
 * scénario d'ouverture » documente un calcul, il n'affiche rien. Tout le reste
 * — chaînes, gabarits, texte JSX — est lu tel qu'écrit. Une valeur composée à
 * l'exécution (`${VALEURS.x}`, `${t} %`) ne porte aucun chiffre dans le source,
 * et c'est ce qui la distingue d'une valeur recopiée.
 *
 * Elle ne sait pas ce qu'est un nombre RÉGLEMENTAIRE : elle refuse tout nombre
 * suivi de %, €, an(s) ou mois. Un pourcentage de mise en page s'écrit avec une
 * classe (`w-full`) ou se calcule ; un exemple chiffré passe par le moteur.
 */

const RACINE = join(process.cwd(), "src", "components");

/** Les sources de `src/components/**`, tests exclus. */
function sources(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return entree.name === "__tests__" ? [] : sources(chemin);
    return /\.tsx?$/u.test(entree.name) && !/\.test\.tsx?$/u.test(entree.name) ? [chemin] : [];
  });
}

/**
 * Le source, commentaires effacés, numéros de ligne conservés.
 *
 * Les blocs `/* … *\/` — JSDoc, commentaires JSX `{/* … *\/}` — deviennent autant
 * de retours à la ligne qu'ils en contenaient. Un `//` ouvre un commentaire
 * sauf derrière un deux-points : `https://` est une adresse, pas un commentaire.
 */
function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, (bloc) => bloc.replace(/[^\n]/gu, ""))
    .replace(/(^|[^:])\/\/.*$/gmu, "$1");
}

/** Toutes les occurrences d'une ligne, pas seulement la première. */
const VALEUR_EN_DUR_PARTOUT = new RegExp(VALEUR_EN_DUR.source, "gu");

/** Les valeurs écrites en dur d'un source, avec leur ligne. */
function valeursEnDur(source: string): { ligne: number; extrait: string }[] {
  return sansCommentaires(source)
    .split("\n")
    .flatMap((texte, i) =>
      [...texte.matchAll(VALEUR_EN_DUR_PARTOUT)].map((m) => ({ ligne: i + 1, extrait: m[0] })),
    );
}

const FICHIERS = sources(RACINE);

describe("la garde lit ce qu'elle prétend lire", () => {
  it("parcourt tous les répertoires de composants", () => {
    // Une garde qui ne lit aucun fichier passe toujours. Ces quatre répertoires
    // portent les textes d'aide ; s'ils disparaissent de la liste, la garde
    // tourne à vide.
    const dossiers = new Set(FICHIERS.map((f) => relative(RACINE, f).split(sep)[0]));
    for (const attendu of ["patrimoine", "credit", "comparaison", "ui"]) {
      expect(dossiers, `src/components/${attendu} n'est pas parcouru`).toContain(attendu);
    }
  });

  it("voit une valeur dans une chaîne, un gabarit ou du JSX, pas dans un commentaire", () => {
    const source = [
      `const a = "Le forfait est de 15 % du prix d'acquisition.";`,
      "const b = `abattement de 30 %`;",
      "<p>exonère totalement à 22 ans, puis à 30 ans</p>",
      "/** Le seuil est de 50 000 € en 2026. */",
      "{/* six mois, soit 6 mois */}",
      "const c = 1; // 17,2 % de prélèvements",
      'const d = "https://www.legifrance.gouv.fr/x"; // 18,6 %',
      "const e = `${VALEURS.forfaitTravaux} du prix`;",
    ].join("\n");
    expect(valeursEnDur(source)).toEqual([
      { ligne: 1, extrait: "15 %" },
      { ligne: 2, extrait: "30 %" },
      { ligne: 3, extrait: "22 ans" },
      { ligne: 3, extrait: "30 ans" },
    ]);
  });
});

describe("aucun composant n'écrit une valeur réglementaire à la main", () => {
  it.each(FICHIERS.map((f) => [relative(process.cwd(), f).split(sep).join("/"), f]))(
    "%s",
    (_nom, chemin) => {
      const trouvees = valeursEnDur(readFileSync(chemin, "utf8")).map(
        ({ ligne, extrait }) => `ligne ${ligne} : « ${extrait} »`,
      );
      expect(trouvees, "valeur écrite en dur : la faire venir de params.ts par un jeton").toEqual([]);
    },
  );
});
