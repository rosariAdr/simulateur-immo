import { expect, test, type Page } from "@playwright/test";

/**
 * MODULE « ACHETER OU LOUER » — `VIZ-003`, `/comparaison`
 *
 * Ces tests protègent quatre promesses, et une seule d'entre elles est
 * graphique.
 *
 * **La limite arrive avant les chiffres.** `docs/03-spec-domaine.md` §2 impose
 * d'énoncer explicitement que cette comparaison est faussée. Une limite placée
 * sous les courbes n'est pas énoncée : le lecteur pressé a déjà conclu. Deux
 * gardes s'en occupent — l'ordre du document, et la position à l'écran sans
 * défilement, sur les deux profils.
 *
 * **Les deux lectures donnent deux années de croisement.** C'est l'enseignement
 * entier du module (ADR-012). Un écran qui n'afficherait qu'une seule série, ou
 * qui recalculerait la seconde en soustrayant après coup, ferait tomber ce test.
 *
 * **Les proportions ne mentent pas.** Les repères des courbes sont mesurés en
 * pixels réels et confrontés aux montants du moteur, comme le ruban
 * d'amortissement. Aucune hauteur plancher, aucun axe tronqué, aucune échelle
 * qui se recalerait sur la lecture retenue.
 *
 * **L'écran ne recommande rien.** La garde de tournures prescriptives lit la
 * page telle qu'elle s'affiche, avertissement et pied de page compris.
 *
 * Les valeurs attendues viennent du moteur, sur le scénario que la route ouvre
 * par défaut. Elles ne sont pas devinées : `comparerDetention` les produit, et
 * ce fichier les recopie.
 */

const ESPACE = "[\\s\\u00a0\\u202f]";
const eur = (entier: string, decimales = "00") =>
  new RegExp(`^${entier.replace(/ /g, ESPACE)},${decimales}${ESPACE}€$`);

const chiffre = (page: Page, cle: string) => page.locator(`[data-chiffre="${cle}"] [data-valeur]`);
const lecture = (page: Page, poste: string) =>
  page.locator(`[data-curseur] [data-lecture="${poste}"]`);
const croisement = (page: Page, cle: string) => page.locator(`[data-croisement="${cle}"]`);

/**
 * Scénario où les deux croisements tombent tous deux dans l'horizon, et loin
 * l'un de l'autre : loyer relevé à 1 150 € et frais d'entrée portés à 16 400 €,
 * soit huit pour cent du prix — ce qu'un achat dans l'ancien coûte réellement.
 */
const DEUX_CROISEMENTS = "/comparaison?ly=1150&fe=16400";

/* ── La route existe, et elle est prérendue ───────────────────────────────── */

test("la route s'affiche, titrée, sans montant dans son titre", async ({ page }) => {
  await page.goto("/comparaison");

  await expect(page.locator("h1")).toHaveText("Acheter ou louer : ce que chaque année coûte");
  // Le titre ne porte aucun chiffre : c'est ce qui permet à la limite de le
  // suivre immédiatement, sans qu'un montant se soit glissé avant elle.
  await expect(page.locator("h1")).not.toContainText(/\d/);
});

test("la page est prérendue statiquement, pas rendue à la demande", async ({ page }) => {
  // `docs/02-architecture.md` §8 : aucune de ces routes ne doit retomber en
  // rendu dynamique. Le module lit l'état d'URL, ce qui suspend le rendu ; sans
  // la frontière `Suspense` de `app/comparaison/page.tsx`, Next bascule la page
  // entière en dynamique et cet en-tête disparaît.
  const reponse = await page.request.get("/comparaison");
  expect(reponse.status()).toBe(200);
  // L'en-tête peut être émis deux fois et Playwright les concatène ; ce qui
  // compte est sa présence, pas son unicité.
  expect(reponse.headers()["x-nextjs-prerender"], "la route n'est plus prérendue").toMatch(/\b1\b/);
});

/* ── La limite, avant les chiffres ────────────────────────────────────────── */

test("la limite de la spécification est énoncée mot pour mot", async ({ page }) => {
  await page.goto("/comparaison");

  const limite = page.locator("[data-limite]");
  await expect(limite).toBeVisible();
  // La phrase de `docs/03-spec-domaine.md` §2, et non une paraphrase qui
  // s'émousserait à la première relecture de bonne foi.
  await expect(limite).toContainText("Cette comparaison est faussée");
  await expect(limite).toContainText("la part de capital");
  await expect(limite).toContainText("n'est pas une dépense");
});

test("la limite précède tous les chiffres dans l'ordre du document", async ({ page }) => {
  await page.goto("/comparaison");
  // Le module est un composant client sous `Suspense` : `goto` rend la main
  // avant que son contenu existe. On attend donc un repère avant de lire le DOM.
  await expect(page.locator("[data-limite]")).toBeVisible();

  // Un lecteur d'écran suit le document, pas le dessin. Si un seul chiffre de
  // comparaison le précédait, la limite serait déjà arrivée trop tard pour lui.
  const apres = await page.evaluate(() => {
    const limite = document.querySelector("[data-limite]");
    const chiffres = [...document.querySelectorAll("[data-chiffre]")];
    if (!limite || chiffres.length === 0) return null;
    return chiffres.every(
      (c) => !!(limite.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
  });
  expect(apres, "un chiffre précède la limite").toBe(true);
});

test("la limite se lit sans défiler, sur les deux profils", async ({ page }) => {
  await page.goto("/comparaison");

  const hauteur = page.viewportSize()?.height ?? 0;
  const bloc = await page.locator("[data-limite]").boundingBox();
  expect(bloc, "le bloc de limite n'a pas de géométrie").not.toBeNull();
  expect(bloc?.y ?? Infinity, "le bloc de limite commence hors de la fenêtre").toBeLessThan(
    hauteur,
  );

  // La phrase elle-même, entièrement dans la fenêtre. Une limite qu'il faut
  // faire défiler pour finir de lire n'est pas énoncée.
  const phrase = await page.locator("[data-phrase-limite]").boundingBox();
  expect(phrase, "la phrase de limite n'a pas de géométrie").not.toBeNull();
  expect((phrase?.y ?? 0) + (phrase?.height ?? 0)).toBeLessThanOrEqual(hauteur);
});

test("la bascule des deux lectures vit à l'intérieur du bloc de limite", async ({ page }) => {
  await page.goto("/comparaison");

  // C'est la moitié de la décision : on ne peut pas changer de lecture sans
  // passer par la raison d'être de ce choix. Une bascule remontée dans l'en-tête
  // ou posée sur le graphique rendrait le bloc contournable.
  await expect(page.locator("[data-limite] [data-bascule-lecture]")).toHaveCount(1);
  await expect(page.locator("[data-bascule-lecture]")).toHaveCount(1);
});

/* ── Deux lectures, deux croisements ──────────────────────────────────────── */

test("les deux années de croisement sont affichées ensemble, et elles diffèrent", async ({
  page,
}) => {
  await page.goto(DEUX_CROISEMENTS);

  // Loyer 1 150 €, frais d'entrée 16 400 € : le décaissement croise à l'année 23,
  // les fonds perdus à l'année 4. Dix-neuf ans d'écart pour un seul et même
  // ménage — c'est cet écart que le module existe pour montrer.
  //
  // `FIS-006` a déplacé le premier croisement de l'année 22 à l'année 23, en
  // ramenant l'indexation du loyer de 2,0 à 1,5 % — l'INSEE mesure 1,44 % par an
  // sur la série de l'indice de référence des loyers depuis 1998 — et en portant
  // celle de la taxe foncière de 3,0 à 3,2 %. Les deux corrections poussent le
  // croisement dans le même sens : un loyer qui monte moins vite et une taxe qui
  // monte plus vite retardent le moment où acheter revient moins cher.
  await expect(croisement(page, "decaissement")).toHaveAttribute("data-valeur", "23");
  await expect(croisement(page, "fondsPerdus")).toHaveAttribute("data-valeur", "4");

  const enDecaissement = await croisement(page, "decaissement").getAttribute("data-valeur");
  const enFondsPerdus = await croisement(page, "fondsPerdus").getAttribute("data-valeur");
  expect(enDecaissement, "les deux lectures croisent la même année").not.toBe(enFondsPerdus);
});

test("les deux croisements restent visibles quelle que soit la lecture retenue", async ({
  page,
}) => {
  await page.goto(DEUX_CROISEMENTS);

  // N'afficher que le croisement de la lecture courante laisserait croire qu'il
  // n'y en a qu'un. Les deux sont là, dans les deux positions de la bascule.
  for (const cle of ["decaissement", "fondsPerdus"]) {
    await page.locator(`[data-bascule-lecture] [data-lecture="${cle}"]`).click();
    await expect(croisement(page, "decaissement")).toBeVisible();
    await expect(croisement(page, "fondsPerdus")).toBeVisible();
  }
});

test("la bascule change les montants comparés, pas seulement l'étiquette", async ({ page }) => {
  await page.goto("/comparaison");

  // ── LE SCÉNARIO PAR DÉFAUT N'A PLUS DE CROISEMENT, ET IL OUVRE À L'HORIZON ──
  //
  // Il ouvrait sur l'année 29, la plus tardive des deux croisements. Le journal
  // de `VIZ-003` avait signalé la fragilité : « le croisement du décaissement est
  // à un an de l'horizon, année 29 sur 30 ; un pas de plus sur n'importe quel
  // paramètre le fait disparaître ». `FIS-006` a été ce pas — l'indexation du
  // loyer ramenée de 2,0 à 1,5 % par an sur la série INSEE.
  //
  // Le curseur est alors retombé sur l'année 1, et c'était un second défaut :
  // le calcul prenait le maximum des croisements NON NULS, donc celui des fonds
  // perdus, seul survivant. `UI-015` exige les deux — à défaut, l'horizon. Voir
  // le commentaire de `ModuleComparaison.tsx`, qui donnait déjà trois raisons de
  // ne pas ouvrir sur l'année 1 pendant que le code le faisait.
  //
  // Ce que ce test garde n'est pas l'année : c'est que la bascule change les
  // MONTANTS, et que leur différence vaut exactement le capital remboursé.
  await expect(chiffre(page, "proprietaire")).toHaveText(eur("453 764", "21"));
  await expect(chiffre(page, "capital")).toHaveText(eur("180 000"));

  await page.locator('[data-bascule-lecture] [data-lecture="fondsPerdus"]').click();
  // 453 764,21 − 180 000,00 = 273 764,21 : l'invariant du moteur, à l'année 1
  // comme à l'année 30.
  await expect(chiffre(page, "proprietaire")).toHaveText(eur("273 764", "21"));
  // Le locataire ne bouge pas : tout ce qu'il verse est consommé dans les deux
  // lectures. Cette égalité EST l'enseignement, elle ne doit pas s'effacer.
  await expect(chiffre(page, "locataire")).toHaveText(eur("437 255", "90"));
});

test("la bascule se parcourt aux flèches", async ({ page }) => {
  await page.goto("/comparaison");

  const actif = page.locator('[data-bascule-lecture] [aria-checked="true"]');
  await expect(actif).toHaveAttribute("data-lecture", "decaissement");

  await page.locator('[data-bascule-lecture] [data-lecture="decaissement"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(actif).toHaveAttribute("data-lecture", "fondsPerdus");
});

/* ── Les deux courbes, et leurs libellés ──────────────────────────────────── */

test("chaque courbe porte son libellé écrit, jamais sa seule couleur", async ({ page }) => {
  await page.goto("/comparaison");

  // Posé à hauteur du dernier point de chaque tracé.
  await expect(page.locator('[data-libelle-courbe="proprietaire"]')).toHaveText("Propriétaire");
  await expect(page.locator('[data-libelle-courbe="locataire"]')).toHaveText("Locataire");

  // Et nommé une seconde fois dans la légende, avec la bande de capital.
  await expect(page.locator('[data-legende="proprietaire"]')).toContainText("Propriétaire");
  await expect(page.locator('[data-legende="locataire"]')).toContainText("Locataire");
  await expect(page.locator('[data-legende="capital"]')).toContainText("Capital remboursé");
});

test("les deux libellés de courbe ne se recouvrent jamais", async ({ page }) => {
  // Au scénario par défaut, les deux courbes finissent à un point de
  // pourcentage l'une de l'autre : posés à leur hauteur exacte, les deux
  // libellés se superposeraient et deviendraient illisibles tous les deux.
  await page.goto("/comparaison");

  const a = await page.locator('[data-libelle-courbe="proprietaire"]').boundingBox();
  const b = await page.locator('[data-libelle-courbe="locataire"]').boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  const separes =
    (a?.y ?? 0) + (a?.height ?? 0) <= (b?.y ?? 0) || (b?.y ?? 0) + (b?.height ?? 0) <= (a?.y ?? 0);
  expect(separes, "les deux libellés de courbe se recouvrent").toBe(true);
});

test("le trait de croisement porte son nom, pas seulement sa couleur", async ({ page }) => {
  await page.goto(DEUX_CROISEMENTS);

  const etiquette = page.locator("[data-etiquette-croisement]");
  await expect(etiquette).toHaveAttribute("data-annee", "23");
  await expect(etiquette).toContainText("croisement");
});

/* ── Les proportions ──────────────────────────────────────────────────────── */

/**
 * Hauteur d'un repère, en pourcentage de la hauteur utile du cadre.
 *
 * La mesure part du bord intérieur du cadre — `clientHeight` et non la boîte
 * englobante — parce que la bordure d'un pixel suffit à fausser un rapport sur
 * les petites valeurs : à l'année 1, elle représente plus de dix pour cent de la
 * hauteur du repère.
 *
 * Ce que ce test protège n'est pas un dessin, c'est l'honnêteté de l'échelle :
 * un axe qui ne partirait pas de zéro, une hauteur plancher sur les premières
 * années, ou une échelle qui se recalerait sur la lecture retenue rendraient
 * tous les trois ces pourcentages faux.
 */
async function hauteurs(page: Page, reperes: readonly (readonly [string, number])[]) {
  // Le module est un composant client sous `Suspense` : sans cette attente, la
  // mesure lirait un document encore vide et rendrait `null`.
  await expect(page.locator("[data-cadre-courbes]")).toBeVisible();
  return page.evaluate((liste) => {
    const cadre = document.querySelector("[data-cadre-courbes]");
    if (!cadre) return null;
    const boite = cadre.getBoundingClientRect();
    const style = getComputedStyle(cadre);
    const bas = boite.bottom - parseFloat(style.borderBottomWidth);
    const utile = cadre.clientHeight;
    return liste.map(([serie, annee]) => {
      const el = document.querySelector(`[data-point="${serie}"][data-annee="${annee}"]`);
      if (!el) return NaN;
      const r = el.getBoundingClientRect();
      return ((bas - (r.top + r.height / 2)) / utile) * 100;
    });
  }, reperes);
}

test("les repères des courbes sont proportionnels aux montants du moteur", async ({ page }) => {
  await page.goto("/comparaison");

  // Échelle du scénario par défaut : 453 764,21 €, le plus grand cumul de
  // décaissement de l'horizon.
  //
  // `FIS-006` a changé de main le sommet de l'échelle. Il appartenait au
  // locataire à l'année 30 ; avec une indexation de loyer ramenée de 2,0 à 1,5 %
  // par an, c'est désormais le propriétaire qui finit le plus haut. Le test
  // mesure les deux, ce qui rend le changement lisible au lieu de le masquer.
  //   année  1  propriétaire   17 346,68 €   →   3,823 %
  //   année 10  propriétaire  178 713,44 €   →  39,384 %
  //   année 20  propriétaire  371 122,42 €   →  81,787 %
  //   année 20  locataire     268 420,17 €   →  59,154 %
  //   année 30  locataire     437 255,90 €   →  96,362 %
  //   année 30  propriétaire  453 764,21 €   → 100,000 %
  const mesure = await hauteurs(page, [
    ["proprietaire", 1],
    ["proprietaire", 10],
    ["proprietaire", 20],
    ["locataire", 20],
    ["locataire", 30],
    ["proprietaire", 30],
  ]);
  expect(mesure, "aucun repère mesurable").not.toBeNull();
  const [an1, an10, an20, loc20, loc30, an30] = mesure as number[];

  expect(an1, "repère de l'année 1 non mesurable").toBeGreaterThan(0);
  // Aucune hauteur plancher : l'année 1 vaut 3,8 % de l'échelle et pas un pixel
  // de plus. Un plancher, même de trois pixels, ferait échouer cette ligne.
  expect(an1).toBeCloseTo(3.823, 0);
  expect(an10).toBeCloseTo(39.384, 0);
  expect(an20).toBeCloseTo(81.787, 0);
  expect(loc20).toBeCloseTo(59.154, 0);
  expect(loc30).toBeCloseTo(96.362, 0);
  // Le sommet de l'échelle est atteint, et il n'est pas dépassé.
  expect(an30).toBeCloseTo(100, 0);
});

test("l'échelle ne se recale pas sur la lecture retenue", async ({ page }) => {
  await page.goto("/comparaison");

  const [avant] = (await hauteurs(page, [["proprietaire", 30]])) as number[];
  expect(avant).toBeCloseTo(100, 0);

  await page.locator('[data-bascule-lecture] [data-lecture="fondsPerdus"]').click();
  const [apres] = (await hauteurs(page, [["proprietaire", 30]])) as number[];

  // 273 764,21 € sur la même échelle de 453 764,21 € : 60,3 %. Si le cadre se
  // réétalait sur la nouvelle lecture, ce repère remonterait à 100 % et la
  // disparition du capital deviendrait invisible — exactement le biais que le
  // module corrige.
  expect(apres).toBeCloseTo(60.329, 0);
  expect(apres, "les fonds perdus ne redescendent pas dans le cadre").toBeLessThan(avant ?? 0);
});

test("l'année d'ouverture exige les deux croisements, pas un seul", async ({ page }) => {
  // La règle est énoncée dans `ModuleComparaison.tsx` : on ouvre sur l'état où
  // l'histoire entière est derrière soi. Deux scénarios la mettent à l'épreuve
  // dans les deux sens, et c'est le second qui a fait défaut jusqu'à `UI-015`.

  // Les deux lectures croisent : la plus tardive des deux, année 23.
  await page.goto(DEUX_CROISEMENTS);
  await expect(page.locator("[data-ecart]")).toContainText("Écart à l'année 23");

  // Une seule croise — le décaissement sort de l'horizon sur le scénario par
  // défaut. L'année 1 des fonds perdus n'est PAS une ouverture : à cette
  // année-là, l'autre lecture n'a pas basculé et ne basculera jamais.
  await page.goto("/comparaison");
  await expect(page.locator('[data-croisement="decaissement"]')).not.toHaveAttribute(
    "data-valeur",
    /\d+/,
  );
  await expect(page.locator('[data-croisement="fondsPerdus"]')).toHaveAttribute("data-valeur", "1");
  await expect(page.locator("[data-ecart]")).toContainText("Écart à l'année 30");
});

/* ── Le bandeau d'écart et le curseur d'année ─────────────────────────────── */

test("le bandeau d'écart chiffre la différence à l'année lue", async ({ page }) => {
  await page.goto("/comparaison");

  // Année 30, en décaissement : 453 764,21 € contre 437 255,90 €. Le scénario par
  // défaut ouvre à l'horizon depuis `UI-015`, faute de croisement dans les deux
  // lectures — et c'est bien à l'horizon que se lit un scénario qui ne croise pas.
  await expect(page.locator("[data-ecart]")).toContainText("Écart à l'année 30");
  await expect(chiffre(page, "ecart")).toHaveText(eur("16 508", "31"));
  // Le sens est écrit, pas suggéré par une couleur ni par une flèche.
  await expect(page.locator('[data-chiffre="ecart"]')).toContainText("de plus décaissé");

  // Et il s'écrit dans les deux sens. La bascule inverse le signe : en fonds
  // perdus, le propriétaire a consommé 163 491,69 € de moins sur trente ans.
  // Sans cette seconde moitié, le test ne verrait plus qu'un seul des deux
  // libellés — le scénario par défaut ne produit plus de « de moins décaissé ».
  await page.locator('[data-bascule-lecture] [data-lecture="fondsPerdus"]').click();
  await expect(chiffre(page, "ecart")).toHaveText(eur("163 491", "69"));
  await expect(page.locator('[data-chiffre="ecart"]')).toContainText("de moins consommé");
});

test("le curseur d'année déplace le bandeau, la ligne de lecture et le tableau", async ({
  page,
}) => {
  await page.goto("/comparaison");

  await page.locator('[data-tableau="comparaison"] [data-ligne="10"]').click();

  await expect(page.locator("[data-ecart]")).toContainText("Écart à l'année 10");
  await expect(page.locator("[data-curseur]")).toContainText("Année 10");
  await expect(lecture(page, "proprietaire")).toHaveText(eur("178 713", "44"));
  await expect(lecture(page, "locataire")).toHaveText(eur("123 840", "56"));
  await expect(lecture(page, "ecart")).toHaveText(eur("54 872", "88"));

  // Une seule ligne marquée à la fois, comme dans le tableau d'amortissement.
  await expect(page.locator('[data-tableau="comparaison"] [data-marquee="oui"]')).toHaveCount(1);
});

test("le tableau reprend l'agrégation annuelle du moteur", async ({ page }) => {
  await page.goto("/comparaison");

  await expect(page.locator('[data-tableau="comparaison"] tbody tr')).toHaveCount(30);

  const cellules = (annee: number) => page.locator(`[data-ligne="${annee}"] td`);
  // Année 1 : propriétaire, dont capital, locataire.
  await expect(cellules(1).nth(0)).toHaveText(eur("17 346", "68"));
  await expect(cellules(1).nth(1)).toHaveText(eur("6 531", "92"));
  await expect(cellules(1).nth(2)).toHaveText(eur("11 540"));
  // Année 20, la dernière du prêt : le capital remboursé atteint le capital
  // emprunté, et il n'y a pas un centime de trop.
  await expect(cellules(20).nth(1)).toHaveText(eur("180 000"));
});

/* ── L'état d'URL ─────────────────────────────────────────────────────────── */

test("une URL nue ne porte aucun paramètre, et un scénario partagé les redonne", async ({
  page,
}) => {
  await page.goto("/comparaison");
  expect(new URL(page.url()).search, "l'URL nue porte des paramètres").toBe("");

  await page.goto(DEUX_CROISEMENTS);
  await expect(page.locator("#loyer")).toHaveValue(/1[\s  ]?150/);
  await expect(page.locator("#frais-entree")).toHaveValue(/16[\s  ]?400/);
});

test("la lecture retenue et l'année lue ne partent pas dans l'URL", async ({ page }) => {
  await page.goto("/comparaison");

  // ADR-005 : ce qui change un chiffre entre dans l'URL, ce qui change un
  // cadrage n'y entre pas. Les deux séries sont calculées quoi qu'il arrive, et
  // les deux croisements sont affichés en permanence — la bascule ne change
  // aucun nombre, elle change lequel on regarde.
  await page.locator('[data-bascule-lecture] [data-lecture="fondsPerdus"]').click();
  await page.locator('[data-tableau="comparaison"] [data-ligne="7"]').click();
  await expect(page.locator("[data-curseur]")).toContainText("Année 7");

  expect(new URL(page.url()).search, "un cadrage s'est inscrit dans l'URL").toBe("");
});

/* ── Le chemin depuis le module crédit ────────────────────────────────────── */

test("on va du module crédit à la comparaison, en cliquant", async ({ page }) => {
  await page.goto("/credit");

  const lien = page.locator("[data-vers-comparaison]");
  await expect(lien).toBeVisible();
  await lien.click();

  await expect(page).toHaveURL(/\/comparaison$/);
  await expect(page.locator("h1")).toContainText("Acheter ou louer");
});

test("on revient de la comparaison au module crédit, en cliquant", async ({ page }) => {
  await page.goto("/comparaison");

  await page.locator("[data-vers-credit]").click();
  await expect(page).toHaveURL(/\/credit$/);
  await expect(page.locator('[data-indicateur="mensualite"]')).toBeVisible();
});

test("la mensualité affichée ici est celle que le module crédit affiche", async ({ page }) => {
  // Les deux modules ouvrent sur le même ménage, et `src/lib/comparaison.ts`
  // recopie les cinq paramètres de financement de `src/lib/scenario.ts` plutôt
  // que de les importer — cet import ferait entrer `nuqs` dans un module que la
  // page serveur doit pouvoir lire. La copie est donc gardée ici : si l'un des
  // deux scénarios d'ouverture dérive, ce test rougit avant le lecteur.
  await page.goto("/comparaison");
  const surLaComparaison = await chiffre(page, "mensualite").innerText();

  await page.goto("/credit");
  const surLeCredit = await page.locator('[data-indicateur="mensualite"] [data-valeur]').innerText();

  expect(surLaComparaison.trim()).toBe(surLeCredit.trim());
});

/* ── Elle ne recommande rien ──────────────────────────────────────────────── */

/**
 * Les tournures que le produit s'interdit.
 *
 * Les dix premières sont celles de `tests/e2e/fiche-credit.spec.ts` et de
 * `src/content/__tests__/fiche-credit.test.ts` — la règle la plus importante du
 * projet : « dans cette configuration, l'écart est de X », jamais « vous
 * devriez ».
 *
 * Les quatre dernières sont propres à cet écran. Un module qui compare deux
 * options glisse vers le verdict plus vite qu'un texte pédagogique : « à partir
 * de l'année 12, acheter devient rentable » est la phrase que tous les
 * comparateurs écrivent, et elle est fausse deux fois — ce niveau de calcul ne
 * mesure ni l'appréciation du bien, ni les frais de revente, ni le coût
 * d'opportunité de l'apport, et le produit ne désigne pas de gagnant.
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
  /\brentab/iu,
  /\bgagnant\b/iu,
  /\bl['’]emporte\b/iu,
  /\bplus avantageux\b/iu,
];

test("aucune tournure prescriptive n'atteint le lecteur", async ({ page }) => {
  await page.goto("/comparaison");
  // Le document entier, avertissement et pied de page compris.
  const texte = await page.locator("body").innerText();

  for (const tournure of PRESCRIPTIONS) {
    expect(texte, `la page emploie ${tournure.source}`).not.toMatch(tournure);
  }
});

test("la page dit ce qu'elle ne dit pas", async ({ page }) => {
  await page.goto("/comparaison");
  const texte = await page.locator("main").innerText();

  // « Se terminer par ses limites », docs/CONTEXT.md §7. Et les deux réserves
  // qu'`ENG-010` a explicitement laissées à l'interface : le croisement des
  // fonds perdus n'est pas un seuil au-delà duquel l'achat rapporte, et les
  // frais d'entrée à zéro rendent ce croisement optimiste.
  await expect(page.locator("[data-limites]")).toHaveCount(1);
  expect(texte).toContain("coût d'opportunité de l'apport");
  expect(texte).toContain("frais de revente");
  expect(texte).toContain("ces frais ne sont pas comptés");
});

/* ── Ce que l'écran doit à tout le site ───────────────────────────────────── */

test("l'avertissement et le pied de page sont là", async ({ page }) => {
  await page.goto("/comparaison");

  await expect(page.locator("[data-avertissement]")).toBeVisible();
  await expect(page.locator("[data-pied]")).toBeVisible();
  await expect(page.locator("[data-pied]")).toContainText("sans collecte de données");
});

/* ── Les deux profils ─────────────────────────────────────────────────────── */

test("aucun montant n'est rogné dans sa boîte", async ({ page }) => {
  // Le scénario le plus large du module : un bien à 620 000 €, projeté sur
  // 35 ans, avec des frais d'entrée. Les cumuls y dépassent le million.
  await page.goto(
    "/comparaison?px=620000&ap=60000&tx=4.1&du=300&hz=35&fe=49600&ly=1900&tf=2600&cc=2400",
  );

  // Un montant tronqué ressemble encore à un montant. C'est le seul défaut
  // d'affichage de ce produit qui puisse tromper quelqu'un sur un chiffre.
  const rognes = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        "[data-tableau] td, [data-tableau] th, [data-valeur], [data-lecture]",
      ),
    ]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => (el.textContent ?? "").trim())
      .slice(0, 10),
  );

  expect(rognes, "montants rognés").toEqual([]);
});

test("la page ne déborde pas latéralement", async ({ page }) => {
  await page.goto("/comparaison");
  await expect(page.locator('[data-tableau="comparaison"]')).toBeVisible();

  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(deborde, "la page défile latéralement").toBe(false);
});

test("le tableau large défile dans son cadre, pas dans la page", async ({ page }) => {
  await page.goto("/comparaison");
  await expect(page.locator('[data-tableau="comparaison"]')).toBeVisible();

  const cadreDefilable = await page.evaluate(() => {
    const table = document.querySelector('[data-tableau="comparaison"]');
    const cadre = table?.parentElement;
    return cadre ? getComputedStyle(cadre).overflowX : null;
  });
  expect(cadreDefilable, "le tableau n'est pas dans un cadre défilable").toBe("auto");
});

/*
 * L'avertissement permanent et l'absence d'indexation ne sont pas vérifiés en
 * détail ici : la route affiche des chiffres, elle a donc rejoint la liste
 * `ROUTES` de `avertissement.spec.ts`, dont c'est le contrat déclaré.
 */
