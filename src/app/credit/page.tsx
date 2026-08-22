import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleCredit } from "@/components/credit/ModuleCredit";

export const metadata: Metadata = {
  title: "Module crédit — simulateur d'acquisition",
  description:
    "Mensualité, coût total, TAEG et conformité aux plafonds, à partir de six paramètres. " +
    "Chaque scénario est un lien partageable. Gratuit, sans compte, sans collecte de données.",
};

/**
 * MODULE CRÉDIT — `/credit`
 *
 * `Suspense` est requis : le module lit l'état d'URL, ce qui suspend le rendu
 * côté serveur. Sans lui, la page entière retomberait en rendu dynamique et
 * perdrait le prérendu statique voulu par docs/02-architecture.md §8.
 */
export default function PageCredit() {
  return (
    <Suspense fallback={<div className="min-h-full bg-papier" />}>
      <ModuleCredit />
    </Suspense>
  );
}
