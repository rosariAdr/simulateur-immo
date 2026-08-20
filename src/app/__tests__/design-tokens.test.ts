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
 * Les jetons du thème clair vivent dans le premier bloc, ceux du thème sombre
 * dans la surcharge `@media`. Découper là dessus suffit et évite d'embarquer un
 * analyseur CSS.
 */
function tokens(theme: "clair" | "sombre"): Record<string, string> {
  const marker = "@media (prefers-color-scheme: dark)";
  const at = CSS.indexOf(marker);
  expect(at, "la surcharge de thème sombre a disparu de globals.css").toBeGreaterThan(0);
  const block = theme === "clair" ? CSS.slice(0, at) : CSS.slice(at);

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

describe.each(["clair", "sombre"] as const)("jetons — thème %s", (theme) => {
  const t = tokens(theme);

  it("définit tous les jetons attendus", () => {
    for (const name of [...TEXTE, ...REMPLISSAGE, "papier", "panneau", "filet"]) {
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

  it("garde le texte lisible sur un panneau de saisie", () => {
    const ratio = contrast(t["encre"] as string, t["panneau"] as string);
    expect(ratio, `--encre sur --panneau : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * Le thème sombre est choisi, pas dérivé. Si ses valeurs devenaient identiques
 * à celles du thème clair, c'est qu'une inversion automatique aurait remplacé
 * le choix — exactement ce que l'ADR-002 interdit.
 */
it("le thème sombre a ses propres pas", () => {
  const clair = tokens("clair");
  const sombre = tokens("sombre");
  for (const name of REMPLISSAGE) {
    expect(sombre[name], `--${name} identique dans les deux thèmes`).not.toBe(clair[name]);
  }
});
