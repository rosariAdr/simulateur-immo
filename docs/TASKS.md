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
      → 3 entrées `TODO_VERIFY` dans `params.ts`. Recherche menée le 21 août :
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
- [ ] `ENG-008` Cas de référence vérifiés contre une source externe
      → **partiel, et c'est le seul `ENG` qui le reste.** Un seul cas cite une source
      extérieure (150 000 € / 4 % / 20 ans, La finance pour tous). `docs/02-architecture.md`
      demande « une poignée de scénarios » confrontés à un tableau produit par une banque
      ou une feuille de calcul indépendante. Un cas n'est pas une poignée
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
- [ ] `UI-005` Infobulles pédagogiques sur les termes techniques
- [ ] `UI-006` Adaptation mobile

## Phase 3 — Acheter ou louer

- [ ] `ENG-010` Coûts de détention et flux mensuels comparés
- [ ] `ENG-011` Portefeuille du locataire de référence
- [ ] `ENG-012` Scénario de vente, exonération résidence principale
- [ ] `ENG-013` Régimes fiscaux locatifs
- [ ] `ENG-014` Plus-value hors résidence principale, abattements par durée
- [ ] `ENG-015` Scénario location courte durée
- [ ] `ENG-016` Statut de résidence fiscale et prélèvements sociaux applicables
- [ ] `VIZ-003` Courbes de coût mensuel et bandeau d'écart
- [ ] `UI-007` Moment de révélation de l'analyse patrimoniale

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
- [ ] `FIS-005` Sortir les barèmes de caution de `params.ts` : ce sont des hypothèses
      de marché, aucune loi ne les fixe. Décision d’architecture à prendre
- [ ] `UI-010` Assistant d'éligibilité

## Portes de vérification

Transversales aux phases. Voir `docs/RELEASES.md` §3.

- [x] `TST-000` **Porte de branche** — `npm run porte` : typecheck, lint, Vitest,
      build, Playwright sur deux profils. Aucune fusion dans `main` sans elle, et
      toute branche apporte ses propres tests ou justifie par écrit qu'elle n'en a
      pas besoin
- [ ] `TST-001` **Porte de version** — la porte de branche à froid, plus le relevé
      des compteurs dans `docs/REGISTRE-TESTS.md` et la confrontation du critère de
      sortie au site déployé, pas au code
- [ ] `TST-010` Porte de version **v0.1.0**. À couvrir avant l'étiquette : le
      parcours d'accueil vers `/credit`, la présence de l'avertissement sur chaque
      écran qui affiche un chiffre, l'atteignabilité des mentions légales
- [ ] `TST-020` Porte de version **v0.2.0**. Le parcours complet mené au pouce sur
      le profil mobile : cibles tactiles d'au moins 24 px, aucun montant rogné,
      aucune infobulle hors écran
- [ ] `TST-030` Porte de version **v0.3.0**. Les cas de référence d'« acheter ou
      louer » vérifiés contre une source externe, comme ceux du crédit
- [ ] `TST-040` Porte de version **v0.4.0**. Le double plafond légal d'indemnité de
      remboursement anticipé, éprouvé sur ses bornes
- [ ] `TST-050` Porte de version **v0.5.0**. Les trajectoires simulées : reproductibilité
      à graine fixée, et quantiles vérifiés sur une distribution connue
- [ ] `TST-060` Porte de version **v0.6.0**. Les règles d'éligibilité, chacune avec
      son cas passant et son cas bloquant
- [ ] `TST-100` Porte de version **v1.0.0**. Plus aucun `TODO_VERIFY` dans
      `src/core/fiscal/`, et un test qui échoue s'il en réapparaît un

## Phase 7 — Contenus et mise en ligne

- [ ] `CNT-001` Glossaire relié aux infobulles
- [ ] `CNT-002` Fiches pédagogiques par module
- [x] `CNT-003` Page d'accueil énonçant la thèse — `feat/CNT-003-accueil`
- [ ] `LEG-001` Mentions légales, conditions d'utilisation, politique de confidentialité
- [ ] `LEG-002` Avertissement visible sur l'absence de conseil
- [ ] `INF-005` Mesure d'audience sans cookie
- [ ] `INF-006` Métadonnées de partage reflétant le scénario

---

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
