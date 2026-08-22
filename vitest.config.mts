import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * L'alias `@/` n'est pas un confort d'écriture : sans lui, Vitest ne peut charger
 * aucun module de `src/lib/` ni de `src/content/` qui dépende du moteur, puisque
 * tout `src/` s'écrit en `@/…` — la seule forme que `tsconfig.json` et Next
 * résolvent. La règle qu'il rétablit est simple : ce que la compilation résout,
 * les tests unitaires doivent le résoudre aussi, sinon une partie du code n'est
 * testable que de bout en bout.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
