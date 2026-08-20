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
