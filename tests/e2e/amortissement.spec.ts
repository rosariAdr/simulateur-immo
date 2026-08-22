import { expect, test, type Page } from "@playwright/test";

/**
 * RUBAN ET TABLEAU D'AMORTISSEMENT — `VIZ-001`, `VIZ-002`
 *
 * Le test qui compte ici est celui des proportions : il mesure les pixels réels
 * des trois segments d'une barre et les confronte aux montants du tableau. Un
 * graphique financier qui exagère une part est un mensonge poli, et c'est
 * exactement ce qu'aucune relecture de code ne rattrape.
 *
 * Les valeurs attendues viennent de la fixture `01-achat-modeste`, produite par
 * le moteur — le scénario par défaut du simulateur.
 */

const ESPACE = "[\\s\\u00a0\\u202f]";
const eur = (entier: string, decimales = "00") =>
  new RegExp(`^${entier.replace(/ /g, ESPACE)},${decimales}${ESPACE}€$`);

const lecture = (page: Page, poste: string) => page.locator(`[data-curseur] [data-lecture="${poste}"]`);
const barre = (page: Page, annee: number) => page.locator(`[data-annee="${annee}"]`);

/** Hauteur mesurée des trois segments d'une barre, en pixels. */
async function segments(page: Page, annee: number) {
  const hauteur = async (poste: string) =>
    (await barre(page, annee).locator(`[data-part="${poste}"]`).boundingBox())?.height ?? 0;
  return {
    interets: await hauteur("interets"),
    assurance: await hauteur("assurance"),
    capital: await hauteur("capital"),
  };
}

test("le ruban porte une barre par année", async ({ page }) => {
  await page.goto("/credit");
  // 240 échéances, vingt barres.
  await expect(page.locator("[data-annee]")).toHaveCount(20);
});

test("les hauteurs du ruban sont proportionnelles aux montants", async ({ page }) => {
  await page.goto("/credit");

  // Année 1 : 5 664,76 € d'intérêts, 540,00 € d'assurance, 6 531,92 € de capital.
  const h = await segments(page, 1);
  expect(h.interets, "segment d'intérêts non mesurable").toBeGreaterThan(0);

  expect(h.interets / h.capital).toBeCloseTo(5664.76 / 6531.92, 2);
  expect(h.assurance / h.capital).toBeCloseTo(540.0 / 6531.92, 2);

  // L'échelle est commune : la barre de l'année 20 se compare à celle de l'année 1.
  // Année 20 : 208,83 € d'intérêts, contre 5 664,76 € la première année.
  const fin = await segments(page, 20);
  expect(fin.interets / h.interets).toBeCloseTo(208.83 / 5664.76, 2);
  // L'assurance est assise sur le capital initial : sa bande ne bouge pas.
  expect(fin.assurance).toBeCloseTo(h.assurance, 0);
});

test("le curseur de lecture affiche les chiffres de l'année pointée", async ({ page }) => {
  await page.goto("/credit");

  await barre(page, 10).click();

  await expect(page.locator("[data-curseur]")).toContainText("Année 10");
  await expect(lecture(page, "interets")).toHaveText(eur("3 487", "99"));
  await expect(lecture(page, "assurance")).toHaveText(eur("540"));
  await expect(lecture(page, "capital")).toHaveText(eur("8 708", "69"));
  await expect(lecture(page, "restant")).toHaveText(eur("104 260", "11"));
});

test("le curseur se déplace au clavier", async ({ page }) => {
  await page.goto("/credit");

  await barre(page, 5).click();
  await expect(page.locator("[data-curseur]")).toContainText("Année 5");

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-curseur]")).toContainText("Année 6");
  await expect(barre(page, 6)).toBeFocused();

  await page.keyboard.press("End");
  await expect(page.locator("[data-curseur]")).toContainText("Année 20");

  // Le curseur ne sort pas du ruban.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-curseur]")).toContainText("Année 20");
});

test("chaque barre porte ses montants pour qui ne voit pas le ruban", async ({ page }) => {
  await page.goto("/credit");

  // Les montants portent l'espace fine insécable comme séparateur de milliers :
  // on la ramène à une espace ordinaire avant de comparer.
  const nom = (await barre(page, 10).getAttribute("aria-label"))?.replace(/[\s  ]/g, " ");
  expect(nom).toContain("Année 10");
  expect(nom).toContain("3 487,99");
  expect(nom).toContain("8 708,69");
  expect(nom).toContain("104 260,11");
});

test("le ruban et le tableau partagent le même curseur", async ({ page }) => {
  await page.goto("/credit");

  // Du tableau vers le ruban.
  await page.locator('[data-tableau="annee"] [data-ligne="14"]').click();
  await expect(page.locator("[data-curseur]")).toContainText("Année 14");
  await expect(barre(page, 14)).toHaveAttribute("data-selection", "oui");

  // Du ruban vers le tableau.
  await barre(page, 3).click();
  await expect(page.locator('[data-tableau="annee"] [data-ligne="3"]')).toHaveAttribute(
    "data-marquee",
    "oui",
  );
  // Une seule ligne marquée à la fois.
  await expect(page.locator('[data-tableau="annee"] [data-marquee="oui"]')).toHaveCount(1);
});

test("le tableau annuel reprend l'agrégation du moteur", async ({ page }) => {
  await page.goto("/credit");

  const cellules = (annee: number) => page.locator(`[data-ligne="${annee}"] td`);

  await expect(page.locator('[data-tableau="annee"] tbody tr')).toHaveCount(20);

  // Année 1 : intérêts, capital, assurance, total versé, restant dû.
  await expect(cellules(1).nth(1)).toHaveText(eur("5 664", "76"));
  await expect(cellules(1).nth(2)).toHaveText(eur("6 531", "92"));
  await expect(cellules(1).nth(3)).toHaveText(eur("540"));
  await expect(cellules(1).nth(4)).toHaveText(eur("12 736", "68"));
  await expect(cellules(1).nth(5)).toHaveText(eur("173 468", "08"));

  // La dernière année solde : le restant dû tombe à zéro, jamais à une poussière.
  await expect(cellules(20).nth(5)).toHaveText(eur("0"));
});

test("la vue mensuelle affiche les 240 échéances", async ({ page }) => {
  await page.goto("/credit");

  await page.locator('[data-granularite="mois"]').click();
  await expect(page.locator('[data-tableau="mois"] tbody tr')).toHaveCount(240);

  const premiere = page.locator('[data-tableau="mois"] [data-ligne="1"] td');
  await expect(premiere.nth(1)).toHaveText(eur("480"));
  await expect(premiere.nth(2)).toHaveText(eur("536", "39"));
  await expect(premiere.nth(4)).toHaveText(eur("1 061", "39"));

  const derniere = page.locator('[data-tableau="mois"] [data-ligne="240"] td');
  await expect(derniere.nth(4)).toHaveText(eur("1 062", "41"));
  await expect(derniere.nth(5)).toHaveText(eur("0"));
});

test("l'écart de la dernière échéance est chiffré, pas annoncé en l'air", async ({ page }) => {
  await page.goto("/credit");

  const note = page.locator("[data-note-derniere]");
  await expect(note).toBeVisible();
  // 1 062,41 € contre 1 061,39 € : un euro et deux centimes.
  await expect(note).toContainText("supérieure");
  await expect(note).toContainText(/1,02/);
});

test("la note disparaît quand les échéances ne sont pas constantes", async ({ page }) => {
  // Assurance assise sur le capital restant dû : toutes les échéances décroissent,
  // parler d'un écart final n'aurait plus de sens.
  await page.goto("/credit?ab=restant");
  await expect(page.locator("[data-note-derniere]")).toHaveCount(0);
});

test("le tableau ne fait pas déborder la page, même déplié", async ({ page }) => {
  await page.goto("/credit");
  await page.locator('[data-granularite="mois"]').click();
  await expect(page.locator('[data-tableau="mois"]')).toBeVisible();

  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(deborde, "la page défile latéralement").toBe(false);
});
