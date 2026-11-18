<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Conventions de travail (simulateur-immo)

> Le bloc `nextjs-agent-rules` ci-dessus est écrit et ré-ajouté par `next dev` : **ne pas le modifier**. Les conventions du dépôt commencent ici.
> **Source de vérité unique des conventions et des règles de ce dépôt.** Lue nativement par **Codex**, et par **Claude Code** via `CLAUDE.md`, qui l'importe (`@AGENTS.md`).
> **Socle commun** — les §0 à §6 sont le socle partagé par tous les projets : même texte partout, à quelques valeurs près (nom de la branche stable, contenu de la commande `porte`, outils de test), toutes rappelées en §7. La §7 est propre à ce dépôt.
> En cas de conflit entre ce fichier et le code : **s'arrêter et signaler**, ne jamais trancher en silence.

---

## 0. Règles pour les agents (Claude & Codex)

- **AGENTS.md fait foi.** Si une info manque (une règle, un choix d'archi, une valeur métier), **demander — ne jamais inventer**. Toute proposition de comblement est taguée `💡 [proposé — à valider]` dans la doc ou la PR.
- **Un agent = un ticket = une branche à la fois.** Deux agents ne travaillent jamais sur les mêmes fichiers en parallèle.
- **Revue croisée.** Faire relire le diff d'un agent par l'autre (ex. `/code-review` côté Claude) avant d'ouvrir la PR.
- **Commits : l'agent propose, le dev commite.** L'agent rédige le message de commit ; le dev le valide et commite lui-même (GitKraken). **Aucun footer `Co-Authored-By`.**
- **Jamais** de commit direct sur `main`/`dev`, **jamais** de `push`/`merge`/`tag` par un agent sans demande explicite.

### Plusieurs agents en parallèle

- **Le brief écrit le périmètre** : les fichiers que l'agent possède, et ceux auxquels il ne touche pas.
- **Un port de test par copie.** Chaque copie du dépôt (worktree) qui lance les tests fixe son port (`PORT_E2E=3101`, `3102`…). Sinon `reuseExistingServer` fait lire le serveur d'une autre copie, et la porte voit des tests verts sur un code qui n'est pas le sien.
- **Aucun relevé depuis une branche** (nombre de tests, couverture, compteurs) : il est périmé dès la fusion suivante. Les relevés se font une fois, sur `dev`, après la dernière fusion.
- **Fichiers partagés** (CHANGELOG, journal) : ajouter en fin de section ; un conflit se résout en gardant les deux côtés.
- **Numérotation partagée** (tickets, ADR) : le brief annonce le dernier numéro attribué, et on vérifie qu'un ID est libre avant de le poser. En cas de collision, celui qui est déjà fusionné garde son numéro.

---

## 1. Workflow Git

```
main  ← stable, taggué (vX.Y.Z) — PR depuis dev uniquement
  └── dev  ← intégration continue — PR depuis les branches de travail
        ├── feat/<TICKET_ID>      (ex. feat/ENG-015-location-courte-duree)
        ├── fix/<description>     (ex. fix/tableau-debordement)
        └── chore/<description>   (maintenance, docs, deps, outillage)
```

- Pas de commit direct sur `main` ni `dev` → **tout passe par PR**.
- Une PR = un ticket (ou un lot cohérent de petits tickets liés).
- Branches de travail → `dev` : **squash merge**. `dev → main` : **merge classique** (préserve l'historique). Tag à chaque release.
- **Resync obligatoire après chaque `dev → main`** :
  ```bash
  git checkout dev && git merge --ff-only main && git push origin dev
  ```
  Check qui doit passer : `git log --oneline main..dev` **vide**.
- `wip:` autorisé pour un commit de session interrompue sur une branche de travail (squashé à la PR).

---

## 2. Conventional Commits

Format : `type(scope): description courte`

| Type | Quand l'utiliser |
|---|---|
| `feat` | nouvelle fonctionnalité visible |
| `fix` | correction de bug |
| `test` | ajout/modif de tests sans changement de code prod |
| `refactor` | restructuration sans changement de comportement |
| `chore` | maintenance, deps, scripts, config |
| `docs` | documentation seule |
| `style` | formatage (rien sur la logique) |
| `perf` | optimisation de performance |

Les **scopes** et la **langue des messages** sont propres au projet → voir §7.

---

## 3. Definition of Done (par type de ticket)

Vérifier **tous** les critères du type avant de fermer un ticket.

- **Feature (logique)** — code au pattern existant · **test unitaire** (logique pure) · **test fonctionnel** (action d'état) · **scénario** si la feature entre dans une boucle · **porte verte** (§5) · doc d'état à jour.
- **Feature (UI)** — respecte le design system / tokens · **smoke test de rendu** · pas de régression sur les écrans voisins · accessibilité minimum (`alt`, contraste) · capture si pertinent.
- **Bug fix** — **test de régression écrit AVANT le fix (TDD strict)** : il échoue d'abord, c'est ce qui prouve qu'il garde (§5) · tests verts après · stack trace originale notée dans le commit si pertinent.
- **Refactor** — tests existants verts (zéro changement de comportement) · pas de nouvelle dépendance injustifiée · taille du livrable stable (±5 %).
- **Data / contenu** — **test de structure** (champs requis, IDs uniques, références valides) · nommage cohérent (§7).
- **Docs / process** — markdown lisible · liens internes valides · CHANGELOG mis à jour si impact workflow.

---

## 4. Process de Pull Request

**Branche de travail → `dev`**
1. **Porte verte** (§5) sur la branche.
2. Push la branche (`git push -u origin <branche>`).
3. PR titrée **comme un commit** (`type(scope): …`).
4. Description = lien vers le ticket + changements clés + **comment tester** (étapes) + captures si UI. Une branche apporte ses tests, ou la PR dit pourquoi elle n'en a pas besoin.
5. Revue croisée (`/code-review` côté Claude) + auto-review du diff → **squash merge**.

**`dev → main` (release)**
1. `dev` porte une suite de features cohérente (pas un mix incomplet).
2. **🚦 Gate de release obligatoire** : porte verte sur `dev` + recette E2E du projet (§7) — sine qua non.
3. CHANGELOG : `[Unreleased] → [vX.Y.Z] - AAAA-MM-JJ`.
4. PR `dev → main` → **merge classique** → `git tag vX.Y.Z && git push --tags` → **resync `dev`** (§1).

---

## 5. Tests

**Pyramide** (unitaire → fonctionnel → scénarios → UI) :
- **Unitaire** — logique pure, testable sans mock (à côté du source).
- **Fonctionnel** — actions d'état / API (fichiers dédiés par domaine).
- **Scénarios** — multi-actions qui simulent un parcours réel.
- **UI** — rendu + navigation (smoke test obligatoire sur les flux critiques).

**Couverture visée** : logique pure ~90 % · le reste ≥ 80 % (au moins un test par action ou fonction publique) · UI = smoke + flux critiques.

**La porte — une seule commande avant toute fusion.**
- `porte` enchaîne tout ce qui doit être vert (lint/format, typage s'il y en a, tests, build, e2e) et **s'arrête à la première erreur**. Commande exacte : §7.
- On fusionne **parce que la porte est verte**, pas parce que le travail est fini — même pour un petit changement.
- Si un test échoue, on corrige le code — **jamais le test**, sauf à écrire pourquoi le test avait tort.
- La même commande tourne en local, dans le hook et en CI (§6) : ce qui est vert ici est vert là-bas.

**Une garde ne vaut que cassée au moins une fois.**
- Avant d'affirmer qu'un test protège quelque chose, le faire **échouer exprès** (casser le code ou l'attente), constater le rouge, puis rétablir.
- Obligatoire pour les **assertions négatives** (« n'apparaît pas », `toHaveCount(0)`, `not.toBeVisible()`, `assert x not in …`) : sur un mauvais sélecteur, elles passent à vide.

**E2E — Playwright (standard dès qu'il y a une interface).**
- Les parcours critiques se valident en **Playwright**, en vrai navigateur, et font partie de la porte.
- Tests **déterministes** : attendre les éléments (`await expect(locator)`), jamais de `waitForTimeout` fixe ; sélecteurs par rôle / `data-testid`, pas par classe CSS.
- Port paramétrable (`PORT_E2E`, §0) et serveur forcé en IPv4 (`127.0.0.1`) : sous Windows, `localhost` peut résoudre en `::1`.
- Parcours couverts et état du portage : §7.

---

## 6. Garde-fous (enforcement)

Les règles ci-dessus sont du *contexte* qu'un agent peut ne pas suivre. Pour les rendre **imposées** :

- **Pre-commit** : formatage + lint des fichiers indexés (outil et état : §7).
- **`/code-review`** (Claude Code) avant chaque PR — il lit ce fichier et `CLAUDE.md`.
- `💡 [proposé]` **Hook `PreToolUse`** pour imposer les règles dures : bloquer `git push` sur `main`/`dev`, refuser un nom de branche hors convention, et **exiger la porte verte avant un commit/merge**. (`/hooks` ou `.claude/settings.json`.)
- **CI** : exécute la même commande `porte` à chaque PR (état : §7).

---

## 7. Spécifique à ce dépôt (simulateur-immo)

> **La seule section à remplacer pour réutiliser ce fichier dans un autre projet.**

- **Objet** : simulateur d'acquisition et de pilotage patrimonial immobilier. Application web française, publique, gratuite, sans compte ni backend. Vercel publie `main` (https://simulateur-immo-snowy.vercel.app/).
- **Avant toute intervention, lire dans cet ordre** : `docs/INDEX.md` (état et inventaire) · `docs/CONTEXT.md` (thèse produit, modules) · `docs/02-architecture.md` (stack, structure, conventions) · `docs/03-spec-domaine.md` (formules, règles fiscales, invariants) · `docs/ADR.md` · `docs/TASKS.md` · `docs/RELEASES.md` (versions et portes).
- **Stack** : Next.js 16 (⚠️ voir le bloc en tête : APIs et conventions différentes de vos données d'entraînement), React 19, TypeScript, Tailwind v4, Vitest + fast-check, Playwright (deux profils).
- **Branche stable** : `main`, toujours déployable et verte. Intégration sur `dev`, créée depuis `main` le 17 novembre 2026. Le modèle du §1 est adopté par **ADR-024**, qui remplace le volet branches d'ADR-006 : fin des fusions `--no-ff` directes dans `main` et des branches `release/*`. La porte d'ADR-006, elle, reste.
- **IDs de ticket** : `ENG` (moteur), `FIS` (valeurs fiscales), `UI`, `VIZ`, `CNT` (contenu), `LEG` (légal), `TST` (portes et tests), `INF` (infra) + numéro. Branche : `feat/ENG-015-location-courte-duree`.
- **Porte de branche** : `npm run porte` = `typecheck` + `lint` + `test` (Vitest) + `build` + `e2e` (Playwright) — environ une minute, avant toute fusion dans `dev`.
- **Porte de version** (`TST-0X0`), sur `dev`, avant la PR `dev → main` : `npm run porte` **à froid** (`rm -rf .next`) · toute la suite enregistrée passe (elle est cumulative : aucun test n'est supprimé d'une version à l'autre) · compteurs relevés dans `docs/REGISTRE-TESTS.md` · **critère de sortie exécuté** (`tests/e2e/parcours-v0-X.spec.ts`) · après l'étiquette, `npm run verif-deploiement` (hors porte : elle interroge le site publié). Un compteur qui baisse sans ticket qui l'explique arrête la version. Détail : `docs/RELEASES.md` §3.
- **Gardes** : la règle du §5 s'applique ici **avec registre** — chaque garde est cassée une fois puis inscrite dans `docs/REGISTRE-TESTS.md` (ADR-019). Les agents ne touchent pas au registre : il se relève sur `dev`, après la dernière fusion (§0).
- **Copies parallèles** : `PORT_E2E=3102 npm run porte` par copie (3100 par défaut) ; les worktrees `.claude/worktrees/` sont exclus du lint et du suivi Git.
- **E2E sur `localhost`, pas `127.0.0.1` — exception au §5.** Next refuse en 403 les requêtes `/_next/*` venant d'une origine qu'il ne reconnaît pas : la page s'affiche mais ne s'hydrate jamais, et aucun contrôle ne répond. Ne pas « corriger » l'adresse de `playwright.config.mts` vers `127.0.0.1`. Les E2E tournent sur le build de production (`next start`), pas sur `next dev`.
- **CI** : aucune ; Vercel construit et publie. `💡 [proposé]` la même `porte` en GitHub Actions + protection de `main` et `dev` côté serveur (ADR-024).
- **Pre-commit** : aucun. `💡 [proposé]`.
- **Scopes de commit** : `moteur`, `fiscal`, `ui`, `viz`, `contenu`, `legal`, `tests`, `infra`, `docs`. La description **commence par l'ID du ticket** : `feat(moteur): ENG-015 — la courte durée, du tarif de nuit à la revente`. Messages **en français**.
- **Règles non négociables** :
  - **`src/core/` ne connaît pas l'interface** : aucun import de `react`, `next` ou d'une API navigateur ; fonctions pures uniquement. La règle de lint est là pour ça, ne pas la contourner.
  - **Le moteur crédit est gelé, le reste du moteur est ouvert.** `src/core/money.ts`, `src/core/fiscal/params.ts` et `src/core/credit/**` ont été écrits et vérifiés hors dépôt : leurs 95 tests et la traçabilité réglementaire de leurs commentaires ne se retouchent pas sans raison explicite. Les nouveaux répertoires — `compare/`, `prepayment/`, `markets/`, `aides/`, `types.ts` — s'écrivent normalement (ADR-004).
  - **Toute modification du moteur s'accompagne d'un test** ; les invariants de `docs/03-spec-domaine.md` continuent de passer.
  - **Aucune valeur réglementaire écrite en dur** : taux, seuils, abattements et barèmes vivent dans `src/core/fiscal/`, datés et sourcés.
  - **Aucune recommandation personnalisée** : le produit calcule des scénarios, l'utilisateur décide. Écrire « dans cette configuration, l'écart est de X », jamais « vous devriez ».
  - **Calculs en centimes entiers**, arrondi uniquement à l'affichage ; la dernière échéance solde exactement.
  - **Le sens des couleurs est fixe** : vert pour le capital et les gains, brique pour les intérêts et les coûts, violet pour l'assurance, bleu pour les marchés — identique dans tous les modules. **Ces quatre couleurs ne servent jamais d'ornement** : l'ornement se construit sur encre, papier, panneau, filet, accent et les jetons `--ornement-*` (ADR-021).
  - **L'interface a le droit d'être remarquable, jamais au prix de l'usage** : le dépôt a un second destinataire, le lecteur professionnel, et le volet design fait partie de ce qu'il démontre. Les bornes sont celles de `docs/01-brief-design.md` §10, dont les cinq contrôles du §10.6 — contraste dans les deux thèmes, clavier, doigt, `prefers-reduced-motion`, écran arrêté qui se tient seul.
  - **Les documents du dépôt font autorité sur tout outil de design** : une proposition qui touche une décision écrite devient un ADR, ou ne se fait pas. Ne jamais créer de `PRODUCT.md` ni de `DESIGN.md` — doublons de `docs/CONTEXT.md` et `docs/01-brief-design.md`, gardés par test (ADR-023).
- **Fin de session** : consigner dans `docs/TASKS.md` l'état d'avancement et les décisions prises ; toute décision d'architecture rejoint `docs/ADR.md` avec sa justification.
