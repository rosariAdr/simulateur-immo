import type { Metadata } from "next";
import { Galerie } from "@/components/Galerie";

/**
 * GALERIE DES PRIMITIVES — `/composants`
 *
 * Documentation vivante de la charte et banc d'essai des tests de bout en bout.
 * Elle n'est pas destinée aux visiteurs : `robots` la retire de l'indexation.
 * Elle reste publiquement atteignable, ce qui est voulu — un lien suffit à la
 * montrer à quelqu'un, sans mécanisme d'accès à maintenir.
 */
export const metadata: Metadata = {
  title: "Primitives de saisie",
  description:
    "Le vocabulaire de composants du simulateur, chacun dans ses cinq états. Page technique.",
  robots: { index: false, follow: false },
};

export default function PageComposants() {
  return <Galerie />;
}
