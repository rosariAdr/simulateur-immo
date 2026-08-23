"use client";

import type { AnneeDetention, ComparaisonDetention } from "@/core/compare/types";
import type { Cents } from "@/core/money";
import { formatEuros } from "@/lib/format";
import { DESCRIPTION_LECTURE, type Lecture } from "@/lib/comparaison";

/**
 * COURBES DE COÛT CUMULÉ — `VIZ-003`
 *
 * ═══ CE QUE LE GRAPHIQUE MONTRE ═══
 *
 * Deux courbes de cumul, année après année : ce que le propriétaire a versé
 * depuis le début, ce que le locataire a versé depuis le début. Des CUMULS et
 * non des flux annuels, parce que c'est sur les cumuls que le moteur définit
 * l'année de croisement — et parce que la question posée est « depuis le début,
 * où en suis-je », pas « ce mois-ci ».
 *
 * Entre les deux tracés du propriétaire court une bande verte : la part de
 * capital déjà remboursée. Elle est dessinée **dans les deux lectures**, parce
 * que c'est elle le sujet du module. En décaissement, la courbe comparée est le
 * HAUT de la bande ; en fonds perdus, c'est son BAS. La bascule ne redessine
 * rien : elle fait glisser la comparaison d'un bord de la bande à l'autre, et
 * l'on voit alors pourquoi l'année de croisement se déplace.
 *
 * ═══ LES TROIS COULEURS, ET POURQUOI CELLES-LÀ ═══
 *
 * Le vocabulaire est fixe — `docs/06-design-system.md` §3 — et aucune de ces
 * trois n'est un usage inventé.
 *
 *   `--capital`  la bande de capital remboursé. Le jeton dit « ce que
 *                l'utilisateur possède » : c'est exactement ce qu'est cette
 *                bande, et c'est pourquoi elle ne doit pas être comptée comme
 *                une dépense.
 *   `--interets` la courbe du propriétaire. Le jeton dit « ce que l'utilisateur
 *                perd, tout coût » : la courbe comparée est un coût dans les
 *                deux lectures — décaissement ou fonds perdus, c'est de l'argent
 *                sorti du compte.
 *   `--marches`  la courbe du locataire. Le jeton dit « le scénario financier
 *                alternatif », et le locataire EST le scénario alternatif de ce
 *                module. La couleur suit l'entité et non son rang : le même bleu
 *                portera le locataire de référence au niveau patrimonial, où il
 *                détient réellement un portefeuille.
 *
 * Le violet `--assurance` n'apparaît pas : aucune série n'isole ici l'assurance.
 * Elle est un poste parmi d'autres des fonds perdus, et lui donner une couleur
 * de série la ferait passer pour une quatrième courbe.
 *
 * **Aucune information n'est portée par la seule couleur.** Chaque tracé porte
 * son libellé écrit, posé à hauteur de son dernier point dans la gouttière de
 * droite ; la légende les nomme une seconde fois ; et la ligne de lecture sous
 * le graphique donne les trois montants en toutes lettres.
 *
 * ═══ LES PROPORTIONS NE MENTENT PAS ═══
 *
 * Aucune hauteur plancher, aucune échelle tronquée, aucun axe qui ne parte pas
 * de zéro. Les repères sont posés en pourcentage pur de l'échelle, exactement
 * comme les bandes du ruban d'amortissement, et `tests/e2e/comparaison.spec.ts`
 * mesure leurs pixels réels pour le vérifier.
 *
 * **L'échelle ne se recale pas sur la lecture retenue.** Elle vaut toujours le
 * plus grand cumul de décaissement de l'horizon. Passer en fonds perdus fait
 * donc RETOMBER les deux courbes dans la hauteur du cadre au lieu de les
 * réétaler : ce qui a disparu est visible, et c'est le capital. Une échelle qui
 * se recalerait rendrait les deux lectures indiscernables à l'œil.
 */

interface Props {
  readonly comparaison: ComparaisonDetention;
  readonly lecture: Lecture;
  readonly annee: number;
  readonly onAnnee: (annee: number) => void;
}

/** Cumul du propriétaire dans la lecture retenue. */
const cumulProprietaire = (a: AnneeDetention, l: Lecture): Cents =>
  l === "decaissement" ? a.proprietaire.cumulDecaissement : a.proprietaire.cumulFondsPerdus;

/** Cumul du locataire. Les deux lectures se confondent : il ne constitue rien. */
const cumulLocataire = (a: AnneeDetention, l: Lecture): Cents =>
  l === "decaissement" ? a.locataire.cumulDecaissement : a.locataire.cumulFondsPerdus;

export function CourbesCout({ comparaison, lecture, annee, onAnnee }: Props) {
  const annees = comparaison.annees;
  if (annees.length === 0) return null;

  const n = annees.length;
  const lue = annees.find((a) => a.annee === annee) ?? annees[0];
  if (!lue) return null;

  /**
   * Échelle commune, assise sur le décaissement : le plus grand des deux cumuls
   * de décaissement de tout l'horizon. Elle ne dépend NI de la lecture retenue,
   * NI de l'année lue.
   */
  const echelle = Math.max(
    0,
    ...annees.map((a) =>
      Math.max(a.proprietaire.cumulDecaissement, a.locataire.cumulDecaissement),
    ),
  );
  const part = (v: Cents) => (echelle > 0 ? (v / echelle) * 100 : 0);

  /** Abscisse d'une année, au centre de sa colonne. */
  const abscisse = (index: number) => ((index + 0.5) / n) * 100;

  /**
   * Une série en coordonnées SVG, ancrée à l'origine.
   *
   * Le point de départ `0,100` n'est pas cosmétique : avant la première échéance
   * personne n'a rien versé, et une courbe qui démarrerait à la valeur de
   * l'année 1 laisserait croire à un saut initial qui n'existe pas.
   */
  const serie = (valeur: (a: AnneeDetention) => Cents): readonly (readonly [number, number])[] => [
    [0, 100],
    ...annees.map((a, i) => [abscisse(i), 100 - part(valeur(a))] as const),
  ];

  const enChemin = (points: readonly (readonly [number, number])[]) =>
    points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(" ");

  const hautBande = serie((a) => a.proprietaire.cumulDecaissement);
  const basBande = serie((a) => a.proprietaire.cumulFondsPerdus);
  const courbeProprietaire = serie((a) => cumulProprietaire(a, lecture));
  const courbeLocataire = serie((a) => cumulLocataire(a, lecture));

  const finProprietaire = part(cumulProprietaire(annees[n - 1] as AnneeDetention, lecture));
  const finLocataire = part(cumulLocataire(annees[n - 1] as AnneeDetention, lecture));
  const [hauteurProprietaire, hauteurLocataire] = ecarter(finProprietaire, finLocataire);

  const croisement =
    lecture === "decaissement"
      ? comparaison.croisement.decaissement
      : comparaison.croisement.fondsPerdus;

  const valeurProprietaire = cumulProprietaire(lue, lecture);
  const valeurLocataire = cumulLocataire(lue, lecture);
  const ecart = valeurProprietaire - valeurLocataire;

  return (
    <section aria-labelledby="titre-courbes" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <h2 id="titre-courbes" className="font-titre text-[15px] font-semibold">
          Coût cumulé depuis le début, année par année
        </h2>
        <Legende lecture={lecture} />
      </div>

      <div className="flex min-w-0 items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          {/* Le cadre du tracé. Sa hauteur est fixe et son fond est neutre : un
              graphique dont le cadre grandit avec les valeurs mentirait deux
              fois, par l'échelle et par la taille. */}
          <div
            data-cadre-courbes
            className="relative h-[188px] w-full border border-filet bg-panneau lg:h-[228px]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {/* Quatre repères horizontaux, aux quarts de l'échelle. Ils ne
                  portent aucun chiffre — les montants sont sous le graphique,
                  en texte sélectionnable et mesurable. */}
              {[25, 50, 75].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  className="stroke-filet-grille"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* LA BANDE DE CAPITAL. Entre le décaissement et les fonds perdus
                  du propriétaire : ce qui sort du compte sans être consommé.
                  Aplat plein, sans transparence — une couleur diluée n'est plus
                  le jeton qu'elle prétend être, et la charte n'en prévoit pas
                  de variante translucide. */}
              <polygon
                data-bande="capital"
                points={enChemin([...hautBande, ...[...basBande].reverse()])}
                className="fill-capital"
              />

              <polyline
                data-courbe="locataire"
                points={enChemin(courbeLocataire)}
                fill="none"
                className="stroke-marches"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                data-courbe="proprietaire"
                points={enChemin(courbeProprietaire)}
                fill="none"
                className="stroke-interets"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />

              {croisement !== null && (
                <line
                  data-marque-croisement
                  x1={abscisse(croisement - 1)}
                  y1="0"
                  x2={abscisse(croisement - 1)}
                  y2="100"
                  className="stroke-accent"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* L'année lue. Trait plein, pour ne pas se confondre avec le
                  tireté du croisement. */}
              <line
                data-marque-annee
                x1={abscisse(annees.indexOf(lue))}
                y1="0"
                x2={abscisse(annees.indexOf(lue))}
                y2="100"
                className="stroke-encre-secondaire"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/*
              LES REPÈRES MESURABLES. Ils sont en HTML et non en SVG, et ce n'est
              pas un détail d'implémentation : le SVG est étiré par
              `preserveAspectRatio="none"`, ce qui déforme tout ce qu'il contient
              et rendrait une mesure de pixels inexploitable. Ces carrés-ci sont
              posés en pourcentage pur de la hauteur du cadre — sans plancher —
              et c'est eux que la garde de proportions mesure.
            */}
            {/*
              LE TRAIT DE CROISEMENT PORTE SON NOM. Un tireté couleur accent ne
              dit rien de lui-même, et la règle du produit est qu'aucune
              information ne repose sur la seule couleur ni sur le seul motif.
              L'étiquette bascule de côté quand le croisement tombe près d'un
              bord : posée au centre, elle sortirait du cadre et ferait défiler
              la page.
            */}
            {croisement !== null && (
              <span
                data-etiquette-croisement
                data-annee={croisement}
                style={{ left: `${abscisse(croisement - 1)}%` }}
                className={`absolute top-1 whitespace-nowrap px-1 text-[9px] text-accent ${
                  abscisse(croisement - 1) > 70
                    ? "-translate-x-full"
                    : abscisse(croisement - 1) < 12
                      ? ""
                      : "-translate-x-1/2"
                }`}
              >
                croisement, année {croisement}
              </span>
            )}

            {annees.map((a, i) => (
              <span key={`p${a.annee}`}>
                <span
                  aria-hidden="true"
                  data-point="proprietaire"
                  data-annee={a.annee}
                  style={{ left: `${abscisse(i)}%`, bottom: `${part(cumulProprietaire(a, lecture))}%` }}
                  className="absolute h-[5px] w-[5px] -translate-x-1/2 translate-y-1/2 bg-interets"
                />
                <span
                  aria-hidden="true"
                  data-point="locataire"
                  data-annee={a.annee}
                  style={{ left: `${abscisse(i)}%`, bottom: `${part(cumulLocataire(a, lecture))}%` }}
                  className="absolute h-[5px] w-[5px] -translate-x-1/2 translate-y-1/2 bg-marches"
                />
              </span>
            ))}
          </div>

          {/* Réglette des années. Une graduation sur cinq au-delà de dix ans :
              au-delà, les repères se chevauchent et ne se lisent plus. */}
          <div data-reglette className="mt-1 flex gap-px">
            {annees.map((a) => (
              <span
                key={a.annee}
                aria-hidden="true"
                className={`min-w-0 flex-1 text-center font-mono text-[9px] tabular-nums ${
                  a.annee === lue.annee ? "text-encre" : "text-encre-secondaire"
                }`}
              >
                {n <= 10 || a.annee % 5 === 0 ? a.annee : ""}
              </span>
            ))}
          </div>
        </div>

        {/*
          LA GOUTTIÈRE DES LIBELLÉS. Chaque courbe porte son nom, posé à la
          hauteur de son dernier point. La gouttière est un vrai élément de la
          rangée et non un calque : les libellés ne peuvent donc pas recouvrir le
          tracé, et la page ne peut pas déborder par leur faute.
        */}
        <div className="relative h-[188px] w-[64px] shrink-0 lg:h-[228px] lg:w-[86px]">
          <EtiquetteCourbe
            cle="proprietaire"
            libelle="Propriétaire"
            hauteurPct={hauteurProprietaire}
            classe="text-interets-texte"
          />
          <EtiquetteCourbe
            cle="locataire"
            libelle="Locataire"
            hauteurPct={hauteurLocataire}
            classe="text-marches-texte"
          />
        </div>
      </div>

      {/* Le curseur de lecture. Un `range` natif plutôt qu'une colonne cliquable
          par année : à trente ans, une colonne fait neuf pixels de large, très
          au-dessous des 24 px qu'un doigt réclame (WCAG 2.2 § 2.5.8). Le curseur
          reste atteignable au clavier et au doigt quelle que soit la durée. */}
      <div className="mt-2 flex items-center gap-3">
        <label htmlFor="annee-lue" className="shrink-0 text-[11px] text-encre-secondaire">
          Année lue
        </label>
        <input
          id="annee-lue"
          data-curseur-annee
          type="range"
          min={1}
          max={n}
          step={1}
          value={lue.annee}
          onChange={(e) => onAnnee(Number(e.target.value))}
          aria-valuetext={`Année ${lue.annee} sur ${n}`}
          className="peer h-6 w-full cursor-pointer appearance-none bg-transparent
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0
                     focus-visible:outline-accent
                     [&::-webkit-slider-runnable-track]:h-[3px]
                     [&::-webkit-slider-runnable-track]:bg-filet
                     [&::-webkit-slider-thumb]:h-[15px] [&::-webkit-slider-thumb]:w-[3px]
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-encre
                     [&::-webkit-slider-thumb]:-mt-[6px]
                     [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:bg-filet
                     [&::-moz-range-thumb]:h-[15px] [&::-moz-range-thumb]:w-[3px]
                     [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:bg-encre"
        />
      </div>

      <p
        data-curseur
        role="status"
        className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 border border-filet
                   bg-survol-fond px-3 py-2 text-[12px]"
      >
        {/* Le deux-points sépare l'énoncé du premier montant : sans lui,
            `role="status"` fait lire « Année 12 » et « 128 400,00 € » d'une
            traite, comme un seul nombre. */}
        <span className="text-encre-secondaire">Année {lue.annee} :</span>
        <span className="text-interets-texte">
          <Montant poste="proprietaire">{formatEuros(valeurProprietaire)}</Montant> côté
          propriétaire
        </span>
        <span className="text-marches-texte">
          <Montant poste="locataire">{formatEuros(valeurLocataire)}</Montant> côté locataire
        </span>
        <span className="text-encre-secondaire">
          soit <Montant poste="ecart" classe="text-encre">{formatEuros(Math.abs(ecart))}</Montant>{" "}
          {ecart === 0 ? "d'écart" : ecart > 0 ? "de plus pour le propriétaire" : "de moins pour le propriétaire"}
        </span>
      </p>

      <p data-note-cumul className="mt-2 max-w-[92ch] text-[12px] leading-[1.55] text-encre-secondaire">
        {DESCRIPTION_LECTURE[lecture].question} L&apos;échelle du cadre ne change pas avec la
        lecture : elle reste celle du décaissement, et c&apos;est pourquoi les courbes
        redescendent dans le cadre quand on retire la part de capital.
      </p>
    </section>
  );
}

/**
 * Écarte deux libellés qui se recouvriraient, et rien de plus.
 *
 * ⚠️ Cette fonction déplace du TEXTE, jamais une mesure. Les deux courbes se
 * rejoignent souvent au dernier point — c'est même le cas au voisinage d'un
 * croisement —, et deux libellés superposés y deviennent illisibles tous les
 * deux. Les repères mesurables, eux, ne bougent pas d'un pixel : la garde de
 * proportions les lit, pas les libellés.
 */
function ecarter(a: number, b: number): readonly [number, number] {
  /** Écart minimal en % de la hauteur du cadre, pour deux lignes de 10 px. */
  const MINIMUM = 8;
  /** Marges dans lesquelles un libellé reste entièrement dans la gouttière. */
  const PLANCHER = 4;
  const PLAFOND = 92;

  const serrer = (v: number) => Math.min(Math.max(v, PLANCHER), PLAFOND);
  // Le serrage vient AVANT l'écartement, et non l'inverse : borner après avoir
  // écarté ramène les deux libellés sur la même limite, ce qui les superpose de
  // nouveau — exactement le défaut qu'on cherchait à corriger.
  let haut = serrer(Math.max(a, b));
  let bas = serrer(Math.min(a, b));

  if (haut - bas < MINIMUM) {
    haut = Math.min(haut + (MINIMUM - (haut - bas)) / 2, PLAFOND);
    bas = haut - MINIMUM;
    if (bas < PLANCHER) {
      bas = PLANCHER;
      haut = bas + MINIMUM;
    }
  }

  return a >= b ? [haut, bas] : [bas, haut];
}

/**
 * Le libellé d'une courbe, posé à la hauteur que `ecarter` lui a donnée.
 *
 * `bottom` en pourcentage plutôt qu'en pixels : la gouttière et le cadre ont la
 * même hauteur, donc le même pourcentage désigne la même ligne.
 */
function EtiquetteCourbe({
  cle,
  libelle,
  hauteurPct,
  classe,
}: {
  cle: string;
  libelle: string;
  hauteurPct: number;
  classe: string;
}) {
  return (
    <span
      data-libelle-courbe={cle}
      style={{ bottom: `${hauteurPct}%` }}
      className={`absolute left-0 translate-y-1/2 text-[10px] leading-[1.2] ${classe}`}
    >
      {libelle}
    </span>
  );
}

/**
 * Le montant seul, sans le mot qui le qualifie. La séparation rend la ligne de
 * lecture vérifiable au centime par un test plutôt qu'à la sous-chaîne près.
 */
function Montant({
  poste,
  children,
  classe = "",
}: {
  poste: string;
  children: React.ReactNode;
  classe?: string;
}) {
  return (
    <span data-lecture={poste} className={`font-mono tabular-nums ${classe}`}>
      {children}
    </span>
  );
}

/** Les trois formes nommées. Le graphique ne repose jamais sur la seule couleur. */
function Legende({ lecture }: { lecture: Lecture }) {
  const entrees = [
    {
      cle: "proprietaire",
      libelle: `Propriétaire — ${DESCRIPTION_LECTURE[lecture].libelle.toLowerCase()}`,
      fond: "bg-interets",
    },
    { cle: "locataire", libelle: "Locataire", fond: "bg-marches" },
    { cle: "capital", libelle: "Capital remboursé", fond: "bg-capital" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {entrees.map((e) => (
        <span key={e.cle} data-legende={e.cle} className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 shrink-0 ${e.fond}`} aria-hidden="true" />
          <span className="text-[11px] text-encre-secondaire">{e.libelle}</span>
        </span>
      ))}
    </div>
  );
}
