import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARAMS_2026 } from "../params";
import { euros } from "../../money";

/**
 * RÉGIMES FISCAUX LOCATIFS — `FIS-010`
 *
 * Comme pour `FIS-007` : ces tests ne recopient pas le fichier, ils vérifient ce
 * que les textes imposent AUX VALEURS ENTRE ELLES, plus les quelques montants que
 * les articles écrivent en toutes lettres — chaque attendu vient d'un texte, jamais
 * du moteur.
 *
 * Deux alignements portent l'essentiel. L'article 50-0 range la location meublée de
 * longue durée et le meublé de tourisme classé dans la MÊME catégorie (le 2°) : un
 * seuil qui divergerait entre les deux serait une erreur de recopie. Et la loi
 * Le Meur a aligné le meublé de tourisme non classé (1° bis) sur le micro-foncier :
 * si l'un des deux bouge sans l'autre, ce n'est pas une correction à faire ici,
 * c'est une loi nouvelle — revérifier LES DEUX textes avant de toucher au fichier.
 */

const PARAMS_SRC = readFileSync(join(process.cwd(), "src/core/fiscal/params.ts"), "utf8");

/** Le même texte, commentaires dépliés — même raison que dans `params-plus-value.test.ts`. */
const PARAMS_DEPLIE = PARAMS_SRC.replace(/\n\s*\*\s?/g, " ").replace(/\s+/g, " ");

const loc = PARAMS_2026.rentalIncome;

// ═══════════════════════════════════════════════════════════════════════════
// Micro-foncier
// ═══════════════════════════════════════════════════════════════════════════

describe("micro-foncier", () => {
  it("porte le seuil et l'abattement que l'article 32 écrit en toutes lettres", () => {
    // CGI, art. 32, version en vigueur au 21 février 2026 : 15 000 € et 30 %.
    expect(loc.microFoncier.grossIncomeThresholdCents).toBe(euros(15_000));
    expect(loc.microFoncier.allowancePct).toBe(30);
  });

  it("a un abattement qui reste un pourcentage", () => {
    expect(loc.microFoncier.allowancePct).toBeGreaterThan(0);
    expect(loc.microFoncier.allowancePct).toBeLessThan(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Micro-BIC
// ═══════════════════════════════════════════════════════════════════════════

describe("micro-BIC", () => {
  const bic = loc.microBic;

  it("porte les montants 2026 de l'article 50-0 actualisé", () => {
    // Décret n° 2026-562 du 29 juin 2026, actualisation triennale : 83 600 € au 2°.
    // Le 1° bis reste à 15 000 €, expressément exclu de l'actualisation.
    expect(bic.longTermThresholdCents).toBe(euros(83_600));
    expect(bic.unclassifiedTourismThresholdCents).toBe(euros(15_000));
    expect(bic.minimumAllowanceCents).toBe(euros(305));
  });

  it("range la longue durée et le meublé classé dans la même catégorie", () => {
    // Ils relèvent tous deux du 2° de l'article 50-0 : même seuil, même abattement.
    // Une divergence entre les deux ne peut être qu'une recopie de travers.
    expect(bic.classifiedTourismThresholdCents).toBe(bic.longTermThresholdCents);
    expect(bic.classifiedTourismAllowancePct).toBe(bic.longTermAllowancePct);
  });

  it("garde le non classé aligné sur le micro-foncier, comme la loi Le Meur l'a voulu", () => {
    // Loi n° 2024-1039 du 19 novembre 2024 : le 1° bis reprend le seuil et
    // l'abattement du micro-foncier. Si ce test rougit, une loi a déplacé l'un des
    // deux : revérifier les deux textes, ne pas « réparer » l'égalité.
    expect(bic.unclassifiedTourismThresholdCents).toBe(loc.microFoncier.grossIncomeThresholdCents);
    expect(bic.unclassifiedTourismAllowancePct).toBe(loc.microFoncier.allowancePct);
  });

  it("fait du non classé le régime le plus étroit et le moins abattu", () => {
    // C'est le sens même de la réforme : le non classé perd sur les deux tableaux.
    expect(bic.unclassifiedTourismThresholdCents).toBeLessThan(bic.longTermThresholdCents);
    expect(bic.unclassifiedTourismAllowancePct).toBeLessThan(bic.longTermAllowancePct);
  });

  it("a des abattements qui restent des pourcentages, et un minimum petit devant les seuils", () => {
    for (const pct of [
      bic.longTermAllowancePct,
      bic.classifiedTourismAllowancePct,
      bic.unclassifiedTourismAllowancePct,
    ]) {
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThan(100);
    }
    expect(bic.minimumAllowanceCents).toBeGreaterThan(0);
    // L'abattement minimum est un plancher de simplification, pas un seuil de
    // régime : s'il se rapprochait du plus petit seuil, l'un des deux serait faux.
    expect(bic.minimumAllowanceCents).toBeLessThan(bic.unclassifiedTourismThresholdCents / 10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Courte durée — le seuil d'affiliation
// ═══════════════════════════════════════════════════════════════════════════

describe("seuil d'affiliation de la courte durée", () => {
  it("porte les 23 000 € de l'article L611-1, 6°", () => {
    expect(loc.shortTermSocialAffiliationThresholdCents).toBe(euros(23_000));
  });

  it("est un seuil de recettes plausible, strictement positif", () => {
    expect(loc.shortTermSocialAffiliationThresholdCents).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Le contrat du fichier : une valeur sans source n'y entre pas
// ═══════════════════════════════════════════════════════════════════════════

describe("chaque valeur de FIS-010 porte sa source", () => {
  /** Même lecture que dans `params-plus-value.test.ts` : le bloc JSDoc accolé, ou rien. */
  function blocAccole(declaration: string): string | null {
    const i = PARAMS_SRC.indexOf(declaration);
    if (i < 0) return null;
    const avant = PARAMS_SRC.slice(0, i);
    const debut = avant.lastIndexOf("/**");
    const fin = avant.lastIndexOf("*/");
    if (debut < 0 || fin < debut) return null;
    if (/\breadonly\b/.test(avant.slice(fin + 2))) return null;
    return avant.slice(debut, fin + 2);
  }

  const DECLARATIONS = [
    "readonly rentalIncome: {",
    "readonly microFoncier: {",
    "readonly microBic: {",
    "readonly shortTermSocialAffiliationThresholdCents: Cents;",
  ];

  for (const declaration of DECLARATIONS) {
    it(`${declaration.replace(/readonly |[:{;].*$/g, "").trim()} est documenté et sourcé`, () => {
      const bloc = blocAccole(declaration);
      expect(bloc, `${declaration} : aucun bloc JSDoc accolé`).not.toBeNull();
      expect(bloc as string, `${declaration} : bloc JSDoc sans @source`).toMatch(/@source/);
    });
  }

  it("cite les textes qui portent les valeurs de FIS-010", () => {
    for (const reference of [
      "art. 32", // micro-foncier
      "art. 50-0", // micro-BIC
      "art. L611-1", // affiliation de la courte durée
      "art. L136-8", // la dérogation qui sépare nue et meublée
    ]) {
      expect(PARAMS_SRC, `référence perdue : ${reference}`).toContain(reference);
    }
    // Les textes qui datent les montants, comparés sur le texte déplié.
    expect(PARAMS_DEPLIE).toMatch(/[Ll]oi n° 2024-1039 du 19 novembre 2024/);
    expect(PARAMS_DEPLIE).toMatch(/décret n° 2026-562 du 29 juin 2026/);
  });
});
