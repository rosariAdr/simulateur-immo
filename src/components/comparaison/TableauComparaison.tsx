"use client";

import type { AnneeDetention } from "@/core/compare/types";
import { formatEuros } from "@/lib/format";
import { DESCRIPTION_LECTURE, type Lecture } from "@/lib/comparaison";

/**
 * TABLEAU ANNUEL DE LA COMPARAISON — `VIZ-003`
 *
 * Le graphique montre la forme, le tableau donne les nombres. Ce n'est pas un
 * doublon : « expliquer d'où vient chaque chiffre » suppose qu'on puisse lire le
 * chiffre, et une courbe ne se lit pas au centime. C'est aussi l'équivalent
 * accessible du graphique — un lecteur d'écran y trouve la série entière, en
 * ordre, avec ses en-têtes.
 *
 * Les lignes sont cliquables et déplacent le curseur de lecture, comme le
 * tableau d'amortissement du module crédit : les deux vues partagent une seule
 * année lue, jamais deux.
 *
 * La colonne « dont capital remboursé » est présente dans les DEUX lectures.
 * C'est la quantité qui sépare l'une de l'autre : la retirer en fonds perdus
 * aurait fait disparaître de la table le nombre qui explique pourquoi les deux
 * colonnes voisines ont changé.
 *
 * Le tableau est plus large qu'un téléphone. Il défile **dans son cadre**, et la
 * page ne défile pas : c'est le motif retenu par la fiche pédagogique, et un test
 * le vérifie.
 */

interface Props {
  readonly annees: readonly AnneeDetention[];
  readonly lecture: Lecture;
  readonly annee: number;
  readonly onAnnee: (annee: number) => void;
}

export function TableauComparaison({ annees, lecture, annee, onAnnee }: Props) {
  const decaissement = lecture === "decaissement";
  const libelle = DESCRIPTION_LECTURE[lecture].libelle.toLowerCase();

  return (
    <section aria-labelledby="titre-tableau" className="min-w-0">
      <h2 id="titre-tableau" className="mb-2 font-titre text-[15px] font-semibold">
        Année par année, en {libelle}
      </h2>

      <div className="overflow-x-auto border border-filet">
        <table data-tableau="comparaison" className="w-full min-w-[520px] border-collapse text-[12px]">
          <caption className="sr-only">
            Cumuls du propriétaire et du locataire depuis le début, en {libelle}, année par année.
          </caption>
          <thead>
            <tr className="border-b border-filet bg-survol-fond text-left">
              <th scope="col" className="px-2.5 py-1.5 font-medium text-encre-secondaire">
                Année
              </th>
              <th scope="col" className="px-2.5 py-1.5 text-right font-medium text-encre-secondaire">
                Propriétaire
              </th>
              <th scope="col" className="px-2.5 py-1.5 text-right font-medium text-encre-secondaire">
                Dont capital remboursé
              </th>
              <th scope="col" className="px-2.5 py-1.5 text-right font-medium text-encre-secondaire">
                Locataire
              </th>
              <th scope="col" className="px-2.5 py-1.5 text-right font-medium text-encre-secondaire">
                Écart
              </th>
            </tr>
          </thead>
          <tbody>
            {annees.map((a) => {
              const pro = decaissement
                ? a.proprietaire.cumulDecaissement
                : a.proprietaire.cumulFondsPerdus;
              const loc = decaissement
                ? a.locataire.cumulDecaissement
                : a.locataire.cumulFondsPerdus;
              const ecart = decaissement ? a.ecartCumulDecaissement : a.ecartCumulFondsPerdus;
              const capital =
                a.proprietaire.cumulDecaissement - a.proprietaire.cumulFondsPerdus;
              const marquee = a.annee === annee;

              return (
                <tr
                  key={a.annee}
                  data-ligne={a.annee}
                  data-marquee={marquee ? "oui" : "non"}
                  onClick={() => onAnnee(a.annee)}
                  className={`cursor-pointer border-b border-filet-grille last:border-b-0 ${
                    marquee ? "bg-survol-fond" : "hover:bg-survol-fond"
                  }`}
                >
                  <th
                    scope="row"
                    className="px-2.5 py-1 text-left font-mono text-[11px] font-normal tabular-nums text-encre-secondaire"
                  >
                    {a.annee}
                  </th>
                  <td className="px-2.5 py-1 text-right font-mono tabular-nums">{formatEuros(pro)}</td>
                  <td className="px-2.5 py-1 text-right font-mono tabular-nums text-encre-secondaire">
                    {formatEuros(capital)}
                  </td>
                  <td className="px-2.5 py-1 text-right font-mono tabular-nums">{formatEuros(loc)}</td>
                  <td className="px-2.5 py-1 text-right font-mono tabular-nums">
                    {/* Le signe est écrit, pas suggéré par une couleur : « + »
                        pour ce que le propriétaire a versé en plus, « − » pour ce
                        qu'il a versé en moins. */}
                    {ecart === 0 ? "" : ecart > 0 ? "+ " : "− "}
                    {formatEuros(Math.abs(ecart))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
