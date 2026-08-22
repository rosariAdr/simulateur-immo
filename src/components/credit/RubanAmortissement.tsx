"use client";

import { useRef } from "react";
import type { CreditPlan } from "@/core/credit/plan";
import { formatEuros } from "@/lib/format";
import { Pastille } from "@/components/ui";
import { GLOSSAIRE } from "@/content/glossaire";

/**
 * RUBAN D'AMORTISSEMENT — `VIZ-001`
 *
 * Une barre par année, empilée dans l'ordre de lecture : les intérêts en haut,
 * l'assurance au milieu, le capital en bas. Le capital pousse par le bas et les
 * intérêts refluent par le haut, ce qui est exactement ce qui se passe.
 *
 * LES HAUTEURS SONT STRICTEMENT PROPORTIONNELLES. Aucune hauteur plancher, même
 * quand la bande d'assurance ne fait que deux pixels : un produit dont la thèse
 * est l'honnêteté du chiffre ne peut pas grossir une part pour la rendre jolie.
 * Une assurance invisible sur le ruban est une assurance négligeable, et c'est
 * une information.
 *
 * L'échelle est commune à toutes les barres — le total versé de l'année la plus
 * chargée vaut 100 % de la hauteur. Elle ne se recale pas sur la sélection : le
 * relief du ruban resterait identique quel que soit le prêt, et il ne dirait
 * plus rien.
 *
 * Le curseur de lecture est un `radiogroup` : les flèches parcourent les années,
 * `Origine` et `Fin` sautent aux extrémités, et un lecteur d'écran annonce la
 * position. La ligne de lecture sous le ruban porte `role="status"` — elle est
 * relue à chaque déplacement, ce qui rend le graphique utilisable sans le voir.
 *
 * DEUX ORIENTATIONS — `UI-006`. Sous 700 px de large, le ruban n'a pas de quoi
 * donner 24 px à chaque année et bascule en lignes : une par année, empilées
 * vers le bas, les bandes courant vers la droite. Le basculement est décidé par
 * une requête de conteneur et non par un point de rupture de fenêtre — la
 * contrainte porte sur la largeur du ruban, pas sur celle de l'écran. Le DOM est
 * le même dans les deux cas : une seule liste de barres, une seule sélection, un
 * seul jeu de libellés accessibles. Les règles de mise en page vivent dans
 * `globals.css`, sous `.ruban`, avec le calcul qui fixe le seuil.
 */

interface Props {
  readonly plan: CreditPlan;
  readonly annee: number;
  readonly onAnnee: (annee: number) => void;
}

export function RubanAmortissement({ plan, annee, onAnnee }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const annees = plan.annual;
  if (annees.length === 0) return null;

  const echelle = Math.max(...annees.map((a) => a.payment));
  const lue = annees.find((a) => a.year === annee) ?? annees[0];
  if (!lue) return null;

  /** Déplace le curseur et donne le focus à la barre atteinte. */
  const deplacer = (vers: number) => {
    const cible = Math.min(Math.max(vers, 1), annees.length);
    onAnnee(cible);
    conteneur.current?.querySelector<HTMLElement>(`[data-annee="${cible}"]`)?.focus();
  };

  const auClavier = (e: React.KeyboardEvent) => {
    // Bas et droite avancent, haut et gauche reculent. Les deux couples suivent
    // chacun une des deux orientations : la droite quand les années courent en
    // colonnes, le bas quand elles s'empilent en lignes. `ArrowUp` avançait
    // avant `UI-006`, ce qui ne correspondait à aucune des deux.
    const pas: Record<string, number> = {
      ArrowRight: annee + 1,
      ArrowLeft: annee - 1,
      ArrowDown: annee + 1,
      ArrowUp: annee - 1,
      Home: 1,
      End: annees.length,
    };
    const cible = pas[e.key];
    if (cible === undefined) return;
    e.preventDefault();
    deplacer(cible);
  };

  const part = (valeur: number) => (echelle > 0 ? (valeur / echelle) * 100 : 0);

  return (
    <section aria-labelledby="titre-ruban">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="titre-ruban" className="flex items-center font-titre text-[15px] font-semibold">
          Ruban d&apos;amortissement
          {/* Le mot qui donne son nom au graphique n'était expliqué nulle part. */}
          <Pastille entree={GLOSSAIRE.amortissement} />
        </h2>
        <Legende />
      </div>

      {/*
        La requête de conteneur se pose ici, sur un enveloppant qui n'entoure que
        le graphique. Elle n'englobe pas l'en-tête : `container-type` crée un
        contexte d'empilement, et la bulle de la pastille du titre s'y trouverait
        enfermée.
      */}
      <div className="ruban">
        <div className="ruban-cadre border border-filet bg-panneau">
          <div
            ref={conteneur}
            role="radiogroup"
            aria-label="Année lue sur le ruban d'amortissement"
            onKeyDown={auClavier}
            className="ruban-piste"
          >
            {annees.map((a) => {
              const actif = a.year === lue.year;
              return (
                <button
                  key={a.year}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  tabIndex={actif ? 0 : -1}
                  data-annee={a.year}
                  data-selection={actif ? "oui" : "non"}
                  onClick={() => onAnnee(a.year)}
                  // Le résumé porte les quatre chiffres : un lecteur d'écran n'a
                  // aucun accès aux hauteurs, il lui faut la valeur elle-même.
                  aria-label={
                    `Année ${a.year} : ${formatEuros(a.interest)} d'intérêts, ` +
                    `${formatEuros(a.insurance)} d'assurance, ${formatEuros(a.principal)} de capital. ` +
                    `Il reste ${formatEuros(a.closingBalance)} à rembourser.`
                  }
                  className={`ruban-barre cursor-pointer outline-offset-2 focus-visible:outline
                              focus-visible:outline-2 focus-visible:outline-accent
                              ${actif ? "outline outline-2 outline-accent" : "hover:opacity-80"}`}
                >
                  {/*
                    Le repère d'année en tête de ligne. En colonnes il disparaît
                    au profit de la réglette du bas ; en lignes c'est l'inverse,
                    et chaque année porte alors le sien — il n'y a plus de
                    chevauchement à éviter, donc plus d'année sautée.
                  */}
                  <span
                    aria-hidden="true"
                    data-repere={a.year}
                    className={`ruban-repere font-mono text-[10px] leading-none tabular-nums ${
                      actif ? "text-encre" : "text-encre-secondaire"
                    }`}
                  >
                    {a.year}
                  </span>

                  <span className="ruban-bandes">
                    <span
                      data-part="interets"
                      style={{ "--part": `${part(a.interest)}%` } as React.CSSProperties}
                      className="ruban-part block shrink-0 bg-interets"
                    />
                    <span
                      data-part="assurance"
                      style={{ "--part": `${part(a.insurance)}%` } as React.CSSProperties}
                      className="ruban-part block shrink-0 bg-assurance"
                    />
                    <span
                      data-part="capital"
                      style={{ "--part": `${part(a.principal)}%` } as React.CSSProperties}
                      className="ruban-part block shrink-0 bg-capital"
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="ruban-reglette mt-1.5 gap-[3px] border-t border-filet pt-1.5">
            {annees.map((a) => (
              <span
                key={a.year}
                aria-hidden="true"
                className={`min-w-0 flex-1 text-center font-mono text-[9px] tabular-nums ${
                  a.year === lue.year ? "text-encre" : "text-encre-secondaire"
                }`}
              >
                {/* Au-delà de vingt ans les repères se chevauchent : une année sur deux. */}
                {annees.length > 20 && a.year % 2 === 0 ? "" : a.year}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p
        data-curseur
        role="status"
        className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border border-t-0 border-filet
                   bg-survol-fond px-3 py-2 text-[12px]"
      >
        {/*
          Le deux-points n'est pas décoratif : `role="status"` fait relire la
          ligne entière, et sans lui « Année 1 » et « 5 664,76 € » s'énoncent
          d'une traite, comme un seul nombre.
        */}
        <span className="text-encre-secondaire">Année {lue.year} :</span>
        <span className="text-interets-texte">
          <Montant poste="interets">{formatEuros(lue.interest)}</Montant> d&apos;intérêts
        </span>
        <span className="text-assurance-texte">
          <Montant poste="assurance">{formatEuros(lue.insurance)}</Montant> d&apos;assurance
        </span>
        <span className="text-capital-texte">
          <Montant poste="capital">{formatEuros(lue.principal)}</Montant> de capital
        </span>
        <span className="text-encre-secondaire">
          Il reste{" "}
          <Montant poste="restant" classe="text-encre">
            {formatEuros(lue.closingBalance)}
          </Montant>{" "}
          à rembourser
        </span>
      </p>

      {plan.crossoverMonth !== null && (
        <p data-bascule className="mt-2 max-w-[88ch] text-[12px] leading-[1.55] text-encre-secondaire">
          {plan.crossoverMonth === 1 ? (
            <>Dès la première échéance, le capital remboursé dépasse les intérêts payés.</>
          ) : (
            <>
              À partir du mois {plan.crossoverMonth}, soit la{" "}
              {ordinal(Math.ceil(plan.crossoverMonth / 12))} année, chaque échéance rembourse plus de
              capital qu&apos;elle ne paie d&apos;intérêts.
            </>
          )}
        </p>
      )}
    </section>
  );
}

/**
 * Le montant seul, sans le mot qui le qualifie. La séparation n'est pas
 * cosmétique : c'est elle qui rend la ligne de lecture vérifiable au centime
 * par un test, plutôt qu'à la sous-chaîne près.
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

/** Les trois postes nommés. Le ruban ne repose jamais sur la seule couleur. */
function Legende() {
  const postes = [
    { cle: "interets", libelle: "Intérêts", fond: "bg-interets" },
    { cle: "assurance", libelle: "Assurance", fond: "bg-assurance" },
    { cle: "capital", libelle: "Capital", fond: "bg-capital" },
  ] as const;

  return (
    <div className="flex gap-4">
      {postes.map((p) => (
        <span key={p.cle} className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 shrink-0 ${p.fond}`} aria-hidden="true" />
          <span className="text-[11px] text-encre-secondaire">{p.libelle}</span>
        </span>
      ))}
    </div>
  );
}

const ordinal = (n: number) => (n === 1 ? "première" : `${n}ᵉ`);
