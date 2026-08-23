/**
 * ASSEMBLAGE DE LA CESSION — `ENG-027`
 *
 * Ce fichier ne garde aucune formule : `vente.test.ts` et `plus-value.test.ts`
 * gardent déjà les deux moteurs qu'il assemble. Il garde le **branchement**, et
 * quatre choses précisément :
 *
 *   1. UN CAS DE BOUT EN BOUT, chiffré à la main dans son commentaire, du prix
 *      d'achat au produit net après impôt. C'est le seul test qui prouve que la
 *      chaîne entière tombe juste.
 *
 *   2. L'ÉCART EXACT. Le produit d'une résidence principale exonérée et celui
 *      du même bien déclaré imposable diffèrent du montant de l'impôt, et de
 *      rien d'autre. Si un poste bougeait en plus, l'impôt aurait rétroagi sur
 *      son assiette et le décompte ne serait plus vérifiable.
 *
 *   3. LA PROPRIÉTÉ QUI JUSTIFIE LE MODULE. Une grandeur partagée ne peut pas
 *      prendre deux valeurs : la durée de détention EST l'horizon de la vente,
 *      le prix d'acquisition EST la valeur initiale, les frais de cession SONT
 *      les postes du décompte. Éprouvé y compris sur des entrées hostiles, où
 *      l'on tente de faire entrer une seconde valeur par la fenêtre.
 *
 *   4. LES RÉSERVES REMONTENT, et l'on peut dire de quel module elles viennent.
 *      Ni perdues, ni fondues en une chaîne unique.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { euros } from "../../money";
import type { Cents } from "../../money";
import type { ConsolidatedRow, GuaranteeCost } from "../../credit/plan";
import { PARAMS_2026 } from "../../fiscal/params";
import {
  type EntreeCession,
  type RegimeDeCession,
  HORS_MODELE_CESSION,
  chiffrerCession,
  situationDeCession,
} from "../cession";
import {
  ForfaitHorsChampError,
  HORS_MODELE,
  motifExclusionForfaitTravaux,
} from "../plus-value";
import type { EntreeVente, PlanRepris } from "../vente";

const P = PARAMS_2026;

/* ── Outils de scénario ───────────────────────────────────────────────────── */

/** Même échéancier synthétique que `vente.test.ts` : le module lit `balance`, rien d'autre. */
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

/** Régime imposable ordinaire : bâti, personne physique, affiliée en France, tout au réel. */
function imposable(surcharge: Partial<Extract<RegimeDeCession, { nature: "imposable" }>> = {}) {
  return {
    nature: "imposable",
    natureDuBien: "immeuble-bati",
    qualiteDuCedant: "personne-physique",
    regimeSocial: "affilie-france",
    fraisAcquisition: { mode: "reel", montant: 0 },
    travaux: { mode: "reel", montant: 0 },
    ...surcharge,
  } as const satisfies RegimeDeCession as RegimeDeCession;
}

/* ══ CAS DE RÉFÉRENCE ═══════════════════════════════════════════════════════ */

describe("cas A — bien locatif revendu au bout de vingt ans, majorations au forfait", () => {
  /*
   * Le cas de bout en bout. Achat comptant pour que la vente n'apporte que ses
   * deux postes évidents ; tout le reste du décompte est fiscal, et c'est là
   * que l'assemblage se juge.
   *
   * Bien acheté 200 000 €, revendu vingt ans plus tard. Appréciation 3 % par
   * an, commission d'agence 5 %, cédant personne physique affiliée en France,
   * immeuble bâti, majorations forfaitaires.
   *
   * ── LE PRIX ET SES FRAIS ────────────────────────────────────────────────
   *   prix de cession   200 000 × 1,03^20
   *                   = 200 000 × 1,806111234669…   = 361 222,246934 → 361 222,25
   *   commission 5 %    5 % × 361 222,25 = 18 061,1125            →  18 061,11
   *   mainlevée         achat comptant                            →       0,00
   *   ───────────────────────────────────────────────────────────────────────
   *   frais de cession déduits (CGI, art. 150 VA, III)               18 061,11
   *   prix de cession net  361 222,25 − 18 061,11                =  343 161,14
   *
   * ── LE PRIX D'ACQUISITION MAJORÉ ────────────────────────────────────────
   *   prix d'acquisition = valeur initiale                          200 000,00
   *   + forfait frais d'acquisition   7,5 % × 200 000            =   15 000,00
   *   + forfait travaux                15 % × 200 000            =   30 000,00
   *   ───────────────────────────────────────────────────────────────────────
   *   prix d'acquisition majoré                                     245 000,00
   *
   *   plus-value brute   343 161,14 − 245 000,00                 =   98 161,14
   *
   * ── LES DEUX ABATTEMENTS, SUR VINGT ANNÉES RÉVOLUES ─────────────────────
   *   impôt sur le revenu   années 6 à 20, 15 × 6 %     = 90 %
   *     abattement  90 % × 98 161,14 = 88 345,026       →   88 345,03
   *     base IR     98 161,14 − 88 345,03               =    9 816,11
   *   prélèvements sociaux  années 6 à 20, 15 × 1,65 %  = 24,75 %
   *     abattement  24,75 % × 98 161,14 = 24 294,88215  →   24 294,88
   *     base PS     98 161,14 − 24 294,88               =   73 866,26
   *
   * ── LES TROIS IMPOSITIONS ───────────────────────────────────────────────
   *   impôt sur le revenu   19 %   ×  9 816,11 =  1 865,0609    →  1 865,06
   *   prélèvements sociaux  17,2 % × 73 866,26 = 12 704,99672   → 12 705,00
   *   surtaxe               base IR 9 816,11 ≤ 50 000           →      0,00
   *   ───────────────────────────────────────────────────────────────────────
   *   impôt total                                                  14 570,06
   *
   * ── LE DÉCOMPTE ─────────────────────────────────────────────────────────
   *   prix de cession                                             361 222,25
   *   − commission d'agence                                      − 18 061,11
   *   − impôt de plus-value                                      − 14 570,06
   *   ───────────────────────────────────────────────────────────────────────
   *   produit net                                                 328 591,08
   */
  const vente: Omit<EntreeVente, "regimePlusValue"> = {
    horizonMois: 240,
    valeurInitiale: euros(200_000),
    appreciationAnnuellePct: 3,
    commissionAgencePct: 5,
  };
  const entree: EntreeCession = {
    vente,
    regime: imposable({
      fraisAcquisition: { mode: "forfait" },
      travaux: { mode: "forfait" },
    }),
  };

  it("arrête le prix de cession et les frais qui s'en déduisent", () => {
    const r = chiffrerCession(entree, P);
    expect(r.grandeurs.prixDeCession).toBe(euros(361_222.25));
    expect(r.fraisDeCession).toStrictEqual({
      commissionAgence: euros(18_061.11),
      mainlevee: 0,
      autres: 0,
      total: euros(18_061.11),
    });
    expect(r.plusValue?.assiette.prixDeCessionNet).toBe(euros(343_161.14));
  });

  it("majore le prix d'acquisition par les deux forfaits, sur la valeur initiale", () => {
    const r = chiffrerCession(entree, P);
    expect(r.grandeurs.prixAcquisition).toBe(euros(200_000));
    expect(r.plusValue?.assiette.majorationFraisAcquisition).toBe(euros(15_000));
    expect(r.plusValue?.assiette.majorationTravaux).toBe(euros(30_000));
    expect(r.plusValue?.assiette.prixAcquisitionMajore).toBe(euros(245_000));
    expect(r.plusValue?.assiette.plusValueBrute).toBe(euros(98_161.14));
  });

  it("applique DEUX abattements distincts sur vingt années révolues", () => {
    const r = chiffrerCession(entree, P);
    expect(r.plusValue?.abattementImpotRevenu.anneesDetention).toBe(20);
    expect(r.plusValue?.abattementImpotRevenu.tauxPct).toBe(90);
    expect(r.plusValue?.abattementImpotRevenu.montant).toBe(euros(88_345.03));
    expect(r.plusValue?.baseImpotRevenu).toBe(euros(9_816.11));

    expect(r.plusValue?.abattementPrelevementsSociaux.tauxPct).toBe(24.75);
    expect(r.plusValue?.abattementPrelevementsSociaux.montant).toBe(euros(24_294.88));
    expect(r.plusValue?.basePrelevementsSociaux).toBe(euros(73_866.26));
  });

  it("chiffre l'impôt et le porte dans le décompte de vente", () => {
    const r = chiffrerCession(entree, P);
    expect(r.plusValue?.impotRevenu).toBe(euros(1_865.06));
    expect(r.plusValue?.prelevementsSociaux).toBe(euros(12_705));
    expect(r.plusValue?.surtaxe).toBe(0);
    expect(r.plusValue?.total).toBe(euros(14_570.06));

    expect(r.produitDeVente.postes.impotPlusValue).toBe(euros(14_570.06));
    expect(r.produitDeVente.produitNet).toBe(euros(328_591.08));
  });

  it("trace d'où vient le montant retranché", () => {
    // `origine` est le seul lien que l'interface aura entre un poste du
    // décompte et le module qui l'a produit.
    const r = chiffrerCession(entree, P);
    const regime = r.produitDeVente.exoneration;
    expect(regime.acquise).toBe(false);
    expect(r.plusValue?.millesime).toBe(P.vintage);
  });

  it("le même bien en résidence principale ne diffère QUE de l'impôt", () => {
    // L'invariant du ticket, sur le cas de référence : 343 161,14 contre
    // 328 591,08, soit exactement les 14 570,06 € d'impôt.
    const exonere = chiffrerCession({ vente, regime: { nature: "residence-principale" } }, P);
    const impose = chiffrerCession(entree, P);

    expect(exonere.produitDeVente.produitNet).toBe(euros(343_161.14));
    expect(exonere.produitDeVente.produitNet - impose.produitDeVente.produitNet).toBe(
      euros(14_570.06),
    );
    expect(exonere.plusValue).toBeNull();
    expect(exonere.fraisDeCession).toBeNull();
    expect(exonere.situation).toBeNull();
    expect(exonere.produitDeVente.postes.impotPlusValue).toBe(0);
    expect(exonere.produitDeVente.exoneration.acquise).toBe(true);
  });
});

describe("cas B — vente anticipée sous hypothèque, l'indemnité n'est pas déductible", () => {
  /*
   * Le cas qui juge le tri des frais. Deux postes du décompte de vente valent
   * chacun 1 500 € et sortent tous deux de la poche du vendeur ; **un seul**
   * réduit son impôt.
   *
   * Bien à 250 000 €, marché plat, revente au bout de dix ans. Prêt de
   * 200 000 € sur 240 mois au taux moyen de 3 %, garantie hypothécaire dont la
   * mainlevée coûte 1 500 €. Diagnostics : 800 €.
   *
   *   prix de cession       250 000 × 1,00^10                    = 250 000,00
   *   commission 4 %                                             =  10 000,00
   *   capital restant dû    200 000 × (240 − 120)/240            = 100 000,00
   *   indemnité             min(3 % × 100 000 ; 100 000 × 3 % × 6/12)
   *                       = min(3 000 ; 1 500)                   =   1 500,00
   *   mainlevée             vente avant terme                    =   1 500,00
   *   restitution du fonds  hypothèque : aucun fonds             =       0,00
   *
   *   FRAIS DE CESSION DÉDUCTIBLES (art. 150 VA, III)
   *     commission 10 000,00 + mainlevée 1 500,00 + diagnostics 800,00
   *                                                              =  12 300,00
   *     l'indemnité de remboursement anticipé N'Y EST PAS : la liste de
   *     l'annexe III, art. 41 duovicies H, ne la mentionne pas.
   *
   *   prix de cession net   250 000,00 − 12 300,00               = 237 700,00
   *   prix d'acquisition majoré  250 000 + 0 + 0                 = 250 000,00
   *   plus-value brute      237 700,00 − 250 000,00              = − 12 300,00
   *     moins-value : aucune imposition, et elle ne s'impute sur rien.
   *
   *   produit net  250 000 − 10 000 − 100 000 − 1 500 − 1 500 − 0 = 137 000,00
   */
  const entree: EntreeCession = {
    vente: {
      horizonMois: 120,
      valeurInitiale: euros(250_000),
      appreciationAnnuellePct: 0,
      commissionAgencePct: 4,
      credit: {
        plan: plan(echeancier(240, euros(200_000)), euros(200_000), HYPOTHEQUE(euros(1_500))),
        tauxMoyenAnnuelPct: 3,
      },
    },
    regime: imposable(),
    autresFraisDeCession: euros(800),
  };

  it("compose les frais déductibles des postes du décompte, indemnité exclue", () => {
    const r = chiffrerCession(entree, P);
    expect(r.produitDeVente.postes.indemniteRemboursementAnticipe).toBe(euros(1_500));
    expect(r.produitDeVente.postes.mainlevee).toBe(euros(1_500));
    expect(r.fraisDeCession).toStrictEqual({
      commissionAgence: euros(10_000),
      mainlevee: euros(1_500),
      autres: euros(800),
      total: euros(12_300),
    });
  });

  it("rend une moins-value égale aux seuls frais de cession, et aucun impôt", () => {
    const r = chiffrerCession(entree, P);
    expect(r.plusValue?.assiette.prixDeCessionNet).toBe(euros(237_700));
    expect(r.plusValue?.assiette.plusValueBrute).toBe(euros(-12_300));
    expect(r.plusValue?.moinsValue).toBe(true);
    expect(r.plusValue?.total).toBe(0);
    expect(r.produitDeVente.produitNet).toBe(euros(137_000));
  });

  it("dit que la moins-value ne s'impute sur rien", () => {
    const r = chiffrerCession(entree, P);
    expect(r.reserves.map((x) => x.texte)).toContain(HORS_MODELE.moinsValueNonImputable);
  });

  it("sous caution, la mainlevée disparaît des frais et la restitution du décompte", () => {
    // Le contre-cas. La garantie ne change pas le prix ; elle change ce qui est
    // déductible, donc l'assiette, donc l'impôt — et pas dans le même sens que
    // le produit brut. Sans lui, la reprise de la mainlevée ne serait gardée
    // par rien : c'est la leçon du quatrième sabotage d'`ENG-012`.
    const sousCaution = chiffrerCession(
      {
        ...entree,
        vente: {
          ...entree.vente,
          credit: {
            plan: plan(echeancier(240, euros(200_000)), euros(200_000), CAUTION(euros(2_000))),
            tauxMoyenAnnuelPct: 3,
          },
        },
      },
      P,
    );
    expect(sousCaution.fraisDeCession?.mainlevee).toBe(0);
    expect(sousCaution.fraisDeCession?.total).toBe(euros(10_800));
    expect(sousCaution.produitDeVente.postes.restitutionFondsGarantie).toBe(euros(2_000));
    // 250 000 − 10 000 − 100 000 − 1 500 − 0 + 2 000 = 140 500 €.
    expect(sousCaution.produitDeVente.produitNet).toBe(euros(140_500));
  });
});

describe("cas C — l'assiette tombe dans la fente du barème de la surtaxe", () => {
  /*
   * Le cas qui a imposé la seule modification d'un fichier partagé — voir le
   * message de commit et ADR-016.
   *
   * Le seuil de la surtaxe vise les plus-values « supérieur[es] à 50 000 € » et
   * la première tranche du tableau ouvre à « 50 001 € ». Entre les deux, 99
   * centimes que le barème ne nomme pas. Une assiette saisie en euros ronds n'y
   * tombe jamais ; une assiette DÉRIVÉE d'une valeur appréciée y tombe, et
   * c'est exactement ce que cet assemblage fabrique.
   *
   *   valeur initiale                                             100 000,00
   *   prix de cession   100 000 × 1,500001                      = 150 000,10
   *   frais de cession  commission nulle, achat comptant        =       0,00
   *   plus-value brute  150 000,10 − 100 000,00                 =  50 000,10
   *   une année révolue : aucun abattement.
   *
   *   impôt sur le revenu   19 %   × 50 000,10 =  9 500,019     →   9 500,02
   *   prélèvements sociaux  17,2 % × 50 000,10 =  8 600,0172    →   8 600,02
   *   surtaxe  2 % × 50 000,10 − (60 000 − 50 000,10)/20
   *          = 1 000,002 − 499,995 = 500,007                    →     500,01
   *   ───────────────────────────────────────────────────────────────────────
   *   impôt total                                                  18 600,05
   */
  const entree: EntreeCession = {
    vente: {
      horizonMois: 12,
      valeurInitiale: euros(100_000),
      appreciationAnnuellePct: 50.0001,
      commissionAgencePct: 0,
    },
    regime: imposable(),
  };

  it("ne lève pas, et taxe", () => {
    const r = chiffrerCession(entree, P);
    expect(r.plusValue?.baseImpotRevenu).toBe(euros(50_000.1));
    expect(r.plusValue?.impotRevenu).toBe(euros(9_500.02));
    expect(r.plusValue?.prelevementsSociaux).toBe(euros(8_600.02));
    expect(r.plusValue?.surtaxe).toBe(euros(500.01));
    expect(r.plusValue?.total).toBe(euros(18_600.05));
  });
});

/* ══ LA PROPRIÉTÉ QUI JUSTIFIE LE MODULE ════════════════════════════════════ */

describe("une grandeur partagée ne peut pas prendre deux valeurs", () => {
  it("la durée de détention EST l'horizon de la vente, normalisation comprise", () => {
    // Y compris sur un horizon fractionnaire ou négatif : `produitDeVente` le
    // ramène à un entier positif, et la situation fiscale doit suivre le même
    // chemin. Une normalisation faite deux fois de deux façons rouvrirait
    // l'écart que le module ferme.
    for (const horizonMois of [-40, -0.5, 0, 0.9, 59.9, 60, 60.4, 251.7, 480]) {
      const r = chiffrerCession(
        {
          vente: {
            horizonMois,
            valeurInitiale: euros(300_000),
            appreciationAnnuellePct: 2,
            commissionAgencePct: 5,
          },
          regime: imposable(),
        },
        P,
      );
      const attendu = Math.max(0, Math.floor(horizonMois));
      expect(r.produitDeVente.horizonMois, `horizon ${horizonMois}`).toBe(attendu);
      expect(r.grandeurs.dureeDetentionMois).toBe(attendu);
      expect(r.situation?.dureeDetentionMois).toBe(attendu);
      expect(r.plusValue?.abattementImpotRevenu.anneesDetention).toBe(Math.floor(attendu / 12));
    }
  });

  it("aucune valeur étrangère glissée dans l'entrée n'atteint le calcul", () => {
    // La démonstration la plus directe : le type n'offre aucun champ où écrire
    // un second prix, une seconde durée ou de seconds frais. On force donc
    // l'écriture par un transtypage, et le résultat doit être STRICTEMENT
    // identique. S'il ne l'était pas, c'est qu'un de ces noms serait lu quelque
    // part, et la divergence redeviendrait possible.
    const propre: EntreeCession = {
      vente: {
        horizonMois: 180,
        valeurInitiale: euros(220_000),
        appreciationAnnuellePct: 2.5,
        commissionAgencePct: 4,
      },
      regime: imposable(),
    };
    const contrebande = {
      ...propre,
      prixDeCession: euros(999_999),
      prixAcquisition: euros(1),
      dureeDetentionMois: 9_999,
      fraisDeCession: euros(50_000),
      params: PARAMS_2026,
      vente: { ...propre.vente, dureeDetentionMois: 3, prixAcquisition: euros(7) },
    } as unknown as EntreeCession;

    expect(chiffrerCession(contrebande, P)).toStrictEqual(chiffrerCession(propre, P));
  });

  it("le jeton de forfait est construit sur la situation dérivée, et sur aucune autre", () => {
    // 60 mois tout juste n'ouvrent pas le forfait travaux — le texte dit « plus
    // de cinq ans ». L'appelant ne fournit aucune situation, donc il ne peut
    // pas en fournir une qui mentirait sur la durée : le refus est certain.
    const a60mois: EntreeCession = {
      vente: {
        horizonMois: 60,
        valeurInitiale: euros(200_000),
        appreciationAnnuellePct: 3,
        commissionAgencePct: 5,
      },
      regime: imposable({ travaux: { mode: "forfait" } }),
    };
    expect(() => chiffrerCession(a60mois, P)).toThrow(ForfaitHorsChampError);

    // Et l'appelant peut le savoir AVANT d'appeler, sans provoquer l'exception.
    const situation = situationDeCession(a60mois);
    expect(situation?.dureeDetentionMois).toBe(60);
    expect(motifExclusionForfaitTravaux(situation!, P)).not.toBeNull();

    // Un mois de plus, et il s'ouvre — sur la même description, sans rien
    // ressaisir. C'est la durée de la vente qui commande, pas une seconde
    // saisie.
    const a61mois: EntreeCession = { ...a60mois, vente: { ...a60mois.vente, horizonMois: 61 } };
    expect(motifExclusionForfaitTravaux(situationDeCession(a61mois)!, P)).toBeNull();
    expect(chiffrerCession(a61mois, P).plusValue?.assiette.majorationTravaux).toBe(euros(30_000));
  });

  it("le forfait de frais reste fermé à un fonds de placement immobilier", () => {
    const entree: EntreeCession = {
      vente: {
        horizonMois: 240,
        valeurInitiale: euros(200_000),
        appreciationAnnuellePct: 3,
        commissionAgencePct: 5,
      },
      regime: imposable({
        qualiteDuCedant: "fonds-de-placement-immobilier",
        fraisAcquisition: { mode: "forfait" },
      }),
    };
    expect(() => chiffrerCession(entree, P)).toThrow(ForfaitHorsChampError);
  });

  it("`situationDeCession` rend exactement la situation employée par le calcul", () => {
    const entree: EntreeCession = {
      vente: {
        horizonMois: 137,
        valeurInitiale: euros(410_000),
        appreciationAnnuellePct: 1.5,
        commissionAgencePct: 6,
      },
      regime: imposable({ natureDuBien: "terrain-a-batir" }),
    };
    expect(situationDeCession(entree)).toStrictEqual(chiffrerCession(entree, P).situation);
    // En résidence principale, il n'y a pas de situation à établir.
    expect(situationDeCession({ ...entree, regime: { nature: "residence-principale" } })).toBeNull();
  });
});

/* ══ LES RÉSERVES ═══════════════════════════════════════════════════════════ */

describe("les réserves remontent, et disent de quel module elles viennent", () => {
  const vente: Omit<EntreeVente, "regimePlusValue"> = {
    horizonMois: 240,
    valeurInitiale: euros(200_000),
    appreciationAnnuellePct: 3,
    commissionAgencePct: 5,
  };

  it("celles de `plus-value.ts` arrivent entières, une par une, dans l'ordre", () => {
    const r = chiffrerCession({ vente, regime: imposable() }, P);
    const dePlusValue = r.reserves.filter((x) => x.source === "plus-value").map((x) => x.texte);
    // Ni perdues, ni fondues : la liste rendue est celle du module, à
    // l'identique et dans son ordre.
    expect(dePlusValue).toStrictEqual([...(r.plusValue?.nonModelise ?? [])]);
    expect(dePlusValue.length).toBeGreaterThan(0);
  });

  it("l'assemblage ajoute les siennes, et elles portent la source `cession`", () => {
    const r = chiffrerCession({ vente, regime: imposable() }, P);
    const deCession = r.reserves.filter((x) => x.source === "cession").map((x) => x.texte);
    expect(deCession).toContain(HORS_MODELE_CESSION.fraisDeCessionComposes);
    expect(deCession).toContain(HORS_MODELE_CESSION.commissionALaChargeDuVendeur);
  });

  it("la réserve sur la commission tombe quand il n'y a pas de commission", () => {
    const r = chiffrerCession(
      { vente: { ...vente, commissionAgencePct: 0 }, regime: imposable() },
      P,
    );
    expect(r.reserves.map((x) => x.texte)).not.toContain(
      HORS_MODELE_CESSION.commissionALaChargeDuVendeur,
    );
  });

  it("celle de `vente.ts` remonte quand le délai normal de vente est dépassé", () => {
    const r = chiffrerCession(
      { vente, regime: { nature: "residence-principale", moisDepuisDemenagement: 24 } },
      P,
    );
    const deVente = r.reserves.filter((x) => x.source === "vente");
    expect(deVente).toHaveLength(1);
    // Rendue mot pour mot telle que `vente.ts` l'a rédigée.
    expect(deVente[0]?.texte).toBe(r.produitDeVente.exoneration.reserve);
    expect(r.produitDeVente.exoneration.acquise).toBe(false);
    // Et l'assemblage dit qu'il ne bascule pas de régime à la place de l'appelant.
    expect(r.reserves.map((x) => x.texte)).toContain(HORS_MODELE_CESSION.exonerationNonAcquise);
    expect(r.plusValue).toBeNull();
  });

  it("la résidence principale occupée ne porte que la réserve de fait", () => {
    const r = chiffrerCession({ vente, regime: { nature: "residence-principale" } }, P);
    expect(r.reserves).toStrictEqual([
      { source: "cession", texte: HORS_MODELE_CESSION.residencePrincipaleNonVerifiee },
    ]);
  });

  it("le taux réduit EEE/Suisse traîne ses deux réserves jusqu'ici", () => {
    const r = chiffrerCession(
      { vente, regime: imposable({ regimeSocial: "affilie-eee-suisse" }) },
      P,
    );
    const textes = r.reserves.map((x) => x.texte);
    expect(textes).toContain(HORS_MODELE.nonResidents);
    expect(textes).toContain(HORS_MODELE.affiliationVerifiee);
    expect(r.plusValue?.taux.prelevementsSociauxPct).toBe(P.socialLevies.eeaReducedPct);
  });

  it("aucune cession ne sort sans réserve", () => {
    for (const regime of [
      { nature: "residence-principale" } as const,
      imposable(),
      imposable({ natureDuBien: "terrain-a-batir" }),
    ]) {
      const r = chiffrerCession({ vente, regime }, P);
      expect(r.reserves.length).toBeGreaterThan(0);
      for (const x of r.reserves) {
        expect(["vente", "plus-value", "cession"]).toContain(x.source);
        expect(x.texte.trim().length).toBeGreaterThan(60);
      }
    }
  });
});

/* ══ INVARIANTS ═════════════════════════════════════════════════════════════ */

const montantBien = fc.integer({ min: 0, max: 3_000_000_00 });
const capital = fc.integer({ min: 0, max: 1_000_000_00 });
const pctCommission = fc.double({ min: 0, max: 15, noNaN: true, noDefaultInfinity: true });
const pctTaux = fc.double({ min: 0, max: 12, noNaN: true, noDefaultInfinity: true });
const pctAppreciation = fc.double({ min: -8, max: 12, noNaN: true, noDefaultInfinity: true });
const horizon = fc.integer({ min: 0, max: 480 });

const garantie: fc.Arbitrary<GuaranteeCost> = fc.oneof(
  fc.integer({ min: 0, max: 10_000_00 }).map((m) => HYPOTHEQUE(m)),
  fc.integer({ min: 0, max: 5_000_00 }).map((r) => CAUTION(r)),
);

const venteQuelconque: fc.Arbitrary<Omit<EntreeVente, "regimePlusValue">> = fc
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

/**
 * Régime imposable aléatoire, majorations **au réel** : le forfait travaux lève
 * en deçà de soixante et un mois, et un tirage qui lève ne dit rien de ce qu'on
 * cherche à éprouver ici. Le refus a ses propres cas, plus haut.
 */
const regimeImposable: fc.Arbitrary<RegimeDeCession> = fc
  .record({
    natureDuBien: fc.constantFrom("immeuble-bati", "immeuble-non-bati", "terrain-a-batir" as const),
    regimeSocial: fc.constantFrom("affilie-france", "affilie-eee-suisse" as const),
    frais: fc.integer({ min: 0, max: 50_000_00 }),
    travaux: fc.integer({ min: 0, max: 100_000_00 }),
  })
  .map(
    ({ natureDuBien, regimeSocial, frais, travaux }) =>
      imposable({
        natureDuBien,
        regimeSocial,
        fraisAcquisition: { mode: "reel", montant: frais },
        travaux: { mode: "reel", montant: travaux },
      }) as RegimeDeCession,
  );

const autresFrais = fc.integer({ min: 0, max: 20_000_00 });

/** Horizon réel quelconque : négatif, fractionnaire, énorme. C'est l'entrée qui sépare. */
const horizonHostile = fc.double({ min: -60, max: 600, noNaN: true, noDefaultInfinity: true });

describe("invariants de l'assemblage", () => {
  it("l'exonéré et l'imposable ne diffèrent QUE de l'impôt", () => {
    // L'invariant du ticket. Il dit deux choses : le produit net s'écarte du
    // montant exact de l'impôt, ET aucun autre poste ne bouge. La seconde
    // moitié est la plus importante : elle prouve que l'impôt ne rétroagit pas
    // sur son assiette, ce qui rendrait le décompte invérifiable.
    fc.assert(
      fc.property(venteQuelconque, regimeImposable, autresFrais, (vente, regime, autres) => {
        const exonere = chiffrerCession(
          { vente, regime: { nature: "residence-principale" }, autresFraisDeCession: autres },
          P,
        );
        const impose = chiffrerCession({ vente, regime, autresFraisDeCession: autres }, P);
        const impot = impose.plusValue?.total ?? 0;

        expect(impose.produitDeVente.produitNet).toBe(
          exonere.produitDeVente.produitNet - impot,
        );
        expect(impose.produitDeVente.postes.impotPlusValue).toBe(impot);
        // Les six autres postes, à l'identique.
        expect({ ...impose.produitDeVente.postes, impotPlusValue: 0 }).toStrictEqual({
          ...exonere.produitDeVente.postes,
          impotPlusValue: 0,
        });
        expect(impose.produitDeVente.valeurAppreciee).toBe(exonere.produitDeVente.valeurAppreciee);
        expect(impose.produitDeVente.detailIndemnite).toStrictEqual(
          exonere.produitDeVente.detailIndemnite,
        );
        expect(impose.grandeurs).toStrictEqual(exonere.grandeurs);
      }),
      { numRuns: 300 },
    );
  });

  it("les grandeurs partagées coïncident sur chaque tirage, horizon hostile compris", () => {
    // L'horizon tiré ici est un réel quelconque, négatif et fractionnaire
    // compris : c'est le seul endroit où la normalisation de `produitDeVente`
    // et celle de la situation fiscale peuvent se séparer. Le tirage entier de
    // `venteQuelconque` ne le verrait pas, les deux normalisations étant alors
    // l'identité.
    fc.assert(
      fc.property(venteQuelconque, regimeImposable, autresFrais, horizonHostile, (v, regime, autres, h) => {
        const vente = { ...v, horizonMois: h };
        const r = chiffrerCession({ vente, regime, autresFraisDeCession: autres }, P);
        expect(r.produitDeVente.horizonMois).toBe(Math.max(0, Math.floor(h)));
        const g = r.grandeurs;

        expect(g.dureeDetentionMois).toBe(r.produitDeVente.horizonMois);
        expect(r.situation?.dureeDetentionMois).toBe(r.produitDeVente.horizonMois);
        expect(g.prixAcquisition).toBe(r.produitDeVente.valeurInitiale);
        expect(g.prixDeCession).toBe(r.produitDeVente.postes.prixDeCession);
        // Le prix d'acquisition avant majorations, tel que l'impôt l'a retenu.
        expect(
          r.plusValue!.assiette.prixAcquisitionMajore -
            r.plusValue!.assiette.majorationFraisAcquisition -
            r.plusValue!.assiette.majorationTravaux,
        ).toBe(g.prixAcquisition);
      }),
      { numRuns: 300 },
    );
  });

  it("les frais déduits SONT les postes du décompte, jamais une seconde version", () => {
    fc.assert(
      fc.property(venteQuelconque, regimeImposable, autresFrais, (vente, regime, autres) => {
        const r = chiffrerCession({ vente, regime, autresFraisDeCession: autres }, P);
        const f = r.fraisDeCession!;
        expect(f.commissionAgence).toBe(r.produitDeVente.postes.commissionAgence);
        expect(f.mainlevee).toBe(r.produitDeVente.postes.mainlevee);
        expect(f.autres).toBe(autres);
        expect(f.total).toBe(f.commissionAgence + f.mainlevee + f.autres);
        expect(r.plusValue?.assiette.prixDeCessionNet).toBe(r.grandeurs.prixDeCession - f.total);
        // L'indemnité sort du produit du vendeur sans réduire son impôt.
        expect(f.total).toBe(
          r.produitDeVente.postes.commissionAgence + r.produitDeVente.postes.mainlevee + autres,
        );
      }),
      { numRuns: 300 },
    );
  });

  it("le décompte reste la somme algébrique de ses postes, impôt compris", () => {
    fc.assert(
      fc.property(venteQuelconque, regimeImposable, autresFrais, (vente, regime, autres) => {
        const r = chiffrerCession({ vente, regime, autresFraisDeCession: autres }, P);
        const x = r.produitDeVente.postes;
        expect(r.produitDeVente.produitNet).toBe(
          x.prixDeCession -
            x.commissionAgence -
            x.capitalRestantDu -
            x.indemniteRemboursementAnticipe -
            x.mainlevee +
            x.restitutionFondsGarantie -
            x.impotPlusValue,
        );
        for (const [nom, montant] of Object.entries(x)) {
          expect(Number.isInteger(montant), `${nom} n'est pas un entier de centimes`).toBe(true);
          expect(montant, `${nom} est négatif`).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("aucune réserve ne se perd entre les deux modules et la sortie", () => {
    fc.assert(
      fc.property(venteQuelconque, regimeImposable, (vente, regime) => {
        const r = chiffrerCession({ vente, regime }, P);
        for (const texte of r.plusValue?.nonModelise ?? []) {
          expect(r.reserves.some((x) => x.source === "plus-value" && x.texte === texte)).toBe(true);
        }
        expect(r.reserves.filter((x) => x.source === "plus-value")).toHaveLength(
          r.plusValue?.nonModelise.length ?? 0,
        );
      }),
      { numRuns: 200 },
    );
  });

  it("la fonction est pure : deux appels identiques rendent la même cession", () => {
    fc.assert(
      fc.property(venteQuelconque, regimeImposable, autresFrais, (vente, regime, autres) => {
        const e: EntreeCession = { vente, regime, autresFraisDeCession: autres };
        expect(chiffrerCession(e, P)).toStrictEqual(chiffrerCession(e, P));
      }),
      { numRuns: 200 },
    );
  });
});
