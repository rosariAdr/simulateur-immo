"use client";

import { ecarter } from "@/components/charts/ecarter";
import type { Cents } from "@/core/money";
import { formatEuros } from "@/lib/format";
import type { AnalysePatrimoine, AnneePatrimoine } from "@/lib/patrimoine";

/**
 * LES DEUX PATRIMOINES, ANNÉE PAR ANNÉE — `UI-007`
 *
 * ═══ DEUX COURBES, DEUX FOURCHETTES ═══
 *
 * Ce que possède le propriétaire s'il vend cette année-là, et ce que vaut le
 * portefeuille du locataire de référence à la même date. Autour de chacune, la
 * **fourchette de son hypothèse** : l'intervalle d'appréciation observé pour le
 * bien, l'intervalle de rendement observé pour le portefeuille.
 *
 * La fourchette n'est pas un ornement. Sur le scénario d'ouverture, elle est
 * plus large que l'écart entre les deux courbes — c'est-à-dire que le choix des
 * hypothèses pèse plus lourd que le choix entre acheter et louer. Un graphique
 * qui ne montrerait que les deux traits laisserait croire l'inverse, et ce
 * serait le mensonge le plus coûteux de l'écran.
 *
 * ═══ TROIS RÈGLES DE PROPORTION, ET LA TROISIÈME EST LA DÉCISION ═══
 *
 * **1. Aucune hauteur plancher, aucun axe tronqué.** Les repères sont posés en
 * pourcentage pur de la hauteur utile du cadre, et `tests/e2e/patrimoine.spec.ts`
 * mesure leurs pixels réels contre les montants du moteur.
 *
 * **2. Le zéro est une position, pas un bord.** Le produit d'une vente **peut
 * être négatif** — vendre tôt laisse une dette quand le capital restant dû
 * dépasse le prix net de commission. `vente.ts` le rend tel quel, et ce cadre le
 * dessine tel quel, sous une ligne de zéro nommée. Écraser ces années à zéro
 * serait cacher le seul chiffre que ce module connaît et que personne d'autre
 * n'affiche.
 *
 * **3. L'échelle est celle des intervalles observés, pas celle du point
 * retenu.** Les bornes du cadre viennent des fourchettes, qui ne dépendent
 * d'aucun réglage : déplacer le curseur d'appréciation fait donc **monter ou
 * descendre la courbe dans un cadre immobile**, au lieu de la recadrer sur
 * elle-même. C'est l'équivalent, pour cet écran, de la règle 3 d'ADR-015 — un
 * cadre qui se réétale à chaque réglage rend toutes les hypothèses également
 * spectaculaires, donc n'en apprend aucune. Mesurable : le repère du locataire
 * ne bouge pas d'un pixel quand on change l'appréciation du bien.
 *
 * ═══ LES COULEURS SUIVENT LA GRANDEUR, PAS LE CAMP ═══
 *
 *   `--capital`  le patrimoine du propriétaire. Le jeton dit « ce que
 *                l'utilisateur possède, tout gain » : au niveau simple, la même
 *                couleur portait la bande de capital remboursé, qui est le
 *                commencement de cette grandeur-ci.
 *   `--marches`  le portefeuille du locataire. Le jeton dit « le scénario
 *                financier alternatif », et le locataire de référence détient
 *                ici un vrai portefeuille — le bleu qui le portait en tant que
 *                courbe de coût le suit, comme `VIZ-003` l'avait annoncé.
 *
 * ⚠️ La courbe du propriétaire change donc de couleur d'un écran à l'autre,
 * brique au niveau simple et verte ici. Ce n'est pas une entorse à « la couleur
 * suit l'entité » : ce n'est pas la même grandeur. Là-bas on traçait ce qu'il
 * dépense, ici ce qu'il possède. La brique reste employée sur cet écran, et
 * exactement pour ce qu'elle signifie : les postes qui se retranchent du produit
 * de la vente, dans le décompte.
 *
 * **Aucune information n'est portée par la seule couleur** : chaque courbe porte
 * son libellé écrit dans la gouttière, la légende les nomme une seconde fois
 * avec les deux fourchettes, et la ligne de lecture donne les montants.
 */

interface Props {
  readonly analyse: AnalysePatrimoine;
  readonly annee: number;
  readonly onAnnee: (annee: number) => void;
}

export function CourbesPatrimoine({ analyse, annee, onAnnee }: Props) {
  const annees = analyse.annees;
  if (annees.length === 0) return null;

  const n = annees.length;
  const lue = annees.find((a) => a.annee === annee) ?? annees[0];
  if (!lue) return null;

  /**
   * Bornes du cadre.
   *
   * Elles couvrent zéro, les deux fourchettes et les deux courbes. Les
   * fourchettes sont calculées aux bornes des intervalles **observés**, qui ne
   * dépendent d'aucun réglage : tant que le point retenu reste dans son
   * intervalle — le cas ordinaire —, bouger un curseur d'hypothèse ne recadre
   * rien.
   */
  const valeurs: number[] = [0];
  for (const a of annees) {
    if (a.proprietaire !== null) valeurs.push(a.proprietaire);
    if (a.proprietaireIntervalle !== null) valeurs.push(...a.proprietaireIntervalle);
    valeurs.push(a.locataire, ...a.locataireIntervalle);
  }
  const plancher = Math.min(...valeurs);
  const plafond = Math.max(...valeurs);
  const amplitude = plafond - plancher;

  /** Hauteur d'un montant, en % de la hauteur utile, mesurée depuis le bas du cadre. */
  const part = (v: Cents) => (amplitude > 0 ? ((v - plancher) / amplitude) * 100 : 0);
  const zero = part(0);

  const abscisse = (index: number) => ((index + 0.5) / n) * 100;

  /**
   * Une série en coordonnées SVG.
   *
   * ⚠️ Elle n'est PAS ancrée à l'origine, contrairement à celle des courbes de
   * coût. Là-bas, le cumul versé avant la première échéance vaut zéro, et
   * partir de `0,100` disait une vérité. Ici, le patrimoine à l'instant zéro
   * n'est pas nul des deux côtés : le locataire vient de placer l'apport, et le
   * propriétaire qui revendrait le jour même paierait une commission sur un
   * bien qu'il n'a pas commencé à rembourser. Ancrer à zéro inventerait deux
   * points qui n'existent pas.
   */
  const enChemin = (points: readonly (readonly [number, number])[]) =>
    points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(" ");

  /**
   * Une bande fermée : la borne haute parcourue à l'endroit, la borne basse à
   * l'envers. Même construction que la bande de capital du niveau simple.
   */
  const polygone = (
    points: readonly (readonly [number, readonly [Cents, Cents]])[],
  ): string =>
    enChemin([
      ...points.map(([x, [, haut]]) => [x, 100 - part(haut)] as const),
      ...[...points].reverse().map(([x, [bas]]) => [x, 100 - part(bas)] as const),
    ]);

  const courbeProprietaire: (readonly [number, number])[] = [];
  const bandeProprietaire: (readonly [number, readonly [Cents, Cents]])[] = [];
  const courbeLocataire: (readonly [number, number])[] = [];
  const bandeLocataire: (readonly [number, readonly [Cents, Cents]])[] = [];

  annees.forEach((a, i) => {
    const x = abscisse(i);
    courbeLocataire.push([x, 100 - part(a.locataire)]);
    bandeLocataire.push([x, a.locataireIntervalle]);
    if (a.proprietaire !== null) courbeProprietaire.push([x, 100 - part(a.proprietaire)]);
    if (a.proprietaireIntervalle !== null) bandeProprietaire.push([x, a.proprietaireIntervalle]);
  });

  const polygoneProprietaire = polygone(bandeProprietaire);
  const polygoneLocataire = polygone(bandeLocataire);

  const derniere = annees[n - 1] as AnneePatrimoine;
  const [hauteurProprietaire, hauteurLocataire] = ecarter(
    part(derniere.proprietaire ?? plancher),
    part(derniere.locataire),
  );

  const croisement = analyse.croisement;
  /** Année où le portefeuille n'a plus pu financer l'écart, s'il y en a une. */
  const anneeEpuisement =
    analyse.portefeuille.moisEpuisement === null
      ? null
      : Math.min(Math.ceil(analyse.portefeuille.moisEpuisement / 12), n);

  return (
    <section aria-labelledby="titre-patrimoines" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <h2 id="titre-patrimoines" className="font-titre text-[15px] font-semibold">
          Ce que chacun possède, s&apos;il s&apos;arrête cette année-là
        </h2>
        <Legende />
      </div>

      <div className="flex min-w-0 items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <div
            data-cadre-patrimoine
            className="relative h-[200px] w-full border border-filet bg-panneau lg:h-[250px]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {/*
                LES FOURCHETTES PASSENT DERRIÈRE, ET ELLES SONT PÂLES.

                `VIZ-003` avait tranché l'inverse pour la bande de capital :
                aplat plein, « une couleur diluée n'est plus le jeton qu'elle
                prétend être ». La règle vaut là-bas parce que cette bande EST
                le capital — la grandeur elle-même, dessinée. Ici, la bande
                n'est pas une grandeur : c'est l'incertitude qui entoure une
                grandeur, et lui donner la même intensité qu'à la courbe
                reviendrait à dire que les deux ont le même statut. La teinte
                reste celle du jeton, l'intensité dit le statut, et rien ne
                repose là-dessus : les deux fourchettes sont nommées dans la
                légende et leurs bornes sont écrites en euros au-dessus du
                graphique.
              */}
              <polygon
                data-fourchette-tracee="locataire"
                points={polygoneLocataire}
                className="fill-marches opacity-25"
              />
              <polygon
                data-fourchette-tracee="proprietaire"
                points={polygoneProprietaire}
                className="fill-capital opacity-25"
              />

              {/* LA LIGNE DE ZÉRO. Elle n'est au bord du cadre que si aucun
                  montant n'est négatif ; sinon elle flotte, et ce qui pend
                  au-dessous est une dette. */}
              <line
                data-ligne-zero
                x1="0"
                y1={100 - zero}
                x2="100"
                y2={100 - zero}
                className="stroke-encre-secondaire"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />

              <polyline
                data-courbe="locataire"
                points={enChemin(courbeLocataire)}
                fill="none"
                className="stroke-marches"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {courbeProprietaire.length > 1 && (
                <polyline
                  data-courbe="proprietaire"
                  points={enChemin(courbeProprietaire)}
                  fill="none"
                  className="stroke-capital"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )}

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

            {/* La ligne de zéro porte son nom : un trait gris ne dit rien de
                lui-même, et c'est le repère qui sépare « il lui reste » de
                « il doit apporter ». */}
            <span
              data-etiquette-zero
              style={{ bottom: `${zero}%` }}
              className="pointer-events-none absolute right-1 translate-y-1/2 bg-panneau px-1 text-[9px] text-encre-secondaire"
            >
              zéro
            </span>

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
                les deux patrimoines se rejoignent, année {croisement}
              </span>
            )}

            {/* LES REPÈRES MESURABLES, en HTML et non en SVG : le SVG est étiré
                par `preserveAspectRatio="none"`, ce qui déforme tout ce qu'il
                contient et rendrait une mesure de pixels inexploitable. */}
            {annees.map((a, i) => (
              <span key={`r${a.annee}`}>
                {a.proprietaire !== null && (
                  <span
                    aria-hidden="true"
                    data-point="proprietaire"
                    data-annee={a.annee}
                    style={{ left: `${abscisse(i)}%`, bottom: `${part(a.proprietaire)}%` }}
                    className="absolute h-[5px] w-[5px] -translate-x-1/2 translate-y-1/2 bg-capital"
                  />
                )}
                <span
                  aria-hidden="true"
                  data-point="locataire"
                  data-annee={a.annee}
                  style={{ left: `${abscisse(i)}%`, bottom: `${part(a.locataire)}%` }}
                  className="absolute h-[5px] w-[5px] -translate-x-1/2 translate-y-1/2 bg-marches"
                />
              </span>
            ))}
          </div>

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

        <div className="relative h-[200px] w-[74px] shrink-0 lg:h-[250px] lg:w-[96px]">
          <EtiquetteCourbe
            cle="proprietaire"
            libelle="Propriétaire"
            hauteurPct={hauteurProprietaire}
            classe="text-capital-texte"
          />
          <EtiquetteCourbe
            cle="locataire"
            libelle="Locataire"
            hauteurPct={hauteurLocataire}
            classe="text-marches-texte"
          />
        </div>
      </div>

      {/* Curseur natif plutôt qu'une colonne cliquable par année : à trente ans,
          une colonne fait neuf pixels, très au-dessous des 24 px qu'un doigt
          réclame (WCAG 2.2 § 2.5.8). */}
      <div className="mt-2 flex items-center gap-3">
        <label htmlFor="annee-patrimoine" className="shrink-0 text-[11px] text-encre-secondaire">
          Année lue
        </label>
        <input
          id="annee-patrimoine"
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
        <span className="text-encre-secondaire">Année {lue.annee} :</span>
        <span className="text-capital-texte">
          <Montant poste="proprietaire">
            {lue.proprietaire === null ? "non chiffré" : formatEuros(lue.proprietaire)}
          </Montant>{" "}
          pour le propriétaire
        </span>
        <span className="text-marches-texte">
          <Montant poste="locataire">{formatEuros(lue.locataire)}</Montant> pour le locataire
        </span>
        {lue.ecart !== null && (
          <span className="text-encre-secondaire">
            soit{" "}
            <Montant poste="ecart" classe="text-encre">
              {formatEuros(Math.abs(lue.ecart))}
            </Montant>{" "}
            {lue.ecart === 0
              ? "d'écart"
              : lue.ecart > 0
                ? "de plus pour le propriétaire"
                : "de moins pour le propriétaire"}
          </span>
        )}
      </p>

      {croisement === null ? (
        <p data-croisement="aucun" className="mt-2 max-w-[96ch] text-[12px] leading-[1.55] text-encre-secondaire">
          Les deux patrimoines ne se rejoignent pas avant l&apos;année {n}, sous les hypothèses
          retenues. Ce n&apos;est pas un défaut du calcul : un croisement n&apos;est pas garanti, et
          il se déplace de plusieurs années au moindre dixième de point d&apos;appréciation.
        </p>
      ) : (
        <p data-croisement="oui" data-annee={croisement} className="mt-2 max-w-[96ch] text-[12px] leading-[1.55] text-encre-secondaire">
          Les deux patrimoines se rejoignent à l&apos;année {croisement}, sous les hypothèses
          retenues. Cette année-là, les deux montants sont égaux — cela ne dit pas qu&apos;une
          option produit davantage, et un dixième de point d&apos;appréciation en plus ou en moins
          déplace ce croisement de plusieurs années.
        </p>
      )}

      {anneeEpuisement !== null && (
        <p data-epuisement data-annee={anneeEpuisement} className="mt-2 max-w-[96ch] border border-interets bg-erreur-fond px-3 py-2 text-[12px] leading-[1.55]">
          <span className="font-semibold">
            À partir de l&apos;année {anneeEpuisement}, la comparaison cesse d&apos;en être une.
          </span>{" "}
          Le coût du propriétaire est alors passé sous le loyer, et le locataire de référence
          devait retirer de son portefeuille pour maintenir le même effort. Le portefeuille ne l&apos;a
          plus permis : {formatEuros(analyse.portefeuille.nonFinance)} n&apos;ont pas pu être
          financés sur l&apos;horizon. Au-delà de cette année, les deux colonnes ne décrivent plus
          le même effort d&apos;épargne, et leur écart ne se lit plus.
        </p>
      )}

      <p data-note-echelle className="mt-2 max-w-[96ch] text-[12px] leading-[1.55] text-encre-secondaire">
        Les deux surfaces pâles sont les fourchettes d&apos;hypothèses, pas des marges d&apos;erreur
        statistiques : elles disent ce que deviennent ces courbes aux deux bouts de l&apos;intervalle
        observé. L&apos;échelle du cadre est fixée par ces fourchettes et ne bouge donc pas quand on
        déplace un curseur d&apos;hypothèse — c&apos;est la courbe qui monte ou descend dans un cadre
        immobile.
      </p>
    </section>
  );
}

/**
 * Le libellé d'une courbe, posé à la hauteur que `ecarter` lui a donnée.
 *
 * `bottom` en pourcentage : la gouttière et le cadre ont la même hauteur, donc
 * le même pourcentage désigne la même ligne.
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

/** Le montant seul, sans le mot qui le qualifie : vérifiable au centime par un test. */
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

/** Quatre formes nommées. Le graphique ne repose jamais sur la seule couleur. */
function Legende() {
  const entrees = [
    { cle: "proprietaire", libelle: "Propriétaire, s'il vend", fond: "bg-capital", pale: false },
    {
      cle: "fourchette-proprietaire",
      libelle: "Fourchette d'appréciation",
      fond: "bg-capital",
      pale: true,
    },
    { cle: "locataire", libelle: "Locataire, portefeuille", fond: "bg-marches", pale: false },
    {
      cle: "fourchette-locataire",
      libelle: "Fourchette de rendement",
      fond: "bg-marches",
      pale: true,
    },
  ] as const;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {entrees.map((e) => (
        <span key={e.cle} data-legende={e.cle} className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 ${e.fond} ${e.pale ? "opacity-25" : ""}`}
            aria-hidden="true"
          />
          <span className="text-[11px] text-encre-secondaire">{e.libelle}</span>
        </span>
      ))}
    </div>
  );
}
