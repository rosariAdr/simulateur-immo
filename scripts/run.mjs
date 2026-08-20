/**
 * Exécute un module TypeScript en utilisant Vite comme résolveur.
 *
 * Raison d'être : les fichiers de src/core/ importent sans extension
 * ("../money"), convention que Next et Vitest résolvent mais que l'ESM natif de
 * Node refuse. Plutôt que d'ajouter un exécuteur TypeScript en dépendance, on
 * réutilise Vite, déjà présent via Vitest.
 *
 *   node scripts/run.mjs scripts/export-fixtures.mts
 */

import { createServer } from "vite";

const entry = process.argv[2];
if (!entry) {
  console.error("usage : node scripts/run.mjs <fichier.mts>");
  process.exit(1);
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  await server.ssrLoadModule(`/${entry}`);
} finally {
  await server.close();
}
