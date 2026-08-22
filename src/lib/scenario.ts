/**
 * LE SCÉNARIO VIT DANS L'URL
 *
 * Pas de compte, pas de base, pas de stockage local : un scénario est
 * entièrement décrit par l'adresse de la page. Voir docs/02-architecture.md §3.
 *
 * Deux contraintes gouvernent ce fichier.
 *
 * **L'URL doit rester lisible.** Clés courtes, et surtout : les montants y sont
 * exprimés en EUROS, pas en centimes. `px=205000` se lit, `px=20500000` ne se lit
 * pas. La conversion en centimes se fait à la frontière, ici.
 *
 * **Seules les valeurs qui s'écartent du défaut sont inscrites.** C'est le
 * comportement `clearOnDefault` de nuqs, actif par défaut en v2 : une URL nue
 * décrit déjà un scénario complet.
 */

import {
  parseAsFloat,
  parseAsInteger,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs";
import { euros, type Cents } from "@/core/money";
import type { CreditPlanInput } from "@/core/credit/plan";
import type { GuaranteeKind } from "@/core/credit/plan";
import type { InsuranceBasis } from "@/core/credit/insurance";

/* ── Domaines fermés ──────────────────────────────────────────────────────── */

export const BASES_ASSURANCE = ["initial", "restant"] as const;
export const GARANTIES = ["caution", "hypotheque", "nantissement"] as const;

export type BaseAssurance = (typeof BASES_ASSURANCE)[number];
export type Garantie = (typeof GARANTIES)[number];

/**
 * Le moteur nomme ces valeurs en anglais ; l'URL les nomme en français, parce
 * qu'elle est lue par des humains francophones. La traduction vit ici et nulle
 * part ailleurs.
 */
const VERS_MOTEUR_BASE: Readonly<Record<BaseAssurance, InsuranceBasis>> = {
  initial: "initial",
  restant: "outstanding",
};

const VERS_MOTEUR_GARANTIE: Readonly<Record<Garantie, GuaranteeKind>> = {
  caution: "suretyship",
  hypotheque: "mortgage",
  nantissement: "pledge",
};

/* ── Le schéma ────────────────────────────────────────────────────────────── */

/**
 * Scénario de départ. Il n'a rien d'universel : c'est un point d'entrée
 * plausible, choisi pour qu'un primo-accédant s'y reconnaisse sans avoir rien
 * saisi. Les montants sont en euros.
 */
export const DEFAUTS = {
  prix: 205_000,
  apport: 25_000,
  taux: 3.2,
  dureeMois: 240,
  assuranceTaux: 0.3,
  assuranceBase: "initial",
  quotite: 100,
  garantie: "caution",
  fraisDossier: 900,
  revenu: 3_800,
  autresCharges: 0,
} as const;

export const PARSEURS = {
  prix: parseAsInteger.withDefault(DEFAUTS.prix),
  apport: parseAsInteger.withDefault(DEFAUTS.apport),
  taux: parseAsFloat.withDefault(DEFAUTS.taux),
  dureeMois: parseAsInteger.withDefault(DEFAUTS.dureeMois),
  assuranceTaux: parseAsFloat.withDefault(DEFAUTS.assuranceTaux),
  assuranceBase: parseAsStringLiteral(BASES_ASSURANCE).withDefault(DEFAUTS.assuranceBase),
  quotite: parseAsInteger.withDefault(DEFAUTS.quotite),
  garantie: parseAsStringLiteral(GARANTIES).withDefault(DEFAUTS.garantie),
  fraisDossier: parseAsInteger.withDefault(DEFAUTS.fraisDossier),
  revenu: parseAsInteger.withDefault(DEFAUTS.revenu),
  autresCharges: parseAsInteger.withDefault(DEFAUTS.autresCharges),
};

/** Clés courtes dans l'URL, noms lisibles dans le code. */
export const CLES_URL = {
  prix: "px",
  apport: "ap",
  taux: "tx",
  dureeMois: "du",
  assuranceTaux: "as",
  assuranceBase: "ab",
  quotite: "qt",
  garantie: "ga",
  fraisDossier: "fd",
  revenu: "rv",
  autresCharges: "ac",
} as const;

export type Scenario = inferParserType<typeof PARSEURS>;

/* ── Bornes ───────────────────────────────────────────────────────────────── */

/**
 * Une URL est du texte que n'importe qui peut écrire. Ces bornes ne valident pas
 * une saisie — elles empêchent qu'une adresse trafiquée fasse tourner le moteur
 * sur des entrées absurdes.
 */
export const BORNES = {
  prix: { min: 0, max: 50_000_000 },
  apport: { min: 0, max: 50_000_000 },
  taux: { min: 0, max: 25 },
  dureeMois: { min: 1, max: 420 },
  assuranceTaux: { min: 0, max: 5 },
  quotite: { min: 0, max: 200 },
  fraisDossier: { min: 0, max: 100_000 },
  revenu: { min: 0, max: 1_000_000 },
  autresCharges: { min: 0, max: 1_000_000 },
} as const;

const borne = (valeur: number, min: number, max: number): number =>
  Number.isFinite(valeur) ? Math.min(Math.max(valeur, min), max) : min;

/** Ramène un scénario dans ses bornes, sans jamais échouer. */
export function assainir(scenario: Scenario): Scenario {
  return {
    ...scenario,
    prix: borne(scenario.prix, BORNES.prix.min, BORNES.prix.max),
    apport: borne(scenario.apport, BORNES.apport.min, BORNES.apport.max),
    taux: borne(scenario.taux, BORNES.taux.min, BORNES.taux.max),
    dureeMois: Math.round(borne(scenario.dureeMois, BORNES.dureeMois.min, BORNES.dureeMois.max)),
    assuranceTaux: borne(scenario.assuranceTaux, BORNES.assuranceTaux.min, BORNES.assuranceTaux.max),
    quotite: borne(scenario.quotite, BORNES.quotite.min, BORNES.quotite.max),
    fraisDossier: borne(scenario.fraisDossier, BORNES.fraisDossier.min, BORNES.fraisDossier.max),
    revenu: borne(scenario.revenu, BORNES.revenu.min, BORNES.revenu.max),
    autresCharges: borne(scenario.autresCharges, BORNES.autresCharges.min, BORNES.autresCharges.max),
  };
}

/* ── Passage au moteur ────────────────────────────────────────────────────── */

/** Capital emprunté : le prix moins l'apport, jamais négatif. */
export function capitalEmprunte(scenario: Scenario): Cents {
  return euros(Math.max(scenario.prix - scenario.apport, 0));
}

/**
 * Traduit un scénario en entrée de moteur.
 *
 * C'est le seul endroit où les deux vocabulaires se rencontrent. Le moteur ne
 * connaît pas l'URL, l'URL ne connaît pas le moteur.
 */
export function versEntreeMoteur(brut: Scenario): CreditPlanInput {
  const s = assainir(brut);
  return {
    loans: [
      {
        id: "principal",
        label: "Prêt principal",
        principal: capitalEmprunte(s),
        annualRatePct: s.taux,
        months: s.dureeMois,
      },
    ],
    insurance: {
      annualRatePct: s.assuranceTaux,
      basis: VERS_MOTEUR_BASE[s.assuranceBase],
      coveragePct: s.quotite,
    },
    guarantee: VERS_MOTEUR_GARANTIE[s.garantie],
    arrangementFee: euros(s.fraisDossier),
    propertyPrice: euros(s.prix),
    netMonthlyIncome: euros(s.revenu),
    otherDebtService: euros(s.autresCharges),
  };
}
