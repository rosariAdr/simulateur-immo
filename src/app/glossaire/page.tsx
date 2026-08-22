import type { Metadata } from "next";
import { Glossaire } from "@/components/Glossaire";
import { CLES_GLOSSAIRE } from "@/content/glossaire";

export const metadata: Metadata = {
  title: "Glossaire du crédit et de l'acquisition — simulateur d'acquisition",
  description:
    `Les ${CLES_GLOSSAIRE.length} termes qu'un primo-accédant rencontre sans les connaître : ` +
    "TAEG, taux d'usure, droits de mutation, mainlevée, prêt à taux zéro, plus-value. " +
    "Deux phrases pour comprendre, un développement pour vérifier.",
};

/**
 * GLOSSAIRE — `/glossaire`
 *
 * Composant serveur pur, sans état d'URL ni `Suspense` : la page est prérendue
 * statiquement à la compilation, ce que `docs/02-architecture.md` §8 demande à
 * toute page qui ne dépend pas d'un scénario.
 *
 * Elle est la destination du lien posé au bas de chaque infobulle. Le chemin
 * est donc à sens unique et sans état : une bulle renvoie vers une ancre, et
 * rien de ce qui est saisi dans le simulateur ne transite par ici.
 */
export default function PageGlossaire() {
  return <Glossaire />;
}
