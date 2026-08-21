/**
 * THÈMES DE SURFACE
 *
 * Le thème est un paramètre, pas une copie. Ce script relit les planches et
 * substitue les valeurs de surface, pour produire deux jeux comparables sans
 * maintenir deux fois huit fichiers.
 *
 *   node scripts/design-themes.mjs
 *
 * « ardoise-nocturne » est le thème par défaut du produit ; « bleu-gris-franc »
 * est la variante claire. Les planches sont authorées en clair et les deux thèmes
 * en sont dérivés — héritage de la phase de comparaison, pas une hiérarchie.
 *
 * Composants.dc.html est exclu : cette planche montre délibérément les deux
 * thèmes côte à côte, la reteinter n'aurait pas de sens.
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";

const PLANCHES = [
  "Main.dc.html",
  "Contraintes.dc.html",
  "Mobile.dc.html",
  "PierreOuMarches.dc.html",
  "Revelation.dc.html",
  "Accueil.dc.html",
  "Fiche.dc.html",
];

const HORS_THEME = ["Composants.dc.html"];

/**
 * Les clés sont les valeurs du jeu actuel, qui sert de source. Le rôle est en
 * commentaire parce que c'est lui qui compte : on ne substitue pas une couleur,
 * on rebranche un jeton.
 */
const THEMES = {
  "ardoise-nocturne": {
    titre: "Ardoise nocturne",
    map: {
      "#f1f3f6": "#161c24", // papier
      "#f8f9fb": "#1e2632", // panneau
      "#14181c": "#e6eaef", // encre — l'inversion est voulue, les fonds encrés deviennent clairs
      "#4a555f": "#a9b3bd", // encre secondaire
      "#c9cfd7": "#2f3945", // filet
      "#eceff3": "#262f3a", // survol
      "#e2e6eb": "#232c36", // filet de grille
      "#dde1e7": "#2a333d", // filet désactivé
      "#8b949d": "#6b757f", // encre désactivée
      "#7e5f26": "#c79a46", // accent laiton
      "#5f4718": "#dcb267", // accent au survol
      "#a58a4e": "#8a7238", // filet de pastille
      "#f7f0dd": "#2e2718", // fond d'infobulle
      "#d9c48c": "#6b5a2e", // filet d'infobulle
      "#f6eeec": "#2a1f1c", // fond d'erreur
      "#207e5d": "#46a37f", // capital
      "#863525": "#ae523f", // intérêts
      "#846cad": "#a581c6", // assurance
      "#085491": "#2170b0", // marchés, remplissage
      "#107c5a": "#46a37f", // capital, variante texte
      "#725b9a": "#a581c6", // assurance, variante texte
      "#333c45": "#c9cfd7", // filet inversé du bandeau mobile
      "#e6eaef": "#14181c", // encre inversée du bandeau mobile
      "#a9b3bd": "#4a555f", // encre secondaire inversée
      "#c79a46": "#7e5f26", // accent inversé
    },
    mapTexte: {
      "#085491": "#4d87c7", // marchés en texte : 4,57:1 sur #161c24 (la série n atteint que 3,4:1)
      "#863525": "#c46c5a", // intérêts en texte : 4,60:1 sur #161c24
    },
  },
  "bleu-gris-franc": {
    titre: "Bleu-gris franc",
    map: {
      "#f1f3f6": "#dfe5ed", // papier, nettement plus coloré
      "#f8f9fb": "#eef2f7", // panneau, franchement distinct du papier
      "#c9cfd7": "#b9c2cd", // filet
      "#eceff3": "#d5dce6", // survol
      "#e2e6eb": "#ccd4de", // filet de grille
      "#dde1e7": "#cbd3dd", // filet désactivé
      "#f6eeec": "#efe0db", // fond d'erreur, reposé sur le nouveau papier
      "#f7f0dd": "#f2e7ca", // fond d'infobulle
    },
    mapTexte: {
      "#107c5a": "#007453", // capital en texte : 4,57:1 sur le papier #dfe5ed
      "#725b9a": "#715999", // assurance en texte : 4,61:1 sur le papier #dfe5ed
    },
  },
};

/**
 * Une couleur de série et une couleur de texte ne sont pas le même jeton, même
 * quand elles partagent une valeur — ce qui est le cas de deux d'entre elles en
 * thème clair. Sur fond sombre elles divergent, parce qu'un remplissage se
 * contente de 3:1 quand un texte exige 4,5:1.
 *
 * Ce n'est pas un détail : forcer les quatre remplissages à tenir 4,5:1 sur la
 * surface sombre les tasse dans une bande de clarté si étroite que le violet et
 * le bleu deviennent indiscernables (ΔE 14,4 en vision normale, sous le plancher
 * de 15). Vérifié par recherche exhaustive sur 48 candidats : aucun ne passe.
 *
 * D'où la substitution sensible au contexte : « color: » prend la variante
 * texte, tout le reste — background, fill, stroke — prend la variante série.
 */
function reteindre(src, map, mapTexte = {}) {
  const cles = Object.keys(map).sort((a, b) => b.length - a.length);
  // Une seule passe : le préfixe « color: » est capturé en même temps que la
  // valeur, ce qui évite un second parcours et donc tout risque de re-mapper
  // une couleur déjà substituée.
    // Pas d’antislash dans ce motif : la propriété est toujours écrite
  // « color: » avec une seule espace dans les planches.
  const motif = new RegExp("(color: )?(" + cles.join("|") + ")", "gi");
  return src.replace(motif, (_, prop, hex) => {
    const cle = hex.toLowerCase();
    const cible = prop && mapTexte[cle] ? mapTexte[cle] : map[cle] ?? hex;
    return (prop ?? "") + cible;
  });
}

for (const [nom, theme] of Object.entries(THEMES)) {
  const dossier = `design/${nom}`;
  mkdirSync(dossier, { recursive: true });

  for (const planche of PLANCHES) {
    writeFileSync(`${dossier}/${planche}`, reteindre(readFileSync(planche, "utf8"), theme.map, theme.mapTexte), "utf8");
  }
  for (const planche of HORS_THEME) {
    cpSync(planche, `${dossier}/${planche}`);
  }
  cpSync("canvas.json", `${dossier}/canvas.json`);

  console.log(`${dossier} — ${theme.titre} : ${PLANCHES.length + HORS_THEME.length} planches`);
}
