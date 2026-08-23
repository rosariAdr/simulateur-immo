"use client";

import type { Cents } from "@/core/money";
import { formatEuros } from "@/lib/format";
import type { AnneePatrimoine } from "@/lib/patrimoine";

/**
 * LE RETOURNEMENT — `UI-007`
 *
 * ═══ CE QUE CE BLOC EXISTE POUR FAIRE VOIR ═══
 *
 * Le niveau simple compare des **dépenses** et répond « le propriétaire a sorti
 * tant de plus de son compte ». Le niveau approfondi compare des **patrimoines**
 * et répond « à l'arrivée, il lui reste tant de plus — ou tant de moins ». Sur
 * le scénario d'ouverture, les deux phrases portent sur le même ménage, la même
 * année, le même horizon, et **penchent en sens contraire**.
 *
 * Le retournement ne se produit donc ni dans un graphique, ni dans une phrase :
 * il se produit **entre deux lignes posées l'une sous l'autre**, dans la même
 * unité et à la même année. C'est la seule disposition où le lecteur ne peut pas
 * lire l'une sans l'autre, et c'est ce que ce bloc est.
 *
 * Trois formes ont été écartées avant celle-ci.
 *
 *   Deux écrans, l'un après l'autre. Le retournement suppose de se souvenir du
 *   premier chiffre ; on ne s'en souvient pas, on se souvient de sa conclusion.
 *   Une flèche « avant / après » entre deux gros nombres. Elle raconte un
 *   progrès, donc elle désigne un vainqueur — précisément ce qui est interdit.
 *   Une seule ligne « écart réel », le niveau simple étant présenté comme une
 *   erreur corrigée. Faux : le décaissement n'est pas une erreur, c'est le
 *   chiffre qui décide si le budget passe le mois prochain. Les deux restent.
 *
 * ═══ ET CE QU'IL SE REFUSE À FAIRE ═══
 *
 * Aucun des deux énoncés n'est appelé le bon. Aucun n'est peint en vert ni en
 * brique — les pastilles identifient les deux ménages, jamais une performance —
 * et aucune flèche ne monte. La dernière ligne dit ce qu'aucun calcul ne peut
 * dire : lequel des deux chiffres compte pour le lecteur.
 *
 * ═══ LA TROISIÈME LIGNE, QUI EST PEUT-ÊTRE LA PLUS UTILE ═══
 *
 * L'écart entre les deux patrimoines est confronté à **l'incertitude qui pèse
 * sur chacun d'eux**. Sur le scénario d'ouverture, l'écart vaut 36 031 € quand
 * le patrimoine du propriétaire va de 107 570 € à 632 988 € et celui du
 * locataire de 85 968 € à 507 980 € sur le seul intervalle d'hypothèses observé.
 * Le dire est la stricte application de « ne jamais afficher une précision
 * qu'on n'a pas » (`docs/CONTEXT.md` §7).
 */

interface Props {
  readonly annee: AnneePatrimoine;
  /** Écart de cumul de décaissement à cette même année — le chiffre du niveau simple. */
  readonly ecartDecaissement: Cents;
  readonly horizonAnnees: number;
  /** Motif du refus de forfait, quand l'année n'est pas chiffrable. */
  readonly motifForfait: string | null;
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
    <div data-chiffre={cle} className="min-w-0 border border-filet bg-panneau px-3 py-2.5">
      <p className="mb-1 flex items-center gap-1.5 text-[12px] text-encre-secondaire lg:text-[11px]">
        {pastille && (
          <span className={`inline-block h-2.5 w-2.5 shrink-0 ${pastille}`} aria-hidden="true" />
        )}
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

/** « de plus » ou « de moins », côté propriétaire. Jamais « mieux » ni « moins bien ». */
function sens(ecart: Cents, verbe: string): string {
  if (ecart === 0) return `les deux montants sont égaux ${verbe}`;
  return ecart > 0 ? `de plus ${verbe}` : `de moins ${verbe}`;
}

export function BandeauBascule({ annee, ecartDecaissement, horizonAnnees, motifForfait }: Props) {
  const chiffrable = annee.proprietaire !== null && annee.ecart !== null;

  return (
    <div data-bascule role="status" className="min-w-0">
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <Carte
          cle="ecart-simple"
          libelle={`Niveau simple, année ${annee.annee}`}
          valeur={formatEuros(Math.abs(ecartDecaissement))}
          legende={`${sens(ecartDecaissement, "sorti du compte du propriétaire depuis le début")} — c'est ce que compare la page précédente`}
        />
        <Carte
          cle="ecart-patrimonial"
          libelle={`Niveau approfondi, année ${annee.annee}`}
          valeur={chiffrable ? formatEuros(Math.abs(annee.ecart as Cents)) : "non chiffré"}
          legende={
            chiffrable
              ? `${sens(annee.ecart as Cents, "dans les mains du propriétaire s'il vend cette année-là")} — après remboursement du prêt, frais de vente et impôt`
              : "la description de la cession retenue n'est pas chiffrable à cette durée de détention"
          }
        />
        <Carte
          cle="proprietaire"
          libelle="Propriétaire, s'il vend"
          valeur={chiffrable ? formatEuros(annee.proprietaire as Cents) : "non chiffré"}
          legende="produit net de la vente : prix apprécié, moins la commission, le capital restant dû, l'indemnité, la mainlevée et l'impôt, plus la restitution du fonds de garantie"
          pastille="bg-capital"
        />
        <Carte
          cle="locataire"
          libelle="Locataire, portefeuille"
          valeur={formatEuros(annee.locataire)}
          legende="apport placé, puis l'écart de coût versé chaque mois, capitalisé au rendement retenu"
          pastille="bg-marches"
        />
      </div>

      <p data-retournement className="mt-2.5 max-w-[96ch] text-[12px] leading-[1.55]">
        {chiffrable ? (
          <>
            Les deux premiers montants portent sur le même ménage et sur la même année. Ils ne
            disent pas la même chose parce qu&apos;ils ne comptent pas la même chose : le premier
            compte ce qui est sorti du compte, le second ce qu&apos;il reste une fois tout soldé.
            Aucun des deux n&apos;est le bon chiffre — le premier décide si le budget passe le mois
            prochain, le second dit ce qui a été construit. Lequel compte pour vous ne se calcule
            pas.
          </>
        ) : (
          <>
            L&apos;année {annee.annee} n&apos;est pas chiffrée sous la description de cession
            retenue{motifForfait === null ? "" : ` : ${motifForfait}`}. Le montant du niveau simple,
            lui, ne dépend d&apos;aucune hypothèse fiscale et reste lisible.
          </>
        )}
      </p>

      {chiffrable && annee.proprietaireIntervalle !== null && (
        <p data-incertitude className="mt-2 max-w-[96ch] text-[12px] leading-[1.55] text-encre-secondaire">
          Sur le seul intervalle d&apos;hypothèses relevé, ce même patrimoine de propriétaire va de{" "}
          <span data-borne="proprietaire-bas" className="font-mono tabular-nums">
            {formatEuros(annee.proprietaireIntervalle[0])}
          </span>{" "}
          à{" "}
          <span data-borne="proprietaire-haut" className="font-mono tabular-nums">
            {formatEuros(annee.proprietaireIntervalle[1])}
          </span>
          , et le portefeuille du locataire de{" "}
          <span data-borne="locataire-bas" className="font-mono tabular-nums">
            {formatEuros(annee.locataireIntervalle[0])}
          </span>{" "}
          à{" "}
          <span data-borne="locataire-haut" className="font-mono tabular-nums">
            {formatEuros(annee.locataireIntervalle[1])}
          </span>
          .{" "}
          {seRecouvrent(annee)
            ? "Les deux fourchettes se recouvrent : à l'année lue, le choix des deux hypothèses pèse plus lourd que l'écart entre les deux options."
            : "Les deux fourchettes ne se recouvrent pas à l'année lue : sur tout l'intervalle observé, l'écart garde le même sens."}{" "}
          L&apos;horizon projeté est de {horizonAnnees} ans, et rien de ce qui précède ne dit ce
          que vaudra le bien : personne ne le sait.
        </p>
      )}
    </div>
  );
}

/**
 * Les deux fourchettes ont-elles un point commun ?
 *
 * Question posée sur les **intervalles**, pas sur les points retenus : c'est
 * l'incertitude déclarée qu'on confronte à l'écart, et non deux hypothèses
 * choisies l'une contre l'autre.
 */
function seRecouvrent(a: AnneePatrimoine): boolean {
  if (a.proprietaireIntervalle === null) return false;
  const [pBas, pHaut] = a.proprietaireIntervalle;
  const [lBas, lHaut] = a.locataireIntervalle;
  return Math.max(pBas, lBas) <= Math.min(pHaut, lHaut);
}
