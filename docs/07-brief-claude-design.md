# Dossier pour Claude Design — étape 3

Tout ce qu'il faut coller, dans quel ordre, et ce qu'il faut exiger en retour.
Ce document ne se colle pas lui-même : c'est ta feuille de route.

---

## 1. Ce que tu colles, dans cet ordre

| # | Fichier | Rôle | Le coller… |
|---|---|---|---|
| 1 | `docs/01-brief-design.md` | L'intention : métaphore, interdits, couleurs sémantiques, typographie, écrans attendus | **tel quel, intégralement**. Il est écrit pour ça. |
| 2 | `fixtures/PLANCHE-DESIGN.md` | Les données réelles : vrais montants, vrais tableaux, vrais cas non conformes | **tel quel**. 424 lignes. |
| 3 | `docs/06-design-system.md` | La palette et la typographie, arrêtées | **tel quel**. Ce sont des contraintes, pas des suggestions (voir §4). |

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
> Je te donne trois documents.
>
> Le premier décrit **l'intention de design** : métaphore directrice, interdits
> fermes, système de couleur sémantique, typographie, principes de composition.
> Lis-le comme un cahier des charges, pas comme une suggestion — les interdits de
> la section 3 sont fermes.
>
> Le deuxième contient la **palette et la typographie, arrêtées**. Elles ne sont
> pas à reproposer. Leurs valeurs sont validées par calcul — bande de clarté,
> plancher de chroma, séparation sous protanopie et deutéranopie, contraste — et
> gardées par un test automatisé. Compose avec elles. Si l'une d'elles t'empêche
> de résoudre un problème de conception, dis-le explicitement et explique
> pourquoi, plutôt que de la remplacer en silence.
>
> Le troisième contient les **sorties réelles du moteur de calcul**, sur quatre
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
> 1. **Les cinq états de chaque composant de saisie** : repos, survol, focus,
>    erreur, désactivé. En variables CSS nommées par leur rôle, jamais par leur
>    couleur, dans les deux thèmes.
> 2. **Tout jeton supplémentaire** que ta conception rend nécessaire — un état
>    d'erreur, une trame, un gris intermédiaire, une couleur de sélection. Nomme-le
>    par son rôle et donne sa valeur dans les deux thèmes. Tout texte doit
>    atteindre un contraste de 4,5:1, tout élément non textuel porteur de sens 3:1.
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

## 4. Palette et typographie — tranchées

**Décidées le 20 août 2026, et déjà en vigueur dans le code.** Elles ne sont pas une
proposition soumise à Claude Design : ce sont des contraintes d'entrée.

- Palette validée par calcul dans les deux thèmes, écrite dans `src/app/globals.css`
- Trois familles chargées par `src/app/layout.tsx` : Archivo, Public Sans, IBM Plex Mono
- `src/app/__tests__/design-tokens.test.ts` échoue si un contraste régresse

Formule à ajouter au prompt :

> La palette et la typographie sont **arrêtées**, elles ne sont pas à reproposer.
> Elles sont validées par calcul — bande de clarté, plancher de chroma, séparation
> sous protanopie et deutéranopie, contraste — et gardées par un test. Compose avec
> ces valeurs. Si l'une d'elles t'empêche de résoudre un problème de conception,
> dis-le explicitement et explique pourquoi, plutôt que de la remplacer en silence.

Deux points à connaître, parce qu'ils vont revenir :

- **Le violet de l'assurance ne peut pas être plus sombre.** Assombri vers
  l'« ardoise » que décrit le brief, il tombe à ΔE 11,8 du bleu marchés en vision
  normale, sous le plancher de 15. Ce n'est pas un choix esthétique, c'est une limite.
- **L'assurance ne pèse que 4 % de l'échéance**, donc sa bande dans le ruban est très
  fine. Question ouverte, légitime à poser à Claude Design : ce troisième poste
  mérite-t-il une lecture dédiée ailleurs plutôt qu'une bande de 5 pixels ?

---

## 5. Ce qui se passe au retour

Les jetons sont **déjà** dans `globals.css`, gardés par un test, et ADR-002 est
écrite. Poser les couleurs après avoir écrit des composants aurait été un retrofit
coûteux ; c'est fait, il reste :

1. Je consigne dans `docs/06-design-system.md` les **réponses aux trois questions**
   de la section 9 du brief, pour que cette connaissance ne vive pas seulement dans
   un fil de conversation.
2. Je transcris les **cinq états des composants de saisie** en jetons et en classes.
3. J'implémente le module crédit, avec la skill `impeccable`, en partant de l'écran
   de référence sur écran large.
4. Passe d'audit `impeccable` contre la liste du §3 ci-dessus.

Si Claude Design propose un jeton **supplémentaire** — un état d'erreur, une trame,
un gris intermédiaire — il rejoint `globals.css` et le test avant d'être utilisé.

---

## 6. Régénérer les données

Si un paramètre du moteur change, la planche se régénère :

```
npm run fixtures
```

Elle réécrit les quatre JSON et `fixtures/PLANCHE-DESIGN.md`. Ne jamais éditer ces
fichiers à la main : ils perdraient leur seule qualité, celle d'être vrais.
