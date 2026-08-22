/**
 * SCÉNARIO DE VENTE À L'HORIZON — `ENG-012`
 *
 * Deux moitiés, et elles ne prouvent pas la même chose.
 *
 * ── LES CAS DE RÉFÉRENCE ────────────────────────────────────────────────────
 * Chacun est calculé à la main dans son commentaire, avec des montants ronds et
 * des postes éteints sauf celui qu'on regarde. Un test qui recopie la sortie du
 * code ne prouve rien ; ceux-ci doivent pouvoir être refaits sur une feuille de
 * papier, y compris le décompte de l'indemnité et de ses deux plafonds.
 *
 * ── LES INVARIANTS ──────────────────────────────────────────────────────────
 * Sous `fast-check`, sur des entrées aléatoires. Le plus important d'entre eux
 * est fiscal et non financier : en résidence principale occupée, l'impôt de
 * plus-value est nul **quelle que soit la durée de détention**. C'est le point
 * que la spécification demande d'enseigner, et c'est aussi l'idée fausse la plus
 * répandue sur la plus-value immobilière.
 *
 * Le second est structurel : le produit net est exactement la somme algébrique
 * des postes rendus. Si elle cessait de tenir, l'interface afficherait un
 * décompte qui ne tombe pas juste, ce qui est pire qu'un chiffre absent.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { euros } from "../../money";
import type { Cents } from "../../money";
import type { ConsolidatedRow, GuaranteeCost } from "../../credit/plan";
import { PARAMS_2026 } from "../../fiscal/params";
import { MARKET_2026 } from "../../assumptions/market";
import type { MarketAssumptions } from "../../assumptions/market";
import {
  type CreditReprisPourVente,
  type EntreeVente,
  type PlanRepris,
  produitDeVente,
  valeurAppreciee,
} from "../vente";

const P = PARAMS_2026;

/* ── Outils de scénario ───────────────────────────────────────────────────── */

/**
 * Échéancier synthétique à amortissement linéaire du capital restant dû.
 *
 * Le module ne réamortit rien : il lit `balance`. On peut donc lui fournir un
 * solde parfaitement rond, ce qui rend le décompte vérifiable de tête. Les
 * autres colonnes ne sont pas lues et valent zéro — le dire ici évite de croire
 * qu'elles participent au résultat.
 */
function echeancier(mois: number, capitalInitial: Cents): readonly ConsolidatedRow[] {
  const rows: ConsolidatedRow[] = [];
  for (let m = 1; m <= mois; m++) {
    rows.push({
      month: m,
      year: Math.ceil(m / 12),
      interest: 0,
      principal: 0,
      insurance: 0,
      payment: 0,
      balance: Math.round((capitalInitial * (mois - m)) / mois),
    });
  }
  return rows;
}

/** Solde imposé mois par mois, quand le cas de référence a besoin d'un chiffre précis. */
function echeancierAuSolde(soldes: readonly Cents[]): readonly ConsolidatedRow[] {
  return soldes.map((balance, i) => ({
    month: i + 1,
    year: Math.ceil((i + 1) / 12),
    interest: 0,
    principal: 0,
    insurance: 0,
    payment: 0,
    balance,
  }));
}

const HYPOTHEQUE = (mainlevee: Cents): GuaranteeCost => ({
  kind: "mortgage",
  cost: euros(3_000),
  refundAtTerm: 0,
  releaseCostOnEarlySale: mainlevee,
});

const CAUTION = (restitution: Cents): GuaranteeCost => ({
  kind: "suretyship",
  cost: euros(2_500),
  refundAtTerm: restitution,
  releaseCostOnEarlySale: 0,
});

function plan(
  rows: readonly ConsolidatedRow[],
  totalPrincipal: Cents,
  guarantee: GuaranteeCost,
): PlanRepris {
  return { rows, guarantee, totalPrincipal };
}

/* ══ CAS DE RÉFÉRENCE ═══════════════════════════════════════════════════════ */

describe("cas A — achat comptant, vente à l'horizon zéro", () => {
  /*
   * Aucun crédit, aucune appréciation, aucune agence. Le décompte se réduit au
   * prix, et c'est le cas dégénéré qui doit tenir avant tous les autres :
   *
   *   prix de cession                        300 000,00
   *   produit net                            300 000,00
   */
  const entree: EntreeVente = {
    horizonMois: 0,
    valeurInitiale: euros(300_000),
    appreciationAnnuellePct: 0,
    commissionAgencePct: 0,
  };

  it("rend le prix, et rien d'autre", () => {
    const r = produitDeVente(entree, P);
    expect(r.postes.prixDeCession).toBe(euros(300_000));
    expect(r.produitNet).toBe(euros(300_000));
    expect(r.appreciationBrute).toBe(0);
  });

  it("n'invente aucun poste de crédit en l'absence de crédit", () => {
    const r = produitDeVente(entree, P);
    expect(r.postes.capitalRestantDu).toBe(0);
    expect(r.postes.indemniteRemboursementAnticipe).toBe(0);
    expect(r.postes.mainlevee).toBe(0);
    expect(r.postes.restitutionFondsGarantie).toBe(0);
    expect(r.detailIndemnite).toBeNull();
    expect(r.parametres.avantTermeDuCredit).toBe(false);
  });
});

describe("cas B — revente immédiate sous hypothèque", () => {
  /*
   * Bien à 300 000 €, prêt de 200 000 € sur 240 mois au taux moyen de 3 %,
   * garantie hypothécaire dont la mainlevée est chiffrée à 1 200 €. On revend
   * le jour même : c'est la vente la plus chère qui soit, et celle qu'aucun
   * simulateur ne montre.
   *
   *   prix de cession                        300 000,00   (appréciation nulle)
   *   − commission d'agence, 5 %             − 15 000,00
   *   − capital restant dû                  − 200 000,00   (aucune échéance payée)
   *   − indemnité                            −  3 000,00
   *   − mainlevée                            −  1 200,00
   *   + restitution du fonds                 +      0,00   (hypothèque : aucun fonds)
   *   ────────────────────────────────────────────────────
   *   produit net                              80 800,00
   *
   * L'indemnité, en détail — art. R313-25, double plafond :
   *   six mois d'intérêts : 200 000 × 3 % × 6/12 =  3 000,00   ← mord
   *   3 % du capital dû   : 200 000 × 3 %        =  6 000,00
   */
  const credit: CreditReprisPourVente = {
    plan: plan(echeancier(240, euros(200_000)), euros(200_000), HYPOTHEQUE(euros(1_200))),
    tauxMoyenAnnuelPct: 3,
  };
  const entree: EntreeVente = {
    horizonMois: 0,
    valeurInitiale: euros(300_000),
    appreciationAnnuellePct: 0,
    commissionAgencePct: 5,
    credit,
  };

  it("retient le capital emprunté, faute d'échéance payée", () => {
    // Le piège du module : `rows[m − 1]` porte le solde APRÈS le mois m. À
    // l'horizon zéro il n'existe aucune ligne, et lire `rows[0]` rendrait le
    // solde après la première échéance — un capital restant dû trop petit.
    expect(produitDeVente(entree, P).postes.capitalRestantDu).toBe(euros(200_000));
  });

  it("plafonne l'indemnité par les six mois d'intérêts", () => {
    const r = produitDeVente(entree, P);
    expect(r.postes.indemniteRemboursementAnticipe).toBe(euros(3_000));
    expect(r.detailIndemnite?.capByInterest).toBe(euros(3_000));
    expect(r.detailIndemnite?.capByOutstanding).toBe(euros(6_000));
    expect(r.detailIndemnite?.bindingCap).toBe("interest");
  });

  it("appelle la mainlevée, et aucune restitution", () => {
    const r = produitDeVente(entree, P);
    expect(r.parametres.avantTermeDuCredit).toBe(true);
    expect(r.postes.mainlevee).toBe(euros(1_200));
    expect(r.postes.restitutionFondsGarantie).toBe(0);
  });

  it("rend 80 800 € nets", () => {
    expect(produitDeVente(entree, P).produitNet).toBe(euros(80_800));
  });
});

describe("cas C — la vente ne couvre pas le capital restant dû", () => {
  /*
   * Bien acheté 200 000 €, marché en recul de 5 % par an, revente au bout de
   * deux ans avec un prêt encore à 195 000 €. Garantie par caution.
   *
   *   valeur appréciée : 200 000 × 0,95² = 200 000 × 0,9025 = 180 500,00
   *
   *   prix de cession                        180 500,00
   *   − commission d'agence, 5 %             −  9 025,00
   *   − capital restant dû                  − 195 000,00
   *   − indemnité                            −  2 925,00
   *   − mainlevée                            −      0,00   (caution : aucun acte)
   *   + restitution du fonds                 +  1 375,00
   *   ────────────────────────────────────────────────────
   *   produit net                            − 25 075,00
   *
   *   indemnité : six mois d'intérêts, 195 000 × 3 % × 6/12 = 2 925,00 ← mord
   *               3 % du capital dû,     195 000 × 3 %      = 5 850,00
   *
   * Le résultat est négatif, et il est juste : le vendeur doit apporter
   * 25 075 € au notaire pour que la vente se fasse. C'est une information, pas
   * une erreur, et le module ne la ramène pas à zéro.
   */
  const soldes: Cents[] = [];
  for (let m = 1; m <= 24; m++) soldes.push(euros(195_000));
  soldes.push(euros(190_000)); // 25e mois, jamais atteint : garde contre un décalage d'indice

  const entree: EntreeVente = {
    horizonMois: 24,
    valeurInitiale: euros(200_000),
    appreciationAnnuellePct: -5,
    commissionAgencePct: 5,
    credit: {
      plan: plan(echeancierAuSolde(soldes), euros(200_000), CAUTION(euros(1_375))),
      tauxMoyenAnnuelPct: 3,
    },
  };

  it("capitalise une appréciation négative sans plancher sur la valeur", () => {
    const r = produitDeVente(entree, P);
    expect(r.postes.prixDeCession).toBe(euros(180_500));
    expect(r.appreciationBrute).toBe(euros(-19_500));
  });

  it("rend un produit net négatif, sans le tronquer", () => {
    expect(produitDeVente(entree, P).produitNet).toBe(euros(-25_075));
  });

  it("distingue les postes de la caution de ceux de l'hypothèque", () => {
    const r = produitDeVente(entree, P);
    expect(r.postes.mainlevee).toBe(0);
    expect(r.postes.restitutionFondsGarantie).toBe(euros(1_375));
  });
});

describe("cas D — vente au terme du crédit", () => {
  /*
   * Même bien qu'au cas B, appréciation nulle, mais la vente intervient à la
   * 240e échéance. Le prêt est soldé : il n'y a ni capital restant dû, ni
   * indemnité — on ne rembourse pas par anticipation ce qui est déjà remboursé —
   * ni mainlevée, l'inscription s'éteignant d'elle-même. La restitution du fonds
   * mutuel, elle, est acquise.
   *
   *   prix de cession                        300 000,00
   *   − commission d'agence, 5 %             − 15 000,00
   *   + restitution du fonds                 +  1 375,00
   *   ────────────────────────────────────────────────────
   *   produit net                            286 375,00
   */
  const entree: EntreeVente = {
    horizonMois: 240,
    valeurInitiale: euros(300_000),
    appreciationAnnuellePct: 0,
    commissionAgencePct: 5,
    credit: {
      plan: plan(echeancier(240, euros(200_000)), euros(200_000), CAUTION(euros(1_375))),
      tauxMoyenAnnuelPct: 3,
    },
  };

  it("ne retient ni capital restant dû, ni indemnité, ni mainlevée", () => {
    const r = produitDeVente(entree, P);
    expect(r.parametres.avantTermeDuCredit).toBe(false);
    expect(r.postes.capitalRestantDu).toBe(0);
    expect(r.postes.indemniteRemboursementAnticipe).toBe(0);
    expect(r.postes.mainlevee).toBe(0);
  });

  it("rend 286 375 € nets", () => {
    expect(produitDeVente(entree, P).produitNet).toBe(euros(286_375));
  });

  it("n'appelle pas de mainlevée au terme, même sous hypothèque", () => {
    // Ce cas-ci a été ajouté après coup : le scénario ci-dessus est garanti par
    // une CAUTION, dont la mainlevée vaut zéro de toute façon. Rendre la
    // mainlevée inconditionnelle dans le module ne le faisait donc pas rougir.
    // Il faut une hypothèque pour que l'omission de la condition se voie.
    //
    // Passé la dernière échéance, l'inscription hypothécaire s'éteint d'elle-même
    // et il n'y a aucun acte de mainlevée à payer.
    const r = produitDeVente(
      {
        ...entree,
        credit: {
          plan: plan(echeancier(240, euros(200_000)), euros(200_000), HYPOTHEQUE(euros(1_200))),
          tauxMoyenAnnuelPct: 3,
        },
      },
      P,
    );
    expect(r.parametres.avantTermeDuCredit).toBe(false);
    expect(r.postes.mainlevee).toBe(0);
    expect(r.produitNet).toBe(euros(285_000));
  });

  it("ne rouvre pas d'indemnité au-delà du terme", () => {
    // Vendre cinq ans après la dernière échéance ne change rien au décompte du
    // crédit : il n'y a plus de crédit.
    const tard = produitDeVente({ ...entree, horizonMois: 300 }, P);
    expect(tard.postes.indemniteRemboursementAnticipe).toBe(0);
    expect(tard.postes.mainlevee).toBe(0);
    expect(tard.postes.restitutionFondsGarantie).toBe(euros(1_375));
  });
});

describe("cas E — caution contre hypothèque, tout le reste égal", () => {
  /*
   * Le même prêt, le même horizon, la même vente : seuls les postes de garantie
   * diffèrent, et ils diffèrent DANS LES DEUX SENS.
   *
   *   caution     : + 1 375,00 de restitution,      0,00 de mainlevée
   *   hypothèque  : +     0,00 de restitution,  1 200,00 de mainlevée
   *
   *   écart de produit net = 1 375 + 1 200 = 2 575,00 en faveur de la caution
   *
   * C'est le seul écart, et l'interface doit pouvoir le montrer comme tel.
   */
  const rows = echeancier(240, euros(200_000));
  const commun = {
    horizonMois: 60,
    valeurInitiale: euros(300_000),
    appreciationAnnuellePct: 0,
    commissionAgencePct: 5,
  } as const;

  const avecCaution = produitDeVente(
    {
      ...commun,
      credit: { plan: plan(rows, euros(200_000), CAUTION(euros(1_375))), tauxMoyenAnnuelPct: 3 },
    },
    P,
  );
  const avecHypotheque = produitDeVente(
    {
      ...commun,
      credit: {
        plan: plan(rows, euros(200_000), HYPOTHEQUE(euros(1_200))),
        tauxMoyenAnnuelPct: 3,
      },
    },
    P,
  );

  it("ne fait varier que les deux postes de garantie", () => {
    expect(avecCaution.postes.capitalRestantDu).toBe(avecHypotheque.postes.capitalRestantDu);
    expect(avecCaution.postes.indemniteRemboursementAnticipe).toBe(
      avecHypotheque.postes.indemniteRemboursementAnticipe,
    );
    expect(avecCaution.postes.prixDeCession).toBe(avecHypotheque.postes.prixDeCession);
  });

  it("chiffre l'écart à 2 575 €", () => {
    expect(avecCaution.produitNet - avecHypotheque.produitNet).toBe(euros(2_575));
    expect(avecCaution.postes.mainlevee).toBe(0);
    expect(avecHypotheque.postes.restitutionFondsGarantie).toBe(0);
  });
});

describe("cas F — capitalisation de l'appréciation", () => {
  /*
   * 100 000 € à 2 % par an pendant 120 mois.
   *   100 000 × 1,02^10 = 100 000 × 1,218994419994757… = 121 899,4419…
   *   arrondi au centime : 121 899,44
   *
   * Composé depuis la base en un seul arrondi. Composer année par année en
   * arrondissant à chaque pas dériverait de quelques centimes ici, et de
   * plusieurs euros sur trente ans.
   */
  it("compose depuis la base, avec un seul arrondi", () => {
    expect(valeurAppreciee(euros(100_000), 2, 120)).toBe(12_189_944);
  });

  it("accepte un horizon qui ne tombe pas sur une année pleine", () => {
    // 100 000 × 1,02^0,5 = 100 995,0494… → 100 995,05
    expect(valeurAppreciee(euros(100_000), 2, 6)).toBe(10_099_505);
  });

  it("ne rend jamais une valeur négative, même sous une appréciation absurde", () => {
    // Une base (1 + a) négative n'a pas de puissance fractionnaire réelle : le
    // résultat serait `NaN`, et un `NaN` qui traverse un décompte monétaire
    // produit un total plausible ailleurs et faux ici.
    expect(valeurAppreciee(euros(100_000), -150, 18)).toBe(0);
    expect(valeurAppreciee(euros(100_000), -100, 18)).toBe(0);
    expect(Number.isNaN(valeurAppreciee(euros(100_000), -150, 18))).toBe(false);
  });
});

/* ══ FISCALITÉ ══════════════════════════════════════════════════════════════ */

describe("exonération de la résidence principale", () => {
  const base: EntreeVente = {
    horizonMois: 36,
    valeurInitiale: euros(200_000),
    appreciationAnnuellePct: 3,
    commissionAgencePct: 0,
  };

  it("s'applique sans condition de durée de détention", () => {
    // Le point que la spécification demande d'enseigner. Les abattements par
    // durée de détention — vingt-deux ans, trente ans — sont ceux du régime de
    // DROIT COMMUN ; ils n'ont rien à voir avec l'exonération de l'art. 150 U,
    // II, 1°, et les confondre est l'erreur la plus répandue sur le sujet.
    for (const horizonMois of [0, 1, 12, 60, 264, 360]) {
      const r = produitDeVente({ ...base, horizonMois }, P);
      expect(r.exoneration.acquise).toBe(true);
      expect(r.postes.impotPlusValue).toBe(0);
    }
  });

  it("est le régime par défaut, bien occupé au jour de la cession", () => {
    const r = produitDeVente(base, P);
    expect(r.exoneration.acquise).toBe(true);
    expect(r.exoneration.moisDepuisDemenagement).toBeNull();
    expect(r.exoneration.reserve).toBeNull();
  });

  it("lit le délai normal de vente dans le millésime fiscal, jamais en dur", () => {
    const r = produitDeVente(base, P);
    expect(r.exoneration.delaiNormalMois).toBe(
      P.realEstateCapitalGains.mainResidenceExemption.normalSaleDelayMonths,
    );
    expect(r.parametres.millesimeFiscal).toBe(P.vintage);
  });

  it("tient tant que le bien quitté l'est depuis moins que le délai normal", () => {
    const delai = P.realEstateCapitalGains.mainResidenceExemption.normalSaleDelayMonths;
    const dedans = produitDeVente(
      { ...base, regimePlusValue: { nature: "residence-principale", moisDepuisDemenagement: delai } },
      P,
    );
    expect(dedans.exoneration.acquise).toBe(true);
    expect(dedans.exoneration.reserve).toBeNull();
  });

  it("pose une réserve au-delà, sans inventer d'impôt", () => {
    const delai = P.realEstateCapitalGains.mainResidenceExemption.normalSaleDelayMonths;
    const dehors = produitDeVente(
      {
        ...base,
        regimePlusValue: { nature: "residence-principale", moisDepuisDemenagement: delai + 1 },
      },
      P,
    );
    expect(dehors.exoneration.acquise).toBe(false);
    // Le module ne sait pas calculer l'impôt de droit commun ; il le dit au lieu
    // de le fabriquer. Un zéro sans réserve serait un mensonge par omission.
    expect(dehors.postes.impotPlusValue).toBe(0);
    expect(dehors.exoneration.reserve).toMatch(/n'est pas un seuil opposable/);
    expect(dehors.exoneration.reserve).toMatch(/régime imposable/);
  });
});

describe("la place laissée au cas imposable — `ENG-014`", () => {
  const base: EntreeVente = {
    horizonMois: 120,
    valeurInitiale: euros(200_000),
    appreciationAnnuellePct: 0,
    commissionAgencePct: 0,
  };

  it("retranche un impôt fourni de l'extérieur, sans le réinterpréter", () => {
    const r = produitDeVente(
      {
        ...base,
        regimePlusValue: { nature: "imposable", impotTotal: euros(12_345), origine: "ENG-014" },
      },
      P,
    );
    expect(r.postes.impotPlusValue).toBe(euros(12_345));
    expect(r.produitNet).toBe(euros(200_000) - euros(12_345));
    expect(r.exoneration.acquise).toBe(false);
  });

  it("refuse un impôt négatif, qui ne serait pas un remboursement", () => {
    const r = produitDeVente(
      { ...base, regimePlusValue: { nature: "imposable", impotTotal: euros(-5_000) } },
      P,
    );
    expect(r.postes.impotPlusValue).toBe(0);
  });
});

/* ══ HYPOTHÈSES DE MARCHÉ ═══════════════════════════════════════════════════ */

/**
 * Le bloc `vente` de `assumptions/market.ts`.
 *
 * ⚠️ `assumptions/__tests__/market.test.ts` n'itère nommément que sur le bloc
 * `guarantee` : un bloc ajouté ailleurs échappe entièrement à sa boucle. Cette
 * dette est signalée là-bas ; en attendant qu'elle soit traitée, ce bloc-ci est
 * couvert ici, avec les mêmes exigences.
 */
describe("hypothèses de marché du scénario de vente", () => {
  const v = MARKET_2026.vente;

  it("l'appréciation n'a délibérément AUCUNE valeur centrale", () => {
    // C'est la garde la plus importante de ce bloc. Ajouter un champ `valeur`
    // à l'appréciation reviendrait à publier une prévision de marché, et le
    // module se mettrait aussitôt à l'employer par défaut. `docs/CONTEXT.md` §8.
    expect(Object.keys(v.appreciationAnnuellePct)).not.toContain("valeur");
  });

  it("l'intervalle d'appréciation descend sous zéro", () => {
    // Un intervalle strictement positif serait déjà une prévision : il dirait
    // qu'un bien ne peut pas perdre de valeur.
    const [bas, haut] = v.appreciationAnnuellePct.intervalle;
    expect(bas).toBeLessThan(0);
    expect(bas).toBeLessThanOrEqual(haut);
  });

  it("la commission d'agence tient dans l'intervalle qu'elle déclare", () => {
    const [bas, haut] = v.commissionAgencePct.intervalle;
    expect(bas).toBeLessThanOrEqual(haut);
    expect(v.commissionAgencePct.valeur).toBeGreaterThanOrEqual(bas);
    expect(v.commissionAgencePct.valeur).toBeLessThanOrEqual(haut);
    expect(v.commissionAgencePct.valeur).toBeLessThanOrEqual(100);
  });

  it("chaque hypothèse annonce une provenance lisible et une fiabilité", () => {
    for (const [nom, h] of Object.entries(v)) {
      expect(h.provenance.length, `${nom} : provenance trop courte`).toBeGreaterThan(60);
      expect(h.provenance.trim().endsWith("."), `${nom} : provenance sans point final`).toBe(true);
      expect(["observee", "estimee"]).toContain(h.fiabilite);
    }
  });

  it("le module emploie ces hypothèses, et non une copie en dur", () => {
    // Garde comportementale, sur le modèle de `hypotheses-detention.test.ts` :
    // un relevé substitué avec des valeurs improbables doit se retrouver dans le
    // résultat. Une valeur par défaut recopiée dans le calcul y rougit.
    const improbable: MarketAssumptions = {
      ...MARKET_2026,
      releve: "1999-01",
      vente: {
        ...MARKET_2026.vente,
        commissionAgencePct: { ...MARKET_2026.vente.commissionAgencePct, valeur: 25 },
      },
    };
    const r = produitDeVente(
      {
        horizonMois: 0,
        valeurInitiale: euros(400_000),
        appreciationAnnuellePct: 0,
        hypotheses: improbable,
      },
      P,
    );
    expect(r.parametres.commissionAgencePct).toBe(25);
    expect(r.postes.commissionAgence).toBe(euros(100_000));
    expect(r.parametres.releveHypotheses).toBe("1999-01");
  });

  it("une commission explicite l'emporte sur l'hypothèse, zéro compris", () => {
    // Zéro est une saisie légitime — la vente de particulier à particulier — et
    // un `??` mal placé la remplacerait par la valeur de marché sans un bruit.
    const r = produitDeVente(
      {
        horizonMois: 0,
        valeurInitiale: euros(400_000),
        appreciationAnnuellePct: 0,
        commissionAgencePct: 0,
      },
      P,
    );
    expect(r.parametres.commissionAgencePct).toBe(0);
    expect(r.postes.commissionAgence).toBe(0);
  });
});

/* ══ INVARIANTS ═════════════════════════════════════════════════════════════ */

const montantBien = fc.integer({ min: 0, max: 3_000_000_00 });
const capital = fc.integer({ min: 0, max: 1_000_000_00 });
const pctCommission = fc.double({ min: 0, max: 15, noNaN: true, noDefaultInfinity: true });
const pctTaux = fc.double({ min: 0, max: 12, noNaN: true, noDefaultInfinity: true });
const horizon = fc.integer({ min: 0, max: 480 });

/** Appréciation dans un domaine réaliste, bornes négatives comprises. */
const pctAppreciation = fc.double({ min: -8, max: 8, noNaN: true, noDefaultInfinity: true });

/** Domaine volontairement hors sens, pour éprouver les planchers. */
const pctAppreciationAbsurde = fc.double({
  min: -400,
  max: 50,
  noNaN: true,
  noDefaultInfinity: true,
});

const garantie: fc.Arbitrary<GuaranteeCost> = fc.oneof(
  fc
    .integer({ min: 0, max: 10_000_00 })
    .map((m) => HYPOTHEQUE(m)),
  fc.integer({ min: 0, max: 5_000_00 }).map((r) => CAUTION(r)),
);

const scenario: fc.Arbitrary<EntreeVente> = fc
  .record({
    horizonMois: horizon,
    valeurInitiale: montantBien,
    appreciationAnnuellePct: pctAppreciation,
    commissionAgencePct: pctCommission,
    capitalInitial: capital,
    dureeCredit: fc.integer({ min: 0, max: 360 }),
    taux: pctTaux,
    g: garantie,
    avecCredit: fc.boolean(),
  })
  .map(({ capitalInitial, dureeCredit, taux, g, avecCredit, ...reste }) => ({
    ...reste,
    ...(avecCredit
      ? {
          credit: {
            plan: plan(echeancier(dureeCredit, capitalInitial), capitalInitial, g),
            tauxMoyenAnnuelPct: taux,
          },
        }
      : {}),
  }));

describe("invariants du produit de vente", () => {
  it("le produit net est exactement la somme algébrique des postes rendus", () => {
    // L'invariant structurel. S'il tombait, l'interface afficherait un décompte
    // qui ne tombe pas juste — pire qu'un chiffre absent, parce qu'il a l'air
    // vérifiable.
    fc.assert(
      fc.property(scenario, (e) => {
        const r = produitDeVente(e, P);
        const x = r.postes;
        expect(r.produitNet).toBe(
          x.prixDeCession -
            x.commissionAgence -
            x.capitalRestantDu -
            x.indemniteRemboursementAnticipe -
            x.mainlevee +
            x.restitutionFondsGarantie -
            x.impotPlusValue,
        );
      }),
      { numRuns: 400 },
    );
  });

  it("aucun poste n'est négatif, et tous sont entiers", () => {
    fc.assert(
      fc.property(scenario, pctAppreciationAbsurde, (e, a) => {
        const r = produitDeVente({ ...e, appreciationAnnuellePct: a }, P);
        for (const [nom, montant] of Object.entries(r.postes)) {
          expect(Number.isInteger(montant), `${nom} n'est pas un entier de centimes`).toBe(true);
          expect(montant, `${nom} est négatif`).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 400 },
    );
  });

  it("l'indemnité respecte les DEUX plafonds de l'art. R313-25", () => {
    fc.assert(
      fc.property(scenario, (e) => {
        const r = produitDeVente(e, P);
        if (!r.detailIndemnite) return;
        const i = r.postes.indemniteRemboursementAnticipe;
        expect(i).toBeLessThanOrEqual(r.detailIndemnite.capByInterest);
        expect(i).toBeLessThanOrEqual(r.detailIndemnite.capByOutstanding);
        // 3 % du capital restant dû, le plafond que l'on peut vérifier de tête.
        expect(i).toBeLessThanOrEqual(
          Math.ceil((r.postes.capitalRestantDu * P.prepayment.capPctOutstanding) / 100),
        );
      }),
      { numRuns: 400 },
    );
  });

  it("passé le terme du crédit, ni indemnité ni mainlevée", () => {
    fc.assert(
      fc.property(scenario, (e) => {
        const r = produitDeVente(e, P);
        if (r.parametres.avantTermeDuCredit) return;
        expect(r.postes.indemniteRemboursementAnticipe).toBe(0);
        expect(r.postes.mainlevee).toBe(0);
      }),
      { numRuns: 400 },
    );
  });

  it("l'horizon zéro retient le capital emprunté en entier", () => {
    fc.assert(
      fc.property(scenario, (e) => {
        const r = produitDeVente({ ...e, horizonMois: 0 }, P);
        expect(r.postes.capitalRestantDu).toBe(e.credit?.plan.totalPrincipal ?? 0);
      }),
      { numRuns: 300 },
    );
  });

  it("le produit net croît avec l'appréciation, commission comprise", () => {
    // La commission mord sur un prix qui monte, mais elle n'en mord qu'une
    // fraction : le net doit rester croissant. L'inverse signalerait une
    // commission appliquée à la mauvaise assiette.
    fc.assert(
      fc.property(scenario, pctAppreciation, pctAppreciation, (e, a, b) => {
        const bas = Math.min(a, b);
        const haut = Math.max(a, b);
        const rBas = produitDeVente({ ...e, appreciationAnnuellePct: bas }, P);
        const rHaut = produitDeVente({ ...e, appreciationAnnuellePct: haut }, P);
        expect(rHaut.produitNet).toBeGreaterThanOrEqual(rBas.produitNet);
      }),
      { numRuns: 300 },
    );
  });

  it("l'impôt fourni se retranche à l'euro près, quel qu'il soit", () => {
    fc.assert(
      fc.property(scenario, fc.integer({ min: 0, max: 500_000_00 }), (e, impot) => {
        const exonere = produitDeVente(e, P);
        const impose = produitDeVente(
          { ...e, regimePlusValue: { nature: "imposable", impotTotal: impot } },
          P,
        );
        expect(impose.produitNet).toBe(exonere.produitNet - impot);
      }),
      { numRuns: 300 },
    );
  });

  it("la résidence principale occupée n'est jamais imposée, quelle que soit la durée", () => {
    // L'invariant fiscal du module, et le seul qui porte un enseignement.
    fc.assert(
      fc.property(scenario, (e) => {
        const r = produitDeVente(e, P);
        expect(r.exoneration.acquise).toBe(true);
        expect(r.postes.impotPlusValue).toBe(0);
      }),
      { numRuns: 300 },
    );
  });

  it("la fonction est pure : deux appels identiques rendent le même décompte", () => {
    fc.assert(
      fc.property(scenario, (e) => {
        expect(produitDeVente(e, P)).toStrictEqual(produitDeVente(e, P));
      }),
      { numRuns: 200 },
    );
  });
});
