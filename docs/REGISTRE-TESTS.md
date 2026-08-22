# Registre des tests

Ce que la suite couvre, version par version. Il sert à une seule chose : rendre
visible une suite qui aurait **maigri** sans qu'un ticket l'explique.

La suite est cumulative par construction — aucun test n'est supprimé d'une version à
l'autre. Un compteur qui baisse arrête la version tant que la baisse n'est pas
justifiée par écrit.

Les compteurs se relèvent avec `npm run porte`, à froid, sur la branche
`release/vX.Y.Z`. Voir `docs/RELEASES.md` §3.

---

## Comment lire les compteurs

| Suite | Commande | Ce qu'elle prouve |
| --- | --- | --- |
| Unitaires | `npm run test` | Le moteur calcule juste, et les jetons de design tiennent leurs contrastes |
| Bout en bout | `npm run e2e` | Le site fait ce qu'il promet, sur deux profils : bureau 1280×900 et Pixel 7 |

Les tests de bout en bout tournent sur un **build de production**, jamais sur le
serveur de développement — celui-ci diffuse ses rechargements à chaud aux pages
ouvertes et remonte un composant en plein test.

---

## État courant — non publié

Relevé du 22 août 2026, sur `main`.

| Suite | Fichiers | Tests |
| --- | --- | --- |
| Unitaires | 4 | 129 |
| Bout en bout | 3 | 68 (34 × 2 profils) |

### Ce que couvrent les unitaires

- `src/core/credit/__tests__/` — annuité constante, échéancier, différé, assurance,
  TAEG par dichotomie, seuils d'usure et d'endettement. Cas de référence et
  invariants sous fast-check : la dernière échéance solde exactement, la somme des
  parts de capital égale le capital emprunté.
- `src/app/__tests__/design-tokens.test.ts` — 34 vérifications de contraste lues
  directement dans `globals.css`, seule source de vérité des couleurs.

### Ce que couvrent les tests de bout en bout

| Fichier | Tests | Objet |
| --- | --- | --- |
| `composants.spec.ts` | 13 | Les primitives dans leurs cinq états. Jamais d'information portée par la seule couleur ; tout état d'erreur porte un `role="alert"` visible |
| `credit.spec.ts` | 9 | Le module calcule les chiffres du moteur. **Un scénario partagé par URL redonne exactement les mêmes chiffres** — la promesse centrale du produit. Une URL trafiquée ne fait pas dérailler le calcul |
| `amortissement.spec.ts` | 12 | Le ruban ne ment pas sur les proportions, mesuré au pixel. Le curseur se déplace au clavier. Aucun montant n'est rogné dans sa cellule |

### Gardes vérifiées par sabotage

Un test vert ne prouve rien tant qu'on n'a pas vu ce qui le fait rougir. Ces
gardes-là ont été cassées exprès, puis rétablies :

- **Frontière moteur / interface** — une sonde important `react` depuis `src/core/`
  est rejetée par ESLint sous ses trois formes (nue, sous-module, `import type`).
- **Contrastes** — ramener `--assurance-texte` à la teinte de série le fait échouer
  à 3,99:1.
- **Jamais la couleur seule** — vider le libellé d'une famille de champ fait échouer
  le test correspondant.
- **Proportions du ruban** — rétablir un plancher de 6 % sur la bande d'assurance
  fait échouer la mesure au pixel.
- **Montants rognés** — retirer la largeur minimale du tableau fait réapparaître
  « 409 874,79 € » dans la liste des cellules tronquées.

---

## Versions publiées

*Aucune pour l'instant. La première ligne s'écrira à la sortie de v0.1.0.*

| Version | Date | Unitaires | Bout en bout | Notes |
| --- | --- | --- | --- | --- |
