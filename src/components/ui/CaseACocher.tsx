"use client";

import type { Entree } from "@/content/glossaire";
import { Pastille } from "./Pastille";

export interface CaseACocherProps {
  readonly id: string;
  readonly libelle: string;
  readonly coche: boolean;
  readonly onChange: (coche: boolean) => void;
  readonly aide?: string;
  readonly erreur?: string;
  readonly desactive?: boolean;
  /** Entrée de glossaire expliquant l'option. Sa présence pose la pastille. */
  readonly explication?: Entree;
}

/**
 * CASE À COCHER
 *
 * Volontairement hors de l'enveloppe `Champ` : une case n'a pas de famille de
 * paramètre, elle active ou désactive une option. Lui coller une étiquette
 * « négociable » n'aurait pas de sens.
 *
 * La case native est masquée à l'œil mais reste dans le flux : elle continue de
 * porter le focus, la sémantique et le comportement clavier. Seule sa peinture
 * est reprise — un carré à angles droits, comme tout le reste du produit.
 */
export function CaseACocher({
  id,
  libelle,
  coche,
  onChange,
  aide,
  erreur,
  desactive = false,
  explication,
}: CaseACocherProps) {
  return (
    <div data-case data-etat={desactive ? "desactive" : erreur ? "erreur" : "repos"}>
      <div className="flex items-start gap-2">
        <span className="relative mt-px flex h-[15px] w-[15px] shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={coche}
            disabled={desactive}
            aria-invalid={erreur ? true : undefined}
            aria-describedby={erreur ? `${id}-erreur` : undefined}
            onChange={(e) => onChange(e.target.checked)}
            className="peer h-full w-full cursor-pointer appearance-none border transition-colors
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-accent disabled:cursor-not-allowed
                       border-filet bg-panneau hover:border-encre-secondaire hover:bg-survol-fond
                       checked:border-encre checked:bg-encre
                       aria-[invalid=true]:border-interets aria-[invalid=true]:bg-erreur-fond
                       disabled:border-desactive-filet disabled:bg-survol-fond"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute inset-0 m-auto h-[11px] w-[11px]
                       stroke-papier opacity-0 peer-checked:opacity-100"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>

        <label
          htmlFor={id}
          className={`cursor-pointer text-[12px] leading-[1.4] ${
            desactive ? "cursor-not-allowed text-desactive-encre" : "text-encre"
          }`}
        >
          <span className="inline-flex items-center">
            {libelle}
            {explication && !desactive && <Pastille entree={explication} terme={libelle} />}
          </span>
        </label>
      </div>

      {aide && !erreur && <p className="mt-1 pl-[23px] text-[10px] text-encre-secondaire">{aide}</p>}
      {erreur && (
        <p id={`${id}-erreur`} role="alert" className="mt-1 pl-[23px] text-[10px] text-interets-texte">
          {erreur}
        </p>
      )}
    </div>
  );
}
