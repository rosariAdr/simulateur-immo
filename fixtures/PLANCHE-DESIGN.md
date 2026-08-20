# Planche de données — sorties réelles du moteur

> Produit par `scripts/export-design-sheet.mts` à partir des fixtures. **Ne pas éditer à la main.**
> Tous les chiffres de ce document sortent du moteur de calcul, aucun n'est inventé.
> Le moteur compte 95 tests, dont des cas de référence vérifiés contre une source externe.

## Contraintes de mise en page à respecter

- **Montant le plus large rencontré : `179 463,61 €`** (12 caractères). C'est lui qui dimensionne les colonnes de montants, pas la moyenne.
- **Libellé de prêt le plus long : « Prêt à taux zéro »**.
- Le séparateur de milliers est une **espace insécable étroite**, la décimale une **virgule**, le symbole **après** le montant. C'est le format français, non négociable.
- Les tableaux mensuels comptent **240 à 300 lignes**. Une maquette qui ne montre que cinq lignes ne prouve rien.
- Deux scénarios sur quatre sont **non conformes** à une règle. L'état non conforme n'est pas un cas limite à traiter plus tard : c'est un état de premier plan.

---

## Achat modeste

`01-achat-modeste` — Le cas nominal. Fixe la grille, la largeur des montants, la longueur du tableau a 20 ans.

### Ce que l'utilisateur a saisi

| Paramètre | Valeur |
|---|---|
| Prêt principal | 180 000,00 € à 3,20 % sur 240 mois |
| Assurance | 0,30 % sur capital initial, quotité 100 % |
| Garantie | caution — 2 250,00 €, dont 1 237,50 € restitués au terme |
| Revenu net mensuel | 3 800,00 € |
| Prix du bien | 205 000,00 € |

### Bandeau d'indicateurs

| Indicateur | Valeur |
|---|---|
| Première mensualité | **1 061,39 €** |
| Mensualité maximale | **1 062,41 €** ← différente de la première |
| Capital emprunté | 180 000,00 € |
| Intérêts | 63 934,62 € |
| Assurance | 10 800,00 € |
| Frais initiaux | 3 150,00 € |
| Coût total du crédit | **77 884,62 €** |
| TAEG | 3,96 % |
| TAEA | 0,51 % |
| Nombre d'échéances | 240 |
| Mois de bascule capital/intérêts | 1 |

### Conformité

- **Usure** — conforme · TAEG 3,96 % contre un plafond de 5,29 % (2026-T3) · marge 1,33 point(s)
- **HCSF** — conforme · taux d'effort 27,96 % contre un plafond de 35,00 % · durée max 300 mois · marge dérogatoire des banques 20,00 %

### Profil d'amortissement

- Dix premières échéances : 4 735,19 € d'intérêts, soit **44,61 %** de l'échéance
- Dix dernières échéances : 147,51 € d'intérêts, soit **1,39 %**
- Rapport d'antériorité : **32,1×**
- Les intérêts dominent dès la première échéance : **non**
- Médiane des intérêts au mois 76, médiane du capital au mois 139 — **écart de 63 mois**

### Jalons et fenêtres — à ne jamais confondre

| Jalon : part d'intérêts sous… | Mois | Fenêtre : 1 € versé rapporte ≥… | Jusqu'au mois |
|---|---|---|---|
| 50 % | 1 | 100 % | jamais |
| 25 % | 128 | 50 % | 87 |
| 15 % | 178 | 25 % | 156 |
| 10 % | 200 | 10 % | 204 |
| 5 % | 221 |  |  |

Les jalons décrivent **où en est le crédit**. Les fenêtres désignent **où agir**. Elles pointent en sens opposés.

### Tableau annuel — 20 lignes, intégralement reproduites

| Année | Intérêts | Capital | Assurance | Échéances | Restant dû |
|---|---|---|---|---|---|
| 1 | 5 664,76 € | 6 531,92 € | 540,00 € | 12 736,68 € | 173 468,08 € |
| 2 | 5 452,63 € | 6 744,05 € | 540,00 € | 12 736,68 € | 166 724,03 € |
| 3 | 5 233,63 € | 6 963,05 € | 540,00 € | 12 736,68 € | 159 760,98 € |
| 4 | 5 007,53 € | 7 189,15 € | 540,00 € | 12 736,68 € | 152 571,83 € |
| 5 | 4 774,06 € | 7 422,62 € | 540,00 € | 12 736,68 € | 145 149,21 € |
| 6 | 4 533,02 € | 7 663,66 € | 540,00 € | 12 736,68 € | 137 485,55 € |
| 7 | 4 284,17 € | 7 912,51 € | 540,00 € | 12 736,68 € | 129 573,04 € |
| 8 | 4 027,20 € | 8 169,48 € | 540,00 € | 12 736,68 € | 121 403,56 € |
| 9 | 3 761,92 € | 8 434,76 € | 540,00 € | 12 736,68 € | 112 968,80 € |
| 10 | 3 487,99 € | 8 708,69 € | 540,00 € | 12 736,68 € | 104 260,11 € |
| 11 | 3 205,21 € | 8 991,47 € | 540,00 € | 12 736,68 € | 95 268,64 € |
| 12 | 2 913,23 € | 9 283,45 € | 540,00 € | 12 736,68 € | 85 985,19 € |
| 13 | 2 611,74 € | 9 584,94 € | 540,00 € | 12 736,68 € | 76 400,25 € |
| 14 | 2 300,49 € | 9 896,19 € | 540,00 € | 12 736,68 € | 66 504,06 € |
| 15 | 1 979,14 € | 10 217,54 € | 540,00 € | 12 736,68 € | 56 286,52 € |
| 16 | 1 647,34 € | 10 549,34 € | 540,00 € | 12 736,68 € | 45 737,18 € |
| 17 | 1 304,79 € | 10 891,89 € | 540,00 € | 12 736,68 € | 34 845,29 € |
| 18 | 951,07 € | 11 245,61 € | 540,00 € | 12 736,68 € | 23 599,68 € |
| 19 | 585,87 € | 11 610,81 € | 540,00 € | 12 736,68 € | 11 988,87 € |
| 20 | 208,83 € | 11 988,87 € | 540,00 € | 12 737,70 € | 0,00 € |

### Tableau mensuel — 240 lignes

Extrait. Le tableau complet fait la longueur indiquée ci-dessus : c'est la contrainte de mise en page réelle.

| Mois | Intérêts | Capital | Assurance | Échéance | Restant dû |
|---|---|---|---|---|---|
| 1 | 480,00 € | 536,39 € | 45,00 € | 1 061,39 € | 179 463,61 € |
| 2 | 478,57 € | 537,82 € | 45,00 € | 1 061,39 € | 178 925,79 € |
| 3 | 477,14 € | 539,25 € | 45,00 € | 1 061,39 € | 178 386,54 € |
| … | … | … | … | … | … |
| 121 | 278,03 € | 738,36 € | 45,00 € | 1 061,39 € | 103 521,75 € |
| … | … | … | … | … | … |
| 238 | 8,09 € | 1 008,30 € | 45,00 € | 1 061,39 € | 2 025,69 € |
| 239 | 5,40 € | 1 010,99 € | 45,00 € | 1 061,39 € | 1 014,70 € |
| 240 | 2,71 € | 1 014,70 € | 45,00 € | 1 062,41 € | 0,00 € |

---

## Achat tendu, non conforme HCSF

`02-achat-tendu-hcsf` — Endettement au-dela du plafond. L'interface doit signaler la non-conformite sans juger l'utilisateur.

### Ce que l'utilisateur a saisi

| Paramètre | Valeur |
|---|---|
| Prêt principal | 420 000,00 € à 3,90 % sur 300 mois |
| Assurance | 0,34 % sur capital initial, quotité 100 % |
| Garantie | hypothèque — 6 300,00 €, dont 0,00 € restitués au terme |
| Revenu net mensuel | 6 080,00 € |
| Prix du bien | 465 000,00 € |

### Bandeau d'indicateurs

| Indicateur | Valeur |
|---|---|
| Première mensualité | **2 312,79 €** |
| Mensualité maximale | **2 312,79 €** |
| Capital emprunté | 420 000,00 € |
| Intérêts | 238 136,97 € |
| Assurance | 35 700,00 € |
| Frais initiaux | 7 800,00 € |
| Coût total du crédit | **281 636,97 €** |
| TAEG | 4,69 % |
| TAEA | 0,53 % |
| Nombre d'échéances | 300 |
| Mois de bascule capital/intérêts | 88 |

### Conformité

- **Usure** — conforme · TAEG 4,69 % contre un plafond de 5,29 % (2026-T3) · marge 0,60 point(s)
- **HCSF** — **NON CONFORME** · taux d'effort 41,00 % contre un plafond de 35,00 % · durée max 300 mois · marge dérogatoire des banques 20,00 %

### Profil d'amortissement

- Dix premières échéances : 13 527,72 € d'intérêts, soit **58,49 %** de l'échéance
- Dix dernières échéances : 387,10 € d'intérêts, soit **1,67 %**
- Rapport d'antériorité : **34,9×**
- Les intérêts dominent dès la première échéance : **oui**
- Médiane des intérêts au mois 98, médiane du capital au mois 186 — **écart de 88 mois**

### Jalons et fenêtres — à ne jamais confondre

| Jalon : part d'intérêts sous… | Mois | Fenêtre : 1 € versé rapporte ≥… | Jusqu'au mois |
|---|---|---|---|
| 50 % | 71 | 100 % | 86 |
| 25 % | 207 | 50 % | 175 |
| 15 % | 248 | 25 % | 231 |
| 10 % | 267 | 10 % | 270 |
| 5 % | 285 |  |  |

Les jalons décrivent **où en est le crédit**. Les fenêtres désignent **où agir**. Elles pointent en sens opposés.

### Tableau annuel — 25 lignes, intégralement reproduites

| Année | Intérêts | Capital | Assurance | Échéances | Restant dû |
|---|---|---|---|---|---|
| 1 | 16 200,27 € | 10 125,21 € | 1 428,00 € | 27 753,48 € | 409 874,79 € |
| 2 | 15 798,25 € | 10 527,23 € | 1 428,00 € | 27 753,48 € | 399 347,56 € |
| 3 | 15 380,31 € | 10 945,17 € | 1 428,00 € | 27 753,48 € | 388 402,39 € |
| 4 | 14 945,72 € | 11 379,76 € | 1 428,00 € | 27 753,48 € | 377 022,63 € |
| 5 | 14 493,86 € | 11 831,62 € | 1 428,00 € | 27 753,48 € | 365 191,01 € |
| 6 | 14 024,11 € | 12 301,37 € | 1 428,00 € | 27 753,48 € | 352 889,64 € |
| 7 | 13 535,70 € | 12 789,78 € | 1 428,00 € | 27 753,48 € | 340 099,86 € |
| 8 | 13 027,88 € | 13 297,60 € | 1 428,00 € | 27 753,48 € | 326 802,26 € |
| 9 | 12 499,91 € | 13 825,57 € | 1 428,00 € | 27 753,48 € | 312 976,69 € |
| 10 | 11 950,93 € | 14 374,55 € | 1 428,00 € | 27 753,48 € | 298 602,14 € |
| 11 | 11 380,23 € | 14 945,25 € | 1 428,00 € | 27 753,48 € | 283 656,89 € |
| 12 | 10 786,81 € | 15 538,67 € | 1 428,00 € | 27 753,48 € | 268 118,22 € |
| 13 | 10 169,85 € | 16 155,63 € | 1 428,00 € | 27 753,48 € | 251 962,59 € |
| 14 | 9 528,41 € | 16 797,07 € | 1 428,00 € | 27 753,48 € | 235 165,52 € |
| 15 | 8 861,48 € | 17 464,00 € | 1 428,00 € | 27 753,48 € | 217 701,52 € |
| 16 | 8 168,06 € | 18 157,42 € | 1 428,00 € | 27 753,48 € | 199 544,10 € |
| 17 | 7 447,15 € | 18 878,33 € | 1 428,00 € | 27 753,48 € | 180 665,77 € |
| 18 | 6 697,57 € | 19 627,91 € | 1 428,00 € | 27 753,48 € | 161 037,86 € |
| 19 | 5 918,24 € | 20 407,24 € | 1 428,00 € | 27 753,48 € | 140 630,62 € |
| 20 | 5 107,99 € | 21 217,49 € | 1 428,00 € | 27 753,48 € | 119 413,13 € |
| 21 | 4 265,55 € | 22 059,93 € | 1 428,00 € | 27 753,48 € | 97 353,20 € |
| 22 | 3 389,68 € | 22 935,80 € | 1 428,00 € | 27 753,48 € | 74 417,40 € |
| 23 | 2 479,01 € | 23 846,47 € | 1 428,00 € | 27 753,48 € | 50 570,93 € |
| 24 | 1 532,20 € | 24 793,28 € | 1 428,00 € | 27 753,48 € | 25 777,65 € |
| 25 | 547,80 € | 25 777,65 € | 1 428,00 € | 27 753,45 € | 0,00 € |

### Tableau mensuel — 300 lignes

Extrait. Le tableau complet fait la longueur indiquée ci-dessus : c'est la contrainte de mise en page réelle.

| Mois | Intérêts | Capital | Assurance | Échéance | Restant dû |
|---|---|---|---|---|---|
| 1 | 1 365,00 € | 828,79 € | 119,00 € | 2 312,79 € | 419 171,21 € |
| 2 | 1 362,31 € | 831,48 € | 119,00 € | 2 312,79 € | 418 339,73 € |
| 3 | 1 359,60 € | 834,19 € | 119,00 € | 2 312,79 € | 417 505,54 € |
| … | … | … | … | … | … |
| 151 | 845,39 € | 1 348,40 € | 119,00 € | 2 312,79 € | 258 770,63 € |
| … | … | … | … | … | … |
| 298 | 21,25 € | 2 172,54 € | 119,00 € | 2 312,79 € | 4 366,25 € |
| 299 | 14,19 € | 2 179,60 € | 119,00 € | 2 312,79 € | 2 186,65 € |
| 300 | 7,11 € | 2 186,65 € | 119,00 € | 2 312,76 € | 0,00 € |

---

## PTZ en différé

`03-ptz-differe` — La mensualite TOTALE grimpe a la fin du differe. C'est maxPayment qui compte, pas firstPayment.

### Ce que l'utilisateur a saisi

| Paramètre | Valeur |
|---|---|
| Prêt principal | 200 000,00 € à 3,50 % sur 300 mois |
| Prêt à taux zéro | 60 000,00 € à 0,00 % sur 300 mois, différé 120 mois |
| Assurance | 0,32 % sur capital restant du, quotité 100 % |
| Garantie | caution — 3 250,00 €, dont 1 787,50 € restitués au terme |
| Revenu net mensuel | 4 500,00 € |
| Prix du bien | 285 000,00 € |

### Bandeau d'indicateurs

| Indicateur | Valeur |
|---|---|
| Première mensualité | **1 070,58 €** |
| Mensualité maximale | **1 387,93 €** ← différente de la première |
| Capital emprunté | 260 000,00 € |
| Intérêts | 100 373,59 € |
| Assurance | 12 545,09 € |
| Frais initiaux | 4 450,00 € |
| Coût total du crédit | **117 368,68 €** |
| TAEG | 3,08 % |
| TAEA | 0,33 % |
| Nombre d'échéances | 300 |
| Mois de bascule capital/intérêts | 64 |

### Conformité

- **Usure** — conforme · TAEG 3,08 % contre un plafond de 5,29 % (2026-T3) · marge 2,21 point(s)
- **HCSF** — conforme · taux d'effort 30,84 % contre un plafond de 35,00 % · durée max 324 mois · marge dérogatoire des banques 20,00 %

### Profil d'amortissement

- Dix premières échéances : 5 778,05 € d'intérêts, soit **54,00 %** de l'échéance
- Dix dernières échéances : 158,72 € d'intérêts, soit **1,19 %**
- Rapport d'antériorité : **45,5×**
- Les intérêts dominent dès la première échéance : **oui**
- Médiane des intérêts au mois 97, médiane du capital au mois 191 — **écart de 94 mois**

### Jalons et fenêtres — à ne jamais confondre

| Jalon : part d'intérêts sous… | Mois | Fenêtre : 1 € versé rapporte ≥… | Jusqu'au mois |
|---|---|---|---|
| 50 % | 41 | 100 % | 62 |
| 25 % | 157 | 50 % | 160 |
| 15 % | 223 | 25 % | 223 |
| 10 % | 252 | 10 % | 267 |
| 5 % | 278 |  |  |

Les jalons décrivent **où en est le crédit**. Les fenêtres désignent **où agir**. Elles pointent en sens opposés.

### Tableau annuel — 25 lignes, intégralement reproduites

| Année | Intérêts | Capital | Assurance | Échéances | Restant dû |
|---|---|---|---|---|---|
| 1 | 6 918,76 € | 5 096,24 € | 824,57 € | 12 839,57 € | 254 903,76 € |
| 2 | 6 737,52 € | 5 277,48 € | 807,99 € | 12 822,99 € | 249 626,28 € |
| 3 | 6 549,81 € | 5 465,19 € | 790,85 € | 12 805,85 € | 244 161,09 € |
| 4 | 6 355,44 € | 5 659,56 € | 773,08 € | 12 788,08 € | 238 501,53 € |
| 5 | 6 154,13 € | 5 860,87 € | 754,66 € | 12 769,66 € | 232 640,66 € |
| 6 | 5 945,67 € | 6 069,33 € | 735,60 € | 12 750,60 € | 226 571,33 € |
| 7 | 5 729,79 € | 6 285,21 € | 715,88 € | 12 730,88 € | 220 286,12 € |
| 8 | 5 506,26 € | 6 508,74 € | 695,42 € | 12 710,42 € | 213 777,38 € |
| 9 | 5 274,77 € | 6 740,23 € | 674,28 € | 12 689,28 € | 207 037,15 € |
| 10 | 5 035,04 € | 6 979,96 € | 652,35 € | 12 667,35 € | 200 057,19 € |
| 11 | 4 786,78 € | 11 228,18 € | 623,79 € | 16 638,75 € | 188 829,01 € |
| 12 | 4 529,71 € | 11 485,25 € | 587,48 € | 16 602,44 € | 177 343,76 € |
| 13 | 4 263,46 € | 11 751,50 € | 550,32 € | 16 565,28 € | 165 592,26 € |
| 14 | 3 987,76 € | 12 027,20 € | 512,33 € | 16 527,29 € | 153 565,06 € |
| 15 | 3 702,25 € | 12 312,71 € | 473,42 € | 16 488,38 € | 141 252,35 € |
| 16 | 3 406,60 € | 12 608,36 € | 433,60 € | 16 448,56 € | 128 643,99 € |
| 17 | 3 100,43 € | 12 914,53 € | 392,81 € | 16 407,77 € | 115 729,46 € |
| 18 | 2 783,36 € | 13 231,60 € | 351,01 € | 16 365,97 € | 102 497,86 € |
| 19 | 2 455,00 € | 13 559,96 € | 308,20 € | 16 323,16 € | 88 937,90 € |
| 20 | 2 115,00 € | 13 899,96 € | 264,31 € | 16 279,27 € | 75 037,94 € |
| 21 | 1 762,89 € | 14 252,07 € | 219,31 € | 16 234,27 € | 60 785,87 € |
| 22 | 1 398,23 € | 14 616,73 € | 173,18 € | 16 188,14 € | 46 169,14 € |
| 23 | 1 020,65 € | 14 994,31 € | 125,85 € | 16 140,81 € | 31 174,83 € |
| 24 | 629,62 € | 15 385,34 € | 77,32 € | 16 092,28 € | 15 789,49 € |
| 25 | 224,66 € | 15 789,49 € | 27,48 € | 16 041,63 € | 0,00 € |

### Tableau mensuel — 300 lignes

Extrait. Le tableau complet fait la longueur indiquée ci-dessus : c'est la contrainte de mise en page réelle.

| Mois | Intérêts | Capital | Assurance | Échéance | Restant dû |
|---|---|---|---|---|---|
| 1 | 583,33 € | 417,92 € | 69,33 € | 1 070,58 € | 259 582,08 € |
| 2 | 582,11 € | 419,14 € | 69,22 € | 1 070,47 € | 259 162,94 € |
| 3 | 580,89 € | 420,36 € | 69,11 € | 1 070,36 € | 258 742,58 € |
| … | … | … | … | … | … |
| 151 | 354,38 € | 980,20 € | 45,73 € | 1 380,31 € | 170 521,68 € |
| … | … | … | … | … | … |
| 298 | 8,71 € | 1 325,87 € | 1,06 € | 1 335,64 € | 2 659,63 € |
| 299 | 5,81 € | 1 328,77 € | 0,71 € | 1 335,29 € | 1 330,86 € |
| 300 | 2,91 € | 1 330,86 € | 0,35 € | 1 334,12 € | 0,00 € |

---

## Proche du seuil d'usure

`04-seuil-usure` — Le taux nominal passe, l'assurance fait franchir le seuil d'usure de 0,13 point. L'interface doit montrer le mur ET son responsable.

### Ce que l'utilisateur a saisi

| Paramètre | Valeur |
|---|---|
| Prêt principal | 250 000,00 € à 4,35 % sur 300 mois |
| Assurance | 0,50 % sur capital initial, quotité 100 % |
| Garantie | hypothèque — 3 750,00 €, dont 0,00 € restitués au terme |
| Revenu net mensuel | 5 600,00 € |
| Prix du bien | 290 000,00 € |

### Bandeau d'indicateurs

| Indicateur | Valeur |
|---|---|
| Première mensualité | **1 472,55 €** |
| Mensualité maximale | **1 473,67 €** ← différente de la première |
| Capital emprunté | 250 000,00 € |
| Intérêts | 160 515,12 € |
| Assurance | 31 251,00 € |
| Frais initiaux | 5 250,00 € |
| Coût total du crédit | **197 016,12 €** |
| TAEG | 5,42 % |
| TAEA | 0,77 % |
| Nombre d'échéances | 300 |
| Mois de bascule capital/intérêts | 110 |

### Conformité

- **Usure** — **SEUIL DÉPASSÉ** · TAEG 5,42 % contre un plafond de 5,29 % (2026-T3) · marge -0,13 point(s)
- **HCSF** — conforme · taux d'effort 26,32 % contre un plafond de 35,00 % · durée max 300 mois · marge dérogatoire des banques 20,00 %

### Profil d'amortissement

- Dix premières échéances : 8 986,38 € d'intérêts, soit **61,03 %** de l'échéance
- Dix dernières échéances : 268,96 € d'intérêts, soit **1,83 %**
- Rapport d'antériorité : **33,4×**
- Les intérêts dominent dès la première échéance : **oui**
- Médiane des intérêts au mois 99, médiane du capital au mois 189 — **écart de 90 mois**

### Jalons et fenêtres — à ne jamais confondre

| Jalon : part d'intérêts sous… | Mois | Fenêtre : 1 € versé rapporte ≥… | Jusqu'au mois |
|---|---|---|---|
| 50 % | 88 | 100 % | 108 |
| 25 % | 215 | 50 % | 187 |
| 15 % | 253 | 25 % | 238 |
| 10 % | 270 | 10 % | 273 |
| 5 % | 286 |  |  |

Les jalons décrivent **où en est le crédit**. Les fenêtres désignent **où agir**. Elles pointent en sens opposés.

### Tableau annuel — 25 lignes, intégralement reproduites

| Année | Intérêts | Capital | Assurance | Échéances | Restant dû |
|---|---|---|---|---|---|
| 1 | 10 763,08 € | 5 657,48 € | 1 250,04 € | 17 670,60 € | 244 342,52 € |
| 2 | 10 512,03 € | 5 908,53 € | 1 250,04 € | 17 670,60 € | 238 433,99 € |
| 3 | 10 249,81 € | 6 170,75 € | 1 250,04 € | 17 670,60 € | 232 263,24 € |
| 4 | 9 975,97 € | 6 444,59 € | 1 250,04 € | 17 670,60 € | 225 818,65 € |
| 5 | 9 689,98 € | 6 730,58 € | 1 250,04 € | 17 670,60 € | 219 088,07 € |
| 6 | 9 391,27 € | 7 029,29 € | 1 250,04 € | 17 670,60 € | 212 058,78 € |
| 7 | 9 079,34 € | 7 341,22 € | 1 250,04 € | 17 670,60 € | 204 717,56 € |
| 8 | 8 753,56 € | 7 667,00 € | 1 250,04 € | 17 670,60 € | 197 050,56 € |
| 9 | 8 413,32 € | 8 007,24 € | 1 250,04 € | 17 670,60 € | 189 043,32 € |
| 10 | 8 057,96 € | 8 362,60 € | 1 250,04 € | 17 670,60 € | 180 680,72 € |
| 11 | 7 686,85 € | 8 733,71 € | 1 250,04 € | 17 670,60 € | 171 947,01 € |
| 12 | 7 299,27 € | 9 121,29 € | 1 250,04 € | 17 670,60 € | 162 825,72 € |
| 13 | 6 894,48 € | 9 526,08 € | 1 250,04 € | 17 670,60 € | 153 299,64 € |
| 14 | 6 471,72 € | 9 948,84 € | 1 250,04 € | 17 670,60 € | 143 350,80 € |
| 15 | 6 030,21 € | 10 390,35 € | 1 250,04 € | 17 670,60 € | 132 960,45 € |
| 16 | 5 569,13 € | 10 851,43 € | 1 250,04 € | 17 670,60 € | 122 109,02 € |
| 17 | 5 087,57 € | 11 332,99 € | 1 250,04 € | 17 670,60 € | 110 776,03 € |
| 18 | 4 584,62 € | 11 835,94 € | 1 250,04 € | 17 670,60 € | 98 940,09 € |
| 19 | 4 059,38 € | 12 361,18 € | 1 250,04 € | 17 670,60 € | 86 578,91 € |
| 20 | 3 510,82 € | 12 909,74 € | 1 250,04 € | 17 670,60 € | 73 669,17 € |
| 21 | 2 937,89 € | 13 482,67 € | 1 250,04 € | 17 670,60 € | 60 186,50 € |
| 22 | 2 339,57 € | 14 080,99 € | 1 250,04 € | 17 670,60 € | 46 105,51 € |
| 23 | 1 714,70 € | 14 705,86 € | 1 250,04 € | 17 670,60 € | 31 399,65 € |
| 24 | 1 062,08 € | 15 358,48 € | 1 250,04 € | 17 670,60 € | 16 041,17 € |
| 25 | 380,51 € | 16 041,17 € | 1 250,04 € | 17 671,72 € | 0,00 € |

### Tableau mensuel — 300 lignes

Extrait. Le tableau complet fait la longueur indiquée ci-dessus : c'est la contrainte de mise en page réelle.

| Mois | Intérêts | Capital | Assurance | Échéance | Restant dû |
|---|---|---|---|---|---|
| 1 | 906,25 € | 462,13 € | 104,17 € | 1 472,55 € | 249 537,87 € |
| 2 | 904,57 € | 463,81 € | 104,17 € | 1 472,55 € | 249 074,06 € |
| 3 | 902,89 € | 465,49 € | 104,17 € | 1 472,55 € | 248 608,57 € |
| … | … | … | … | … | … |
| 151 | 573,16 € | 795,22 € | 104,17 € | 1 472,55 € | 157 319,16 € |
| … | … | … | … | … | … |
| 298 | 14,78 € | 1 353,60 € | 104,17 € | 1 472,55 € | 2 723,06 € |
| 299 | 9,87 € | 1 358,51 € | 104,17 € | 1 472,55 € | 1 364,55 € |
| 300 | 4,95 € | 1 364,55 € | 104,17 € | 1 473,67 € | 0,00 € |

---
