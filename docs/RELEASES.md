# Versions, branches et portes de vérification

Ce document dit **quand une version sort**, **comment on y travaille**, et **ce qui
doit être vert avant de fusionner ou de poser une étiquette**.

Il se lit avec `docs/TASKS.md` (les tickets), `docs/REGISTRE-TESTS.md` (ce que la
suite couvre à chaque version) et `docs/ADR.md` (ADR-006 pour la porte, ADR-024 pour les branches).

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

### v0.1.1 — correctif de lisibilité

`UI-012` les options des listes déroulantes, illisibles à 1,21:1 — le navigateur peint
le fond de sa liste déroulée d'après `color-scheme`, qui n'est déclaré nulle part.

**Pourquoi un correctif et non un report en v0.2.0.** Un défaut de lisibilité sur un
champ de saisie n'attend pas la prochaine version de contenu : on ne peut pas choisir
ce qu'on ne peut pas lire. La correction tient en deux déclarations et ne touche à
aucun calcul.

**Critère de sortie.** Aucune option de liste déroulante ne descend sous 4,5:1, et la
règle est gardée par un test qui échoue si `color-scheme` retombe à `normal`.

### v0.2.0 — « Le crédit s'explique »

`UI-006` adaptation mobile — densité, cibles tactiles, ruban · `CNT-001` glossaire
relié aux infobulles · `CNT-002` fiche pédagogique du module crédit · `TST-020`
porte de version.

**Ajoutés en cours de route**, sur décision du 22 août 2026 : `ENG-008` cas de
référence vérifiés contre une source externe — le dernier ticket `ENG` ouvert — et
`FIS-005` la séparation des valeurs de loi et des hypothèses de marché. Ils sont
arrivés avec `UI-013` et `FIS-006`, découverts en les traitant.

**Critère de sortie.** Le même parcours qu'en v0.1, mené au pouce sur un téléphone,
sans jamais avoir à zoomer ni à viser — et un terme technique explicable partout où
il apparaît.

### v0.3.0 — « Acheter ou louer »

**Sortie le 23 août 2026.**

`FIS-007` valeurs fiscales de la phase 3 · `ENG-010` coûts de détention et flux
comparés · `ENG-011` portefeuille du locataire de référence · `ENG-012` scénario de
vente et exonération de la résidence principale · `ENG-014` plus-value hors résidence
principale · `ENG-016` prélèvements sociaux et résidence fiscale · `ENG-027` assemblage
de la cession · `VIZ-003` courbes et bandeau d'écart · `UI-007` moment de révélation ·
`TST-030` porte de version.

**Arrivés en cours de route**, aucun prévu, tous découverts en traitant les précédents :
`FIS-006` recoupement des dix-sept hypothèses de marché · `FIS-008` arrondi des assiettes
d'imposition · `ENG-028` assiette de la mainlevée · `UI-014` carte d'accueil restée
« à venir » · `UI-015` année d'ouverture · `TST-003` vérification du site publié.

**Le découpage en deux vagues, et pourquoi.** Quatre des tickets moteur attendent des
valeurs que `params.ts` ne porte pas : prélèvements sociaux, barèmes d'abattement pour
durée de détention, seuils des régimes micro. Les lancer en même temps que `FIS-007`
aurait produit quatre branches écrivant chacune sa version provisoire des mêmes
chiffres. La première vague est donc `FIS-007`, `ENG-010` et `ENG-011` — les deux
seuls tickets moteur sans dépendance fiscale ; la seconde suit sur un `main` qui porte
les valeurs.

**Critère de sortie.** Le site répond à la question qu'il pose, en montrant les
hypothèses qui portent la réponse et en laissant l'utilisateur les changer. Et il dit
en quoi sa réponse est fausse : la comparaison de coût mensuel ignore que la part de
capital d'une mensualité n'est pas une dépense, et le produit doit l'énoncer avant que
le lecteur ne s'en aperçoive.

### v0.3.1 — « Louer plutôt que vendre »

`FIS-010` valeurs des régimes locatifs, vérifiées à la source · `ENG-013` régimes
fiscaux locatifs · `ENG-029` scénario de location longue durée · `ENG-015` scénario
de location courte durée · `UI-024` étude du câblage des trois sorties ·
`UI-025` réalisation · `TST-031`.

**État au 25 août 2026, fin de journée.** Le moteur ET l'écran sont livrés :
`UI-024` (étude, ADR-022) puis `UI-025` ont câblé les trois sorties dans
`/comparaison/patrimoine` — le sélecteur, les récits locatifs datés à leurs
propres échéances, les alertes de seuil, les réserves. La garde « deux des trois
sorties non modélisées » s'est inversée en gardant son objet. **Reste `TST-031`**,
la porte de version : porte à froid, relevé des compteurs, critère de sortie
exécuté sur l'écran câblé, étiquette.

**Pourquoi ils sortent de v0.3.0.** Ils décrivent ce qu'on fait *après* avoir acheté,
et non le choix d'acheter — une autre question, posée par quelqu'un d'autre. Et c'est
le terrain le plus incertain du module : `docs/03-spec-domaine.md` §2 signale
lui-même que les abattements et seuils des régimes micro, notamment pour les meublés
de tourisme, ont changé récemment et doivent être vérifiés. Les charger sur la version
qui répond à « acheter ou louer » aurait retardé celle-ci au rythme de la plus
incertaine de ses parties.

### v0.4.0 — « Rembourser plus tôt »

`ENG-017`…`ENG-021`, `VIZ-004`, `VIZ-006`, `UI-008`, `TST-040`.

### v0.5.0 — « Pierre ou marchés »

`ENG-022`…`ENG-025`, `VIZ-005`, `UI-009`, `TST-050`.

### v0.6.0 — « Les aides »

`ENG-026`, `FIS-003`, `FIS-004`, `UI-010`, `TST-060`.

### v0.7.0 — « L'interface se montre »

La refonte du design, de A à Z. Décidée le 25 août 2026 en préparant le lancement :
la séquence retenue est fonctionnalités d'abord, refonte ensuite, mécanique du
lancement enfin. Elle absorbe la phase 8 (charte d'ornement et motifs d'interface,
huit tickets) et s'étend à l'ensemble des écrans. `TST-070` porte de version.

**Porte d'entrée : la revue des manques fonctionnels.** On fige le périmètre avant
de redessiner — les écrans refondus doivent couvrir le produit final, pas celui
d'une étape. Ce qui manque devient tickets avant que la refonte ne commence.

**Première conversation de la refonte** : délimiter ce qui se rediscute — mise en
page, typographie, ornement, thèmes — et ce que les règles actuelles protègent — la
sémantique des quatre couleurs, les contrastes gardés par tests, ADR-021. On peut y
déroger, mais par décision écrite, jamais par accident.

**L'outillage de cette version** : la compétence `impeccable`, adoptée le 25 août 2026
et subordonnée aux documents du dépôt — ADR-023. Elle s'invoque par sous-commande
nommée, elle n'écrit aucun document de design concurrent, et les cinq contrôles du
§10.6 jugent ce qu'elle rend.

**Critère de sortie.** Les cinq contrôles de `docs/01-brief-design.md` §10.6,
exécutés sur chaque écran : contraste dans les deux thèmes, clavier, doigt,
`prefers-reduced-motion`, et l'écran arrêté qui se tient seul. Et les parcours des
versions précédentes re-passés tels quels : une refonte qui casse un usage échoue
deux fois — comme produit, et comme démonstration.

### v1.0.0 — « Publiable sans réserve » — la version du lancement

Ce qui distingue v1.0 des v0.x n'est pas une fonctionnalité de plus : c'est que
**plus rien n'est en attente de vérification** — et que le site devient trouvable.

- `FIS-002` résolu — la liste des départements à taux réduit, à la source
- `FIS-005` arbitré — les barèmes de caution sortis de `params.ts`
- `LEG-003` — le dossier de relecture préparé, et `LEG-001` / `LEG-002` relus par
  un juriste. Délai externe : la relecture peut partir à tout moment sur signal
  d'Adrian, au plus tard au début de v0.7.0
- `LEG-004` — la licence du dépôt tranchée
- `FIS-009` — la procédure trimestrielle du taux d'usure en place
- `INF-005` mesure d'audience sans cookie, `INF-006` métadonnées de partage
- `INF-008` — la bascule `INDEXABLE`, l'inversion de la garde de
  `verif-deploiement` — qui vérifie aujourd'hui que le site n'est **pas**
  indexable —, le sitemap, la déclaration en Search Console
- `ENG-001`…`ENG-009` cochés après audit ticket par ticket
- `TST-100` porte de version v1.0

**L'annonce suit l'étiquette.** `CNT-004` — README du dépôt en vitrine, démo de
trois minutes, publications vers les deux destinataires — se prépare pendant v0.7
et v1.0, et se publie une fois l'étiquette posée et `verif-deploiement` vert sur le
site indexable.

---

## 2. Le modèle de branches

Aligné sur le socle commun des projets (`AGENTS.md` §1) par ADR-024, qui remplace le
modèle `--no-ff` direct sur `main` et les branches `release/*` d'ADR-006.

### Règles

- **`main` est toujours déployable et toujours verte.** Vercel la publie. On n'y arrive
  que par une PR `dev → main` — une release —, en merge classique, suivie d'une étiquette.
- **`dev` est la branche d'intégration.** Aucun commit direct sur `main` ni sur `dev`.
- **Une branche par ticket** ou par groupe de tickets qui n'a pas de sens séparé : elle
  part de `dev` et y revient par PR, en **squash merge**, après la porte de branche. Un
  lot livré reste un seul geste — un commit sur `dev`, qui s'annule d'un `git revert`.
- La branche est **supprimée après fusion**. Elle vit dans l'histoire, pas dans la
  liste des branches.

### Nommage

| Préfixe | Pour | Exemple |
| --- | --- | --- |
| `feat/` | un ticket qui ajoute quelque chose | `feat/UI-005-infobulles` |
| `fix/` | une correction | `fix/tableau-debordement` |
| `chore/` | outillage, dépendances, configuration, documentation | `chore/playwright-traces` |

Messages de commit : Conventional Commits, l'identifiant du ticket en tête de
description — `feat(ui): UI-005 — les infobulles sur les termes techniques`. Scopes :
`AGENTS.md` §7.

### Le cycle d'un ticket

```bash
git checkout dev && git pull
git checkout -b feat/UI-005-infobulles
```

Puis : écrire le code **et ses tests**, faire passer la porte de branche, pousser la
branche et ouvrir une PR vers `dev`, fusionnée en **squash**. La branche est supprimée
après fusion.

### Le cycle d'une version

Sur `dev`, une fois tous les tickets de la version fusionnés : la porte de version
(`TST-0X0`), la mise à jour du registre des tests, celle de `docs/TASKS.md` et du
journal. Aucune fonctionnalité nouvelle — si un manque apparaît, il devient un ticket
de la version suivante. Puis une PR `dev → main`, fusionnée en merge classique, et :

```bash
git checkout main && git pull
git tag -a v0.1.0 -m "Le crédit se calcule"
git push --follow-tags
git checkout dev && git merge --ff-only main && git push origin dev
```

---

## 3. Les portes de vérification

### Porte de branche — `TST-000`

**Avant toute fusion dans `dev`**, sans exception :

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

1. `npm run porte` sur `dev`, à froid — `rm -rf .next` d'abord, pour que
   le build ne parte pas d'un cache.
2. **Toute la suite enregistrée jusqu'à cette version passe.** Elle est cumulative
   par construction : aucun test n'est supprimé d'une version à l'autre. Le registre
   dit combien il y en avait, ce qui rend visible une suite qui aurait maigri.
3. Relever les compteurs réels et les inscrire dans `docs/REGISTRE-TESTS.md`.
4. **Exécuter le critère de sortie**, qui vit dans `tests/e2e/parcours-v0-X.spec.ts` :
   un parcours de bout en bout, de l'accueil au lien partagé. Un critère qu'on coche
   à la main est un critère qu'on coche de mémoire à la version suivante.
5. **Après l'étiquette, vérifier le déploiement.** La porte s'exécute sur un build
   local ; elle ne dit rien de ce que l'hébergeur sert réellement.

   ```bash
   npm run verif-deploiement
   ```

   Le site est publié à l'adresse **https://simulateur-immo-snowy.vercel.app/**, que
   Vercel met à jour à chaque poussée sur `main`. La commande interroge cette
   adresse ; une préproduction se vérifie en la passant :

   ```bash
   URL_DEPLOIEMENT=https://exemple.vercel.app npm run verif-deploiement
   ```

   Ce document a longtemps écrit que cette étape « n'est pas automatisable depuis le
   dépôt ». C'était vrai de son jugement, pas de ses faits. Quatre choses se
   vérifient mécaniquement et n'ont aucune raison d'être cochées de mémoire : le
   site n'est pas indexable, l'avertissement figure sur toute route qui montre un
   chiffre, les montants affichés sont ceux du dépôt — détecteur de déploiement
   périmé —, et un lien partagé redonne les mêmes chiffres. Voir
   `tests/deploiement/site-publie.spec.ts`.

   **Cette suite ne fait pas partie de `npm run porte`, et ne doit pas y entrer.** La
   porte doit rester hermétique : une porte qui interroge un tiers rougit quand
   l'hébergeur tousse, et une porte qui rougit pour des raisons étrangères au code
   finit par être ignorée — ce qui est la seule façon de la perdre.

   **Ce qui reste humain**, et qui l'était vraiment : regarder si l'écran est juste.
   Aucune de ces vérifications ne dit qu'une courbe est lisible ou qu'une phrase
   tombe bien.
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

### Plusieurs agents sur la même version

Éprouvé sur v0.2.0, cinq chantiers menés de front. Ce qui a marché, et ce qui a coûté.

**Un port de test par copie**, `PORT_E2E`, sinon deux portes lisent le même serveur.
**Une branche par ticket**, et un périmètre de fichiers écrit dans le brief : qui
possède quel fichier, et à quoi il ne touche pas. Les collisions restantes ont toutes
été rattrapées par le typage — trois fois en une journée, une hypothèse de marché
passée là où on attendait une valeur de loi.

**Les agents ne touchent pas à `docs/REGISTRE-TESTS.md`.** Un compteur relevé sur une
branche est périmé dès la fusion suivante : sur v0.2.0, le registre s'est retrouvé
avec quatre relevés empilés, tous faux sauf un. Ce n'était pas seulement coûteux en
conflits, c'était **inexact**. Les compteurs se relèvent une fois, sur `dev`, après
la dernière fusion.

**Les entrées de journal, elles, restent de leur main**, ajoutées en fin de fichier :
c'est le seul endroit où ce qu'ils ont trouvé se raconte de première main. Le conflit
en fin de fichier se résout en gardant les deux côtés.

**Numéroter les ADR est un point de contention.** Deux branches ont pris `ADR-008` le
même jour. Le brief annonce désormais le dernier numéro attribué ; en cas de collision,
celui qui est déjà fusionné et cité depuis le code garde son numéro.
