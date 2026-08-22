# TASKS

Préfixes : `ENG` moteur de calcul · `FIS` paramètres fiscaux · `UI` interface ·
`VIZ` visualisations · `CNT` contenus · `INF` infrastructure · `LEG` conformité

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

- [ ] `ENG-001` Annuité constante, cas taux nul inclus
- [ ] `ENG-002` Échéancier avec différé, dernière échéance soldante
- [ ] `ENG-003` Agrégation multi-prêts
- [ ] `ENG-004` Assurance emprunteur, deux bases de calcul, quotité
- [ ] `ENG-005` Coût de garantie et part restituable
- [ ] `ENG-006` TAEG par dichotomie
- [ ] `ENG-007` Taux d'endettement et contrôle de seuil
- [ ] `ENG-008` Cas de référence vérifiés contre une source externe
- [ ] `ENG-009` Tests de propriétés sur les invariants d'échéancier

## Phase 2 — Interface crédit

- [x] `UI-000` Galerie `/composants` — les primitives dans leurs cinq états, banc
      d’essai des tests de bout en bout et documentation vivante
- [x] `INF-007` Playwright : 13 tests sur deux profils, bureau et mobile
      → reste à couvrir : le scénario partagé par URL, quand `UI-003` existera

- [ ] `UI-001` Grille de base, panneau de paramètres, zone de résultats
- [x] `UI-002` Composants de saisie et leurs états
      → 7 primitives dans `src/components/ui/`, cinq états chacune
- [ ] `UI-003` État d'URL avec nuqs et zod
- [ ] `UI-004` Bandeau d'indicateurs
- [ ] `VIZ-001` Ruban d'amortissement avec curseur de lecture
- [ ] `VIZ-002` Tableau d'amortissement, agrégation annuelle
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

## Phase 7 — Contenus et mise en ligne

- [ ] `CNT-001` Glossaire relié aux infobulles
- [ ] `CNT-002` Fiches pédagogiques par module
- [ ] `CNT-003` Page d'accueil énonçant la thèse
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
