# TASKS

Préfixes : `ENG` moteur de calcul · `FIS` paramètres fiscaux · `UI` interface ·
`VIZ` visualisations · `CNT` contenus · `INF` infrastructure · `LEG` conformité ·
`TST` portes de vérification

Le découpage en versions, le modèle de branches et les portes sont dans
`docs/RELEASES.md`. Ce que la suite couvre à chaque version est dans
`docs/REGISTRE-TESTS.md`.

---

## Phase 0 — Fondations

- [x] `INF-001` Initialiser Next.js, TypeScript strict, Tailwind, déploiement Vercel
      → socle en place (Next 16 App Router, `strict` + `noUncheckedIndexedAccess` +
      `exactOptionalPropertyTypes`, Tailwind 4). Déploiement Vercel actif depuis le 21 août 2026.
- [x] `INF-002` Configurer Vitest et fast-check
      → `vitest.config.mts` (`globals`, `include: src/**/*.test.ts`), 95 tests verts sur 3 fichiers
- [x] `INF-003` Règle de lint interdisant les imports UI depuis `src/core/`
      → `no-restricted-imports` en override sur `src/core/**`, vérifiée par sonde temporaire
- [x] `INF-004` Jetons de design en variables CSS, nommés par rôle sémantique
      → `globals.css` + `layout.tsx`, validés par calcul et gardés par un test.
      Thème sombre par défaut, états de saisie et pastilles pédagogiques compris.
- [x] `FIS-001` Structure des paramètres fiscaux versionnés par millésime
      → `src/core/fiscal/params.ts`, typé, daté, sourcé par JSDoc `@source`/`@see`
- [ ] `FIS-002` **Vérifier à la source toutes les valeurs réglementaires du prototype**
      → **2 entrées** `TODO_VERIFY` dans `params.ts` depuis `FIS-005` (la troisième,
      les barèmes de caution, était insoluble faute de source faisant autorité — elle a
      quitté le fichier plutôt que d'y rester indéfiniment). Recherche menée le 21 août :
      voir `docs/reference/FIS-002-verification.md`. Une seule reste non résolue,
      la liste des départements à taux réduit. Bloquant avant mise en ligne.

## Phase 1 — Moteur crédit

- [x] `ENG-001` Annuité constante, cas taux nul inclus
      → cas de référence 150 000 € / 4 % / 20 ans, dégénérescence à taux nul, capital
      ou durée nuls
- [x] `ENG-002` Échéancier avec différé, dernière échéance soldante
      → différé total avec capitalisation, différé partiel, et l'invariant « la somme des
      parts de capital égale le capital emprunté » sous fast-check
- [x] `ENG-003` Agrégation multi-prêts
      → plan consolidé avec PTZ : la mensualité grimpe à la fin du différé, les deux
      prêts s'amortissent intégralement
- [x] `ENG-004` Assurance emprunteur, deux bases de calcul, quotité
      → prime constante sur capital initial, décroissante sur capital restant dû,
      quotité 200 % à l'arrondi près
- [x] `ENG-005` Coût de garantie et part restituable
      → `src/core/credit/__tests__/garantie.test.ts`, ajouté le 22 août 2026. Avant lui,
      seule la caution était exercée : l'hypothèque et le nantissement n'avaient aucun
      test, alors que l'interface les propose. Les tests portent sur des relations,
      jamais sur un montant — les barèmes sont des hypothèses de marché (`FIS-005`)
- [x] `ENG-006` TAEG par dichotomie
      → égale le taux nominal sans frais, le dépasse dès qu'il y en a, croît avec eux
- [x] `ENG-007` Taux d'endettement et contrôle de seuil
      → l'assurance entre dans le taux d'effort, la mensualité MAXIMALE est confrontée
      au plafond, le seuil d'usure est pris dans la bonne tranche de durée
- [x] `ENG-008` Cas de référence vérifiés contre une source externe
      → cinq sources extérieures dans `cas-de-reference.test.ts`, 18 tests : tableau
      d'amortissement de La finance pour tous ligne à ligne, exemple représentatif
      publié par Société Générale (échéancier, assurance, TAEG frais compris, TAEA)
      reproduit **au centime**, seuils d'usure de l'avis du 26 juin 2026 au JO,
      décision HCSF du 29 septembre 2021. Aucune valeur attendue ne vient du moteur
- [x] `ENG-009` Tests de propriétés sur les invariants d'échéancier
      → fast-check sur capital, taux et durée : capital soldé, restant dû décroissant
      jusqu'à zéro exact, aucune part négative, allonger augmente le coût

## Phase 2 — Interface crédit

- [x] `UI-000` Galerie `/composants` — les primitives dans leurs cinq états, banc
      d’essai des tests de bout en bout et documentation vivante
- [x] `INF-007` Playwright : 33 tests sur deux profils, bureau et mobile
      → le scénario partagé par URL est couvert

- [x] `UI-001` Grille de base, panneau de paramètres, zone de résultats
      → route `/credit`, saisie à gauche, résultat à droite, prérendue statiquement
- [x] `UI-002` Composants de saisie et leurs états
      → 7 primitives dans `src/components/ui/`, cinq états chacune
- [x] `UI-003` État d'URL avec nuqs et zod
      → `src/lib/scenario.ts` : clés courtes, montants en euros, bornes de sécurité.
      Seules les valeurs qui s'écartent du défaut sont inscrites
- [x] `UI-004` Bandeau d'indicateurs
      → cinq indicateurs, chacun avec sa légende qualifiante ; alerte sur franchissement
      d'un seuil réglementaire, jamais sur un jugement de valeur
- [x] `VIZ-001` Ruban d'amortissement avec curseur de lecture
      → une barre par année, hauteurs strictement proportionnelles, curseur au clavier,
      ligne de lecture relue par les lecteurs d'écran
- [x] `VIZ-002` Tableau d'amortissement, agrégation annuelle
      → agrégation reprise du moteur, bascule par année / par mois, curseur partagé
      avec le ruban. Le curseur ne part pas dans l'URL, voir ADR-005
- [x] `UI-005` Infobulles pédagogiques sur les termes techniques
      → `src/content/glossaire.ts` : dix-neuf entrées, la règle des deux phrases portée
      par le type, les valeurs réglementaires reçues en paramètre. Deux défauts de la
      pastille corrigés — le toucher et le débordement de la bulle. Voir ADR-007
- [x] `UI-006` Adaptation mobile
      → le ruban change d'axe quand sa largeur ne permet plus 24 px par année,
      le bandeau déduit son nombre de colonnes, et le résumé chiffré passe devant
      la saisie sur écran étroit. Deux défauts trouvés au passage à 1 024 px, sur
      un écran de bureau. `tests/e2e/mobile.spec.ts`, 11 tests. Voir le journal
- [x] `UI-012` **Les options des listes déroulantes sont illisibles** — voir la fiche
      détaillée plus bas. Contraste mesuré **1,21:1**, contre 4,5:1 exigés. Défaut
      présent dans `v0.1.0`, sur toutes les listes du site
      → `color-scheme` déclaré et suivant les deux thèmes. Gardé deux fois : ce que la
      feuille déclare (unitaire) et ce que le navigateur calcule (bout en bout).
      Corrigé en `v0.1.1`
- [x] `UI-011` La légende de la mensualité annonce un différé qui n'existe pas :
      `firstPayment !== maxPayment` se déclenche sur un écart d'arrondi de 1,02 €.
      Une phrase fausse sous un chiffre juste
      → règle extraite dans `src/lib/marche.ts` et testée sur ses deux versants : une
      marche réelle se repère, un solde final et un bruit d'arrondi ne se confondent
      plus avec elle

## Phase 3 — Acheter ou louer

- [x] `ENG-011` Portefeuille du locataire de référence
      → `src/core/compare/portefeuille.ts`. Le retrait qui dépasse le solde est tronqué,
      jamais mis en négatif, et le manque est rendu explicite. Voir ADR-011
- [x] `ENG-010` Coûts de détention et flux mensuels comparés
      → `src/core/compare/detention.ts` et `types.ts`. **Deux lectures, jamais une** :
      décaissement et fonds perdus, avec deux années de croisement. Séries mensuelle et
      annuelle, l'échéance de crédit reprise d'un `CreditPlan` sans jamais être
      recalculée. Les deux côtés sont indexés, pas seulement le loyer — voir ADR-012.
      Quatre hypothèses de marché ajoutées à `assumptions/market.ts`.
- [x] `ENG-012` Scénario de vente, exonération résidence principale
      → `src/core/compare/vente.ts`. Le produit net sort **poste par poste**, pas en un
      total : prix de cession, commission d'agence, capital restant dû lu dans le plan,
      indemnité sous son double plafond légal, mainlevée, restitution du fonds. Le total
      peut être négatif, et il l'est rendu tel quel. Le cas imposable entre par une union
      discriminée `RegimePlusValue`, jamais importé. Voir ADR-014
- [x] `FIS-010` Vérification à la source des régimes locatifs et report dans `params.ts`
      → `docs/reference/FIS-010-verification.md` et `rentalIncome` dans `params.ts` :
      micro-foncier 15 000 € / 30 % (art. 32 — le point que la recherche n'avait « pas
      retrouvé »), micro-BIC au millésime 2026 actualisé par le décret n° 2026-562
      (83 600 € / 50 % pour la longue durée et les classés, 15 000 € / 30 % non indexé
      pour les non classés, minimum 305 €), seuil d'affiliation de la courte durée
      23 000 € (art. L611-1, 6°). **Deux croyances du dépôt corrigées par les textes** :
      les amortissements LMNP réintégrés BÉNÉFICIENT des abattements pour durée de
      détention — minoration du prix d'acquisition, pas de scission d'assiette (RM
      n° 10097 du 24 mars 2026, `04-regles-calcul.md` §8 affirmait le contraire) — et
      la location meublée paie 18,6 % de prélèvements sociaux quand la nue reste à
      17,2 % (le f du I de l'art. L136-6 n'est pas dans la dérogation du IV de
      l'art. L136-8). Aucun `TODO_VERIFY` ajouté ; ajout pur au fichier gelé, raison
      écrite (ADR-004), gardé par `params-regimes-locatifs.test.ts`
- [x] `ENG-013` Régimes fiscaux locatifs
      → `src/core/compare/regimes-locatifs.ts` : les quatre régimes en une fonction
      annuelle sans état — micro-foncier (30 %, sans plancher), micro-BIC (50 % ou
      30 % selon la catégorie, plancher de 305 €), réel nu (déficit reporté, jamais
      d'impôt négatif), réel meublé (plafond de l'art. 39 C : l'amortissement
      annule la base, ne la rend pas négative ; l'excédent se reporte sans limite).
      Le taux de prélèvements sociaux vient de `socialLevies` et la NATURE de la
      location le choisit : nue 17,2 %, meublée 18,6 %. Les seuils sortent en
      alertes typées, jamais en refus de calcul. Et la **réintégration des
      amortissements est branchée** dans `plus-value.ts` (art. 150 VB, III) : le
      champ `amortissementsDeduits` minore le prix d'acquisition, les abattements
      traversent — la réserve « non réintégrés » devient « à saisir ». 30 tests,
      cassés trois fois exprès. La série pluriannuelle du scénario est `ENG-029`
- [x] `ENG-029` Scénario de location longue durée — la sortie que `UI-007` déclare
      absente : loyers nets de vacance et de gestion, mensualité toujours due lue
      dans le plan, impôt annuel par `ENG-013` avec circulation des reports,
      revente par `ENG-027` avec les amortissements cumulés. Ouvert et livré le
      25 août 2026
      → `src/core/compare/location-longue-duree.ts` : une fonction pure qui plie
      `calculerImpotLocatif` sur les années de location — les reports circulent
      là et nulle part ailleurs — puis revend par `chiffrerCession`, les
      amortissements déduits entrant en minoration du prix d'acquisition
      (`RegimeDeCession` imposable gagne `amortissementsDeduits`). Le flux net
      d'une année a le droit d'être négatif : c'est la mensualité toujours due.
      Quatre hypothèses de marché nouvelles dans `market.ts` (`location.*` :
      vacance 2,5 %, gestion 7 %, amortissement 2,5 % sur 85 %), toutes en
      `estimee` avec leur raison — les deux listes-cliquets de `market.test.ts`
      mises à jour, ce qui est leur usage. Les catégories de tourisme sont
      refusées : c'est la courte durée (`ENG-015`). 20 tests, dont les postes
      d'une année sur une feuille et le fil `ENG-013` → `ENG-029` → `ENG-027`
      vérifié par un seul chiffre ; deux sabotages, chacun tombé sur sa garde.
      **L'écran de `UI-007` ne les montre pas encore** : le câblage d'interface
      des deux sorties locatives reste à ouvrir quand `ENG-015` sera là
- [x] `ENG-014` Plus-value hors résidence principale, abattements par durée
      → `src/core/compare/plus-value.ts`. **Deux abattements, deux assiettes** —
      `baseImpotRevenu` (22 ans) et `basePrelevementsSociaux` (30 ans) — jamais une
      « plus-value imposable » unique. La surtaxe est assise sur l'assiette de l'impôt sur
      le revenu, donc s'éteint à 22 ans. Les forfaits de majoration ne s'appliquent qu'au
      travers d'un jeton non falsifiable, revérifié à l'exécution : la dette signalée par
      `FIS-007` est soldée. Voir ADR-013
- [x] `ENG-015` Scénario location courte durée
      → `src/core/compare/location-courte-duree.ts`, même squelette qu'`ENG-029` :
      revenus = tarif × 365 nuits × taux d'occupation — l'occupation est
      **obligatoire et sans défaut**, même discipline que l'appréciation —,
      moins commission de plateforme et conciergerie (hypothèses nouvelles dans
      `market.location`, avec la page d'Airbnb ouverte pour la commission),
      moins les charges d'exploitation que le propriétaire paie en entier,
      moins l'ameublement décaissé l'année 1 et amorti au réel sur la durée du
      mobilier — dont la somme des dotations **solde exactement**, comme une
      dernière échéance. À la revente, **seul l'amortissement du bâti se
      réintègre** : le mobilier n'est pas dans l'assiette du 150 VB, et la part
      déduite s'impute d'abord sur le bâti — convention prudente, déclarée. Les
      seuils de la courte durée mordent tôt et remontent d'`ENG-013` : 15 000 €
      pour le micro non classé, 23 000 € pour l'affiliation. Réserves :
      saisonnalité, réglementation locale (les 120 nuits), taxe de séjour, TVA
      para-hôtelière. 16 tests, deux sabotages, chacun tombé sur sa garde.
      Livré le 25 août 2026
- [x] `UI-024` **Étude** — le câblage des trois sorties dans
      `/comparaison/patrimoine`. Menée le 25 août 2026 sur pièce
      → `docs/reference/UI-024-etude-cablage.md`, décision de forme en
      **ADR-022** : une location est un récit, pas un point sur les courbes.
      L'analyse principale ne change pas ; la section des trois sorties devient
      le lieu des récits locatifs, chacun daté à ses propres échéances, sans
      jamais additionner des euros de dates différentes. Dix clés d'URL
      nouvelles, le reste repris des vingt-cinq existantes ; les hypothèses de
      `market.location` s'affichent avec leur fiabilité au lieu de s'ouvrir en
      champs ; le TMI est une liste — les cinq taux du barème
- [x] `UI-025` Réalisation du câblage — livré le 25 août 2026
      → le sélecteur segmenté ouvre l'un des trois récits ; chaque panneau
      locatif porte ses champs (régime, loyer ou tarif et occupation, durée,
      TMI…), l'année 1 poste par poste — le flux net a le droit d'être
      négatif —, les totaux, la revente avec la minoration des amortissements,
      les alertes de seuil avec le seuil écrit et l'année du franchissement, et
      ses réserves visibles sans interaction. `TROIS_SORTIES` reste la source
      unique de l'état : la phrase du bandeau se déduit désormais du même
      compte (leçon d'`UI-014`, appliquée une fois de plus). La garde « deux
      des trois sorties non modélisées » s'est inversée en gardant son objet —
      l'honnêteté de l'état — et le parcours v0.3.0 est amendé avec la raison
      datée. 5 tests e2e nouveaux sur deux profils ; deux sabotages — drapeau
      `modelisee` menteur (4 rouges, la chaîne dérivée), alertes débranchées
      (2 rouges). La version v0.3.1 s'étiquette par `TST-031`
- [x] `ENG-016` Statut de résidence fiscale et prélèvements sociaux applicables
      → même fichier. `RegimeSocialDuCedant` commande le taux, et lui seul : taux plein du
      régime dérogatoire immobilier, ou taux réduit pour l'affilié EEE/Suisse. Ce que la
      règle ne couvre pas sort avec le résultat, dans `nonModelise`
- [x] `FIS-007` Valeurs réglementaires de la phase 3 dans `params.ts`, sourcées et datées :
      prélèvements sociaux et leur taux réduit EEE/Suisse, les **deux** barèmes d'abattement
      pour durée de détention, taux forfaitaire de 19 %, surtaxe et son barème à dix tranches,
      exonération de la résidence principale, forfaits de majoration, abattement exceptionnel
      de l'art. 150 VE. Aucun calcul écrit — `ENG-012`, `ENG-014` et `ENG-016` les consomment.
      **Le taux de CSG a changé** : voir l'entrée de journal
- [x] `FIS-008` L'assiette de la plus-value est-elle arrondie à l'euro ?
      → **Oui**, et pas au titre de l'art. 1657 qui avait ouvert la question : l'art. 1649
      undecies du CGI, unique article d'un chapitre intitulé « Règles d'arrondissement des
      bases d'imposition », arrondit « les bases des impositions de toute nature » à l'euro
      le plus proche, la fraction de 0,50 € comptant pour 1. Les prélèvements sociaux
      suivent, leur assiette étant celle de l'impôt sur le revenu (CSS, art. L136-7, VI, 1).
      `roundToEuros` ajoutée à `money.ts` ; la recherche de tranche de la surtaxe revient à
      la borne basse, qui était juste. La **fente de 99 centimes n'existe pas** : ce
      n'était pas un trou du barème mais une assiette impossible. Cas de référence C de
      `cession.test.ts` corrigé — 500,01 € de surtaxe indue, aucune. Voir ADR-018
- [x] `VIZ-003` Courbes de coût mensuel et bandeau d'écart
      → `/comparaison`, composant serveur prérendu enveloppant un module client. Deux courbes
      de cumul, la bande de capital entre les deux tracés du propriétaire, les **deux** années
      de croisement, et la limite de la spécification énoncée **avant** les chiffres, avec la
      bascule des deux lectures à l'intérieur. Voir ADR-015
- [x] `UI-007` Moment de révélation de l'analyse patrimoniale
      → `/comparaison/patrimoine`, second niveau du même module. Le retournement se produit
      **entre deux lignes posées l'une sous l'autre** : « le propriétaire a décaissé 16 508,31 €
      de plus » et « il lui reste 36 030,77 € de plus », même ménage, même horizon, sens
      contraires. Les **deux hypothèses auxquelles `market.ts` refuse une valeur centrale**
      vivent dans le bloc de limite et nulle part ailleurs, et leurs fourchettes sont dessinées
      autour des courbes — plus larges que l'écart entre les deux options. Le zéro flotte : un
      produit de vente négatif est dessiné dessous. `ForfaitHorsChampError` est anticipé par
      `situationDeCession`, jamais rattrapé. Les deux sorties locatives sont déclarées absentes
      en toutes lettres. Voir ADR-020
- [x] `ENG-027` Assemblage de la cession : la vente et la plus-value branchées
      → `src/core/compare/cession.ts`. Une **seule** description de la cession, et les
      quatre grandeurs partagées — prix de cession, prix d'acquisition, durée de détention,
      frais déductibles — sont dérivées, sans champ où en écrire une seconde version. La
      commission et la mainlevée réduisent l'impôt, l'indemnité de remboursement anticipé
      non. Les réserves des deux modules remontent étiquetées de leur source. Une ligne
      corrigée dans `plus-value.ts` : la surtaxe levait sur les 99 centimes que son barème
      ne nomme pas. Voir ADR-016

## Phase 4 — Remboursements anticipés

- [ ] `ENG-017` Échéancier avec versements anticipés, deux effets
- [ ] `ENG-018` Indemnités, double plafond légal
- [ ] `ENG-019` Simulation de cagnotte et détection d'insuffisance
- [ ] `ENG-020` Comparaison de patrimoine à effort constant
- [ ] `ENG-021` Suggestion gloutonne sous contraintes contractuelles
- [ ] `VIZ-004` Frise cliquable des versements
- [ ] `VIZ-006` Les deux tables de lecture sous le ruban, prévues par la planche de
      design : « où en est le crédit » — le mois où la part d'intérêts passe sous 25,
      15, 10 puis 5 % de l'échéance — et « où agir », qui chiffre ce que rapporte un
      euro remboursé par anticipation. La seconde attend `ENG-017`
- [ ] `UI-008` Cascade des trois indicateurs

## Phase 5 — Pierre ou marchés

- [ ] `ENG-022` Portefeuille à effort d'épargne identique
- [ ] `ENG-023` Enveloppes fiscales et leur imposition
- [ ] `ENG-024` Simulation de trajectoires, immobilier **et** marchés
- [ ] `ENG-025` Quantiles et probabilité de surperformance
- [ ] `VIZ-005` Faisceaux de trajectoires superposés
- [ ] `UI-009` Décomposition explicite de l'effet de levier

## Phase 6 — Aides

- [ ] `ENG-026` Moteur de règles d'éligibilité alimenté par données
- [ ] `FIS-003` Barèmes, zonage, plafonds de ressources, avec sources
- [ ] `FIS-004` Exonération de la hausse DMTO pour première propriété — non modélisée,
      concerne le public prioritaire. Voir `docs/reference/FIS-002-verification.md`
- [x] `FIS-005` Sortir les barèmes de caution de `params.ts` : ce sont des hypothèses
      de marché, aucune loi ne les fixe. Décision d’architecture à prendre
      → `src/core/assumptions/market.ts`. Chaque valeur porte son intervalle observé, sa
      fiabilité et sa provenance. Aucun chiffre modifié, et un test le garde. Voir ADR-008
- [x] `FIS-006` Recouper les hypothèses de marché sur des grilles publiées. Les cinq
      coûts de garantie, les deux fourchettes de taux d'assurance et les deux de frais
      d'acquisition sont toutes en fiabilité `estimee`. **Un contre-exemple est déjà
      documenté** : l'exemple représentatif de la Société Générale donne 0,26 % d'assurance
      pour un emprunteur de 35 ans, sous la borne basse de 0,30 % (voir `ENG-008`)
      → dix-sept entrées passées en revue, **sept recoupées** sur des documents ouverts
      (INSEE, Observatoire national des taxes foncières, Crédit Agricole, notaires de France,
      Journal officiel, Century 21, exemples représentatifs SG), **six chiffres corrigés**,
      **dix restées `estimee` avec la raison écrite**. Le contre-exemple SG est intégré : la
      borne basse du contrat de groupe descend de 0,30 à 0,26 %. `RENDEMENTS_NETS_OBSERVES`
      rapatrié de `compare/portefeuille.ts` sans qu'un chiffre bouge. Voir ADR-017 et le
      journal du 23 août 2026
- [x] `TST-002` `reference.test.ts` compare la mensualité de référence avec
      `toBeCloseTo(908.97, 1)` — une tolérance muette de 5 centimes, quand la valeur
      exacte est 908,9705 €. Le test passerait encore si le moteur dérivait. Fichier
      gelé : la correction demande une raison écrite, elle en a une
      → égalité au centime. Il n'y avait rien à tolérer : valeur actuarielle 908,970494 €,
      arrondi du moteur et chiffre publié coïncident. Vérifié par sonde — une dérive de
      4 centimes passait sous l'ancienne tolérance, elle échoue désormais
- [x] `UI-013` Le champ « Garantie » était étiqueté **réglementaire** alors que
      `docs/CONTEXT.md` §2 range le choix de la garantie parmi les **négociables**.
      L'erreur dans le pire sens : elle disait à quelqu'un qu'il n'a pas la main sur ce
      qu'il peut négocier. Découvert en traitant `FIS-005`, corrigé et gardé par un test
- [x] `UI-014` **La comparaison était en ligne et l'accueil l'annonçait « à venir »** —
      trouvé par l'agent qui venait de livrer `VIZ-003`. Le module était atteignable
      depuis `/credit` mais pas depuis la page qui inventorie ce qui existe : le seul
      écran dont c'est le travail de dire l'état du produit était le seul à l'ignorer
      → la carte est ouverte, et le décompte comme les noms se déduisent désormais de
      `MODULES`. La phrase « Un seul module est en ligne : le crédit. Les quatre
      autres… » était écrite à la main et aucun test ne relisait une phrase. Deux
      gardes, cassées toutes les deux
- [x] `ENG-028` **L'assiette de la mainlevée était le prix du bien** au lieu du capital
      garanti. Surestimation d'un quart à 20 % d'apport, au détriment de l'hypothèque
      dans l'arbitrage même que le module éclaire. Un test gardait la règle fausse, et
      il avait été cassé pour de bon : son motif — « la mainlevée est un acte sur
      l'immeuble » — était convaincant et faux. Trouvé en traitant `FIS-006`, par la
      source qui énonce son assiette
      → corrigé dans `credit/plan.ts`, fichier gelé, raison écrite. Le prix quitte la
      signature de `guaranteeCost` : plus aucun poste ne s'y adossait. La garde nomme
      désormais son assiette — la version proportionnelle laissait passer un facteur
      1,25 sans un seul rouge. Voir ADR-019
- [x] `UI-015` **`/comparaison` s'ouvrait sur l'année 1**, alors que son propre
      commentaire donnait trois raisons de ne pas le faire. Le calcul prenait le
      maximum des croisements **non nuls** ; quand une seule lecture croise, il rendait
      l'année de celle-là. Révélé par `FIS-006` : l'indexation du loyer ramenée à 1,5 %
      a sorti le croisement en décaissement de l'horizon
      → il faut désormais les **deux** croisements ; à défaut, l'horizon. C'est
      l'intention déjà écrite — l'état où l'histoire entière est derrière soi — appliquée
      au cas où une lecture ne bascule jamais. L'écran d'ouverture passe d'un écart de
      5 806,68 € à l'année 1 à 16 508,31 € à l'année 30
- [x] `TST-003` Vérifier ce que l'hébergeur sert réellement. `docs/RELEASES.md` §3
      exigeait cette étape et la déclarait « non automatisable depuis le dépôt » : c'était
      vrai de son jugement, pas de ses faits
      → `tests/deploiement/site-publie.spec.ts` et `playwright.deploiement.mts`,
      **délibérément hors de `npm run porte`** — une porte qui interroge un tiers rougit
      quand l'hébergeur tousse. 46 vérifications sur https://simulateur-immo-snowy.vercel.app/,
      dont la seule dont l'échec soit irréversible : le site n'est pas indexable
- [ ] `UI-010` Assistant d'éligibilité

## Portes de vérification

Transversales aux phases. Voir `docs/RELEASES.md` §3.

- [x] `TST-000` **Porte de branche** — `npm run porte` : typecheck, lint, Vitest,
      build, Playwright sur deux profils. Aucune fusion dans `main` sans elle, et
      toute branche apporte ses propres tests ou justifie par écrit qu'elle n'en a
      pas besoin
- [x] `TST-001` **Porte de version** — la porte de branche à froid, plus le relevé
      des compteurs dans `docs/REGISTRE-TESTS.md` et la confrontation du critère de
      sortie au site déployé, pas au code
- [x] `TST-010` Porte de version **v0.1.0** — passée le 22 août 2026, critère de sortie
      exécuté par `tests/e2e/parcours-v0-1.spec.ts`. À couvrir avant l'étiquette : le
      parcours d'accueil vers `/credit`, la présence de l'avertissement sur chaque
      écran qui affiche un chiffre, l'atteignabilité des mentions légales
- [x] `TST-020` Porte de version **v0.2.0** — passée le 22 août 2026, critère de sortie
      exécuté au pouce par `tests/e2e/parcours-v0-2.spec.ts` sur le profil tactile. Le parcours complet mené au pouce sur
      le profil mobile : cibles tactiles d'au moins 24 px, aucun montant rogné,
      aucune infobulle hors écran
- [ ] `TST-030` Porte de version **v0.3.0**. Les cas de référence d'« acheter ou
      louer » vérifiés contre une source externe, comme ceux du crédit
- [ ] `TST-031` Porte de version **v0.3.1**. Les régimes micro et leurs abattements,
      chacun avec sa source — c'est le terrain que la spécification signale comme
      récemment modifié
- [ ] `TST-040` Porte de version **v0.4.0**. Le double plafond légal d'indemnité de
      remboursement anticipé, éprouvé sur ses bornes
- [ ] `TST-050` Porte de version **v0.5.0**. Les trajectoires simulées : reproductibilité
      à graine fixée, et quantiles vérifiés sur une distribution connue
- [ ] `TST-060` Porte de version **v0.6.0**. Les règles d'éligibilité, chacune avec
      son cas passant et son cas bloquant
- [ ] `TST-070` Porte de version **v0.7.0**. Les cinq contrôles du §10.6 du brief
      design, exécutés sur chaque écran, et les parcours des versions précédentes
      re-passés tels quels
- [ ] `TST-100` Porte de version **v1.0.0**. Plus aucun `TODO_VERIFY` dans
      `src/core/fiscal/`, et un test qui échoue s'il en réapparaît un

## Phase 7 — Contenus et mise en ligne

- [ ] `CNT-001` Glossaire relié aux infobulles
- [x] `CNT-002` Fiches pédagogiques par module — `feat/CNT-002-fiches`
      → première fiche livrée, `/credit/comprendre` : mensualité, TAEG, assurance et
      ses deux bases, trois garanties, usure et taux d'effort. Chaque notion rattachée
      à sa famille, libellés lus dans `src/components/ui/taxonomie.ts`. Aucun chiffre
      écrit dans le texte : les seuils viennent de `src/core/fiscal/params.ts`, les
      montants d'exemple du moteur. Les cinq autres modules auront la leur quand ils
      existeront
- [x] `CNT-001` Glossaire relié aux infobulles — `feat/CNT-001-glossaire`
      → `/glossaire`, prérendue statiquement, quarante-huit termes groupés par thème
      avec un index alphabétique. Le texte long est une donnée **séparée** de l'entrée
      d'infobulle (ADR-009), et l'ancre d'un terme se **calcule** aux deux bouts
      (ADR-010). Chaque bulle porte un lien vers son entrée ; le rendre atteignable a
      demandé deux corrections à la pastille, l'une au `blur`, l'autre au survol
- [ ] `CNT-002` Fiches pédagogiques par module
- [x] `CNT-003` Page d'accueil énonçant la thèse — `feat/CNT-003-accueil`
- [x] `LEG-001` Mentions légales, conditions d'utilisation, politique de confidentialité
      → trois pages publiées et atteignables depuis le pied de page. Régime de
      l'éditeur non professionnel anonyme (LCEN, art. 6 III). **Non relu par un juriste**,
      et le site reste en `noindex` jusque-là. Licence du dépôt encore à décider
- [x] `LEG-002` Avertissement visible sur l'absence de conseil
      → bandeau en tête de document sur toutes les pages, sans bouton de fermeture,
      et texte long à `/avertissement`. **Non relu par un juriste**
- [ ] `INF-005` Mesure d'audience sans cookie
- [ ] `INF-006` Métadonnées de partage reflétant le scénario
- [ ] `LEG-003` Dossier de relecture juridique, puis relecture par un professionnel
      du droit — `LEG-001` et `LEG-002` sont publiés mais non relus, et le site
      reste en `noindex` jusque-là. Délai externe : peut partir à tout moment sur
      signal d'Adrian, au plus tard au début de v0.7.0
- [ ] `LEG-004` Licence du dépôt — « encore à décider » depuis `LEG-001` ; à
      trancher avant la vitrine (`CNT-004`), le dépôt est public
- [ ] `FIS-009` Procédure de mise à jour trimestrielle du taux d'usure — l'avis au
      JO change chaque trimestre ; dire qui met à jour, comment, et ce qui alerte
      quand le millésime est périmé
- [ ] `INF-008` Bascule `INDEXABLE` : inversion de la garde de `verif-deploiement`
      — elle vérifie aujourd'hui que le site n'est **pas** indexable —, sitemap,
      déclaration Search Console
- [ ] `CNT-004` Annonce et vitrine — README du dépôt, démo de trois minutes
      (`CONTEXT.md` §11), publications vers les deux destinataires ; l'acte qui
      suit l'étiquette v1.0.0

Les cinq derniers sont nés du plan de lancement du 25 août 2026 et sont écrits
dans leur ordre d'exécution. Voir `docs/RELEASES.md`, v0.7.0 et v1.0.0.

## Phase 8 — Charte d'ornement et motifs d'interface

Huit tickets ouverts le 23 août 2026, détaillés dans `docs/TICKETS-MOTIFS-UI.md` :
quatre sujets, chacun avec son étude puis sa réalisation. Le cadre a changé le même
jour — le second objectif du dépôt est écrit (`docs/CONTEXT.md` §11), l'interdit
« esthétique fintech » est levé et remplacé par un interdit de conséquence
(`docs/01-brief-design.md` §3 et §10), et la décision est consignée en **ADR-021**.
Le mandat n'est plus de tolérer un peu d'ornement mais d'en produire un qui tienne, et
la borne qui reste est la **sémantique des couleurs** : capital, intérêts, assurance et
marchés ne servent jamais de décor.

**L'ordre compte** : `UI-022` produit la matière que les trois autres sujets emploient.

**Ces tickets forment le cœur de v0.7.0 « L'interface se montre »**, la version de
la refonte décidée le 25 août 2026 — voir `docs/RELEASES.md`. La revue des manques
fonctionnels en est la porte d'entrée.

- [ ] `UI-022` **Étude** — la charte d'ornement, les boutons, les cartes. Deux manques
      constatés : aucune primitive `Bouton` (les `<button>` sont écrits à la main dans
      huit fichiers) et des cartes d'accueil en balisage direct dans `page.tsx`
- [ ] `UI-023` Jetons `--ornement-*`, `Bouton`, cartes, galerie — dépend de `UI-022`.
      Porte la garde qu'ADR-021 met en contrepartie du retrait : un jeton d'ornement ne
      peut pas valoir une couleur sémantique
- [ ] `UI-020` **Étude** — ce que sert une URL qui n'existe pas. Mesuré sur le site
      déployé : Next sert sa page par défaut, en anglais, sur fond blanc, avec deux
      `<title>` dans le même document
- [ ] `UI-021` `not-found.tsx` — dépend de `UI-020`
- [ ] `UI-016` **Étude** — où le produit fait attendre, et ce qu'il montre alors
- [ ] `UI-017` Indicateur d'attente, et la règle `prefers-reduced-motion` qui manque
      aujourd'hui à `globals.css` — dépend de `UI-016`
- [ ] `UI-018` **Étude** — rendre quarante-huit entrées de glossaire lisibles sans
      les cacher derrière un survol
- [ ] `UI-019` Nouvelle présentation du glossaire — dépend de `UI-018`

---

---

## Fiche `UI-012` — Les options des listes déroulantes sont illisibles

**Signalé le** 22 août 2026, capture à l'appui, sur la liste « Durée » de `/credit`.
**Présent dans** `v0.1.0`. **Gravité** : bloquant pour l'accessibilité, et pour
l'usage tout court — on ne peut pas choisir ce qu'on ne peut pas lire.

### Ce qu'on voit

Le menu déroulé affiche ses options en texte presque blanc sur fond blanc. Seule
l'option survolée est lisible, parce que le système la peint en bleu avec du texte
blanc. Les quatre autres durées sont là, mais on ne les lit pas.

### Cause, mesurée et non supposée

Relevé dans la page, sur un build de production :

| Ce qui a été mesuré | Valeur |
| --- | --- |
| `color-scheme` sur `<html>`, `<body>`, `<select>`, `<option>` | `normal` |
| `<meta name="color-scheme">` | absent |
| Couleur calculée d'une `<option>` | `rgb(230, 234, 239)`, soit `--encre` |
| Fond calculé d'une `<option>` | `rgba(0, 0, 0, 0)` — transparent |

**Le fond de la liste déroulée n'appartient pas à la page.** Il est peint par le
navigateur, et le navigateur choisit sa teinte d'après `color-scheme`. Comme aucune
valeur n'est déclarée, il applique `normal`, c'est-à-dire clair : fond blanc. Le
texte, lui, hérite bien de `--encre` — la couleur d'encre d'un thème sombre.

Le résultat est un contraste de **1,21:1** là où le RGAA et les WCAG en exigent 4,5.
Sur le fond prévu, `--papier`, le même texte donne 14,18:1. Ce n'est donc pas un
mauvais choix de couleur : c'est une couleur juste posée sur un fond qu'on n'a jamais
déclaré.

### Le défaut ne se limite pas aux listes

`color-scheme` gouverne tout ce que le navigateur peint lui-même. Sont concernés, sur
le même fondement :

- les deux listes de `/credit` — « Durée » et « Garantie » — et celles de `/composants` ;
- **la barre de défilement du tableau d'amortissement mensuel**, claire sur un panneau
  sombre ;
- les repères de focus par défaut, et le remplissage automatique des champs.

### Correction attendue

Déclarer `color-scheme` dans `src/app/globals.css`, en le faisant suivre les deux
thèmes déjà définis :

- `:root` — thème ardoise nocturne → `color-scheme: dark`
- `@media (prefers-color-scheme: light)` → `color-scheme: light`

C'est la voie que demande le signalement — *caler le fond des options sur celui du
site* — et c'est la seule qui traite la cause : le navigateur peint alors sa liste
déroulée en sombre, et l'encre claire redevient lisible sans qu'on y touche.

**La solution de repli — repeindre `option { background }` — est moins bonne**, et il
faut savoir pourquoi avant de s'y rabattre : elle est ignorée par Safari sur macOS et
par les navigateurs mobiles, qui rendent la liste avec un composant natif du système ;
elle ne corrigerait ni la barre de défilement ni le remplissage automatique ; et elle
laisserait deux sources de vérité pour une même couleur.

### Garde à écrire avec le correctif

Un test de bout en bout qui lit `getComputedStyle(document.documentElement).colorScheme`
et échoue s'il vaut `normal`. Le défaut est invisible aux tests actuels précisément
parce qu'il vit hors du DOM : la suite de contraste vérifie des jetons entre eux, et
aucun jeton n'est en cause ici.

Vérifier la garde en la cassant : retirer la déclaration doit la faire rougir.

### Version

À traiter en **`v0.1.1`**, correctif, plutôt qu'en attendant `v0.2.0`. Un défaut de
lisibilité sur un champ de saisie n'attend pas la prochaine version de contenu —
d'autant que la correction tient en deux déclarations et qu'elle est sans risque pour
le reste.

## Journal de session

*À compléter en fin de chaque session : état d'avancement, décisions prises, points bloquants.*

### 19 août 2026 — Mise en état des fondations

**Fait**

- Audit d'écart entre `docs/02-architecture.md` §7 et l'arborescence réelle.
  `package.json` et `tsconfig.json` étaient déjà conformes (dépendances `nuqs`, `zod`,
  `recharts`, `vitest`, `fast-check` ; scripts `test`, `test:watch`, `typecheck` ;
  `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `types: ["vitest/globals"]`).
- `vitest.config.mts` créé. Extension `.mts` imposée : le projet n'est pas `"type": "module"`,
  un `.ts` déclencherait un avertissement Vite. `tsconfig.json` incluait déjà `**/*.mts`.
- `no-restricted-imports` ajouté en override sur `src/core/**` (`INF-003`). Couvre `react`,
  `react-dom`, `next`, leurs sous-modules, plus `nuqs` et `recharts`. Vérifiée par une sonde
  temporaire ensuite supprimée : les trois formes d'import — nu, sous-module, `import type` —
  sont bien rejetées.
- `.gitattributes` (`* text=auto eol=lf`) pour éteindre les avertissements CRLF sous Windows.
- Doublon supprimé : `docs/00-brief-produit.md` était identique octet pour octet à
  `docs/CONTEXT.md`. `CONTEXT.md` conservé, c'est celui que cite `CLAUDE.md`.
- Références mortes corrigées dans `CLAUDE.md` (`docs/ARCHITECTURE.md` → `docs/02-architecture.md`,
  `docs/DOMAINE.md` → `docs/03-spec-domaine.md`, deux occurrences) et dans l'inventaire
  `docs/INDEX.md` §6 (chemins `reference/`, `prototype/`, section « moteur crédit » qui pointait
  encore vers `moteur-credit/`). `docs/INDEX.md` ajouté à la liste de lecture de `CLAUDE.md`.
- `docs/prototype/README.md` créé : le prototype `.jsx` est une référence d'interaction,
  jamais de logique métier. `docs/` ajouté aux ignores ESLint en conséquence.
- `docs/reference/parametres-2026.json` : champ `_role` en tête, qui le désigne comme note de
  recherche et renvoie vers `src/core/fiscal/params.ts` comme source de vérité.
- `docs/ADR.md` : ADR-001 sur la frontière moteur / interface.

**Validation** — `typecheck` ✓ · `test` 95/95 sur 3 fichiers ✓ · `lint` ✓ · `build` ✓
(4 pages statiques). `src/core/` non modifié, vérifié par `git diff`.

**Reste**

- `INF-001` : déploiement Vercel.
- `INF-004` : `globals.css` est encore le gabarit Next. Les jetons sémantiques
  (vert capital, brique intérêts, violet assurance, bleu marchés) sont à poser avant tout composant.
- `FIS-002` : 4 entrées `TODO_VERIFY` dans `params.ts`, et les divergences listées en
  `docs/INDEX.md` §7 (fin de hausse des droits de mutation, départements à taux réduit,
  seuil du micro-foncier). Bloquant avant mise en ligne.
- Les tickets `ENG-001` à `ENG-009` ne sont pas cochés alors que le moteur correspondant
  est en place et testé — il a été écrit hors dépôt puis copié. À arbitrer : les cocher
  après relecture de la couverture, ticket par ticket.
- Rien n'est encore committé.

### 20 août 2026 — Dépôt distant, charte graphique, fixtures de design

**Fait**

- Dépôt connecté à `git@github.com:rosariAdr/simulateur-immo.git` et poussé.
  Le dépôt distant est **public**.
- **Charte graphique proposée** (`docs/06-design-system.md`). Palette validée par
  calcul dans les deux thèmes : bande de clarté, plancher de chroma, séparation
  sous protanopie et deutéranopie, contraste. Deux contraintes découvertes par la
  validation : le violet ne peut pas descendre jusqu'à l'« ardoise » sans devenir
  indistinguable du bleu marchés, et la palette ne peut pas être plus désaturée
  sans qu'une teinte cesse de porter l'identité. Variantes texte ajoutées : quatre
  couleurs de série n'atteignent pas 4,5:1 en texte.
- **Typographie proposée** : Archivo, Public Sans, IBM Plex Mono. Toutes libres et
  auto-hébergées via `next/font`, ce qui évite qu'une fonderie distante reçoive
  l'adresse IP des visiteurs. *Marianne*, référence évidente de l'univers
  administratif français, est écartée : sa licence la réserve à l'État.
- **Textes légaux, première version** (`docs/legal/`). Mentions légales, politique
  de confidentialité, conditions d'utilisation, avertissement. Brouillons, avec
  champs à compléter. Le régime d'éditeur non professionnel de la LCEN est
  documenté dans le fichier. `LEG-001` et `LEG-002` restent ouverts.
- **Fixtures de design** (`scripts/export-fixtures.mts`, `npm run fixtures`).
  Quatre scénarios réels : achat modeste, achat tendu non conforme HCSF, PTZ en
  différé, franchissement du seuil d'usure. Le scénario d'usure a été calibré pour
  effleurer le seuil (5,42 % contre 5,29 %) plutôt que de le pulvériser : le
  dépassement vient de l'assurance, pas du taux nominal.
- **Planche de design** (`fixtures/PLANCHE-DESIGN.md`, 424 lignes) : les chiffres
  réels, les tableaux à leur longueur réelle, et la largeur du montant le plus
  large, qui dimensionne les colonnes.
- **Dossier de passation** (`docs/07-brief-claude-design.md`) : quoi coller, le
  prompt, et la liste des défauts à refuser en retour.

**Décision technique** — `scripts/run.mjs` exécute les scripts TypeScript en
réutilisant Vite comme résolveur, plutôt que d'ajouter un exécuteur TypeScript en
dépendance. Motif : les fichiers de `src/core/` importent sans extension, ce que
l'ESM natif de Node refuse, et cette convention ne se change pas — `src/core/` est
intouchable.

**Validation** — `typecheck` ✓ · `test` 95/95 ✓ · `lint` ✓ · `build` ✓.
`src/core/` toujours non modifié.

**Reste**

- **Arbitrage attendu** : valider ou non la palette et les polices avant l'étape 3.
- `INF-001` : déploiement Vercel, à faire côté compte.
- `INF-004` : les jetons ne seront écrits dans `globals.css` qu'au retour de
  Claude Design.
- `FIS-002` : inchangé, 4 entrées `TODO_VERIFY`. Toujours bloquant.
- `LEG-001` / `LEG-002` : brouillons à compléter puis à faire relire par un juriste.

### 20 août 2026 (suite) — Charte figée dans le code

**Fait**

- Palette et typographie **validées** par Adrian, puis écrites dans le code :
  `src/app/globals.css` (jetons nommés par rôle) et `src/app/layout.tsx`
  (Archivo, Public Sans, IBM Plex Mono via `next/font`, auto-hébergées).
- `src/app/__tests__/design-tokens.test.ts` — 27 tests qui lisent `globals.css`
  et échouent si un contraste régresse ou si le thème sombre cesse d'être choisi.
  Vérifié par sonde : remplacer `--assurance-texte` par la couleur de série
  correspondante fait bien échouer la suite à 3,99:1.
- ADR-002 : nommage par rôle, valeurs calculées, séparation remplissage/texte.
- `docs/07-brief-claude-design.md` mis à jour : la palette et les polices ne sont
  plus une proposition mais une contrainte d'entrée.
- `INF-004` cochée pour sa partie couleurs et typographie.

**Validation** — `typecheck` ✓ · `test` **122/122 sur 4 fichiers** ✓ · `lint` ✓ · `build` ✓

**Reste**

- Étape 3 : la passation à Claude Design, côté Adrian.
- `INF-004` résiduel : les cinq états des composants de saisie, au retour du design.
- `INF-001` : déploiement Vercel, toujours à faire côté compte.
- `FIS-002` : inchangé, 4 entrées `TODO_VERIFY`. Toujours bloquant avant mise en ligne.
- `LEG-001` / `LEG-002` : brouillons à compléter, puis relecture juridique.

### 21 août 2026 — Ardoise nocturne, coquille persistante, pédagogie au survol

**Fait**

- **Surfaces arbitrées sur pièce.** Deux canevas complets ont été construits et
  comparés — « ardoise nocturne » et « bleu-gris franc ». L'ardoise est retenue
  comme thème par défaut ; le bleu-gris devient le thème clair, l'ancien
  `#f1f3f6` est abandonné. Voir ADR-003.
- **Le thème est devenu un paramètre.** `scripts/design-themes.mjs` rebranche les
  jetons plutôt que de dupliquer huit fichiers. Une troisième variante ne coûte
  presque rien.
- **Séparation remplissage / texte** dans `globals.css` — huit jetons sémantiques
  au lieu de quatre. Découverte par la validation : sur fond sombre, aucun
  quadruplet ne satisfait 3:1 en remplissage et 4,5:1 en texte sans que
  l'assurance et les marchés se rejoignent. 48 candidats testés.
- **Coquille persistante** (`scripts/design-shell.mjs`) : toutes les planches de
  bureau à 1240 px, même barre de navigation à icônes, barre d'onglets en pied
  sur mobile.
- **Pédagogie au survol** : pastilles « i » cerclées, bulle sur fond laiton pâle.
  Six jetons ajoutés — infobulle-fond, infobulle-filet, pastille-filet,
  survol-fond, erreur-fond, desactive-encre, desactive-filet, accent-survol.
- **Module « pierre ou marchés » refondu** en deux questions ordonnées : où placer
  un matelas de sécurité (Livret A, PEL, assurance-vie, PEA comparés sur rendement
  net, disponibilité, risque), puis acheter contre louer un bien comparable.
- `INF-004` cochée en entier : jetons, typographie et états de saisie.

**Validation** — `typecheck` ✓ · `test` **129/129 sur 4 fichiers** ✓ · `lint` ✓ · `build` ✓

**Reste**

- Les rendements et taux de la table des enveloppes sont des hypothèses affichées
  comme telles. Elles rejoignent `FIS-002` : à verser dans `fiscal/params.ts`,
  datées et sourcées, avant tout calcul réel.
- Questions 9.1 et 9.3 du brief design : partis provisoires, à trancher sur
  prototype vivant.
- `INF-001` : déploiement Vercel, toujours côté compte.
- `LEG-001` / `LEG-002` : brouillons à compléter, puis relecture juridique.
- Prochain jalon : les premiers composants React, à partir des planches.

### 21 août 2026 (suite) — Déploiement, arbitrages, vérification réglementaire

**Décisions prises**

- **`FIS-002`** : recherche menée à la source plutôt qu'acceptation en l'état.
  Résultats dans `docs/reference/FIS-002-verification.md`.
- **Page publique** : le gabarit Next reste en ligne jusqu'au premier module.
  Choix assumé — à noter que le dépôt GitHub étant public, l'URL Vercel se déduit
  du nom du projet.
- **Première tranche d'implémentation** : les primitives de saisie d'abord, en
  isolation, dans leurs cinq états et sur les deux thèmes. Le câblage vient après.
- **Tests d'interface** : Playwright, bout en bout. Conséquence de séquencement :
  des tests de bout en bout ont besoin d'une page à piloter, or des primitives
  isolées n'en ont pas. D'où `UI-000`, une galerie `/composants` qui sert de banc
  d'essai maintenant et de documentation vivante ensuite.

**Fait**

- `INF-001` cochée : déploiement Vercel actif.
- Recherche `FIS-002` : la fin de la hausse des DMTO est confirmée au 31 mars 2028
  par deux sources concordantes. Une loi de finances pour 2026 non anticipée par la
  documentation du projet est intervenue sur le dispositif — sans déplacer ce terme,
  d'après le BOFiP.
- Trois tickets nés de la recherche : `FIS-004` exonération primo-accédants,
  `FIS-005` requalification des barèmes de caution, plus `INF-007` Playwright.

**Reste, et bloque**

- **La liste des départements à taux réduit n'est toujours pas résolue.** Deux
  sources consultées le même jour se contredisent. Le document qui tranche est
  identifié — le PDF de la DGFiP au 1er février 2026 — mais il encode son texte
  avec des polices propriétaires. Il faut soit le transcrire à la main, soit
  installer `poppler-utils` sur la machine.
- **Le report dans `src/core/fiscal/params.ts` n'a pas été fait** : la consigne
  interdit de toucher à `src/core/`. À faire par quelqu'un qui en a le droit, ou
  lever la consigne pour ce fichier.

### 22 août 2026 — Les primitives de saisie, et le premier test qui voit vraiment

**Fait**

- **Sept primitives** dans `src/components/ui/` : champ montant, champ taux,
  sélecteur segmenté, liste déroulante, case à cocher, pastille pédagogique, et
  l'enveloppe `Champ` qui porte ce qu'elles partagent. Cinq états chacune.
- **`src/lib/format.ts`** : la couche de présentation. Format français strict dans
  un sens, analyse de saisie tolérante dans l'autre — elle accepte l'espace
  insécable, le point de milliers, la virgule et le symbole euro.
- **Galerie `/composants`** : documentation vivante et banc d'essai. Hors
  indexation, mais publiquement atteignable — un lien suffit à la montrer.
- **13 tests de bout en bout** sur deux profils, bureau et mobile. Ils couvrent le
  format des montants, la circulation des valeurs, le clavier — flèches du
  sélecteur, barre d'espace de la case, Échap sur la pastille —, les attributs
  d'accessibilité, l'absence de débordement horizontal, et la règle « jamais de
  couleur seule » vérifiée champ par champ.
- `docs/02-architecture.md` §5 : un quatrième niveau de test documenté.

**Deux choix de conception à connaître**

- Le champ montant ne se reformate **qu'à la sortie du champ**. Reformater à chaque
  touche déplacerait le curseur sous les doigts — le défaut classique des champs
  monétaires.
- La case à cocher vit **hors de la taxonomie**. Une option n'est pas un paramètre :
  lui coller une étiquette « négociable » n'aurait pas de sens.

**Piège rencontré, et qui resservira**

Les six premiers tests interactifs échouaient tous, les sept statiques passaient.
Ce n'était pas le code : le serveur de développement refusait en 403 les requêtes
`/_next/*` venant de `127.0.0.1`, une origine qu'il ne reconnaît pas. La page
s'affichait parfaitement mais ne s'hydratait jamais. **Viser `localhost` et non
`127.0.0.1`** — c'est consigné dans `playwright.config.mts`.

**Reste**

- `UI-001` grille et zone de résultats, `UI-003` état d'URL avec nuqs et zod.
  Le test « un scénario partagé par URL redonne les mêmes chiffres » attend `UI-003`.
- `VIZ-001` ruban, `VIZ-002` tableau.
- Inchangé et bloquant : la liste des départements à taux réduit (`FIS-002`), le
  report des conclusions dans `params.ts`, la relecture juridique.

### 22 août 2026 (suite) — Le module crédit calcule

**Décision d'architecture**

`src/core/` s'ouvre aux **nouveaux répertoires** ; `money.ts`, `fiscal/params.ts` et
`credit/**` restent gelés. La consigne d'origine protégeait un acquis, elle bloquait
tout ce qui reste à faire. Voir ADR-004, et la règle ajoutée à `CLAUDE.md`.

**Fait — `UI-003`, `UI-001`, `UI-004`**

- `src/lib/scenario.ts` : le scénario vit dans l'URL. Clés courtes, montants en
  **euros** et non en centimes — `px=205000` se lit, `px=20500000` non. Bornes de
  sécurité : une URL est du texte que n'importe qui peut écrire.
- La traduction entre le vocabulaire de l'URL, en français, et celui du moteur, en
  anglais, vit à un seul endroit. Le moteur ne connaît pas l'URL, l'URL ne connaît
  pas le moteur.
- Route `/credit`, prérendue statiquement. Saisie à gauche, résultat à droite, aucun
  bouton « calculer » : le recalcul coûte moins d'une milliseconde sur 300 échéances.
- Cinq indicateurs, chacun avec sa légende qualifiante. L'alerte ne se déclenche que
  sur un franchissement de seuil réglementaire, jamais sur un jugement.
- 9 tests de bout en bout de plus, dont celui qui portait la promesse du produit :
  **un scénario partagé par URL redonne exactement les mêmes chiffres.**

**Deux pièges de test, tous deux consignés dans `playwright.config.mts`**

Le serveur de développement diffuse ses rechargements à chaud aux pages ouvertes :
un composant se remontait en plein test et perdait son état. Symptôme déroutant —
chaque test passait isolément, la suite échouait. Les tests tournent désormais sur un
**build de production**.

Les écritures dans l'URL sont groupées et différées. Lire `page.url()` juste après la
dernière frappe attrape un état incomplet ; le test attend explicitement que
l'adresse porte tout le scénario avant de la partager.

**Reste sur le module**

- `VIZ-001` ruban d'amortissement avec curseur de lecture
- `VIZ-002` tableau, agrégation annuelle
- `UI-005` les infobulles ont leur composant et leurs premiers contenus ; le
  glossaire complet reste à écrire (`CNT-001`)
- `UI-006` adaptation mobile — la grille se replie déjà, mais rien n'a été pensé
  pour la densité

### 22 août 2026 (suite) — Le crédit se regarde

**Fait — `VIZ-001`, `VIZ-002`**

- `RubanAmortissement.tsx` : une barre par année, intérêts en haut, assurance au
  milieu, capital en bas. Le capital pousse par le bas et les intérêts refluent par
  le haut, ce qui est exactement ce qui se passe.
- `TableauAmortissement.tsx` : l'agrégation annuelle est celle du moteur, pas une
  somme refaite dans le composant — deux additions des mêmes centimes finiraient par
  diverger d'un arrondi, et c'est le genre d'écart qu'un comparateur ne pardonne pas.
  Bascule par année / par mois, les trois cents échéances sans pagination.
- Les deux vues partagent un curseur. Cliquer une barre marque la ligne, cliquer une
  ligne déplace la barre.

**Décision d'architecture — ADR-005**

Le curseur de lecture et la granularité **ne partent pas dans l'URL**. L'URL décrit un
crédit, pas la façon dont on le regardait. Ce qui change un chiffre y entre, ce qui
change un cadrage n'y entre pas — sans quoi `?px=465000&an=14` ne se lit plus d'un
coup d'œil.

**Aucune hauteur plancher sur le ruban**

Même quand la bande d'assurance ne fait que deux pixels. Un produit dont la thèse est
l'honnêteté du chiffre ne peut pas grossir une part pour la rendre lisible : une
assurance invisible sur le ruban est une assurance négligeable, et c'est une
information.

Le test correspondant mesure les pixels réels des trois segments et les confronte aux
montants de la fixture. Il a été **vérifié par sabotage** : rétablir un plancher de
6 % sur l'assurance le fait échouer.

**Deux pièges, tous deux consignés dans le code**

Les barres doivent s'étirer sur toute la hauteur du ruban — surtout pas `items-end`.
Les segments sont dimensionnés en pourcentage, et un pourcentage de hauteur ne se
résout que contre un parent de hauteur définie. Avec des barres calées en bas, elles
s'ajustent à leur contenu, le contenu s'ajuste à elles, et **tout retombe à zéro** :
le ruban existe dans le DOM, porte les bons libellés, et ne se voit pas.

`scrollIntoView` sur la vue mensuelle prend `block: "nearest"` et non `"center"`.
Autrement, cliquer une ligne visible du tableau dérobe le tableau à celui qui vient
de le pointer.

**Ce que le ruban ne porte pas encore**

La planche de design prévoit deux tables de lecture sous le ruban — « où en est le
crédit » et « où agir ». La seconde chiffre ce que rapporte un euro remboursé par
anticipation : c'est de la phase 4, elle attend `ENG-017`. Nouveau ticket `VIZ-006`.

**Reste sur le module**

- `UI-005` les infobulles ont leur composant et leurs premiers contenus ; le
  glossaire complet reste à écrire (`CNT-001`)
- `UI-006` adaptation mobile — sur Pixel 7 une barre du ruban fait quinze pixels de
  large, ce qui passe, mais rien n'a été pensé pour la densité
- `LEG-002` l'avertissement visible. `/credit` affiche désormais des chiffres réels
  sur un déploiement public ; un simulateur utilisable et sans avertissement est plus
  exposé qu'un simulateur incomplet

### 22 août 2026 (suite) — Un avertissement, des versions, et un audit du moteur

**`LEG-002` — l'avertissement**

En tête de document, avant le contenu, sur toutes les pages. **Sans bouton de
fermeture** : un avertissement qu'on escamote cesse d'en être un au deuxième
chargement de page, et c'est l'utilisateur qui revient souvent qui prend l'habitude de
croire les chiffres. Le texte long vit à `/avertissement` et cite ses articles —
L. 541-1 et L. 519-1 du code monétaire et financier — pour qu'ils se vérifient.

Le site n'est pas indexable tant que `LEG-001` et `LEG-002` n'ont pas été relus. Un
seul interrupteur, `src/lib/site.ts`, lu par `robots.txt` **et** par les métadonnées :
deux endroits qui se contrediraient est un défaut qu'on remarque une fois le site
indexé, c'est-à-dire trop tard.

Régime d'éditeur retenu : **non professionnel anonyme**, art. 6 III de la LCEN.
L'identité va à l'hébergeur, le site publie l'hébergeur et une adresse de contact.
Reste à fournir cette adresse — elle sera publique, quatre fois.

**Versions, branches, portes — ADR-006**

`npm run porte` enchaîne typecheck, lint, Vitest, build et Playwright. Une branche par
ticket, fusion en `--no-ff`. Le découpage en versions est dans `docs/RELEASES.md`, avec
un critère de sortie par version écrit du point de vue de quelqu'un qui arrive sur le
site sans rien savoir.

Deux faits l'ont imposé, tous deux du même jour. Une garde est passée pendant deux
suites complètes puis a échoué, alors que le défaut qu'elle visait était constant :
**124 montants rognés** sur le profil mobile. Et rien ne distinguait un commit ayant
passé la suite d'un commit ne l'ayant pas passée.

**Audit `ENG-001` à `ENG-009`**

Huit tickets cochés après relecture de la couverture, ticket par ticket. Deux
conclusions valent d'être écrites.

`ENG-005` était un **vrai trou** : seule la caution était exercée par un test.
L'hypothèque et le nantissement n'en avaient aucun, alors que l'interface les propose
et que le coût de mainlevée est un chiffre que l'utilisateur voit.
`src/core/credit/__tests__/garantie.test.ts` le comble — 13 tests portant sur des
**relations** (assiette, proportionnalité, restitution) et jamais sur un montant, parce
que ces barèmes sont des hypothèses de marché et non des valeurs réglementaires
(`FIS-005`). Un test qui figerait « 2 250 € » donnerait l'illusion que ce chiffre a été
vérifié quelque part.

Ce fichier vit sous `src/core/credit/`, qui est gelé. Il n'y touche pas : il ajoute de
la couverture sans modifier une ligne vérifiée, et `git diff -- src/core` est resté vide
après la sonde. Le gel protège un acquis ; l'éprouver le sert.

`ENG-008` **reste ouvert, et c'est le seul.** Un seul cas de référence cite une source
extérieure. `docs/02-architecture.md` en demande « une poignée », confrontés à un
tableau produit par une banque ou une feuille de calcul indépendante. Un cas n'est pas
une poignée, et cocher aurait été se mentir.

**Outillage**

Le port des tests de bout en bout se choisit (`PORT_E2E`). Sans cela, deux copies du
dépôt qui vérifient leur branche en même temps se servent l'une le build de l'autre :
une porte qui se trompe de code est pire qu'une porte absente. `.claude/**` est exclu
du lint pour la même raison.
### 22 août 2026 — `CNT-003`, la page d'accueil

**Fait**

`src/app/page.tsx` remplace le gabarit de Next par la page d'annonce du produit :
la thèse en trois phrases, les trois familles de paramètres, l'état réel des
modules, la gratuité et le lien partageable, l'avertissement de fin. Composant
serveur, prérendu statique — le build la marque bien `○`.

**Une décision, et sa raison**

Les libellés, les messages et les traits de bordure des trois familles sont lus
dans `src/components/ui/taxonomie.ts`, la même source que les champs de saisie,
plutôt que réécrits sur l'accueil. La page qui *enseigne* la taxonomie et les
champs qui la *portent* ne peuvent donc pas diverger : renommer une famille les
change ensemble. Seuls les exemples de paramètres sont propres à l'accueil.

**Ce qui n'existe pas est dit comme tel**

Quatre des cinq modules listés sont annoncés et non livrés. Ils ne sont ni des
liens ni des boutons : des lignes de liste, bordure tiretée, mention « à venir »
en toutes lettres. `accueil.spec.ts` échoue si l'un d'eux redevient cliquable, et
vérifie aussi qu'aucun lien de la page ne pointe ailleurs que vers `/credit` —
une route inventée par optimisme se verrait tout de suite.

**Neuf tests de bout en bout**, dont un qui relit toute la page à la recherche de
tournures prescriptives (« vous devriez », « nous recommandons », « le meilleur
choix ») : l'interdit éditorial de `docs/CONTEXT.md` §8 est le genre de règle qui
se perd dans une accroche, autant qu'une machine la surveille.

**Validation** — `PORT_E2E=3102 npm run porte` : typecheck ✓ · lint ✓ ·
Vitest **129/129 sur 4 fichiers** ✓ · build ✓ · Playwright **86/86** sur les deux
profils ✓

**Reste**

- `LEG-002` — l'accueil porte son propre paragraphe d'avertissement, repris de la
  planche de design. Ce n'est pas l'avertissement *visible sur tout le site* que
  demande le ticket ; il reste entier.
- Les six onglets de navigation de la planche `Accueil.dc.html` supposent une
  barre commune, qui n'existe pas dans `layout.tsx`. La page vit sans. Le jour où
  la barre arrive, la liste des modules de l'accueil fera doublon avec elle — à
  arbitrer à ce moment-là, pas avant.

> **Note de fusion.** Ces deux entrées ont été écrites le même jour sur deux branches
> parallèles. `LEG-002` a été livré entre-temps : l'avertissement est désormais dans
> `layout.tsx` et donc présent sur l'accueil aussi. Le paragraphe d'avertissement
> propre à l'accueil subsiste et ne fait pas doublon — l'un dit la portée de l'outil,
> l'autre clôt la page d'annonce.
### 22 août 2026 (suite) — Les termes s'expliquent, la bulle se comporte

**Fait — `UI-005`**

**Un glossaire typé plutôt que des textes semés dans les composants.**
`src/content/glossaire.ts` rassemble les dix-neuf entrées du module crédit. Une entrée
est une `accroche` et une `suite`, et le type de chacune n'admet qu'**une seule phrase,
terminée** : une bulle de trois phrases ne compile pas. La charte le demandait depuis
le début (§8) ; jusqu'ici seule la relecture le garantissait, et deux contenus sur onze
étaient déjà passés à trois phrases — le TAEG et la base de calcul de l'assurance. Le
type a forcé leur resserrement. Voir ADR-007.

**Les valeurs réglementaires sortent du texte.** Trois contenus citaient « vingt-cinq
ans », « 10 % » ou « 35 % » en toutes lettres. Ils portent maintenant des jetons
`{plafond}`, `{derogatoire}`, `{partTravaux}`, substitués à l'affichage depuis
`PARAMS_2026`. `useScenario` expose le millésime pour cela.

**Deux défauts réels de la pastille, mesurés avant d'être corrigés.**

- *Le toucher.* `onFocus` ouvrait la bulle, `onClick` la refermait — deux événements du
  même appui. Sur Pixel 7, la pédagogie du produit était inaccessible : la bulle
  clignotait et restait fermée. Le clic ne bascule plus l'état courant mais l'état
  d'**avant le geste**, mémorisé au `pointerdown`.
- *Le débordement.* Bulle ancrée à gauche, largeur fixe : sur la pastille « Coût de
  l'assurance », cinquième colonne, la page mesurait **1 453 px défilables pour 1 280
  visibles**. Sur Pixel 7, « taux d'usure » donnait 472 pour 412. Le placement se
  calcule maintenant en pixels à l'ouverture — un simple basculement à droite aurait
  déplacé le défaut sur l'autre bord des petits écrans.

**Pastilles posées là où elles manquaient** : « Mensualité », le titre du ruban
(« amortissement »), la colonne « Restant dû » du tableau (« capital restant dû »), et
le seuil du champ de taux (« taux d'usure »). Quinze pastilles sur `/credit`.

**Décision d'architecture — ADR-007**

Le contenu pédagogique vit dans `src/content/`, séparé des composants, et sa contrainte
de forme est portée par le type plutôt que par un test.

**Reste**

- `quotite` et `hcsf` ont leur entrée mais aucun emplacement : le module n'expose pas
  de champ de quotité, et poser une seconde pastille sur la tuile du taux d'effort
  l'aurait encombrée. Les deux attendent `CNT-001`.
- La légende de la mensualité annonce « elle monte à … après le différé » sur le
  scénario par défaut, qui n'a pas de différé : `firstPayment` et `maxPayment` diffèrent
  de 1,02 € par le seul jeu des arrondis d'assurance. Défaut antérieur à ce ticket,
  non corrigé ici — il appartient à `UI-004`.

### 22 août 2026 (suite) — Les textes légaux sont publiés

**Fait — `LEG-001`**

Trois pages : `/mentions-legales`, `/confidentialite`, `/conditions`. Un pied de page
commun y mène depuis n'importe quelle route.

Le pied de page n'est **pas** l'endroit de l'avertissement — celui-ci est en tête,
voir `LEG-002`. La distinction tient à qui cherche quoi : l'avertissement doit
atteindre celui qui ne le cherche pas, les mentions légales doivent être trouvables
par celui qui les cherche. Ce ne sont pas les mêmes emplacements.

**L'adresse de Vercel n'a pas été écrite de mémoire.** Elle est relevée dans les
*Terms of Service* de Vercel, § 22.3.4, avec la date du relevé. Vercel ne publie
aucun téléphone : la page le dit, plutôt que d'en inventer un — et un test vérifie
que cette mention subsiste.

**Ce qui a été retiré du brouillon.** La clause de médiation de la consommation :
elle n'est obligatoire que pour un professionnel, et l'y laisser aurait annoncé un
recours qui n'existe pas. Un test vérifie qu'elle ne revient pas.

**Ce que la politique de confidentialité ne dit pas.** Elle ne prétend pas qu'aucune
donnée personnelle n'est traitée — ce serait faux, l'hébergeur journalise les
connexions. Un texte de confidentialité qui commence par une contre-vérité ne vaut
rien. Elle dit aussi l'envers de la promesse du produit : l'état vit dans l'URL, donc
**partager un lien revient à partager les chiffres qu'il contient.**

**Ce qui reste ouvert, et qui n'est pas mince**

- **La relecture juridique.** `LEG-001` et `LEG-002` sont livrés, pas validés. Le site
  reste en `noindex` jusque-là.
- **L'identité de l'éditeur doit avoir été communiquée à Vercel.** C'est la première
  des deux conditions de l'article 6 III ; rien dans ce dépôt ne peut l'attester, et
  sans elle le régime d'anonymat ne s'applique pas.
- **La licence du dépôt.** Aucune n'est attachée, ce que les mentions légales disent
  explicitement : un dépôt public sans licence reste sous droit d'auteur plein et
  n'autorise aucune réutilisation. C'est un défaut, pas une décision.

**Défaut relevé par l'agent `UI-005`, non corrigé ici**

La légende de l'indicateur « Mensualité » se déclenche sur `firstPayment !== maxPayment`,
soit un écart de 1,02 € dû aux seuls arrondis d'assurance, et affiche « elle monte à
1 062,41 € **après le différé** » alors qu'aucun différé n'existe. C'est une phrase
fausse sous un chiffre juste. Ticket `UI-011`.

### 22 août 2026 — Sortie de **v0.1.0**, « Le crédit se calcule »

**Ce qui sort**

Le simulateur de crédit, publiable et compréhensible sans accompagnement. Neuf routes,
toutes prérendues statiquement : accueil, module crédit, galerie de composants, portée
de l'outil, mentions légales, confidentialité, conditions, `robots.txt`.

**La porte de version, passée à froid**

`rm -rf .next` puis `npm run porte`. 214 tests unitaires sur 7 fichiers, 164 de bout en
bout sur 8 fichiers et deux profils, dont 3 ignorés par construction et documentés.

**Le critère de sortie est exécuté, pas coché**

`tests/e2e/parcours-v0-1.spec.ts` traverse le produit d'un bout à l'autre : un inconnu
arrive sur l'accueil, y est prévenu avant d'avoir rien lu, comprend les trois familles,
ouvre le module crédit, saisit son scénario, le partage par lien, le recharge — mêmes
chiffres — puis va voir qui édite le site. Sur les deux profils.

Un critère de sortie qu'on coche à la main est un critère qu'on coche de mémoire à la
version suivante. `docs/RELEASES.md` §3 a été amendé en conséquence.

**Ce que la porte ne dit pas, et qui reste à faire à la main**

Elle s'exécute sur un build **local**. Elle ne dit rien de ce que Vercel sert
réellement. Ouvrir le site déployé et refaire le parcours est une étape distincte,
postérieure à l'étiquette — elle est désormais écrite comme telle dans la procédure.

**Réserves qui accompagnent cette version**

- **Aucun texte légal n'a été relu par un juriste.** Le site reste en `noindex`
  jusque-là, piloté par un seul interrupteur.
- **L'identité de l'éditeur doit avoir été communiquée à Vercel.** C'est la première
  des deux conditions de l'article 6 III de la LCEN ; rien dans ce dépôt ne peut
  l'attester, et sans elle le régime d'anonymat ne s'applique pas.
- **Le mobile est lisible, pas travaillé.** Une barre du ruban fait dix pixels sur
  Pixel 7, sous le seuil d'une cible tactile. C'est `UI-006`, reporté à v0.2.0 par
  décision explicite.
- **`ENG-008`** — un seul cas de référence cite une source extérieure quand
  l'architecture en demande une poignée.
- **`FIS-002`** — la liste des départements à taux réduit reste ouverte. Sans effet
  sur ce module, qui ne calcule pas les droits de mutation ; bloquant pour v1.0.0.
- **La licence du dépôt** n'est pas choisie. Les mentions légales le disent : sans
  licence, un dépôt public reste sous droit d'auteur plein.

### 22 août 2026 — Sortie de **v0.1.1**, correctif de lisibilité

**Corrigé — `UI-012`**

`color-scheme` n'était déclaré nulle part. Le navigateur appliquait donc sa valeur
initiale, `normal`, c'est-à-dire clair, et peignait en blanc le fond des listes
déroulées — pendant que le texte des options héritait de `--encre`, l'encre du thème
sombre. **1,21:1**, là où il en faut 4,5.

Deux déclarations, une par thème. La correction ne touche à aucune couleur : elle
déclare le fond qui n'avait jamais été déclaré. Le même geste corrige la barre de
défilement du tableau mensuel et le remplissage automatique des champs, qui
souffraient de la même cause sans que personne l'ait signalé.

**Ce que ce défaut apprend sur la suite de tests**

Aucun test existant ne pouvait l'attraper. La suite de contraste compare des jetons
entre eux ; ici aucun jeton n'était en cause. Le défaut vivait **entre la page et le
navigateur**, dans ce que la feuille de style ne dit pas.

D'où deux gardes plutôt qu'une, sur deux modes de défaillance distincts : un test
unitaire sur ce que la feuille **déclare**, un test de bout en bout sur ce que le
navigateur **calcule**. Une déclaration peut être écrite et pourtant écrasée.

Et une limite écrite dans le fichier de test plutôt que tue : le fond de la liste
déroulée n'appartient à aucun élément et reste hors de portée d'une mesure. Ces gardes
prouvent que la consigne est donnée au navigateur, pas ce qu'il en peint.

**Porte de version** — à froid : 217 unitaires, 172 de bout en bout sur deux profils.

### 22 août 2026 — `ENG-008`, cinq sources extérieures et aucun désaccord

**Fait**

`src/core/credit/__tests__/cas-de-reference.test.ts`, 18 tests, cinq sources
extérieures au projet. Le ticket se coche : l'architecture demandait « une poignée de
scénarios » vérifiés hors du dépôt, il y en avait un.

| Source | Ce qu'elle vérifie | Accord |
| --- | --- | --- |
| La finance pour tous, hypothèse A — 200 000 € / 1,65 % / 15 ans | Mensualité 1 255,04 €, coût global 25 906,67 € | Mensualité exacte ; coût à 5 centimes |
| La finance pour tous, tableau par annuités — 50 000 € / 2 % / 4 périodes | Les quatre lignes : intérêts, capital, restant dû | Exact au centime |
| Société Générale, exemple représentatif — 200 000 € / 3,30 % / 20 ans | Mensualité 1 139,47 €, dernière échéance 1 139,70 €, intérêts 73 473,03 €, montant total dû 289 234,23 € | **Exact au centime** |
| Le même, volet assurance | Cotisation 43,33 €/mois, coût total 10 399,20 € | Exact au centime |
| Le même, volet TAEG | TAEG 4,10 %, TAEA 0,44 % | 4,0961 % et 0,4403 % |
| Avis du 26 juin 2026 au *Journal officiel* | Les cinq seuils d'usure du 3e trimestre 2026 | Exact |
| Décision HCSF du 29 septembre 2021 | Taux d'effort 35 %, maturité 25 et 27 ans, flexibilité 20 % | Exact |

**Aucun désaccord entre le moteur et une source retenue.** C'était l'issue à ne pas
présumer : le ticket existait pour faire apparaître un écart s'il y en avait un.

**Le résultat qui compte**

L'exemple représentatif d'une banque n'est pas une illustration pédagogique : c'est
une mention imposée à la publicité, produite par l'établissement avec l'outil qui
produira l'offre. Le moteur le reproduit **au centime** sur l'échéancier complet —
mensualité, dernière échéance majorée publiée séparément, total d'intérêts sur
240 échéances, coût d'assurance, montant total dû.

Cela établit plus que la justesse d'une formule : notre convention d'arrondi —
arrondi commercial de chaque intérêt, dernière échéance soldante — **est celle de
l'établissement**, et pas seulement une convention défendable parmi d'autres. La
perturbation le confirme : en troncature l'accord disparaît, 73 471,32 € au lieu de
73 473,03 €.

**Trois choses apprises en chemin**

*Le TAEG dépend du calendrier des frais autant que de leur montant.* Les 612 € de
tenue de compte de l'exemple SG, traités comme un frais initial, donnent 4,11 % ;
étalés sur 240 échéances comme le veut leur nature, 4,10 %, la valeur publiée. Le
périmètre des frais ne suffit pas, il faut leur chronologie.

*`half-even` est indiscernable de `half-up` sur ce prêt.* Un intérêt mensuel ne tombe
pratiquement jamais sur un demi-centime pile ; sans égalité parfaite, les deux
conventions décident à l'identique. Seule la troncature se distingue. Cela recoupe la
mesure de `docs/INDEX.md` — moins de 5 € d'écart entre conventions sur 300 échéances.

*Le texte du HCSF valide un choix d'implémentation.* L'article 4 de la décision
apprécie le taux d'effort « en prenant les charges annuelles d'emprunt MAXIMALES sur
l'ensemble de la période d'amortissement ». Le moteur confronte `maxPayment` et non
`firstPayment` au plafond : ce n'était jusqu'ici justifié que par le raisonnement sur
le PTZ en différé. C'est maintenant sourcé.

**Sources écartées, et pourquoi**

Une source n'est pas fiable en bloc. La page de La finance pour tous publie trois
hypothèses ; deux sont fausses et ne portent aucun test :

- *Hypothèse B* — 200 000 € à 1,8 % sur 20 ans, mensualité annoncée **922,93 €** pour
  un coût global de 38 303,70 €. Les deux chiffres se contredisent : ce coût implique
  une mensualité de 992,93 €, qui est aussi ce que donne la formule. Inversion de
  chiffres. Bâtir un test sur une valeur qu'il faut corriger soi-même, c'est redevenir
  sa propre source.
- *Hypothèse C* — 253 000 € à 1,8 % sur 25 ans, annoncés 1 256,06 € et 48 454,18 €,
  quand ces paramètres donnent 1 047,89 € et 61 366,57 €. Aucune lecture ne réconcilie
  les trois nombres. Ligne fausse.

Écartés aussi : les comparateurs et courtiers remontés par les recherches. Ils
publient des chiffres sans dire d'où ils viennent, et un simulateur qui en recopie un
autre n'est pas une source extérieure.

**Deux points signalés, non corrigés**

- Le taux d'assurance déduit de l'exemple SG — 0,26 % du capital initial pour un
  emprunteur de 35 ans — tombe **sous** la fourchette `marketGroupRatePct`
  `[0,30 ; 0,42]` de `params.ts`. Ce sont des ordres de grandeur de marché, pas des
  valeurs réglementaires, et un seul exemple ne fait pas une fourchette ; mais la
  borne basse mérite d'être revue quand `FIS-005` sera repris.
- Le cas historique de `reference.test.ts` emploie `toBeCloseTo(908.97, 1)`, soit une
  tolérance de 5 centimes, muette. La valeur exacte est 908,9705 € : le test passerait
  encore si le moteur dérivait. Fichier gelé, non touché — mais c'est exactement le
  travers que les tolérances nommées de `cas-de-reference.test.ts` évitent.

**Contrainte de gel respectée** — `git diff -- src/core` ne montre que le fichier
ajouté. Aucune ligne d'implémentation modifiée. La perturbation qui prouve que la
garde mord passe par `LoanSpec.rounding`, que le moteur expose déjà, et non par une
retouche temporaire du code gelé.

**Note d'outillage** — `banque-france.fr` et `economie.gouv.fr` renvoient 403 aux
requêtes automatisées. Les seuils d'usure et la décision HCSF ont donc été lus sur
Légifrance, qui est de toute façon la source de droit.
### 22 août 2026 (suite) — `UI-006`, le mobile cesse d'être « lisible mais pas travaillé »

**Le défaut mesuré** — sur Pixel 7, `/credit?du=300` : une barre du ruban faisait
**10,63 × 154 px**. Le critère WCAG 2.2 § 2.5.8 demande 24 px, et l'exception
d'espacement ne s'applique pas — les barres se touchent. Le ruban était pointable au
doigt par accident seulement. Vingt ans donnaient 14,05 px, quinze ans 19,72 px :
aucune durée proposée par la liste ne passait le seuil.

**Ce qui a été écarté, et pourquoi**

- *Un défilement horizontal du ruban.* Le ruban existe pour montrer d'un seul regard
  le reflux des intérêts sur toute la durée. Un ruban qu'il faut faire défiler pour
  en voir la fin demande de mémoriser l'année 1 pour la comparer à l'année 25 : il ne
  montre plus ce pour quoi il existe. Et la page aurait porté deux cadres à
  défilement horizontal, le tableau étant déjà l'un d'eux.
- *Regrouper les années par deux.* Vingt-cinq années groupées par deux donnent
  treize barres de 27 px — le compte tombe juste, et le résultat ment. Le dernier
  groupe n'aurait qu'une année : à hauteurs strictement proportionnelles, sa barre
  ferait la moitié des autres et se lirait comme un effondrement du versement qui
  n'existe pas. Le seul moyen de la rattraper aurait été un plancher, c'est-à-dire
  exactement ce que ce ruban s'interdit.
- *Un point de rupture de fenêtre.* Il se serait trompé — voir plus bas.
- *Rendre le ruban non cliquable en dessous d'un seuil.* Le critère cesse de
  s'appliquer, le défaut reste : on aurait retiré à l'utilisateur de téléphone le
  seul graphique manipulable du module pour faire passer une mesure.

**Ce qui a été fait — le ruban tourne d'un quart de tour**

Sous 700 px de large, une ligne par année empilée vers le bas, les bandes courant
vers la droite. Toutes les années restent visibles d'un seul tenant, la cible passe
de 10,63 × 154 à **346 × 26 px**, et le repère d'année cesse d'être masqué une fois
sur deux — en lignes il n'y a plus de chevauchement à éviter.

Les proportions ne bougent pas. Les segments portent la même fraction `--part` dans
les deux orientations ; seule la dimension qui la reçoit change. Vérifié au pixel :
intérêts / capital de l'année 1 mesuré à 0,8673 contre 0,86725 attendu.

**La découverte : ce n'est pas la fenêtre qui contraint, c'est le ruban**

Le seuil est arithmétique — 25 × 24 + 24 × 3 + 26 de cadre = 698 px — et il porte sur
la largeur du RUBAN. D'où une requête de conteneur et non un point de rupture. La
différence n'est pas théorique : **à 1 024 px de fenêtre, la colonne de résultats
n'en fait que 640 et les barres y tombaient à 21,7 px**. Sur un écran de bureau, dans
une bande de largeurs que ni le profil `bureau` (1 280) ni le profil `mobile` (412) ne
traversait. Un point de rupture de fenêtre aurait laissé ce défaut intact.

Le même raisonnement a rattrapé un second défaut au même endroit. Le bandeau
d'indicateurs passait à cinq colonnes sur `lg:` : à 1 024 px les cartes tombaient à
120 px et **trois montants sur cinq débordaient de leur carte** — « 281 636,97 € » de
34 px. `auto-fit` sur un minimum de 165 px règle la question par construction. Le
compte de colonnes des deux profils de test est inchangé — cinq à 1 280, deux sur
Pixel 7 — mais il est désormais conclu et non supposé.

**Hiérarchie de lecture** — les deux colonnes s'empilaient dans l'ordre du DOM : dix
champs de saisie avant le premier chiffre, alors que le scénario par défaut est déjà
calculé à l'arrivée. L'ordre du document devient « ce que ça donne, ce qui le
produit, le détail » ; la grille de bureau replace le panneau à gauche par un
placement explicite, et rien n'y change visuellement. L'alerte de dépassement suit le
bandeau : elle explique l'indicateur qu'elle a fait passer en brique, les séparer les
rendrait tous les deux muets.

**Densité** — le libellé et la légende des indicateurs montent d'un point sous
1 024 px (11 → 12 px, 10 → 11 px). Ce n'est pas la largeur de la carte qui le commande
— elle est la même qu'au bureau, 177 contre 171 px — mais la distance de lecture. Le
chiffre ne bouge pas : il est déjà le plus gros élément de la carte, et le grossir le
ferait déborder.

**Cibles tactiles des contrôles** — deux primitives manquaient le seuil sans que cela
se voie au pointeur, où la cible est le curseur :

- le curseur de taux avait une zone sensible de **342 × 3 px**, la hauteur de sa
  piste. La boîte passe à 24 px de haut sans que la peinture change d'un pixel ;
- le `select` se calait sur son interligne, **19,5 px**. Hauteur minimale à 26 px.

**Ce qui reste, et qui n'est pas de ce ticket**

- **La pastille « i » fait 15 × 15 px** et manque le critère. Sa géométrie est tenue
  par une garde d'`UI-005` : `infobulles.spec.ts` mesure au pixel près l'alignement de
  la bulle sur le bord gauche de la pastille. Agrandir sa boîte casse cette garde, et
  la refaire est un ticket, pas un effet de bord de celui-ci. La dette est nommée dans
  `tests/e2e/mobile.spec.ts`, à l'endroit exact où elle est exclue de l'énumération,
  pour qu'elle ne se perde pas.
- **Les liens du pied de page font 18 px de haut.** Ils relèvent de l'exception
  d'espacement du critère — 26 px entre les centres de deux rangées, 20 px entre deux
  liens d'une même rangée — et sont laissés tels quels délibérément.
- **Sous 360 px de large le bandeau tombe à une colonne**, et le module fait alors
  4 005 px de haut. C'est le prix de « aucun montant n'est rogné » : à deux colonnes,
  la carte descend à 151 px et « 281 636,97 € » déborde de 3 px. L'arbitrage est
  assumé — un montant tronqué ressemble encore à un montant.
- **La convention clavier du ruban a changé** : `ArrowDown` avance, `ArrowUp` recule.
  C'était l'inverse, ce qui ne correspondait à aucune des deux orientations.

**Porte** — `PORT_E2E=3111 npm run porte` verte : 217 unitaires sur 7 fichiers,
194 de bout en bout (97 × 2 profils) sur 10 fichiers, dont 7 ignorés par construction.
### 22 août 2026 — `CNT-002`, la fiche pédagogique du module crédit

**Livré** — `/credit/comprendre`, une fiche longue, composant serveur prérendu.

**La route.** Sous `/credit`, et non à la racine ni sous un `/fiches` générique. La
fiche n'existe que par le module : on y arrive en ayant vu des chiffres et en se
demandant ce qu'ils veulent dire. L'adresse le dit, et la parenté d'URL prépare
`/comparaison/comprendre` sans avoir à inventer un index de contenus tant qu'il n'y
a qu'une fiche. Un chemin va du module à la fiche, deux en reviennent.

**Le fil conducteur porte le texte.** Chaque section porte la ou les familles dont
elle relève — négociable, contraint, réglementaire — en étiquette écrite, avec le
trait de bordure de la famille. Une notion peut relever de deux familles à la fois,
et c'est fréquent : la mensualité se forme d'un taux qui se négocie et d'une durée
qui dépend du projet. Les aplatir sur une seule aurait été plus simple et faux. Les
libellés viennent de `src/components/ui/taxonomie.ts`, jamais réécrits.

**Aucun chiffre n'est écrit dans le texte, et ce n'est pas une coquetterie.** Un
paragraphe survit à une loi de finances ; personne ne le relit. Deux provenances
donc, toutes deux dans `src/content/fiche-credit.ts` :

- les **valeurs réglementaires** — plafond d'endettement, durée maximale et durée
  dérogatoire, part de travaux, marge de flexibilité, trois tranches d'usure et leur
  trimestre, seuil et âge de la loi Lemoine — lues dans `src/core/fiscal/params.ts` ;
- les **montants d'exemple** — mensualité, parts d'intérêts et de capital, écart
  entre les deux bases d'assurance, prix des trois garanties, TAEG, TAEA, taux
  d'effort — **calculés par le moteur** sur le scénario que `/credit` ouvre par
  défaut.

Les seuils d'usure passent par `usuryThreshold()` plutôt que par la table : si le
découpage des tranches change, la fiche suit sans qu'on la rouvre.

**Un chiffre calculé plutôt qu'affirmé, et il corrige une idée reçue.** Sur ce prêt,
la part de capital dépasse celle des intérêts **dès la première échéance** — le
moteur le dit, `crossoverMonth` vaut 1. La fiche l'écrit, tout en maintenant que la
première année contient 27 fois plus d'intérêts que la dernière, à proportion. Ce
sont deux affirmations distinctes, et les confondre est l'erreur la plus répandue
sur le sujet. Aucune des deux n'aurait pu être écrite à la main sans risque.

**Décision — l'exemple est réécrit, pas importé.** `src/lib/scenario.ts` porte les
défauts du module, mais il importe `nuqs` au premier niveau : l'importer depuis un
composant serveur fait échouer la collecte des données de page à la compilation
(`o.parseAsInteger.withDefault is not a function`). L'entrée du moteur est donc
réécrite dans `src/content/fiche-credit.ts`. La duplication n'est pas laissée à la
vigilance : un test unitaire compare l'entrée à `versEntreeMoteur(DEFAUTS)`, et un
test de bout en bout compare la mensualité affichée par la fiche à celle qu'affiche
`/credit`. Sabotés tous les deux, ils rougissent tous les deux.

**Outillage — `vitest.config.mts` résout désormais `@/`.** Sans cet alias, aucun
module de `src/lib/` ou `src/content/` qui dépend du moteur n'était chargeable par
Vitest : `src/lib/scenario.ts` n'avait donc aucun test unitaire possible, et le
défaut ne se voyait pas puisque aucun test n'essayait. Ce que la compilation résout,
les tests unitaires doivent le résoudre aussi.

**Une garde éditoriale, automatisée.** « Le produit calcule, l'utilisateur décide »
est la règle la plus importante du projet, et c'est une règle qui se perd au premier
paragraphe réécrit de bonne foi. Dix tournures interdites — « vous devriez », « nous
recommandons », « le meilleur choix », « il faut », « mieux vaut », « préférez »,
« choisissez », « évitez », « n'hésitez pas », « vous avez intérêt à » — sont
balayées sur la page **rendue**, document entier, et sur le module de contenu.

**Ce que la fiche dit qu'elle ne dit pas.** Six omissions nommées, dont deux qui
touchent à l'honnêteté du calcul plutôt qu'à son périmètre : les barèmes de garantie
sont des ordres de grandeur de marché non encore confrontés à leurs publications
(`FIS-005`), et le lissage multi-prêts n'est pas modélisé.

**Modifications hors périmètre, minimales et signalées.** Un lien vers la fiche dans
`src/components/credit/ModuleCredit.tsx`, sous « Ce que ce calcul ne dit pas ». La
route `/credit/comprendre` ajoutée à la liste `ROUTES` de `avertissement.spec.ts`,
dont le contrat déclaré est que toute route affichant des chiffres y figure.

**Porte** — verte sur le port 3113 : 238 unitaires, 204 de bout en bout sur deux
profils, dont 3 ignorés par construction.

**Réserve.** La fiche reste non relue par un professionnel, comme les textes légaux,
et le site demeure en `noindex`. Elle décrit un état du droit au 22 août 2026 ; les
valeurs qu'elle cite portent la date et la source de `params.ts`, dont trois entrées
sont encore marquées `TODO_VERIFY`.
### 22 août 2026 — `CNT-001`, le glossaire devient consultable

Branche `feat/CNT-001-glossaire`. Trois volets, et le troisième a coûté plus cher que
les deux premiers réunis.

**Le contenu — dix-neuf entrées, puis quarante-huit**

Le glossaire couvrait le module crédit. Vingt-neuf termes s'y ajoutent : les frais
d'acquisition et leurs quatre postes, les trois garanties et la mainlevée qui les
départage, le prêt à taux zéro, la vente en l'état futur d'achèvement, la plus-value et
ses deux barèmes d'abattement, l'effet de levier, le reste à vivre, le saut de charge.
Chacune tient toujours en **deux phrases exactement** — la contrainte d'ADR-007 n'a pas
été touchée, et les cinq `@ts-expect-error` qui la gardent compilent encore.

Neuf de ces entrées attendent une valeur réglementaire. Elles sont donc dans
`GLOSSAIRE_PARAMETRE`, et `src/content/valeurs.ts` les sert depuis `params.ts` :
droits de mutation, double plafond d'indemnité de remboursement anticipé, seuils de la
loi Lemoine, remise sur les émoluments, part déductible du mobilier.

**Le texte long — une décision, pas un champ**

Le choix était entre étendre `Entree` d'un champ long optionnel et séparer les deux
contenus. C'est la séparation qui l'emporte, et la raison est écrite en ADR-009 : un
champ de texte libre sur l'objet que la pastille reçoit rouvre le chemin qu'ADR-007 a
fermé. La contrainte des deux phrases redeviendrait une discipline de composant.

La clé suffit à relier les deux. `DEVELOPPEMENTS satisfies Record<CleGlossaire,
Developpement>` : un terme ajouté sans son développement arrête le typecheck. Et
`developpement()` vérifie **au type** que chaque jeton existe dans `valeurs.ts` — la
même garantie qu'`avec()` donne aux bulles, transposée au texte long.

**Le chemin depuis la bulle — deux défauts invisibles à la relecture**

Un lien posé dans une bulle qui se ferme au `blur` et au départ de la souris est, par
défaut, un lien qu'on ne peut pas atteindre. Les deux façons de le rater ont été
trouvées en écrivant le test, pas en relisant le composant.

*Au clavier.* La fermeture était portée par le bouton. Tabuler vers le lien détruisait
le lien avant qu'il ne reçoive le focus, et la tabulation atterrissait sur le contrôle
suivant. La fermeture est remontée sur la zone entière et regarde `relatedTarget` : un
focus qui reste à l'intérieur ne ferme rien.

*À la souris.* La bulle est posée à 22 px du haut d'une pastille qui en fait 15. Les
sept pixels de vide entre les deux sont hors de la zone : la souris qui descendait vers
le lien déclenchait `mouseleave`, et la bulle disparaissait sous le curseur. Un pont
invisible, enfant de la zone, comble l'écart. Le test le traverse en vingt pas — un
`page.mouse.move` d'un seul saut ne produit qu'un `mousemove` à l'arrivée et n'aurait
jamais vu le défaut.

*Un troisième, découvert par le test.* Échap depuis le lien ne fermait rien : la reprise
du focus par le bouton déclenche l'événement de focus de façon synchrone, `onFocus`
rouvrait la bulle, et la réouverture l'emportait sur la fermeture dans le même lot de
rendu. Un drapeau le temps de la restauration.

**Ce que le `role="note"` porte désormais**

Le cadre de la bulle et son texte sont devenus deux éléments. Le `role="note"` est sur
le **texte** : la bulle continue donc de « faire deux phrases » pour un lecteur d'écran
comme pour les tests de `UI-005`, que le lien ne vient pas allonger. Aucun test existant
n'a eu besoin d'être modifié.

**Un défaut d'outillage corrigé au passage**

`vitest.config.mts` ne résolvait pas l'alias `@/`. Tout module qui l'emploie compilait
mais ne s'exécutait pas sous Vitest : `src/lib/format.ts` et `src/content/valeurs.ts`
étaient donc intestables, et personne ne l'avait vu parce qu'aucun test ne les touchait
encore.

**Ce qui a été trouvé et laissé en l'état**

- `GLOSSAIRE.tauxNominal` cite « 2 200 € sur un prêt de 180 000 € » et
  `GLOSSAIRE.baseAssurance` « 30 à 45 % ». Ce ne sont pas des valeurs réglementaires —
  une illustration pour la première, une observation de marché pour la seconde — donc la
  règle de `CLAUDE.md` n'est pas enfreinte. Mais le premier chiffre devrait sortir du
  moteur et le second de `params.ts`, où `borrowerInsurance` porte déjà des fourchettes
  de marché. La garde « aucune valeur écrite à la main » ne s'applique aujourd'hui
  qu'aux développements, pour cette raison.
- `params.ts` ne porte ni le taux des prélèvements sociaux, ni les deux barèmes
  d'abattement pour durée de détention, ni les quotités du prêt à taux zéro. Les entrées
  correspondantes décrivent donc la mécanique **sans le chiffre**. C'est honnête, mais
  cela veut dire que le module M2 aura à alimenter `params.ts` avant de pouvoir
  s'appuyer sur ces contenus.
- `docs/RELEASES.md` ne mentionne `CNT-001` dans aucune version. Le ticket vit en
  phase 7 sans jalon.

**Porte** — `PORT_E2E=3112 npm run porte`, verte : 553 unitaires (8 fichiers),
192 de bout en bout dont 5 ignorés par construction.

### 22 août 2026 — Sortie de **v0.2.0**, « Le crédit s'explique »

**Ce qui sort.** Onze routes, toutes prérendues. Le mobile travaillé, un glossaire de
quarante-huit termes relié aux infobulles, une fiche pédagogique, et deux chantiers de
fond ajoutés en cours de route : les cas de référence externes et la séparation entre
valeurs de loi et hypothèses de marché.

**Cinq chantiers menés en parallèle**, quatre par des agents sur leur propre copie du
dépôt, chacun avec sa branche, son port de test et sa porte. Ce qu'il faut en retenir
tient en trois points.

**Le type a arrêté trois confusions.** `FIS-005` a déplacé les coûts de garantie et les
fourchettes de marché hors de `params.ts` pendant que deux autres chantiers les
lisaient. À chaque fusion, la compilation a refusé. C'est exactement ce qu'on demandait
à cette séparation : une hypothèse de marché ne se glisse plus là où on attend une
valeur de loi.

**Une source publique s'est révélée fausse, pas notre moteur.** `ENG-008` cherchait un
désaccord entre nos calculs et des sources extérieures. Il n'en a trouvé aucun — mais
deux chiffres publiés par La finance pour tous sont faux, et la page se contredit
elle-même. Vérifié indépendamment avant d'être écrit. À l'inverse, l'exemple
représentatif de la Société Générale — une mention légalement imposée, produite par la
banque avec l'outil qui produira l'offre — est reproduit **au centime** sur
l'échéancier, l'assurance et le TAEG.

**Les agents ont trouvé ce que je n'avais pas mesuré.** `UI-006` a relevé deux défauts
à 1024 px, une bande qu'aucun de nos deux profils ne traverse : les barres du ruban y
tombaient à 21,7 px et trois montants sur cinq débordaient. `CNT-001` a trouvé trois
défauts du chemin entre la bulle et le glossaire, dont sept pixels de vide qui
fermaient la bulle pendant le trajet de la souris.

**Le coût du travail en parallèle, mesuré.** Chaque agent consignant sa propre entrée
de journal, les quatre fusions ont produit un conflit chacune sur `docs/TASKS.md` et
`docs/REGISTRE-TESTS.md`, et le registre s'est retrouvé avec quatre relevés empilés,
tous périmés sauf un. Consolidé ici. Deux branches ont aussi pris le numéro `ADR-008`
en même temps ; celle déjà fusionnée et citée depuis `src/core` l'a gardé.

**Le critère de sortie est exécuté au pouce.** `parcours-v0-2.spec.ts` mène le parcours
complet par `tap()` et non par `click()` : sur un écran tactile, un appui produit une
rafale d'événements qu'un clic simulé ne reproduit pas, et c'est précisément là que la
pastille se cassait avant `UI-005`.

**Réserves inchangées.** Aucun texte légal relu par un juriste, site en `noindex`,
identité de l'éditeur à communiquer à l'hébergeur, licence du dépôt non choisie,
déploiement non vérifié. Nouvelles : `FIS-006` le recoupement des neuf hypothèses de
marché, et la pastille « i » à 15 px, sous le seuil de cible tactile.

### 22 août 2026 — `ENG-011`, le locataire de référence a un portefeuille

Premier fichier de `src/core/compare/`. Un seul module, `portefeuille.ts`, et sa suite de
tests : `detention.ts` et `types.ts` s'écrivaient en parallèle sur une autre copie.

**Ce que le module fait.** À partir d'un apport, d'une série de versements mensuels — dont
le signe peut changer — et d'un rendement net d'impôt, il rend la trajectoire de valeur du
portefeuille, en séparant l'**effort d'épargne réel** des **gains**. Il ne compare rien, ne
conclut rien, et n'a pas de champ `gagnant` : un test de forme le vérifie, parce que ce
champ-là s'ajoute sans discussion et ne se retire plus une fois que l'interface s'y appuie.

**Trois décisions, et une seule était vraiment ouverte.**

*Le portefeuille épuisé.* Un versement négatif est un retrait, et un retrait peut dépasser
ce qui reste. Le retrait est alors tronqué, la valeur reste à zéro, et le manque est rendu
explicite — `nonFinance` par mois, `moisEpuisement` pour la première rupture. Laisser la
valeur passer en négatif aurait fait *rapporter* une dette au rendement des marchés, ou
l'aurait fait s'effacer toute seule à rendement négatif. Le chiffre serait resté plausible.
Voir ADR-011.

*L'arrondi.* Chaque mois, pas à l'affichage. C'est ce qui fait tenir
`capital versé + gains = valeur` **par construction** plutôt que par chance : la même série
d'entiers, lue de deux façons. Mesuré contre une capitalisation en flottant sur 300 mois :
**0,73 centime d'écart sur 462 185 €**.

*Le taux mensuel.* Pas `monthlyRate`. Le crédit divise par douze parce qu'un contrat le
stipule ; un rendement de marché n'a pas de contrat, et « 5 % par an » y veut dire 5 % au
bout d'un an. La convention proportionnelle aurait rendu **2,08 % de capital final en trop**
sur 300 mois, dans le sens qui flatte les marchés face à la pierre — exactement le biais que
le module M5 existe pour dénoncer.

**Un chiffre que je croyais tenir à la main, et qui ne tenait pas.** Le cas de référence du
portefeuille épuisé attendait 400 € manquants au mois 1 ; le moteur en rendait 399,67. Le
moteur avait raison : le rendement du mois s'applique **avant** le retrait, et les 33
centimes gagnés sur le solde de 100 € réduisent d'autant le manque. Le test dit maintenant
le calcul complet. C'est la deuxième fois sur ce projet qu'un cas de référence est corrigé
par le moteur plutôt que l'inverse, et à chaque fois c'est l'ordre des opérations qui était
en cause.

**Gardes cassées, trois fois.** Retirer la troncature du retrait : 4 tests rouges. Porter le
solde en flottant : 8 rouges, dont l'invariant au centime et l'intégrité des entiers.
Remplacer l'équivalence actuarielle par le taux proportionnel : 7 rouges. Rétabli, vert.

**Ce que je laisse en l'état.** Les fourchettes de rendement (`RENDEMENTS_NETS_OBSERVES`)
relèvent de `src/core/assumptions/market.ts` par ADR-008, mais ce fichier était pris par un
autre chantier : elles sont déclarées dans `portefeuille.ts`, avec un type qui reproduit la
forme de `FourchetteObservee` pour que le déplacement soit mécanique. **À déplacer à la
fusion, sans les modifier.** Elles ne sont lues par aucun calcul.

**Un invariant qui ne mord pas assez.** « le manque non financé n'apparaît qu'à partir du
mois d'épuisement » ne détecte pas la suppression de la troncature : sans elle, `nonFinance`
reste nul partout et `moisEpuisement` reste `null`, ce que la propriété accepte. Les quatre
autres tests l'attrapent, mais celui-là est plus faible qu'il n'en a l'air.

**Porte** — `PORT_E2E=3123 npm run porte`, verte : 661 unitaires (12 fichiers), dont 42
nouveaux, et le bout en bout inchangé.
---

## Session `FIS-007` — la fiscalité de la phase 3, sourcée et datée

*22 août 2026. Branche `feat/FIS-007-fiscalite-phase-3`.*

Ticket de valeurs, pas de calcul : `params.ts` gagne 342 lignes et n'en perd aucune. Le
diff est purement additif, vérifié comme tel avant commit. Huit règles couvertes, chacune
confrontée à son texte — article de code, texte au Journal officiel ou doctrine BOFiP.

**Le taux de CSG sur le patrimoine n'est plus 9,2 % partout, et c'est le résultat le plus
important de la session.** Depuis les revenus 2025, le 2° du I de l'article L136-8 du code
de la sécurité sociale porte la CSG à **10,6 %**, ce qui fait un prélèvement global de
**18,6 %**. Mais le IV du même article y **déroge** et la maintient à 9,2 % pour, entre
autres, les revenus fonciers et les plus-values immobilières : **17,2 %**. Deux taux
coexistent donc, et c'est le second qui gouverne ce produit. Trois sources concordantes :
le texte de l'article, la fiche `F2329` de service-public.gouv.fr mise à jour le 30 juin
2026, et la page d'impots.gouv.fr sur les revenus locatifs, qui oppose explicitement la
location nue — « 17,2 % (CSG 9,2 %, CRDS 0,5 % et prélèvement de solidarité 7,5 %) » — à
la location meublée, à 18,6 %.

Les deux taux sont écrits, avec leur décomposition, et un test vérifie que la dérogation
ne porte **que** sur la CSG. Écrire un seul taux « parce que c'est celui de l'immobilier »
aurait rendu invisible la distinction le jour où `ENG-013` traitera les régimes locatifs.

**Deux résumés de recherche ont été démentis par les textes.** Le premier donnait
l'abattement des plus-values immobilières à « 5 % par année au-delà de la deuxième » — le
régime des biens meubles de l'article 150 UA, pas celui de l'immobilier. Le second
reproduisait la décomposition des prélèvements sociaux d'avant 2018 (CSG 9,9 %,
prélèvement social 4,5 %, contribution additionnelle 0,3 %, solidarité 2 %), abrogée
depuis huit ans. Aucun des deux n'annonçait la moindre incertitude. Toutes les valeurs
retenues viennent d'une lecture d'article ou d'une page officielle, jamais d'un résumé.

**Les deux barèmes d'abattement ne se factorisent pas.** L'impôt sur le revenu court à
6 % par an de la 6e à la 21e année puis 4 % la 22e — exonération à 22 ans (art. 150 VC, I).
Les prélèvements sociaux courent à 1,65 %, puis 1,60 % la 22e année, puis **9 % par an
jusqu'à la 30e** (art. L136-7, VI, 2°). À 22 ans de détention, un vendeur ne doit plus
d'impôt sur le revenu et doit encore **72 % de prélèvements sociaux**. C'est le fait le
plus contre-intuitif du dispositif ; un test l'énonce comme tel et rougirait si les deux
barèmes convergeaient.

**Le barème de la surtaxe se garde par sa continuité, pas par sa recopie.** Le taux de
l'article 1609 nonies G s'applique à la **totalité** de la plus-value : sans décote, passer
de 2 % à 3 % à 100 000 € coûterait 1 000 € pour un euro de plus-value supplémentaire. Les
cinq décotes de lissage existent pour effacer ces sauts. Le test évalue donc le barème de
part et d'autre des neuf frontières et exige que l'écart reste sous un euro. Un
coefficient mal recopié rouvre le saut, et rien d'autre ne le verrait — un `toBe` sur
chaque tranche aurait recopié l'erreur avec la valeur. La seule discontinuité conservée
est celle du seuil d'entrée à 50 000 €, qui est dans le texte : la première décote est de
1/20 là où la continuité aurait demandé 1/10. Constatée, pas corrigée.

**Un piège de lecture consigné dans le fichier.** Le rescrit `BOI-RES-RFPI-000242` borne
la promesse de vente de l'abattement exceptionnel au 31 décembre 2025 ; l'article 150 VE
dit 31 décembre 2027. La divergence est **chronologique, pas réelle** : le rescrit est
publié le 31 décembre 2025, la loi de finances pour 2026 du 19 février 2026 a prorogé
ensuite. C'est écrit en clair dans le commentaire pour que personne ne refasse
l'arbitrage, avec les deux liens.

**Aucun `TODO_VERIFY` ajouté** — le compte reste à 2, tous deux sur les droits de mutation,
et `market.test.ts` n'a pas eu à être touché. C'était l'issue à viser : le marqueur est là
pour ce qu'on n'a pas pu vérifier, pas pour ce qu'on n'a pas pris le temps de vérifier.
Un test du ticket répète le compte, pour qu'un ajout non vérifié rougisse dans le fichier
qui l'a introduit et pas seulement à côté.

**Trois gardes cassées, trois rouges obtenus.** Ramener la dernière cadence sociale de 9 à
8 % : « le barème ne solde pas à 100 % au terme de la 30e année : expected 92 to be 100 ».
Ramener la décote de la tranche 100 001–110 000 de 1/10 à 1/20 : « saut de taxe à
100000 € : 2000.00 € puis 2500.08 € ». Porter le taux réduit EEE/Suisse de 7,5 à 8 % :
« le taux réduit EEE/Suisse est exactement le prélèvement de solidarité ». Rétabli après
chaque essai, diff vérifié vide.

**Ce qui relève du marché et n'est pas entré ici.** La recherche a croisé des ordres de
grandeur — rendement locatif brut, taux de vacance, commission d'agence à la revente,
frais de gestion locative. Aucun texte ne les fixe : ils relèvent d'`assumptions/market.ts`
(ADR-008), où un autre agent travaillait pendant cette session. **Ils n'ont pas été
écrits**, seulement signalés. Un test du ticket vérifie qu'aucun de ces mots n'apparaît
dans `params.ts` : la frontière se refranchit sans y penser, et c'est le premier endroit
où l'on serait tenté de la refranchir.

**Réserve.** Le forfait travaux de 15 % est réservé aux immeubles **bâtis** détenus depuis
plus de cinq ans, et le forfait de 7,5 % exclut les immeubles détenus par un fonds de
placement immobilier. Ces deux restrictions sont dans les commentaires, pas dans la
structure de données — un consommateur distrait peut donc appliquer un forfait hors de son
champ. À traiter dans `ENG-014`, qui écrira le calcul.

**Porte verte** : `PORT_E2E=3121 npm run porte` — typecheck, lint, **671 tests Vitest sur
12 fichiers**, build, **242 tests Playwright passés et 10 ignorés**.
### 22 août 2026 — `ENG-010`, coûts de détention et flux mensuels comparés

**Ce qui est livré.** `src/core/compare/detention.ts` et `src/core/compare/types.ts`,
une fonction publique — `comparerDetention(entree): ComparaisonDetention` — qui rend une
série mensuelle, une série annuelle cumulée, deux années de croisement et les totaux
poste par poste. L'échéance de crédit est **lue** dans un `CreditPlan` et jamais
recalculée : le type d'entrée le dit, il ne demande que `rows`.

**La décision de fond, et c'est tout le ticket.** La spécification énonce que la
comparaison mensualité contre loyer est faussée. Elle l'est parce que la part de capital
n'est pas une dépense. Le module produit donc `decaissement` et `fondsPerdus` **ensemble**,
comme deux agrégations du même détail mensuel, et non une série que l'interface
corrigerait après coup. Deux années de croisement, une par lecture, parce qu'elles ne
tombent presque jamais la même année. Détail dans ADR-012.

**Un biais trouvé en chemin.** La spécification ne demande d'indexer que le loyer. S'y
tenir aurait fait grandir une seule des deux courbes, donc avancé le croisement, donc
favorisé l'achat — systématiquement, jamais dans l'autre sens. Les deux côtés sont
indexés. Trois vitesses distinctes : loyer, taxe foncière, charges.

**Quatre hypothèses de marché ajoutées** en fin de `assumptions/market.ts`, sous
`detention` : provision pour travaux en % de la valeur du bien, et les trois indexations.
Toutes en fiabilité `estimee`, avec leur intervalle et leur provenance. Elles portent le
compte de `FIS-006` de neuf à treize. La dérive de la taxe foncière est la plus fragile
des quatre : l'un de ses deux moteurs est un taux voté par une collectivité, qui ne se
prévoit pas.

**Ce que les gardes cassées ont appris.** Trois cassées puis rétablies. Supprimer la
soustraction du capital : cinq tests rouges, dont le cas de référence B. Supprimer le
résidu de la ventilation annuelle : sept rouges — et le fait qu'un montant annuel de
quelques centimes disparaissait entièrement suffisait à inventer une année de croisement.
Retirer le plancher à zéro de l'indexation : **un seul** rouge, un cas écrit à la main,
parce que le générateur de propriétés était borné à ±10 % et ne descendait jamais sous
−100 %. Un générateur volontairement hors domaine a été ajouté pour couvrir ça.

**Trouvé sans être corrigé.** Ce générateur élargi a fait apparaître autre chose : à
+300 % d'indexation sur vingt ans, les cumuls dépassent 2⁵³ centimes et `sum` lève une
`RangeError`. C'est le comportement voulu — `assertSafe` refuse plutôt que d'additionner
faux — mais il remonte jusqu'à l'appelant. Conservé tel quel, avec un test qui le
documente : c'est à l'interface de borner la saisie.

**Deux réserves à porter dans l'interface.** Les frais d'acquisition sont un paramètre
optionnel à zéro par défaut, ce que décrit le niveau simple de la spécification et qui
rend le croisement optimiste de plusieurs années sur un bien ancien. Et le croisement des
fonds perdus n'est **pas** un seuil de rentabilité : le niveau simple ne mesure ni
l'appréciation du bien, ni les frais de revente, ni le coût d'opportunité de l'apport.
Le dire dans le code ne suffira pas.

**Porte** — `PORT_E2E=3122 npm run porte`, verte.

### 23 août 2026 — `ENG-014` et `ENG-016`, plus-value hors résidence principale

**Ce qui est livré.** `src/core/compare/plus-value.ts`, un seul fichier ajouté au
répertoire — deux autres agents y travaillaient sur d'autres modules pendant la session.
Fonction publique `calculerPlusValue(entree): ImpositionPlusValue`, entourée de quatre
constructeurs de majoration, deux prédicats d'exclusion et trois fonctions de barème
exportées pour être éprouvées séparément.

**La décision de fond.** Deux abattements, donc **deux assiettes**, nommées en toutes
lettres. Aucun champ « plus-value imposable » n'existe dans la sortie : le nom serait
ambigu, et l'ambiguïté serait résolue par l'interface, c'est-à-dire à l'endroit qui n'a ni
les tests ni le contexte pour la résoudre. Entre la 22e et la 30e année, un moteur qui ne
rendrait qu'un chiffre serait faux de la totalité des prélèvements sociaux restants, et
parfaitement vraisemblable. Détail dans ADR-013.

**Un corollaire trouvé en chemin, et qui n'allait pas de soi.** La surtaxe est assise sur
la plus-value imposable « déterminée dans les conditions prévues aux articles 150 V à
150 VD » — c'est-à-dire l'assiette de l'**impôt sur le revenu**, pas celle des
prélèvements sociaux. Elle s'éteint donc à 22 ans avec l'impôt sur le revenu, et non à 30.
Prendre l'assiette sociale, plus large, aurait produit une surtaxe entre la 22e et la 30e
année là où rien n'est dû. Un invariant sous `fast-check` le garde.

**La dette de `FIS-007` est soldée, par deux verrous et pas un.** Le type d'abord : la
branche `forfait` des unions de majoration porte un jeton marqué d'un `unique symbol` non
exporté, que seuls `travauxForfaitaires()` et `fraisAcquisitionForfaitaires()` produisent,
et qui lèvent hors champ. L'exécution ensuite : `calculerPlusValue` revérifie les
conditions contre l'entrée soumise, parce qu'un jeton atteste d'**une** situation et pas
de celle du calcul. Sans ce second contrôle, ouvrir le forfait sur un bien bâti détenu
vingt ans suffisait à majorer de 15 % un terrain détenu deux ans — et c'est exactement le
tirage qu'une propriété reproduit.

**Une unité changée, et c'est la seule qui marche.** La durée de détention entre en
**mois**. Le forfait travaux suppose « plus de cinq ans » ; 60 mois et 71 mois valent tous
deux 5 années révolues, et n'ouvrent pas les mêmes droits. Une durée en années ne sait pas
distinguer les deux.

**Ce que le module ne modélise pas sort avec le résultat.** `nonModelise` est un champ,
pas un commentaire : six réserves permanentes, deux de plus quand le taux réduit
EEE/Suisse est retenu, une pour un terrain à bâtir, une pour une moins-value. La
spécification écrit elle-même que le régime des non-résidents « doit être vérifié cas par
cas » ; la réserve est rendue indétachable du chiffre plutôt que laissée à l'interface.

**Trois gardes cassées, trois rouges obtenus.** Appliquer le barème fiscal aux
prélèvements sociaux — la confusion classique : six tests rouges, dont « expected 100 to
be 28 » sur l'abattement social à 22 ans et « expected 22 to be 30 » sur l'année
d'exonération. Retirer le contrôle d'exécution du forfait travaux : deux rouges, dont la
propriété qui tire le jeton et la situation indépendamment. Annuler la décote de lissage
de la surtaxe : trois rouges, dont « saut de surtaxe à 100000 € : 2000 € puis 3000.03 € ».
Rétabli après chaque essai, suite reverte.

**Aucune valeur réglementaire écrite dans le module.** Tous les taux, barèmes, seuils et
forfaits sont lus dans `params.ts`, y compris la durée de cinq ans du forfait travaux, qui
sert de comparaison stricte. Aucun fichier existant de `src/core/` n'a été touché.

**Trouvé sans être corrigé.** Trois points, tous déclarés dans `nonModelise` :
les amortissements déduits en location meublée au réel ne sont pas réintégrés à la
plus-value, alors que `docs/03-spec-domaine.md` §2 signale l'effet — la plus-value d'un
bien loué meublé au réel est donc sous-estimée, et le sujet appartient à `ENG-013` qui
saura ce qui a été amorti ; l'abattement exceptionnel de l'art. 150 VE n'est pas appliqué
bien que ses valeurs soient dans `params.ts`, parce qu'il dépend d'un engagement de
l'acquéreur ; et la restriction du forfait de 7,5 % aux fonds de placement immobilier a
été reprise de la réserve écrite par `FIS-007`, sans être reconfrontée au texte de
l'art. 150 VB, II, 3°.

**Porte verte** — `PORT_E2E=3131 npm run porte` : typecheck, lint, **820 tests Vitest sur
17 fichiers**, build, **242 tests Playwright passés et 10 ignorés**. Le ticket en apporte
36, dans `src/core/compare/__tests__/plus-value.test.ts`.
### 23 août 2026 — `ENG-012`, scénario de vente à l'horizon

**Ce qui est livré.** `src/core/compare/vente.ts`, une fonction publique —
`produitDeVente(entree, params): ProduitDeVente` — et un utilitaire exporté,
`valeurAppreciee(valeurInitiale, pctAnnuel, mois)`. Aucun autre fichier de `compare/` n'a
été touché : les types du module vivent dans `vente.ts`, pour ne pas entrer en collision
avec `plus-value.ts`, écrit en parallèle.

**La décision de fond.** Le module rend **sept postes séparés**, et le produit net n'est
que leur somme algébrique. Rendre un total unique aurait répondu à la question sans rien
enseigner : deux des postes — l'indemnité de remboursement anticipé et la mainlevée — sont
ignorés de la plupart des vendeurs jusqu'au décompte du notaire, et ils pèsent des
milliers d'euros. L'écart entre une caution et une hypothèque, sur le cas de référence E,
fait 2 575 € et tient en deux lignes qui vont dans des sens opposés. Voir ADR-014.

**Le produit net peut être négatif, et il n'est pas tronqué.** Cas de référence C : bien
acheté 200 000 €, marché en recul de 5 % par an, revente au bout de deux ans avec un prêt
encore à 195 000 €. Produit net : **−25 075 €**. C'est la somme que le vendeur doit
apporter au notaire pour que la vente se fasse, et c'est le seul cas où le chiffre change
une décision. Aucun plancher n'a été posé sur le total. Les postes pris isolément, eux, le
sont : une commission négative ne veut rien dire.

**Rien n'est recalculé.** Le capital restant dû est lu dans `plan.rows[m − 1].balance`, la
mainlevée et la restitution sortent du `GuaranteeCost` du moteur crédit, l'indemnité passe
par `prepaymentPenalty` et son double plafond. Le type d'entrée le dit : il ne demande que
`rows`, `guarantee` et `totalPrincipal`. Ce dernier est là pour l'horizon zéro, le seul
instant qu'aucune ligne ne décrit — lire `rows[0]` y rendrait le solde *après* la première
échéance.

**La place laissée au cas imposable.** Une **union discriminée**, `RegimePlusValue`, dont
la branche `residence-principale` est calculée ici — un zéro, et c'est un zéro calculé —
et dont la branche `imposable` reçoit un `impotTotal: Cents` établi ailleurs. Un champ
`impot?: Cents` optionnel aurait confondu « aucun impôt n'est dû » et « personne n'a
renseigné l'impôt » ; l'union rend le second inécrivable. `plus-value.ts` n'est ni importé
ni supposé.

**Deux hypothèses de marché ajoutées** en fin de `assumptions/market.ts`, sous `vente`, et
**elles n'ont volontairement pas le même type**. L'appréciation annuelle du bien est une
`FourchetteObservee` — intervalle [−2 ; +4], **sans valeur centrale** —, ce qui la rend
obligatoire dans l'entrée du calcul : lui donner un défaut reviendrait à publier une
prévision de marché. La commission d'agence est une `HypotheseChiffree`, 5 % dans [3 ; 8],
et sert de défaut. Elles portent le compte de `FIS-006` de treize à quinze.

**Ce que les gardes cassées ont appris.** Quatre cassées puis rétablies. Retirer le
plancher qui absorbe une base d'appréciation négative — sans lui, `Math.pow` d'une base
négative à un exposant fractionnaire rend `NaN`, et un `NaN` traverse un décompte
monétaire sans bruit : deux rouges. Lire `rows[m − 1]` à l'horizon zéro : quatre rouges.
Remplacer le `??` de la commission par un `||`, ce qui écrase une saisie à zéro — la vente
de particulier à particulier — par la valeur de marché : trois rouges.

Le quatrième est le seul intéressant. Rendre la mainlevée inconditionnelle, donc la
facturer même après la dernière échéance : **un seul rouge**, celui du test de propriété.
Le cas de référence de la vente au terme aurait dû mordre et n'a pas mordu, parce qu'il
est garanti par une **caution**, dont la mainlevée vaut zéro de toute façon. Un cas sous
hypothèque a été ajouté ; la garde rougit maintenant deux fois. Un cas de référence qui ne
distingue pas les deux garanties ne garde pas la condition qui les sépare.

**Trouvé sans être corrigé.** Trois points.

`assumptions/__tests__/market.test.ts` n'itère nommément que sur le bloc `guarantee` : le
bloc `vente` échappe entièrement à sa boucle, comme `detention` avant lui. La dette était
déjà signalée ; elle grossit. Le bloc est couvert dans `vente.test.ts`, ce qui met la
garde d'un fichier au mauvais endroit. À reprendre avec `FIS-006`.

`GuaranteeCost.refundAtTerm` est entendu ici comme « à l'extinction du prêt », la vente
l'éteignant tout autant que sa dernière échéance. Ce que restitue réellement un organisme
de caution lors d'un remboursement anticipé peut être moindre, et aucune grille publiée ne
permet de le chiffrer. L'hypothèse est écrite dans le code, elle n'est pas vérifiée.

Le taux moyen du prêt est un paramètre **obligatoire** du module. Sur un financement à
plusieurs lignes — prêt principal et prêt à taux zéro —, il dépend d'une convention de
pondération que le moteur crédit ne porte pas. Le rendre obligatoire évite qu'un défaut à
zéro annule silencieusement l'indemnité, mais ne dit pas à l'appelant comment le calculer.
C'est un trou de spécification, pas un trou de code.

**Une réserve à porter dans l'interface.** Le module ne compare pas deux horizons et ne
désigne aucun moment favorable. Balayer l'horizon pour tracer une courbe est légitime ; en
présenter le maximum comme un moment où vendre ne le serait pas.

**Porte** — `PORT_E2E=3132 npm run porte`, verte : typecheck, lint, **824 tests Vitest sur
17 fichiers**, build, **242 tests Playwright passés et 10 ignorés**.
### 23 août 2026 — `VIZ-003`, la route `/comparaison` et la limite qui passe devant

**Livré** — `/comparaison`, composant serveur avec ses `metadata`, prérendu statiquement,
enveloppant un module client sous `Suspense`. Huit fichiers sous
`src/components/comparaison/`, l'état d'URL dans `src/lib/comparaison.ts`, et un chemin
depuis `/credit` posé sous la phrase qui dit que ce module-là ne compare pas.

**La décision de fond est une décision de mise en page, et c'est tout le ticket.** La
spécification n'écrit pas que cette comparaison a des limites : elle écrit qu'elle **est
faussée**. Une limite posée sous le graphique n'est pas énoncée — le lecteur pressé a déjà
conclu. Trois règles, détaillées dans ADR-015 :

1. aucun chiffre de comparaison n'apparaît avant la limite, dans l'**ordre du document** —
   le titre lui-même ne porte aucun montant ;
2. **la bascule entre les deux lectures vit à l'intérieur du bloc de limite**, et nulle part
   ailleurs. C'est ce qui rend l'avertissement non contournable : on ne peut pas changer de
   lecture sans passer par la raison d'être de ce choix. Les deux années de croisement y
   figurent ensemble — vingt-huit ans les séparent au scénario d'ouverture ;
3. l'échelle du graphique ne se recale jamais sur la lecture retenue : passer en fonds perdus
   fait **retomber** les courbes dans le cadre au lieu de les réétaler, et ce qui a disparu
   se voit.

**Trois couleurs, aucune inventée.** `--interets` pour la courbe du propriétaire — le jeton
dit « ce que l'utilisateur perd, tout coût », et la courbe comparée est un coût dans les deux
lectures. `--capital` pour la bande entre ses deux tracés — le jeton dit « ce que
l'utilisateur possède », ce qui est exactement ce qu'est cette bande et la raison pour
laquelle elle ne doit pas compter comme une dépense. `--marches` pour le locataire — le jeton
dit « le scénario financier alternatif », et le locataire est ce scénario ; le même bleu le
portera au niveau patrimonial, où il détient réellement un portefeuille. Le violet
`--assurance` n'apparaît pas : aucune série n'isole ici l'assurance, et lui donner une couleur
de série la ferait passer pour une quatrième courbe. Chaque tracé porte en outre son libellé
écrit, à hauteur de son dernier point, et le trait de croisement porte le sien.

**Dix-sept paramètres dans l'URL, deux dehors.** Y entrent les cinq du financement — mêmes
clés courtes que `/credit`, `px` `ap` `tx` `du` `as`, parce qu'elles désignent les mêmes
grandeurs —, l'horizon, les quatre postes de propriété, les trois de location, et les quatre
hypothèses de dérive. Chacun déplace une courbe. N'y entrent pas la **lecture retenue** et
l'**année lue** : les deux séries sont calculées quoi qu'il arrive et les deux croisements
sont affichés en permanence, donc la bascule ne change aucun chiffre. ADR-005 tranche
exactement ce cas.

**Une dette contournée plutôt que reproduite.** `src/lib/scenario.ts` déclare ses parseurs
`nuqs` au premier niveau, ce qui interdit à tout composant serveur de le lire.
`src/lib/comparaison.ts` ne contient donc que du TypeScript pur — valeurs, bornes, traduction
vers le moteur — et les parseurs vivent dans `src/components/comparaison/useComparaison.ts`,
sous `"use client"`. La page serveur lit `DEFAUTS` pour sa description sans rien entraîner
derrière elle. Conséquence : les cinq paramètres de financement sont **recopiés** depuis le
scénario de `/credit` au lieu d'être importés. La copie est gardée — un test compare la
mensualité affichée par les deux modules et rougit si l'une des deux dérive.

**Ce que les hypothèses de marché ne portent pas.** Les quatre champs de dérive — provision
pour travaux et trois indexations — n'affichent **aucune étiquette de famille**. La taxonomie
classe les paramètres d'une opération immobilière ; une vitesse d'indexation n'est ni
négociable, ni contrainte, ni réglementaire : c'est une hypothèse de modélisation. Plutôt
qu'une quatrième famille — qui affaiblirait une taxonomie dont toute la valeur tient à sa
constance —, ces champs affichent leur **intervalle observé et leur fiabilité**, lus dans
`src/core/assumptions/market.ts`. C'est la distinction d'ADR-008 rendue visible.

**Deux réserves d'`ENG-010` portées à l'écran, comme il le demandait.** Les frais d'entrée
sont à zéro par défaut, et le champ dit à côté que c'est optimiste, en chiffrant ce que
7 à 8,5 % du prix représenteraient — l'utilisateur peut faire l'expérience : les saisir
recule le croisement des fonds perdus de la première à la neuvième année. Et le bloc de
limite dit que le croisement n'est pas le moment où l'achat rapporte davantage, à l'endroit
exact où la confusion se produit.

**Un fichier partagé modifié, et une seule fonction.** `src/lib/format.ts` reçoit
`formatMoisReleve` : les hypothèses de marché portent un mois de relevé et non un millésime
légal, et « 2026-08 » n'est pas une date lisible pour un utilisateur. Deux endroits de
l'écran l'affichent. La fonction rend la chaîne telle quelle si elle n'a pas la forme
attendue — mieux vaut montrer un code brut qu'un mois inventé. Elle n'est appelée par aucun
code existant ; rien d'autre du fichier n'a bougé.

**Tests** — `tests/e2e/comparaison.spec.ts`, 29 tests sur les deux profils, et `/comparaison`
inscrite dans la liste `ROUTES` de `avertissement.spec.ts`. La garde qui compte est celle des
proportions : cinq repères mesurés en pixels réels, depuis le bord **intérieur** du cadre —
la bordure d'un pixel représente plus de dix pour cent de la hauteur du repère de l'année 1,
et la mesurer avec fausserait le rapport.

**Ce que les gardes cassées ont appris.** Trois cassées puis rétablies. Un plancher de 6 % sur
les repères : **un** rouge, la garde de proportions, qui relève l'année 1 de 3,7 % à 6 %.
Déplacer le bloc de limite sous la grille et glisser un « mieux vaut » dans le texte : **trois**
rouges par profil — l'ordre du document, la lecture sans défilement, et la garde de tournures
prescriptives. Une échelle assise sur la seule courbe du propriétaire : **deux** rouges.

Une quatrième tentative n'a **rien** fait rougir, et c'est instructif : recaler l'échelle sur
le maximum des deux séries de la lecture retenue est un changement invisible, parce que le
locataire est le plus grand des deux dans les deux lectures — ses fonds perdus égalent son
décaissement. La garde ne protège donc pas contre « tout recalage », mais contre tout recalage
qui change une valeur affichée. C'est ce qu'elle prétend, et pas davantage.

**Trouvé sans être corrigé.**

- **L'accueil annonce toujours « Acheter ou louer » comme à venir.** `src/app/page.tsx` le
  liste en carte non cliquable, et `tests/e2e/accueil.spec.ts` vérifie qu'il existe exactement
  un module en ligne. Le ticket ne demandait qu'un chemin depuis `/credit` ; ouvrir la carte
  de l'accueil suppose de reprendre cette garde, et c'est un geste à faire délibérément, pas
  en passant.
- **Aucune entrée de glossaire propre à ce module.** Les pastilles posées reprennent des
  termes existants — apport, taux nominal, assurance emprunteur, taxe foncière. « Fonds
  perdus », « décaissement » et « année de croisement » sont expliqués dans le bloc de limite
  et nulle part ailleurs ; ils mériteraient une entrée, ce qui relève de `CNT-001`.
- **La provenance des hypothèses de marché n'est pas affichée**, seulement l'intervalle et la
  fiabilité. Les textes de `provenance` font deux à quatre phrases chacun et n'entrent pas
  dans un panneau de saisie ; ils appellent une fiche, pas une infobulle.
- **Le croisement du décaissement est à un an de l'horizon** sur le scénario d'ouverture —
  année 29 sur 30. Un pas de plus sur n'importe quel paramètre le fait disparaître, et
  l'écran affiche alors « aucun avant l'année 30 ». C'est juste, et c'est fragile à lire.

**Porte** — `PORT_E2E=3133 npm run porte`, verte : typecheck, lint, **901 tests Vitest sur
18 fichiers**, build, **304 tests Playwright passés et 10 ignorés**.

### 23 août 2026 — `ENG-027`, l'assemblage qui manquait entre la vente et la plus-value

**Ce qui est livré.** `src/core/compare/cession.ts`, une fonction publique —
`chiffrerCession(entree, params): CessionChiffree` — et un utilitaire exporté,
`situationDeCession(entree)`, qui rend la situation du cédant sans lancer le calcul, pour
que l'interface puisse griser un forfait indisponible au lieu de rattraper une exception.

**La décision de fond : supprimer la saisie plutôt que la vérifier.** Quatre grandeurs
apparaissaient des deux côtés — le prix de cession, le prix d'acquisition, la durée de
détention, les frais déductibles — et un appelant qui composait `vente.ts` et
`plus-value.ts` à la main pouvait faire diverger chacune sans que rien ne l'en avertisse.
`EntreeCession` n'en porte aucune. Elle porte le bloc de vente repris tel quel par
`Omit<EntreeVente, "regimePlusValue">`, le régime, et les autres frais de cession. La
divergence n'est pas détectée : elle est inécrivable. Voir ADR-016.

**Le tri des frais de cession est le vrai apport.** La commission d'agence et la mainlevée
d'hypothèque viennent en diminution du prix de cession (CGI, art. 150 VA, III) ; l'indemnité
de remboursement anticipé n'y vient pas — la liste de l'annexe III, art. 41 duovicies H, est
limitative. Les trois sortent de la même poche le même jour, deux se ressemblent, et le cas
de référence B les met à 1 500 € chacune pour que l'erreur soit impossible à ne pas voir.

**Deux appels de `produitDeVente`, et aucune formule propre.** La sortie de la vente
alimente l'entrée de l'impôt, qui alimente à son tour la vente. Le module fait donc une
passe à impôt nul dont il ne garde que les postes, puis la passe définitive. L'alternative
— rappeler `valeurAppreciee` et réappliquer le taux de commission ici — réécrivait deux
calculs et deux arrondis. Un second appel d'une fonction pure ne coûte rien et garantit que
le prix soumis à l'impôt est exactement celui du décompte.

**Le cas de bout en bout, vérifié à la main.** Bien à 200 000 €, revendu vingt ans plus
tard, appréciation 3 %, commission 5 %, majorations au forfait. Prix de cession
361 222,25 € ; frais déduits 18 061,11 € ; plus-value brute 98 161,14 € ; abattements de
90 % et de 24,75 % — les deux barèmes, aux cadences différentes ; impôt sur le revenu
1 865,06 €, prélèvements sociaux 12 705,00 €, surtaxe néant ; impôt total **14 570,06 €** ;
produit net **328 591,08 €**. Le même bien en résidence principale rend 343 161,14 €, soit
exactement l'impôt d'écart, et rien d'autre ne bouge.

**Un fichier partagé modifié, une ligne.** `plus-value.ts` cherchait la tranche de la
surtaxe par la borne **basse** de son barème. Le seuil vise les plus-values « supérieur[es]
à 50 000 € » et la première tranche ouvre à « 50 001 € » : entre les deux, 99 centimes que
le tableau ne nomme pas, parce que le texte raisonne en euros. Une assiette qui y tombait
levait `RangeError`. Inatteignable tant que les assiettes sont saisies en euros ronds —
c'est le cas de tous les tests existants —, le défaut devient ordinaire dès qu'un prix de
cession est **dérivé** d'une valeur appréciée. Le cas de référence C le montre : 100 000 €
appréciés de 50,0001 % en un an donnent une assiette de 50 000,10 €, et 500,01 € de surtaxe.

**Ce que les gardes cassées ont appris.** Cinq cassées puis rétablies, sauvegarde par copie
avant chaque sabotage. Prendre la durée de détention dans l'entrée brute au lieu de la
sortie normalisée : **un** rouge d'abord, et c'est le résultat le plus utile de la séance —
le tirage `fast-check` de l'horizon était entier, donc les deux normalisations y étaient
l'identité et la propriété ne pouvait rien voir. Un tirage d'horizon réel, négatif et
fractionnaire, a été ajouté ; la garde rougit désormais **deux** fois. Ajouter l'indemnité
aux frais déductibles : **quatre**. Rendre la passe 1 au lieu de la passe 2 : **trois**.
Fondre les réserves de `plus-value.ts` en une chaîne : **quatre**. Revenir sur la correction
de la surtaxe : **deux**, un dans chaque fichier.

Une sixième tentative n'a **rien** fait rougir : recalculer le prix de cession par
`valeurAppreciee` plutôt que de le lire dans la passe 1. Attendu, et à consigner tel quel —
les deux rendent le même centime par construction, donc aucune garde ne distingue une
composition d'une duplication tant que la duplication est juste. La règle « rien n'est
recalculé » est tenue ici par la relecture, pas par un test.

**Trouvé sans être corrigé.** Trois points.

La fente du barème de la surtaxe a été refermée côté code, mais elle est dans le **texte** :
l'art. 1609 nonies G raisonne en euros entiers là où le moteur raisonne en centimes. La
lecture retenue — la première tranche court dès le premier centime au-dessus de 50 000 € —
est la seule qui taxe sans discontinuité nouvelle, et elle n'a pas été confrontée à la
doctrine. À verser au lot de vérification de `FIS-007`.

Les travaux ne circulent pas entre les modules, et c'est délibéré. Le ticket les comptait
parmi les grandeurs partagées ; ils ne le sont pas entre `vente.ts` et `plus-value.ts`. La
`provisionTravauxPctAnnuel` de `detention.ts` est une dépense annuelle d'entretien, pas une
dépense capitalisable au sens de l'art. 150 VB, II, 4°. Les brancher l'une sur l'autre
serait une erreur fiscale ; les rapprocher un jour demandera de distinguer l'entretien de
l'amélioration, ce qu'aucun des deux modules ne sait faire.

Le bien acquis **avant** le début de la projection reste hors domaine. `horizonMois` compte
les mois depuis le déblocage des fonds, qui est aussi la date d'acquisition, et c'est de là
que les lignes du plan de financement sont numérotées. Ouvrir le cas — utile à la revente
après location longue durée, donc à `ENG-013` — demande de dissocier l'origine du crédit de
celle de la détention, dans `vente.ts`. Le module dit qu'il ne le fait pas plutôt que de le
faire faux.

**Une réserve à porter dans l'interface.** Un forfait de majoration hors de son champ
**lève**, ici comme dans `plus-value.ts` — ADR-013 a tranché contre la retombée silencieuse.
Un écran qui balaie l'horizon pour tracer une courbe rencontrera le refus sur les cinq
premières années si le forfait travaux est demandé. `situationDeCession` existe pour qu'il
le sache avant d'appeler.

**Porte** — `PORT_E2E=3141 npm run porte`, verte : typecheck, lint, **931 tests Vitest sur
19 fichiers**, build, **306 tests Playwright passés et 10 ignorés**. La copie de travail
n'avait pas ses dépendances installées ; `npm ci` avant la porte, sans toucher au verrou.

### 23 août 2026 — `FIS-006`, dix-sept hypothèses passées au document

**Fait**

Les dix-sept entrées de `src/core/assumptions/market.ts` confrontées une par une à des
documents publiés. **Sept passent en `observee`, six chiffres sont corrigés, dix restent
`estimee` — chacune avec, écrite dans sa provenance, la raison pour laquelle la
vérification n'a pas abouti.** Le fichier gagne un bloc, `rendements`, rapatrié de
`compare/portefeuille.ts` sans qu'un chiffre bouge. La règle qui décide de la promotion
est ADR-017.

**Le tableau**

| Entrée | Avant | Après | Fiabilité | Source |
| --- | --- | --- | --- | --- |
| `suretyshipCostPct` | 1,25 % [1,0 ; 1,5] | **1,35 %** [1,0 ; 1,5] | estimee → **observee** | Deux exemples représentatifs SG : 2 750 € / 200 000 € (1,375 %, au 01/05/2025) et 2 660 € (1,33 %, offre 15/06–15/07/2026) |
| `suretyshipRefundPct` | 55 % [0 ; 75] | inchangé | estimee | Crédit Logement annonce ~70 %, **du seul FMG** ; le partage n'est pas publié |
| `mortgageCostPct` | 1,5 % [1,2 ; **2,0**] | **1,35 %** [1,2 ; **1,5**] | estimee → **observee** | Crédit Agricole : « 1,2 % à 1,5 % du montant du prêt », TPF 0,715 %, débours 200–300 € |
| `mortgageReleasePct` | 0,4 % [0,3 ; **0,7**] | 0,4 % [0,3 ; **0,6**] | estimee → **observee** | Question écrite n° 6820, XVIIe législature, publiée au *JO* avec la réponse du gouvernement |
| `pledgeCostPct` | 0,3 % [0,1 ; 0,5] | inchangé | estimee | Aucune grille publique trouvée |
| `groupRatePct` | [**0,30** ; 0,42] | [**0,26** ; 0,42] | estimee | SG, 35 ans : 43,33 €/mois sur 200 000 € = 0,26 %/an. SG, 38 ans : 61,33 €/mois = 0,368 %/an |
| `delegationRatePct` | [0,1 ; 0,2] | inchangé | estimee | Aucun exemple représentatif d'assureur alternatif ; le bilan CCSF ne donne pas de taux |
| `totalFeesOldPct` | [7 ; 8,5] | inchangé | estimee | Notaires de France disent « 7 à 8 % », et publient une TPF à 6,31 % — les deux ne tiennent pas ensemble |
| `totalFeesNewPct` | [2 ; 3] | inchangé | estimee → **observee** | Notaires de France, « environ 2 à 3 % » |
| `provisionTravauxPctAnnuel` | 1,0 % [0,5 ; 2,0] | inchangé | estimee | Les observatoires publient des charges au m², pas une dépense rapportée à la valeur du bien |
| `indexationLoyerPctAnnuel` | **2,0 %** [0 ; **3,5**] | **1,5 %** [0 ; **3,6**] | estimee → **observee** | INSEE, IRL : 148,37 au T2 2026 pour une base 100 au T4 1998, soit 1,44 %/an ; plus forte hausse annuelle +3,60 % au T2 2022 |
| `indexationTaxeFoncierePctAnnuel` | **3,0 %** [**1,0** ; **5,0**] | **3,2 %** [**1,9** ; **6,5**] | estimee → **observee** | Observatoire national des taxes foncières, 19e rapport (oct. 2025, données DGFiP) : +37,3 % de 2014 à 2024 ; Caen +21 %, Paris +88 % |
| `indexationChargesPctAnnuel` | 2,0 % [1,0 ; 4,0] | inchangé | estimee | Deux observatoires en désaccord sur 2023 : +10,71 % (FNAIM Grand Paris) contre +4,6 % (ARC) |
| `appreciationAnnuellePct` | [−2 ; 4] | inchangé | estimee | Notaires-INSEE : −5,5 % (T1 2024) à +10,0 % (T2 2011) en variation annuelle. Notre intervalle est plus étroit, **de notre fait** |
| `commissionAgencePct` | 5 % [3 ; 8] | inchangé | estimee → **observee** | Barème Century 21 au 01/01/2026, affichage obligatoire : de 4,7 à 6,7 % TTC selon le prix |
| `rendements.sansRisque` | [1,5 ; 3] | inchangé | estimee | France Assureurs 2,6 % et ACPR 2,63 % en 2025, **bruts** de prélèvements sociaux, soit ~2,2 % nets |
| `rendements.actionsDiversifiees` | [4 ; 7] | inchangé | estimee | IEIF, « 40 ans de performances comparées » : actions à 12,4 %/40 ans et 9,9 %/15 ans, **brutes** de fiscalité |

**Le contre-exemple de la Société Générale, traité et non contourné**

`ENG-008` avait relevé que l'exemple représentatif SG facture 43,33 € par mois d'assurance
pour 200 000 € empruntés à 35 ans, soit **0,26 % par an du capital initial**, sous notre
borne basse de 0,30 %. La borne était fausse : elle descend à 0,26 %.

Ce qui n'était pas prévu, c'est le second point. L'offre SG du 15 juin au 15 juillet 2026
donne 61,33 € par mois pour un emprunteur de **38 ans**, soit 0,368 % — TAEA de 0,63 %
contre 0,44 %. **Trois ans d'écart d'âge, 42 % de prime en plus.** Une fourchette unique
pour « le contrat de groupe » est donc une simplification bien plus grossière que ses
bornes ne le laissent croire ; c'est dit dans la provenance. L'entrée reste `estimee` :
la borne basse est désormais lue, la borne haute ne l'est pas.

⚠️ Le second exemple a été lu sur **FranceTransactions**, qui le reproduit ; la page SG ne
publie plus que celui de mai 2025. Une reproduction fidèle en apparence n'est pas une
source primaire, et la provenance ne prétend pas le contraire.

**Ce qui n'a pas pu être vérifié, et pourquoi**

- **Crédit Logement ne publie aucune grille.** Ses pages « Tarification Classic » et
  « Tarification Initio » décrivent les deux composantes — commission de caution, versement
  au fonds mutuel — sans un seul chiffre, et renvoient à un simulateur qui n'affiche que
  des zéros tant qu'on ne le remplit pas. Le seul chiffre publié est le taux de restitution,
  « environ 70 % », **qui porte sur le FMG et non sur le coût total**. Notre champ, lui, est
  un pourcentage du coût total : `plan.ts` calcule `applyPct(cost, refundPct)`. La
  conversion suppose de connaître le partage entre commission et FMG, qui n'est publié nulle
  part. 55 % reste donc une estimation, et sa provenance le dit maintenant.
- **L'ANIL ne publie pas de chiffres.** Le ticket la citait comme source possible. Sa page
  « Calcul du coût d'une hypothèque » est un simulateur, sa page « Les frais annexes » écrit
  que le coût d'une hypothèque « varie en fonction du type de prêt » et que la commission
  d'agence « n'est pas réglementée », sans un ordre de grandeur. Une agence publique qui
  refuse de donner un chiffre qu'elle ne maîtrise pas : c'est cohérent, et c'est un
  renseignement en soi.
- **Le nantissement n'a pas de prix affiché.** MAIF, AG2R La Mondiale, Matmut, Corum en
  décrivent le mécanisme et vantent l'économie réalisée face à une hypothèque, sans jamais
  chiffrer l'acte, qui se négocie de gré à gré.
- **La délégation d'assurance non plus.** Les assureurs alternatifs ne publient pas
  d'exemple représentatif ; la fiche standardisée d'information est remise au client. Le
  bilan de la loi Lemoine adressé au Parlement par le CCSF raisonne en parts de marché —
  16,1 % fin mai 2023, 17,48 % en 2024 — et en nombre de substitutions, jamais en taux. Les
  seuls chiffres trouvés viennent de courtiers, qui vendent ce qu'ils décrivent.
- **L'ACPR n'a pas pu être consultée.** Même refus des requêtes automatisées que celui déjà
  noté par `ENG-008` pour `banque-france.fr`. Le taux moyen 2025 des fonds en euros a donc
  été lu sur des reprises, pas sur la publication.
- **Aucun réseau à honoraires réduits ne publie de barème atteignable.** La borne basse de
  3 % de la commission d'agence reste notre extension.

**Trois contradictions entre sources, dont une interne**

*Les notaires de France se contredisent sur leur propre page.* La phrase « environ 7 à 8 %
du prix » dans l'ancien cohabite, sur un site mis à jour le 5 décembre 2025, avec un taux
global de taxe de publicité foncière porté à **6,31 %** après le relèvement départemental de
2025. Les 6,31 % de taxe ne laissent pas la place aux émoluments, débours et formalités sous
une borne haute de 8 %. Notre intervalle `[7 ; 8,5]` tient compte de la hausse ; la phrase
des notaires visiblement pas. Faute de source qui l'écrive, l'entrée reste `estimee`.

*Les deux observatoires de charges de copropriété ne mesurent pas la même chose.* La FNAIM
du Grand Paris relève **+10,71 %** pour 2023 — 43,34 €/m², 2 453,95 € par lot —, l'ARC
**+4,6 %** pour la même année. Périmètres géographiques et méthodes différents. Choisir en
silence aurait été le pire des trois choix possibles.

*L'IEIF se contredit dans son propre communiqué.* Le paragraphe titré « Sur 30 ans » est
daté « (2003-2023) », soit vingt ans. Les chiffres qui suivent — Logement 9,3 %, Foncières
8,2 %, Actions 7,7 % — sont donc de période incertaine. Ils ne portent aucune de nos
valeurs ; ceux qui les portent sont les TRI à 40 et 15 ans, non ambigus.

**Un piège évité de peu.** L'IEIF donne « Logement France, TRI 15 ans : 5,2 % ». La tentation
était de s'en servir pour l'appréciation du bien. C'eût été faux : un TRI immobilier de
l'IEIF **inclut les loyers**. L'appréciation seule se lit sur l'indice Notaires-INSEE, et
nulle part ailleurs.

**Le déplacement de `RENDEMENTS_NETS_OBSERVES`**

Rapatrié de `compare/portefeuille.ts` vers `MARKET_2026.rendements`, avec la discipline de
`FIS-005` : **pas un chiffre modifié**, et un test qui le dit. Le type
`FourchetteDeRendement` disparaît — il reproduisait déjà exactement `FourchetteObservee`.
Une garde de plus vérifie que l'ancien emplacement est **vide** et qu'il dit où c'est parti :
un `export const` resté en place, même inutilisé, donnerait deux sources de vérité dont une
périmée.

La garde qui énumère les blocs de `MARKET_2026` a rougi à l'ajout de `rendements`, comme
annoncé. Elle a été reprise en écrivant dans le test pourquoi le bloc entre.

**Trouvé sans être corrigé**

- **⚠️ L'assiette de la mainlevée est fausse dans `credit/plan.ts`.** La question écrite
  n° 6820 chiffre ces frais en pourcentage du **montant initial de l'emprunt** ; le Crédit
  Agricole dit de même que l'hypothèque s'assoit sur le montant du prêt. `plan.ts` écrit
  `releaseCostOnEarlySale: applyPct(propertyPrice, g.mortgageReleasePct.valeur)` — le **prix
  du bien**. Sur un achat avec apport, le prix dépasse le capital emprunté et la mainlevée
  est surestimée d'autant : 20 % d'apport, 20 % de mainlevée en trop. Le fichier est gelé
  (ADR-004) et la correction change une valeur affichée : elle demande son propre ticket.
  L'avertissement est écrit dans la provenance en attendant, en capitales.
- **`params.ts` porte encore les droits de mutation d'avant la hausse.** `oldStandardPct`
  vaut 5,81 % quand les notaires de France publient une taxe globale à **6,31 %** dans la
  grande majorité des départements depuis 2025. `oldFullPct` vaut 6,32 %, ce qui suggère que
  la hausse est bien connue du fichier mais que « standard » et « full » ne désignent plus ce
  qu'ils désignaient. C'est une valeur réglementaire : elle ne pouvait pas être touchée
  depuis ce ticket, dont la frontière est précisément de ne pas mêler la loi et le marché.
  À rapprocher de `FIS-002`, qui porte déjà deux `TODO_VERIFY` sur ce bloc.
- **Le scénario par défaut de `/comparaison` n'a plus de croisement dans l'horizon.** Le
  journal de `VIZ-003` l'avait annoncé : « le croisement du décaissement est à un an de
  l'horizon, année 29 sur 30 ; un pas de plus sur n'importe quel paramètre le fait
  disparaître ». Ramener l'indexation du loyer de 2,0 à 1,5 % a été ce pas. La page ouvre
  désormais sur l'année 1 et affiche « aucun avant l'année 30 ». Ce n'est pas un défaut —
  c'est juste, et c'est même l'enseignement — mais le scénario d'ouverture montre maintenant
  moins bien ce que le module sait faire. Un choix de paramètres par défaut, donc un ticket
  d'interface.
- **Aucun test ne relit une provenance contre sa source.** Voir les sabotages.

**Ce que les sabotages ont fait rougir**

Cinq, tous rétablis. Les fichiers ont été copiés avant, pas confiés à `git checkout`.

| Sabotage | Rouge |
| --- | --- |
| `pledgeCostPct` promue en `observee` | **2** — le compte des `estimee`, et « une hypothèse observée nomme le document qu'on a ouvert » |
| `export const RENDEMENTS_NETS_OBSERVES` réintroduit dans `portefeuille.ts` | **1** — la garde du déplacement |
| Borne haute des actions portée de 7 à 7,5 | **1** — « reprend à l'identique les rendements » |
| `suretyshipCostPct` portée de 1,35 à 1,40 | **1** — l'ancrage des cinq coûts de garantie |
| **148,37 remplacé par 158,37 à l'intérieur d'une phrase de provenance** | **0** |

Le dernier est le seul intéressant, et c'est un sabotage qui n'aurait rien fait rougir :
**914 tests verts sur un chiffre de source falsifié.** La provenance est de la prose
montrable à l'utilisateur, pas une donnée vérifiable ; rien ne la relit contre la source
qu'elle cite. Un test qui exigerait la cohérence entre le texte et les bornes est possible
en principe et illusoire en pratique — il faudrait analyser du français. Le seul rempart
est la relecture humaine, et il valait mieux l'écrire que le découvrir.

Une sixième garde a rougi **sans qu'on l'ait cherché**, et elle avait été écrite pour ça.
`hypotheses-detention.test.ts` exigeait `estimee` pour les quatre hypothèses de détention,
en annonçant : « le jour où `FIS-006` en recoupe une, ce test rougit — il faut alors dire
ici laquelle, et sur quoi ». Il a fallu venir l'écrire, pour le loyer et pour la taxe
foncière. C'est le meilleur exemple du dépôt d'une garde qui ne protège pas un chiffre mais
oblige à rendre des comptes.

**Ce que la correction a déplacé dans l'interface**

Six chiffres de données, et huit valeurs affichées qui bougent en conséquence — sans qu'une
ligne de moteur ait changé. Coût total du crédit par défaut +180 € (caution 1,25 → 1,35 % sur
180 000 €), TAEG 3,96 → 3,97 % ; sur le scénario partagé sous hypothèque, −630 € et
4,69 → 4,67 %. Les deux corrections de garantie jouent **en sens inverse**, ce qui est le
signe qu'aucune n'a été choisie pour arranger un total. Côté comparaison, le croisement du
scénario `DEUX_CROISEMENTS` passe de l'année 22 à l'année 23, et le sommet de l'échelle
change de main : le propriétaire finit désormais au-dessus du locataire à l'année 30, un
loyer indexé à 1,5 % ne rattrapant plus un coût de propriété indexé à 3,2 %.

**Note d'outillage** — la copie de travail avait un `node_modules` **vide**. `typecheck`,
`lint` et Vitest passaient quand même, Node remontant l'arborescence jusqu'au dépôt parent ;
`next build` échouait seul, Turbopack refusant de sortir de la racine du projet. Une jonction
Windows vers le `node_modules` du parent ne suffit pas non plus — « Symlink `[project]`
/node_modules is invalid, it points out of the filesystem root ». Il faut un `npm ci` dans la
copie. À savoir avant de conclure qu'une branche casse le build.

**Porte** — `PORT_E2E=3142 npm run porte`, verte : typecheck, lint, **914 tests Vitest sur
18 fichiers**, build, **306 tests Playwright passés et 10 ignorés**.

---

### 23 août 2026 — `FIS-008`, l'assiette de la plus-value est un nombre entier d'euros

`ENG-027` avait refermé la « fente de 99 centimes » du barème de la surtaxe en faisant
chercher la tranche par sa borne **haute**, et laissé la question ouverte : la lecture
retenue « n'a pas été confrontée à la doctrine ». Elle l'a été. Elle était fausse, et le
défaut n'était pas dans le barème.

#### Ce que la recherche a établi, source par source

**L'article qui tranche n'est pas celui que le ticket visait.** Le point de départ était
l'**art. 1657 du CGI**, dont le 1 dispose que « les bases de cotisation des impôts directs
sont arrondies à l'euro le plus proche ; la fraction d'euro égale à 0,50 est comptée pour
1 ». Lu sur Légifrance, cet article se révèle mal placé pour l'usage qu'on voulait en faire :
son fil d'Ariane est *Livre II Recouvrement de l'impôt › Chapitre premier Paiement de l'impôt
› Section I Impôts directs › **I Rôles et avis d'imposition › 1 Établissement et mise en
recouvrement des rôles***, et son 2 raisonne « par article de rôle ». Or la plus-value
immobilière n'est pas mise en recouvrement par voie de rôle : elle est liquidée par le
notaire sur la 2048-IMM et payée à la formalité. Fonder l'arrondi sur 1657 aurait été
fragile.
<https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051219510>

**L'article qui tranche est l'art. 1649 undecies du CGI** : « Les bases des impositions de
toute nature sont arrondies à l'euro le plus proche. La fraction d'euro égale à 0,50 est
comptée pour 1. » Une phrase, un article, et un chapitre entier qui ne contient que lui :
*Livre premier **Assiette et liquidation de l'impôt** › Troisième partie Dispositions
communes › Titre premier Assiette et contrôle de l'impôt › **Chapitre VI Règles
d'arrondissement des bases d'imposition***. « Impositions de toute nature », dans le livre de
l'assiette, sous ce titre : il n'y a pas de lecture plus directe.
<https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069577/LEGISCTA000006147278/>

Cet article n'a pas été trouvé en cherchant l'arrondi de la plus-value — aucune requête sur
ce terrain ne le rend — mais en cherchant lequel le BOFiP cite quand il arrondit une base.
**BOI-BIC-BASE-30 § 20** le cite, aux côtés de l'art. 1724 : « Selon l'article 1649 undecies
du code général des impôts (CGI) et l'article 1724 du CGI, les bases des impositions de
toute nature sont arrondies à l'euro le plus proche. »
<https://bofip.impots.gouv.fr/bofip/5709-PGP.html/identifiant=BOI-BIC-BASE-30-20130109>

**Assiette et cotisation sont deux règles distinctes, portées par deux articles.** L'art.
1649 undecies arrondit la **base**. L'**art. 1724 du CGI** arrondit la **liquidation** : « La
liquidation de toutes sommes à recevoir, à quelque titre et pour quelque cause que ce soit,
est arrondie à l'euro le plus proche. […] Il est procédé à cet arrondissement au niveau du
décompte de chaque impôt ou taxe. » — *Livre II › Chapitre premier › Section V Dispositions
communes*. La réponse ministérielle à la **question écrite AN n° 26703** (JO 17 novembre
2020) lit les deux ensemble et confirme le partage des rôles : le calcul se fait « au centime
près », le reversement « à l'euro le plus proche […] pour chaque déclaration ».
<https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006312863> ·
<https://www.assemblee-nationale.fr/dyn/15/questions/QANR5L15QE26703>

**Les prélèvements sociaux suivent l'impôt sur le revenu, y compris pour l'assiette.** CSS,
**art. L136-7, VI, 1** : « La contribution portant sur les plus-values mentionnées au 2° du I
est **assise**, contrôlée et recouvrée selon les mêmes règles et sous les mêmes sûretés,
privilèges et sanctions que l'impôt sur le revenu. » Le mot « assise » suffit : la règle
d'arrondi d'assiette qui vaut pour l'impôt sur le revenu vaut pour eux.
<https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038836925>

**Le seuil de la surtaxe s'apprécie sur cette assiette-là, après abattements.** La notice
**2048-IMM-NOT-SD (02-2025)**, page 11, l'écrit noir sur blanc : la taxe « est assise sur les
plus-values immobilières imposables à l'impôt sur le revenu […] après prise en compte de
l'abattement pour durée de détention prévu à l'article 150 VC du CGI », et « le seuil de
50 000 € est donc apprécié après prise en compte de ces abattements ». La ligne 115 du
formulaire, celle de la taxe, n'est que le report de la ligne 50, « plus-value nette
imposable globale ». Cela règle la question du ticket sur le seuil et confirme le corollaire
d'ADR-013.
<https://www.impots.gouv.fr/sites/default/files/formulaires/2048-imm/2025/2048-imm_5091.pdf>

#### Ce qui n'a pas été trouvé, et qu'il faut dire

- **Aucun texte, aucune doctrine, aucune notice ne dit explicitement que la plus-value
  immobilière est arrondie.** Le raisonnement est une subsomption : l'art. 1649 undecies vise
  les « impositions de toute nature », la plus-value en est une, donc. C'est solide, mais ce
  n'est pas une citation directe.
- **La notice 2048-IMM-NOT-SD ne contient pas le mot « arrondi »** — vérifié par extraction
  du texte des douze pages du PDF, pas à l'œil. Le formulaire 2048-IMM-SD non plus, et il
  n'est pas un formulaire à champs remplissables dont on aurait pu lire le format des cases.
- **BOI-RFPI-PVI-20-20** (détermination de la plus-value imposable), **BOI-RFPI-PVI-30-20**
  (modalités d'imposition) et **BOI-RFPI-TPVIE-20** (taxe sur les plus-values élevées) ne
  disent rien de l'arrondi. Les trois exemples chiffrés de BOI-RFPI-TPVIE-20 § 75 —
  103 400 € → 2 442 €, 61 000 € par époux → 2 440 € au total, 52 500 € → 675 € — sont en
  euros ronds et ne tranchent donc pas ; ils confirment en revanche notre lecture du barème
  et de ses décotes, au centime.
- **La question « avant ou après les abattements » n'est réglée par aucun texte**, sauf pour
  le seuil de la surtaxe. La lecture retenue — on arrondit la base nette, celle que le taux
  frappe, et pas la plus-value brute — s'appuie sur le mot « bases » et sur les lignes 50 et
  100 du formulaire. L'écart entre les deux lectures est d'au plus 50 centimes d'assiette ; il
  n'a pas l'ordre de grandeur du sujet.

#### Ce qui a changé dans le code

`roundToEuros` ajoutée à `src/core/money.ts` — fichier gelé, ADR-004 : une fonction de plus,
aucune fonction retouchée, et sa garde dans `src/core/__tests__/money-arrondi-euro.test.ts`.

`src/core/compare/plus-value.ts` : les deux assiettes sont arrondies à l'euro avant que le
taux ne s'applique ; `surtaxeSurPlusValue` arrondit son entrée puis retrouve sa tranche par
la **borne basse**, comme avant `ENG-027`. La correction d'`ENG-027` n'en était pas une :
elle traitait un symptôme. Sur les entiers, les tranches du barème sont contiguës et
couvrantes, et une assiette strictement supérieure à 50 000 € vaut au moins 50 001 €. Le
`RangeError` redevient ce qu'il visait : un barème mutilé.

`AbattementApplique.base` reste **au centime** : `montant + base` vaut toujours exactement la
plus-value brute. L'arrondi est un fait d'assiette, pas une reprise de la soustraction.

Une réserve de plus dans `nonModelise` : les impositions elles-mêmes restent calculées au
centime alors que l'art. 1724 les arrondit aussi à l'euro, et que le décompte du notaire
liquide séparément CSG, CRDS et prélèvement de solidarité (lignes 110 à 112 du formulaire) au
lieu d'un taux global de 17,2 %. L'écart se compte en centimes ; il est déclaré, pas
appliqué — l'appliquer demanderait de décomposer le taux global, ce qui est un autre ticket.

#### Les chiffres qui ont bougé

**Cas de référence C** de `cession.test.ts`, plus-value brute de 50 000,10 € à un an de
détention. Avant : assiette 50 000,10 €, surtaxe **500,01 €**, impôt total 18 600,05 €.
Après : assiette **50 000,00 €**, qui n'est pas « supérieur à 50 000 € », surtaxe **néant**,
impôt total **18 100,00 €**. Le simulateur réclamait cinq cents euros d'un impôt qui n'était
pas dû. Un second cas a été ajouté à côté, à 50 000,60 € : l'assiette monte à 50 001 € — « la
fraction d'euro égale à 0,50 est comptée pour 1 » — et la surtaxe est pleinement due,
500,07 €.

**Cas de référence A**, vingt ans de détention : base IR 9 816,11 € → 9 816 €, base PS
73 866,26 € → 73 866 €. Impôt total 14 570,06 € → **14 569,99 €**, produit net 328 591,08 €
→ **328 591,15 €**. Sept centimes : l'arrondi d'assiette ne déplace rien loin du seuil, et
c'est bien pour cela qu'il fallait aller voir près du seuil.

#### Le saut de coefficient aux neuf frontières, mesuré plutôt que redouté

Le ticket soupçonnait la correction d'`ENG-027` de faire « sauter le coefficient de lissage de
la tranche précédente » à chaque frontière interne. Mesuré, le saut est minuscule, et c'est
arithmétique : la décote vaut `coefficient × (borne haute − assiette)`, donc elle tend vers
zéro quand l'assiette approche la borne haute. Sur une assiette de « frontière + 0,50 € » :

| Frontière | `ENG-027` (borne haute) | Tranche précédente | Écart | `FIS-008` |
|---:|---:|---:|---:|---:|
| 60 000 | 1 200,01 | 1 200,04 | 0,03 | 1 200,02 |
| 100 000 | 2 000,07 | 2 000,01 | −0,06 | 2 000,13 |
| 110 000 | 3 300,02 | 3 300,07 | 0,05 | 3 300,03 |
| 150 000 | 4 500,10 | 4 500,02 | −0,08 | 4 500,19 |
| 160 000 | 6 400,02 | 6 400,10 | 0,08 | 6 400,04 |
| 200 000 | 8 000,13 | 8 000,02 | −0,11 | 8 000,25 |
| 210 000 | 10 500,03 | 10 500,13 | 0,10 | 10 500,05 |
| 250 000 | 12 500,16 | 12 500,03 | −0,13 | 12 500,31 |
| 260 000 | 15 600,03 | 15 600,16 | 0,13 | 15 600,06 |

Trois à treize centimes. **À 60 000,50 €, `ENG-027` rendait 1 200,01 € ; la tranche
précédente aurait rendu 1 200,04 € ; la lecture retenue rend 1 200,02 €, soit 2 % de
60 001 €.** Le résultat d'`ENG-027` était donc parfaitement défendable à cet endroit — le
saut de coefficient n'était pas son défaut. Son défaut était de cinq cents euros, et il était
au seuil d'entrée.

La seule vraie discontinuité du dispositif reste celle du seuil — 0 € puis 500,07 € —, elle
est dans le texte, et ADR-013 avait décidé de la constater. Avec l'arrondi, elle se produit
désormais entre 50 000,49 € et 50 000,50 € de plus-value brute, c'est-à-dire entre deux
assiettes distantes d'un euro.

#### Gardes cassées, puis rétablies

Trois sabotages, sauvegarde par copie de fichier — jamais `git checkout --`.

1. **Arrondir vers le bas au lieu de `half-up`** (`roundToEuros` par défaut en mode `down`) :
   **6 rouges** dans trois fichiers. Un dans `money-arrondi-euro.test.ts` (« la fraction de
   0,50 € est comptée pour 1 »), quatre dans `plus-value.test.ts` — les 99 centimes du seuil,
   les neuf frontières, le voisinage du seuil sur le calcul complet, et l'invariant des deux
   assiettes entières, qui tombe sur son second membre : l'écart à la base exacte dépasse le
   demi-euro dès qu'on tronque. Un dans `cession.test.ts`, le nouveau cas à 50 000,60 €.
   C'est la moitié de la règle de droit, et la moitié qui décide.
2. **Revenir à la recherche par la borne haute**, l'arrondi restant en place : **0 rouge**,
   suite complète. Résultat attendu et instructif — une fois l'assiette entière, les deux
   recherches désignent la même tranche, toujours. La borne basse n'est donc pas gardée par
   un test : elle est rendue suffisante par l'arrondi, qui l'est. Consigné ici plutôt que
   masqué par un test artificiel qui n'aurait mesuré que lui-même.
3. **Ne plus arrondir la base des prélèvements sociaux**, l'assiette fiscale restant
   arrondie : **7 rouges** dans deux fichiers. Quatre dans `cession.test.ts` — tout le cas A
   et l'écart exact entre régime exonéré et régime imposable —, trois dans
   `plus-value.test.ts`, dont **« l'assiette sociale reste supérieure ou égale à l'assiette
   fiscale »** : un arrondi appliqué à une seule des deux assiettes peut inverser leur ordre.
   La garde tient les deux, pas une.

Le sabotage n° 2 est le résultat le plus utile de la séance : il dit où est réellement la
protection.

#### Ce qui reste ouvert

- L'arrondi **de la liquidation** (art. 1724) n'est pas appliqué, et la décomposition
  CSG / CRDS / prélèvement de solidarité que fait le formulaire non plus. Déclaré dans
  `nonModelise`, écart de quelques centimes. À reprendre avec `ENG-013` ou dans un ticket
  fiscal dédié, puisque cela touche la structure de `params.ts`.
- Le point « avant ou après les abattements » n'a pas de source directe. Si une doctrine
  contraire apparaît, elle déplacera l'assiette d'au plus 50 centimes — jamais l'existence
  d'un impôt.

**Porte** — `PORT_E2E=3143 npm run porte`, verte : typecheck, lint, **941 tests Vitest sur
20 fichiers**, build, **306 tests Playwright passés et 10 ignorés**. La copie de travail
n'avait pas ses dépendances installées ; `npm ci` avant la porte, sans toucher au verrou.

---

### 23 août 2026 — `ENG-028`, l'assiette de la mainlevée, et la limite de nos gardes

**Le défaut.** `guaranteeCost` asseyait le coût de mainlevée d'une hypothèque sur le
**prix du bien**. L'assiette est le **capital garanti** : ce qu'on radie n'est pas
l'immeuble mais une inscription, dont le montant est celui de la créance. Les trois
postes le confirment — émoluments au forfait (78 € sous 77 090 € de garantie, 150 €
au-delà), contribution de sécurité immobilière assise sur le montant garanti, débours.

À 20 % d'apport, le prix vaut 1,25 fois le capital : la mainlevée était **surestimée
d'un quart**, systématiquement au détriment de l'hypothèque — dans l'arbitrage même que
le module existe pour éclairer, et que l'infobulle du champ « Garantie » décrit.

**Comment il a été trouvé.** Pas par un test. Par `FIS-006` : la source qui chiffre ce
taux — question écrite n° 6820, XVIIe législature — énonce son assiette en même temps
que son taux, et l'assiette ne disait pas la même chose que le code. L'agent l'a
signalé sans le corriger, `plan.ts` étant gelé ; c'était le bon geste.

**Ce que ça apprend, et qui vaut au-delà de ce ticket.** Un test gardait la règle
fausse. Il figurait au registre parmi les gardes vérifiées par sabotage — il avait donc
été cassé pour de bon — et son commentaire donnait le motif : « la mainlevée est un acte
sur l'immeuble ; deux emprunteurs au même capital sur des biens de prix différents ne
paient pas la même chose ». Convaincant, et faux.

**Casser une garde prouve qu'elle tient à quelque chose. Cela ne prouve pas que ce
quelque chose est vrai.** L'erreur n'était pas dans le code : elle était dans ce que
nous croyions du monde, et le test l'avait recopiée fidèlement. Aucune quantité de rouge
ne l'aurait révélée. C'est une **source** qui l'a démentie. Le sabotage protège d'un code
qui dérive, la source protège d'une croyance qui se fige ; les deux ne se remplacent pas.
Voir ADR-019.

**Second enseignement, du sabotage lui-même.** La garde corrigée vérifiait la
proportionnalité : doubler le capital double le coût. Remplacer l'assiette par
`capital × 1,25` — refaire exactement l'erreur d'origine — la préserve intacte. **945
tests verts sur une assiette fausse.** Une garde de forme ne dit rien du facteur. Elle
confronte désormais le montant au taux déclaré dans `market.ts`, ce qui nomme l'assiette
au lieu de la supposer.

**Corollaire.** Le prix du bien quitte la signature de `guaranteeCost` : plus aucun des
trois postes ne s'y adossait. Un paramètre que rien ne lit est une invitation à s'en
resservir, et c'est très exactement l'erreur qu'on venait de corriger. Une garde de type
— `@ts-expect-error` sur un quatrième argument — le tient à la compilation ; le
réintroduire fait échouer le `typecheck` en cinq points.

**Une réserve de `FIS-006` écartée après vérification.** L'agent signalait
`transferTax.oldStandardPct: 5.81` comme périmé, les notaires publiant 6,31 % depuis la
hausse de 2025. `params.ts` modélise déjà les trois cas — `oldFullPct: 6.32` pour les
départements ayant voté la hausse, `oldStandardPct: 5.81` pour les autres,
`oldReducedPct: 5.09` à taux réduit. Le modèle est complet, il n'y avait rien à corriger.

**Porte** — `npm run porte`, verte : typecheck, lint, **945 tests Vitest sur 19
fichiers**, build, **306 tests Playwright passés et 10 ignorés**.

---

### 23 août 2026 — `UI-007`, le niveau approfondi et l'hypothèse qu'on ne peut pas contourner

**Livré** — `/comparaison/patrimoine`, composant serveur avec ses `metadata`, prérendu
statiquement, enveloppant un module client sous `Suspense`. Route **imbriquée** et non de
premier niveau : c'est le second niveau du même module, celui que
`docs/03-spec-domaine.md` §2 décrit. Sept fichiers sous `src/components/patrimoine/`,
l'état d'URL dans `src/lib/patrimoine.ts`, et un chemin dans les deux sens qui **conserve
la chaîne de requête** — les dix-sept clés du niveau simple sont les mêmes des deux côtés,
et sept s'y ajoutent.

**Le scénario d'ouverture retourne, et c'est le ticket entier.** Sur trente ans, le niveau
simple compte **16 508,31 € décaissés en plus** par le propriétaire. Le niveau approfondi
lui laisse **36 030,77 € de plus** : 263 830,08 € de produit net de vente contre
227 799,31 € de portefeuille. Les deux phrases sont vraies, portent sur le même ménage, et
penchent en sens contraire. Le retournement se produit donc **entre deux lignes posées
l'une sous l'autre**, dans la même unité et à la même année — ni dans un graphique, ni
dans une phrase de synthèse.

**La décision de fond, ADR-020 : les deux hypothèses qui décident vivent dans
l'avertissement.** ADR-015 avait soudé la bascule des deux lectures au bloc de limite du
niveau simple. La forme est reprise, la limite ne l'est pas : ici le danger n'est pas de
mal compter, c'est que **la réponse dépende de deux nombres que personne ne connaît**. La
ligne de partage se lit dans le type et non dans le goût — entrent dans le bloc les
hypothèses auxquelles `src/core/assumptions/market.ts` refuse une valeur centrale, les
`FourchetteObservee` ; la commission d'agence, qui en a une, reste un paramètre de saisie
comme les autres.

**Le point d'ouverture est le milieu de l'intervalle, et l'écran le désavoue.** Il en faut
un : aucun décompte poste par poste n'existe pour une fourchette. Le poser dans
`market.ts` en ferait une valeur centrale publiée — exactement ce que ce fichier refuse.
Il est donc calculé dans l'interface, et `ChampFourchette` écrit à côté du curseur qu'il
n'a aucune autorité, avec la provenance complète dans un `<details>`. Appréciation :
milieu de [−2 % ; 4 %], soit 1,0 %. Rendement : milieu de l'**union** des deux fourchettes
relevées — capital garanti et actions diversifiées —, soit 4,25 % sur [1,5 % ; 7 %]. Cette
union évite de choisir pour le lecteur ce que fait son adversaire de son épargne.

**La fourchette entoure le point, et c'est elle qui fixe l'échelle.** Conséquence
mesurable : déplacer un curseur d'hypothèse ne recadre rien, la courbe monte ou descend
dans un cadre immobile. Et conséquence de fond, écrite sur l'écran : à l'horizon, l'écart
entre les deux patrimoines vaut 36 030,77 € quand celui du propriétaire va de 107 569,58 €
à 632 988,17 € et celui du locataire de 85 967,61 € à 507 980,12 €. **Les deux fourchettes
se recouvrent presque entièrement** : le choix des hypothèses pèse plus lourd que le choix
entre acheter et louer, et un graphique qui ne montrerait que les deux traits laisserait
croire l'inverse.

**Le zéro est une position, pas un bord.** `?ap=0&av=-2&ca=8` : revendre à l'année 1 laisse
**−14 371,65 €**, c'est-à-dire une somme à apporter pour solder le prêt. La ligne de zéro
flotte alors à 2,29 % du bas du cadre, elle porte son nom écrit, et les quatre premières
années pendent dessous. C'est le seul enseignement de ce module qui ne dépende presque pas
des hypothèses, et il ne se voit que si le zéro flotte.

**`ForfaitHorsChampError` est anticipé, jamais rattrapé.** `cession.ts` le demandait en
toutes lettres. `motifNonChiffrable` interroge `situationDeCession` puis
`motifExclusionForfaitTravaux` **avant** d'appeler ; l'année fermée n'est pas chiffrée, et
le motif du moteur est affiché tel quel, article du CGI compris. Sur
`?rg=imposable&mt=forfait`, les cinq premières années n'ont ni repère ni décompte, et la
sixième les a. À l'horizon, l'option elle-même est grisée quand la durée projetée la ferme
— `Option` de `ListeDeroulante` gagne un champ `desactivee` pour cela — et elle reste
**visible** : quelqu'un qui projette à cinq ans doit pouvoir apprendre qu'un forfait de
15 % existe et lui est fermé.

**Les deux sorties locatives sont déclarées absentes, pas grisées.** L'accueil grise ses
modules à venir, et c'est exact là-bas : le module existera, le lien apparaîtra. Ici
l'objet n'est pas une page mais un **chiffre**, et une esquisse grisée d'un chiffre absent
est pire qu'un lien mort. Le bloc « Trois sorties, une seule chiffrée » est donc de la
prose : chaque sortie est nommée, et ce qu'il faudrait pour la chiffrer est décrit — les
régimes micro-foncier, réel, micro-BIC et réel meublé pour l'une, le tarif, le taux
d'occupation et la commission de plateforme pour l'autre. Rien n'est daté, rien n'annonce
d'échéance, et le décompte se déduit de la liste au lieu de s'écrire.

**Une erreur d'`UI-014` corrigée en passant.** `/comparaison` disait « ce niveau
n'est pas encore construit ». Il l'est. La phrase est reprise, et une garde la relit
désormais.

**Deux gestes exigés par `UI-014`, et une garde à reprendre.** La route rejoint `ROUTES`
d'`avertissement.spec.ts` et `ROUTES_OUVERTES` d'`accueil.spec.ts`, et la carte « acheter
ou louer » porte un second lien vers le niveau approfondi. Ce second lien a obligé à
reprendre la garde du décompte : un module peut désormais porter **deux écrans**, donc
l'égalité ne peut plus se lire entre routes et cartes — elle se lit entre routes déclarées
et **liens** des cartes ouvertes. Ce qu'elle protège n'a pas bougé.

**Fichiers partagés touchés, et pourquoi.** `ecarter`, l'écartement de deux libellés de
courbe, sort de `CourbesCout` vers `src/components/charts/ecarter.ts` : le second
graphique en avait besoin, et une recopie de quinze lignes aurait divergé. Aucun chiffre
n'a bougé, et la garde « les deux libellés ne se recouvrent jamais » vaut désormais sur
les deux écrans. `Option` de `ListeDeroulante` gagne `desactivee?`, additif. La liste des
tournures prescriptives sort de `comparaison.spec.ts` vers `tests/e2e/prescriptions.ts`,
en trois blocs — général, comparaison, patrimoine — pour que les deux niveaux lisent la
même. **Aucun fichier de `src/core/` n'a été modifié.**

**Tests** — `tests/e2e/patrimoine.spec.ts`, 32 tests sur les deux profils, soit 64
exécutions. Six tournures prescriptives propres à ce niveau s'ajoutent aux quatorze
existantes : `vous aurez / gagnerez / perdrez`, `vaut le coup`, `bon investissement`,
`bon placement`, `plus riche`, `moment idéal / optimal / opportun / propice`, `au bon
moment`. Les trois dernières visent le piège que `cession.ts` nomme lui-même : « le
maximum de cette courbe n'est pas un conseil de vente ».

#### Gardes cassées, puis rétablies

Six sabotages, sauvegarde par copie de fichier — jamais `git checkout --`.

1. **Plancher de 6 % sur les repères du graphique** : **4 rouges**, deux tests sur deux
   profils — les proportions, et le produit de vente négatif dont le repère remontait
   au-dessus du zéro. La garde d'échelle, elle, n'a pas bougé : ses repères valent tous
   plus de 6 %, et un plancher ne les touche pas. Bon à savoir — ces deux gardes ne se
   remplacent pas.
2. **Échelle assise sur les seules courbes retenues**, les fourchettes retirées du calcul
   des bornes : **6 rouges**, trois tests sur deux profils. Les trois gardes de proportion
   tombent ensemble, ce qui est le comportement attendu : elles mesurent toutes contre la
   même échelle.
3. **`try`/`catch` autour de `chiffrerCession` avec retombée silencieuse sur « travaux au
   réel, zéro »**, posé dans `venteA` — la fonction qui calcule les bornes de la
   fourchette : **0 rouge, suite complète verte.** Résultat inattendu et instructif : ce
   `catch` ne peut jamais s'exécuter. `venteA` n'est appelée que pour les années dont la
   boucle principale a déjà établi qu'elles sont chiffrables, et la seule chose qui varie
   entre les deux appels est l'appréciation, qui n'entre dans aucun motif d'exclusion. Le
   pré-contrôle qu'il contient est de la défense en profondeur, pas une protection
   effective ; **aucun test ne le garde, et il ne peut pas en exister.** Consigné ici
   plutôt que masqué par un test artificiel qui n'aurait mesuré que lui-même.
4. **Le même sabotage, posé cette fois dans la boucle de balayage** : **2 rouges**,
   « le forfait travaux ferme les cinq premières années » sur les deux profils. C'est là
   qu'est la protection réelle.
5. **Les deux hypothèses sorties du bloc de limite**, déplacées juste au-dessous :
   **4 rouges**. Deux attendus — « les deux hypothèses vivent dans le bloc de limite » — et
   **deux inattendus** : « deux des trois sorties sont annoncées comme non modélisées »,
   parce que le paragraphe `data-une-sortie` était emporté hors du bloc par la même
   coupure. Un défaut de mise en page en révèle un autre.
6. **Une phrase prescriptive dans le retournement** — « le moment optimal pour vendre… et
   acheter reste un bon placement » : **2 rouges**, la garde des tournures sur les deux
   profils. Elle attrape deux des six tournures nouvelles.
7. **Le retour de « ce niveau n'est pas encore construit » sur `/comparaison`** :
   **2 rouges**. La garde qui relit la phrase du niveau simple fonctionne, ce qui est
   précisément ce qui manquait à `UI-014`.

Le sabotage n° 3 est le résultat le plus utile de la séance : il dit où la protection
n'est **pas**.

#### Ce qui reste ouvert

- **Trois grandeurs de la cession sont fixées, pas saisies** : le bien est bâti, le cédant
  est une personne physique, et il est affilié à la sécurité sociale française. Le moteur
  sait traiter les autres cas — `ENG-016` a écrit le taux réduit EEE/Suisse — et l'écran
  ne les propose pas. C'est déclaré dans « ce que ce calcul ne dit pas », et c'est un
  champ à ouvrir le jour où quelqu'un en aura besoin.
- **Les frais de cession autres que la commission et la mainlevée ne sont pas saisissables**
  — diagnostics, honoraires d'architecte, indemnité d'éviction. `EntreeCession` a le champ,
  l'écran ne l'expose pas. Même raison : un champ de plus pour un montant que peu de gens
  connaissent, et la réserve le dit.
- **Le portefeuille du locataire n'a aucune fiscalité de sortie.** Le rendement se saisit
  net d'impôt, ce qui est la convention de `portefeuille.ts` et la seule tenable tant
  qu'`ENG-023` n'a pas modélisé les enveloppes. Un utilisateur qui saisit un rendement
  **brut** surestime le portefeuille sans que rien ne l'en avertisse au-delà d'une phrase.
  C'est la faiblesse la plus réelle de l'écran.
- **Le croisement des deux patrimoines bouge énormément.** Il vaut l'année 8 au scénario
  d'ouverture, l'année 2 à 4 % d'appréciation, et n'existe pas dans plusieurs
  configurations plausibles. L'écran le dit, et refuse de l'ouvrir comme année de lecture
  par défaut — il ouvre sur l'horizon projeté, qui est la question posée.

**Porte** — `PORT_E2E=3144 npm run porte`, verte : typecheck, lint, **955 tests Vitest sur
20 fichiers**, build (quinze routes, toutes statiques), **374 tests Playwright passés et
10 ignorés**. La copie de travail n'avait pas ses dépendances installées ; `npm ci` avant
la porte, sans toucher au verrou.

---

### 23 août 2026 — v0.3.0, « Acheter ou louer »

**Ce qui sort.** Les deux niveaux du module, et le moteur qui les porte.

| Ticket | Objet |
| --- | --- |
| `FIS-007` | Valeurs fiscales de la phase 3, sourcées et datées |
| `ENG-010` | Coûts de détention et flux comparés, deux lectures |
| `ENG-011` | Portefeuille du locataire de référence |
| `ENG-012` | Scénario de vente, exonération de la résidence principale |
| `ENG-014` · `ENG-016` | Plus-value hors résidence principale, prélèvements sociaux et résidence fiscale |
| `ENG-027` | Assemblage de la cession — la vente branchée sur la plus-value |
| `VIZ-003` | `/comparaison`, courbes de coût et bandeau d'écart |
| `UI-007` | `/comparaison/patrimoine`, le moment de révélation |
| `TST-030` | Porte de version, critère de sortie exécuté |

**Arrivés en cours de route**, et aucun n'était prévu : `FIS-006` le recoupement des
dix-sept hypothèses de marché, `FIS-008` l'arrondi des assiettes d'imposition, `ENG-028`
l'assiette de la mainlevée, `UI-014` la carte d'accueil restée « à venir », `UI-015`
l'année d'ouverture, `TST-003` la vérification du site publié.

**Critère de sortie** — exécuté par `tests/e2e/parcours-v0-3.spec.ts`, et cassé sur ses
deux moitiés avant d'être déclaré. Un inconnu part de l'accueil, atteint le niveau
simple, y lit que la comparaison **est faussée** avant tout chiffre, passe au niveau
approfondi, y trouve les deux hypothèses qui gouvernent la réponse enfermées dans le bloc
de limite, en déplace une, voit la réponse bouger, et partage l'adresse obtenue.

**Ce qui est reporté, et pourquoi.**

- `ENG-013` régimes fiscaux locatifs et `ENG-015` location courte durée partent en
  v0.3.1. Ils décrivent ce qu'on fait *après* avoir acheté, pas le choix d'acheter — une
  autre question, posée par quelqu'un d'autre. Et c'est le terrain le plus incertain du
  module : `docs/03-spec-domaine.md` §2 signale lui-même que les abattements des régimes
  micro, meublés de tourisme compris, ont changé récemment. L'écran les nomme comme
  **absentes**, pas comme prochaines, et une garde le vérifie.
- La relecture juridique de `LEG-001` et `LEG-002` reste à faire ; le site demeure
  `noindex`, et la suite de déploiement le vérifie sur la production à chaque étiquette.
- Les réserves ouvertes par `UI-007` : le rendement saisi brut par erreur ne déclenche
  rien — la faiblesse la plus réelle de l'écran, et elle attend `ENG-023` —, trois
  grandeurs de la cession sont fixées plutôt que saisies alors qu'`ENG-016` sait les
  traiter, et les autres frais de cession ne sont pas exposés.

**Ce que cette version aura appris, et qui vaut mieux que ses écrans.** Trois défauts de
calcul ont été trouvés, et **aucun ne l'a été par un test**. L'assiette de la mainlevée
était fausse et un test gardait fidèlement la règle fausse, sabotage à l'appui. La fente
de 99 centimes du barème de surtaxe a été rencontrée par accident, parce qu'un cas dérivait
son prix d'une valeur appréciée au lieu de le saisir en euros ronds. Et le correctif de
cette fente taxait où la loi ne taxe pas, jusqu'à ce qu'un article — CGI, art. 1649
undecies — soit trouvé par un détour, dans une doctrine sur les bénéfices industriels et
commerciaux, aucune requête directe ne le rendant.

Ce que les sabotages protègent, c'est un code qui dérive. Ce qui protège d'une croyance
qui se fige, ce sont des sources qui énoncent leur assiette. Voir ADR-019.

**Porte de version** — `rm -rf .next` puis `npm run porte`, à froid : typecheck, lint,
**955 tests Vitest sur 20 fichiers**, build, **386 tests Playwright passés et 10 ignorés**.
Puis `npm run verif-deploiement` sur https://simulateur-immo-snowy.vercel.app/.

---

### 25 août 2026 — Le plan de lancement s'écrit dans le dépôt

**D'où il vient.** Session de cadrage menée avec la compétence `brainstorming` du
plugin `superpowers`, installée ce jour hors dépôt : questions une par une, approches
comparées, conception validée section par section avant toute écriture.

**Les décisions, dans l'ordre où elles ont été prises.**

- **Le lancement recouvre tout** — l'ouverture publique, la vitrine professionnelle,
  et les versions qui y mènent.
- **La séquence : fonctionnalités d'abord, refonte du design ensuite, mécanique du
  lancement enfin.** Les fonctionnalités suivent le plan de versions tel qu'il est
  écrit — v0.3.1, v0.4, v0.5, v0.6 — avec une revue des manques en cours de route.
- **Le plan vit dans les conventions du dépôt**, pas dans un document à part :
  `RELEASES.md` porte les versions, `TASKS.md` porte les tickets. Deux approches
  écartées — un `docs/LANCEMENT.md` séparé, qui aurait fait deux sources de vérité
  pour les versions, et des tickets sans plan, qui n'auraient consigné la séquence
  nulle part.
- **v0.7.0 « L'interface se montre »** est créée : la refonte A→Z, qui absorbe la
  phase 8. Porte d'entrée : la revue des manques fonctionnels. Première conversation :
  délimiter ce qui se rediscute et ce que les règles protègent — sémantique des
  quatre couleurs, contrastes gardés par tests, ADR-021. Sortie : les cinq contrôles
  du §10.6 et les parcours des versions précédentes re-passés tels quels.
- **v1.0.0 devient officiellement la version du lancement** : s'y ajoutent la bascule
  `INDEXABLE` avec l'inversion de la garde de `verif-deploiement`, le sitemap et la
  Search Console, la licence du dépôt et la procédure du taux d'usure. L'annonce est
  l'acte qui suit l'étiquette.
- **Cinq tickets créés en phase 7**, écrits dans leur ordre d'exécution : `LEG-003`
  dossier juriste et relecture, `LEG-004` licence, `FIS-009` procédure d'usure,
  `INF-008` bascule et trouvabilité, `CNT-004` annonce et vitrine. Plus `TST-070`,
  la porte de la refonte.
- **La relecture juridique est un délai externe** : notée « peut partir à tout moment
  sur signal d'Adrian, au plus tard au début de v0.7.0 ». Rien d'autre ne peut la
  raccourcir.

**Pas d'ADR** : aucune décision d'architecture technique — le plan est une décision
de production, et `RELEASES.md` est son lieu.

**Ensuite** : v0.3.1 « Louer plutôt que vendre » démarre par la vérification fiscale
à la source — la spécification signale elle-même les régimes micro comme le terrain
le plus incertain du module.

---

### 25 août 2026 — FIS-010 : les régimes locatifs à la source, deux croyances corrigées

Première vague de v0.3.1, sur le modèle de v0.3.0 : les valeurs d'abord, les moteurs
ensuite. Cinq points vérifiés sur Légifrance et service-public, consignés dans
`docs/reference/FIS-010-verification.md` ; `rentalIncome` ajouté à `params.ts` —
fichier gelé, ajout pur sur le précédent de `FIS-007`, aucune entrée existante
modifiée.

**Ce que les textes ont confirmé.** Micro-foncier 15 000 € / 30 % (art. 32 — le point
que la recherche d'août n'avait « pas retrouvé » est le plus simple de tous) ;
micro-BIC actualisé au 1er juillet 2026 par le décret n° 2026-562 : 83 600 € / 50 %
pour la longue durée ET les meublés classés — même 2° de l'art. 50-0 —, 15 000 € /
30 % pour les non classés, seuil expressément exclu de l'actualisation triennale ;
abattement minimum 305 € ; affiliation de la courte durée à 23 000 € (art. L611-1, 6°).

**Ce que les textes ont démenti.** Deux affirmations de `docs/04-regles-calcul.md`,
corrigées dans le document même :

- **Les amortissements LMNP réintégrés bénéficient des abattements pour durée de
  détention.** La note affirmait le contraire — « aucun abattement », « base scindée
  en deux composantes » — et ce mécanisme-là aurait été codé dans `ENG-013` si on
  l'avait crue. Le III de l'art. 150 VB minore le **prix d'acquisition** : une seule
  plus-value brute, les abattements de droit commun dessus (RM n° 10097, AN,
  24 mars 2026, qui confirme aussi la portée rétroactive aux amortissements
  antérieurs à 2025). L'effet s'éteint sur les détentions longues — l'inverse de ce
  que la note laissait attendre.
- **La location meublée paie 18,6 % de prélèvements sociaux, la nue 17,2 %.** La
  dérogation du IV de l'art. L136-8 vise les revenus fonciers (a du I de
  l'art. L136-6) ; les BIC non professionnels de la meublée (f du même I) n'y sont
  pas. La note « la hausse ne concerne pas l'immobilier » était vraie du foncier,
  fausse de la meublée. Aucun taux nouveau : `ENG-013` choisira entre les deux
  entrées que `FIS-007` avait déjà écrites.

**Découvert en passant.** La LF 2026 (art. 47) crée un amortissement en location
nue — statut du bailleur privé, art. 31, i et j — réintégré lui aussi au 150 VB, et
c'est pour lui que l'art. 32 a été retouché en février. Hors périmètre v0.3.1, à
déclarer non modélisé.

**Gardes.** `params-regimes-locatifs.test.ts`, 14 tests sur le modèle de `FIS-007` :
relations entre valeurs (les deux alignements que les textes imposent), montants que
les articles écrivent en toutes lettres, sourçage par bloc JSDoc accolé. **Cassées
deux fois avant d'être déclarées** : le seuil ramené à 77 700 € — 2 rouges, le
montant 2026 et l'égalité de catégorie tombent ensemble — puis un `@source` maquillé
en `@src` — 1 rouge, la garde de sourçage seule. Un accroc instructif au passage :
`microFoncier.thresholdCents` entrait en collision avec le `thresholdCents` de la
surtaxe dans la garde de sourçage de `FIS-007`, qui cherche la première occurrence.
Renommé `grossIncomeThresholdCents` — plus juste, c'est un seuil de revenu brut — et
on ne corrige pas un test qui a raison.

---

### 25 août 2026 — ENG-013 : les quatre régimes calculent, la réintégration est branchée

**`src/core/compare/regimes-locatifs.ts`.** Une fonction annuelle SANS ÉTAT :
recettes, charges, intérêts, dotation entrent ; base, impôt, prélèvements sociaux et
reports sortent. C'est l'appelant — le futur `ENG-029` — qui fera circuler les
reports d'une année à l'autre ; un échéancier est un pli de cette fonction, pas une
boucle cachée dedans.

**Trois choix de modélisation, écrits dans les sorties.**

- **Le régime est une donnée, jamais un choix du moteur.** Décider du « meilleur
  régime » serait une recommandation. La fonction calcule le régime demandé, même
  inéligible — l'inéligibilité sort en alerte typée avec seuil et recettes. Un
  calcul arrêté n'apprend rien.
- **Réel nu, prudence assumée** : tout le déficit part en report sur les revenus
  fonciers suivants ; l'imputation sur le revenu global (10 700 €) et l'expiration
  décennale sont déclarées non modélisées.
- **Réel meublé, art. 39 C au cordeau** : l'amortissement se déduit dans la limite
  du résultat avant amortissement, l'excédent se reporte sans limite de durée. La
  part déduite est rendue à l'appelant parce qu'elle a un avenir : elle minore le
  prix d'acquisition à la revente.

**Le branchement 150 VB, III.** `plus-value.ts` gagne `amortissementsDeduits`, qui
minore le prix d'acquisition dans l'assiette — pas de barème parallèle, les
abattements traversent, conformément à la RM n° 10097 vérifiée par `FIS-010`. La
réserve `amortissementsLmnp` — « ne sont pas réintégrés, plus-value sous-estimée » —
change de nature au lieu de disparaître : sans saisie elle dit « à saisir », avec
saisie elle borne les exceptions (résidences services). Le test existant « porte
toujours ses réserves » passe inchangé : c'est la même clé, et c'est voulu.

**Gardes.** 25 tests sur les régimes (cas dérivés à la main des articles, invariants
de conservation, quatre propriétés fast-check), 5 sur la réintégration. **Cassées
trois fois** : le plafond du 39 C retiré — 3 rouges —, le choix du taux de
prélèvements sociaux inversé — 5 rouges —, la minoration débranchée — 2 rouges.

**Reste pour v0.3.1** : `ENG-029` (série pluriannuelle de la sortie longue durée,
avec vacance et gestion en hypothèses de marché à ajouter à `market.ts`), `ENG-015`
(courte durée), `TST-031` (la porte, avec ses cas de référence sourcés).

---

### 25 août 2026 — ENG-029 : la location longue durée, de la première année à la revente

**`src/core/compare/location-longue-duree.ts`.** Le pli annoncé : chaque année de
location est un appel à `calculerImpotLocatif`, les reports — déficit foncier,
amortissement 39 C — circulent ici et nulle part ailleurs, et la revente est un
appel à `chiffrerCession` où les amortissements déduits, cumulés par ce fichier
parce qu'il est seul à les connaître, minorent le prix d'acquisition. Le fil
`ENG-013` → `ENG-029` → `ENG-027` se vérifie sur un seul chiffre : dix ans de
meublé au réel, 42 500 € déduits, un prix d'acquisition retenu de 157 500 €.

**Deux enseignements portés par la sortie.** Le flux net d'une année peut être
négatif — la mensualité toujours due, −5 791,63 € au cas de référence — et la mise
en location coûte l'exonération de résidence principale, dit en réserve plutôt que
laissé à découvrir dans le chiffre.

**Quatre hypothèses de marché nouvelles** (`market.location`) : vacance 2,5 % des
loyers, gestion 7 % TTC, amortissement 2,5 % l'an sur 85 % de part amortissable.
Toutes `estimee`, chacune disant pourquoi — la vacance n'a de mesure ouverte qu'un
article de 2017 sur CLAMEUR, les barèmes de gestion sont publiés par ceux qui les
vendent, l'amortissement et la part de terrain sont des conventions de praticien.
Les deux listes-cliquets de `market.test.ts` — blocs, et compte des `estimee`
passé de dix à quatorze — ont rougi puis été mises à jour avec la raison datée :
c'est exactement l'usage pour lequel elles existent.

**Choix de modélisation écrits dans les réserves** : loyers hors charges
récupérables des deux côtés ; la provision pour travaux tient lieu de dépenses
déductibles au réel ; l'assiette d'amortissement est la valeur vénale à la mise en
location ; mise en location, GLI et impayés non modélisés ; bien bâti et cédant
personne physique, comme le reste du module. Les catégories de meublé de tourisme
sont refusées avec renvoi à `ENG-015`.

**Gardes.** 20 tests : une année posée poste par poste sur une feuille, la
conservation exacte des deux reports, l'intégration jusqu'à l'assiette de
plus-value, et un invariant fast-check sur le solde de chaque année. **Cassées
deux fois** : le fil des amortissements débranché — 1 rouge, le test
d'intégration — et la circulation du déficit coupée — 1 rouge, la conservation.
Chaque sabotage est tombé exactement sur sa garde, aucun ailleurs.

---

### 25 août 2026 — ENG-015 : la courte durée, du tarif de nuit à la revente

**`src/core/compare/location-courte-duree.ts`**, même squelette qu'`ENG-029` avec
ce qui fait la courte durée : les revenus naissent d'un tarif et d'un taux
d'occupation — **obligatoire et sans défaut**, comme l'appréciation : en publier
une moyenne serait une prévision —, le propriétaire paie toutes les charges, et
l'ameublement sort en caisse l'année 1 avant de s'amortir au réel sur la durée du
mobilier, par différence de cumuls arrondis pour que la somme **solde exactement**.

**La subtilité fiscale qui méritait le détour** : à la revente, le III de
l'art. 150 VB minore le prix d'acquisition de l'immeuble cédé — le mobilier a le
sien propre et reste dehors. Le fichier sépare donc bâti et mobilier dans les
amortissements, et quand le plafond du 39 C n'a pas tout laissé déduire, la part
déduite s'impute d'abord sur le bâti : convention prudente — elle majore l'impôt
de revente plutôt que de le minorer — et déclarée en réserve.

**Quatre hypothèses de marché nouvelles** (`market.location`) : commission de
plateforme 16 % — la page d'aide d'Airbnb a été ouverte : 3 % côté hôte en modèle
partagé, 15,5 % en « frais hôte uniquement » ; le raisonnement qui unifie les
deux reste le nôtre —, conciergerie 25 %, durée du mobilier 7 ans, et un taux
d'occupation **sans valeur centrale** ([30 ; 75]), même refus qu'à l'appréciation.
Le compte des `estimee` passe de quatorze à dix-huit, listes-cliquets mises à
jour avec la raison.

**Les seuils de la courte durée mordent tôt, et ça se voit** : à 60 %
d'occupation d'un 100 € la nuit, le micro non classé est déjà inéligible
(21 900 € > 15 000 €) ; à 65 %, l'affiliation aux indépendants se signale
(23 725 € > 23 000 €). Les alertes montent d'`ENG-013` année par année.

**Gardes.** 16 tests — l'année 1 posée à la main jusqu'au flux net négatif
(−6 150,70 € : l'ameublement fait sa première année), le solde exact du mobilier
sur huit ans, le fil bâti-seul jusqu'à l'assiette (12 750 € réintégrés sur
16 178,57 € déduits), les refus de domaine. **Cassées deux fois** : la
réintégration étendue au mobilier — 1 rouge — et l'ameublement décaissé chaque
année — 1 rouge. Deux accrocs de tests corrigés en passant, côté tests : une
assertion qui citait la réserve de mémoire au lieu de son texte, une borne
d'invariant qui oubliait l'indexation du tarif.

**Le moteur de v0.3.1 est complet.** Reste `TST-031` — la porte de version — et
le câblage d'écran des trois sorties, qui a désormais tout ce qu'il faut.

---

### 25 août 2026 — UI-024 et UI-025 : les trois sorties se chiffrent à l'écran

**L'étude d'abord** (`docs/reference/UI-024-etude-cablage.md`), la décision en
**ADR-022** : *une location est un récit, pas un point sur les courbes*. La vente
tombe à une date, une mise en location est une série de flux puis une revente
plus tard — les superposer aurait exigé de comparer des patrimoines à des dates
différentes sans actualisation, ou de prolonger le portefeuille du locataire avec
un moteur qui n'existe pas. L'analyse principale ne change donc pas d'un pixel ;
la section « trois sorties » cesse de déclarer des absences et devient le lieu où
les récits se chiffrent, chacun à ses dates, aucun désigné.

**La réalisation.** Dix clés d'URL nouvelles (`so`, `dl`, `tm`, `lm`, `rl`, `rc`,
`tn`, `oc`, `am`, `ce`), tout le reste — taxe, charges, assurance-devenue-PNO,
provision, indexations, prix, horizon, plan — repris des clés existantes sans en
redemander une. Les hypothèses de `market.location` s'affichent avec valeur,
intervalle et fiabilité au lieu de s'ouvrir en champs. Le TMI est une liste, les
cinq taux du barème. Le taux d'occupation ouvre sur le milieu de sa fourchette et
l'aide écrit qu'il n'a aucune autorité — le pattern d'ADR-020, appliqué à la
courte durée. L'écart 17,2 / 18,6 % de prélèvements sociaux s'écrit sur la ligne
d'impôt : c'est un enseignement, pas un détail de calcul.

**Ce qui a été appris en vérifiant.** L'aperçu interactif ne composait aucune
frame — fenêtre non affichée — et l'hydratation ne se révélait jamais : les clics
tombaient sur un DOM inerte, sans une erreur en console. Une heure aurait pu s'y
perdre ; la leçon est consignée : **la vérification d'écran de ce projet passe
par le build de production et Playwright**, qui ont rendu 78 verts sur les deux
profils du premier coup — y compris le clic du sélecteur, l'écriture d'`so` dans
l'URL et les seuils de la courte durée.

**Les gardes ont changé d'état sans changer d'objet.** « Deux des trois sorties
sont annoncées comme non modélisées » devient « les trois sorties sont chiffrées,
et la sortie regardée se choisit » ; le parcours v0.3.0 est amendé avec la raison
datée ; la phrase du bandeau se **déduit** désormais de `TROIS_SORTIES` au lieu
d'être écrite à la main — la leçon d'`UI-014`, appliquée au moment même où elle
allait être enfreinte. **Deux sabotages** : le drapeau `modelisee` menti — 4
rouges, toute la chaîne dérivée tombe ensemble — et les alertes débranchées du
panneau courte durée — 2 rouges, la garde des seuils seule.

**Reste pour v0.3.1** : `TST-031`, la porte de version.
