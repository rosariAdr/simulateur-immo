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
