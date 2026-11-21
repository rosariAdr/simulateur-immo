"use client";

import type { CessionChiffree } from "@/core/compare/cession";
import type { Portefeuille } from "@/core/compare/portefeuille";
import type { Cents } from "@/core/money";
import { VALEURS } from "@/content/valeurs";
import { formatEuros, formatPourcentage } from "@/lib/format";

/**
 * LE DÉCOMPTE DES DEUX SORTIES — `UI-007`
 *
 * ═══ POURQUOI POSTE PAR POSTE, ET PAS UN TOTAL ═══
 *
 * ADR-014 l'a décidé côté moteur : le produit d'une vente sort en sept postes,
 * jamais en un nombre. L'écran s'y tient, et pour la même raison — « expliquer
 * d'où vient chaque chiffre » (`docs/CONTEXT.md` §7). Trois de ces postes sont
 * ceux que les vendeurs découvrent chez le notaire : l'indemnité de
 * remboursement anticipé, la mainlevée d'hypothèque, et la restitution du fonds
 * mutuel de caution, qui est le seul des trois à jouer en leur faveur.
 *
 * ═══ LE SIGNE EST ÉCRIT, PAS PEINT ═══
 *
 * Chaque ligne porte son signe en caractère — « + » ou « − » — et son libellé
 * dit s'il s'ajoute ou se retranche. La brique des coûts ne fait que doubler
 * cette information ; personne n'a besoin de la percevoir pour lire le tableau.
 * Le total, lui, reste en encre : **il peut être négatif**, et un total négatif
 * n'est pas une erreur mais la réponse — le vendeur doit apporter cette somme
 * pour solder son prêt.
 *
 * ═══ LES DEUX COLONNES NE SE RESSEMBLENT PAS, ET C'EST LE SUJET ═══
 *
 * Sept postes d'un côté, trois lignes de l'autre. Le portefeuille du locataire
 * de référence n'a ni frais de sortie, ni impôt à ce niveau de modélisation, ni
 * capital à solder : c'est précisément ce qui rend la comparaison intéressante,
 * et l'asymétrie visuelle le dit mieux qu'une phrase. Ce que le portefeuille a,
 * en revanche, c'est un rendement supposé — et il est déclaré au-dessus, dans le
 * bloc de limite.
 */

interface Props {
  readonly annee: number;
  readonly cession: CessionChiffree | null;
  readonly portefeuille: Portefeuille;
  /** Motif du refus de forfait, quand l'année n'est pas chiffrable. */
  readonly motifForfait: string | null;
}

function Ligne({
  cle,
  signe,
  libelle,
  montant,
  note,
}: {
  cle: string;
  signe: "+" | "−" | "=";
  libelle: string;
  montant: Cents;
  note?: string | undefined;
}) {
  const total = signe === "=";
  return (
    <div
      data-poste={cle}
      className={`flex items-baseline justify-between gap-3 py-1 ${
        total ? "mt-1 border-t border-filet pt-2" : ""
      }`}
    >
      <span className="min-w-0 text-[12px] leading-[1.4]">
        <span
          aria-hidden="true"
          className={`mr-1.5 font-mono ${
            signe === "−" ? "text-interets-texte" : total ? "text-encre" : "text-capital-texte"
          }`}
        >
          {signe}
        </span>
        <span className={total ? "font-semibold" : ""}>{libelle}</span>
        {note && <span className="block pl-4 text-[10px] leading-[1.4] text-encre-secondaire">{note}</span>}
      </span>
      <span
        data-montant
        className={`shrink-0 font-mono text-[12px] tabular-nums ${
          total ? "text-[14px] font-semibold text-encre" : "text-encre"
        }`}
      >
        {formatEuros(montant)}
      </span>
    </div>
  );
}

export function DecompteSortie({ annee, cession, portefeuille, motifForfait }: Props) {
  const ligne = portefeuille.echeances[annee * 12] ?? portefeuille.echeances[portefeuille.echeances.length - 1];
  const apport = portefeuille.echeances[0]?.versementRealise ?? 0;
  const verse = (ligne?.capitalVerse ?? 0) - apport;
  const gains = ligne?.gains ?? 0;
  const valeur = ligne?.valeur ?? 0;

  const p = cession?.produitDeVente;

  return (
    <section aria-labelledby="titre-decompte" className="min-w-0">
      <h2 id="titre-decompte" className="mb-2 font-titre text-[15px] font-semibold">
        D&apos;où vient chaque montant, à l&apos;année {annee}
      </h2>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <div data-decompte="proprietaire" className="min-w-0 border border-filet bg-panneau px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
            <span className="inline-block h-2.5 w-2.5 shrink-0 bg-capital" aria-hidden="true" />
            Le propriétaire vend
          </p>

          {p === undefined || cession === null ? (
            <p data-non-chiffre className="mt-1.5 text-[12px] leading-[1.55]">
              Cette année-là n&apos;est pas chiffrée sous la description de cession retenue
              {motifForfait === null ? "." : ` : ${motifForfait}.`} Le refus vient du moteur et
              n&apos;est pas contourné ici : décrire les travaux au réel, avec ou sans montant, rend
              l&apos;année chiffrable.
            </p>
          ) : (
            <>
              <Ligne
                cle="prixDeCession"
                signe="+"
                libelle="Prix de cession"
                montant={p.postes.prixDeCession}
                note={`valeur de départ appréciée de ${formatPourcentage(p.parametres.appreciationAnnuellePct, 1)} par an pendant ${annee} ans`}
              />
              <Ligne
                cle="commissionAgence"
                signe="−"
                libelle="Commission d'agence"
                montant={p.postes.commissionAgence}
                note={`${formatPourcentage(p.parametres.commissionAgencePct, 1)} du prix de cession — zéro entre particuliers`}
              />
              <Ligne
                cle="capitalRestantDu"
                signe="−"
                libelle="Capital restant dû"
                montant={p.postes.capitalRestantDu}
                note="lu dans l'échéancier, jamais réamorti"
              />
              <Ligne
                cle="indemniteRemboursementAnticipe"
                signe="−"
                libelle="Indemnité de remboursement anticipé"
                montant={p.postes.indemniteRemboursementAnticipe}
                note={
                  p.parametres.avantTermeDuCredit
                    ? `le plus faible des deux plafonds légaux : ${VALEURS.plafondIra} du capital restant dû, ou ${VALEURS.moisInteretsIra} d'intérêts sur la somme remboursée`
                    : "nulle : la vente intervient après la dernière échéance, il n'y a plus rien à rembourser par anticipation"
                }
              />
              <Ligne
                cle="mainlevee"
                signe="−"
                libelle="Mainlevée d'hypothèque"
                montant={p.postes.mainlevee}
                note="nulle hors hypothèque, et nulle au terme du prêt : l'inscription s'éteint alors d'elle-même"
              />
              <Ligne
                cle="restitutionFondsGarantie"
                signe="+"
                libelle="Restitution du fonds de garantie"
                montant={p.postes.restitutionFondsGarantie}
                note="part du fonds mutuel de caution rendue à l'extinction du prêt — la vente l'éteint autant que sa dernière échéance"
              />
              <Ligne
                cle="impotPlusValue"
                signe="−"
                libelle="Impôt de plus-value"
                montant={p.postes.impotPlusValue}
                note={
                  cession.plusValue === null
                    ? "nul : la cession d'une résidence principale est exonérée, sans condition de durée de détention"
                    : "impôt sur le revenu, prélèvements sociaux et surtaxe réunis — le détail est ci-dessous"
                }
              />
              <Ligne
                cle="produitNet"
                signe="="
                libelle="Ce qui reste au propriétaire"
                montant={p.produitNet}
                note={
                  p.produitNet < 0
                    ? "négatif : la vente ne couvre pas le prêt, et cette somme est à apporter pour le solder"
                    : undefined
                }
              />
            </>
          )}
        </div>

        <div data-decompte="locataire" className="min-w-0 border border-filet bg-panneau px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
            <span className="inline-block h-2.5 w-2.5 shrink-0 bg-marches" aria-hidden="true" />
            Le locataire liquide son portefeuille
          </p>

          <Ligne
            cle="apport"
            signe="+"
            libelle="Apport placé au départ"
            montant={apport}
            note="la somme que l'acquéreur a, lui, versée au notaire"
          />
          <Ligne
            cle="versements"
            signe="+"
            libelle="Écarts de coût versés depuis"
            montant={verse}
            note="chaque mois, le coût du propriétaire moins le loyer — négatif au total si le locataire a dû retirer"
          />
          <Ligne
            cle="gains"
            signe="+"
            libelle="Gains capitalisés"
            montant={gains}
            note="au rendement net d'impôt retenu, capitalisé mois par mois en équivalent actuariel"
          />
          <Ligne cle="valeur" signe="=" libelle="Ce que vaut le portefeuille" montant={valeur} />

          <p className="mt-2 text-[10px] leading-[1.45] text-encre-secondaire">
            Aucun frais de sortie, aucun impôt de cession : les enveloppes fiscales — plan
            d&apos;épargne en actions, assurance-vie, prélèvement forfaitaire unique — ne sont pas
            modélisées, et le rendement est saisi net d&apos;impôt pour cette raison. Un rendement
            brut saisi ici surestimerait le portefeuille.
          </p>
        </div>
      </div>

      {cession?.plusValue !== null && cession?.plusValue !== undefined && (
        <div data-plus-value className="mt-3 border border-filet bg-panneau px-3 py-2.5">
          <p className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
            L&apos;impôt de plus-value, à l&apos;année {annee}
          </p>
          <p className="mb-2 max-w-[96ch] text-[12px] leading-[1.55]">
            <span className="font-semibold">Deux abattements, deux assiettes.</span> Le barème de
            l&apos;impôt sur le revenu exonère totalement à {VALEURS.exonerationImpotRevenu}, celui
            des prélèvements sociaux à {VALEURS.exonerationPrelevementsSociaux} : les deux bases ne
            sont donc pas les mêmes, et l&apos;écran ne les fond pas en une « plus-value imposable »
            unique. La surtaxe est assise sur la base de l&apos;impôt sur le revenu, et s&apos;éteint
            donc à {VALEURS.exonerationImpotRevenu} elle aussi.
          </p>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <Ligne
              cle="plusValueBrute"
              signe="+"
              libelle="Plus-value brute"
              montant={cession.plusValue.assiette.plusValueBrute}
              note="prix de cession net des frais, moins le prix d'acquisition majoré"
            />
            <Ligne
              cle="baseImpotRevenu"
              signe="+"
              libelle="Base de l'impôt sur le revenu"
              montant={cession.plusValue.baseImpotRevenu}
              note={`après ${formatPourcentage(cession.plusValue.abattementImpotRevenu.tauxPct, 1)} d'abattement pour durée de détention, arrondie à l'euro`}
            />
            <Ligne
              cle="basePrelevementsSociaux"
              signe="+"
              libelle="Base des prélèvements sociaux"
              montant={cession.plusValue.basePrelevementsSociaux}
              note={`après ${formatPourcentage(cession.plusValue.abattementPrelevementsSociaux.tauxPct, 1)} d'abattement, sur un barème différent`}
            />
            <Ligne
              cle="impotRevenu"
              signe="−"
              libelle={`Impôt sur le revenu, ${formatPourcentage(cession.plusValue.taux.impotRevenuPct, 1)}`}
              montant={cession.plusValue.impotRevenu}
            />
            <Ligne
              cle="prelevementsSociaux"
              signe="−"
              libelle={`Prélèvements sociaux, ${formatPourcentage(cession.plusValue.taux.prelevementsSociauxPct, 1)}`}
              montant={cession.plusValue.prelevementsSociaux}
            />
            <Ligne
              cle="surtaxe"
              signe="−"
              libelle="Surtaxe"
              montant={cession.plusValue.surtaxe}
              note={
                cession.plusValue.surtaxeApplicable
                  ? `due au-delà de ${VALEURS.seuilSurtaxe} de base d'impôt sur le revenu, barème à ${VALEURS.tranchesSurtaxe} tranches avec décotes`
                  : "sans objet pour ce bien"
              }
            />
            <Ligne cle="impotTotal" signe="=" libelle="Impôt total" montant={cession.plusValue.total} />
          </div>
        </div>
      )}

      {cession !== null && cession.reserves.length > 0 && (
        <div data-reserves className="mt-3 border-t border-filet pt-2.5">
          <h3 className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
            Ce que le moteur signale lui-même
          </h3>
          <ul className="flex flex-col gap-1.5">
            {cession.reserves.map((r, i) => (
              <li key={`${r.source}-${i}`} data-reserve={r.source} className="max-w-[96ch] text-[11px] leading-[1.5] text-encre-secondaire">
                <span className="mr-1.5 border border-filet px-1 py-px text-[9px] uppercase tracking-[0.05em]">
                  {r.source}
                </span>
                {r.texte}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
