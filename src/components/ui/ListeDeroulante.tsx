"use client";

import { Champ, type ChampProps } from "./Champ";

type Herite = Omit<ChampProps, "children" | "id">;

export interface Option<T extends string> {
  readonly valeur: T;
  readonly libelle: string;
}

export interface ListeDeroulanteProps<T extends string> extends Herite {
  readonly id: string;
  readonly options: readonly Option<T>[];
  readonly valeur: T | "";
  readonly onChange: (valeur: T) => void;
  /** Texte affiché tant que rien n'est choisi. Sa présence rend le champ vide légal. */
  readonly invite?: string;
}

/**
 * LISTE DÉROULANTE
 *
 * Un `select` natif, délibérément. Une liste réimplémentée en div coûte cher en
 * accessibilité, casse la recherche au clavier, et se comporte mal sur mobile
 * où le système offre déjà un sélecteur adapté. On ne reprend que la peinture.
 */
export function ListeDeroulante<T extends string>({
  id,
  options,
  valeur,
  onChange,
  invite,
  ...champ
}: ListeDeroulanteProps<T>) {
  return (
    <Champ id={id} {...champ}>
      <div className="relative flex items-center">
        <select
          id={id}
          value={valeur}
          disabled={champ.desactive}
          aria-invalid={champ.erreur ? true : undefined}
          aria-describedby={champ.erreur ? `${id}-erreur` : undefined}
          onChange={(e) => onChange(e.target.value as T)}
          className={`w-full appearance-none bg-transparent pr-6 text-[13px] outline-none
                      disabled:cursor-not-allowed disabled:text-desactive-encre
                      ${valeur === "" ? "text-interets-texte" : "text-encre"}`}
        >
          {invite && (
            <option value="" disabled>
              {invite}
            </option>
          )}
          {options.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`pointer-events-none absolute right-0 h-3.5 w-3.5 ${
            champ.desactive ? "stroke-desactive-encre" : "stroke-encre-secondaire"
          }`}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </Champ>
  );
}
