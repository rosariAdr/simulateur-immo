# Prototype — référence d'interaction

`pilotage-immobilier.jsx` est une maquette React à trois modules conservée comme **référence
d'interaction uniquement** : enchaînement des écrans, disposition des contrôles, moments de
révélation. Elle n'est ni compilée, ni importée, ni testée.

**Sa logique métier ne doit jamais être reprise.** Plusieurs de ses calculs sont faux, notamment
les amortissements LMNP et la formule du levier de remboursement anticipé — cette dernière utilise
l'approximation `P × ((1+r)^k − 1)`, qui surestime un versement conséquent de plus de 10 %.

La source de vérité pour tout calcul est `src/core/`, dont les formules sont testées et tracées
dans `docs/reference/SOURCES.md`.
