/**
 * SCÉNARIO DE LOCATION COURTE DURÉE — `ENG-015`
 *
 * Même architecture de preuve que `ENG-029` : des cas de référence posés à la
 * main avec les hypothèses par défaut du relevé (commission 16 %, conciergerie
 * 25 %, provision 1 %, indexations 1,5 / 3,2 / 2,0 — s'il change, ces cas
 * rougissent, et c'est voulu), la circulation des reports, et le fil qui va de
 * l'impôt annuel jusqu'à l'assiette de plus-value.
 *
 * Ce que la courte durée ajoute, et que ces tests doivent prouver :
 *
 * — les revenus naissent d'un tarif et d'un taux d'occupation, jamais d'un
 *   loyer ; l'occupation est obligatoire et sans défaut ;
 * — l'ameublement sort en caisse l'année 1 et s'amortit au réel sur la durée
 *   du mobilier, dont la somme des dotations SOLDE exactement ;
 * — à la revente, seul l'amortissement du bâti se réintègre — le mobilier
 *   reste dehors, et la convention d'imputation « bâti d'abord » est prudente ;
 * — les seuils de la courte durée mordent tôt : 15 000 € pour le micro non
 *   classé, 23 000 € pour l'affiliation.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { euros } from "../../money";
import type { Cents } from "../../money";
import type { ConsolidatedRow, GuaranteeCost } from "../../credit/plan";
import type { CreditReprisPourVente } from "../vente";
import {
  projeterLocationCourteDuree,
  type EntreeLocationCourteDuree,
} from "../location-courte-duree";

/* ── Outils de scénario ───────────────────────────────────────────────────── */

function echeancierConstant(
  mois: number,
  parMois: { interest: Cents; insurance: Cents; principal: Cents },
  capitalInitial: Cents,
): readonly ConsolidatedRow[] {
  const rows: ConsolidatedRow[] = [];
  for (let m = 1; m <= mois; m++) {
    rows.push({
      month: m,
      year: Math.ceil(m / 12),
      interest: parMois.interest,
      principal: parMois.principal,
      insurance: parMois.insurance,
      payment: parMois.interest + parMois.principal + parMois.insurance,
      balance: Math.max(0, capitalInitial - parMois.principal * m),
    });
  }
  return rows;
}

const SANS_GARANTIE: GuaranteeCost = {
  kind: "mortgage",
  cost: 0,
  refundAtTerm: 0,
  releaseCostOnEarlySale: 0,
};

function credit(rows: readonly ConsolidatedRow[], totalPrincipal: Cents): CreditReprisPourVente {
  return { plan: { rows, guarantee: SANS_GARANTIE, totalPrincipal }, tauxMoyenAnnuelPct: 3 };
}

/** Entrée de base : comptant, meublé de tourisme classé au micro, dès le mois 1. */
function entreeComptant(
  e: Partial<EntreeLocationCourteDuree> = {},
): EntreeLocationCourteDuree {
  return {
    moisMiseEnLocation: 1,
    dureeLocationAnnees: 3,
    tarifNuitee: euros(100),
    tauxOccupationPct: 60,
    valeurInitiale: euros(200_000),
    appreciationAnnuellePct: 2,
    regime: { type: "micro-bic", categorie: "tourisme-classe" },
    tmiPct: 30,
    regimeSocial: "affilie-france",
    taxeFonciereAnnuelle: euros(1_200),
    chargesExploitationAnnuelles: euros(2_400),
    assurancePnoAnnuelle: euros(150),
    ameublementInitial: euros(8_000),
    fraisAcquisition: { mode: "reel", montant: 0 },
    travaux: { mode: "reel", montant: 0 },
    ...e,
  };
}

/* ══ CAS A — comptant, micro classé, les postes à la main ══════════════════ */

describe("cas A — comptant, meublé de tourisme classé au micro", () => {
  /*
   * Année 1 :
   *
   *   revenus bruts      100 € × 365 nuits × 60 %     21 900,00
   *   commission         16 %                          3 504,00
   *   conciergerie       25 %                          5 475,00
   *   charges            1 200 + 2 400 + 150
   *                      + 1 % × 200 000               5 750,00
   *   ameublement        année 1 seulement             8 000,00
   *   impôt micro classé base 50 % × 21 900 = 10 950
   *                      IR 3 285 + PS 18,6 % 2 036,70 5 321,70
   *   flux net           21 900 − 3 504 − 5 475
   *                      − 5 750 − 8 000 − 5 321,70   −6 150,70
   */
  const r = projeterLocationCourteDuree(entreeComptant());
  const a1 = r.annees[0]!;

  it("compte l'année 1 poste par poste, ameublement compris", () => {
    expect(a1.revenusBruts).toBe(euros(21_900));
    expect(a1.commissionPlateforme).toBe(euros(3_504));
    expect(a1.conciergerie).toBe(euros(5_475));
    expect(a1.chargesProprietaire).toBe(euros(5_750));
    expect(a1.ameublement).toBe(euros(8_000));
    expect(a1.mensualites).toBe(0);
    expect(a1.impot.baseImposable).toBe(euros(10_950));
    expect(a1.impot.impotTotal).toBe(euros(5_321.7));
    expect(a1.fluxNet).toBe(euros(-6_150.7));
  });

  it("ne décaisse l'ameublement qu'une fois", () => {
    expect(r.annees[1]!.ameublement).toBe(0);
    expect(r.totaux.ameublement).toBe(euros(8_000));
  });

  it("indexe le tarif comme un loyer : 100 € devient 101,50 €", () => {
    // 365 × 101,50 × 60 % = 22 228,50.
    expect(r.annees[1]!.revenusBruts).toBe(euros(22_228.5));
  });

  it("prend la meublée à 18,6 % et ne lève aucune alerte sous les deux seuils", () => {
    expect(a1.impot.tauxPrelevementsSociauxPct).toBe(18.6);
    expect(a1.impot.alertes).toHaveLength(0);
  });

  it("revend au régime imposable après la durée d'exploitation", () => {
    expect(r.horizonCessionMois).toBe(36);
    expect(r.cession.plusValue).not.toBeNull();
    expect(r.cession.grandeurs.dureeDetentionMois).toBe(36);
  });

  it("expose l'occupation et les taux retenus", () => {
    expect(r.parametres.tauxOccupationPct).toBe(60);
    expect(r.parametres.commissionPlateformePctRevenus).toBe(16);
    expect(r.parametres.conciergeriePctRevenus).toBe(25);
    expect(r.parametres.amortissementMobilierAnnees).toBeNull();
  });
});

/* ══ CAS B — les seuils de la courte durée mordent tôt ═════════════════════ */

describe("cas B — seuils", () => {
  it("signale l'affiliation dès que les recettes passent 23 000 €", () => {
    // 65 % d'occupation : 365 × 100 × 65 % = 23 725 € — au-delà du seuil.
    const r = projeterLocationCourteDuree(entreeComptant({ tauxOccupationPct: 65 }));
    expect(r.annees[0]!.impot.alertes).toContainEqual({
      type: "affiliation-courte-duree",
      seuil: euros(23_000),
      recettes: euros(23_725),
    });
  });

  it("signale l'inéligibilité du micro non classé dès 15 000 €", () => {
    const r = projeterLocationCourteDuree(
      entreeComptant({ regime: { type: "micro-bic", categorie: "tourisme-non-classe" } }),
    );
    const a1 = r.annees[0]!;
    // 21 900 € de recettes : le micro non classé est dépassé, l'abattement
    // tombe à 30 % — le grand perdant de la réforme, en un seul écran.
    expect(a1.impot.alertes).toContainEqual({
      type: "micro-ineligible",
      seuil: euros(15_000),
      recettes: euros(21_900),
    });
    expect(a1.impot.abattement).toBe(euros(6_570));
    expect(a1.impot.baseImposable).toBe(euros(15_330));
  });
});

/* ══ CAS C — réel meublé : bâti et mobilier, jusqu'à la revente ════════════ */

describe("cas C — réel meublé", () => {
  /*
   * Dotation bâti : 2,5 % de 85 % de 200 000 € = 4 250 € par an.
   * Dotation mobilier : 8 000 € sur 7 ans, par différence de cumuls arrondis.
   * Charges déductibles année 1 : 3 504 + 5 475 + 5 750 = 14 729 €.
   * Avant amortissement : 21 900 − 14 729 = 7 171 € > 5 392,86 € : tout se
   * déduit, chaque année de l'exploitation.
   */
  const r = projeterLocationCourteDuree(
    entreeComptant({ regime: { type: "reel-meuble" }, dureeLocationAnnees: 3 }),
  );

  it("déduit bâti et mobilier ensemble sous le plafond du 39 C", () => {
    expect(r.amortissements.dotationBatiAnnuelle).toBe(euros(4_250));
    expect(r.annees[0]!.impot.amortissementDeduit).toBe(euros(5_392.86));
    expect(r.amortissements.deduitsCumules).toBe(euros(16_178.57));
    expect(r.amortissements.dotationMobilierTotale).toBe(euros(3_428.57));
    expect(r.amortissements.reporteRestant).toBe(0);
  });

  it("ne réintègre QUE le bâti dans la plus-value de revente", () => {
    // 3 × 4 250 = 12 750 € de bâti déduits : c'est eux, et eux seuls, qui
    // minorent le prix d'acquisition — le mobilier reste dehors.
    expect(r.amortissements.batiDeduitsCumules).toBe(euros(12_750));
    expect(r.cession.plusValue!.assiette.minorationAmortissements).toBe(euros(12_750));
    expect(r.cession.plusValue!.assiette.prixAcquisitionMajore).toBe(euros(187_250));
  });

  it("solde exactement l'amortissement du mobilier au terme de sa durée", () => {
    // Huit ans d'exploitation, mobilier sur sept : la somme des dotations vaut
    // l'ameublement au centime, et la huitième année n'amortit que le bâti.
    const long = projeterLocationCourteDuree(
      entreeComptant({ regime: { type: "reel-meuble" }, dureeLocationAnnees: 8 }),
    );
    expect(long.amortissements.dotationMobilierTotale).toBe(euros(8_000));
    expect(long.amortissements.deduitsCumules).toBe(euros(8 * 4_250 + 8_000));
  });

  it("déclare que le mobilier est hors réintégration, et la convention bâti d'abord", () => {
    const textes = r.reserves.map((x) => x.texte).join(" ");
    expect(textes).toContain("Seul l'amortissement du bâti");
    expect(textes).toContain("s'imputer d'abord sur le bâti");
  });
});

/* ══ CAS D — la mensualité toujours due, ici aussi ═════════════════════════ */

describe("cas D — crédit en cours", () => {
  it("lit les échéances dans le plan et les soustrait du flux", () => {
    const r = projeterLocationCourteDuree(
      entreeComptant({
        credit: credit(
          echeancierConstant(240, { interest: euros(400), insurance: euros(50), principal: euros(550) }, euros(132_000)),
          euros(132_000),
        ),
      }),
    );
    const a1 = r.annees[0]!;
    expect(a1.mensualites).toBe(euros(12_000));
    expect(a1.interetsEtAssurance).toBe(euros(5_400));
    // Le cas A rendait −6 150,70 € sans crédit : douze mensualités s'y ajoutent.
    expect(a1.fluxNet).toBe(euros(-18_150.7));
  });
});

/* ══ Domaine refusé ════════════════════════════════════════════════════════ */

describe("hors domaine", () => {
  it("refuse la location nue et la longue durée", () => {
    for (const regime of [
      { type: "micro-foncier" } as const,
      { type: "reel-nu" } as const,
      { type: "micro-bic", categorie: "longue-duree" } as const,
    ]) {
      expect(() => projeterLocationCourteDuree(entreeComptant({ regime }))).toThrow(RangeError);
    }
  });

  it("refuse un taux d'occupation qui n'a pas de sens", () => {
    expect(() => projeterLocationCourteDuree(entreeComptant({ tauxOccupationPct: 120 }))).toThrow(
      RangeError,
    );
    expect(() => projeterLocationCourteDuree(entreeComptant({ tauxOccupationPct: -1 }))).toThrow(
      RangeError,
    );
  });
});

/* ══ Invariants ════════════════════════════════════════════════════════════ */

describe("invariants", () => {
  const regimes = [
    { type: "micro-bic", categorie: "tourisme-classe" } as const,
    { type: "micro-bic", categorie: "tourisme-non-classe" } as const,
    { type: "reel-meuble" } as const,
  ];

  it("chaque année se solde exactement, et l'occupation borne les revenus", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...regimes),
        fc.integer({ min: 0, max: euros(300) }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 1, max: 36 }),
        (regime, tarif, occupation, duree, mois) => {
          const r = projeterLocationCourteDuree(
            entreeComptant({
              regime,
              tarifNuitee: tarif,
              tauxOccupationPct: occupation,
              dureeLocationAnnees: duree,
              moisMiseEnLocation: mois,
            }),
          );
          expect(r.annees).toHaveLength(duree);
          let cumul = 0;
          for (const a of r.annees) {
            // Sans occupation, pas de revenus — et jamais de revenus négatifs.
            expect(a.revenusBruts).toBeGreaterThanOrEqual(0);
            if (occupation === 0) expect(a.revenusBruts).toBe(0);
            expect(a.fluxNet).toBe(
              a.revenusBruts -
                a.commissionPlateforme -
                a.conciergerie -
                a.chargesProprietaire -
                a.ameublement -
                a.mensualites -
                a.impot.impotTotal,
            );
            cumul += a.fluxNet;
            expect(a.cumulFluxNet).toBe(cumul);
          }
          expect(r.horizonCessionMois).toBe(mois - 1 + 12 * duree);
          // Le bâti réintégré ne dépasse jamais le total déduit.
          expect(r.amortissements.batiDeduitsCumules).toBeLessThanOrEqual(
            r.amortissements.deduitsCumules,
          );
        },
      ),
    );
  });
});
