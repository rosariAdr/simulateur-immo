# Charte graphique

> **Statut : en vigueur.** Palette et typographie arrêtées le 20 août 2026, surfaces
> arrêtées le 21 août 2026. Les valeurs vivent dans `src/app/globals.css`, les polices
> sont chargées par `src/app/layout.tsx`.
> Source de l'intention : `docs/01-brief-design.md` §4 et §5.
> Décisions : `docs/ADR.md`, ADR-002 et ADR-003.
>
> **Ce document ne fait pas autorité seul.** La source de vérité des valeurs est
> `src/app/globals.css`, et `src/app/__tests__/design-tokens.test.ts` échoue si un
> contraste régresse. Modifier une valeur ici sans la modifier là est sans effet.

## 1. Méthode

Les couleurs ne sont pas choisies à l'œil. Les quatre couleurs sémantiques sont aussi
les couleurs de séries des graphiques : elles sont donc soumises aux contrôles
calculables d'une palette catégorielle — bande de clarté, plancher de chroma,
séparation sous deutéranopie et protanopie (Machado–Oliveira–Fernandes 2009,
sévérité 1,0), plancher en vision normale, contraste sur la surface.

Chaque valeur ci-dessous a passé ces contrôles, dans les deux thèmes. Toute
modification ultérieure doit être revalidée, jamais ajustée à l'estime.

## 2. Le thème par défaut est sombre

**Ardoise bleutée profonde.** Le thème clair existe et reste complet, mais il est la
variante : il n'est servi qu'aux navigateurs qui le demandent. Voir ADR-003.

## 3. Jetons sémantiques

L'ordre des emplacements est **fixe** : capital, intérêts, assurance, marchés.
Il n'est pas décoratif — c'est lui qui porte la séparation sous déficience de la
vision des couleurs. Ne pas le permuter.

| Rôle | Sens | Sombre *(défaut)* | Clair |
|---|---|---|---|
| **Capital** | Ce que l'utilisateur possède, tout gain | `#46a37f` | `#207e5d` |
| **Intérêts** | Ce que l'utilisateur perd, tout coût | `#ae523f` | `#863525` |
| **Assurance** | Troisième poste de coût | `#a581c6` | `#846cad` |
| **Marchés** | Le scénario financier alternatif | `#2170b0` | `#085491` |

### Variantes texte — obligatoires

Une couleur de série et une couleur de texte ne sont pas le même jeton. Les valeurs
ci-dessus sont validées pour **remplir une forme** (≥ 3:1). Quand la couleur doit
porter du texte, utiliser :

| Rôle | Sombre | Contraste | Clair | Contraste |
|---|---|---|---|---|
| Capital | `#46a37f` | 5,55:1 | `#007453` | 4,57:1 |
| Intérêts | `#c46c5a` | 4,60:1 | `#863525` | 6,50:1 |
| Assurance | `#a581c6` | 5,35:1 | `#715999` | 4,61:1 |
| Marchés | `#4d87c7` | 4,57:1 | `#085491` | 6,17:1 |

## 4. Neutres, accent, états

| Rôle | Sombre *(défaut)* | Clair |
|---|---|---|
| Papier — fond général | `#161c24` | `#dfe5ed` |
| Panneau — fond des zones de saisie | `#1e2632` | `#eef2f7` |
| Encre — texte principal | `#e6eaef` (14,18:1) | `#14181c` (14,07:1) |
| Encre secondaire — légendes | `#a9b3bd` (8,05:1) | `#4a555f` (6,01:1) |
| Filet — bordures, séparateurs | `#2f3945` | `#b9c2cd` |
| Filet de grille — graphiques | `#232c36` | `#ccd4de` |
| Survol | `#262f3a` | `#d5dce6` |
| Accent — curseurs, liens, focus | `#c79a46` (6,64:1) | `#7e5f26` (4,66:1) |
| Accent au survol | `#dcb267` | `#5f4718` |
| Fond d'erreur | `#2a1f1c` | `#efe0db` |
| Encre désactivée | `#6b757f` | `#8b949d` |
| Filet désactivé | `#2a333d` | `#cbd3dd` |
| Fond d'infobulle | `#2e2718` | `#f2e7ca` |
| Filet d'infobulle | `#6b5a2e` | `#d9c48c` |
| Filet de pastille « i » | `#8a7238` | `#a58a4e` |

L'erreur ne reçoit pas de rouge à elle : elle réutilise la brique des intérêts.
Le produit n'a qu'un seul rouge, et il signifie déjà « ce que vous perdez ».
Le focus réutilise le laiton de l'accent.

## 5. Trois murs que le calcul a révélés

Aucun des trois n'était visible à l'œil.

**Le violet ne peut pas descendre jusqu'à l'ardoise.** Assombri vers l'ardoise
véritable que décrit le brief, il tombe à ΔE 11,8 du bleu marchés en vision normale,
sous le plancher de 15.

**La palette ne peut pas être plus désaturée.** Une variante à chroma 0,095 échoue au
plancher, en dessous duquel une teinte lit comme un gris et cesse de porter
l'identité. Les valeurs retenues sont posées **sur** ce plancher.

**Sur fond sombre, remplissage et texte ne peuvent pas être le même jeton.** Forcer
les quatre couleurs de série à tenir 4,5:1 les tasse dans une bande de clarté si
étroite que l'assurance et les marchés redeviennent indiscernables — ΔE 14,4 en
vision normale. Recherche exhaustive sur 48 candidats : aucun ne satisfait les deux
rôles à la fois. D'où la séparation en deux familles de jetons.

## 6. Règles d'emploi

- **Jamais de couleur seule.** Toute information portée par la couleur est doublée
  d'un libellé, d'une position ou d'un motif. C'est une exigence du brief §4, et
  c'est aussi ce qui rend légale la marge de séparation sous déficience visuelle.
- **La couleur suit l'entité, jamais son rang.** Un filtre qui masque une série ne
  repeint pas les survivantes.
- **Le texte porte des jetons de texte.** Les valeurs, libellés et légendes restent
  en encre ; c'est la pastille colorée à côté qui porte l'identité.
- **Le thème clair est choisi, pas dérivé.** Ne pas l'obtenir par inversion
  automatique du thème sombre.
- **La palette plafonne à quatre couleurs de série.** Une cinquième ne prend pas une
  teinte inventée : elle se replie dans « autres », ou passe en petits multiples.

## 7. Structure d'écran

Toutes les vues de bureau font **1240 px** et portent la même barre de navigation :
nom du produit, six modules avec leur icône au trait, millésime des barèmes, action
de copie du lien. L'onglet actif est marqué par un filet et un fond, jamais par la
couleur seule. Sur mobile, la navigation passe en barre d'onglets en pied.

Cette constance n'est pas une coquetterie : c'est ce qui permet de changer de module
sans réapprendre où sont les choses.

## 8. Pédagogie intégrée

Chaque terme technique porte une **pastille « i » cerclée**, discrète mais constante,
posée juste après le libellé. Au survol et au clic, une bulle sur fond laiton pâle
donne deux phrases — jamais plus.

La pastille et la fiche longue ne font pas double emploi : la bulle donne la
définition, la fiche donne le raisonnement. On apprend en manipulant, pas seulement
en lisant.

## 9. Typographie

Trois rôles, trois familles, toutes sous licence libre et **auto-hébergées** via
`next/font` — qui télécharge à la compilation et n'émet aucune requête vers un
tiers à l'exécution. C'est ce qui permet de tenir la promesse « aucune donnée
personnelle traitée » : un appel à une fonderie distante transmettrait l'adresse IP
de chaque visiteur.

| Rôle | Police | Pourquoi |
|---|---|---|
| Titres, chiffres marquants | **Archivo** | Grotesque variable en graisse **et en largeur**. Du caractère sans être une police à effet ; la largeur variable permet de condenser un grand nombre sans le rétrécir optiquement. |
| Texte courant, interface | **Public Sans** | Police du design system du gouvernement fédéral américain, lignée Franklin Gothic. « Univers administratif ou institutionnel » au sens littéral, et dessinée pour la lisibilité de formulaires denses. |
| Données, montants, tableaux | **IBM Plex Mono** | Chasse fixe, chiffres tabulaires, zéro barré distinguable du O. Lignée institutionnelle cohérente avec Public Sans. |

**Sur les chiffres tabulaires.** Toute chasse fixe aligne les colonnes par
construction. Le point de vigilance est ailleurs : les montants affichés **hors
tableau** en Archivo ou Public Sans doivent porter `font-variant-numeric:
tabular-nums`, sinon un indicateur qui se met à jour fait sautiller sa propre
largeur à chaque frappe. La classe `.tabulaire` est là pour ça.

**Note.** La référence évidente de l'« univers administratif » français est
*Marianne*, la police de l'État. Sa licence la réserve à la communication de
l'État : elle n'est pas utilisable ici. Public Sans en est l'équivalent le plus
proche qui soit librement exploitable.

## 10. Planches de référence

Les huit planches d'interface sont dans le dépôt sous forme de sources `.dc.html`,
avec leur mise en page dans `canvas.json`. Elles sont authorées en clair ;
`scripts/design-themes.mjs` en dérive les deux thèmes du produit — cette direction
est un héritage de la phase de comparaison, pas une hiérarchie : le thème de
référence du produit est le sombre.

- `scripts/design-shell.mjs` injecte la barre de navigation et normalise les largeurs
- `scripts/design-themes.mjs` produit `design/ardoise-nocturne/` et `design/bleu-gris-franc/`
