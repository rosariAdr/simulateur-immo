"use client";

import { MARKET_2026 } from "@/core/assumptions/market";
import { motifExclusionForfaitTravaux } from "@/core/compare/plus-value";
import { PARAMS_2026 } from "@/core/fiscal/params";
import { euros, toEuros } from "@/core/money";
import { ChampMontant, ListeDeroulante } from "@/components/ui";
import { ChampHypothese } from "@/components/comparaison/ChampHypothese";
import type { ModeSaisi, RegimeSortie, Sortie } from "@/lib/patrimoine";
import type { DefinirSortie } from "./usePatrimoine";

/**
 * PANNEAU DE LA SORTIE — `UI-007`
 *
 * Ce qui décrit la **vente**, et rien d'autre : les dix-sept paramètres du
 * niveau simple restent dans `PanneauComparaison`, qui est repris tel quel
 * au-dessous.
 *
 * ═══ LES DEUX HYPOTHÈSES DÉCISIVES NE SONT PAS ICI ═══
 *
 * L'appréciation du bien et le rendement du portefeuille vivent dans le bloc de
 * limite, en haut de l'écran. Ce n'est pas une répartition de commodité : ce
 * sont les deux seules hypothèses auxquelles `assumptions/market.ts` refuse une
 * valeur centrale, et les enfouir parmi vingt champs de saisie effacerait
 * exactement ce que ce refus veut dire. La commission d'agence, elle, **a** une
 * valeur observée — les barèmes sont affichés en vitrine — et c'est donc un
 * paramètre comme les autres, à sa place ici, servi par le même `ChampHypothese`
 * que les indexations du niveau simple.
 *
 * ═══ LE FORFAIT TRAVAUX EST GRISÉ QUAND LA LOI LE FERME ═══
 *
 * `cession.ts` le demande en toutes lettres : « l'interface qui laisse choisir
 * le mode doit interroger `situationDeCession` puis les fonctions
 * `motifExclusionForfait…` pour griser l'option, plutôt que de rattraper
 * l'exception ». C'est ce que fait ce panneau — le motif est celui du moteur,
 * article du code général des impôts compris, jamais une paraphrase.
 *
 * L'option reste **visible**, seulement non choisissable. La retirer de la liste
 * aurait été plus simple et aurait appris moins : un utilisateur qui projette à
 * quatre ans doit pouvoir voir qu'un forfait de 15 % existe et qu'il lui est
 * fermé, faute de quoi il ne l'apprendra jamais.
 */

const V = MARKET_2026.vente;

const REGIMES_LIBELLES: readonly { valeur: RegimeSortie; libelle: string }[] = [
  { valeur: "residence-principale", libelle: "Résidence principale — exonérée" },
  { valeur: "imposable", libelle: "Bien imposable — plus-value calculée" },
];

interface Props {
  readonly sortie: Sortie;
  readonly definir: DefinirSortie;
  /** Durée de détention à l'horizon projeté, en mois. Commande le forfait travaux. */
  readonly horizonMois: number;
}

export function PanneauSortie({ sortie, definir, horizonMois }: Props) {
  /**
   * Le motif est demandé sur la situation **de l'horizon**, celle que
   * l'utilisateur projette. Les années intermédiaires du balayage ont leur
   * propre durée de détention, et c'est le graphique qui dit lesquelles ne sont
   * pas chiffrées : griser l'option parce que l'année 1 la ferme interdirait un
   * choix parfaitement licite à trente ans.
   */
  const motifTravaux = motifExclusionForfaitTravaux(
    {
      nature: "immeuble-bati",
      qualiteDuCedant: "personne-physique",
      dureeDetentionMois: Math.max(0, Math.floor(horizonMois)),
    },
    PARAMS_2026,
  );

  const modes = (motif: string | null): readonly { valeur: ModeSaisi; libelle: string; desactivee?: boolean }[] => [
    { valeur: "reel", libelle: "Montant réel, justificatifs à l'appui" },
    { valeur: "forfait", libelle: "Forfait légal", desactivee: motif !== null },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
          La sortie : vendre
        </span>
        <span className="h-px grow bg-filet" />
      </div>

      <ChampHypothese
        id="commission-agence"
        libelle="Commission d'agence à la revente"
        valeur={sortie.commissionAgence}
        onChange={(v) => void definir({ commissionAgence: Number(v.toFixed(2)) })}
        hypothese={V.commissionAgencePct}
        min={0}
        max={10}
        pas={0.1}
      />

      <ListeDeroulante
        id="regime-cession"
        libelle="Régime de la cession"
        famille="contraint"
        options={REGIMES_LIBELLES.map((r) => ({ valeur: r.valeur, libelle: r.libelle }))}
        valeur={sortie.regime}
        onChange={(v) => void definir({ regime: v })}
        aide="La cession d'une résidence principale est exonérée sans condition de durée de détention, à condition que la vente intervienne dans un délai normal après le déménagement. Hors de ce cas, les deux barèmes d'abattement s'appliquent."
      />

      {sortie.regime === "imposable" && (
        <>
          <ListeDeroulante
            id="mode-frais"
            libelle="Majoration des frais d'acquisition"
            famille="reglementaire"
            options={modes(null)}
            valeur={sortie.modeFrais}
            onChange={(v) => void definir({ modeFrais: v })}
            aide="Le forfait est de 7,5 % du prix d'acquisition. Le réel suppose de produire les justificatifs — droits de mutation, émoluments, frais de dossier."
          />

          {sortie.modeFrais === "reel" && (
            <ChampMontant
              id="frais-acquisition-reels"
              libelle="Frais d'acquisition réels"
              famille="contraint"
              valeur={euros(sortie.fraisAcquisitionReels)}
              onChange={(c) => void definir({ fraisAcquisitionReels: Math.round(toEuros(c)) })}
            />
          )}

          <ListeDeroulante
            id="mode-travaux"
            libelle="Majoration des travaux"
            famille="reglementaire"
            options={modes(motifTravaux)}
            valeur={sortie.modeTravaux}
            onChange={(v) => void definir({ modeTravaux: v })}
            aide={
              motifTravaux === null
                ? "Le forfait est de 15 % du prix d'acquisition, sans avoir à justifier de travaux. Choisi ici, il ferme les cinq premières années du graphique : la condition de durée n'y est pas remplie, et le moteur refuse plutôt que d'approximer."
                : `Forfait indisponible à cet horizon : ${motifTravaux}.`
            }
          />

          {sortie.modeTravaux === "reel" && (
            <ChampMontant
              id="travaux-reels"
              libelle="Travaux réels"
              famille="contraint"
              valeur={euros(sortie.travauxReels)}
              onChange={(c) => void definir({ travauxReels: Math.round(toEuros(c)) })}
              aide="Dépenses de construction, reconstruction, agrandissement ou amélioration, réalisées par une entreprise. Zéro est une description licite."
            />
          )}
        </>
      )}
    </div>
  );
}
