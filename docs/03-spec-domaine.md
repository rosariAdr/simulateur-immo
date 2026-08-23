# Spécification du domaine de calcul

> Document de référence pour l'implémentation de `src/core/`.
> Les valeurs numériques réglementaires citées ici sont indicatives et **doivent être vérifiées à la source**
> avant toute mise en ligne. Elles vivent dans `core/fiscal/`, versionnées par millésime.

---

## 1. Crédit

### Annuité constante

Pour un capital `C`, un taux annuel nominal `t` et une durée `n` mois, avec `r = t / 12` :

```
mensualité = C × r / (1 − (1 + r)^(−n))
```

Cas particulier `r = 0` — prêt à taux zéro : `mensualité = C / n`.

### Échéancier

À chaque mois, dans cet ordre : les intérêts se calculent sur le capital restant dû d'ouverture, la part de capital est le solde de la mensualité, le capital restant dû diminue d'autant.

Deux précautions d'implémentation :
- la part de capital ne peut jamais dépasser le capital restant dû
- la dernière échéance solde exactement le capital, quitte à être ajustée

### Différé

Un différé total suspend toute échéance pendant `d` mois, puis l'amortissement se calcule sur `n − d` mois. Le prêt à taux zéro fonctionne ainsi. Un différé partiel ne fait payer que les intérêts pendant la période — non traité en v1.

### Prêts multiples

Chaque prêt possède son propre échéancier. L'agrégation se fait mois par mois. La longueur de l'échéancier consolidé est celle du prêt le plus long.

**Conséquence à ne pas manquer** : avec un prêt à taux zéro en différé, la mensualité totale augmente à la fin du différé. L'interface doit afficher la mensualité maximale, pas la mensualité initiale.

### Assurance emprunteur

Deux bases de calcul, dont l'écart est un enseignement à part entière.

```
base capital initial     → prime = capital initial × taux / 12 × quotité
base capital restant dû  → prime = capital restant dû du mois × taux / 12 × quotité
```

La quotité peut dépasser 100 % : deux emprunteurs couverts chacun intégralement donnent 200 %.

### Garantie

| Type | Ordre de grandeur | Restitution | Particularité |
|---|---|---|---|
| Caution d'un organisme | environ 1 à 1,5 % du capital | une part du fonds mutuel est restituée au terme | pas de formalité notariée |
| Hypothèque ou privilège de prêteur | environ 1,5 % | aucune | mainlevée à payer en cas de revente avant terme |
| Nantissement | faible | sans objet | suppose un actif financier donné en garantie |

### TAEG

Le TAEG est le taux qui annule la valeur actuelle nette des flux. Flux d'entrée : capital emprunté diminué des frais de dossier et du coût de la garantie. Flux de sortie : les échéances, assurance comprise.

Résolution par dichotomie sur le taux mensuel `ρ`, puis annualisation :

```
TAEG = (1 + ρ)^12 − 1
```

**Ce que le TAEG ne comprend pas** : les frais de notaire, qui relèvent de l'acquisition et non du crédit. Erreur fréquente.

### Taux d'endettement

```
(mensualité maximale, assurance comprise + autres charges de crédit) / revenus nets mensuels
```

Le seuil de référence appliqué par les établissements est de 35 %, avec une durée maximale usuelle de 25 ans et une marge de dérogation. **À vérifier : ce cadre peut évoluer.**

---

## 2. Acheter ou louer

### Niveau simple — coût mensuel comparé

Côté propriétaire : mensualité, taxe foncière, charges de copropriété non récupérables, provision pour travaux exprimée en pourcentage de la valeur du bien, assurance habitation.

Côté locataire : loyer indexé annuellement, charges locatives, assurance habitation.

Sortie : deux courbes annuelles et l'année de croisement.

**Limite à énoncer explicitement dans l'interface** : cette comparaison est faussée, car la part de capital de la mensualité n'est pas une dépense. La vue « fonds perdus » corrige en ne retenant que les intérêts, l'assurance et les charges.

### Niveau approfondi — patrimoine net à horizon

Le locataire de référence place l'apport, puis chaque mois l'écart entre le coût de propriétaire et son loyer, à un rendement net d'impôt. C'est la seule comparaison honnête : elle rend le coût d'opportunité explicite.

Trois scénarios de sortie.

**Vente à l'horizon.** Valeur appréciée, moins les frais d'agence, le capital restant dû, les indemnités de remboursement anticipé et la mainlevée éventuelle, plus la restitution du fonds de garantie.
Point clé : la plus-value de résidence principale est exonérée sans condition de durée de détention, à condition que la vente intervienne dans un délai normal après le déménagement.

**Location longue durée.** Loyers nets de vacance et de gestion, moins les charges, moins la mensualité toujours due, moins l'impôt selon le régime. Revente en fin de période avec plus-value désormais imposable.

**Location courte durée.** Revenus fonction du tarif et du taux d'occupation, moins la commission de plateforme et les honoraires de conciergerie, moins les charges d'exploitation, moins l'ameublement initial.

### Régimes fiscaux locatifs

| Régime | Base imposable |
|---|---|
| Micro-foncier | loyers bruts, abattement forfaitaire |
| Réel, location nue | loyers moins charges **et intérêts d'emprunt** |
| Micro-BIC, meublé | loyers bruts, abattement forfaitaire |
| Réel, meublé | loyers moins charges, intérêts **et amortissement du bien** |

Deux points que le produit doit enseigner :
- au réel, les intérêts d'emprunt sont déductibles, ce qui change radicalement le rendement net des premières années
- au réel meublé, l'amortissement annule souvent la base imposable, mais s'ajoute à la plus-value lors de la revente

**Les abattements et seuils des régimes micro, notamment pour les meublés de tourisme, ont été modifiés récemment et doivent être vérifiés.**

### Plus-value hors résidence principale

Prix de cession diminué des frais, moins un prix d'acquisition majoré des frais réels et des travaux — ou de forfaits sous conditions de durée de détention.

Deux barèmes d'abattement distincts s'appliquent, l'un pour l'impôt sur le revenu et l'autre pour les prélèvements sociaux, avec des durées d'exonération totale différentes. Une surtaxe s'applique au-delà d'un seuil de plus-value imposable.

**Non-résidents** : le taux des prélèvements sociaux dépend du régime de sécurité sociale d'affiliation, un taux réduit existant pour les personnes affiliées dans l'Espace économique européen ou en Suisse. Un taux minimum d'imposition s'applique aux revenus de source française. **Ce point est complexe, dépend des conventions fiscales bilatérales, et doit être vérifié cas par cas.**

---

## 3. Remboursements anticipés

### Indemnités

Le plafond légal est le plus faible de deux montants : trois pour cent du capital restant dû avant remboursement, ou six mois d'intérêts sur la somme remboursée au taux moyen du prêt.

Exonérations prévues par la loi : vente consécutive à un changement de lieu d'activité professionnelle, cessation forcée d'activité, décès de l'emprunteur ou de son conjoint.

Ces indemnités sont **négociables à zéro au moment de la souscription**. Le produit doit le rappeler à cet endroit précis, car c'est le seul moment où l'utilisateur peut agir.

### Deux effets possibles

Réduire la durée conserve la mensualité et raccourcit le prêt : c'est le choix qui économise le plus d'intérêts.
Réduire la mensualité conserve la durée et recalcule l'annuité sur le capital restant : cela libère de la trésorerie mais économise beaucoup moins.

### Les trois indicateurs en cascade

C'est le cœur pédagogique du module. Ils doivent être affichés ensemble, dans cet ordre.

1. **Intérêts économisés** — écart de total d'intérêts entre les deux échéanciers. C'est le chiffre flatteur.
2. **Économie nette des indemnités** — le précédent moins les indemnités payées.
3. **Gain net réel** — écart de patrimoine à horizon entre les deux mondes, à effort d'épargne identique.

Le troisième exige de simuler deux mondes complets. L'effort mensuel total est identique dans les deux : toute somme non versée à la banque part sur le placement, et lorsque la mensualité baisse ou que le prêt se termine plus tôt, la différence rejoint l'épargne. **Sans cette hypothèse, la comparaison est truquée en faveur du remboursement anticipé.**

### L'arbitrage fondamental

Un remboursement anticipé rapporte l'équivalent d'un placement sans risque au taux du crédit. Il crée de la valeur si le taux du crédit dépasse le rendement net du placement alternatif, et en détruit dans le cas inverse.

Deux corollaires que le produit doit énoncer :

- **Un prêt à taux zéro ne se rembourse jamais par anticipation.** Un capital sans intérêt ne coûte rien à conserver.
- **Sur un horizon court avec revente, le remboursement anticipé est presque neutre.** Le capital versé revient intégralement à la vente ; seul l'intérêt évité pendant les mois restants constitue un gain.

### Suggestion automatique

Pour l'objectif « maximiser les intérêts économisés » sous contrainte d'un flux d'épargne, la stratégie optimale est gloutonne : verser le maximum disponible le plus tôt possible, en réduisant la durée. Chaque euro remboursé tôt évite davantage d'intérêts.

Contraintes contractuelles à respecter : montant minimum par opération, souvent dix pour cent du capital initial, et fréquence généralement limitée à une opération par an.

---

## 4. Pierre ou marchés *(module signature)*

### Le principe de comparaison

**À effort d'épargne mensuel identique.** C'est la seule base honnête. L'acquéreur consacre son apport puis sa mensualité au logement ; l'investisseur place le même apport puis le même montant mensuel, en payant un loyer.

### Ce qui doit être rendu visible

**Le levier.** L'acquéreur s'expose à la valeur totale du bien avec un apport partiel. L'investisseur en actions n'a pas cet accès. C'est le principal avantage structurel de l'immobilier, et le produit doit le nommer.

**L'asymétrie de frais.** Environ huit pour cent à l'entrée et cinq à la sortie d'un côté, des frais quasi nuls de l'autre. Sur horizon court, cet écart domine tout le reste.

**L'asymétrie fiscale.** Exonération de plus-value pour la résidence principale d'un côté ; de l'autre, une fiscalité qui dépend de l'enveloppe — plan d'épargne en actions après cinq ans, assurance-vie après huit ans, ou compte-titres au prélèvement forfaitaire.

**L'asymétrie de risque.** Un bien unique dans une seule ville contre un portefeuille diversifié. Les prix immobiliers paraissent stables parce qu'ils ne sont pas cotés quotidiennement, non parce qu'ils le sont.

### Sortie en distribution, pas en valeur unique

C'est la traduction de la thèse du produit en méthode de calcul.

Le rendement des marchés est saisi comme une espérance assortie d'une volatilité, et non comme un taux fixe. Une simulation produit une distribution de résultats. On affiche des quantiles, jamais une valeur unique.

**Le même traitement doit s'appliquer à l'immobilier.** Afficher une fourchette pour les marchés et une valeur unique pour la pierre reproduirait exactement le biais que le produit dénonce.

L'indicateur à mettre en avant n'est pas l'écart moyen mais la **probabilité que chaque camp l'emporte**, à horizon donné. Une conclusion du type « dans cette configuration, l'immobilier l'emporte dans une majorité de trajectoires, mais avec une dispersion moindre » est plus juste et plus utile qu'un écart chiffré au millier d'euros près.

Précaution : les hypothèses de rendement et de volatilité sont saisies par l'utilisateur. Le produit ne doit jamais présenter ses valeurs par défaut comme une prévision.

---

## 5. Invariants à tester

À vérifier sur entrées aléatoires avec `fast-check` :

- la somme des parts de capital d'un échéancier égale le capital emprunté
- le capital restant dû est décroissant et atteint exactement zéro au terme
- un remboursement anticipé ne peut jamais augmenter le total des intérêts
- le TAEG est supérieur ou égal au taux nominal dès qu'il existe des frais
- réduire la durée économise toujours au moins autant d'intérêts que réduire la mensualité, pour un même versement
- un versement anticipé sur un prêt à taux zéro n'économise rien
- les indemnités respectent les deux plafonds simultanément
- pour un taux nul, la mensualité vaut exactement le capital divisé par la durée

Cas limites à couvrir explicitement : taux nul, durée d'un mois, apport supérieur au coût total, différé égal ou supérieur à la durée, remboursement supérieur au capital restant dû, revenus nuls.

### Module 2 — acheter ou louer

Cette liste ne s'arrêtait qu'au crédit et aux remboursements anticipés. Les quatre
modules de la phase 3 ont été écrits avec leurs invariants, mais ceux-ci ne vivaient
que dans les fichiers de tests et dans les ADR — introuvables pour qui lit la
spécification. Signalé par l'agent qui a écrit le portefeuille du locataire.

**Coûts de détention** (`ENG-010`)

- les fonds perdus sont toujours inférieurs ou égaux au décaissement, et leur écart
  vaut exactement la part de capital de l'échéance
- les deux côtés s'indexent : n'indexer que le loyer déplace l'année de croisement
  dans un sens et un seul
- un loyer nul ne rend **pas** un croisement immédiat mais **aucun** croisement : un
  locataire gratuit est imbattable tant que le propriétaire dépense quoi que ce soit

**Portefeuille du locataire** (`ENG-011`)

- capital versé + gains = valeur, **au centime**, à chaque échéance
- à rendement nul, la valeur égale le capital versé et les gains sont nuls
- la valeur ne descend jamais sous zéro : un retrait qui dépasse le solde est tronqué
  et le manque est rendu explicite, jamais dissous en dette implicite
- le rendement mensuel est l'équivalent actuariel et non le taux annuel divisé par
  douze — la convention proportionnelle surestime de 2,08 % le capital final sur
  300 mois, précisément dans le sens qui flatte les marchés face à la pierre

**Vente à l'horizon** (`ENG-012`)

- le produit net est exactement la somme algébrique de ses postes
- **il peut être négatif**, et c'est une information, pas une erreur
- la résidence principale occupée n'est jamais imposée, quelle que soit la durée de
  détention

**Plus-value hors résidence principale** (`ENG-014`, `ENG-016`)

- **deux abattements, deux assiettes**, jamais une « plus-value imposable » unique :
  l'exonération est totale à 22 ans pour l'impôt sur le revenu, à 30 ans pour les
  prélèvements sociaux
- l'assiette sociale est donc supérieure ou égale à l'assiette fiscale, et strictement
  supérieure entre la 6ᵉ et la 29ᵉ année
- **les deux assiettes sont des nombres entiers d'euros**, arrondis après abattement
  (CGI, art. 1649 undecies ; CSS, art. L136-7, VI, 1 pour les prélèvements sociaux).
  La décomposition de l'abattement, elle, reste au centime : `montant + base` vaut
  toujours la plus-value brute. Voir ADR-018
- la surtaxe est assise sur l'assiette de l'**impôt sur le revenu** : elle s'éteint à
  22 ans, pas à 30, et son seuil de 50 000 € s'apprécie sur l'assiette **arrondie**,
  après abattement
- son barème comporte des décotes : vérifier sa **continuité** autour de chaque seuil,
  pas seulement la valeur de ses paliers. Les frontières du barème n'ont pas de « fente » :
  libellé en euros entiers, il couvre toutes les assiettes possibles, puisqu'une assiette
  est entière
- le taux réduit EEE/Suisse n'est jamais plus coûteux que le taux plein
- un forfait de majoration hors de son champ est **refusé**, et le refus est vérifié à
  l'exécution : le type seul atteste qu'un forfait a été ouvert pour *une* situation,
  pas que c'est celle du calcul

**Assemblage de la cession** (`ENG-027`)

- le produit d'une résidence principale exonérée et celui du même bien déclaré
  imposable diffèrent **exactement** du montant de l'impôt : les six autres postes
  du décompte sont identiques membre à membre, et l'impôt ne rétroagit donc pas sur
  son assiette
- une grandeur partagée ne peut pas prendre deux valeurs : la durée de détention
  **est** l'horizon de la vente, le prix d'acquisition **est** la valeur initiale,
  les frais de cession déduits **sont** la commission et la mainlevée du décompte.
  À vérifier sur horizon réel, négatif et fractionnaire compris — c'est la seule
  entrée où deux normalisations peuvent se séparer
- la commission d'agence et la mainlevée réduisent l'impôt, l'indemnité de
  remboursement anticipé ne le réduit pas : la liste de l'art. 41 duovicies H de
  l'annexe III est limitative
- les réserves des deux modules assemblés atteignent l'appelant **entières et
  étiquetées de leur provenance**, ni perdues ni fondues en une chaîne unique
- un forfait de majoration est construit sur la situation dérivée, et sur aucune
  autre : l'appelant n'en fournit pas, donc il ne peut pas se tromper de situation

**Analyse patrimoniale à l'écran** (`UI-007`)

Ces invariants-là ne vivent pas dans le moteur : ils portent sur la **composition** des
quatre modules précédents, et ils se vérifient dans `tests/e2e/patrimoine.spec.ts`. Ils
sont écrits ici parce qu'un écran qui compose peut trahir des modules justes.

- le locataire de référence reçoit l'écart de **décaissement**, jamais l'écart de fonds
  perdus : les deux ménages doivent sortir la même somme du même compte le même mois,
  faute de quoi on ne compare plus deux patrimoines constitués par le même effort
- **l'écart de patrimoine et l'écart de décaissement sont deux nombres distincts, et ils
  peuvent pencher en sens contraire** à la même année et pour le même ménage. C'est le
  retournement, et l'écran doit afficher les deux ensemble sans désigner le bon
- l'échelle du graphique est fixée par les **intervalles observés**, qui ne dépendent
  d'aucun réglage : déplacer une hypothèse déplace une courbe, jamais le cadre. Mesurable
  en pixels — le repère du locataire ne bouge pas quand l'appréciation du bien change
- un produit de vente négatif se dessine **sous** une ligne de zéro nommée, jamais écrasé
  sur le bord du cadre
- un forfait de majoration hors de son champ n'est **pas rattrapé** : l'année n'est pas
  chiffrée, et le motif du moteur est affiché tel quel. Un écran qui balaie l'horizon
  rencontre ce refus sur les cinq premières années dès que le forfait travaux est retenu
- l'épuisement du portefeuille du locataire est **annoncé à l'année où il se produit** :
  au-delà, les deux colonnes ne décrivent plus le même effort et leur écart ne se lit plus
- les hypothèses auxquelles `assumptions/market.ts` refuse une valeur centrale
  s'affichent avec leur intervalle, leur fiabilité, et la mention que le point d'ouverture
  est un milieu d'intervalle sans autorité
- **deux des trois sorties ne sont pas modélisées, et l'écran le dit en toutes lettres** :
  ni grisées, ni datées, ni annoncées « à venir ». Le décompte se déduit de la liste, il
  ne s'écrit pas en prose

Cas limites de ce module : horizon nul, loyer nul, prix nul, indexation négative puis
inférieure à −100 %, versements tous négatifs, portefeuille épuisé, plus-value nulle ou
négative, durée de détention nulle, vente qui ne couvre pas le capital restant dû.
