import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * LE GLOSSAIRE ET LE CHEMIN QUI Y MÈNE — `CNT-001`
 *
 * Deux choses se vérifient ici, et aucune ne se voit dans un test unitaire.
 *
 * 1. LE CHEMIN DEPUIS LA BULLE. La bulle se ferme à la perte de focus et au
 *    départ de la souris. Un lien posé dedans est donc, par défaut, un lien
 *    qu'on ne peut pas atteindre : au clavier il disparaît avant de recevoir le
 *    focus, à la souris il disparaît sous le curseur qui descend vers lui. Les
 *    deux gestes sont donc joués pour de vrai — `page.mouse.move` avec des pas
 *    intermédiaires, et non un saut, sans quoi le vide entre la pastille et la
 *    bulle ne serait jamais traversé.
 *
 * 2. LA CIBLE DU LIEN. Une ancre se calcule ; rien ne garantit qu'elle existe
 *    sur la page d'arrivée. Le dernier test relève TOUS les liens de TOUTES les
 *    bulles et vérifie que chacun tombe sur une définition.
 */

const pastilles = (page: Page): Locator => page.getByRole("button", { name: /^Qu'est-ce que/ });

/** Le lien discret posé au bas de la bulle ouverte. */
const lienDeBulle = (page: Page): Locator => page.locator("[data-lien-glossaire]");

/** L'ancre d'une adresse « /glossaire#taux-d-usure ». */
const ancreDe = (href: string): string => href.slice(href.indexOf("#") + 1);

test.describe("la page", () => {
  test("s'affiche, titrée, datée de son millésime", async ({ page }) => {
    await page.goto("/glossaire");
    await expect(page.locator("h1")).toHaveText("Glossaire");
    // Le millésime vient de `params.ts`. Une page de contenu réglementaire qui
    // ne dit pas sur quel millésime elle porte ne se vérifie pas.
    await expect(page.locator("main")).toContainText("millésime 2026");
    await expect(page.locator("main")).toContainText("2026-T3");
  });

  test("chaque terme de l'index mène à une définition de la page", async ({ page }) => {
    await page.goto("/glossaire");

    const index = page.locator("[data-index-glossaire] a");
    const total = await index.count();
    // Le glossaire du seul module crédit en comptait dix-neuf ; `CNT-001` ouvre
    // le vocabulaire des frais, des aides et de la revente.
    expect(total).toBeGreaterThan(40);

    for (let i = 0; i < total; i++) {
      const href = (await index.nth(i).getAttribute("href")) ?? "";
      expect(href, `entrée d'index ${i} sans ancre`).toMatch(/^#[a-z0-9-]+$/);
      const cible = page.locator(`[id="${href.slice(1)}"]`);
      await expect(cible, `l'index pointe sur « ${href} », qui n'existe pas`).toHaveCount(1);
    }
  });

  test("aucune valeur réglementaire n'est restée à l'état de jeton", async ({ page }) => {
    await page.goto("/glossaire");
    const texte = await page.locator("main").innerText();
    // « {plafond} » au lieu de « 25 ans » : le contenu attendait une valeur qui
    // ne lui a pas été passée, et la page l'annonce en toutes lettres.
    expect(texte).not.toMatch(/\{\w+\}/);
    // Et les valeurs sont bien là : la page cite les plafonds du millésime.
    expect(texte).toContain("25 ans");
    expect(texte).toContain("35,0 %");
  });

  test("la famille d'un terme n'est jamais portée par la seule couleur", async ({ page }) => {
    await page.goto("/glossaire");

    const etiquettes = page.locator("[data-famille]");
    const total = await etiquettes.count();
    expect(total).toBeGreaterThan(0);

    for (let i = 0; i < total; i++) {
      const famille = await etiquettes.nth(i).getAttribute("data-famille");
      const texte = (await etiquettes.nth(i).innerText()).trim().toLowerCase();
      // L'étiquette dit le mot. Un lecteur qui ne distingue pas le laiton du
      // gris lit quand même « négociable ».
      expect(texte, `étiquette ${i} muette`).not.toBe("");
      expect(["négociable", "contraint", "réglementaire"]).toContain(texte);
      expect(famille).toBeTruthy();
    }
  });

  test("elle est atteignable depuis le pied de page du simulateur", async ({ page }) => {
    await page.goto("/credit");
    await page.locator('[data-pied] a[href="/glossaire"]').click();
    await expect(page.locator("h1")).toHaveText("Glossaire");
  });
});

test.describe("le chemin depuis la bulle", () => {
  test("au clavier, le lien reçoit le focus sans que la bulle se referme", async ({ page }) => {
    await page.goto("/credit");

    const pastille = pastilles(page).first();
    await pastille.scrollIntoViewIfNeeded();
    await pastille.focus();
    await expect(page.getByRole("note")).toBeVisible();

    // LE POINT DÉLICAT. La bulle se fermait au `blur` du bouton : tabuler vers
    // le lien le détruisait avant qu'il ne reçoive le focus, et la tabulation
    // atterrissait sur le contrôle suivant.
    await page.keyboard.press("Tab");
    await expect(lienDeBulle(page), "la bulle s'est refermée à la tabulation").toBeVisible();
    await expect(lienDeBulle(page)).toBeFocused();

    const href = (await lienDeBulle(page).getAttribute("href")) ?? "";
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(new RegExp(`/glossaire#${ancreDe(href)}$`));
    const cible = page.locator(`[id="${ancreDe(href)}"]`);
    await expect(cible).toBeVisible();
    await expect(cible, "l'ancre n'a pas amené la définition à l'écran").toBeInViewport();
  });

  test("Échap depuis le lien referme la bulle et rend le focus à la pastille", async ({ page }) => {
    await page.goto("/credit");

    const pastille = pastilles(page).first();
    await pastille.scrollIntoViewIfNeeded();
    await pastille.focus();
    await page.keyboard.press("Tab");
    await expect(lienDeBulle(page)).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("note")).toBeHidden();
    // Sans reprise explicite, le focus resterait sur un élément démonté et la
    // tabulation suivante repartirait du début du document.
    await expect(pastille).toBeFocused();
  });

  test("à la souris, la bulle survit au trajet de la pastille vers le lien", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "le survol n'existe pas au toucher");
    await page.goto("/credit");

    const pastille = pastilles(page).first();
    await pastille.scrollIntoViewIfNeeded();
    await pastille.hover();
    await expect(page.getByRole("note")).toBeVisible();

    const depart = await pastille.boundingBox();
    const arrivee = await lienDeBulle(page).boundingBox();
    expect(depart).not.toBeNull();
    expect(arrivee).not.toBeNull();

    // EN PAS, ET NON D'UN SAUT. Un déplacement direct ne produit qu'un
    // `mousemove` à l'arrivée et ne traverse jamais les sept pixels de vide
    // entre la pastille et la bulle — c'est-à-dire précisément le défaut.
    await page.mouse.move(
      arrivee!.x + arrivee!.width / 2,
      arrivee!.y + arrivee!.height / 2,
      { steps: 20 },
    );
    await expect(lienDeBulle(page), "la bulle s'est fermée pendant le trajet").toBeVisible();

    const href = (await lienDeBulle(page).getAttribute("href")) ?? "";
    await page.mouse.down();
    await page.mouse.up();

    await expect(page).toHaveURL(new RegExp(`/glossaire#${ancreDe(href)}$`));
    await expect(page.locator(`[id="${ancreDe(href)}"]`)).toBeInViewport();
  });

  test("au toucher, un appui ouvre la bulle et un second suit le lien", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "geste propre au tactile");
    await page.goto("/credit");

    const pastille = pastilles(page).first();
    await pastille.scrollIntoViewIfNeeded();
    await pastille.tap();
    await expect(lienDeBulle(page)).toBeVisible();

    const href = (await lienDeBulle(page).getAttribute("href")) ?? "";
    await lienDeBulle(page).tap();
    await expect(page).toHaveURL(new RegExp(`/glossaire#${ancreDe(href)}$`));
    await expect(page.locator(`[id="${ancreDe(href)}"]`)).toBeInViewport();
  });

  test("aucun lien de bulle ne tombe dans le vide", async ({ page }) => {
    // Une ancre se CALCULE à partir du terme. Rien ne garantit qu'elle existe
    // sur la page d'arrivée : un terme renommé d'un côté et pas de l'autre
    // produirait des liens qui mènent en haut de page, sans aucune erreur.
    const attendues = new Set<string>();

    for (const adresse of ["/credit", "/composants"]) {
      await page.goto(adresse);
      await pastilles(page).first().waitFor();
      const total = await pastilles(page).count();
      expect(total, `aucune pastille sur ${adresse}`).toBeGreaterThan(0);

      for (let i = 0; i < total; i++) {
        const pastille = pastilles(page).nth(i);
        await pastille.scrollIntoViewIfNeeded();
        await pastille.focus();
        const lien = lienDeBulle(page);
        await expect(lien, `bulle ${i} de ${adresse} sans lien vers le glossaire`).toBeVisible();
        const href = (await lien.getAttribute("href")) ?? "";
        expect(href, `lien mal formé sur ${adresse}`).toMatch(/^\/glossaire#[a-z0-9-]+$/);
        attendues.add(ancreDe(href));
        await page.keyboard.press("Escape");
      }
    }

    expect(attendues.size).toBeGreaterThan(5);

    await page.goto("/glossaire");
    for (const id of attendues) {
      await expect(
        page.locator(`[id="${id}"]`),
        `« ${id} » est visé par une bulle mais absent du glossaire`,
      ).toHaveCount(1);
    }
  });
});
