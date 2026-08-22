import { expect, test } from "@playwright/test";

/**
 * GALERIE DES PRIMITIVES
 *
 * Ces tests vérifient ce qu'aucune autre suite ne peut voir : le rendu réel dans
 * un navigateur. Le moteur a ses 95 tests, les jetons leurs 34 ; ceux-ci portent
 * sur le format affiché, le clavier, et les règles du brief qui sont
 * vérifiables mécaniquement.
 */

/** Le séparateur de milliers français est une espace insécable, pas une espace ordinaire. */
const ESPACE = "[\\s\\u00a0\\u202f]";

test.beforeEach(async ({ page }) => {
  await page.goto("/composants");
});

test("les cinq primitives sont présentes avec leurs cinq états", async ({ page }) => {
  const primitives = ["Champ montant", "Champ taux", "Sélecteur segmenté", "Liste déroulante", "Case à cocher"];
  for (const nom of primitives) {
    const section = page.locator(`[data-primitive="${nom}"]`);
    await expect(section, `la primitive « ${nom} » est absente`).toBeVisible();
    await expect(section.locator("[data-cas]")).toHaveCount(5);
  }
});

test("les montants portent le format français strict", async ({ page }) => {
  const prix = page.locator('[data-sortie="prix"]');
  // 205 000,00 € — espace insécable, virgule décimale, symbole APRÈS le montant.
  await expect(prix).toHaveText(new RegExp(`^205${ESPACE}000,00${ESPACE}€$`));

  const taux = page.locator('[data-sortie="taux"]');
  await expect(taux).toHaveText("3,20 %");
});

test("une saisie se reformate à la sortie du champ et circule jusqu'aux sorties", async ({ page }) => {
  const champ = page.locator("#m-repos");
  await champ.fill("250000");
  await champ.blur();

  await expect(page.locator('[data-sortie="prix"]')).toHaveText(
    new RegExp(`^250${ESPACE}000,00${ESPACE}€$`),
  );
  // Le champ lui-même se remet en forme, sans décimales pour une saisie ronde.
  await expect(champ).toHaveValue(new RegExp(`^250${ESPACE}000${ESPACE}€$`));
});

test("une saisie à la française, virgule et symbole compris, est comprise", async ({ page }) => {
  const champ = page.locator("#m-repos");
  await champ.fill("312 500,50 €");
  await champ.blur();

  await expect(page.locator('[data-sortie="prix"]')).toHaveText(
    new RegExp(`^312${ESPACE}500,50${ESPACE}€$`),
  );
});

test("le curseur du taux pilote la même valeur que la saisie", async ({ page }) => {
  const curseur = page.locator("#t-repos-curseur");
  await curseur.fill("4.5");
  await expect(page.locator('[data-sortie="taux"]')).toHaveText("4,50 %");
});

test("le sélecteur segmenté se pilote aux flèches du clavier", async ({ page }) => {
  const groupe = page.locator("#s-repos");
  const actif = groupe.getByRole("radio", { checked: true });
  await actif.focus();

  await expect(page.locator('[data-sortie="base"]')).toHaveText("capital initial");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-sortie="base"]')).toHaveText("capital restant dû");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('[data-sortie="base"]')).toHaveText("capital initial");
});

test("la case à cocher répond à la barre d'espace", async ({ page }) => {
  const case1 = page.locator("#c-repos");
  await case1.focus();
  await expect(page.locator('[data-sortie="travaux"]')).toHaveText("non inclus");
  await page.keyboard.press("Space");
  await expect(page.locator('[data-sortie="travaux"]')).toHaveText("inclus");
});

test("la pastille pédagogique s'ouvre au clavier et se ferme par Échap", async ({ page }) => {
  const pastille = page.getByRole("button", { name: /Qu'est-ce que « Frais de dossier » \?/ });
  await pastille.focus();

  const bulle = page.getByRole("note");
  await expect(bulle).toBeVisible();
  await expect(bulle).toContainText("Ils se négocient");
  await expect(pastille).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");
  await expect(bulle).toBeHidden();
});

test("aucune information n'est portée par la seule couleur", async ({ page }) => {
  // Chaque champ nomme sa famille en toutes lettres, en plus du trait de bordure.
  const champs = page.locator("[data-champ]");
  const total = await champs.count();
  expect(total).toBeGreaterThan(0);

  for (let i = 0; i < total; i++) {
    const champ = champs.nth(i);
    const famille = await champ.getAttribute("data-famille");
    const attendu = { negociable: "négociable", contraint: "contraint", reglementaire: "réglementaire" }[
      famille ?? ""
    ];
    expect(attendu, `famille inconnue : ${famille}`).toBeTruthy();
    await expect(champ).toContainText(attendu as string);
  }

  // Chaque état d'erreur porte un texte, pas seulement une bordure brique.
  const erreurs = page.locator('[data-etat="erreur"]');
  const nbErreurs = await erreurs.count();
  expect(nbErreurs).toBeGreaterThan(0);
  for (let i = 0; i < nbErreurs; i++) {
    await expect(erreurs.nth(i).getByRole("alert")).toBeVisible();
  }
});

test("les champs désactivés ne sont pas atteignables au clavier", async ({ page }) => {
  for (const id of ["#m-desactive", "#t-desactive", "#l-desactive", "#c-desactive"]) {
    await expect(page.locator(id)).toBeDisabled();
  }
});

test("un champ en erreur le signale à la technologie d'assistance", async ({ page }) => {
  const champ = page.locator("#m-erreur");
  await expect(champ).toHaveAttribute("aria-invalid", "true");
  await expect(champ).toHaveAttribute("aria-describedby", "m-erreur-erreur");
  await expect(page.locator("#m-erreur-erreur")).toContainText("dépasse le prix du bien");
});

test("la page ne déborde jamais horizontalement", async ({ page }) => {
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(deborde, "la page défile latéralement").toBe(false);
});

test("la galerie reste hors de l'indexation", async ({ page }) => {
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/);
});
