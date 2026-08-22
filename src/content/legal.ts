/**
 * IDENTITÉ DE PUBLICATION
 *
 * Les valeurs que les pages légales répètent. Elles vivent ici pour une raison
 * précise : une adresse de contact recopiée à quatre endroits finit par n'être
 * exacte qu'à trois.
 *
 * Ce fichier n'est pas du contenu rédactionnel — les textes eux-mêmes sont dans
 * `docs/legal/`, qui reste la source, et dans les pages qui les rendent.
 */

/** Adresse de contact publique, telle qu'elle figure dans les mentions légales. */
export const CONTACT = "adr.rosari@gmail.com";

/** Date de dernière mise à jour des textes légaux, au format affiché. */
export const MAJ_LEGALE = "22 août 2026";

/**
 * Hébergeur.
 *
 * @source Vercel Inc., *Terms of Service*, § 22.3.4 — adresse à laquelle sont
 *         adressées les demandes d'arbitrage. Relevée le 22 août 2026 sur
 *         https://vercel.com/legal/terms, et non de mémoire.
 *
 * Vercel ne publie aucun numéro de téléphone. L'article 6 III de la LCEN exige le
 * nom, la dénomination et les coordonnées de l'hébergeur ; l'absence de téléphone
 * est un fait, elle se dit plutôt qu'elle ne s'invente.
 */
export const HEBERGEUR = {
  nom: "Vercel Inc.",
  adresse: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  site: "https://vercel.com",
} as const;

/** Dépôt public du code source. */
export const DEPOT = "https://github.com/rosariAdr/simulateur-immo";
