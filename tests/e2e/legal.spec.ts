import { expect, test, type Page } from "@playwright/test";

/**
 * MENTIONS LÉGALES ET TEXTES ASSOCIÉS — `LEG-001`
 *
 * L'article 6 III de la LCEN dispense un éditeur non professionnel de publier son
 * nom, à deux conditions : avoir communiqué son identité à l'hébergeur, et faire
 * figurer l'identité de l'hébergeur sur le site. La première ne se teste pas
 * depuis un navigateur. **La seconde, si** — et c'est celle qu'on oublie en
 * refondant une page.
 *
 * Le reste vérifie l'atteignabilité, exigée par `TST-010` : des mentions légales
 * qu'on ne trouve pas ne remplissent aucune obligation.
 */

/**
 * Le libellé du lien est écrit, pas dérivé du titre : le pied de page dit
 * « Confidentialité » là où la page s'intitule « Politique de confidentialité ».
 * Une dérivation aurait lié le test à une coïncidence de vocabulaire.
 */
const PAGES = [
  { route: "/mentions-legales", titre: "Mentions légales", lien: "Mentions légales" },
  { route: "/confidentialite", titre: "Politique de confidentialité", lien: "Confidentialité" },
  { route: "/conditions", titre: "Conditions générales d'utilisation", lien: "Conditions d'utilisation" },
];

const pied = (page: Page) => page.locator("[data-pied]");

for (const { route, titre, lien } of PAGES) {
  test(`${route} s'affiche, datée et titrée`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1")).toHaveText(titre);
    // Une page légale non datée ne dit pas de quel état du service elle parle.
    await expect(page.getByText(/Dernière mise à jour : \d/)).toBeVisible();
  });

  test(`${route} est atteignable depuis le simulateur`, async ({ page }) => {
    await page.goto("/credit");
    await pied(page).getByRole("link", { name: lien, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  });
}

test("l'identité de l'hébergeur figure sur le site", async ({ page }) => {
  await page.goto("/mentions-legales");

  // C'est la contrepartie de l'anonymat de l'éditeur, pas une politesse.
  const texte = await page.locator("main").innerText();
  expect(texte).toContain("Vercel Inc.");
  expect(texte).toContain("Covina");
  // Vercel ne publie pas de téléphone : on le dit plutôt que de l'inventer.
  expect(texte).toContain("non publié par l'hébergeur");
});

test("l'éditeur reste anonyme, et le dit avec son fondement", async ({ page }) => {
  await page.goto("/mentions-legales");
  const texte = await page.locator("main").innerText();

  expect(texte).toContain("non professionnel");
  // Le fondement se cite : une dispense sans article est une affirmation.
  expect(texte).toMatch(/article 6/i);
  expect(texte).toContain("2004-575");
});

test("une adresse de contact est publiée et cliquable", async ({ page }) => {
  await page.goto("/mentions-legales");
  const contact = page.locator('main a[href^="mailto:"]').first();
  await expect(contact).toBeVisible();
  const href = await contact.getAttribute("href");
  expect(href).toMatch(/^mailto:.+@.+\..+$/);
});

test("la confidentialité ne prétend pas qu'aucune donnée n'est traitée", async ({ page }) => {
  await page.goto("/confidentialite");
  const texte = await page.locator("main").innerText();

  // Le paragraphe qui fait la valeur du texte : un site qui affirmerait ne rien
  // traiter du tout mentirait, puisque l'hébergeur journalise les connexions.
  expect(texte).toContain("Il serait inexact");
  expect(texte).toContain("adresse IP");
  expect(texte).toMatch(/6\.1\.f/);

  // Et l'avertissement qui découle de la promesse du produit : l'état est dans
  // l'URL, donc partager un lien partage les chiffres.
  expect(texte).toContain("partager un lien revient à partager les chiffres");
});

test("les conditions ne promettent pas de médiateur de la consommation", async ({ page }) => {
  await page.goto("/conditions");
  const texte = (await page.locator("main").innerText()).toLowerCase();

  // Cette clause n'est obligatoire que pour un professionnel. La laisser dans un
  // texte d'éditeur non professionnel annoncerait un recours qui n'existe pas.
  expect(texte).not.toContain("médiateur");
});

test("le pied de page mène aux trois textes depuis n'importe quelle route", async ({ page }) => {
  for (const route of ["/", "/credit", "/composants", "/avertissement"]) {
    await page.goto(route);
    await expect(pied(page), `pas de pied de page sur ${route}`).toBeVisible();
    for (const { route: cible } of PAGES) {
      await expect(
        pied(page).locator(`a[href="${cible}"]`),
        `${cible} injoignable depuis ${route}`,
      ).toHaveCount(1);
    }
  }
});

test("aucune page légale n'est indexable tant que le site n'est pas relu", async ({ page }) => {
  for (const { route } of PAGES) {
    await page.goto(route);
    const robots = await page.locator('head meta[name="robots"]').getAttribute("content");
    expect(robots, `pas de balise robots sur ${route}`).toContain("noindex");
  }
});

test("les pages légales ne débordent pas", async ({ page }) => {
  for (const { route } of PAGES) {
    await page.goto(route);
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(deborde, `${route} défile latéralement`).toBe(false);
  }
});
