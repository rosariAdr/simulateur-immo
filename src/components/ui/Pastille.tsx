"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { lienGlossaire, type Entree } from "@/content/glossaire";

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
 *
 * ── LE CHEMIN VERS LE GLOSSAIRE — `CNT-001` ──────────────────────────────
 *
 * La bulle porte un lien vers l'entrée correspondante de `/glossaire`. Deux
 * choses le rendaient inutilisable, et il a fallu corriger les deux.
 *
 * 1. LA FERMETURE AU `blur`. Le bouton se refermait à la perte de focus, donc
 *    tabuler vers le lien détruisait le lien avant qu'il ne le reçoive. La
 *    fermeture est remontée sur la zone entière et regarde `relatedTarget` :
 *    un focus qui reste à l'intérieur ne ferme rien.
 *
 * 2. LES SEPT PIXELS DE VIDE. La bulle est posée à 22 px du haut d'une pastille
 *    qui en fait 15 : la souris traversait donc une bande hors de la zone en
 *    descendant vers le lien, `mouseleave` partait, et la bulle disparaissait
 *    sous le curseur. Un pont invisible, enfant de la zone, comble l'écart.
 *
 * Ces deux défauts sont invisibles à la relecture et se voient au premier essai
 * réel : `tests/e2e/glossaire.spec.ts` suit le lien au clavier ET à la souris.
 *
 * Le `role="note"` est porté par le TEXTE, pas par le cadre. La bulle « fait
 * deux phrases » reste donc vrai pour un lecteur d'écran comme pour les tests
 * de `UI-005`, que le lien ne vient pas allonger.
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

/** Hauteur de la pastille, et donc bord haut du pont vers la bulle. */
const HAUTEUR_PASTILLE = 15;

/** Distance entre le haut de la pastille et le haut de la bulle. */
const ECART_BULLE = 22;

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

  /** Le bouton, pour lui rendre le focus quand Échap ferme depuis le lien. */
  const declencheur = useRef<HTMLButtonElement>(null);

  /**
   * Vrai le temps que le bouton reprenne le focus après un Échap.
   *
   * Sans ce drapeau, Échap depuis le lien ne fermait rien : `focus()` déclenche
   * l'événement de focus de façon synchrone, `onFocus` rouvrait la bulle, et la
   * réouverture l'emportait sur la fermeture dans le même lot de rendu. La
   * bulle restait ouverte, et le test le disait.
   */
  const restauration = useRef(false);

  /** Ferme la bulle et remet le focus là où l'utilisateur peut repartir. */
  const fermerEtRendreLeFocus = () => {
    setOuverte(false);
    if (document.activeElement === declencheur.current) return;
    restauration.current = true;
    declencheur.current?.focus();
    restauration.current = false;
  };

  return (
    <span
      ref={zone}
      className="relative inline-flex"
      onMouseEnter={ouvrir}
      onMouseLeave={() => setOuverte(false)}
      /*
       * La fermeture au départ du focus appartient à la ZONE, pas au bouton.
       * Portée par le bouton, elle détruisait la bulle au moment même où l'on
       * tabulait vers le lien qu'elle contient. `onBlur` de React est
       * `focusout` : il remonte, et `relatedTarget` dit où le focus est allé.
       */
      onBlur={(e) => {
        if (!zone.current?.contains(e.relatedTarget as Node | null)) setOuverte(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && ouverte) {
          e.stopPropagation();
          // Sans reprise du focus, Échap depuis le lien le laisserait sur un
          // élément qui vient d'être démonté : la tabulation suivante
          // repartirait du haut du document.
          fermerEtRendreLeFocus();
        }
      }}
    >
      <button
        ref={declencheur}
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
        onFocus={() => {
          if (!restauration.current) ouvrir();
        }}
        className="ml-1.5 inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center
                   rounded-full border border-pastille-filet text-[9px] font-semibold leading-none
                   text-accent transition-colors hover:bg-survol-fond
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-accent"
      >
        i
      </button>

      {ouverte && (
        <>
          {/*
            LE PONT. Il ne se voit pas et n'habille rien : il occupe les sept
            pixels qui séparent le bas de la pastille du haut de la bulle, et
            il est enfant de la zone. La souris qui descend vers le lien ne
            quitte donc jamais la zone, et `mouseleave` ne part pas.
          */}
          <span
            aria-hidden="true"
            data-pont
            style={{
              left: placement.decalage,
              width: placement.largeur,
              top: HAUTEUR_PASTILLE,
              height: ECART_BULLE - HAUTEUR_PASTILLE,
            }}
            className="absolute z-20"
          />
          <span
            data-bulle
            // « alignee » : la bulle part de la pastille. « recalee » : elle a dû
            // glisser pour tenir dans le cadre. L'attribut n'habille rien, il rend
            // le placement lisible par un test.
            data-placement={placement.decalage === 0 ? "alignee" : "recalee"}
            style={{ left: placement.decalage, width: placement.largeur, top: ECART_BULLE }}
            className="absolute z-20 border border-infobulle-filet bg-infobulle-fond
                       px-2.5 py-2 text-encre"
          >
            {/*
              Le `role="note"` porte sur le TEXTE seul. La bulle continue donc
              de « faire deux phrases » pour un lecteur d'écran comme pour les
              tests de `UI-005` : le lien, qui n'en est pas une, reste dehors.
            */}
            <span id={id} role="note" className="block text-[11px] leading-[1.5]">
              <strong className="font-semibold">{entree.accroche}</strong> {entree.suite}
            </span>
            <Link
              href={lienGlossaire(entree.terme)}
              data-lien-glossaire
              // Le nom accessible nomme le terme : une page porte des dizaines
              // de bulles, et autant de liens tous intitulés « le glossaire »
              // seraient indiscernables dans une liste de liens.
              aria-label={`« ${entree.terme} » dans le glossaire`}
              className="mt-1.5 inline-block text-[10px] text-accent underline underline-offset-2
                         hover:text-accent-survol focus-visible:outline focus-visible:outline-2
                         focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Voir dans le glossaire
            </Link>
          </span>
        </>
      )}
    </span>
  );
}
