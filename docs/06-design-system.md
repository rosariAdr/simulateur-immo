# Charte graphique — proposition

> **Statut : proposition, non validée.** Les valeurs de ce document deviennent
> `src/app/globals.css` (`INF-004`) une fois arbitrées. Rien n'est encore implémenté.
> Source de l'intention : `docs/01-brief-design.md` §4 et §5.

## 1. Méthode

Les couleurs ne sont pas choisies à l'œil. Les quatre couleurs sémantiques sont aussi
les couleurs de séries des graphiques : elles sont donc soumises aux contrôles
calculables d'une palette catégorielle — bande de clarté, plancher de chroma,
séparation sous deutéranopie et protanopie (Machado–Oliveira–Fernandes 2009,
sévérité 1,0), plancher en vision normale, contraste sur la surface.

Chaque valeur ci-dessous a passé ces contrôles, dans les deux thèmes. Toute
modification ultérieure doit être revalidée, jamais ajustée à l'estime.

## 2. Jetons sémantiques

L'ordre des emplacements est **fixe** : capital, intérêts, assurance, marchés.
Il n'est pas décoratif — c'est lui qui porte la séparation sous déficience de la
vision des couleurs. Ne pas le permuter.

| Rôle | Sens | Clair | Sombre |
|---|---|---|---|
| **Capital** | Ce que l'utilisateur possède, tout gain | `#207e5d` | `#46a37f` |
| **Intérêts** | Ce que l'utilisateur perd, tout coût | `#863525` | `#ae523f` |
| **Assurance** | Troisième poste de coût | `#846cad` | `#a581c6` |
| **Marchés** | Le scénario financier alternatif | `#085491` | `#2170b0` |

### Variantes texte — obligatoires

Une couleur de série et une couleur de texte ne sont pas le même jeton. Les valeurs
ci-dessus sont validées pour **remplir une forme** (≥ 3:1). Quatre d'entre elles
n'atteignent pas 4,5:1 en texte. Quand la couleur doit porter du texte, utiliser :

| Rôle | Clair | Contraste | Sombre | Contraste |
|---|---|---|---|---|
| Capital | `#107c5a` | 4,66:1 | `#46a37f` | 5,78:1 |
| Intérêts | `#863525` | 7,41:1 | `#c06956` | 4,58:1 |
| Assurance | `#725b9a` | 5,14:1 | `#a581c6` | 5,57:1 |
| Marchés | `#085491` | 7,03:1 | `#4983c3` | 4,52:1 |

## 3. Neutres et accent

| Rôle | Clair | Sombre |
|---|---|---|
| Papier — fond général | `#F1F3F6` | `#14181C` |
| Panneau — fond des zones de saisie | `#F8F9FB` | `#1E242A` |
| Encre — texte principal | `#14181C` (16,05:1) | `#E6EAEF` (14,76:1) |
| Encre secondaire — légendes | `#4A555F` (6,86:1) | `#A9B3BD` (8,38:1) |
| Filet — bordures, séparateurs | `#C9CFD7` | `#333C45` |
| Accent — curseurs, liens, actifs | `#7E5F26` (5,32:1) | `#C79A46` (6,91:1) |

## 4. Deux contraintes que le calcul a imposées

**Le violet ne peut pas être aussi sombre que « ardoise » le suggère.** Assombri
vers l'ardoise véritable, il tombe à ΔE 11,8 du bleu marchés en vision normale —
sous le plancher de 15. Deux lecteurs sur trois les confondraient. La valeur
retenue est le compromis le plus sourd qui reste distinguable.

**La palette ne peut pas être plus désaturée.** Une variante à chroma 0,095 a été
testée : elle échoue au plancher de chroma, en dessous duquel une teinte lit comme
un gris et cesse de porter l'identité. Les valeurs retenues sont posées **sur** ce
plancher, au plus près de l'intention « sourd » du brief.

## 5. Règles d'emploi

- **Jamais de couleur seule.** Toute information portée par la couleur est doublée
  d'un libellé, d'une position ou d'un motif. C'est une exigence du brief §4, et
  c'est aussi ce qui rend légale la marge de séparation sous déficience visuelle.
- **La couleur suit l'entité, jamais son rang.** Un filtre qui masque une série ne
  repeint pas les survivantes.
- **Le texte porte des jetons de texte.** Les valeurs, libellés et légendes restent
  en encre ; c'est la pastille colorée à côté qui porte l'identité.
- **Le thème sombre est choisi, pas dérivé.** Ses valeurs sont des pas distincts,
  validés contre la surface sombre. Ne pas l'obtenir par inversion automatique.

## 6. Typographie

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
largeur à chaque frappe.

**Note.** La référence évidente de l'« univers administratif » français est
*Marianne*, la police de l'État. Sa licence la réserve à la communication de
l'État : elle n'est pas utilisable ici. Public Sans en est l'équivalent le plus
proche qui soit librement exploitable.

### Variantes

- **Plus de caractère** : *Bricolage Grotesque* en titres (axes largeur et taille
  optique) et *JetBrains Mono* en données — chiffres plus larges, plus lisibles à
  petit corps, mais registre plus contemporain que documentaire.
- **Plus sobre** : *Libre Franklin* en titres et en texte, deux familles au lieu de
  trois. Moins de personnalité — le brief met en garde contre l'effet gabarit.
