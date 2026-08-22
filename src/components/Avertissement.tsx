import Link from "next/link";

/**
 * AVERTISSEMENT PERMANENT — `LEG-002`
 *
 * Le brief est explicite : « visible, pas relégué en pied de page ». Le bandeau
 * est donc en tête de document, avant le contenu, sur toutes les pages.
 *
 * IL NE SE FERME PAS. Un avertissement qu'on peut faire disparaître d'un clic
 * cesse d'être un avertissement au deuxième chargement de page — et c'est
 * précisément l'utilisateur qui revient souvent qui prend l'habitude de croire
 * les chiffres.
 *
 * Deux énoncés, et pas un de plus. Le premier tient à la nature du produit et ne
 * bougera jamais. Le second tient à son état d'avancement et disparaîtra quand
 * `FIS-002` sera résolu — il est isolé pour que sa suppression soit un geste
 * évident. Le reste va dans `/avertissement`.
 */
export function Avertissement() {
  return (
    <aside
      data-avertissement
      aria-label="Avertissement sur la portée de cet outil"
      className="border-b border-filet bg-panneau px-6 py-2 lg:px-8"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-accent pl-3">
        <p className="text-[12px] leading-[1.5] text-encre">
          Cet outil calcule des scénarios. Il ne constitue{" "}
          <strong className="font-semibold">
            ni un conseil en investissement, ni un conseil fiscal, ni une offre de crédit
          </strong>{" "}
          : les résultats dépendent entièrement des hypothèses que vous saisissez.
        </p>
        <p data-construction className="text-[12px] leading-[1.5] text-encre-secondaire">
          Simulateur en construction — plusieurs valeurs réglementaires n&apos;ont pas encore été
          vérifiées à leur source officielle.
        </p>
        <Link
          href="/avertissement"
          className="text-[12px] text-accent underline underline-offset-2
                     hover:text-accent-survol focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Ce que cet outil n&apos;est pas
        </Link>
      </div>
    </aside>
  );
}
