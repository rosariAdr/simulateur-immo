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

**Un instrument, pas un formulaire administratif.** Ce complément a été ajouté le 23 août 2026, et il est aussi important que la phrase qu'il complète. Les documents qui font foi sont la référence de la *mise en ordre* — ils ne sont pas la référence de la *facture*. Un instrument de mesure sérieux — un oscilloscope, un théodolite, un boîtier de mesure — est un objet dessiné, dense, contemporain, où la matière et la lumière servent la lecture. C'est cet univers-là qu'on vise : la rigueur du document et le soin de l'instrument, pas la photocopie d'un imprimé fiscal.

Un écran de ce produit doit pouvoir être regardé hors de son usage — dans une capture, une démonstration — et donner envie d'y entrer. Voir `docs/CONTEXT.md` §11 et la section 10 ci-dessous.

## 3. Ce que nous refusons

Ces interdits sont fermes. Ils définissent l'identité autant que les choix positifs. Ils portent tous sur ce qui **trompe le lecteur** ou **l'empêche de travailler** — jamais sur une technique graphique en tant que telle.

- **Pas d'illustration décorative.** Ni personnages en aplat, ni maisons stylisées, ni icônes rondes colorées. Les seuls éléments graphiques sont des représentations de données. Un dessin peut être remarquable sans figurer une maison.
- **Pas de rassurance visuelle.** Pas de vert massif signifiant « bonne nouvelle », pas d'emoji, pas de badge de félicitation. Le produit ne récompense pas l'utilisateur d'avoir acheté.
- **Pas de hiérarchie par la taille seule.** Un chiffre géant sans contexte est une manipulation. Chaque grand chiffre porte une légende qui le qualifie.
- **Pas de faux minimalisme.** Cacher la complexité derrière trois champs produit un outil qui ment. On assume la densité, on la rend navigable.
- **Pas d'effet qui coûte à l'usage.** Rien qui retarde un résultat, cache un texte derrière une interaction, abaisse un contraste sous 4,5:1, ou ne survive pas à `prefers-reduced-motion`. C'est le seul interdit qui vise la forme, et il vise sa conséquence, pas son procédé.

> **Ce qui a quitté cette liste le 23 août 2026.** La puce « Pas d'esthétique fintech », qui refusait le dégradé violet-bleu, la carte à coins arrondis et l'ombre portée diffuse. Elle interdisait des **procédés** sans que le produit y perde quoi que ce soit d'identifiable, et elle empêchait le volet design de démontrer ce qu'il avait à démontrer. Un dégradé, un halo, un angle adouci, une profondeur sont désormais des outils disponibles ; ce qu'ils n'ont pas le droit de faire est écrit en section 10, et la sémantique des couleurs de la section 4 continue de les gouverner. Justification complète : `docs/ADR.md`, ADR-021.

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

## 10. L'ambition graphique, et ce qu'elle n'a pas le droit de casser

*Ajouté le 23 août 2026, en application de `docs/CONTEXT.md` §11. Cette section dit
jusqu'où va la liberté ouverte par le retrait de l'interdit « esthétique fintech », et
elle est écrite pour être opposable : chaque règle se vérifie sur un écran, elle ne se
discute pas au goût.*

### 10.1 Trois niveaux d'ornement, selon ce que l'écran sert à faire

La même page n'a pas les mêmes droits partout. Le critère est simple : **est-ce que
quelqu'un est en train de lire un chiffre qui l'engage ?**

| Niveau | Où | Ce qui est permis |
|---|---|---|
| **Écran de travail** | panneaux de saisie, bandeau d'indicateurs, tableau d'amortissement, ruban | La sobriété reste la règle. Un état de survol ou de focus dessiné avec soin, une transition de 120 ms, rien qui bouge tout seul. Le chiffre est le sujet. |
| **Moment de bascule** | accueil, révélation progressive, retournement d'« acheter ou louer », résultat clé | Un geste graphique est **attendu** : c'est là que le produit dit quelque chose. Il doit servir la bascule — la rendre visible, pas la décorer. |
| **Hors travail** | page introuvable, glossaire, fiches pédagogiques, galerie de composants, attente réelle | La marge la plus large. Personne n'y lit un montant. C'est là qu'on peut se permettre l'écriture la plus affirmée, à condition que le texte reste lisible sans interaction. |

Un ornement posé au mauvais niveau est un défaut, même bien exécuté.

### 10.2 La palette décorative est **disjointe** de la palette sémantique

C'est la règle qui rend les deux autres tenables, et elle est non négociable.

Les quatre couleurs de la section 4 — capital, intérêts, assurance, marchés — **ne
servent jamais d'ornement**. Elles ne remplissent pas un fond de carte, ne composent pas
un dégradé décoratif, n'entourent pas un bouton. Employées hors de leur sens, elles
détruisent la convention partout ailleurs, y compris sur les écrans où elle enseigne.

Ce qui est disponible pour l'ornement : **l'encre, le papier, le panneau, le filet et
l'accent laiton**, plus les jetons qu'on ajoutera explicitement pour cet usage, nommés
`--ornement-*`. Un dégradé se construit dans cette famille-là.

Deux exceptions, et seulement deux :

- une couleur sémantique employée **là où elle signifie** — le bleu des marchés sur un
  élément qui appartient au module « pierre ou marchés » ;
- une représentation de données, où la couleur porte évidemment son sens.

### 10.3 Le mouvement

- **Jamais porteur d'information seule.** Ce qu'une animation raconte doit rester lisible
  sur une capture d'écran.
- **Jamais bloquant.** Une animation n'ajoute pas un délai avant un résultat. Le §6
  tient : le résultat réagit immédiatement.
- **Court.** Les transitions d'interface se comptent en dizaines de millisecondes, 200 ms
  au plus. Au-delà, on attend un écran au lieu de l'utiliser.
- **Rien qui boucle indéfiniment dans le champ de travail.** Une boucle infinie n'est
  admise que sur un niveau « hors travail », ou devant une attente réelle.
- **`prefers-reduced-motion: reduce` est respecté partout**, et l'écran reste complet et
  compréhensible sans le mouvement.

### 10.4 La profondeur et la matière

Ombre, halo, flou, dégradé, bordure lumineuse sont disponibles. Trois garde-fous :

- **Deux niveaux d'élévation au maximum** dans une même vue. Au-delà, plus rien ne se
  détache, et la hiérarchie retombe à zéro.
- **La profondeur hiérarchise, elle ne décore pas.** Ce qui est au-dessus doit être ce
  qui compte le plus, ou ce qui se superpose vraiment — infobulle, menu, panneau.
- **Le contraste du texte se mesure sur le fond réel**, dégradé compris, aux deux
  extrémités du dégradé. 4,5:1, dans les deux thèmes.

### 10.5 Le coût

Le produit reste économe, et c'est une partie de ce qu'il démontre.

- **CSS et SVG d'abord.** Aucune bibliothèque d'animation, aucun moteur de rendu importé
  pour un effet. Si un effet demande une dépendance, il faut une raison écrite.
- **Aucune image décorative téléchargée.** Les polices sont déjà servies depuis le site,
  pour ne pas exposer l'adresse IP des visiteurs ; le même raisonnement vaut pour tout
  actif distant.
- **Composer, pas empiler.** Un effet réutilisé trois fois est un jeton ou un composant,
  pas trois copies.

### 10.6 Ce qui se vérifie avant de déclarer un écran fini

Cinq contrôles, les mêmes pour tous :

1. Contraste ≥ 4,5:1 sur tout texte, **dans les deux thèmes**, mesuré.
2. Parcours complet **au clavier seul**, focus toujours visible.
3. Parcours complet **au doigt**, sans survol disponible, sur le profil mobile.
4. Écran complet et lisible sous `prefers-reduced-motion: reduce`.
5. **Le test de la capture** : l'écran arrêté, sans mouvement ni interaction, se tient
   tout seul. C'est le critère du §11 de `docs/CONTEXT.md`, et c'est aussi le meilleur
   révélateur d'un effet qui compensait une composition faible.
