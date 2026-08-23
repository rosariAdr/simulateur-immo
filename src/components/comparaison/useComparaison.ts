"use client";

import { parseAsFloat, parseAsInteger, useQueryStates } from "nuqs";
import { useMemo } from "react";
import { comparerDetention } from "@/core/compare/detention";
import type { ComparaisonDetention } from "@/core/compare/types";
import { buildCreditPlan, type CreditPlan } from "@/core/credit/plan";
import { PARAMS_2026 } from "@/core/fiscal/params";
import {
  CLES_URL,
  DEFAUTS,
  versEntreeCredit,
  versEntreeDetention,
  type Comparaison,
} from "@/lib/comparaison";

/**
 * LE SCÉNARIO DE COMPARAISON ET SON CALCUL
 *
 * Les parseurs `nuqs` vivent ici, sous `"use client"`, et non dans
 * `src/lib/comparaison.ts` : c'est la seule différence de forme avec le module
 * crédit, et elle est délibérée. Déclarés au premier niveau d'un module de
 * `src/lib/`, ils rendent ce module inutilisable depuis un composant serveur —
 * la dette que porte `src/lib/scenario.ts`. En les gardant du côté client, la
 * page serveur de `/comparaison` peut lire `DEFAUTS` sans rien entraîner.
 *
 * Le calcul est synchrone et enchaîne deux moteurs : `buildCreditPlan` produit
 * l'échéancier, `comparerDetention` le **lit** sans jamais le recalculer. Sur
 * trente ans — 360 mois — l'ensemble coûte moins d'une milliseconde, ce qui
 * autorise l'absence de bouton « calculer ».
 *
 * `useMemo` n'est pas là pour la vitesse mais pour la stabilité de la référence :
 * sans lui, chaque rendu produirait un nouvel objet et relancerait tout ce qui
 * en dépend.
 */

/** Montants en euros entiers, taux et indexations en pourcentages décimaux. */
const PARSEURS = {
  prix: parseAsInteger.withDefault(DEFAUTS.prix),
  apport: parseAsInteger.withDefault(DEFAUTS.apport),
  taux: parseAsFloat.withDefault(DEFAUTS.taux),
  dureeMois: parseAsInteger.withDefault(DEFAUTS.dureeMois),
  assuranceTaux: parseAsFloat.withDefault(DEFAUTS.assuranceTaux),
  horizonAnnees: parseAsInteger.withDefault(DEFAUTS.horizonAnnees),
  taxeFonciere: parseAsInteger.withDefault(DEFAUTS.taxeFonciere),
  chargesCopropriete: parseAsInteger.withDefault(DEFAUTS.chargesCopropriete),
  assuranceHabitation: parseAsInteger.withDefault(DEFAUTS.assuranceHabitation),
  provisionTravauxPct: parseAsFloat.withDefault(DEFAUTS.provisionTravauxPct),
  fraisEntree: parseAsInteger.withDefault(DEFAUTS.fraisEntree),
  loyer: parseAsInteger.withDefault(DEFAUTS.loyer),
  chargesLocatives: parseAsInteger.withDefault(DEFAUTS.chargesLocatives),
  assuranceLocataire: parseAsInteger.withDefault(DEFAUTS.assuranceLocataire),
  indexationLoyer: parseAsFloat.withDefault(DEFAUTS.indexationLoyer),
  indexationTaxeFonciere: parseAsFloat.withDefault(DEFAUTS.indexationTaxeFonciere),
  indexationCharges: parseAsFloat.withDefault(DEFAUTS.indexationCharges),
} satisfies Record<keyof Comparaison, unknown>;

export type Definir = ReturnType<typeof useQueryStates<typeof PARSEURS>>[1];

export function useComparaison(): {
  scenario: Comparaison;
  definir: Definir;
  plan: CreditPlan;
  comparaison: ComparaisonDetention;
} {
  const [scenario, definir] = useQueryStates(PARSEURS, { urlKeys: CLES_URL });

  const plan = useMemo(() => {
    // Le millésime fiscal est celui du moteur crédit ; ce module n'en consomme
    // aucune valeur pour lui-même, il ne fait que traverser l'échéancier.
    return buildCreditPlan(versEntreeCredit(scenario), PARAMS_2026);
  }, [scenario]);

  const comparaison = useMemo(
    () => comparerDetention(versEntreeDetention(scenario, plan)),
    [scenario, plan],
  );

  return { scenario, definir, plan, comparaison };
}
