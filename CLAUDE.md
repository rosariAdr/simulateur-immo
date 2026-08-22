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
7. `docs/RELEASES.md` — versions, branches, portes de vérification

## Règles non négociables

**`src/core/` ne connaît pas l'interface.** Aucun import de `react`, `next` ou d'une API navigateur.
Fonctions pures uniquement. La règle de lint est là pour ça, ne pas la contourner.

**Le moteur crédit est gelé, le reste du moteur est ouvert.** `src/core/money.ts`,
`src/core/fiscal/params.ts` et `src/core/credit/**` ont été écrits et vérifiés hors dépôt :
leurs 95 tests et la traçabilité réglementaire de leurs commentaires ne se retouchent pas
sans raison explicite. Les nouveaux répertoires — `compare/`, `prepayment/`, `markets/`,
`aides/`, `types.ts` — s'écrivent normalement. Voir `docs/ADR.md`, ADR-004.

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

**On travaille sur une branche, jamais sur `main`.** Une branche par ticket,
`npm run porte` avant toute fusion, fusion en `--no-ff`. La porte enchaîne typecheck,
lint, Vitest, build et Playwright ; elle n'est pas facultative parce que le
changement est petit. Toute branche apporte ses tests, ou dit dans le message de
fusion pourquoi elle n'en a pas besoin. Voir `docs/RELEASES.md` et ADR-006.

**Une garde ne vaut que cassée au moins une fois.** Avant de déclarer qu'un test
protège quelque chose, le faire échouer exprès, puis rétablir. Les gardes ainsi
vérifiées sont listées dans `docs/REGISTRE-TESTS.md`.

## Fin de session

Consigner dans `docs/TASKS.md` l'état d'avancement et les décisions prises.
Toute décision d'architecture rejoint `docs/ADR.md` avec sa justification.
