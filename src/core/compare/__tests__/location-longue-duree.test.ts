/**
 * SCÉNARIO DE LOCATION LONGUE DURÉE — `ENG-029`
 *
 * Trois moitiés.
 *
 * ── LES CAS DE RÉFÉRENCE ────────────────────────────────────────────────────
 * Calculés à la main dans leur commentaire, avec des montants ronds et les
 * hypothèses par défaut du relevé. Les défauts employés : vacance 2,5 %,
 * gestion 7 %, provision 1 %, indexations 1,5 / 3,2 / 2,0 — si le relevé de
 * `market.ts` change, ces cas rougissent, et c'est voulu : un cas de référence
 * qui suivrait les hypothèses en silence ne référencerait rien.
 *
 * ── LA CIRCULATION DES REPORTS ──────────────────────────────────────────────
 * Le déficit foncier et l'amortissement non déduit traversent les années par ce
 * fichier et par lui seul. Les tests vérifient la conservation, pas des
 * montants recopiés.
 *
 * ── L'INTÉGRATION AVEC LA CESSION ───────────────────────────────────────────
 * Les amortissements déduits pendant la location doivent ressortir en
 * minoration du prix d'acquisition dans la plus-value de la revente. C'est le
 * branchement `ENG-013` → `ENG-029` → `ENG-027`, et c'est lui que le sabotage
 * doit pouvoir faire tomber.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { euros } from "../../money";
import type { Cents } from "../../money";
import type { ConsolidatedRow, GuaranteeCost } from "../../credit/plan";
import type { CreditReprisPourVente } from "../vente";
import { valeurAppreciee } from "../vente";
import {
  projeterLocationLongueDuree,
  type EntreeLocationLongueDuree,
} from "../location-longue-duree";

/* ── Outils de scénario ───────────────────────────────────────────────────── */

/**
 * Échéancier synthétique à colonnes constantes. La série lit `payment`,
 * `interest` et `insurance` ; la vente lit `balance`. Des valeurs rondes et
 * constantes rendent chaque année vérifiable de tête.
 */
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

function credit(
  rows: readonly ConsolidatedRow[],
  totalPrincipal: Cents,
): CreditReprisPourVente {
  return { plan: { rows, guarantee: SANS_GARANTIE, totalPrincipal }, tauxMoyenAnnuelPct: 3 };
}

/** Entrée de base : comptant, micro-foncier, location dès le premier mois. */
function entreeComptant(
  e: Partial<EntreeLocationLongueDuree> = {},
): EntreeLocationLongueDuree {
  return {
    moisMiseEnLocation: 1,
    dureeLocationAnnees: 3,
    loyerMensuelMarche: euros(1_000),
    valeurInitiale: euros(200_000),
    appreciationAnnuellePct: 2,
    regime: { type: "micro-foncier" },
    tmiPct: 30,
    regimeSocial: "affilie-france",
    taxeFonciereAnnuelle: euros(1_200),
    chargesCoproprieteAnnuelles: euros(600),
    assurancePnoAnnuelle: euros(150),
    fraisAcquisition: { mode: "reel", montant: 0 },
    travaux: { mode: "reel", montant: 0 },
    ...e,
  };
}

/* ══ CAS A — comptant, micro-foncier, les postes à la main ═════════════════ */

describe("cas A — comptant, micro-foncier", () => {
  /*
   * Année 1, hypothèses par défaut du relevé (vacance 2,5 %, gestion 7 %,
   * provision 1 %) :
   *
   *   loyers bruts        12 × 1 000            12 000,00
   *   vacance             2,5 %                    300,00
   *   encaissés                                 11 700,00
   *   gestion             7 % des encaissés        819,00
   *   charges             1 200 + 600 + 150
   *                       + 1 % × 200 000        3 950,00
   *   impôt micro-foncier base 70 % × 11 700 = 8 190
   *                       IR 30 %  2 457,00
   *                       PS 17,2 % 1 408,68     3 865,68
   *   flux net            11 700 − 819 − 3 950
   *                       − 0 − 3 865,68         3 065,32
   */
  const r = projeterLocationLongueDuree(entreeComptant());
  const a1 = r.annees[0]!;

  it("compte l'année 1 poste par poste, comme sur une feuille", () => {
    expect(a1.loyersBruts).toBe(euros(12_000));
    expect(a1.vacance).toBe(euros(300));
    expect(a1.loyersEncaisses).toBe(euros(11_700));
    expect(a1.fraisGestion).toBe(euros(819));
    expect(a1.chargesProprietaire).toBe(euros(3_950));
    expect(a1.mensualites).toBe(0);
    expect(a1.impot.baseImposable).toBe(euros(8_190));
    expect(a1.impot.impotTotal).toBe(euros(3_865.68));
    expect(a1.fluxNet).toBe(euros(3_065.32));
  });

  it("indexe l'année 2 : le loyer à 1,5 %, et la base fiscale s'arrondit à l'euro", () => {
    // 12 000 × 1,015 = 12 180 ; vacance 304,50 ; encaissés 11 875,50 ;
    // base 70 % = 8 312,85 → 8 313 € (art. 1649 undecies).
    const a2 = r.annees[1]!;
    expect(a2.loyersBruts).toBe(euros(12_180));
    expect(a2.vacance).toBe(euros(304.5));
    expect(a2.loyersEncaisses).toBe(euros(11_875.5));
    expect(a2.impot.baseImposable).toBe(euros(8_313));
  });

  it("revend au bon horizon, au régime imposable, au prix apprécié", () => {
    // 36 mois de location dès le mois 1 : cession au mois 36, détention 36 mois.
    expect(r.horizonCessionMois).toBe(36);
    expect(r.cession.plusValue).not.toBeNull();
    expect(r.cession.grandeurs.dureeDetentionMois).toBe(36);
    expect(r.cession.grandeurs.prixDeCession).toBe(
      valeurAppreciee(euros(200_000), 2, 36),
    );
  });

  it("rend ses totaux comme la somme de ses années", () => {
    const somme = (f: (a: (typeof r.annees)[number]) => Cents) =>
      r.annees.reduce((s, a) => s + f(a), 0);
    expect(r.totaux.loyersBruts).toBe(somme((a) => a.loyersBruts));
    expect(r.totaux.fluxNet).toBe(somme((a) => a.fluxNet));
    expect(r.totaux.impots).toBe(somme((a) => a.impot.impotTotal));
    expect(r.annees.at(-1)!.cumulFluxNet).toBe(r.totaux.fluxNet);
  });

  it("dit que l'exonération de résidence principale est perdue, et d'où viennent ses réserves", () => {
    const textes = r.reserves.map((x) => x.texte).join(" ");
    expect(textes).toContain("cesse d'être la résidence principale");
    expect(r.reserves.some((x) => x.source === "location")).toBe(true);
    expect(r.reserves.some((x) => x.source === "cession")).toBe(true);
    expect(r.reserves.some((x) => x.source === "plus-value")).toBe(true);
  });

  it("expose les hypothèses retenues, relevé et millésime compris", () => {
    expect(r.parametres.vacanceLocativePctLoyers).toBe(2.5);
    expect(r.parametres.fraisGestionPctLoyers).toBe(7);
    expect(r.parametres.provisionTravauxPctAnnuel).toBe(1);
    expect(r.parametres.amortissementAnnuelPct).toBeNull();
    expect(r.parametres.releveHypotheses).toMatch(/^\d{4}-\d{2}$/);
    expect(r.parametres.millesimeFiscal).toBe("2026");
  });
});

/* ══ CAS B — crédit en cours : la mensualité toujours due ══════════════════ */

describe("cas B — réel nu, crédit en cours", () => {
  /*
   * Échéancier constant : 400 € d'intérêts, 50 € d'assurance, 550 € de capital,
   * soit 1 000 € par mois pendant 20 ans. Année 1 au réel :
   *
   *   encaissés                                 11 700,00
   *   gestion                                      819,00
   *   charges                                    3 950,00
   *   intérêts + assurance  12 × 450             5 400,00
   *   base                  11 700 − 4 769
   *                         − 5 400              1 531,00
   *   impôt                 IR 459,30 + PS 263,33  722,63
   *   flux net              11 700 − 819 − 3 950
   *                         − 12 000 − 722,63   −5 791,63
   */
  const leCredit = credit(
    echeancierConstant(240, { interest: euros(400), insurance: euros(50), principal: euros(550) }, euros(132_000)),
    euros(132_000),
  );
  const r = projeterLocationLongueDuree(
    entreeComptant({ regime: { type: "reel-nu" }, credit: leCredit }),
  );
  const a1 = r.annees[0]!;

  it("lit la mensualité et sa part déductible dans l'échéancier", () => {
    expect(a1.mensualites).toBe(euros(12_000));
    expect(a1.interetsEtAssurance).toBe(euros(5_400));
  });

  it("déduit les intérêts au réel et rend un flux net NÉGATIF — la mensualité toujours due", () => {
    expect(a1.impot.baseImposable).toBe(euros(1_531));
    expect(a1.impot.impotTotal).toBe(euros(722.63));
    expect(a1.fluxNet).toBe(euros(-5_791.63));
    expect(a1.fluxNet).toBeLessThan(0);
  });

  it("cesse de compter des mensualités quand le prêt est soldé", () => {
    // Location du mois 229 : le prêt de 240 mois ne couvre que la première
    // année de location. L'année 2 n'a plus une échéance.
    const tard = projeterLocationLongueDuree(
      entreeComptant({
        regime: { type: "reel-nu" },
        credit: leCredit,
        moisMiseEnLocation: 229,
        dureeLocationAnnees: 2,
      }),
    );
    expect(tard.annees[0]!.mensualites).toBe(euros(12_000));
    expect(tard.annees[1]!.mensualites).toBe(0);
  });
});

/* ══ CAS C — le déficit foncier circule d'une année à l'autre ══════════════ */

describe("cas C — réel nu déficitaire", () => {
  // 750 € d'intérêts et 9 000 € par an : l'année 1 est déficitaire.
  const r = projeterLocationLongueDuree(
    entreeComptant({
      regime: { type: "reel-nu" },
      credit: credit(
        echeancierConstant(240, { interest: euros(700), insurance: euros(50), principal: euros(250) }, euros(60_000)),
        euros(60_000),
      ),
      dureeLocationAnnees: 3,
    }),
  );

  it("reporte le déficit au lieu de produire un impôt négatif", () => {
    const a1 = r.annees[0]!;
    // 11 700 − 4 769 − 9 000 = −2 069.
    expect(a1.impot.baseImposable).toBe(0);
    expect(a1.impot.impotTotal).toBe(0);
    expect(a1.impot.deficitFoncierReporte).toBe(euros(2_069));
  });

  it("conserve le déficit exactement : ce qui entre en report en ressort ou s'impute", () => {
    for (let i = 1; i < r.annees.length; i++) {
      const a = r.annees[i]!;
      const resultat =
        a.loyersEncaisses -
        a.fraisGestion -
        a.chargesProprietaire -
        a.interetsEtAssurance -
        r.annees[i - 1]!.impot.deficitFoncierReporte;
      expect(a.impot.deficitFoncierReporte).toBe(Math.max(0, -resultat));
    }
    expect(r.deficitFoncierRestant).toBe(r.annees.at(-1)!.impot.deficitFoncierReporte);
  });
});

/* ══ CAS D — réel meublé : le 39 C traverse jusqu'à la revente ═════════════ */

describe("cas D — réel meublé, l'amortissement ressort dans la plus-value", () => {
  /*
   * Comptant, dix ans, défauts du relevé : dotation = 2,5 % de 85 % de
   * 200 000 € = 4 250 € par an. Le résultat avant amortissement de chaque
   * année dépasse la dotation : tout se déduit, rien ne se reporte.
   *
   *   amortissements déduits   10 × 4 250 =     42 500,00
   *   prix d'acquisition minoré 200 000 − 42 500 = 157 500,00
   */
  const r = projeterLocationLongueDuree(
    entreeComptant({ regime: { type: "reel-meuble" }, dureeLocationAnnees: 10 }),
  );

  it("dote 4 250 € par an et déduit tout, dix ans durant", () => {
    expect(r.amortissements.dotationAnnuelle).toBe(euros(4_250));
    expect(r.amortissements.deduitsCumules).toBe(euros(42_500));
    expect(r.amortissements.reporteRestant).toBe(0);
    for (const a of r.annees) expect(a.impot.amortissementDeduit).toBe(euros(4_250));
  });

  it("minore le prix d'acquisition de la revente des amortissements déduits", () => {
    // Le branchement ENG-013 → ENG-029 → ENG-027, en un seul chiffre.
    expect(r.cession.plusValue!.assiette.minorationAmortissements).toBe(euros(42_500));
    expect(r.cession.plusValue!.assiette.prixAcquisitionMajore).toBe(euros(157_500));
  });

  it("prend la meublée à 18,6 % de prélèvements sociaux, et le dit chaque année", () => {
    for (const a of r.annees) expect(a.impot.tauxPrelevementsSociauxPct).toBe(18.6);
  });

  it("déclare la convention d'assiette de l'amortissement dans ses réserves", () => {
    expect(r.reserves.map((x) => x.texte).join(" ")).toContain("valeur vénale");
  });

  it("conserve l'amortissement quand la dotation dépasse le résultat", () => {
    // Loyer minuscule : rien ne se déduit la première année, tout se reporte,
    // et la conservation tient — dotation + report entrant = déduit + report.
    const maigre = projeterLocationLongueDuree(
      entreeComptant({
        regime: { type: "reel-meuble" },
        loyerMensuelMarche: euros(300),
        dureeLocationAnnees: 2,
      }),
    );
    let reportPrecedent = 0;
    for (const a of maigre.annees) {
      expect(a.impot.amortissementDeduit + a.impot.amortissementReporte).toBe(
        maigre.amortissements.dotationAnnuelle + reportPrecedent,
      );
      reportPrecedent = a.impot.amortissementReporte;
    }
    expect(maigre.amortissements.reporteRestant).toBe(reportPrecedent);
  });
});

/* ══ Domaine refusé ════════════════════════════════════════════════════════ */

describe("hors domaine", () => {
  it("refuse les catégories de meublé de tourisme — c'est la courte durée", () => {
    for (const categorie of ["tourisme-classe", "tourisme-non-classe"] as const) {
      expect(() =>
        projeterLocationLongueDuree(
          entreeComptant({ regime: { type: "micro-bic", categorie } }),
        ),
      ).toThrow(RangeError);
    }
  });

  it("accepte le micro-BIC de longue durée", () => {
    const r = projeterLocationLongueDuree(
      entreeComptant({ regime: { type: "micro-bic", categorie: "longue-duree" } }),
    );
    expect(r.annees[0]!.impot.abattement).toBe(euros(5_850));
  });

  it("refuse un mois de mise en location ou une durée qui n'ont pas de sens", () => {
    expect(() => projeterLocationLongueDuree(entreeComptant({ moisMiseEnLocation: 0 }))).toThrow(
      RangeError,
    );
    expect(() =>
      projeterLocationLongueDuree(entreeComptant({ dureeLocationAnnees: 2.5 })),
    ).toThrow(RangeError);
  });
});

/* ══ Invariants ════════════════════════════════════════════════════════════ */

describe("invariants", () => {
  const regimes = [
    { type: "micro-foncier" } as const,
    { type: "reel-nu" } as const,
    { type: "micro-bic", categorie: "longue-duree" } as const,
    { type: "reel-meuble" } as const,
  ];

  it("chaque année se solde exactement : encaissés − gestion − charges − mensualités − impôt", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...regimes),
        fc.integer({ min: 0, max: euros(4_000) }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 60 }),
        fc.double({ min: -2, max: 4, noNaN: true }),
        (regime, loyer, duree, mois, appreciation) => {
          const r = projeterLocationLongueDuree(
            entreeComptant({
              regime,
              loyerMensuelMarche: loyer,
              dureeLocationAnnees: duree,
              moisMiseEnLocation: mois,
              appreciationAnnuellePct: appreciation,
            }),
          );
          expect(r.annees).toHaveLength(duree);
          let cumul = 0;
          for (const a of r.annees) {
            expect(a.loyersBruts - a.vacance).toBe(a.loyersEncaisses);
            expect(a.fluxNet).toBe(
              a.loyersEncaisses -
                a.fraisGestion -
                a.chargesProprietaire -
                a.mensualites -
                a.impot.impotTotal,
            );
            cumul += a.fluxNet;
            expect(a.cumulFluxNet).toBe(cumul);
          }
          expect(r.horizonCessionMois).toBe(mois - 1 + 12 * duree);
        },
      ),
    );
  });
});
