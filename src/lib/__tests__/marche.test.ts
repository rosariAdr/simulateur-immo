import { describe, it, expect } from "vitest";
import { premiereMarche, type EcheanceLue } from "../marche";

/**
 * `UI-011` — la légende de la mensualité annonçait un différé inexistant.
 *
 * Les deux cas qui comptent sont l'un et l'autre indispensables : sans le premier
 * la phrase revient, sans le second elle ne s'affiche plus jamais et le défaut est
 * simplement passé de « trop souvent » à « jamais ».
 */

const suite = (paiements: readonly number[]): EcheanceLue[] =>
  paiements.map((payment, i) => ({ month: i + 1, payment }));

describe("échéancier sans marche", () => {
  it("ignore l'écart de la dernière échéance, qui solde le capital", () => {
    // Le scénario par défaut : 240 fois 1 061,39 €, puis 1 062,41 € pour solder.
    const echeances = suite([...Array<number>(239).fill(106_139), 106_241]);
    expect(premiereMarche(echeances)).toBeNull();
  });

  it("ignore une décroissance régulière", () => {
    // Assurance assise sur le capital restant dû : chaque échéance baisse.
    const echeances = suite(Array.from({ length: 240 }, (_, i) => 120_000 - i * 12));
    expect(premiereMarche(echeances)).toBeNull();
  });

  it("ignore un bruit d'arrondi de quelques centimes", () => {
    const echeances = suite([100_000, 100_001, 100_000, 100_002, 100_000, 100_099]);
    expect(premiereMarche(echeances)).toBeNull();
  });

  it("rend null sur un échéancier vide ou trop court pour marcher", () => {
    expect(premiereMarche([])).toBeNull();
    expect(premiereMarche(suite([100_000]))).toBeNull();
    // Deux échéances : la seconde est la dernière, donc un solde.
    expect(premiereMarche(suite([100_000, 250_000]))).toBeNull();
  });
});

describe("échéancier avec marche", () => {
  it("repère la fin d'un différé et rend le mois et le montant", () => {
    // Un prêt à taux zéro en différé de 24 mois : l'échéance totale grimpe au 25ᵉ.
    const echeances = suite([
      ...Array<number>(24).fill(80_000),
      ...Array<number>(215).fill(125_000),
      125_310,
    ]);
    const marche = premiereMarche(echeances);
    expect(marche?.month).toBe(25);
    expect(marche?.payment).toBe(125_000);
  });

  it("retient la PREMIÈRE marche quand il y en a plusieurs", () => {
    // Deux prêts complémentaires qui s'éteignent à des dates différentes peuvent
    // produire plusieurs paliers. La légende parle de celui qu'on rencontre.
    const echeances = suite([
      ...Array<number>(12).fill(70_000),
      ...Array<number>(12).fill(95_000),
      ...Array<number>(11).fill(130_000),
      130_400,
    ]);
    expect(premiereMarche(echeances)?.month).toBe(13);
  });

  it("ne confond pas une marche avec le solde final, même si le solde est plus haut", () => {
    const echeances = suite([
      ...Array<number>(10).fill(90_000),
      ...Array<number>(10).fill(140_000),
      900_000,
    ]);
    // La marche est au mois 11, pas au mois 21.
    expect(premiereMarche(echeances)?.month).toBe(11);
  });
});
