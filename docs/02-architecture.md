# Architecture technique

## 1. Décision structurante : le moteur est indépendant de l'interface

Tout le reste découle de là.

`src/core/` contient les calculs sous forme de fonctions pures TypeScript. **Aucun import React, aucun accès au DOM, aucune dépendance à Next.js.** Le moteur prend des entrées, rend des sorties, et rien d'autre.

Pourquoi c'est non négociable :

- Le moteur est testable exhaustivement, sans monter de composants.
- Il est réutilisable — script d'export, génération de contenus, API ultérieure.
- Un désaccord sur un chiffre se résout dans un test, pas dans le navigateur.
- Cela empêche l'erreur classique du calculateur web : la logique métier qui se répand dans les composants et devient impossible à vérifier.

La frontière se garde automatiquement. Une règle de lint interdit tout import de `react` ou `next` depuis `src/core/`.

## 2. Stack

| Couche | Choix | Justification |
|---|---|---|
| Framework | Next.js, App Router | Déploiement Vercel natif, rendu statique, bon référencement pour les contenus |
| Langage | TypeScript en mode strict | Le domaine est riche en types métier ; le typage est une documentation |
| Styles | Tailwind avec jetons en variables CSS | Les jetons vivent en CSS, Tailwind ne fait que les consommer. Thème sombre gratuit |
| État d'URL | `nuqs` | Voir section 3 |
| Validation | `zod` | Analyse des paramètres d'URL, valeurs par défaut, bornes |
| Graphiques | `recharts` pour démarrer | Suffisant pour les courbes et aires. À réévaluer pour les faisceaux du module signature |
| Tests | `vitest` + `fast-check` | Voir section 5 |
| Contenus | MDX | Fiches pédagogiques et glossaire versionnés avec le code |
| Mesure d'audience | Solution sans cookie | Voir section 6 |

Dépendances à éviter : toute bibliothèque de gestion d'état globale, tout ORM, toute solution d'authentification. Le produit n'a pas de backend et ne doit pas en acquérir un par accident.

## 3. L'URL porte l'état

**Chaque scénario est entièrement décrit par l'URL.** Pas de base de données, pas de compte, pas de stockage local.

Ce que cela apporte :

- Un scénario se partage par simple copie de lien. C'est le mécanisme de diffusion le moins cher qui existe.
- Aucune donnée personnelle n'est traitée, ce qui simplifie radicalement les obligations en matière de protection des données.
- Le retour arrière du navigateur devient un historique de scénarios.
- Aucun coût d'infrastructure.

Contrainte à gérer : la lisibilité de l'URL. Prévoir des clés courtes et n'inscrire que les valeurs qui s'écartent du défaut.

## 4. Les paramètres fiscaux sont des données versionnées, pas du code

Les barèmes changent chaque année et le module des aides est le plus exposé. Une valeur écrite en dur dans une fonction est une dette immédiate.

Tout paramètre d'origine réglementaire vit dans un fichier de configuration daté : taux de prélèvements sociaux, abattements de plus-value, barèmes d'abattement par durée de détention, seuils des régimes micro, plafonds d'endettement, plafonds d'indemnités de remboursement anticipé, barèmes des aides.

Chaque entrée porte une date d'entrée en vigueur et une source vérifiable. Le moteur reçoit le millésime applicable en paramètre.

Trois bénéfices : la mise à jour annuelle devient une modification de données, les tests peuvent figer un millésime, et l'interface peut afficher honnêtement sur quelle base elle calcule.

**Ces valeurs doivent être vérifiées à la source avant mise en ligne** — service-public.fr, bofip.impots.gouv.fr, ANIL. Aucune ne doit être reprise d'un modèle de langage sans contrôle, y compris celles présentes dans le prototype.

## 5. Stratégie de test

Le moteur porte la crédibilité du produit. Il se teste à trois niveaux.

**Cas de référence.** Une poignée de scénarios dont le résultat est vérifié contre une source externe : un tableau d'amortissement produit par une banque ou une feuille de calcul indépendante. Ce sont les tests qui prouvent que le moteur est juste, pas seulement cohérent.

**Propriétés invariantes**, avec `fast-check`. Sur des milliers d'entrées aléatoires, certaines vérités doivent tenir :
- la somme des parts de capital d'un échéancier égale le capital emprunté
- le capital restant dû décroît de façon monotone
- il atteint zéro exactement au terme
- un remboursement anticipé ne peut jamais augmenter le total des intérêts
- le TAEG est supérieur ou égal au taux nominal dès qu'il existe des frais

Cette approche trouve les cas limites qu'on n'imagine pas : taux nul, durée d'un mois, apport supérieur au prix, différé plus long que la durée.

**Tests de non-régression.** Chaque correction de calcul ajoute son cas.

**Tests de bout en bout**, avec `playwright`. Le moteur peut être juste et l'interface
mentir : un montant au format anglo-saxon, un champ inatteignable au clavier, une
information portée par la seule couleur. Ces défauts ne se voient que dans un vrai
navigateur. La galerie `/composants` leur sert de banc d’essai, sur deux profils —
bureau et mobile.

Ce que ces tests couvrent, et qu’aucune autre suite ne peut voir : le format français
strict des montants, la navigation au clavier, les cinq états des composants de saisie,
et la règle « jamais de couleur seule », vérifiée champ par champ.

## 6. Protection des données et conformité

Sans compte ni formulaire, aucune donnée personnelle n'est traitée. Cela reste vrai à condition de choisir une mesure d'audience sans cookie ni identifiant persistant, ce qui évite le bandeau de consentement.

À prévoir dès la première mise en ligne : mentions légales, conditions générales d'utilisation, politique de confidentialité même minimale, et un avertissement visible précisant que l'outil ne constitue ni un conseil en investissement, ni un conseil fiscal, ni une offre de crédit.

## 7. Structure du dépôt

```
src/
  core/                    ← aucune dépendance UI
    credit/                 échéancier, annuité, TAEG, garanties
    compare/                achat contre location, scénarios de sortie
    prepayment/             remboursements anticipés, indemnités, suggestion
    markets/                portefeuille, enveloppes fiscales, distribution
    aides/                  règles d'éligibilité
    fiscal/                 paramètres versionnés par millésime
    types.ts                types partagés du domaine
  app/                     routes Next.js
  components/
    ui/                     composants génériques
    charts/                 visualisations
    domain/                 composants portant du sens métier
  content/                 fiches MDX et glossaire
docs/
  CONTEXT.md  ADR.md  TASKS.md  tickets/
```

## 8. Points d'attention techniques

**Arrondis monétaires.** Les flottants dérivent sur trois cents itérations. Calculer en centimes entiers dans le moteur, n'arrondir qu'à l'affichage. Vérifier explicitement que la dernière échéance solde exactement le capital.

**Volume de données dans les graphiques.** Trois cents points par série suffisent à ralentir un rendu. Agréger à l'année pour les vues d'ensemble, ne descendre au mois que pour les vues détaillées.

**Le module des aides est le plus risqué.** Règles d'éligibilité croisées, zonage géographique, plafonds de ressources par composition de foyer, barèmes annuels. Le concevoir comme un moteur de règles alimenté par des données, jamais comme une cascade de conditions écrites à la main. Envisager de le livrer après les autres.

**Rendu statique par défaut.** Aucune page n'a besoin de rendu serveur dynamique. Tout le calcul se fait côté client à partir de l'URL. Cela maintient l'hébergement gratuit et le temps de réponse minimal.
