# UI-024 — Étude : le câblage des trois sorties dans `/comparaison/patrimoine`

*Étude menée le 25 août 2026, sur pièce — l'écran, ses composants, ses gardes et
ses clés d'URL ont été lus en entier. La décision de forme qui en sort est
consignée en ADR-022.*

## 1. Ce qui existe, et qui décide de presque tout

L'écran de `UI-007` est construit autour d'un fait : **la sortie chiffrée est la
vente**, balayée année par année. Les courbes tracent le produit net de vente
contre le portefeuille du locataire de référence ; le `PanneauSortie` décrit
cette vente ; le `DecompteSortie` la détaille poste par poste. Trois ancrages
serviront le câblage tels quels :

- **`TROIS_SORTIES` dans `src/lib/patrimoine.ts`** — l'état des sorties est une
  donnée (`modelisee`), dont tout se déduit : la prose du bloc, la phrase du
  bandeau d'incertitude (`data-une-sortie`), jusqu'à la description de la page.
  C'est la leçon d'`UI-014`, déjà appliquée : basculer deux booléens mettra
  l'écran entier d'accord.
- **Les dix-sept clés du niveau simple** portent déjà la taxe foncière (`tf`),
  les charges de copropriété (`cc`), l'assurance habitation (`ah`), la provision
  travaux (`pt`), les trois indexations, le prix, l'horizon et le plan de
  financement. Les scénarios locatifs les **reprennent** au lieu de les
  redemander — même discipline que le panneau du niveau simple, repris tel quel.
- **Les primitives** — `SelecteurSegmente`, `ListeDeroulante` à familles,
  `ChampMontant`, `ChampTaux`, `ChampHypothese` avec intervalle et fiabilité —
  couvrent tous les contrôles nécessaires. Aucune primitive nouvelle.

## 2. La question de forme, et la décision

**Une location n'est pas un point sur les courbes.** La vente tombe à une date ;
la mise en location est un récit — des flux annuels, puis une revente plus tard.
La superposer aux courbes exigerait de comparer des patrimoines à des dates
différentes, ou de prolonger le portefeuille du locataire au-delà de l'horizon,
ce qu'aucun moteur ne fait. Additionner des euros de dates différentes sans
actualisation serait précisément le genre de biais que ce module existe pour
dénoncer.

**Décision (ADR-022).** L'analyse principale — courbes, retournement, décompte —
reste ce qu'elle est : la vente à l'horizon contre le portefeuille. Les deux
sorties locatives vivent dans la section « trois sorties », qui cesse d'être une
déclaration d'absence pour devenir **le lieu où elles se chiffrent** : un
sélecteur segmenté (vente · longue durée · courte durée), l'onglet vente
renvoyant au décompte au-dessus, chaque onglet locatif portant ses champs et son
décompte. Chaque récit tombe à ses propres dates, et l'écran le dit au lieu de
forcer une comparaison.

## 3. Les champs, leur famille, leurs clés

Le strict nécessaire est saisi ; le reste vient des hypothèses de marché,
affichées avec leur fiabilité. Dix clés nouvelles, aucune collision avec les
vingt-quatre existantes :

| Champ | Clé | Famille | Défaut |
|---|---|---|---|
| Sortie regardée | `so` | — (cadrage, mais il change les chiffres affichés : il entre dans l'URL) | `vente` |
| Durée de mise en location (années) | `dl` | contraint | 8 |
| Taux marginal d'imposition | `tm` | contraint — liste des cinq taux du barème | 30 |
| Loyer mensuel de marché (LD) | `lm` | contraint | 1 000 € |
| Régime locatif (LD) | `rl` | contraint — micro-foncier, réel nu, micro-BIC, réel meublé | micro-foncier |
| Régime (CD) | `rc` | contraint — tourisme classé, non classé, réel meublé | tourisme classé |
| Tarif par nuit (CD) | `tn` | contraint | 90 € |
| Taux d'occupation (CD) | `oc` | contraint — milieu de la fourchette, sans autorité | 52,5 % |
| Ameublement initial (CD) | `am` | contraint | 8 000 € |
| Charges d'exploitation (CD) | `ce` | contraint | 2 400 € |

Réutilisés sans nouvelle clé : `tf` (taxe foncière), `cc` (copropriété non
récupérable en longue durée, incluse dans l'exploitation en courte), `ah`
(l'assurance habitation saisie tient lieu d'assurance propriétaire non
occupant — approximation déclarée dans les limites de la section), `pt`,
`il`/`it`/`ic`, `px`, `hz` (le mois de mise en location est l'horizon projeté),
et le plan de financement entier.

**Non saisis, volontairement** : vacance, frais de gestion, commission de
plateforme, conciergerie, taux et assiette d'amortissement. Ce sont les
hypothèses de `market.location`, affichées dans la section avec leur valeur,
leur intervalle et leur fiabilité — comme le niveau simple affiche les siennes.
Les ouvrir en champs viendra si l'usage le demande ; dix champs nouveaux
suffisent largement à un écran qui doit rester utilisable.

Le taux marginal d'imposition est une **liste** (0, 11, 30, 41, 45), pas un
champ libre : ce sont les taux du barème, et une liste dit d'où ils viennent.

## 4. Ce que chaque onglet affiche

Dans l'ordre, et l'ordre est celui d'ADR-015 — la limite avant le chiffre :

1. **Les hypothèses employées**, avec fiabilité (vacance 2,5 % estimée, gestion
   7 %, ou commission 16 % et conciergerie 25 % en courte durée).
2. **L'année 1 poste par poste** — loyers ou revenus, vacance ou commission et
   conciergerie, charges, mensualités toujours dues, impôt avec son taux de
   prélèvements sociaux (17,2 % en nue, 18,6 % en meublée : l'écart s'affiche,
   c'est un enseignement), flux net — **qui a le droit d'être négatif**.
3. **Les totaux sur la durée**, et les reports restants s'il y en a.
4. **La revente au terme** — produit net, et la minoration du prix
   d'acquisition par les amortissements déduits quand le réel meublé l'a permis.
5. **Les alertes de seuil** — micro inéligible, affiliation de la courte
   durée — rendues avec le seuil et les recettes, jamais en jugement.
6. **Les réserves du scénario**, visibles sans interaction.

## 5. Ce que deviennent les gardes

- `data-modelisee` passe à `oui` pour les trois ; la garde e2e « deux des trois
  sorties sont annoncées comme non modélisées » devient « les trois sorties sont
  chiffrées » et vérifie le sélecteur, la saisie d'un loyer, l'affichage d'un
  impôt et le transport par URL.
- Les textes de `TROIS_SORTIES` se réécrivent : ils décrivaient ce qui manquait,
  ils décrivent ce qui est calculé — et ses limites.
- La phrase du bandeau (`data-une-sortie`) se déduit du compte, comme la
  description de la page : « les trois sorties sont chiffrées ».
- Les tests existants du décompte de vente ne bougent pas : l'onglet vente est
  l'état par défaut, et l'analyse principale est inchangée.

## 6. Ce que cette étude écarte

- **Une quatrième courbe** ou une trajectoire locative superposée : dates
  incomparables, moteur de prolongement inexistant — refusé en ADR-022.
- **Un « meilleur choix » entre vendre et louer** : le produit ne recommande
  pas ; il pose les deux récits côte à côte, chacun daté.
- **La saisie des hypothèses de marché locatives** : remis à plus tard,
  l'affichage avec fiabilité suffit à l'honnêteté.
- **Le régime social EEE/Suisse sur les loyers** : le moteur le refuse déjà en
  réserve ; l'écran n'ouvre pas ce qu'il ne peut pas expliquer.
