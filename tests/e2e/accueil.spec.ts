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

/**
 * Les routes que l'accueil a le droit d'annoncer.
 *
 * La garde d'origine tenait en une ligne — « le seul module ouvert est le crédit » —
 * et c'était le bon test tant qu'il n'y en avait qu'un. Elle a dû être reprise
 * délibérément à l'ouverture de la comparaison (`UI-014`) : ce qu'elle protège
 * n'est pas le nombre, c'est qu'aucune carte ne mène à un écran qui n'existe pas.
 * Ouvrir un module se fait donc en deux gestes — le champ `lien` dans `page.tsx`,
 * et cette liste — et le second oblige à regarder le premier.
 */
const ROUTES_OUVERTES = ["/credit", "/comparaison"];

test("les modules ouverts sont exactement ceux qui ont une route", async ({ page }) => {
  const enLigne = page.locator('[data-module][data-etat="en-ligne"]');
  await expect(enLigne).toHaveCount(ROUTES_OUVERTES.length);
  await expect(enLigne.first()).toHaveAttribute("data-module", "credit");

  // Chaque carte ouverte mène là où elle dit, cliquée et suivie : un href correct
  // vers une route absente passerait une vérification d'attribut.
  // Restreint aux cartes : `/credit` est aussi la cible de l'accroche du haut de
  // page, et compter tous les liens du `main` confondrait les deux chemins.
  for (const route of ROUTES_OUVERTES) {
    const carte = page.locator(`[data-module][data-etat="en-ligne"] a[href="${route}"]`);
    await expect(carte, `aucune carte ne mène à ${route}`).toHaveCount(1);
  }

  // Et la page ne mène nulle part ailleurs : pas de route inventée par optimisme.
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
    expect(ROUTES_OUVERTES, `lien inattendu vers ${cible}`).toContain(cible);
  }
});

test("le décompte annoncé est celui des cartes affichées", async ({ page }) => {
  // La phrase d'introduction a été fausse pendant le temps qu'a duré l'oubli de
  // `UI-014` : elle annonçait un module en ligne alors que la comparaison existait.
  // Aucun test ne relisait cette phrase — celui-ci la confronte aux cartes.
  const ouverts = await page.locator('[data-module][data-etat="en-ligne"]').count();
  const aVenir = await page.locator('[data-module][data-etat="a-venir"]').count();
  const mots = ["aucun", "un", "deux", "trois", "quatre", "cinq"];

  const texte = await page.locator("section", { hasText: "Ce qui est en ligne" }).first().innerText();
  const annonceOuverts =
    ouverts === 1 ? /un seul module est en ligne/i : new RegExp(`${mots[ouverts]} modules sont en ligne`, "i");

  expect(texte, "le nombre de modules en ligne n'est pas celui qui est écrit").toMatch(annonceOuverts);

  // Et la phrase commence par une majuscule. Ce test-ci existe parce que la
  // première version ne l'avait pas : composer une phrase à partir d'un mot
  // variable — « Un seul… » ou « Deux modules… » — met le premier caractère
  // sous la responsabilité du code, et la comparaison insensible à la casse
  // qui protège les noms de modules laisse justement passer celui-là.
  const debut = texte.split("\n").find((l) => /modules? (est|sont) en ligne/i.test(l)) ?? "";
  expect(debut.charAt(0), "la phrase du décompte ne commence pas par une majuscule").toBe(
    debut.charAt(0).toUpperCase(),
  );
  expect(texte, "le nombre de modules à venir n'est pas celui qui est écrit").toMatch(
    new RegExp(`les ${mots[aVenir]} autres`, "i"),
  );

  // Et chaque module ouvert est nommé dans la phrase, pas seulement compté.
  const noms = await page.locator('[data-module][data-etat="en-ligne"] h3').allInnerTexts();
  for (const nom of noms) {
    expect(texte.toLowerCase(), `${nom} est en ligne mais la phrase ne le nomme pas`).toContain(
      nom.toLowerCase(),
    );
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
