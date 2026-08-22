/**
 * COÛTS DE DÉTENTION — TESTS DE PROPRIÉTÉS — `ENG-010`
 *
 * Ces tests ne vérifient pas des montants mais des VÉRITÉS qui doivent tenir sur
 * n'importe quelle entrée : horizon nul, loyer nul, prix nul, indexation
 * négative, crédit plus long que l'horizon ou plus court que lui.
 *
 * La première d'entre elles porte tout le module : les fonds perdus ne peuvent
 * pas dépasser le décaissement, et leur différence est exactement la part de
 * capital. Si cette propriété tombait, les deux lectures cesseraient d'être deux
 * agrégations du même détail et deviendraient deux calculs concurrents — dont
 * l'un serait faux.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { sum } from "../../money";
import { amortize } from "../../credit/schedule";
import type { ConsolidatedRow } from "../../credit/plan";
import { comparerDetention } from "../detention";
import type { ComparaisonDetention, EcheancierRepris, EntreeDetention } from "../types";

/* ── Générateurs ──────────────────────────────────────────────────────────── */

const montantAnnuel = fc.integer({ min: 0, max: 20_000_00 });
const montantMensuel = fc.integer({ min: 0, max: 5_000_00 });
const valeurBien = fc.integer({ min: 0, max: 2_000_000_00 });
const pctTravaux = fc.double({ min: 0, max: 3, noNaN: true, noDefaultInfinity: true });
const horizon = fc.integer({ min: 0, max: 480 });

/**
 * Domaine réaliste d'indexation. Bornes larges des deux côtés : la déflation
 * existe, et une saisie de 10 % n'a rien d'impossible sur une taxe foncière.
 */
const indexation = fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true });

/**
 * Taux de crédit : le zéro exact séparément du reste. Un taux dénormal annulait
 * le dénominateur de l'annuité — cas corrigé dans le moteur crédit, mais sans
 * intérêt métier ici, et le générateur n'a pas à le rejouer.
 */
const tauxCredit = fc.oneof(
  fc.constant(0),
  fc.double({ min: 0.01, max: 10, noNaN: true, noDefaultInfinity: true }),
);

/**
 * Échéancier issu du VRAI moteur d'amortissement, converti en lignes
 * consolidées. Fournir des lignes inventées testerait le module contre
 * lui-même ; celles-ci portent les arrondis réels d'un échéancier.
 */
const echeancier: fc.Arbitrary<EcheancierRepris> = fc
  .record({
    principal: fc.integer({ min: 0, max: 500_000_00 }),
    taux: tauxCredit,
    mois: fc.integer({ min: 0, max: 360 }),
    assurance: fc.integer({ min: 0, max: 200_00 }),
  })
  .map(({ principal, taux, mois, assurance }) => {
    const rows: ConsolidatedRow[] = amortize({
      id: "x",
      label: "x",
      principal,
      annualRatePct: taux,
      months: mois,
    }).map((r) => ({
      month: r.month,
      year: r.year,
      interest: r.interest,
      principal: r.principal,
      insurance: assurance,
      payment: r.payment + assurance,
      balance: r.balance,
    }));
    return { rows };
  });

const entree: fc.Arbitrary<EntreeDetention> = fc
  .record({
    horizonMois: horizon,
    plan: fc.option(echeancier, { nil: undefined }),
    valeurBien,
    taxeFonciereAnnuelle: montantAnnuel,
    chargesCoproprieteAnnuelles: montantAnnuel,
    assuranceHabitationProprietaire: montantAnnuel,
    provisionTravauxPctAnnuel: pctTravaux,
    fraisInitiauxNonRecuperables: fc.integer({ min: 0, max: 40_000_00 }),
    loyerMensuelHorsCharges: montantMensuel,
    chargesLocativesMensuelles: fc.integer({ min: 0, max: 500_00 }),
    assuranceHabitationLocataire: montantAnnuel,
    loyerPctAnnuel: indexation,
    taxeFoncierePctAnnuel: indexation,
    chargesPctAnnuel: indexation,
  })
  .map((g) => ({
    horizonMois: g.horizonMois,
    proprietaire: {
      ...(g.plan !== undefined ? { plan: g.plan } : {}),
      valeurBien: g.valeurBien,
      taxeFonciereAnnuelle: g.taxeFonciereAnnuelle,
      chargesCoproprieteAnnuelles: g.chargesCoproprieteAnnuelles,
      assuranceHabitationAnnuelle: g.assuranceHabitationProprietaire,
      provisionTravauxPctAnnuel: g.provisionTravauxPctAnnuel,
      fraisInitiauxNonRecuperables: g.fraisInitiauxNonRecuperables,
    },
    locataire: {
      loyerMensuelHorsCharges: g.loyerMensuelHorsCharges,
      chargesLocativesMensuelles: g.chargesLocativesMensuelles,
      assuranceHabitationAnnuelle: g.assuranceHabitationLocataire,
    },
    indexations: {
      loyerPctAnnuel: g.loyerPctAnnuel,
      taxeFoncierePctAnnuel: g.taxeFoncierePctAnnuel,
      chargesPctAnnuel: g.chargesPctAnnuel,
    },
  }));

/* ── Les deux lectures ────────────────────────────────────────────────────── */

describe("les fonds perdus et le décaissement sont deux lectures du même détail", () => {
  it("les fonds perdus ne dépassent jamais le décaissement", () => {
    fc.assert(
      fc.property(entree, (e) => {
        const r = comparerDetention(e);
        for (const m of r.mois) {
          if (m.proprietaire.fondsPerdus > m.proprietaire.decaissement) return false;
          if (m.locataire.fondsPerdus > m.locataire.decaissement) return false;
        }
        for (const a of r.annees) {
          if (a.proprietaire.cumulFondsPerdus > a.proprietaire.cumulDecaissement) return false;
          if (a.locataire.cumulFondsPerdus > a.locataire.cumulDecaissement) return false;
        }
        return (
          r.totaux.proprietaire.fondsPerdus <= r.totaux.proprietaire.decaissement &&
          r.totaux.locataire.fondsPerdus <= r.totaux.locataire.decaissement
        );
      }),
      { numRuns: 300 },
    );
  });

  it("leur écart vaut exactement la part de capital, jamais autre chose", () => {
    fc.assert(
      fc.property(entree, (e) => {
        const r = comparerDetention(e);
        for (const m of r.mois) {
          if (m.proprietaire.decaissement - m.proprietaire.fondsPerdus !== m.proprietaire.capital) {
            return false;
          }
        }
        return (
          r.totaux.proprietaire.capitalConstitue === r.totaux.proprietaire.capital &&
          r.totaux.proprietaire.decaissement - r.totaux.proprietaire.fondsPerdus ===
            r.totaux.proprietaire.capital
        );
      }),
      { numRuns: 300 },
    );
  });

  it("se confondent chez le locataire, qui ne constitue rien", () => {
    fc.assert(
      fc.property(entree, (e) => {
        const r = comparerDetention(e);
        return (
          r.mois.every((m) => m.locataire.fondsPerdus === m.locataire.decaissement) &&
          r.totaux.locataire.fondsPerdus === r.totaux.locataire.decaissement
        );
      }),
      { numRuns: 200 },
    );
  });

  it("le décaissement du propriétaire est la somme de ses postes, sans reste", () => {
    fc.assert(
      fc.property(entree, (e) => {
        const r = comparerDetention(e);
        return r.mois.every((m) => {
          const p = m.proprietaire;
          const total =
            p.interets +
            p.capital +
            p.assuranceEmprunteur +
            p.taxeFonciere +
            p.chargesCopropriete +
            p.provisionTravaux +
            p.assuranceHabitation +
            p.fraisInitiaux;
          return total === p.decaissement;
        });
      }),
      { numRuns: 200 },
    );
  });
});

/* ── Bonne tenue des sorties ──────────────────────────────────────────────── */

/** Tous les montants d'un résultat, hors écarts — ceux-là ont le droit d'être négatifs. */
function montantsPositifs(r: ComparaisonDetention): number[] {
  const valeurs: number[] = [];
  for (const m of r.mois) {
    valeurs.push(...Object.values(m.proprietaire), ...Object.values(m.locataire));
  }
  for (const a of r.annees) {
    valeurs.push(...Object.values(a.proprietaire), ...Object.values(a.locataire));
  }
  const { proprietaire, locataire } = r.totaux;
  valeurs.push(...Object.values(proprietaire), ...Object.values(locataire));
  return valeurs;
}

describe("aucune sortie n'est aberrante", () => {
  it("ne produit ni NaN ni infini, et aucun montant négatif hors écarts", () => {
    fc.assert(
      fc.property(entree, (e) => {
        const r = comparerDetention(e);
        return montantsPositifs(r).every((v) => Number.isFinite(v) && v >= 0);
      }),
      { numRuns: 300 },
    );
  });

  it("ne produit que des entiers de centimes", () => {
    // Un flottant qui remonte du calcul se verrait ici, et nulle part ailleurs :
    // il s'afficherait comme un montant plausible à deux décimales près.
    fc.assert(
      fc.property(entree, (e) => {
        const r = comparerDetention(e);
        return montantsPositifs(r).every((v) => Number.isInteger(v));
      }),
      { numRuns: 200 },
    );
  });

  it("agrège l'année en sommant exactement ses mois", () => {
    fc.assert(
      fc.property(entree, (e) => {
        const r = comparerDetention(e);
        return r.annees.every((a) => {
          const g = r.mois.filter((m) => m.annee === a.annee);
          return (
            g.length === a.moisCouverts &&
            sum(g.map((m) => m.proprietaire.decaissement)) === a.proprietaire.decaissement &&
            sum(g.map((m) => m.locataire.fondsPerdus)) === a.locataire.fondsPerdus
          );
        });
      }),
      { numRuns: 200 },
    );
  });

  it("cumule de façon croissante, des deux côtés", () => {
    fc.assert(
      fc.property(entree, (e) => {
        const r = comparerDetention(e);
        for (let i = 1; i < r.annees.length; i++) {
          const av = r.annees[i - 1]!;
          const ap = r.annees[i]!;
          if (ap.proprietaire.cumulDecaissement < av.proprietaire.cumulDecaissement) return false;
          if (ap.proprietaire.cumulFondsPerdus < av.proprietaire.cumulFondsPerdus) return false;
          if (ap.locataire.cumulDecaissement < av.locataire.cumulDecaissement) return false;
        }
        return true;
      }),
      { numRuns: 200 },
    );
  });

  it("ne réécrit pas le passé quand on allonge l'horizon", () => {
    // Deux courbes tracées à deux horizons différents doivent se superposer sur
    // leur partie commune. C'est ce qui rend un curseur d'horizon lisible.
    fc.assert(
      fc.property(entree, fc.integer({ min: 1, max: 120 }), (e, rallonge) => {
        const court = comparerDetention(e);
        const long = comparerDetention({ ...e, horizonMois: e.horizonMois + rallonge });
        return court.mois.every(
          (m, i) =>
            m.proprietaire.decaissement === long.mois[i]!.proprietaire.decaissement &&
            m.locataire.decaissement === long.mois[i]!.locataire.decaissement,
        );
      }),
      { numRuns: 200 },
    );
  });
});

/* ── Indexation ───────────────────────────────────────────────────────────── */

describe("l'indexation est monotone", () => {
  it("une révision positive ne fait jamais baisser le loyer", () => {
    fc.assert(
      fc.property(
        montantMensuel,
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 1, max: 480 }),
        (loyer, pct, mois) => {
          const r = comparerDetention({
            horizonMois: mois,
            proprietaire: {
              valeurBien: 0,
              taxeFonciereAnnuelle: 0,
              chargesCoproprieteAnnuelles: 0,
              assuranceHabitationAnnuelle: 0,
              provisionTravauxPctAnnuel: 0,
            },
            locataire: {
              loyerMensuelHorsCharges: loyer,
              chargesLocativesMensuelles: 0,
              assuranceHabitationAnnuelle: 0,
            },
            indexations: { loyerPctAnnuel: pct, taxeFoncierePctAnnuel: 0, chargesPctAnnuel: 0 },
          });
          for (let i = 1; i < r.mois.length; i++) {
            if (r.mois[i]!.locataire.loyer < r.mois[i - 1]!.locataire.loyer) return false;
          }
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });

  it("une révision négative ne fait jamais monter le loyer, ni descendre sous zéro", () => {
    fc.assert(
      fc.property(
        montantMensuel,
        fc.double({ min: -100, max: 0, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 1, max: 480 }),
        (loyer, pct, mois) => {
          const r = comparerDetention({
            horizonMois: mois,
            proprietaire: {
              valeurBien: 0,
              taxeFonciereAnnuelle: 0,
              chargesCoproprieteAnnuelles: 0,
              assuranceHabitationAnnuelle: 0,
              provisionTravauxPctAnnuel: 0,
            },
            locataire: {
              loyerMensuelHorsCharges: loyer,
              chargesLocativesMensuelles: 0,
              assuranceHabitationAnnuelle: 0,
            },
            indexations: { loyerPctAnnuel: pct, taxeFoncierePctAnnuel: 0, chargesPctAnnuel: 0 },
          });
          for (let i = 1; i < r.mois.length; i++) {
            const v = r.mois[i]!.locataire.loyer;
            if (v > r.mois[i - 1]!.locataire.loyer || v < 0) return false;
          }
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("une indexation absurde ne produit pas de coût négatif", () => {
  /**
   * Générateur volontairement hors domaine, de −300 % à +50 %.
   *
   * Il existe parce que la garde manuelle correspondante s'est révélée SEULE :
   * en retirant le plancher de `montantIndexe`, un seul test rougissait, et le
   * générateur réaliste — borné à ±10 % — ne voyait rien. En dessous de −100 %,
   * le facteur (1 + i) devient négatif et le coût avec lui. Un champ de saisie
   * mal borné y mène en une frappe.
   *
   * La borne HAUTE, elle, n'est pas un choix de réalisme mais une nécessité : à
   * +300 % par an sur vingt ans, les cumuls dépassent 2⁵³ centimes et `sum` lève
   * une `RangeError`. Comportement voulu — voir le test suivant — mais qui n'a
   * rien à voir avec le plancher, et qui masquerait ce qu'on cherche ici.
   */
  const indexationAbsurde = fc.double({
    min: -300,
    max: 50,
    noNaN: true,
    noDefaultInfinity: true,
  });

  it("plancher à zéro, quelle que soit l'indexation", () => {
    fc.assert(
      fc.property(
        montantMensuel,
        montantAnnuel,
        indexationAbsurde,
        indexationAbsurde,
        fc.integer({ min: 1, max: 240 }),
        (loyer, taxe, iLoyer, iCharges, mois) => {
          const r = comparerDetention({
            horizonMois: mois,
            proprietaire: {
              valeurBien: 0,
              taxeFonciereAnnuelle: taxe,
              chargesCoproprieteAnnuelles: taxe,
              assuranceHabitationAnnuelle: taxe,
              provisionTravauxPctAnnuel: 0,
            },
            locataire: {
              loyerMensuelHorsCharges: loyer,
              chargesLocativesMensuelles: loyer,
              assuranceHabitationAnnuelle: taxe,
            },
            indexations: {
              loyerPctAnnuel: iLoyer,
              taxeFoncierePctAnnuel: iCharges,
              chargesPctAnnuel: iCharges,
            },
          });
          return montantsPositifs(r).every((v) => Number.isFinite(v) && v >= 0);
        },
      ),
      { numRuns: 400 },
    );
  });

  it("casse bruyamment plutôt que de rendre un cumul faux au-delà de 2⁵³ centimes", () => {
    // Trouvé par le générateur ci-dessus, conservé comme cas nommé. À +300 % par
    // an sur vingt ans, le cumul sort du domaine où un flottant double est un
    // entier exact : au-delà, les additions cesseraient silencieusement d'être
    // justes. `assertSafe` refuse, et c'est la bonne réponse — mais l'interface
    // doit borner la saisie, parce qu'un utilisateur ne doit jamais voir ça.
    expect(() =>
      comparerDetention({
        horizonMois: 240,
        proprietaire: {
          valeurBien: 0,
          taxeFonciereAnnuelle: 0,
          chargesCoproprieteAnnuelles: 0,
          assuranceHabitationAnnuelle: 0,
          provisionTravauxPctAnnuel: 0,
        },
        locataire: {
          loyerMensuelHorsCharges: 1_000_00,
          chargesLocativesMensuelles: 0,
          assuranceHabitationAnnuelle: 0,
        },
        indexations: { loyerPctAnnuel: 300, taxeFoncierePctAnnuel: 0, chargesPctAnnuel: 0 },
      }),
    ).toThrow(RangeError);
  });
});

/* ── Croisement ───────────────────────────────────────────────────────────── */

describe("l'année de croisement", () => {
  it("est bien la PREMIÈRE année où la condition tient", () => {
    fc.assert(
      fc.property(entree, (e) => {
        const r = comparerDetention(e);
        for (const [lecture, annee] of Object.entries(r.croisement)) {
          const tient = (a: (typeof r.annees)[number]) =>
            lecture === "decaissement"
              ? a.proprietaire.cumulDecaissement <= a.locataire.cumulDecaissement
              : a.proprietaire.cumulFondsPerdus <= a.locataire.cumulFondsPerdus;
          const attendue = r.annees.find(tient);
          if (annee === null) {
            if (attendue !== undefined) return false;
          } else {
            if (attendue === undefined || attendue.annee !== annee) return false;
          }
        }
        return true;
      }),
      { numRuns: 300 },
    );
  });

  it("n'existe pas quand le locataire ne paye rien et que le propriétaire paye", () => {
    // ⚠️ L'énoncé intuitif est l'inverse — « un loyer nul rend le croisement
    // immédiat » — et il est faux. Un locataire gratuit est imbattable : le
    // cumul du propriétaire ne repassera jamais sous zéro. Le module répond
    // `null`, ce qui est la seule réponse vraie.
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20_000_00 }), fc.integer({ min: 12, max: 480 }), (taxe, mois) => {
        const r = comparerDetention({
          horizonMois: mois,
          proprietaire: {
            valeurBien: 0,
            taxeFonciereAnnuelle: taxe,
            chargesCoproprieteAnnuelles: 0,
            assuranceHabitationAnnuelle: 0,
            provisionTravauxPctAnnuel: 0,
          },
          locataire: {
            loyerMensuelHorsCharges: 0,
            chargesLocativesMensuelles: 0,
            assuranceHabitationAnnuelle: 0,
          },
          indexations: { loyerPctAnnuel: 0, taxeFoncierePctAnnuel: 0, chargesPctAnnuel: 0 },
        });
        return r.croisement.decaissement === null && r.croisement.fondsPerdus === null;
      }),
      { numRuns: 200 },
    );
  });

  it("arrive au plus tôt en fonds perdus, jamais l'inverse", () => {
    // Les fonds perdus du propriétaire sont inférieurs ou égaux à son
    // décaissement, ceux du locataire lui sont égaux : la condition de
    // croisement est donc satisfaite plus tôt, ou en même temps, en fonds
    // perdus. Un croisement au décaissement plus précoce signalerait une
    // inversion de signe quelque part.
    fc.assert(
      fc.property(entree, (e) => {
        const { decaissement, fondsPerdus } = comparerDetention(e).croisement;
        if (decaissement === null) return true;
        return fondsPerdus !== null && fondsPerdus <= decaissement;
      }),
      { numRuns: 300 },
    );
  });
});
