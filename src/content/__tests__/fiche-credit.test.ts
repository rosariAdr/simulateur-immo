import { describe, expect, it } from "vitest";
import {
  ASSURANCE,
  DERNIERE_ANNEE,
  EFFORT,
  ENTREE_REFERENCE,
  EXEMPLE,
  FAMILLES_PAR_SECTION,
  GARANTIES,
  PARAMS,
  PLAN,
  PREMIERE_ANNEE,
  TRANCHES_USURE,
  USURE,
} from "../fiche-credit";
import { FAMILLES } from "@/components/ui/taxonomie";
import { PARAMS_2026 } from "@/core/fiscal/params";
import { DEFAUTS, versEntreeMoteur } from "@/lib/scenario";

/**
 * LES CHIFFRES DE LA FICHE — `CNT-002`
 *
 * Trois gardes, et elles ne protègent pas la même chose.
 *
 * La première tient à la promesse faite au lecteur : « ouvrez le simulateur, vous
 * y retrouverez ces chiffres ». Elle n'est vraie que si l'exemple de la fiche est
 * le scénario par défaut du module, à la virgule près. La fiche ne peut pas
 * importer `src/lib/scenario.ts` — il charge `nuqs`, ce qu'un composant serveur
 * prérendu ne supporte pas — donc l'entrée du moteur y est réécrite, et c'est ici
 * que la copie est confrontée à l'original.
 *
 * La deuxième tient à la règle la plus importante du projet : le produit calcule,
 * l'utilisateur décide. Aucune tournure prescriptive ne doit atteindre le lecteur.
 * Le pendant de bout en bout balaie la page rendue ; celui-ci balaie la source des
 * chiffres, où une légende peut aussi se glisser.
 *
 * La troisième tient à la traçabilité : aucune valeur réglementaire n'est écrite
 * dans la fiche, elles viennent toutes de `src/core/fiscal/params.ts`.
 */

describe("l'exemple de la fiche est le scénario par défaut du simulateur", () => {
  it("décrit le même prêt, à la virgule près", () => {
    // Si les défauts du module changent, la fiche ment sans que rien ne le dise.
    // Cette égalité est la seule chose qui empêche les deux de diverger.
    expect(ENTREE_REFERENCE).toEqual(versEntreeMoteur({ ...DEFAUTS }));
  });

  it("dérive ses libellés de l'entrée du moteur, sans les ressaisir", () => {
    expect(EXEMPLE.capitalEmprunte).toBe(PLAN.totalPrincipal);
    expect(EXEMPLE.prix).toBe(EXEMPLE.apport + EXEMPLE.capitalEmprunte);
    expect(EXEMPLE.tauxPct).toBe(ENTREE_REFERENCE.loans[0]?.annualRatePct);
    expect(EXEMPLE.dureeMois).toBe(ENTREE_REFERENCE.loans[0]?.months);
  });

  it("raisonne sur le millésime en vigueur, et pas sur une copie", () => {
    expect(PARAMS).toBe(PARAMS_2026);
    expect(PLAN.vintage).toBe(PARAMS_2026.vintage);
  });
});

describe("aucune valeur réglementaire n'est écrite dans la fiche", () => {
  it("lit les seuils d'usure par la fonction du moteur", () => {
    // Trois tranches, dans l'ordre croissant des durées, et chacune égale à ce
    // que `params.ts` publie. Recopier 5,29 % dans un paragraphe le figerait
    // jusqu'à la prochaine relecture ; le lire le fait suivre tout seul.
    expect(TRANCHES_USURE.map((t) => t.seuilPct)).toEqual([
      PARAMS_2026.usury.fixedUnder10y,
      PARAMS_2026.usury.fixed10to20y,
      PARAMS_2026.usury.fixed20yPlus,
    ]);
    expect(USURE.trimestre).toBe(PARAMS_2026.usury.quarter);
  });

  it("lit les normes d'octroi du HCSF", () => {
    expect(EFFORT.plafondPct).toBe(PARAMS_2026.hcsf.maxDebtRatioPct);
    expect(EFFORT.dureeMaxMois).toBe(PARAMS_2026.hcsf.maxDurationMonths);
    expect(EFFORT.dureeDerogatoireMois).toBe(PARAMS_2026.hcsf.maxDurationDerogatoryMonths);
    expect(EFFORT.partTravauxPct).toBe(PARAMS_2026.hcsf.derogatoryWorksSharePct);
    expect(EFFORT.margeDerogationPct).toBe(PARAMS_2026.hcsf.flexibilityMarginPct);
  });

  it("lit les seuils de la loi Lemoine", () => {
    expect(ASSURANCE.lemoineSeuil).toBe(
      PARAMS_2026.borrowerInsurance.lemoineNoHealthFormThreshold,
    );
    expect(ASSURANCE.lemoineAgeAuTerme).toBe(PARAMS_2026.borrowerInsurance.lemoineMaxAgeAtTerm);
  });
});

describe("ce que la fiche affirme est vrai du calcul", () => {
  it("l'antériorité des intérêts se mesure, elle ne s'affirme pas", () => {
    // La fiche dit que la première année contient, à proportion, bien plus
    // d'intérêts que la dernière. Le rapport est calculé : si le moteur change,
    // la phrase change avec lui.
    expect(PREMIERE_ANNEE.partInterets).toBeGreaterThan(DERNIERE_ANNEE.partInterets);
    expect(DERNIERE_ANNEE.rang).toBe(PLAN.annual.length);
  });

  it("l'assurance sur capital restant dû coûte moins, à taux affiché identique", () => {
    // C'est l'enseignement central de la section : le taux ne suffit pas, la
    // base décide. L'écart est calculé sur le même taux dans les deux cas.
    expect(ASSURANCE.surCapitalRestantDu).toBeLessThan(ASSURANCE.surCapitalInitial);
    expect(ASSURANCE.ecartPct).toBeGreaterThan(0);
    expect(ASSURANCE.ecartPct).toBeLessThan(100);
  });

  it("les trois garanties sont comparées sur le même prêt", () => {
    expect(GARANTIES).toHaveLength(3);
    const caution = GARANTIES.find((g) => g.cle === "suretyship");
    const hypotheque = GARANTIES.find((g) => g.cle === "mortgage");

    // Ce que la fiche explique : la caution restitue au terme, l'hypothèque
    // coûte une mainlevée en cas de revente. L'un n'a pas de sens sans l'autre.
    expect(caution?.restitue).toBeGreaterThan(0);
    expect(caution?.mainlevee).toBe(0);
    expect(hypotheque?.restitue).toBe(0);
    expect(hypotheque?.mainlevee).toBeGreaterThan(0);
  });
});

describe("les familles viennent de la taxonomie, et pas d'une réécriture", () => {
  it("chaque section porte au moins une famille connue", () => {
    for (const [section, familles] of Object.entries(FAMILLES_PAR_SECTION)) {
      expect(familles.length, `la section « ${section} » n'a pas de famille`).toBeGreaterThan(0);
      for (const f of familles) expect(FAMILLES[f]).toBeDefined();
    }
  });

  it("les trois familles sont employées au moins une fois", () => {
    const employees = new Set(Object.values(FAMILLES_PAR_SECTION).flat());
    expect([...employees].sort()).toEqual(["contraint", "negociable", "reglementaire"]);
  });
});

/**
 * Les tournures que le produit s'interdit. La liste est la même que celle du
 * test de bout en bout : une garde qui protège une règle éditoriale doit dire la
 * même chose partout où elle s'applique.
 */
const PRESCRIPTIONS: readonly RegExp[] = [
  /\bvous devriez\b/iu,
  /\bnous (?:vous )?(?:recommandons|conseillons)\b/iu,
  /\ble meilleur choix\b/iu,
  /\bil (?:vous )?faut\b/iu,
  /\bmieux vaut\b/iu,
  /\bpréférez\b/iu,
  /\bchoisissez\b/iu,
  /\bévitez\b/iu,
  /\bn['’]hésitez pas\b/iu,
  /\bvous avez (?:tout )?intérêt à\b/iu,
];

describe("le module de contenu ne recommande rien", () => {
  const textes = [
    ...GARANTIES.map((g) => g.nom),
    ...TRANCHES_USURE.map((t) => t.libelle),
    PREMIERE_ANNEE.libelle,
    DERNIERE_ANNEE.libelle,
  ];

  for (const tournure of PRESCRIPTIONS) {
    it(`n'emploie pas ${tournure.source}`, () => {
      for (const texte of textes) {
        expect(texte, `« ${texte} » prescrit`).not.toMatch(tournure);
      }
    });
  }
});
