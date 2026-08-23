/**
 * ÉCARTEMENT DE DEUX LIBELLÉS DE COURBE
 *
 * ⚠️ Cette fonction déplace du TEXTE, jamais une mesure. Deux courbes qui se
 * rejoignent au dernier point — c'est le cas au voisinage d'un croisement —
 * portent deux libellés superposés, illisibles tous les deux. Les repères
 * mesurables, eux, ne bougent pas d'un pixel : les gardes de proportions les
 * lisent, pas les libellés.
 *
 * Écrite pour `VIZ-003` dans `CourbesCout`, sortie de ce fichier par `UI-007`
 * quand `CourbesPatrimoine` en a eu besoin à son tour. Le comportement n'a pas
 * changé d'un chiffre, et la garde « les deux libellés de courbe ne se
 * recouvrent jamais » le vérifie sur les deux écrans.
 */

/** Écart minimal en % de la hauteur du cadre, pour deux lignes de 10 px. */
const MINIMUM = 8;
/** Marges dans lesquelles un libellé reste entièrement dans la gouttière. */
const PLANCHER = 4;
const PLAFOND = 92;

export function ecarter(a: number, b: number): readonly [number, number] {
  const serrer = (v: number) => Math.min(Math.max(v, PLANCHER), PLAFOND);
  // Le serrage vient AVANT l'écartement, et non l'inverse : borner après avoir
  // écarté ramène les deux libellés sur la même limite, ce qui les superpose de
  // nouveau — exactement le défaut qu'on cherchait à corriger.
  let haut = serrer(Math.max(a, b));
  let bas = serrer(Math.min(a, b));

  if (haut - bas < MINIMUM) {
    haut = Math.min(haut + (MINIMUM - (haut - bas)) / 2, PLAFOND);
    bas = haut - MINIMUM;
    if (bas < PLANCHER) {
      bas = PLANCHER;
      haut = bas + MINIMUM;
    }
  }

  return a >= b ? [haut, bas] : [bas, haut];
}
