import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  /**
   * Le même alias que `tsconfig.json` — `CNT-001`.
   *
   * Sans lui, tout module qui importe en `@/…` compile mais ne s'exécute pas
   * sous Vitest : `src/lib/format.ts` et `src/content/valeurs.ts` étaient donc
   * intestables, et le défaut ne se voyait qu'au premier test qui les touchait.
   * `tsc` résout l'alias, Vite ne le lit pas dans `tsconfig.json`.
   */
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
