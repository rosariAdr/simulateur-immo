/**
 * LES HYPOTHÈSES DE DÉTENTION DÉCLARENT CE QU'ELLES VALENT — `ENG-010`
 *
 * `src/core/assumptions/__tests__/market.test.ts` applique déjà ces contrôles
 * aux cinq coûts de garantie, mais il les applique NOMMÉMENT à `guarantee` : un
 * bloc ajouté ailleurs dans le fichier échappe à sa boucle. Les quatre
 * hypothèses de détention en sont la première démonstration.
 *
 * Ce qui est gardé ici n'est aucun chiffre — ils vivent dans `market.ts` et ont
 * vocation à bouger quand `FIS-006` les recoupera. C'est la FORME : intervalle
 * cohérent, valeur dedans, provenance montrable, fiabilité déclarée.
 *
 * Et une chose de plus, propre à ce module : qu'aucune de ces valeurs ne soit
 * écrite en dur dans le calcul.
 */

import { describe, it, expect } from "vitest";
import { euros } from "../../money";
import { MARKET_2026, type MarketAssumptions } from "../../assumptions/market";
import { comparerDetention } from "../detention";

describe("les quatre hypothèses de détention", () => {
  const hypotheses = Object.entries(MARKET_2026.detention);

  it("sont au complet", () => {
    expect(hypotheses.map(([nom]) => nom).sort()).toEqual([
      "indexationChargesPctAnnuel",
      "indexationLoyerPctAnnuel",
      "indexationTaxeFoncierePctAnnuel",
      "provisionTravauxPctAnnuel",
    ]);
  });

  for (const [nom, h] of hypotheses) {
    describe(nom, () => {
      it("annonce une provenance lisible par un non-technicien", () => {
        expect(h.provenance.length, "provenance trop courte pour dire quoi que ce soit").toBeGreaterThan(
          60,
        );
        expect(h.provenance.trim().endsWith(".")).toBe(true);
      });

      it("annonce une fiabilité", () => {
        expect(["observee", "estimee"]).toContain(h.fiabilite);
      });

      it("tient dans l'intervalle qu'elle déclare", () => {
        // Modifier une valeur sans toucher à son intervalle — ou l'inverse — est
        // l'erreur qu'on commet en relisant vite, et elle ne se voit pas à l'œil.
        const [bas, haut] = h.intervalle;
        expect(bas, `${nom} : intervalle inversé`).toBeLessThanOrEqual(haut);
        expect(h.valeur, `${nom} : valeur hors de son propre intervalle`).toBeGreaterThanOrEqual(bas);
        expect(h.valeur, `${nom} : valeur hors de son propre intervalle`).toBeLessThanOrEqual(haut);
      });

      it("reste un pourcentage plausible", () => {
        expect(h.valeur).toBeGreaterThanOrEqual(-100);
        expect(h.valeur).toBeLessThanOrEqual(100);
      });
    });
  }

  it("ne prétend pas être vérifiée là où elle ne l'est pas", () => {
    // Les quatre sont des ordres de grandeur, pas des relevés concordants. Les
    // annoncer « observee » serait un mensonge peu coûteux et très efficace.
    // Le jour où `FIS-006` en recoupe une, ce test rougit — et c'est voulu :
    // il faut alors dire ici laquelle, et sur quoi.
    for (const [nom, h] of hypotheses) {
      expect(h.fiabilite, `${nom} : promotion en "observee" à justifier`).toBe("estimee");
    }
  });
});

describe("le calcul ne connaît aucune de ces valeurs", () => {
  /**
   * La garde est comportementale et non textuelle : on substitue un relevé aux
   * valeurs volontairement improbables, et on vérifie que le calcul les suit.
   *
   * Chercher les chiffres dans le source aurait été plus direct et moins sûr :
   * « 1 » et « 2 » apparaissent partout dans un code qui manipule des mois et
   * des index, et la garde aurait rougi pour rien. Celle-ci mord sur l'erreur
   * réelle — un défaut recopié en dur « en attendant », qui ne bougerait plus
   * quand le relevé bouge.
   */
  const AUTRE_RELEVE: MarketAssumptions = {
    ...MARKET_2026,
    releve: "1999-01",
    detention: {
      provisionTravauxPctAnnuel: { ...MARKET_2026.detention.provisionTravauxPctAnnuel, valeur: 4 },
      indexationLoyerPctAnnuel: { ...MARKET_2026.detention.indexationLoyerPctAnnuel, valeur: 25 },
      indexationTaxeFoncierePctAnnuel: {
        ...MARKET_2026.detention.indexationTaxeFoncierePctAnnuel,
        valeur: 50,
      },
      indexationChargesPctAnnuel: {
        ...MARKET_2026.detention.indexationChargesPctAnnuel,
        valeur: 75,
      },
    },
  };

  const scenario = (hypotheses: MarketAssumptions) =>
    comparerDetention({
      horizonMois: 24,
      hypotheses,
      proprietaire: {
        valeurBien: euros(100_000),
        taxeFonciereAnnuelle: euros(1_000),
        chargesCoproprieteAnnuelles: 0,
        assuranceHabitationAnnuelle: 0,
      },
      locataire: {
        loyerMensuelHorsCharges: euros(1_000),
        chargesLocativesMensuelles: 0,
        assuranceHabitationAnnuelle: 0,
      },
    });

  it("rapporte les paramètres du relevé qu'on lui donne, et non ceux du relevé courant", () => {
    const r = scenario(AUTRE_RELEVE);
    expect(r.parametres.releveHypotheses).toBe("1999-01");
    expect(r.parametres.provisionTravauxPctAnnuel).toBe(4);
    expect(r.parametres.indexations).toEqual({
      loyerPctAnnuel: 25,
      taxeFoncierePctAnnuel: 50,
      chargesPctAnnuel: 75,
    });
  });

  it("applique la provision du relevé : 4 % de 100 000 € font 4 000 €", () => {
    expect(scenario(AUTRE_RELEVE).annees[0]!.proprietaire.provisionTravaux).toBe(euros(4_000));
  });

  it("applique les indexations du relevé, chacune sur son poste", () => {
    const r = scenario(AUTRE_RELEVE);
    // Loyer : 1 000 € × 1,25 = 1 250 €/mois la deuxième année, soit 15 000 €.
    expect(r.annees[1]!.locataire.loyer).toBe(euros(15_000));
    // Taxe foncière : 1 000 € × 1,50 la deuxième année.
    expect(r.annees[1]!.proprietaire.taxeFonciere).toBe(euros(1_500));
    // Provision travaux : indexée aux charges, 4 000 € × 1,75.
    expect(r.annees[1]!.proprietaire.provisionTravaux).toBe(euros(7_000));
  });

  it("produit un résultat différent du relevé courant, faute de quoi la garde ne prouve rien", () => {
    expect(scenario(AUTRE_RELEVE).totaux.proprietaire.decaissement).not.toBe(
      scenario(MARKET_2026).totaux.proprietaire.decaissement,
    );
  });
});
