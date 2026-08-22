import Link from "next/link";
import { MAJ_LEGALE } from "@/content/legal";

/**
 * GABARIT DES PAGES LÉGALES
 *
 * Trois pages qui partagent leur ossature. Les mutualiser n'est pas une économie
 * de lignes : c'est ce qui garantit qu'elles portent toutes la même date de mise
 * à jour et le même chemin de retour. Une page légale isolée est une page légale
 * qu'on oublie de dater.
 */
export function PageLegale({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <main className="min-h-full bg-papier px-6 py-8 text-encre lg:px-8">
      <article className="max-w-[76ch]">
        <h1 className="mb-1 font-titre text-[23px] font-bold tracking-[-0.022em]">{titre}</h1>
        <p className="mb-8 text-[11px] text-encre-secondaire">
          Dernière mise à jour : {MAJ_LEGALE}
        </p>

        <div className="legal">{children}</div>

        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-filet pt-4 text-[12px]">
          <LienLegal href="/">Accueil</LienLegal>
          <LienLegal href="/credit">Simulateur de crédit</LienLegal>
          <LienLegal href="/avertissement">Portée de l&apos;outil</LienLegal>
          <LienLegal href="/mentions-legales">Mentions légales</LienLegal>
          <LienLegal href="/confidentialite">Confidentialité</LienLegal>
          <LienLegal href="/conditions">Conditions d&apos;utilisation</LienLegal>
        </nav>
      </article>
    </main>
  );
}

function LienLegal({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-accent underline underline-offset-2 hover:text-accent-survol
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                 focus-visible:outline-accent"
    >
      {children}
    </Link>
  );
}

/** Titre de section. */
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-8 font-titre text-[15px] font-semibold first:mt-0">{children}</h2>;
}

/** Paragraphe courant. */
export function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[13px] leading-[1.65]">{children}</p>;
}

/** Liste de faits — coordonnées, durées, destinataires. */
export function Faits({ items }: { items: readonly (readonly [string, React.ReactNode])[] }) {
  return (
    <dl className="mb-4 border-l-2 border-filet pl-3.5">
      {items.map(([cle, valeur]) => (
        <div key={cle} className="mb-1.5 flex flex-wrap gap-x-2 text-[13px] leading-[1.6] last:mb-0">
          <dt className="text-encre-secondaire">{cle} :</dt>
          <dd>{valeur}</dd>
        </div>
      ))}
    </dl>
  );
}
