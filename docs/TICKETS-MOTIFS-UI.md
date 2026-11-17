# Tickets — la charte d'ornement et trois motifs d'interface

Ouvert le 23 août 2026. Quatre sujets, huit tickets. Trois demandes formulées à partir
de maquettes trouvées sur Uiverse — un indicateur de chargement et une carte à survol
(gharsh11032000), une page 404 (Novaxlo) — et un quatrième sujet ajouté ensuite, la
charte d'ornement dont les trois premiers ont besoin. Chaque sujet donne **deux
tickets** : une **étude**, qui décide de la forme, et une **réalisation**, qui la livre
avec ses tests et sa documentation.

Les tickets vivent ici et non dans `docs/TASKS.md` parce qu'ils forment un lot
cohérent qui traverse plusieurs phases. Ils sont référencés depuis `docs/TASKS.md`, et
chacun y sera reporté coché au moment de sa fusion, comme les autres.

**À lire avant** : `docs/CONTEXT.md` §11 (les deux destinataires du dépôt),
`docs/01-brief-design.md` §10 (l'ambition graphique et ses bornes) et `docs/ADR.md`,
ADR-021 (pourquoi l'interdit « esthétique fintech » a été levé, et ce qui le remplace).

---

## 1. Le mandat, et ses bornes

Les trois maquettes partagent une écriture : dégradé magenta → cyan
(`#fc00ff → #00dbde`), halo obtenu par un pseudo-élément flouté à `blur(20px)`,
coins arrondis, rotation continue.

**Le cadre a changé le 23 août 2026, et dans le bon sens.** La puce « Pas d'esthétique
fintech » a quitté `docs/01-brief-design.md` §3, le second objectif du dépôt a été écrit
— `docs/CONTEXT.md` §11 — et la décision est consignée dans ADR-021. Ce que ça donne
pour ces six tickets, en une phrase : **le mandat n'est plus de tolérer un peu
d'ornement, il est d'en produire un qui tienne.**

Le produit sert deux destinataires. L'utilisateur, qui doit décider. Et le lecteur
professionnel, qui vient voir de quoi l'auteur est capable — et pour qui ces trois
écrans-ci sont, précisément, la vitrine du volet design. Un glossaire qui se laisse
regarder, une page introuvable qui a une idée, une attente qui a du caractère : c'est
ce qui se met dans une publication, et aucun des trois n'affiche un montant engageant.
**Ce sont les trois écrans du produit où l'ambition graphique coûte le moins et
rapporte le plus.**

### Ce qui borne le mandat

Quatre règles, toutes vérifiables, aucune tenant du goût. Elles viennent de la section
10 du brief, écrite pour ça.

| Borne | Ce qu'elle veut dire ici |
| --- | --- |
| **Le niveau d'ornement suit l'écran** (§10.1) | Ces trois-là sont au niveau « hors travail » : la marge la plus large du produit. Ce qu'on y écrit ne déteint **pas** sur les panneaux de saisie ni sur le tableau d'amortissement. |
| **La palette décorative est disjointe de la sémantique** (§10.2) | Capital, intérêts, assurance, marchés ne servent jamais d'ornement. L'ornement se construit sur encre, papier, panneau, filet, accent, et sur des jetons `--ornement-*` à déclarer. |
| **Rien qui coûte à l'usage** (§3, nouvelle puce) | Aucun texte caché derrière une interaction, aucun contraste sous 4,5:1, aucun résultat retardé, rien qui ne survive à `prefers-reduced-motion`. |
| **Les cinq contrôles** (§10.6) | Contraste dans les deux thèmes, clavier, doigt, mouvement réduit, et le test de la capture — l'écran arrêté doit se tenir seul. |

**Le magenta et le cyan de la maquette tombent sous la deuxième borne**, et c'est le
seul point où les trois extraits sont réellement en faute : ils atterrissent à côté du
violet de l'assurance et du bleu des marchés, deux teintes qui, dans ce produit,
**veulent dire quelque chose**. Le procédé — un dégradé vif, un halo — n'est plus en
cause ; ces deux teintes-là le restent.

Trois issues, dans l'ordre de préférence :

1. **Un dégradé d'ornement propre au produit**, construit sur l'accent laiton, l'encre
   et le panneau, déclaré en jetons `--ornement-*` et réutilisé par les trois écrans.
   C'est l'issue qui produit une **charte**, et donc celle qui démontre quelque chose.
2. **Une teinte sémantique employée là où elle signifie** — le bleu des marchés sur un
   indicateur d'attente qui sert « pierre ou marchés ». La convention travaille au lieu
   de s'abîmer.
3. **Écartée** : les teintes de la maquette reprises telles quelles parce qu'elles sont
   jolies, sur un écran où elles ne veulent rien dire.

**C'est `UI-022` qui écrit cette règle de palette, et les trois autres s'y rangent.**
Trois écrans ornés chacun à sa façon ne font pas une charte, ils font trois accidents.

### Le besoin, lui, était déjà établi

Deux des trois demandes comblent un trou constaté, indépendamment de toute ambition
graphique :

- le site n'a **aucune** page `not-found` — mesuré plus bas, et le résultat est un
  écran anglais sur fond blanc ;
- `globals.css` ne contient **aucune** règle `prefers-reduced-motion`, alors qu'on
  s'apprête à animer ;
- le glossaire, quarante-huit entrées empilées dans une colonne de texte, se lit mal.

Le travail des trois études est donc de **garder l'intention de chaque maquette et de
décider de son écriture** : attirer l'œil, faire vivre une attente, rendre une erreur
habitable — sans franchir aucune des quatre bornes.

Si une étude conclut qu'il faut en franchir une — animer là où le §6 dit de ne pas
animer, ou employer une teinte sémantique hors de son sens — c'est une décision
recevable : elle rejoint `docs/ADR.md` avec sa justification, comme ADR-021 vient de le
faire pour l'interdit fintech. Ce qu'on n'accepte pas, c'est la contradiction
silencieuse — le brief qui dit une chose et l'écran qui en fait une autre.

### Défauts relevés dans les extraits, à ne pas recopier

Trois erreurs sont dans le code source des maquettes. Elles sont notées ici pour
qu'aucune ne survive au copier-coller :

1. **`.loader` n'est pas positionné.** Son `::before` est en `position: absolute;
   inset: 0`, qui se résout donc contre le premier ancêtre positionné — le halo se
   cale sur un bloc arbitraire de la page, pas sur le carré. Il manque
   `position: relative`.
2. **`z-index: -1` peint le halo derrière le fond du parent.** Il ne fonctionne que si
   aucun ancêtre ne crée de contexte d'empilement — ce que fait la moindre
   `transform`, `filter` ou `opacity` sur un conteneur, or on en a. À remplacer par un
   empilement explicite plutôt qu'à espérer.
3. **La carte cache son texte derrière le survol.** `opacity: 0` et
   `pointer-events: none` sur `.content` : au toucher il n'y a pas de survol, et au
   clavier la carte n'est pas atteignable. Dans un glossaire, c'est rédhibitoire —
   voir `UI-018`.

### Licence

Uiverse publie ses éléments sous MIT. À **vérifier à la source** avant toute reprise
littérale, et à créditer dans le fichier concerné le cas échéant. Si l'étude conclut à
une réécriture — l'issue probable, vu l'écart d'écriture — la question tombe, mais la
vérification se fait quand même : elle prend deux minutes et elle est définitive.

---

## 2. Contraintes transverses aux trois réalisations

Elles s'appliquent sans être répétées dans chaque ticket.

- **Aucune couleur écrite en dur.** Toute teinte passe par un jeton de
  `src/app/globals.css`, nommé par son rôle. Un jeton nouveau se déclare dans les
  **deux** thèmes et rejoint la garde de `src/app/__tests__/design-tokens.test.ts`.
  Voir ADR-002.
- **Contraste de 4,5:1 minimum** sur tout texte, dans les deux thèmes, mesuré et non
  supposé — c'est ce qu'a coûté `UI-012`.
- **`prefers-reduced-motion: reduce` est respecté partout.** Aucune de ces trois
  animations n'est porteuse d'information : sous cette préférence, elles s'arrêtent ou
  disparaissent, et l'écran reste complet et lisible sans elles.
- **Jamais la couleur seule.** Un état signalé par une teinte porte aussi un libellé,
  une position ou un motif.
- **La porte de branche** (`npm run porte`) avant fusion, branche `feat/` par ticket
  partie de `dev`, fusion en squash dans `dev` (ADR-024).
- **Chaque garde est cassée une fois** avant d'être déclarée, puis inscrite dans
  `docs/REGISTRE-TESTS.md`. Voir ADR-019.
- **Aucun texte n'est écrit dans un composant** : les contenus rejoignent
  `src/content/`, typés. Voir ADR-007.

### La compétence `impeccable` sur ces huit tickets

Adoptée le 25 août 2026, **subordonnée aux documents** — ADR-023 dit pourquoi et ce
qu'elle n'a pas le droit d'écrire. Elle s'invoque par **sous-commande nommée**, jamais
par une demande vague : le geste attendu est nommé, donc le résultat est relisible.

| Ticket | Sous-commande | Ce qu'on lui demande |
| --- | --- | --- |
| `UI-022` étude | `critique` | Relire l'existant : huit fichiers où les `<button>` sont écrits à la main, des cartes d'accueil en balisage direct. Ce qu'elle rend nourrit la charte, elle ne la décide pas. |
| `UI-023` réalisation | `extract`, `layout` | Sortir les primitives réutilisables. **Sa sortie va dans `globals.css` et `src/components/ui/`**, jamais dans un fichier de système de design nouveau — ADR-023, point 2. |
| `UI-016` étude | `critique` | Où le produit fait attendre, et ce que l'attente coûte au lecteur. |
| `UI-017` réalisation | `animate` | Le mouvement, et la règle `prefers-reduced-motion` qui doit exister avant lui. |
| `UI-020` étude | `critique` | Ce que sert une adresse inconnue, mesuré sur le déployé. |
| `UI-021` réalisation | `shape` | Un écran qui n'existe pas encore : la forme se décide avant le code. |
| `UI-018` étude | `critique` | Quarante-huit entrées à rendre lisibles — architecture de l'information, charge cognitive. |
| `UI-019` réalisation | `layout`, `typeset` | La présentation et la typographie du glossaire. |

**`audit` se rapproche des cinq contrôles du §10.6** — contraste, clavier, doigt,
mouvement réduit — et sert donc en fin de ticket, sur ce qui se mesure. Il ne remplace
pas la porte : `npm run porte` reste ce qui tranche.

**Trois choses qu'on ne lui demande pas.** `init` et `document`, qui écriraient des
documents que le dépôt possède déjà. Le mode `live`, qui itère dans le navigateur — non
fonctionnel sur cette machine, l'aperçu ne compose aucune image. Et son hook détecteur,
fermé jusqu'à ce qu'`UI-023` ait livré la famille `--ornement-*`.

**Le mode, dans son vocabulaire.** Ces trois écrans sont en mode **Read** — le visiteur
comprend quelque chose — et non **Operate**, qui est celui des écrans où l'on décide
d'un engagement. C'est ce que le §10.1 appelait déjà « hors travail », et c'est ce qui
autorise ici la marge la plus large du produit.

---

## 3. L'attente

### `UI-016` — Étude : où le produit fait-il attendre, et que montre-t-il alors

**Objet.** Décider s'il existe, dans ce produit, une attente à habiller — et si oui
laquelle. Le brief §6 dit « le résultat réagit immédiatement, sans animation de
chargement », et c'est vrai du crédit : le moteur est synchrone, il rend en moins
d'une image. Un indicateur de chargement posé là serait un mensonge décoratif, du
temps perdu déguisé en travail.

**Ce que l'étude doit relever, mesures à l'appui :**

1. **Les transitions de route.** Naviguer de `/credit` vers `/glossaire`, vers
   `/comparaison`, vers `/comparaison/patrimoine`, sur le site déployé, en réseau
   bridé (profil « Slow 4G » de Playwright ou des outils du navigateur). Relever le
   délai réel avant premier rendu. En dessous de ~200 ms, un indicateur nuit : il
   apparaît et disparaît, et ce clignotement se lit comme un défaut.
2. **Le calcul le plus lourd du moteur, chronométré.** Le candidat sérieux est
   `VIZ-005`, les faisceaux de trajectoires de « pierre ou marchés » : des milliers de
   trajectoires simulées, c'est le seul endroit du produit où une attente sera
   **vraie**. Mesurer un ordre de grandeur maintenant, même sur un prototype de
   boucle, décide du ticket.
3. **Le premier chargement.** Les trois familles de polices sont servies par
   `next/font` en `display: swap` : relever s'il existe un moment visible où la page
   est là mais pas ses polices.

**Questions à trancher :**

- **Une attente vraie ou une attente montrée ?** Si aucun délai mesuré ne dépasse
  200 ms, la conclusion honnête est « pas d'indicateur avant `v0.5.0` », et le ticket
  de réalisation se réduit à la préparation du terrain (voir `UI-017`, lot A). Cette
  conclusion est un résultat, pas un échec.
- **Quelle forme, dans la métaphore de l'instrument ?** Un carré qui tourne en
  changeant de rayon est une écriture d'application mobile. Les pistes qui tiennent la
  métaphore : un **filet de mesure** qui se remplit de gauche à droite ; une **règle
  graduée** dont les graduations s'allument ; un **compteur de trajectoires** qui
  affiche le nombre déjà simulé — le plus honnête des trois, parce qu'il informe au
  lieu d'occuper.
- **Déterminé ou indéterminé ?** Une simulation qui connaît son nombre d'itérations
  peut afficher une vraie progression. Un indicateur qui tourne sans fin devant un
  travail dont on connaît l'avancement est une régression, pas un ornement.
- **Quelle couleur ?** Si l'indicateur sert « pierre ou marchés », le bleu des marchés
  est **déjà signifiant** dans ce contexte et peut servir sans abîmer la convention —
  c'est la piste la plus solide. Ailleurs, l'accent laiton est le seul candidat neutre.
  Le dégradé n'est plus interdit depuis l'amendement du brief : s'il en faut un, le
  construire sur des teintes qui appartiennent déjà au produit, pas sur le magenta et
  le cyan de la maquette, qui tombent à côté de l'assurance et des marchés. Trancher,
  et écrire pourquoi.
- **Où le composant vit-il ?** `src/components/ui/`, avec sa vignette dans la galerie
  `/composants` — c'est la règle qu'a posée `UI-000` : une primitive isolée se voit
  dans ses états avant d'être posée dans un écran.

**Livrable.** Une fiche ajoutée à ce fichier, sur le modèle de la fiche `UI-012` de
`docs/TASKS.md` : le tableau des délais mesurés, la forme retenue avec son
argumentaire, la décision sur la couleur, et le périmètre exact de `UI-017`. Si la
conclusion est « rien à livrer maintenant », elle est écrite comme telle et `UI-017`
est réduit à son lot A.

**Ne demande aucun code de production.** Un banc de mesure jetable est attendu, pas un
composant.

---

### `UI-017` — Réalisation : indicateur d'attente

**Dépend de `UI-016`.** Le périmètre ci-dessous est provisoire : l'étude le fixe.

**Lot A — le socle, à livrer quelle que soit la conclusion de l'étude.**

- La règle `@media (prefers-reduced-motion: reduce)` dans `src/app/globals.css` : elle
  manque aujourd'hui, et elle doit exister **avant** qu'on anime quoi que ce soit, pas
  après. Elle neutralise durées et itérations par défaut, à charge pour un composant
  d'y déroger explicitement s'il a une raison.
- Sa garde : un test unitaire qui lit la feuille et échoue si la règle disparaît, plus
  un test de bout en bout sous `prefers-reduced-motion: reduce`
  (`page.emulateMedia`) vérifiant qu'aucune animation ne tourne.

**Lot B — l'indicateur, si l'étude conclut qu'il a lieu d'être.**

- `src/components/ui/Attente.tsx`, composant de présentation pur, sans état, une
  variante déterminée et une indéterminée selon la conclusion de l'étude.
- Accessibilité : `role="status"` et `aria-live="polite"` — l'attente est **annoncée**,
  pas seulement dessinée ; un libellé textuel qui dit ce qu'on attend ; la valeur
  chiffrée exposée par `aria-valuenow` si la progression est connue.
- Sa vignette dans `/composants`, dans tous ses états, comme les sept autres
  primitives.
- Le point d'usage retenu par l'étude, et lui seul. Aucune pose « au cas où ».

**Lot C — les transitions de route, si et seulement si l'étude les a mesurées au-dessus
du seuil.** Un `loading.tsx` par segment concerné, jamais un global posé par confort.

**Tests attendus.** Le rendu des deux variantes ; l'annonce aux lecteurs d'écran ;
l'immobilité sous `prefers-reduced-motion` ; le contraste de l'indicateur sur son
fond, dans les deux thèmes. Gardes cassées puis rétablies, et inscrites au registre.

**Documentation.** `docs/TASKS.md` (ligne cochée), `docs/REGISTRE-TESTS.md`, et une
entrée ADR **si** l'étude a tranché contre le §6 du brief ou contre la sémantique des
couleurs — les deux cas méritent d'être écrits une fois pour toutes.

**Version.** Lot A en `v0.3.2`. Lots B et C calés sur `v0.5.0`, avec `VIZ-005`, sauf
conclusion contraire de l'étude.
**Branche.** `feat/UI-017-attente` (lot A séparable en `chore/UI-017-mouvement-reduit`).

---

## 4. Le glossaire

### `UI-018` — Étude : rendre quarante-huit entrées lisibles sans les cacher

**Objet.** Le signalement est juste : `/glossaire` empile quarante-huit entrées dans
une colonne de 76 caractères, séparées par des titres de thème. Rien ne distingue une
entrée de la suivante au premier coup d'œil, rien n'accroche l'œil, et la page se lit
comme un document imprimé — ce qui convient à une fiche pédagogique mais pas à un
ouvrage de référence qu'on consulte par sauts.

**La contrainte que la maquette proposée ne peut pas satisfaire.** La carte Uiverse
révèle son texte **au survol**. Or `/glossaire` est la **destination des ancres posées
au bas de chaque infobulle** (`CNT-001`, ADR-010) : on y arrive sur un terme précis,
qu'on doit pouvoir lire immédiatement. Un texte en `opacity: 0` qui attend un survol
échoue trois fois — au toucher, où il n'y a pas de survol ; au clavier, la carte
n'étant pas focalisable ; et à l'arrivée par ancre, où le lecteur atterrit sur un bloc
muet. S'y ajoute que la page est prérendue statiquement et sans état, et qu'on tient à
ce qu'elle le reste.

**Ce que la maquette apporte malgré tout**, et qu'il faut retenir : une **unité
visuelle par terme**, avec un bord, un fond propre et une zone d'icône qui donne un
point d'accroche ; et une **réaction au survol** qui rend la page vivante au lieu
d'inerte.

**Questions à trancher :**

- **Quelle unité pour une entrée ?** Trois pistes, à départager sur maquette : (a) un
  **cartouche** à filet fin, dans l'esprit de l'acte notarié, terme en titre,
  définition en deux phrases, développement en dessous ; (b) une **fiche cadastrale**
  à en-tête portant la famille — négociable, contraint, réglementaire — et le thème ;
  (c) le texte courant conservé, avec un **filet de marge** coloré par famille comme
  seul repère. La (c) est la moins coûteuse et la plus fidèle au brief : la retenir
  par défaut si les deux autres ne démontrent pas leur gain.
- **La couleur de famille peut-elle porter la distinction ?** Les trois familles ont
  déjà leurs libellés et leurs teintes dans `src/components/ui/taxonomie.ts`. Les
  réemployer en tête d'entrée fait travailler une convention existante au lieu d'en
  inventer une décorative. À vérifier : le contraste de chaque famille sur `--panneau`,
  dans les deux thèmes.
- **Une grille, ou une colonne ?** Le brief pose « la densité est un atout ». Deux ou
  trois colonnes de cartouches sur écran large réduisent le défilement de moitié et
  donnent enfin à la page une forme d'ouvrage. Contrepartie à mesurer : la longueur
  des développements varie beaucoup, et une grille aux hauteurs inégales se lit mal.
  Vérifier si les développements sont assez homogènes, ou si une grille impose un
  repli — développement en accordéon, ce qui **cache** du texte et pose la même
  question qu'au survol.
- **Que devient l'index alphabétique ?** Quarante-huit liens en tête. Un filtre au
  clavier serait plus efficace mais rendrait la page interactive, donc cliente.
  Est-ce que ça vaut le renoncement au rendu statique ? Trancher avec un argument, pas
  avec une préférence.
- **La page peut-elle rester un composant serveur ?** C'est la question qui décide du
  coût. Un survol se traite en CSS pur, un accordéon aussi (`<details>`), un filtre
  non. Ce qui tombe du côté client doit le mériter.

**Livrable.** Une fiche dans ce fichier : la piste retenue et pourquoi, une maquette
statique de trois entrées dans les deux thèmes, les contrastes mesurés, et la réponse
écrite à « la page reste-t-elle serveur ». Plus le périmètre exact de `UI-019`.

---

### `UI-019` — Réalisation : nouvelle présentation du glossaire

**Dépend de `UI-018`.**

**Périmètre.**

- `src/components/Glossaire.tsx` : la présentation change, **la structure de données ne
  bouge pas**. `src/content/glossaire.ts` et `src/content/developpements.ts` restent
  tels quels — sauf si l'étude conclut qu'une icône ou un repère par thème doit être
  une donnée, auquel cas il rejoint `THEMES`, typé, et non le composant.
- Les jetons nouveaux, s'il y en a, dans les deux thèmes, avec leur garde.
- L'ancre reste **calculée** par `ancre()` aux deux bouts. ADR-010 ne se contourne pas
  parce que le balisage change.
- `scroll-mt` conservé et vérifié : une entrée atteinte par ancre ne doit pas se coller
  au bord haut ni passer sous l'avertissement.

**Ce qui doit rester vrai après le changement**, et qui devient la liste des gardes :

1. Les quarante-huit termes sont présents et **lisibles sans interaction** — ni survol,
   ni clic, ni pointeur.
2. Chaque lien d'infobulle atterrit sur son entrée, celle-ci visible dans la fenêtre.
3. La page est toujours prérendue statiquement.
4. L'index alphabétique renvoie vers des ancres qui existent.
5. Le contraste tient dans les deux thèmes, sur le nouveau fond.
6. Au clavier seul, on parcourt la page entière et on atteint chaque entrée.
7. Sous `prefers-reduced-motion`, la page est complète et immobile.

**Tests attendus.** Extension de `src/content/__tests__/glossaire.test.ts` pour ce qui
relève des données ; un test de bout en bout qui suit le chemin infobulle → ancre →
entrée lisible, sur les deux profils, bureau et **tactile** — c'est le profil sur
lequel une écriture au survol échouerait sans bruit. La garde n° 1 se casse en
remettant une révélation au survol : elle doit rougir.

**Documentation.** `docs/TASKS.md`, `docs/REGISTRE-TESTS.md`. Une entrée ADR si la page
cesse d'être un composant serveur, ou si un repère visuel devient une donnée de
contenu — deux décisions qui engagent la suite.

**Version.** `v0.4.0`. **Branche.** `feat/UI-019-glossaire-presentation`.

---

## 5. La page « adresse inconnue »

### `UI-020` — Étude : ce que sert une URL qui n'existe pas

**Objet.** Le site n'a **aucun** fichier `not-found.tsx`. Ce qui suit a été relevé le
23 août 2026 sur le site déployé, en demandant `/parcelle-inexistante` :

| Ce qui a été mesuré | Valeur |
| --- | --- |
| Code HTTP | `404` — correct |
| `lang` du document | `fr` |
| Texte affiché | « 404 — This page could not be found. » — **en anglais** |
| `<title>` | **deux** dans le même document : « 404: This page could not be found. » et « Simulateur d'acquisition immobilière » |
| Fond de page | `body{color:#000;background:#fff}`, injecté en ligne par Next |
| Polices | `system-ui, "Segoe UI", Roboto, …` |
| Avertissement `LEG-002` et pied de page | présents — ils viennent de la mise en page racine |

Trois défauts, donc, et aucun n'est esthétique. Un site public français sert une phrase
en anglais. La page **écrase le fond du site en blanc pur** et ignore les trois
familles typographiques : le thème sombre disparaît d'un coup. Et le document porte
deux titres, ce qu'aucun analyseur ne traite de la même façon. L'avertissement légal
survit, lui, mais encadre un bloc centré sur 100 vh qui n'appartient pas au produit.

**Ce que la maquette proposée apporte** : une page 404 qui a une **idée** — une fenêtre
de navigateur inclinée, une barre d'adresse, une recherche qui s'anime — au lieu d'un
message d'excuse. C'est la bonne intention : une erreur habitable, qui renvoie quelque
part.

**Ce qu'elle ne peut pas garder** : trois couleurs écrites en dur, une taille figée en
`em` (22,5 × 15) qui ne s'adapte à rien, huit animations de dix secondes en boucle
infinie pour un ornement, et une métaphore — la fenêtre de navigateur — qui n'est pas
celle du produit. Son parti pris graphique, en revanche, n'est plus en cause : la puce
« pas d'esthétique fintech » a quitté le brief, et cette maquette-ci ne s'en réclamait
pas. Ce qui la juge ici, c'est « pas d'illustration décorative » (§3), resté en place.

**Questions à trancher :**

- **Quelle métaphore ?** Le produit parle cadastre et acte notarié. « Cette adresse
  n'existe pas au cadastre » est une piste juste, littérale et sans lourdeur : un
  extrait de plan, une parcelle vide, un numéro qui ne correspond à rien. Autre piste :
  la marge d'un registre où l'entrée manque. Choisir, et vérifier que ça ne devient pas
  une **illustration décorative**, que le brief §3 interdit.
- **Que met-on dans la page ?** Une 404 utile oriente. Les cinq destinations candidates :
  l'accueil, `/credit`, `/comparaison`, `/glossaire`, `/avertissement`. Décider
  lesquelles, dans quel ordre, et si l'URL demandée est rappelée au lecteur — utile,
  mais **jamais** réinjectée telle quelle dans le balisage sans échappement.
- **Faut-il une animation ?** La maquette en a huit. Le produit n'en a besoin d'aucune.
  Si l'étude en garde une, elle doit dire ce qu'elle apporte et s'éteindre sous
  `prefers-reduced-motion`.
- **Quel périmètre exact ?** `not-found.tsx` racine ; les `notFound()` appelés
  volontairement, s'il en existe ; et la question voisine d'`error.tsx` — une page
  d'erreur serveur, aujourd'hui tout aussi absente. À décider : même lot ou ticket
  distinct.
- **Le double `<title>` et le fond blanc** viennent du composant par défaut de Next.
  Vérifier qu'un `not-found.tsx` défini les fait bien disparaître tous les deux — c'est
  le cas attendu, mais c'est une mesure, pas une croyance.

**Livrable.** Une fiche dans ce fichier : la métaphore retenue, le contenu de la page,
la décision sur `error.tsx`, et le périmètre de `UI-021`.

---

### `UI-021` — Réalisation : `not-found.tsx`

**Dépend de `UI-020`.**

**Périmètre.**

- `src/app/not-found.tsx`, composant serveur, avec ses `metadata` — un titre en
  français, et `robots` hérité de la mise en page racine.
- Ses textes dans `src/content/`, pas dans le composant.
- Fond, encre, filets et polices pris aux jetons : la page appartient au site, dans les
  deux thèmes.
- Les liens d'orientation retenus par l'étude.
- `error.tsx` si l'étude l'a rattaché à ce lot.

**Tests attendus.**

- De bout en bout : une URL inconnue rend **404** (le code HTTP, pas seulement la
  page) ; le texte affiché est en français ; le document ne porte **qu'un** `<title>` ;
  le fond calculé du `body` vaut `--papier` et non `#fff` — c'est la garde qui attrape
  le retour du composant par défaut ; l'avertissement `LEG-002` et le pied de page sont
  là ; les liens d'orientation mènent à des pages qui répondent `200`.
- Sur les deux profils, bureau et mobile.
- Sous `prefers-reduced-motion`, si l'étude a gardé une animation.
- La garde du fond se casse en supprimant `not-found.tsx` : elle doit rougir, puisque
  Next reprend alors son fond blanc. C'est précisément le défaut mesuré aujourd'hui, et
  c'est ce qui rend cette garde utile plutôt que cérémonielle.

**Documentation.** `docs/TASKS.md`, `docs/REGISTRE-TESTS.md`. Mention dans
`docs/INDEX.md` si `error.tsx` entre dans le lot.

**Version.** `v0.3.2`, correctif. Une page publique française qui répond en anglais sur
fond blanc n'attend pas la prochaine version de contenu : c'est le même raisonnement
que `UI-012`, et la correction est sans risque pour le reste.
**Branche.** `feat/UI-021-page-introuvable`.

---

## 6. La charte d'ornement, les boutons et les cartes

Ce sujet a été ajouté après les trois premiers, et il passe **devant** eux. Les trois
études ci-dessus ont toutes besoin de la même chose — une palette d'ornement et une
échelle d'élévation qui existent — et aucune ne doit l'inventer dans son coin.

### `UI-022` — Étude : la charte d'ornement, et l'état réel des primitives

**Objet.** Écrire une fois, pour tout le produit, ce que la section 10 du brief laisse
ouvert : de quoi est faite la matière décorative, et sur quels composants elle
s'applique.

**Deux manques constatés dans le dépôt, à traiter au passage :**

- **Il n'existe aucune primitive de bouton.** `src/components/ui/` compte sept
  composants — `Champ`, `ChampMontant`, `ChampTaux`, `ListeDeroulante`, `CaseACocher`,
  `SelecteurSegmente`, `Pastille` — et pas de `Bouton`. Les `<button>` sont écrits à la
  main dans huit fichiers, chacun avec ses classes. C'est le composant le plus visible
  d'une interface, et le seul qui n'a ni états définis ni banc d'essai.
- **Les cartes de l'accueil ne sont pas un composant.** Elles vivent en balisage direct
  dans `src/app/page.tsx`, avec une contrainte déjà établie par `UI-014` : toute la
  carte est un lien, et un second lien peut vivre **hors** de ce lien. Toute reprise
  visuelle doit tenir cette structure, qui est gardée par un test.

**Questions à trancher :**

- **De quoi est faite la famille `--ornement-*` ?** Combien de jetons, quels rôles —
  un dégradé de surface, une lueur de bord, un voile, une élévation ? Les nommer par
  rôle et non par apparence, comme les autres. Chacun déclaré dans les **deux** thèmes.
- **Le dégradé du produit.** Sur quelles teintes se construit-il ? L'accent laiton et
  l'encre appartiennent déjà au produit et ne signifient rien de sémantique : c'est la
  piste par défaut. Le vérifier à l'œil sur une surface réelle, dans les deux thèmes,
  avant de le figer.
- **Deux niveaux d'élévation, lesquels ?** Le §10.4 en autorise deux au maximum. Dire
  ce qui appartient au niveau 1 et au niveau 2, et ce qui reste à plat.
- **Le bouton : combien de variantes ?** Primaire, secondaire, discret, et le cas du
  lien qui ressemble à un bouton — le trancher plutôt que le laisser se décider huit
  fois. Cinq états chacun, comme les sept autres primitives.
- **La carte : composant ou pas ?** Un `Carte` réutilisable par l'accueil, le glossaire
  (`UI-019`) et la page introuvable (`UI-021`) mutualise l'écriture des trois écrans.
  Contrepartie : trois usages assez différents pour qu'une abstraction prématurée coûte
  plus qu'elle ne rend. Décider sur les trois usages réels, pas sur le principe.
- **Où se voit tout ça ?** La galerie `/composants` est le banc d'essai posé par
  `UI-000`. Elle doit montrer les jetons d'ornement, les élévations et les variantes de
  bouton, sinon rien n'est vérifiable.

**Livrable.** Une fiche dans ce fichier : la liste des jetons avec leur rôle et leurs
deux valeurs, le dégradé retenu, l'échelle d'élévation, l'inventaire des variantes de
bouton et la décision sur `Carte`. Plus les contrastes mesurés du texte sur chaque
nouvelle surface — dégradé compris, **aux deux extrémités**.

---

### `UI-023` — Réalisation : jetons d'ornement, `Bouton`, cartes

**Dépend de `UI-022`.**

**Périmètre.**

- Les jetons `--ornement-*` dans `src/app/globals.css`, dans les deux thèmes, exposés
  à Tailwind comme les autres.
- `src/components/ui/Bouton.tsx`, ses variantes et ses cinq états, plus la reprise des
  `<button>` écrits à la main dans les huit fichiers concernés.
- `Carte` si `UI-022` l'a retenu, et la reprise des cartes de l'accueil — **sans
  toucher à leur structure de liens**, que garde `UI-014`.
- Les vignettes correspondantes dans `/composants`.

**Tests attendus.**

- La garde des jetons, `src/app/__tests__/design-tokens.test.ts`, étendue à
  `--ornement-*` : déclarés dans les deux thèmes, et **distincts des quatre jetons
  sémantiques**. C'est la garde qu'ADR-021 met en contrepartie du retrait de l'interdit
  fintech, et c'est la plus importante du lot. Elle se casse en donnant à un jeton
  d'ornement la valeur de `--assurance` : elle doit rougir.
- Contraste du texte sur chaque nouvelle surface, dans les deux thèmes.
- Les cinq états du bouton, au clavier et au doigt, dans la galerie.
- La garde d'`UI-014` sur les cartes de l'accueil, toujours verte après reprise.

**Documentation.** `docs/TASKS.md`, `docs/REGISTRE-TESTS.md`, et `docs/06-design-system.md`
— c'est ce document qui décrit le système, il ne peut pas ignorer une famille de jetons.

**Version.** `v0.3.2`. **Branche.** `feat/UI-023-charte-ornement`.

---

## 7. Récapitulatif

| Ticket | Nature | Sujet | Dépend de | Version visée |
| --- | --- | --- | --- | --- |
| `UI-022` | étude | La charte d'ornement, les boutons, les cartes | — | `v0.3.2` |
| `UI-023` | réalisation | Jetons `--ornement-*`, `Bouton`, cartes | `UI-022` | `v0.3.2` |
| `UI-016` | étude | Où le produit fait attendre, et ce qu'il montre alors | `UI-022` | `v0.3.2` |
| `UI-017` | réalisation | Mouvement réduit (lot A), indicateur d'attente (lots B, C) | `UI-016` | `v0.3.2` / `v0.5.0` |
| `UI-020` | étude | Ce que sert une URL inconnue | `UI-022` | `v0.3.2` |
| `UI-021` | réalisation | `not-found.tsx` | `UI-020` | `v0.3.2` |
| `UI-018` | étude | La lecture de quarante-huit entrées de glossaire | `UI-022` | `v0.4.0` |
| `UI-019` | réalisation | Nouvelle présentation du glossaire | `UI-018` | `v0.4.0` |

**La colonne « version visée » date de l'ouverture de ces tickets, le 23 août 2026, et
elle est périmée.** Le plan de lancement du 25 août a créé `v0.7.0 « L'interface se
montre »` et lui a donné toute la phase 8 — voir `docs/RELEASES.md`. Les huit tickets y
vont donc, à une réserve près : le lot C d'`UI-017` attend le module « pierre ou
marchés », et ne peut pas sortir avant `v0.5.0` quelle que soit la version qui l'héberge.
La colonne est laissée telle quelle plutôt que réécrite : elle dit ce qui était prévu, et
cette phrase dit ce qui a changé.

**Ordre conseillé — c'est celui du tableau.**

**`UI-022` d'abord, sans exception.** C'est lui qui produit la matière que les trois
autres emploient. Traité en dernier, il n'aurait plus qu'à constater trois écritures
divergentes ; traité en premier, il en fait une charte. C'est aussi le ticket qui porte
le plus de valeur de démonstration : une famille de jetons nommés par rôle, gardés par
un test, et distincts des couleurs sémantiques, est exactement ce qui distingue une
démarche de design d'un empilement d'effets.

**`UI-023` ensuite**, parce que le lot A d'`UI-017` — la règle
`prefers-reduced-motion` — doit exister avant qu'on anime quoi que ce soit, et parce
qu'un `Bouton` et une échelle d'élévation servent les deux écrans suivants.

**Puis la page introuvable** (`UI-020`, `UI-021`) : défaut mesuré, correction bornée,
trou de conformité fermé, et le premier écran entièrement dessiné avec la nouvelle
charte — donc le premier montrable.

**Puis l'attente** (`UI-016`, `UI-017`), dont la conclusion peut rester « rien à livrer
avant `v0.5.0` ».

**Le glossaire en dernier** (`UI-018`, `UI-019`) : le plus gros des quatre sujets, le
seul qui touche une page déjà livrée et déjà gardée, et celui qui profite le plus
d'arriver quand la charte est éprouvée sur deux écrans.

**Les études se traitent avant les réalisations.** Elles décident de la même question —
quelle place donner à l'ornement sans faire tomber la sémantique des couleurs — et la
trancher quatre fois séparément produirait quatre réponses différentes.
