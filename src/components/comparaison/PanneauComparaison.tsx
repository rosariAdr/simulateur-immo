"use client";

import { MARKET_2026 } from "@/core/assumptions/market";
import { euros, toEuros, type Cents } from "@/core/money";
import { ChampMontant, ChampTaux, ListeDeroulante } from "@/components/ui";
import { GLOSSAIRE } from "@/content/glossaire";
import {
  formatDuree,
  formatEuros,
  formatEurosCourt,
  formatMoisReleve,
  formatPourcentage,
} from "@/lib/format";
import type { Comparaison } from "@/lib/comparaison";
import { ChampHypothese } from "./ChampHypothese";
import type { Definir } from "./useComparaison";

/**
 * PANNEAU DE PARAMÈTRES DE LA COMPARAISON — `VIZ-003`
 *
 * Quatre blocs, dans l'ordre où la question se pose : ce qu'on achète et comment
 * on le finance, ce que la propriété coûte en plus du crédit, ce que la location
 * coûte, et enfin les hypothèses qui font dériver les deux côtés.
 *
 * ═══ CE QUI EST DANS L'URL, ET CE QUI N'Y EST PAS ═══
 *
 * Les dix-sept champs de ce panneau y sont, sans exception : chacun déplace une
 * courbe. La lecture retenue et l'année lue n'y sont pas — elles changent un
 * cadrage, pas un chiffre. C'est la règle d'ADR-005, et `src/lib/comparaison.ts`
 * la porte.
 *
 * ═══ DEUX ABSENCES VOLONTAIRES ═══
 *
 * **La garantie et les frais de dossier** n'ont pas de champ. Ils n'entrent pas
 * dans l'échéance, donc pas dans ce que ce module lit du plan de financement :
 * ils appartiennent aux frais d'entrée, saisis une seule fois sous un seul nom.
 * Les faire figurer deux fois aurait produit deux totaux différents pour la même
 * somme.
 *
 * **Le revenu du foyer** non plus : aucun plafond d'endettement n'est contrôlé
 * ici, c'est le travail de `/credit`. Un champ sans effet est un champ qui ment.
 */

const D = MARKET_2026.detention;
const A = MARKET_2026.acquisition;

const DUREES = [180, 200, 240, 264, 300] as const;
const HORIZONS = [10, 15, 20, 25, 30, 35] as const;

interface Props {
  readonly scenario: Comparaison;
  readonly definir: Definir;
  /** Première échéance du plan, assurance comprise. Reprise, jamais recalculée. */
  readonly mensualite: Cents;
}

/** Titre de bloc, même dessin que le séparateur du panneau du module crédit. */
function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mb-1 mt-3 flex items-center gap-2 first:mt-0">
        <span className="text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
          {titre}
        </span>
        <span className="h-px grow bg-filet" />
      </div>
      {children}
    </>
  );
}

export function PanneauComparaison({ scenario, definir, mensualite }: Props) {
  const capital = Math.max(scenario.prix - scenario.apport, 0);
  const fraisAncienBas = Math.round((scenario.prix * A.totalFeesOldPct.intervalle[0]) / 100);
  const fraisAncienHaut = Math.round((scenario.prix * A.totalFeesOldPct.intervalle[1]) / 100);

  return (
    <div className="flex flex-col gap-2.5">
      <Bloc titre="Le bien et son financement">
        {/*
          LA MENSUALITÉ N'EST PAS SAISIE, ELLE EST REPRISE. Elle vient du même
          moteur, appelé sur les mêmes paramètres que `/credit` : le lien entre
          les deux écrans n'est pas une promesse de texte, et
          `tests/e2e/comparaison.spec.ts` compare les deux affichages au centime.
        */}
        <div data-chiffre="mensualite" className="border border-filet bg-panneau px-2.5 py-2">
          <p className="text-[11px] text-encre-secondaire">Mensualité reprise du module crédit</p>
          <p data-valeur className="font-mono text-[15px] tabular-nums text-encre">
            {formatEuros(mensualite)}
          </p>
          <p className="mt-1 text-[10px] leading-[1.45] text-encre-secondaire">
            Assurance comprise. C&apos;est cette échéance que la comparaison lit mois par mois ;
            elle n&apos;en recalcule aucune.
          </p>
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

        <ListeDeroulante
          id="duree"
          libelle="Durée du prêt"
          famille="contraint"
          options={DUREES.map((m) => ({ valeur: String(m), libelle: formatDuree(m) }))}
          valeur={String(scenario.dureeMois)}
          onChange={(v) => void definir({ dureeMois: Number(v) })}
        />

        <ListeDeroulante
          id="horizon"
          libelle="Durée de projection"
          famille="contraint"
          options={HORIZONS.map((a) => ({ valeur: String(a), libelle: `${a} ans` }))}
          valeur={String(scenario.horizonAnnees)}
          onChange={(v) => void definir({ horizonAnnees: Number(v) })}
          aide="Projeter au-delà du prêt change tout : une fois la dernière échéance passée, le décaissement du propriétaire s'effondre."
        />
      </Bloc>

      <Bloc titre="Ce que coûte la propriété">
        <ChampMontant
          id="taxe-fonciere"
          libelle="Taxe foncière, par an"
          famille="reglementaire"
          valeur={euros(scenario.taxeFonciere)}
          onChange={(c) => void definir({ taxeFonciere: Math.round(toEuros(c)) })}
          explication={GLOSSAIRE.taxeFonciere}
        />

        <ChampMontant
          id="charges-copro"
          libelle="Charges de copropriété non récupérables, par an"
          famille="contraint"
          valeur={euros(scenario.chargesCopropriete)}
          onChange={(c) => void definir({ chargesCopropriete: Math.round(toEuros(c)) })}
          aide="Les charges récupérables sont exclues : l'occupant les paie dans les deux mondes, elles s'annuleraient dans la comparaison."
        />

        <ChampMontant
          id="assurance-habitation"
          libelle="Assurance habitation, par an"
          famille="negociable"
          valeur={euros(scenario.assuranceHabitation)}
          onChange={(c) => void definir({ assuranceHabitation: Math.round(toEuros(c)) })}
        />

        <ChampMontant
          id="frais-entree"
          libelle="Frais d'entrée jamais récupérés"
          famille="reglementaire"
          valeur={euros(scenario.fraisEntree)}
          onChange={(c) => void definir({ fraisEntree: Math.round(toEuros(c)) })}
          aide={
            scenario.fraisEntree === 0
              ? `À zéro, ces frais ne sont pas comptés — c'est ce que décrit le « niveau simple » de la spécification, et c'est optimiste. Dans l'ancien, ils se situent entre ${formatEurosCourt(euros(fraisAncienBas))} et ${formatEurosCourt(euros(fraisAncienHaut))} pour ce prix, et reculent le croisement de plusieurs années.`
              : "Droits de mutation, émoluments, frais de dossier et coût de garantie réunis. Imputés en totalité au premier mois, dans les deux lectures."
          }
        />
      </Bloc>

      <Bloc titre="Ce que coûte la location">
        <ChampMontant
          id="loyer"
          libelle="Loyer hors charges, par mois"
          famille="contraint"
          valeur={euros(scenario.loyer)}
          onChange={(c) => void definir({ loyer: Math.round(toEuros(c)) })}
          aide={`Soit ${formatPourcentage(rendementBrut(scenario), 1)} du prix du bien par an — c'est ce rapport qui gouverne l'écran.`}
        />

        <ChampMontant
          id="charges-locatives"
          libelle="Charges locatives, par mois"
          famille="contraint"
          valeur={euros(scenario.chargesLocatives)}
          onChange={(c) => void definir({ chargesLocatives: Math.round(toEuros(c)) })}
        />

        <ChampMontant
          id="assurance-locataire"
          libelle="Assurance habitation du locataire, par an"
          famille="negociable"
          valeur={euros(scenario.assuranceLocataire)}
          onChange={(c) => void definir({ assuranceLocataire: Math.round(toEuros(c)) })}
        />
      </Bloc>

      <Bloc titre="Hypothèses de marché">
        <p className="mb-1 max-w-[46ch] text-[10px] leading-[1.5] text-encre-secondaire">
          Ces quatre valeurs ne sont pas des règles de droit : ce sont des ordres de grandeur
          relevés en {formatMoisReleve(MARKET_2026.releve)}, avec leur intervalle. Les deux
          côtés sont indexés — n&apos;indexer que le loyer ferait grandir une seule des deux
          courbes, et toujours dans le même sens.
        </p>

        <ChampHypothese
          id="provision-travaux"
          libelle="Provision pour travaux, par an"
          valeur={scenario.provisionTravauxPct}
          onChange={(v) => void definir({ provisionTravauxPct: Number(v.toFixed(2)) })}
          hypothese={D.provisionTravauxPctAnnuel}
          min={0}
          max={3}
          pas={0.1}
        />

        <ChampHypothese
          id="indexation-loyer"
          libelle="Indexation du loyer"
          valeur={scenario.indexationLoyer}
          onChange={(v) => void definir({ indexationLoyer: Number(v.toFixed(2)) })}
          hypothese={D.indexationLoyerPctAnnuel}
          min={-2}
          max={6}
          pas={0.1}
        />

        <ChampHypothese
          id="indexation-taxe-fonciere"
          libelle="Indexation de la taxe foncière"
          valeur={scenario.indexationTaxeFonciere}
          onChange={(v) => void definir({ indexationTaxeFonciere: Number(v.toFixed(2)) })}
          hypothese={D.indexationTaxeFoncierePctAnnuel}
          min={-2}
          max={6}
          pas={0.1}
        />

        <ChampHypothese
          id="indexation-charges"
          libelle="Indexation des charges et assurances"
          valeur={scenario.indexationCharges}
          onChange={(v) => void definir({ indexationCharges: Number(v.toFixed(2)) })}
          hypothese={D.indexationChargesPctAnnuel}
          min={-2}
          max={6}
          pas={0.1}
        />
      </Bloc>
    </div>
  );
}

/** Loyer annuel rapporté au prix du bien. Zéro si le prix est nul. */
function rendementBrut(s: Comparaison): number {
  return s.prix > 0 ? ((s.loyer * 12) / s.prix) * 100 : 0;
}
