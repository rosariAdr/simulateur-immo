"use client";

import { useState } from "react";
import type { Entree } from "@/content/glossaire";
import { formatPourcentage, parseSaisiePourcentage } from "@/lib/format";
import { Champ, type ChampProps } from "./Champ";
import { Pastille } from "./Pastille";

type Herite = Omit<ChampProps, "children" | "id">;

export interface ChampTauxProps extends Herite {
  readonly id: string;
  readonly valeur: number;
  readonly onChange: (valeur: number) => void;
  /** Bornes du curseur d'accompagnement. Sans elles, pas de curseur. */
  readonly min?: number;
  readonly max?: number;
  readonly pas?: number;
  /**
   * Repère réglementaire porté sur la piste, par exemple le taux d'usure.
   * Le seuil peut porter sa propre explication : c'est là que le terme apparaît
   * sous les yeux de l'utilisateur, donc là que la pastille se pose.
   */
  readonly seuil?: {
    readonly valeur: number;
    readonly libelle: string;
    readonly explication?: Entree;
  };
}

/**
 * CHAMP TAUX
 *
 * Saisie chiffrée doublée d'un curseur. Les deux pilotent la même valeur : le
 * champ pour qui connaît son taux, le curseur pour qui explore.
 *
 * Quand un seuil réglementaire est fourni, il est marqué sur la piste ET nommé
 * en toutes lettres sous elle. Un trait seul ne dirait pas ce qu'il est.
 */
export function ChampTaux({
  id,
  valeur,
  onChange,
  min = 0,
  max = 8,
  pas = 0.05,
  seuil,
  ...champ
}: ChampTauxProps) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  // Identifiant dérivé plutôt que généré : le curseur reste adressable depuis
  // l'extérieur, ce dont les tests de bout en bout ont besoin.
  const idCurseur = `${id}-curseur`;
  const affiche = brouillon ?? formatPourcentage(valeur);

  const position = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const depasse = seuil !== undefined && valeur > seuil.valeur;

  return (
    <Champ id={id} {...champ}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        disabled={champ.desactive}
        aria-invalid={champ.erreur ? true : undefined}
        aria-describedby={champ.erreur ? `${id}-erreur` : undefined}
        value={affiche}
        onChange={(e) => setBrouillon(e.target.value)}
        onBlur={() => {
          if (brouillon !== null) {
            const analyse = parseSaisiePourcentage(brouillon);
            if (analyse !== null) onChange(analyse);
          }
          setBrouillon(null);
        }}
        className="w-full bg-transparent font-mono text-[16px] tabular-nums text-encre
                   outline-none disabled:cursor-not-allowed disabled:text-desactive-encre"
      />

      {/*
        La piste fait trois pixels de haut, et c'était aussi la hauteur de la
        ZONE SENSIBLE : au doigt, le curseur n'était attrapable que par accident
        — 342 × 3 px là où le critère WCAG 2.2 § 2.5.8 en demande 24 de haut.
        `h-6` grandit la boîte du contrôle sans toucher à ce qu'il peint : la
        piste reste centrée sur trois pixels, le mors garde ses quinze. Seule la
        marge du dessus est reprise, pour que l'écart visuel ne change pas.
      */}
      <div className="relative mt-0 flex items-center">
        <input
          id={idCurseur}
          type="range"
          min={min}
          max={max}
          step={pas}
          value={valeur}
          disabled={champ.desactive}
          aria-label={`${champ.libelle}, réglage au curseur`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="peer h-6 w-full cursor-pointer appearance-none bg-transparent
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0
                     focus-visible:outline-accent disabled:cursor-not-allowed
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
        {seuil && (
          <span
            aria-hidden="true"
            style={{ left: position(seuil.valeur) }}
            className="pointer-events-none absolute top-[6px] h-[12px] w-px bg-encre-secondaire"
          />
        )}
      </div>

      {seuil && (
        <p
          className={`mt-1.5 flex flex-wrap items-center text-[10px] leading-[1.45] ${
            depasse ? "text-interets-texte" : "text-encre-secondaire"
          }`}
        >
          <span>
            {seuil.libelle} : {formatPourcentage(seuil.valeur)}
            {depasse && " — franchi"}
          </span>
          {seuil.explication && !champ.desactive && <Pastille entree={seuil.explication} />}
        </p>
      )}
    </Champ>
  );
}
