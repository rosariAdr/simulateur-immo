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

Relevé du 22 août 2026, sur `feat/ENG-008-cas-de-reference`.

| Suite | Fichiers | Tests |
| --- | --- | --- |
| Unitaires | 8 | 235 |
| Bout en bout | 9 | 172 (86 × 2 profils), dont 3 ignorés par construction |
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
- `src/core/credit/__tests__/cas-de-reference.test.ts` — 18 tests adossés à **cinq
  sources extérieures au projet**, chacune nommée, datée et liée dans le fichier :
  tableau d'amortissement de La finance pour tous reproduit ligne à ligne, exemple
  représentatif publié par Société Générale reproduit **au centime** sur l'échéancier,
  l'assurance, le TAEG frais compris et le TAEA, seuils d'usure de l'avis du
  26 juin 2026 au *Journal officiel*, décision HCSF du 29 septembre 2021. Aucune
  valeur attendue ne vient de notre moteur, et chaque tolérance est une constante
  nommée dont l'écart mesuré est écrit à côté — là où l'accord est exact, l'égalité
  est stricte. C'est `ENG-008`.
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
- **Convention d'arrondi des cas de référence** — vérifiée par perturbation et non par
  sabotage, parce que `src/core/credit/**` est gelé (ADR-004) : en passant `rounding:
  "down"` — un levier que `LoanSpec` expose déjà — l'exemple représentatif de Société
  Générale n'est plus reproduit, 73 471,32 € d'intérêts au lieu des 73 473,03 €
  publiés, et la mensualité de La finance pour tous tombe à 1 255,03 € au lieu de
  1 255,04 €. L'accord au centime identifie donc une convention précise, et non un
  résultat robuste à n'importe quel arrondi. `half-even`, lui, est indiscernable de
  `half-up` sur ce prêt : aucune échéance ne tombe sur un demi-centime pile.
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

### Gardes ajoutées par `FIS-005` (22 août 2026)

- **Frontière loi / marché** — rétablir un champ `guarantee` dans `PARAMS_2026` fait
  échouer « le millésime fiscal ne porte plus les coûts de garantie ». La frontière est
  facile à refranchir sans y penser : le réflexe, la prochaine fois qu'une valeur de
  marché sera nécessaire, sera de l'ajouter là où il y a déjà tout le reste.
- **Valeur hors de son intervalle** — porter `suretyshipCostPct` à 1,85 sans toucher à
  son intervalle `[1,0 ; 1,5]` fait échouer deux tests. C'est l'erreur qu'on commet en
  relisant vite une grille tarifaire, et elle ne se voit pas à l'œil.
- **Taxonomie de la garantie** — remettre le champ « Garantie » en `réglementaire` fait
  échouer un test de bout en bout sur les deux profils.
---

## Relevé du 22 août 2026, sur `feat/UI-006-mobile`

| Suite | Fichiers | Tests |
| --- | --- | --- |
| Unitaires | 7 | 217 *(inchangé)* |
| Bout en bout | 10 | 194 (97 × 2 profils), dont 7 ignorés par construction |

Quatre ignorés de plus qu'en v0.1.1, tous dans `mobile.spec.ts` et tous porteurs de
leur raison : trois mesures n'ont de sens qu'au téléphone — le rognage, le
débordement latéral, les repères d'année ligne à ligne — et une n'a de sens qu'au
bureau, celle qui redimensionne la fenêtre à 1 024 px pour vérifier que la bascule
d'axe suit la largeur du ruban et non celle de l'écran.

### Le fichier ajouté

| Fichier | Tests | Objet |
| --- | --- | --- |
| `mobile.spec.ts` | 11 | Les cibles tactiles du ruban tiennent 24 px, **sur les deux profils** — la garde ne se limite pas au téléphone, parce que le défaut existait aussi à 1 024 px de fenêtre. Aucune part n'est relevée pour se rendre visible. Aucun montant n'est rogné à 412 ni à 360 px. La page ne défile jamais latéralement, tableau mensuel déplié compris. Le résumé chiffré précède la saisie sur écran étroit, et reste à sa droite au bureau |

### Une garde existante généralisée, et pourquoi

`amortissement.spec.ts` mesurait la HAUTEUR des trois segments d'une barre. Le ruban
ayant désormais deux orientations, cette mesure aurait interdit l'orientation au lieu
de protéger l'invariant : ce que la garde défend est la PROPORTION, pas un axe. Le
test lit maintenant l'axe dans le style calculé de la piste et mesure la dimension
qui porte la valeur.

Une généralisation peut devenir vraie pour une mauvaise raison — si les deux
orientations se réduisaient à une seule, la garde mesurerait toujours le bon axe
faute d'en avoir un second. `mobile.spec.ts` vérifie donc séparément que les deux
existent, et à la bonne largeur.

### Une dette nommée dans le fichier de test

La pastille « i » fait 15 × 15 px et manque le critère de cible tactile. Elle est
exclue de l'énumération de `mobile.spec.ts`, avec la raison écrite à l'endroit de
l'exclusion : sa géométrie est tenue par une garde d'`UI-005` qui mesure l'alignement
de la bulle sur son bord gauche au pixel près.

### Gardes vérifiées par sabotage

- **Plancher sur une part du ruban** — remettre `max(var(--part), 6px)` sur la bande
  étroite fait rougir **deux** tests sur le profil `mobile` et aucun sur `bureau` : la
  mesure de proportions généralisée et « aucune part n'est relevée ». Le sabotage est
  localisé, la garde aussi.
- **Seuil de bascule du ruban** — ramener la requête de conteneur de 700 à 300 px fait
  rougir **trois** tests, dont un au BUREAU : « année 1 : 10.6 px de large » au
  téléphone, « 412 px : attendu en lignes », et la bascule à 1 024 px de fenêtre. Ce
  troisième échec est celui qui prouve que le seuil porte sur le ruban et non sur
  l'écran.
- **Colonnes du bandeau d'indicateurs** — rétablir `grid-cols-2 lg:grid-cols-5` fait
  rougir deux tests, un par profil : les montants redébordent à 1 024 px comme à
  360 px. Le défaut de bureau et le défaut de téléphone avaient la même cause.
- **Ordre de lecture** — remettre le panneau de paramètres devant le bandeau fait
  rougir « le résumé chiffré précède la saisie », sur le profil `mobile` seul : au
  bureau la grille les replace, et c'est ce que l'autre branche du test vérifie.
