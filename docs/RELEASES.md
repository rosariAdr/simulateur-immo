# Versions, branches et portes de vérification

Ce document dit **quand une version sort**, **comment on y travaille**, et **ce qui
doit être vert avant de fusionner ou de poser une étiquette**.

Il se lit avec `docs/TASKS.md` (les tickets), `docs/REGISTRE-TESTS.md` (ce que la
suite couvre à chaque version) et `docs/ADR.md` (ADR-006, pourquoi ce modèle).

---

## 1. Le découpage en versions

Chaque version est un **produit utilisable**, pas un lot de tickets. Le critère de
sortie est écrit du point de vue de quelqu'un qui arrive sur le site sans rien savoir.

### v0.1.0 — « Le crédit se calcule »

Le simulateur de crédit, publiable et compréhensible sans accompagnement.

| Ticket | Objet | État |
| --- | --- | --- |
| `ENG-001`…`ENG-009` | Moteur crédit | écrit, 129 tests — audit de cochage à faire |
| `UI-000`…`UI-004` | Galerie, grille, état d'URL, indicateurs | fait |
| `VIZ-001`, `VIZ-002` | Ruban et tableau d'amortissement | fait |
| `UI-005` | Infobulles sur les termes techniques | **reste** |
| `LEG-002` | Avertissement visible sur l'absence de conseil | **reste** |
| `CNT-003` | Page d'accueil énonçant la thèse | **reste** |
| `LEG-001` | Mentions légales et confidentialité, version publiable | **reste** |
| `TST-010` | Porte de version v0.1 | **reste** |

**Critère de sortie.** Un inconnu arrive sur `/`, comprend en trois phrases ce que
fait le site, simule un crédit, partage le lien de son scénario — et sait, sans
avoir à chercher, qu'il ne reçoit pas un conseil.

**Hors périmètre, assumé.** Le mobile est *lisible* mais pas *travaillé* : le ruban y
tient des barres de dix pixels et le tableau défile dans son cadre. C'est `UI-006`,
et c'est v0.2. La liste des départements à taux réduit (`FIS-002`) reste ouverte ;
elle n'affecte pas le module crédit, qui ne calcule pas les droits de mutation.

### v0.2.0 — « Le crédit s'explique »

`UI-006` adaptation mobile — densité, cibles tactiles, ruban · `CNT-001` glossaire
relié aux infobulles · `CNT-002` fiches pédagogiques du module crédit · `TST-020`
porte de version.

**Critère de sortie.** Le même parcours qu'en v0.1, mené au pouce sur un téléphone,
sans jamais avoir à zoomer ni à viser.

### v0.3.0 — « Acheter ou louer »

`ENG-010`…`ENG-016`, `VIZ-003`, `UI-007`, `TST-030`.

**Critère de sortie.** Le site répond à la question qu'il pose, en montrant les
hypothèses qui portent la réponse et en laissant l'utilisateur les changer.

### v0.4.0 — « Rembourser plus tôt »

`ENG-017`…`ENG-021`, `VIZ-004`, `VIZ-006`, `UI-008`, `TST-040`.

### v0.5.0 — « Pierre ou marchés »

`ENG-022`…`ENG-025`, `VIZ-005`, `UI-009`, `TST-050`.

### v0.6.0 — « Les aides »

`ENG-026`, `FIS-003`, `FIS-004`, `UI-010`, `TST-060`.

### v1.0.0 — « Publiable sans réserve »

Ce qui distingue v1.0 des v0.x n'est pas une fonctionnalité de plus : c'est que
**plus rien n'est en attente de vérification**.

- `FIS-002` résolu — la liste des départements à taux réduit, à la source
- `FIS-005` arbitré — les barèmes de caution sortis de `params.ts`
- `LEG-001` et `LEG-002` relus par un juriste
- `INF-005` mesure d'audience sans cookie, `INF-006` métadonnées de partage
- `ENG-001`…`ENG-009` cochés après audit ticket par ticket
- `TST-100` porte de version v1.0

---

## 2. Le modèle de branches

### Règles

- **`main` est toujours déployable et toujours verte.** Vercel la publie.
- **Aucun commit direct sur `main`**, hormis la correction d'un document de release.
- **Une branche par ticket** ou par groupe de tickets qui n'a pas de sens séparé.
- **Fusion en `--no-ff`.** L'histoire garde la trace de la branche : on voit d'un
  coup d'œil ce qui a été livré ensemble, et on peut annuler un lot d'un seul geste.
- La branche est **supprimée après fusion**. Elle vit dans l'histoire, pas dans la
  liste des branches.

### Nommage

| Préfixe | Pour | Exemple |
| --- | --- | --- |
| `feat/` | un ticket qui ajoute quelque chose | `feat/UI-005-infobulles` |
| `fix/` | une correction | `fix/tableau-debordement` |
| `docs/` | documentation seule | `docs/versions-et-branches` |
| `chore/` | outillage, dépendances, configuration | `chore/playwright-traces` |
| `release/` | préparation d'une version | `release/v0.1.0` |

### Le cycle d'un ticket

```bash
git checkout main && git pull
git checkout -b feat/UI-005-infobulles
```

Puis : écrire le code **et ses tests**, faire passer la porte de branche, et

```bash
git checkout main
git merge --no-ff feat/UI-005-infobulles
git branch -d feat/UI-005-infobulles
git push
```

### Le cycle d'une version

```bash
git checkout -b release/v0.1.0
```

Sur cette branche : la porte de version (`TST-0X0`), la mise à jour du registre des
tests, celle de `docs/TASKS.md` et du journal. Aucune fonctionnalité nouvelle — si
un manque apparaît, il devient un ticket de la version suivante.

```bash
git checkout main
git merge --no-ff release/v0.1.0
git tag -a v0.1.0 -m "Le crédit se calcule"
git push --follow-tags
```

---

## 3. Les portes de vérification

### Porte de branche — `TST-000`

**Avant toute fusion dans `main`**, sans exception :

```bash
npm run porte
```

Elle enchaîne `typecheck`, `lint`, `test` (Vitest), `build` et `e2e` (Playwright sur
les deux profils). Elle s'arrête à la première erreur.

Une branche ne se fusionne pas parce que le travail est fini, mais parce que la porte
est verte. Si un test échoue, on corrige le code — jamais le test, sauf à écrire
pourquoi le test avait tort.

**Et la branche apporte ses propres tests.** Un ticket sans test nouveau se justifie
par écrit dans le message de fusion, ou ne se fusionne pas.

### Porte de version — `TST-0X0`

**Avant toute étiquette**, en plus de la porte de branche :

1. `npm run porte` sur `release/vX.Y.Z`, à froid — `rm -rf .next` d'abord, pour que
   le build ne parte pas d'un cache.
2. **Toute la suite enregistrée jusqu'à cette version passe.** Elle est cumulative
   par construction : aucun test n'est supprimé d'une version à l'autre. Le registre
   dit combien il y en avait, ce qui rend visible une suite qui aurait maigri.
3. Relever les compteurs réels et les inscrire dans `docs/REGISTRE-TESTS.md`.
4. **Exécuter le critère de sortie**, qui vit dans `tests/e2e/parcours-v0-X.spec.ts` :
   un parcours de bout en bout, de l'accueil au lien partagé. Un critère qu'on coche
   à la main est un critère qu'on coche de mémoire à la version suivante.
5. **Après l'étiquette, vérifier le déploiement.** La porte s'exécute sur un build
   local ; elle ne dit rien de ce que l'hébergeur sert réellement. Ouvrir le site
   déployé et refaire le parcours à la main est la dernière étape, et elle n'est pas
   automatisable depuis le dépôt.
6. Consigner dans `docs/TASKS.md` : ce qui sort, ce qui est reporté, et pourquoi.

Un compteur qui a baissé sans qu'un ticket l'explique arrête la version.

---

## 4. Notes d'exploitation

### `typecheck` génère ses propres types

`src/app/layout.tsx` emploie `LayoutProps`, un type **généré** par Next dans
`.next/types` — il n'existe pas dans le dépôt. Sur un clone neuf, ou après le
`rm -rf .next` qu'exige la porte de version, `tsc --noEmit` échouait donc d'entrée
sur `Cannot find name 'LayoutProps'`.

`npm run typecheck` lance désormais `next typegen` avant `tsc`. La porte est
reproductible à froid, ce qui est toute sa raison d'être : une porte qui suppose un
cache ne vérifie que la machine qui l'a déjà lancée.

### Plusieurs copies en parallèle

Chaque copie du dépôt qui vérifie sa branche fixe son port :

```bash
PORT_E2E=3102 npm run porte
```

`reuseExistingServer` réutilise sinon le serveur d'une autre copie, et la porte lit
des tests verts sur un code qui n'est pas le sien.

Les copies créées par `git worktree` sous `.claude/worktrees/` sont exclues du lint et
du suivi Git. Sans cette exclusion, `npm run lint` remonte les fichiers d'une autre
branche — y compris son `.next`.
