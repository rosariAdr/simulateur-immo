import { describe, expect, it } from "vitest";
import {
  avec,
  entree,
  entreeParametree,
  GLOSSAIRE,
  GLOSSAIRE_PARAMETRE,
  LONGUEUR_MAX_PHRASE,
  TOUTES_LES_ENTREES,
} from "../glossaire";

/**
 * INVARIANTS DU GLOSSAIRE — `UI-005`
 *
 * Deux familles de gardes cohabitent ici, et elles ne protègent pas la même
 * chose.
 *
 * Les `@ts-expect-error` ci-dessous sont vérifiés par `npm run typecheck`, pas
 * par Vitest : ils échouent si la contrainte de type s'affaiblit, c'est-à-dire
 * si une bulle de trois phrases redevient écrivable. Un `@ts-expect-error` qui
 * ne trouve plus d'erreur est lui-même une erreur — c'est ce qui leur donne des
 * dents.
 *
 * Le reste tient à l'exécution : ce que le type ne peut pas dire — longueur,
 * unicité d'un terme, absence de jeton non substitué.
 */

/** Une phrase se termine par une ponctuation finale. */
const TERMINEE = /[.…!?]$/u;
/** Une ponctuation finale suivie d'une espace, c'est une phrase de plus. */
const COUPURE = /[.…!?]\s/u;
/** Un jeton attend une valeur réglementaire : il ne doit jamais atteindre l'écran. */
const JETON = /\{(\w+)\}/u;

describe("la règle des deux phrases est portée par le type", () => {
  it("accepte deux phrases terminées", () => {
    const e = entree({
      terme: "essai",
      accroche: "Première phrase.",
      suite: "Seconde phrase.",
    });
    expect(e.suite).toBe("Seconde phrase.");
  });

  it("refuse une troisième phrase, une phrase inachevée, ou un texte assemblé", () => {
    const construit: string = "35 %";

    // @ts-expect-error deux phrases dans la `suite` : la bulle en compterait trois.
    entree({ terme: "essai", accroche: "Une.", suite: "Deux. Trois." });

    // @ts-expect-error phrase sans ponctuation finale.
    entree({ terme: "essai", accroche: "Une", suite: "Deux." });

    // @ts-expect-error un jeton n'a rien à faire dans une entrée prête.
    entree({ terme: "essai", accroche: "Une {valeur}.", suite: "Deux." });

    // @ts-expect-error un texte assemblé à l'exécution échappe au contrôle du type : refusé.
    entree({ terme: "essai", accroche: `Le plafond est de ${construit}.`, suite: "Deux." });

    // @ts-expect-error la règle vaut aussi pour les entrées paramétrées.
    entreeParametree({ terme: "essai", accroche: "Une {v}.", suite: "Deux. Trois." });

    // Rien à exécuter : la garde est le fait que ce fichier compile encore.
    expect(true).toBe(true);
  });
});

describe("substitution des valeurs réglementaires", () => {
  it("remplace chaque jeton par la valeur reçue", () => {
    const rendue = avec(GLOSSAIRE_PARAMETRE.duree, {
      plafond: "25 ans",
      derogatoire: "27 ans",
      partTravaux: "10,0 %",
    });
    expect(rendue.suite).toContain("25 ans");
    expect(rendue.suite).toContain("27 ans");
    expect(rendue.suite).toContain("10,0 %");
    expect(rendue.suite).not.toMatch(JETON);
  });

  it("refuse à l'exécution un jeton laissé sans valeur", () => {
    // Le type l'interdit déjà ; ce chemin couvre l'appel non typé, par exemple
    // depuis un module JavaScript ou après une désérialisation.
    const incomplet = { plafond: "25 ans" } as unknown as Readonly<
      Record<"plafond" | "derogatoire" | "partTravaux", string>
    >;
    expect(() => avec(GLOSSAIRE_PARAMETRE.duree, incomplet)).toThrow(/derogatoire/);
  });
});

describe("invariants de toutes les entrées", () => {
  const nommees: readonly (readonly [string, { terme: string; accroche: string; suite: string }])[] =
    [...Object.entries(GLOSSAIRE), ...Object.entries(GLOSSAIRE_PARAMETRE)];

  it("le glossaire n'est pas vide et couvre les deux familles", () => {
    expect(Object.keys(GLOSSAIRE).length).toBeGreaterThan(0);
    expect(Object.keys(GLOSSAIRE_PARAMETRE).length).toBeGreaterThan(0);
    expect(TOUTES_LES_ENTREES).toHaveLength(nommees.length);
  });

  it.each(nommees)("« %s » porte trois champs non vides et sans espace parasite", (_cle, e) => {
    for (const champ of [e.terme, e.accroche, e.suite]) {
      expect(champ.length).toBeGreaterThan(0);
      expect(champ).toBe(champ.trim());
      expect(champ).not.toMatch(/ {2}/u);
    }
  });

  it.each(nommees)("« %s » tient en exactement une phrase par champ", (_cle, e) => {
    for (const phrase of [e.accroche, e.suite]) {
      expect(phrase, `« ${phrase} » ne se termine pas`).toMatch(TERMINEE);
      expect(phrase, `« ${phrase} » contient une coupure de phrase`).not.toMatch(COUPURE);
    }
  });

  it.each(nommees)("« %s » reste sous le plafond de longueur", (_cle, e) => {
    // Au-delà, ce n'est plus une bulle : c'est une fiche, et elle a son propre
    // emplacement (`CNT-002`).
    expect(e.accroche.length).toBeLessThanOrEqual(LONGUEUR_MAX_PHRASE);
    expect(e.suite.length).toBeLessThanOrEqual(LONGUEUR_MAX_PHRASE);
    expect(e.terme.length).toBeLessThanOrEqual(40);
  });

  it("aucun terme n'est défini deux fois", () => {
    // Deux définitions d'un même terme, c'est la dispersion que le produit
    // reproche aux simulateurs existants, reproduite à l'intérieur.
    const termes = TOUTES_LES_ENTREES.map((e) => e.terme.toLocaleLowerCase("fr-FR"));
    expect(new Set(termes).size).toBe(termes.length);
  });

  it("aucune entrée prête ne porte de jeton, chaque entrée paramétrée en porte un", () => {
    for (const [cle, e] of Object.entries(GLOSSAIRE)) {
      expect(`${e.accroche}${e.suite}`, `« ${cle} » attend une valeur : sa place est dans GLOSSAIRE_PARAMETRE`).not.toMatch(JETON);
    }
    for (const [cle, e] of Object.entries(GLOSSAIRE_PARAMETRE)) {
      expect(`${e.accroche}${e.suite}`, `« ${cle} » n'attend aucune valeur : sa place est dans GLOSSAIRE`).toMatch(JETON);
    }
  });

  it("aucune entrée ne recommande quoi que ce soit", () => {
    // « Le produit calcule des scénarios, l'utilisateur décide » — CLAUDE.md.
    // La formule est grossière et ne remplace pas une relecture ; elle attrape
    // la rechute la plus probable, celle du conseil déguisé en pédagogie.
    const injonctions = /\bvous devriez\b|\bnous (?:vous )?recommandons\b|\bil (?:vous )?faut (?:absolument|impérativement)\b|\bpréférez\b|\bchoisissez\b/iu;
    for (const e of TOUTES_LES_ENTREES) {
      expect(`${e.accroche} ${e.suite}`, `« ${e.terme} » recommande`).not.toMatch(injonctions);
    }
  });
});
