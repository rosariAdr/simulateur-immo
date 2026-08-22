"use client";

import { ChampMontant, ChampTaux, ListeDeroulante, SelecteurSegmente } from "@/components/ui";
import { avec, GLOSSAIRE, GLOSSAIRE_PARAMETRE } from "@/content/glossaire";
import type { FiscalParams } from "@/core/fiscal/params";
import { euros, toEuros } from "@/core/money";
import { formatEurosCourt, formatDuree, formatPourcentage } from "@/lib/format";
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
  /**
   * Millésime réglementaire. Les infobulles qui citent un seuil le reçoivent
   * d'ici : aucune valeur réglementaire n'est écrite dans le texte.
   */
  readonly params: FiscalParams;
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
export function PanneauParametres({ scenario, definir, seuilUsure, params }: Props) {
  const capital = Math.max(scenario.prix - scenario.apport, 0);

  // Les trois valeurs que l'infobulle de la durée cite, prises à la source.
  const duree = avec(GLOSSAIRE_PARAMETRE.duree, {
    plafond: formatDuree(params.hcsf.maxDurationMonths),
    derogatoire: formatDuree(params.hcsf.maxDurationDerogatoryMonths),
    partTravaux: formatPourcentage(params.hcsf.derogatoryWorksSharePct, 1),
  });

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
        explication={GLOSSAIRE.apport}
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
        seuil={{
          valeur: seuilUsure,
          libelle: "Plafond d'usure du trimestre",
          explication: GLOSSAIRE.tauxUsure,
        }}
        explication={GLOSSAIRE.tauxNominal}
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
        explication={GLOSSAIRE.assuranceEmprunteur}
      />

      <SelecteurSegmente
        id="base-assurance"
        libelle="Base de calcul de l'assurance"
        famille="negociable"
        options={BASES}
        valeur={scenario.assuranceBase}
        onChange={(v) => void definir({ assuranceBase: v })}
        explication={GLOSSAIRE.baseAssurance}
      />

      <ListeDeroulante
        id="duree"
        libelle="Durée"
        famille="contraint"
        options={DUREES.map((m) => ({ valeur: String(m), libelle: `${formatDuree(m)} · ${m} échéances` }))}
        valeur={String(scenario.dureeMois)}
        onChange={(v) => void definir({ dureeMois: Number(v) })}
        explication={duree}
      />

      <ListeDeroulante
        id="garantie"
        libelle="Garantie"
        famille="reglementaire"
        options={OPTIONS_GARANTIE}
        valeur={scenario.garantie}
        onChange={(v) => void definir({ garantie: v })}
        explication={GLOSSAIRE.garantie}
      />

      <ChampMontant
        id="revenu"
        libelle="Revenu net mensuel du foyer"
        famille="contraint"
        valeur={euros(scenario.revenu)}
        onChange={(c) => void definir({ revenu: Math.round(toEuros(c)) })}
        explication={GLOSSAIRE.revenuFoyer}
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
