import type { Metadata } from "next";
import Link from "next/link";
import { buildCreditPlan, type CreditPlanInput } from "@/core/credit/plan";
import { PARAMS_2026 } from "@/core/fiscal/params";
import { euros } from "@/core/money";
import { FAMILLES, type Famille } from "@/components/ui/taxonomie";
import { formatEuros } from "@/lib/format";

/**
 * L'exemple du héros rejoue le scénario par défaut qui ouvre `/credit` (le même
 * que `DEFAUTS` dans `lib/scenario`), mais construit son entrée moteur à la main.
 * La page d'accueil est un composant serveur ; importer `lib/scenario` y tirerait
 * `nuqs` — l'état d'URL —, qui est client. Les chiffres de la ventilation, eux,
 * restent calculés par le moteur, à la compilation.
 */
const ENTREE_EXEMPLE: CreditPlanInput = {
  loans: [{ id: "principal", label: "Prêt principal", principal: euros(180_000), annualRatePct: 3.2, months: 240 }],
  insurance: { annualRatePct: 0.3, basis: "initial", coveragePct: 100 },
  guarantee: "suretyship",
  arrangementFee: euros(900),
  propertyPrice: euros(205_000),
  netMonthlyIncome: euros(3_800),
  otherDebtService: euros(0),
};
const EXEMPLE = buildCreditPlan(ENTREE_EXEMPLE, PARAMS_2026);

export const metadata: Metadata = {
  title: "Simulateur d'acquisition immobilière — calculer et comprendre",
  description:
    "Calcule une acquisition immobilière et explique chaque paramètre : ce qui se négocie, " +
    "ce qui dépend de votre projet, ce que la réglementation impose. Les modules crédit et " +
    "« acheter ou louer » sont en ligne. Gratuit, sans compte, sans collecte de données.",
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
 * Elle dit aussi ce qui n'existe pas. La plupart des modules sont annoncés et
 * non livrés ; les présenter comme cliquables serait la première promesse tenue
 * de travers d'un produit dont l'argument est l'honnêteté du calcul. Le compte
 * exact ne s'écrit nulle part en prose — il se déduit de `MODULES`, voir
 * `UI-014` et la garde « le décompte annoncé est celui des cartes affichées ».
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

/**
 * Petit intitulé éditorial, réutilisé par les sections : un tiret d'accent
 * laiton (ornement, jamais une couleur sémantique — voir §10.2) suivi du label
 * en capitales. Il donne un point d'attaque régulier à chaque bloc.
 */
function Intitule({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.08em] text-encre-secondaire">
      <span aria-hidden="true" className="h-px w-7 shrink-0 bg-accent" />
      {children}
    </p>
  );
}

/**
 * L'annonce. Trois phrases, pas quatre, et un lien qui mène au calcul.
 *
 * L'accueil est un « moment de bascule » (brief §10.1) : le héros a droit à un
 * geste graphique. Il est posé sur un panneau à filet (une élévation, §10.4),
 * ouvert par un intitulé à tiret d'accent, et son explication est répartie sur
 * deux colonnes pour occuper la largeur au lieu de s'entasser à gauche. Le texte
 * ne change pas ; seul l'agencement.
 */
function These() {
  return (
    <header className="py-7 lg:py-10">
      <div className="border border-filet bg-panneau px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
        <Intitule>Acquisition immobilière</Intitule>

        <h1 className="mt-5 max-w-[20ch] font-titre text-[34px] font-bold leading-[1.08] tracking-[-0.03em] lg:text-[50px]">
          Un simulateur qui explique d&apos;où viennent ses chiffres.
        </h1>

        <div className="mt-7 grid gap-x-12 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
          <p className="text-[16px] leading-[1.6] lg:text-[17px]">
            Ce site calcule une acquisition immobilière — crédit, frais, aides, comparaison avec la
            location, remboursements anticipés — et explique chaque paramètre à l&apos;endroit où il
            apparaît.
          </p>
          <div className="space-y-3 lg:border-l lg:border-filet lg:pl-8">
            <p className="text-[15px] leading-[1.6]">
              Il distingue partout ce qui se négocie, ce qui dépend de votre projet, et ce que la
              réglementation impose.
            </p>
            <p className="text-[14px] leading-[1.6] text-encre-secondaire">
              Il ne recommande rien : il calcule des scénarios à partir des hypothèses que vous
              posez, et vous décidez.
            </p>
          </div>
        </div>

        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href="/credit"
            data-vers-credit
            className="group inline-flex items-center gap-2 border border-accent px-6 py-3 text-[15px]
                       font-medium text-accent transition-colors hover:bg-survol-fond
                       hover:text-accent-survol focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Calculer un crédit
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <p className="text-[13px] text-encre-secondaire">Deux minutes, six paramètres.</p>
        </div>

        <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.04em] text-encre-secondaire">
          <span>Sans compte</span>
          <span aria-hidden="true">·</span>
          <span>Sans collecte</span>
          <span aria-hidden="true">·</span>
          <span>
            L&apos;état d&apos;un scénario tient dans{" "}
            <span className="text-accent-survol">l&apos;adresse de la page</span>
          </span>
        </p>

        <ExempleVentilation />
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Une ventilation RÉELLE, pas un décor. Elle rejoue le poste par poste du module
 * crédit — capital, intérêts, assurance, frais —, mêmes couleurs de données,
 * mêmes totaux, pour montrer d'un regard ce que l'outil produit. Les quatre
 * couleurs sémantiques sont ici à leur place : une représentation de données.
 * Voir docs/01-brief-design.md §10.2.
 */
function ExempleVentilation() {
  const frais = EXEMPLE.upfrontFees + EXEMPLE.guarantee.cost;
  const total = EXEMPLE.totalPrincipal + EXEMPLE.totalInterest + EXEMPLE.totalInsurance + frais;
  const part = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  // Le scénario par défaut : 205 000 € − 25 000 € d'apport, sur 240 mois, à 3,2 %.
  const capital = 180_000;
  const ans = 20;
  const taux = "3,2";

  const postes = [
    { cle: "capital", libelle: "Capital", valeur: EXEMPLE.totalPrincipal, fond: "bg-capital", texte: "text-capital-texte" },
    { cle: "interets", libelle: "Intérêts", valeur: EXEMPLE.totalInterest, fond: "bg-interets", texte: "text-interets-texte" },
    { cle: "assurance", libelle: "Assurance", valeur: EXEMPLE.totalInsurance, fond: "bg-assurance", texte: "text-assurance-texte" },
    { cle: "frais", libelle: "Frais et garantie", valeur: frais, fond: "bg-encre-secondaire", texte: "text-encre-secondaire" },
  ] as const;

  return (
    <figure className="mt-7 max-w-[560px] border border-filet bg-papier px-4 pb-3.5 pt-3">
      <figcaption className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-encre-secondaire">
        Exemple — {capital.toLocaleString("fr-FR")} € empruntés sur {ans} ans à {taux} %
      </figcaption>
      <div className="flex h-7 overflow-hidden rounded-[2px]">
        {postes.map((p) => (
          <div
            key={p.cle}
            data-poste={p.cle}
            style={{ width: `${part(p.valeur)}%` }}
            className={p.fond}
            title={`${p.libelle} — ${formatEuros(p.valeur)}`}
          />
        ))}
      </div>
      <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {postes.map((p) => (
          <div key={p.cle} className="flex items-baseline gap-2">
            <span className={`inline-block h-2.5 w-2.5 shrink-0 ${p.fond}`} aria-hidden="true" />
            <dt className="text-[11px] text-encre-secondaire">{p.libelle}</dt>
            <dd className={`font-mono text-[11px] tabular-nums ${p.texte}`}>{formatEuros(p.valeur)}</dd>
          </div>
        ))}
      </dl>
    </figure>
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
  /**
   * Second niveau du même module, quand il en a un — `UI-007`.
   *
   * « Acheter ou louer » est le premier module à en porter deux : la
   * spécification le décrit ainsi, un niveau simple et un niveau approfondi.
   * Une seconde carte les aurait présentés comme deux modules et aurait faussé
   * le décompte annoncé juste au-dessus ; un lien de plus sur la même carte dit
   * ce qui est : un module, deux écrans.
   *
   * Il est **hors** du lien qui enveloppe la carte, et il doit le rester : un
   * `<a>` dans un `<a>` est du HTML invalide, que les navigateurs réparent
   * chacun à leur façon.
   */
  readonly approfondi?: { readonly lien: string; readonly libelle: string };
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
      "Deux façons de compter le coût d'un achat face à un loyer, et les deux années de croisement qu'elles donnent.",
    lien: "/comparaison",
    approfondi: {
      lien: "/comparaison/patrimoine",
      libelle: "Niveau approfondi : les deux patrimoines à l'horizon →",
    },
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

/** Deux, trois, quatre… écrits en toutes lettres tant que la liste tient en une main. */
const EN_LETTRES = ["aucun", "un", "deux", "trois", "quatre", "cinq"] as const;

function nombreEcrit(n: number): string {
  return EN_LETTRES[n] ?? String(n);
}

/**
 * Majuscule initiale d'une phrase composée.
 *
 * Le décompte ouvre une phrase, et « deux modules sont en ligne » y est arrivé
 * en minuscule le jour où le texte a cessé d'être écrit à la main : la variante
 * à un module commençait par « Un », la variante générale par le mot du nombre.
 * La garde du décompte ne l'a pas vu — elle comparait sans tenir compte de la
 * casse, ce qui était le bon choix pour les noms de modules et le mauvais pour
 * le premier caractère.
 */
function capitale(phrase: string): string {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

function Modules() {
  /*
    Le décompte et les noms se DÉDUISENT de la liste — `UI-014`.

    Ils étaient écrits à la main : « Un seul module est en ligne : le crédit. Les
    quatre autres… ». Ouvrir la comparaison rendait donc la phrase fausse sans
    qu'aucun test ne la voie, parce qu'aucun test ne relit une phrase. Le seul
    endroit où l'état d'un module s'écrit est désormais son champ `lien`.
  */
  const ouverts = MODULES.filter((m) => m.lien !== null);
  const aVenir = MODULES.filter((m) => m.lien === null);
  const noms = ouverts.map((m) => m.nom.toLowerCase());

  return (
    <section className="border-b border-filet py-10 lg:py-12">
      <h2 className="text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
        Ce qui est en ligne, et ce qui ne l&apos;est pas
      </h2>
      <p className="mt-3 max-w-[80ch] text-[14px] leading-[1.6]">
        {ouverts.length === 1
          ? `Un seul module est en ligne : ${noms[0]}.`
          : capitale(
              `${nombreEcrit(ouverts.length)} modules sont en ligne : ${noms.slice(0, -1).join(", ")} et ${noms.at(-1)}.`,
            )}{" "}
        Les {nombreEcrit(aVenir.length)} autres sont écrits dans le plan et n&apos;existent pas
        encore. Ils sont listés ici pour dire où va le produit, pas pour laisser croire
        qu&apos;ils répondraient.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODULES.map((module) =>
          module.lien !== null ? (
            <li
              key={module.cle}
              data-module={module.cle}
              data-etat="en-ligne"
              className="flex h-full flex-col border border-filet bg-panneau"
            >
              <Link
                href={module.lien}
                className="block grow px-4 py-4 transition-colors
                           hover:bg-survol-fond focus-visible:outline focus-visible:outline-2
                           focus-visible:-outline-offset-2 focus-visible:outline-accent"
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
                {/*
                  Le libellé ne nomme plus le crédit. Toute la carte est le lien, et
                  son nom accessible commence par le titre du module : « Crédit …
                  Ouvrir le module → » se lit entier au lecteur d'écran. Nommer un
                  module ici obligeait à le renommer à chaque ouverture, et c'est
                  exactement l'oubli que `UI-014` a eu à réparer.
                */}
                <span className="mt-3 inline-block text-[13px] text-accent">
                  Ouvrir le module →
                </span>
              </Link>
              {/*
                Le second niveau, hors du lien de la carte — un `<a>` dans un
                `<a>` est invalide. Il est présenté comme ce qu'il est : un
                second écran du même module, et non un module de plus. La garde
                d'accueil compte les LIENS des cartes ouvertes, pas les cartes,
                et rougit donc si cette route n'est pas déclarée.
              */}
              {module.approfondi && (
                <Link
                  href={module.approfondi.lien}
                  className="block border-t border-filet px-4 py-2.5 text-[13px] text-accent
                             transition-colors hover:bg-survol-fond hover:text-accent-survol
                             focus-visible:outline focus-visible:outline-2
                             focus-visible:-outline-offset-2 focus-visible:outline-accent"
                >
                  {module.approfondi.libelle}
                </Link>
              )}
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
