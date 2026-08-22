import { describe, it, expect } from "vitest";
import { euros, toEuros } from "../../money";
import { PARAMS_2026 as P } from "../../fiscal/params";
import { guaranteeCost } from "../plan";

/**
 * COÛT DE GARANTIE ET PART RESTITUABLE — `ENG-005`
 *
 * Pourquoi ce fichier existe alors que `src/core/credit/**` est gelé (ADR-004) :
 * il n'y touche pas. Il ajoute de la couverture sur du code déjà écrit, sans
 * modifier une ligne vérifiée. Le gel protège un acquis ; l'éprouver le sert.
 *
 * Le trou qu'il comble est réel. Avant lui, `suretyship` était la seule garantie
 * jamais exercée par un test — alors que l'interface propose aussi l'hypothèque
 * et le nantissement, et que le coût de mainlevée est un chiffre que
 * l'utilisateur voit.
 *
 * ═══ CE QUE CES TESTS NE PROUVENT PAS ═══
 *
 * Les barèmes de `params.guarantee` sont des ordres de grandeur de MARCHÉ, pas
 * des valeurs réglementaires : aucune loi ne les fixe, les organismes de caution
 * publient des grilles progressives qui dépendent du montant. C'est le ticket
 * `FIS-005`, et c'est pourquoi ces tests portent sur des **relations** —
 * proportionnalité, restitution, assiette — et jamais sur un montant béni.
 *
 * Un test qui figerait « 2 250 € » donnerait l'illusion que ce chiffre a été
 * vérifié quelque part. Il ne l'a pas été.
 */

const CAPITAL = euros(180_000);
const PRIX = euros(205_000);

describe("caution d'un organisme", () => {
  const g = guaranteeCost("suretyship", CAPITAL, PRIX, P);

  it("coûte une fraction du capital garanti, et non du prix du bien", () => {
    // L'assiette est le capital emprunté : c'est lui que l'organisme garantit.
    const surCapitalDouble = guaranteeCost("suretyship", CAPITAL * 2, PRIX, P);
    expect(surCapitalDouble.cost).toBe(g.cost * 2);

    // Changer le prix du bien sans changer le capital ne change rien.
    const autrePrix = guaranteeCost("suretyship", CAPITAL, PRIX * 3, P);
    expect(autrePrix.cost).toBe(g.cost);
  });

  it("restitue une part au terme, strictement inférieure au coût", () => {
    // C'est la contribution au fonds mutuel de garantie qui revient, pas la
    // commission. Une restitution totale signalerait une garantie gratuite.
    expect(g.refundAtTerm).toBeGreaterThan(0);
    expect(g.refundAtTerm).toBeLessThan(g.cost);
  });

  it("ne coûte aucune mainlevée en cas de revente anticipée", () => {
    // C'est l'avantage structurel de la caution sur l'hypothèque, et l'arbitrage
    // que l'interface doit permettre de faire.
    expect(g.releaseCostOnEarlySale).toBe(0);
  });
});

describe("hypothèque", () => {
  const g = guaranteeCost("mortgage", CAPITAL, PRIX, P);

  it("ne restitue rien au terme", () => {
    expect(g.refundAtTerm).toBe(0);
  });

  it("coûte une mainlevée en cas de revente avant terme, assise sur le prix du bien", () => {
    expect(g.releaseCostOnEarlySale).toBeGreaterThan(0);

    // Assiette : le prix du bien, et non le capital emprunté. La mainlevée est un
    // acte sur l'immeuble ; deux emprunteurs au même capital sur des biens de
    // prix différents ne paient pas la même chose.
    const bienPlusCher = guaranteeCost("mortgage", CAPITAL, PRIX * 2, P);
    expect(bienPlusCher.releaseCostOnEarlySale).toBe(g.releaseCostOnEarlySale * 2);
    expect(bienPlusCher.cost).toBe(g.cost);
  });

  it("son coût initial porte sur le capital garanti", () => {
    const capitalDouble = guaranteeCost("mortgage", CAPITAL * 2, PRIX, P);
    expect(capitalDouble.cost).toBe(g.cost * 2);
  });
});

describe("nantissement", () => {
  const g = guaranteeCost("pledge", CAPITAL, PRIX, P);

  it("ne restitue rien et ne coûte aucune mainlevée", () => {
    expect(g.refundAtTerm).toBe(0);
    expect(g.releaseCostOnEarlySale).toBe(0);
  });

  it("est la moins chère des trois à l'entrée", () => {
    // Il n'y a ni acte notarié ni fonds mutuel à alimenter : le nantissement
    // s'adosse à une épargne que l'emprunteur possède déjà.
    const caution = guaranteeCost("suretyship", CAPITAL, PRIX, P);
    const hypotheque = guaranteeCost("mortgage", CAPITAL, PRIX, P);
    expect(g.cost).toBeLessThan(caution.cost);
    expect(g.cost).toBeLessThan(hypotheque.cost);
  });
});

describe("les trois garanties", () => {
  it("portent toutes le type demandé, et rien d'autre", () => {
    for (const kind of ["suretyship", "mortgage", "pledge"] as const) {
      expect(guaranteeCost(kind, CAPITAL, PRIX, P).kind).toBe(kind);
    }
  });

  it("ne produisent ni coût négatif ni restitution supérieure au coût", () => {
    for (const kind of ["suretyship", "mortgage", "pledge"] as const) {
      const g = guaranteeCost(kind, CAPITAL, PRIX, P);
      expect(g.cost, kind).toBeGreaterThanOrEqual(0);
      expect(g.refundAtTerm, kind).toBeGreaterThanOrEqual(0);
      expect(g.releaseCostOnEarlySale, kind).toBeGreaterThanOrEqual(0);
      expect(g.refundAtTerm, kind).toBeLessThanOrEqual(g.cost);
    }
  });

  it("rendent tout à zéro sur un capital nul", () => {
    for (const kind of ["suretyship", "mortgage", "pledge"] as const) {
      const g = guaranteeCost(kind, 0, PRIX, P);
      expect(g.cost, kind).toBe(0);
      expect(g.refundAtTerm, kind).toBe(0);
    }
  });

  it("restent des entiers de centimes", () => {
    // Aucune fraction de centime ne doit survivre à l'application d'un
    // pourcentage — c'est l'invariant qui tient toute l'arithmétique du moteur.
    for (const kind of ["suretyship", "mortgage", "pledge"] as const) {
      const g = guaranteeCost(kind, euros(137_777), euros(212_345), P);
      expect(Number.isInteger(g.cost), kind).toBe(true);
      expect(Number.isInteger(g.refundAtTerm), kind).toBe(true);
      expect(Number.isInteger(g.releaseCostOnEarlySale), kind).toBe(true);
    }
  });
});

describe("ce que l'interface affiche", () => {
  it("l'arbitrage caution / hypothèque dépend de l'horizon de revente", () => {
    // L'infobulle du champ « Garantie » dit que la caution restitue une part au
    // terme et que l'hypothèque coûte une mainlevée si l'on revend avant. Ce
    // test vérifie que le moteur porte bien cette asymétrie — sans elle, le
    // texte affirmerait quelque chose que le calcul ne fait pas.
    const caution = guaranteeCost("suretyship", CAPITAL, PRIX, P);
    const hypotheque = guaranteeCost("mortgage", CAPITAL, PRIX, P);

    const coutCautionAuTerme = caution.cost - caution.refundAtTerm;
    const coutHypothequeSiRevente = hypotheque.cost + hypotheque.releaseCostOnEarlySale;

    expect(toEuros(coutCautionAuTerme)).toBeGreaterThan(0);
    expect(coutHypothequeSiRevente).toBeGreaterThan(hypotheque.cost);
  });
});
