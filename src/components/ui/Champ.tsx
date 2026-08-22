"use client";

import { FAMILLES, type Famille } from "./taxonomie";
import { Pastille } from "./Pastille";

/**
 * ENVELOPPE COMMUNE DES CHAMPS DE SAISIE
 *
 * Porte ce que tous les champs partagent : le libellé, l'étiquette de famille,
 * la pastille pédagogique, l'aide, et le message d'erreur.
 *
 * Cinq états, et aucun n'est signalé par la seule couleur :
 *   repos       bordure de la famille
 *   survol      le fond passe au panneau de survol
 *   focus       un anneau laiton s'ajoute, décalé de 2 px
 *   erreur      la bordure passe en brique ET un texte apparaît
 *   désactivé   la bordure s'efface et l'encre s'éteint
 */

export interface ChampProps {
  readonly libelle: string;
  readonly famille: Famille;
  /** Identifiant du contrôle, pour relier le libellé. */
  readonly id: string;
  readonly aide?: string;
  readonly erreur?: string;
  readonly desactive?: boolean;
  /** Explication pédagogique. Sa présence pose la pastille. */
  readonly explication?: React.ReactNode;
  readonly children: React.ReactNode;
}

export function Champ({
  libelle,
  famille,
  id,
  aide,
  erreur,
  desactive = false,
  explication,
  children,
}: ChampProps) {
  const style = FAMILLES[famille];

  const bordure = desactive
    ? "border border-desactive-filet"
    : erreur
      ? "border border-interets"
      : style.bordure;

  const fond = desactive ? "bg-survol-fond" : erreur ? "bg-erreur-fond" : "bg-panneau hover:bg-survol-fond";

  return (
    <div
      data-champ
      data-famille={famille}
      data-etat={desactive ? "desactive" : erreur ? "erreur" : "repos"}
      className={`${bordure} ${fond} px-2.5 py-2 transition-colors
                  focus-within:outline focus-within:outline-2 focus-within:outline-offset-2
                  focus-within:outline-accent`}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className={`flex items-center text-[11px] ${
            desactive ? "text-desactive-encre" : "text-encre-secondaire"
          }`}
        >
          {libelle}
          {explication && !desactive && <Pastille terme={libelle}>{explication}</Pastille>}
        </label>
        <span
          className={`shrink-0 border px-1.5 py-px text-[9px] uppercase tracking-[0.05em] ${
            desactive ? "border-desactive-filet text-desactive-encre" : style.etiquette
          }`}
        >
          {style.libelle}
        </span>
      </div>

      {children}

      {aide && !erreur && (
        <p className={`mt-1.5 text-[10px] leading-[1.45] ${desactive ? "text-desactive-encre" : "text-encre-secondaire"}`}>
          {aide}
        </p>
      )}

      {erreur && (
        <p id={`${id}-erreur`} role="alert" className="mt-1.5 text-[10px] leading-[1.45] text-interets-texte">
          {erreur}
        </p>
      )}
    </div>
  );
}
