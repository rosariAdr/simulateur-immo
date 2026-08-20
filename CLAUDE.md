# CLAUDE.md

Simulateur d'acquisition et de pilotage patrimonial immobilier. Application web française,
publique, gratuite, sans compte ni backend.

## Avant toute intervention

Lire dans cet ordre :

1. `docs/INDEX.md` — récapitulatif de l'état du projet et inventaire des livrables
2. `docs/CONTEXT.md` — positionnement, thèse produit, cartographie des modules
3. `docs/02-architecture.md` — stack, structure du dépôt, conventions
4. `docs/03-spec-domaine.md` — formules, règles fiscales, invariants
5. `docs/ADR.md` — décisions d'architecture et leurs raisons
6. `docs/TASKS.md` — tickets ouverts

## Règles non négociables

**`src/core/` ne connaît pas l'interface.** Aucun import de `react`, `next` ou d'une API navigateur.
Fonctions pures uniquement. La règle de lint est là pour ça, ne pas la contourner.

**Toute modification du moteur s'accompagne d'un test.** Les invariants listés dans `docs/03-spec-domaine.md`
doivent continuer de passer.

**Aucune valeur réglementaire écrite en dur.** Taux, seuils, abattements et barèmes vivent
dans `src/core/fiscal/`, datés et sourcés.

**Aucune recommandation personnalisée.** Le produit calcule des scénarios, l'utilisateur décide.
Écrire « dans cette configuration, l'écart est de X », jamais « vous devriez ».

**Calculs en centimes entiers.** Arrondi uniquement à l'affichage. Vérifier que la dernière
échéance solde exactement.

**Le sens des couleurs est fixe.** Vert pour le capital et les gains, brique pour les intérêts
et les coûts, violet pour l'assurance, bleu pour les marchés. Identique dans tous les modules.

## Fin de session

Consigner dans `docs/TASKS.md` l'état d'avancement et les décisions prises.
Toute décision d'architecture rejoint `docs/ADR.md` avec sa justification.
