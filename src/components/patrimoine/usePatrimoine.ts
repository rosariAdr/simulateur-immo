"use client";

import { parseAsFloat, parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { ComparaisonDetention } from "@/core/compare/types";
import type { CreditPlan } from "@/core/credit/plan";
import type { Comparaison } from "@/lib/comparaison";
import {
  CLES_SORTIE,
  DEFAUTS_SORTIE,
  MODES,
  REGIMES,
  analyserPatrimoine,
  type AnalysePatrimoine,
  type Sortie,
} from "@/lib/patrimoine";
import { useComparaison, type Definir } from "@/components/comparaison/useComparaison";

/**
 * LE SCÉNARIO PATRIMONIAL ET SON CALCUL — `UI-007`
 *
 * ═══ DEUX JEUX DE CLÉS, UNE SEULE ADRESSE ═══
 *
 * Le niveau approfondi ne redéfinit aucun des dix-sept paramètres du niveau
 * simple : il les **reprend**, en réutilisant `useComparaison` tel quel. Un
 * second `useQueryStates` porte les sept clés de la sortie. `nuqs` compose les
 * deux dans la même adresse, chacun ne touchant qu'aux siennes.
 *
 * La conséquence est celle qu'on voulait : **le lien se transporte d'un niveau
 * à l'autre sans rien perdre.** `?px=250000&ly=900` ouvre le même ménage des
 * deux côtés, et le lien du niveau simple vers celui-ci ne fait qu'ajouter des
 * clés.
 *
 * ═══ CE QUI N'ENTRE PAS DANS L'URL ═══
 *
 * L'année lue sous les courbes reste un état de composant, comme au niveau
 * simple et pour la même raison — ADR-005, elle change un cadrage et non un
 * chiffre. Les deux hypothèses de marché, elles, **entrent** : elles changent
 * tous les chiffres de l'écran, et un lien partagé qui ne les porterait pas
 * rendrait d'autres nombres que ceux qu'on croyait envoyer.
 *
 * ═══ LE COÛT DU CALCUL ═══
 *
 * Six balayages de l'horizon — la vente au point retenu et à ses deux bornes,
 * le portefeuille au point retenu et à ses deux bornes —, soit une centaine
 * d'appels au moteur sur trente ans. Mesuré sous la milliseconde, ce qui
 * autorise l'absence de bouton « calculer », comme sur les deux autres écrans.
 * `useMemo` sert ici la stabilité de la référence autant que la vitesse.
 */

const PARSEURS_SORTIE = {
  appreciation: parseAsFloat.withDefault(DEFAUTS_SORTIE.appreciation),
  rendement: parseAsFloat.withDefault(DEFAUTS_SORTIE.rendement),
  commissionAgence: parseAsFloat.withDefault(DEFAUTS_SORTIE.commissionAgence),
  regime: parseAsStringLiteral(REGIMES).withDefault(DEFAUTS_SORTIE.regime),
  modeFrais: parseAsStringLiteral(MODES).withDefault(DEFAUTS_SORTIE.modeFrais),
  fraisAcquisitionReels: parseAsInteger.withDefault(DEFAUTS_SORTIE.fraisAcquisitionReels),
  modeTravaux: parseAsStringLiteral(MODES).withDefault(DEFAUTS_SORTIE.modeTravaux),
  travauxReels: parseAsInteger.withDefault(DEFAUTS_SORTIE.travauxReels),
} satisfies Record<keyof Sortie, unknown>;

export type DefinirSortie = ReturnType<typeof useQueryStates<typeof PARSEURS_SORTIE>>[1];

export function usePatrimoine(): {
  scenario: Comparaison;
  definir: Definir;
  sortie: Sortie;
  definirSortie: DefinirSortie;
  plan: CreditPlan;
  comparaison: ComparaisonDetention;
  analyse: AnalysePatrimoine;
} {
  const { scenario, definir, plan, comparaison } = useComparaison();
  const [sortie, definirSortie] = useQueryStates(PARSEURS_SORTIE, { urlKeys: CLES_SORTIE });

  const analyse = useMemo(
    () => analyserPatrimoine(scenario, sortie, plan, comparaison),
    [scenario, sortie, plan, comparaison],
  );

  return { scenario, definir, sortie, definirSortie, plan, comparaison, analyse };
}
