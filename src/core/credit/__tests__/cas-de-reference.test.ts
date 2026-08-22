import { describe, it, expect } from "vitest";
import { euros, toEuros, sum } from "../../money";
import { PARAMS_2026 as P } from "../../fiscal/params";
import { amortize, monthlyPayment } from "../schedule";
import { monthlyPremium } from "../insurance";
import { apr, taea } from "../apr";
import { checkHcsf, usuryThreshold } from "../constraints";
import { buildCreditPlan } from "../plan";

/**
 * CAS DE RÉFÉRENCE VÉRIFIÉS CONTRE UNE SOURCE EXTÉRIEURE — `ENG-008`
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═══
 *
 * `docs/02-architecture.md`, section 5, demande « une poignée de scénarios dont
 * le résultat est vérifié contre une source externe : un tableau d'amortissement
 * produit par une banque ou une feuille de calcul indépendante ». `reference.test.ts`
 * n'en portait qu'un — 150 000 € / 4 % / 20 ans, cité par La finance pour tous.
 * Un cas n'est pas une poignée, et c'est à ce titre que `ENG-008` est resté ouvert.
 *
 * Pourquoi un fichier neuf plutôt qu'un ajout dans `reference.test.ts` : `src/core/credit/**`
 * est gelé (ADR-004). Ajouter de la couverture sans toucher une ligne vérifiée sert
 * le gel au lieu de le contourner — c'est le précédent posé par `garantie.test.ts`.
 *
 * ═══ LA RÈGLE QUI GOUVERNE CHAQUE CAS CI-DESSOUS ═══
 *
 * **Une valeur attendue ne vient jamais de notre propre moteur.** Lancer le calcul,
 * lire le résultat et l'inscrire comme attendu ne prouverait rien : cela figerait un
 * comportement au lieu de le vérifier. Chaque nombre attendu est recopié d'une source
 * extérieure, nommée, datée et liée. Le moteur n'a servi qu'à MESURER l'écart, jamais
 * à le décider.
 *
 * ═══ CE QU'UNE TOLÉRANCE VEUT DIRE ICI ═══
 *
 * Un établissement arrondit chaque échéance au centime et fait absorber le résidu par
 * la dernière ; un site pédagogique multiplie souvent une mensualité NON arrondie par
 * le nombre d'échéances. Les deux sont défendables et diffèrent de quelques centimes.
 * Chaque tolérance ci-dessous est donc une constante nommée, chiffrée, et justifiée
 * par la convention qui l'explique — jamais un `toBeCloseTo` généreux et muet. Là où
 * l'accord est exact au centime, l'égalité est stricte, et c'est le cas le plus fréquent.
 */

/* ══════════════════════════════════════════════════════════════════════════════
 * CAS 1 et 2 — La finance pour tous
 * ══════════════════════════════════════════════════════════════════════════════ */

/**
 * SOURCE — La finance pour tous (Institut pour l'éducation financière du public,
 * organisme reconnu d'utilité publique), « Combien coûte votre emprunt ? ».
 * @see https://www.lafinancepourtous.com/decryptages/finance-perso/banque-et-credit/taux-d-interet/combien-coute-votre-emprunt-2/
 * Page consultée le 22 août 2026.
 *
 * ── DEUX HYPOTHÈSES DE CETTE PAGE ONT ÉTÉ ÉCARTÉES ──
 *
 * La page publie trois hypothèses. Une seule est retenue, et il faut dire pourquoi
 * les deux autres ne le sont pas — une source n'est pas fiable en bloc.
 *
 * · Hypothèse B — 200 000 € à 1,8 % sur 20 ans, mensualité annoncée **922,93 €**,
 *   coût global annoncé 38 303,70 €. Les deux chiffres se contredisent : 38 303,70 €
 *   de coût sur 240 échéances implique une mensualité de 992,93 €, qui est aussi ce
 *   que donne la formule de l'annuité. Le « 922,93 € » est une inversion de chiffres.
 *   Écartée : bâtir un test sur une valeur qu'il faut corriger soi-même, c'est
 *   redevenir sa propre source.
 *
 * · Hypothèse C — 253 000 € à 1,8 % sur 25 ans, mensualité annoncée 1 256,06 €,
 *   coût global annoncé 48 454,18 €. Ces paramètres donnent 1 047,89 € et
 *   61 366,57 €. Aucune lecture ne réconcilie les trois nombres : à 1 256,06 € de
 *   mensualité correspondrait un capital de 303 260 €, au coût annoncé un capital de
 *   242 555 €. La ligne est fausse. Écartée.
 *
 * Seule l'hypothèse A est cohérente avec elle-même et avec la formule.
 */
describe("La finance pour tous — hypothèse A, 200 000 € / 1,65 % / 15 ans", () => {
  /**
   * PARAMÈTRES PUBLIÉS : emprunt 200 000 €, taux d'intérêt hors frais fixes 1,65 %,
   * durée 15 ans, remboursement mensuel.
   * VALEUR ANNONCÉE : mensualité **1 255,04 €**.
   *
   * TOLÉRANCE : aucune. L'annuité exacte vaut 1 255,0370 € ; arrondie au centime
   * selon la convention commerciale du moteur, elle tombe exactement sur la valeur
   * publiée. Une durée différente de celle du cas historique (240 mois), ce qui est
   * précisément ce que `ENG-008` demandait d'ajouter.
   */
  it("reproduit la mensualité publiée, au centime", () => {
    expect(toEuros(monthlyPayment(euros(200_000), 1.65, 180))).toBe(1255.04);
  });

  /**
   * VALEUR ANNONCÉE : coût global du crédit hors frais fixes **25 906,67 €**.
   *
   * TOLÉRANCE : 10 centimes, et l'écart mesuré en vaut 5.
   *
   * POURQUOI. La page définit le coût global comme « la différence entre le total des
   * mensualités et le montant de l'emprunt », et le calcule à partir de la mensualité
   * NON arrondie : 1 255,0370 × 180 − 200 000 = 25 906,67 €. Le moteur, lui, arrondit
   * chaque échéance au centime et fait solder la dernière exactement — convention
   * bancaire, et condition de l'invariant « la somme des parts de capital égale le
   * capital emprunté ». Il rend 25 906,62 €.
   *
   * Les 5 centimes ne sont donc pas une imprécision : ils sont la trace d'une
   * convention d'arrondi différente, sur 180 échéances. Les masquer par une tolérance
   * large reviendrait à cesser de savoir ce qu'on mesure ; la borne est fixée juste
   * au-dessus de l'écart attendu, de sorte qu'une dérive du moteur la ferait rougir.
   */
  it("reproduit le coût global publié, à la convention d'arrondi près", () => {
    const TOLERANCE_ARRONDI_EUROS = 0.1;
    const lignes = amortize({
      id: "lfpt-a",
      label: "hypothèse A",
      principal: euros(200_000),
      annualRatePct: 1.65,
      months: 180,
    });
    const coutGlobal = toEuros(sum(lignes.map((l) => l.interest)));
    expect(Math.abs(coutGlobal - 25_906.67)).toBeLessThanOrEqual(TOLERANCE_ARRONDI_EUROS);
  });
});

/**
 * SOURCE — La finance pour tous, même page, section « Les différentes modalités de
 * remboursement du prêt », 1er cas : annuités constantes.
 * @see https://www.lafinancepourtous.com/decryptages/finance-perso/banque-et-credit/taux-d-interet/combien-coute-votre-emprunt-2/
 * Page consultée le 22 août 2026.
 *
 * PARAMÈTRES PUBLIÉS : 50 000 € empruntés sur 4 ans au taux de 2 %, remboursés
 * PAR ANNUITÉS (la page le précise : « supposons pour plus de simplicité que les
 * paiements se font par annuités »).
 *
 * VALEURS ANNONCÉES — le tableau d'amortissement complet :
 *
 *   année | capital restant | intérêts  | remboursement | annuité
 *      1  |    50 000,00 €  | 1 000,00 €|   12 131,19 € | 13 131,19 €
 *      2  |    37 868,81 €  |   757,38 €|   12 373,81 € | 13 131,19 €
 *      3  |    25 495,00 €  |   509,90 €|   12 621,29 € | 13 131,19 €
 *      4  |    12 873,71 €  |   257,47 €|   12 873,71 € | 13 131,19 €
 *   total |                 | 2 524,75 €|   50 000,00 € | 52 524,75 €
 *
 * ── COMMENT UN MOTEUR MENSUEL LIT UN TABLEAU ANNUEL ──
 *
 * `amortize` ne connaît pas de périodicité : il connaît des PÉRIODES, et un taux
 * annuel nominal qu'il divise proportionnellement par douze (`monthlyRate`). Un taux
 * de 2 % PAR PÉRIODE sur 4 périodes s'exprime donc exactement par `annualRatePct: 24`
 * et `months: 4`, puisque 24 / 100 / 12 = 0,02. Ce n'est pas un détournement : c'est
 * la même formule d'annuité constante, appliquée au pas de temps de la source.
 *
 * L'intérêt de ce cas est qu'il ne vérifie pas un seul nombre mais la RÉPARTITION
 * ligne à ligne entre intérêts et capital — ce qu'aucun autre cas de référence du
 * dépôt ne faisait. C'est le « tableau d'amortissement » que l'architecture réclame.
 */
describe("La finance pour tous — tableau d'amortissement 50 000 € / 2 % par période / 4 périodes", () => {
  const lignes = amortize({
    id: "lfpt-annuites",
    label: "annuités constantes",
    principal: euros(50_000),
    annualRatePct: 24,
    months: 4,
  });

  /** TOLÉRANCE : aucune. L'annuité publiée est reproduite au centime. */
  it("reproduit l'annuité constante publiée", () => {
    expect(toEuros(monthlyPayment(euros(50_000), 24, 4))).toBe(13_131.19);
  });

  /**
   * TOLÉRANCE : aucune sur les quatre lignes. Intérêts, part de capital et capital
   * restant dû coïncident exactement avec le tableau publié.
   */
  it("reproduit les quatre lignes du tableau, au centime", () => {
    const attendu = [
      { interets: 1_000.0, capital: 12_131.19, restant: 37_868.81 },
      { interets: 757.38, capital: 12_373.81, restant: 25_495.0 },
      { interets: 509.9, capital: 12_621.29, restant: 12_873.71 },
      { interets: 257.47, capital: 12_873.71, restant: 0 },
    ];
    expect(lignes).toHaveLength(4);
    for (const [i, ligne] of attendu.entries()) {
      expect(toEuros(lignes[i]!.interest)).toBe(ligne.interets);
      expect(toEuros(lignes[i]!.principal)).toBe(ligne.capital);
      expect(toEuros(lignes[i]!.balance)).toBe(ligne.restant);
    }
  });

  /** TOLÉRANCE : aucune. Le total d'intérêts publié tombe au centime. */
  it("reproduit le total d'intérêts publié", () => {
    expect(toEuros(sum(lignes.map((l) => l.interest)))).toBe(2_524.75);
  });

  /**
   * DÉSACCORD ASSUMÉ, ET DOCUMENTÉ PLUTÔT QUE MASQUÉ.
   *
   * La source annonce quatre annuités rigoureusement identiques, 13 131,19 € chacune.
   * Le moteur rend 13 131,18 € à la quatrième : sa dernière échéance ne recopie pas
   * l'annuité théorique, elle SOLDE le capital restant dû, au centime près. Un centime
   * de moins, donc — et c'est la bonne réponse : elle garantit que la somme des parts
   * de capital fait exactement 50 000 €, invariant testé par ailleurs. Une annuité
   * théorique répétée à l'identique laisserait un résidu d'un centime au débit de
   * l'emprunteur.
   *
   * Ce test fige l'écart au lieu de l'effacer : s'il grandissait, il rougirait.
   */
  it("solde la dernière annuité au centime près, un centime sous l'annuité publiée", () => {
    const ANNUITE_PUBLIEE = 13_131.19;
    expect(toEuros(lignes[3]!.payment)).toBe(ANNUITE_PUBLIEE - 0.01);
    expect(sum(lignes.map((l) => l.principal))).toBe(euros(50_000));
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
 * CAS 3, 4 et 5 — exemple représentatif d'une banque
 * ══════════════════════════════════════════════════════════════════════════════ */

/**
 * SOURCE — Société Générale (SG), « Prêt immobilier à taux fixe », encart
 * « Exemple représentatif de financement d'une acquisition immobilière ».
 * @see https://particuliers.sg.fr/campagne-media/pret-credit-immobilier/pret-taux-fixe
 * Conditions en vigueur au 01/05/2025, telles qu'affichées par la banque.
 * Page consultée le 22 août 2026.
 *
 * Un exemple représentatif n'est pas une illustration pédagogique : c'est une mention
 * imposée à la publicité pour crédit immobilier, produite par l'établissement sous sa
 * responsabilité, et calculée avec l'outil qui produira l'offre. C'est le plus proche
 * équivalent public d'un « tableau d'amortissement produit par une banque ».
 *
 * PARAMÈTRES PUBLIÉS
 *   prêt amortissable, sans différé, 200 000 € sur 20 ans, décaissé en une seule fois,
 *   emprunteur résident fiscal en France âgé de 35 ans, cautionné par Crédit Logement,
 *   taux débiteur annuel fixe **3,30 %**.
 *
 * VALEURS ANNONCÉES
 *   · 239 mensualités de 1 182,80 € assurance obligatoire incluse,
 *     et une mensualité de 1 183,03 € assurance incluse
 *   · coût total du crédit 89 234,23 €, dont :
 *       – 73 473,03 € d'intérêts
 *       – 10 399,20 € d'assurance, soit une cotisation de 43,33 € par mois,
 *         et un TAEA de 0,44 %
 *       – 2 000 € de frais de dossier
 *       – 2 750 € de frais de garantie Crédit Logement
 *       – 612 € de frais de tenue de compte
 *   · TAEG fixe **4,10 %**
 *   · montant total dû, assurance incluse : 289 234,23 €
 *
 * COHÉRENCE INTERNE VÉRIFIÉE AVANT USAGE : 73 473,03 + 10 399,20 + 2 000 + 2 750 + 612
 * = 89 234,23 ✓ ; 239 × 1 182,80 + 1 183,03 − 240 × 43,33 − 200 000 = 73 473,03 ✓ ;
 * 200 000 + 89 234,23 = 289 234,23 ✓. Contrairement aux hypothèses B et C ci-dessus,
 * cet exemple ne se contredit nulle part.
 */
describe("Société Générale — exemple représentatif, 200 000 € / 3,30 % / 20 ans", () => {
  const PRET = {
    id: "sg",
    label: "exemple représentatif SG",
    principal: euros(200_000),
    annualRatePct: 3.3,
    months: 240,
  };
  /** Cotisation publiée 43,33 €/mois — voir la déduction du taux au cas 4. */
  const COTISATION_ASSURANCE = euros(43.33);

  const lignes = amortize(PRET);

  /**
   * CAS 3 — l'échéancier complet.
   *
   * VALEURS ANNONCÉES : mensualité hors assurance 1 182,80 − 43,33 = **1 139,47 €**,
   * dernière mensualité 1 183,03 − 43,33 = **1 139,70 €**, intérêts totaux
   * **73 473,03 €**.
   *
   * TOLÉRANCE : aucune, sur les trois. Le moteur reproduit au centime la mensualité,
   * la dernière échéance MAJORÉE que la banque publie séparément, et le total
   * d'intérêts sur 240 échéances. C'est le résultat le plus fort de ce fichier : il
   * établit que notre convention d'arrondi — arrondi commercial de chaque intérêt,
   * dernière échéance soldante — est celle de l'établissement, et pas seulement une
   * convention défendable parmi d'autres.
   */
  it("reproduit au centime la mensualité, la dernière échéance et les intérêts totaux", () => {
    expect(toEuros(lignes[0]!.payment)).toBe(1_139.47);
    expect(toEuros(lignes[239]!.payment)).toBe(1_139.7);
    expect(toEuros(sum(lignes.map((l) => l.interest)))).toBe(73_473.03);
  });

  /**
   * CAS 4 — le coût de l'assurance.
   *
   * VALEURS ANNONCÉES : cotisation **43,33 € par mois**, montant total dû au titre de
   * l'assurance **10 399,20 €** sur 240 mois.
   *
   * CE QUE LA SOURCE NE PUBLIE PAS, ET COMMENT ON LE RETROUVE. SG publie la cotisation,
   * pas le taux d'assurance. Le taux se déduit : 43,33 × 12 / 200 000 = 0,25998 %, qui
   * tombe sur 0,26 % à moins de trois millièmes de point. Cette rondeur est elle-même
   * la vérification : elle n'apparaît QUE si la prime est une fraction constante du
   * capital INITIAL divisée par douze. Une prime assise sur le capital restant dû, ou
   * une division par 12 appliquée après arrondi, ne produirait pas un taux rond.
   * La base « capital initial » n'est donc pas supposée, elle est constatée.
   *
   * TOLÉRANCE : aucune. À 0,26 % sur capital initial, le moteur rend 43,33 € et
   * 10 399,20 €, exactement les montants publiés.
   */
  it("reproduit la cotisation d'assurance et son coût total, au centime", () => {
    const TAUX_DEDUIT = 0.26;
    const prime = monthlyPremium(PRET.principal, {
      annualRatePct: TAUX_DEDUIT,
      basis: "initial",
      coveragePct: 100,
    });
    expect(prime).toBe(COTISATION_ASSURANCE);
    expect(toEuros(prime * 240)).toBe(10_399.2);
    // La déduction du taux tient à 0,003 point près, ce qui est ce qui la rend crédible.
    expect(Math.abs((toEuros(prime) * 12 * 100) / 200_000 - TAUX_DEDUIT)).toBeLessThan(0.003);
  });

  /**
   * CAS 5 — le TAEG, frais compris, et le TAEA.
   *
   * VALEURS ANNONCÉES : TAEG fixe **4,10 %**, TAEA **0,44 %**.
   *
   * PÉRIMÈTRE DES FRAIS RETENU. L'exemple porte trois frais distincts. Frais de dossier
   * (2 000 €) et frais de garantie (2 750 €) sont prélevés au déblocage : ils diminuent
   * la somme effectivement mise à disposition. Les frais de tenue de compte (612 €) sont
   * perçus tout au long du prêt : ils alourdissent chaque échéance, soit 2,55 € par mois
   * — et 2,55 × 240 = 612 € exactement. C'est la lecture conforme à l'art. R314-4 du
   * code de la consommation, qui inclut la tenue de compte imposée dans le coût total.
   *
   * Ce partage n'est pas indifférent, et c'est la leçon du cas : traiter les 612 € comme
   * un frais initial donnerait 4,11 % au lieu de 4,10 %. Le TAEG dépend du CALENDRIER
   * des frais autant que de leur montant.
   *
   * TOLÉRANCE : 0,01 point sur le TAEG, 0,005 sur le TAEA ; les écarts mesurés valent
   * 0,004 et 0,0003. Cette borne n'est pas un confort mais la précision même de la
   * grandeur : l'annexe à l'art. R314-3 n'impose qu'UNE décimale au TAEG publié, si bien
   * que « 4,10 % » désigne en toute rigueur l'intervalle [4,095 % ; 4,105 %]. Nous rendons
   * 4,0961 %. Exiger davantage serait exiger de la source une précision qu'elle
   * n'affirme pas.
   */
  it("reproduit le TAEG frais compris et le TAEA publiés", () => {
    const TOLERANCE_TAEG_POINTS = 0.01;
    const TOLERANCE_TAEA_POINTS = 0.005;
    const TENUE_DE_COMPTE_MENSUELLE = euros(2.55);

    // Somme réellement mise à disposition : capital net des frais retenus au départ.
    const netAdvanced = PRET.principal - euros(2_000) - euros(2_750);
    const avecAssurance = lignes.map(
      (l) => l.payment + COTISATION_ASSURANCE + TENUE_DE_COMPTE_MENSUELLE,
    );
    const sansAssurance = lignes.map((l) => l.payment + TENUE_DE_COMPTE_MENSUELLE);

    expect(toEuros(TENUE_DE_COMPTE_MENSUELLE * 240)).toBe(612);

    const taeg = apr({ netAdvanced, payments: avecAssurance });
    expect(Math.abs(taeg - 4.1)).toBeLessThanOrEqual(TOLERANCE_TAEG_POINTS);
    // Arrondi à la décimale imposée par l'annexe à l'art. R314-3 : la valeur publiée.
    expect(Number(taeg.toFixed(P.apr.displayDecimals))).toBe(4.1);

    const taeaMesure = taea(
      { netAdvanced, payments: avecAssurance },
      { netAdvanced, payments: sansAssurance },
    );
    expect(Math.abs(taeaMesure - 0.44)).toBeLessThanOrEqual(TOLERANCE_TAEA_POINTS);
  });

  /**
   * LA GARDE MORD — vérifié par perturbation, sans toucher au moteur.
   *
   * `docs/REGISTRE-TESTS.md` demande qu'une garde ait échoué au moins une fois avant
   * qu'on la déclare protectrice. Ici la perturbation ne peut pas passer par une
   * modification de l'implémentation : `src/core/credit/**` est gelé (ADR-004).
   *
   * Elle passe donc par le seul levier que `LoanSpec` expose déjà — la convention
   * d'arrondi du contrat. En troncature, le moteur rend 73 471,32 € d'intérêts et une
   * dernière échéance de 1 137,99 € : l'accord avec la banque disparaît sur les deux
   * chiffres. L'égalité au centime constatée plus haut identifie donc une convention
   * PRÉCISE, celle de la source, et non un résultat robuste à n'importe quel arrondi.
   *
   * ── UN RÉSULTAT AU PASSAGE ──
   *
   * `half-even` rend EXACTEMENT les mêmes montants que `half-up` sur ce prêt. Ce n'est
   * pas un défaut de la perturbation : un intérêt mensuel ne tombe pratiquement jamais
   * sur un demi-centime pile, et sans égalité parfaite les deux conventions décident
   * à l'identique. Le choix entre elles ne se joue donc pas ici — seule la troncature
   * se distingue. Cela recoupe la mesure consignée dans `docs/INDEX.md` : moins de 5 €
   * d'écart entre conventions sur 300 échéances.
   */
  it("perd l'accord au centime dès qu'on tronque au lieu d'arrondir", () => {
    const tronque = amortize({ ...PRET, rounding: "down" });
    expect(toEuros(sum(tronque.map((l) => l.interest)))).not.toBe(73_473.03);
    expect(toEuros(tronque[239]!.payment)).not.toBe(1_139.7);

    // Et la mensualité publiée par La finance pour tous cesse elle aussi d'être atteinte.
    expect(toEuros(monthlyPayment(euros(200_000), 1.65, 180, "down"))).not.toBe(1_255.04);

    // …tandis que l'arrondi au pair le plus proche est indiscernable de l'arrondi
    // commercial sur ce prêt : aucune échéance ne tombe sur un demi-centime pile.
    const pair = amortize({ ...PRET, rounding: "half-even" });
    expect(toEuros(sum(pair.map((l) => l.interest)))).toBe(73_473.03);
  });

  /**
   * Contrôle de bout en bout : le montant total dû publié, 289 234,23 €, se
   * reconstitue à partir de l'échéancier du moteur, de l'assurance et des trois frais.
   *
   * TOLÉRANCE : aucune. Toutes les briques tombant au centime, leur somme aussi.
   */
  it("reconstitue le montant total dû publié", () => {
    const echeances = sum(lignes.map((l) => l.payment)) + COTISATION_ASSURANCE * 240;
    const frais = euros(2_000) + euros(2_750) + euros(612);
    expect(toEuros(echeances + frais)).toBe(289_234.23);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
 * CAS 6 — seuils de l'usure
 * ══════════════════════════════════════════════════════════════════════════════ */

/**
 * SOURCE — Avis du 26 juin 2026 relatif à l'application des articles L. 314-6 du code
 * de la consommation et L. 313-5-1 du code monétaire et financier concernant l'usure,
 * publié au Journal officiel.
 * @see https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054323743
 * Consulté le 22 août 2026.
 *
 * PARAMÈTRES PUBLIÉS — prêts immobiliers aux particuliers, taux effectifs moyens
 * pratiqués au 2e trimestre 2026 et seuils applicables à compter du 1er juillet 2026 :
 *
 *   catégorie                          | taux moyen | seuil de l'usure
 *   prêts à taux fixe < 10 ans         |   3,05 %   |      4,07 %
 *   prêts à taux fixe de 10 à < 20 ans |   3,43 %   |      4,57 %
 *   prêts à taux fixe de 20 ans et plus|   3,97 %   |      5,29 %
 *   prêts à taux variable              |   3,96 %   |      5,28 %
 *   prêts-relais                       |   4,79 %   |      6,39 %
 *
 * Deux choses distinctes sont vérifiées ici, et il faut les séparer.
 */
describe("Avis du 26 juin 2026 — seuils de l'usure du 3e trimestre 2026", () => {
  const AVIS_26_JUIN_2026 = {
    fixedUnder10y: { moyen: 3.05, seuil: 4.07 },
    fixed10to20y: { moyen: 3.43, seuil: 4.57 },
    fixed20yPlus: { moyen: 3.97, seuil: 5.29 },
    variable: { moyen: 3.96, seuil: 5.28 },
    bridge: { moyen: 4.79, seuil: 6.39 },
  } as const;

  /**
   * Les valeurs du millésime sont-elles celles du Journal officiel ?
   *
   * TOLÉRANCE : aucune. `params.ts` a été écrit en août 2026 à partir d'une recherche
   * distincte ; ce test le confronte au texte publié, catégorie par catégorie. C'est
   * la seule manière de savoir qu'une donnée réglementaire est juste plutôt que
   * seulement plausible, et c'est ce que réclame `docs/02-architecture.md`, section 4.
   */
  it("fige les cinq seuils publiés au Journal officiel", () => {
    expect(P.usury.quarter).toBe("2026-T3");
    expect(P.usury.from).toBe("2026-07-01");
    expect(P.usury.fixedUnder10y).toBe(AVIS_26_JUIN_2026.fixedUnder10y.seuil);
    expect(P.usury.fixed10to20y).toBe(AVIS_26_JUIN_2026.fixed10to20y.seuil);
    expect(P.usury.fixed20yPlus).toBe(AVIS_26_JUIN_2026.fixed20yPlus.seuil);
    expect(P.usury.variable).toBe(AVIS_26_JUIN_2026.variable.seuil);
    expect(P.usury.bridge).toBe(AVIS_26_JUIN_2026.bridge.seuil);
  });

  /**
   * Le seuil se déduit-il du taux moyen comme le dit la loi ?
   *
   * @source Code de la consommation, art. L314-6 : le seuil de l'usure est le taux
   *   effectif moyen pratiqué au cours du trimestre précédent, « augmenté d'un tiers ».
   *
   * TOLÉRANCE : aucune, après arrondi à deux décimales — c'est la précision à laquelle
   * l'avis publie ses taux. Les cinq catégories tombent juste : 3,05 × 4/3 = 4,0667 → 4,07 ;
   * 3,43 → 4,57 ; 3,97 → 5,29 ; 3,96 → 5,28 ; 4,79 → 6,39.
   *
   * Ce test ne vérifie pas notre code — il vérifie que les deux colonnes de l'avis sont
   * bien liées par la règle que le moteur explique à l'utilisateur. Si un jour elles ne
   * l'étaient plus, notre pédagogie serait fausse avant nos calculs.
   */
  it("retrouve chaque seuil par la majoration d'un tiers du taux moyen", () => {
    for (const { moyen, seuil } of Object.values(AVIS_26_JUIN_2026)) {
      expect(Number(((moyen * 4) / 3).toFixed(2))).toBe(seuil);
    }
  });

  /**
   * Les tranches de durée du moteur sont-elles celles de l'avis ?
   *
   * L'avis distingue « moins de 10 ans », « de 10 ans à moins de 20 ans » et « 20 ans
   * et plus ». Les bornes sont donc exclusives en haut et inclusives en bas : un prêt
   * de 240 mois relève de la tranche longue, un prêt de 239 mois de la tranche
   * intermédiaire. Ce test fixe les deux basculements au mois près.
   */
  it("place chaque durée dans la tranche publiée, aux bornes exactes", () => {
    expect(usuryThreshold("fixed", 119, P)).toBe(AVIS_26_JUIN_2026.fixedUnder10y.seuil);
    expect(usuryThreshold("fixed", 120, P)).toBe(AVIS_26_JUIN_2026.fixed10to20y.seuil);
    expect(usuryThreshold("fixed", 239, P)).toBe(AVIS_26_JUIN_2026.fixed10to20y.seuil);
    expect(usuryThreshold("fixed", 240, P)).toBe(AVIS_26_JUIN_2026.fixed20yPlus.seuil);
    expect(usuryThreshold("variable", 240, P)).toBe(AVIS_26_JUIN_2026.variable.seuil);
    expect(usuryThreshold("bridge", 24, P)).toBe(AVIS_26_JUIN_2026.bridge.seuil);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
 * CAS 7 — taux d'effort
 * ══════════════════════════════════════════════════════════════════════════════ */

/**
 * SOURCE — Décision n° D-HCSF-2021-7 du 29 septembre 2021 relative aux conditions
 * d'octroi de crédits immobiliers, applicable au 1er janvier 2022.
 * @see https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000044178669
 * Consultée le 22 août 2026.
 *
 * CE QUE LE TEXTE DIT, ET QUI EST ICI VÉRIFIÉ
 *   · le taux d'effort des emprunteurs ne doit pas excéder **35 %** ;
 *   · il se définit comme le rapport des charges annuelles d'emprunt associées à
 *     l'endettement total aux revenus annuels, l'assurance emprunteur étant comprise
 *     dans les charges ;
 *   · il s'apprécie « en prenant les charges annuelles d'emprunt MAXIMALES sur
 *     l'ensemble de la période d'amortissement » ;
 *   · la maturité du crédit ne doit pas excéder **25 ans**, portée à **27 ans** en cas
 *     de différé d'amortissement (vente en l'état futur d'achèvement, construction,
 *     travaux importants) ;
 *   · la marge de flexibilité trimestrielle est de **20 %** de la production.
 */
describe("Décision HCSF du 29 septembre 2021 — taux d'effort et maturité", () => {
  /**
   * TOLÉRANCE : aucune. Les quatre valeurs du millésime sont recopiées de la décision.
   */
  it("fige les seuils de la décision", () => {
    expect(P.hcsf.maxDebtRatioPct).toBe(35);
    expect(P.hcsf.maxDurationMonths).toBe(25 * 12);
    expect(P.hcsf.maxDurationDerogatoryMonths).toBe(27 * 12);
    expect(P.hcsf.flexibilityMarginPct).toBe(20);
  });

  /**
   * Le seuil de 35 % est un plafond, pas une borne ouverte : « ne doit pas excéder ».
   * Un taux d'effort exactement égal à 35 % est donc conforme. Ce test place le
   * basculement au centime de mensualité près.
   *
   * TOLÉRANCE : aucune. 1 400 € sur 4 000 € de revenus font exactement 35,00 %.
   */
  it("tolère 35,00 % et refuse au-delà", () => {
    const commun = { otherDebtService: 0, netMonthlyIncome: euros(4_000), durationMonths: 240 };
    const auSeuil = checkHcsf({ ...commun, maxMonthlyPayment: euros(1_400) }, P);
    expect(auSeuil.debtRatioPct).toBe(35);
    expect(auSeuil.debtRatioCompliant).toBe(true);

    const auDessus = checkHcsf({ ...commun, maxMonthlyPayment: euros(1_400.4) }, P);
    expect(auDessus.debtRatioPct).toBeGreaterThan(35);
    expect(auDessus.debtRatioCompliant).toBe(false);
  });

  /**
   * Les bornes de maturité, au mois près : 300 mois conformes, 301 non ; et la
   * dérogation de différé porte la limite à 324 mois.
   */
  it("place les bornes de maturité à 25 et 27 ans", () => {
    const commun = {
      maxMonthlyPayment: euros(1_000),
      otherDebtService: 0,
      netMonthlyIncome: euros(4_000),
    };
    expect(checkHcsf({ ...commun, durationMonths: 300 }, P).durationCompliant).toBe(true);
    expect(checkHcsf({ ...commun, durationMonths: 301 }, P).durationCompliant).toBe(false);
    expect(
      checkHcsf({ ...commun, durationMonths: 324, eligibleForExtendedDuration: true }, P)
        .durationCompliant,
    ).toBe(true);
    expect(
      checkHcsf({ ...commun, durationMonths: 325, eligibleForExtendedDuration: true }, P)
        .durationCompliant,
    ).toBe(false);
  });

  /**
   * « Les charges annuelles d'emprunt MAXIMALES sur l'ensemble de la période
   * d'amortissement » — la précision du texte n'est pas décorative. Avec un prêt à taux
   * zéro assorti d'un différé, la mensualité totale saute à la fin du différé : mesurer
   * le taux d'effort sur la première échéance sous-estimerait durablement la charge.
   *
   * Ce test confronte donc le ratio du moteur à la charge maximale du plan, et vérifie
   * qu'elle diffère bien de la première — sans quoi le test passerait pour de mauvaises
   * raisons.
   *
   * TOLÉRANCE : aucune sur l'identité des deux ratios ; la comparaison porte sur des
   * grandeurs calculées de la même façon, pas sur un chiffre publié.
   */
  it("mesure le taux d'effort sur la charge maximale, et non sur la première échéance", () => {
    const revenu = euros(6_000);
    const plan = buildCreditPlan(
      {
        loans: [
          { id: "principal", label: "Prêt principal", principal: euros(200_000), annualRatePct: 3.3, months: 240 },
          {
            id: "ptz", label: "PTZ", principal: euros(40_000), annualRatePct: 0,
            months: 240, deferredMonths: 120, deferral: "total",
          },
        ],
        insurance: { annualRatePct: 0.26, basis: "initial", coveragePct: 100 },
        guarantee: "suretyship",
        arrangementFee: euros(2_000),
        propertyPrice: euros(280_000),
        netMonthlyIncome: revenu,
      },
      P,
    );

    expect(plan.maxPayment).toBeGreaterThan(plan.firstPayment);
    expect(plan.hcsf.debtRatioPct).toBe((plan.maxPayment / revenu) * 100);
    // L'assurance est bien dans le numérateur : la retirer changerait le ratio.
    expect(plan.rows[0]!.insurance).toBeGreaterThan(0);
  });
});
