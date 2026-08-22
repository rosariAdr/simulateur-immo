"use client";

import Link from "next/link";
import { useState } from "react";
import { formatEuros, formatPourcentage } from "@/lib/format";
import { BandeauIndicateurs } from "./BandeauIndicateurs";
import { PanneauParametres } from "./PanneauParametres";
import { RubanAmortissement } from "./RubanAmortissement";
import { TableauAmortissement } from "./TableauAmortissement";
import { useScenario } from "./useScenario";

/**
 * MODULE CRÉDIT — l'écran de référence
 *
 * Saisie à gauche, résultat à droite, comme le veut le brief §6. Le résultat
 * réagit immédiatement : aucun bouton « calculer », aucune animation d'attente.
 *
 * SUR UN ÉCRAN ÉTROIT, LE VERDICT PASSE DEVANT — `UI-006`. Les deux colonnes
 * s'empilaient dans l'ordre du DOM : dix champs de saisie, puis les chiffres. Il
 * fallait donc traverser tout le formulaire pour voir la première mensualité,
 * alors qu'elle est déjà calculée à l'arrivée — le scénario par défaut est
 * complet. L'ordre du document est désormais « ce que ça donne, ce qui le
 * produit, le détail », et c'est la grille de bureau qui replace le panneau à
 * gauche par un placement explicite.
 *
 * Le bandeau et l'alerte de dépassement voyagent ensemble : l'alerte explique
 * l'indicateur qu'elle a fait passer en brique, les séparer les rendrait tous
 * les deux muets.
 *
 * L'ordre de tabulation suit le document et non le dessin. Il reste cohérent
 * dans les deux cas — on lit un résumé avant de le modifier — et c'est le prix
 * à payer pour hisser le résumé sans le dupliquer. Une seconde copie du bandeau
 * cachée par média serait deux `role="status"` pour un seul chiffre.
 */
export function ModuleCredit() {
  const { scenario, definir, plan, params } = useScenario();
  const [copie, setCopie] = useState(false);
  const [anneeChoisie, setAnneeChoisie] = useState<number | null>(null);

  const conforme = plan.usury.compliant && plan.hcsf.compliant;

  // Le curseur de lecture ouvre sur l'année où le crédit bascule — celle où
  // l'échéance rembourse enfin plus de capital qu'elle ne paie d'intérêts.
  // C'est le seul moment que le ruban existe pour montrer ; l'ouvrir sur la
  // première année reviendrait à faire chercher.
  const anneeBascule = plan.crossoverMonth !== null ? Math.ceil(plan.crossoverMonth / 12) : 1;
  const dernier = plan.annual.length;
  // Bornée à chaque rendu plutôt que réinitialisée par un effet : raccourcir la
  // durée ne doit pas laisser le curseur pointer une année qui n'existe plus.
  const annee = Math.min(Math.max(anneeChoisie ?? anneeBascule, 1), Math.max(dernier, 1));

  return (
    <div className="min-h-full bg-papier px-6 py-6 text-encre lg:px-8">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-filet pb-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-titre text-[21px] font-bold tracking-[-0.022em]">
            Votre crédit, échéance par échéance
          </h1>
          <p className="text-[12px] text-encre-secondaire">
            {formatEuros(plan.totalPrincipal)} sur {Math.round(scenario.dureeMois / 12)} ans
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-encre-secondaire">
            Barèmes du {plan.usury.quarter.replace("-T", ", trimestre ")}
          </span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
              setCopie(true);
              window.setTimeout(() => setCopie(false), 2200);
            }}
            className="border border-accent px-2.5 py-1 text-[12px] text-accent transition-colors
                       hover:bg-survol-fond focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copie ? "Lien copié" : "Copier le lien de ce scénario"}
          </button>
        </div>
      </header>

      <div
        className="grid grid-cols-1 gap-5
                   lg:grid-cols-[296px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-6"
      >
        <div className="flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-1">
          <BandeauIndicateurs plan={plan} />

          {!conforme && (
            <div
              data-non-conforme
              role="status"
              className="border border-l-4 border-interets bg-panneau px-3.5 py-3"
            >
              {!plan.hcsf.compliant && (
                <p className="mb-2 text-[13px] leading-[1.55] last:mb-0">
                  <strong className="font-semibold">
                    Taux d&apos;effort au-delà du plafond de{" "}
                    {formatPourcentage(plan.hcsf.maxDebtRatioPct)}.
                  </strong>{" "}
                  Ce plafond s&apos;impose aux banques, pas à vous. Elles disposent d&apos;une marge
                  de dérogation portant sur {formatPourcentage(plan.hcsf.flexibilityMarginPct)} de
                  leur production trimestrielle, prioritairement réservée à la résidence principale
                  et aux primo-accédants.
                </p>
              )}
              {!plan.usury.compliant && (
                <p className="text-[13px] leading-[1.55]">
                  <strong className="font-semibold">
                    TAEG au-delà du plafond d&apos;usure de{" "}
                    {formatPourcentage(plan.usury.threshold)}.
                  </strong>{" "}
                  Ce n&apos;est pas une négociation : aucune banque n&apos;a le droit de prêter
                  au-delà. Regardez d&apos;abord l&apos;assurance, qui pèse souvent plus que le taux
                  nominal dans ce dépassement.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <PanneauParametres
            scenario={scenario}
            definir={definir}
            seuilUsure={plan.usury.threshold}
            params={params}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-2">
          <section className="border border-filet bg-panneau px-3.5 py-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
              Répartition de ce que vous verserez
            </p>
            <Repartition plan={plan} />
          </section>

          <RubanAmortissement plan={plan} annee={annee} onAnnee={setAnneeChoisie} />

          <TableauAmortissement plan={plan} annee={annee} onAnnee={setAnneeChoisie} />

          <section className="border-t border-filet pt-3">
            <p className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
              Ce que ce calcul ne dit pas
            </p>
            <p className="max-w-[88ch] text-[12px] leading-[1.6]">
              Il ignore les frais d&apos;acquisition, la taxe foncière, les charges de copropriété et
              l&apos;entretien. Il suppose votre taux figé sur toute la durée, ce qu&apos;il est, et
              vos revenus stables, ce qu&apos;ils ne sont pas. Il ne dit pas si acheter vaut mieux
              que louer : c&apos;est un autre module, et sa réponse dépend d&apos;hypothèses que vous
              poserez vous-même.
            </p>
            {/*
              Le chemin vers la fiche longue — `CNT-002`. La bulle « i » donne la
              définition, la fiche donne le raisonnement : voir docs/06-design-system.md §8.
            */}
            <p className="mt-2.5 text-[12px] leading-[1.6]">
              <Link
                href="/credit/comprendre"
                data-vers-fiche
                className="text-accent underline underline-offset-2 hover:text-accent-survol
                           focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Comprendre un crédit immobilier
              </Link>{" "}
              — la fiche qui explique la mensualité, le TAEG, l&apos;assurance, les garanties et les
              deux plafonds.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Barre empilée : capital, intérêts, assurance et frais, à l'échelle. */
function Repartition({ plan }: { plan: ReturnType<typeof useScenario>["plan"] }) {
  const frais = plan.upfrontFees + plan.guarantee.cost;
  const total = plan.totalPrincipal + plan.totalInterest + plan.totalInsurance + frais;
  const part = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const postes = [
    { cle: "capital", libelle: "Capital", valeur: plan.totalPrincipal, fond: "bg-capital", texte: "text-capital-texte" },
    { cle: "interets", libelle: "Intérêts", valeur: plan.totalInterest, fond: "bg-interets", texte: "text-interets-texte" },
    { cle: "assurance", libelle: "Assurance", valeur: plan.totalInsurance, fond: "bg-assurance", texte: "text-assurance-texte" },
    { cle: "frais", libelle: "Frais et garantie", valeur: frais, fond: "bg-encre-secondaire", texte: "text-encre-secondaire" },
  ] as const;

  return (
    <>
      <div className="flex h-8 gap-0.5">
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
      <dl className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5">
        {postes.map((p) => (
          <div key={p.cle} className="flex items-baseline gap-2">
            <span className={`inline-block h-2.5 w-2.5 shrink-0 ${p.fond}`} aria-hidden="true" />
            <dt className="text-[11px] text-encre-secondaire">{p.libelle}</dt>
            <dd className={`font-mono text-[12px] tabular-nums ${p.texte}`}>{formatEuros(p.valeur)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
