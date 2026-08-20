# Traçabilité des formules et des données

Chaque règle et chaque valeur du moteur, avec sa provenance et son niveau de fiabilité.

## Niveaux de fiabilité

| Niveau | Signification |
|---|---|
| **A** | Texte réglementaire consulté directement (Légifrance, BOFiP, Banque de France) |
| **B** | Source secondaire fiable et concordante entre plusieurs éditeurs |
| **C** | Source secondaire unique, ou sources divergentes → à vérifier |
| **M** | Ordre de grandeur de marché, sans valeur réglementaire |

---

## 1. Formules de calcul

| Règle | Implémentation | Source | Niv. |
|---|---|---|---|
| Annuité constante `M = C·r / (1 − (1+r)^−n)` | `schedule.ts:monthlyPayment` | Formule actuarielle standard. Cohérente avec le calcul à terme échu par intérêts composés décrit à l'art. R314-3 du Code de la consommation | A |
| Cas dégénéré taux nul `M = C/n` | `schedule.ts:monthlyPayment` | Limite mathématique de la formule quand r → 0. Utilisé par le PTZ | A |
| Ordre de calcul de l'échéance | `schedule.ts:amortize` | Pratique bancaire : intérêts sur le capital restant dû d'ouverture, puis part de capital par différence | B |
| Capitalisation des intérêts en différé total | `schedule.ts:amortize` | Déduction logique. **Sans objet pour le PTZ**, dont le taux est nul | B |
| Prime d'assurance `base × taux/12 × quotité` | `insurance.ts:monthlyPremium` | Mode de calcul usuel des contrats. La base est le paramètre décisif | B |
| TAEG par équivalence actuarielle | `apr.ts:apr` | **Code de la consommation, art. R314-3** — calcul actuariel à terme échu par la méthode d'équivalence, assurant l'égalité entre sommes prêtées et versements dus | A |
| Frais inclus dans le TAEG | `plan.ts:buildCreditPlan` | **Art. R314-4** — frais nécessaires pour obtenir le crédit : dossier, intermédiaires, assurance et garanties obligatoires, tenue de compte imposée, évaluation du bien | A |
| Frais exclus du TAEG | `plan.ts` (frais de notaire volontairement absents) | **Art. R314-5** — frais liés à l'acquisition, taxes et frais d'acte notarié | A |
| TAEA par différence de TAEG | `apr.ts:taea` | **Art. L313-8 et suivants** — indicateur obligatoire isolant la part de l'assurance | A |
| Indemnité `min(remboursé × taux × 6/12 ; CRD × 3 %)` | `constraints.ts:prepaymentPenalty` | **Art. R313-25** — « ne peut excéder la valeur d'un semestre d'intérêt sur le capital remboursé au taux moyen du prêt, sans pouvoir dépasser 3 % du capital restant dû avant le remboursement » | A |
| Seuil contractuel des 10 % | `constraints.ts:isBelowContractualMinimum` | **Art. L313-47** — « Le contrat de prêt peut interdire les remboursements égaux ou inférieurs à 10 % du montant initial du prêt, sauf s'il s'agit de son solde » | A |
| Exonérations d'indemnité | `constraints.ts:ExemptionReason` | **Art. L313-47** — vente suite à changement du lieu d'activité professionnelle, cessation forcée d'activité, décès. Applicables de plein droit | A |
| Taux d'effort assurance comprise | `constraints.ts:checkHcsf` | Normes HCSF contraignantes depuis janvier 2022 | B |

---

## 2. Valeurs réglementaires

Toutes dans `src/core/fiscal/params.ts`, millésime 2026.

| Donnée | Valeur | Source | Niv. |
|---|---|---|---|
| Usure, taux fixe < 10 ans | 4,07 % | Banque de France, avis JO fin juin 2026, T3 2026 | B |
| Usure, taux fixe 10–20 ans | 4,57 % | idem | B |
| Usure, taux fixe ≥ 20 ans | 5,29 % | idem | B |
| Usure, taux variable | 5,28 % | idem | B |
| Usure, prêt relais | 6,39 % | idem | B |
| Méthode de calcul de l'usure | taux moyens pratiqués majorés d'un tiers | Art. L314-6 du Code de la consommation | A |
| Taux d'effort maximal | 35 %, assurance comprise | HCSF, maintien confirmé en mars 2026 | B |
| Durée maximale | 25 ans | HCSF | B |
| Durée dérogatoire | 27 ans | HCSF — VEFA, construction, ou travaux ≥ 10 % du montant emprunté | B |
| Seuil de travaux dérogatoire | 10 % | Décision HCSF du 18 décembre 2023, abaissé de 25 % à 10 % | B |
| Marge de flexibilité | 20 % de la production trimestrielle | HCSF, décision du 29 juin 2023 pour la répartition | B |
| Plafond d'indemnité, capital restant dû | 3 % | Art. R313-25 | A |
| Plafond d'indemnité, mois d'intérêts | 6 | Art. R313-25 | A |
| Seuil contractuel de remboursement partiel | 10 % du montant initial | Art. L313-47 | A |
| Loi Lemoine, seuil questionnaire de santé | 200 000 € par assuré | Loi n° 2022-270 du 28 février 2022 | B |
| Loi Lemoine, âge au terme | avant 60 ans | idem | B |
| Mois normalisé | 365/12 = 30,41666 jours | Annexe à l'art. R314-3 | A |
| Arrondi d'affichage du TAEG | au moins une décimale | Annexe à l'art. R314-3 | A |
| Droits de mutation, taux plein | 6,32 % | Loi de finances 2025 + délibérations départementales 2026 | B |
| Droits de mutation, taux non relevé | 5,81 % | idem | B |
| Droits de mutation, taux réduit | 5,09 % | idem — **liste des départements divergente selon les sources** | C |
| Droits de mutation, primo-accédant | 5,81 % | Loi de finances 2025 — exclusion de plein droit de la hausse de 0,5 point | B |
| Définition du primo-accédant | non propriétaire de sa RP au cours des 2 années précédant l'acte | Loi de finances 2025 ; art. L31-10-3 du CCH | B |
| Neuf, taxe de publicité foncière | 0,715 % | Relevés 2026 | B |
| Frais d'acquisition, ancien | 7 à 8,5 % | Concordance de plusieurs sources | B |
| Frais d'acquisition, neuf | 2 à 3 % | idem | B |
| Déduction du mobilier | jusqu'à 5 % du prix, sur inventaire | Pratique notariale | C |
| Remise sur émoluments | jusqu'à 20 % au-delà de 100 000 € | Code de commerce, art. L444-2 | B |
| Fin de la hausse des droits de mutation | **31 mars ou 30 avril 2028** | **Sources divergentes** | C |
| Coût de caution | ~1,25 %, dont ~55 % restituables | Ordre de grandeur de marché ; barèmes réels progressifs | M |
| Coût d'hypothèque | ~1,5 %, mainlevée ~0,4 % | idem | M |
| Assurance, contrat groupe | 0,30 à 0,42 % | Estimations de courtiers, 2026 | M |
| Assurance, délégation | 0,10 à 0,20 % | idem | M |
| Écart entre bases de calcul | 30 à 45 % du coût total | Estimations concordantes de plusieurs courtiers | M |

---

## 3. Ce qui n'est pas modélisé, et pourquoi

| Élément | Raison |
|---|---|
| Lissage bancaire des prêts multiples | Le plan décrit les prêts tels que contractés. Le lissage relève de la présentation ; l'interface doit proposer les deux lectures |
| Reste à vivre | Critère bancaire réel mais non normé, variable d'un établissement à l'autre |
| Intérêts compensateurs sur prêt à taux variable | Art. R313-25 alinéa 2. Hors périmètre v1 |
| Déblocages échelonnés en VEFA et intérêts intercalaires | Complexifie le TAEG. À traiter dans un second temps |
| Fractions d'années sur mois normalisés dans le TAEG | Implémentation par annualisation `(1+ρ)^12`. Écart marginal pour un prêt mensuel régulier, mais le résultat reste une estimation |
| Barèmes progressifs des organismes de caution | Nécessite les grilles réelles, non publiques en source ouverte |
| Modulation d'échéances et report | Fonctionnalités contractuelles, hors module 1 |

---

## 4. À vérifier avant mise en ligne

Ordre de priorité.

1. **Taux d'usure du trimestre en cours** — change tous les trois mois. Automatiser la récupération si possible.
2. **Date de fin de la hausse des droits de mutation** — sources contradictoires.
3. **Liste des départements à taux réduit** — les listes ne concordent pas. Envisager une source ouverte départementale.
4. **Barèmes des organismes de caution** — remplacer les ordres de grandeur par des grilles réelles.
5. **Maintien des normes HCSF** — révisables à chaque réunion du Haut Conseil.

Sources de référence à privilégier : legifrance.gouv.fr, bofip.impots.gouv.fr, service-public.fr, banque-france.fr, anil.org, data.gouv.fr.

**Aucune valeur de niveau B, C ou M ne devrait être mise en ligne sans confrontation à une source officielle.** Une recherche web, même soignée, reste une source secondaire.

---

## 5. Découvertes issues de l'écriture des tests

### La bascule capital/intérêts n'est pas universelle

L'affirmation « au début, on rembourse surtout des intérêts » est vraie **si et seulement si (1 + r)^n > 2**, où r est le taux mensuel et n la durée en mois.

```
intérêts₁ > capital₁
⟺ C·r > M − C·r
⟺ M < 2·C·r
⟺ C·r / (1 − (1+r)^−n) < 2·C·r
⟺ 1 − (1+r)^−n > 1/2
⟺ (1+r)^n > 2
```

À 3,35 % sur 20 ans, le facteur vaut environ 1,95 : **la part de capital dépasse les intérêts dès la première échéance**. L'intuition ne tient qu'aux taux élevés ou sur les durées longues.

*Conséquence produit* : l'interface ne doit pas énoncer cette règle comme un fait général, mais l'afficher comme un résultat calculé pour la configuration saisie. Le module crédit expose `crossoverMonth` à cette fin.

### L'arrondi de la quotité d'assurance

L'arrondi au centime a lieu une seule fois, en fin de calcul. Doubler la quotité ne double donc pas exactement une prime déjà arrondie — l'écart peut atteindre un centime. C'est le comportement correct : arrondir avant d'appliquer la quotité introduirait une erreur bien plus grande, accumulée sur 300 échéances.

### Un différé égal à la durée totale ne rembourse rien

Le moteur ne masque pas l'anomalie et rend un échéancier au capital intact. C'est à la couche de validation, pas au moteur, de refuser cette saisie.
