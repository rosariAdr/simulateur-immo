@AGENTS.md

<!-- CLAUDE.md = pointeur : les conventions ET les règles du projet vivent dans AGENTS.md, lu aussi par Codex. Ne pas dupliquer de règle ici — l'ajouter dans AGENTS.md. Seules restent ci-dessous les notes propres à Claude Code. -->

## Notes Claude Code

- **La compétence `impeccable` sert les tickets d'interface, subordonnée aux documents.** L'invoquer par sous-commande nommée — `critique` et `shape` sur une étude, `audit`, `polish`, `layout`, `typeset`, `clarify` ou `adapt` sur une réalisation — et non par une demande vague. Les documents du dépôt restent l'autorité : ce qu'elle propose et qui touche une décision écrite devient un ADR, ou ne se fait pas. **Elle n'écrit ni `PRODUCT.md` ni `DESIGN.md`** : `docs/CONTEXT.md` et `docs/01-brief-design.md` sont déjà ces documents, et deux descriptions d'une même décision divergent. Les cinq contrôles du §10.6 jugent le résultat. Voir ADR-023.
- **Commits** : ne jamais committer automatiquement. Proposer le message, laisser le dev committer (GitKraken). **Aucun `Co-Authored-By`** (AGENTS.md §0).
- **Avant d'ouvrir une PR** : `npm run porte`, puis `/code-review`.
- **Worktrees** : avec `--worktree`, renommer la branche à la convention (`feat|fix|chore/…` — le défaut `worktree-<nom>` ne la respecte pas) et fixer `PORT_E2E`.
