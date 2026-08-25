# FIS-010 — vérification à la source des régimes fiscaux locatifs

*Recherche menée le 25 août 2026, pour la version v0.3.1 « Louer plutôt que vendre »
(`ENG-013`, `ENG-015`). La spécification (`docs/03-spec-domaine.md` §2) signalait
elle-même ce terrain : « les abattements et seuils des régimes micro, notamment pour
les meublés de tourisme, ont été modifiés récemment et doivent être vérifiés ».*

Cinq points vérifiés. Trois confirment la recherche secondaire de
`docs/04-regles-calcul.md`, deux la **corrigent** — dont une affirmation qui aurait
faussé le moteur de plus-value si elle avait été codée telle quelle.

---

## 1. Micro-foncier — le point que la recherche n'avait « pas retrouvé »

**Valeurs retenues : seuil 15 000 €, abattement 30 %.** Confiance **élevée** —
texte de loi consulté directement.

L'[article 32 du CGI](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048847610),
version en vigueur au **21 février 2026** (modifié par la loi n° 2026-103 du
19 février 2026 de finances pour 2026) : « le revenu imposable correspondant est fixé
à une somme égale au montant de ce revenu brut diminué d'un abattement de 30 % »,
lorsque le revenu brut foncier annuel du foyer n'excède pas **15 000 €**.

Le seuil n'est **pas indexé** — il est écrit en dur dans l'article, sans clause
d'actualisation.

**Exclusions à connaître pour l'interface** : le régime est fermé, entre autres, aux
propriétaires de biens sous dispositif d'amortissement — ce qui inclut le nouveau
statut du bailleur privé créé par la LF 2026 (voir point 5). Un bien « ordinaire »
loué nu y a droit ; c'est le cas que le module modélise.

`docs/04-regles-calcul.md` §12 listait ce point comme non retrouvé : résolu.

## 2. Micro-BIC — les quatre seuils de l'article 50-0, millésime 2026

**Valeurs retenues (revenus 2026) : longue durée et meublé de tourisme classé
83 600 € / 50 % ; meublé de tourisme non classé 15 000 € / 30 % ; abattement
minimum 305 €.** Confiance **élevée** — texte consulté, recoupé par service-public.

L'[article 50-0 du CGI](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048844097)
dans sa version en vigueur au **1er juillet 2026** — modifiée en dernier par le
**décret n° 2026-562 du 29 juin 2026**, qui applique l'actualisation triennale des
seuils — porte :

| Catégorie | Contenu | Seuil | Abattement |
|---|---|---|---|
| 1° | Ventes et fourniture de logement, **à l'exclusion de la location directe ou indirecte de locaux d'habitation meublés** | 203 100 € | 71 % |
| 1° bis | Meublés de tourisme (art. L. 324-1-1, I du code du tourisme) non rangés ailleurs — les **non classés** | 15 000 € | 30 % |
| 2° | Les autres entreprises — dont la **location meublée de longue durée** et les **meublés de tourisme classés** | 83 600 € | 50 % |

Points de texte qui comptent :

- La clause d'actualisation triennale **exclut expressément le seuil des meublés**
  (le 1° bis) : le 15 000 € ne bouge pas avec l'inflation, comme celui du
  micro-foncier sur lequel la loi n° 2024-1039 du 19 novembre 2024 l'a aligné.
- L'abattement minimum est de **305 €**.
- La [fiche service-public F32744](https://www.service-public.gouv.fr/particuliers/vosdroits/F32744),
  vérifiée le **15 avril 2026**, donne la même table pour les revenus 2026 —
  83 600 € / 50 % (longue durée, classés), 15 000 € / 30 % (non classés) — et
  confirme 77 700 € pour les revenus 2025.

### Correction à `docs/04-regles-calcul.md` §9 — les chambres d'hôtes

La table du dépôt donnait « chambres d'hôtes : 188 700 € / 71 % ». C'est l'état
**antérieur** à la réforme. Le Gouvernement a confirmé en mai 2025 que les chambres
d'hôtes relèvent du même régime que les meublés classés — 77 700 € / 50 % pour les
revenus 2025, donc 83 600 € / 50 % pour 2026 —, et la fiche service-public de 2026
les range explicitement avec les classés. Le sujet a été controversé en 2024-2025 ;
il est **hors périmètre du module** (le scénario « louer plutôt que vendre » ne
modélise pas la para-hôtellerie), la correction est donc documentaire.

## 3. Réintégration des amortissements — la croyance fausse arrêtée avant le code

**Mécanisme retenu : le prix d'acquisition est minoré des amortissements déduits ;
la plus-value ainsi majorée bénéficie des abattements pour durée de détention de
droit commun.** Confiance **élevée** sur le mécanisme, **moyenne** sur sa lecture
fine en attendant le BOFiP annoncé.

`docs/04-regles-calcul.md` §8 affirmait : « les amortissements réintégrés ne
bénéficient d'**aucun abattement** pour durée de détention […] la base imposable se
scinde en deux composantes traitées différemment ». **C'est faux dans les deux
textes consultés :**

- L'[article 150 VB du CGI](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006302777)
  place la réintégration au **III** : le prix d'acquisition « est minoré du montant
  des amortissements admis en déduction ». Une minoration du prix d'acquisition
  produit **une seule** plus-value brute, qui traverse ensuite l'art. 150 VC
  (abattements) comme n'importe quelle autre — le texte n'organise aucune scission
  d'assiette.
- La réponse ministérielle à la question n° 10097 (AN, 17e législature, réponse du
  **24 mars 2026**) le dit expressément : « **sous réserve de l'application des
  abattements pour durée de détention**, l'ensemble des amortissements déduits […]
  pendant la période de location du bien cédé seront pris en compte dans le calcul
  de la plus-value ». Elle confirme aussi que les amortissements **antérieurs à
  2025** sont visés, pour toute cession postérieure au 15 février 2025, et annonce
  des précisions au BOFiP.

Conséquence pour le moteur : `ENG-013` branche les amortissements cumulés en
**minoration du prix d'acquisition** dans la description de cession existante — pas
de deuxième assiette, pas de barème parallèle. L'effet reste puissant sur les
détentions courtes et s'éteint avec les abattements sur les longues, ce qui est
exactement l'inverse de ce que la note du dépôt laissait attendre.

Exceptions du III, à déclarer non modélisées : résidences étudiantes, établissements
pour personnes âgées ou handicapées, soins de longue durée.

## 4. Prélèvements sociaux — la nue et la meublée ne paient pas le même taux

**Valeurs retenues : location nue 17,2 % ; location meublée non professionnelle
18,6 %, dès les revenus 2025.** Confiance **élevée** — texte consulté, recoupé par
plusieurs commentateurs concordants.

Le [IV de l'article L136-8 du CSS](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042683546)
déroge à la CSG de droit commun (10,6 %) pour une liste **limitative** : les revenus
du **a** du I de l'article L136-6 — les revenus fonciers —, les plus-values
immobilières de l'article L136-7, et certains intérêts réglementés. Les bénéfices
industriels et commerciaux non professionnels — la location meublée relève du **f**
du même I — **n'y figurent pas** : ils restent au droit commun, soit 18,6 %.

Les deux taux sont **déjà dans `params.ts`** (`socialLevies.patrimony` à 18,6 %,
`socialLevies.realEstate` à 17,2 %, écrits par `FIS-007`) : `ENG-013` n'écrit aucun
taux nouveau, il **choisit** le bon par régime. Une location nue à 17,2 % et une
meublée à 18,6 % : la différence est contre-intuitive et fait partie de ce que le
module doit enseigner.

`docs/04-regles-calcul.md` §11 disait la hausse à 18,6 % sans effet sur l'immobilier :
vrai pour le foncier et les plus-values, **incomplet** pour la meublée.

## 5. Ce qui borde le périmètre, avec sa source

- **Courte durée, seuil d'affiliation.** Au-delà de **23 000 €** de recettes
  annuelles en location de courte durée (clientèle « y effectuant un séjour à la
  journée, à la semaine ou au mois »), l'affiliation à la sécurité sociale des
  indépendants remplace les prélèvements sociaux —
  [art. L611-1, 6° du CSS](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042683852),
  par renvoi au seuil de l'art. 155, IV, 2, 1° du CGI. `ENG-015` doit **signaler**
  le franchissement, pas le modéliser.
- **Statut du bailleur privé (LF 2026, art. 47).** La loi n° 2026-103 crée un
  amortissement en location **nue** (3 à 5,5 % par an, art. 31, i et j du CGI) pour
  des acquisitions neuves ou réhabilitées entre le 21 février 2026 et le
  31 décembre 2028 — réintégré lui aussi au 150 VB à la revente. Dispositif
  conditionné, **hors périmètre** de v0.3.1 ; à déclarer non modélisé.
- **Déficit foncier (réel, location nue).** Imputation sur le revenu global
  plafonnée à 10 700 € hors intérêts d'emprunt, le surplus et les intérêts sur les
  revenus fonciers des dix années suivantes (art. 156, I, 3° du CGI). Le parti de
  modélisation — reporter ou déclarer non modélisé — appartient à `ENG-013` ; s'il
  modélise, la valeur entre dans `params.ts` avec ce même article. Non vérifié plus
  finement à ce stade.
- **Amortissement au réel meublé.** Le taux annuel (2 à 3 % sur la structure, le
  terrain non amortissable) n'est fixé par **aucun texte** : c'est une pratique
  comptable par composants. Il relève donc de `src/core/assumptions/market.ts`,
  jamais de `params.ts` — même frontière qu'ADR-008.

---

## Ce qui entre dans `params.ts`

Sur le modèle de `FIS-007` : des valeurs, aucune logique, chaque entrée datée et
sourcée. `params.ts` est gelé (ADR-004) ; l'ajout est **pur** — aucune entrée
existante modifiée — et porte sa raison dans le message de fusion.

| Entrée | Valeur | Source |
|---|---|---|
| `rentalIncome.microFoncier` | 15 000 € / 30 % | CGI art. 32, vigueur 21/02/2026 |
| `rentalIncome.microBic` longue durée | 83 600 € / 50 % | CGI art. 50-0 (2°), vigueur 01/07/2026 |
| `rentalIncome.microBic` tourisme classé | 83 600 € / 50 % | idem |
| `rentalIncome.microBic` tourisme non classé | 15 000 € / 30 % | CGI art. 50-0 (1° bis), loi n° 2024-1039 |
| `rentalIncome.microBic` abattement minimum | 305 € | CGI art. 50-0 |
| `rentalIncome.shortTermSocialAffiliationThresholdCents` | 23 000 € | CSS art. L611-1, 6° |

Le choix du taux de prélèvements sociaux par régime (17,2 / 18,6) ne produit
**aucune valeur nouvelle** : il se code dans `ENG-013` en consommant
`socialLevies`, et le commentaire de `rentalIncome` en porte la règle et sa source.
