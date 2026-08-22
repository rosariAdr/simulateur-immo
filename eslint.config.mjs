import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Frontière moteur / interface — voir docs/02-architecture.md, section 1.
 * Le moteur doit rester une bibliothèque de fonctions pures, testable et
 * réutilisable hors navigateur. Un seul import UI suffit à casser cette
 * propriété, d'où une garde automatique plutôt qu'une règle de discipline.
 */
const FRONTIERE =
  "src/core/ ne doit dépendre ni de React ni de Next.js : le moteur est une " +
  "bibliothèque de fonctions pures, testable et réutilisable hors navigateur. " +
  "Déplacez ce code dans src/components/ ou src/app/, ou faites remonter la " +
  "valeur par un paramètre. Voir docs/02-architecture.md, section 1.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Copies de travail des agents (`git worktree`). Elles vivent dans le dépôt
    // et contiennent leur propre arborescence, `.next` compris : sans cette
    // exclusion, la porte d'une branche lint le code d'une autre et rougit pour
    // des défauts qui ne la concernent pas.
    ".claude/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prototype conservé comme référence d'interaction, jamais compilé.
    // Voir docs/prototype/README.md.
    "docs/**",
  ]),
  {
    files: ["src/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/*",
                "react-dom",
                "react-dom/*",
                "next",
                "next/*",
                "nuqs",
                "nuqs/*",
                "recharts",
                "recharts/*",
              ],
              message: FRONTIERE,
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
