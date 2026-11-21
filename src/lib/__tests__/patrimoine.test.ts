import { describe, it, expect } from "vitest";
import { PARAMS_2026 } from "@/core/fiscal/params";
import { assainirLocation, DEFAUTS_LOCATION, TAUX_MARGINAUX } from "../patrimoine";

/**
 * LA TRANCHE MARGINALE VIENT DU BARÈME — `FIS-012`
 *
 * La liste des tranches proposées à l'utilisateur était écrite dans ce module.
 * Elle est désormais lue dans `params.ts`, et ces tests disent ce qui en dépend :
 * la liste affichée, la valeur par défaut, et l'assainissement d'une adresse.
 */

describe("les tranches marginales proposées", () => {
  it("sont celles du barème de `params.ts`, dans son ordre", () => {
    expect(TAUX_MARGINAUX).toEqual(PARAMS_2026.incomeTax.marginalRatesPct);
  });

  it("contiennent la tranche par défaut", () => {
    // Si une loi de finances retirait la tranche par défaut du barème, une adresse
    // sans `tm` ouvrirait sur un taux que la liste ne propose plus.
    expect(TAUX_MARGINAUX).toContain(DEFAUTS_LOCATION.tmi);
  });

  it("refusent un taux hors barème, et retombent sur le défaut", () => {
    // 14 % : la tranche abaissée à 11 % par la loi de finances pour 2020. Une adresse
    // ancienne ou trafiquée ne doit pas faire calculer un impôt sur un taux disparu.
    const base = { ...DEFAUTS_LOCATION, tmi: 14 };
    expect(assainirLocation(base).tmi).toBe(DEFAUTS_LOCATION.tmi);
    for (const t of TAUX_MARGINAUX) {
      expect(assainirLocation({ ...DEFAUTS_LOCATION, tmi: t }).tmi).toBe(t);
    }
  });
});
