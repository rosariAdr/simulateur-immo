"use client";

import type { CreditPlan } from "@/core/credit/plan";
import { toEuros } from "@/core/money";
import { formatEuros, formatPourcentage } from "@/lib/format";
import { Pastille } from "@/components/ui";

/**
 * BANDEAU D'INDICATEURS
 *
 * Cinq chiffres, chacun avec sa légende qualifiante. Le brief interdit le chiffre
 * géant nu : « un chiffre géant sans contexte est une manipulation ».
 *
 * Aucun indicateur n'est peint en couleur pour dire « bien » ou « mal ». Seuls
 * ceux qui franchissent un seuil réglementaire passent en brique — et ils portent
 * alors le seuil en toutes lettres juste dessous.
 */

function Indicateur({
  libelle,
  valeur,
  legende,
  alerte = false,
  explication,
  cle,
}: {
  libelle: string;
  valeur: string;
  legende: string;
  alerte?: boolean;
  explication?: React.ReactNode;
  cle: string;
}) {
  return (
    <div
      data-indicateur={cle}
      data-alerte={alerte ? "oui" : "non"}
      className={`bg-panneau px-3 py-2.5 ${alerte ? "border border-interets" : "border border-filet"}`}
    >
      <p className="mb-1 flex items-center text-[11px] text-encre-secondaire">
        {libelle}
        {explication && <Pastille terme={libelle}>{explication}</Pastille>}
      </p>
      <p
        data-valeur
        className={`font-titre text-[22px] font-semibold tabular-nums tracking-[-0.01em] ${
          alerte ? "text-interets-texte" : "text-encre"
        }`}
      >
        {valeur}
      </p>
      <p className="mt-1 text-[10px] leading-[1.4] text-encre-secondaire">{legende}</p>
    </div>
  );
}

export function BandeauIndicateurs({ plan }: { plan: CreditPlan }) {
  const capital = toEuros(plan.totalPrincipal);
  const partCout = capital > 0 ? (toEuros(plan.totalCreditCost) / capital) * 100 : 0;
  const echelonne = plan.firstPayment !== plan.maxPayment;

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
      <Indicateur
        cle="mensualite"
        libelle="Mensualité"
        valeur={formatEuros(plan.firstPayment)}
        legende={
          echelonne
            ? `elle monte à ${formatEuros(plan.maxPayment)} après le différé`
            : "assurance comprise"
        }
      />

      <Indicateur
        cle="cout"
        libelle="Coût du crédit"
        valeur={formatEuros(plan.totalCreditCost)}
        legende={`${Math.round(partCout)} % du capital emprunté`}
        explication={
          <>
            <strong>Intérêts, assurance, frais et garantie réunis.</strong> Il n&apos;inclut pas les
            frais d&apos;acquisition, qui se paient au notaire et non à la banque.
          </>
        }
      />

      <Indicateur
        cle="taeg"
        libelle="TAEG"
        valeur={formatPourcentage(plan.aprPct)}
        alerte={!plan.usury.compliant}
        legende={
          plan.usury.compliant
            ? `${plan.usury.headroomPoints.toFixed(2).replace(".", ",")} point sous le plafond d'usure`
            : `au-delà du plafond légal de ${formatPourcentage(plan.usury.threshold)}`
        }
        explication={
          <>
            <strong>Le seul taux qui permette de comparer deux offres.</strong> Il réunit le taux
            nominal, l&apos;assurance, les frais et la garantie. Au-delà du plafond d&apos;usure,
            aucune banque n&apos;a le droit de prêter.
          </>
        }
      />

      <Indicateur
        cle="effort"
        libelle="Taux d'effort"
        valeur={formatPourcentage(plan.hcsf.debtRatioPct)}
        alerte={!plan.hcsf.compliant}
        legende={
          plan.hcsf.compliant
            ? `plafond HCSF ${formatPourcentage(plan.hcsf.maxDebtRatioPct)}`
            : `au-delà du plafond HCSF de ${formatPourcentage(plan.hcsf.maxDebtRatioPct)}`
        }
        explication={
          <>
            <strong>La part de vos revenus qui part dans le crédit</strong>, assurance comprise. Le
            plafond s&apos;impose aux banques, pas à vous : elles disposent d&apos;une marge de
            dérogation, prioritairement réservée aux primo-accédants.
          </>
        }
      />

      <Indicateur
        cle="assurance"
        libelle="Coût de l'assurance"
        valeur={formatEuros(plan.totalInsurance)}
        legende={`TAEA ${formatPourcentage(plan.taeaPct)}`}
        explication={
          <>
            <strong>Le TAEA isole ce que coûte l&apos;assurance seule</strong> dans le TAEG. C&apos;est
            lui qu&apos;il faut comparer quand on fait jouer la loi Lemoine.
          </>
        }
      />
    </div>
  );
}
