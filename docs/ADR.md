# Décisions d'architecture

Une entrée par décision structurante : le contexte qui l'a rendue nécessaire, la décision,
ses conséquences acceptées, et ce qui la garde. Une décision qu'on ne peut pas faire respecter
automatiquement n'est qu'une intention.

---

## ADR-001 — Frontière stricte entre `src/core/` et la couche interface

**Date** : 19 août 2026 · **Statut** : adoptée · **Tickets** : `INF-003`

### Contexte

Le produit est un simulateur : sa valeur tient entièrement à la justesse de ses calculs.
Un chiffre faux sur une mensualité ou un TAEG ruine la crédibilité de l'ensemble, et le
public visé — des primo-accédants engageant vingt ans de leur vie — n'a aucun moyen de
détecter l'erreur.

L'échec classique du calculateur web est connu : la logique métier se disperse dans les
composants. Un arrondi ici, un cas particulier là, une condition dans un `useMemo`. Au bout
de quelques mois, plus personne ne sait où un chiffre est produit, et le vérifier demande
de monter l'interface et de cliquer.

Le moteur crédit existe déjà — 95 tests, écrit et vérifié hors dépôt, puis copié dans
`src/core/`. Il est aujourd'hui pur par construction. La question n'est pas de le rendre
pur, mais de l'empêcher de cesser de l'être.

### Décision

`src/core/` ne contient que des fonctions pures TypeScript. **Aucun import de `react`,
`react-dom`, `next` ou de leurs sous-modules. Aucun accès au DOM, à `window`, au stockage
local ou au réseau.** Le moteur reçoit des entrées, rend des sorties.

Corollaires déjà en vigueur :

- Les montants sont des entiers de centimes ; l'arrondi est une convention nommée, passée
  en paramètre, jamais un effet de bord.
- Les valeurs d'origine réglementaire vivent dans `src/core/fiscal/params.ts`, datées et
  sourcées. Les règles sont du code, les valeurs sont des données.

### Justification

- **Le moteur est testable exhaustivement**, sans monter un composant. C'est ce qui rend
  possibles les tests de propriétés sur des milliers d'entrées aléatoires — l'approche qui
  a déjà trouvé un taux dénormal annulant le dénominateur de l'annuité, et corrigé la formule
  fermée du levier de remboursement anticipé, fausse de plus de 10 % dans sa version courante.
- **Un désaccord sur un chiffre se résout dans un test**, pas dans le navigateur. C'est la
  différence entre une discussion qui converge et une qui s'enlise.
- **Le moteur est réutilisable** hors du site : script d'export, génération de contenus
  pédagogiques, API ultérieure. Aucun de ces usages ne doit exiger un environnement React.
- **La frontière protège l'inverse aussi** : l'interface ne peut pas « corriger » discrètement
  un résultat qui lui déplaît, puisqu'elle ne peut pas atteindre le calcul.

### Ce qui la garde

Une règle ESLint `no-restricted-imports`, en override ciblé sur `src/core/**`
(`eslint.config.mjs`). Elle rejette `react`, `react-dom`, `next`, leurs sous-modules, ainsi
que `nuqs` et `recharts` — deux dépendances d'interface qu'un raccourci pourrait faire
remonter dans le moteur. Le message d'erreur renvoie à `docs/02-architecture.md` §1 et
indique l'issue : déplacer le code dans `src/components/` ou `src/app/`, ou faire remonter
la valeur par un paramètre.

Vérifiée à l'adoption : une sonde important `react`, `next/link` et `import type ... from "next"`
déclenche bien trois erreurs. Les imports de type sont couverts, alors qu'ils sont effacés à
la compilation — parce qu'un `import type` signale la même dépendance conceptuelle et sert
d'antichambre à l'import réel.

**Cette règle ne se contourne pas.** Pas de `eslint-disable` sur cette ligne. Si le moteur
semble avoir besoin de React, c'est que la frontière est mal placée : la donnée manquante
doit devenir un paramètre d'entrée.

### Conséquences acceptées

- Certaines valeurs devront être passées explicitement au moteur plutôt que lues depuis un
  contexte — le millésime fiscal applicable, la convention d'arrondi, la date de référence.
  Verbosité assumée : elle rend le calcul reproductible et le test déterministe.
- Une couche d'adaptation sera nécessaire entre l'état d'URL (`nuqs` + `zod`) et les types
  du domaine. Elle vit côté interface, jamais dans `src/core/`.
- Les évolutions futures — `compare/`, `prepayment/`, `markets/`, `aides/` — héritent de la
  contrainte sans discussion.

---

## ADR-002 — Les jetons de design sont nommés par rôle et gardés par un test

**Date** : 20 août 2026 · **Statut** : adoptée · **Tickets** : `INF-004`

### Contexte

Le brief de design fixe un système de couleur **sémantique avant d'être esthétique** :
chaque couleur porte un sens identique dans tous les modules. Vert pour le capital et
les gains, brique pour les intérêts et les coûts, violet pour l'assurance, bleu pour
les marchés.

Deux façons de rater cela, toutes deux courantes. Nommer les jetons par leur couleur
— `--vert-500` — ce qui rend le nom faux le jour où la teinte change et autorise
n'importe quel usage. Et choisir les valeurs à l'œil, ce qui produit des palettes
qui s'effondrent sous déficience de la vision des couleurs ou passent sous les
seuils de contraste sans que personne ne s'en aperçoive.

Le second risque est réel ici : les quatre couleurs sémantiques sont **aussi** les
couleurs de séries des graphiques. Elles se touchent dans le ruban d'amortissement.
Deux d'entre elles, le violet de l'assurance et le bleu des marchés, sont voisines.

### Décision

**Les jetons sont nommés par leur rôle, jamais par leur couleur.** `--capital`, pas
`--vert`. Le nom décrit ce que la valeur signifie, pas ce à quoi elle ressemble.

**Les valeurs sont calculées, pas choisies.** Chaque couleur sémantique passe cinq
contrôles : bande de clarté OKLCH, plancher de chroma, séparation sous protanopie et
deutéranopie simulées (Machado–Oliveira–Fernandes 2009, sévérité 1,0), plancher en
vision normale, contraste sur la surface.

**Le remplissage et le texte sont deux jetons distincts.** `--capital` remplit une
forme et satisfait 3:1. `--capital-texte` porte du texte et satisfait 4,5:1. Quatre
des couleurs de série n'atteignent pas le seuil de texte : les confondre produirait
un texte illisible sans que rien ne le signale.

**Le thème sombre est choisi, pas dérivé.** Ses valeurs sont des pas distincts,
validés contre la surface sombre.

### Justification

Deux résultats de la validation montrent pourquoi le calcul n'est pas un ornement.

Le violet **ne peut pas** être aussi sombre que l'« ardoise » du brief : assombri,
il tombe à ΔE 11,8 du bleu marchés en vision normale, sous le plancher de 15. Deux
couleurs qu'un lecteur sans déficience visuelle confondrait déjà.

La palette **ne peut pas** être plus désaturée : une variante à chroma 0,095 échoue
au plancher, en dessous duquel une teinte lit comme un gris et cesse de porter
l'identité. Les valeurs retenues sont posées exactement sur ce plancher, au plus
près de l'intention « sourd » du brief.

Aucun de ces deux murs n'était visible à l'œil.

### Ce qui la garde

`src/app/__tests__/design-tokens.test.ts` lit `globals.css` — et non une copie des
valeurs — puis vérifie chaque seuil. Il échoue aussi si le thème sombre devient
identique au thème clair, signe qu'une inversion automatique aurait remplacé le
choix.

Vérifié à l'adoption : remplacer `--assurance-texte` par la couleur de série
correspondante fait échouer la suite avec `#846cad sur #f1f3f6 : 3.99:1`.

### Conséquences acceptées

- Ajouter une couleur au système n'est pas une modification d'une ligne : il faut la
  faire passer par la validation. C'est le coût voulu.
- Un ajustement purement esthétique peut être refusé par le test. Dans ce cas, c'est
  la valeur qu'on rééchelonne, pas le seuil qu'on abaisse.
- La palette plafonne à quatre couleurs de série. Une cinquième série ne prend pas
  une teinte inventée : elle se replie dans « autres », ou passe en petits multiples.

---

## ADR-003 — Le thème par défaut est sombre, et le texte a ses propres jetons

**Date** : 21 août 2026 · **Statut** : adoptée · **Tickets** : `INF-004`

### Contexte

La première charte posait un papier gris très clair, `#f1f3f6`. À l'usage il a été
jugé trop proche du blanc et trop peu engagé — « blanc beige », sans registre. La
demande était d'aller vers un gris ou un bleu foncé, quelque chose qui évoque la
sérénité et la finance.

Deux lectures s'offraient : rendre les surfaces claires simplement plus colorées, ou
basculer le produit en sombre. Elles ne donnent pas le même produit, et le coût de se
tromper était de redessiner huit planches. Les deux ont donc été construites et
comparées sur pièce — « bleu-gris franc » sur papier `#dfe5ed`, « ardoise nocturne »
sur papier `#161c24`.

### Décision

**Le thème par défaut est l'ardoise nocturne.** Le thème clair reste complet et
validé, servi aux navigateurs qui le demandent via `prefers-color-scheme: light`. Sa
surface est le bleu-gris franc, pas l'ancien gris presque blanc, qui est abandonné.

**Le remplissage et le texte deviennent deux familles de jetons distinctes** —
`--marches` et `--marches-texte`, et ainsi de suite pour les quatre rôles.

### Justification de la seconde décision

Elle n'est pas esthétique, elle est arithmétique.

Une couleur qui remplit une forme doit atteindre 3:1 sur sa surface ; une couleur qui
porte du texte doit atteindre 4,5:1. En thème clair, deux des quatre couleurs
satisfaisaient les deux seuils avec la même valeur — coïncidence, pas identité.

Sur la surface sombre, la coïncidence disparaît. Forcer les quatre couleurs de série
à tenir 4,5:1 les remonte toutes dans une bande de clarté étroite, où l'assurance et
les marchés se rejoignent : **ΔE 14,4 en vision normale, sous le plancher de 15**.
Une recherche exhaustive sur 48 combinaisons de clarté, chroma et teinte n'a produit
aucun quadruplet satisfaisant les deux rôles à la fois.

La séparation en deux familles n'est donc pas un raffinement : c'est la seule sortie.

### Conséquences acceptées

- Huit jetons sémantiques au lieu de quatre, et la discipline de choisir le bon selon
  qu'on remplit ou qu'on écrit. Le test le vérifie sur le cas le plus tranché : la
  couleur de série des marchés ne tient que 3,3:1 sur la surface sombre.
- Le thème clair doit être maintenu en parallèle, sans jamais être dérivé par
  inversion — une inversion automatique recasserait exactement la séparation que
  cette décision protège.
- Les planches de design restent authorées en clair et le sombre en est dérivé par
  script. C'est un héritage de la phase de comparaison, pas une hiérarchie.

### Ce qui la garde

`src/app/__tests__/design-tokens.test.ts`, étendu : il vérifie les deux thèmes, les
quinze jetons de structure, la lisibilité de l'encre sur panneau, infobulle, fond
d'erreur et survol, et il échoue si quelqu'un réunifie une couleur de série avec sa
variante texte.

Vérifié à l'adoption : ramener `--marches-texte` à `#2170b0` fait échouer deux tests,
dont celui qui nomme la divergence.

---

## ADR-004 — Le moteur crédit est gelé, les nouveaux répertoires sont ouverts

**Date** : 22 août 2026 · **Statut** : adoptée

### Contexte

Le moteur crédit a été écrit et vérifié hors du dépôt, puis copié dans `src/core/`.
Pour protéger ce travail — 95 tests, et une traçabilité réglementaire portée par les
commentaires JSDoc — une consigne interdisait toute modification de `src/core/`,
quelle qu'elle soit.

Elle a tenu, y compris dans les cas où il aurait été commode de la contourner : la
recherche du 21 août a produit des conclusions sur trois valeurs réglementaires
sans que `fiscal/params.ts` soit touché.

Mais les phases 3 à 5 demandent `compare/`, `prepayment/` et `markets/` — une
vingtaine de modules qui n'existent pas. Une interdiction portant sur tout
`src/core/` les rendait inécrivables. La règle protégeait un acquis ; elle bloquait
désormais tout ce qui reste à faire.

### Décision

**Gelés**, ne se modifient qu'avec une raison explicite et un test qui la porte :

- `src/core/money.ts`
- `src/core/fiscal/params.ts`
- `src/core/credit/**`

**Ouverts**, s'écrivent comme n'importe quel code du dépôt, sous les règles
habituelles :

- `src/core/compare/`, `src/core/prepayment/`, `src/core/markets/`, `src/core/aides/`
- `src/core/types.ts`

### Justification

La consigne d'origine visait un risque précis : qu'un fichier vérifié soit modifié
par mégarde, et que sa justesse se perde sans que personne le remarque. Ce risque
porte sur les fichiers déjà écrits, pas sur ceux qui n'existent pas encore.

Étendre l'interdiction aux répertoires vides ne protégeait donc rien — elle rendait
seulement le projet infaisable.

### Ce qui ne change pas

- La frontière moteur / interface reste gardée par ESLint sur tout `src/core/**`,
  répertoires nouveaux compris. Voir ADR-001.
- **Toute modification du moteur s'accompagne d'un test.** Les nouveaux modules
  naissent avec leurs cas de référence et leurs invariants, comme le crédit.
- Les valeurs réglementaires restent dans `fiscal/params.ts`, datées et sourcées.

### Conséquences acceptées

- Le gel repose sur une convention écrite, pas sur un mécanisme. Une règle de lint ne
  sait pas distinguer « modifier » de « créer ». Le garde-fou réel est la revue :
  un diff qui touche `credit/` sans raison énoncée doit être refusé.
- Les conclusions de `docs/reference/FIS-002-verification.md` restent à reporter dans
  `params.ts`, qui est gelé. Ce report est désormais possible, mais il demande une
  raison explicite — il en a une, et un test qui fige les valeurs retenues.

## ADR-005 — Le curseur de lecture ne part pas dans l'URL

**Date** : 22 août 2026 · **Statut** : adoptée

### Contexte

Le ruban d'amortissement (`VIZ-001`) et le tableau (`VIZ-002`) partagent un curseur :
l'année qu'on est en train de lire. Le tableau porte en plus une granularité, par
année ou par mois.

L'état d'URL est déjà en place (ADR-001, `src/lib/scenario.ts`) et il aurait accueilli
ces deux valeurs sans effort : deux clés de plus, `an` et `gr`. La planche de design
prévoyait d'ailleurs `annee_lue` parmi ses propriétés.

### Décision

**L'URL décrit un crédit, pas la façon dont on le regardait.** Le curseur de lecture
et la granularité du tableau restent des états locaux de composant.

Ce qui entre dans l'URL : ce qui change un chiffre. Ce qui n'y entre pas : ce qui
change un cadrage.

### Justification

La promesse du produit est qu'un lien partagé redonne exactement les mêmes chiffres.
Elle repose sur une lecture immédiate de l'adresse : chaque clé présente est un
paramètre du scénario, et une URL nue décrit le scénario par défaut — c'est ce que
vérifie le test « une URL nue ne porte aucun paramètre ».

Mélanger des paramètres de calcul et des positions de lecture dans le même espace de
noms abîme cette lecture. `?px=465000&an=14` ne se lit plus d'un coup d'œil : il faut
savoir lesquelles des deux clés comptent. Et le jour où l'on partagerait un lien après
avoir fait défiler le tableau, l'adresse porterait une trace de ce geste sans que
personne l'ait voulu.

### Conséquences acceptées

- On ne peut pas partager « regarde l'année 14 de ce crédit ». C'est une perte réelle,
  et petite : le curseur ouvre déjà sur l'année où le crédit bascule, et le
  destinataire d'un lien cherche d'abord ses propres chiffres.
- Recharger la page ramène le curseur à son ouverture. Acceptable pour une position de
  lecture ; inacceptable pour un paramètre, d'où la distinction.
- Si un module ultérieur devait vraiment partager une position — un versement anticipé
  pointé sur la frise de `VIZ-004`, par exemple — ce ne serait plus une position de
  lecture mais une hypothèse du scénario, et elle entrerait dans l'URL à ce titre.

## ADR-006 — Une porte de vérification, pas une intention de vérifier

**Date** : 22 août 2026 · **Statut** : adoptée

### Contexte

Le projet avançait par sessions, chacune validée à la main : lancer `typecheck`, puis
`lint`, puis Vitest, puis le build, puis Playwright, et lire les sorties. Cela a tenu
tant qu'une session livrait un lot cohérent.

Deux faits ont montré que cela ne tiendrait plus.

Le premier : la garde « la page ne défile pas latéralement » est passée pendant deux
exécutions complètes de la suite, puis a échoué. Le défaut, lui, était constant —
cent vingt-quatre montants rognés sur le profil mobile. Le test dépendait de l'état
du cache de polices au moment de la mesure. Une suite verte ne prouvait donc rien
sur ce point précis, et rien ne l'avait signalé.

Le second : rien ne distinguait un commit qui avait passé la suite d'un commit qui ne
l'avait pas passée. L'histoire de `main` était plate, et l'intention de vérifier
n'était écrite nulle part.

### Décision

- **`npm run porte`** enchaîne les cinq vérifications et s'arrête à la première
  erreur. C'est une commande, pas une liste dans un document.
- **Une branche par ticket**, fusionnée en `--no-ff` après la porte. L'histoire garde
  la trace du lot livré.
- **Une porte de version** en plus de la porte de branche : la suite à froid, le
  relevé des compteurs dans un registre, et la confrontation du critère de sortie au
  site déployé.
- **Toute branche apporte ses tests**, ou dit par écrit dans le message de fusion
  pourquoi elle n'en a pas besoin.

### Justification

Le registre des compteurs ne sert pas à se féliciter d'un nombre. Il sert à rendre
visible une suite qui **maigrit** : un test supprimé pour faire passer une version
laisse une trace, un test qui n'a jamais existé n'en laisse aucune.

La règle « on corrige le code, jamais le test » avait déjà été énoncée dans le brief
d'origine. Elle prend ici sa forme opérationnelle : le test qui a tort se corrige,
mais la correction s'explique.

### Conséquences acceptées

- La porte dure environ une minute. C'est long pour une correction d'une ligne, et
  c'est le prix de ne pas avoir à se demander si on l'a lancée.
- Le modèle repose sur une convention, pas sur une protection de branche côté
  GitHub. Tant que le dépôt n'a qu'un auteur, la convention suffit ; le jour où il en
  aura deux, il faudra une règle côté serveur.
- Les tests de bout en bout tournent sur un build de production. La porte reconstruit
  donc le site à chaque passage.

## ADR-007 — Le contenu pédagogique est une donnée typée, pas du texte dans un composant

**Date** : 22 août 2026 · **Statut** : adoptée

### Contexte

La charte fixe une règle nette pour les infobulles : « une bulle sur fond laiton donne
deux phrases — jamais plus » (`docs/06-design-system.md` §8). Elle tenait à la seule
relecture.

Au moment d'ouvrir `UI-005`, onze contenus existaient, écrits en JSX dans les
composants qui les affichent. **Deux en comptaient trois** — le TAEG et la base de
calcul de l'assurance. Personne ne l'avait vu, et rien ne pouvait le voir : une règle
de forme n'a aucune prise sur un fragment de JSX.

Trois autres citaient une valeur réglementaire en toutes lettres — « vingt-cinq ans »,
« 10 % du montant emprunté », « le plafond réglementaire est de 35 % ». Le jour où le
HCSF change un seuil, `params.ts` change, les chiffres affichés changent, et les
infobulles continuent d'énoncer l'ancien droit avec aplomb.

### Décision

**Un répertoire `src/content/`**, distinct des composants, qui porte le texte destiné
à l'utilisateur.

**Une entrée n'est pas une chaîne libre** : c'est `{ terme, accroche, suite }`, où
`accroche` et `suite` sont contraintes **au type** à n'être qu'une phrase, terminée
par une ponctuation. Le mécanisme tient en deux types conditionnels sur les littéraux
de gabarit : une ponctuation finale suivie d'une espace fait basculer le type à
`never`, et l'appel ne compile plus.

**Une valeur réglementaire ne s'écrit pas dans le texte** : l'entrée pose un jeton
`{plafond}` et le reçoit par `avec()`, dont les clés attendues sont elles aussi
extraites du littéral. En oublier une ne compile pas.

**La pastille reçoit une entrée, pas des enfants.** Il n'existe donc aucun chemin par
lequel du texte libre atteindrait une bulle.

### Justification

Une contrainte de forme vérifiée par un test se contourne sans le vouloir : on ajoute
une phrase, le test passe au rouge, on ajuste le test. Portée par le type, elle se
présente au moment où l'on écrit, avant même d'avoir enregistré le fichier — et elle
**force le resserrement** au lieu de le signaler après coup. Les deux contenus à trois
phrases ont été réécrits en deux ; l'information perdue — « aucune banque n'a le droit
de prêter au-delà » — a trouvé sa vraie place, l'entrée « taux d'usure », qui
n'existait pas.

C'est la logique déjà retenue pour les montants (ADR-001, les centimes entiers portés
par un type nommé) : rendre l'erreur inexprimable plutôt que la détecter.

### Conséquences acceptées

- **Aucune abréviation pointée dans une bulle.** « art. L314-6 » serait lu comme une
  coupure de phrase et ne compilerait pas. Les références réglementaires restent dans
  les commentaires du moteur, où elles étaient déjà.
- **Le texte doit rester littéral.** Une chaîne assemblée à l'exécution s'effondre au
  type `string` et se fait refuser — c'est précisément ce qui interdit d'y interpoler
  un seuil au lieu de passer par un jeton.
- Deux familles à maintenir, `GLOSSAIRE` et `GLOSSAIRE_PARAMETRE`. Le prix de la
  distinction est un test d'exécution qui vérifie qu'aucune entrée n'est rangée dans
  la mauvaise.
- Le glossaire long de `CNT-001` viendra se brancher ici : la bulle donne la
  définition, la fiche donnera le raisonnement.

## ADR-008 — La loi et le marché ne vivent pas dans le même fichier

**Date** : 22 août 2026 · **Statut** : adoptée

### Contexte

`src/core/fiscal/params.ts` a été conçu pour une chose : contenir les valeurs **que
la loi fixe**. Chacune porte un `@source` renvoyant à un article, et sa mise à jour
est un fait daté — la loi de finances change, on change la valeur. C'est la promesse
d'ADR-001 : « les règles sont du code, les valeurs sont des données ».

Les coûts de garantie y avaient été rangés faute d'un meilleur endroit. Ils n'ont
pourtant pas cette nature : **aucun texte ne les fixe.** Un organisme de caution
publie une grille commerciale, progressive, qu'il révise quand il veut. Une
inscription hypothécaire mêle des émoluments réglementés, une taxe et des débours.
Ce sont des ordres de grandeur observés.

Trois conséquences, dont une seule aurait suffi.

**Rien ne les distinguait du reste.** Un lecteur de `params.ts` ne pouvait pas savoir,
sans lire les commentaires, quelles valeurs opposer à une banque et lesquelles ne
sont qu'une estimation de notre part.

**Leur `TODO_VERIFY` était insoluble.** Vérifier « à la source » suppose une source
qui fasse autorité. Il n'y en a pas ; il n'y a que des grilles divergentes, datées du
jour où on les a lues. Ce marqueur allait rester là indéfiniment, et sa présence
affaiblissait les trois autres, qui portent sur du droit et se vérifient vraiment.

**Elles n'auraient jamais dû être immuables.** Une valeur négociable a vocation à
devenir un paramètre que l'utilisateur ajuste. Enfermée dans le millésime fiscal,
elle ne le pouvait pas.

### Décision

- `src/core/assumptions/market.ts` accueille les hypothèses de marché. Chaque valeur
  y porte son **intervalle observé**, sa **fiabilité** — `observee` ou `estimee` — et
  sa **provenance** en une phrase montrable à l'utilisateur.
- `guaranteeCost` reçoit ces hypothèses et non plus un millésime fiscal. Le type
  interdit désormais de confondre les deux.
- `CreditPlanInput` gagne un `marketAssumptions?` optionnel : l'appelant peut les
  substituer, ce qu'aucune valeur réglementaire ne permettrait.
- `params.ts` ne contient plus que des valeurs dont un article peut être cité.

### Ce qui a été touché malgré le gel

`fiscal/params.ts` et `credit/plan.ts` sont gelés (ADR-004). La modification était la
raison d'être du ticket `FIS-005`, et elle est accompagnée de ses tests, comme ADR-004
l'exige. `guaranteeCost` change de signature ; `buildCreditPlan` garde la sienne, pour
que les tests de référence existants n'aient pas à être retouchés.

**Le déplacement ne corrige aucun chiffre.** Les cinq valeurs sont reprises à
l'identique, et un test le garde : un remaniement qui corrige au passage est un
remaniement qu'on ne peut plus relire. Les recouper sur des grilles publiées reste à
faire, et c'est désormais un travail borné.

### Une conséquence qu'on n'attendait pas

En qualifiant ces coûts d'hypothèses de marché, la décision a rendu intenable
l'étiquette du champ « Garantie » dans l'interface : il était présenté comme
**réglementaire**, « ce qui s'impose et ne se discute pas », alors que
`docs/CONTEXT.md` §2 range le choix de la garantie parmi les paramètres
**négociables** depuis le premier jour.

C'est l'erreur dans le pire sens : elle disait à quelqu'un qu'il n'a pas la main sur
ce qu'il peut précisément négocier — exactement ce que ce produit existe pour
corriger. Corrigé ici, et gardé par un test.

### Conséquences acceptées

- Deux fichiers de valeurs au lieu d'un, et un import de plus dans `plan.ts`.
- La fiabilité des cinq entrées est `estimee`. C'est un aveu, pas un objectif : le
  travail de recoupement reste entier, mais il est désormais nommé et localisé.
---

## ADR-009 — Le texte long du glossaire est une donnée séparée, pas un champ de plus sur `Entree`

**Date** : 22 août 2026 · **Statut** : adoptée · **Tickets** : `CNT-001`

### Contexte

ADR-007 a fait de l'entrée d'infobulle une donnée typée : `{ terme, accroche, suite }`, où
chaque phrase est contrainte **au type** à n'être qu'une phrase, sans valeur réglementaire
écrite en clair. Sa conclusion se lit encore dans le fichier — « il n'existe donc aucun
chemin par lequel du texte libre atteindrait une bulle ».

`CNT-001` demande davantage. Une bulle donne deux phrases ; une entrée de glossaire peut
dire d'où vient la règle, ce qu'elle implique, et ce qu'elle ne dit pas. Ce contenu-là est
long, en plusieurs paragraphes, et n'a aucune raison de tenir en une phrase.

Deux façons de le loger. **Étendre `Entree`** d'un champ long optionnel — une donnée, un
terme, tout au même endroit. Ou **séparer** : deux enregistrements distincts, reliés par
la clé.

### Décision

**Les deux contenus sont deux données distinctes.** `src/content/glossaire.ts` garde les
entrées de bulle, inchangées dans leur type. `src/content/developpements.ts` porte le
texte long, le thème et les renvois, dans un enregistrement indexé par les **mêmes clés**.

`Entree` n'a pas gagné un champ.

### Justification

**Un champ optionnel de texte libre rouvrirait le chemin qu'ADR-007 a fermé.** La pastille
reçoit une `Entree`. Lui donner un objet qui porte, en plus des deux phrases contraintes,
un tableau de paragraphes libres, c'est faire entrer le texte non contraint dans la bulle
— au sens propre : il est dans l'objet qu'elle a en main. Rien n'empêcherait un rendu
ultérieur de l'afficher, « en repliable », « au survol prolongé », « sur les écrans
larges ». La contrainte des deux phrases cesserait d'être une propriété de la donnée pour
redevenir une discipline de composant, c'est-à-dire précisément ce qu'ADR-007 a refusé.

**La séparation n'affaiblit rien, parce que la clé suffit.** Le lien entre les deux
contenus n'a pas besoin d'être un champ : il est déjà porté par le nom de l'entrée, et
`DEVELOPPEMENTS` satisfait `Record<CleGlossaire, Developpement>`. Ajouter un terme au
glossaire sans écrire son développement **arrête `npm run typecheck`**. L'oubli est donc
aussi impossible qu'avec un champ obligatoire, et l'exhaustivité tient en une ligne au
lieu de quarante-huit.

**Les deux contenus n'ont pas les mêmes contraintes, et ce n'est pas un détail.** La bulle
est contrainte en **forme** — deux phrases, deux cents caractères — parce qu'elle s'affiche
dans un cadre de 264 px posé sur un champ de saisie. Le développement est contraint en
**fond** — aucune recommandation, aucune valeur réglementaire écrite à la main — mais pas
en forme. Un type unique portant les deux régimes appliquerait le plus faible aux deux.

**Un troisième contenu arrive.** `CNT-002` écrit des fiches par module, plus longues encore
et illustrées de chiffres calculés. La séparation les accueille sans toucher au type de la
bulle ; un champ `long` aurait appelé un champ `fiche`, puis un champ `exemple`.

### Ce qui la garde

- `DEVELOPPEMENTS … satisfies Readonly<Record<CleGlossaire, Developpement>>`, doublé d'un
  test d'exécution qui **nomme** la clé manquante — le message de TypeScript sur un objet
  de quarante-huit entrées ne la nomme pas.
- La signature de `developpement()` : `Jetons<P[number]> extends CleValeur`. Un jeton que
  `src/content/valeurs.ts` ne connaît pas ne compile pas. C'est la transposition au texte
  long de ce qu'`avec()` fait pour les bulles.
- `src/content/__tests__/developpements.test.ts` pour ce que le type ne peut pas dire : un
  renvoi vers une clé inexistante, un thème vide, une valeur réglementaire écrite à la
  main, une formule de recommandation, un développement qui n'en dit pas plus que sa bulle.

Vérifié à l'adoption. Écrire « 35 % » à la place de `{plafondEndettement}` dans le
développement du HCSF fait échouer « `hcsf` n'écrit aucune valeur réglementaire à la
main ». Retirer l'entrée `taxeFonciere` de `DEVELOPPEMENTS` fait échouer
`npm run typecheck` sur `TS1360` et rougir le test d'exhaustivité, qui donne le nom.

### Conséquences acceptées

- **Deux fichiers à ouvrir pour écrire un terme complet.** Coût réel, assumé : c'est le
  prix de deux régimes de contrainte distincts.
- **Le thème et la famille vivent du côté du texte long**, pas de l'entrée. C'est cohérent
  — ils servent à la page, pas à la bulle — mais cela signifie qu'une bulle ne sait pas à
  quelle famille son terme appartient. Le champ de saisie, lui, le sait déjà.
- **`famille` est optionnelle.** Une mensualité ne se négocie pas, elle se calcule :
  étiqueter de force les termes qui désignent un résultat rendrait l'étiquette
  insignifiante là où elle porte le sens.

---

## ADR-010 — L'ancre d'un terme se calcule, elle ne s'écrit pas

**Date** : 22 août 2026 · **Statut** : adoptée · **Tickets** : `CNT-001`

### Contexte

Chaque infobulle porte désormais un lien vers l'entrée correspondante de `/glossaire`. Ce
lien a besoin d'une ancre, et la page a besoin de la même. Deux endroits, une valeur.

### Décision

L'ancre est **dérivée du terme** par une fonction pure, `ancre()`, employée aux deux bouts :
par la pastille pour fabriquer le lien, par la page pour poser l'`id`. Aucune ancre n'est
écrite à la main nulle part.

### Justification

Une ancre saisie deux fois finit par diverger du titre qu'elle désigne. Le symptôme est le
pire qui soit : le lien ne casse pas, il mène simplement en haut de la page, et rien — ni
type, ni compilation, ni erreur 404 — ne le signale. L'utilisateur clique pour en savoir
plus et atterrit sur un titre général.

Le calcul déplace le risque vers un endroit où un test peut le voir : deux termes qui se
réduiraient à la même ancre, ce qui ferait tomber le lien d'une bulle sur la définition
d'une autre.

### Ce qui la garde

`src/content/__tests__/developpements.test.ts` vérifie que les quarante-huit ancres sont
non vides, de forme `[a-z0-9-]`, et **toutes distinctes**. `tests/e2e/glossaire.spec.ts`
relève les liens de **toutes** les bulles de `/credit` et `/composants`, puis vérifie sur
`/glossaire` que chaque ancre visée existe bel et bien.

Vérifié à l'adoption : renommer « abattement pour durée de détention » en « plus value
immobilière » — un terme distinct de « plus-value immobilière », donc accepté par la garde
d'unicité des termes — fait échouer l'unicité des ancres, « expected 47 to be 48 ».

### Conséquences acceptées

- Renommer un terme change son ancre, donc casse les liens externes qui pointaient dessus.
  Sans effet tant que le site est en `noindex` ; à reconsidérer le jour où le glossaire
  est indexé, probablement par une table de redirections plutôt que par des ancres figées.

---

## ADR-011 — Le portefeuille du locataire de référence ne descend pas sous zéro

**Date** : 22 août 2026 · **Statut** : adoptée · **Tickets** : `ENG-011`

### Contexte

La comparaison « acheter ou louer » ne vaut que si les deux camps font le **même effort
financier**. Le locataire de référence place donc l'apport, puis chaque mois l'écart entre
le coût de propriétaire et son loyer. Cet écart change de signe : certains mois — un loyer
de marché élevé, un taux bas, ou simplement le prêt arrivé à son terme — être propriétaire
coûte moins cher que louer, et le locataire doit **retirer** de son portefeuille pour que
l'effort reste identique.

D'où une question qu'aucun simulateur ne pose : que se passe-t-il quand le portefeuille
tombe à zéro et que le retrait demandé dépasse ce qui reste ?

Trois réponses étaient possibles. Laisser la valeur devenir négative. Refuser l'entrée.
Tronquer le retrait.

### Décision

**Le retrait est tronqué à la valeur disponible. La valeur reste à zéro, jamais négative.
Le manque est rendu explicitement**, mois par mois (`nonFinance`) et par un `moisEpuisement`
qui désigne la première rupture.

`construirePortefeuille` refuse en revanche ce qui n'a pas de sens : un apport négatif — on
ne place pas une dette —, un montant qui n'est pas un entier de centimes, et un rendement
annuel de −100 % ou moins, dont la racine douzième n'est pas définie.

### Justification

**Une valeur négative n'est pas un portefeuille, c'est un crédit à la consommation.** Il a
son taux, sa durée, son assurance, dont ce module ne sait rien. Lui appliquer le rendement
des marchés produirait deux absurdités selon le signe : à rendement positif la dette
*rapporterait*, à rendement négatif elle s'effacerait toute seule. Dans les deux cas le
chiffre final resterait **plausible**, et il serait faux — le pire défaut possible pour un
outil dont toute la valeur tient à la justesse de ses chiffres.

**Refuser l'entrée aurait déplacé le problème sans le traiter.** La série de versements
n'est pas saisie par l'utilisateur : elle est produite par `detention.ts` à partir du crédit
et du loyer. Une erreur y serait incompréhensible, et surviendrait précisément dans les
configurations les plus intéressantes à montrer.

**Tronquer expose la rupture au lieu de la lisser.** À partir de `moisEpuisement`,
l'hypothèse « effort d'épargne identique » ne tient plus, et la comparaison cesse d'être
une comparaison. L'interface doit le dire — c'est `docs/CONTEXT.md` §7, « se terminer par
ses limites » — plutôt que d'afficher un écart final comme si de rien n'était.

Un mode « découvert » supposerait un taux d'emprunt en paramètre. Ce serait un autre modèle,
pas une option de celui-ci.

### Deux conventions qui vont avec, et qui engagent la suite

**L'arrondi se fait chaque mois, pas à l'affichage.** Le gain mensuel est arrondi au centime
et s'ajoute à un solde entier, comme les intérêts d'une échéance bancaire. L'invariant
`capital versé + gains = valeur` tient alors **par construction** : c'est la même série
d'entiers lue de deux façons. Porter le solde en flottant et n'arrondir qu'à la lecture
donnerait trois nombres arrondis séparément, dont l'un ne serait pas la somme des deux
autres — et un utilisateur qui additionne deux chiffres affichés sans retomber sur le
troisième a raison de ne plus croire le reste. Prix payé, mesuré : **moins d'un centime**
d'écart avec la capitalisation en flottant sur 300 mois, soit 1,6 × 10⁻⁸ du résultat.

**Le rendement mensuel est l'équivalent actuariel, pas le taux proportionnel.** `money.ts`
divise par douze parce qu'un contrat de prêt français le stipule (art. R314-3 du Code de la
consommation) ; un rendement de portefeuille n'a pas de contrat, et « 5 % par an » y signifie
5 % au bout d'un an. Diviser par douze puis capitaliser douze fois rendrait 5,1162 %. Sur
300 mois, l'écart atteint **2,08 % de capital final**, et il joue dans le sens qui flatte
les marchés face à la pierre. Le module emploie donc `(1 + rₐ)^(1/12) − 1`, et le dit à
l'endroit où quelqu'un serait tenté de réutiliser `monthlyRate`.

### Ce qui la garde

`src/core/compare/__tests__/portefeuille.test.ts`, 42 tests. Les invariants sous `fast-check`
portent la décision : la valeur n'est jamais négative, le manque n'apparaît qu'à partir du
mois d'épuisement, le versement réalisé ne dépasse jamais le demandé et leur écart vaut
exactement le manque, et `capital versé + gains = valeur` **au centime, à chaque échéance**.

Vérifié par sabotage, trois fois. Retirer la troncature : 4 tests rouges, dont l'invariant
de positivité. Porter le solde en flottant : 8 rouges, dont `capital + gains = valeur` et
l'intégrité des centimes. Remplacer l'équivalence actuarielle par le taux proportionnel :
7 rouges, dont « douze mois à 12 % rendent exactement 12 % ».

### Conséquences acceptées

- `capitalVerse` mesure l'effort **réel**, pas l'effort voulu : il ne compte pas ce que le
  portefeuille n'a pas pu financer. C'est ce qui garde l'égalité avec la valeur, et cela
  veut dire qu'au-delà de `moisEpuisement` les deux camps ne font plus le même effort. Le
  module le signale ; il ne le corrige pas, parce qu'il n'y a rien à corriger.
- Une troncature au mois *m* change la trajectoire de tous les mois suivants. Le résultat
  reste déterministe et reproductible, mais il n'est plus interprétable comme « ce qu'aurait
  fait un locataire » — seulement comme « où la comparaison a cessé de tenir ».
## ADR-012 — Le coût de détention se lit deux fois, et les deux côtés s'indexent

**Date** : 22 août 2026 · **Statut** : adoptée · **Tickets** : `ENG-010`

### Contexte

`docs/03-spec-domaine.md` §2 demande, au niveau simple, deux séries annuelles et une
année de croisement — et il énonce dans la foulée que cette comparaison **est faussée** :
la part de capital de la mensualité n'est pas une dépense, et la vue « fonds perdus »
corrige en ne retenant que ce qui est consommé.

La façon la plus économique de tenir cet énoncé aurait été de produire une série et de
laisser l'interface soustraire le capital quand elle affiche l'autre vue. C'est ce que
fait à peu près tout comparateur en ligne, et c'est là que le biais s'installe : la vue
corrective devient une option, un onglet secondaire, quelque chose qu'on affiche
**après** avoir montré le chiffre qui frappe.

Deuxième question, plus discrète et plus dangereuse. La spécification ne demande
d'indexer **que le loyer**. Un module qui s'y tient à la lettre révise le loyer de 2 %
par an et laisse la taxe foncière, les charges et la provision pour travaux figées à
leur valeur de la première année, pendant vingt ou trente ans.

### Décision

**Deux lectures, produites ensemble, du même détail.**

- `decaissement` : tout ce qui sort du compte, part de capital comprise.
- `fondsPerdus` : le même total moins la part de capital.

Elles ne sont pas deux calculs mais deux agrégations des mêmes postes mensuels. Leur
différence est exactement `capital`, et un test de propriété le vérifie sur chaque mois
de chaque scénario. `ComparaisonDetention.croisement` porte **deux** années, une par
lecture, et non une seule.

Chez le locataire, `fondsPerdus` est rigoureusement égal à `decaissement`. Le champ est
redondant et il reste : cette égalité **est** l'enseignement, et la faire disparaître du
type reviendrait à la faire disparaître de l'interface.

**Les deux côtés sont indexés.** `IndexationsDetention` porte trois vitesses — loyer,
taxe foncière, charges — dont les valeurs par défaut viennent de
`src/core/assumptions/market.ts`. Une indexation nulle se demande explicitement ; elle
ne s'obtient plus par omission.

### Justification

**Sur les deux lectures.** Chacune prise seule ment, et dans un sens différent. Le seul
décaissement fait de l'achat un gouffre : il compte comme dépensé l'argent qui change
simplement de poche. Les seuls fonds perdus font paraître l'achat presque gratuit : ils
oublient que la somme immobilisée n'est plus disponible pour autre chose, et que le
niveau simple ne mesure aucun coût d'opportunité. Les afficher ensemble est le seul choix
qui n'oriente pas.

Le cas de référence B du module tient ce propos en deux nombres. Même ménage, même mois :
il décaisse 240 € de plus que son voisin locataire, et il consomme 360 € de moins. Les
deux sont vrais. Aucun ne suffit.

**Sur l'indexation symétrique.** N'indexer que le loyer n'est pas une simplification,
c'est un biais orienté. Il fait grandir une seule des deux courbes, donc avance l'année
de croisement, donc favorise l'achat — toujours dans le même sens, jamais dans l'autre.
Sur trente ans, un point d'écart d'indexation déplace le croisement de plusieurs années.

C'est exactement le genre d'erreur que ce produit existe pour dénoncer : un défaut de
modélisation qui a l'air d'un détail technique et qui produit une conclusion.

### Ce qui la garde

- `src/core/compare/__tests__/detention.test.ts` — sept cas calculés à la main dans leurs
  commentaires, dont le cas B, qui échoue si les deux lectures se confondent.
- `src/core/compare/__tests__/detention-invariants.test.ts` — sous `fast-check` : les
  fonds perdus ne dépassent jamais le décaissement, leur écart vaut exactement la part de
  capital, le croisement des fonds perdus n'arrive jamais après celui du décaissement.
- `src/core/compare/__tests__/hypotheses-detention.test.ts` — garde **comportementale** :
  un relevé de marché substitué aux valeurs improbables doit se retrouver dans le
  résultat. Une valeur par défaut recopiée en dur dans le calcul y rougit.

Vérifié à l'adoption, gardes cassées puis rétablies : supprimer la soustraction du capital
fait rougir cinq tests ; supprimer le résidu de la ventilation annuelle, sept ; retirer le
plancher à zéro de l'indexation, deux.

### Conséquences acceptées

- **Une indexation de plus à saisir, donc à expliquer.** L'interface doit présenter trois
  vitesses au lieu d'une, et dire d'où viennent leurs valeurs par défaut. C'est le prix
  d'un défaut qu'on ne peut pas corriger silencieusement.
- **Quatre hypothèses de marché de plus à recouper.** Elles rejoignent `FIS-006`, toutes
  en fiabilité `estimee`, et la dérive de la taxe foncière est la moins assurée des
  quatre : son second moteur est le taux voté par une collectivité, qui n'est pas une
  grandeur prévisible.
- **Le croisement des fonds perdus se lira comme un seuil de rentabilité.** Il n'en est
  pas un : ni appréciation du bien, ni frais de revente, ni coût d'opportunité de l'apport
  n'entrent au niveau simple. Le commentaire de tête de `detention.ts` le dit ; l'interface
  devra le dire aussi, faute de quoi ce module produira exactement le raccourci qu'il
  corrige.
- **Les frais d'entrée sont un paramètre optionnel, à zéro par défaut.** C'est ce que
  décrit le niveau simple de la spécification, et c'est optimiste : sur un bien ancien,
  huit pour cent de frais jamais récupérés reculent le croisement de plusieurs années.
  L'interface qui les laisse à zéro doit le dire.

---

## ADR-013 — Deux abattements, deux assiettes, et un forfait qui ne s'applique pas tout seul

**Date** : 23 août 2026 · **Statut** : adoptée · **Tickets** : `ENG-014`, `ENG-016`

### Contexte

Le calcul de la plus-value immobilière hors résidence principale fait intervenir deux
barèmes d'abattement pour durée de détention qui **ne coïncident pas** : celui de l'impôt
sur le revenu (CGI, art. 150 VC) éteint l'imposition au terme de la 22e année ; celui des
prélèvements sociaux (CSS, art. L136-7) ne l'éteint qu'au terme de la 30e. Entre les deux,
un vendeur ne doit plus un euro d'impôt sur le revenu et doit encore des prélèvements
sociaux sur 72 % de sa plus-value à 22 ans, part qui décroît ensuite de 9 points par an.

La forme naturelle d'une sortie de moteur est une « plus-value imposable » unique, dont
l'appelant tirerait les deux impositions. Elle est fausse huit années sur trente, et
plausible pendant les vingt-deux autres — le pire profil de défaut pour un simulateur.

Deuxième sujet, signalé comme dette par `FIS-007`. Les deux forfaits de majoration du prix
d'acquisition — 7,5 % de frais, 15 % de travaux — ont des conditions d'application que
`params.ts` porte dans ses commentaires et **pas dans sa structure**. Le forfait travaux
suppose un immeuble bâti détenu depuis plus de cinq ans ; le forfait de frais est fermé aux
immeubles détenus par un fonds de placement immobilier. Rien n'empêchait un consommateur
distrait de majorer de 15 % un terrain acheté deux ans plus tôt.

### Décision

**Le module produit deux assiettes nommées, jamais une.** `baseImpotRevenu` et
`basePrelevementsSociaux` sont deux champs distincts de `ImpositionPlusValue`, chacun
accompagné de son `AbattementApplique` — taux, montant, année d'exonération totale du
barème employé. Aucun champ « plus-value imposable » n'existe : le nom serait ambigu, donc
il n'est pas écrit.

Corollaire retenu et non évident : **la surtaxe est assise sur l'assiette de l'impôt sur le
revenu**, celle des articles 150 V à 150 VD auxquels renvoie l'art. 1609 nonies G. Elle
s'éteint donc à 22 ans, avec l'impôt sur le revenu, et non à 30 avec les prélèvements
sociaux.

**Un forfait ne s'applique qu'au travers d'un jeton, et le jeton est revérifié.** Deux
verrous, et il en faut deux :

1. *Par le type.* `MajorationTravaux` et `MajorationFraisAcquisition` sont des unions
   discriminées dont la branche `forfait` porte un jeton marqué par un `unique symbol`
   privé au module. Le symbole n'est pas exporté : aucun appelant ne peut nommer la
   propriété, donc aucun ne peut fabriquer le jeton. Les seuls producteurs sont
   `travauxForfaitaires()` et `fraisAcquisitionForfaitaires()`, qui lèvent
   `ForfaitHorsChampError` hors du champ d'application.
2. *À l'exécution.* Le jeton atteste qu'un forfait a été ouvert **pour une** situation, pas
   que c'est celle du calcul. `calculerPlusValue` revérifie donc les conditions contre
   l'entrée effectivement soumise. Sans ce second contrôle, ouvrir le forfait sur un bien
   bâti détenu vingt ans suffirait à majorer un terrain détenu deux ans.

Un troisième point, purement pratique : **la durée de détention entre en mois**, pas en
années révolues. Le forfait travaux suppose « plus de cinq ans » ; 60 et 71 mois valent
tous deux 5 années révolues et n'ouvrent pas les mêmes droits. Les abattements, eux, se
comptent en années révolues, dérivées par `anneesRevolues()`.

**Ce que le module ne modélise pas est une sortie, pas un commentaire.** `nonModelise` est
un tableau de phrases françaises, jamais vide, joint à chaque résultat et destiné à être
affiché. Il grossit selon la configuration : le taux réduit EEE/Suisse y ajoute deux
réserves, un terrain à bâtir une, une moins-value une autre.

### Justification

**Sur les deux assiettes.** Un moteur qui rend un chiffre ambigu délègue la
désambiguïsation à l'interface, c'est-à-dire à l'endroit qui n'a ni les tests ni le
contexte pour la faire. Le coût de deux champs est nul ; le coût d'une confusion est un
impôt faux de plusieurs milliers d'euros, dans le sens qui rassure.

**Sur le double verrou.** Le type seul est insuffisant et le contrôle d'exécution seul est
tardif. Ensemble, ils rendent l'erreur difficile à écrire et impossible à exécuter. Le
choix de lever plutôt que de retomber silencieusement sur les frais réels suit `money.ts`,
qui lève sur une saisie illisible : un simulateur qui corrige tout seul produit un chiffre
vraisemblable et faux.

**Sur `nonModelise`.** Le positionnement du produit est de dire d'où viennent ses chiffres.
La spécification écrit elle-même que le régime des non-résidents « doit être vérifié cas
par cas ». Un module qui applique une règle à deux branches sans le dire laisserait croire
à une exhaustivité qu'il n'a pas ; le champ rend la réserve indétachable du résultat.

### Ce qui la garde

- `src/core/compare/__tests__/plus-value.test.ts` — cas de référence à 22, 29 et 30 ans, le
  calcul écrit en commentaire ; continuité de la surtaxe à ses neuf frontières internes, et
  sa discontinuité voulue au seuil des 50 000 € constatée telle quelle ; sous `fast-check`,
  l'assiette sociale toujours supérieure ou égale à l'assiette fiscale, et strictement
  supérieure entre la 6e et la 29e année.
- Une propriété tire le jeton et la situation de calcul indépendamment : à chaque tirage
  hors champ, le calcul doit refuser plutôt que majorer.
- `src/core/fiscal/__tests__/params-plus-value.test.ts`, écrit par `FIS-007`, garde la
  donnée ; celui-ci garde sa lecture. Les deux sont nécessaires : un barème juste lu de
  travers rend un chiffre faux, et l'inverse aussi.

Vérifié à l'adoption, trois gardes cassées puis rétablies : appliquer le barème fiscal aux
prélèvements sociaux fait rougir six tests ; retirer le contrôle d'exécution du forfait,
deux ; annuler la décote de lissage de la surtaxe, trois.

### Conséquences acceptées

- **L'interface doit présenter deux assiettes.** C'est une ligne de plus dans une
  restitution déjà dense, et c'est la seule façon d'expliquer pourquoi un vendeur à 25 ans
  de détention paie encore quelque chose.
- **Un forfait hors champ lève.** L'appelant qui laisse l'utilisateur choisir le mode
  forfaitaire doit interroger `motifExclusionForfaitTravaux` /
  `motifExclusionForfaitFraisAcquisition` pour griser l'option et en dire la raison, plutôt
  que de rattraper une exception.
- **Les amortissements déduits en location meublée au réel ne sont pas réintégrés.** La
  plus-value imposable d'un bien loué meublé au réel est donc sous-estimée par ce module.
  Le point est déclaré dans `nonModelise` et attend `ENG-013`, qui traitera les régimes
  locatifs et saura ce qui a été amorti.
- **L'abattement exceptionnel de l'art. 150 VE n'est pas appliqué**, bien que ses valeurs
  soient dans `params.ts` : il dépend d'un engagement de démolition ou de reconstruction
  pris par l'**acquéreur**, que le simulateur ne connaît pas. Les valeurs restent
  disponibles pour un ticket ultérieur.
## ADR-014 — Le décompte d'une vente sort poste par poste, et son total peut être négatif

**Date** : 23 août 2026 · **Statut** : adoptée · **Tickets** : `ENG-012`

### Contexte

`docs/03-spec-domaine.md` §2 décrit le scénario de vente à l'horizon en une phrase :
« Valeur appréciée, moins les frais d'agence, le capital restant dû, les indemnités de
remboursement anticipé et la mainlevée éventuelle, plus la restitution du fonds de
garantie. » Six postes, deux dans un sens et quatre dans l'autre.

Trois questions se posaient, et aucune des trois n'avait de réponse évidente.

**La forme de la sortie.** Un simulateur qui rend « produit net : 80 800 € » a répondu à
la question posée et n'a rien enseigné. Or deux des six postes — l'indemnité de
remboursement anticipé et la mainlevée — sont ignorés de la plupart des vendeurs jusqu'au
décompte du notaire, et ils se chiffrent en milliers d'euros.

**Le signe du total.** Une revente précoce sur un marché qui a reculé peut ne pas couvrir
le capital restant dû. Le vendeur doit alors apporter de l'argent pour que la vente se
fasse. Fallait-il rendre ce nombre, ou le ramener à zéro ?

**La frontière fiscale.** L'exonération de la résidence principale est acquise sans
condition de durée de détention. Le cas imposable, lui, demande deux barèmes d'abattement
aux cadences différentes, une surtaxe à dix tranches et un taux de prélèvements sociaux
qui dépend de la résidence fiscale — un module entier, `ENG-014`, écrit en parallèle.
Comment écrire le premier sans préempter le second ni le mettre à zéro en silence ?

### Décision

**1. Chaque poste sort séparément ; le total n'est que leur somme.** `PostesDeVente`
porte les sept montants — les six de la spécification, plus l'impôt — en valeur absolue,
le sens de chacun étant fixé par la formule de `produitNet` et non par un signe porté par
le montant. Un test de propriété vérifie sur chaque tirage que le total est exactement la
somme algébrique des postes rendus.

**2. Le produit net n'a pas de plancher.** Il est négatif quand la vente ne couvre pas ce
qu'elle doit solder, et il est rendu tel quel. Les postes pris isolément, eux, sont
plafonnés à zéro : une commission négative ne veut rien dire, un total négatif si.

**3. Le régime fiscal est une union discriminée, pas un champ optionnel.**

```
type RegimePlusValue =
  | { nature: "residence-principale"; moisDepuisDemenagement?: number }
  | { nature: "imposable"; impotTotal: Cents; origine?: string }
```

Ce module calcule la première branche — un zéro, et c'est un zéro *calculé*. La seconde
reçoit un montant déjà établi par `plus-value.ts`. Le module ne l'importe pas.

**4. L'appréciation du bien n'a pas de valeur par défaut.** Le bloc `vente` de
`assumptions/market.ts` publie un intervalle sans valeur centrale — le type
`FourchetteObservee`, celui-là même qui existait déjà pour les taux d'assurance — et le
champ est obligatoire dans l'entrée du calcul. La commission d'agence, elle, est une
`HypotheseChiffree` avec sa valeur centrale, et sert de défaut.

### Justification

**Sur le décompte détaillé.** L'écart entre une vente garantie par une caution et la même
vente sous hypothèque tient en deux lignes qui vont dans des sens opposés : la restitution
du fonds mutuel d'un côté, la mainlevée de l'autre. Sur le cas de référence E, l'écart
fait 2 575 € — invisible dans deux totaux, évident dans deux tableaux. C'est exactement le
genre de chiffre que le produit existe pour montrer.

**Sur le total négatif.** C'est le seul cas où le résultat change une décision. Le
ramener à zéro reviendrait à dire au vendeur qu'il ne gagne rien, alors qu'il doit
*apporter* vingt-cinq mille euros. Un simulateur qui tronque son résultat là où il devient
inconfortable ne se trompe pas par accident.

**Sur l'union discriminée.** Un champ `impot?: Cents` aurait confondu deux situations
opposées : « aucun impôt n'est dû » et « personne n'a renseigné l'impôt ». La première est
un résultat, la seconde un oubli, et l'oubli se serait lu comme un résultat. L'union rend
l'oubli impossible à écrire : on ne peut pas choisir `imposable` sans fournir un montant.

Le cas du bien déjà quitté a été traité dans le même esprit. Au-delà du délai normal de
vente — doctrine BOFiP, lu dans `params.ts` et non écrit en dur —, le module ne maintient
pas l'exonération d'office, ne la refuse pas d'office, et surtout n'invente pas un impôt
qu'il ne sait pas calculer : il pose `acquise: false` et rend une réserve rédigée, qui
renvoie au régime imposable.

**Sur l'appréciation sans valeur centrale.** Retenir un chiffre reviendrait à publier une
prévision de marché, ce que `docs/CONTEXT.md` §8 exclut. Le mécanisme est le même que pour
`RENDEMENTS_NETS_OBSERVES` dans `portefeuille.ts` : l'absence de `valeur` dans le type
*empêche* le calcul d'avoir un défaut, elle ne se contente pas de le décourager.

### Ce qui la garde

- `src/core/compare/__tests__/vente.test.ts` — six cas de référence calculés à la main
  dans leurs commentaires : horizon zéro comptant, revente immédiate sous hypothèque,
  vente qui ne couvre pas le capital restant dû, vente au terme, caution contre
  hypothèque, capitalisation de l'appréciation.
- Le même fichier, sous `fast-check` : le produit net est la somme algébrique des postes ;
  aucun poste n'est négatif ni fractionnaire ; l'indemnité respecte les deux plafonds de
  l'art. R313-25 ; passé le terme, ni indemnité ni mainlevée ; le produit net croît avec
  l'appréciation ; l'impôt fourni se retranche à l'euro près ; la résidence principale
  occupée n'est jamais imposée, **quelle que soit la durée de détention**.
- Le bloc `vente` des hypothèses de marché y est couvert aussi, faute de l'être ailleurs —
  voir « Conséquences acceptées ». La garde la plus utile de ce bloc vérifie que
  l'appréciation ne porte **pas** de champ `valeur`.

Vérifié à l'adoption, quatre gardes cassées puis rétablies : retirer le plancher sur une
base d'appréciation négative fait rougir deux tests ; lire `rows[m − 1]` à l'horizon zéro
au lieu de `totalPrincipal`, quatre ; remplacer le `??` de la commission par un `||`,
trois ; rendre la mainlevée inconditionnelle, **un seul** — et c'est ce qui a manqué être
raté, le cas de référence de la vente au terme étant garanti par une caution, dont la
mainlevée vaut zéro de toute façon. Un cas sous hypothèque a été ajouté, et la garde
rougit désormais deux fois.

### Conséquences acceptées

- **Le taux moyen du prêt entre en paramètre obligatoire.** L'art. R313-25 plafonne
  l'indemnité à six mois d'intérêts « au taux moyen du prêt » ; sur un financement à
  plusieurs lignes, ce taux dépend d'une convention de pondération que le moteur ne
  connaît pas. Un défaut à zéro annulerait silencieusement l'indemnité, ce qui est
  précisément le poste que le module existe pour rendre visible. L'appelant doit donc le
  fournir, et l'interface devra l'expliquer.
- **Le bloc `vente` des hypothèses de marché échappe à
  `assumptions/__tests__/market.test.ts`**, dont la boucle n'itère nommément que sur
  `guarantee`. La dette était déjà signalée ; elle grossit d'un bloc. Il est couvert dans
  `vente.test.ts` en attendant, ce qui met la garde d'un fichier au mauvais endroit.
- **La restitution du fonds mutuel est acquise dès que le prêt s'éteint**, que ce soit à
  son terme ou par la vente. Le champ du moteur crédit s'appelle `refundAtTerm` ; le
  module l'entend comme « à l'extinction ». La part réellement restituée par un organisme
  de caution lors d'un remboursement anticipé peut être moindre, et aucune grille publiée
  ne permet de le chiffrer. C'est une hypothèse, elle est écrite dans le code.
- **Le module ne compare pas deux horizons.** Il chiffre une vente à un horizon donné, et
  rien n'y désigne un moment favorable. Balayer l'horizon pour tracer une courbe est le
  travail de l'appelant ; il devra le faire sans laisser croire que le maximum de cette
  courbe est une recommandation.

---

## ADR-015 — La limite précède les chiffres, et la bascule vit à l'intérieur

**Date** : 23 août 2026 · **Statut** : adoptée · **Tickets** : `VIZ-003`

### Contexte

`docs/03-spec-domaine.md` §2 n'écrit pas que la comparaison « acheter ou louer » de niveau
simple a des limites. Il écrit qu'elle **est faussée**, et il en donne la raison : la part
de capital d'une mensualité n'est pas une dépense. ADR-012 a tiré la conséquence côté
moteur — deux lectures produites ensemble, deux années de croisement — en laissant une
question ouverte, et elle est entièrement d'interface : *où* cet énoncé se pose sur l'écran.

La réponse par défaut, celle que produit n'importe quelle mise en page raisonnable, est
« sous le graphique, dans la section des limites ». C'est l'ordre qu'on trouve partout, et
c'est celui qui annule l'énoncé : le lecteur pressé lit les courbes, en tire une conclusion,
et ne descend pas. Le module aurait alors produit exactement le raccourci qu'il existe pour
corriger, à ceci près qu'il l'aurait produit en ayant l'air de s'en défendre.

Trois autres formes ont été essayées avant celle qui a été retenue.

- **Une infobulle sur le titre.** Invisible tant qu'on ne la cherche pas — et c'est celui
  qui ne la cherche pas qu'il s'agit d'atteindre.
- **Un encadré au-dessus du graphique, sans plus.** Lisible, et parfaitement contournable :
  rien n'oblige à le traverser, et l'œil va au premier gros chiffre.
- **Une phrase dans la légende du graphique.** Elle devient un ornement du graphique, donc
  une chose qu'on regarde après avoir lu la forme des courbes.

### Décision

**Trois règles, qui ne valent que prises ensemble.**

**1. Aucun chiffre de comparaison n'apparaît avant la limite, dans l'ordre du document.**
Le titre de la page ne porte aucun montant ; le bloc de limite le suit immédiatement ; tout
ce qui est chiffré vient après et porte l'attribut `data-chiffre`. L'ordre du document, et
non le dessin : c'est lui que suit un lecteur d'écran, et c'est lui qui décide de ce qui est
lu en premier quand la grille de bureau s'effondre en une colonne.

**2. La bascule entre les deux lectures vit à l'intérieur du bloc de limite, et nulle part
ailleurs sur l'écran.** C'est la moitié de la décision, et c'est elle qui rend
l'avertissement non contournable : on ne peut pas changer de lecture sans passer par la
raison d'être de ce choix. Les **deux** années de croisement y figurent ensemble, et non
celle de la seule lecture retenue — sur le scénario d'ouverture, vingt-huit ans les
séparent, ce qui énonce la limite mieux qu'aucune phrase.

**3. L'échelle du graphique ne se recale jamais sur la lecture retenue.** Elle vaut toujours
le plus grand cumul de décaissement de l'horizon. Passer en fonds perdus fait donc
**retomber** les courbes dans la hauteur du cadre au lieu de les réétaler : ce qui a disparu
est visible, et c'est le capital.

Corollaire de forme, tranché en même temps : la bascule n'est **pas** un `SelecteurSegmente`.
Cette primitive passe par `Champ`, qui pose sur tout contrôle une étiquette de famille —
négociable, contraint, réglementaire. Une lecture n'est aucune des trois : ce n'est pas un
paramètre de l'opération, c'est une façon de la regarder. Le dessin est repris, la sémantique
de champ ne l'est pas. Même raisonnement pour les quatre hypothèses de marché du panneau,
qui ne portent aucune famille mais leur intervalle observé et leur fiabilité, lus dans
`src/core/assumptions/market.ts` — c'est la distinction d'ADR-008 rendue visible à l'écran
plutôt que niée par une étiquette de commodité.

### Justification

La règle 1 seule est une intention : rien n'empêche une refonte de bonne foi de déplacer un
encadré. La règle 2 la rend structurelle — déplacer le bloc casse la commande, et une
commande cassée se remarque. La règle 3 est ce qui empêche le graphique de mentir dans le
sens inverse : un cadre qui se réétale à chaque bascule rendrait les deux lectures
indiscernables à l'œil, et le passage de l'une à l'autre n'apprendrait plus rien.

### Ce qui la garde

`tests/e2e/comparaison.spec.ts`, sur les deux profils :

- **« la limite précède tous les chiffres dans l'ordre du document »** — comparaison de
  position DOM entre `[data-limite]` et chaque `[data-chiffre]` ;
- **« la limite se lit sans défiler »** — la phrase de la spécification est entièrement dans
  la fenêtre, à 1 280 × 900 comme sur un Pixel 7 ;
- **« la bascule vit à l'intérieur du bloc de limite »** — et il n'en existe qu'une sur la
  page ;
- **« l'échelle ne se recale pas sur la lecture retenue »** — le repère de l'année 30 vaut
  58,0 % du cadre en fonds perdus contre 96,5 % en décaissement, mesuré en pixels ;
- **« les repères des courbes sont proportionnels aux montants du moteur »** — cinq repères
  confrontés aux cumuls, sans hauteur plancher ;
- **« aucune tournure prescriptive n'atteint le lecteur »** — quatorze tournures, dont
  quatre propres à ce module : `rentab`, `gagnant`, `l'emporte`, `plus avantageux`.

Vérifié à l'adoption, gardes cassées puis rétablies : un plancher de 6 % sur les repères fait
rougir la garde de proportions ; une échelle assise sur la seule courbe du propriétaire en
fait rougir deux ; déplacer le bloc de limite sous la grille et glisser un « mieux vaut »
dans le texte en font rougir trois, sur chacun des deux profils.

### Conséquences acceptées

- **Le haut de l'écran est occupé par du texte, pas par un chiffre.** C'est l'inverse de ce
  que fait `/credit`, où le bandeau d'indicateurs ouvre la page. La divergence est assumée :
  le module crédit calcule une grandeur qui ne se conteste pas, celui-ci en calcule une qui
  se conteste, et l'écran doit le dire avant de la montrer.
- **La lecture retenue n'entre pas dans l'URL** — ADR-005, elle change un cadrage et non un
  chiffre. On ne partage donc pas « regarde cet écran en fonds perdus ». La perte est petite :
  le destinataire du lien reçoit de toute façon les deux croisements sous les yeux.
- **Le bloc de limite ne peut pas beaucoup grossir.** Il doit tenir dans une fenêtre de
  téléphone avec le bandeau d'avertissement au-dessus. Toute phrase ajoutée là devra en
  chasser une autre, et c'est une contrainte utile.

---

## ADR-016 — L'assemblage supprime la saisie plutôt que de la vérifier

**Date** : 23 août 2026 · **Statut** : adoptée · **Tickets** : `ENG-027`

### Contexte

`vente.ts` (`ENG-012`) chiffre un scénario de vente en sept postes et ne sait traiter qu'un
régime de plus-value : la résidence principale exonérée. Pour le cas imposable, son union
`RegimePlusValue` réclame un `impotTotal` **déjà calculé**. `plus-value.ts` (`ENG-014`,
`ENG-016`) sait calculer exactement cet impôt. Les deux modules ont été écrits en parallèle
et ne se connaissent pas : ADR-014 en avait fait une décision, pour ne pas préempter le
second en écrivant le premier.

Restait à les brancher, et le branchement n'est pas trivial parce que **quatre grandeurs
apparaissent des deux côtés** :

| Grandeur | Côté vente | Côté plus-value |
| --- | --- | --- |
| Prix de cession | `valeurAppreciee(valeurInitiale, appréciation, horizon)` | `prixDeCession` |
| Prix d'acquisition | `valeurInitiale` | `prixAcquisition` |
| Durée de détention | `horizonMois` | `dureeDetentionMois` |
| Frais de cession | `commissionAgence` et `mainlevee`, deux postes du décompte | `fraisDeCession` |

Un appelant qui compose les deux à la main peut faire diverger chacune des quatre, et rien
ne l'en avertit : le résultat reste vraisemblable. La quatrième est la plus insidieuse — la
commission d'agence et la mainlevée d'hypothèque **réduisent l'impôt** (CGI, art. 150 VA,
III), l'indemnité de remboursement anticipé **ne le réduit pas**, et les trois sortent de la
même poche le même jour.

Cinquième piège, propre à `plus-value.ts` : ses forfaits de majoration passent par un jeton
non falsifiable, construit **pour une** situation. Rien n'empêche de l'ouvrir sur un bien
détenu douze ans et de l'employer dans un calcul portant sur deux ans — le second verrou
d'ADR-013 refuse alors, mais il refuse après coup.

### Décision

**1. L'entrée ne contient aucune grandeur partagée.** `EntreeCession` porte trois champs :

```
interface EntreeCession {
  vente: Omit<EntreeVente, "regimePlusValue">;
  regime: RegimeDeCession;
  autresFraisDeCession?: Cents;
}
```

Prix de cession, prix d'acquisition, durée de détention, frais de cession et millésime
fiscal **n'y ont pas de place**. La divergence n'est pas détectée, elle est inécrivable : il
n'existe aucun champ où en écrire une seconde valeur. C'est la seule forme qui tienne la
promesse ; toutes les autres se ramènent à vérifier après coup une saisie qu'on aurait pu ne
pas demander.

Le bloc `vente` est repris par `Omit` et non recopié champ par champ. Recopier aurait rouvert
la divergence d'un cran : le jour où `EntreeVente` gagne un champ, `Omit` le fait apparaître
ici sans que personne y pense.

**2. Les grandeurs sont dérivées de la sortie normalisée, pas de l'entrée brute.** La durée
de détention est `produitDeVente(...).horizonMois`, pas `entree.vente.horizonMois` : le
premier est entier et positif, le second peut n'être ni l'un ni l'autre. Le prix
d'acquisition est `ProduitDeVente.valeurInitiale`, plancher à zéro compris. Normaliser deux
fois de deux façons est la manière dont une égalité par construction se défait.

**3. Deux appels de `produitDeVente`, et aucune formule propre.** Le prix de cession soumis à
l'impôt est celui que le décompte a arrêté ; les frais déductibles sont les postes
`commissionAgence` et `mainlevee` du décompte, augmentés des autres frais saisis. Comme la
sortie du premier module alimente l'entrée du second, qui alimente à son tour le premier, le
module appelle `produitDeVente` deux fois : une passe à impôt nul dont on ne garde que les
postes, puis la passe définitive. Rien dans la vente ne dépendant de l'impôt, les deux passes
ne diffèrent que par `impotPlusValue` — et c'est vérifié par test, sur chaque tirage.

**4. Le mode de majoration remplace le jeton.** L'entrée dit `{ mode: "forfait" }` ou
`{ mode: "reel", montant }` ; c'est l'assemblage qui appelle `travauxForfaitaires` et
`fraisAcquisitionForfaitaires` sur **la** situation qu'il vient de dériver. L'appelant ne
peut pas se tromper de situation puisqu'il n'en fournit aucune, et il n'existe aucun champ où
glisser un jeton étranger. Le double verrou d'ADR-013 reste en place derrière.

**5. Les réserves remontent étiquetées.** `readonly reserves: readonly Reserve[]`, chaque
entrée portant `source: "vente" | "plus-value" | "cession"` et son texte **intact**. Un
`string[]` fusionné aurait perdu la provenance ; une chaîne concaténée aurait perdu les deux.
La liste n'est jamais vide, comme `nonModelise` dans `plus-value.ts`.

**6. Le cas exonéré entre par la même porte.** `RegimeDeCession` est une union discriminée
sur `nature`, le même mot que `RegimePlusValue`. En résidence principale, `plusValue`,
`fraisDeCession` et `situation` valent `null` — et non zéro : un impôt qui n'a pas eu lieu
d'être calculé ne se lit pas comme un impôt calculé à zéro.

### Formes écartées

**Un objet plat qui reprend les champs des deux entrées, plus une vérification.** La forme la
plus courte à écrire. Elle demande à l'appelant de saisir deux fois la même chose, puis lève
si les deux valeurs diffèrent. Elle transforme une impossibilité en une erreur d'exécution,
c'est-à-dire en un test que quelqu'un devra écrire — alors que le type peut porter la
contrainte gratuitement.

**Un champ `dureeDetentionMois` optionnel, l'horizon servant de défaut.** Séduisant, parce
qu'il ouvre le cas du bien acquis avant le début de la projection. Écarté : `horizonMois`
compte les mois depuis le **déblocage des fonds**, qui est aussi la date d'acquisition, et
c'est de là que les lignes du plan de financement sont numérotées. Un bien détenu depuis
trois ans avec un prêt libéré aujourd'hui ferait lire le capital restant dû au mois 36 d'un
crédit qui n'a pas commencé. Le cas est hors domaine, et il vaut mieux le dire que le servir
faux. S'il devient nécessaire — pour une revente après location longue durée, par exemple —,
il demandera de dissocier l'origine du crédit de celle de la détention, ce qui est une
modification de `vente.ts` et non un champ de plus ici.

**Laisser l'appelant fournir les jetons de forfait.** Écartée pour la raison qui fait exister
le module : le jeton porte une situation, et une situation fournie de l'extérieur est une
seconde durée de détention déguisée.

**Un `impot: Cents` rendu à part, à charge pour l'appelant de le retrancher.** C'est
exactement l'état antérieur, avec une fonction de plus. La sortie rend donc un
`ProduitDeVente` complet, impôt déjà en place dans ses postes.

### Justification

Le coût d'un champ que le type interdit est nul ; le coût d'une divergence est un impôt
calculé sur les abattements d'une autre opération, dans un ordre de grandeur qui ne saute pas
aux yeux. Sur le cas de référence du module, huit années de détention en plus ou en moins
déplacent l'impôt de plusieurs milliers d'euros sans rien changer d'autre au décompte :
personne ne le verrait.

Sur le tri des frais de cession, le raisonnement est le même en plus net. Mainlevée et
indemnité de remboursement anticipé se ressemblent — deux frais de sortie de crédit, du même
ordre de grandeur, dus le même jour. La première est déductible, la seconde ne l'est pas, et
la liste de l'art. 41 duovicies H de l'annexe III est limitative. Un assemblage écrit à la
main range l'une des deux du mauvais côté une fois sur deux ; celui-ci les range une fois
pour toutes, et rend le détail pour qu'on puisse le contredire.

### Ce qui la garde

`src/core/compare/__tests__/cession.test.ts` :

- **cas A**, de bout en bout et chiffré à la main dans son commentaire : bien à 200 000 €,
  revendu vingt ans plus tard à 3 % d'appréciation, majorations au forfait. Prix de cession
  361 222,25 €, frais déduits 18 061,11 €, plus-value brute 98 161,14 €, deux abattements —
  90 % et 24,75 % —, impôt 14 570,06 €, produit net 328 591,08 € ;
- **cas B**, sous hypothèque : l'indemnité et la mainlevée valent chacune 1 500 €, la seconde
  entre dans les frais déductibles et la première non. Le contre-cas sous caution vérifie que
  la mainlevée en sort ;
- **cas C** : une assiette de 50 000,10 €, dans la fente du barème de la surtaxe ;
- **l'écart exact**, sur le cas A puis sous `fast-check` : le produit d'une résidence
  principale exonérée et celui du même bien imposable diffèrent du montant de l'impôt, et les
  six autres postes sont identiques membre à membre ;
- **la propriété du module** : durée de détention, prix d'acquisition et frais déduits
  coïncident avec le décompte sur chaque tirage, **horizon réel négatif et fractionnaire
  compris** ; une entrée où l'on force par transtypage un second prix, une seconde durée et
  de seconds frais rend un résultat strictement identique ;
- **les réserves** : celles de `plus-value.ts` ressortent une par une, dans l'ordre et mot
  pour mot ; celle de `vente.ts` sur le délai normal de vente aussi ; aucune cession ne sort
  sans réserve.

Vérifié à l'adoption, cinq gardes cassées puis rétablies. Prendre la durée de détention dans
l'entrée brute plutôt que dans la sortie normalisée : **deux** rouges — un seul avant que le
tirage d'horizon hostile ne soit ajouté, ce qui a été la correction la plus utile de la
séance. Ajouter l'indemnité de remboursement anticipé aux frais déductibles : **quatre**.
Rendre la passe 1 au lieu de la passe 2, donc oublier l'impôt dans le décompte : **trois**.
Fondre les réserves de `plus-value.ts` en une chaîne unique : **quatre**. Revenir sur la
correction de la surtaxe : **deux**, un dans chaque fichier.

Une sixième tentative n'a **rien** fait rougir : recalculer le prix de cession par
`valeurAppreciee` au lieu de le lire dans la sortie de la passe 1. C'est attendu — les deux
rendent le même centime, par construction — et c'est à consigner : la règle « rien n'est
recalculé » est ici tenue par la relecture, pas par un test. Aucune garde ne distingue une
composition d'une duplication tant que la duplication est juste ; elle mordrait le jour où
elle cesserait de l'être, ce qui est tard.

### Un fichier partagé modifié, et pourquoi il fallait le modifier

> **Révisé par ADR-018.** Ce qui suit décrit fidèlement l'état du 23 août 2026 au matin.
> La correction décrite ici a été défaite le jour même : la « fente de 99 centimes » n'était
> pas un trou du barème mais une assiette impossible, les bases d'imposition étant arrondies
> à l'euro (CGI, art. 1649 undecies). La recherche par la borne basse est rétablie, et les
> chiffres du cas C ci-dessus ont changé. Le reste d'ADR-016 tient.

`src/core/compare/plus-value.ts`, une ligne : `surtaxeSurPlusValue` cherchait sa tranche par
la borne **basse** du barème. Le seuil de déclenchement vise les plus-values « supérieur[es]
à 50 000 € » et la première tranche du tableau de l'art. 1609 nonies G ouvre à « 50 001 € » :
entre les deux subsistent 99 centimes que le tableau ne nomme pas, parce que le texte
raisonne en euros. Une assiette qui y tombait ne trouvait aucune tranche et levait
`RangeError`, alors que la loi taxe.

Le défaut était inatteignable tant que les assiettes étaient saisies en euros ronds — ce que
font tous les cas de `plus-value.test.ts`. Il devient ordinaire dès qu'un prix de cession est
**dérivé** d'une valeur appréciée, c'est-à-dire dès ce module. La recherche part désormais de
la borne haute : les tranches étant ordonnées, contiguës et la dernière non bornée, et
l'assiette étant déjà au-dessus du seuil, la première tranche qu'elle ne dépasse pas est la
sienne. Le `RangeError` reste, pour le barème mutilé qu'il visait vraiment.

La discontinuité voulue au seuil d'entrée — rien à 50 000 €, environ 500 € juste au-dessus —
n'est pas touchée : elle est dans le texte, et ADR-013 avait décidé de la constater.

### Conséquences acceptées

- **Un forfait hors champ lève, y compris depuis ce module.** Un appelant qui balaie
  l'horizon pour tracer une courbe rencontrera `ForfaitHorsChampError` sur les cinq premières
  années si le forfait travaux est demandé, et c'est juste : il n'y est pas ouvert.
  `situationDeCession` est exportée pour qu'il puisse le savoir avant d'appeler, sans
  provoquer l'exception.
- **Le module chiffre une cession, jamais deux.** Comme `vente.ts`, il ne compare pas deux
  horizons ni deux régimes. Balayer est le travail de l'appelant, et le maximum de la courbe
  qu'il tracera n'est pas un moment où vendre.
- **La commission d'agence est présumée à la charge du vendeur.** Le décompte de vente la
  retranche toujours de son produit ; elle est donc traitée comme déductible. Le mandat peut
  en décider autrement, et la réserve le dit.
- **Les travaux ne circulent pas entre les modules.** Le forfait de 15 % et les travaux réels
  appartiennent au calcul de la plus-value ; la `provisionTravauxPctAnnuel` de `detention.ts`
  est une dépense annuelle d'entretien, pas une dépense capitalisable. Les relier serait une
  erreur fiscale, et le module ne le fait pas.

---

## ADR-017 — `observee` se mérite sur un document ouvert, et l'estimation se compte

**Date** : 23 août 2026 · **Statut** : adoptée · **Tickets** : `FIS-006`

### Contexte

ADR-008 a créé `src/core/assumptions/market.ts` et donné à chaque hypothèse trois
attributs : un intervalle, une **fiabilité** — `observee` ou `estimee` — et une
provenance. Il a laissé ses cinq entrées en `estimee`, en écrivant que « c'est un
aveu, pas un objectif ». Les tickets suivants en ont ajouté dix, toutes `estimee` elles
aussi : l'aveu s'était mis à grossir tout seul.

`FIS-006` devait solder cet aveu. En s'y mettant, une question s'est posée que
personne n'avait eu à trancher : **qu'est-ce qui autorise à écrire `observee` ?**

Elle n'est pas théorique. La fiabilité est affichée à l'utilisateur, à côté du
chiffre. C'est une promesse. Et elle est la seule ligne du fichier qu'on peut
améliorer d'un mot, sans rien vérifier, en se disant qu'après tout on a bien lu
quelque chose quelque part. Le type `Fiabilite` ne défendait rien : `"observee"`
compile aussi facilement que `"estimee"`.

Trois lectures étaient possibles, et elles ne donnent pas les mêmes entrées.

1. **Le chiffre central est lu.** Large : une `FourchetteObservee` n'a pas de
   chiffre central, la règle ne dirait rien d'elle.
2. **Toutes les bornes sont lues.** Stricte : presque aucun intervalle n'est publié
   tel quel. Une grille d'agence donne un barème dégressif, pas un « de 3 à 8 % ».
   Cette lecture aurait laissé quinze entrées sur dix-sept en `estimee`, ce qui
   revient à ne rien dire.
3. **Ce qui sert au calcul est lu.** La valeur centrale quand il y en a une, les
   deux bornes quand c'est tout ce que l'entrée porte.

### Décision

**La troisième lecture, et elle est écrite en tête du fichier.**

Une entrée passe `observee` quand le chiffre **dont le moteur se sert** a été lu dans
un document public et citable, et que la provenance **nomme ce document**. Les bornes
d'une `HypotheseChiffree` restent une extension de notre fait — elles disent jusqu'où
on a vu varier les offres — et la provenance doit dire laquelle des deux situations
elle décrit.

Deux corollaires, qui sont la vraie substance de la décision.

**Une entrée `estimee` doit dire pourquoi la vérification n'a pas abouti.** « Ordre de
grandeur » n'est pas une provenance : cela ne dit pas si on a cherché. « Aucune grille
publique n'a pu être trouvée : les assureurs qui pratiquent le nantissement en
décrivent le mécanisme sans jamais chiffrer l'acte » en est une.

**Le nombre d'entrées `estimee` est gardé par un test qui échoue quand il change**,
et qui liste les noms plutôt que de compter — une promotion compensée par une
rétrogradation laisserait le compte intact et le tableau faux. Le test n'interdit pas
d'estimer : il exige qu'un changement de fiabilité soit un acte délibéré, pas une
dérive.

### Justification

- **Ce qui est affiché à l'utilisateur est ce qui est vérifié.** La fiabilité qualifie
  le chiffre qui produit le résultat, pas la prose autour.
- **La lecture stricte se serait retournée contre elle-même.** Une règle qu'aucune
  entrée ne peut satisfaire n'est pas exigeante, elle est inerte : au bout d'un
  ticket, plus personne ne regarde le champ.
- **Le compte rend l'estimation visible.** C'est le seul mécanisme qui empêche
  l'imprécision de se répandre par ajouts successifs, chacun raisonnable isolément.

### Ce que la décision n'a pas permis de faire

Trois entrées ont été laissées `estimee` alors qu'un chiffre les approche, et il faut
le dire ici parce que c'est le prix de la règle.

- **La restitution de la caution.** Crédit Logement publie « environ 70 % », mais du
  seul fonds mutuel ; notre champ est un pourcentage du coût total, et le partage
  entre commission et fonds n'est publié nulle part.
- **L'appréciation du bien.** L'INSEE publie la variation de l'indice Notaires-INSEE
  d'une année sur l'autre : de −5,5 % à +10,0 % entre 2011 et 2026. Notre intervalle
  `[−2 ; +4]` est délibérément plus resserré, parce qu'il décrit un taux **tenu sur
  tout un horizon** et non la secousse d'une année. Ce resserrement est notre
  décision ; aucune source ne le publie.
- **Les rendements de portefeuille.** Les séries publiées sont **brutes** de fiscalité,
  nos fourchettes sont **nettes**. La conversion dépend de l'enveloppe, qui est le
  ticket `ENG-023`.

### Conséquences acceptées

- **Le fichier est plus long.** Une provenance qui dit ce qu'on n'a pas trouvé fait
  deux fois la taille d'une qui ne le dit pas. C'est le coût de l'honnêteté déclarée,
  et l'interface ne montre de toute façon pas encore ces textes.
- **Le compte devra être touché à chaque campagne.** C'est le but.
- **Aucun test ne relit une provenance contre sa source.** Falsifier un chiffre cité
  à l'intérieur d'une phrase de provenance ne fait rougir personne — vérifié par
  sabotage. La provenance est de la prose montrable, pas une donnée vérifiable ; le
  seul rempart est la relecture humaine.

---

## ADR-018 — L'assiette d'un impôt est un nombre entier d'euros

**Date** : 23 août 2026 · **Statut** : adoptée · **Tickets** : `FIS-008` · **Révise** : ADR-016

### Contexte

`ENG-027` avait buté sur un `RangeError`. Le barème de la surtaxe sur les plus-values élevées
(CGI, art. 1609 nonies G) est libellé en euros entiers : le seuil de déclenchement vise les
plus-values « supérieur[es] à 50 000 € », la première tranche court « de 50 001 à 60 000 € ».
Entre les deux, 99 centimes que le tableau ne nomme pas — et la même fente à chacune de ses
neuf frontières internes. Une assiette de 50 000,10 €, telle que l'assemblage en fabrique dès
que le prix de cession est **dérivé** d'une valeur appréciée, n'y trouvait aucune tranche.

La correction retenue faisait chercher la tranche par sa borne **haute**. Elle supprimait la
levée. Elle produisait aussi, sur le cas de référence C, **500,01 € de surtaxe sur une
assiette de 50 000,10 €** — et l'entrée de journal de la séance reconnaissait que cette
lecture « n'a pas été confrontée à la doctrine ».

La question posée était donc : le droit fiscal connaît-il des assiettes au centime ?

### Ce que la recherche a établi

**Non.** CGI, **art. 1649 undecies** : « Les bases des impositions de toute nature sont
arrondies à l'euro le plus proche. La fraction d'euro égale à 0,50 est comptée pour 1. » Un
article d'une phrase, seul dans un chapitre intitulé « Règles d'arrondissement des bases
d'imposition », placé dans le **livre premier, « Assiette et liquidation de l'impôt »**. Le
BOFiP le cite comme la règle générale d'arrondi des bases (BOI-BIC-BASE-30 § 20).

Ce n'est **pas** l'art. 1657, par lequel la question était arrivée. Celui-ci arrondit lui
aussi « les bases de cotisation des impôts directs », mais il siège sous la sous-section
« Rôles et avis d'imposition › Établissement et mise en recouvrement des rôles », et son 2
raisonne « par article de rôle ». La plus-value immobilière n'est pas mise en recouvrement
par voie de rôle : elle est liquidée par le notaire et payée à la formalité. Fonder la règle
sur 1657 aurait été fragile ; l'art. 1649 undecies ne pose pas ce problème.

**L'assiette et la cotisation relèvent de deux règles distinctes.** L'art. 1649 undecies
arrondit la base ; l'**art. 1724** arrondit « la liquidation de toutes sommes à recevoir »,
« au niveau du décompte de chaque impôt ou taxe ». La réponse ministérielle à la question
écrite AN n° 26703 (JO 17 novembre 2020) lit les deux ensemble et confirme le partage : on
calcule au centime, on verse à l'euro.

**Les prélèvements sociaux suivent.** CSS, art. L136-7, VI, 1 : la contribution sur les
plus-values immobilières est « **assise**, contrôlée et recouvrée selon les mêmes règles […]
que l'impôt sur le revenu ». Le mot « assise » emporte la règle d'arrondi d'assiette.

**Le seuil de la surtaxe s'apprécie après abattements.** La notice 2048-IMM-NOT-SD (02-2025)
l'écrit : la taxe est assise sur la plus-value imposable à l'impôt sur le revenu « après
prise en compte de l'abattement pour durée de détention prévu à l'article 150 VC », et « le
seuil de 50 000 € est donc apprécié après prise en compte de ces abattements ». La ligne 115
du formulaire, celle de la taxe, est le report de la ligne 50, la plus-value nette imposable.
Cela confirme le corollaire d'ADR-013 : la surtaxe est assise sur l'assiette de l'impôt sur
le revenu.

### Décision

**1. Les deux assiettes sont arrondies à l'euro, après abattement.** `baseImpotRevenu` et
`basePrelevementsSociaux` sont des multiples de 100 centimes. L'arrondi porte sur la base
nette — celle que le taux frappe et que porte la déclaration — et non sur la plus-value
brute.

**2. `AbattementApplique.base` reste au centime.** L'invariant `montant + base ===
plusValueBrute` est conservé. L'arrondi est un fait d'assiette, pas une reprise de la
soustraction : mélanger les deux rendrait impossible de vérifier un abattement à la main.

**3. La recherche de tranche de la surtaxe repart de la borne basse.** Elle était juste. Sur
les entiers, les tranches du barème sont contiguës et couvrantes, et une assiette
strictement supérieure à 50 000 € vaut au moins 50 001 €. Le `RangeError` redevient ce qu'il
visait : un barème mutilé, jamais une plus-value exotique. La fonction arrondit son entrée
elle-même, parce qu'elle est exportée et qu'aucune signature ne peut promettre un multiple
de 100 ; l'opération est idempotente.

**4. `roundToEuros` est ajoutée à `money.ts`, fichier gelé.** C'est de l'arithmétique
monétaire, pas une valeur réglementaire : aucun seuil, aucun taux, aucun millésime, rien qui
change avec une loi de finances. Une fonction ajoutée, aucune fonction retouchée, et sa
garde dans `src/core/__tests__/money-arrondi-euro.test.ts` — ADR-004 demande une raison
explicite et un test, les deux sont là.

**5. Ce qui reste non modélisé est déclaré.** Les impositions elles-mêmes restent calculées
au centime alors que l'art. 1724 les arrondit à l'euro, et que le décompte du notaire liquide
séparément CSG, CRDS et prélèvement de solidarité au lieu d'un taux global de 17,2 %. Une
réserve de plus dans `nonModelise`. L'appliquer demanderait de décomposer le taux global,
c'est-à-dire de modifier `params.ts` et la sortie du module : un autre ticket, et un écart de
quelques centimes.

### Justification

Le défaut d'`ENG-027` n'était pas le saut de coefficient de lissage que l'on pouvait
craindre aux neuf frontières internes. Mesuré, ce saut vaut **entre 3 et 13 centimes** : la
décote vaut `coefficient × (borne haute − assiette)` et tend vers zéro quand l'assiette
approche la borne haute. À 60 000,50 €, la borne haute rendait 1 200,01 € là où la tranche
précédente aurait rendu 1 200,04 €.

Le vrai défaut était ailleurs, et il était de cinq cents euros : la lecture par la borne
haute **taxait une assiette qui ne devait rien**. C'est le sens de l'erreur qui rend la
correction non facultative — un simulateur qui surestime un impôt de 500 € sur un seuil est
aussi faux qu'un simulateur qui le sous-estime, et il est faux dans le sens qui décourage.

L'arrondi, lui, ne déplace presque rien loin du seuil : sur le cas de référence A, sept
centimes sur un impôt de 14 570 €. Il déplace tout au voisinage du seuil, et c'est
exactement là qu'un simulateur doit être juste, parce que c'est là que l'utilisateur se
demande s'il franchit une marche.

### Ce qui la garde

- `src/core/__tests__/money-arrondi-euro.test.ts` — la fraction de 0,50 € comptée pour 1 et
  0,49 € qui ne l'est pas, la sortie toujours multiple de 100, l'idempotence dont la surtaxe
  dépend, la monotonie sans laquelle la surtaxe cesserait de croître.
- `src/core/compare/__tests__/plus-value.test.ts` — les 99 centimes du seuil, valeur par
  valeur : rien sous 50 centimes, 500,07 € au-delà. Les neuf frontières internes, sept
  positions de centimes chacune, la surtaxe des centimes devant être **identique** à celle de
  l'euro sur lequel ils s'arrondissent. Le voisinage du seuil sur le calcul complet et pas
  seulement sur le barème. Sous `fast-check`, les deux assiettes toujours entières et jamais
  à plus d'un demi-euro de la base exacte.
- `src/core/compare/__tests__/cession.test.ts` — cas C réécrit : 50 000,10 € ne doit rien,
  50 000,60 € doit 500,07 €.

Vérifié à l'adoption, trois gardes cassées puis rétablies. Arrondir vers le bas au lieu de
`half-up` : **6 rouges** dans trois fichiers. Cesser d'arrondir la seule assiette sociale :
**7 rouges** dans deux fichiers, dont l'invariant « l'assiette sociale reste supérieure ou
égale à l'assiette fiscale », qu'un arrondi appliqué à une seule des deux peut inverser.

Le troisième sabotage n'a **rien** fait rougir, et c'est le résultat le plus utile : revenir
à la recherche par la borne haute, l'arrondi restant en place, laisse la suite entièrement
verte. Une fois l'assiette entière, les deux recherches désignent toujours la même tranche.
La borne basse n'est donc pas gardée par un test — elle est rendue suffisante par l'arrondi,
qui l'est. Écrire un test pour la borne basse seule reviendrait à mesurer le test lui-même.

### Ce qui n'a pas été établi

- **Aucun texte, aucune doctrine, aucune notice ne dit explicitement que la plus-value
  immobilière est arrondie.** Le raisonnement est une subsomption : l'art. 1649 undecies vise
  les « impositions de toute nature », la plus-value en est une. Solide, mais indirect.
- **BOI-RFPI-PVI-20-20, BOI-RFPI-PVI-30-20 et BOI-RFPI-TPVIE-20 ne disent rien de l'arrondi**,
  et la notice 2048-IMM-NOT-SD ne contient pas le mot. Les trois exemples chiffrés de
  BOI-RFPI-TPVIE-20 § 75 sont en euros ronds et ne tranchent donc pas ; ils confirment en
  revanche notre lecture du barème et de ses décotes, au centime.
- **« Avant ou après les abattements » n'est réglé par aucun texte**, sauf pour le seuil de la
  surtaxe. Le choix d'arrondir la base nette s'appuie sur le mot « bases » et sur les lignes
  50 et 100 du formulaire. L'autre lecture déplacerait l'assiette d'au plus 50 centimes.

### Conséquences acceptées

- **La marche du seuil se lit maintenant sur un euro d'assiette et non sur un centime.** Un
  vendeur dont la plus-value nette vaut 50 000,50 € doit 500,07 € de plus qu'un vendeur à
  50 000,49 €. La discontinuité est dans le texte — ADR-013 avait décidé de la constater —
  mais elle se produit désormais à un endroit net, et l'interface devra la nommer.
- **`baseImpotRevenu` ne vaut plus `abattementImpotRevenu.base`.** Deux champs voisins qui
  diffèrent de quelques centimes : c'est un piège de lecture, et la seule parade est le
  commentaire des deux champs, qui dit lequel est l'assiette.
- **L'impôt reste calculé au centime.** Le décompte réel du notaire arrondira chaque
  imposition à l'euro. L'écart est déclaré dans `nonModelise` et il n'est pas corrigé ici.

---

## ADR-019 — Une garde cassée reste une garde qui peut se tromper

**Date** : 23 août 2026 · **Statut** : adoptée · **Tickets** : `ENG-028`

### Contexte

Le coût de mainlevée d'une hypothèque était calculé sur le **prix du bien**. Un test le
gardait, ce test avait été cassé pour de bon — il figure au registre sous « Assiette de la
mainlevée » — et son commentaire donnait le motif : « la mainlevée est un acte sur
l'immeuble ; deux emprunteurs au même capital sur des biens de prix différents ne paient
pas la même chose ».

Le motif est convaincant. Il est faux. Ce qu'on radie n'est pas l'immeuble mais une
**inscription**, dont le montant est celui de la créance garantie. Les trois postes le
disent : émoluments au forfait — 78 € sous 77 090 € de garantie, 150 € au-delà —,
contribution de sécurité immobilière assise sur le montant garanti, et débours. Le prix
du bien n'entre nulle part.

Le défaut penchait dans le mauvais sens. Avec 20 % d'apport, le prix vaut 1,25 fois le
capital : la mainlevée était **surestimée d'un quart**, au détriment de l'hypothèque dans
toute comparaison de garanties — c'est-à-dire dans l'arbitrage même que le module existe
pour éclairer.

Il n'a pas été trouvé par un test. Il a été trouvé en traitant `FIS-006` : la source qui
chiffre ce taux — la question écrite n° 6820 de la XVIIe législature — énonce aussi son
assiette, et l'assiette ne disait pas la même chose que le code.

### Décision

**1. La mainlevée est assise sur le capital garanti.**

**2. Le prix du bien quitte la signature de `guaranteeCost`.** Aucun des trois postes ne
s'y adossait plus. Un paramètre que rien ne lit est une invitation à s'en resservir, et
c'est très exactement l'erreur qu'on vient de corriger. Une garde de type — un
`@ts-expect-error` sur un quatrième argument — le tient à la compilation.

**3. La garde de la mainlevée nomme son assiette au lieu de la supposer.** Elle vérifiait
la proportionnalité : doubler le capital double le coût. Le sabotage a montré ce que cela
laisse passer — remplacer l'assiette par `capital × 1,25`, c'est-à-dire refaire l'erreur
d'origine, préserve la proportionnalité et ne fait rougir personne. **945 tests verts sur
une assiette fausse.** La garde confronte désormais le montant au taux déclaré dans les
hypothèses de marché.

### Justification, et ce qu'il faut en retenir

Le projet tient une règle : une garde ne vaut que cassée au moins une fois. Elle reste
juste, et ce ticket montre sa limite exacte.

**Casser une garde prouve qu'elle tient à quelque chose. Cela ne prouve pas que ce
quelque chose est vrai.** Le test de la mainlevée avait passé l'épreuve du sabotage en
gardant fidèlement une règle fausse. Aucune quantité de rouge n'aurait révélé l'erreur,
parce que l'erreur n'était pas dans le code : elle était dans ce que nous croyions du
monde, et le test l'avait recopiée.

Ce qui l'a démentie est d'une autre nature : **une source qui énonce son assiette**. C'est
la raison d'être de la campagne `FIS-006` et du champ `provenance` d'ADR-008 — une phrase
qui dit d'où vient un chiffre dit aussi, souvent, à quoi il s'applique. Les deux gardes se
complètent et ne se remplacent pas : le sabotage protège du code qui dérive, la source
protège de la croyance qui se fige.

### Ce qui la garde

`src/core/credit/__tests__/garantie.test.ts` — le rapport du coût de mainlevée au capital
confronté au taux déclaré, et la garde de type sur le paramètre retiré.

---

## ADR-020 — L'hypothèse qui décide vit dans l'avertissement, et la fourchette entoure le point

**Date** : 23 août 2026 · **Statut** : adoptée · **Tickets** : `UI-007`

### Contexte

ADR-015 avait tranché, pour le niveau simple d'« acheter ou louer », *où* la limite se
pose sur l'écran : avant les chiffres, avec la commande qui en dépend soudée à
l'intérieur. Le niveau approfondi pose la même question de mise en page, et la réponse
n'est pas la même — la recopier aurait été le contresens.

Au niveau simple, tous les nombres sont de l'arithmétique sur des montants saisis par
l'utilisateur. Le danger est de compter la part de capital comme une dépense, et
l'avertissement porte là-dessus.

À ce niveau-ci, deux nombres n'ont pas cette nature. Le patrimoine du propriétaire dépend
de ce que vaudra le bien ; celui du locataire de référence, de ce qu'aura rapporté son
épargne. **Personne ne connaît ni l'un ni l'autre**, et `src/core/assumptions/market.ts`
le dit dans son type : `appreciationAnnuellePct` et `rendements` sont des
`FourchetteObservee`, c'est-à-dire des intervalles **sans valeur centrale**, par refus
explicite de publier une prévision de marché (`docs/CONTEXT.md` §8). La commission
d'agence, elle, est une `HypotheseChiffree` : elle a une valeur, les barèmes sont affichés
en vitrine.

L'écran devait donc trancher trois choses : où poser ces deux hypothèses, sur quoi ouvrir
puisqu'aucune valeur centrale n'existe, et comment faire voir le retournement sans
désigner de vainqueur.

### Décision

**Quatre règles, qui ne valent que prises ensemble.**

**1. Les hypothèses sans valeur centrale vivent dans le bloc de limite, et nulle part
ailleurs.** On ne peut pas déplacer le nombre qui commande le résultat sans passer par la
phrase qui dit que personne ne le connaît. C'est le mécanisme d'ADR-015 appliqué à ce qui
mérite ici d'être rendu incontournable. **La ligne de partage est lisible dans le type,
pas dans le goût de qui dessine** : entre ici ce que `market.ts` refuse de chiffrer, reste
dans le panneau de saisie ce qu'il chiffre.

**2. Le point d'ouverture est le milieu de l'intervalle, il est calculé dans l'interface,
et l'écran écrit qu'il n'a aucune autorité.** Il en faut un — un décompte poste par poste
n'existe pas pour une fourchette. Le poser dans `market.ts` en ferait une valeur centrale
publiée, exactement ce que ce fichier refuse ; le poser ici et le déclarer arbitraire est
la seule forme honnête. Le champ qui le porte n'est pas `ChampHypothese` mais
`ChampFourchette`, qui ajoute cette déclaration et la provenance complète.

**3. La fourchette entoure le point, elle ne le remplace pas — et c'est elle qui fixe
l'échelle.** Autour de chaque courbe, l'intervalle observé de l'hypothèse qui la gouverne
est dessiné. Les bornes du cadre viennent de ces fourchettes, qui **ne dépendent d'aucun
réglage** : déplacer un curseur d'hypothèse fait monter ou descendre une courbe dans un
cadre immobile, au lieu de la recadrer sur elle-même. C'est l'équivalent de la règle 3
d'ADR-015 : un cadre qui se réétale à chaque réglage rend toutes les hypothèses également
spectaculaires, donc n'en apprend aucune.

**4. Le zéro est une position, pas un bord.** Le produit d'une vente peut être négatif —
ADR-014 l'avait établi côté moteur, et l'écran le dessine **sous** une ligne de zéro
nommée. Écraser ces années à zéro cacherait le seul chiffre que ce module connaît et
qu'aucun simulateur n'affiche : vendre tôt laisse une dette.

**Corollaire sur le retournement.** Il ne se produit ni dans un graphique, ni dans une
phrase : **entre deux lignes posées l'une sous l'autre**, dans la même unité et à la même
année — « le propriétaire a décaissé tant de plus » et « il lui reste tant de plus ».
Aucune des deux n'est appelée la bonne, et une troisième ligne confronte l'écart à la
largeur des deux fourchettes.

### Justification

La règle 1 seule serait une préférence de mise en page. C'est la règle 3 qui la rend
utile : les fourchettes étant dessinées, déplacer le curseur montre à l'œil que
l'incertitude déclarée est plus large que l'écart entre les deux options. Sur le scénario
d'ouverture, l'écart de patrimoine vaut 36 030,77 € quand le patrimoine du propriétaire va
de 107 569,58 € à 632 988,17 € et celui du locataire de 85 967,61 € à 507 980,12 €. Un
écran qui ne montrerait que les deux traits laisserait croire l'inverse, et ce serait le
mensonge le plus coûteux de la page.

La règle 4 est ce qui empêche le graphique de mentir dans l'autre sens. Le seul
enseignement robuste de ce module — robuste parce qu'il ne dépend presque pas des
hypothèses — est que vendre dans les premières années coûte cher, et il ne se voit que si
le zéro flotte.

### Une entorse assumée à `VIZ-003`

`CourbesCout` avait écrit qu'une bande de série se peint en **aplat plein** : « une couleur
diluée n'est plus le jeton qu'elle prétend être ». La règle valait là-bas parce que la bande
**était** le capital, la grandeur elle-même dessinée. Les fourchettes de cet écran ne sont
pas des grandeurs : ce sont les incertitudes qui entourent des grandeurs, et leur donner la
même intensité qu'à la courbe dirait que les deux ont le même statut. La teinte reste celle
du jeton, l'intensité dit le statut, et **rien ne repose là-dessus** — les deux fourchettes
sont nommées dans la légende et leurs quatre bornes sont écrites en euros au-dessus du
graphique.

Même raisonnement pour la couleur du propriétaire, brique au niveau simple et **verte**
ici : ce n'est pas la même grandeur. Là-bas on trace ce qu'il dépense, ici ce qu'il possède,
et les jetons disent exactement cela. La brique sert sur cet écran à ce qu'elle signifie :
les postes qui se retranchent du produit de la vente.

### Le refus de forfait est anticipé, jamais rattrapé

`chiffrerCession` lève `ForfaitHorsChampError` quand un forfait de majoration est demandé
hors de son champ — le forfait travaux suppose une détention de **plus** de cinq ans. Un
écran qui balaie l'horizon depuis l'année 1 rencontre ce refus cinq fois sur trente.

ADR-013 avait tranché contre la retombée silencieuse. L'écran ne rattrape donc **aucune**
exception : il interroge `situationDeCession` puis `motifExclusionForfaitTravaux` avant
d'appeler, ne chiffre pas les années fermées, et **écrit le motif du moteur** — article du
code général des impôts compris. À l'horizon, l'option elle-même est grisée quand la durée
projetée la ferme, et elle reste **visible** : un utilisateur qui projette à cinq ans doit
pouvoir apprendre qu'un forfait de 15 % existe et lui est fermé.

### Ce qui la garde

`tests/e2e/patrimoine.spec.ts`, 32 tests sur les deux profils :

- **« les deux hypothèses décisives vivent dans le bloc de limite, et nulle part ailleurs »** ;
- **« l'échelle ne se recale pas sur l'hypothèse retenue »** — le repère du locataire à
  l'année 30 vaut 35,988 % du cadre à l'appréciation d'ouverture comme aux deux bornes de
  l'intervalle, mesuré en pixels, pendant que celui du propriétaire va de 16,996 % à 100 % ;
- **« les repères des deux courbes sont proportionnels aux montants du moteur »** — six
  repères confrontés aux montants, sans hauteur plancher ;
- **« un produit de vente négatif est dessiné sous la ligne de zéro »** — la ligne flotte à
  2,29 % du bas du cadre et l'année 1 est dessous ;
- **« le forfait travaux ferme les cinq premières années, et l'écran écrit pourquoi »** ;
- **« aucune tournure prescriptive n'atteint le lecteur »** — vingt tournures, dont six
  propres à ce niveau, sur trois adresses.

Vérifié à l'adoption, gardes cassées puis rétablies — sauvegarde par copie de fichier :
un plancher de 6 % sur les repères fait rougir **4 tests** ; une échelle assise sur les
seules courbes retenues en fait rougir **6** ; sortir les deux hypothèses du bloc de
limite, **4** ; une phrase prescriptive glissée dans le retournement, **2** ; le retour de
« ce niveau n'est pas encore construit » sur `/comparaison`, **2**. Un sabotage n'a rien
fait rougir du tout, et c'est l'entrée la plus utile : voir le journal de `docs/TASKS.md`.

### Conséquences acceptées

- **L'écran s'ouvre sur un nombre que le simulateur désavoue.** Le milieu d'un intervalle
  n'est pas une prévision, mais c'est bien un chiffre, et il produit tous les autres. La
  seule alternative honnête — n'ouvrir sur rien — rendait l'écran inutilisable au premier
  regard. Le désaveu est donc écrit à côté du curseur, pas dans une note.
- **Le bloc de limite est plus haut que celui du niveau simple**, puisqu'il porte deux
  champs au lieu d'une bascule. La contrainte d'ADR-015 tient quand même : c'est la
  **phrase** qui doit être dans la fenêtre du téléphone, et elle l'est ; les deux champs
  peuvent demander un défilement.
- **Six balayages de l'horizon au lieu d'un.** Les deux fourchettes coûtent quatre
  balayages supplémentaires. Mesuré sous la milliseconde sur trente ans, ce qui laisse le
  calcul synchrone et sans bouton.
- **La route est imbriquée sous `/comparaison`**, et l'accueil porte donc **deux liens sur
  une seule carte**. La garde d'`UI-014` a dû être reprise en conséquence : l'égalité se lit
  désormais entre routes déclarées et **liens** des cartes ouvertes, non entre routes et
  cartes. Ce qu'elle protège n'a pas bougé.

---

## ADR-021 — Le dépôt a deux destinataires, et l'interface a le droit d'être remarquable

**Date** : 23 août 2026 · **Statut** : adoptée · **Tickets** : `UI-016` à `UI-023`

### Contexte

Le brief design portait depuis l'origine un interdit rédigé ainsi : « **Pas d'esthétique
fintech.** Aucun dégradé violet-bleu, aucune carte à coins très arrondis flottant sur fond
blanc, aucune ombre portée diffuse. » Il a été retiré le 23 août 2026, à l'ouverture des
tickets `UI-016` à `UI-021`.

Le retrait n'était pas une correction de détail. Cet interdit interdisait des **procédés**,
là où les quatre autres puces de la même liste interdisent des **effets sur le lecteur** —
tromper par la taille, rassurer à tort, cacher la complexité, décorer au lieu de
représenter. Un dégradé ne trompe personne ; il ne figurait dans cette liste que par
réaction à un genre.

Le déclencheur du retrait est un objectif du projet qui n'était écrit nulle part. Ce dépôt
sert deux destinataires. Le premier est le primo-accédant décrit dans `docs/CONTEXT.md` §5.
Le second est **le lecteur professionnel** : ce projet est aussi un exercice de
construction rapide et une pièce à montrer — publication, capture, démonstration courte.
Il doit démontrer trois choses, un moteur de calcul non trivial, une architecture tenue
par des règles opposables, et **une démarche de design conduite**. Tant que le troisième
volet restait bridé par un interdit de procédé, il ne pouvait pas se démontrer : un
produit qui ne se laisse pas regarder ne prouve rien de la compétence qui le dessine.

Cet objectif est désormais écrit — `docs/CONTEXT.md` §11 — ce qui est la condition pour
qu'il puisse être arbitré au lieu d'être deviné.

### Décision

**1. Le second objectif est consigné, pas sous-entendu.** `docs/CONTEXT.md` §11 énonce ce
que le dépôt démontre et dans quel ordre. Il est explicitement subordonné : rien de ce qui
sert la démonstration n'entame ce qui sert l'utilisateur.

**2. L'interdit de procédé est remplacé par un interdit de conséquence.** La puce
« esthétique fintech » quitte le brief. Une puce entre à sa place : « **Pas d'effet qui
coûte à l'usage** — rien qui retarde un résultat, cache un texte derrière une interaction,
abaisse un contraste sous 4,5:1, ou ne survive pas à `prefers-reduced-motion` ». Dégradé,
halo, flou, angle adouci, profondeur deviennent des outils disponibles, jugés sur leur
effet et non sur leur genre.

**3. La liberté est bornée par une hiérarchie explicite**, écrite en section 10 du brief :
trois niveaux d'ornement selon que l'écran sert ou non à lire un chiffre engageant. Un
ornement juste au mauvais niveau reste un défaut.

**4. La palette décorative est disjointe de la palette sémantique.** Capital, intérêts,
assurance et marchés ne servent **jamais** d'ornement. L'ornement se construit sur encre,
papier, panneau, filet, accent, et sur des jetons `--ornement-*` déclarés pour cet usage.
Deux exceptions : une couleur sémantique employée là où elle signifie, et une
représentation de données.

**5. La métaphore directrice gagne sa seconde moitié.** « Un instrument de mesure, pas une
brochure » devient aussi « un instrument, pas un formulaire administratif ». Les documents
qui font foi restent la référence de la mise en ordre ; ils ne sont pas la référence de la
facture.

### Justification

**Pourquoi ne pas simplement assouplir au cas par cas ?** Parce qu'un interdit qu'on
contourne écran par écran ne protège plus rien et ne se garde pas. Les deux issues
honnêtes étaient de le tenir ou de le retirer en écrivant pourquoi. Le tenir aurait
sacrifié le troisième volet de la démonstration pour préserver une formulation défensive.

**Pourquoi la règle 4 est la contrepartie exacte du retrait.** La section 4 du brief pose
que la sémantique des couleurs est « la règle la plus importante du système ». C'est vrai
comme choix de produit, et c'est aussi ce que la démonstration a de plus solide à montrer :
une charte où chaque couleur porte un sens fixe dans tous les modules relève d'une démarche
de design, là où un empilement d'effets n'en relève pas. Ouvrir les procédés sans verrouiller
la sémantique aurait échangé l'atout contre l'ornement. Les maquettes qui ont déclenché la
discussion l'illustrent : leur dégradé magenta → cyan tombe à côté du violet de l'assurance
et du bleu des marchés, et c'est cela — non le dégradé — qui était le vrai coût.

**Pourquoi l'interdit de conséquence est meilleur que l'interdit de procédé.** Il est
vérifiable. « Pas de fintech » se plaide ; « contraste ≥ 4,5:1 mesuré sur le fond réel »,
« l'écran reste complet sous `prefers-reduced-motion` », « le parcours se fait au doigt sans
survol » se testent. La section 10.6 en fait cinq contrôles applicables à tout écran, dont
le test de la capture — l'écran arrêté doit se tenir seul, ce qui est aussi le meilleur
révélateur d'un effet qui compensait une composition faible.

### Conséquences acceptées

- **Le brief n'est plus un document figé.** Il porte désormais la trace datée d'un
  amendement, et la section 3 signale ce qui en est sorti. C'est plus lourd à lire, et
  c'est le prix de la traçabilité — le même arbitrage que pour les paramètres fiscaux.
- **La revue devient plus exigeante, pas moins.** Un interdit de genre se vérifiait à
  l'œil ; un interdit de conséquence demande cinq mesures par écran. C'est assumé : ces
  mesures existaient déjà, elles deviennent une liste.
- **Le risque de dérive est réel** et repose sur la règle 4. Si un écran emploie une
  couleur sémantique comme ornement, la convention se délite partout. D'où la garde
  ci-dessous, qui ne peut pas être seulement une intention.

### Ce qui la garde

- La garde des jetons — `src/app/__tests__/design-tokens.test.ts` — est étendue à la
  famille `--ornement-*` : déclarée dans les deux thèmes, et **distincte** des quatre
  jetons sémantiques. Un jeton d'ornement qui vaudrait la même couleur qu'un jeton
  sémantique fait échouer le test.
- Les cinq contrôles de la section 10.6 rejoignent la porte de branche pour tout ticket
  qui touche un écran : contraste dans les deux thèmes, clavier, doigt,
  `prefers-reduced-motion`, capture.
- La règle `@media (prefers-reduced-motion: reduce)` est livrée par `UI-017` **avant**
  toute animation, avec sa propre garde.

Voir `docs/01-brief-design.md` §2, §3 et §10, `docs/CONTEXT.md` §11, et
`docs/TICKETS-MOTIFS-UI.md`.

---

## ADR-022 — Une location est un récit, pas un point sur les courbes

**Date** : 25 août 2026 · **Statut** : adoptée · **Tickets** : `UI-024`, `UI-025`

### Contexte

Les moteurs de v0.3.1 sont livrés : `ENG-029` chiffre la location longue durée,
`ENG-015` la courte durée, chacune de la première année de location jusqu'à la
revente. L'écran `/comparaison/patrimoine`, lui, déclare encore les deux sorties
absentes, et il fallait décider **comment** elles y entrent.

L'analyse principale de cet écran balaie la vente année par année : à chaque
année de l'horizon, un produit net de vente, comparé au portefeuille du
locataire de référence **à la même date**. Une mise en location ne se plie pas à
cette forme. C'est un récit : des flux annuels d'abord — qui peuvent être
négatifs tant que la mensualité court —, une revente ensuite, à une date que la
durée de location repousse au-delà de l'horizon. La superposer aux courbes
aurait exigé l'un de ces deux mensonges : comparer des patrimoines à des dates
différentes sans actualisation, ou prolonger le portefeuille du locataire
au-delà de l'horizon avec un moteur qui n'existe pas.

### Décision

**1. L'analyse principale ne change pas.** Courbes, retournement, décompte :
la vente à chaque année contre le portefeuille, comme ADR-020 l'a dessinée.

**2. Les récits locatifs vivent dans la section des trois sorties, qui cesse de
déclarer des absences pour devenir le lieu où ils se chiffrent.** Un sélecteur
segmenté — vente, longue durée, courte durée ; l'onglet vente renvoie au
décompte au-dessus ; chaque onglet locatif porte ses champs et son décompte,
daté à ses propres échéances. Aucune ligne ne compare des euros de dates
différentes, et l'écran dit pourquoi.

**3. Le strict nécessaire se saisit, le reste s'affiche.** Dix clés d'URL
nouvelles ; la taxe foncière, les charges, l'assurance, la provision, les
indexations et le plan de financement sont **repris** des clés existantes.
L'assurance habitation saisie tient lieu d'assurance propriétaire non
occupant — approximation déclarée. Les hypothèses de `market.location`
(vacance, gestion, commission, conciergerie, amortissements) ne sont pas des
champs : elles s'affichent avec leur valeur, leur intervalle et leur fiabilité.

**4. La sortie regardée entre dans l'URL.** Elle ne change aucun chiffre du
moteur, mais elle change ceux que l'écran montre : un lien partagé doit ouvrir
sur ce que l'expéditeur regardait — la frontière d'ADR-005 passe ici.

**5. Le taux marginal d'imposition est une liste, pas un champ libre.** Cinq
taux, ceux du barème : une liste dit d'où ils viennent.

### Justification

La forme suit ce que les moteurs savent prouver. `ENG-029` et `ENG-015` rendent
des récits complets — série, reports, revente — et c'est ce que l'écran montre.
Ce qu'aucun moteur ne sait comparer, l'écran ne le compare pas : le refus de la
quatrième courbe est le même refus que celui de la valeur centrale d'ADR-020,
appliqué au temps plutôt qu'au marché.

### Ce qui la garde

`tests/e2e/patrimoine.spec.ts` : la garde « deux des trois sorties sont
annoncées comme non modélisées » s'inverse — les trois sont chiffrées, le
sélecteur fonctionne au clavier, une saisie de loyer change l'impôt affiché,
l'écart 17,2 / 18,6 % de prélèvements sociaux se lit, les alertes de seuil
apparaissent avec leur seuil, et les clés voyagent par URL sur les deux profils.

---

## ADR-023 — `impeccable` est un outil, les documents du dépôt restent l'autorité

**Date** : 25 août 2026 · **Statut** : adoptée · **Tickets** : `UI-016` à `UI-025`, v0.7.0

### Contexte

Une compétence de design d'interface, `impeccable`, est disponible sur le compte qui
développe ce projet. Elle couvre exactement le terrain des huit tickets de la phase 8
et de la refonte v0.7.0 : hiérarchie visuelle, charge cognitive, accessibilité,
typographie, espacement, couleur, mouvement, copie d'interface, états d'erreur, jetons.

Elle apporte trois choses que le dépôt n'a pas écrites. Un **vocabulaire de
sous-commandes** — `critique`, `audit`, `shape`, `polish`, `typeset`, `layout`,
`animate`, `clarify`, `adapt`, `harden`, `distill` — qui nomme précisément le geste
attendu. Une **notion de mode** — Persuade, Operate, Read, Experience — qui décrit ce
que réussir veut dire sur un écran donné. Et un **plancher de qualité** explicite,
chargé juste avant d'écrire de l'interface.

Elle apporte aussi ses propres artefacts. Sa commande `init` écrit un `PRODUCT.md`, sa
commande `document` un `DESIGN.md`, et son script de contexte les lit à chaque session.
**Ce dépôt possède déjà ces deux documents, sous d'autres noms** : `docs/CONTEXT.md`
pour le produit, `docs/01-brief-design.md` et `docs/06-design-system.md` pour le design.

La question n'était donc pas s'il faut employer la compétence, mais à quelle place —
et ce qu'on fait de ses artefacts.

### Décision

**1. Elle s'invoque sur les tickets d'interface, par sous-commande nommée.** Pas « fais
du design » : `critique` sur un écran qu'on évalue, `audit` sur ce qui se mesure,
`layout` ou `typeset` sur ce qu'on retouche. Le geste attendu est nommé, donc le
résultat est relisible.

**2. Elle n'écrit ni `PRODUCT.md` ni `DESIGN.md`, et c'est le cœur de cette décision.**
Deux descriptions d'une même chose divergent au premier changement, et la seconde n'est
découverte périmée que par l'erreur qu'elle a causée. C'est le motif d'ADR-008 — les
hypothèses de marché sorties de `params.ts` parce que rien ne les en distinguait — et
d'ADR-010 — l'ancre d'un terme calculée aux deux bouts plutôt qu'écrite deux fois. Le
jour où une session lance `init` par réflexe, ce paragraphe dit pourquoi elle ne doit
pas, et un test le vérifie.

**3. Les documents du dépôt sont l'autorité, la compétence est l'outil.** Ce qu'elle
propose et qui touche une décision déjà écrite — la sémantique des quatre couleurs, la
place des hypothèses sans valeur centrale, l'ordre du document — ne se change pas en
silence : ça devient un ADR, ou ça ne se fait pas. La compétence pose d'ailleurs cette
subordination elle-même : le brief l'emporte, et infléchir un brief clair vers son
propre goût est un échec, y compris quand le brief contredit ses propres avertissements.

**4. Le mode se lit dans le vocabulaire de la compétence, et il recoupe le §10.1 du
brief.** Les écrans où l'on décide d'un engagement — `/credit`, `/comparaison`,
`/comparaison/patrimoine` — sont en mode **Operate** : lisibilité, constance et scène
d'usage réelle passent avant l'expression. Les écrans qui expliquent — `/glossaire`,
`/credit/comprendre`, `/avertissement`, les pages légales, la galerie `/composants` —
sont en mode **Read**. Les trois écrans de la phase 8 sont ceux où l'ornement coûte le
moins, ce que le brief appelait déjà « hors travail ». La convergence est utile : deux
vocabulaires qui tombent d'accord valent mieux qu'un seul.

**5. Les cinq contrôles du §10.6 jugent, et la porte tranche.** La compétence propose ;
contraste dans les deux thèmes, clavier, doigt, `prefers-reduced-motion` et l'écran
arrêté qui se tient seul décident. Rien de ce qu'elle rend n'entre sans passer
`npm run porte`.

**6. Deux de ses mécanismes restent fermés pour l'instant.** Son **hook détecteur**,
qui s'exécute après chaque édition d'un fichier d'interface : le dépôt a déjà sa garde
de jetons, et deux détecteurs qui se contredisent coûteraient plus qu'ils ne rendent —
à rouvrir quand `UI-023` aura livré la famille `--ornement-*`. Et son **mode `live`**,
qui itère dans le navigateur : mesuré le 25 août 2026, l'aperçu interactif de cette
machine ne compose aucune image et les clics tombent sur un DOM inerte. La vérification
d'écran de ce projet passe par le build de production et Playwright.

### Justification

**Pourquoi ne pas l'employer sans écrire de règle.** Une compétence de design générique
propose des palettes, des accords de polices et des tendances — c'est son travail. Ce
dépôt a une charte où le vert veut dire capital et la brique intérêts, partout, sans
exception, et ADR-021 a fait de cette rigueur la contrepartie exacte de la liberté
graphique accordée. Le risque n'est pas théorique : c'est très précisément ce que la
règle 4 d'ADR-021 protège, et une compétence qui ignore un brief non écrit ne fait
aucune faute — c'est le brief qui manquait.

**Pourquoi ne pas s'en passer.** Le dépôt a un second destinataire (`CONTEXT.md` §11),
et le volet design est celui qu'il démontre le moins bien. Un vocabulaire de critique
et un plancher de qualité écrits par ailleurs sont exactement ce qui manque à des
tickets d'étude dont l'objet est de décider d'une forme. Refuser l'outil pour protéger
la charte reviendrait à protéger le troisième volet en l'empêchant d'exister.

### Ce qui la garde

`src/app/__tests__/documents-de-design.test.ts` — aucun `PRODUCT.md` ni `DESIGN.md` à
la racine ni dans `docs/`, et le message d'échec renvoie ici plutôt que d'annoncer un
fichier manquant. La règle elle-même est vérifiée présente dans `CLAUDE.md` : une règle
de procédé qui disparaît d'un fichier de contexte cesse d'être appliquée sans que rien
ne rougisse.

**Ce qu'aucun test ne garde** : que la compétence soit réellement subordonnée en séance.
Un agent peut suivre sa proposition contre le brief sans qu'un fichier bouge. Le seul
rempart est la relecture, et les cinq contrôles à l'arrivée — même partage qu'ADR-017
entre ce qu'une garde attrape et ce qu'elle ne peut pas.
