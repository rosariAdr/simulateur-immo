import type { Metadata } from "next";
import { Suspense } from "react";
import { ModulePatrimoine } from "@/components/patrimoine/ModulePatrimoine";
import { DEFAUTS } from "@/lib/comparaison";
import { TROIS_SORTIES } from "@/lib/patrimoine";

const CHIFFREES = TROIS_SORTIES.filter((s) => s.modelisee).length;

export const metadata: Metadata = {
  title: "Acheter ou louer — les deux patrimoines à l'horizon",
  description:
    "Compare ce que possède un propriétaire qui revend son bien et ce que vaut le portefeuille " +
    `d'un locataire qui aurait placé le même effort d'épargne, sur ${DEFAUTS.horizonAnnees} ans. ` +
    `${CHIFFREES === 3 ? "Les trois sorties prévues sont chiffrées — vendre, louer en longue durée, louer en courte durée" : `${CHIFFREES} des trois sorties prévues ${CHIFFREES > 1 ? "sont chiffrées" : "est chiffrée"}`}. ` +
    "Le résultat dépend d'hypothèses de marché affichées avec leur intervalle et " +
    "leur fiabilité. Gratuit, sans compte, sans collecte de données.",
};

/**
 * MODULE « ACHETER OU LOUER », NIVEAU APPROFONDI — `/comparaison/patrimoine`
 *
 * Route imbriquée, et non route de premier niveau : c'est le **second niveau du
 * même module**, celui que `docs/03-spec-domaine.md` §2 décrit sous « niveau
 * approfondi ». L'adresse le dit, et le lien entre les deux écrans conserve
 * l'intégralité du scénario — les dix-sept clés du niveau simple sont les mêmes
 * de part et d'autre.
 *
 * Composant serveur, prérendu statiquement, comme `/comparaison`. `Suspense` est
 * requis : le module lit l'état d'URL, ce qui suspend le rendu côté serveur.
 * Sans lui, la page entière retomberait en rendu dynamique et perdrait le
 * prérendu voulu par `docs/02-architecture.md` §8.
 *
 * `DEFAUTS` et `TROIS_SORTIES` sont lus ici, dans un composant SERVEUR : c'est
 * la raison d'être de la séparation décrite en tête de `src/lib/comparaison.ts`
 * et reprise par `src/lib/patrimoine.ts` — aucun parseur `nuqs` au premier
 * niveau de ces deux modules, donc rien n'empêche la page de s'en servir.
 *
 * Le décompte des sorties chiffrées se **déduit** de `TROIS_SORTIES` jusque dans
 * la description de la page. C'est la leçon d'`UI-014` : une phrase écrite à la
 * main sur un état qui vit ailleurs devient fausse sans qu'aucun test la voie.
 */
export default function PagePatrimoine() {
  return (
    <Suspense fallback={<div className="min-h-full bg-papier" />}>
      <ModulePatrimoine />
    </Suspense>
  );
}
