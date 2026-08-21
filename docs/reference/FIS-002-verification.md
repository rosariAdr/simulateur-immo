# FIS-002 — vérification à la source des valeurs réglementaires

*Recherche menée le 21 août 2026.*

> **Contrainte respectée : `src/core/` n'a pas été modifié.** Ce document rapporte ce
> qui a été trouvé ; le report dans `src/core/fiscal/params.ts` reste à faire par
> quelqu'un qui a le droit d'y toucher.

Trois entrées portaient un marqueur `@todo TODO_VERIFY`. Voici, pour chacune, la
valeur trouvée, sa source, sa date, et mon niveau de confiance.

---

## 1. Fin de la hausse des droits de mutation

**Valeur retenue : 31 mars 2028.** Confiance **élevée**.

L'article 116 de la [loi n° 2025-127 du 14 février 2025 de finances pour 2025](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069577/LEGISCTA000006162673/)
autorise chaque conseil départemental à relever le taux de la taxe départementale
**au-delà de 4,50 % et dans la limite de 5 %**, pour les actes authentiques signés
entre le **1er avril 2025 et le 31 mars 2028**.

Deux sources indépendantes concordent : les [Notaires de France](https://www.notaires.fr/fr/actualites/vente-immobiliere-et-augmentation-des-droits-de-mutation-titre-onereux)
citant « L. n° 2025-127, 14 févr. 2025, art. 116, II, A », et la doctrine fiscale
publiée au [BOFiP](https://bofip.impots.gouv.fr/bofip/14771-PGP.html/ACTU-2025-00129).

### Élément nouveau, non anticipé par la documentation du projet

La [loi n° 2026-103 du 19 février 2026 de finances pour 2026, art. 121](https://bofip.impots.gouv.fr/bofip/14771-PGP.html/ACTU-2025-00129)
est intervenue sur ce dispositif. D'après le BOFiP, elle modifie **le calendrier
d'entrée en vigueur des délibérations départementales**, non la date de fin du
dispositif. Le terme du 31 mars 2028 n'est donc pas déplacé.

**Ce point mérite une relecture attentive** : je le tiens d'une lecture du
commentaire BOFiP, pas du texte de loi lui-même, que je n'ai pas pu atteindre.

### Exonération des primo-accédants — à ajouter au moteur

L'article 116 prévoit que la hausse **ne s'applique pas** lorsque le bien constitue
pour l'acquéreur une première propriété au sens de l'article L. 31-10-3 du code de la
construction et de l'habitation, et qu'il est destiné à sa résidence principale.
Condition : ne pas avoir été propriétaire de sa résidence principale au cours des
**deux dernières années**.

Deux précisions qui comptent pour le calcul :

- **En indivision**, seul le co-acquéreur remplissant la condition échappe à la hausse,
  et seulement sur sa quote-part.
- **En communauté**, les deux époux doivent la remplir, sauf emploi de fonds propres
  constaté par une clause d'emploi.

C'est un **cas non modélisé** aujourd'hui, et il concerne précisément le public
prioritaire du produit. À traiter comme un ticket à part entière.

---

## 2. Liste des départements à taux réduit

**Aucune valeur retenue.** Confiance **faible** — la divergence signalée dans
`docs/INDEX.md` §7 est confirmée, pas résolue.

Deux sources consultées le même jour se contredisent :

| Source | Départements à 3,80 % |
|---|---|
| [Calcunet](https://calcunet.fr/articles/frais-notaire-departements-taux-reduit-2026/), 3 juillet 2026 | Indre (36), Isère (38), Morbihan (56) |
| Synthèse de recherche, agrégeant plusieurs sites spécialisés | Indre (36) et Mayotte (976) seulement — Isère et Morbihan y sont donnés à 4,50 % |

Les deux citent l'article 1594 D du CGI sans reproduire la liste officielle.

**La source qui tranche est identifiée** : la DGFiP publie chaque année le document
*« Droits d'enregistrement et taxe de publicité foncière : taux, abattements et
exonérations facultatives »*, millésime applicable au 1er février 2026 :

https://www.impots.gouv.fr/sites/default/files/media/1_metier/3_partenaire/notaires/dmto/dmto_2026-02.pdf

Je n'ai pas pu l'exploiter automatiquement : le PDF encode son texte avec des polices
à jeu de caractères propriétaire, dont l'extraction demande la table de correspondance
Unicode que le fichier ne livre pas simplement. **La liste doit être transcrite à la
main depuis ce document**, ou extraite avec un outil PDF installé sur la machine
(`poppler-utils`, absent ici).

Tant que ce n'est pas fait, cette valeur ne doit pas perdre son marqueur.

---

## 3. Barèmes des organismes de caution

**Constat : ce n'est pas une valeur réglementaire.** Confiance **élevée sur la nature
du paramètre**, faible sur les chiffres.

Aucun organisme de caution ne publie de barème opposable. Les ordres de grandeur
trouvés, tous de sources secondaires :

| Élément | Ordre de grandeur | Source |
|---|---|---|
| Commission de caution | 1,2 % à 1,6 % du montant emprunté | [Perlib](https://perlib.fr/articles/credit-logement), [ScoreCredit](https://scorecredit.fr/blog/hypotheque-ou-caution-credit-logement) |
| Part restituée du fonds mutuel de garantie | 60 % à 80 %, environ 75 % couramment cité | [Immoprêt](https://www.immopret.fr/pret-immobilier/meilleur-credit-immo/garanties-pret-immobilier/garantie-credit-logement/remboursement-caution-credit-logement/) |

Point décisif : **le taux de restitution n'est pas fixe.** Il dépend de la sinistralité
du fonds et est arrêté chaque année par l'organisme. Il ne peut donc pas être traité
comme un paramètre réglementaire daté et sourcé.

### Conséquence pour l'architecture

`docs/02-architecture.md` §4 pose un test d'appartenance : *une valeur va dans
`fiscal/params.ts` si une loi de finances peut la changer sans qu'on réécrive une
fonction.* Le barème de caution échoue à ce test — aucune loi ne le fixe.

**Proposition : sortir ces trois valeurs de `params.ts`** vers un fichier distinct,
nommé pour ce qu'il est — des hypothèses de marché, révisables, non opposables. Et
que l'interface le dise, plutôt que de les afficher avec la même autorité qu'un taux
d'usure.

C'est une décision d'architecture ; elle n'est pas prise ici.

---

## Où cela laisse FIS-002

| Entrée | État | Bloquant avant mise en ligne ? |
|---|---|---|
| Fin de la hausse des DMTO | **Résolue** — 31 mars 2028, deux sources concordantes | non |
| Exonération primo-accédants | **Découverte** — non modélisée, concerne le public prioritaire | oui, fonctionnellement |
| Liste des départements à taux réduit | **Non résolue** — divergence confirmée, source identifiée | oui |
| Barèmes de caution | **Requalifiée** — hypothèse de marché, pas valeur réglementaire | non, si l'interface le dit |

Deux actions restent, et aucune ne peut être faite depuis cette session :

1. Transcrire la liste officielle depuis le PDF de la DGFiP, ou installer
   `poppler-utils` pour que je puisse le faire.
2. Reporter ces conclusions dans `src/core/fiscal/params.ts`, fichier auquel je n'ai
   pas le droit de toucher.
