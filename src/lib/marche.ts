/**
 * LA MARCHE DE L'ÉCHÉANCE — `UI-011`
 *
 * Couche de présentation : elle ne calcule aucun montant, elle décide seulement
 * si une phrase peut être écrite.
 *
 * ═══ CE QU'ELLE REMPLACE ═══
 *
 * La légende de la mensualité se déclenchait sur `firstPayment !== maxPayment`.
 * Or `maxPayment` balaie TOUTES les échéances, dernière comprise — et la dernière
 * solde le capital restant dû, donc elle diffère presque toujours des autres,
 * d'un ou deux euros. Sur le scénario par défaut, l'écart d'arrondi de 1,02 €
 * suffisait à faire afficher « elle monte à 1 062,41 € après le différé », alors
 * qu'aucun différé n'existe.
 *
 * Une phrase fausse sous un chiffre juste est pire qu'un chiffre faux : le
 * chiffre invite à croire la phrase.
 *
 * ═══ CE QU'ELLE CHERCHE ═══
 *
 * Une hausse EN COURS DE ROUTE, celle qui survient à la fin d'un différé —
 * typiquement quand un prêt à taux zéro commence à s'amortir. Entre deux
 * échéances consécutives, et jamais sur la dernière, qui n'est pas une marche
 * mais un solde.
 */

/** Le strict nécessaire d'une échéance pour cette décision. */
export interface EcheanceLue {
  readonly month: number;
  readonly payment: number;
}

/**
 * Seuil en centimes séparant une marche d'un bruit d'arrondi.
 *
 * Il n'est pas arbitraire : une marche contractuelle se compte en centaines
 * d'euros, un bruit d'arrondi en centimes. Toute valeur entre les deux aurait
 * fait l'affaire, et aucune ne se discute à la marge — il n'y a rien de réel
 * entre deux centimes et cent euros.
 */
const SEUIL = 100;

export function premiereMarche(echeances: readonly EcheanceLue[]): EcheanceLue | null {
  // `- 1` sur la borne : la dernière échéance solde, elle ne marche pas.
  for (let i = 0; i + 1 < echeances.length - 1; i++) {
    const avant = echeances[i];
    const apres = echeances[i + 1];
    if (!avant || !apres) continue;
    if (apres.payment - avant.payment > SEUIL) return apres;
  }
  return null;
}
