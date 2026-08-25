import { expect, test, type Page } from "@playwright/test";

/**
 * CRITÈRE DE SORTIE DE v0.3.0 — `TST-030`
 *
 * `docs/RELEASES.md` l'énonce ainsi :
 *
 *   « Le site répond à la question qu'il pose, en montrant les hypothèses qui
 *     portent la réponse et en laissant l'utilisateur les changer. Et il dit en
 *     quoi sa réponse est fausse : la comparaison de coût mensuel ignore que la
 *     part de capital d'une mensualité n'est pas une dépense, et le produit doit
 *     l'énoncer avant que le lecteur ne s'en aperçoive. »
 *
 * Comme `parcours-v0-1` et `parcours-v0-2`, ce fichier l'**exécute**. Un critère
 * qu'on coche à la main est un critère qu'on coche de mémoire à la version
 * suivante, et une version se juge sur ce qu'elle fait, pas sur ce qu'on croit
 * qu'elle fait.
 *
 * Il ne remplace ni `comparaison.spec.ts` ni `patrimoine.spec.ts`, qui mesurent
 * chacun leur écran. Il traverse le produit d'un bout à l'autre — de quelqu'un
 * qui ne sait rien jusqu'à quelqu'un qui a changé une hypothèse et vu la réponse
 * bouger — ce qu'aucun d'eux ne fait.
 *
 * ═══ LA PHRASE SE DÉCOUPE EN QUATRE EXIGENCES ═══
 *
 *   1. le site RÉPOND à la question qu'il pose ;
 *   2. en MONTRANT les hypothèses qui portent la réponse ;
 *   3. en laissant l'utilisateur les CHANGER — et la réponse doit bouger ;
 *   4. et il DIT EN QUOI sa réponse est fausse, avant que le lecteur ne s'en
 *      aperçoive.
 *
 * La quatrième est la seule qui puisse être satisfaite « sur le papier » par un
 * paragraphe que personne ne lit. Elle est donc vérifiée par la POSITION dans le
 * document et non par la présence d'un texte.
 */

const ESPACE = "[\\s\\u00a0\\u202f]";
const montant = new RegExp(`\\d[\\d${ESPACE}]*,\\d{2}${ESPACE}€`);

const chiffre = (page: Page, cle: string) => page.locator(`[data-chiffre="${cle}"] [data-valeur]`);

/** La limite précède-t-elle tout chiffre, dans l'ordre du document ? */
async function limiteAvantLesChiffres(page: Page): Promise<boolean | null> {
  return page.evaluate(() => {
    const limite = document.querySelector("[data-limite]");
    const chiffres = [...document.querySelectorAll("[data-chiffre]")];
    if (!limite || chiffres.length === 0) return null;
    return chiffres.every(
      (c) => !!(limite.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
  });
}

test("le parcours complet : de l'accueil à l'hypothèse déplacée", async ({ page }) => {
  /* ── 1. Un inconnu arrive, et l'avertissement est déjà là ───────────────── */

  await page.goto("/");
  await expect(page.locator("[data-avertissement]")).toBeVisible();

  // L'accueil dit ce qui existe. Depuis `UI-014`, il le déduit de sa liste au
  // lieu de l'écrire : la carte « acheter ou louer » est ouverte parce que la
  // route existe, et pas parce que quelqu'un a pensé à décocher une mention.
  const carte = page.locator('[data-module="comparaison"][data-etat="en-ligne"]');
  await expect(carte).toHaveCount(1);
  // La carte porte deux liens depuis `UI-007` — le niveau simple et le niveau
  // approfondi. On suit le premier : ce parcours est celui de quelqu'un qui ne
  // sait rien, et le niveau approfondi n'a de sens qu'après l'autre.
  await carte.locator('a[href="/comparaison"]').click();
  await expect(page).toHaveURL(/\/comparaison$/);

  /* ── 2. Le niveau simple, et sa limite AVANT ses chiffres ───────────────── */

  await expect(page.locator("[data-limite]")).toBeVisible();

  // La phrase de `docs/03-spec-domaine.md` §2, mot pour mot. Elle n'écrit pas
  // que la comparaison a des limites : elle écrit qu'elle est faussée.
  await expect(page.locator("[data-limite]")).toContainText("Cette comparaison est faussée");
  await expect(page.locator("[data-limite]")).toContainText("n'est pas une dépense");

  expect(
    await limiteAvantLesChiffres(page),
    "un chiffre du niveau simple précède la limite",
  ).toBe(true);

  // Et la bascule des deux lectures vit DANS ce bloc : on ne change pas de façon
  // de compter sans traverser la raison d'être du choix (ADR-015).
  await expect(page.locator("[data-limite] [data-bascule-lecture]")).toHaveCount(1);
  await expect(page.locator("[data-bascule-lecture]")).toHaveCount(1);

  const coutSimple = await chiffre(page, "proprietaire").textContent();
  expect(coutSimple, "le niveau simple n'affiche pas de montant").toMatch(montant);

  /* ── 3. Le passage au niveau approfondi ─────────────────────────────────── */

  const versPatrimoine = page.locator("[data-vers-patrimoine]");
  await expect(versPatrimoine, "aucun chemin vers le niveau approfondi").toHaveCount(1);
  await versPatrimoine.click();
  await expect(page).toHaveURL(/\/comparaison\/patrimoine/);

  /* ── 4. LE SITE RÉPOND — exigence 1 ─────────────────────────────────────── */

  // Deux patrimoines chiffrés, et le retournement dit en toutes lettres que
  // l'un ne remplace pas l'autre.
  await expect(chiffre(page, "proprietaire")).toHaveText(montant);
  await expect(chiffre(page, "locataire")).toHaveText(montant);

  const bascule = page.locator("[data-bascule]");
  await expect(bascule).toContainText("Niveau simple");
  await expect(bascule).toContainText("Niveau approfondi");
  // La conclusion que le produit refuse de tirer, écrite à la place de celle
  // qu'il pourrait tirer. C'est l'interdit éditorial de `docs/CONTEXT.md` §8
  // rendu visible plutôt que seulement respecté.
  await expect(page.locator("[data-retournement]")).toContainText("ne se calcule pas");

  /* ── 5. LES HYPOTHÈSES SONT MONTRÉES — exigence 2 ───────────────────────── */

  // Les deux nombres que personne ne connaît sont dans le bloc de limite, et
  // nulle part ailleurs (ADR-020). Sortir un curseur de là rendrait la réserve
  // contournable, exactement comme une limite placée sous les courbes.
  for (const id of ["appreciation", "rendement"]) {
    await expect(
      page.locator(`[data-limite] #${id}`),
      `l'hypothèse ${id} n'est pas dans le bloc de limite`,
    ).toHaveCount(1);
  }

  // Et elles se montrent pour ce qu'elles sont : un intervalle observé, une
  // fiabilité, et l'aveu qu'aucune valeur centrale n'est publiée.
  await expect(page.locator("[data-intervalle]").first()).toContainText("Intervalle observé");
  await expect(page.locator("[data-fiabilite]").first()).toBeVisible();
  await expect(page.locator("[data-sans-valeur-centrale]").first()).toContainText(
    "Aucune valeur centrale",
  );

  /* ── 6. L'UTILISATEUR PEUT LES CHANGER — exigence 3 ─────────────────────── */

  const avant = await chiffre(page, "proprietaire").textContent();

  // On déplace l'appréciation du bien vers le bas de son intervalle. C'est
  // l'hypothèse que l'écran désigne lui-même comme « de très loin la plus
  // sensible » ; si la réponse ne bouge pas ici, elle ne bouge nulle part.
  const appreciation = page.locator("#appreciation");
  await appreciation.fill("-2");
  await appreciation.blur();

  await expect
    .poll(
      async () => chiffre(page, "proprietaire").textContent(),
      { message: "le patrimoine du propriétaire ne réagit pas à l'hypothèse" },
    )
    .not.toBe(avant);

  // Le scénario est dans l'adresse : c'est la promesse centrale du produit, et
  // elle doit tenir sur le second niveau comme sur le premier.
  const partage = page.url();
  const apres = await chiffre(page, "proprietaire").textContent();
  await page.goto(partage);
  await expect(chiffre(page, "proprietaire")).toHaveText(apres ?? "");

  /* ── 7. LE SITE DIT EN QUOI IL SE TROMPE — exigence 4 ───────────────────── */

  // Même règle qu'au niveau simple, et c'est ce qui compte : la réserve n'est
  // pas un paragraphe en bas de page, elle est devant.
  expect(
    await limiteAvantLesChiffres(page),
    "un chiffre du niveau approfondi précède sa limite",
  ).toBe(true);

  await expect(page.locator("[data-limite]")).toContainText("que personne ne connaît");

  // L'incertitude est chiffrée, pas seulement annoncée. C'est la différence
  // entre « ces chiffres sont incertains » et « voici de combien ».
  await expect(page.locator("[data-incertitude]")).toContainText(montant);

  // Ce que cette étape garde n'a pas bougé : l'état des sorties est dit
  // honnêtement, jamais promis. À la sortie de v0.3.0, l'état vrai était
  // « n'existe pas dans ce simulateur » ; depuis le 25 août 2026 (`UI-025`,
  // v0.3.1), les trois sorties sont chiffrées, et c'est cela que l'écran doit
  // dire — toujours sans « à venir ».
  const sorties = page.locator("[data-trois-sorties]");
  await expect(sorties).toContainText(/Les trois sont chiffrées ici/i);
  await expect(sorties).not.toContainText(/à venir|bientôt|prochainement/i);
});

test("aucun écran de la version ne recommande quoi que ce soit", async ({ page }) => {
  /*
    L'interdit éditorial du produit — `docs/CONTEXT.md` §8 : il calcule, et
    l'utilisateur décide. Cette version est celle où il devient le plus tentant
    de déraper, parce qu'elle répond enfin à une question de choix.

    La liste s'est allongée à chaque écran qui pouvait déraper autrement. Elle
    lit la page telle qu'elle s'affiche, avertissement et pied de page compris.
  */
  const TOURNURES = [
    /vous devriez/i,
    /nous (vous )?recommandons/i,
    /le meilleur choix/i,
    /il vaut mieux/i,
    /mieux vaut/i,
    /plus rentable/i,
    /plus avantageux/i,
    /l'emporte/i,
    /gagnant/i,
    /vous avez intérêt/i,
    /le bon moment pour (acheter|vendre)/i,
  ];

  for (const route of ["/", "/credit", "/comparaison", "/comparaison/patrimoine"]) {
    await page.goto(route);
    await expect(page.locator("[data-avertissement]")).toBeVisible();

    const texte = await page.locator("body").innerText();
    for (const tournure of TOURNURES) {
      expect(texte, `${route} : tournure prescriptive ${tournure}`).not.toMatch(tournure);
    }
  }
});

test("les deux niveaux se parcourent dans les deux sens", async ({ page }) => {
  // Un chemin qui ne va que dans un sens laisse le lecteur au bout d'une
  // impasse, et le second niveau n'a de sens qu'en regard du premier.
  await page.goto("/comparaison");
  await page.locator("[data-vers-patrimoine]").click();
  await expect(page).toHaveURL(/\/comparaison\/patrimoine/);

  await page.locator("[data-vers-comparaison]").first().click();
  await expect(page).toHaveURL(/\/comparaison(\?|$)/);
});
