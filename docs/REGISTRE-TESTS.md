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

Relevé du 22 août 2026, sur `feat/CNT-001-glossaire`.

| Suite | Fichiers | Tests |
| --- | --- | --- |
| Unitaires | 8 | 553 |
| Bout en bout | 10 | 192 (96 × 2 profils), dont 5 ignorés par construction |

Le bond des unitaires — 217 à 553 — n'est pas une couverture qui triple : c'est
`it.each` sur quarante-huit entrées de glossaire là où il y en avait dix-neuf, et six
invariants par entrée au lieu de trois. Le nombre de **propriétés vérifiées** passe de
quatre à dix ; le reste est de la multiplication.

Les cinq ignorés ne sont pas des trous : trois mesures du toucher n'ont de sens que sur
le profil `mobile`, un trajet de souris n'en a que sur le profil `bureau`, et
l'alignement d'une bulle de 264 px sur sa pastille n'en a que sur un écran large. Chacun
porte sa raison dans son `test.skip`.

Un défaut d'outillage a été corrigé au passage : `vitest.config.mts` ne résolvait pas
l'alias `@/`. Tout module qui l'emploie compilait mais ne s'exécutait pas sous Vitest —
`src/lib/format.ts` et `src/content/valeurs.ts` étaient donc **intestables**, sans que
rien ne le dise, parce qu'aucun test ne les avait encore touchés.

### Ce que couvrent les unitaires

- `src/core/credit/__tests__/` — annuité constante, échéancier, différé, assurance,
  TAEG par dichotomie, seuils d'usure et d'endettement. Cas de référence et
  invariants sous fast-check : la dernière échéance solde exactement, la somme des
  parts de capital égale le capital emprunté.
- `src/app/__tests__/design-tokens.test.ts` — 34 vérifications de contraste lues
  directement dans `globals.css`, seule source de vérité des couleurs.
- `src/content/__tests__/glossaire.test.ts` — 152 vérifications sur les entrées
  d'infobulle : une phrase terminée par champ, longueur plafonnée, aucun terme défini
  deux fois, aucun jeton laissé sans valeur, aucune formule de recommandation. Cinq
  assertions y sont des `@ts-expect-error`, vérifiées par `npm run typecheck` et non
  par Vitest — elles échouent si la contrainte de type s'affaiblit.
- `src/content/__tests__/developpements.test.ts` — 249 vérifications sur le texte long
  du glossaire : chaque entrée a son développement et chaque développement son entrée,
  chaque thème est peuplé, aucun renvoi ne pointe dans le vide, aucun développement ne
  se contente de répéter sa bulle, **aucune valeur réglementaire n'est écrite à la
  main** et aucun jeton ne survit au rendu. Les ancres y sont vérifiées non vides, de
  forme `[a-z0-9-]` et toutes distinctes — c'est ce qui garantit qu'un lien d'infobulle
  ne tombe pas sur la définition d'un autre terme. Trois `@ts-expect-error` y gardent la
  vérification des jetons, des thèmes et des renvois à la compilation.

### Ce que couvrent les tests de bout en bout

| Fichier | Tests | Objet |
| --- | --- | --- |
| `composants.spec.ts` | 13 | Les primitives dans leurs cinq états. Jamais d'information portée par la seule couleur ; tout état d'erreur porte un `role="alert"` visible |
| `credit.spec.ts` | 9 | Le module calcule les chiffres du moteur. **Un scénario partagé par URL redonne exactement les mêmes chiffres** — la promesse centrale du produit. Une URL trafiquée ne fait pas dérailler le calcul |
| `avertissement.spec.ts` | 13 | L'avertissement est présent et visible sur toute route qui affiche un chiffre, il ne peut pas être fermé, et aucune page n'est indexable tant que les textes n'ont pas été relus |
| `amortissement.spec.ts` | 12 | Le ruban ne ment pas sur les proportions, mesuré au pixel. Le curseur se déplace au clavier. Aucun montant n'est rogné dans sa cellule |
| `accueil.spec.ts` | 9 | L'accueil énonce les trois familles en toutes lettres, mène réellement à `/credit` — cliqué et suivi — et **ne présente pas comme disponibles les quatre modules qui n'existent pas** |
| `legal.spec.ts` | 14 | Les trois textes s'affichent datés, sont atteignables depuis le simulateur, et **l'identité de l'hébergeur figure sur le site** — c'est la contrepartie de l'anonymat de l'éditeur, pas une politesse |
| `infobulles.spec.ts` | 9 | Un appui du doigt ouvre la bulle **et l'y laisse**. Aucune bulle ne fait défiler la page, sur les deux profils. Aucune n'affiche un jeton resté sans valeur, et celle de la durée cite les plafonds du millésime |
| `glossaire.spec.ts` | 10 | La page rend ses quarante-huit termes, index compris, sans jeton laissé sans valeur et sans famille portée par la seule couleur. Surtout : le lien d'une bulle est **atteignable pour de vrai** — au clavier par tabulation, à la souris en traversant le vide entre la pastille et la bulle, au doigt par deux appuis. Et **aucun lien de bulle ne tombe dans le vide** : tous les liens de `/credit` et `/composants` sont relevés, puis confrontés aux ancres réelles de `/glossaire` |

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
- **Avertissement permanent** — retirer `<Avertissement />` de la mise en page fait
  échouer six tests, un par route et un par propriété.
- **Contrôles natifs** — retirer `color-scheme: dark` de `:root` fait rougir le test unitaire qui lit la feuille ET les deux tests de bout en bout qui lisent le calcul du navigateur. Le défaut vivait hors du DOM : aucun test de contraste ne pouvait l'attraper.
- **Marche de l'échéance** — rétablir la comparaison d'origine (toute différence, dernière échéance comprise) fait échouer quatre tests sur sept : la légende annoncerait de nouveau un différé qui n'existe pas.
- **Identité de l'hébergeur** — retirer l'adresse de Vercel des mentions légales fait échouer la garde qui la cherche : sans elle, l'anonymat de l'éditeur n'a plus de fondement.
- **Assiette de la mainlevée** — asseoir le coût de mainlevée sur le capital emprunté
  au lieu du prix du bien fait échouer le test de garantie correspondant.
- **Modules à venir non cliquables** — envelopper le titre d'un module à venir dans
  un lien fait rougir `accueil.spec.ts` : « le module comparaison est cliquable ».
- **Familles nommées en toutes lettres sur l'accueil** — vider le titre d'une carte
  de famille la laisse avec son message et ses exemples, mais plus le mot
  « négociable » : le test le voit.
- **Ouverture au toucher** — rétablir le clic qui bascule l'état courant fait échouer
  les deux mesures tactiles du profil `mobile` : la bulle n'est plus visible après
  l'appui, et le second appui ne trouve rien à refermer.
- **Débordement de la bulle** — rétablir l'ancrage `left-0` à largeur fixe fait
  échouer la mesure sur les deux profils, avec le chiffre : 1 453 px défilables pour
  1 280 visibles au bureau (« Coût de l'assurance »), 472 pour 412 sur Pixel 7
  (« taux d'usure »).
- **Règle des deux phrases** — ramener `UnePhrase<S>` à `S` fait échouer
  `npm run typecheck` sur quatre `@ts-expect-error` devenus inutiles : la troisième
  phrase, la phrase inachevée et le texte assemblé à l'exécution redeviendraient
  écrivables.
- **Valeur réglementaire écrite à la main** — remplacer `{plafondEndettement}` par
  « 35 % » dans le développement du HCSF fait rougir « `hcsf` n'écrit aucune valeur
  réglementaire à la main », qui cite le paragraphe fautif en entier.
- **Exhaustivité des développements** — retirer l'entrée `taxeFonciere` de
  `DEVELOPPEMENTS` fait échouer `npm run typecheck` sur `TS1360` **et** rougir le test
  d'exhaustivité. Les deux comptent : le message de TypeScript ne nomme pas la clé
  manquante, le test si.
- **Unicité des ancres** — renommer « abattement pour durée de détention » en « plus
  value immobilière », terme distinct de « plus-value immobilière » et donc accepté par
  la garde d'unicité des termes, fait échouer l'unicité des ancres : « expected 47 to
  be 48 ». Sans elle, le lien d'une bulle mènerait à la définition d'un autre terme.
- **Le pont sous la bulle** — retirer le `[data-pont]` de la pastille fait rougir un
  seul test, « à la souris, la bulle survit au trajet de la pastille vers le lien », avec
  le bon message : la souris traverse de nouveau sept pixels hors de la zone, la bulle
  se ferme, et le lien n'existe plus quand on arrive dessus.
- **Fermeture au `blur` du bouton** — rétablir `onBlur={() => setOuverte(false)}` sur le
  bouton fait rougir les deux tests clavier de `glossaire.spec.ts` : le lien ne reçoit
  jamais le focus, parce qu'il est démonté par la tabulation même qui devait l'atteindre.
  Les neuf tests de `infobulles.spec.ts` restent verts — c'est ce qui prouve qu'aucun
  d'eux ne couvrait ce chemin.

---

## Versions publiées

| Version | Date | Unitaires | Bout en bout | Notes |
| --- | --- | --- | --- | --- |
| v0.1.1 | 22 août 2026 | 217 | 172 (86 × 2 profils) | Correctif UI-012. Deux gardes pour un seul défaut : ce que la feuille déclare, et ce que le navigateur calcule |
| v0.1.0 | 22 août 2026 | 214 | 164 (82 × 2 profils) | Porte passée à froid, `.next` supprimé. Critère de sortie **exécuté** et non coché : `parcours-v0-1.spec.ts` va de l'accueil au lien partagé, sur les deux profils |

**Ce que ce relevé ne couvre pas.** La porte s'exécute sur un build local. Elle ne dit
rien de ce que l'hébergeur sert réellement : la vérification du déploiement est une
étape distincte, postérieure à l'étiquette, et elle se fait à la main.
