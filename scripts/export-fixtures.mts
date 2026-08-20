/**
 * EXPORT DE FIXTURES POUR LE DESIGN
 *
 * Produit des sorties RÉELLES du moteur, destinées à Claude Design. Le but est
 * qu'aucune maquette ne soit dessinée sur des chiffres inventés : ni la longueur
 * du tableau, ni la largeur des montants, ni les cas non conformes.
 *
 * Ce script vit hors de src/core/ et n'y touche pas. Il ne fait qu'appeler.
 *
 *   node scripts/export-fixtures.mts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { euros, toEuros, type Cents } from "../src/core/money";
import { PARAMS_2026 } from "../src/core/fiscal/params";
import type { LoanSpec } from "../src/core/credit/schedule";
import type { InsuranceSpec } from "../src/core/credit/insurance";
import {
  buildCreditPlan,
  type CreditPlanInput,
  type CreditPlan,
} from "../src/core/credit/plan";
import {
  amortisationProfile,
  interestShareMilestones,
  prepaymentEfficiencyWindows,
} from "../src/core/credit/profile";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const fmt = (c: Cents): string => EUR.format(toEuros(c));
const pct = (v: number): string => `${v.toFixed(2).replace(".", ",")} %`;

interface Scenario {
  readonly id: string;
  readonly label: string;
  readonly why: string;
  readonly input: CreditPlanInput;
  /** Taux servant à lire le profil : celui du prêt principal. */
  readonly profileRatePct: number;
}

const insurance = (
  annualRatePct: number,
  basis: InsuranceSpec["basis"],
  coveragePct: number,
): InsuranceSpec => ({ annualRatePct, basis, coveragePct });

const loan = (
  id: string,
  label: string,
  principal: Cents,
  annualRatePct: number,
  months: number,
  extra: Partial<Pick<LoanSpec, "deferredMonths" | "deferral">> = {},
): LoanSpec => ({ id, label, principal, annualRatePct, months, ...extra });

const SCENARIOS: readonly Scenario[] = [
  {
    id: "01-achat-modeste",
    label: "Achat modeste",
    why: "Le cas nominal. Fixe la grille, la largeur des montants, la longueur du tableau a 20 ans.",
    profileRatePct: 3.2,
    input: {
      loans: [loan("principal", "Prêt principal", euros(180_000), 3.2, 240)],
      insurance: insurance(0.3, "initial", 100),
      guarantee: "suretyship",
      arrangementFee: euros(900),
      propertyPrice: euros(205_000),
      netMonthlyIncome: euros(3_800),
    },
  },
  {
    id: "02-achat-tendu-hcsf",
    label: "Achat tendu, non conforme HCSF",
    why: "Endettement au-dela du plafond. L'interface doit signaler la non-conformite sans juger l'utilisateur.",
    profileRatePct: 3.9,
    input: {
      loans: [loan("principal", "Prêt principal", euros(420_000), 3.9, 300)],
      insurance: insurance(0.34, "initial", 100),
      guarantee: "mortgage",
      arrangementFee: euros(1_500),
      propertyPrice: euros(465_000),
      netMonthlyIncome: euros(6_080),
      otherDebtService: euros(180),
    },
  },
  {
    id: "03-ptz-differe",
    label: "PTZ en différé",
    why: "La mensualite TOTALE grimpe a la fin du differe. C'est maxPayment qui compte, pas firstPayment.",
    profileRatePct: 3.5,
    input: {
      loans: [
        loan("principal", "Prêt principal", euros(200_000), 3.5, 300),
        loan("ptz", "Prêt à taux zéro", euros(60_000), 0, 300, {
          deferredMonths: 120,
          deferral: "total",
        }),
      ],
      insurance: insurance(0.32, "outstanding", 100),
      guarantee: "suretyship",
      arrangementFee: euros(1_200),
      propertyPrice: euros(285_000),
      netMonthlyIncome: euros(4_500),
      eligibleForExtendedDuration: true,
    },
  },
  {
    id: "04-seuil-usure",
    label: "Proche du seuil d'usure",
    why: "Le taux nominal passe, l'assurance fait franchir le seuil d'usure de 0,13 point. L'interface doit montrer le mur ET son responsable.",
    profileRatePct: 4.35,
    input: {
      loans: [loan("principal", "Prêt principal", euros(250_000), 4.35, 300)],
      insurance: insurance(0.5, "initial", 100),
      guarantee: "mortgage",
      arrangementFee: euros(1_500),
      propertyPrice: euros(290_000),
      netMonthlyIncome: euros(5_600),
    },
  },
];

function build(s: Scenario) {
  const plan: CreditPlan = buildCreditPlan(s.input, PARAMS_2026);
  const profile = amortisationProfile(plan.rows, s.profileRatePct);
  const milestones = interestShareMilestones(plan.rows);
  const windows = prepaymentEfficiencyWindows(s.profileRatePct, plan.rows.length);

  return {
    _role:
      "Fixture produite par le moteur, non editee a la main. Destinee au travail de design. " +
      "Les champs *_eur sont la mise en forme francaise des centimes.",
    meta: { id: s.id, label: s.label, why: s.why, vintage: plan.vintage },
    entree: {
      prets: s.input.loans.map((l) => ({
        label: l.label,
        capital_eur: fmt(l.principal),
        taux: pct(l.annualRatePct),
        duree_mois: l.months,
        differe_mois: l.deferredMonths ?? 0,
      })),
      assurance: {
        taux: pct(s.input.insurance.annualRatePct),
        base: s.input.insurance.basis === "initial" ? "capital initial" : "capital restant du",
        quotite: `${s.input.insurance.coveragePct} %`,
      },
      garantie: s.input.guarantee,
      revenu_net_mensuel_eur: fmt(s.input.netMonthlyIncome),
      prix_du_bien_eur: fmt(s.input.propertyPrice),
    },
    indicateurs: {
      premiere_mensualite_eur: fmt(plan.firstPayment),
      mensualite_maximale_eur: fmt(plan.maxPayment),
      capital_total_eur: fmt(plan.totalPrincipal),
      interets_total_eur: fmt(plan.totalInterest),
      assurance_total_eur: fmt(plan.totalInsurance),
      frais_initiaux_eur: fmt(plan.upfrontFees),
      cout_total_credit_eur: fmt(plan.totalCreditCost),
      taeg: pct(plan.aprPct),
      taea: pct(plan.taeaPct),
      mois_de_bascule: plan.crossoverMonth,
      nombre_echeances: plan.rows.length,
    },
    garantie: {
      type: plan.guarantee.kind,
      cout_eur: fmt(plan.guarantee.cost),
      restitue_au_terme_eur: fmt(plan.guarantee.refundAtTerm),
      mainlevee_si_revente_eur: fmt(plan.guarantee.releaseCostOnEarlySale),
    },
    usure: {
      conforme: plan.usury.compliant,
      seuil: pct(plan.usury.threshold),
      taeg: pct(plan.usury.apr),
      marge_restante_points: plan.usury.headroomPoints.toFixed(2).replace(".", ","),
      trimestre: plan.usury.quarter,
    },
    hcsf: {
      conforme: plan.hcsf.compliant,
      taux_effort: pct(plan.hcsf.debtRatioPct),
      plafond: pct(plan.hcsf.maxDebtRatioPct),
      taux_effort_conforme: plan.hcsf.debtRatioCompliant,
      duree_max_mois: plan.hcsf.maxDurationMonths,
      duree_conforme: plan.hcsf.durationCompliant,
      marge_derogatoire: pct(plan.hcsf.flexibilityMarginPct),
    },
    profil_amortissement: {
      dix_premieres: {
        interets_eur: fmt(profile.opening.interest),
        capital_eur: fmt(profile.opening.principal),
        part_interets: pct(profile.opening.interestSharePct),
      },
      dix_dernieres: {
        interets_eur: fmt(profile.closing.interest),
        capital_eur: fmt(profile.closing.principal),
        part_interets: pct(profile.closing.interestSharePct),
      },
      rapport_ouverture_cloture: profile.openingToClosingRatio.toFixed(1).replace(".", ","),
      interets_domines_des_la_premiere_echeance: profile.frontLoadedFromFirstPayment,
      mois_de_bascule: profile.crossoverMonth,
      mediane_interets_mois: profile.interestMidpointMonth,
      mediane_capital_mois: profile.principalMidpointMonth,
      ecart_des_medianes_mois: profile.skewMonths,
    },
    jalons_de_constitution: milestones.map((m) => ({
      seuil: `${m.thresholdPct} %`,
      mois: m.month,
      annee: m.year,
      capital_rembourse: pct(m.principalRepaidPct),
      interets_payes: pct(m.interestPaidPct),
    })),
    fenetres_de_remboursement_anticipe: windows.map((w) => ({
      rendement_vise: `${w.yieldThresholdPct} %`,
      dernier_mois: w.lastMonth,
      derniere_annee: w.lastYear,
      part_de_la_duree: pct(w.windowSharePct),
    })),
    tableau_annuel: plan.annual.map((a) => ({
      annee: a.year,
      interets_eur: fmt(a.interest),
      capital_eur: fmt(a.principal),
      assurance_eur: fmt(a.insurance),
      echeances_eur: fmt(a.payment),
      restant_du_eur: fmt(a.closingBalance),
    })),
    tableau_mensuel: plan.rows.map((r) => ({
      mois: r.month,
      annee: r.year,
      interets_eur: fmt(r.interest),
      capital_eur: fmt(r.principal),
      assurance_eur: fmt(r.insurance),
      echeance_eur: fmt(r.payment),
      restant_du_eur: fmt(r.balance),
    })),
  };
}

mkdirSync("fixtures", { recursive: true });
for (const s of SCENARIOS) {
  const data = build(s);
  writeFileSync(`fixtures/${s.id}.json`, JSON.stringify(data, null, 2), "utf8");
  const i = data.indicateurs;
  console.log(
    `${s.id.padEnd(22)} ${i.nombre_echeances} echeances | 1re ${i.premiere_mensualite_eur} | ` +
      `max ${i.mensualite_maximale_eur} | TAEG ${i.taeg} | ` +
      `usure ${data.usure.conforme ? "OK" : "DEPASSE"} | ` +
      `HCSF ${data.hcsf.conforme ? "OK" : "NON CONFORME"}`,
  );
}
console.log(`\n${SCENARIOS.length} fixtures ecrites dans fixtures/`);
