# Brief design — à transmettre à Claude Design

> Ce document est fait pour être collé tel quel en entrée de Claude Design.
> Il décrit une intention, pas une maquette. Les écrans demandés sont listés en section 8.

## 1. Ce que nous concevons

Un simulateur web français d'acquisition immobilière et de pilotage patrimonial. Cinq calculateurs reliés par des paramètres partagés. Le produit est gratuit, sans compte, sans collecte de données, et défend une thèse : l'immobilier n'est pas mécaniquement supérieur aux autres placements.

Le lecteur type est un primo-accédant qui ne connaît ni le TAEG ni la différence entre caution et hypothèque, et qui doit prendre une décision engageant vingt ans de sa vie.

## 2. La métaphore directrice

**Un instrument de mesure, pas une brochure.**

L'univers de référence est celui des documents qui font foi : plan cadastral, acte notarié, tableau d'amortissement bancaire. Des documents denses, ordonnés, où chaque chiffre a une place et où la mise en forme sert la lecture et non la séduction.

Ce que cela implique concrètement : des angles droits, des filets fins, une grille visible, des chiffres alignés. La densité est un atout, pas un défaut à masquer.

## 3. Ce que nous refusons

Ces interdits sont fermes. Ils définissent l'identité autant que les choix positifs.

- **Pas d'esthétique fintech.** Aucun dégradé violet-bleu, aucune carte à coins très arrondis flottant sur fond blanc, aucune ombre portée diffuse.
- **Pas d'illustration décorative.** Ni personnages en aplat, ni maisons stylisées, ni icônes rondes colorées. Les seuls éléments graphiques sont des représentations de données.
- **Pas de rassurance visuelle.** Pas de vert massif signifiant « bonne nouvelle », pas d'emoji, pas de badge de félicitation. Le produit ne récompense pas l'utilisateur d'avoir acheté.
- **Pas de hiérarchie par la taille seule.** Un chiffre géant sans contexte est une manipulation. Chaque grand chiffre porte une légende qui le qualifie.
- **Pas de faux minimalisme.** Cacher la complexité derrière trois champs produit un outil qui ment. On assume la densité, on la rend navigable.

## 4. Couleur

Le système est **sémantique avant d'être esthétique**. Chaque couleur porte un sens fixe, identique dans tous les modules. C'est la règle la plus importante du système.

| Rôle | Signification | Usage |
|---|---|---|
| Encre | Texte, structure, valeurs neutres | Couleur dominante |
| Papier | Fond général | Un gris légèrement bleuté, jamais du blanc pur ni du crème |
| Panneau | Fond des zones de saisie | Une nuance entre papier et blanc |
| Filet | Bordures, séparateurs | Un gris moyen froid |
| **Capital** | Ce que l'utilisateur possède, tout gain | Un vert profond désaturé, proche du vert-de-gris |
| **Intérêts** | Ce que l'utilisateur perd, tout coût | Un rouge brique sourd, terreux, jamais vif |
| **Assurance** | Troisième poste de coût | Un violet-ardoise discret |
| **Marchés** | Le scénario financier alternatif | Un bleu profond, distinct des trois précédents |
| Accent | Curseurs, liens, éléments actifs | Un laiton ancien, ni or ni jaune |

Contraintes : contraste minimum de 4,5:1 pour tout texte. **Jamais de couleur seule pour porter une information** — toujours doublée d'un libellé, d'une position ou d'un motif. Un thème sombre est souhaitable mais secondaire.

## 5. Typographie

Trois rôles, trois familles.

**Titres et chiffres marquants** — une grotesque à fort caractère, légèrement condensée ou à largeur variable. Elle porte la personnalité. Le produit ne doit pas ressembler à un template.

**Texte courant et interface** — une sans-serif neutre et très lisible, de préférence issue de l'univers administratif ou institutionnel. Elle disparaît au profit du contenu.

**Données, montants, tableaux** — une monospace à chiffres tabulaires. **Non négociable** : les colonnes de montants doivent s'aligner à la virgule près. C'est ce qui donne au produit son autorité.

Règles : format français strict pour tous les nombres — espace insécable comme séparateur de milliers, virgule décimale, symbole euro après le montant. Les pourcentages avec une décimale au maximum, sauf les taux d'intérêt qui en portent deux.

## 6. Principes de composition

**La saisie à gauche, le résultat à droite.** Sur écran large, un panneau de paramètres latéral et une zone de résultats. Sur mobile, les paramètres passent au-dessus dans un accordéon, avec un récapitulatif des indicateurs clés toujours visible.

**Le résultat réagit immédiatement.** Aucun bouton « calculer ». La modification d'un paramètre met à jour l'affichage sans rechargement et sans animation de chargement.

**Une révélation progressive assumée.** Chaque module s'ouvre sur sa vue simple. L'analyse approfondie est accessible d'un geste, et son ouverture est justifiée par une phrase qui explique pourquoi la vue simple ne suffit pas. Ce moment est un moment pédagogique clé, pas un simple pliage.

**Un objet signature par module.** Une représentation graphique mémorable, propre à ce module, qui porte l'idée centrale :
- Module crédit — un ruban horizontal parcourant toute la durée du prêt, empilant capital, intérêts et assurance mois par mois, avec un curseur de lecture. On y voit la part d'intérêts se réduire.
- Module acheter ou louer — deux courbes de coût mensuel, surmontant un bandeau qui colorie chaque année selon le camp gagnant.
- Module remboursements anticipés — une frise cliquable des années du prêt, où l'on dépose des versements.
- Module pierre ou marchés — deux faisceaux de trajectoires superposés, montrant des fourchettes de résultats et non deux valeurs uniques.

**L'incertitude est visible.** Partout où une hypothèse conditionne le résultat, le produit doit montrer une fourchette. Ce n'est pas un ornement, c'est la thèse du produit traduite en forme.

## 7. Pédagogie intégrée

Chaque terme technique porte une définition accessible au survol et au clic, en deux phrases maximum, sans jargon supplémentaire. Le motif visuel signalant qu'un terme est explicable doit être discret mais constant.

Chaque module se termine par un encadré « ce que ce calcul ne dit pas ». Traiter cet encadré comme un élément de premier plan, pas comme une note de bas de page.

## 8. Écrans attendus

Par ordre de priorité :

1. **Module crédit, écran complet, sur écran large.** C'est l'écran de référence : il fixe la grille, les composants de saisie, les indicateurs, le ruban, le tableau.
2. **Le même en largeur mobile.** Montre comment la densité survit à la contrainte.
3. **Module pierre ou marchés.** L'écran qui porte la thèse, avec la représentation en faisceaux.
4. **Le moment de révélation du module acheter ou louer** — l'état replié, la justification, l'état déplié.
5. **La page d'accueil.** Doit énoncer la thèse et orienter vers le module pertinent, sans être une page marketing.
6. **Une fiche pédagogique**, pour montrer le traitement des contenus longs.

Livrables souhaités : les jetons de design sous forme de variables CSS nommées par leur rôle sémantique et non par leur couleur, et les états des composants de saisie (repos, survol, focus, erreur, désactivé).

## 9. Trois questions à trancher pendant la conception

- Comment représenter une fourchette de résultats pour un lecteur qui ne lit pas de graphiques statistiques ? C'est le principal risque d'échec du module signature.
- Comment un tableau d'amortissement de trois cents lignes reste-t-il consultable sur mobile ?
- Comment signaler qu'un scénario est mauvais sans employer un rouge alarmant qui ferait de l'outil un juge ?
