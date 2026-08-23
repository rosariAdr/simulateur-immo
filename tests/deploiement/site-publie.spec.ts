import { expect, test, type Page } from "@playwright/test";

/**
 * CE QUE L'HÉBERGEUR SERT RÉELLEMENT — `TST-000`, volet déploiement
 *
 * Ce fichier ne double pas `tests/e2e/`. Les deux suites posent des questions
 * différentes :
 *
 *   `tests/e2e/`      — « le code du dépôt fait-il ce qu'il doit ? »
 *   `tests/deploiement/` — « le public voit-il ce code-là ? »
 *
 * La seconde question n'a pas de réponse locale. Une variable d'environnement
 * absente en production, un cache qui garde la version précédente, une
 * redirection posée dans l'interface de l'hébergeur, un déploiement qui a échoué
 * sans qu'on le remarque : la porte reste verte dans les quatre cas.
 *
 * ═══ CE FICHIER NE FAIT PAS PARTIE DE LA PORTE ═══
 *
 * Voir le commentaire de `playwright.deploiement.mts`. En deux mots : une porte
 * qui interroge un tiers rougit pour des raisons étrangères au code, et une
 * porte qui rougit sans raison finit ignorée.
 *
 *   npm run verif-deploiement
 *
 * ═══ CE QU'IL VÉRIFIE, ET DANS QUEL ORDRE D'IMPORTANCE ═══
 *
 * 1. **Le site n'est pas indexable.** C'est la seule vérification dont l'échec
 *    est irréversible : un moteur qui a indexé des pages non relues par un
 *    juriste ne les désindexe pas sur demande immédiate. `LEG-001`, `LEG-002`.
 * 2. **L'avertissement est là, sur toute route qui montre un chiffre.** Même
 *    exigence qu'en local, et c'est en production qu'elle engage.
 * 3. **Les chiffres sont ceux du dépôt.** Détecteur de déploiement périmé : ces
 *    montants sont ceux que `tests/e2e/credit.spec.ts` fixe. S'ils divergent,
 *    c'est que le site publié n'est pas ce dépôt — ou plus tout à fait.
 * 4. Le reste : les routes répondent, le pied de page mène aux textes légaux.
 */

/** Toute route qui affiche un chiffre, plus les textes légaux. */
const ROUTES = [
  "/",
  "/credit",
  "/credit/comprendre",
  "/comparaison",
  "/comparaison/patrimoine",
  "/glossaire",
  "/composants",
  "/avertissement",
  "/mentions-legales",
  "/confidentialite",
  "/conditions",
];

/** Routes portant des chiffres : l'avertissement y est obligatoire. */
const ROUTES_CHIFFREES = [
  "/",
  "/credit",
  "/credit/comprendre",
  "/comparaison",
  "/comparaison/patrimoine",
  "/composants",
];

const ESPACE = "[\\s\\u00a0\\u202f]";
const eur = (entier: string, decimales = "00") =>
  new RegExp(`^${entier.replace(/ /g, ESPACE)},${decimales}${ESPACE}€$`);

const indicateur = (page: Page, cle: string) =>
  page.locator(`[data-indicateur="${cle}"] [data-valeur]`);

/* ── 1. Non indexable, et ce n'est pas négociable ─────────────────────────── */

test("robots.txt interdit toute exploration", async ({ request }) => {
  const reponse = await request.get("/robots.txt");
  expect(reponse.status()).toBe(200);

  const lignes = (await reponse.text())
    .split("\n")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);

  // Analyse ligne à ligne, et non `toContain("disallow: /")` sur le texte
  // entier : « disallow: / » est un sous-texte de « disallow: /credit », et
  // « allow: / » l'est de « disallow: / ». Les deux pièges sont symétriques et
  // l'un d'eux a déjà été tendu dans ce dépôt.
  expect(lignes, "robots.txt n'interdit pas la racine").toContain("disallow: /");
  expect(
    lignes.some((l) => l.startsWith("allow:")),
    "robots.txt autorise une route alors que le site n'est pas relu",
  ).toBe(false);
});

for (const route of ROUTES) {
  test(`${route} n'est pas indexable`, async ({ page }) => {
    const reponse = await page.goto(route);
    expect(reponse?.status(), `${route} ne répond pas`).toBe(200);

    // La balise, telle que le navigateur la reçoit. `INDEXABLE` vit dans
    // `src/lib/site.ts` et commande à la fois cette balise et robots.txt ; c'est
    // en production qu'il faut vérifier qu'elle n'a pas été contournée par une
    // configuration d'hébergeur.
    const robots = page.locator('head meta[name="robots"]');
    await expect(robots, `${route} n'a pas de directive robots`).toHaveCount(1);
    await expect(robots).toHaveAttribute("content", /noindex/);
    await expect(robots).toHaveAttribute("content", /nofollow/);
  });
}

test("l'en-tête HTTP ne contredit pas la balise", async ({ request }) => {
  // Un `X-Robots-Tag` posé côté hébergeur primerait sur la balise du document.
  // S'il existe, il doit dire la même chose ; sinon, deux sources de vérité se
  // contrediraient et c'est la moins visible qui gagnerait.
  const reponse = await request.get("/");
  const entete = reponse.headers()["x-robots-tag"];
  if (entete !== undefined) expect(entete).toMatch(/noindex/);
});

/* ── 2. L'avertissement, en production ────────────────────────────────────── */

for (const route of ROUTES_CHIFFREES) {
  test(`${route} porte l'avertissement, et il ne se ferme pas`, async ({ page }) => {
    await page.goto(route);

    const bandeau = page.locator("[data-avertissement]");
    await expect(bandeau, `${route} n'affiche pas l'avertissement`).toBeVisible();

    // Aucun contrôle de fermeture : `LEG-002` exige un avertissement permanent,
    // pas un bandeau qu'on chasse d'un clic et qu'on ne revoit jamais.
    await expect(bandeau.getByRole("button")).toHaveCount(0);
    await expect(bandeau.locator("[aria-label*='ermer']")).toHaveCount(0);
  });
}

/* ── 3. Détecteur de déploiement périmé ───────────────────────────────────── */

test("le scénario par défaut du crédit donne les chiffres du dépôt", async ({ page }) => {
  await page.goto("/credit");

  // Ces trois montants sont ceux de `tests/e2e/credit.spec.ts`. Ils dépendent du
  // moteur ET des hypothèses de marché : `FIS-006` en a déplacé plusieurs le
  // 23 août 2026. C'est justement ce qui en fait un bon détecteur — un site
  // publié depuis un `main` antérieur affiche encore les anciens.
  await expect(indicateur(page, "mensualite")).toHaveText(eur("1 061", "39"));
  await expect(indicateur(page, "cout")).toHaveText(eur("78 064", "62"));
  await expect(indicateur(page, "assurance")).toHaveText(eur("10 800"));
});

test("un lien partagé redonne exactement les mêmes chiffres", async ({ page }) => {
  // La promesse centrale du produit : l'état tient dans l'adresse, sans compte
  // ni serveur. Elle ne vaut que si elle tient sur le site publié — c'est là
  // qu'un lien est réellement envoyé à quelqu'un.
  await page.goto("/credit?px=465000&ap=45000&tx=3.9&du=300&as=0.34&ga=hypotheque&rv=6080&fd=1500");

  await expect(indicateur(page, "mensualite")).toHaveText(eur("2 312", "79"));
});

test("la comparaison ouvre à l'horizon et affiche ses deux croisements", async ({ page }) => {
  await page.goto("/comparaison");

  // `UI-015` : faute de croisement dans les deux lectures, l'écran ouvre à
  // l'horizon. C'est le chiffre qu'un visiteur voit en arrivant.
  await expect(page.locator("[data-ecart]")).toContainText("Écart à l'année 30");
  await expect(page.locator('[data-croisement="fondsPerdus"]')).toBeVisible();
  await expect(page.locator('[data-croisement="decaissement"]')).toBeVisible();

  // Et la limite arrive avant les chiffres, en production comme en local.
  const apres = await page.evaluate(() => {
    const limite = document.querySelector("[data-limite]");
    const chiffres = [...document.querySelectorAll("[data-chiffre]")];
    if (!limite || chiffres.length === 0) return null;
    return chiffres.every(
      (c) => !!(limite.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
  });
  expect(apres, "un chiffre précède la limite sur le site publié").toBe(true);
});

test("le niveau approfondi est publié, et sa limite précède ses chiffres", async ({ page }) => {
  /*
    Cette route a failli échapper au détecteur — `TST-003`.

    La suite a été écrite avant `UI-007` et ses listes ne nommaient que les routes
    d'alors. Elle est donc restée **verte** au moment d'étiqueter v0.3.0, sans
    avoir regardé une seule fois l'écran que cette version existe pour livrer.
    Un détecteur de déploiement périmé est lui-même périmable, et rien ne l'avait
    signalé : la seule chose qui l'aurait fait est ce qui vient de se passer,
    quelqu'un vérifiant à la main que la route répond.

    D'où cette règle, écrite ici plutôt qu'espérée : **toute route ajoutée au
    produit rejoint `ROUTES` et, si elle montre un chiffre, `ROUTES_CHIFFREES`.**
    Le même geste en deux endroits qu'exige déjà `UI-014` côté accueil.
  */
  await page.goto("/comparaison/patrimoine");

  // Les deux patrimoines sont chiffrés : la route ne fait pas que répondre 200.
  await expect(page.locator('[data-chiffre="proprietaire"] [data-valeur]')).toBeVisible();
  await expect(page.locator('[data-chiffre="locataire"] [data-valeur]')).toBeVisible();

  // Et le refus de conclure est publié, pas seulement écrit dans le dépôt.
  await expect(page.locator("[data-retournement]")).toContainText("ne se calcule pas");

  const apres = await page.evaluate(() => {
    const limite = document.querySelector("[data-limite]");
    const chiffres = [...document.querySelectorAll("[data-chiffre]")];
    if (!limite || chiffres.length === 0) return null;
    return chiffres.every(
      (c) => !!(limite.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
  });
  expect(apres, "un chiffre précède la limite sur le site publié").toBe(true);

  // Les deux sorties non modélisées sont annoncées comme absentes, pas comme
  // prochaines. C'est en production que cette nuance engage.
  const sorties = page.locator("[data-trois-sorties]");
  await expect(sorties).toContainText(/n'existe pas dans ce simulateur/i);
  await expect(sorties).not.toContainText(/à venir|bientôt|prochainement/i);
});

/* ── 4. Le reste ──────────────────────────────────────────────────────────── */

test("le pied de page mène aux trois textes légaux", async ({ page }) => {
  await page.goto("/");

  for (const cible of ["/mentions-legales", "/confidentialite", "/conditions"]) {
    const lien = page.locator(`footer a[href="${cible}"]`);
    await expect(lien, `le pied de page ne mène pas à ${cible}`).toHaveCount(1);
  }
});

test("l'identité de l'hébergeur figure sur le site publié", async ({ page }) => {
  // C'est la contrepartie de l'anonymat de l'éditeur, et elle n'a de valeur
  // qu'en production : c'est là que la LCEN l'exige.
  await page.goto("/mentions-legales");
  await expect(page.locator("main")).toContainText(/Vercel/i);
});

test("aucune route ne défile latéralement, sur les deux profils", async ({ page }) => {
  for (const route of ROUTES_CHIFFREES) {
    await page.goto(route);
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(deborde, `${route} défile latéralement`).toBe(false);
  }
});
