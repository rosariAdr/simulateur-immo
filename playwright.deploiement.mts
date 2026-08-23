import { defineConfig, devices } from "@playwright/test";

/**
 * VÉRIFICATION DU SITE DÉPLOYÉ
 *
 * `docs/RELEASES.md` §3 impose, après chaque étiquette, d'ouvrir le site publié
 * et d'y refaire le parcours. La raison est juste : la porte s'exécute sur un
 * build local et ne dit rien de ce que l'hébergeur sert réellement — une
 * variable d'environnement absente en production, un cache qui garde une version
 * précédente, une redirection ajoutée côté hébergeur, rien de tout cela
 * n'apparaît en local.
 *
 * Le document disait aussi que cette étape « n'est pas automatisable depuis le
 * dépôt ». C'était vrai de son jugement, pas de ses faits. Ce qui se vérifie
 * mécaniquement — les routes répondent, l'avertissement est là, le site n'est
 * pas indexable, un lien partagé redonne les mêmes chiffres — n'a aucune raison
 * d'être coché de mémoire. Ce qui reste humain est ce qui l'était vraiment :
 * regarder si l'écran est juste.
 *
 * ═══ CETTE CONFIGURATION EST DÉLIBÉRÉMENT SÉPARÉE ═══
 *
 * Elle ne fait PAS partie de `npm run porte`, et ne doit pas y entrer.
 *
 * La porte doit rester hermétique : elle vérifie le code du dépôt, sur un build
 * qu'elle produit elle-même, sans dépendre du réseau ni d'un tiers. Une porte
 * qui interroge un site distant devient rouge quand l'hébergeur tousse, et une
 * porte qui rougit pour des raisons étrangères au code finit par être ignorée —
 * ce qui est la seule façon de perdre une porte.
 *
 * Elle se lance donc à part, après l'étiquette :
 *
 *   npm run verif-deploiement
 *
 * L'adresse par défaut est celle de la production. Une préproduction se vérifie
 * en la passant :
 *
 *   URL_DEPLOIEMENT=https://exemple.vercel.app npm run verif-deploiement
 */
const RACINE = process.env["URL_DEPLOIEMENT"] ?? "https://simulateur-immo-snowy.vercel.app";

export default defineConfig({
  testDir: "./tests/deploiement",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  // Deux essais : un site distant a des aléas de réseau qu'un serveur local n'a
  // pas, et un échec intermittent qu'on ne peut pas reproduire n'apprend rien.
  retries: 2,
  reporter: "list",

  use: {
    baseURL: RACINE,
    trace: "on-first-retry",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },

  projects: [
    {
      name: "bureau",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  // Aucun `webServer` : c'est tout l'intérêt. On interroge ce qui est publié,
  // pas ce qu'on vient de construire.
});
