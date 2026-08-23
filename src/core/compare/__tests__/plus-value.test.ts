/**
 * PLUS-VALUE IMMOBILIÈRE HORS RÉSIDENCE PRINCIPALE — `ENG-014` et `ENG-016`
 *
 * Deux familles, comme ailleurs dans ce répertoire, et elles ne se remplacent pas.
 *
 * **Cas de référence** : le calcul est écrit en commentaire au-dessus de
 * l'attente, refaisable à la main. Ils attrapent une formule fausse — un barème
 * appliqué à la mauvaise assiette reste parfaitement monotone et parfaitement
 * décroissant avec la durée.
 *
 * **Invariants sous `fast-check`** : ce qui doit tenir sur n'importe quelle
 * entrée. Le plus important est l'écart des deux barèmes : l'assiette sociale
 * doit rester supérieure ou égale à l'assiette fiscale à toute durée, et
 * strictement supérieure entre la 6e et la 30e année. C'est ce qui rougit le jour
 * où quelqu'un « factorise » les deux abattements en un seul.
 *
 * La continuité de la surtaxe est éprouvée ici sur la fonction de production, et
 * pas seulement sur la donnée : `params-plus-value.test.ts` garde le barème,
 * celui-ci garde sa lecture.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { euros } from "../../money";
import { PARAMS_2026 } from "../../fiscal/params";
import {
  ForfaitHorsChampError,
  HORS_MODELE,
  abattementPourDureeDetentionPct,
  anneesRevolues,
  calculerPlusValue,
  fraisAcquisitionForfaitaires,
  fraisAcquisitionReels,
  motifExclusionForfaitFraisAcquisition,
  motifExclusionForfaitTravaux,
  surtaxeSurPlusValue,
  tauxPrelevementsSociauxPct,
  travauxForfaitaires,
  travauxReels,
  type EntreePlusValue,
  type NatureDuBien,
  type RegimeSocialDuCedant,
  type SituationDuCedant,
} from "../plus-value";

const pv = PARAMS_2026.realEstateCapitalGains;

/** Un bien bâti détenu par une personne physique, la configuration ordinaire. */
const batiPhysique = (dureeDetentionMois: number): SituationDuCedant => ({
  nature: "immeuble-bati",
  qualiteDuCedant: "personne-physique",
  dureeDetentionMois,
});

/**
 * Cession sans aucune majoration : la plus-value brute vaut exactement
 * `prixDeCession − prixAcquisition`. Sert à isoler les abattements et les taux.
 */
function cessionNue(options: {
  prixAcquisition: number;
  prixDeCession: number;
  dureeDetentionMois: number;
  regimeSocial?: RegimeSocialDuCedant;
  nature?: NatureDuBien;
}): EntreePlusValue {
  return {
    nature: options.nature ?? "immeuble-bati",
    qualiteDuCedant: "personne-physique",
    dureeDetentionMois: options.dureeDetentionMois,
    prixDeCession: options.prixDeCession,
    prixAcquisition: options.prixAcquisition,
    fraisAcquisition: fraisAcquisitionReels(0),
    travaux: travauxReels(0),
    regimeSocial: options.regimeSocial ?? "affilie-france",
  };
}

/* ══ 1. Cas de référence ═══════════════════════════════════════════════════ */

describe("cas de référence — une cession ordinaire avec les deux forfaits", () => {
  it("chiffre l'assiette, les deux abattements et les trois impositions", () => {
    // Bien bâti acheté 200 000 €, revendu 300 000 €, 5 000 € de frais de cession,
    // détenu 100 mois — soit 8 années révolues, et plus de cinq ans, donc les
    // deux forfaits sont ouverts.
    //
    //   forfait frais    7,5 % × 200 000 =  15 000 €
    //   forfait travaux   15 % × 200 000 =  30 000 €
    //   prix majoré      200 000 + 15 000 + 30 000 = 245 000 €
    //   cession nette    300 000 − 5 000            = 295 000 €
    //   PV brute         295 000 − 245 000          =  50 000 €
    //
    //   abattement IR    3 années au-delà de la 5e × 6 %    = 18 %  →  9 000 €
    //   base IR          50 000 − 9 000                             = 41 000 €
    //   abattement PS    3 années × 1,65 %                  = 4,95 % → 2 475 €
    //   base PS          50 000 − 2 475                             = 47 525 €
    //
    //   IR         19 %   × 41 000  = 7 790,00 €
    //   PS         17,2 % × 47 525  = 8 174,30 €
    //   surtaxe    base IR ≤ 50 000 → 0
    //   total                        15 964,30 €
    const situation = batiPhysique(100);
    const r = calculerPlusValue({
      ...situation,
      prixDeCession: euros(300_000),
      fraisDeCession: euros(5_000),
      prixAcquisition: euros(200_000),
      fraisAcquisition: fraisAcquisitionForfaitaires(situation),
      travaux: travauxForfaitaires(situation),
      regimeSocial: "affilie-france",
    });

    expect(r.assiette.majorationFraisAcquisition).toBe(euros(15_000));
    expect(r.assiette.majorationTravaux).toBe(euros(30_000));
    expect(r.assiette.prixAcquisitionMajore).toBe(euros(245_000));
    expect(r.assiette.prixDeCessionNet).toBe(euros(295_000));
    expect(r.assiette.plusValueBrute).toBe(euros(50_000));

    expect(r.abattementImpotRevenu.anneesDetention).toBe(8);
    expect(r.abattementImpotRevenu.tauxPct).toBe(18);
    expect(r.abattementPrelevementsSociaux.tauxPct).toBe(4.95);

    expect(r.baseImpotRevenu).toBe(euros(41_000));
    expect(r.basePrelevementsSociaux).toBe(euros(47_525));

    expect(r.impotRevenu).toBe(euros(7_790));
    expect(r.prelevementsSociaux).toBe(euros(8_174.3));
    expect(r.surtaxe).toBe(0);
    expect(r.total).toBe(euros(15_964.3));
    expect(r.moinsValue).toBe(false);
  });
});

describe("cas de référence — les deux durées d'exonération, qui ne coïncident pas", () => {
  // Le fait le plus contre-intuitif du dispositif, et la raison d'être des deux
  // assiettes. Un bien acheté 100 000 € et revendu 200 000 €, sans frais ni
  // travaux : plus-value brute de 100 000 € dans les trois cas ci-dessous.

  it("à 22 ans, l'impôt sur le revenu est éteint et les prélèvements sociaux ne le sont pas", () => {
    //   abattement IR    100 %  →  base 0        →  IR = 0
    //   abattement PS     28 %  →  base 72 000 €  →  PS = 17,2 % × 72 000 = 12 384 €
    const r = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 22 * 12 }),
    );
    expect(r.abattementImpotRevenu.tauxPct).toBe(100);
    expect(r.abattementImpotRevenu.exonerationTotale).toBe(true);
    expect(r.abattementPrelevementsSociaux.tauxPct).toBe(28);
    expect(r.abattementPrelevementsSociaux.exonerationTotale).toBe(false);

    expect(r.baseImpotRevenu).toBe(0);
    expect(r.basePrelevementsSociaux).toBe(euros(72_000));
    expect(r.impotRevenu).toBe(0);
    expect(r.prelevementsSociaux).toBe(euros(12_384));
    expect(r.surtaxe).toBe(0);
    expect(r.total).toBe(euros(12_384));
  });

  it("à 29 ans, il reste 9 % de plus-value sociale imposable", () => {
    //   abattement PS = 28 % + 7 années × 9 % = 91 %
    //   base PS = 9 000 €  →  PS = 17,2 % × 9 000 = 1 548 €
    const r = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 29 * 12 }),
    );
    expect(r.abattementPrelevementsSociaux.tauxPct).toBe(91);
    expect(r.basePrelevementsSociaux).toBe(euros(9_000));
    expect(r.total).toBe(euros(1_548));
  });

  it("à 30 ans, plus rien n'est dû", () => {
    const r = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 30 * 12 }),
    );
    expect(r.abattementImpotRevenu.exonerationTotale).toBe(true);
    expect(r.abattementPrelevementsSociaux.exonerationTotale).toBe(true);
    expect(r.baseImpotRevenu).toBe(0);
    expect(r.basePrelevementsSociaux).toBe(0);
    expect(r.total).toBe(0);
  });

  it("les deux exonérations totales tombent bien à des durées DIFFÉRENTES", () => {
    // Le jour où quelqu'un applique un seul barème aux deux impositions, ce test
    // rougit, et il est le seul à voir la différence entre la 22e et la 30e année.
    const a22 = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 22 * 12 }),
    );
    expect(a22.abattementImpotRevenu.anneeExonerationTotale).toBe(22);
    expect(a22.abattementPrelevementsSociaux.anneeExonerationTotale).toBe(30);
    expect(a22.basePrelevementsSociaux).toBeGreaterThan(a22.baseImpotRevenu);

    for (const annees of [23, 25, 28, 29]) {
      const r = calculerPlusValue(
        cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: annees * 12 }),
      );
      expect(r.impotRevenu, `impôt sur le revenu non éteint à ${annees} ans`).toBe(0);
      expect(r.prelevementsSociaux, `prélèvements sociaux éteints trop tôt, à ${annees} ans`).toBeGreaterThan(0);
    }
  });
});

describe("cas de référence — surtaxe sur les plus-values élevées", () => {
  it("applique le taux à la totalité de l'assiette, sans décote sur une tranche large", () => {
    // Détention nulle : aucun abattement, base IR = plus-value brute = 100 000 €.
    // Tranche 60 001 – 100 000 €, taux 2 %, pas de décote.
    //   surtaxe = 2 % × 100 000 = 2 000 €
    //   IR      = 19 %   × 100 000 = 19 000 €
    //   PS      = 17,2 % × 100 000 = 17 200 €
    //   total   = 38 200 €
    const r = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 0 }),
    );
    expect(r.baseImpotRevenu).toBe(euros(100_000));
    expect(r.surtaxe).toBe(euros(2_000));
    expect(r.impotRevenu).toBe(euros(19_000));
    expect(r.prelevementsSociaux).toBe(euros(17_200));
    expect(r.total).toBe(euros(38_200));
  });

  it("retranche la décote de lissage sur une tranche étroite", () => {
    // Base IR de 155 000 €, tranche 150 001 – 160 000 €, taux 4 %, coefficient 15/100.
    //   surtaxe = 4 % × 155 000 − 0,15 × (160 000 − 155 000)
    //           = 6 200 − 750 = 5 450 €
    expect(surtaxeSurPlusValue(euros(155_000))).toBe(euros(5_450));
  });

  it("n'est pas due à 50 000 € et l'est juste au-dessus", () => {
    expect(surtaxeSurPlusValue(euros(50_000))).toBe(0);
    expect(surtaxeSurPlusValue(euros(49_999))).toBe(0);
    // 2 % × 50 001 − (60 000 − 50 001)/20 = 1 000,02 − 499,95 = 500,07 €
    expect(surtaxeSurPlusValue(euros(50_001))).toBe(euros(500.07));
  });

  it("est CONTINUE à chaque changement de taux, à moins d'un euro près", () => {
    // Le taux frappant la totalité de l'assiette, un passage de 2 % à 3 % à
    // 100 000 € coûterait 1 000 € pour un euro de plus si la décote était mal
    // appliquée. C'est le seul test qui verrait un coefficient lu de travers.
    const frontieres = [60_000, 100_000, 110_000, 150_000, 160_000, 200_000, 210_000, 250_000, 260_000];
    for (const bas of frontieres) {
      const avant = surtaxeSurPlusValue(euros(bas));
      const apres = surtaxeSurPlusValue(euros(bas + 1));
      expect(
        Math.abs(apres - avant),
        `saut de surtaxe à ${bas} € : ${avant / 100} € puis ${apres / 100} €`,
      ).toBeLessThan(euros(1));
    }
  });

  it("garde la seule discontinuité voulue, celle du seuil d'entrée", () => {
    // Elle est dans le texte : la décote de la première tranche vaut 1/20 là où
    // la continuité aurait demandé 1/10. On la constate, on ne la corrige pas.
    expect(surtaxeSurPlusValue(euros(50_000))).toBe(0);
    expect(surtaxeSurPlusValue(euros(50_001))).toBeGreaterThan(euros(400));
  });

  it("couvre les centimes entre le seuil et la première tranche — `ENG-027`", () => {
    // Le seuil vise les plus-values « supérieur[es] à 50 000 € » et le tableau
    // ouvre à « 50 001 € ». Entre les deux, 99 centimes que le barème ne nomme
    // pas : la recherche par borne basse n'y trouvait aucune tranche et levait
    // `RangeError`, alors que la loi taxe. Le cas ne se rencontrait pas tant
    // que les assiettes étaient saisies en euros ronds ; il devient ordinaire
    // dès qu'un prix de cession est dérivé d'une valeur appréciée.
    for (let c = 1; c <= 99; c++) {
      const assiette = euros(50_000) + c;
      expect(() => surtaxeSurPlusValue(assiette), `assiette 50 000 € + ${c} c`).not.toThrow();
      // Elle reste dans la tranche à 2 % et donc voisine des 500 € du seuil.
      expect(surtaxeSurPlusValue(assiette)).toBeGreaterThan(euros(499));
      expect(surtaxeSurPlusValue(assiette)).toBeLessThan(euros(501));
    }
  });

  it("ne frappe pas un terrain à bâtir", () => {
    const commun = { prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 0 };
    const bati = calculerPlusValue(cessionNue({ ...commun, nature: "immeuble-bati" }));
    const terrain = calculerPlusValue(cessionNue({ ...commun, nature: "terrain-a-batir" }));

    expect(bati.surtaxe).toBe(euros(2_000));
    expect(terrain.surtaxe).toBe(0);
    expect(terrain.surtaxeApplicable).toBe(false);
    expect(terrain.nonModelise).toContain(HORS_MODELE.surtaxeTerrain);
    expect(terrain.total).toBe(bati.total - euros(2_000));
  });
});

/* ══ 2. `ENG-016` — le taux dépend du régime d'affiliation ═════════════════ */

describe("`ENG-016` — régime de sécurité sociale du cédant", () => {
  it("le taux réduit EEE/Suisse est strictement inférieur au taux plein", () => {
    expect(tauxPrelevementsSociauxPct("affilie-eee-suisse")).toBeLessThan(
      tauxPrelevementsSociauxPct("affilie-france"),
    );
    expect(tauxPrelevementsSociauxPct("affilie-france")).toBe(PARAMS_2026.socialLevies.realEstate.totalPct);
    expect(tauxPrelevementsSociauxPct("affilie-eee-suisse")).toBe(PARAMS_2026.socialLevies.eeaReducedPct);
  });

  it("chiffre l'écart sur une même cession", () => {
    // Base PS de 72 000 € à 22 ans de détention.
    //   affilié France      17,2 % × 72 000 = 12 384 €
    //   affilié EEE/Suisse   7,5 % × 72 000 =  5 400 €
    const commun = { prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 22 * 12 };
    const france = calculerPlusValue(cessionNue({ ...commun, regimeSocial: "affilie-france" }));
    const eee = calculerPlusValue(cessionNue({ ...commun, regimeSocial: "affilie-eee-suisse" }));

    expect(france.prelevementsSociaux).toBe(euros(12_384));
    expect(eee.prelevementsSociaux).toBe(euros(5_400));
    // Les assiettes sont identiques : seul le taux change.
    expect(eee.basePrelevementsSociaux).toBe(france.basePrelevementsSociaux);
    expect(eee.impotRevenu).toBe(france.impotRevenu);
  });

  it("dit ce qu'il ne modélise pas dès que le taux réduit est retenu", () => {
    // La spécification dit que le point « doit être vérifié cas par cas ». Le
    // module applique une règle explicite ET porte sa réserve dans sa sortie,
    // plutôt que de laisser croire à une exhaustivité qu'il n'a pas.
    const eee = calculerPlusValue(
      cessionNue({
        prixAcquisition: euros(100_000),
        prixDeCession: euros(200_000),
        dureeDetentionMois: 120,
        regimeSocial: "affilie-eee-suisse",
      }),
    );
    expect(eee.nonModelise).toContain(HORS_MODELE.nonResidents);
    expect(eee.nonModelise).toContain(HORS_MODELE.affiliationVerifiee);
  });

  it("porte toujours ses réserves, quel que soit le régime", () => {
    const r = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 120 }),
    );
    expect(r.nonModelise.length).toBeGreaterThan(0);
    expect(r.nonModelise).toContain(HORS_MODELE.residencePrincipale);
    expect(r.nonModelise).toContain(HORS_MODELE.amortissementsLmnp);
    expect(r.nonModelise).toContain(HORS_MODELE.abattementExceptionnel);
  });
});

/* ══ 3. Les forfaits ne s'appliquent pas hors de leur champ ════════════════ */

describe("forfaits de majoration — le champ d'application est gardé", () => {
  it("le forfait travaux est fermé à un bien non bâti", () => {
    for (const nature of ["terrain-a-batir", "immeuble-non-bati"] as const) {
      const situation: SituationDuCedant = { nature, qualiteDuCedant: "personne-physique", dureeDetentionMois: 240 };
      expect(motifExclusionForfaitTravaux(situation)).toMatch(/immeubles bâtis/);
      expect(() => travauxForfaitaires(situation)).toThrow(ForfaitHorsChampError);
    }
  });

  it("le forfait travaux est fermé à une détention de cinq ans tout juste", () => {
    // « plus de cinq ans » : soixante mois exactement ne suffisent pas. C'est la
    // raison pour laquelle la durée entre en MOIS et non en années révolues —
    // 60 et 71 mois valent tous deux 5 années révolues et n'ouvrent pas les
    // mêmes droits.
    expect(motifExclusionForfaitTravaux(batiPhysique(60))).toMatch(/plus de 5 ans/);
    expect(() => travauxForfaitaires(batiPhysique(60))).toThrow(ForfaitHorsChampError);
    expect(motifExclusionForfaitTravaux(batiPhysique(61))).toBeNull();
    expect(() => travauxForfaitaires(batiPhysique(61))).not.toThrow();
    expect(anneesRevolues(60)).toBe(anneesRevolues(71));
  });

  it("le forfait de frais est fermé à un fonds de placement immobilier", () => {
    const fonds: SituationDuCedant = {
      nature: "immeuble-bati",
      qualiteDuCedant: "fonds-de-placement-immobilier",
      dureeDetentionMois: 240,
    };
    expect(motifExclusionForfaitFraisAcquisition(fonds)).toMatch(/fonds de placement immobilier/);
    expect(() => fraisAcquisitionForfaitaires(fonds)).toThrow(ForfaitHorsChampError);
    // Le forfait travaux, lui, n'est pas fermé par la qualité du détenteur.
    expect(() => travauxForfaitaires(fonds)).not.toThrow();
  });

  it("un jeton obtenu sur une AUTRE situation ne passe pas le calcul", () => {
    // Le second verrou. Le jeton atteste qu'un forfait a été ouvert pour une
    // situation ; il n'atteste pas que c'est celle du calcul. Sans ce contrôle,
    // il suffirait d'ouvrir le forfait sur un bien bâti détenu vingt ans pour
    // majorer de 15 % un terrain détenu deux ans.
    const jetonLegitime = travauxForfaitaires(batiPhysique(240));

    expect(() =>
      calculerPlusValue({
        nature: "terrain-a-batir",
        qualiteDuCedant: "personne-physique",
        dureeDetentionMois: 240,
        prixDeCession: euros(200_000),
        prixAcquisition: euros(100_000),
        fraisAcquisition: fraisAcquisitionReels(0),
        travaux: jetonLegitime,
        regimeSocial: "affilie-france",
      }),
    ).toThrow(ForfaitHorsChampError);

    expect(() =>
      calculerPlusValue({
        ...batiPhysique(24),
        prixDeCession: euros(200_000),
        prixAcquisition: euros(100_000),
        fraisAcquisition: fraisAcquisitionReels(0),
        travaux: jetonLegitime,
        regimeSocial: "affilie-france",
      }),
    ).toThrow(ForfaitHorsChampError);

    const jetonFrais = fraisAcquisitionForfaitaires(batiPhysique(240));
    expect(() =>
      calculerPlusValue({
        nature: "immeuble-bati",
        qualiteDuCedant: "fonds-de-placement-immobilier",
        dureeDetentionMois: 240,
        prixDeCession: euros(200_000),
        prixAcquisition: euros(100_000),
        fraisAcquisition: jetonFrais,
        travaux: travauxReels(0),
        regimeSocial: "affilie-france",
      }),
    ).toThrow(ForfaitHorsChampError);
  });

  it("le forfait est bien appliqué quand il est dans son champ", () => {
    const situation = batiPhysique(61);
    const r = calculerPlusValue({
      ...situation,
      prixDeCession: euros(400_000),
      prixAcquisition: euros(200_000),
      fraisAcquisition: fraisAcquisitionForfaitaires(situation),
      travaux: travauxForfaitaires(situation),
      regimeSocial: "affilie-france",
    });
    expect(r.assiette.majorationFraisAcquisition).toBe(euros(15_000));
    expect(r.assiette.majorationTravaux).toBe(euros(30_000));
  });
});

/* ══ 4. Cas limites ════════════════════════════════════════════════════════ */

describe("cas limites", () => {
  it("une moins-value n'est pas imposée, et ne s'impute sur rien", () => {
    const r = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(200_000), prixDeCession: euros(150_000), dureeDetentionMois: 120 }),
    );
    expect(r.assiette.plusValueBrute).toBe(euros(-50_000));
    expect(r.moinsValue).toBe(true);
    expect(r.baseImpotRevenu).toBe(0);
    expect(r.basePrelevementsSociaux).toBe(0);
    expect(r.impotRevenu).toBe(0);
    expect(r.prelevementsSociaux).toBe(0);
    expect(r.surtaxe).toBe(0);
    expect(r.total).toBe(0);
    expect(r.nonModelise).toContain(HORS_MODELE.moinsValueNonImputable);
  });

  it("une plus-value exactement nulle est une moins-value au sens du résultat", () => {
    const r = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(200_000), prixDeCession: euros(200_000), dureeDetentionMois: 120 }),
    );
    expect(r.assiette.plusValueBrute).toBe(0);
    expect(r.moinsValue).toBe(true);
    expect(r.total).toBe(0);
  });

  it("une durée de détention nulle n'ouvre aucun abattement", () => {
    const r = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(130_000), dureeDetentionMois: 0 }),
    );
    expect(r.abattementImpotRevenu.anneesDetention).toBe(0);
    expect(r.abattementImpotRevenu.tauxPct).toBe(0);
    expect(r.abattementPrelevementsSociaux.tauxPct).toBe(0);
    expect(r.baseImpotRevenu).toBe(euros(30_000));
    expect(r.basePrelevementsSociaux).toBe(euros(30_000));
  });

  it("les cinq premières années entières n'ouvrent rien non plus", () => {
    for (let mois = 0; mois <= 71; mois += 1) {
      expect(abattementPourDureeDetentionPct(pv.incomeTaxAllowance, anneesRevolues(mois))).toBe(0);
      expect(abattementPourDureeDetentionPct(pv.socialLevyAllowance, anneesRevolues(mois))).toBe(0);
    }
    expect(abattementPourDureeDetentionPct(pv.incomeTaxAllowance, anneesRevolues(72))).toBe(6);
  });

  it("refuse une entrée hors domaine plutôt que de rendre un chiffre faux", () => {
    const base = { prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 120 };
    expect(() => calculerPlusValue({ ...cessionNue(base), prixDeCession: -1 })).toThrow(RangeError);
    expect(() => calculerPlusValue({ ...cessionNue(base), dureeDetentionMois: -12 })).toThrow(RangeError);
    expect(() => calculerPlusValue({ ...cessionNue(base), dureeDetentionMois: 12.5 })).toThrow(RangeError);
    expect(() => fraisAcquisitionReels(-1)).toThrow(RangeError);
    expect(() => travauxReels(1.5)).toThrow(RangeError);
  });

  it("les frais de cession viennent en diminution du prix de cession", () => {
    const sans = calculerPlusValue(
      cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 0 }),
    );
    const avec = calculerPlusValue({
      ...cessionNue({ prixAcquisition: euros(100_000), prixDeCession: euros(200_000), dureeDetentionMois: 0 }),
      fraisDeCession: euros(10_000),
    });
    expect(avec.assiette.plusValueBrute).toBe(sans.assiette.plusValueBrute - euros(10_000));
  });
});

/* ══ 5. Invariants sous `fast-check` ═══════════════════════════════════════ */

const montant = fc.integer({ min: 0, max: 2_000_000_00 });
const dureeMois = fc.integer({ min: 0, max: 50 * 12 });
const regime = fc.constantFrom<RegimeSocialDuCedant>("affilie-france", "affilie-eee-suisse");
const nature = fc.constantFrom<NatureDuBien>("immeuble-bati", "immeuble-non-bati", "terrain-a-batir");

const entreeQuelconque = fc
  .record({
    prixAcquisition: montant,
    prixDeCession: montant,
    fraisDeCession: montant,
    dureeDetentionMois: dureeMois,
    regimeSocial: regime,
    nature,
  })
  .map(
    (x): EntreePlusValue => ({
      nature: x.nature,
      qualiteDuCedant: "personne-physique",
      dureeDetentionMois: x.dureeDetentionMois,
      prixDeCession: x.prixDeCession,
      // Les frais de cession sont bornés au prix : au-delà, la saisie est absurde
      // et ce n'est pas au moteur d'en décider.
      fraisDeCession: Math.min(x.fraisDeCession, x.prixDeCession),
      prixAcquisition: x.prixAcquisition,
      fraisAcquisition: fraisAcquisitionReels(0),
      travaux: travauxReels(0),
      regimeSocial: x.regimeSocial,
    }),
  );

describe("invariants", () => {
  it("chaque abattement se recompose exactement : montant + base = plus-value", () => {
    fc.assert(
      fc.property(entreeQuelconque, (entree) => {
        const r = calculerPlusValue(entree);
        const brute = Math.max(0, r.assiette.plusValueBrute);
        expect(r.abattementImpotRevenu.montant + r.abattementImpotRevenu.base).toBe(brute);
        expect(
          r.abattementPrelevementsSociaux.montant + r.abattementPrelevementsSociaux.base,
        ).toBe(brute);
      }),
      { numRuns: 400 },
    );
  });

  it("l'assiette sociale reste supérieure ou égale à l'assiette fiscale, toujours", () => {
    // L'abattement social est plus lent à toute durée, donc l'assiette sociale est
    // plus large. Ce test rougit le jour où un seul barème sert aux deux.
    fc.assert(
      fc.property(entreeQuelconque, (entree) => {
        const r = calculerPlusValue(entree);
        expect(r.basePrelevementsSociaux).toBeGreaterThanOrEqual(r.baseImpotRevenu);
        expect(r.abattementPrelevementsSociaux.tauxPct).toBeLessThanOrEqual(
          r.abattementImpotRevenu.tauxPct,
        );
      }),
      { numRuns: 400 },
    );
  });

  it("les deux assiettes divergent STRICTEMENT entre la 6e et la 29e année", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 29 }),
        fc.integer({ min: 1_000_00, max: 2_000_000_00 }),
        (annees, gain) => {
          const r = calculerPlusValue(
            cessionNue({
              prixAcquisition: euros(100_000),
              prixDeCession: euros(100_000) + gain,
              dureeDetentionMois: annees * 12,
            }),
          );
          expect(r.basePrelevementsSociaux).toBeGreaterThan(r.baseImpotRevenu);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("l'imposition totale ne dépasse jamais la plus-value, et n'est jamais négative", () => {
    // Plafond théorique : 19 % + 17,2 % + 6 % = 42,2 %. Un dépassement signalerait
    // une assiette employée deux fois ou un taux appliqué à la mauvaise base.
    fc.assert(
      fc.property(entreeQuelconque, (entree) => {
        const r = calculerPlusValue(entree);
        expect(r.total).toBeGreaterThanOrEqual(0);
        expect(r.total).toBeLessThanOrEqual(Math.max(0, r.assiette.plusValueBrute));
        expect(r.total).toBe(r.impotRevenu + r.prelevementsSociaux + r.surtaxe);
        expect(Number.isInteger(r.total)).toBe(true);
      }),
      { numRuns: 400 },
    );
  });

  it("le taux réduit EEE/Suisse ne coûte jamais plus que le taux plein", () => {
    fc.assert(
      fc.property(entreeQuelconque, (entree) => {
        const france = calculerPlusValue({ ...entree, regimeSocial: "affilie-france" });
        const eee = calculerPlusValue({ ...entree, regimeSocial: "affilie-eee-suisse" });
        expect(eee.total).toBeLessThanOrEqual(france.total);
        if (france.basePrelevementsSociaux > euros(100)) {
          expect(eee.prelevementsSociaux).toBeLessThan(france.prelevementsSociaux);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("l'imposition ne remonte jamais quand la détention s'allonge", () => {
    fc.assert(
      fc.property(montant, montant, dureeMois, (prixAcquisition, gain, mois) => {
        const commun = { prixAcquisition, prixDeCession: prixAcquisition + gain };
        const tot = (dureeDetentionMois: number) =>
          calculerPlusValue(cessionNue({ ...commun, dureeDetentionMois })).total;
        expect(tot(mois + 12)).toBeLessThanOrEqual(tot(mois));
      }),
      { numRuns: 300 },
    );
  });

  it("au-delà de la 22e année l'impôt sur le revenu et la surtaxe sont éteints, au-delà de la 30e tout l'est", () => {
    fc.assert(
      fc.property(entreeQuelconque, fc.integer({ min: 22, max: 60 }), (entree, annees) => {
        const r = calculerPlusValue({ ...entree, dureeDetentionMois: annees * 12 });
        expect(r.impotRevenu).toBe(0);
        // La surtaxe est assise sur l'assiette de l'impôt sur le revenu : elle
        // s'éteint donc à 22 ans et non à 30. C'est le corollaire le moins
        // évident des deux barèmes.
        expect(r.surtaxe).toBe(0);
        if (annees >= 30) expect(r.total).toBe(0);
      }),
      { numRuns: 300 },
    );
  });

  it("la surtaxe croît avec l'assiette et ne dépasse jamais 6 % de celle-ci", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_00 }),
        fc.integer({ min: 0, max: 1_000_000_00 }),
        (a, b) => {
          const [bas, haut] = a <= b ? [a, b] : [b, a];
          expect(surtaxeSurPlusValue(bas)).toBeLessThanOrEqual(surtaxeSurPlusValue(haut));
          expect(surtaxeSurPlusValue(haut)).toBeLessThanOrEqual(Math.ceil(0.06 * haut));
        },
      ),
      { numRuns: 500 },
    );
  });

  it("aucun forfait ne franchit le calcul hors de son champ", () => {
    // Le jeton et l'entrée sont tirés indépendamment : à chaque tirage où les
    // conditions ne tiennent pas, le calcul doit refuser plutôt que majorer.
    fc.assert(
      fc.property(nature, dureeMois, montant, (natureCalcul, mois, prixAcquisition) => {
        const jeton = travauxForfaitaires(batiPhysique(240));
        const entree: EntreePlusValue = {
          nature: natureCalcul,
          qualiteDuCedant: "personne-physique",
          dureeDetentionMois: mois,
          prixDeCession: prixAcquisition + euros(50_000),
          prixAcquisition,
          fraisAcquisition: fraisAcquisitionReels(0),
          travaux: jeton,
          regimeSocial: "affilie-france",
        };
        const ouvert = natureCalcul === "immeuble-bati" && mois > 60;
        if (ouvert) {
          const r = calculerPlusValue(entree);
          expect(r.assiette.majorationTravaux).toBe(
            Math.round((prixAcquisition * pv.acquisitionPriceUplift.worksFlatPct) / 100),
          );
        } else {
          expect(() => calculerPlusValue(entree)).toThrow(ForfaitHorsChampError);
        }
      }),
      { numRuns: 400 },
    );
  });

  it("l'abattement d'un barème ne décroît jamais et se plafonne à 100 %", () => {
    for (const bareme of [pv.incomeTaxAllowance, pv.socialLevyAllowance]) {
      let precedent = 0;
      for (let annees = 0; annees <= 60; annees += 1) {
        const courant = abattementPourDureeDetentionPct(bareme, annees);
        expect(courant).toBeGreaterThanOrEqual(precedent);
        expect(courant).toBeLessThanOrEqual(100);
        precedent = courant;
      }
      expect(abattementPourDureeDetentionPct(bareme, bareme.fullExemptionYear)).toBe(100);
      expect(abattementPourDureeDetentionPct(bareme, bareme.fullExemptionYear - 1)).toBeLessThan(100);
    }
  });
});
