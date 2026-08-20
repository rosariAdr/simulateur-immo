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
