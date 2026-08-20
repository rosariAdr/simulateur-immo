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
