# Dossier pour Claude Design — étape 3

Tout ce qu'il faut coller, dans quel ordre, et ce qu'il faut exiger en retour.
Ce document ne se colle pas lui-même : c'est ta feuille de route.

---

## 1. Ce que tu colles, dans cet ordre

| # | Fichier | Rôle | Le coller… |
|---|---|---|---|
| 1 | `docs/01-brief-design.md` | L'intention : métaphore, interdits, couleurs sémantiques, typographie, écrans attendus | **tel quel, intégralement**. Il est écrit pour ça. |
| 2 | `fixtures/PLANCHE-DESIGN.md` | Les données réelles : vrais montants, vrais tableaux, vrais cas non conformes | **tel quel**. 424 lignes. |
| 3 | `docs/06-design-system.md` §2 et §3 | Les jetons de couleur déjà validés | **seulement si tu valides la palette proposée** (voir §4 ci-dessous) |

Ne colle pas `docs/02-architecture.md`, ni `docs/03-spec-domaine.md`, ni le code du
moteur. Claude Design n'a pas besoin de savoir comment le calcul est fait, seulement
ce qu'il produit.

---

## 2. Le prompt

> Tu conçois l'interface d'un simulateur web français d'acquisition immobilière.
> Gratuit, sans compte, sans collecte de données. Le lecteur type est un
> primo-accédant qui ne connaît ni le TAEG ni la différence entre caution et
> hypothèque, et qui doit décider d'un engagement de vingt ans.
>
> Je te donne deux documents. Le premier décrit **l'intention de design** :
> métaphore directrice, interdits fermes, système de couleur sémantique,
> typographie, principes de composition. Lis-le comme un cahier des charges, pas
> comme une suggestion — les interdits de la section 3 sont fermes.
>
> Le second contient les **sorties réelles du moteur de calcul**, sur quatre
> scénarios. Tous les chiffres en sont issus, aucun n'est inventé. Utilise ces
> chiffres et eux seuls : n'invente aucun montant, aucune durée, aucun taux. Deux
> des quatre scénarios sont non conformes à une règle — c'est délibéré.
>
> Conçois les six écrans listés en section 8 du premier document, **dans l'ordre de
> priorité indiqué**, en commençant par le module crédit sur écran large. Cet écran
> fixe la grille, les composants de saisie, le bandeau d'indicateurs, le ruban
> d'amortissement et le tableau.
>
> Trois livrables sont attendus en plus des écrans :
>
> 1. **Les jetons de design en variables CSS**, nommés par leur rôle sémantique et
>    jamais par leur couleur. Un thème clair et un thème sombre. Tout texte doit
>    atteindre un contraste de 4,5:1.
> 2. **Les cinq états de chaque composant de saisie** : repos, survol, focus,
>    erreur, désactivé.
> 3. **Une réponse argumentée aux trois questions de la section 9.** Ce sont des
>    décisions de conception. Si tu ne les tranches pas, elles reviendront à
>    l'implémentation où elles coûteront dix fois plus cher.
>
> Trois contraintes que je souligne parce qu'elles sont habituellement mal traitées :
>
> - Le tableau d'amortissement fait **240 à 300 lignes**. Une maquette qui en montre
>   cinq ne prouve rien. Montre comment il reste consultable, y compris sur mobile.
> - L'état **non conforme** n'est pas un cas limite à traiter plus tard. C'est un
>   état de premier plan, et il doit informer sans juger l'utilisateur.
> - Les montants sont en **format français strict** : espace insécable comme
>   séparateur de milliers, virgule décimale, symbole euro après le montant. Les
>   colonnes de montants s'alignent à la virgule près.

---

## 3. Ce que tu dois refuser en retour

Une maquette qui présente l'un de ces défauts est à renvoyer, quelle que soit sa
qualité par ailleurs. Ce sont les interdits du brief, rendus vérifiables.

- [ ] Un dégradé, une ombre portée diffuse, une carte flottante à coins très arrondis
- [ ] Une illustration décorative : personnage, maison stylisée, icône ronde colorée
- [ ] Un vert massif signifiant « bonne nouvelle », un emoji, un badge de félicitation
- [ ] Un chiffre géant sans légende qui le qualifie
- [ ] Une information portée par la couleur seule, sans libellé, position ni motif
- [ ] Un tableau montré sur cinq lignes au lieu de sa longueur réelle
- [ ] Un montant inventé, ou un montant au format anglo-saxon
- [ ] Trois champs de saisie qui prétendent résumer l'opération

---

## 4. La décision qui te revient avant de commencer

**La palette.** `docs/06-design-system.md` propose un jeu de valeurs déjà validé par
calcul : bande de clarté, plancher de chroma, séparation sous deutéranopie et
protanopie, contraste. Deux options :

- **Tu la valides** → tu la colles à Claude Design comme contrainte, et il compose
  avec. C'est le chemin court, et il garantit l'accessibilité.
- **Tu préfères la laisser ouverte** → tu ne colles que le brief, et tu demandes à
  Claude Design de proposer. Il faudra alors revalider ses valeurs par le même
  calcul, et accepter qu'elles bougent.

**La typographie.** Trois familles proposées — Archivo, Public Sans, IBM Plex Mono —
avec deux variantes documentées. Même choix : imposer, ou laisser proposer. Si tu
laisses proposer, exige que la monospace ait de vrais chiffres tabulaires et que
toutes les familles soient sous licence libre et auto-hébergeables.

---

## 5. Ce qui se passe au retour

1. Je transcris les jetons dans `src/app/globals.css` et je **vérifie les contrastes
   par calcul**, pas à l'œil (`INF-004`).
2. Je consigne la palette retenue et les réponses aux trois questions dans
   `docs/06-design-system.md`, pour que cette connaissance ne vive pas seulement
   dans un fil de conversation.
3. J'ouvre ADR-002 sur la convention de nommage des jetons.
4. **Les jetons sont commités avant le premier composant.** Poser les couleurs après
   avoir écrit des composants, c'est un retrofit qui coûte cher.
5. J'implémente le module crédit, avec la skill `impeccable`.
6. Passe d'audit `impeccable` contre la liste du §3 ci-dessus.

---

## 6. Régénérer les données

Si un paramètre du moteur change, la planche se régénère :

```
npm run fixtures
```

Elle réécrit les quatre JSON et `fixtures/PLANCHE-DESIGN.md`. Ne jamais éditer ces
fichiers à la main : ils perdraient leur seule qualité, celle d'être vrais.
