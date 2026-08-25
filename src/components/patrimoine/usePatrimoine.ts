"use client";

import { parseAsFloat, parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { ComparaisonDetention } from "@/core/compare/types";
import type { CreditPlan } from "@/core/credit/plan";
import type { LocationCourteDuree } from "@/core/compare/location-courte-duree";
import type { LocationLongueDuree } from "@/core/compare/location-longue-duree";
import type { Comparaison } from "@/lib/comparaison";
import {
  CLES_LOCATION,
  CLES_SORTIE,
  DEFAUTS_LOCATION,
  DEFAUTS_SORTIE,
  MODES,
  REGIMES,
  REGIMES_COURTE_DUREE,
  REGIMES_LONGUE_DUREE,
  SORTIES_REGARDEES,
  analyserCourteDuree,
  analyserLongueDuree,
  analyserPatrimoine,
  type AnalysePatrimoine,
  type Location,
  type Sortie,
  type SortieLocativeAnalysee,
} from "@/lib/patrimoine";
import { useComparaison, type Definir } from "@/components/comparaison/useComparaison";

/**
 * LE SCÉNARIO PATRIMONIAL ET SON CALCUL — `UI-007`, étendu par `UI-025`
 *
 * ═══ TROIS JEUX DE CLÉS, UNE SEULE ADRESSE ═══
 *
 * Le niveau approfondi ne redéfinit aucun des dix-sept paramètres du niveau
 * simple : il les **reprend**, en réutilisant `useComparaison` tel quel. Un
 * deuxième `useQueryStates` porte les huit clés de la sortie de vente, un
 * troisième les dix clés des sorties locatives (`UI-025`, ADR-022). `nuqs`
 * compose les trois dans la même adresse, chacun ne touchant qu'aux siennes.
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
 * tous les chiffres de l'écran. La sortie regardée entre aussi — elle ne change
 * aucun chiffre du moteur, mais elle change ceux que l'écran montre, et un lien
 * partagé doit ouvrir sur ce que l'expéditeur regardait (ADR-022).
 *
 * ═══ LE COÛT DU CALCUL ═══
 *
 * Six balayages de l'horizon pour l'analyse principale, plus deux projections
 * locatives — quelques dizaines d'années chacune, une cession par projection.
 * Mesuré sous la milliseconde ; les deux projections sont calculées même quand
 * l'onglet vente est affiché, ce qui garde les `useMemo` inconditionnels et le
 * changement d'onglet instantané.
 *
 * Le taux marginal d'imposition passe par `parseAsInteger` et non par un
 * littéral numérique : `assainirLocation` ramène toute valeur hors barème au
 * défaut, et la liste de l'écran n'offre que les cinq taux — la clé d'URL reste
 * du texte que n'importe qui peut écrire.
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

const PARSEURS_LOCATION = {
  sortieRegardee: parseAsStringLiteral(SORTIES_REGARDEES).withDefault(
    DEFAUTS_LOCATION.sortieRegardee,
  ),
  dureeLocationAnnees: parseAsInteger.withDefault(DEFAUTS_LOCATION.dureeLocationAnnees),
  tmi: parseAsInteger.withDefault(DEFAUTS_LOCATION.tmi),
  loyerMarche: parseAsInteger.withDefault(DEFAUTS_LOCATION.loyerMarche),
  regimeLongueDuree: parseAsStringLiteral(REGIMES_LONGUE_DUREE).withDefault(
    DEFAUTS_LOCATION.regimeLongueDuree,
  ),
  regimeCourteDuree: parseAsStringLiteral(REGIMES_COURTE_DUREE).withDefault(
    DEFAUTS_LOCATION.regimeCourteDuree,
  ),
  tarifNuitee: parseAsInteger.withDefault(DEFAUTS_LOCATION.tarifNuitee),
  tauxOccupation: parseAsFloat.withDefault(DEFAUTS_LOCATION.tauxOccupation),
  ameublement: parseAsInteger.withDefault(DEFAUTS_LOCATION.ameublement),
  chargesExploitation: parseAsInteger.withDefault(DEFAUTS_LOCATION.chargesExploitation),
} satisfies Record<keyof Location, unknown>;

export type DefinirSortie = ReturnType<typeof useQueryStates<typeof PARSEURS_SORTIE>>[1];
export type DefinirLocation = ReturnType<typeof useQueryStates<typeof PARSEURS_LOCATION>>[1];

export function usePatrimoine(): {
  scenario: Comparaison;
  definir: Definir;
  sortie: Sortie;
  definirSortie: DefinirSortie;
  location: Location;
  definirLocation: DefinirLocation;
  plan: CreditPlan;
  comparaison: ComparaisonDetention;
  analyse: AnalysePatrimoine;
  longueDuree: SortieLocativeAnalysee<LocationLongueDuree>;
  courteDuree: SortieLocativeAnalysee<LocationCourteDuree>;
} {
  const { scenario, definir, plan, comparaison } = useComparaison();
  const [sortie, definirSortie] = useQueryStates(PARSEURS_SORTIE, { urlKeys: CLES_SORTIE });
  const [location, definirLocation] = useQueryStates(PARSEURS_LOCATION, {
    urlKeys: CLES_LOCATION,
  });

  const analyse = useMemo(
    () => analyserPatrimoine(scenario, sortie, plan, comparaison),
    [scenario, sortie, plan, comparaison],
  );

  const longueDuree = useMemo(
    () => analyserLongueDuree(scenario, sortie, location, plan),
    [scenario, sortie, location, plan],
  );

  const courteDuree = useMemo(
    () => analyserCourteDuree(scenario, sortie, location, plan),
    [scenario, sortie, location, plan],
  );

  return {
    scenario,
    definir,
    sortie,
    definirSortie,
    location,
    definirLocation,
    plan,
    comparaison,
    analyse,
    longueDuree,
    courteDuree,
  };
}
