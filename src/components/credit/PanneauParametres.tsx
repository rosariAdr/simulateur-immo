"use client";

import { ChampMontant, ChampTaux, ListeDeroulante, SelecteurSegmente } from "@/components/ui";
import { euros, toEuros } from "@/core/money";
import { formatEurosCourt, formatDuree } from "@/lib/format";
import { BASES_ASSURANCE, GARANTIES, type Scenario } from "@/lib/scenario";
import type { useScenario } from "./useScenario";

const BASES = [
  { valeur: BASES_ASSURANCE[0], libelle: "capital initial" },
  { valeur: BASES_ASSURANCE[1], libelle: "capital restant dû" },
] as const;

const OPTIONS_GARANTIE = [
  { valeur: GARANTIES[0], libelle: "Caution" },
  { valeur: GARANTIES[1], libelle: "Hypothèque" },
  { valeur: GARANTIES[2], libelle: "Nantissement" },
] as const;

const DUREES = [180, 200, 240, 264, 300] as const;

interface Props {
  readonly scenario: Scenario;
  readonly definir: ReturnType<typeof useScenario>["definir"];
  /** Plafond légal du trimestre, affiché sur la piste du taux. */
  readonly seuilUsure: number;
}

/**
 * PANNEAU DE PARAMÈTRES
 *
 * La colonne de gauche de l'écran de référence. Elle n'assemble que des
 * primitives : aucune règle de présentation ne lui est propre, ce qui garantit
 * que les autres modules auront exactement la même densité.
 *
 * L'ordre des champs suit celui de la décision, pas celui du calcul : on part
 * du bien, on descend vers le financement, on finit par ce qui contraint.
 */
export function PanneauParametres({ scenario, definir, seuilUsure }: Props) {
  const capital = Math.max(scenario.prix - scenario.apport, 0);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">Paramètres</span>
        <span className="h-px grow bg-filet" />
      </div>

      <ChampMontant
        id="prix"
        libelle="Prix du bien"
        famille="contraint"
        valeur={euros(scenario.prix)}
        onChange={(c) => void definir({ prix: Math.round(toEuros(c)) })}
      />

      <ChampMontant
        id="apport"
        libelle="Apport"
        famille="contraint"
        valeur={euros(scenario.apport)}
        onChange={(c) => void definir({ apport: Math.round(toEuros(c)) })}
        aide={`Vous empruntez ${formatEurosCourt(euros(capital))}.`}
        explication={
          <>
            <strong>L&apos;apport ne réduit pas que la mensualité.</strong> Il réduit le capital, donc
            les intérêts qu&apos;il aurait produits pendant toute la durée — c&apos;est là que se
            joue l&apos;essentiel de l&apos;économie.
          </>
        }
      />

      <ChampTaux
        id="taux"
        libelle="Taux nominal"
        famille="negociable"
        valeur={scenario.taux}
        onChange={(v) => void definir({ taux: Number(v.toFixed(2)) })}
        min={0}
        max={8}
        pas={0.05}
        seuil={{ valeur: seuilUsure, libelle: "Plafond d'usure du trimestre" }}
        explication={
          <>
            <strong>Il se négocie, et c&apos;est le levier le plus rentable.</strong> Un dixième de
            point sur vingt ans pèse environ 2 200 € sur un prêt de 180 000 €.
          </>
        }
      />

      <ChampTaux
        id="assurance"
        libelle="Assurance emprunteur"
        famille="negociable"
        valeur={scenario.assuranceTaux}
        onChange={(v) => void definir({ assuranceTaux: Number(v.toFixed(2)) })}
        min={0}
        max={1.5}
        pas={0.01}
        explication={
          <>
            <strong>La loi Lemoine permet d&apos;en changer à tout moment</strong>, sans frais. Une
            délégation coûte souvent la moitié du contrat de groupe de la banque.
          </>
        }
      />

      <SelecteurSegmente
        id="base-assurance"
        libelle="Base de calcul de l'assurance"
        famille="negociable"
        options={BASES}
        valeur={scenario.assuranceBase}
        onChange={(v) => void definir({ assuranceBase: v })}
        explication={
          <>
            <strong>Elle compte plus que le taux affiché.</strong> Sur le capital initial la prime ne
            bouge jamais ; sur le capital restant dû elle décroît. À taux identique, l&apos;écart
            atteint 30 à 45 % du coût total de l&apos;assurance.
          </>
        }
      />

      <ListeDeroulante
        id="duree"
        libelle="Durée"
        famille="contraint"
        options={DUREES.map((m) => ({ valeur: String(m), libelle: `${formatDuree(m)} · ${m} échéances` }))}
        valeur={String(scenario.dureeMois)}
        onChange={(v) => void definir({ dureeMois: Number(v) })}
        explication={
          <>
            <strong>Allonger réduit la mensualité et augmente le coût total.</strong> Le HCSF plafonne
            à vingt-cinq ans, vingt-sept si des travaux atteignent 10 % du montant emprunté.
          </>
        }
      />

      <ListeDeroulante
        id="garantie"
        libelle="Garantie"
        famille="reglementaire"
        options={OPTIONS_GARANTIE}
        valeur={scenario.garantie}
        onChange={(v) => void definir({ garantie: v })}
        explication={
          <>
            <strong>La caution restitue une part au terme</strong>, l&apos;hypothèque coûte une
            mainlevée si vous revendez avant. Le bon choix dépend de votre horizon, pas du seul prix
            affiché.
          </>
        }
      />

      <ChampMontant
        id="revenu"
        libelle="Revenu net mensuel du foyer"
        famille="contraint"
        valeur={euros(scenario.revenu)}
        onChange={(c) => void definir({ revenu: Math.round(toEuros(c)) })}
        explication={
          <>
            <strong>Le taux d&apos;effort se calcule dessus</strong>, assurance comprise. Le plafond
            réglementaire est de 35 %, mais les banques regardent aussi le reste à vivre, qui
            n&apos;est pas normé.
          </>
        }
      />

      <ChampMontant
        id="frais-dossier"
        libelle="Frais de dossier"
        famille="negociable"
        valeur={euros(scenario.fraisDossier)}
        onChange={(c) => void definir({ fraisDossier: Math.round(toEuros(c)) })}
        aide="Ils entrent dans le TAEG. Les réduire éloigne du plafond d'usure."
      />
    </div>
  );
}
