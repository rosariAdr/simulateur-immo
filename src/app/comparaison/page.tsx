import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleComparaison } from "@/components/comparaison/ModuleComparaison";
import { DEFAUTS } from "@/lib/comparaison";

export const metadata: Metadata = {
  title: "Acheter ou louer — comparaison des coûts année par année",
  description:
    "Compare le coût d'être propriétaire et celui d'être locataire sur " +
    `${DEFAUTS.horizonAnnees} ans, en décaissement et en fonds perdus, avec les deux années de ` +
    "croisement. La part de capital d'une mensualité n'est pas une dépense, et l'écran le dit " +
    "avant de montrer ses courbes. Gratuit, sans compte, sans collecte de données.",
};

/**
 * MODULE « ACHETER OU LOUER » — `/comparaison`
 *
 * Composant serveur, prérendu statiquement. `Suspense` est requis : le module
 * lit l'état d'URL, ce qui suspend le rendu côté serveur. Sans lui, la page
 * entière retomberait en rendu dynamique et perdrait le prérendu voulu par
 * `docs/02-architecture.md` §8.
 *
 * `DEFAUTS` est lu ici, dans un composant SERVEUR, et c'est la raison d'être de
 * la séparation décrite en tête de `src/lib/comparaison.ts` : ce module ne
 * contient aucun parseur `nuqs`, donc rien n'empêche la page de s'en servir. La
 * même lecture depuis `src/lib/scenario.ts` ferait échouer la compilation.
 */
export default function PageComparaison() {
  return (
    <Suspense fallback={<div className="min-h-full bg-papier" />}>
      <ModuleComparaison />
    </Suspense>
  );
}
