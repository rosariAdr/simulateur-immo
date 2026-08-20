# Règles de calcul — référence vérifiée

> Compagnon de `parametres-2026.json`. Ce document décrit les **règles**, qui ne changent pas.
> Le fichier JSON contient les **valeurs**, qui changent chaque année.
> Recherche effectuée en août 2026. Les sources sont indiquées par règle.

---

## Ce qui distingue une règle d'un paramètre

Un test simple : si la loi de finances de l'an prochain peut modifier la valeur sans réécrire la fonction, c'est un paramètre.

| | Règle | Paramètre |
|---|---|---|
| Annuité constante | la formule | — |
| Indemnités de remboursement anticipé | prendre le minimum de deux plafonds | 3 % et 6 mois |
| Plus-value | abattement progressif par tranches d'années | les taux et les seuils d'exonération |
| Frais de notaire | assiette et composition | le taux départemental |

En pratique : `min(crd * p.iraPctCrd, remb * taux * p.iraMoisInterets / 12)` — la structure est du code, les deux nombres viennent du fichier de paramètres.

---

## 1. Mensualité et échéancier

### Annuité constante

```
r = tauxNominalAnnuel / 12
mensualite = C × r / (1 − (1 + r)^(−n))
```

Taux nul : `mensualite = C / n`.

Précautions : la part de capital ne dépasse jamais le capital restant dû, et la dernière échéance solde exactement le solde résiduel.

### Différé

Différé total : aucune échéance pendant `d` mois, puis amortissement sur `n − d`.
Différé partiel : seuls les intérêts sont payés pendant la période.

---

## 2. TAEG

*Source : Code de la consommation, art. R314-3, R314-4, R314-5 et annexe.*

Le TAEG est calculé à terme échu selon la **méthode d'équivalence actuarielle**, en intérêts composés. Il assure l'égalité entre les sommes prêtées et l'ensemble des versements dus.

**Ce qui entre dans le TAEG** — frais nécessaires pour obtenir le crédit ou pour l'obtenir aux conditions annoncées : frais de dossier, sommes versées aux intermédiaires, assurance et garanties obligatoires, tenue de compte imposée, évaluation du bien.

**Ce qui n'y entre pas** — les frais liés à l'acquisition de l'immeuble : droits de mutation, taxes, frais d'acte notarié. C'est l'erreur la plus fréquente.

**Détail technique à ne pas rater** : le texte définit un **mois normalisé de 365/12 jours, soit 30,41666 jours**. Un simulateur qui annualise par `(1+ρ)^12` obtient une bonne approximation mais pas exactement le TAEG réglementaire. Pour un outil pédagogique c'est acceptable, à condition de le dire. Le résultat s'exprime avec au moins une décimale.

**Implémentation** : résolution par dichotomie ou Newton sur le taux périodique, capital reçu net des frais initiaux d'un côté, échéances assurance comprise de l'autre.

### Taux d'usure

*Source : Banque de France, avis publié au Journal officiel. Art. L314-6 du Code de la consommation.*

Plafond légal du **TAEG**, pas du taux nominal. Calculé chaque trimestre à partir des taux moyens pratiqués, majorés d'un tiers. Un TAEG au-dessus du seuil rend le prêt impossible à accorder.

Catégories : taux fixe selon trois tranches de durée, taux variable, prêt relais. Valeurs dans le fichier de paramètres.

**Enjeu pédagogique fort** : un dossier peut être refusé non parce que le taux est trop élevé, mais parce que l'assurance emprunteur fait franchir le seuil. C'est un point que les emprunteurs découvrent trop tard.

---

## 3. Contraintes d'octroi

*Source : HCSF, normes contraignantes depuis janvier 2022, maintenues en mars 2026.*

- Taux d'effort maximal de 35 % des revenus nets, **assurance comprise**
- Durée maximale de 25 ans, portée à 27 ans en VEFA, construction, ou lorsque les travaux représentent au moins 10 % du montant emprunté
- Marge de flexibilité de 20 % de la production trimestrielle, dont 70 % réservés à la résidence principale et 30 % de cette enveloppe aux primo-accédants

**À enseigner** : le seuil de 35 % n'est pas un mur absolu, c'est une norme assortie d'une marge de dérogation dont les banques n'utilisent qu'une partie. En parallèle, les banques appliquent un critère de **reste à vivre** qui n'est pas normé et qui peut être plus contraignant que le ratio.

Pour l'investissement locatif, les loyers projetés sont couramment retenus à 70 %.

---

## 4. Frais d'acquisition

*Source : loi de finances 2025 ; tableau DGFiP ; relevés départementaux 2026.*

Les frais dits « de notaire » sont majoritairement des taxes. Composition : droits de mutation, émoluments du notaire, débours, contribution de sécurité immobilière.

**Ancien** — la loi de finances 2025 a autorisé les départements à relever leur part de 4,50 % à 5,00 %. La grande majorité l'a fait, portant le taux total à environ 6,32 % contre 5,81 % auparavant. Quelques départements conservent un taux réduit. La hausse est temporaire : **les sources consultées divergent sur sa date de fin, entre le 31 mars 2028 et le 30 avril 2028 — à vérifier.**

**Neuf** — pas de droits de mutation mais une taxe de publicité foncière de 0,715 %. Frais totaux de 2 à 3 %, contre 7 à 8,5 % dans l'ancien.

**Primo-accédants** — exclus de plein droit de la hausse de 0,5 point pour l'acquisition de leur résidence principale. Est primo-accédant celui qui n'a pas été propriétaire de sa résidence principale au cours des deux années précédant l'acte ; en indivision, la condition s'apprécie par acquéreur au prorata de sa quote-part. Certains départements peuvent en outre voter une réduction jusqu'à 50 % de la part départementale, mais peu l'ont fait.

**Deux leviers à signaler** : la valeur du mobilier peut être retirée de l'assiette sur inventaire justifié, dans la limite usuelle de 5 % du prix ; et l'article L444-2 du Code de commerce autorise une remise jusqu'à 20 % sur les émoluments portant sur la fraction du prix supérieure à 100 000 €.

**Conséquence pour le modèle** : le taux doit être un paramètre départemental, pas une constante. Un sélecteur de département est plus juste qu'un curseur générique.

---

## 5. Prêt à taux zéro

*Source : décret n° 2025-299 du 29 mars 2025 ; zonage ABC, arrêté du 5 septembre 2025 ; ANIL. Dispositif prolongé jusqu'au 31 décembre 2027.*

### Formule

```
tranche  = f(revenuFiscalReference / coefficientFamilial, zone)
assiette = min(coutOperation, plafondOperation[zone][nbPersonnes])
montant  = assiette × quotite[tranche][typeLogement]
```

### Structure

Quatre tranches. Quotités de 10 à 50 % selon la tranche et le type de logement — le collectif neuf est favorisé, la maison individuelle neuve plafonnée plus bas. Différés de 0, 2, 8 ou 10 ans selon la tranche. Durées totales de 10 à 25 ans.

**La quotité ne dépend pas de la zone.** La zone influe sur le plafond d'opération et sur les seuils de tranche. C'est contre-intuitif et mal compris.

L'ancien avec travaux n'est éligible qu'en zones B2 et C, sous condition de travaux d'au moins 25 % du coût total et d'atteinte de la classe D au diagnostic après travaux.

**Point pratique à enseigner** : pendant le différé on ne rembourse rien sur le PTZ, mais la banque **lisse** généralement l'ensemble pour produire une mensualité constante. Un simulateur qui affiche une marche d'escalier à la fin du différé décrit le prêt, pas ce que l'emprunteur paiera. Prévoir les deux affichages.

Les barèmes détaillés par zone et composition de foyer sont volumineux et disponibles en source ouverte sur data.gouv.fr. Ne pas les saisir à la main.

---

## 6. Remboursement anticipé

*Source : Code de la consommation, art. L313-47, L313-48 et R313-25.*

### Droit

L'emprunteur peut toujours rembourser par anticipation, en partie ou en totalité. La banque ne peut pas s'y opposer.

**Nuance importante** : le contrat *peut* interdire les remboursements inférieurs ou égaux à **10 % du montant initial du prêt** — sauf s'il s'agit du solde. C'est une faculté contractuelle très répandue, pas une obligation légale. Attention à une confusion fréquente : le seuil porte sur le montant *initial*, pas sur le capital restant dû.

### Indemnités

```
IRA = min(capitalRembourse × tauxMoyen / 2, capitalRestantDuAvant × 3 %)
```

Le texte : l'indemnité ne peut excéder la valeur d'un semestre d'intérêt sur le capital remboursé au taux moyen du prêt, sans pouvoir dépasser 3 % du capital restant dû avant le remboursement.

**Observation utile** : pour les prêts à taux bas, c'est presque toujours le plafond des six mois d'intérêts qui mord. Pour les prêts récents à 3,5-4 %, les deux plafonds se rapprochent.

Pour les prêts à taux variable, des intérêts compensateurs peuvent s'ajouter.

### Exonérations légales

Trois cas, applicables **de plein droit** même si le contrat ne les mentionne pas : vente du bien faisant suite à un changement du lieu d'activité professionnelle de l'emprunteur ou de son conjoint, cessation forcée de l'activité professionnelle, décès de l'emprunteur ou de son conjoint.

### Négociation

Deux moments : à la souscription, le plus favorable, et au moment du remboursement. Au-delà de la suppression totale, on obtient couramment un plafond réduit ou une franchise après quelques années.

---

## 7. Assurance emprunteur

*Source : Code de la consommation art. L313-8 et suivants ; loi n° 2022-270 du 28 février 2022.*

### TAEA

Indicateur obligatoire isolant la part de l'assurance dans le coût du crédit. C'est le seul chiffre qui permette de comparer deux offres dont les modes de calcul diffèrent.

### Deux bases

Capital initial : cotisation constante. Capital restant dû : cotisation dégressive. **À taux affiché identique, l'écart de coût total atteint 30 à 45 % sur la durée.**

Les contrats groupe sont majoritairement sur capital initial, les délégations souvent sur capital restant dû — c'est une pratique de marché, pas une règle. Le mode de cotisation et la base de calcul sont en principe indépendants.

### Loi Lemoine

Résiliation à tout moment, sans préavis, sans motif, sans frais. La banque ne peut refuser que sur défaut d'équivalence de garanties, objectivée par une grille de critères.

Suppression du questionnaire de santé pour les prêts dont la part assurée n'excède pas 200 000 € par assuré et dont le terme survient avant le 60e anniversaire.

### Pourquoi c'est le levier le plus rentable

L'assurance peut représenter jusqu'à 30 % du coût du crédit pour un profil jeune. Le contrat groupe mutualise les risques, ce qui pénalise structurellement les profils jeunes et en bonne santé. Et contrairement à un rachat de crédit, la substitution n'a **aucun délai de retour** : pas d'indemnités, pas de nouvelle garantie, pas de frais.

---

## 8. Plus-value immobilière

*Source : CGI art. 150 U, 150 VC, 200 B ; BOI-RFPI-PVI.*

### Résidence principale

Exonération totale, sans condition de durée de détention, sous réserve que la vente intervienne dans un délai normal après le déménagement. Un amendement au budget 2026 imposant une occupation minimale de cinq ans n'a pas été retenu.

### Régime général

```
pvBrute = prixCession − fraisCession − prixAcquisitionMajore
```

Le prix d'acquisition peut être majoré des frais d'acquisition, au réel ou par forfait de 7,5 %, et des travaux, au réel ou par forfait de 15 % si la détention dépasse cinq ans.

### Deux barèmes d'abattement distincts

**Impôt sur le revenu**, taux de 19 % : rien avant la 6e année, puis 6 % par an de la 6e à la 21e, 4 % la 22e. Exonération totale à 22 ans.

**Prélèvements sociaux**, taux de 17,2 % : rien avant la 6e année, puis 1,65 % par an de la 6e à la 21e, 1,60 % la 22e, 9 % par an de la 23e à la 30e. Exonération totale à 30 ans.

L'amendement qui aurait ramené l'exonération à 17 ans n'a pas été retenu dans la loi de finances 2026.

### Surtaxe

Au-delà de 50 000 € de plus-value nette imposable, surtaxe progressive de 2 à 6 %. **Elle s'applique sur le montant total, pas seulement sur la fraction excédentaire**, avec un mécanisme de lissage pour atténuer l'effet de seuil.

### Réintégration des amortissements LMNP

*Source : loi de finances 2025, applicable depuis février 2025.*

Les amortissements déduits au régime réel viennent diminuer le prix d'acquisition et augmentent donc la plus-value imposable.

**Le point le plus important, et celui que mon prototype modélisait mal** : les amortissements réintégrés ne bénéficient d'**aucun abattement pour durée de détention**. Ils restent imposés même après 22 ou 30 ans. Seule la plus-value brute bénéficie des abattements progressifs.

Conséquence sur le modèle : la base imposable se scinde en deux composantes traitées différemment. L'effet est maximal sur les détentions courtes — les sources consultées évoquent un doublement de l'imposition sur une détention de douze ans.

Les résidences services conservent l'ancien régime.

---

## 9. Régimes locatifs

*Source : loi Le Meur du 19 novembre 2024 ; loi de finances 2025 ; CGI art. 50-0.*

| Régime | Seuil | Abattement |
|---|---|---|
| Meublé longue durée | 77 700 € revenus 2025, 83 600 € revenus 2026 | 50 % |
| Meublé de tourisme classé | idem | 50 % — contre 71 % avant réforme |
| Meublé de tourisme non classé | **15 000 €** | **30 %** — contre 50 % avant réforme |
| Chambres d'hôtes | 188 700 € | 71 % |

Abattement minimum de 305 €. Au-delà du seuil, bascule obligatoire au régime réel.

### Ce que la réforme a changé

Le meublé de tourisme non classé est le grand perdant. Un logement générant plus de 15 000 € de recettes — seuil facilement franchi par un seul bien bien situé — bascule d'office au réel.

**Le classement Atout France devient un levier économique, plus un argument marketing** : pour 150 à 300 € de frais, on multiplie le plafond par cinq et l'abattement passe de 30 % à 50 %. Validité de cinq ans.

Paradoxalement, la bascule forcée au réel peut être favorable : elle ouvre la déduction des intérêts d'emprunt, des charges et de l'amortissement, qui annule souvent la base imposable.

### Au régime réel

Location nue : les **intérêts d'emprunt sont déductibles**. C'est ce qui change tout dans les premières années.
Location meublée : intérêts, charges **et amortissement** du bien et du mobilier. Environ 2 à 3 % par an sur la structure, le terrain n'étant pas amortissable — retenir environ 80 % de la valeur comme base.

Seuil de bascule vers le statut professionnel : 23 000 € de recettes annuelles **et** plus de 50 % des revenus du foyer.

---

## 10. Non-résidents

*Source : CGI ; arrêt CJUE de Ruyter ; réforme 2019.*

**Impôt sur le revenu** : taux minimum de 20 % sur les revenus de source française jusqu'à un seuil de revenu net imposable, puis 30 % au-delà. Le seuil est révisé chaque année.

**Prélèvements sociaux** : 7,5 % pour les personnes affiliées à un régime obligatoire de sécurité sociale de l'EEE, de la Suisse ou du Royaume-Uni ; 17,2 % pour les autres. La justification passe par un formulaire spécifique auprès de l'administration.

Taux globaux indicatifs : environ 27,5 % pour un affilié EEE, environ 37,2 % hors UE.

**Réserve sérieuse** : les conventions fiscales bilatérales peuvent modifier ces règles. Le produit doit présenter ce module comme un ordre de grandeur et renvoyer explicitement vers un professionnel.

---

## 11. Point utile pour le module « pierre ou marchés »

*Source : loi de financement de la sécurité sociale 2026.*

La hausse des prélèvements sociaux à 18,6 % introduite en 2026 concerne les **placements financiers** — dividendes, plus-values mobilières, revenus de comptes-titres. Elle ne concerne **pas** les revenus fonciers, les plus-values immobilières, l'assurance-vie ni l'épargne réglementée.

Ce détail modifie l'arbitrage entre pierre et papier au détriment du compte-titres, et renforce l'intérêt relatif du plan d'épargne en actions et de l'assurance-vie. Il doit être paramétré finement dans le module.

---

## 12. Ce qui reste à vérifier

Points non confirmés ou contradictoires dans les sources consultées :

- **Micro-foncier** : seuil et abattement non retrouvés dans la recherche. À vérifier à la source.
- **Date de fin de la hausse des droits de mutation** : les sources divergent entre le 31 mars et le 30 avril 2028.
- **Liste des départements à taux réduit** : les listes ne concordent pas entre elles.
- **Barèmes détaillés du prêt à taux zéro** : à récupérer sur data.gouv.fr plutôt qu'à ressaisir.
- **Barèmes des organismes de caution** : ordres de grandeur de marché uniquement, pas de source réglementaire.
- **Barème exact de la surtaxe sur plus-value** : le mécanisme de lissage n'a pas été retrouvé dans le détail.

Sources de référence à privilégier pour cette vérification : legifrance.gouv.fr, bofip.impots.gouv.fr, service-public.fr, anil.org, banque-france.fr, data.gouv.fr.

**Aucune de ces valeurs ne devrait être mise en ligne sans avoir été confrontée à une source officielle.** Une recherche web, même soignée, reste une source secondaire.
