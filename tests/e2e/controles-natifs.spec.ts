import { expect, test, type Page } from "@playwright/test";

/**
 * CE QUE LE NAVIGATEUR PEINT LUI-MÊME — `UI-012`
 *
 * La liste déroulée d'un `select` n'est pas dans le DOM : c'est le navigateur qui
 * la dessine, et il choisit sa teinte d'après `color-scheme`. Faute de
 * déclaration, il appliquait le clair — et l'encre du thème sombre se retrouvait
 * sur un fond blanc, à 1,21:1.
 *
 * Ces tests-ci vérifient ce que le navigateur **calcule**, là où les tests
 * unitaires de `design-tokens` vérifient ce que la feuille **déclare**. Les deux
 * sont nécessaires : une déclaration peut être écrite et malgré tout écrasée, ou
 * vivre dans un fichier que la page ne charge pas.
 *
 * Le fond de la liste déroulée reste, lui, hors de portée d'un test — il
 * n'appartient à aucun élément. C'est la limite honnête de cette garde : elle
 * prouve que la consigne est donnée au navigateur, pas ce qu'il en peint.
 */

const schema = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);

test("sur le thème sombre, les contrôles natifs sont sombres", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/credit");
  expect(await schema(page)).toBe("dark");
});

test("sur le thème clair, les contrôles natifs sont clairs", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/credit");
  expect(await schema(page)).toBe("light");
});

test("aucune page ne laisse color-scheme à normal", async ({ page }) => {
  // `normal` est la valeur qui a produit le défaut. Elle ne doit revenir sur
  // aucune route, quel que soit le thème demandé.
  for (const theme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const route of ["/", "/credit", "/composants", "/mentions-legales"]) {
      await page.goto(route);
      expect(await schema(page), `${route} en thème ${theme}`).not.toBe("normal");
    }
  }
});

test("le texte des options reste celui de l'encre du thème", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/credit");
  // Le module vit sous `Suspense` : `evaluate` n'attend rien, il lirait une page
  // encore vide.
  await page.locator("#duree").waitFor();

  // La correction ne devait toucher qu'au fond peint par le navigateur. Si
  // quelqu'un « corrigeait » aussi la couleur du texte, les listes cesseraient
  // de suivre l'encre du site et le défaut reviendrait par l'autre bout.
  const { option, encre } = await page.evaluate(() => {
    const opt = document.querySelector("#duree option:not([disabled])");
    return {
      option: opt ? getComputedStyle(opt).color : null,
      encre: getComputedStyle(document.documentElement).getPropertyValue("--encre").trim(),
    };
  });

  expect(option, "aucune option dans la liste des durées").toBeTruthy();
  expect(encre).toBe("#e6eaef");
  expect(option).toBe("rgb(230, 234, 239)");
});
