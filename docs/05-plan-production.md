# Plan de production

Processus détaillé, de l'état actuel à la mise en ligne. Chaque étape indique l'outil, l'entrée, la sortie et le critère d'achèvement.

---

## Principe directeur

**Le moteur précède le design, le design précède l'implémentation.**

Sur un produit dont la valeur est la crédibilité du calcul, inverser cet ordre conduit à dessiner des écrans autour de chiffres non validés, puis à négocier entre la maquette et la réalité.

Corollaire important : **Claude Design doit recevoir des données réelles**, produites par le moteur, et non des valeurs inventées. C'est ce qui évite les maquettes qui s'effondrent au contact d'un tableau de trois cents lignes ou d'un taux d'endettement à 41 %.

---

## Phase 0 — Fondations *(une demi-journée)*

**Outil : Claude Code**

| Étape | Sortie |
|---|---|
| Initialiser Next.js App Router, TypeScript strict, Tailwind | Dépôt fonctionnel |
| Installer `vitest`, `fast-check`, `nuqs`, `zod` | Chaîne de test opérationnelle |
| Copier `moteur-credit/src/core` dans le projet | Moteur intégré |
| Règle ESLint interdisant `react` et `next` dans `src/core/` | Frontière gardée automatiquement |
| Copier les documents de cadrage dans `docs/` | Contexte disponible pour toutes les sessions |
| Connecter le dépôt à Vercel | Déploiement automatique sur chaque poussée |

**Prompt de départ**

> Initialise un projet Next.js App Router en TypeScript strict avec Tailwind, Vitest, fast-check, nuqs et zod. Lis `docs/02-architecture.md` pour la structure attendue. Ajoute une règle ESLint interdisant tout import de `react` ou `next` depuis `src/core/`. Vérifie que `npm test` et `npm run typecheck` passent.

**Critère d'achèvement** : `npm test` vert, déploiement Vercel accessible, règle de lint qui échoue si on ajoute volontairement un import React dans `src/core/`.

---

## Phase 1 — Skill de domaine *(deux heures)*

**Outil : `skill-creator`**

Sans cela, chaque session de Claude Code redérive les règles fiscales depuis zéro, avec des variations d'une session à l'autre. Une skill fige la connaissance métier.

Créer une skill `patrimoine-domaine` reprenant :
- les formules de `03-spec-domaine.md` et `04-regles-calcul.md`
- la séparation règles / paramètres et le test d'appartenance
- la taxonomie négociable / contraint / réglementaire
- les invariants à préserver
- l'obligation de sourcer toute valeur réglementaire

**Prompt**

> Crée une skill nommée `patrimoine-domaine` à partir de `docs/03-spec-domaine.md`, `docs/04-regles-calcul.md` et `moteur-credit/SOURCES.md`. Elle doit se déclencher sur toute tâche touchant au calcul de crédit, à la fiscalité immobilière ou aux aides. Elle doit rappeler la séparation règles/paramètres, la taxonomie des paramètres, et interdire d'écrire une valeur réglementaire en dur.

**Critère d'achèvement** : la skill se déclenche sur une demande du type « ajoute le calcul des frais de notaire » et rappelle spontanément de placer le taux dans `fiscal/params.ts`.

---

## Phase 2 — Fixtures pour le design *(une heure)*

**Outil : Claude Code**

Un script qui exporte des sorties réelles du moteur, à donner ensuite à Claude Design.

Quatre scénarios à couvrir, choisis pour leurs contraintes d'affichage :

1. **Achat modeste** — 180 000 €, 20 ans, taux d'endettement confortable
2. **Achat tendu** — 420 000 €, 25 ans, endettement à 38 %, non conforme HCSF
3. **Avec PTZ en différé** — mensualité qui grimpe à la fin du différé
4. **Cas limite d'usure** — assurance chère faisant approcher le seuil

Chaque fixture contient les indicateurs, le tableau annuel complet, le profil d'amortissement, les jalons et les fenêtres d'efficacité.

**Prompt**

> Écris `scripts/export-fixtures.ts` qui produit quatre fichiers JSON dans `fixtures/`, à partir de `buildCreditPlan` et `amortisationProfile`. Scénarios : achat modeste, achat tendu non conforme HCSF, cas avec PTZ en différé, cas proche du seuil d'usure. Inclus les indicateurs, le tableau annuel, le profil, les jalons et les fenêtres.

**Critère d'achèvement** : quatre JSON lisibles, avec des montants formatés en euros dans un champ dédié pour faciliter la lecture par Claude Design.

---

## Phase 3 — Système de design *(une à deux journées)*

**Outil : Claude Design**

Entrée : `01-brief-design.md` **et** les quatre fixtures JSON.

Sortie attendue :
- jetons de design en variables CSS, nommés par rôle sémantique et non par couleur
- états des composants de saisie : repos, survol, focus, erreur, désactivé
- quatre à six écrans de référence

**Ordre de production des écrans**

1. Module crédit complet, écran large — fixe la grille, les composants, les indicateurs, le ruban, le tableau
2. Le même en largeur mobile
3. Le moment de révélation du module acheter ou louer — replié, justification, déplié
4. Le module pierre ou marchés, avec la représentation en faisceaux
5. La page d'accueil
6. Une fiche pédagogique

**Prompt**

> Voici le brief de direction artistique et quatre jeux de données réels produits par le moteur de calcul. Conçois d'abord le module crédit en écran large, en utilisant exactement ces valeurs — n'invente aucun montant. Respecte les interdits de la section 3 du brief. Livre les jetons en variables CSS nommées par leur rôle sémantique.

**Trois questions à trancher pendant cette phase**

- Comment représenter une fourchette de résultats pour un lecteur qui ne lit pas de graphiques statistiques ?
- Comment un tableau d'amortissement de trois cents lignes reste-t-il consultable sur mobile ?
- Comment signaler qu'un scénario est mauvais sans employer un rouge alarmant qui ferait de l'outil un juge ?

**Critère d'achèvement** : les écrans tiennent avec les quatre fixtures, y compris le cas non conforme HCSF et le tableau long. Les jetons sont extractibles.

---

## Phase 4 — Système de design en code *(une demi-journée)*

**Outils : `theme-factory`, puis Claude Code**

Traduire les jetons produits par Claude Design en configuration Tailwind et variables CSS, avec thème sombre dérivé.

**Critère d'achèvement** : une page de démonstration affiche tous les jetons, tous les états de composants, et bascule en thème sombre sans régression de contraste.

---

## Phase 5 — Interface du module crédit *(deux à trois journées)*

**Outils : Claude Code + skill `impeccable`**

| Étape | Contenu |
|---|---|
| Composants de saisie | Champ, sélecteur, bascule, avec étiquette de taxonomie |
| État d'URL | `nuqs` et `zod`, clés courtes, seules les valeurs non par défaut sont inscrites |
| Panneau de paramètres | Sections repliables, six panneaux |
| Bandeau d'indicateurs | Mensualité, coût, TAEG, contrôles d'usure et d'endettement |
| Ruban d'amortissement | Objet signature, avec curseur de lecture |
| Jalons et fenêtres | Les deux lectures, visuellement distinguées |
| Tableau d'amortissement | Agrégation annuelle, détail mensuel dépliable |
| Infobulles pédagogiques | Reliées au glossaire |
| Adaptation mobile | Paramètres en accordéon, indicateurs toujours visibles |

**Prompt type**

> Implémente le ruban d'amortissement à partir de la maquette et des jetons. Il consomme `ConsolidatedRow[]` du moteur, sans recalculer quoi que ce soit. Un curseur lit n'importe quel mois. Marque le point de bascule et les jalons de seuil. Utilise la skill impeccable pour la finition.

**Critère d'achèvement** : le module fonctionne sur les quatre fixtures, l'URL restitue exactement un scénario partagé, l'affichage mobile reste lisible.

---

## Phase 6 — Modules suivants *(deux à trois semaines)*

Pour chacun, la même séquence en quatre temps : **moteur + tests → maquette si nécessaire → interface → contenus**.

| Ordre | Module | Remarque |
|---|---|---|
| 1 | Frais d'acquisition | Le plus simple. Le taux devient un paramètre départemental, pas un curseur générique |
| 2 | Remboursements anticipés | Le moteur est en grande partie fait dans `profile.ts`. Reste la frise et la simulation de cagnotte |
| 3 | Acheter ou louer | Le plus lourd : fiscalité locative, plus-values, trois scénarios de sortie |
| 4 | Pierre ou marchés | Module signature. Sortie en distribution, avec le même traitement pour l'immobilier et pour les marchés |
| 5 | Aides | Le plus risqué. Moteur de règles alimenté par données, barèmes PTZ récupérés sur data.gouv.fr plutôt que ressaisis |

**Règle de séquencement** : ne pas commencer un module tant que le précédent n'a pas ses tests verts. Le moteur est ce qui rend le produit crédible ; une dette de test s'y paie très cher.

---

## Phase 7 — Contenus et mise en ligne *(une semaine)*

| Étape | Outil |
|---|---|
| Glossaire relié aux infobulles | Claude Code, contenus MDX |
| Fiches pédagogiques par module | Rédaction, avec les découvertes de `INDEX.md` comme matière première |
| Page d'accueil énonçant la proposition | Claude Design puis Claude Code |
| **Vérification des paramètres réglementaires** | **Manuelle, à la source. Bloquant.** |
| Mentions légales, CGU, politique de confidentialité | À faire valider par un professionnel du droit |
| Mesure d'audience sans cookie | Claude Code |
| Métadonnées de partage reflétant le scénario | Claude Code |

---

## Outils, et à quoi chacun sert

| Outil | Usage | Ce qu'il ne faut PAS lui demander |
|---|---|---|
| **Claude Code** | Moteur, tests, implémentation, contenus | La direction artistique — il produira du correct sans caractère |
| **Claude Design** | Direction artistique, jetons, écrans de référence | Le code de production ni la logique métier |
| **`impeccable`** | Finition d'interface, accessibilité, micro-interactions | La conception initiale |
| **`skill-creator`** | Skill de domaine, une fois | Un usage répété |
| **`theme-factory`** | Pont entre maquettes et jetons en code | La création de la palette |
| **`find-skills`** | Découvrir d'autres skills utiles en cours de route | — |
| **Vercel** | Hébergement, prévisualisations par branche | Un backend, dont le projet n'a pas besoin |

---

## Rythme de travail avec Claude Code

**Une session, un ticket.** Les tickets de `TASKS.md` sont dimensionnés pour tenir dans une session sans saturer le contexte.

**Chaque session commence par lire `docs/CONTEXT.md` et le ticket.** C'est le rôle du `CLAUDE.md` minimal.

**Chaque session se termine par une mise à jour de `TASKS.md`** — avancement, décisions, points bloquants. Toute décision d'architecture rejoint `ADR.md` avec sa justification.

**Les tests passent avant de clore un ticket.** Sans exception sur le moteur.

---

## Ordre de mise en ligne recommandé

Ne pas attendre les cinq modules.

**Première mise en ligne** : module crédit seul, avec ses contenus pédagogiques. C'est déjà plus utile que la plupart des simulateurs existants, parce qu'il affiche l'usure, le HCSF, la taxonomie des paramètres et le profil d'amortissement.

**Deuxième** : frais d'acquisition et remboursements anticipés. L'ensemble couvre alors le cycle complet d'un crédit.

**Troisième** : acheter ou louer, puis pierre ou marchés.

**Dernier** : les aides, quand les barèmes sont vérifiés et automatisables.

Mettre en ligne tôt permet de confronter les explications à de vrais lecteurs. C'est la partie du produit la plus difficile à valider seul.
