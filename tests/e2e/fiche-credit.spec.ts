import { expect, test, type Page } from "@playwright/test";

/**
 * LA FICHE PÉDAGOGIQUE DU MODULE CRÉDIT — `CNT-002`, `/credit/comprendre`
 *
 * Ces tests ne vérifient pas une mise en page. Ils vérifient trois promesses.
 *
 * **Le fil conducteur tient.** La fiche nomme les trois familles en toutes
 * lettres, et chaque section porte la sienne. Une étiquette qui ne serait plus
 * qu'un trait coloré ne serait plus lisible par qui ne distingue pas les teintes.
 *
 * **Le chemin existe dans les deux sens.** Cliqué et suivi, pas seulement présent
 * dans un attribut `href` : un lien qu'on n'a jamais suivi est un lien qu'on
 * suppose.
 *
 * **La fiche ne recommande rien.** C'est la règle la plus importante du projet
 * (`docs/CONTEXT.md` §8), et une règle éditoriale se perd au premier paragraphe
 * réécrit de bonne foi. La garde est donc automatique, et elle lit la page telle
 * qu'elle s'affiche.
 */

const FICHE = "/credit/comprendre";

const texteDe = (page: Page) => page.locator("main").innerText();

/* ── Elle s'affiche ───────────────────────────────────────────────────────── */

test("la fiche s'affiche, titrée et datée", async ({ page }) => {
  await page.goto(FICHE);

  await expect(page.locator("h1")).toHaveText("Comprendre un crédit immobilier");
  // Un contenu pédagogique non daté ne dit pas de quel état du droit il parle.
  await expect(page.getByText(/Révision du texte : \d/)).toBeVisible();
  await expect(page.getByText(/Barèmes du millésime \d{4}/)).toBeVisible();
});

test("elle couvre les cinq notions annoncées par le ticket", async ({ page }) => {
  await page.goto(FICHE);

  for (const ancre of ["mensualite", "taeg", "assurance", "garantie", "plafonds"]) {
    await expect(
      page.locator(`[data-section="${ancre}"]`),
      `la section ${ancre} manque`,
    ).toHaveCount(1);
  }
});

test("le contenu attendu de chaque notion est bien là", async ({ page }) => {
  await page.goto(FICHE);
  const texte = await texteDe(page);

  // Les points que le ticket exige, et qu'un remaniement pourrait faire sauter
  // sans que la page cesse pour autant de s'afficher.
  expect(texte).toContain("capital restant dû");
  expect(texte).toContain("TAEG");
  expect(texte).toContain("loi du 28 février 2022");
  expect(texte).toContain("questionnaire de santé");
  expect(texte).toContain("mainlevée");
  expect(texte).toContain("Haut Conseil de stabilité financière");
  expect(texte).toContain("reste à vivre");
  // Le TAEG est plafonné, pas le taux nominal : c'est l'enseignement du module.
  expect(texte).toContain("TAEG complet");
});

test("les trois garanties sont nommées et comparées", async ({ page }) => {
  await page.goto(FICHE);

  for (const cle of ["suretyship", "mortgage", "pledge"]) {
    await expect(page.locator(`[data-garantie="${cle}"]`)).toHaveCount(1);
  }
  const texte = await texteDe(page);
  for (const nom of ["Caution", "Hypothèque", "Nantissement"]) {
    expect(texte, `${nom} n'est pas nommée`).toContain(nom);
  }
});

/* ── Le fil conducteur ────────────────────────────────────────────────────── */

test("elle nomme les trois familles en toutes lettres", async ({ page }) => {
  await page.goto(FICHE);
  const texte = (await texteDe(page)).toLowerCase();

  // En toutes lettres, et non par un trait de bordure : c'est la règle « jamais
  // d'information portée par la seule couleur », docs/06-design-system.md §6.
  for (const mot of ["négociable", "contraint", "réglementaire"]) {
    expect(texte, `« ${mot} » n'apparaît pas`).toContain(mot);
  }
});

test("chaque section rattachée à une famille porte son étiquette écrite", async ({ page }) => {
  await page.goto(FICHE);

  const etiquettes = page.locator("[data-etiquette-famille]");
  const nombre = await etiquettes.count();
  expect(nombre, "aucune section ne porte de famille").toBeGreaterThan(0);

  for (let i = 0; i < nombre; i++) {
    const etiquette = etiquettes.nth(i);
    const famille = await etiquette.getAttribute("data-etiquette-famille");
    // Le mot, pas seulement le trait. Une étiquette vide passerait inaperçue à
    // l'œil sur un fond sombre, et serait muette pour un lecteur d'écran.
    await expect(etiquette, `l'étiquette ${famille} est muette`).not.toHaveText("");
  }

  // Et les trois familles sont représentées au moins une fois dans les sections.
  for (const famille of ["negociable", "contraint", "reglementaire"]) {
    await expect(
      page.locator(`[data-etiquette-famille="${famille}"]`).first(),
      `aucune section de famille ${famille}`,
    ).toBeVisible();
  }
});

/* ── Le chemin, dans les deux sens ────────────────────────────────────────── */

test("on va du module crédit à la fiche, en cliquant", async ({ page }) => {
  await page.goto("/credit");

  const lien = page.locator("[data-vers-fiche]");
  await expect(lien).toBeVisible();
  await lien.click();

  await expect(page).toHaveURL(new RegExp(`${FICHE}$`));
  await expect(page.locator("h1")).toHaveText("Comprendre un crédit immobilier");
});

test("on revient de la fiche au module crédit, en cliquant", async ({ page }) => {
  await page.goto(FICHE);

  await page.locator('[data-lien="retour-credit"]').click();

  await expect(page).toHaveURL(/\/credit$/);
  // Et le module a bien repris : les indicateurs sont là, pas seulement l'URL.
  await expect(page.locator('[data-indicateur="mensualite"]')).toBeVisible();
});

test("le lien du chapeau mène lui aussi au simulateur", async ({ page }) => {
  await page.goto(FICHE);

  await page.locator('[data-lien="vers-credit"]').click();
  await expect(page).toHaveURL(/\/credit$/);
});

/* ── Les chiffres viennent du moteur ──────────────────────────────────────── */

test("la mensualité de la fiche est celle que le module affiche", async ({ page }) => {
  // La fiche promet « ouvrez le simulateur sans rien changer, vous retrouverez
  // les mêmes chiffres ». C'est cette promesse-là qu'on exécute, plutôt que de
  // la cocher : si les défauts du module changent, la fiche ment, et ce test
  // rougit avant le lecteur.
  await page.goto(FICHE);
  const surLaFiche = await page.locator('[data-chiffre="mensualite"]').innerText();

  await page.goto("/credit");
  const surLeModule = await page.locator('[data-indicateur="mensualite"] [data-valeur]').innerText();

  expect(surLaFiche.trim()).toBe(surLeModule.trim());
});

/* ── Elle ne recommande rien ──────────────────────────────────────────────── */

/**
 * Les tournures que le produit s'interdit.
 *
 * La même liste que `src/content/__tests__/fiche-credit.test.ts`. Elle porte la
 * règle la plus importante du projet : « dans cette configuration, l'écart est de
 * X », jamais « vous devriez ». Un texte pédagogique glisse vers le conseil sans
 * qu'on s'en aperçoive — c'est précisément pour ça que la garde est automatique.
 */
const PRESCRIPTIONS: readonly RegExp[] = [
  /\bvous devriez\b/iu,
  /\bnous (?:vous )?(?:recommandons|conseillons)\b/iu,
  /\ble meilleur choix\b/iu,
  /\bil (?:vous )?faut\b/iu,
  /\bmieux vaut\b/iu,
  /\bpréférez\b/iu,
  /\bchoisissez\b/iu,
  /\bévitez\b/iu,
  /\bn['’]hésitez pas\b/iu,
  /\bvous avez (?:tout )?intérêt à\b/iu,
];

test("aucune tournure prescriptive n'atteint le lecteur", async ({ page }) => {
  await page.goto(FICHE);
  // Le document entier, avertissement et pied de page compris : la règle ne
  // s'arrête pas à la balise `main`.
  const texte = await page.locator("body").innerText();

  for (const tournure of PRESCRIPTIONS) {
    expect(texte, `la fiche emploie ${tournure.source}`).not.toMatch(tournure);
  }
});

test("elle dit ce qu'elle ne dit pas", async ({ page }) => {
  await page.goto(FICHE);
  const texte = await texteDe(page);

  // « Se terminer par ses limites », docs/CONTEXT.md §7. Une fiche qui perdrait
  // cette section deviendrait une brochure.
  await expect(page.locator('[data-section="limites"]')).toHaveCount(1);
  expect(texte).toContain("c'est l'offre de prêt qui fait foi");
  expect(texte).toContain("ordres de grandeur");
});

/* ── Les deux profils ─────────────────────────────────────────────────────── */

test("la fiche ne déborde pas latéralement", async ({ page }) => {
  await page.goto(FICHE);

  // Les deux tableaux sont plus larges qu'un téléphone. Ils défilent dans leur
  // propre cadre ; la page, elle, ne défile pas.
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(deborde, "la page défile latéralement").toBe(false);
});

test("les tableaux larges défilent dans leur cadre, pas dans la page", async ({ page }) => {
  await page.goto(FICHE);

  for (const repere of ["[data-tableau-annees]", "[data-tableau-garanties]"]) {
    const cadreDefilable = await page.evaluate((selecteur) => {
      const table = document.querySelector(selecteur);
      const cadre = table?.parentElement;
      if (!cadre) return null;
      return getComputedStyle(cadre).overflowX;
    }, repere);
    expect(cadreDefilable, `${repere} n'est pas dans un cadre défilable`).toBe("auto");
  }
});

/*
 * L'avertissement permanent et l'absence d'indexation ne sont pas vérifiés ici :
 * la fiche affiche des chiffres, elle a donc rejoint la liste `ROUTES` de
 * `avertissement.spec.ts`, dont c'est le contrat déclaré. Deux gardes pour la
 * même propriété auraient rougi ensemble sans rien dire de plus.
 */
