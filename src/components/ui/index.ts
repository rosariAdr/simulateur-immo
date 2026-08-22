/**
 * PRIMITIVES DE SAISIE
 *
 * Le vocabulaire de composants du produit. Chacune porte ses cinq états —
 * repos, survol, focus, erreur, désactivé — et respecte les deux règles
 * structurantes du brief : angles droits, et jamais d'information portée par la
 * seule couleur.
 *
 * La galerie `/composants` les montre toutes, et sert de banc d'essai aux tests
 * de bout en bout.
 */

export { Champ, type ChampProps } from "./Champ";
export { ChampMontant, type ChampMontantProps } from "./ChampMontant";
export { ChampTaux, type ChampTauxProps } from "./ChampTaux";
export { CaseACocher, type CaseACocherProps } from "./CaseACocher";
export { ListeDeroulante, type ListeDeroulanteProps, type Option } from "./ListeDeroulante";
export { Pastille } from "./Pastille";
export { SelecteurSegmente, type SelecteurSegmenteProps, type Segment } from "./SelecteurSegmente";
export { FAMILLES, type Famille } from "./taxonomie";
