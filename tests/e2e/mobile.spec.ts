import { expect, test, type Page } from "@playwright/test";

/**
 * ADAPTATION MOBILE — `UI-006`
 *
 * Ces tests mesurent trois choses qu'aucune relecture ne rattrape, parce
 * qu'elles ne se voient qu'à l'exécution et qu'à une largeur précise.
 *
 * 1. LES CIBLES TACTILES. Une barre du ruban faisait 10,6 px de large sur
 *    Pixel 7 pour un prêt de 25 ans. Le critère WCAG 2.2 § 2.5.8 en demande 24,
 *    et l'exception d'espacement ne s'applique pas : les barres se touchent. Le
 *    ruban était pointable au doigt par accident seulement.
 *
 * 2. LA LARGEUR QUI DÉCIDE. Le seuil ne porte pas sur la fenêtre mais sur le
 *    ruban lui-même : à 1 024 px de fenêtre, la colonne de résultats n'en fait
 *    que 640 et les barres y tombaient à 21,7 px — sur un ÉCRAN DE BUREAU, où
 *    personne n'avait regardé. Un point de rupture de fenêtre se serait trompé
 *    là ; une requête de conteneur ne le peut pas.
 *
 * 3. CE QU'ON VOIT EN PREMIER. Les deux colonnes s'empilaient dans l'ordre du
 *    DOM : dix champs de saisie avant le premier chiffre, alors que le scénario
 *    par défaut est déjà calculé à l'arrivée.
 *
 * Les mesures qui n'ont de sens que sur un profil portent leur `test.skip` et
 * sa raison. Les autres tournent sur les deux — une garde de cible tactile qui
 * ne s'exécuterait qu'au téléphone laisserait passer le défaut de 1 024 px.
 */

/** 25 ans : le prêt le plus long que la liste des durées propose, donc le pire cas. */
const VINGT_CINQ_ANS = "/credit?du=300";

/** Le scénario tendu porte les montants les plus larges du jeu de référence. */
const TENDU = "/credit?px=465000&ap=45000&tx=3.9&du=300&as=0.34&ga=hypotheque&fd=1500&rv=6080&ac=180";

/** Le plancher du critère WCAG 2.2 § 2.5.8, en pixels CSS. */
const CIBLE_MINIMALE = 24;

const piste = (page: Page) => page.locator('[role="radiogroup"][aria-label^="Année lue"]');

/** `row` : une colonne par année. `column` : une ligne par année. */
const axeDuRuban = (page: Page): Promise<string> =>
  piste(page).evaluate((e) => getComputedStyle(e).flexDirection);

/** La plus petite barre du ruban, dans ses deux dimensions. */
async function plusPetiteBarre(page: Page): Promise<{ largeur: number; hauteur: number; annee: string }> {
  return page.evaluate(() => {
    const barres = [...document.querySelectorAll<HTMLElement>("[data-annee]")];
    const boites = barres.map((b) => ({
      annee: b.dataset["annee"] ?? "?",
      ...b.getBoundingClientRect().toJSON(),
    }));
    const pire = boites.reduce((a, b) =>
      Math.min(b.width, b.height) < Math.min(a.width, a.height) ? b : a,
    );
    return { largeur: pire.width, hauteur: pire.height, annee: pire.annee };
  });
}

/**
 * Les éléments dont le contenu déborde de sa boîte.
 *
 * Un montant tronqué ressemble encore à un montant : c'est le seul défaut
 * d'affichage de ce produit qui puisse tromper quelqu'un sur un chiffre.
 */
const rognes = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        "[data-valeur], [data-lecture], [data-tableau] td, [data-poste]",
      ),
    ]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => `${(el.textContent ?? "").trim()} (+${el.scrollWidth - el.clientWidth} px)`)
      .slice(0, 10),
  );

const defileLateralement = (page: Page): Promise<boolean> =>
  page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );

/* ── Le ruban ─────────────────────────────────────────────────────────────── */

test("chaque année du ruban offre une cible d'au moins 24 px, sur les deux profils", async ({
  page,
}) => {
  await page.goto(VINGT_CINQ_ANS);
  await page.locator("[data-annee]").first().waitFor();
  await expect(page.locator("[data-annee]")).toHaveCount(25);

  const { largeur, hauteur, annee } = await plusPetiteBarre(page);
  expect(largeur, `année ${annee} : ${largeur.toFixed(1)} px de large`).toBeGreaterThanOrEqual(
    CIBLE_MINIMALE,
  );
  expect(hauteur, `année ${annee} : ${hauteur.toFixed(1)} px de haut`).toBeGreaterThanOrEqual(
    CIBLE_MINIMALE,
  );
});

test("le ruban change d'axe quand il n'a plus la place, et pas avant", async ({ page, isMobile }) => {
  await page.goto(VINGT_CINQ_ANS);
  await page.locator("[data-annee]").first().waitFor();

  // Sans cette garde, la mesure de proportions généralisée d'`amortissement.spec.ts`
  // resterait verte si les deux orientations se réduisaient à une seule : elle
  // mesurerait toujours le bon axe, faute d'en avoir un second.
  expect(await axeDuRuban(page), isMobile ? "412 px : attendu en lignes" : "1 280 px : attendu en colonnes").toBe(
    isMobile ? "column" : "row",
  );
});

test("c'est la largeur du ruban qui décide, pas celle de la fenêtre", async ({ page, isMobile }) => {
  test.skip(isMobile, "la fenêtre étroite est déjà en lignes : le cas limite est au bureau");

  // À 1 280 px la colonne de résultats donne 896 px au ruban : 31,9 px par barre.
  await page.goto(VINGT_CINQ_ANS);
  await page.locator("[data-annee]").first().waitFor();
  expect(await axeDuRuban(page)).toBe("row");

  // À 1 024 px elle n'en donne plus que 640 : 21,7 px par barre, sous le seuil
  // tactile, sur un écran que personne n'appellerait « mobile ». Le ruban bascule.
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(() => axeDuRuban(page)).toBe("column");

  const { largeur, hauteur } = await plusPetiteBarre(page);
  expect(largeur).toBeGreaterThanOrEqual(CIBLE_MINIMALE);
  expect(hauteur).toBeGreaterThanOrEqual(CIBLE_MINIMALE);
});

test("aucune part du ruban n'est relevée pour se rendre visible", async ({ page }) => {
  // Assurance à zéro : la bande doit mesurer zéro, pas « un peu ». Un produit
  // dont la thèse est l'honnêteté du chiffre ne grossit pas une part pour la
  // rendre jolie, et le plancher est la façon dont ça arrive toujours.
  await page.goto("/credit?as=0");
  await page.locator("[data-annee]").first().waitFor();

  const bande = await page
    .locator('[data-annee="1"] [data-part="assurance"]')
    .evaluate((e) => e.getBoundingClientRect());
  const porteur = await axeDuRuban(page);
  const mesure = porteur === "row" ? bande.height : bande.width;
  expect(mesure, "la bande d'assurance nulle occupe des pixels").toBeLessThanOrEqual(0.5);
});

test("les flèches parcourent le ruban dans le sens où il se lit", async ({ page, isMobile }) => {
  await page.goto("/credit");
  await page.locator('[data-annee="5"]').click();
  await expect(page.locator("[data-curseur]")).toContainText("Année 5");

  // En lignes on descend, en colonnes on va vers la droite. Les deux couples
  // avancent : avant `UI-006`, `ArrowUp` avançait, ce qui ne correspondait à
  // aucune des deux lectures.
  await page.keyboard.press(isMobile ? "ArrowDown" : "ArrowRight");
  await expect(page.locator("[data-curseur]")).toContainText("Année 6");
  await page.keyboard.press(isMobile ? "ArrowUp" : "ArrowLeft");
  await expect(page.locator("[data-curseur]")).toContainText("Année 5");
});

test("en lignes, chaque année porte son repère — aucune n'est sautée", async ({ page, isMobile }) => {
  test.skip(!isMobile, "la réglette du bas saute une année sur deux, et c'est le cas du bureau");

  await page.goto(VINGT_CINQ_ANS);
  await page.locator("[data-annee]").first().waitFor();

  // En colonnes, au-delà de vingt ans les repères se chevauchent et le ruban en
  // masque un sur deux. En lignes il n'y a plus de chevauchement à éviter :
  // masquer une année sur deux ne serait plus qu'une perte d'information.
  const reperes = await page
    .locator("[data-annee] [data-repere]")
    .evaluateAll((n) => n.map((e) => (e.textContent ?? "").trim()));
  expect(reperes).toHaveLength(25);
  expect(reperes.filter((r) => r === "")).toEqual([]);
  expect(reperes[24]).toBe("25");
});

/* ── Les contrôles du module ──────────────────────────────────────────────── */

test("aucun contrôle du module ne descend sous la cible tactile", async ({ page }) => {
  await page.goto(VINGT_CINQ_ANS);
  await page.locator("[data-annee]").first().waitFor();

  /*
   * La pastille « i » est hors de cette énumération, et ce n'est pas un oubli.
   * Elle mesure 15 × 15 px et manque donc le critère, mais sa géométrie est
   * tenue par une garde d'`UI-005` — `infobulles.spec.ts` mesure l'alignement de
   * la bulle sur le bord de la pastille au pixel près. Agrandir sa boîte casse
   * cette garde, et la refaire est un ticket, pas un effet de bord de celui-ci.
   * La dette est nommée ici pour qu'elle reste visible.
   */
  const trop = await page.evaluate((seuil) => {
    const controles = [
      ...document.querySelectorAll<HTMLElement>(
        "main select, main input[type=range], main [role=radio], main [data-granularite]",
      ),
    ];
    return controles
      .map((e) => {
        const r = e.getBoundingClientRect();
        const nom = e.id || e.dataset["annee"] || e.dataset["granularite"] || e.tagName;
        return { nom, w: r.width, h: r.height };
      })
      .filter((c) => c.w > 0 && (c.w < seuil || c.h < seuil))
      .map((c) => `${c.nom} : ${c.w.toFixed(1)} × ${c.h.toFixed(1)} px`);
  }, CIBLE_MINIMALE);

  expect(trop, "contrôles sous 24 px").toEqual([]);
});

/* ── La densité ───────────────────────────────────────────────────────────── */

test("aucun montant n'est rogné sur un écran étroit, même au scénario tendu", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "le rognage se produit quand la carte se resserre, donc au téléphone");

  await page.goto(TENDU);
  await page.locator("[data-indicateur]").first().waitFor();
  expect(await rognes(page), "412 px").toEqual([]);

  // 360 px : le format d'un Galaxy S8 ou d'un iPhone 12 mini, plus étroit que le
  // profil de test. C'est là que le bandeau perd sa seconde colonne.
  await page.setViewportSize({ width: 360, height: 800 });
  await expect.poll(() => rognes(page), { message: "360 px" }).toEqual([]);
});

test("le nombre de colonnes du bandeau se déduit de la place, il ne se décrète pas", async ({
  page,
  isMobile,
}) => {
  await page.goto(TENDU);
  await page.locator("[data-indicateur]").first().waitFor();

  const colonnes = await page
    .locator("[data-indicateur]")
    .first()
    .evaluate((e) => getComputedStyle(e.parentElement!).gridTemplateColumns.split(" ").length);

  // Les deux profils gardent le compte qu'ils avaient — mais conclu, non supposé.
  expect(colonnes).toBe(isMobile ? 2 : 5);

  if (!isMobile) {
    // La largeur intermédiaire où cinq colonnes tombaient à 120 px et où trois
    // montants sur cinq débordaient de leur carte.
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect.poll(() => rognes(page), { message: "1 024 px" }).toEqual([]);
  }
});

test("le résumé chiffré précède la saisie sur un écran étroit", async ({ page, isMobile }) => {
  await page.goto("/credit");
  await page.locator("[data-indicateur]").first().waitFor();

  const y = async (selecteur: string) =>
    (await page.locator(selecteur).first().boundingBox())?.y ?? Infinity;
  const x = async (selecteur: string) =>
    (await page.locator(selecteur).first().boundingBox())?.x ?? Infinity;

  const mensualite = '[data-indicateur="mensualite"]';
  const premierChamp = "[data-champ]";

  if (isMobile) {
    // Dix champs séparaient l'arrivée du premier chiffre, alors que le scénario
    // par défaut est déjà calculé.
    expect(await y(mensualite), "la mensualité passe après la saisie").toBeLessThan(
      await y(premierChamp),
    );
  } else {
    // Au bureau rien ne bouge : la saisie reste à gauche du résultat.
    expect(await x(premierChamp)).toBeLessThan(await x(mensualite));
    expect(Math.abs((await y(mensualite)) - (await y(premierChamp)))).toBeLessThan(60);
  }
});

test("la page ne défile jamais latéralement, ruban et tableau dépliés", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "le débordement latéral est déjà gardé au bureau par credit.spec.ts");

  for (const largeur of [412, 360]) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.goto(TENDU);
    await page.locator("[data-annee]").first().waitFor();
    expect(await defileLateralement(page), `${largeur} px, tableau annuel`).toBe(false);

    await page.locator('[data-granularite="mois"]').click();
    await expect(page.locator('[data-tableau="mois"]')).toBeVisible();
    expect(await defileLateralement(page), `${largeur} px, tableau mensuel`).toBe(false);
  }
});
