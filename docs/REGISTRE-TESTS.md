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
| Déploiement | `npm run verif-deploiement` | Le public voit bien ce code-là. **Hors porte**, après l'étiquette |

Les deux premières entrent dans `npm run porte`, la troisième non — et ce n'est pas un
oubli. Voir plus bas, « Ce que ce relevé ne couvre pas ».

Les tests de bout en bout tournent sur un **build de production**, jamais sur le
serveur de développement — celui-ci diffuse ses rechargements à chaud aux pages
ouvertes et remonte un composant en plein test.

---

## État courant

Relevé du 23 août 2026 sur `release/v0.3.0`, porte passée à froid, `.next` supprimé.

| Suite | Fichiers | Tests |
| --- | --- | --- |
| Unitaires | 20 | 955 |
| Bout en bout | 16 | 386 (193 × 2 profils), dont 10 ignorés par construction |
| Déploiement | 1 | 52 (26 × 2 profils), hors porte — voir plus bas |

**Les 282 unitaires ajoutés depuis le 22 août sont le moteur de la phase 3**, et eux ne
sont pas de la multiplication : sept fichiers neufs sous `src/core/compare/` et
`src/core/assumptions/`, un par module — détention, portefeuille, vente, plus-value,
hypothèses de marché — plus les invariants de détention isolés dans leur propre fichier.
La règle « toute modification du moteur s'accompagne d'un test » a tenu sur les sept
branches de la vague, sans exception à signaler.

**Un test a trouvé un défaut que personne ne cherchait, et c'est le meilleur argument
de ce registre.** En écrivant l'assemblage `ENG-027`, un cas de bout en bout a dérivé
son prix de cession d'une valeur appréciée plutôt que de le saisir en euros ronds.
L'assiette a donc porté des centimes pour la première fois, et la recherche de tranche
de la surtaxe a levé : le barème est libellé en euros entiers et laissait une fente de
99 centimes que douze mois de tests en euros ronds n'avaient pas pu atteindre.

`FIS-008` a ensuite montré que le correctif d'`ENG-027` taxait où la loi ne taxe pas :
l'assiette d'un impôt est un nombre entier d'euros — CGI, art. 1649 undecies — de sorte
qu'une assiette de 50 000,10 € s'arrondit à 50 000 € et n'est pas « supérieure à
50 000 € ». La surtaxe du cas de référence passe de 500,01 € à zéro. Et la fente n'existe
pas : une assiette entière tombe toujours dans une tranche.

**Trois pas, dont deux faux, et aucun n'aurait été franchi sans le précédent.** C'est la
forme que prend le travail réglementaire quand il est fait honnêtement, et ce registre
ment s'il ne montre que le dernier.

**Le bond des unitaires — 217 à 619 — n'est pas une couverture qui triple.** C'est
`it.each` sur quarante-huit entrées de glossaire là où il y en avait dix-neuf, et six
invariants par entrée au lieu de trois. Le nombre de **propriétés vérifiées** passe de
quatre à dix ; le reste est de la multiplication. Un compteur qui monte n'est pas en
soi une bonne nouvelle, et le dire ici est la moitié de l'intérêt de ce registre.

**Les dix ignorés ne sont pas des trous.** Sept mesures tactiles n'ont de sens que sur
le profil `mobile`, un trajet de souris que sur `bureau`, et l'alignement d'une bulle
de 264 px sur sa pastille que sur un écran large. Chacun porte sa raison dans son
`test.skip`.

**Un défaut d'outillage corrigé en chemin.** `vitest.config.mts` ne résolvait pas
l'alias `@/`. Tout module qui l'emploie compilait mais ne s'exécutait pas sous Vitest :
`src/lib/format.ts`, `src/lib/scenario.ts` et `src/content/valeurs.ts` étaient
**intestables unitairement**, sans que rien ne le signale, parce qu'aucun test ne les
avait encore touchés. Le compteur ne pouvait pas révéler ce manque — un test qu'on
n'écrit pas ne laisse aucune trace. C'est la limite de ce registre, et elle mérite
d'être écrite à côté de ses chiffres.

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
- `src/app/__tests__/design-tokens.test.ts` — 37 vérifications de contraste lues
  directement dans `globals.css`, seule source de vérité des couleurs.
- `src/core/compare/__tests__/` — le moteur de la phase 3, 231 vérifications sur six
  fichiers. `detention` (33) et ses invariants isolés (16), `portefeuille` (42),
  `vente` (40), `plus-value` (40) et l'assemblage `cession` (30). Ce que ces fichiers
  gardent n'est pas surtout de l'arithmétique : ce sont des **idées reçues**. Un loyer
  nul ne donne pas un croisement immédiat mais aucun croisement ; la surtaxe s'éteint
  à 22 ans et non à 30, parce qu'elle est assise sur l'assiette fiscale ; un produit
  de vente négatif est une information et non une erreur ; le régime social du cédant
  commande le taux des prélèvements, et lui seul. Chaque module rend dans
  `nonModelise` ce qu'il ne sait pas traiter, et c'est testé aussi.
- `src/core/__tests__/money-arrondi-euro.test.ts` — 6 vérifications sur `roundToEuros`,
  ajouté par `FIS-008` : la fraction de 0,50 € comptée pour 1 et 0,49 € qui ne l'est
  pas, l'idempotence, la monotonie — arrondir ne peut pas inverser deux montants — et
  le refus d'un montant hors du domaine entier exact.
- `src/core/assumptions/__tests__/market.test.ts` — 81 vérifications. La frontière
  loi / marché d'ADR-008, gardée dans les deux sens : `params.ts` ne doit plus porter
  de fourchette indicative, et chaque hypothèse de marché doit déclarer sa provenance
  en une phrase montrable, sa fiabilité et un intervalle qui contient sa valeur. Le
  parcours part de la structure de `MARKET_2026`, si bien qu'un bloc ajouté entre dans
  la garde du seul fait d'exister — correctif d'un défaut où trois blocs échappaient à
  toutes les vérifications sans qu'aucun test ne rougisse.
- `src/core/fiscal/__tests__/params-plus-value.test.ts` — 52 vérifications sur les
  valeurs de la phase 3 : les **deux** barèmes d'abattement soldent bien à 100 % à 22
  et 30 ans respectivement, les taux ne décroissent jamais, et les seuils sont ceux du
  millésime. Une nuance à connaître avant de s'y fier : la garde de contiguïté du
  barème de surtaxe vérifie que chaque tranche ouvre **un euro** après la fermeture de
  la précédente. Le barème est donc contigu **en euros entiers**, ce qui est ce que dit
  le texte — et pas en centimes, ce qui est ce que calcule le moteur. C'est
  précisément la fente qu'`ENG-027` a rencontrée et que `FIS-008` doit trancher. Le
  test était juste ; c'est sa lecture rapide qui rassurait à tort.
- `src/content/__tests__/fiche-credit.test.ts` — 21 vérifications sur les chiffres de
  la fiche `CNT-002`. La première est la plus importante : l'exemple de la fiche est
  comparé à `versEntreeMoteur(DEFAUTS)`, c'est-à-dire au scénario que `/credit` ouvre
  par défaut. La fiche promet « ouvrez le simulateur, vous retrouverez ces chiffres » ;
  cette égalité est tout ce qui l'empêche de mentir. Le reste vérifie qu'aucune valeur
  réglementaire n'est recopiée — seuils d'usure, normes du HCSF, seuils de la loi
  Lemoine sont confrontés un à un à `params.ts` — et qu'aucune tournure prescriptive
  n'entre dans le module de contenu.
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
| `fiche-credit.spec.ts` | 14 | La fiche `/credit/comprendre` nomme les trois familles en toutes lettres et chaque section porte son étiquette **écrite**, jamais un simple trait coloré. Le chemin avec `/credit` est parcouru dans les deux sens, cliqué et suivi. **La mensualité annoncée par la fiche est celle que le module affiche** — la promesse « reproduisez-le » est exécutée, pas cochée. Et **aucune tournure prescriptive n'atteint le lecteur**, sur le document entier |
| `parcours-v0-3.spec.ts` | 3 | Le critère de sortie de v0.3.0, **exécuté**. Sa phrase se découpe en quatre exigences — le site répond, il montre les hypothèses qui portent la réponse, il laisse les changer, et il dit en quoi sa réponse est fausse. La quatrième est la seule qu'un paragraphe non lu pourrait satisfaire « sur le papier » : elle est donc vérifiée par la **position dans le document**, aux deux niveaux |
| `patrimoine.spec.ts` | 32 | La route `/comparaison/patrimoine`, le niveau approfondi. Le retournement entre les deux lectures, l'incertitude chiffrée et non seulement annoncée, les deux hypothèses sans valeur centrale enfermées dans le bloc de limite, et les deux sorties non modélisées nommées comme **absentes** et non comme prochaines |
| `comparaison.spec.ts` | 32 | La route `/comparaison`. **La limite précède tous les chiffres dans l'ordre du document** — position DOM comparée, et non apparence — et **la bascule des deux lectures vit à l'intérieur du bloc qui la porte**, ce qui rend l'avertissement non contournable. L'échelle du graphique ne se recale pas sur la lecture retenue : le capital retiré se voit. Les repères sont mesurés en pixels contre les cumuls du moteur, sans hauteur plancher. Aucune tournure prescriptive sur le document entier, quatorze motifs relevés. S'y ajoutent, hors `VIZ-003` : la robustesse des **dix-sept** paramètres d'URL — six valeurs hostiles chacun, dont une qui faisait disparaître la page entière quand le plafonnement était retiré — et le parcours du curseur d'année au clavier, bornes comprises |
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
- **Proportions des courbes de comparaison** — poser un plancher de 6 % sur les repères
  fait rougir la mesure au pixel : l'année 1 passerait de 3,705 % à 6 %.
- **Échelle de la comparaison** — asseoir l'échelle sur la seule courbe du propriétaire
  fait rougir deux gardes, les proportions et « l'échelle ne se recale pas ».
- **Ordre du document** — déplacer le bloc de limite sous la grille, en y glissant un
  « mieux vaut », fait rougir trois gardes par profil : l'ordre, la lecture sans
  défilement, et les tournures prescriptives.
- **Une quatrième tentative qui n'a rien fait rougir, et c'est le renseignement.**
  Recaler l'échelle sur le maximum des deux séries de la lecture retenue ne change
  aucune valeur affichée, parce que le locataire est le plus grand dans les deux
  lectures — ses fonds perdus égalent son décaissement. La garde protège contre tout
  recalage **qui change un chiffre à l'écran**, pas contre « tout recalage ». Une garde
  dont on ne sait pas ce qu'elle laisse passer n'est pas une garde vérifiée.
- **Le critère de sortie de v0.3.0 lui-même** — descendre le bloc de limite du niveau
  approfondi sous la grille fait rougir « un chiffre du niveau approfondi précède sa
  limite » ; remplacer « n'existe pas dans ce simulateur » par « sera disponible
  prochainement » fait rougir la garde des deux sorties absentes. Un critère de sortie
  qu'on n'a pas vu échouer ne prouve rien de la version qu'il libère.
- **Un détour instructif en le cassant.** La première tentative a modifié le composant
  `TroisSorties.tsx` et n'a rien fait rougir — parce que la phrase vit dans
  `src/lib/patrimoine.ts`, pas dans le composant qui l'affiche. Le sabotage ne portait
  sur rien. Un sabotage qui ne change pas ce qu'on croit qu'il change ne vérifie rien,
  et il faut regarder ce qu'on a réellement modifié avant de conclure au vert.
- **Indexabilité du site publié** — passer `INDEXABLE` à `true` fait rougir **dix**
  tests de la suite de déploiement, un par route plus `robots.txt`. Éprouvé en pointant
  cette suite sur un serveur local, faute de pouvoir modifier la production.
- **Robustesse des dix-sept paramètres d'URL de `/comparaison`** — retirer le
  plafonnement fait rougir la garde sur `tx=1e400`, et de la pire façon : **la page
  entière disparaît**, avertissement compris. C'est exactement le cas que le test
  nomme, et il est atteignable par une adresse que n'importe qui peut écrire.
- **La moitié de ce plafonnement n'est pas atteignable par l'URL, et c'est écrit.**
  Retirer le seul `Number.isFinite` ne fait rougir personne : les parseurs `nuqs`
  rejettent avant lui tout ce qui n'est pas un nombre, et retombent sur le défaut. Le
  garde-fou reste juste — il protège un appelant programmatique — mais aucun test ne le
  prouve, et prétendre le contraire serait plus grave que le trou.
- **Curseur d'année au clavier** — poser un `preventDefault` sur l'événement clavier du
  curseur fait rougir la garde. Un `input[type=range]` est nativement accessible, mais
  « nativement » n'est pas « vérifié » : le sabotage ne change rien à l'apparence.
- **Assiette de la mainlevée, deuxième version** — la garde d'origine vérifiait la
  proportionnalité : doubler le capital double le coût. Remplacer l'assiette par
  `capital × 1,25`, c'est-à-dire refaire exactement l'erreur qu'`ENG-028` corrigeait,
  la préserve intacte : **945 tests verts sur une assiette fausse**. Une garde de forme
  ne dit rien du facteur. Elle confronte désormais le montant au taux déclaré dans les
  hypothèses de marché, ce qui nomme l'assiette au lieu de la supposer — et le même
  sabotage la fait rougir.
- **Le prix du bien retiré de `guaranteeCost`** — le réintroduire fait échouer le
  `typecheck` en cinq points, dont un `@ts-expect-error` devenu inutile. Garde de
  compilation, pas d'exécution.
- **Arrondi de l'assiette** — arrondir vers le bas au lieu du plus proche fait rougir
  six tests sur trois fichiers ; ne plus arrondir la seule assiette sociale en fait
  rougir sept sur deux, dont « l'assiette sociale reste supérieure ou égale à l'assiette
  fiscale » : arrondir une seule des deux peut inverser leur ordre.
- **Deux sabotages sans un seul rouge, et ce sont les entrées les plus utiles du jour.**
  Falsifier un chiffre **à l'intérieur d'une phrase de provenance** ne fait rougir
  personne : une provenance est de la prose montrable, pas une donnée vérifiable, et le
  seul rempart est la relecture. Revenir à la recherche de tranche par la borne haute,
  arrondi conservé, ne fait rougir personne non plus : une fois l'assiette entière, les
  deux recherches désignent toujours la même tranche. La borne basse n'est donc pas
  gardée par un test — elle est rendue suffisante par l'arrondi, qui l'est. Aucun test
  artificiel n'a été écrit pour masquer l'un ou l'autre.
- **Grandeurs partagées de la cession** — prendre la durée de détention dans l'entrée
  brute au lieu de la sortie normalisée fait rougir la propriété d'assemblage. Un seul
  rouge d'abord, et le manque était dans le test : le tirage `fast-check` de l'horizon
  était entier, donc les deux normalisations y étaient l'identité et la propriété ne
  pouvait rien voir. Avec un tirage réel, négatif et fractionnaire, elle rougit deux
  fois. Une garde qui ne rougit qu'une fois là où deux chemins divergent n'a pas encore
  été comprise.
- **Frais de cession déductibles** — ajouter l'indemnité de remboursement anticipé aux
  frais qui viennent en diminution du prix fait rougir quatre tests : la liste de
  l'annexe III, art. 41 duovicies H, est limitative.
- **Réserves des deux modules** — les fondre en une seule chaîne fait rougir quatre
  tests : on ne peut plus dire de quel module vient une réserve.
- **Tranche de surtaxe** — annuler la recherche par la borne haute fait rougir deux
  tests, un par fichier.
- **Une tentative qui n'a rien fait rougir** — recalculer le prix de cession au lieu de
  le lire rend le même centime, et aucune garde ne distingue une composition d'une
  duplication tant que la duplication est juste. La règle « rien n'est recalculé » est
  tenue ici par la relecture, pas par un test, et il faut que ce soit écrit.
- **Décompte des modules en ligne** — réécrire à la main « Un seul module est en
  ligne : crédit. Les quatre autres… » fait rougir la garde qui confronte la phrase
  aux cartes. Ce défaut-là a réellement vécu sur `main` : la comparaison était en
  ligne et l'accueil l'annonçait à venir.
- **Cartes ouvertes et routes réelles** — refermer la carte de la comparaison fait
  rougir « les modules ouverts sont exactement ceux qui ont une route ». À noter :
  la garde du décompte, elle, reste **verte** dans ce cas, et c'est juste — la phrase
  redevient cohérente avec une liste appauvrie. Les deux gardes ne disent pas la même
  chose, et il faut les deux.
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
| v0.3.0 | 23 août 2026 | 955 | 386 (193 × 2 profils) | « Acheter ou louer », ses deux niveaux. Le moteur de la phase 3 en sept fichiers, `/comparaison` et `/comparaison/patrimoine`. Critère de sortie exécuté par `parcours-v0-3.spec.ts`, cassé sur ses deux moitiés. **Trois défauts de calcul trouvés en chemin** — assiette de la mainlevée, fente du barème de surtaxe, assiette non arrondie — dont aucun n'avait été trouvé par un test |
| v0.2.0 | 22 août 2026 | 619 | 252 (126 × 2 profils) | Mobile, glossaire, fiche, cas de référence externes, séparation loi/marché. Critère de sortie exécuté au pouce par `parcours-v0-2.spec.ts` |
| v0.1.1 | 22 août 2026 | 217 | 172 (86 × 2 profils) | Correctif UI-012. Deux gardes pour un seul défaut : ce que la feuille déclare, et ce que le navigateur calcule |
| v0.1.0 | 22 août 2026 | 214 | 164 (82 × 2 profils) | Porte passée à froid, `.next` supprimé. Critère de sortie **exécuté** et non coché : `parcours-v0-1.spec.ts` va de l'accueil au lien partagé, sur les deux profils |

**Ce que ce relevé ne couvre pas.** La porte s'exécute sur un build local. Elle ne dit
rien de ce que l'hébergeur sert réellement, et c'est **une troisième suite**, comptée à
part parce qu'elle ne pose pas la même question :

| Suite | Question | Quand |
| --- | --- | --- |
| Unitaires | le moteur calcule-t-il juste ? | porte de branche |
| Bout en bout | le code du dépôt fait-il ce qu'il doit ? | porte de branche |
| Déploiement | le public voit-il ce code-là ? | après l'étiquette |

`tests/deploiement/site-publie.spec.ts`, **52 vérifications (26 × 2 profils)** contre
https://simulateur-immo-snowy.vercel.app/, lancées par `npm run verif-deploiement`.
Elle est **délibérément hors de `npm run porte`** : une porte qui interroge un tiers
rougit quand l'hébergeur tousse, et une porte qui rougit sans rapport avec le code finit
ignorée. Voir `docs/RELEASES.md` §3.

Ce qu'elle garde, par ordre d'importance : le site n'est **pas indexable** — seul échec
irréversible du lot, un moteur qui a indexé des pages non relues ne les oublie pas sur
demande —, l'avertissement figure sur toute route qui montre un chiffre, les montants
affichés sont ceux du dépôt, et un lien partagé redonne les mêmes chiffres.

**Sa limite, et elle est réelle.** Le détecteur de déploiement périmé fonctionne en
figeant des montants ; il ne peut être éprouvé qu'en le confrontant à un déploiement
réellement ancien, et nous n'en avons pas gardé. Ce qui a été vérifié par sabotage est
la garde d'indexabilité — passer `INDEXABLE` à `true` sur un serveur local interrogé par
cette même suite fait rougir **dix** tests, un par route plus `robots.txt` — et la
présence des routes : retirer `/comparaison/patrimoine` d'un serveur local en fait rougir
deux, le contrôle de statut et la garde de contenu.

**Un détecteur de déploiement périmé est lui-même périmable, et ça vient d'arriver.**
Cette suite a été écrite avant `UI-007` ; ses listes de routes ne nommaient donc pas
`/comparaison/patrimoine`, et elle est restée **verte** au moment d'étiqueter v0.3.0
**sans avoir regardé une seule fois l'écran que cette version existe pour livrer**. Rien
ne l'avait signalé, et rien ne pouvait le faire : la seule chose qui l'a fait est
quelqu'un vérifiant à la main que la route répondait. D'où la règle inscrite dans le
fichier plutôt qu'espérée — toute route ajoutée au produit rejoint `ROUTES`, et
`ROUTES_CHIFFREES` si elle montre un chiffre.

## Annexe — les gardes ajoutées par `FIS-005`

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

## Annexe — le détail de `UI-006`, adaptation mobile

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

### Gardes de `UI-006` vérifiées par sabotage

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
