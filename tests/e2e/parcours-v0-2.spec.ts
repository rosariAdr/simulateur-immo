import { expect, test } from "@playwright/test";

/**
 * CRITÈRE DE SORTIE DE v0.2.0 — `TST-020`
 *
 * `docs/RELEASES.md` l'énonce ainsi :
 *
 *   « Le même parcours qu'en v0.1, mené au pouce sur un téléphone, sans jamais
 *     avoir à zoomer ni à viser — et un terme technique explicable partout où il
 *     apparaît. »
 *
 * Comme `parcours-v0-1.spec.ts`, ce fichier l'exécute au lieu de l'affirmer. Il ne
 * remplace pas `mobile.spec.ts` ni `infobulles.spec.ts`, qui mesurent chacun leur
 * écran : il traverse le produit d'un bout à l'autre, ce qu'aucun d'eux ne fait.
 *
 * « Au pouce » n'est pas une figure de style. Les gestes passent donc par `tap()`
 * et non par `click()` : sur un écran tactile, un appui produit une rafale
 * d'événements que le clic simulé ne reproduit pas, et c'est précisément là que la
 * pastille se cassait avant `UI-005`.
 */

/** Seuil de cible tactile, WCAG 2.2 § 2.5.8 (niveau AA). */
const CIBLE_MINIMALE = 24;

// Le profil `mobile` de `playwright.config.mts` EST un Pixel 7 tactile. On s'y
// restreint plutôt que de redéclarer l'appareil ici : Playwright refuse un
// `test.use` d'appareil dans un groupe, et surtout deux définitions du même
// téléphone finiraient par diverger sans que rien ne le signale.
test.describe("au pouce, sur un téléphone", () => {
  // `isMobile` vient de l'appareil déclaré par le profil, pas de son nom : c'est
  // la propriété qui compte, et elle survivrait à un renommage du profil.
  test.skip(
    ({ isMobile }) => !isMobile,
    "le parcours au pouce n'a de sens que sur un profil tactile",
  );

  test("le parcours complet, de l'accueil au terme expliqué", async ({ page }) => {
    /* ── 1. L'accueil, et l'avertissement avant tout ───────────────────────── */

    await page.goto("/");
    await expect(page.locator("[data-avertissement]")).toBeVisible();

    await page.locator("[data-vers-credit]").first().tap();
    await expect(page).toHaveURL(/\/credit$/);

    /* ── 2. Les chiffres se lisent sans zoomer ─────────────────────────────── */

    const mensualite = page.locator('[data-indicateur="mensualite"] [data-valeur]');
    await expect(mensualite).toBeVisible();

    // Aucun montant rogné : un montant tronqué ressemble encore à un montant.
    const rognes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-valeur], [data-tableau] td, [data-lecture]")]
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => (el.textContent ?? "").trim())
        .slice(0, 5),
    );
    expect(rognes, "montants rognés au pouce").toEqual([]);

    /* ── 3. On vise sans viser ─────────────────────────────────────────────── */

    const cibles = await page.evaluate((minimum) => {
      const trop: string[] = [];
      const selecteurs = ["[data-annee]", "select", '[role="radio"]', "button[type=button]"];
      for (const sel of selecteurs) {
        for (const el of document.querySelectorAll<HTMLElement>(sel)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (Math.min(r.width, r.height) < minimum) {
            trop.push(`${sel} ${Math.round(r.width)}×${Math.round(r.height)}`);
          }
        }
      }
      return trop;
    }, CIBLE_MINIMALE);

    // La pastille « i » est la seule exception connue, et elle a son ticket :
    // agrandir sa boîte casse la mesure d'alignement de la bulle. On la sort du
    // décompte explicitement plutôt que de baisser le seuil, pour que la dette
    // reste visible ici.
    const horsPastille = cibles.filter((c) => !c.startsWith("button[type=button] 15×15"));
    expect(horsPastille, "cibles tactiles sous 24 px").toEqual([]);

    /* ── 4. Un terme technique s'explique là où il apparaît ────────────────── */

    const pastille = page.locator("[data-indicateur] button[aria-expanded]").first();
    await pastille.tap();

    const bulle = page.getByRole("note");
    await expect(bulle, "la bulle ne s'ouvre pas au toucher").toBeVisible();

    // Et elle tient dans l'écran : une bulle hors cadre est une bulle illisible.
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(deborde, "la bulle fait déborder la page").toBe(false);

    /* ── 5. De la bulle au glossaire, puis à la fiche ──────────────────────── */

    await page.locator("[data-lien-glossaire]").first().tap();
    await expect(page).toHaveURL(/\/glossaire/);
    await expect(page.locator("[data-terme]").first()).toBeVisible();

    await page.goto("/credit");
    await page.locator("[data-vers-fiche]").first().tap();
    await expect(page).toHaveURL(/\/credit\/comprendre$/);
    await expect(page.locator("h1")).toBeVisible();
  });
});

test("chaque écran qui montre un chiffre porte l'avertissement et le pied de page", async ({
  page,
}) => {
  // La liste s'allonge à chaque version. C'est la garde qui empêche qu'un écran
  // naisse sans ce qui le rend publiable.
  for (const route of ["/", "/credit", "/credit/comprendre", "/glossaire", "/composants"]) {
    await page.goto(route);
    await expect(page.locator("[data-avertissement]"), route).toBeVisible();
    await expect(page.locator("[data-pied]"), route).toBeVisible();
  }
});
