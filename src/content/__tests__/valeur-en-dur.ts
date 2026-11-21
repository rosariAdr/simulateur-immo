/**
 * LA GARDE ANTI-CHIFFRE, PARTAGÉE — `CNT-001`, étendue aux composants par `FIS-012`
 *
 * Une seule définition pour les deux gardes qui l'emploient : le texte long du
 * glossaire (`developpements.test.ts`) et le code des composants
 * (`composants-sans-valeur-en-dur.test.ts`). Deux copies de l'expression
 * finiraient par diverger, et la plus lâche des deux deviendrait la règle.
 *
 * Ce fichier ne porte pas le suffixe `.test.ts` : Vitest ne le collecte pas,
 * les deux tests l'importent.
 */

/**
 * Un nombre suivi d'une unité réglementaire, écrit à la main.
 *
 * « 35 % », « 25 ans », « 200 000 € », « 6 mois » : exactement ce que
 * `CLAUDE.md` interdit d'écrire dans un texte, et qui doit venir de
 * `src/core/fiscal/params.ts` par un jeton. La date « 1er janvier » n'est pas
 * concernée : elle ne porte aucune de ces unités.
 */
export const VALEUR_EN_DUR = /\d+(?:[.,\s  ]\d+)*\s*(?:%|€|\bans?\b|\bmois\b)/u;
