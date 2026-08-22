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

Relevé du 22 août 2026, sur `feat/CNT-002-fiches`.

| Suite | Fichiers | Tests |
| --- | --- | --- |
| Unitaires | 8 | 238 |
| Bout en bout | 10 | 204 (102 × 2 profils), dont 3 ignorés par construction |

Relevé précédent, sur `feat/UI-005-infobulles` : 7 fichiers et 217 unitaires,
9 fichiers et 172 tests de bout en bout. `CNT-002` apporte 21 unitaires et
14 tests de bout en bout ; les deux qui restent viennent de `avertissement.spec.ts`,
dont la liste `ROUTES` accueille la nouvelle route.

Les trois ignorés ne sont pas des trous : deux mesures du toucher n'ont de sens que
sur le profil `mobile`, et l'alignement d'une bulle de 264 px sur sa pastille n'en a
que sur un écran large. Chacun porte sa raison dans son `test.skip`.

### Ce que couvrent les unitaires

- `src/core/credit/__tests__/` — annuité constante, échéancier, différé, assurance,
  TAEG par dichotomie, seuils d'usure et d'endettement. Cas de référence et
  invariants sous fast-check : la dernière échéance solde exactement, la somme des
  parts de capital égale le capital emprunté.
- `src/app/__tests__/design-tokens.test.ts` — 34 vérifications de contraste lues
  directement dans `globals.css`, seule source de vérité des couleurs.
- `src/content/__tests__/fiche-credit.test.ts` — 21 vérifications sur les chiffres de
  la fiche `CNT-002`. La première est la plus importante : l'exemple de la fiche est
  comparé à `versEntreeMoteur(DEFAUTS)`, c'est-à-dire au scénario que `/credit` ouvre
  par défaut. La fiche promet « ouvrez le simulateur, vous retrouverez ces chiffres » ;
  cette égalité est tout ce qui l'empêche de mentir. Le reste vérifie qu'aucune valeur
  réglementaire n'est recopiée — seuils d'usure, normes du HCSF, seuils de la loi
  Lemoine sont confrontés un à un à `params.ts` — et qu'aucune tournure prescriptive
  n'entre dans le module de contenu.
- `src/content/__tests__/glossaire.test.ts` — 65 vérifications sur les entrées
  d'infobulle : une phrase terminée par champ, longueur plafonnée, aucun terme défini
  deux fois, aucun jeton laissé sans valeur, aucune formule de recommandation. Cinq
  assertions y sont des `@ts-expect-error`, vérifiées par `npm run typecheck` et non
  par Vitest — elles échouent si la contrainte de type s'affaiblit.

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
| `fiche-credit.spec.ts` | 14 | La fiche `/credit/comprendre` nomme les trois familles en toutes lettres et chaque section porte son étiquette **écrite**, jamais un simple trait coloré. Le chemin avec `/credit` est parcouru dans les deux sens, cliqué et suivi. **La mensualité annoncée par la fiche est celle que le module affiche** — la promesse « reproduisez-le » est exécutée, pas cochée. Et **aucune tournure prescriptive n'atteint le lecteur**, sur le document entier |

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
- **Aucune recommandation, sur la page rendue** — glisser « Vous devriez le savoir »
  dans la section des garanties fait rougir les deux profils, avec la tournure en
  clair dans le message : « la fiche emploie \bvous devriez\b ». C'est la garde de la
  règle la plus importante du projet, et elle lit le document entier.
- **Étiquette de famille écrite, pas seulement tracée** — vider le libellé de
  l'étiquette de section laisse la bordure et sa couleur en place ; le test le voit
  quand même, sur les deux profils : « l'étiquette negociable est muette ».
- **Dérive de l'exemple de la fiche** — passer le taux de l'exemple de 3,2 à 3,5 %
  fait rougir les deux gardes jumelles : l'unitaire sur la différence avec
  `versEntreeMoteur(DEFAUTS)`, et le bout en bout sur la mensualité — « 1 088,93 € »
  attendu contre « 1 061,39 € » affiché par le module. Une fiche qui dérive du
  simulateur ment au lecteur sans qu'aucune page cesse de s'afficher.
- **Règle des deux phrases** — ramener `UnePhrase<S>` à `S` fait échouer
  `npm run typecheck` sur quatre `@ts-expect-error` devenus inutiles : la troisième
  phrase, la phrase inachevée et le texte assemblé à l'exécution redeviendraient
  écrivables.

---

## Versions publiées

| Version | Date | Unitaires | Bout en bout | Notes |
| --- | --- | --- | --- | --- |
| v0.1.1 | 22 août 2026 | 217 | 172 (86 × 2 profils) | Correctif UI-012. Deux gardes pour un seul défaut : ce que la feuille déclare, et ce que le navigateur calcule |
| v0.1.0 | 22 août 2026 | 214 | 164 (82 × 2 profils) | Porte passée à froid, `.next` supprimé. Critère de sortie **exécuté** et non coché : `parcours-v0-1.spec.ts` va de l'accueil au lien partagé, sur les deux profils |

**Ce que ce relevé ne couvre pas.** La porte s'exécute sur un build local. Elle ne dit
rien de ce que l'hébergeur sert réellement : la vérification du déploiement est une
étape distincte, postérieure à l'étiquette, et elle se fait à la main.
