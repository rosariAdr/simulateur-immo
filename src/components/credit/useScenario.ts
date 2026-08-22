"use client";

import { useQueryStates } from "nuqs";
import { useMemo } from "react";
import { buildCreditPlan, type CreditPlan } from "@/core/credit/plan";
import { PARAMS_2026, type FiscalParams } from "@/core/fiscal/params";
import { CLES_URL, PARSEURS, versEntreeMoteur, type Scenario } from "@/lib/scenario";

/**
 * LE SCÉNARIO ET SON CALCUL
 *
 * Un seul crochet expose l'état d'URL et le plan qui en découle. Le recalcul est
 * synchrone : sur trois cents échéances il coûte moins d'une milliseconde, ce qui
 * autorise l'absence de bouton « calculer » voulue par le brief.
 *
 * `useMemo` n'est pas là pour la performance mais pour la stabilité de la
 * référence : sans lui, chaque rendu produirait un nouvel objet `plan` et
 * relancerait tout ce qui en dépend.
 */
export function useScenario(): {
  scenario: Scenario;
  definir: ReturnType<typeof useQueryStates<typeof PARSEURS>>[1];
  plan: CreditPlan;
  /**
   * Le millésime sur lequel le plan est calculé. Exposé parce que l'interface
   * en a besoin ailleurs que dans les chiffres : une infobulle qui cite un
   * plafond doit le lire ici, jamais l'écrire dans son texte.
   */
  params: FiscalParams;
} {
  const [scenario, definir] = useQueryStates(PARSEURS, { urlKeys: CLES_URL });

  const plan = useMemo(() => buildCreditPlan(versEntreeMoteur(scenario), PARAMS_2026), [scenario]);

  return { scenario, definir, plan, params: PARAMS_2026 };
}
