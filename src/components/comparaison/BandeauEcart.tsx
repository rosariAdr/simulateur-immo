"use client";

import type { AnneeDetention } from "@/core/compare/types";
import { formatEuros } from "@/lib/format";
import { DESCRIPTION_LECTURE, type Lecture } from "@/lib/comparaison";

/**
 * BANDEAU D'ÉCART — `VIZ-003`
 *
 * Où en est la différence, à l'année qu'on regarde. Quatre chiffres, chacun
 * accompagné de sa légende qualifiante : le brief interdit le chiffre géant nu,
 * « un chiffre géant sans contexte est une manipulation ».
 *
 * ═══ L'ÉCART N'A PAS DE SIGNE FAVORABLE ═══
 *
 * Le montant est affiché en valeur absolue et sa légende dit dans quel sens il
 * penche — « de plus » ou « de moins », côté propriétaire. Aucune des deux
 * directions n'est peinte en vert ni en brique, et aucune ne porte de flèche
 * montante ou descendante : un écart n'est pas une performance. Le produit
 * calcule, l'utilisateur décide (`docs/CONTEXT.md` §8).
 *
 * La brique et le bleu n'apparaissent ici que sur les pastilles qui identifient
 * les deux camps, jamais sur le montant lui-même : la charte demande que le
 * texte porte des jetons de texte et que la couleur suive l'entité.
 *
 * ═══ LE QUATRIÈME CHIFFRE ═══
 *
 * « Dont capital remboursé » n'est pas un ornement : c'est la quantité que la
 * lecture « décaissement » compte comme dépensée et que la lecture « fonds
 * perdus » retire. La donner à côté de l'écart permet de refaire le calcul de
 * tête, dans les deux sens, sans changer de lecture.
 *
 * ⚠️ Ce n'est PAS un patrimoine, et le libellé ne le laisse pas croire : le bien
 * peut valoir moins que son prix d'achat, et cette somme ignore l'appréciation
 * comme les frais de revente. Le type du moteur porte le même avertissement sur
 * `capitalConstitue`.
 */

interface Props {
  readonly annee: AnneeDetention;
  readonly lecture: Lecture;
}

function Carte({
  cle,
  libelle,
  valeur,
  legende,
  pastille,
}: {
  cle: string;
  libelle: string;
  valeur: string;
  legende: string;
  pastille?: string;
}) {
  return (
    <div data-chiffre={cle} className="border border-filet bg-panneau px-3 py-2.5">
      <p className="mb-1 flex items-center gap-1.5 text-[12px] text-encre-secondaire lg:text-[11px]">
        {pastille && <span className={`inline-block h-2.5 w-2.5 shrink-0 ${pastille}`} aria-hidden="true" />}
        {libelle}
      </p>
      <p
        data-valeur
        className="font-titre text-[20px] font-semibold tabular-nums tracking-[-0.01em] text-encre"
      >
        {valeur}
      </p>
      <p className="mt-1 text-[11px] leading-[1.45] text-encre-secondaire lg:text-[10px] lg:leading-[1.4]">
        {legende}
      </p>
    </div>
  );
}

export function BandeauEcart({ annee, lecture }: Props) {
  const decaissement = lecture === "decaissement";
  const cumulProprietaire = decaissement
    ? annee.proprietaire.cumulDecaissement
    : annee.proprietaire.cumulFondsPerdus;
  const cumulLocataire = decaissement
    ? annee.locataire.cumulDecaissement
    : annee.locataire.cumulFondsPerdus;
  const ecart = decaissement ? annee.ecartCumulDecaissement : annee.ecartCumulFondsPerdus;

  // Ce que le décaissement compte et que les fonds perdus retirent, au cumul.
  const capital = annee.proprietaire.cumulDecaissement - annee.proprietaire.cumulFondsPerdus;

  const verbe = decaissement ? "décaissé" : "consommé";
  const sens =
    ecart === 0
      ? "les deux cumuls sont égaux à cette année"
      : ecart > 0
        ? `de plus ${verbe} par le propriétaire depuis le début`
        : `de moins ${verbe} par le propriétaire depuis le début`;

  return (
    <div
      data-ecart
      role="status"
      className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]"
    >
      <Carte
        cle="ecart"
        libelle={`Écart à l'année ${annee.annee}`}
        valeur={formatEuros(Math.abs(ecart))}
        legende={sens}
      />
      <Carte
        cle="proprietaire"
        libelle="Propriétaire, cumul"
        valeur={formatEuros(cumulProprietaire)}
        legende={DESCRIPTION_LECTURE[lecture].libelle.toLowerCase()}
        pastille="bg-interets"
      />
      <Carte
        cle="locataire"
        libelle="Locataire, cumul"
        valeur={formatEuros(cumulLocataire)}
        legende="tout ce qu'il verse est consommé, dans les deux lectures"
        pastille="bg-marches"
      />
      <Carte
        cle="capital"
        libelle="Dont capital remboursé"
        valeur={formatEuros(capital)}
        legende="sorti du compte sans être consommé — ce n'est pas un patrimoine, l'appréciation et les frais de revente ne sont pas comptés"
        pastille="bg-capital"
      />
    </div>
  );
}
