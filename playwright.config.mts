import { defineConfig, devices } from "@playwright/test";

/**
 * TESTS DE BOUT EN BOUT
 *
 * Ils vérifient ce que l'utilisateur voit vraiment : le format des montants, la
 * navigation au clavier, et le fait qu'aucune information ne soit portée par la
 * seule couleur. Le moteur a ses propres tests, ils ne font pas double emploi.
 *
 * Extension .mts, comme vitest.config.mts : le projet n'est pas déclaré
 * "type": "module".
 *
 *   npm run e2e
 *   npm run e2e:ui
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Le dossier est hors de src/, donc invisible pour Vitest, dont l'include est
  // src/**/*.test.ts. Les deux suites ne se marchent pas dessus.
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? "github" : "list",

  use: {
    // localhost et non 127.0.0.1 : Next refuse en 403 les requêtes vers
    // /_next/* venant d’une origine qu’il ne reconnaît pas, et la page ne
    // s’hydrate alors jamais. Le symptôme est trompeur — la page s’affiche,
    // mais aucun contrôle ne répond.
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },

  projects: [
    {
      name: "bureau",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      // La densité doit survivre à la contrainte : c'est une exigence du brief,
      // pas une politesse. Voir docs/01-brief-design.md §8.
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],

  webServer: {
    // Build de production, et non serveur de développement. Ce dernier
    // recompile les routes à la demande et diffuse ses rechargements à chaud
    // aux pages ouvertes : un composant se remonte en plein test et perd son
    // état. Le symptôme est déroutant — chaque test passe isolément, la suite
    // échoue. Le build coûte une quinzaine de secondes et rend tout stable.
    command: "npm run build && npx next start --port 3100",
    url: "http://localhost:3100/composants",
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
  },
});
