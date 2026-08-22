import { expect, test, type Page } from "@playwright/test";

/**
 * MODULE CRÉDIT
 *
 * Le test qui compte ici est le dernier : un scénario partagé par URL redonne
 * exactement les mêmes chiffres. C'est la promesse centrale du produit — pas de
 * compte, pas de base, un lien suffit — et rien d'autre ne peut la vérifier.
 *
 * Les valeurs attendues ne sont pas devinées : elles viennent des fixtures du
 * moteur, `01-achat-modeste` pour les défauts et `02-achat-tendu-hcsf` pour le
 * cas non conforme.
 */

const ESPACE = "[\\s\\u00a0\\u202f]";
const eur = (entier: string, decimales = "00") =>
  new RegExp(`^${entier.replace(/ /g, ESPACE)},${decimales}${ESPACE}€$`);

const indicateur = (page: Page, cle: string) => page.locator(`[data-indicateur="${cle}"] [data-valeur]`);

/** L'URL du cas tendu, exprimée en euros et en clés courtes. */
const TENDU = "/credit?px=465000&ap=45000&tx=3.9&du=300&as=0.34&ga=hypotheque&fd=1500&rv=6080&ac=180";

test("le scénario par défaut affiche les chiffres du moteur", async ({ page }) => {
  await page.goto("/credit");

  await expect(indicateur(page, "mensualite")).toHaveText(eur("1 061", "39"));
  await expect(indicateur(page, "cout")).toHaveText(eur("77 884", "62"));
  await expect(indicateur(page, "taeg")).toHaveText("3,96 %");
  await expect(indicateur(page, "effort")).toHaveText("27,96 %");
  await expect(indicateur(page, "assurance")).toHaveText(eur("10 800"));
});

test("une URL nue ne porte aucun paramètre", async ({ page }) => {
  await page.goto("/credit");
  expect(new URL(page.url()).search).toBe("");
});

test("modifier un paramètre l'inscrit dans l'URL, et lui seul", async ({ page }) => {
  await page.goto("/credit");

  const apport = page.locator("#apport");
  await apport.fill("60000");
  await apport.blur();

  await expect.poll(() => new URL(page.url()).searchParams.get("ap")).toBe("60000");
  // Les valeurs restées au défaut n'encombrent pas l'adresse.
  expect(new URL(page.url()).searchParams.get("px")).toBeNull();
  expect(new URL(page.url()).searchParams.get("tx")).toBeNull();
});

test("un scénario partagé par URL redonne exactement les mêmes chiffres", async ({ page }) => {
  // Premier passage : on construit le scénario à la main.
  await page.goto("/credit");

  await page.locator("#prix").fill("465000");
  await page.locator("#prix").blur();
  await page.locator("#apport").fill("45000");
  await page.locator("#apport").blur();
  await page.locator("#taux").fill("3,90 %");
  await page.locator("#taux").blur();
  await page.locator("#duree").selectOption("300");
  await page.locator("#assurance").fill("0,34 %");
  await page.locator("#assurance").blur();
  await page.locator("#garantie").selectOption("hypotheque");
  await page.locator("#revenu").fill("6080");
  await page.locator("#revenu").blur();
  await page.locator("#frais-dossier").fill("1500");
  await page.locator("#frais-dossier").blur();

  await expect(indicateur(page, "mensualite")).toHaveText(eur("2 312", "79"));

  // On ne partage une adresse qu'une fois qu'elle porte tout le scénario. Les
  // écritures dans l'URL sont groupées et différées : lire `page.url()` juste
  // après la dernière frappe peut attraper un état incomplet.
  await expect
    .poll(() => {
      const p = new URL(page.url()).searchParams;
      return ["px", "ap", "tx", "du", "as", "ga", "rv", "fd"].map((k) => p.get(k)).join("|");
    })
    .toBe("465000|45000|3.9|300|0.34|hypotheque|6080|1500");

  const partage = page.url();

  // Second passage : on ne fait que coller l'adresse.
  await page.goto(partage);

  await expect(indicateur(page, "mensualite")).toHaveText(eur("2 312", "79"));
  await expect(indicateur(page, "cout")).toHaveText(eur("281 636", "97"));
  await expect(indicateur(page, "taeg")).toHaveText("4,69 %");
  await expect(indicateur(page, "assurance")).toHaveText(eur("35 700"));
});

test("le dépassement du plafond HCSF est dit, chiffré, et expliqué", async ({ page }) => {
  await page.goto(TENDU);

  await expect(indicateur(page, "effort")).toHaveText("41,00 %");
  // L'alerte se lit sur un attribut, pas seulement sur la couleur.
  await expect(page.locator('[data-indicateur="effort"]')).toHaveAttribute("data-alerte", "oui");

  const bandeau = page.locator("[data-non-conforme]");
  await expect(bandeau).toBeVisible();
  await expect(bandeau).toContainText("au-delà du plafond");
  // Le ton : on dit ce qui reste possible, on ne juge pas.
  await expect(bandeau).toContainText("marge de dérogation");
});

test("un scénario conforme n'affiche aucune alerte", async ({ page }) => {
  await page.goto("/credit");
  await expect(page.locator("[data-non-conforme]")).toHaveCount(0);
  await expect(page.locator('[data-indicateur="effort"]')).toHaveAttribute("data-alerte", "non");
});

test("la répartition couvre toute la barre", async ({ page }) => {
  await page.goto("/credit");
  // `evaluateAll` n'attend rien : il rend la liste telle qu'elle est à l'instant
  // où il s'exécute. Le module vit sous `Suspense` et n'apparaît qu'une fois
  // hydraté — sans cette attente, le test lit une page encore vide et échoue
  // d'autant plus souvent que le paquet client grossit.
  await page.locator("[data-poste]").first().waitFor();

  const largeurs = await page.locator("[data-poste]").evaluateAll((noeuds) =>
    noeuds.map((n) => parseFloat((n as HTMLElement).style.width)),
  );
  expect(largeurs).toHaveLength(4);
  const somme = largeurs.reduce((a, b) => a + b, 0);
  expect(Math.abs(somme - 100)).toBeLessThan(0.5);
});

test("une URL trafiquée ne fait pas dérailler le calcul", async ({ page }) => {
  await page.goto("/credit?tx=999&du=-5&px=abc");

  // Le taux est ramené dans ses bornes, la durée aussi, le prix illisible retombe
  // au défaut. Aucune valeur affichée n'est NaN ni vide.
  for (const cle of ["mensualite", "cout", "taeg", "effort", "assurance"]) {
    const texte = await indicateur(page, cle).textContent();
    expect(texte, `indicateur ${cle} vide`).toBeTruthy();
    expect(texte, `indicateur ${cle} = ${texte}`).not.toContain("NaN");
  }
});

test("le module reste lisible sans débordement horizontal", async ({ page }) => {
  await page.goto(TENDU);
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(deborde, "la page défile latéralement").toBe(false);
});
