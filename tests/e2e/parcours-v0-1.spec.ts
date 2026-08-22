import { expect, test } from "@playwright/test";

/**
 * CRITÈRE DE SORTIE DE v0.1.0 — `TST-010`
 *
 * `docs/RELEASES.md` énonce le critère en une phrase :
 *
 *   « Un inconnu arrive sur `/`, comprend en trois phrases ce que fait le site,
 *     simule un crédit, partage le lien de son scénario — et sait, sans avoir à
 *     chercher, qu'il ne reçoit pas un conseil. »
 *
 * Ce fichier l'exécute au lieu de l'affirmer. Un critère de sortie qu'on coche à
 * la main est un critère qu'on coche de mémoire à la version suivante ; celui-ci
 * rougit le jour où le parcours se casse, y compris entre deux versions.
 *
 * Il ne remplace pas les suites par écran, il les traverse : c'est le seul test
 * du dépôt qui aille d'un bout à l'autre du produit.
 */

test("le parcours complet d'un inconnu, de l'accueil au lien partagé", async ({ page }) => {
  /* ── 1. Il arrive, et il est prévenu avant d'avoir rien lu ─────────────── */

  await page.goto("/");

  const bandeau = page.locator("[data-avertissement]");
  await expect(bandeau).toBeVisible();
  await expect(bandeau).toContainText("ni un conseil en investissement");
  // Sans avoir à chercher : dans la fenêtre, sans le moindre défilement.
  const boite = await bandeau.boundingBox();
  expect(boite?.y ?? Infinity).toBeLessThan(80);

  /* ── 2. Il comprend ce que fait le site ────────────────────────────────── */

  await expect(page.locator("h1")).toBeVisible();
  const accueil = await page.locator("main").innerText();
  // Les trois familles, qui sont l'apport pédagogique du produit.
  for (const famille of ["Négociable", "Contraint", "Réglementaire"]) {
    expect(accueil, `famille « ${famille} » absente de l'accueil`).toContain(famille);
  }
  // Et ce que le produit refuse de faire.
  expect(accueil.toLowerCase()).toContain("sans compte");

  /* ── 3. Il simule un crédit ────────────────────────────────────────────── */

  await page.locator('[data-vers-credit]').first().click();
  await expect(page).toHaveURL(/\/credit$/);

  const mensualite = page.locator('[data-indicateur="mensualite"] [data-valeur]');
  await expect(mensualite).toBeVisible();

  await page.locator("#prix").fill("312000");
  await page.locator("#prix").blur();
  await page.locator("#apport").fill("41000");
  await page.locator("#apport").blur();

  // L'avertissement le suit sur l'écran qui affiche les chiffres.
  await expect(bandeau).toBeVisible();

  /* ── 4. Il partage son scénario, et le lien redonne les mêmes chiffres ─── */

  // Les écritures d'URL sont groupées et différées : on attend que l'adresse
  // porte tout le scénario avant de la considérer comme partageable.
  await expect
    .poll(() => {
      const p = new URL(page.url()).searchParams;
      return `${p.get("px")}|${p.get("ap")}`;
    })
    .toBe("312000|41000");

  const partage = page.url();
  const attendu = await mensualite.textContent();
  expect(attendu, "mensualité illisible").toBeTruthy();

  await page.goto(partage);
  await expect(mensualite).toHaveText(attendu ?? "");

  /* ── 5. Il peut aller vérifier qui édite ce site ───────────────────────── */

  await page.locator('[data-pied] a[href="/mentions-legales"]').click();
  await expect(page.locator("h1")).toHaveText("Mentions légales");
  // L'hébergeur est nommé : c'est ce qui fonde l'anonymat de l'éditeur.
  await expect(page.locator("main")).toContainText("Vercel Inc.");
});

test("aucun écran affichant un chiffre ne se lit sans l'avertissement", async ({ page }) => {
  // La liste est celle des routes qui montrent des montants ou des taux. Toute
  // route ajoutée qui en montre doit y entrer — c'est la garde qui empêche
  // qu'un futur écran naisse sans son avertissement.
  for (const route of ["/", "/credit", "/composants"]) {
    await page.goto(route);
    await expect(page.locator("[data-avertissement]"), route).toBeVisible();
    await expect(page.locator("[data-pied]"), route).toBeVisible();
  }
});
