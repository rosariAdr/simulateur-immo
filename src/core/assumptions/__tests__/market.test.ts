import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MARKET_2026 } from "../market";
import type { FourchetteObservee, HypotheseChiffree } from "../market";
import { PARAMS_2026 } from "../../fiscal/params";

/** Ce que porte une entrée d'hypothèse, avec ou sans valeur centrale. */
type Hypothese = HypotheseChiffree | FourchetteObservee;

/**
 * LA SÉPARATION LOI / MARCHÉ — `FIS-005`
 *
 * Ce que ces tests gardent n'est pas un calcul, c'est une frontière. Elle est
 * facile à refranchir sans y penser : la prochaine fois qu'une valeur de marché
 * sera nécessaire, le réflexe sera de l'ajouter dans `params.ts`, où il y a déjà
 * tout le reste.
 *
 * Voir `docs/ADR.md`, ADR-008.
 */

const PARAMS_SRC = readFileSync(join(process.cwd(), "src/core/fiscal/params.ts"), "utf8");

describe("le millésime fiscal ne contient que des valeurs de loi", () => {
  it("ne porte plus les coûts de garantie", () => {
    // Le champ a disparu du type ; ce test garde la VALEUR, au cas où quelqu'un
    // le rétablirait par un `as` ou un élargissement de type.
    expect(Object.keys(PARAMS_2026)).not.toContain("guarantee");
  });

  it("n'a plus de valeur en attente de vérification faute de source", () => {
    // Le `TODO_VERIFY` des garanties était insoluble : vérifier « à la source »
    // suppose une source qui fasse autorité, et il n'y en a pas pour une grille
    // commerciale. Les `TODO_VERIFY` restants portent tous sur du droit, donc
    // sur quelque chose qui se vérifie vraiment.
    // On compte le MARQUEUR `@todo TODO_VERIFY`, pas le mot : le fichier
    // mentionne aussi la convention en prose, et compter les occurrences
    // brutes ferait rougir ce test au premier commentaire qui en parle.
    const restants = PARAMS_SRC.match(/@todo\s+TODO_VERIFY/g) ?? [];
    expect(PARAMS_SRC).not.toMatch(/@todo\s+TODO_VERIFY[^\n]*caution/i);
    expect(
      restants.length,
      "le compte de valeurs à vérifier a changé — mettre à jour docs/TASKS.md, ticket FIS-002",
    ).toBe(2);
  });

  it("ne contient plus aucune fourchette indicative", () => {
    // La phrase inscrite dans params.ts — « ce fichier ne contient plus que des
    // valeurs dont un article peut être cité » — doit rester vraie. Trois séries
    // l'ont quitté : garanties, taux d'assurance, frais d'acquisition. Une
    // quatrième glisserait sans bruit.
    expect(PARAMS_SRC).not.toMatch(/fourchettes? indicatives?/i);
    expect(PARAMS_SRC).not.toMatch(/pas des valeurs réglementaires/i);
  });

  it("garde une trace écrite du déplacement", () => {
    // Un champ qui disparaît sans explication ressemble à un oubli. Celui-ci
    // doit rester lisible dans le fichier qui l'a perdu.
    expect(PARAMS_SRC).toMatch(/FIS-005/);
    expect(PARAMS_SRC).toMatch(/assumptions\/market/);
  });
});

describe("chaque hypothèse de marché déclare ce qu'elle vaut", () => {
  it("porte un relevé daté, et non un millésime légal", () => {
    // Ces valeurs n'ont pas d'exercice : elles ont une date de lecture.
    expect(MARKET_2026.releve).toMatch(/^\d{4}-\d{2}$/);
  });

  it("couvre les cinq coûts de garantie", () => {
    expect(Object.keys(MARKET_2026.guarantee)).toHaveLength(5);
  });

  /**
   * La garde parcourt TOUS les blocs, pas seulement `guarantee`.
   *
   * Elle ne les nommait pas : elle itérait sur `MARKET_2026.guarantee`, si bien
   * que les blocs ajoutés ensuite — `insurance`, `acquisition`, `detention` —
   * échappaient à chacune de ses vérifications sans qu'aucun test ne rougisse.
   * Le défaut a été signalé par l'agent qui a écrit `detention`, dont les quatre
   * entrées en furent la première démonstration.
   *
   * Le parcours part donc de la structure, ce qui fait entrer dans la garde tout
   * bloc futur du seul fait de son existence. Le prochain n'aura rien à faire.
   */
  const blocs = Object.entries(MARKET_2026).filter(
    (paire): paire is [string, Record<string, Hypothese>] => typeof paire[1] === "object",
  );

  it("ne laisse aucun bloc hors de portée de cette garde", () => {
    // Si ce compte cesse de correspondre, c'est qu'un bloc a été ajouté ou
    // retiré — et il faut le regarder, pas ajuster le chiffre par réflexe.
    //
    // `rendements` est entré le 23 août 2026 avec `FIS-006`, qui l'a rapatrié
    // de `compare/portefeuille.ts`. Cette liste a rougi à ce moment-là, et
    // c'était son travail : elle a obligé à venir écrire ici que l'ajout était
    // voulu, au lieu de le laisser passer.
    //
    // `location` est entré le 25 août 2026 avec `ENG-029` : les quatre ordres
    // de grandeur du scénario « louer plutôt que vendre » — vacance, gestion,
    // amortissement du meublé et part amortissable. Même rituel.
    expect(blocs.map(([nom]) => nom).sort()).toEqual([
      "acquisition",
      "detention",
      "guarantee",
      "insurance",
      "location",
      "rendements",
      "vente",
    ]);
  });

  for (const [bloc, entrees] of blocs) {
    for (const [nom, h] of Object.entries(entrees)) {
      describe(`${bloc}.${nom}`, () => {
        it("annonce une provenance lisible", () => {
          // Une phrase, pas un mot-clé : elle doit pouvoir être montrée à
          // l'utilisateur telle quelle quand il demande d'où sort un chiffre.
          expect(
            h.provenance.length,
            "provenance trop courte pour dire quoi que ce soit",
          ).toBeGreaterThan(60);
          expect(h.provenance.trim().endsWith("."), "provenance non terminée").toBe(true);
        });

        it("annonce une fiabilité, et pas la plus flatteuse par défaut", () => {
          expect(["observee", "estimee"]).toContain(h.fiabilite);
        });

        it("déclare un intervalle ordonné et plausible", () => {
          // La borne basse n'est PAS plancherée à zéro, et ce n'est pas un oubli.
          //
          // Cette garde l'exigeait, parce qu'elle était née sur des coûts — une
          // commission, une prime, des frais, qui ne sont jamais négatifs. Le
          // premier taux de variation entré dans le fichier l'a fait rougir :
          // l'appréciation d'un bien immobilier a pour intervalle [−2 ; +4], et
          // un marché qui baisse est précisément ce qu'un simulateur honnête doit
          // pouvoir représenter. La garde encodait une hypothèse sur le monde,
          // pas un invariant.
          //
          // Reste ce qui vaut pour tous : des bornes ordonnées, et des grandeurs
          // qui restent des pourcentages.
          const [bas, haut] = h.intervalle;
          expect(bas, `${bloc}.${nom} : intervalle inversé`).toBeLessThanOrEqual(haut);
          expect(bas, `${bloc}.${nom} : borne basse invraisemblable`).toBeGreaterThanOrEqual(-100);
          expect(haut, `${bloc}.${nom} : borne haute invraisemblable`).toBeLessThanOrEqual(100);
        });

        it("tient dans l'intervalle qu'elle déclare", () => {
          // L'invariant qui compte, pour les hypothèses qui portent une valeur
          // centrale. Modifier une valeur sans toucher à son intervalle — ou
          // l'inverse — est l'erreur qu'on commet en relisant vite une grille
          // tarifaire, et elle ne se voit pas à l'œil.
          //
          // Les fourchettes sans valeur centrale sautent ce test : leur donner
          // une moyenne inventée serait précisément ce que le type refuse.
          if (!("valeur" in h)) return;
          const [bas, haut] = h.intervalle;
          expect(h.valeur, `${bloc}.${nom} : valeur hors de son propre intervalle`).toBeGreaterThanOrEqual(bas);
          expect(h.valeur, `${bloc}.${nom} : valeur hors de son propre intervalle`).toBeLessThanOrEqual(haut);
        });
      });
    }
  }
});

describe("le déplacement ne change aucun chiffre", () => {
  /**
   * ── DEUX DÉPLACEMENTS, DEUX ÂGES ────────────────────────────────────────
   *
   * `FIS-005` a sorti cinq coûts de garantie de `fiscal/params.ts` sans les
   * modifier, et ce bloc gardait leurs valeurs d'avant déplacement. Ce travail
   * est fait : `FIS-006` a ensuite recoupé ces cinq valeurs sur des documents
   * publiés et en a corrigé deux, **délibérément et avec leur source dans la
   * provenance**. La garde de `FIS-005` a donc rougi une dernière fois, pour la
   * bonne raison, et elle est remplacée ci-dessous par ce qu'elle est devenue :
   * un ancrage des valeurs recoupées, qui échoue toujours sur une dérive muette.
   *
   * `FIS-006` apporte à son tour un déplacement — `RENDEMENTS_NETS_OBSERVES`,
   * venu de `compare/portefeuille.ts` — et lui applique la discipline que
   * `FIS-005` s'était appliquée : pas un chiffre ne bouge, et un test le dit.
   */

  it("garde les cinq coûts de garantie, recoupés le 23 août 2026", () => {
    // Ces valeurs ne sont plus celles de params.ts : deux ont été corrigées
    // contre des documents ouverts — deux exemples représentatifs de la Société
    // Générale pour la caution, la page du Crédit Agricole pour l'hypothèque.
    // Toute nouvelle correction se justifie de la même façon, dans la
    // provenance, avant de venir toucher à cette ligne.
    const g = MARKET_2026.guarantee;
    expect(g.suretyshipCostPct.valeur).toBe(1.35);
    expect(g.suretyshipRefundPct.valeur).toBe(55);
    expect(g.mortgageCostPct.valeur).toBe(1.35);
    expect(g.mortgageReleasePct.valeur).toBe(0.4);
    expect(g.pledgeCostPct.valeur).toBe(0.3);
  });

  it("reprend à l'identique les rendements qui vivaient dans portefeuille.ts", () => {
    // Même motif que `FIS-005`, même raison : un remaniement qui corrige au
    // passage est un remaniement qu'on ne peut plus relire. Ces quatre bornes
    // sont celles du 22 août 2026, écrites par `ENG-011` dans
    // `compare/portefeuille.ts`, où un commentaire annonçait déjà qu'elles
    // étaient au mauvais endroit.
    const r = MARKET_2026.rendements;
    expect(r.sansRisque.intervalle).toEqual([1.5, 3]);
    expect(r.actionsDiversifiees.intervalle).toEqual([4, 7]);
  });

  it("ne laisse aucune hypothèse de marché derrière elle dans compare/", () => {
    // La garde qui compte vraiment : le déplacement n'a de sens que si l'ancien
    // emplacement est vide. Un `export const` resté en place, même inutilisé,
    // et le prochain lecteur aura deux sources de vérité — dont une périmée.
    const portefeuilleSrc = readFileSync(
      join(process.cwd(), "src/core/compare/portefeuille.ts"),
      "utf8",
    );
    expect(portefeuilleSrc).not.toMatch(/export\s+const\s+RENDEMENTS_NETS_OBSERVES/);
    expect(portefeuilleSrc).not.toMatch(/export\s+interface\s+FourchetteDeRendement/);
    // Et l'emplacement abandonné dit où c'est parti, sinon la disparition
    // ressemble à une suppression.
    expect(portefeuilleSrc).toMatch(/assumptions\/market/);
    expect(portefeuilleSrc).toMatch(/FIS-006/);
  });
});

describe("l'estimation ne se répand pas sans qu'on la voie", () => {
  /**
   * ── POURQUOI COMPTER ────────────────────────────────────────────────────
   *
   * `estimee` n'est pas interdit, et ne doit pas l'être : il y a des hypothèses
   * dont aucune source publique ne donne le chiffre, et le dire vaut mieux que
   * de maquiller. Ce qui serait grave, c'est que ce nombre monte tout seul —
   * une entrée ajoutée en `estimee` par facilité, une autre repassée en
   * `estimee` parce que sa source a disparu, et personne ne s'en aperçoit.
   *
   * Ce test ne juge donc pas la valeur du compte. Il exige qu'un changement de
   * compte soit un acte : quelqu'un vient ici, relit `FIS-006`, et écrit
   * pourquoi.
   */

  const toutes = Object.values(MARKET_2026)
    .filter((b): b is Record<string, Hypothese> => typeof b === "object")
    .flatMap((bloc) => Object.entries(bloc));

  const estimees = toutes.filter(([, h]) => h.fiabilite === "estimee").map(([nom]) => nom);

  it("compte quatorze hypothèses encore estimées, et pas une de plus", () => {
    // État au 23 août 2026, après la campagne de recoupement `FIS-006` : dix
    // entrées sur dix-sept restaient estimées, chacune avec, dans sa provenance,
    // la raison pour laquelle la vérification n'a pas abouti.
    //
    // Le 25 août 2026, `ENG-029` en ajoute quatre — les hypothèses de mise en
    // location. Toutes entrent en `estimee`, et chacune dit pourquoi : la
    // vacance n'a de mesure ouverte qu'en 2017, les barèmes de gestion sont
    // publiés par ceux qui les vendent, l'amortissement et la part de terrain
    // sont des conventions de praticien. Ce compte a rougi à leur arrivée,
    // comme il doit.
    //
    // Les noms sont listés et pas seulement dénombrés : une entrée qui passe
    // `observee` pendant qu'une autre retombe `estimee` laisserait le compte
    // intact et le tableau faux.
    expect(
      estimees.sort(),
      "le compte d'hypothèses en fiabilité `estimee` a changé — aller relire " +
        "docs/TASKS.md, tickets FIS-006 et ENG-029, et dire dans la provenance ce qui a bougé",
    ).toEqual([
      "actionsDiversifiees",
      "amortissementAnnuelPct",
      "appreciationAnnuellePct",
      "delegationRatePct",
      "fraisGestionPctLoyers",
      "groupRatePct",
      "indexationChargesPctAnnuel",
      "partAmortissableDuBienPct",
      "pledgeCostPct",
      "provisionTravauxPctAnnuel",
      "sansRisque",
      "suretyshipRefundPct",
      "totalFeesOldPct",
      "vacanceLocativePctLoyers",
    ]);
  });

  it("une hypothèse restée estimée dit pourquoi la vérification n'a pas abouti", () => {
    // La contrepartie de l'autorisation d'estimer. Une provenance qui se
    // contente d'un « ordre de grandeur » ne dit pas si on a cherché.
    const aveux =
      /pas (pu|été)|n'a pas|aucun|non aboutie|nulle part|ne publie|reste (donc )?(un ordre|estim)|notre (extension|décision|fait)/i;
    for (const [nom, h] of toutes.filter(([, x]) => x.fiabilite === "estimee")) {
      expect(h.provenance, `${nom} : estimée sans dire pourquoi`).toMatch(aveux);
    }
  });

  it("une hypothèse observée nomme le document qu'on a ouvert", () => {
    // Symétrique du précédent, et c'est celui qui protège contre la fiabilité
    // flatteuse : `observee` engage à citer, pas seulement à affirmer.
    for (const [nom, h] of toutes.filter(([, x]) => x.fiabilite === "observee")) {
      expect(
        h.provenance,
        `${nom} : observée sans source nommée`,
      ).toMatch(
        /INSEE|Société Générale|Crédit Agricole|Crédit Logement|notaires|Century 21|Journal officiel|Observatoire national des taxes foncières/i,
      );
    }
  });
});
