import Link from "next/link";
import { DEVELOPPEMENTS, rendre, THEMES, type Theme } from "@/content/developpements";
import { ancre, CLES_GLOSSAIRE, type CleGlossaire } from "@/content/glossaire";
import { ENTREES, VALEURS } from "@/content/valeurs";
import { FAMILLES } from "@/components/ui/taxonomie";

/**
 * LA PAGE DU GLOSSAIRE — `CNT-001`
 *
 * Composant serveur, sans état ni interactivité : la page est entièrement
 * prérendue, et son contenu vient de `src/content/`. Aucun texte n'est écrit
 * ici, aucun chiffre non plus — les valeurs réglementaires sont substituées
 * depuis `src/content/valeurs.ts`, qui les tient de `src/core/fiscal/`.
 *
 * ── DEUX ORDRES, ET C'EST VOULU ──────────────────────────────────────────
 *
 * L'index en tête est alphabétique : il sert à RETROUVER un terme dont on
 * connaît déjà le nom, ce qui est le cas de quelqu'un qui vient de son banquier
 * avec un mot noté sur un coin de table.
 *
 * Le corps est groupé par thème : il sert à DÉCOUVRIR. « Caution »,
 * « hypothèque », « mainlevée » et « fonds mutuel de garantie » ne s'éclairent
 * que lus à la suite ; l'ordre alphabétique les disperse sur toute la page.
 * Ranger le glossaire par ordre alphabétique aurait reproduit à l'intérieur du
 * produit la dispersion qu'il reproche aux simulateurs existants.
 *
 * ── LES ANCRES ───────────────────────────────────────────────────────────
 *
 * Chaque entrée porte `id={ancre(terme)}`, et c'est cette même fonction qui
 * fabrique le lien posé au bas de chaque infobulle. Une ancre écrite deux fois
 * finirait par diverger de son titre, et le lien tomberait dans le vide sans
 * que rien ne le signale.
 */

/** Les clés d'un thème, rangées par ordre alphabétique de leur terme. */
function clesDu(theme: Theme): readonly CleGlossaire[] {
  return CLES_GLOSSAIRE.filter((c) => DEVELOPPEMENTS[c].theme === theme).sort((a, b) =>
    ENTREES[a].terme.localeCompare(ENTREES[b].terme, "fr"),
  );
}

/** Toutes les clés, par ordre alphabétique de leur terme. Sert à l'index. */
const ALPHABETIQUE: readonly CleGlossaire[] = [...CLES_GLOSSAIRE].sort((a, b) =>
  ENTREES[a].terme.localeCompare(ENTREES[b].terme, "fr"),
);

export function Glossaire() {
  return (
    <main className="min-h-full bg-papier px-6 py-8 text-encre lg:px-8">
      <article className="max-w-[76ch]">
        <h1 className="mb-2 font-titre text-[23px] font-bold tracking-[-0.022em]">Glossaire</h1>
        <p className="mb-3 max-w-[68ch] text-[13px] leading-[1.65]">
          Le vocabulaire qu&apos;un banquier, un notaire ou un courtier emploie sans le traduire.
          Chaque terme est défini en deux phrases — celles que l&apos;infobulle affiche dans le
          simulateur — puis développé : d&apos;où vient la règle, ce qu&apos;elle implique, et ce
          qu&apos;elle ne dit pas.
        </p>
        <p className="mb-8 text-[11px] leading-[1.5] text-encre-secondaire">
          {ALPHABETIQUE.length} termes · barèmes du millésime {VALEURS.millesime}, taux d&apos;usure
          du trimestre {VALEURS.trimestreUsure}. Ces définitions décrivent des mécaniques ; elles ne
          recommandent rien.
        </p>

        <nav
          data-index-glossaire
          aria-label="Index alphabétique des termes"
          className="mb-10 border-y border-filet py-4"
        >
          <p className="mb-2.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
            Tous les termes, de A à Z
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
            {ALPHABETIQUE.map((cle) => (
              <li key={cle}>
                <a
                  href={`#${ancre(ENTREES[cle].terme)}`}
                  className="text-[12px] text-accent underline underline-offset-2
                             hover:text-accent-survol focus-visible:outline focus-visible:outline-2
                             focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {ENTREES[cle].terme}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {THEMES.map((theme) => (
          <section key={theme.cle} data-theme={theme.cle} className="mb-10 last:mb-0">
            <h2 className="font-titre text-[17px] font-semibold tracking-[-0.012em]">
              {theme.titre}
            </h2>
            <p className="mb-5 mt-1 text-[12px] leading-[1.55] text-encre-secondaire">
              {theme.chapeau}
            </p>
            {clesDu(theme.cle).map((cle) => (
              <EntreeGlossaire key={cle} cle={cle} />
            ))}
          </section>
        ))}

        <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-filet pt-4 text-[12px]">
          <Lien href="/">Accueil</Lien>
          <Lien href="/credit">Simulateur de crédit</Lien>
          <Lien href="/avertissement">Portée de l&apos;outil</Lien>
        </nav>
      </article>
    </main>
  );
}

function EntreeGlossaire({ cle }: { cle: CleGlossaire }) {
  const entree = ENTREES[cle];
  const developpement = DEVELOPPEMENTS[cle];
  const famille = developpement.famille;

  return (
    <article
      // L'ancre du lien posé dans les infobulles. `scroll-mt` évite que le titre
      // se colle au bord haut de la fenêtre après un saut.
      id={ancre(entree.terme)}
      data-terme
      className="mb-7 scroll-mt-6 border-l-2 border-filet pl-4 last:mb-0"
    >
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-titre text-[14px] font-semibold">{entree.terme}</h3>
        {famille && (
          // L'appartenance n'est jamais portée par la seule couleur : le trait
          // de la bordure et le mot en toutes lettres la disent aussi.
          <span
            data-famille={famille}
            className={`shrink-0 border px-1.5 py-px text-[9px] uppercase tracking-[0.05em] ${FAMILLES[famille].etiquette}`}
          >
            {FAMILLES[famille].libelle}
          </span>
        )}
      </div>

      <p data-definition className="mb-2.5 text-[13px] leading-[1.65]">
        <strong className="font-semibold">{entree.accroche}</strong> {entree.suite}
      </p>

      {rendre(developpement).map((paragraphe, i) => (
        <p key={i} className="mb-2 text-[13px] leading-[1.7] text-encre-secondaire last:mb-0">
          {paragraphe}
        </p>
      ))}

      {developpement.voirAussi.length > 0 && (
        <p className="mt-2.5 text-[11px] leading-[1.6] text-encre-secondaire">
          Voir aussi{" "}
          {developpement.voirAussi.map((autre, i) => (
            <span key={autre}>
              {i > 0 && ", "}
              <a
                href={`#${ancre(ENTREES[autre].terme)}`}
                className="text-accent underline underline-offset-2 hover:text-accent-survol
                           focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {ENTREES[autre].terme}
              </a>
            </span>
          ))}
          .
        </p>
      )}
    </article>
  );
}

function Lien({ href, children }: { href: string; children: React.ReactNode }) {
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
