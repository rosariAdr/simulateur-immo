/**
 * COQUILLE PERSISTANTE ET INFOBULLES
 *
 * Injecte dans chaque planche de bureau la même barre de navigation, et
 * normalise leur largeur. Une structure identique d'un écran à l'autre est une
 * exigence d'ergonomie, pas une coquetterie : c'est ce qui permet de changer de
 * module sans réapprendre où sont les choses.
 *
 *   node scripts/design-shell.mjs
 *
 * Idempotent : relancer ne duplique pas la barre.
 */

import { readFileSync, writeFileSync } from "node:fs";

const LARGEUR = 1240;

/** Icônes au trait, grille de 20 px. Jamais d'emoji, jamais de glyphe détourné. */
const ICONES = {
  credit: '<path d="M4 3h12v14H4z"></path><path d="M7 7h6"></path><path d="M7 11h2"></path><path d="M7 14h2"></path><path d="M12 11v3"></path>',
  louer: '<path d="M10 3v14"></path><path d="M4 7h12"></path><path d="M4 7l-2 5h4z"></path><path d="M16 7l-2 5h4z"></path>',
  anticipe: '<path d="M3 5h14v12H3z"></path><path d="M3 9h14"></path><path d="M7 3v3"></path><path d="M13 3v3"></path><path d="M10 12v3"></path><path d="M8.5 13.5L10 12l1.5 1.5"></path>',
  marches: '<path d="M3 16l4-5 3 3 6-8"></path><path d="M12 6h4v4"></path>',
  aides: '<path d="M3 9h14v8H3z"></path><path d="M3 6h14v3H3z"></path><path d="M10 6v11"></path><path d="M10 6S8.5 3 6.5 3 4 6 10 6z"></path><path d="M10 6s1.5-3 3.5-3S16 6 10 6z"></path>',
  fiches: '<path d="M4 4h5a2 2 0 012 2v10a2 2 0 00-2-2H4z"></path><path d="M16 4h-5a2 2 0 00-2 2v10a2 2 0 012-2h5z"></path>',
};

const icone = (d, couleur) =>
  `<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="${couleur}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const ENTREE = [
  ["credit", "Crédit"],
  ["louer", "Acheter ou louer"],
  ["anticipe", "Anticipés"],
  ["marches", "Pierre ou marchés"],
  ["aides", "Aides"],
  ["fiches", "Fiches"],
];

function barre(actif) {
  const liens = ENTREE.map(([cle, libelle]) => {
    const on = cle === actif;
    const couleur = on ? "#14181c" : "#4a555f";
    const fond = on ? "background: #f8f9fb; border-bottom: 2px solid #14181c;" : "border-bottom: 2px solid transparent;";
    return (
      `<span style="display: flex; align-items: center; gap: 6px; padding: 7px 10px 6px; ${fond}">` +
      icone(ICONES[cle], couleur) +
      `<span class="ps" style="font-size: 12px; color: ${couleur}">${libelle}</span></span>`
    );
  }).join("");

  return (
    '<div style="display: flex; align-items: stretch; justify-content: space-between; border-bottom: 1px solid #c9cfd7; margin-bottom: 20px">' +
    '<div style="display: flex; align-items: stretch; gap: 2px">' +
    '<span class="ar" style="font-weight: 700; font-size: 15px; letter-spacing: -0.018em; color: #14181c; display: flex; align-items: center; padding-right: 18px">Simulateur d’acquisition</span>' +
    liens +
    "</div>" +
    '<div style="display: flex; align-items: center; gap: 16px">' +
    '<span class="ps" style="font-size: 11px; color: #4a555f">Barèmes du 3<sup>e</sup> trimestre 2026</span>' +
    '<span class="ps" style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #7e5f26; border: 1px solid #7e5f26; padding: 5px 10px">' +
    '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#7e5f26" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12a3 3 0 004.2 0l2.8-2.8a3 3 0 10-4.2-4.2L9.4 6"></path><path d="M12 8a3 3 0 00-4.2 0L5 10.8a3 3 0 104.2 4.2L10.6 14"></path></svg>' +
    "Copier le lien</span></div></div>"
  );
}

const PAGES = {
  "Main.dc.html": { actif: "credit", padding: "20px 32px 32px" },
  "Contraintes.dc.html": { actif: "credit", padding: "20px 32px 32px" },
  "Composants.dc.html": { actif: "credit", padding: "20px 32px 32px" },
  "PierreOuMarches.dc.html": { actif: "marches", padding: "20px 32px 32px" },
  "Revelation.dc.html": { actif: "louer", padding: "20px 32px 32px" },
  "Fiche.dc.html": { actif: "fiches", padding: "20px 32px 40px" },
};

const MARQUE = "<!--coquille-->";

for (const [fichier, conf] of Object.entries(PAGES)) {
  let src = readFileSync(fichier, "utf8");

  if (src.includes(MARQUE)) {
    src = src.replace(new RegExp(`${MARQUE}[\\s\\S]*?${MARQUE}`), MARQUE + barre(conf.actif) + MARQUE);
  } else {
    const racine = /(<div class="ps" style="width: )\d+(px;[^"]*padding: )[^";]*(")/;
    if (!racine.test(src)) throw new Error(`racine introuvable dans ${fichier}`);
    src = src.replace(racine, `$1${LARGEUR}$2${conf.padding}$3`);
    const ouverture = src.indexOf(">", src.search(racine)) + 1;
    src = src.slice(0, ouverture) + "\n" + MARQUE + barre(conf.actif) + MARQUE + "\n" + src.slice(ouverture);
  }

  writeFileSync(fichier, src, "utf8");
  console.log(`${fichier.padEnd(26)} largeur ${LARGEUR}, onglet actif « ${conf.actif} »`);
}
