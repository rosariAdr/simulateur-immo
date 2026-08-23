"use client";

import { useState } from "react";
import type { HypotheseChiffree } from "@/core/assumptions/market";
import { formatPourcentage, parseSaisiePourcentage } from "@/lib/format";

/**
 * CHAMP D'HYPOTHÈSE DE MARCHÉ — `VIZ-003`
 *
 * ═══ POURQUOI CE N'EST PAS UN `Champ` ═══
 *
 * La primitive `Champ` pose sur chaque contrôle une étiquette de famille :
 * négociable, contraint ou réglementaire. Cette taxonomie classe **les
 * paramètres d'une opération immobilière** (`docs/CONTEXT.md` §3) — ce sur quoi
 * on a prise, ce qui dépend du projet, ce que la loi impose.
 *
 * Une vitesse d'indexation n'est rien de tout cela. Elle ne se négocie pas, elle
 * ne dépend pas du projet, et aucun texte ne la fixe : c'est une **hypothèse de
 * modélisation**, relevée sur le marché, assortie d'un intervalle et d'un degré
 * de confiance. C'est exactement la distinction qu'ADR-008 a établie entre
 * `fiscal/params.ts` et `assumptions/market.ts`, et la faire disparaître à
 * l'écran reviendrait à la nier.
 *
 * Plutôt que d'inventer une quatrième famille — ce qui affaiblirait une
 * taxonomie dont toute la valeur tient à sa constance —, ces champs n'en portent
 * aucune. À la place du badge de famille, ils affichent ce qui les caractérise
 * vraiment : **l'intervalle observé et la fiabilité**, lus dans
 * `src/core/assumptions/market.ts` et jamais réécrits ici.
 *
 * ═══ POURQUOI L'INTERVALLE EST AFFICHÉ, ET PAS SEULEMENT LA VALEUR ═══
 *
 * « Ne jamais afficher une précision qu'on n'a pas » (`docs/CONTEXT.md` §7). Ces
 * quatre hypothèses sont le paramètre le plus sensible du module : un point
 * d'écart d'indexation déplace l'année de croisement de plusieurs années. Une
 * valeur unique affichée sans son intervalle laisserait croire à une donnée
 * mesurée, alors que c'en est une estimée.
 */

const FIABILITE: Readonly<Record<HypotheseChiffree["fiabilite"], string>> = {
  observee: "observée",
  estimee: "estimée",
};

interface Props {
  readonly id: string;
  readonly libelle: string;
  readonly valeur: number;
  readonly onChange: (valeur: number) => void;
  /** L'hypothèse de référence : elle fournit l'intervalle et la fiabilité affichés. */
  readonly hypothese: HypotheseChiffree;
  /** Bornes du curseur. Elles peuvent dépasser l'intervalle observé — la déflation existe. */
  readonly min: number;
  readonly max: number;
  readonly pas: number;
}

export function ChampHypothese({ id, libelle, valeur, onChange, hypothese, min, max, pas }: Props) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? formatPourcentage(valeur, 1);
  const [bas, haut] = hypothese.intervalle;
  const dehors = valeur < bas || valeur > haut;

  return (
    <div
      data-hypothese={id}
      className="border border-filet bg-panneau px-2.5 py-2 transition-colors hover:bg-survol-fond
                 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2
                 focus-within:outline-accent"
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[11px] text-encre-secondaire">
          {libelle}
        </label>
        <span className="shrink-0 border border-filet px-1.5 py-px text-[9px] uppercase tracking-[0.05em] text-encre-secondaire">
          {FIABILITE[hypothese.fiabilite]}
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

      {/* Même gabarit que la piste du module crédit : trois pixels peints, une
          zone sensible de 24 px. Voir `ChampTaux`, et WCAG 2.2 § 2.5.8. */}
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

      <p className="mt-1 text-[10px] leading-[1.45] text-encre-secondaire">
        Intervalle observé : {formatPourcentage(bas, 1)} à {formatPourcentage(haut, 1)}
        {dehors && " — la valeur retenue est en dehors"}
      </p>
    </div>
  );
}
