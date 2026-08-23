import { expect, test, type Page } from "@playwright/test";
import {
  PRESCRIPTIONS_COMPARAISON,
  PRESCRIPTIONS_GENERALES,
  PRESCRIPTIONS_PATRIMOINE,
} from "./prescriptions";

/**
 * MODULE « ACHETER OU LOUER », NIVEAU APPROFONDI — `UI-007`,
 * `/comparaison/patrimoine`
 *
 * Six promesses, et deux seulement sont graphiques.
 *
 * **Le retournement se lit.** Le niveau simple dit « le propriétaire a décaissé
 * tant de plus » ; celui-ci dit « il lui reste tant de plus ». Les deux phrases
 * portent sur le même ménage et penchent en sens contraire. Un écran qui
 * n'afficherait que la seconde n'aurait rien retourné du tout.
 *
 * **La limite arrive avant les chiffres, et elle porte ses deux hypothèses.**
 * Même règle qu'ADR-015, autre limite : ici le danger n'est pas de mal compter,
 * c'est que la réponse dépende de deux nombres que personne ne connaît. Les deux
 * curseurs sont donc dans le bloc, et il n'y en a pas ailleurs.
 *
 * **Les proportions ne mentent pas, et le zéro est une position.** Les repères
 * sont mesurés en pixels réels contre les montants du moteur, sans hauteur
 * plancher. Un produit de vente négatif est dessiné SOUS la ligne de zéro, pas
 * écrasé dessus.
 *
 * **L'échelle ne se recale pas sur l'hypothèse retenue.** Elle vient des
 * intervalles observés, qui ne bougent pas : déplacer le curseur d'appréciation
 * fait monter la courbe du propriétaire dans un cadre immobile, et ne déplace
 * pas d'un pixel le repère du locataire.
 *
 * **Le croisement se lit qu'il existe ou non.** Les deux cas sont éprouvés sur
 * deux adresses.
 *
 * **Deux sorties sur trois ne sont pas modélisées, et l'écran le dit.**
 *
 * Les valeurs attendues viennent du moteur, sur le scénario que la route ouvre
 * par défaut. Elles ne sont pas devinées.
 */

const ESPACE = "[\\s\\u00a0\\u202f]";
const eur = (entier: string, decimales = "00") =>
  new RegExp(`^${entier.replace(/ /g, ESPACE)},${decimales}${ESPACE}€$`);

const chiffre = (page: Page, cle: string) => page.locator(`[data-chiffre="${cle}"] [data-valeur]`);
const borne = (page: Page, cle: string) => page.locator(`[data-borne="${cle}"]`);

/**
 * Scénario sans croisement, et où le produit de la vente est **négatif** les
 * quatre premières années : aucun apport, appréciation à la borne basse de
 * l'intervalle observé, commission d'agence à 8 %. Le vendeur doit alors
 * apporter de l'argent pour solder son prêt — c'est le chiffre qu'aucun
 * simulateur n'affiche.
 */
const VENTE_A_PERTE = "/comparaison/patrimoine?ap=0&av=-2&ca=8";

/** Bien imposable, appréciation à la borne haute : un impôt de plus-value existe. */
const IMPOSABLE = "/comparaison/patrimoine?rg=imposable&av=4";

/** Bien imposable au forfait travaux : les cinq premières années sont fermées. */
const FORFAIT_TRAVAUX = "/comparaison/patrimoine?rg=imposable&mt=forfait";

/* ── La route existe, et elle est prérendue ───────────────────────────────── */

test("la route s'affiche, titrée, sans montant dans son titre", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  await expect(page.locator("h1")).toHaveText("Acheter ou louer : ce que chacun possède à l'arrivée");
  // Aucun chiffre dans le titre : c'est ce qui permet à la limite de le suivre
  // immédiatement, sans qu'un montant se soit glissé avant elle.
  await expect(page.locator("h1")).not.toContainText(/\d/);
});

test("la page est prérendue statiquement, pas rendue à la demande", async ({ page }) => {
  const reponse = await page.request.get("/comparaison/patrimoine");
  expect(reponse.status()).toBe(200);
  expect(reponse.headers()["x-nextjs-prerender"], "la route n'est plus prérendue").toMatch(/\b1\b/);
});

/* ── La limite, avant les chiffres, et les deux hypothèses dedans ─────────── */

test("la limite dit que deux nombres inconnus gouvernent la réponse", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  const limite = page.locator("[data-limite]");
  await expect(limite).toBeVisible();
  await expect(limite).toContainText("ne compare plus deux dépenses mais deux patrimoines");
  await expect(limite).toContainText("deux nombres que personne ne connaît");
});

test("la limite précède tous les chiffres dans l'ordre du document", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");
  await expect(page.locator("[data-limite]")).toBeVisible();

  // Un lecteur d'écran suit le document, pas le dessin.
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
  await page.goto("/comparaison/patrimoine");

  const hauteur = page.viewportSize()?.height ?? 0;
  const phrase = await page.locator("[data-phrase-limite]").boundingBox();
  expect(phrase, "la phrase de limite n'a pas de géométrie").not.toBeNull();
  expect(
    (phrase?.y ?? 0) + (phrase?.height ?? 0),
    "la phrase de limite déborde de la fenêtre",
  ).toBeLessThanOrEqual(hauteur);
});

test("les deux hypothèses décisives vivent dans le bloc de limite, et nulle part ailleurs", async ({
  page,
}) => {
  await page.goto("/comparaison/patrimoine");

  // C'est la moitié de la décision : on ne peut pas déplacer l'hypothèse qui
  // commande le résultat sans passer par la phrase qui dit que personne ne la
  // connaît. Les remonter dans le panneau de saisie rendrait le bloc
  // contournable.
  await expect(page.locator("[data-limite] [data-fourchette]")).toHaveCount(2);
  await expect(page.locator("[data-fourchette]")).toHaveCount(2);
  await expect(page.locator('[data-limite] [data-fourchette="appreciation"]')).toBeVisible();
  await expect(page.locator('[data-limite] [data-fourchette="rendement"]')).toBeVisible();
});

test("chaque hypothèse affiche son intervalle et sa fiabilité, jamais une règle", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  const appreciation = page.locator('[data-fourchette="appreciation"]');
  await expect(appreciation.locator("[data-intervalle]")).toContainText("Intervalle observé");
  await expect(appreciation.locator("[data-intervalle]")).toContainText("-2,0 %");
  await expect(appreciation.locator("[data-intervalle]")).toContainText("4,0 %");
  await expect(appreciation.locator("[data-fiabilite]")).toHaveText("estimée");
  // Et le point d'ouverture est déclaré pour ce qu'il est : le milieu d'un
  // intervalle, posé par l'interface, sans autorité.
  await expect(appreciation.locator("[data-sans-valeur-centrale]")).toContainText(
    "Aucune valeur centrale n'est publiée",
  );
  await expect(appreciation.locator("[data-sans-valeur-centrale]")).toContainText("aucune autorité");

  const rendement = page.locator('[data-fourchette="rendement"]');
  // L'union des deux fourchettes relevées : capital garanti et actions.
  await expect(rendement.locator("[data-intervalle]")).toContainText("1,5 %");
  await expect(rendement.locator("[data-intervalle]")).toContainText("7,0 %");
});

/* ── Le retournement ──────────────────────────────────────────────────────── */

test("le retournement se lit : deux énoncés, deux sens contraires", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  // Scénario d'ouverture, horizon 30 ans. Le niveau simple compte 16 508,31 €
  // décaissés EN PLUS par le propriétaire ; le niveau approfondi lui laisse
  // 36 030,77 € DE PLUS une fois le bien vendu et le prêt soldé. Les deux
  // phrases sont vraies et penchent en sens contraire : c'est tout le ticket.
  await expect(chiffre(page, "ecart-simple")).toHaveText(eur("16 508", "31"));
  await expect(page.locator('[data-chiffre="ecart-simple"]')).toContainText(
    "de plus sorti du compte du propriétaire",
  );

  await expect(chiffre(page, "ecart-patrimonial")).toHaveText(eur("36 030", "77"));
  await expect(page.locator('[data-chiffre="ecart-patrimonial"]')).toContainText(
    "de plus dans les mains du propriétaire",
  );

  await expect(chiffre(page, "proprietaire")).toHaveText(eur("263 830", "08"));
  await expect(chiffre(page, "locataire")).toHaveText(eur("227 799", "31"));

  // Et aucun des deux énoncés n'est désigné comme le bon.
  await expect(page.locator("[data-retournement]")).toContainText(
    "Aucun des deux n'est le bon chiffre",
  );
});

test("l'écart est confronté à l'incertitude qui pèse sur chacun des deux", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  // Sur le seul intervalle observé, le patrimoine du propriétaire va de
  // 107 569,58 € à 632 988,17 € : la fourchette est quinze fois plus large que
  // l'écart de 36 030,77 € entre les deux options. Le dire est l'application
  // stricte de « ne jamais afficher une précision qu'on n'a pas ».
  await expect(borne(page, "proprietaire-bas")).toHaveText(eur("107 569", "58"));
  await expect(borne(page, "proprietaire-haut")).toHaveText(eur("632 988", "17"));
  await expect(borne(page, "locataire-bas")).toHaveText(eur("85 967", "61"));
  await expect(borne(page, "locataire-haut")).toHaveText(eur("507 980", "12"));

  await expect(page.locator("[data-incertitude]")).toContainText(
    "Les deux fourchettes se recouvrent",
  );
});

/* ── Les proportions ──────────────────────────────────────────────────────── */

/**
 * Hauteur d'un élément, en pourcentage de la hauteur utile du cadre.
 *
 * La mesure part du bord INTÉRIEUR du cadre — `clientHeight` et non la boîte
 * englobante — parce que la bordure d'un pixel suffit à fausser un rapport sur
 * les petites valeurs.
 *
 * Ce que ces mesures protègent n'est pas un dessin : c'est l'honnêteté de
 * l'échelle. Une hauteur plancher sur les premières années, un axe qui ne
 * partirait pas de son minimum, ou un cadre qui se recalerait sur l'hypothèse
 * retenue rendraient tous les trois ces pourcentages faux.
 */
async function hauteurs(page: Page, selecteurs: readonly string[]) {
  await expect(page.locator("[data-cadre-patrimoine]")).toBeVisible();
  return page.evaluate((liste) => {
    const cadre = document.querySelector("[data-cadre-patrimoine]");
    if (!cadre) return null;
    const boite = cadre.getBoundingClientRect();
    const style = getComputedStyle(cadre);
    const bas = boite.bottom - parseFloat(style.borderBottomWidth);
    const utile = cadre.clientHeight;
    return liste.map((s) => {
      const el = document.querySelector(s);
      if (!el) return NaN;
      const r = el.getBoundingClientRect();
      return ((bas - (r.top + r.height / 2)) / utile) * 100;
    });
  }, selecteurs);
}

const repere = (serie: string, annee: number) =>
  `[data-point="${serie}"][data-annee="${annee}"]`;

test("les repères des deux courbes sont proportionnels aux montants du moteur", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  // Échelle du scénario d'ouverture : de 0 à 632 988,17 €, le haut de la
  // fourchette d'appréciation à l'année 30. Rien n'est tronqué, rien n'a de
  // plancher.
  //   année  1  propriétaire    21 790,43 €  →   3,442 %
  //   année  1  locataire       31 981,45 €  →   5,052 %
  //   année 10  propriétaire   110 533,39 €  →  17,462 %
  //   année 20  locataire      220 449,81 €  →  34,827 %
  //   année 30  locataire      227 799,31 €  →  35,988 %
  //   année 30  propriétaire   263 830,08 €  →  41,680 %
  const mesure = await hauteurs(page, [
    repere("proprietaire", 1),
    repere("locataire", 1),
    repere("proprietaire", 10),
    repere("locataire", 20),
    repere("locataire", 30),
    repere("proprietaire", 30),
  ]);
  expect(mesure, "aucun repère mesurable").not.toBeNull();
  const [p1, l1, p10, l20, l30, p30] = mesure as number[];

  // Aucune hauteur plancher : l'année 1 vaut 3,4 % de l'échelle et pas un pixel
  // de plus. Un plancher, même de trois pixels, ferait échouer cette ligne.
  expect(p1, "repère de l'année 1 non mesurable").toBeGreaterThan(0);
  expect(p1).toBeCloseTo(3.442, 0);
  expect(l1).toBeCloseTo(5.052, 0);
  expect(p10).toBeCloseTo(17.462, 0);
  expect(l20).toBeCloseTo(34.827, 0);
  expect(l30).toBeCloseTo(35.988, 0);
  expect(p30).toBeCloseTo(41.680, 0);
});

test("l'échelle ne se recale pas sur l'hypothèse retenue", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");
  const [locAvant, propAvant] = (await hauteurs(page, [
    repere("locataire", 30),
    repere("proprietaire", 30),
  ])) as number[];
  expect(locAvant).toBeCloseTo(35.988, 0);
  expect(propAvant).toBeCloseTo(41.680, 0);

  // L'appréciation portée à la borne haute de l'intervalle observé. Le
  // propriétaire rejoint alors le sommet de sa fourchette — 100 % —, et le
  // locataire, qui ne dépend pas de cette hypothèse, ne bouge PAS D'UN PIXEL.
  // Un cadre qui se réétalerait sur la nouvelle courbe ferait descendre le
  // repère du locataire, et l'ampleur du changement d'hypothèse deviendrait
  // invisible.
  await page.goto("/comparaison/patrimoine?av=4");
  const [locApres, propApres] = (await hauteurs(page, [
    repere("locataire", 30),
    repere("proprietaire", 30),
  ])) as number[];
  expect(locApres).toBeCloseTo(locAvant as number, 1);
  expect(propApres).toBeCloseTo(100, 0);

  // Et à la borne basse, symétriquement : 107 569,58 € sur la même échelle.
  await page.goto("/comparaison/patrimoine?av=-2");
  const [locBasse, propBasse] = (await hauteurs(page, [
    repere("locataire", 30),
    repere("proprietaire", 30),
  ])) as number[];
  expect(locBasse).toBeCloseTo(locAvant as number, 1);
  expect(propBasse).toBeCloseTo(16.996, 0);
});

test("un produit de vente négatif est dessiné sous la ligne de zéro", async ({ page }) => {
  await page.goto(VENTE_A_PERTE);

  // Sans apport, à −2 % par an et 8 % de commission, revendre à l'année 1 laisse
  // −14 371,65 € : le vendeur doit apporter cette somme pour solder son prêt.
  // C'est le seul chiffre que ce module connaît et que personne n'affiche, et
  // l'écraser à zéro serait le cacher.
  await expect(page.locator('[data-chiffre="proprietaire"] [data-valeur]')).toBeVisible();

  const [zero, an1, an8] = (await hauteurs(page, [
    "[data-etiquette-zero]",
    repere("proprietaire", 1),
    repere("proprietaire", 8),
  ])) as number[];

  // La ligne de zéro flotte à 2,29 % du bas du cadre, et l'année 1 est dessous.
  expect(zero).toBeCloseTo(2.29, 0);
  expect(an1, "l'année 1 n'est pas sous le zéro").toBeLessThan(zero as number);
  expect(an8, "l'année 8 n'est pas au-dessus du zéro").toBeGreaterThan(zero as number);
  // Et la ligne porte son nom : un trait gris ne dit rien de lui-même.
  await expect(page.locator("[data-etiquette-zero]")).toHaveText("zéro");
});

/* ── Le croisement, présent ou absent ─────────────────────────────────────── */

test("le croisement des deux patrimoines se lit quand il existe", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  await expect(page.locator('[data-croisement="oui"]')).toHaveAttribute("data-annee", "8");
  await expect(page.locator("[data-etiquette-croisement]")).toHaveAttribute("data-annee", "8");
  // Il porte son nom écrit, pas seulement un tireté couleur accent.
  await expect(page.locator("[data-etiquette-croisement]")).toContainText("se rejoignent");
  // Et il n'est pas présenté comme un seuil au-delà duquel l'achat produirait
  // davantage : le mot est « égaux ».
  await expect(page.locator('[data-croisement="oui"]')).toContainText("les deux montants sont égaux");
});

test("l'absence de croisement se lit aussi bien que sa présence", async ({ page }) => {
  await page.goto(VENTE_A_PERTE);

  // L'écran doit tenir dans les deux cas — c'est ce que `FIS-006` a appris au
  // niveau simple, dont le scénario d'ouverture a perdu son croisement d'une
  // version à l'autre. Ici, ni trait, ni étiquette, et une phrase à la place.
  await expect(page.locator('[data-croisement="aucun"]')).toBeVisible();
  await expect(page.locator('[data-croisement="aucun"]')).toContainText("ne se rejoignent pas");
  await expect(page.locator('[data-croisement="oui"]')).toHaveCount(0);
  await expect(page.locator("[data-etiquette-croisement]")).toHaveCount(0);

  // Les chiffres, eux, restent tous lisibles.
  await expect(chiffre(page, "proprietaire")).toBeVisible();
  await expect(chiffre(page, "locataire")).toBeVisible();
});

/* ── Le décompte poste par poste ──────────────────────────────────────────── */

test("la vente sort poste par poste, et son total est la somme des sept", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  const poste = (cle: string) =>
    page.locator(`[data-decompte="proprietaire"] [data-poste="${cle}"] [data-montant]`);

  // Année 30, scénario d'ouverture : le prêt est soldé depuis dix ans, donc ni
  // capital restant dû, ni indemnité, ni mainlevée — et la restitution du fonds
  // de caution reste acquise.
  await expect(poste("prixDeCession")).toHaveText(eur("276 309", "03"));
  await expect(poste("commissionAgence")).toHaveText(eur("13 815", "45"));
  await expect(poste("capitalRestantDu")).toHaveText(eur("0"));
  await expect(poste("indemniteRemboursementAnticipe")).toHaveText(eur("0"));
  await expect(poste("mainlevee")).toHaveText(eur("0"));
  await expect(poste("restitutionFondsGarantie")).toHaveText(eur("1 336", "50"));
  await expect(poste("impotPlusValue")).toHaveText(eur("0"));
  await expect(poste("produitNet")).toHaveText(eur("263 830", "08"));

  // Et le portefeuille du locataire se décompose de la même façon : ce qu'il a
  // versé, et ce que cela a rapporté.
  const cote = (cle: string) =>
    page.locator(`[data-decompte="locataire"] [data-poste="${cle}"] [data-montant]`);
  await expect(cote("apport")).toHaveText(eur("25 000"));
  await expect(cote("gains")).toHaveText(eur("186 291"));
  await expect(cote("valeur")).toHaveText(eur("227 799", "31"));
});

test("la résidence principale n'est pas imposée, et le moteur le dit lui-même", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  await expect(page.locator("[data-plus-value]")).toHaveCount(0);
  await expect(
    page.locator('[data-decompte="proprietaire"] [data-poste="impotPlusValue"]'),
  ).toContainText("exonérée");
  // Les réserves du moteur remontent à l'écran, étiquetées de leur provenance.
  await expect(page.locator('[data-reserves] [data-reserve="cession"]').first()).toContainText(
    "résidence principale effective",
  );
});

test("le bien imposable montre deux abattements et deux assiettes", async ({ page }) => {
  await page.goto(IMPOSABLE);
  await lireAnnee(page, 10);

  // Vente à dix ans, appréciation à 4 % : l'impôt existe, et il se décompose.
  await expect(page.locator("[data-plus-value]")).toContainText("Deux abattements, deux assiettes");
  const pv = (cle: string) => page.locator(`[data-plus-value] [data-poste="${cle}"] [data-montant]`);
  await expect(pv("impotRevenu")).toHaveText(eur("9 031", "08"));
  await expect(pv("prelevementsSociaux")).toHaveText(eur("10 715", "77"));
  await expect(pv("impotTotal")).toHaveText(eur("19 746", "85"));

  // Les deux assiettes ne sont pas la même : l'exonération est totale à 22 ans
  // pour l'impôt sur le revenu, à 30 ans pour les prélèvements sociaux.
  const irt = await pv("baseImpotRevenu").innerText();
  const pst = await pv("basePrelevementsSociaux").innerText();
  expect(irt, "les deux assiettes sont confondues en une seule").not.toBe(pst);
});

/* ── Le forfait travaux, refusé avant d'être calculé ──────────────────────── */

test("le forfait travaux ferme les cinq premières années, et l'écran écrit pourquoi", async ({
  page,
}) => {
  await page.goto(FORFAIT_TRAVAUX);

  // Le forfait de 15 % suppose une détention de PLUS de cinq ans. Un écran qui
  // balaie l'horizon depuis l'année 1 rencontre donc ce refus cinq fois, et le
  // moteur lève plutôt que d'approximer. Le refus est anticipé, jamais rattrapé.
  for (const annee of [1, 3, 5]) {
    await expect(
      page.locator(repere("proprietaire", annee)),
      `l'année ${annee} est chiffrée alors que le forfait y est fermé`,
    ).toHaveCount(0);
  }
  await expect(page.locator(repere("proprietaire", 6))).toHaveCount(1);
  // Le locataire, lui, n'a pas de fiscalité de cession : sa courbe est entière.
  await expect(page.locator(repere("locataire", 1))).toHaveCount(1);

  // Et le motif est celui du moteur, article du code général des impôts compris.
  await lireAnnee(page, 3);
  const explication = page.locator("[data-decompte='proprietaire'] [data-non-chiffre]");
  await expect(explication).toContainText("détention de plus de 5 ans");
  await expect(explication).toContainText("150 VB");
});

test("le forfait travaux est grisé quand l'horizon lui-même le ferme", async ({ page }) => {
  // `cession.ts` le demande en toutes lettres : interroger `situationDeCession`
  // puis `motifExclusionForfaitTravaux` pour griser l'option, plutôt que de
  // provoquer une exception pour l'apprendre. L'option reste VISIBLE : un
  // utilisateur qui projette à cinq ans doit pouvoir voir qu'un forfait de 15 %
  // existe et qu'il lui est fermé.
  await page.goto("/comparaison/patrimoine?hz=15&rg=imposable");
  await expect(page.locator('#mode-travaux option[value="forfait"]')).toBeEnabled();

  await page.goto("/comparaison/patrimoine?hz=5&rg=imposable");
  await expect(page.locator('#mode-travaux option[value="forfait"]')).toBeDisabled();
  await expect(page.locator('#mode-travaux option[value="forfait"]')).toHaveCount(1);
});

/* ── L'épuisement du portefeuille ─────────────────────────────────────────── */

test("l'épuisement du portefeuille est signalé, pas dissous", async ({ page }) => {
  // Prêt sur quinze ans, projeté sur trente-cinq, loyer élevé : une fois le prêt
  // soldé, le propriétaire coûte moins cher que le loyer et le locataire de
  // référence doit retirer. Le portefeuille finit par ne plus suivre — à partir
  // de là, les deux colonnes ne décrivent plus le même effort.
  await page.goto("/comparaison/patrimoine?ap=0&du=180&hz=35&ly=1400");

  const alerte = page.locator("[data-epuisement]");
  await expect(alerte).toBeVisible();
  await expect(alerte).toHaveAttribute("data-annee", "20");
  await expect(alerte).toContainText("la comparaison cesse d'en être une");
  await expect(alerte).toContainText("n'ont pas pu être financés");
});

/* ── Les trois sorties ────────────────────────────────────────────────────── */

test("deux des trois sorties sont annoncées comme non modélisées", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  await expect(page.locator("[data-sortie]")).toHaveCount(3);
  await expect(page.locator('[data-sortie][data-modelisee="oui"]')).toHaveCount(1);
  await expect(page.locator('[data-sortie][data-modelisee="non"]')).toHaveCount(2);

  await expect(page.locator('[data-sortie="vente"]')).toContainText("chiffrée ici");

  // Ni grisées, ni datées, ni annoncées « à venir » : dites absentes, en toutes
  // lettres. `UI-014` a corrigé l'erreur symétrique sur l'accueil ; celle-ci
  // porterait sur un chiffre, et serait pire.
  for (const cle of ["location-longue-duree", "location-courte-duree"]) {
    const sortie = page.locator(`[data-sortie="${cle}"]`);
    await expect(sortie).toContainText("non modélisée");
    await expect(sortie).toContainText(/n'existe pas/i);
    await expect(sortie, `${cle} est annoncée comme prochaine`).not.toContainText(/à venir/i);
  }

  // Et la mention figure aussi dans le bloc de limite, avant tout chiffre.
  await expect(page.locator("[data-limite] [data-une-sortie]")).toContainText(
    "Une sortie sur trois est chiffrée",
  );
});

/* ── L'état d'URL ─────────────────────────────────────────────────────────── */

test("une URL nue ne porte aucun paramètre, et un scénario partagé les redonne", async ({
  page,
}) => {
  await page.goto("/comparaison/patrimoine");
  expect(new URL(page.url()).search, "l'URL nue porte des paramètres").toBe("");

  await page.goto("/comparaison/patrimoine?av=3&rd=2&ly=1150");
  await expect(page.locator("#appreciation")).toHaveValue(/3,0/);
  await expect(page.locator("#rendement")).toHaveValue(/2,0/);
  await expect(page.locator("#loyer")).toHaveValue(/1[\s  ]?150/);
});

test("l'année lue ne part pas dans l'URL, les hypothèses si", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  // ADR-005 : ce qui change un chiffre entre dans l'URL, ce qui change un
  // cadrage n'y entre pas. L'année lue ne change aucun nombre — elle change
  // lequel on regarde.
  await lireAnnee(page, 12);
  await expect(page.locator("[data-curseur]")).toContainText("Année 12");
  expect(new URL(page.url()).search, "un cadrage s'est inscrit dans l'URL").toBe("");

  // Les deux hypothèses, elles, changent TOUS les chiffres de la page : un lien
  // qui ne les porterait pas rendrait d'autres nombres que ceux qu'on croyait
  // envoyer.
  await page.locator("#appreciation").fill("3");
  await page.locator("#appreciation").blur();
  await expect(page).toHaveURL(/[?&]av=3\b/);
});

/* ── Les chemins entre les deux niveaux ───────────────────────────────────── */

test("on va du niveau simple au niveau approfondi, et le scénario suit", async ({ page }) => {
  await page.goto("/comparaison?ly=1150&fe=16400");

  const lien = page.locator("[data-vers-patrimoine]");
  await expect(lien).toBeVisible();
  await lien.click();

  await expect(page).toHaveURL(/\/comparaison\/patrimoine\?/);
  // La promesse centrale du produit : le lien redonne exactement les mêmes
  // chiffres. Changer de niveau ne doit pas perdre le ménage qu'on décrivait.
  await expect(page.locator("#loyer")).toHaveValue(/1[\s  ]?150/);
  await expect(page.locator("#frais-entree")).toHaveValue(/16[\s  ]?400/);
});

test("on revient au niveau simple et au module crédit, en cliquant", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  await page.locator("[data-vers-comparaison]").click();
  await expect(page).toHaveURL(/\/comparaison(\?|$)/);
  await expect(page.locator("[data-limite]")).toContainText("Cette comparaison est faussée");

  await page.goto("/comparaison/patrimoine");
  await page.locator("[data-vers-credit]").click();
  await expect(page).toHaveURL(/\/credit$/);
});

test("le niveau simple n'annonce plus le niveau approfondi comme absent", async ({ page }) => {
  // L'erreur d'`UI-014`, en miniature : `/comparaison` disait « ce niveau n'est
  // pas encore construit ». Il l'est. Une phrase qui décrit l'état d'un écran
  // doit rougir quand cet état change.
  await page.goto("/comparaison");
  const limites = await page.locator("[data-limites]").innerText();
  expect(limites, "le niveau simple dit encore que le niveau approfondi n'existe pas").not.toMatch(
    /n'est pas encore construit/i,
  );
  expect(limites).toContain("coût d'opportunité de l'apport");
});

/* ── Elle ne recommande rien ──────────────────────────────────────────────── */

const PRESCRIPTIONS: readonly RegExp[] = [
  ...PRESCRIPTIONS_GENERALES,
  ...PRESCRIPTIONS_COMPARAISON,
  ...PRESCRIPTIONS_PATRIMOINE,
];

test("aucune tournure prescriptive n'atteint le lecteur", async ({ page }) => {
  for (const adresse of ["/comparaison/patrimoine", IMPOSABLE, VENTE_A_PERTE]) {
    await page.goto(adresse);
    // Le document entier, avertissement et pied de page compris.
    const texte = await page.locator("body").innerText();
    for (const tournure of PRESCRIPTIONS) {
      expect(texte, `${adresse} emploie ${tournure.source}`).not.toMatch(tournure);
    }
  }
});

test("la page dit ce qu'elle ne dit pas", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");
  const texte = await page.locator("main").innerText();

  await expect(page.locator("[data-limites]")).toHaveCount(1);
  // Les trois réserves que le moteur a explicitement laissées à l'interface.
  expect(texte).toContain("place réellement l'écart chaque mois");
  expect(texte).toContain("enveloppe fiscale");
  expect(texte).toContain("Espace économique européen");
});

/* ── Ce que l'écran doit à tout le site ───────────────────────────────────── */

test("l'avertissement et le pied de page sont là", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  await expect(page.locator("[data-avertissement]")).toBeVisible();
  await expect(page.locator("[data-pied]")).toBeVisible();
});

/* ── Les deux profils ─────────────────────────────────────────────────────── */

test("aucun montant n'est rogné dans sa boîte", async ({ page }) => {
  // Le scénario le plus large du module : un bien à 620 000 € projeté sur
  // 35 ans, imposable, apprécié à 4 %. Les montants y dépassent le million.
  await page.goto(
    "/comparaison/patrimoine?px=620000&ap=60000&tx=4.1&du=300&hz=35&ly=1900&rg=imposable&av=4",
  );
  await expect(page.locator("[data-cadre-patrimoine]")).toBeVisible();

  const rognes = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        "[data-valeur], [data-lecture], [data-montant], [data-borne]",
      ),
    ]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => (el.textContent ?? "").trim())
      .slice(0, 10),
  );

  expect(rognes, "montants rognés").toEqual([]);
});

test("la page ne déborde pas latéralement", async ({ page }) => {
  for (const adresse of ["/comparaison/patrimoine", IMPOSABLE, FORFAIT_TRAVAUX]) {
    await page.goto(adresse);
    await expect(page.locator("[data-cadre-patrimoine]")).toBeVisible();

    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(deborde, `${adresse} défile latéralement`).toBe(false);
  }
});

test("les deux libellés de courbe ne se recouvrent jamais", async ({ page }) => {
  await page.goto("/comparaison/patrimoine");

  const a = await page.locator('[data-libelle-courbe="proprietaire"]').boundingBox();
  const b = await page.locator('[data-libelle-courbe="locataire"]').boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  const separes =
    (a?.y ?? 0) + (a?.height ?? 0) <= (b?.y ?? 0) || (b?.y ?? 0) + (b?.height ?? 0) <= (a?.y ?? 0);
  expect(separes, "les deux libellés de courbe se recouvrent").toBe(true);
});

/* ── Outils ───────────────────────────────────────────────────────────────── */

/**
 * Déplace le curseur d'année.
 *
 * `Home` ramène à la première année quel que soit l'état, puis autant de flèches
 * que nécessaire : `fill` sur un `input[type=range]` ne déclenche pas partout
 * l'événement que React écoute, et un test qui dépend de ce détail-là ne teste
 * plus ce qu'il croit.
 */
async function lireAnnee(page: Page, annee: number) {
  const curseur = page.locator("#annee-patrimoine");
  await curseur.focus();
  await curseur.press("Home");
  for (let i = 1; i < annee; i++) await curseur.press("ArrowRight");
  await expect(page.locator("[data-curseur]")).toContainText(`Année ${annee} :`);
}
