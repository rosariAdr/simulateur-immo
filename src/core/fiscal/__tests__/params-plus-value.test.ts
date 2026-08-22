import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARAMS_2026 } from "../params";
import type { HoldingPeriodAllowance, SurtaxBracket } from "../params";
import { euros } from "../../money";

/**
 * FISCALITÉ DE LA PHASE 3 — `FIS-007`
 *
 * Ces tests ne vérifient pas que les valeurs sont PRÉSENTES : un `toBe` sur chaque
 * champ ne ferait que recopier le fichier, et recopierait ses erreurs avec lui.
 * Ils vérifient ce que les valeurs doivent satisfaire entre elles.
 *
 * Deux invariants portent l'essentiel :
 *
 * 1. **Chaque barème d'abattement atteint exactement 100 % à sa durée d'exonération.**
 *    C'est ce qui attrape une cadence recopiée de travers. Les deux barèmes sont
 *    différents — 22 ans pour l'impôt sur le revenu, 30 ans pour les prélèvements
 *    sociaux — et les confondre est l'erreur classique du calcul de plus-value.
 *
 * 2. **Le barème de la surtaxe est continu à ses frontières de tranche.** Le taux y
 *    s'applique à la totalité de la plus-value, ce qui produirait des sauts de
 *    plusieurs centaines d'euros pour un euro de plus-value supplémentaire ; les
 *    décotes de lissage existent pour les effacer. Un coefficient mal recopié rouvre
 *    le saut, et rien d'autre ne le verrait.
 */

const PARAMS_SRC = readFileSync(join(process.cwd(), "src/core/fiscal/params.ts"), "utf8");

/** Le même texte, commentaires dépliés : les retours à la ligne du JSDoc coupent les
 *  références au milieu, et une référence coupée reste une référence. */
const PARAMS_DEPLIE = PARAMS_SRC.replace(/\n\s*\*\s?/g, " ").replace(/\s+/g, " ");

const pv = PARAMS_2026.realEstateCapitalGains;

// ═══════════════════════════════════════════════════════════════════════════
// Outils de lecture des barèmes. Ils vivent ici et non dans le moteur : ce
// ticket n'écrit aucun calcul de production, seulement de quoi éprouver la donnée.
// ═══════════════════════════════════════════════════════════════════════════

/** Abattement cumulé, en pourcentage, après `annees` années de détention révolues. */
function abattementCumule(bareme: HoldingPeriodAllowance, annees: number): number {
  let total = 0;
  for (const tranche of bareme.steps) {
    const debut = tranche.fromYear;
    const fin = Math.min(tranche.toYear, annees);
    if (fin >= debut) total += (fin - debut + 1) * tranche.ratePctPerYear;
  }
  // Les taux portent deux décimales ; le cumul en accumule les erreurs binaires.
  return Math.round(total * 1e6) / 1e6;
}

/** Montant de la surtaxe, en euros, pour une plus-value imposable exprimée en euros. */
function surtaxe(plusValueEuros: number): number {
  const enCentimes = euros(plusValueEuros);
  if (enCentimes <= pv.surtax.thresholdCents) return 0;
  const tranche = pv.surtax.brackets.find(
    (b: SurtaxBracket) => enCentimes >= b.fromCents && (b.toCents === null || enCentimes <= b.toCents),
  );
  if (tranche === undefined) throw new Error(`aucune tranche pour ${plusValueEuros} €`);
  const brut = (tranche.ratePct / 100) * plusValueEuros;
  const hautEuros = tranche.toCents === null ? 0 : tranche.toCents / 100;
  const decote = tranche.smoothingCoefficient * (hautEuros - plusValueEuros);
  return brut - decote;
}

// ═══════════════════════════════════════════════════════════════════════════
// Prélèvements sociaux
// ═══════════════════════════════════════════════════════════════════════════

describe("prélèvements sociaux sur les revenus du patrimoine", () => {
  const { patrimony, realEstate, eeaReducedPct } = PARAMS_2026.socialLevies;

  for (const [nom, taux] of [
    ["droit commun", patrimony],
    ["dérogatoire immobilier", realEstate],
  ] as const) {
    it(`${nom} : le total est bien la somme de ses composantes`, () => {
      // Écrire le total ET ses parts, c'est se donner deux occasions de se tromper.
      // Elles doivent se recouper, sinon l'une des deux est fausse.
      const somme = taux.csgPct + taux.crdsPct + taux.solidarityPct;
      expect(Math.round(somme * 100) / 100, `${nom} : le total ne se recompose pas`).toBe(taux.totalPct);
    });

    it(`${nom} : aucune composante n'est nulle ni négative`, () => {
      expect(taux.csgPct).toBeGreaterThan(0);
      expect(taux.crdsPct).toBeGreaterThan(0);
      expect(taux.solidarityPct).toBeGreaterThan(0);
    });
  }

  it("le régime immobilier est plus léger que le droit commun, et par la seule CSG", () => {
    // Depuis les revenus 2025, le 2° du I de l'art. L136-8 porte la CSG à 10,6 %,
    // et son IV y déroge pour les revenus fonciers et les plus-values immobilières.
    // La dérogation ne touche QUE la CSG : si un jour la CRDS ou le prélèvement de
    // solidarité divergeaient aussi, c'est qu'on aurait recopié un taux de travers.
    expect(realEstate.totalPct).toBeLessThan(patrimony.totalPct);
    expect(realEstate.csgPct).toBeLessThan(patrimony.csgPct);
    expect(realEstate.crdsPct).toBe(patrimony.crdsPct);
    expect(realEstate.solidarityPct).toBe(patrimony.solidarityPct);
  });

  it("le taux réduit EEE/Suisse est inférieur au taux plein", () => {
    expect(eeaReducedPct).toBeLessThan(realEstate.totalPct);
    expect(eeaReducedPct).toBeLessThan(patrimony.totalPct);
  });

  it("le taux réduit EEE/Suisse est exactement le prélèvement de solidarité", () => {
    // L'affilié à un régime de l'EEE ou de Suisse est exonéré de CSG et de CRDS, mais
    // pas du prélèvement de solidarité. Le taux réduit n'est donc pas un chiffre
    // indépendant : c'est ce qui reste quand on retire les deux autres. Le poser à
    // part sans cette égalité laisserait les deux dériver l'un de l'autre.
    expect(eeaReducedPct).toBe(realEstate.solidarityPct);
    expect(eeaReducedPct).toBe(realEstate.totalPct - realEstate.csgPct - realEstate.crdsPct);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Les deux barèmes d'abattement pour durée de détention
// ═══════════════════════════════════════════════════════════════════════════

describe("abattements pour durée de détention", () => {
  const baremes = [
    ["impôt sur le revenu", pv.incomeTaxAllowance],
    ["prélèvements sociaux", pv.socialLevyAllowance],
  ] as const;

  for (const [nom, bareme] of baremes) {
    describe(nom, () => {
      it("atteint exactement 100 % à sa durée d'exonération", () => {
        // L'invariant central. Une cadence recopiée de travers ne tombe pas juste.
        expect(
          abattementCumule(bareme, bareme.fullExemptionYear),
          `${nom} : le barème ne solde pas à 100 % au terme de la ${bareme.fullExemptionYear}e année`,
        ).toBe(100);
      });

      it("n'atteint pas 100 % un an plus tôt", () => {
        // Sans cela, un barème trop généreux passerait le test précédent en
        // dépassant les 100 % puis en étant plafonné par la lecture.
        expect(abattementCumule(bareme, bareme.fullExemptionYear - 1)).toBeLessThan(100);
      });

      it("est nul pendant les cinq premières années", () => {
        // Les deux barèmes ne courent qu'au-delà de la cinquième année de détention.
        for (let annee = 0; annee <= 5; annee += 1) {
          expect(abattementCumule(bareme, annee), `${nom} : abattement non nul à ${annee} ans`).toBe(0);
        }
        expect(abattementCumule(bareme, 6)).toBeGreaterThan(0);
      });

      it("ne décroît jamais", () => {
        let precedent = 0;
        for (let annee = 0; annee <= bareme.fullExemptionYear + 5; annee += 1) {
          const courant = abattementCumule(bareme, annee);
          expect(courant, `${nom} : abattement en recul à ${annee} ans`).toBeGreaterThanOrEqual(precedent);
          precedent = courant;
        }
      });

      it("a des tranches contiguës, ordonnées et non chevauchantes", () => {
        // Un trou d'une année ferait passer le test des 100 % au moment même où il
        // rendrait le barème faux sur la durée intermédiaire.
        for (const tranche of bareme.steps) {
          expect(tranche.fromYear).toBeLessThanOrEqual(tranche.toYear);
          expect(tranche.ratePctPerYear).toBeGreaterThan(0);
        }
        const tranches = [...bareme.steps];
        for (let i = 1; i < tranches.length; i += 1) {
          const precedente = tranches[i - 1];
          const courante = tranches[i];
          if (precedente === undefined || courante === undefined) throw new Error("tranche absente");
          expect(courante.fromYear, `${nom} : discontinuité entre les tranches ${i - 1} et ${i}`).toBe(
            precedente.toYear + 1,
          );
        }
        const premiere = tranches.at(0);
        const derniere = tranches.at(-1);
        if (premiere === undefined || derniere === undefined) throw new Error("barème vide");
        expect(premiere.fromYear).toBe(6);
        expect(derniere.toYear).toBe(bareme.fullExemptionYear);
      });
    });
  }

  it("les deux barèmes sont bien DIFFÉRENTS", () => {
    // C'est le piège que ce ticket existe pour désamorcer. Le jour où quelqu'un
    // « factorise » les deux barèmes en un seul, ce test doit rougir.
    expect(pv.incomeTaxAllowance.fullExemptionYear).toBe(22);
    expect(pv.socialLevyAllowance.fullExemptionYear).toBe(30);
    expect(pv.socialLevyAllowance.fullExemptionYear).toBeGreaterThan(
      pv.incomeTaxAllowance.fullExemptionYear,
    );
    expect(pv.socialLevyAllowance.steps).not.toEqual(pv.incomeTaxAllowance.steps);
  });

  it("l'abattement social reste en retard sur l'abattement fiscal jusqu'à la 22e année", () => {
    // Entre la 6e et la 22e année, la cadence sociale (1,65 %) est bien plus lente
    // que la fiscale (6 %). Un vendeur à 22 ans est exonéré d'impôt sur le revenu et
    // doit encore 72 % de prélèvements sociaux — c'est le fait le plus contre-intuitif
    // du dispositif, et celui qu'une erreur de barème effacerait.
    for (let annee = 6; annee <= 22; annee += 1) {
      expect(
        abattementCumule(pv.socialLevyAllowance, annee),
        `à ${annee} ans, l'abattement social a rattrapé le fiscal`,
      ).toBeLessThan(abattementCumule(pv.incomeTaxAllowance, annee));
    }
    expect(abattementCumule(pv.incomeTaxAllowance, 22)).toBe(100);
    expect(abattementCumule(pv.socialLevyAllowance, 22)).toBe(28);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Surtaxe sur les plus-values élevées
// ═══════════════════════════════════════════════════════════════════════════

describe("surtaxe sur les plus-values immobilières élevées", () => {
  const { thresholdCents, brackets } = pv.surtax;

  it("compte les dix tranches du barème", () => {
    expect(brackets).toHaveLength(10);
  });

  /** Rend la tranche de rang `i`, ou arrête le test si le barème s'est raccourci. */
  function tranche(i: number): SurtaxBracket {
    const b = brackets[i];
    if (b === undefined) throw new Error(`tranche ${i} absente du barème`);
    return b;
  }

  it("s'ouvre juste au-dessus du seuil de déclenchement", () => {
    // Le texte dit « supérieur à 50 000 € » : à 50 000 € exactement, rien n'est dû.
    expect(thresholdCents).toBe(euros(50_000));
    expect(tranche(0).fromCents).toBe(euros(50_001));
    expect(surtaxe(50_000)).toBe(0);
    expect(surtaxe(49_999)).toBe(0);
    expect(surtaxe(50_001)).toBeGreaterThan(0);
  });

  it("a des tranches contiguës, ordonnées, et une dernière non bornée", () => {
    for (let i = 1; i < brackets.length; i += 1) {
      const precedente = tranche(i - 1);
      const haut = precedente.toCents;
      expect(haut, `tranche ${i - 1} : borne haute manquante`).not.toBeNull();
      if (haut === null) throw new Error(`tranche ${i - 1} non bornée`);
      expect(tranche(i).fromCents, `discontinuité entre les tranches ${i - 1} et ${i}`).toBe(
        haut + euros(1),
      );
    }
    expect(tranche(brackets.length - 1).toCents).toBeNull();
  });

  it("a des taux qui ne décroissent jamais, de 2 % à 6 %", () => {
    for (let i = 1; i < brackets.length; i += 1) {
      expect(tranche(i).ratePct, `taux en recul à la tranche ${i}`).toBeGreaterThanOrEqual(
        tranche(i - 1).ratePct,
      );
    }
    expect(tranche(0).ratePct).toBe(2);
    expect(tranche(brackets.length - 1).ratePct).toBe(6);
  });

  it("ne porte de décote de lissage qu'aux tranches de dix mille euros", () => {
    // Le barème alterne : une tranche étroite de 10 000 € qui lisse le passage au taux
    // supérieur, puis une tranche large à taux plein sans décote.
    for (const b of brackets) {
      expect(b.smoothingCoefficient).toBeGreaterThanOrEqual(0);
      if (b.smoothingCoefficient > 0) {
        expect(b.toCents).not.toBeNull();
        if (b.toCents === null) throw new Error("tranche lissée sans borne haute");
        expect(b.toCents - b.fromCents).toBe(euros(9_999));
      }
    }
    expect(brackets.filter((b) => b.smoothingCoefficient > 0)).toHaveLength(5);
  });

  it("est CONTINU à chaque changement de taux — sauf au seuil des 50 000 €", () => {
    // L'invariant qui mord. Le taux s'appliquant à la totalité de la plus-value, un
    // passage de 2 % à 3 % à 100 000 € produirait sans décote un saut de 1 000 € pour
    // un euro de plus. Les coefficients existent pour l'annuler. Un coefficient mal
    // recopié rouvre le saut, et seul ce test le voit.
    const frontieres = [60_000, 100_000, 110_000, 150_000, 160_000, 200_000, 210_000, 250_000, 260_000];
    for (const bas of frontieres) {
      const avant = surtaxe(bas);
      const apres = surtaxe(bas + 1);
      expect(
        Math.abs(apres - avant),
        `saut de taxe à ${bas} € : ${avant.toFixed(2)} € puis ${apres.toFixed(2)} €`,
      ).toBeLessThan(1);
    }

    // La seule discontinuité voulue : le seuil d'entrée. Elle est dans le texte, pas
    // dans notre recopie — la décote de la première tranche est de 1/20 là où la
    // continuité aurait demandé 1/10. On la constate, on ne la corrige pas.
    expect(surtaxe(50_000)).toBe(0);
    expect(surtaxe(50_001)).toBeGreaterThan(400);
  });

  it("croît avec la plus-value sur toute l'étendue du barème", () => {
    let precedent = -1;
    for (let montant = 50_000; montant <= 400_000; montant += 500) {
      const courant = surtaxe(montant);
      expect(courant, `taxe en recul à ${montant} €`).toBeGreaterThanOrEqual(precedent);
      precedent = courant;
    }
  });

  it("ne dépasse jamais 6 % de la plus-value", () => {
    for (let montant = 50_001; montant <= 400_000; montant += 250) {
      expect(surtaxe(montant), `taxe supérieure au taux plafond à ${montant} €`).toBeLessThanOrEqual(
        0.06 * montant + 1e-6,
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Exonération de la résidence principale, forfaits, abattement exceptionnel
// ═══════════════════════════════════════════════════════════════════════════

describe("résidence principale, forfaits et abattement exceptionnel", () => {
  it("retient un délai normal de cession d'un an, exprimé en mois", () => {
    // La doctrine (BOI-RFPI-PVI-10-40-10 § 190) dit « en principe le délai maximal »,
    // pas un seuil opposable. La valeur est ici pour être affichée et expliquée, pas
    // pour trancher un cas.
    expect(pv.mainResidenceExemption.normalSaleDelayMonths).toBe(12);
  });

  it("garde les deux forfaits de majoration distincts et correctement ordonnés", () => {
    const f = pv.acquisitionPriceUplift;
    expect(f.acquisitionCostsFlatPct).toBe(7.5);
    expect(f.worksFlatPct).toBe(15);
    // Le forfait travaux est le double du forfait frais, et surtout : lui seul est
    // conditionné à une durée de détention. Les confondre ferait majorer de 15 % un
    // bien détenu deux ans, ce que le texte interdit.
    expect(f.worksFlatPct).toBeGreaterThan(f.acquisitionCostsFlatPct);
    expect(f.worksFlatMinHoldingYears).toBe(5);
    expect(f.worksFlatMinHoldingYears).toBeGreaterThan(0);
  });

  it("ordonne les trois taux de l'abattement exceptionnel", () => {
    const a = pv.exceptionalZoneAllowance;
    expect(a.tightZonePct).toBeLessThan(a.urbanOperationPct);
    expect(a.urbanOperationPct).toBeLessThan(a.socialHousingCommitmentPct);
    for (const taux of [a.tightZonePct, a.urbanOperationPct, a.socialHousingCommitmentPct]) {
      expect(taux).toBeGreaterThan(0);
      expect(taux).toBeLessThanOrEqual(100);
    }
    expect(a.socialHousingMinShareOfProgramPct).toBeGreaterThan(0);
    expect(a.socialHousingMinShareOfProgramPct).toBeLessThanOrEqual(100);
  });

  it("borne l'abattement exceptionnel par des dates cohérentes et encore ouvertes", () => {
    const a = pv.exceptionalZoneAllowance;
    expect(a.promiseFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(a.promiseTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(a.promiseFrom).getTime()).toBeLessThan(new Date(a.promiseTo).getTime());
    // Le dispositif est rangé ici parce qu'il est EN VIGUEUR au millésime. S'il vient à
    // expirer sans être prorogé, ce test rougit et impose de le dire plutôt que de
    // laisser une valeur morte passer pour du droit applicable.
    const millesime = new Date(`${PARAMS_2026.vintage}-12-31`);
    expect(
      new Date(a.promiseTo).getTime(),
      "l'abattement exceptionnel a expiré : le retirer ou documenter sa prorogation",
    ).toBeGreaterThanOrEqual(millesime.getTime());
    expect(a.saleDeadlineYearsAfterPromise).toBeGreaterThan(0);
    expect(a.completionYears).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Le contrat du fichier : une valeur sans source n'y entre pas
// ═══════════════════════════════════════════════════════════════════════════

describe("chaque valeur de la phase 3 porte sa source", () => {
  /**
   * Rend le bloc JSDoc immédiatement accolé à une déclaration, ou `null` si la
   * déclaration n'existe pas, n'a pas de bloc, ou en est séparée par autre chose.
   */
  function blocAccole(declaration: string): string | null {
    const i = PARAMS_SRC.indexOf(declaration);
    if (i < 0) return null;
    const avant = PARAMS_SRC.slice(0, i);
    const debut = avant.lastIndexOf("/**");
    const fin = avant.lastIndexOf("*/");
    if (debut < 0 || fin < debut) return null;
    // Rien ne doit s'intercaler entre la fin du bloc et la déclaration : sinon le
    // bloc documente un AUTRE champ et sa source ne vaut pas pour celui-ci.
    if (/\breadonly\b/.test(avant.slice(fin + 2))) return null;
    return avant.slice(debut, fin + 2);
  }

  const DECLARATIONS = [
    "readonly socialLevies: {",
    "readonly patrimony: SocialLevyBreakdown;",
    "readonly realEstate: SocialLevyBreakdown;",
    "readonly eeaReducedPct: number;",
    "readonly realEstateCapitalGains: {",
    "readonly incomeTaxRatePct: number;",
    "readonly incomeTaxAllowance: HoldingPeriodAllowance;",
    "readonly socialLevyAllowance: HoldingPeriodAllowance;",
    "readonly surtax: {",
    "readonly thresholdCents: Cents;",
    "readonly brackets: readonly SurtaxBracket[];",
    "readonly mainResidenceExemption: {",
    "readonly normalSaleDelayMonths: number;",
    "readonly acquisitionPriceUplift: {",
    "readonly acquisitionCostsFlatPct: number;",
    "readonly worksFlatPct: number;",
    "readonly exceptionalZoneAllowance: {",
  ];

  for (const declaration of DECLARATIONS) {
    it(`${declaration.replace(/readonly |[:{;].*$/g, "").trim()} est documenté et sourcé`, () => {
      const bloc = blocAccole(declaration);
      expect(bloc, `${declaration} : aucun bloc JSDoc accolé`).not.toBeNull();
      expect(bloc as string, `${declaration} : bloc JSDoc sans @source`).toMatch(/@source/);
    });
  }

  it("cite un article ou un texte daté pour chacune des huit règles couvertes", () => {
    // Un `@source` qui ne nomme rien ne vaut rien. Ces huit références sont celles qui
    // portent les valeurs ajoutées par FIS-007 ; en perdre une, c'est perdre le droit
    // d'affirmer la valeur correspondante.
    for (const reference of [
      "art. L136-8", // taux des prélèvements sociaux
      "art. L136-7", // cadence sociale de l'abattement
      "art. 200 B", // taux forfaitaire de 19 %
      "art. 150 VC", // cadence fiscale de l'abattement
      "art. 1609 nonies G", // surtaxe
      "art. 150 U", // exonération de la résidence principale
      "art. 150 VB", // forfaits de majoration
      "art. 150 VE", // abattement exceptionnel
    ]) {
      expect(PARAMS_SRC, `référence perdue : ${reference}`).toContain(reference);
    }
    // La doctrine n'est pas un article : elle se cite par son identifiant BOFiP.
    expect(PARAMS_SRC).toContain("BOI-RFPI-PVI-10-40-10");
    // Et les deux lois qui datent les régimes. Les références sont repliées par le
    // JSDoc sur plusieurs lignes : on compare sur le texte déplié, sans quoi ce test
    // rougirait au premier reformatage de commentaire, ce qui n'est pas ce qu'il garde.
    expect(PARAMS_DEPLIE).toMatch(/[Ll]oi n° 2018-1203 du 22 décembre 2018/);
    expect(PARAMS_DEPLIE).toMatch(/[Ll]oi n° 2026-103 du 19 février 2026/);
  });

  it("n'adresse ses URL qu'à des sources officielles", () => {
    // Une source secondaire dans ce fichier serait indétectable à la relecture : elle
    // ressemble à toutes les autres. Seul l'hôte la trahit.
    const HOTES = [
      "www.legifrance.gouv.fr",
      "bofip.impots.gouv.fr",
      "www.impots.gouv.fr",
      "www.service-public.gouv.fr",
      "www.banque-france.fr",
    ];
    const urls = PARAMS_SRC.match(/https:\/\/[^\s)]+/g) ?? [];
    expect(urls.length, "plus aucune URL dans le fichier").toBeGreaterThan(8);
    for (const url of urls) {
      const hote = new URL(url).host;
      expect(HOTES, `source non officielle : ${hote}`).toContain(hote);
    }
  });

  it("n'a pas gagné de valeur en attente de vérification", () => {
    // `FIS-007` n'ajoute aucun marqueur : les huit règles ont été confrontées à leur
    // texte. Les deux marqueurs restants sont ceux des droits de mutation, antérieurs.
    // Le compte est aussi gardé par `assumptions/__tests__/market.test.ts` ; il est
    // répété ici pour que l'ajout d'une valeur non vérifiée rougisse dans le fichier
    // du ticket qui l'a ajoutée.
    const marqueurs = PARAMS_SRC.match(/@todo\s+TODO_VERIFY/g) ?? [];
    expect(marqueurs, "FIS-007 ne devait ajouter aucun TODO_VERIFY").toHaveLength(2);
  });

  it("n'écrit aucune hypothèse de marché parmi les valeurs de loi", () => {
    // ADR-008. Ce ticket a rencontré des ordres de grandeur — rendement locatif,
    // vacance, commission d'agence — qui n'ont rien à faire ici et sont signalés
    // pour `assumptions/market.ts`. La frontière se refranchit sans y penser.
    for (const mot of ["vacance locative", "commission d'agence", "rendement locatif"]) {
      expect(PARAMS_SRC.toLowerCase(), `hypothèse de marché dans params.ts : ${mot}`).not.toContain(mot);
    }
  });
});
