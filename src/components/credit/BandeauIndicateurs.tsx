"use client";

import type { CreditPlan } from "@/core/credit/plan";
import { toEuros } from "@/core/money";
import { formatEuros, formatPourcentage } from "@/lib/format";
import { premiereMarche } from "@/lib/marche";
import { Pastille } from "@/components/ui";
import { GLOSSAIRE, type Entree } from "@/content/glossaire";

/**
 * BANDEAU D'INDICATEURS
 *
 * Cinq chiffres, chacun avec sa légende qualifiante. Le brief interdit le chiffre
 * géant nu : « un chiffre géant sans contexte est une manipulation ».
 *
 * Aucun indicateur n'est peint en couleur pour dire « bien » ou « mal ». Seuls
 * ceux qui franchissent un seuil réglementaire passent en brique — et ils portent
 * alors le seuil en toutes lettres juste dessous.
 *
 * LE NOMBRE DE COLONNES SE DÉDUIT, IL NE SE DÉCRÈTE PAS — `UI-006`. Le bandeau
 * passait de cinq colonnes à deux sur un point de rupture de fenêtre, et le
 * point de rupture ne savait rien de la largeur réellement disponible : dans la
 * colonne de résultats d'un écran de 1 024 px, les cinq cartes tombaient à
 * 120 px et trois montants sur cinq débordaient de leur carte — « 281 636,97 € »
 * de 34 px. Le défaut ne se voyait ni à 1 280 px ni à 412 px, les deux seules
 * largeurs mesurées. `auto-fit` sur un minimum de 165 px règle la question par
 * construction : la carte ne descend jamais sous la largeur du plus large
 * montant du jeu de référence, quelle que soit la fenêtre.
 *
 * Le compte de colonnes des deux profils de test est inchangé — cinq à 1 280 px,
 * deux sur Pixel 7 —, mais il est maintenant conclu et non supposé.
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
  explication?: Entree;
  cle: string;
}) {
  return (
    <div
      data-indicateur={cle}
      data-alerte={alerte ? "oui" : "non"}
      className={`bg-panneau px-3 py-2.5 ${alerte ? "border border-interets" : "border border-filet"}`}
    >
      {/*
        Le libellé et la légende montent d'un point sous 1 024 px. Ce n'est pas
        la largeur de la carte qui le commande — elle est la même qu'au bureau —
        mais la distance de lecture : le même dessin tenu à bout de bras sur un
        écran de six pouces. Le chiffre, lui, ne bouge pas : il est déjà le plus
        gros élément de la carte, et le grossir le ferait déborder.
      */}
      <p className="mb-1 flex items-center text-[12px] text-encre-secondaire lg:text-[11px]">
        {libelle}
        {explication && <Pastille entree={explication} terme={libelle} />}
      </p>
      <p
        data-valeur
        className={`font-titre text-[22px] font-semibold tabular-nums tracking-[-0.01em] ${
          alerte ? "text-interets-texte" : "text-encre"
        }`}
      >
        {valeur}
      </p>
      <p className="mt-1 text-[11px] leading-[1.45] text-encre-secondaire lg:text-[10px] lg:leading-[1.4]">
        {legende}
      </p>
    </div>
  );
}

export function BandeauIndicateurs({ plan }: { plan: CreditPlan }) {
  const capital = toEuros(plan.totalPrincipal);
  const partCout = capital > 0 ? (toEuros(plan.totalCreditCost) / capital) * 100 : 0;
  const marche = premiereMarche(plan.rows);

  return (
    <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(165px,1fr))]">
      <Indicateur
        cle="mensualite"
        libelle="Mensualité"
        valeur={formatEuros(plan.firstPayment)}
        legende={
          marche
            ? `elle monte à ${formatEuros(marche.payment)} au mois ${marche.month}`
            : "assurance comprise"
        }
        explication={GLOSSAIRE.mensualite}
      />

      <Indicateur
        cle="cout"
        libelle="Coût du crédit"
        valeur={formatEuros(plan.totalCreditCost)}
        legende={`${Math.round(partCout)} % du capital emprunté`}
        explication={GLOSSAIRE.coutDuCredit}
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
        explication={GLOSSAIRE.taeg}
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
        explication={GLOSSAIRE.tauxEffort}
      />

      <Indicateur
        cle="assurance"
        libelle="Coût de l'assurance"
        valeur={formatEuros(plan.totalInsurance)}
        legende={`TAEA ${formatPourcentage(plan.taeaPct)}`}
        explication={GLOSSAIRE.taea}
      />
    </div>
  );
}
