import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * INFOBULLES PÉDAGOGIQUES — `UI-005`
 *
 * Ces tests portent sur trois choses qu'aucune autre suite ne peut voir.
 *
 * 1. LE TOUCHER. La bulle s'ouvrait au focus puis se refermait au clic — deux
 *    événements du MÊME appui sur un écran tactile. Elle clignotait et restait
 *    fermée : sur téléphone, la pédagogie du produit était inaccessible. Le
 *    test s'exécute sur le profil `mobile`, seul endroit où le défaut existe.
 *
 * 2. LE DÉBORDEMENT. La bulle était ancrée à gauche, largeur fixe : posée sur
 *    la dernière colonne du bandeau, elle sortait de la fenêtre et faisait
 *    défiler la page latéralement. Le test mesure, il ne juge pas à l'œil.
 *
 * 3. LES VALEURS RÉGLEMENTAIRES. Un contenu d'infobulle ne les écrit pas, il
 *    les reçoit. Le test vérifie qu'aucune bulle n'affiche un jeton resté sans
 *    valeur, et que celle de la durée cite bien les plafonds du millésime.
 */

/** Toutes les pastilles de la page, dans l'ordre du document. */
const pastilles = (page: Page): Locator => page.getByRole("button", { name: /^Qu'est-ce que/ });

/**
 * La largeur défilable de la page, et celle qui tient à l'écran. Le test les
 * rapporte toutes les deux : « la page déborde » se corrige mal, « 1458 contre
 * 1280 » dit tout de suite de combien et sur quel bord.
 */
const mesurerLargeurs = (page: Page): Promise<{ defilable: number; visible: number }> =>
  page.evaluate(() => ({
    defilable: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }));

/** Un pixel de tolérance pour les arrondis de rendu. */
async function attendreAucunDebordement(page: Page, quoi: string): Promise<void> {
  const { defilable, visible } = await mesurerLargeurs(page);
  expect(defilable, `${quoi} : ${defilable} px défilables pour ${visible} px visibles`).toBeLessThanOrEqual(
    visible + 1,
  );
}

test.describe("ouverture", () => {
  test("un appui du doigt ouvre la bulle et l'y laisse", async ({ page, isMobile }) => {
    test.skip(!isMobile, "le défaut n'existe qu'au toucher");
    await page.goto("/credit");

    const pastille = pastilles(page).first();
    await pastille.scrollIntoViewIfNeeded();
    await pastille.tap();

    // Un seul appui produit une rafale : pointerdown, focus, les événements
    // souris de compatibilité, puis click. Si l'un d'eux referme ce qu'un autre
    // vient d'ouvrir, la bulle disparaît dans la milliseconde qui suit.
    const bulle = page.getByRole("note");
    await expect(bulle).toBeVisible();
    await expect(pastille).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(300);
    await expect(bulle, "la bulle s'est refermée toute seule").toBeVisible();
  });

  test("un second appui la referme", async ({ page, isMobile }) => {
    test.skip(!isMobile, "le défaut n'existe qu'au toucher");
    await page.goto("/credit");

    const pastille = pastilles(page).first();
    await pastille.scrollIntoViewIfNeeded();
    await pastille.tap();
    await expect(page.getByRole("note")).toBeVisible();

    await pastille.tap();
    await expect(page.getByRole("note")).toBeHidden();
  });

  test("le clavier ouvre et Échap referme, sur les deux profils", async ({ page }) => {
    await page.goto("/credit");

    const pastille = pastilles(page).first();
    await pastille.focus();
    await expect(page.getByRole("note")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("note")).toBeHidden();
    await expect(pastille).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("la bulle reste dans la fenêtre", () => {
  test("aucune bulle ne fait défiler la page latéralement", async ({ page }) => {
    await page.goto("/credit");
    await attendreAucunDebordement(page, "la page, toutes bulles fermées");

    const total = await pastilles(page).count();
    expect(total).toBeGreaterThan(0);

    for (let i = 0; i < total; i++) {
      const pastille = pastilles(page).nth(i);
      const intitule = await pastille.getAttribute("aria-label");
      await pastille.scrollIntoViewIfNeeded();
      await pastille.focus();

      const bulle = page.getByRole("note");
      await expect(bulle).toBeVisible();

      // Deux mesures : la page dans son ensemble, et la bulle elle-même. La
      // première attrape le débordement, la seconde dit de quel côté.
      await attendreAucunDebordement(page, `bulle de ${intitule}`);

      const boite = await bulle.boundingBox();
      const largeurFenetre = page.viewportSize()?.width ?? 0;
      expect(boite, `${intitule} : bulle sans boîte`).not.toBeNull();
      expect(boite!.x, `${intitule} déborde à gauche`).toBeGreaterThanOrEqual(-1);
      expect(boite!.x + boite!.width, `${intitule} déborde à droite`).toBeLessThanOrEqual(
        largeurFenetre + 1,
      );

      await page.keyboard.press("Escape");
    }
  });

  test("la bulle du bord droit se recale au lieu de sortir du cadre", async ({ page }) => {
    await page.goto("/composants");

    // La galerie pose deux pastilles aux deux extrémités d'une même ligne :
    // c'est le cas limite, et il est reproductible quelle que soit la largeur.
    const droite = page.locator('[data-cas="bord-droit"]').getByRole("button");
    await droite.scrollIntoViewIfNeeded();
    await droite.focus();

    const bulle = page.locator("[data-bulle]");
    await expect(bulle).toHaveAttribute("data-placement", "recalee");

    const boitePastille = await droite.boundingBox();
    const boiteBulle = await bulle.boundingBox();
    const cadre = page.viewportSize()?.width ?? 0;
    // Recalée vers la gauche, et pas seulement basculée : au bord droit d'un
    // téléphone, une bulle simplement ancrée à droite ressortirait par la gauche.
    expect(boiteBulle!.x).toBeLessThan(boitePastille!.x);
    expect(boiteBulle!.x).toBeGreaterThanOrEqual(-1);
    expect(boiteBulle!.x + boiteBulle!.width).toBeLessThanOrEqual(cadre + 1);
    await attendreAucunDebordement(page, "bulle du bord droit");
  });

  test("là où elle tient, la bulle reste alignée sur sa pastille", async ({ page, isMobile }) => {
    // Sur 412 px, une bulle de 264 px ne tient alignée nulle part ou presque :
    // le cas n'a de sens que sur un écran large.
    test.skip(isMobile, "mesure propre au bureau");
    await page.goto("/composants");

    const gauche = page.locator('[data-cas="bord-gauche"]').getByRole("button");
    await gauche.focus();
    const bulle = page.locator("[data-bulle]");
    await expect(bulle).toHaveAttribute("data-placement", "alignee");

    const boitePastille = await gauche.boundingBox();
    const boiteBulle = await bulle.boundingBox();
    // Le décalage nul se voit à l'écran : les deux bords gauches coïncident, au
    // pixel de bordure près. La pastille porte 6 px de marge à sa gauche.
    expect(Math.abs(boiteBulle!.x - (boitePastille!.x - 6))).toBeLessThanOrEqual(1);
  });
});

test.describe("le contenu vient du glossaire", () => {
  test("aucune bulle n'affiche un jeton resté sans valeur", async ({ page }) => {
    for (const adresse of ["/credit", "/composants"]) {
      await page.goto(adresse);
      // `count()` n'attend rien. Le module crédit vit sous `Suspense` : sans
      // cette attente, le test compte les pastilles d'une page pas encore
      // hydratée, en trouve zéro, et échoue par intermittence.
      await pastilles(page).first().waitFor();
      const total = await pastilles(page).count();
      expect(total, `aucune pastille sur ${adresse}`).toBeGreaterThan(0);

      for (let i = 0; i < total; i++) {
        const pastille = pastilles(page).nth(i);
        await pastille.scrollIntoViewIfNeeded();
        await pastille.focus();
        const texte = (await page.getByRole("note").textContent()) ?? "";
        // « {plafond} » au lieu de « 25 ans » : le contenu attendait une valeur
        // réglementaire qui ne lui a pas été passée.
        expect(texte, `jeton non substitué dans ${await pastille.getAttribute("aria-label")}`).not.toMatch(
          /\{\w+\}/,
        );
        await page.keyboard.press("Escape");
      }
    }
  });

  test("la bulle de la durée cite les plafonds du millésime, pas des nombres écrits à la main", async ({
    page,
  }) => {
    await page.goto("/credit");
    const pastille = page.getByRole("button", { name: /Qu'est-ce que « Durée » \?/ });
    await pastille.scrollIntoViewIfNeeded();
    await pastille.focus();

    const bulle = page.getByRole("note");
    // Les trois valeurs viennent de PARAMS_2026.hcsf. Si le législateur change
    // le seuil de travaux, ce test devient rouge et le texte suit tout seul.
    await expect(bulle).toContainText("25 ans");
    await expect(bulle).toContainText("27 ans");
    await expect(bulle).toContainText("10,0 %");
  });

  test("chaque bulle tient en deux phrases, la première en gras", async ({ page }) => {
    await page.goto("/credit");
    const total = await pastilles(page).count();

    for (let i = 0; i < total; i++) {
      const pastille = pastilles(page).nth(i);
      await pastille.scrollIntoViewIfNeeded();
      await pastille.focus();

      const bulle = page.getByRole("note");
      const accroche = (await bulle.locator("strong").textContent()) ?? "";
      const entier = (await bulle.textContent()) ?? "";
      const suite = entier.slice(accroche.length).trim();

      // La règle de la charte, §8 : deux phrases, jamais plus. Le type du
      // glossaire l'impose déjà ; ce test vérifie qu'elle survit à l'affichage.
      expect(accroche.trim(), `accroche vide pour la bulle ${i}`).not.toBe("");
      expect(suite, `suite vide pour la bulle ${i}`).not.toBe("");
      for (const phrase of [accroche.trim(), suite]) {
        expect(phrase, `« ${phrase} » ne se termine pas`).toMatch(/[.…!?]$/);
        expect(phrase, `« ${phrase} » contient une phrase de trop`).not.toMatch(/[.…!?]\s/);
      }

      await page.keyboard.press("Escape");
    }
  });
});
