/**
 * CONTRASTE DES JETONS DE DESIGN
 *
 * Les valeurs de globals.css ont été choisies par calcul, pas à l'œil. Ce test
 * empêche qu'elles régressent silencieusement : un ajustement esthétique qui
 * fait passer un texte sous 4,5:1 casse la suite.
 *
 * Il lit le CSS plutôt qu'une copie des valeurs, pour qu'il n'existe qu'une
 * seule source de vérité.
 *
 * Référence : WCAG 2.1, critère 1.4.3 (texte 4,5:1) et 1.4.11 (éléments non
 * textuels 3:1). Voir docs/06-design-system.md.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Luminance relative, WCAG 2.1 §relative luminance. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = channels as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Le thème par défaut est SOMBRE : il vit dans le premier bloc. Le thème clair
 * est la variante, dans la surcharge `@media`. Découper là dessus suffit et
 * évite d'embarquer un analyseur CSS.
 */
const BASCULE = "@media (prefers-color-scheme: light)";

function tokens(theme: "sombre" | "clair"): Record<string, string> {
  const at = CSS.indexOf(BASCULE);
  expect(at, "la variante de thème clair a disparu de globals.css").toBeGreaterThan(0);
  const block = theme === "sombre" ? CSS.slice(0, at) : CSS.slice(at);

  const found: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/g)) {
    const [, name, hex] = m as unknown as [string, string, string];
    found[name] = hex;
  }
  return found;
}

/** Doit rester lisible comme TEXTE. */
const TEXTE = [
  "encre",
  "encre-secondaire",
  "accent",
  "capital-texte",
  "interets-texte",
  "assurance-texte",
  "marches-texte",
] as const;

/** Ne sert qu'à REMPLIR une forme : seuil des éléments non textuels. */
const REMPLISSAGE = ["capital", "interets", "assurance", "marches"] as const;

/** Doivent exister, sans contrainte de contraste propre. */
const STRUCTURE = [
  "papier",
  "panneau",
  "filet",
  "filet-grille",
  "survol-fond",
  "accent-survol",
  "erreur-fond",
  "desactive-encre",
  "desactive-filet",
  "infobulle-fond",
  "infobulle-filet",
  "pastille-filet",
] as const;

describe.each(["sombre", "clair"] as const)("jetons — thème %s", (theme) => {
  const t = tokens(theme);

  it("définit tous les jetons attendus", () => {
    for (const name of [...TEXTE, ...REMPLISSAGE, ...STRUCTURE]) {
      expect(t[name], `jeton --${name} absent du thème ${theme}`).toBeDefined();
    }
  });

  it.each(TEXTE)("--%s atteint 4,5:1 sur le papier", (name) => {
    const fg = t[name];
    const bg = t["papier"];
    expect(fg).toBeDefined();
    expect(bg).toBeDefined();
    const ratio = contrast(fg as string, bg as string);
    expect(ratio, `--${name} (${fg}) sur --papier (${bg}) : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(REMPLISSAGE)("--%s atteint 3:1 sur le papier", (name) => {
    const fg = t[name];
    const bg = t["papier"];
    expect(fg).toBeDefined();
    expect(bg).toBeDefined();
    const ratio = contrast(fg as string, bg as string);
    expect(ratio, `--${name} (${fg}) sur --papier (${bg}) : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });

  it.each(["panneau", "infobulle-fond", "erreur-fond", "survol-fond"] as const)(
    "l'encre reste lisible sur --%s",
    (surface) => {
      const ratio = contrast(t["encre"] as string, t[surface] as string);
      expect(ratio, `--encre sur --${surface} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    },
  );
});

/**
 * Le thème clair est choisi, pas dérivé. Si ses valeurs devenaient identiques à
 * celles du thème sombre, c'est qu'une inversion automatique aurait remplacé le
 * choix — exactement ce que l'ADR-002 interdit.
 */
it("les deux thèmes ont leurs propres pas", () => {
  const sombre = tokens("sombre");
  const clair = tokens("clair");
  for (const name of REMPLISSAGE) {
    expect(clair[name], `--${name} identique dans les deux thèmes`).not.toBe(sombre[name]);
  }
});

/**
 * La séparation remplissage / texte n'est pas cosmétique : sur la surface
 * sombre, la couleur de série des marchés ne tient que 3,4:1, très en dessous
 * du seuil de texte. Si quelqu'un les réunifiait, ce test le dirait.
 */
it("le texte et le remplissage divergent là où ils le doivent", () => {
  const sombre = tokens("sombre");
  const serie = sombre["marches"] as string;
  const texte = sombre["marches-texte"] as string;
  expect(serie).not.toBe(texte);
  expect(contrast(serie, sombre["papier"] as string)).toBeLessThan(4.5);
  expect(contrast(texte, sombre["papier"] as string)).toBeGreaterThanOrEqual(4.5);
});
