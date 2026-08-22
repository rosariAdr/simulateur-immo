import { expect, test, type Page } from "@playwright/test";

/**
 * AVERTISSEMENT ET ÉTAT DE PUBLICATION — `LEG-002`
 *
 * Ces tests ne vérifient pas une mise en forme : ils vérifient qu'un utilisateur
 * ne peut pas voir un chiffre de crédit sans voir en même temps qu'il ne reçoit
 * pas un conseil. C'est la seule garantie qui protège l'éditeur autant que le
 * lecteur, et elle se perd au premier écran qu'on oublie.
 *
 * Toute route qui affiche des chiffres doit donc figurer dans `ROUTES`.
 */

const ROUTES = ["/", "/credit", "/credit/comprendre", "/composants", "/avertissement"];

const bandeau = (page: Page) => page.locator("[data-avertissement]");

for (const route of ROUTES) {
  test(`l'avertissement est présent et visible sur ${route}`, async ({ page }) => {
    await page.goto(route);

    await expect(bandeau(page)).toBeVisible();
    await expect(bandeau(page)).toContainText("ni un conseil en investissement");
    await expect(bandeau(page)).toContainText("ni une offre de crédit");
  });

  test(`la page ${route} n'est pas indexable`, async ({ page }) => {
    await page.goto(route);
    // `noindex` demande de ne pas indexer, `nofollow` de ne pas suivre les liens.
    const robots = await page.locator('head meta[name="robots"]').getAttribute("content");
    expect(robots, `pas de balise robots sur ${route}`).toContain("noindex");
  });
}

test("l'avertissement se lit sans défiler, avant le contenu", async ({ page }) => {
  await page.goto("/credit");

  // « Visible, pas relégué en pied de page » : il doit être dans la fenêtre au
  // chargement, sans le moindre défilement.
  const boite = await bandeau(page).boundingBox();
  expect(boite, "bandeau sans géométrie").not.toBeNull();
  expect(boite?.y ?? Infinity).toBeLessThan(80);

  // Et avant le contenu principal dans l'ordre du document : un lecteur d'écran
  // le rencontre donc en premier, comme un lecteur voyant.
  const avantContenu = await page.evaluate(() => {
    const a = document.querySelector("[data-avertissement]");
    const premierChiffre = document.querySelector("[data-indicateur]");
    if (!a || !premierChiffre) return null;
    return !!(a.compareDocumentPosition(premierChiffre) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(avantContenu, "le bandeau ne précède pas les chiffres").toBe(true);
});

test("l'avertissement ne peut pas être fermé", async ({ page }) => {
  await page.goto("/credit");

  // Un avertissement qu'on fait disparaître cesse d'en être un au deuxième
  // chargement de page. Aucun bouton ne doit permettre de l'escamoter.
  await expect(bandeau(page).locator("button")).toHaveCount(0);
});

test("le lien mène au texte long, qui dit les quatre choses", async ({ page }) => {
  await page.goto("/credit");
  await bandeau(page).getByRole("link", { name: /n'est pas/i }).click();

  await expect(page).toHaveURL(/\/avertissement$/);
  await expect(page.locator("h1")).toContainText("Ce que cet outil n'est pas");

  for (const texte of [
    "conseil en investissement",
    "conseil fiscal",
    "offre de crédit",
    "prévision",
  ]) {
    await expect(page.getByRole("heading", { name: new RegExp(texte, "i") })).toBeVisible();
  }

  // Ce qui fait foi en cas de divergence n'est pas ce simulateur.
  await expect(page.getByText("c'est l'offre de prêt qui fait foi")).toBeVisible();
});

test("robots.txt interdit l'exploration tant que le site n'est pas relu", async ({ page }) => {
  const reponse = await page.goto("/robots.txt");
  expect(reponse?.status()).toBe(200);

  // Ligne à ligne, et non par sous-chaîne : « disallow: / » contient « allow: / ».
  const lignes = (await page.locator("body").innerText())
    .toLowerCase()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  expect(lignes).toContain("disallow: /");
  expect(lignes.filter((l) => l.startsWith("allow:")), "une directive allow subsiste").toEqual([]);
});

test("l'avertissement ne fait pas déborder la page", async ({ page }) => {
  await page.goto("/credit");
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(deborde, "la page défile latéralement").toBe(false);
});
