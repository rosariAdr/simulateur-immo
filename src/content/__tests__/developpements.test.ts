import { describe, expect, it } from "vitest";
import {
  DEVELOPPEMENTS,
  developpement,
  rendre,
  THEMES,
  type Developpement,
} from "../developpements";
import { ancre, CLES_GLOSSAIRE, lienGlossaire, type CleGlossaire } from "../glossaire";
import { ENTREES, VALEURS } from "../valeurs";

/**
 * LE TEXTE LONG DU GLOSSAIRE — `CNT-001`
 *
 * Trois familles de gardes, et elles ne protègent pas la même chose.
 *
 * AU TYPE, vérifié par `npm run typecheck` et non par Vitest : l'exhaustivité
 * de `DEVELOPPEMENTS` — `satisfies Record<CleGlossaire, Developpement>` —, et
 * l'appartenance des jetons à `VALEURS`, portée par la signature de
 * `developpement()`. Les `@ts-expect-error` ci-dessous leur donnent des dents :
 * un `@ts-expect-error` qui ne trouve plus d'erreur est lui-même une erreur.
 *
 * À L'EXÉCUTION : ce que le type ne peut pas dire — un renvoi vers une clé
 * inexistante, un thème vide, un développement qui n'en dit pas plus que la
 * bulle qu'il prolonge.
 *
 * SUR LE FOND : aucun chiffre réglementaire écrit à la main, aucune
 * recommandation. Ce sont les deux règles de `CLAUDE.md` qu'un contenu long
 * enfreint le plus facilement, parce que la place ne manque plus.
 */

/** Un jeton qui n'a pas trouvé sa valeur : il ne doit jamais atteindre l'écran. */
const JETON = /\{(\w+)\}/u;

/**
 * Un nombre suivi d'une unité réglementaire, écrit à la main.
 *
 * « 35 % », « 25 ans », « 200 000 € », « 6 mois » : exactement ce que
 * `CLAUDE.md` interdit d'écrire dans un texte, et qui doit venir de
 * `src/core/fiscal/params.ts` par un jeton. La date « 1er janvier » n'est pas
 * concernée : elle ne porte aucune de ces unités.
 */
const VALEUR_EN_DUR = /\d+(?:[.,\s  ]\d+)*\s*(?:%|€|\bans?\b|\bmois\b)/u;

const nommes: readonly (readonly [CleGlossaire, Developpement])[] = Object.entries(
  DEVELOPPEMENTS,
) as readonly (readonly [CleGlossaire, Developpement])[];

describe("les jetons et l'exhaustivité sont portés par le type", () => {
  it("refuse un jeton que `VALEURS` ne connaît pas", () => {
    // @ts-expect-error « plafondPtz » n'existe pas : il sortirait tel quel à l'écran.
    developpement({ theme: "pret", paragraphes: ["Le plafond vaut {plafondPtz}."] });

    // @ts-expect-error un thème inventé n'a pas de section où se ranger.
    developpement({ theme: "fiscalite", paragraphes: ["Un paragraphe."] });

    // @ts-expect-error un renvoi ne peut pointer que sur une clé du glossaire.
    developpement({ theme: "pret", paragraphes: ["Un paragraphe."], voirAussi: ["inexistant"] });

    // Un jeton connu passe, lui.
    expect(developpement({ theme: "pret", paragraphes: ["Plafonné à {plafond}."] }).paragraphes)
      .toHaveLength(1);
  });
});

describe("chaque entrée du glossaire a son développement", () => {
  it("aucune clé n'est orpheline dans un sens ni dans l'autre", () => {
    // Le `satisfies` du fichier l'impose déjà à la compilation. Ce test le dit
    // à l'exécution, et surtout il donne le NOM de la clé manquante — ce que le
    // message de TypeScript sur un objet de quarante-huit entrées ne fait pas.
    expect(Object.keys(DEVELOPPEMENTS).sort()).toEqual([...CLES_GLOSSAIRE].sort());
  });

  it("chaque thème déclaré porte au moins une entrée", () => {
    // Un thème vide, c'est un titre suivi de rien sur la page.
    for (const theme of THEMES) {
      const compte = nommes.filter(([, d]) => d.theme === theme.cle).length;
      expect(compte, `le thème « ${theme.titre} » est vide`).toBeGreaterThan(0);
    }
  });
});

describe("invariants de chaque développement", () => {
  it.each(nommes)("« %s » porte au moins un paragraphe, propre", (_cle, d) => {
    expect(d.paragraphes.length).toBeGreaterThan(0);
    for (const p of d.paragraphes) {
      expect(p).toBe(p.trim());
      expect(p).not.toMatch(/ {2}/u);
      expect(p.length).toBeGreaterThan(80);
    }
  });

  it.each(nommes)("« %s » en dit plus que sa bulle", (cle, d) => {
    // Un développement qui répète la bulle n'a pas lieu d'être : la page
    // deviendrait une liste d'infobulles mises bout à bout.
    const bulle = ENTREES[cle];
    const long = d.paragraphes.join(" ").length;
    expect(long, `le développement de « ${bulle.terme} » n'ajoute rien`).toBeGreaterThan(
      (bulle.accroche + bulle.suite).length * 1.5,
    );
  });

  it.each(nommes)("« %s » ne renvoie qu'à des clés existantes, et pas à elle-même", (cle, d) => {
    for (const autre of d.voirAussi) {
      expect(CLES_GLOSSAIRE, `« ${cle} » renvoie à « ${autre} »`).toContain(autre);
      expect(autre, `« ${cle} » se renvoie à elle-même`).not.toBe(cle);
    }
    expect(new Set(d.voirAussi).size, `« ${cle} » renvoie deux fois au même terme`).toBe(
      d.voirAussi.length,
    );
  });

  it.each(nommes)("« %s » n'écrit aucune valeur réglementaire à la main", (_cle, d) => {
    for (const p of d.paragraphes) {
      // Le texte SOURCE, jetons non substitués : c'est là que la faute se
      // commet. Après substitution, tout ressemble à une valeur écrite en dur.
      expect(p, `valeur écrite en dur : « ${p} »`).not.toMatch(VALEUR_EN_DUR);
    }
  });

  it.each(nommes)("« %s » ne recommande rien", (_cle, d) => {
    // Même formule que pour les bulles : le conseil déguisé en pédagogie est la
    // rechute la plus probable, et la place ne manque plus dans un texte long.
    const injonctions =
      /\bvous devriez\b|\bnous (?:vous )?recommandons\b|\bil (?:vous )?faut (?:absolument|impérativement)\b|\bpréférez\b|\bchoisissez\b|\bmieux vaut\b/iu;
    for (const p of d.paragraphes) {
      expect(p, `« ${p} » recommande`).not.toMatch(injonctions);
    }
  });
});

describe("substitution des valeurs réglementaires", () => {
  it("aucun jeton ne survit au rendu, ni dans les bulles ni dans les développements", () => {
    for (const [cle, d] of nommes) {
      for (const p of rendre(d)) {
        expect(p, `jeton non substitué dans le développement de « ${cle} »`).not.toMatch(JETON);
      }
      const e = ENTREES[cle];
      expect(`${e.accroche} ${e.suite}`, `jeton non substitué dans la bulle « ${cle} »`).not.toMatch(
        JETON,
      );
    }
  });

  it("refuse à l'exécution un jeton absent du dictionnaire", () => {
    // Le type l'interdit déjà ; ce chemin couvre l'appel non typé.
    const bricole = { theme: "pret", paragraphes: ["Le plafond vaut {inconnu}."], voirAussi: [] };
    expect(() => rendre(bricole as Developpement)).toThrow(/inconnu/);
  });

  it("chaque valeur du dictionnaire est une chaîne prête à lire", () => {
    for (const [cle, valeur] of Object.entries(VALEURS)) {
      expect(valeur.length, `« ${cle} » est vide`).toBeGreaterThan(0);
      expect(valeur, `« ${cle} » n'est pas nettoyée`).toBe(valeur.trim());
      expect(valeur, `« ${cle} » contient encore un jeton`).not.toMatch(JETON);
    }
  });
});

describe("les ancres du glossaire", () => {
  it("chaque terme donne une ancre non vide et unique", () => {
    // Deux termes qui se réduiraient à la même ancre feraient tomber le lien
    // d'une bulle sur la définition d'une autre, sans erreur visible.
    const ancres = CLES_GLOSSAIRE.map((c) => ancre(ENTREES[c].terme));
    for (const [i, a] of ancres.entries()) {
      expect(a, `ancre vide pour « ${ENTREES[CLES_GLOSSAIRE[i]!]!.terme} »`).not.toBe("");
      expect(a, `« ${a} » n'est pas une ancre d'URL`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    }
    expect(new Set(ancres).size).toBe(ancres.length);
  });

  it("l'ancre survit aux accents, aux apostrophes et aux capitales", () => {
    expect(ancre("TAEG")).toBe("taeg");
    expect(ancre("taux d'usure")).toBe("taux-d-usure");
    expect(ancre("délégation d'assurance")).toBe("delegation-d-assurance");
    expect(ancre("vente en l'état futur d'achèvement")).toBe("vente-en-l-etat-futur-d-achevement");
  });

  it("le lien d'une bulle pointe vers la page du glossaire", () => {
    expect(lienGlossaire("taux d'usure")).toBe("/glossaire#taux-d-usure");
  });
});
