import Link from "next/link";
import { CONTACT } from "@/content/legal";

/**
 * PIED DE PAGE
 *
 * Il n'est pas l'endroit où l'on relègue l'avertissement — celui-ci est en tête,
 * voir `LEG-002`. Il est l'endroit où l'on trouve les textes qu'on va chercher
 * délibérément : mentions légales, confidentialité, conditions.
 *
 * La distinction tient à qui cherche quoi. L'avertissement doit atteindre celui
 * qui ne le cherche pas ; les mentions légales doivent être trouvables par celui
 * qui les cherche. Ce ne sont pas les mêmes emplacements.
 */
const LIENS = [
  { href: "/", libelle: "Accueil" },
  // Le glossaire n'est pas un texte légal, mais il relève de la même logique :
  // c'est une page qu'on va chercher, quand une infobulle n'a pas suffi ou
  // qu'on ne sait plus où le terme était posé. Voir `CNT-001`.
  { href: "/glossaire", libelle: "Glossaire" },
  { href: "/avertissement", libelle: "Portée de l'outil" },
  { href: "/mentions-legales", libelle: "Mentions légales" },
  { href: "/confidentialite", libelle: "Confidentialité" },
  { href: "/conditions", libelle: "Conditions d'utilisation" },
] as const;

export function PiedDePage() {
  return (
    <footer
      data-pied
      className="mt-auto border-t border-filet bg-panneau px-6 py-4 text-[12px] lg:px-8"
    >
      <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2">
        {LIENS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-encre-secondaire underline underline-offset-2 hover:text-encre
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-accent"
          >
            {l.libelle}
          </Link>
        ))}
        <a
          href={`mailto:${CONTACT}`}
          className="text-encre-secondaire underline underline-offset-2 hover:text-encre
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-accent"
        >
          Signaler une erreur
        </a>
      </nav>
      <p className="mt-2.5 text-[11px] text-encre-secondaire">
        Gratuit, sans compte, sans collecte de données. Code source public.
      </p>
    </footer>
  );
}
