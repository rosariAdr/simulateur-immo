/**
 * DOSSIER DE PASSATION POUR CLAUDE DESIGN
 *
 * Assemble, sous design-pack/, les documents à transmettre, numérotés dans
 * l'ordre où ils doivent être lus. Le dossier est reconstruit à chaque appel :
 * il ne contient jamais de copie périmée.
 *
 *   npm run design-pack
 *
 * design-pack/ est ignoré par git. Sa source de vérité reste docs/ et fixtures/.
 */

import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DIR = "design-pack";
rmSync(DIR, { recursive: true, force: true });
mkdirSync(`${DIR}/annexes`, { recursive: true });

/* ── Le prompt, extrait de la feuille de route ────────────────────────────── */

const feuille = readFileSync("docs/07-brief-claude-design.md", "utf8");

const between = (from, to) => {
  const a = feuille.indexOf(from);
  const b = to ? feuille.indexOf(to, a) : feuille.length;
  if (a < 0) throw new Error(`section introuvable dans 07-brief-claude-design.md : ${from}`);
  return feuille.slice(a, b < 0 ? feuille.length : b).trim();
};

const prompt = between("## 2. Le prompt", "## 3.");
const refus = between("## 3. Ce que tu dois refuser", "## 4.");

writeFileSync(
  `${DIR}/00-PROMPT.md`,
  [
    "# À coller dans Claude Design",
    "",
    "## Ordre de collage",
    "",
    "1. `01-intention-de-design.md` — l'intention : métaphore, interdits, composition, écrans attendus",
    "2. `02-charte-graphique.md` — la palette et la typographie, **arrêtées**",
    "3. `03-donnees-reelles.md` — les sorties réelles du moteur, sur quatre scénarios",
    "4. Puis le prompt ci-dessous.",
    "",
    "Les fichiers d'`annexes/` ne se collent pas : ce sont les fixtures brutes, à",
    "consulter seulement si une valeur du document 03 demande vérification.",
    "",
    "---",
    "",
    prompt.replace("## 2. Le prompt", "## Le prompt").replace(/^---$/gm, ""),
    "",
    "---",
    "",
    refus.replace("## 3. Ce que tu dois refuser en retour", "## Grille de relecture du retour"),
  ].join("\n"),
  "utf8",
);

/* ── Les documents ────────────────────────────────────────────────────────── */

cpSync("docs/01-brief-design.md", `${DIR}/01-intention-de-design.md`);
cpSync("docs/06-design-system.md", `${DIR}/02-charte-graphique.md`);
cpSync("fixtures/PLANCHE-DESIGN.md", `${DIR}/03-donnees-reelles.md`);

for (const f of readdirSync("fixtures").filter((f) => f.endsWith(".json"))) {
  cpSync(`fixtures/${f}`, `${DIR}/annexes/${f}`);
}

/* ── Archive ──────────────────────────────────────────────────────────────── */

const zip = `${DIR}.zip`;
rmSync(zip, { force: true });
execFileSync(
  "powershell",
  ["-NoProfile", "-Command", `Compress-Archive -Path '${DIR}/*' -DestinationPath '${zip}' -Force`],
  { stdio: "inherit" },
);

const files = readdirSync(DIR);
console.log(`${zip} — ${files.length} entrées : ${files.join(", ")}`);
