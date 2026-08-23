"use client";

import { useState } from "react";
import type { Fiabilite } from "@/core/assumptions/market";
import { formatPourcentage, parseSaisiePourcentage } from "@/lib/format";

/**
 * CHAMP D'HYPOTHÈSE SANS VALEUR CENTRALE — `UI-007`
 *
 * ═══ CE QUI LE DISTINGUE DE `ChampHypothese` ═══
 *
 * `ChampHypothese` sert une `HypotheseChiffree` : une hypothèse de marché **qui
 * a une valeur observée**, comme la commission d'agence, dont les barèmes sont
 * affichés en vitrine. Il montre l'intervalle et la fiabilité, et la valeur par
 * défaut vient du relevé.
 *
 * Ce champ-ci sert une `FourchetteObservee` : une hypothèse **dont le
 * simulateur refuse de publier le point central**, parce que le publier
 * reviendrait à publier une prévision de marché. L'appréciation d'un logement
 * et le rendement d'un portefeuille sont les deux seules de cette espèce, et ce
 * sont exactement les deux qui décident de la réponse de cet écran.
 *
 * Il faut pourtant bien ouvrir sur un nombre. Le champ affiche donc ce que
 * l'autre n'a pas à dire : **d'où vient le point d'ouverture, et qu'il n'a
 * aucune autorité.** C'est la seule chose qui distingue une hypothèse déclarée
 * d'une prévision déguisée.
 *
 * ═══ AUCUNE FAMILLE, ET LA PROVENANCE OUVRABLE ═══
 *
 * Pas d'étiquette négociable / contraint / réglementaire, pour la raison
 * d'ADR-008 et d'ADR-015 : une hypothèse de modélisation n'est aucune des
 * trois. À la place, l'intervalle observé, la fiabilité, et la provenance
 * complète dans un `<details>` — un élément natif, qui s'ouvre sans JavaScript
 * et se lit au clavier. Les deux hypothèses de cet écran valent la place :
 * `market.ts` y explique, en plusieurs lignes chacune, ce qui a été lu et ce
 * qui ne l'a pas été.
 */

const FIABILITE: Readonly<Record<Fiabilite, string>> = {
  observee: "observée",
  estimee: "estimée",
};

interface Props {
  readonly id: string;
  readonly libelle: string;
  readonly valeur: number;
  readonly onChange: (valeur: number) => void;
  readonly intervalle: readonly [number, number];
  readonly fiabilite: Fiabilite;
  /** Une phrase de contexte propre à l'écran, avant la provenance longue. */
  readonly note: string;
  /** La provenance telle que `market.ts` la rédige. Reproduite, jamais réécrite. */
  readonly provenance: string;
  readonly min: number;
  readonly max: number;
  readonly pas: number;
}

export function ChampFourchette({
  id,
  libelle,
  valeur,
  onChange,
  intervalle,
  fiabilite,
  note,
  provenance,
  min,
  max,
  pas,
}: Props) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? formatPourcentage(valeur, 1);
  const [bas, haut] = intervalle;
  const dehors = valeur < bas || valeur > haut;

  return (
    <div
      data-fourchette={id}
      className="min-w-0 border border-filet bg-panneau px-2.5 py-2 transition-colors
                 hover:bg-survol-fond focus-within:outline focus-within:outline-2
                 focus-within:outline-offset-2 focus-within:outline-accent"
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[11px] text-encre-secondaire">
          {libelle}
        </label>
        <span
          data-fiabilite
          className="shrink-0 border border-filet px-1.5 py-px text-[9px] uppercase tracking-[0.05em] text-encre-secondaire"
        >
          {FIABILITE[fiabilite]}
        </span>
      </div>

      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={affiche}
        onChange={(e) => setBrouillon(e.target.value)}
        onBlur={() => {
          if (brouillon !== null) {
            const analyse = parseSaisiePourcentage(brouillon);
            if (analyse !== null) onChange(analyse);
          }
          setBrouillon(null);
        }}
        className="w-full bg-transparent font-mono text-[16px] tabular-nums text-encre outline-none"
      />

      {/* Même gabarit que les autres pistes du produit : trois pixels peints,
          une zone sensible de 24 px — WCAG 2.2 § 2.5.8. */}
      <input
        type="range"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        aria-label={`${libelle}, réglage au curseur`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer appearance-none bg-transparent
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0
                   focus-visible:outline-accent
                   [&::-webkit-slider-runnable-track]:h-[3px]
                   [&::-webkit-slider-runnable-track]:bg-filet
                   [&::-webkit-slider-thumb]:h-[15px] [&::-webkit-slider-thumb]:w-[3px]
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-encre
                   [&::-webkit-slider-thumb]:-mt-[6px]
                   [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:bg-filet
                   [&::-moz-range-thumb]:h-[15px] [&::-moz-range-thumb]:w-[3px]
                   [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0
                   [&::-moz-range-thumb]:bg-encre"
      />

      <p data-intervalle className="mt-1 text-[10px] leading-[1.45] text-encre-secondaire">
        Intervalle observé : {formatPourcentage(bas, 1)} à {formatPourcentage(haut, 1)}
        {dehors && " — la valeur retenue est en dehors"}
      </p>
      <p data-sans-valeur-centrale className="mt-1 text-[10px] leading-[1.45] text-encre-secondaire">
        Aucune valeur centrale n&apos;est publiée pour cette hypothèse. {note} Le point
        d&apos;ouverture est le milieu de l&apos;intervalle, posé par cet écran faute de mieux : il
        n&apos;a aucune autorité, et le déplacer est l&apos;usage prévu.
      </p>

      <details className="mt-1">
        <summary className="cursor-pointer text-[10px] text-accent marker:text-accent hover:text-accent-survol focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          D&apos;où vient cet intervalle
        </summary>
        <p className="mt-1 text-[10px] leading-[1.5] text-encre-secondaire">{provenance}</p>
      </details>
    </div>
  );
}
