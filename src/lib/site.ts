/**
 * ÉTAT DE PUBLICATION DU SITE
 *
 * Un seul interrupteur, lu par `app/robots.ts` et par les métadonnées de la mise
 * en page. Deux endroits doivent dire la même chose — un `robots.txt` permissif
 * avec des balises `noindex`, ou l'inverse, est le genre d'incohérence qu'on ne
 * remarque qu'une fois le site indexé.
 *
 * `false` tant que `LEG-001` et `LEG-002` n'ont pas été relus par un juriste. Le
 * site fonctionne et se partage par lien ; il n'apparaît simplement pas dans les
 * moteurs. Voir `docs/RELEASES.md`, critère de sortie de v0.1.0.
 */
export const INDEXABLE = false;

/**
 * Le régime d'éditeur retenu, au sens du III de l'article 6 de la loi n° 2004-575
 * du 21 juin 2004 (LCEN).
 *
 * Éditeur non professionnel : l'identité complète est communiquée à l'hébergeur,
 * et le site ne publie que le nom de l'hébergeur et une adresse de contact. Ce
 * choix est documenté dans `docs/legal/mentions-legales.md`.
 */
export const EDITEUR_NON_PROFESSIONNEL = true;
