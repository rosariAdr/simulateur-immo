"use client";

import { useState } from "react";
import type { Cents } from "@/core/money";
import { formatEurosCourt, parseSaisieEuros } from "@/lib/format";
import { Champ, type ChampProps } from "./Champ";

type Herite = Omit<ChampProps, "children" | "id">;

export interface ChampMontantProps extends Herite {
  readonly id: string;
  readonly valeur: Cents;
  readonly onChange: (valeur: Cents) => void;
}

/**
 * CHAMP MONTANT
 *
 * Saisie libre pendant la frappe, mise en forme française à la sortie du champ.
 * Reformater à chaque touche déplacerait le curseur sous les doigts de
 * l'utilisateur — c'est le défaut classique des champs monétaires.
 *
 * `inputMode="decimal"` fait apparaître le pavé numérique sur mobile sans
 * interdire la virgule, ce que `type="number"` ferait.
 */
export function ChampMontant({ id, valeur, onChange, ...champ }: ChampMontantProps) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? formatEurosCourt(valeur);

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
            const analyse = parseSaisieEuros(brouillon);
            if (analyse !== null) onChange(analyse);
          }
          setBrouillon(null);
        }}
        className="w-full bg-transparent font-mono text-[16px] tabular-nums text-encre
                   outline-none placeholder:text-desactive-encre
                   disabled:cursor-not-allowed disabled:text-desactive-encre"
      />
    </Champ>
  );
}
