"use client";

import { useId, useRef, useState } from "react";
import type { Entree } from "@/content/glossaire";

/**
 * PASTILLE PÉDAGOGIQUE
 *
 * Un « i » cerclé, discret mais constant, posé après un terme technique. Au
 * survol, au toucher et au focus clavier, une bulle donne deux phrases — jamais
 * plus. Le reste va dans la fiche.
 *
 * Le motif est le même partout : c'est sa constance qui apprend à l'utilisateur
 * qu'un terme est explicable. Voir docs/06-design-system.md §8.
 *
 * Le contenu n'est pas passé en enfants libres mais en entrée de glossaire :
 * la règle des deux phrases est portée par le type de `Entree`, et il n'existe
 * donc aucune façon d'écrire une bulle qui en compte trois. Voir
 * `src/content/glossaire.ts`.
 *
 * Accessibilité : c'est un vrai bouton, atteignable au clavier, qui décrit son
 * état par `aria-expanded` et relie la bulle par `aria-describedby`. Échap la
 * ferme. La bulle n'est pas un `title` natif : celui-ci n'est ni stylable, ni
 * atteignable au clavier, ni lisible sur mobile.
 */

/**
 * Largeur souhaitée de la bulle, en pixels.
 *
 * Elle est en JavaScript et non dans une classe utilitaire parce que le
 * placement la mesure : une largeur écrite deux fois finirait par diverger, et
 * le calcul de débordement se tromperait sans que rien ne le signale.
 */
const LARGEUR_BULLE = 264;

/** Marge minimale entre la bulle et le bord de la fenêtre. */
const MARGE_BORD = 8;

/** Position et largeur retenues à l'ouverture. `decalage` est relatif à la pastille. */
interface Placement {
  readonly decalage: number;
  readonly largeur: number;
}

export function Pastille({ entree, terme = entree.terme }: { entree: Entree; terme?: string }) {
  const [ouverte, setOuverte] = useState(false);
  // Placement calculé à l'ouverture, d'après la position réelle du bouton.
  // Sans lui, la pastille de la dernière colonne pousse sa bulle hors de la
  // fenêtre et la page se met à défiler latéralement.
  const [placement, setPlacement] = useState<Placement>({ decalage: 0, largeur: LARGEUR_BULLE });
  const id = useId();
  const zone = useRef<HTMLSpanElement>(null);

  /**
   * Ce que la bulle affichait AVANT que le geste ne commence.
   *
   * Sur un écran tactile, un seul appui produit une rafale d'événements : le
   * focus — et les événements souris de compatibilité que Chrome émet après le
   * toucher — ouvrent la bulle, puis le `click` du même appui la referme. La
   * bulle clignotait et restait fermée. Le clic ne bascule donc pas l'état
   * courant : il bascule l'état d'avant le geste, mémorisé au `pointerdown` (ou
   * à la frappe, pour une activation au clavier).
   */
  const avantLeGeste = useRef(false);

  /**
   * Choisit le placement d'après la position réelle de la pastille.
   *
   * La bulle s'aligne sur la pastille tant qu'elle tient ; sinon elle glisse
   * juste assez pour rester dans le cadre. Le décalage est calculé en pixels et
   * non par un simple choix de bord : au bord droit d'un téléphone, basculer la
   * bulle à droite la ferait sortir par la gauche — le défaut simplement changé
   * de côté.
   *
   * `clientWidth` et non `innerWidth` : la barre de défilement compte dans le
   * second, et la bulle serait placée quelques pixels trop à droite.
   */
  const placer = () => {
    const rect = zone.current?.getBoundingClientRect();
    if (!rect) return;
    const cadre = document.documentElement.clientWidth;
    const largeur = Math.min(LARGEUR_BULLE, cadre - 2 * MARGE_BORD);
    const maximum = cadre - MARGE_BORD - largeur;
    const gauche = Math.max(MARGE_BORD, Math.min(rect.left, maximum));
    setPlacement({ decalage: Math.round(gauche - rect.left), largeur });
  };

  const ouvrir = () => {
    placer();
    setOuverte(true);
  };

  return (
    <span
      ref={zone}
      className="relative inline-flex"
      onMouseEnter={ouvrir}
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
        onPointerDown={() => {
          avantLeGeste.current = ouverte;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") avantLeGeste.current = ouverte;
        }}
        onClick={() => {
          if (avantLeGeste.current) setOuverte(false);
          else ouvrir();
        }}
        onFocus={ouvrir}
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
          data-bulle
          // « alignee » : la bulle part de la pastille. « recalee » : elle a dû
          // glisser pour tenir dans le cadre. L'attribut n'habille rien, il rend
          // le placement lisible par un test.
          data-placement={placement.decalage === 0 ? "alignee" : "recalee"}
          style={{ left: placement.decalage, width: placement.largeur }}
          className="absolute top-[22px] z-20 border border-infobulle-filet bg-infobulle-fond
                     px-2.5 py-2 text-[11px] leading-[1.5] text-encre"
        >
          <strong className="font-semibold">{entree.accroche}</strong> {entree.suite}
        </span>
      )}
    </span>
  );
}
