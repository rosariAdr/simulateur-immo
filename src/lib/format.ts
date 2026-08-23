/**
 * MISE EN FORME FRANÇAISE
 *
 * Couche de présentation, pas de domaine. Elle traduit les centimes entiers du
 * moteur en chaînes lisibles ; elle ne calcule rien.
 *
 * Format non négociable, voir docs/01-brief-design.md §5 : espace insécable
 * comme séparateur de milliers, virgule décimale, symbole euro APRÈS le montant.
 */

import { toEuros, type Cents } from "@/core/money";

const EUROS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NOMBRE = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Montant complet : « 180 000,00 € ». */
export const formatEuros = (montant: Cents): string => EUROS.format(toEuros(montant));

/** Montant sans décimales, pour les saisies rondes : « 180 000 € ». */
export const formatEurosCourt = (montant: Cents): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(toEuros(montant));

/**
 * Pourcentage. Les taux d'intérêt portent deux décimales, tout le reste au plus
 * une — règle du brief §5.
 */
export const formatPourcentage = (valeur: number, decimales: 1 | 2 = 2): string =>
  `${valeur.toFixed(decimales).replace(".", ",")} %`;

/** Durée exprimée dans l'unité que l'utilisateur manipule. */
export function formatDuree(mois: number): string {
  const annees = Math.floor(mois / 12);
  const reste = mois % 12;
  if (reste === 0) return `${annees} ${annees > 1 ? "ans" : "an"}`;
  return `${annees} ${annees > 1 ? "ans" : "an"} et ${reste} mois`;
}

/**
 * Date d'un relevé d'hypothèses de marché, « 2026-08 », rendue en clair.
 *
 * Les hypothèses de `src/core/assumptions/market.ts` portent un mois de relevé
 * et non un millésime légal — elles n'ont pas d'exercice. L'écran qui les
 * affiche doit dire ce mois-là, et « 2026-08 » n'est pas une date lisible.
 * Une chaîne qui n'a pas la forme attendue est rendue telle quelle plutôt que
 * déformée : mieux vaut afficher un code brut qu'un mois inventé.
 */
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;

export function formatMoisReleve(releve: string): string {
  const trouve = /^(\d{4})-(\d{2})$/.exec(releve);
  if (!trouve) return releve;
  const nom = MOIS[Number(trouve[2]) - 1];
  return nom ? `${nom} ${trouve[1]}` : releve;
}

/**
 * Analyse une saisie française et rend des centimes.
 *
 * Tolère l'espace insécable, l'espace fine, le point comme séparateur de
 * milliers et le symbole euro. Rend `null` sur une saisie inexploitable — la
 * distinction entre « vide » et « invalide » appartient à l'appelant.
 */
export function parseSaisieEuros(saisie: string): Cents | null {
  const nettoye = saisie
    .replace(/[\s  ]/g, "")
    .replace(/€/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (nettoye === "") return null;
  const valeur = Number(nettoye);
  if (!Number.isFinite(valeur)) return null;
  return Math.round(valeur * 100);
}

/** Analyse un pourcentage saisi. Rend `null` si inexploitable. */
export function parseSaisiePourcentage(saisie: string): number | null {
  const nettoye = saisie.replace(/[\s  %]/g, "").replace(",", ".");
  if (nettoye === "") return null;
  const valeur = Number(nettoye);
  return Number.isFinite(valeur) ? valeur : null;
}

export { NOMBRE as formatteurNombre };
