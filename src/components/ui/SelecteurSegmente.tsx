"use client";

import { Champ, type ChampProps } from "./Champ";

type Herite = Omit<ChampProps, "children" | "id">;

export interface Segment<T extends string> {
  readonly valeur: T;
  readonly libelle: string;
}

export interface SelecteurSegmenteProps<T extends string> extends Herite {
  readonly id: string;
  readonly options: readonly Segment<T>[];
  readonly valeur: T;
  readonly onChange: (valeur: T) => void;
}

/**
 * SÉLECTEUR SEGMENTÉ
 *
 * Pour un choix entre deux ou trois valeurs dont les libellés sont courts et
 * dont la comparaison compte — la base de calcul de l'assurance, le type de
 * garantie. Au-delà, une liste déroulante.
 *
 * Construit sur un `radiogroup` plutôt que sur des boutons : les flèches du
 * clavier parcourent alors les options, et un lecteur d'écran annonce « 1 sur
 * 2 » au lieu d'énumérer deux boutons sans lien.
 *
 * L'option retenue s'inverse — fond encre, texte papier. L'inversion se voit
 * sans distinguer les couleurs, contrairement à une simple teinte d'accent.
 */
export function SelecteurSegmente<T extends string>({
  id,
  options,
  valeur,
  onChange,
  ...champ
}: SelecteurSegmenteProps<T>) {
  const desactive = champ.desactive ?? false;

  return (
    <Champ id={id} {...champ}>
      <div
        id={id}
        role="radiogroup"
        aria-label={champ.libelle}
        className={`flex ${champ.erreur ? "border border-interets" : "border border-filet"}`}
      >
        {options.map((option) => {
          const actif = option.valeur === valeur;
          return (
            <button
              key={option.valeur}
              type="button"
              role="radio"
              aria-checked={actif}
              disabled={desactive}
              tabIndex={actif ? 0 : -1}
              onClick={() => onChange(option.valeur)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = options.findIndex((o) => o.valeur === valeur);
                const suivant = e.key === "ArrowRight" ? i + 1 : i - 1;
                const cible = options[(suivant + options.length) % options.length];
                if (cible) onChange(cible.valeur);
              }}
              className={`flex-1 px-2 py-1.5 text-[11px] transition-colors
                          focus-visible:outline focus-visible:outline-2
                          focus-visible:-outline-offset-2 focus-visible:outline-accent
                          disabled:cursor-not-allowed
                          ${
                            desactive
                              ? "bg-survol-fond text-desactive-encre"
                              : actif
                                ? "bg-encre text-papier"
                                : "bg-panneau text-encre-secondaire hover:bg-survol-fond hover:text-encre"
                          }`}
            >
              {option.libelle}
            </button>
          );
        })}
      </div>
    </Champ>
  );
}
