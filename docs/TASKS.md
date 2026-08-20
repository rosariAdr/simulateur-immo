# TASKS

Préfixes : `ENG` moteur de calcul · `FIS` paramètres fiscaux · `UI` interface ·
`VIZ` visualisations · `CNT` contenus · `INF` infrastructure · `LEG` conformité

---

## Phase 0 — Fondations

- [ ] `INF-001` Initialiser Next.js, TypeScript strict, Tailwind, déploiement Vercel
      → socle en place (Next 16 App Router, `strict` + `noUncheckedIndexedAccess` +
      `exactOptionalPropertyTypes`, Tailwind 4). **Reste le déploiement Vercel.**
- [x] `INF-002` Configurer Vitest et fast-check
      → `vitest.config.mts` (`globals`, `include: src/**/*.test.ts`), 95 tests verts sur 3 fichiers
- [x] `INF-003` Règle de lint interdisant les imports UI depuis `src/core/`
      → `no-restricted-imports` en override sur `src/core/**`, vérifiée par sonde temporaire
- [ ] `INF-004` Jetons de design en variables CSS, nommés par rôle sémantique
      → `globals.css` est encore le gabarit Next par défaut
- [x] `FIS-001` Structure des paramètres fiscaux versionnés par millésime
      → `src/core/fiscal/params.ts`, typé, daté, sourcé par JSDoc `@source`/`@see`
- [ ] `FIS-002` **Vérifier à la source toutes les valeurs réglementaires du prototype**
      → 4 entrées `TODO_VERIFY` subsistent dans `params.ts`. Bloquant avant mise en ligne.

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

- [ ] `UI-001` Grille de base, panneau de paramètres, zone de résultats
- [ ] `UI-002` Composants de saisie et leurs états
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
