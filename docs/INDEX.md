# Récapitulatif du projet

État au 19 août 2026.

---

## 1. Ce qu'on construit

Un simulateur web français qui **réunit** tous les calculs d'une acquisition immobilière en une seule application, et qui **explique** chaque paramètre au moment où il apparaît.

Le problème identifié : les simulateurs existants sont dispersés — un site par calcul — et opaques : ils rendent un résultat sans dire d'où il vient, ni ce qui se négocie, ni ce qui s'impose.

Public prioritaire : le primo-accédant, qui ne connaît ni le TAEG ni la différence entre caution et hypothèque, et qui doit décider d'un engagement de vingt ans.

## 2. Le fil conducteur : la taxonomie des paramètres

Chaque paramètre de l'interface porte visuellement son appartenance à l'une de trois familles. C'est l'apport pédagogique central du produit, et ce qu'aucun concurrent ne fait.

| Famille | Contenu | Message |
|---|---|---|
| **Négociable** | Taux, frais de dossier, indemnités, garantie, assurance, émoluments au-delà de 100 000 €, mobilier déduit de l'assiette | Voici votre marge de manœuvre, et le bon moment pour l'exercer |
| **Contraint** | Apport, durée, revenus, prix, composition du foyer, zone, ancien ou neuf | Voici les leviers de votre projet et leurs effets croisés |
| **Réglementaire** | Usure, HCSF, droits de mutation, plafonds d'indemnités, quotités PTZ, abattements | Voici le mur, où il se trouve, et pourquoi il existe |

## 3. Décisions d'architecture

**Le moteur est indépendant de l'interface.** `src/core/` ne contient aucun import React ou Next. Fonctions pures uniquement, testables sans monter un composant. Une règle de lint garde la frontière.

**Les règles sont du code, les valeurs sont des données.** Test d'appartenance : si une loi de finances peut changer la valeur sans qu'on réécrive une fonction, elle va dans `fiscal/params.ts`, datée et sourcée. La mise à jour annuelle devient une modification de données.

**L'URL porte l'état.** Pas de compte, pas de base, pas de stockage local. Un scénario est un lien partageable. Conséquences : aucune donnée personnelle traitée, pas de bandeau cookies, hébergement Vercel gratuit.

**Les montants sont des entiers de centimes.** Décimal scalé à exposant fixe −2. L'exposant explicite ne sert qu'à la frontière, pour analyser une saisie sans passer par un flottant.

**L'arrondi est une convention nommée, pas un effet de bord.** `half-up`, `half-even` ou `down`, paramétrable, parce que le choix relève du contrat. Mesuré : moins de 5 € d'écart entre conventions sur 300 échéances.

## 4. Ce que le produit ne fait pas

- Pas de recommandation personnalisée — il calcule et explique, l'utilisateur décide
- Pas de collecte de données personnelles
- Pas de mise en relation commerciale sans vérification du statut réglementaire
- Pas de prévision de marché — les hypothèses viennent de l'utilisateur

Cette frontière est aussi le positionnement : elle rend le produit crédible là où les simulateurs de courtiers ne peuvent pas l'être.

---

## 5. Découvertes issues du développement

Cinq résultats obtenus en écrivant le moteur et ses tests. Ils alimentent directement les contenus pédagogiques.

### L'antériorité des intérêts, chiffrée

Capital 250 000 €, comparaison des dix premières et des dix dernières échéances :

| Taux | Durée | 10 premières | 10 dernières | Rapport | Écart des médianes |
|---|---|---|---|---|---|
| 3 % | 20 ans | 6 164 € (44 %) | 189 € (1,4 %) | 33× | 62 mois |
| 4 % | 20 ans | 8 230 € (54 %) | 274 € (1,8 %) | 30× | 67 mois |
| 4 % | 25 ans | 8 260 € (63 %) | 239 € (1,8 %) | 35× | 88 mois |
| 5 % | 25 ans | 10 337 € (71 %) | 329 € (2,3 %) | 31× | 94 mois |

L'écart des médianes mesure le décalage entre le mois où la moitié des intérêts est payée et celui où la moitié du capital est remboursée : **cinq à huit ans**.

### La bascule dès la première échéance n'est pas universelle

Les intérêts dominent la première échéance si et seulement si **(1 + r)ⁿ > 2**. Seuils : environ 3,47 % sur 20 ans, environ 2,78 % sur 25 ans. En dessous, la part de capital l'emporte immédiatement — sans que cela retire quoi que ce soit à l'antériorité globale, qui reste de l'ordre de 30×.

Deux notions distinctes, que l'interface doit séparer.

### La formule fermée du levier

Une erreur corrigée par les tests. L'approximation courante `P × ((1+r)^k − 1)` est exacte pour **un euro marginal** et surestime un versement conséquent de plus de 10 %, parce qu'un gros versement raccourcit le prêt et réduit donc la fenêtre de composition.

Formule exacte :

```
économie = M · ln(1 + (P·r / M) · (1 + r)^k) / ln(1 + r) − P
```

Vérifiée contre recalcul complet d'échéancier à moins de 0,5 % près.

### Les jalons et les fenêtres pointent en sens opposés

Deux lectures complémentaires, à ne jamais confondre. Exemple à 4 % sur 25 ans :

| Jalon de constitution | | Fenêtre d'action |
|---|---|---|
| Part d'intérêts < 50 % → mois 93 | | 1 € versé rapporte ≥ 100 % jusqu'au mois 91 |
| Part d'intérêts < 25 % → mois 215 | | ≥ 50 % jusqu'au mois 178 |
| Part d'intérêts < 15 % → mois 253 | | ≥ 25 % jusqu'au mois 232 |

Les jalons décrivent **où en est le crédit**. Les fenêtres désignent **où agir**. Quand la part d'intérêts devient enfin faible, l'efficacité d'un versement est déjà largement retombée.

### Un cas limite trouvé par test de propriétés

Un taux dénormal de 3×10⁻³²¹ % annule le dénominateur de l'annuité — `1 + r` vaut exactement 1 en flottant. Le moteur retombe désormais sur la branche taux nul. Aucun sens métier, mais le genre de chose qui casse une production.

---

## 6. Inventaire des livrables

### Documents de cadrage

| Fichier | Contenu |
|---|---|
| `CONTEXT.md` | Positionnement, taxonomie des paramètres, cartographie des cinq modules, ton, vigilance réglementaire |
| `01-brief-design.md` | Direction artistique à transmettre à Claude Design : métaphore, interdits, couleurs sémantiques, typographie, écrans attendus |
| `02-architecture.md` | Stack, séparation moteur/interface, état d'URL, structure du dépôt, stratégie de test |
| `03-spec-domaine.md` | Spécification fonctionnelle des cinq modules, formules, invariants |
| `04-regles-calcul.md` | Règles vérifiées par recherche, avec sources et points de divergence |
| `reference/parametres-2026.json` | Paramètres réglementaires versionnés, chaque entrée sourcée |
| `05-plan-production.md` | Processus de production détaillé |
| `CLAUDE.md` | Fichier de contexte minimal pour Claude Code |
| `TASKS.md` | Tickets par phase, convention de préfixes |
| `RELEASES.md` | Découpage en versions, modèle de branches, portes de vérification |
| `REGISTRE-TESTS.md` | Ce que la suite couvre à chaque version, et les gardes vérifiées par sabotage |
| `ADR.md` | Décisions d'architecture et leurs raisons |

### Moteur crédit — `src/core/`

95 tests verts, TypeScript strict, zéro dépendance interface.

| Fichier | Rôle |
|---|---|
| `src/core/money.ts` | Décimal scalé, politique d'arrondi, analyse de saisie |
| `src/core/fiscal/params.ts` | Paramètres réglementaires millésime 2026 |
| `src/core/credit/schedule.ts` | Annuité constante, échéancier, différés |
| `src/core/credit/insurance.ts` | Assurance emprunteur, deux bases de calcul |
| `src/core/credit/apr.ts` | TAEG et TAEA par équivalence actuarielle |
| `src/core/credit/constraints.ts` | Usure, HCSF, indemnités de remboursement anticipé |
| `src/core/credit/profile.ts` | Antériorité des intérêts, jalons, fenêtres d'efficacité, levier |
| `src/core/credit/plan.ts` | Agrégation multi-prêts |
| `src/core/credit/__tests__/` | 3 suites : référence, invariants, profil |
| `reference/SOURCES.md` | Traçabilité formule par formule, avec niveaux de fiabilité A à M |
| `reference/TAEG.md` | Note de référence sur le TAEG |

### Prototype

`prototype/pilotage-immobilier.jsx` — prototype React à trois modules. **Sert de référence d'interaction, pas de code source.** Ses calculs sont remplacés par le moteur ; certains étaient faux, notamment sur les amortissements LMNP et la formule du levier.

---

## 7. Points bloquants avant mise en ligne

**Vérification des paramètres réglementaires.** Toutes les valeurs de niveau B, C ou M dans `SOURCES.md` proviennent de sources secondaires. Trois incohérences connues : la date de fin de la hausse des droits de mutation, la liste des départements à taux réduit, et le seuil du micro-foncier non retrouvé. À confronter à Legifrance, au BOFiP et à l'ANIL.

**Mentions légales et avertissement.** L'outil ne constitue ni un conseil en investissement, ni un conseil fiscal, ni une offre de crédit. À faire valider par un professionnel du droit.

**Taux d'usure.** Change tous les trimestres. Prévoir une procédure de mise à jour, voire une récupération automatisée.
