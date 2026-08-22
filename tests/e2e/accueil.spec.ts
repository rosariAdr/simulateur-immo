import { expect, test } from "@playwright/test";

/**
 * PAGE D'ACCUEIL
 *
 * La page d'accueil est le seul endroit où le produit se présente, et c'est
 * donc le seul endroit où il peut mentir. Trois choses s'y vérifient et nulle
 * part ailleurs :
 *
 *   — la taxonomie des paramètres y est énoncée en toutes lettres, parce que
 *     c'est l'apport pédagogique central (docs/CONTEXT.md §3) et qu'une teinte
 *     de bordure ne se lit pas pour tout le monde ;
 *   — le chemin vers le calcul existe réellement, cliqué et suivi jusqu'au
 *     bout — c'est le critère de sortie de la v0.1 (docs/RELEASES.md §1) ;
 *   — les quatre modules annoncés et non livrés ne se présentent pas comme
 *     disponibles. Un produit dont l'argument est l'honnêteté du calcul ne peut
 *     pas commencer par un lien mort.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("la page annonce ce que fait le site avant tout le reste", async ({ page }) => {
  // Un seul titre de niveau 1, et il porte la thèse : le site n'existe pas pour
  // rendre un nombre, il existe pour dire d'où le nombre vient.
  const titre = page.getByRole("heading", { level: 1 });
  await expect(titre).toHaveCount(1);
  await expect(titre).toContainText("explique");
  // Les deux promesses du brief §2 : réunir les calculs, expliquer les paramètres.
  await expect(page.locator("body")).toContainText("acquisition immobilière");
});

test("les trois familles sont nommées en toutes lettres, jamais par la seule couleur", async ({
  page,
}) => {
  const attendu = {
    negociable: "négociable",
    contraint: "contraint",
    reglementaire: "réglementaire",
  } as const;

  const cartes = page.locator("[data-famille]");
  await expect(cartes).toHaveCount(3);

  for (const [cle, mot] of Object.entries(attendu)) {
    const carte = page.locator(`[data-famille="${cle}"]`);
    await expect(carte, `la famille « ${cle} » est absente de l'accueil`).toBeVisible();
    // Le mot lui-même, pas une allusion : c'est ce qui rend la distinction
    // lisible sans percevoir le laiton, le gris ou le tireté.
    await expect(carte).toContainText(mot);
  }
});

test("chaque famille porte son message, pas seulement son nom", async ({ page }) => {
  // Une famille sans message n'apprend rien : elle range sans expliquer.
  await expect(page.locator('[data-famille="negociable"]')).toContainText("marge de manœuvre");
  await expect(page.locator('[data-famille="contraint"]')).toContainText("leviers de votre projet");
  await expect(page.locator('[data-famille="reglementaire"]')).toContainText("le mur");
});

test("le lien vers le crédit mène vraiment au module crédit", async ({ page }) => {
  // Cliqué et suivi, pas seulement présent dans le balisage : un href correct
  // vers une route absente passerait une vérification d'attribut.
  await page.locator("[data-vers-credit]").click();
  await expect(page).toHaveURL(/\/credit$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("crédit");
});

test("les modules à venir ne sont ni cliquables ni annoncés comme disponibles", async ({ page }) => {
  const aVenir = page.locator('[data-module][data-etat="a-venir"]');
  const total = await aVenir.count();
  expect(total, "aucun module à venir n'est listé").toBeGreaterThan(0);

  for (let i = 0; i < total; i++) {
    const carte = aVenir.nth(i);
    const cle = await carte.getAttribute("data-module");
    // Ni lien, ni bouton, ni contrôle : rien qui promette une réponse au clic.
    await expect(carte.getByRole("link"), `le module ${cle} est cliquable`).toHaveCount(0);
    await expect(carte.getByRole("button"), `le module ${cle} porte un bouton`).toHaveCount(0);
    // Et la mention est écrite, pas suggérée par un gris.
    await expect(carte, `le module ${cle} ne dit pas qu'il est à venir`).toContainText(/à venir/i);
  }
});

test("le seul module ouvert est le crédit", async ({ page }) => {
  const enLigne = page.locator('[data-module][data-etat="en-ligne"]');
  await expect(enLigne).toHaveCount(1);
  await expect(enLigne).toHaveAttribute("data-module", "credit");

  // Toute la page ne mène qu'à /credit : pas de route inventée par optimisme.
  //
  // Le bandeau d'avertissement est exclu du décompte : il appartient à la mise en
  // page, pas à l'accueil, il figure sur toutes les routes, et son lien vers
  // /avertissement est précisément ce que LEG-002 exige. Le restreindre au `main`
  // dit ce que le test veut dire — l'accueil ne promet aucun écran qui n'existe pas.
  const cibles = await page.locator("main a[href]").evaluateAll((liens) =>
    liens.map((l) => (l as HTMLAnchorElement).getAttribute("href")),
  );
  expect(cibles.length, "aucun lien dans le contenu de l'accueil").toBeGreaterThan(0);
  for (const cible of cibles) {
    expect(cible, `lien inattendu vers ${cible}`).toBe("/credit");
  }
});

test("la gratuité, l'absence de compte et le lien partageable sont dits", async ({ page }) => {
  const texte = (await page.locator("body").innerText()).toLowerCase();
  expect(texte).toContain("sans compte");
  expect(texte).toContain("gratuit");
  // La conséquence de l'état dans l'URL, et la promesse qui en découle.
  expect(texte).toContain("lien");
});

test("la page ne recommande rien à personne", async ({ page }) => {
  // Interdit éditorial du produit, docs/CONTEXT.md §8 : il calcule, l'utilisateur
  // décide. Une accroche qui glisserait vers l'injonction se voit ici.
  const texte = await page.locator("body").innerText();
  for (const tournure of [/vous devriez/i, /nous (vous )?recommandons/i, /le meilleur choix/i]) {
    expect(texte, `tournure prescriptive : ${tournure}`).not.toMatch(tournure);
  }
});

test("la page ne déborde jamais horizontalement", async ({ page }) => {
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(deborde, "la page défile latéralement").toBe(false);
});
