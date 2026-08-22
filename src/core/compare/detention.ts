/**
 * COÛTS DE DÉTENTION ET FLUX MENSUELS COMPARÉS — `ENG-010`
 *
 * Niveau simple de « acheter ou louer » : `docs/03-spec-domaine.md` §2.
 *
 * ═══ CE QUE CE MODULE CALCULE ═══
 *
 * Deux flux de trésorerie mis côte à côte sur un horizon donné.
 *
 *   Propriétaire   échéance de crédit (reprise d'un `CreditPlan`, jamais
 *                  recalculée), taxe foncière, charges de copropriété non
 *                  récupérables, provision pour travaux, assurance habitation.
 *   Locataire      loyer révisé chaque année, charges locatives, assurance
 *                  habitation.
 *
 * ═══ ET POURQUOI IL LES CALCULE DEUX FOIS ═══
 *
 * Parce que la comparaison naturelle est fausse. La part de capital de
 * l'échéance sort du compte, mais elle n'est pas consommée : elle passe de la
 * poche « liquidités » à la poche « bien immobilier ». La compter comme une
 * dépense revient à dire qu'un virement vers son propre livret appauvrit.
 *
 * D'où les deux lectures, produites ensemble et nommées sans ambiguïté :
 *
 *   DÉCAISSEMENT   tout ce qui sort du compte. Répond à « est-ce que je peux
 *                  payer ». Systématiquement plus lourd du côté propriétaire, et
 *                  cela ne dit rien de l'enrichissement.
 *
 *   FONDS PERDUS   décaissement moins la part de capital. Intérêts, assurances,
 *                  charges, taxe foncière, entretien, frais d'entrée : ce qui
 *                  est consommé et ne revient pas. Répond à « est-ce que je
 *                  jette mon argent par les fenêtres en louant ».
 *
 * Chacune prise seule ment dans un sens différent. La première fait de l'achat
 * un gouffre, la seconde le fait paraître gratuit en oubliant que l'argent
 * immobilisé n'est plus disponible pour autre chose. Elles sortent donc
 * ensemble, avec deux années de croisement au lieu d'une. Voir ADR-012.
 *
 * ═══ CE QU'IL NE CALCULE PAS, ET QU'IL NE FAUT PAS LUI FAIRE DIRE ═══
 *
 * Ni appréciation du bien, ni coût d'opportunité de l'apport, ni fiscalité, ni
 * revente. Le croisement des fonds perdus n'est donc PAS le moment où acheter
 * devient rentable : c'est le moment où acheter cesse de consommer plus que
 * louer, ce qui est une question plus étroite. Le reste est le niveau
 * approfondi, et il vit ailleurs.
 *
 * Aucune sortie ne désigne un gagnant.
 */

import { type Cents, applyPct, roundCents, sum } from "../money";
import { MARKET_2026 } from "../assumptions/market";
import type {
  AnneeDetention,
  AnneesDeCroisement,
  ComparaisonDetention,
  EntreeDetention,
  IndexationsDetention,
  MoisDetention,
  MoisLocataire,
  MoisProprietaire,
  TotauxLocataire,
  TotauxProprietaire,
} from "./types";

/* ── Outils ───────────────────────────────────────────────────────────────── */

/** Un coût ne descend pas sous zéro. Garde les entrées absurdes et les indexations extrêmes. */
const plancherZero = (v: Cents): Cents => (v > 0 ? v : 0);

/**
 * Montant de l'année `annee` (1 = première année), indexé annuellement.
 *
 * Composé depuis la base et non de proche en proche : `base × (1 + i)^(n−1)` en
 * un seul arrondi final, plutôt qu'un arrondi par année qui dériverait. Une
 * indexation inférieure à −100 % rendrait le facteur négatif ; le plancher
 * l'absorbe plutôt que de produire un coût négatif dénué de sens.
 */
function montantIndexe(base: Cents, pctAnnuel: number, annee: number): Cents {
  if (base === 0) return 0;
  if (annee <= 1 || pctAnnuel === 0) return plancherZero(base);
  return plancherZero(roundCents(base * Math.pow(1 + pctAnnuel / 100, annee - 1)));
}

/**
 * Répartit un montant annuel sur douze mois, au centime près.
 *
 * Onze mois au quotient entier, le douzième absorbe le résidu — même convention
 * que la dernière échéance d'un échéancier, qui solde exactement. Sans elle,
 * une taxe foncière de 1 234,57 € produirait douze mois à 102,88 € dont la somme
 * ne ferait pas le compte, et l'écart se propagerait sur tout l'horizon.
 */
function ventiler(montantAnnuel: Cents): readonly Cents[] {
  const base = Math.floor(montantAnnuel / 12);
  const residu = montantAnnuel - base * 12;
  const mois: Cents[] = [];
  for (let i = 0; i < 11; i++) mois.push(base);
  mois.push(base + residu);
  return mois;
}

/** Postes annuels d'une année donnée, déjà indexés et ventilés au mois. */
interface AnneeVentilee {
  readonly taxeFonciere: readonly Cents[];
  readonly chargesCopropriete: readonly Cents[];
  readonly provisionTravaux: readonly Cents[];
  readonly assuranceHabitationProprietaire: readonly Cents[];
  readonly assuranceHabitationLocataire: readonly Cents[];
  readonly loyerMensuel: Cents;
  readonly chargesLocativesMensuelles: Cents;
}

/* ── Calcul ───────────────────────────────────────────────────────────────── */

/**
 * Compare les flux de détention d'un propriétaire et d'un locataire.
 *
 * Fonction pure. L'échéance de crédit est LUE dans `plan.rows` mois par mois ;
 * si l'horizon dépasse la durée du prêt, les mois suivants portent une échéance
 * nulle — c'est très souvent là que le croisement se produit.
 */
export function comparerDetention(entree: EntreeDetention): ComparaisonDetention {
  const horizonMois = Math.max(0, Math.floor(entree.horizonMois));
  const marche = (entree.hypotheses ?? MARKET_2026).detention;
  const releveHypotheses = (entree.hypotheses ?? MARKET_2026).releve;

  const indexations: IndexationsDetention = {
    loyerPctAnnuel: entree.indexations?.loyerPctAnnuel ?? marche.indexationLoyerPctAnnuel.valeur,
    taxeFoncierePctAnnuel:
      entree.indexations?.taxeFoncierePctAnnuel ?? marche.indexationTaxeFoncierePctAnnuel.valeur,
    chargesPctAnnuel:
      entree.indexations?.chargesPctAnnuel ?? marche.indexationChargesPctAnnuel.valeur,
  };

  const p = entree.proprietaire;
  const l = entree.locataire;
  const provisionTravauxPctAnnuel =
    p.provisionTravauxPctAnnuel ?? marche.provisionTravauxPctAnnuel.valeur;

  // Bases de la première année. Tout est ramené au positif : une valeur de bien
  // ou une charge négative n'a pas de sens, et un plancher vaut mieux qu'une
  // sortie absurde qui se propagerait jusqu'au croisement.
  const baseTaxeFonciere = plancherZero(p.taxeFonciereAnnuelle);
  const baseChargesCopro = plancherZero(p.chargesCoproprieteAnnuelles);
  const baseAssuranceProprietaire = plancherZero(p.assuranceHabitationAnnuelle);
  const baseProvisionTravaux = plancherZero(
    applyPct(plancherZero(p.valeurBien), provisionTravauxPctAnnuel),
  );
  const baseLoyer = plancherZero(l.loyerMensuelHorsCharges);
  const baseChargesLocatives = plancherZero(l.chargesLocativesMensuelles);
  const baseAssuranceLocataire = plancherZero(l.assuranceHabitationAnnuelle);
  const fraisInitiaux = plancherZero(p.fraisInitiauxNonRecuperables ?? 0);

  const echeances = p.plan?.rows ?? [];

  const cacheAnnees = new Map<number, AnneeVentilee>();
  const anneeVentilee = (annee: number): AnneeVentilee => {
    const dejaVue = cacheAnnees.get(annee);
    if (dejaVue) return dejaVue;
    const iCharges = indexations.chargesPctAnnuel;
    const calculee: AnneeVentilee = {
      taxeFonciere: ventiler(
        montantIndexe(baseTaxeFonciere, indexations.taxeFoncierePctAnnuel, annee),
      ),
      chargesCopropriete: ventiler(montantIndexe(baseChargesCopro, iCharges, annee)),
      provisionTravaux: ventiler(montantIndexe(baseProvisionTravaux, iCharges, annee)),
      assuranceHabitationProprietaire: ventiler(
        montantIndexe(baseAssuranceProprietaire, iCharges, annee),
      ),
      assuranceHabitationLocataire: ventiler(
        montantIndexe(baseAssuranceLocataire, iCharges, annee),
      ),
      loyerMensuel: montantIndexe(baseLoyer, indexations.loyerPctAnnuel, annee),
      chargesLocativesMensuelles: montantIndexe(baseChargesLocatives, iCharges, annee),
    };
    cacheAnnees.set(annee, calculee);
    return calculee;
  };

  const mois: MoisDetention[] = [];
  for (let m = 1; m <= horizonMois; m++) {
    const annee = Math.ceil(m / 12);
    const rang = (m - 1) % 12; // rang du mois DANS son année, à partir de 0
    const v = anneeVentilee(annee);
    const echeance = echeances[m - 1];

    const interets = echeance?.interest ?? 0;
    const capital = echeance?.principal ?? 0;
    const assuranceEmprunteur = echeance?.insurance ?? 0;
    const taxeFonciere = v.taxeFonciere[rang] ?? 0;
    const chargesCopropriete = v.chargesCopropriete[rang] ?? 0;
    const provisionTravaux = v.provisionTravaux[rang] ?? 0;
    const assuranceHabitation = v.assuranceHabitationProprietaire[rang] ?? 0;
    const fraisDuMois = m === 1 ? fraisInitiaux : 0;

    const decaissementProprietaire =
      interets +
      capital +
      assuranceEmprunteur +
      taxeFonciere +
      chargesCopropriete +
      provisionTravaux +
      assuranceHabitation +
      fraisDuMois;

    const proprietaire: MoisProprietaire = {
      interets,
      capital,
      assuranceEmprunteur,
      taxeFonciere,
      chargesCopropriete,
      provisionTravaux,
      assuranceHabitation,
      fraisInitiaux: fraisDuMois,
      decaissement: decaissementProprietaire,
      // L'unique ligne qui porte tout le propos du module.
      fondsPerdus: decaissementProprietaire - capital,
    };

    const assuranceLocataire = v.assuranceHabitationLocataire[rang] ?? 0;
    const decaissementLocataire =
      v.loyerMensuel + v.chargesLocativesMensuelles + assuranceLocataire;

    const locataire: MoisLocataire = {
      loyer: v.loyerMensuel,
      chargesLocatives: v.chargesLocativesMensuelles,
      assuranceHabitation: assuranceLocataire,
      decaissement: decaissementLocataire,
      // Égalité voulue : le locataire ne constitue rien.
      fondsPerdus: decaissementLocataire,
    };

    mois.push({ mois: m, annee, proprietaire, locataire });
  }

  const annees = agregerParAnnee(mois);

  return {
    horizonMois,
    mois,
    annees,
    croisement: anneesDeCroisement(annees),
    totaux: totaliser(mois),
    parametres: { indexations, provisionTravauxPctAnnuel, releveHypotheses },
  };
}

/* ── Agrégations ──────────────────────────────────────────────────────────── */

function agregerParAnnee(mois: readonly MoisDetention[]): AnneeDetention[] {
  const out: AnneeDetention[] = [];
  const annees = [...new Set(mois.map((m) => m.annee))].sort((a, b) => a - b);

  let cumulDecProprietaire = 0;
  let cumulPerdusProprietaire = 0;
  let cumulDecLocataire = 0;
  let cumulPerdusLocataire = 0;

  for (const annee of annees) {
    const g = mois.filter((m) => m.annee === annee);
    const pro = g.map((m) => m.proprietaire);
    const loc = g.map((m) => m.locataire);

    const decProprietaire = sum(pro.map((x) => x.decaissement));
    const perdusProprietaire = sum(pro.map((x) => x.fondsPerdus));
    const decLocataire = sum(loc.map((x) => x.decaissement));
    const perdusLocataire = sum(loc.map((x) => x.fondsPerdus));

    cumulDecProprietaire += decProprietaire;
    cumulPerdusProprietaire += perdusProprietaire;
    cumulDecLocataire += decLocataire;
    cumulPerdusLocataire += perdusLocataire;

    out.push({
      annee,
      moisCouverts: g.length,
      proprietaire: {
        interets: sum(pro.map((x) => x.interets)),
        capital: sum(pro.map((x) => x.capital)),
        assuranceEmprunteur: sum(pro.map((x) => x.assuranceEmprunteur)),
        taxeFonciere: sum(pro.map((x) => x.taxeFonciere)),
        chargesCopropriete: sum(pro.map((x) => x.chargesCopropriete)),
        provisionTravaux: sum(pro.map((x) => x.provisionTravaux)),
        assuranceHabitation: sum(pro.map((x) => x.assuranceHabitation)),
        fraisInitiaux: sum(pro.map((x) => x.fraisInitiaux)),
        decaissement: decProprietaire,
        fondsPerdus: perdusProprietaire,
        cumulDecaissement: cumulDecProprietaire,
        cumulFondsPerdus: cumulPerdusProprietaire,
      },
      locataire: {
        loyer: sum(loc.map((x) => x.loyer)),
        chargesLocatives: sum(loc.map((x) => x.chargesLocatives)),
        assuranceHabitation: sum(loc.map((x) => x.assuranceHabitation)),
        decaissement: decLocataire,
        fondsPerdus: perdusLocataire,
        cumulDecaissement: cumulDecLocataire,
        cumulFondsPerdus: cumulPerdusLocataire,
      },
      ecartCumulDecaissement: cumulDecProprietaire - cumulDecLocataire,
      ecartCumulFondsPerdus: cumulPerdusProprietaire - cumulPerdusLocataire,
    });
  }

  return out;
}

/**
 * Première année où le cumul du propriétaire atteint ou passe sous celui du
 * locataire, dans chacune des deux lectures.
 *
 * Comparaison sur des CUMULS et non sur des flux annuels : ce qui intéresse
 * l'utilisateur est le moment où l'ensemble de ce qu'il a versé depuis le début
 * repasse sous ce qu'il aurait versé en louant, pas le premier mois isolé où sa
 * mensualité descend sous un loyer.
 *
 * L'égalité compte comme un croisement — d'où `<=`. Le seul cas où elle se
 * produit vraiment est celui où les deux côtés sont nuls, et répondre « jamais »
 * y serait plus trompeur que « dès la première année ».
 */
function anneesDeCroisement(annees: readonly AnneeDetention[]): AnneesDeCroisement {
  const premiere = (predicat: (a: AnneeDetention) => boolean): number | null => {
    const trouvee = annees.find(predicat);
    return trouvee === undefined ? null : trouvee.annee;
  };
  return {
    decaissement: premiere(
      (a) => a.proprietaire.cumulDecaissement <= a.locataire.cumulDecaissement,
    ),
    fondsPerdus: premiere((a) => a.proprietaire.cumulFondsPerdus <= a.locataire.cumulFondsPerdus),
  };
}

function totaliser(mois: readonly MoisDetention[]): ComparaisonDetention["totaux"] {
  const pro = mois.map((m) => m.proprietaire);
  const loc = mois.map((m) => m.locataire);

  const decaissementProprietaire = sum(pro.map((x) => x.decaissement));
  const fondsPerdusProprietaire = sum(pro.map((x) => x.fondsPerdus));

  const proprietaire: TotauxProprietaire = {
    interets: sum(pro.map((x) => x.interets)),
    capital: sum(pro.map((x) => x.capital)),
    assuranceEmprunteur: sum(pro.map((x) => x.assuranceEmprunteur)),
    taxeFonciere: sum(pro.map((x) => x.taxeFonciere)),
    chargesCopropriete: sum(pro.map((x) => x.chargesCopropriete)),
    provisionTravaux: sum(pro.map((x) => x.provisionTravaux)),
    assuranceHabitation: sum(pro.map((x) => x.assuranceHabitation)),
    fraisInitiaux: sum(pro.map((x) => x.fraisInitiaux)),
    decaissement: decaissementProprietaire,
    fondsPerdus: fondsPerdusProprietaire,
    capitalConstitue: decaissementProprietaire - fondsPerdusProprietaire,
  };

  const decaissementLocataire = sum(loc.map((x) => x.decaissement));
  const locataire: TotauxLocataire = {
    loyer: sum(loc.map((x) => x.loyer)),
    chargesLocatives: sum(loc.map((x) => x.chargesLocatives)),
    assuranceHabitation: sum(loc.map((x) => x.assuranceHabitation)),
    decaissement: decaissementLocataire,
    fondsPerdus: sum(loc.map((x) => x.fondsPerdus)),
  };

  return {
    proprietaire,
    locataire,
    ecartDecaissement: decaissementProprietaire - decaissementLocataire,
    ecartFondsPerdus: fondsPerdusProprietaire - locataire.fondsPerdus,
  };
}
