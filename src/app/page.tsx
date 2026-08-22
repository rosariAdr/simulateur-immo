import type { Metadata } from "next";
import Link from "next/link";
import { FAMILLES, type Famille } from "@/components/ui/taxonomie";

export const metadata: Metadata = {
  title: "Simulateur d'acquisition immobilière — calculer et comprendre",
  description:
    "Calcule une acquisition immobilière et explique chaque paramètre : ce qui se négocie, " +
    "ce qui dépend de votre projet, ce que la réglementation impose. Le module crédit est en ligne. " +
    "Gratuit, sans compte, sans collecte de données.",
};

/**
 * PAGE D'ACCUEIL — `/`
 *
 * Elle a un seul travail : qu'un inconnu comprenne en trois phrases ce que fait
 * le site, voie la taxonomie des paramètres — l'apport pédagogique central,
 * docs/CONTEXT.md §3 — et arrive sur `/credit`. Critère de sortie de la v0.1,
 * voir docs/RELEASES.md §1.
 *
 * Composant serveur, prérendu statique : elle ne lit ni l'URL ni le navigateur,
 * et n'a donc aucune raison de retomber en rendu dynamique.
 *
 * Elle dit aussi ce qui n'existe pas. Quatre des six modules sont annoncés et
 * non livrés ; les présenter comme cliquables serait la première promesse tenue
 * de travers d'un produit dont l'argument est l'honnêteté du calcul.
 */
export default function PageAccueil() {
  return (
    <main className="min-h-full bg-papier text-encre">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        <These />
        <Taxonomie />
        <Modules />
        <SansCompte />
        <Avertissement />
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

/** L'annonce. Trois phrases, pas quatre, et un lien qui mène au calcul. */
function These() {
  return (
    <header className="border-b border-filet py-12 lg:py-14">
      <h1 className="max-w-[22ch] font-titre text-[34px] font-bold leading-[1.12] tracking-[-0.028em] lg:text-[46px]">
        Un simulateur qui explique d&apos;où viennent ses chiffres.
      </h1>

      <p className="mt-5 max-w-[62ch] text-[16px] leading-[1.6] lg:text-[17px]">
        Ce site calcule une acquisition immobilière — crédit, frais, aides, comparaison avec la
        location, remboursements anticipés — et explique chaque paramètre à l&apos;endroit où il
        apparaît.
      </p>
      <p className="mt-3 max-w-[62ch] text-[16px] leading-[1.6] lg:text-[17px]">
        Il distingue partout ce qui se négocie, ce qui dépend de votre projet, et ce que la
        réglementation impose.
      </p>
      <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.6] text-encre-secondaire">
        Il ne recommande rien : il calcule des scénarios à partir des hypothèses que vous posez, et
        vous décidez.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href="/credit"
          data-vers-credit
          className="inline-flex items-center gap-2 border border-accent px-5 py-2.5 text-[14px]
                     text-accent transition-colors hover:bg-survol-fond hover:text-accent-survol
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-accent"
        >
          Calculer un crédit
          <span aria-hidden="true">→</span>
        </Link>
        <p className="text-[13px] text-encre-secondaire">Deux minutes, six paramètres.</p>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * LA TAXONOMIE
 *
 * Les libellés, les messages et les traits de bordure viennent de
 * `src/components/ui/taxonomie.ts` — la même source que les champs de saisie.
 * Une famille renommée ici et là-bas ne peut pas diverger.
 *
 * Le trait de bordure ne suffit pas et n'est pas censé suffire : chaque carte
 * nomme sa famille en toutes lettres. Voir docs/06-design-system.md §6.
 */
const EXEMPLES: Readonly<Record<Famille, string>> = {
  negociable: "Taux nominal, assurance emprunteur, frais de dossier, choix de la garantie, indemnités de remboursement anticipé.",
  contraint: "Apport, durée, revenus, prix du bien, composition du foyer, zone géographique, ancien ou neuf.",
  reglementaire: "Taux d'usure, plafond d'endettement, droits de mutation, quotités du prêt à taux zéro, abattements de plus-value.",
};

const ORDRE: readonly Famille[] = ["negociable", "contraint", "reglementaire"];

function Taxonomie() {
  return (
    <section className="border-b border-filet py-10 lg:py-12">
      <h2 className="text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
        Les trois familles de paramètres
      </h2>
      <p className="mt-3 max-w-[80ch] text-[14px] leading-[1.6]">
        Tout paramètre d&apos;une opération immobilière appartient à l&apos;une de ces trois
        familles. Dans chaque module, un champ porte la sienne en toutes lettres. Savoir laquelle
        est la différence entre subir un chiffre et pouvoir en discuter.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ORDRE.map((famille) => {
          const style = FAMILLES[famille];
          return (
            <li
              key={famille}
              data-famille={famille}
              className={`${style.bordure} bg-panneau px-4 py-4`}
            >
              <h3 className="font-titre text-[17px] font-semibold capitalize">{style.libelle}</h3>
              <p className="mt-2 text-[13px] leading-[1.6]">{style.message}</p>
              <p className="mt-3 text-[12px] leading-[1.55] text-encre-secondaire">
                {EXEMPLES[famille]}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 max-w-[80ch] text-[12px] leading-[1.55] text-encre-secondaire">
        L&apos;appartenance se lit au trait de la bordure — plein laiton, plein gris, tireté — et à
        l&apos;étiquette en toutes lettres. Jamais à la couleur seule.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * CE QUI EXISTE, ET CE QUI N'EXISTE PAS ENCORE
 *
 * Un module à venir n'est ni un lien, ni un bouton, ni quoi que ce soit qui
 * réponde au clic ou au clavier : c'est une ligne de liste qui porte la mention
 * « à venir » en toutes lettres. Le test `tests/e2e/accueil.spec.ts` échoue si
 * l'un d'eux redevient cliquable.
 */
interface Module {
  readonly cle: string;
  readonly nom: string;
  readonly resume: string;
  readonly lien: string | null;
}

const MODULES: readonly Module[] = [
  {
    cle: "credit",
    nom: "Crédit",
    resume:
      "Mensualité, coût total, TAEG, tableau d'amortissement, et le contrôle des deux plafonds qu'une banque ne peut pas franchir.",
    lien: "/credit",
  },
  {
    cle: "comparaison",
    nom: "Acheter ou louer",
    resume:
      "Comparaison des coûts, puis l'année à partir de laquelle revendre cesse d'être perdant.",
    lien: null,
  },
  {
    cle: "anticipes",
    nom: "Remboursements anticipés",
    resume:
      "La fenêtre pendant laquelle un versement rapporte encore, et ce que les indemnités lui reprennent.",
    lien: null,
  },
  {
    cle: "marches",
    nom: "Pierre ou marchés",
    resume:
      "Immobilier avec levier contre portefeuille financier, à effort d'épargne identique.",
    lien: null,
  },
  {
    cle: "aides",
    nom: "Les aides",
    resume:
      "Droits de mutation, prêt à taux zéro, prêt d'accession sociale, aides locales et leurs barèmes.",
    lien: null,
  },
];

function Modules() {
  const enLigne = MODULES.filter((m) => m.lien !== null).length;

  return (
    <section className="border-b border-filet py-10 lg:py-12">
      <h2 className="text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
        Ce qui est en ligne, et ce qui ne l&apos;est pas
      </h2>
      <p className="mt-3 max-w-[80ch] text-[14px] leading-[1.6]">
        {enLigne === 1 ? "Un seul module est en ligne" : `${enLigne} modules sont en ligne`} : le
        crédit. Les quatre autres sont écrits dans le plan et n&apos;existent pas encore. Ils sont
        listés ici pour dire où va le produit, pas pour laisser croire qu&apos;ils répondraient.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODULES.map((module) =>
          module.lien !== null ? (
            <li key={module.cle} data-module={module.cle} data-etat="en-ligne">
              <Link
                href={module.lien}
                className="block h-full border border-filet bg-panneau px-4 py-4 transition-colors
                           hover:bg-survol-fond focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-titre text-[16px] font-semibold">{module.nom}</h3>
                  <span className="shrink-0 border border-accent px-1.5 py-px text-[9px] uppercase tracking-[0.05em] text-accent">
                    en ligne
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-[1.55] text-encre-secondaire">
                  {module.resume}
                </p>
                <span className="mt-3 inline-block text-[13px] text-accent">
                  Ouvrir le module crédit →
                </span>
              </Link>
            </li>
          ) : (
            <li
              key={module.cle}
              data-module={module.cle}
              data-etat="a-venir"
              className="border border-dashed border-desactive-filet px-4 py-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-titre text-[16px] font-semibold text-desactive-encre">
                  {module.nom}
                </h3>
                <span className="shrink-0 border border-desactive-filet px-1.5 py-px text-[9px] uppercase tracking-[0.05em] text-desactive-encre">
                  à venir
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-[1.55] text-desactive-encre">{module.resume}</p>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/** Gratuit, sans compte, sans collecte — et la conséquence : le lien partageable. */
function SansCompte() {
  return (
    <section className="border-b border-filet py-10 lg:py-12">
      <h2 className="text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
        Gratuit, sans compte, sans collecte de données
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <p className="max-w-[62ch] text-[14px] leading-[1.6]">
          Il n&apos;y a rien à créer et rien à accepter : ni compte, ni formulaire, ni bandeau de
          consentement. Les chiffres que vous saisissez ne partent nulle part — aucun serveur ne les
          reçoit, aucune régie ne les lit, et les polices de caractères elles-mêmes sont servies
          depuis ce site pour qu&apos;aucune adresse IP ne s&apos;échappe vers un tiers.
        </p>
        <p className="max-w-[62ch] text-[14px] leading-[1.6]">
          C&apos;est possible parce que l&apos;état d&apos;un scénario tient entièrement dans
          l&apos;adresse de la page. Chaque simulation est donc un lien : copiez-le pour la
          retrouver demain, envoyez-le à votre banquier ou à qui vous voudrez, il rouvrira
          exactement les mêmes chiffres.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/** Le produit calcule, l'utilisateur décide. Et il dit son état d'avancement. */
function Avertissement() {
  return (
    <footer data-avertissement-accueil className="py-8 lg:py-10">
      <p className="max-w-[100ch] text-[12px] leading-[1.6] text-encre-secondaire">
        Cet outil ne constitue ni un conseil en investissement, ni un conseil fiscal, ni une offre de
        crédit. Il calcule des scénarios à partir des hypothèses que vous posez ; la décision reste
        la vôtre. En cas d&apos;écart avec le calcul de votre banque, c&apos;est l&apos;offre de prêt
        qui fait foi.
      </p>
      <p className="mt-2 max-w-[100ch] text-[12px] leading-[1.6] text-encre-secondaire">
        Simulateur en cours de construction. Son modèle de calcul est régulièrement affiné, et les
        valeurs réglementaires portent la date et la source dont elles sont tirées.
      </p>
    </footer>
  );
}
