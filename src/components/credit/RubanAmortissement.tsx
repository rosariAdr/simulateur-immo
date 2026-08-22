"use client";

import { useRef } from "react";
import type { CreditPlan } from "@/core/credit/plan";
import { formatEuros } from "@/lib/format";

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
    const pas: Record<string, number> = {
      ArrowRight: annee + 1,
      ArrowLeft: annee - 1,
      ArrowUp: annee + 1,
      ArrowDown: annee - 1,
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
        <h2 id="titre-ruban" className="font-titre text-[15px] font-semibold">
          Ruban d&apos;amortissement
        </h2>
        <Legende />
      </div>

      <div className="border border-filet bg-panneau px-3 pb-2 pt-3.5">
        <div
          ref={conteneur}
          role="radiogroup"
          aria-label="Année lue sur le ruban d'amortissement"
          onKeyDown={auClavier}
          // Les barres s'étirent sur toute la hauteur — surtout pas `items-end`.
          // Les segments sont dimensionnés en pourcentage, et un pourcentage de
          // hauteur ne se résout que contre un parent de hauteur définie : avec
          // des barres calées en bas, elles s'ajustent à leur contenu, le contenu
          // s'ajuste à elles, et tout retombe à zéro. C'est `justify-end` sur
          // chaque barre qui pose les segments au sol.
          className="flex h-[154px] gap-[3px]"
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
                className={`flex min-w-0 flex-1 cursor-pointer flex-col justify-end
                            outline-offset-2 focus-visible:outline focus-visible:outline-2
                            focus-visible:outline-accent
                            ${actif ? "outline outline-2 outline-accent" : "hover:opacity-80"}`}
              >
                <span
                  data-part="interets"
                  style={{ height: `${part(a.interest)}%` }}
                  className="block shrink-0 bg-interets"
                />
                <span
                  data-part="assurance"
                  style={{ height: `${part(a.insurance)}%` }}
                  className="block shrink-0 bg-assurance"
                />
                <span
                  data-part="capital"
                  style={{ height: `${part(a.principal)}%` }}
                  className="block shrink-0 bg-capital"
                />
              </button>
            );
          })}
        </div>

        <div className="mt-1.5 flex gap-[3px] border-t border-filet pt-1.5">
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
