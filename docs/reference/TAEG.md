# Le TAEG expliqué

Note de référence pour l'implémentation et pour les contenus pédagogiques du produit.

---

## 1. Le problème que le TAEG résout

Deux offres de prêt, même montant, même durée :

| | Offre A | Offre B |
|---|---|---|
| Taux nominal | 3,20 % | 3,45 % |
| Frais de dossier | 1 500 € | 0 € |
| Assurance | 0,36 % sur capital initial | 0,14 % sur capital restant dû |
| Garantie | hypothèque | caution |

Laquelle est la moins chère ? Le taux nominal ne permet pas de répondre : il ne mesure que le loyer de l'argent, pas le coût de l'opération. Le TAEG existe pour rendre ces offres comparables par un seul nombre.

C'est aussi pour cela qu'il est le seul taux **opposable** : c'est lui, et non le taux nominal, qui est confronté au taux d'usure.

---

## 2. Ce que dit le texte

L'article R314-3 du Code de la consommation pose que le TAEG est calculé à terme échu, selon la méthode d'équivalence, actuariellement et par intérêts composés, en assurant l'égalité entre les sommes prêtées et l'ensemble des versements dus par l'emprunteur.

Traduit en une équation, en notant `ρ` le taux périodique mensuel :

```
capital reçu = Σ  échéance(i) / (1 + ρ)^i
              i=1..n
```

Puis, par équivalence : **TAEG = (1 + ρ)¹² − 1**.

---

## 3. Trois notions qu'on confond

### Équivalence contre proportionnalité

Le **taux nominal** est proportionnel : 3,60 % annuel donne 0,30 % mensuel, par simple division par douze. C'est une convention de calcul des intérêts, pas une réalité économique.

Le **TAEG** est actuariel : il capitalise. Un taux mensuel de 0,30 % ne donne pas 3,60 % annuel mais `1,003¹² − 1 = 3,66 %`.

C'est la raison pour laquelle le TAEG dépasse toujours le taux nominal, **même en l'absence totale de frais**. Un test du moteur vérifie ce point : à 3 % nominal sans aucun frais, le TAEG ressort entre 3,00 % et 3,10 %.

### Ce qui entre, ce qui n'entre pas

**Entrent** (article R314-4) — tout ce qui est nécessaire pour obtenir le crédit, ou pour l'obtenir aux conditions annoncées : frais de dossier, sommes versées aux intermédiaires, assurance et garanties obligatoires, tenue de compte imposée, évaluation du bien.

**N'entrent pas** (article R314-5) — les frais liés à l'acquisition de l'immeuble : droits de mutation, taxes, frais d'acte notarié.

**C'est l'erreur la plus fréquente.** Les frais de notaire ne sont pas un coût du crédit mais un coût de l'acquisition. Les inclure gonflerait artificiellement le TAEG et rendrait les offres incomparables. Le moteur les exclut explicitement, et le commentaire de `plan.ts` le rappelle.

### TAEG et taux d'usure

Le taux d'usure plafonne le **TAEG**. Conséquence pratique que peu d'emprunteurs anticipent : un dossier peut être refusé à cause d'une assurance chère, alors que le taux nominal négocié est excellent. C'est un point de pédagogie de premier plan, parce qu'il désigne le bon levier — substituer l'assurance plutôt que renégocier le taux.

---

## 4. Comment on le calcule

L'équation n'a pas de solution analytique dès que `n` dépasse quelques échéances. On la résout numériquement.

Soit `f(ρ)` la valeur actuelle nette des échéances, actualisées à `ρ`, moins le capital reçu. On cherche `f(ρ) = 0`.

`f` est **strictement décroissante** en `ρ` sur le domaine utile : plus on actualise fort, moins les flux futurs pèsent. Cette monotonie garantit l'unicité de la racine et la convergence de la dichotomie.

```
lo = 0, hi = 5 % mensuel
répéter 200 fois :
    mid = (lo + hi) / 2
    si f(mid) > 0 alors lo = mid sinon hi = mid
```

Deux cents itérations mènent bien au-delà de la précision d'un flottant. Newton-Raphson convergerait plus vite mais exige une dérivée et une initialisation prudente ; sur trois cents flux, la dichotomie coûte quelques microsecondes. Ce n'est pas le goulot d'étranglement.

Le moteur renvoie `NaN` dans deux cas légitimes : lorsque le total remboursé est inférieur au capital reçu — mathématiquement impossible pour un vrai crédit, mais atteignable sur des saisies incohérentes — et lorsque la racine sort du domaine exploré.

---

## 5. La limite assumée

L'annexe à l'article R314-3 définit un **mois normalisé de 365/12 jours**, soit 30,41666 jours, et raisonne en fractions d'années.

Le moteur suppose des échéances mensuelles régulières et annualise par `(1 + ρ)¹²`.

Les deux approches **coïncident pour un prêt mensuel classique**. Elles divergent marginalement quand :

- les déblocages sont échelonnés — cas d'une VEFA, avec intérêts intercalaires
- la première échéance est décalée par rapport au déblocage
- les échéances sont trimestrielles ou irrégulières

D'où une règle produit ferme : **le TAEG affiché est une estimation, jamais le TAEG contractuel**. Un écart de quelques centièmes avec l'offre de prêt est normal, et l'interface doit le dire.

C'est en soi un point pédagogique utile : il apprend à l'utilisateur que le TAEG est une construction conventionnelle, pas une mesure physique.

---

## 6. Le TAEA

L'article L313-8 impose l'affichage du taux annuel effectif de l'assurance : la part du TAEG imputable à la seule assurance.

Le moteur le calcule par différence — TAEG assurance comprise, moins TAEG hors assurance. C'est la définition la plus directe et la plus robuste.

Son intérêt est décisif pour le produit : il permet de comparer deux contrats dont les bases de calcul diffèrent. Un contrat à 0,34 % sur capital initial et un contrat à 0,34 % sur capital restant dû affichent le même taux et n'ont pas du tout le même coût. Le TAEA les départage.

---

## 7. Ce qu'il faut retenir pour l'interface

- Le TAEG est le **seul** chiffre comparable entre deux offres.
- Il dépasse toujours le taux nominal, y compris sans frais, à cause de la capitalisation.
- Il **exclut** les frais de notaire.
- C'est lui, et non le taux nominal, qui est confronté au taux d'usure.
- Le TAEA isole l'assurance et rend les bases de calcul comparables.
- La valeur affichée est une estimation, à quelques centièmes du TAEG contractuel.
