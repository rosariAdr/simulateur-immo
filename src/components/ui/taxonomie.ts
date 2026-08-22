/**
 * TAXONOMIE DES PARAMÈTRES
 *
 * Le fil conducteur du produit : tout paramètre appartient à l'une de trois
 * familles, et la porte visuellement dans tous les modules.
 * Voir docs/CONTEXT.md §3.
 *
 * L'appartenance n'est JAMAIS signalée par la seule couleur. Elle l'est par le
 * trait de la bordure — plein laiton, plein gris, tireté — et par une étiquette
 * en toutes lettres. Un lecteur qui ne distingue pas le laiton du gris lit
 * quand même l'étiquette, et voit quand même le tireté.
 */

export type Famille = "negociable" | "contraint" | "reglementaire";

interface StyleFamille {
  /** Étiquette affichée, en toutes lettres. */
  readonly libelle: string;
  /** Bordure du champ au repos. */
  readonly bordure: string;
  /** Bordure et encre de l'étiquette. */
  readonly etiquette: string;
  /** Ce que la famille dit à l'utilisateur, pour les infobulles et l'aide. */
  readonly message: string;
}

export const FAMILLES: Readonly<Record<Famille, StyleFamille>> = {
  negociable: {
    libelle: "négociable",
    bordure: "border border-accent",
    etiquette: "border-accent text-accent",
    message: "Voici votre marge de manœuvre, et le bon moment pour l'exercer.",
  },
  contraint: {
    libelle: "contraint",
    bordure: "border border-filet",
    etiquette: "border-filet text-encre-secondaire",
    message: "Voici les leviers de votre projet, et leurs effets croisés.",
  },
  reglementaire: {
    libelle: "réglementaire",
    bordure: "border border-dashed border-encre-secondaire",
    etiquette: "border-encre-secondaire text-encre-secondaire",
    message: "Voici le mur, où il se trouve, et pourquoi il existe.",
  },
};
