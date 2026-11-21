import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARAMS_2026 } from "../params";

/**
 * LE TRIMESTRE DE L'USURE SE TIENT — `FIS-011`
 *
 * Les cinq seuils sont confrontés au Journal officiel par le cas de référence 6
 * (`src/core/credit/__tests__/cas-de-reference.test.ts`). Ce fichier garde autre
 * chose : la mise à jour trimestrielle faite À MOITIÉ. Le taux d'usure change
 * quatre fois par an, et chaque report touche cinq valeurs, trois dates et une
 * source. Changer les taux en oubliant les dates, ou les dates en oubliant la
 * source, donne un `params.ts` qui compile, passe le cas de référence s'il a été
 * mis à jour avec lui, et ment sur sa période.
 *
 * Aucune date du jour n'entre ici : un test qui rougirait le 1er janvier sans que
 * le code ait bougé ne garderait rien, il préviendrait. L'alerte de péremption est
 * une autre affaire (`FIS-009`).
 */

const PARAMS_SRC = readFileSync(join(process.cwd(), "src/core/fiscal/params.ts"), "utf8");

const u = PARAMS_2026.usury;

/** « 2026-T4 » → { annee: 2026, rang: 4 }. */
function lireTrimestre(code: string): { annee: number; rang: number } {
  const m = /^(\d{4})-T([1-4])$/u.exec(code);
  if (m === null) throw new Error(`trimestre illisible : « ${code} »`);
  return { annee: Number(m[1]), rang: Number(m[2]) };
}

/** Premier et dernier jour d'un trimestre civil, au format ISO. */
function bornesDuTrimestre(annee: number, rang: number): { from: string; to: string } {
  const moisDebut = (rang - 1) * 3 + 1;
  const moisFin = moisDebut + 2;
  // Le jour 0 du mois suivant est le dernier jour du mois de fin, en UTC.
  const dernierJour = new Date(Date.UTC(annee, moisFin, 0)).getUTCDate();
  const deux = (n: number): string => String(n).padStart(2, "0");
  return {
    from: `${annee}-${deux(moisDebut)}-01`,
    to: `${annee}-${deux(moisFin)}-${deux(dernierJour)}`,
  };
}

/** Le bloc JSDoc posé juste au-dessus de `readonly usury` dans l'interface. */
function commentaireDeUsury(): string {
  const fin = PARAMS_SRC.indexOf("readonly usury: UsuryThresholds;");
  const debut = PARAMS_SRC.lastIndexOf("/**", fin);
  if (fin < 0 || debut < 0) throw new Error("commentaire de `usury` introuvable dans params.ts");
  return PARAMS_SRC.slice(debut, fin);
}

describe("le trimestre de l'usure", () => {
  it("couvre exactement le trimestre civil qu'il nomme", () => {
    const { annee, rang } = lireTrimestre(u.quarter);
    const attendu = bornesDuTrimestre(annee, rang);
    expect(u.from, `début du ${u.quarter}`).toBe(attendu.from);
    expect(u.to, `fin du ${u.quarter}`).toBe(attendu.to);
  });

  it("appartient au millésime du fichier", () => {
    expect(String(lireTrimestre(u.quarter).annee)).toBe(PARAMS_2026.vintage);
  });

  it("est celui que cite la source, et le seul", () => {
    // Le commentaire de `usury` est la traçabilité réglementaire du fichier gelé
    // (ADR-004). S'il cite encore le trimestre précédent, les valeurs ont changé
    // sans leur source — le défaut exact qu'une revue laisse passer.
    const { annee, rang } = lireTrimestre(u.quarter);
    const source = commentaireDeUsury();
    expect(source, `la source ne nomme pas le ${u.quarter}`).toContain(`${rang}e trimestre ${annee}`);
    const autres = [...source.matchAll(/([1-4])e trimestre (\d{4})/gu)]
      .map((m) => `${m[2]}-T${m[1]}`)
      .filter((t) => t !== u.quarter);
    expect(autres, "la source nomme un autre trimestre que celui des valeurs").toEqual([]);
  });

  it("laisse vraie la phrase du glossaire sur le prêt-relais", () => {
    // Ce n'est pas une règle de droit. Le glossaire écrit, pour tout trimestre, que
    // le plafond du prêt-relais « est le plus élevé de toutes les catégories
    // publiées » (`src/content/glossaire.ts`, `src/content/developpements.ts`).
    // Si un avis le démentait, le texte mentirait : revérifier l'avis, puis
    // réécrire la phrase — pas ce test.
    const autres = [u.fixedUnder10y, u.fixed10to20y, u.fixed20yPlus, u.variable];
    for (const seuil of autres) expect(u.bridge).toBeGreaterThan(seuil);
  });
});
