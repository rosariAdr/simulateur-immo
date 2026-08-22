"use client";

import { useId, useRef, useState } from "react";

/**
 * PASTILLE PÉDAGOGIQUE
 *
 * Un « i » cerclé, discret mais constant, posé après un terme technique. Au
 * survol et au focus clavier, une bulle donne deux phrases — jamais plus. Le
 * reste va dans la fiche.
 *
 * Le motif est le même partout : c'est sa constance qui apprend à l'utilisateur
 * qu'un terme est explicable. Voir docs/06-design-system.md §8.
 *
 * Accessibilité : c'est un vrai bouton, atteignable au clavier, qui décrit son
 * état par `aria-expanded` et relie la bulle par `aria-describedby`. Échap la
 * ferme. La bulle n'est pas un `title` natif : celui-ci n'est ni stylable, ni
 * atteignable au clavier, ni lisible sur mobile.
 */
export function Pastille({ terme, children }: { terme: string; children: React.ReactNode }) {
  const [ouverte, setOuverte] = useState(false);
  const id = useId();
  const zone = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={zone}
      className="relative inline-flex"
      onMouseEnter={() => setOuverte(true)}
      onMouseLeave={() => setOuverte(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && ouverte) {
          e.stopPropagation();
          setOuverte(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={ouverte}
        aria-describedby={ouverte ? id : undefined}
        aria-label={`Qu'est-ce que « ${terme} » ?`}
        onClick={() => setOuverte((o) => !o)}
        onFocus={() => setOuverte(true)}
        onBlur={() => setOuverte(false)}
        className="ml-1.5 inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center
                   rounded-full border border-pastille-filet text-[9px] font-semibold leading-none
                   text-accent transition-colors hover:bg-survol-fond
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-accent"
      >
        i
      </button>

      {ouverte && (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-[22px] z-20 w-[264px] border border-infobulle-filet
                     bg-infobulle-fond px-2.5 py-2 text-[11px] leading-[1.5] text-encre"
        >
          {children}
        </span>
      )}
    </span>
  );
}
