"use client";

import { useEffect, useRef, useState } from "react";
import type { CreditPlan } from "@/core/credit/plan";
import { formatEuros } from "@/lib/format";

/**
 * TABLEAU D'AMORTISSEMENT — `VIZ-002`
 *
 * L'agrégation annuelle est celle du moteur (`plan.annual`), pas une somme
 * refaite ici : deux additions des mêmes centimes finiraient par diverger d'un
 * arrondi, et c'est le genre d'écart qu'un comparateur repère et qu'il ne
 * pardonne pas.
 *
 * La vue mensuelle affiche les trois cents échéances, sans pagination. Elle
 * s'adresse à celui qui veut vérifier ligne à ligne ; le paginer reviendrait à
 * lui demander de faire confiance page après page.
 *
 * La granularité est un état de lecture, pas un paramètre de scénario : elle ne
 * part pas dans l'URL. Un lien partagé décrit un crédit, pas la façon dont on le
 * regardait au moment de le copier.
 */

type Granularite = "annee" | "mois";

interface Props {
  readonly plan: CreditPlan;
  /** Année portée par le curseur du ruban. La ligne correspondante est marquée. */
  readonly annee: number;
  readonly onAnnee: (annee: number) => void;
}

export function TableauAmortissement({ plan, annee, onAnnee }: Props) {
  const [granularite, setGranularite] = useState<Granularite>("annee");
  const corps = useRef<HTMLDivElement>(null);

  // La vue mensuelle défile jusqu'à l'année lue : passer d'une vue à l'autre ne
  // doit pas faire perdre l'endroit qu'on regardait.
  //
  // `nearest` et non `center` : si la ligne est déjà sous les yeux, rien ne
  // bouge. Cliquer une ligne visible du tableau ne doit pas dérober le tableau
  // à celui qui vient de le pointer.
  useEffect(() => {
    if (granularite !== "mois") return;
    corps.current?.querySelector<HTMLElement>('[data-debut-annee="oui"]')?.scrollIntoView({
      block: "nearest",
    });
  }, [granularite, annee]);

  return (
    <section aria-labelledby="titre-tableau">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="titre-tableau" className="font-titre text-[15px] font-semibold">
          Tableau d&apos;amortissement
        </h2>
        <div role="radiogroup" aria-label="Granularité du tableau" className="flex border border-filet">
          {(
            [
              { valeur: "annee", libelle: "par année" },
              { valeur: "mois", libelle: "par mois" },
            ] as const
          ).map((o) => {
            const actif = granularite === o.valeur;
            return (
              <button
                key={o.valeur}
                type="button"
                role="radio"
                aria-checked={actif}
                tabIndex={actif ? 0 : -1}
                data-granularite={o.valeur}
                onClick={() => setGranularite(o.valeur)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  setGranularite(granularite === "annee" ? "mois" : "annee");
                }}
                className={`px-2.5 py-1 text-[11px] transition-colors
                            focus-visible:outline focus-visible:outline-2
                            focus-visible:-outline-offset-2 focus-visible:outline-accent
                            ${
                              actif
                                ? "bg-encre text-papier"
                                : "bg-panneau text-encre-secondaire hover:bg-survol-fond hover:text-encre"
                            }`}
              >
                {o.libelle}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={corps}
        data-tableau={granularite}
        className={`border border-filet bg-panneau ${granularite === "mois" ? "max-h-[420px] overflow-y-auto" : ""}`}
      >
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">
            {granularite === "annee"
              ? "Amortissement agrégé par année : intérêts, capital, assurance, total versé et capital restant dû."
              : "Amortissement échéance par échéance : intérêts, capital, assurance, total versé et capital restant dû."}
          </caption>
          <thead className="sticky top-0 bg-panneau">
            <tr className="border-b border-filet">
              <th scope="col" className="w-[64px] px-2.5 py-1.5 text-left text-[11px] font-normal text-encre-secondaire">
                {granularite === "annee" ? "Année" : "Mois"}
              </th>
              <Entete>Intérêts</Entete>
              <Entete>Capital</Entete>
              <Entete>Assurance</Entete>
              <Entete>Total versé</Entete>
              <Entete>Restant dû</Entete>
            </tr>
          </thead>
          <tbody>
            {granularite === "annee"
              ? plan.annual.map((a) => (
                  <Ligne
                    key={a.year}
                    repere={String(a.year)}
                    ligne={a}
                    restant={a.closingBalance}
                    marquee={a.year === annee}
                    onClick={() => onAnnee(a.year)}
                  />
                ))
              : plan.rows.map((r) => (
                  <Ligne
                    key={r.month}
                    repere={String(r.month)}
                    ligne={r}
                    restant={r.balance}
                    marquee={r.year === annee}
                    debutAnnee={r.year === annee && r.month === (annee - 1) * 12 + 1}
                    onClick={() => onAnnee(r.year)}
                  />
                ))}
          </tbody>
        </table>
      </div>

      <NoteDerniereEcheance plan={plan} />
    </section>
  );
}

function Entete({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-2.5 py-1.5 text-right text-[11px] font-normal text-encre-secondaire">
      {children}
    </th>
  );
}

interface LigneChiffres {
  readonly interest: number;
  readonly principal: number;
  readonly insurance: number;
  readonly payment: number;
}

/**
 * Une ligne est cliquable : elle ramène le curseur du ruban sur son année. Les
 * deux vues portent le même curseur, sinon elles ne se lisent pas ensemble.
 */
function Ligne({
  repere,
  ligne,
  restant,
  marquee,
  debutAnnee = false,
  onClick,
}: {
  repere: string;
  ligne: LigneChiffres;
  restant: number;
  marquee: boolean;
  debutAnnee?: boolean;
  onClick: () => void;
}) {
  return (
    <tr
      data-ligne={repere}
      data-marquee={marquee ? "oui" : "non"}
      data-debut-annee={debutAnnee ? "oui" : "non"}
      onClick={onClick}
      className={`cursor-pointer ${marquee ? "bg-survol-fond" : "hover:bg-survol-fond"}`}
    >
      <td className="px-2.5 py-1 font-mono text-[12px] tabular-nums">{repere}</td>
      <Cellule classe="text-interets-texte">{formatEuros(ligne.interest)}</Cellule>
      <Cellule classe="text-capital-texte">{formatEuros(ligne.principal)}</Cellule>
      <Cellule classe="text-assurance-texte">{formatEuros(ligne.insurance)}</Cellule>
      <Cellule>{formatEuros(ligne.payment)}</Cellule>
      <Cellule>{formatEuros(restant)}</Cellule>
    </tr>
  );
}

function Cellule({ children, classe = "" }: { children: React.ReactNode; classe?: string }) {
  return <td className={`px-2.5 py-1 text-right font-mono text-[12px] tabular-nums ${classe}`}>{children}</td>;
}

/**
 * L'écart de la dernière échéance.
 *
 * Il n'est ni annoncé ni chiffré à l'avance : on compare ce que le moteur a
 * réellement produit. La phrase ne s'affiche que si les échéances précédentes
 * sont bien constantes — avec une assurance assise sur le capital restant dû,
 * elles décroissent toutes, et parler d'un écart final n'aurait pas de sens.
 */
function NoteDerniereEcheance({ plan }: { plan: CreditPlan }) {
  const n = plan.rows.length;
  if (n < 3) return null;
  const derniere = plan.rows[n - 1];
  const avant = plan.rows[n - 2];
  const encoreAvant = plan.rows[n - 3];
  if (!derniere || !avant || !encoreAvant) return null;
  if (avant.payment !== encoreAvant.payment) return null;

  const ecart = derniere.payment - avant.payment;
  if (ecart === 0) return null;

  return (
    <p data-note-derniere className="mt-2 max-w-[88ch] text-[11px] leading-[1.5] text-encre-secondaire">
      La dernière échéance est {ecart > 0 ? "supérieure" : "inférieure"} de {formatEuros(Math.abs(ecart))} aux
      précédentes : elle solde exactement le capital restant dû. C&apos;est attendu, et c&apos;est vérifié par
      un test du moteur.
    </p>
  );
}
