import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, ComposedChart, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

/* ═══ Jetons ══════════════════════════════════════════════════════════════ */
const C = {
  paper: "#EDF0F3", panel: "#F7F9FA", ink: "#16202B", ink60: "#5A6B7B",
  rule: "#C6CFD8", capital: "#1F6B5C", interet: "#B4472E", assur: "#786A99",
  brass: "#B0812A", airbnb: "#2F6690",
};
const eur = (n, d = 0) => new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", minimumFractionDigits: d, maximumFractionDigits: d,
}).format(Number.isFinite(n) ? n : 0);
const pct = (n, d = 1) => `${(Number.isFinite(n) ? n : 0).toFixed(d).replace(".", ",")} %`;
const signed = (n) => (n >= 0 ? "+" : "−") + eur(Math.abs(n)).replace("−", "");

/* ═══ Moteur crédit ═══════════════════════════════════════════════════════ */
function schedule({ capital, annualRate, months, differe = 0 }) {
  const rows = [];
  if (capital <= 0 || months <= 0) return rows;
  const r = annualRate / 100 / 12;
  const amort = Math.max(1, months - differe);
  const pay = r === 0 ? capital / amort : (capital * r) / (1 - Math.pow(1 + r, -amort));
  let bal = capital;
  for (let m = 1; m <= months; m++) {
    if (m <= differe) { rows.push({ m, interest: 0, principal: 0, payment: 0, balance: bal }); continue; }
    const interest = bal * r;
    let principal = pay - interest;
    if (m === months || principal > bal) principal = bal;
    bal = Math.max(0, bal - principal);
    rows.push({ m, interest, principal, payment: interest + principal, balance: bal });
  }
  return rows;
}
function irr(net, payments) {
  const f = (r) => payments.reduce((s, p, i) => s + p / Math.pow(1 + r, i + 1), 0) - net;
  let lo = 0, hi = 0.05;
  if (f(hi) > 0) return NaN;
  for (let i = 0; i < 250; i++) { const mid = (lo + hi) / 2; f(mid) > 0 ? (lo = mid) : (hi = mid); }
  return (lo + hi) / 2;
}
function buildCredit(p) {
  const notaire = p.prix * p.notairePct / 100;
  const coutOp = p.prix + notaire + p.agence + p.travaux;
  const ptz = p.ptzOn ? Math.max(0, p.ptzMt) : 0;
  const cmp = p.compOn ? Math.max(0, p.compMt) : 0;
  const brut = Math.max(0, coutOp - p.apport);
  const besoin = Math.max(0, coutOp + p.fraisDossier + brut * p.garPct / 100 - p.apport);
  const capitalPrincipal = Math.max(0, besoin - ptz - cmp);
  const coutGarantie = capitalPrincipal * p.garPct / 100;
  const capitalTotal = capitalPrincipal + ptz + cmp;

  const sP = schedule({ capital: capitalPrincipal, annualRate: p.taux, months: p.annees * 12 });
  const sZ = schedule({ capital: ptz, annualRate: 0, months: p.ptzDuree * 12, differe: p.ptzDiffere * 12 });
  const sC = schedule({ capital: cmp, annualRate: p.compTaux, months: p.compAnnees * 12 });
  const n = Math.max(sP.length, sZ.length, sC.length);
  const q = p.quotite / 100;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const z = { interest: 0, principal: 0, payment: 0, balance: 0 };
    const a = sP[i] || z, b = sZ[i] || z, c = sC[i] || z;
    const prev = i === 0 ? capitalTotal : rows[i - 1].balance;
    const base = p.assurBase === "initial" ? capitalTotal : prev;
    const insurance = base * (p.assurTaux / 100 / 12) * q;
    rows.push({
      m: i + 1, annee: Math.ceil((i + 1) / 12),
      interest: a.interest + b.interest + c.interest,
      principal: a.principal + b.principal + c.principal,
      insurance, balance: a.balance + b.balance + c.balance,
      payment: a.payment + b.payment + c.payment + insurance,
    });
  }
  const tot = rows.reduce((s, r) => ({ i: s.i + r.interest, p: s.p + r.principal, a: s.a + r.insurance }), { i: 0, p: 0, a: 0 });
  const fraisAnnexes = p.fraisDossier + coutGarantie;
  const rM = irr(capitalTotal - fraisAnnexes, rows.map((r) => r.payment));
  const annuel = [];
  for (let y = 1; y <= Math.ceil(n / 12); y++) {
    const g = rows.filter((r) => r.annee === y);
    if (g.length) annuel.push({
      y, interest: g.reduce((s, r) => s + r.interest, 0),
      principal: g.reduce((s, r) => s + r.principal, 0),
      insurance: g.reduce((s, r) => s + r.insurance, 0),
      balance: g[g.length - 1].balance,
      payment: g.reduce((s, r) => s + r.payment, 0),
    });
  }
  return {
    notaire, coutOp, capitalPrincipal, ptz, cmp, capitalTotal, coutGarantie, fraisAnnexes,
    rows, annuel, tot, mens1: rows[0]?.payment || 0,
    mensMax: rows.length ? Math.max(...rows.map((r) => r.payment)) : 0,
    coutCredit: tot.i + tot.a + fraisAnnexes,
    taegV: Number.isFinite(rM) ? (Math.pow(1 + rM, 12) - 1) * 100 : NaN,
    bascule: rows.findIndex((r) => r.principal >= r.interest) + 1,
    restitution: coutGarantie * p.garRestit / 100,
    at: (y) => rows[Math.min(rows.length - 1, y * 12 - 1)] || rows[rows.length - 1] || { balance: 0, m: 0 },
  };
}

/* ═══ Moteur plus-value ═══════════════════════════════════════════════════ */
const abIR = (y) => y < 6 ? 0 : y >= 22 ? 1 : Math.min(1, (Math.min(y, 21) - 5) * 0.06);
const abPS = (y) => y < 6 ? 0 : y >= 30 ? 1 : y <= 21 ? (y - 5) * 0.0165 : y === 22 ? 0.28 : Math.min(1, 0.28 + (y - 22) * 0.09);
function surtaxe(pv) {
  const b = [[50000, .02], [100000, .02], [150000, .03], [200000, .04], [250000, .05], [Infinity, .06]];
  if (pv <= 50000) return 0;
  for (const [cap, t] of b) if (pv <= cap) return pv * t;
  return pv * .06;
}

/* ═══ Moteur comparaison ══════════════════════════════════════════════════ */
function buildCompare(p, R, q) {
  const hD = Math.max(1, q.hDepart), hF = Math.max(hD, q.hFinal);
  const g = q.appreciation / 100, il = q.inflLoyer / 100;
  const rPlac = q.rendement / 100 * (q.placTaxe ? 0.7 : 1);

  /* ── Vue A : flux mensuels ── */
  const years = [];
  for (let y = 1; y <= Math.max(hF, p.annees); y++) {
    const a = R.annuel[y - 1];
    const mens = a ? a.payment / 12 : 0;
    const valeur = p.prix * Math.pow(1 + g, y);
    const detention = (q.taxeFonciere * Math.pow(1.02, y - 1)) / 12 + q.chargesCopro + valeur * q.provTravaux / 100 / 12 + q.mrhProprio;
    const proprio = mens + detention;
    const fondsPerdus = (a ? (a.interest + a.insurance) / 12 : 0) + detention;
    const loyer = q.loyer * Math.pow(1 + il, y - 1) + q.chargesLoc + q.mrhLoc;
    years.push({ y, proprio, loyer, fondsPerdus, ecart: proprio - loyer, ecartFP: fondsPerdus - loyer, valeur, mens, detention });
  }
  const croise = years.find((r) => r.proprio <= r.loyer)?.y ?? null;
  const croiseFP = years.find((r) => r.fondsPerdus <= r.loyer)?.y ?? null;

  /* ── Locataire de référence ── */
  const rm = Math.pow(1 + rPlac, 1 / 12) - 1;
  let ptf = p.apport;
  for (let m = 1; m <= hD * 12; m++) {
    const y = Math.ceil(m / 12);
    const row = years[y - 1];
    ptf = ptf * (1 + rm) + Math.max(0, row.proprio - row.loyer);
  }
  const ptfLoc = ptf * Math.pow(1 + rPlac, hF - hD);

  /* ── Valeurs de sortie ── */
  const valD = p.prix * Math.pow(1 + g, hD);
  const valF = p.prix * Math.pow(1 + g, hF);
  const crdD = R.at(hD).balance, crdF = R.at(hF).balance;
  const iraD = q.iraZero ? 0 : Math.min(crdD * .03, (R.annuel[hD] ? R.annuel[hD].interest : 0) / 2);
  const iraF = q.iraZero ? 0 : Math.min(crdF * .03, (R.annuel[hF] ? R.annuel[hF].interest : 0) / 2);
  const mainlevee = p.garType === "hypotheque" ? p.prix * .004 : 0;
  const prixMajore = p.prix + R.notaire + p.travaux + (q.forfaitTravaux ? p.prix * .15 : 0);
  const psRate = q.residence === "france" ? 17.2 : q.residence === "eee" ? 7.5 : 17.2;

  function plusValue(prixVente, detentionAns, amortReintegre = 0) {
    const brut = Math.max(0, prixVente - prixVente * q.fraisAgence / 100 - prixMajore) + amortReintegre;
    const baseIR = brut * (1 - abIR(detentionAns));
    const basePS = brut * (1 - abPS(detentionAns));
    const impot = baseIR * .19 + basePS * psRate / 100 + surtaxe(baseIR);
    return { brut, impot };
  }

  /* ── A : vente au départ (exonération RP) ── */
  const netVente = valD - valD * q.fraisAgence / 100 - crdD - iraD - mainlevee + R.restitution;
  const A = {
    id: "vente", label: "Vente au départ", color: C.capital,
    lignes: [
      ["Valeur du bien à " + hD + " ans", valD],
      ["Frais d'agence", -valD * q.fraisAgence / 100],
      ["Capital restant dû", -crdD],
      ["Indemnités de remboursement anticipé", -iraD],
      ["Mainlevée d'hypothèque", -mainlevee],
      ["Restitution fonds de garantie", R.restitution],
      ["Plus-value imposable", 0],
    ],
    netAuDepart: netVente,
    patrimoine: netVente * Math.pow(1 + rPlac, hF - hD),
    note: "Plus-value totalement exonérée (résidence principale), sans condition de durée.",
  };

  /* ── Cash-flow locatif générique ── */
  function locatif({ brutAnnuel, chargesExpl, ameublementInit, regime, abattement, amortAnnuel, color, id, label, note }) {
    let cash = 0, ptfL = 0, cumImpot = 0, cumBrut = 0, cumAmort = 0;
    for (let y = hD + 1; y <= hF; y++) {
      const idx = Math.min(years.length - 1, y - 1);
      const infl = Math.pow(1 + il, y - hD - 1);
      const brut = brutAnnuel * infl;
      const mensAn = (R.annuel[y - 1]?.payment) || 0;
      const interets = (R.annuel[y - 1]?.interest || 0) + (R.annuel[y - 1]?.insurance || 0);
      const chargesDed = q.taxeFonciere * Math.pow(1.02, y - 1) + q.chargesCopro * 12 + q.pno + chargesExpl * infl
        + years[idx].valeur * q.provTravaux / 100;
      const cf = brut - chargesDed - mensAn - (y === hD + 1 ? ameublementInit : 0);
      let base;
      if (regime === "micro") base = brut * (1 - abattement);
      else base = Math.max(0, brut - chargesDed - interets - amortAnnuel);
      const impot = base * (q.tauxIR / 100 + psRate / 100);
      cumAmort += amortAnnuel; cumBrut += brut; cumImpot += impot;
      cash = cf - impot;
      ptfL = ptfL * (1 + rPlac) + cash;
    }
    const amortReint = regime === "reel" && id === "locatif" ? 0 : 0;
    const pv = plusValue(valF, hF, q.reintegreAmort && regime === "reel" ? cumAmort : 0);
    const net = valF - valF * q.fraisAgence / 100 - crdF - iraF - mainlevee + R.restitution - pv.impot;
    return {
      id, label, color, note,
      lignes: [
        [`Loyers bruts cumulés (${hD}→${hF} ans)`, cumBrut],
        ["Impôts sur les revenus locatifs", -cumImpot],
        ["Cash-flow net capitalisé", ptfL - cumBrut + cumImpot],
        ["Valeur du bien à " + hF + " ans", valF],
        ["Frais d'agence + capital restant dû", -(valF * q.fraisAgence / 100 + crdF + iraF + mainlevee)],
        ["Impôt sur la plus-value", -pv.impot],
        ["Restitution fonds de garantie", R.restitution],
      ],
      cumBrut, cumImpot, cfCapitalise: ptfL, pvBrute: pv.brut, pvImpot: pv.impot,
      patrimoine: net + ptfL,
    };
  }

  const valeurAmortissable = p.prix * .8;
  const B = locatif({
    brutAnnuel: q.loyerPercu * 12 * (1 - q.vacance / 100) * (1 - q.gestion / 100),
    chargesExpl: 0, ameublementInit: q.regimeLoc === "lmnp" ? q.ameublement : 0,
    regime: q.regimeLoc === "microfoncier" || q.regimeLoc === "lmnp" ? "micro" : "reel",
    abattement: q.regimeLoc === "microfoncier" ? .30 : q.regimeLoc === "lmnp" ? .50 : 0,
    amortAnnuel: q.regimeLoc === "lmnpreel" ? valeurAmortissable * .025 : 0,
    color: C.assur, id: "locatif", label: "Location longue durée",
    note: "Le bien cesse d'être la résidence principale : la plus-value redevient imposable.",
  });

  const brutAirbnb = q.nuit * 365 * q.occupation / 100;
  const Cc = locatif({
    brutAnnuel: brutAirbnb * (1 - q.plateforme / 100) * (1 - q.conciergerie / 100),
    chargesExpl: q.chargesAirbnb, ameublementInit: q.ameublement,
    regime: q.regimeAirbnb === "reel" ? "reel" : "micro",
    abattement: q.regimeAirbnb === "classe" ? .50 : .30,
    amortAnnuel: q.regimeAirbnb === "reel" ? valeurAmortissable * .025 : 0,
    color: C.airbnb, id: "airbnb", label: "Conciergerie courte durée",
    note: "Zone tendue : changement d'usage et règlement de copropriété à vérifier avant tout.",
  });

  return { years, croise, croiseFP, ptfLoc, hD, hF, A, B, Cc, valD, valF, crdD, crdF, iraD, brutAirbnb, psRate };
}

/* ═══ Moteur remboursements anticipés ════════════════════════════════════ */
const annuity = (cap, r, n) => (r === 0 ? cap / Math.max(1, n) : (cap * r) / (1 - Math.pow(1 + r, -n)));

function runLoan({ capital, rate, months, ras = [], iraZero }) {
  const r = rate / 100 / 12;
  let pay = annuity(capital, r, months), bal = capital;
  const rows = [], evts = [];
  let totI = 0, totIra = 0, fin = months;
  const map = {}; ras.forEach((x) => { if (x.montant > 0) map[x.m] = x; });
  for (let m = 1; m <= months; m++) {
    if (bal <= 0.5) { fin = m - 1; break; }
    const interest = bal * r;
    const principal = Math.min(pay - interest, bal);
    bal -= principal; totI += interest;
    let ra = 0, ira = 0;
    const ev = map[m];
    if (ev && bal > 0.5) {
      ra = Math.min(ev.montant, bal);
      ira = iraZero ? 0 : Math.min(bal * 0.03, (ra * rate) / 100 / 2);
      bal -= ra; totIra += ira;
      if (ev.mode === "mensualite" && bal > 0.5 && months > m) pay = annuity(bal, r, months - m);
      evts.push({ ...ev, ra, ira, balanceApres: bal, mode: ev.mode });
    }
    rows.push({ m, annee: Math.ceil(m / 12), interest, principal, ra, ira, balance: bal, payment: pay });
    if (bal <= 0.5) { fin = m; break; }
  }
  return { rows, totI, totIra, fin, payFinal: pay, evts };
}

function suggestRA({ capital, rate, months, S, E0, rm, minRA, iraZero, stopYear, mode }) {
  const r = rate / 100 / 12;
  let pay = annuity(capital, r, months), bal = capital, pot = E0;
  const ras = [];
  for (let m = 1; m <= months && bal > 0.5; m++) {
    pot = pot * (1 + rm) + S;
    const interest = bal * r;
    bal -= Math.min(pay - interest, bal);
    if (m % 12 === 0 && m <= stopYear * 12 && bal > 0.5) {
      const brut = iraZero ? pot : pot / (1 + rate / 200);
      const montant = Math.min(brut, bal);
      if (montant >= minRA) {
        const ira = iraZero ? 0 : Math.min(bal * 0.03, (montant * rate) / 100 / 2);
        ras.push({ m, montant: Math.round(montant), mode });
        pot = Math.max(0, pot - montant - ira);
        bal -= montant;
        if (mode === "mensualite" && bal > 0.5 && months > m) pay = annuity(bal, r, months - m);
      }
    }
  }
  return ras;
}

function buildRA(p, R, q, s) {
  const months = p.annees * 12;
  const cap = R.capitalPrincipal;
  const base = runLoan({ capital: cap, rate: p.taux, months, ras: [], iraZero: s.iraZero });
  const plan = runLoan({ capital: cap, rate: p.taux, months, ras: s.ras, iraZero: s.iraZero });
  const rm = Math.pow(1 + (s.rendement / 100) * (s.placTaxe ? 0.7 : 1), 1 / 12) - 1;
  const H = Math.min(Math.max(1, s.horizon), p.annees) * 12;
  const effort = base.rows[0].payment + s.epargne;

  const sim = (L) => {
    let pot = s.epargne0, minPot = s.epargne0, rupture = null, snap = null;
    const serie = [];
    for (let m = 1; m <= months; m++) {
      const row = L.rows[m - 1];
      const paid = row ? row.payment : 0;
      pot = pot * (1 + rm) + (effort - paid);
      if (row && row.ra > 0) {
        const need = row.ra + row.ira;
        if (need > pot && rupture === null) rupture = m;
        pot -= need;
      }
      minPot = Math.min(minPot, pot);
      serie.push({ m, pot, balance: row ? row.balance : 0 });
      if (m === H) snap = { pot, crd: row ? row.balance : 0 };
    }
    const f = snap || { pot, crd: 0 };
    return { pot: f.pot, serie, crd: f.crd, patrimoine: f.pot - f.crd, minPot, rupture };
  };
  const wA = sim(base), wB = sim(plan);

  const cmp = [];
  for (let m = 1; m <= months; m++) {
    cmp.push({
      m, annee: Math.ceil(m / 12),
      sans: base.rows[m - 1]?.balance ?? 0,
      avec: plan.rows[m - 1]?.balance ?? 0,
    });
  }

  const totalRA = s.ras.reduce((a, x) => a + x.montant, 0);
  return {
    base, plan, cmp, wA, wB, months, cap, H,
    economie: base.totI - plan.totI,
    ira: plan.totIra,
    gainBrut: base.totI - plan.totI - plan.totIra,
    gainNet: wB.patrimoine - wA.patrimoine,
    moisGagnes: base.fin - plan.fin,
    mensNouvelle: plan.rows[plan.rows.length - 1]?.payment ?? 0,
    mensInitiale: base.rows[0]?.payment ?? 0,
    totalRA, evts: plan.evts, effort,
    rendementNet: (s.rendement / 100) * (s.placTaxe ? 0.7 : 1) * 100,
    minRA: cap * s.minPct / 100,
  };
}

/* ═══ Atomes UI ═══════════════════════════════════════════════════════════ */
function Field({ label, value, onChange, unit = "€", step = 1, hint, min = 0 }) {
  return (
    <label className="block mb-2.5">
      <span className="flex items-baseline justify-between mb-1 gap-2">
        <span style={{ fontSize: 11.5, color: C.ink60 }}>{label}</span>
        {hint && <span style={{ fontSize: 10, color: C.ink60, opacity: .85, textAlign: "right" }}>{hint}</span>}
      </span>
      <span className="flex" style={{ border: `1px solid ${C.rule}`, background: "#fff" }}>
        <input type="number" value={value} min={min} step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
          className="w-full px-2 py-1.5 outline-none"
          style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13.5, color: C.ink, background: "transparent", fontVariantNumeric: "tabular-nums" }} />
        <span className="flex items-center px-2" style={{ fontSize: 10.5, color: C.ink60, borderLeft: `1px solid ${C.rule}`, background: C.paper }}>{unit}</span>
      </span>
    </label>
  );
}
function Choice({ label, value, onChange, options, col }) {
  return (
    <div className="mb-2.5">
      {label && <div style={{ fontSize: 11.5, color: C.ink60, marginBottom: 4 }}>{label}</div>}
      <div style={{ display: col ? "grid" : "flex", gridTemplateColumns: col ? "1fr 1fr" : undefined, border: `1px solid ${C.rule}` }}>
        {options.map((o) => (
          <button key={o.v} onClick={() => onChange(o.v)} className="px-2 py-1.5" style={{
            flex: col ? undefined : 1, fontSize: 11, lineHeight: 1.25,
            background: value === o.v ? C.ink : "#fff", color: value === o.v ? C.paper : C.ink60,
            borderRight: `1px solid ${C.rule}`,
          }}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}
function Panel({ n, title, children, open, toggle }) {
  return (
    <section style={{ borderTop: `1px solid ${C.rule}` }}>
      <button onClick={toggle} className="w-full flex items-center gap-2 py-2.5 text-left">
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9.5, color: C.brass }}>{n}</span>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{title}</span>
        <span className="ml-auto" style={{ color: C.ink60, fontSize: 11 }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="pb-3.5">{children}</div>}
    </section>
  );
}
function Kpi({ label, value, sub, color = C.ink, big }) {
  return (
    <div className="px-3 py-2.5" style={{ background: C.panel, border: `1px solid ${C.rule}` }}>
      <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink60 }}>{label}</div>
      <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: big ? 25 : 19, fontWeight: 600, color, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.ink60, marginTop: 1, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  );
}
const H2 = ({ children, right }) => (
  <div className="flex items-baseline justify-between mb-1.5 gap-3">
    <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15.5, fontWeight: 600 }}>{children}</h2>
    {right && <span style={{ fontSize: 10.5, color: C.ink60, textAlign: "right" }}>{right}</span>}
  </div>
);
function Row({ k, v, strong }) {
  return (
    <div className="flex justify-between gap-3 py-0.5" style={{ borderTop: strong ? `1px solid ${C.rule}` : "none", marginTop: strong ? 3 : 0, paddingTop: strong ? 4 : 2 }}>
      <span style={{ color: C.ink60 }}>{k}</span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: strong ? 500 : 400, whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );
}
function Toggle({ on, set, label }) {
  return (
    <button onClick={() => set(!on)} className="flex items-start gap-2 mb-2 w-full text-left">
      <span className="flex items-center justify-center shrink-0" style={{ width: 15, height: 15, marginTop: 1, border: `1px solid ${on ? C.ink : C.rule}`, background: on ? C.ink : "#fff", color: C.paper, fontSize: 10 }}>{on ? "✓" : ""}</span>
      <span style={{ fontSize: 11.5, lineHeight: 1.35 }}>{label}</span>
    </button>
  );
}
function Mini({ label, value, sub, color = C.ink }) {
  return (<div>
    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink60 }}>{label}</div>
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 500, color }}>{value}</div>
    {sub && <div style={{ fontSize: 9.5, color: C.ink60 }}>{sub}</div>}
  </div>);
}
const Legend = ({ c, t }) => (
  <span className="flex items-center gap-1.5"><span style={{ width: 9, height: 9, background: c, display: "inline-block" }} />{t}</span>
);

/* ═══ Module 1 ════════════════════════════════════════════════════════════ */
function ModuleCredit({ p, up, R }) {
  const [o, so] = useState({ 1: true, 2: true, 3: false, 4: false, 5: false, 6: false });
  const t = (k) => so((s) => ({ ...s, [k]: !s[k] }));
  const [scrub, setScrub] = useState(1);
  const n = R.rows.length || 1;
  const cur = R.rows[Math.min(scrub, n) - 1] || { m: 0, annee: 0, principal: 0, interest: 0, insurance: 0, payment: 1, balance: 0 };
  const total = R.tot.i + R.tot.p + R.tot.a;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "min(330px,100%) minmax(0,1fr)" }}>
      <aside className="px-4 py-1" style={{ borderRight: `1px solid ${C.rule}`, background: C.panel }}>
        <Panel n="01" title="Opération" open={o[1]} toggle={() => t(1)}>
          <Choice label="Type de bien" value={p.typeBien}
            onChange={(v) => up({ typeBien: v, notairePct: v === "neuf" ? 2.5 : 8 })}
            options={[{ v: "ancien", l: "Ancien" }, { v: "neuf", l: "Neuf / VEFA" }]} />
          <Field label="Prix du bien" value={p.prix} onChange={(v) => up({ prix: v })} step={5000} />
          <Field label="Frais de notaire" value={p.notairePct} onChange={(v) => up({ notairePct: v })} unit="%" step={.1} hint={eur(R.notaire)} />
          <Field label="Frais d'agence (hors prix)" value={p.agence} onChange={(v) => up({ agence: v })} step={1000} />
          <Field label="Travaux" value={p.travaux} onChange={(v) => up({ travaux: v })} step={1000} />
          <Field label="Apport personnel" value={p.apport} onChange={(v) => up({ apport: v })} step={5000}
            hint={pct(p.apport / Math.max(1, R.coutOp) * 100)} />
          <div className="mt-1 px-2 py-2" style={{ background: "#fff", border: `1px solid ${C.rule}`, fontSize: 11 }}>
            <Row k="Coût total opération" v={eur(R.coutOp)} />
            <Row k="Frais annexes financés" v={eur(R.fraisAnnexes)} />
            <Row k="À emprunter" v={eur(R.capitalTotal)} strong />
          </div>
        </Panel>
        <Panel n="02" title="Prêt principal" open={o[2]} toggle={() => t(2)}>
          <Field label="Taux nominal annuel" value={p.taux} onChange={(v) => up({ taux: v })} unit="%" step={.05} />
          <Field label="Durée" value={p.annees} onChange={(v) => up({ annees: v })} unit="ans" step={1}
            hint={p.annees > 25 ? "au-delà du plafond HCSF" : `${p.annees * 12} mois`} />
          <Field label="Frais de dossier" value={p.fraisDossier} onChange={(v) => up({ fraisDossier: v })} step={100} />
          <div style={{ fontSize: 11, color: C.ink60 }}>Capital du prêt principal : <b>{eur(R.capitalPrincipal)}</b></div>
        </Panel>
        <Panel n="03" title="Assurance emprunteur" open={o[3]} toggle={() => t(3)}>
          <Field label="Taux annuel" value={p.assurTaux} onChange={(v) => up({ assurTaux: v })} unit="%" step={.01} />
          <Choice label="Base de calcul" value={p.assurBase} onChange={(v) => up({ assurBase: v })}
            options={[{ v: "initial", l: "Capital initial" }, { v: "crd", l: "Restant dû" }]} />
          <Field label="Quotité assurée" value={p.quotite} onChange={(v) => up({ quotite: v })} unit="%" step={10} hint="200 % = couple" />
          <p style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.45 }}>
            Base « capital initial » = prime constante, plus chère au total. La délégation calcule le plus souvent sur le capital restant dû.
          </p>
        </Panel>
        <Panel n="04" title="Garantie" open={o[4]} toggle={() => t(4)}>
          <Choice label="Type" value={p.garType}
            onChange={(v) => up(v === "caution" ? { garType: v, garPct: 1.25, garRestit: 55 } : v === "hypotheque" ? { garType: v, garPct: 1.5, garRestit: 0 } : { garType: v, garPct: .3, garRestit: 0 })}
            options={[{ v: "caution", l: "Caution" }, { v: "hypotheque", l: "Hypo / PPD" }, { v: "nantissement", l: "Nantis." }]} />
          <Field label="Coût" value={p.garPct} onChange={(v) => up({ garPct: v })} unit="%" step={.05} hint={eur(R.coutGarantie)} />
          <Field label="Part restituée au terme" value={p.garRestit} onChange={(v) => up({ garRestit: v })} unit="%" step={5} hint={eur(R.restitution)} />
        </Panel>
        <Panel n="05" title="Prêts complémentaires" open={o[5]} toggle={() => t(5)}>
          <Toggle on={p.ptzOn} set={(v) => up({ ptzOn: v })} label="Prêt à taux zéro" />
          {p.ptzOn && <div className="pl-2 mb-2" style={{ borderLeft: `2px solid ${C.capital}` }}>
            <Field label="Montant PTZ" value={p.ptzMt} onChange={(v) => up({ ptzMt: v })} step={5000} />
            <Field label="Durée totale" value={p.ptzDuree} onChange={(v) => up({ ptzDuree: v })} unit="ans" step={1} />
            <Field label="Différé total" value={p.ptzDiffere} onChange={(v) => up({ ptzDiffere: v })} unit="ans" step={1} hint="aucune échéance" />
          </div>}
          <Toggle on={p.compOn} set={(v) => up({ compOn: v })} label="Prêt employeur / Action Logement / PEL" />
          {p.compOn && <div className="pl-2" style={{ borderLeft: `2px solid ${C.brass}` }}>
            <Field label="Montant" value={p.compMt} onChange={(v) => up({ compMt: v })} step={1000} />
            <Field label="Taux" value={p.compTaux} onChange={(v) => up({ compTaux: v })} unit="%" step={.1} />
            <Field label="Durée" value={p.compAnnees} onChange={(v) => up({ compAnnees: v })} unit="ans" step={1} />
          </div>}
        </Panel>
        <Panel n="06" title="Capacité d'emprunt" open={o[6]} toggle={() => t(6)}>
          <Field label="Revenus nets mensuels du foyer" value={p.revenus} onChange={(v) => up({ revenus: v })} step={100} />
          <Field label="Autres charges de crédit" value={p.charges} onChange={(v) => up({ charges: v })} step={50} />
          {(() => {
            const e = p.revenus > 0 ? (R.mensMax + p.charges) / p.revenus * 100 : 0;
            return <div className="px-2 py-2" style={{ background: "#fff", border: `1px solid ${e > 35 ? C.interet : C.rule}` }}>
              <div style={{ fontSize: 10.5, color: C.ink60 }}>Taux d'endettement</div>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 21, fontWeight: 600, color: e > 35 ? C.interet : C.capital }}>{pct(e)}</div>
              <div style={{ fontSize: 10, color: C.ink60 }}>{e > 35 ? "Au-delà de la limite HCSF de 35 %." : "Sous la limite HCSF de 35 %."}</div>
            </div>;
          })()}
        </Panel>
      </aside>

      <main className="px-4 py-4" style={{ minWidth: 0 }}>
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(142px,1fr))" }}>
          <Kpi big label="Mensualité" value={eur(R.mensMax)} sub={p.ptzOn && p.ptzDiffere > 0 ? `${eur(R.mens1)} pendant le différé` : "assurance incluse"} />
          <Kpi label="Coût total du crédit" value={eur(R.coutCredit)} color={C.interet} sub={`${pct(R.coutCredit / Math.max(1, R.capitalTotal) * 100)} du capital`} />
          <Kpi label="TAEG estimé" value={Number.isFinite(R.taegV) ? pct(R.taegV, 2) : "—"} sub="tous frais obligatoires" />
          <Kpi label="Intérêts" value={eur(R.tot.i)} color={C.interet} />
          <Kpi label="Assurance" value={eur(R.tot.a)} color={C.assur} sub={`${pct(R.tot.a / Math.max(1, R.coutCredit) * 100, 0)} du coût du crédit`} />
          <Kpi label="Frais annexes" value={eur(R.fraisAnnexes)} sub={R.restitution > 0 ? `dont ${eur(R.restitution)} restitués` : "non restitués"} />
        </div>

        <section className="mb-5">
          <H2 right="Ce que chaque échéance achète, mois par mois">Ruban d'amortissement</H2>
          <div style={{ border: `1px solid ${C.rule}`, background: "#fff" }}>
            <div style={{ height: 146 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={R.rows} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="m" hide /><YAxis hide />
                  <Area dataKey="principal" stackId="1" stroke="none" fill={C.capital} fillOpacity={.92} isAnimationActive={false} />
                  <Area dataKey="interest" stackId="1" stroke="none" fill={C.interet} fillOpacity={.92} isAnimationActive={false} />
                  <Area dataKey="insurance" stackId="1" stroke="none" fill={C.assur} fillOpacity={.92} isAnimationActive={false} />
                  {R.bascule > 0 && <ReferenceLine x={R.bascule} stroke={C.ink} strokeDasharray="3 3" />}
                  <ReferenceLine x={cur.m} stroke={C.brass} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${C.rule}` }}>
              <input type="range" min={1} max={n} value={Math.min(scrub, n)} onChange={(e) => setScrub(+e.target.value)}
                className="w-full mb-2.5" aria-label="Mois observé" />
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(102px,1fr))" }}>
                <Mini label={`Mois ${cur.m}`} value={`année ${cur.annee}`} />
                <Mini label="Capital" value={eur(cur.principal)} color={C.capital} sub={pct(cur.principal / Math.max(.01, cur.payment) * 100, 0)} />
                <Mini label="Intérêts" value={eur(cur.interest)} color={C.interet} sub={pct(cur.interest / Math.max(.01, cur.payment) * 100, 0)} />
                <Mini label="Assurance" value={eur(cur.insurance)} color={C.assur} />
                <Mini label="Restant dû" value={eur(cur.balance)} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2" style={{ fontSize: 10.5, color: C.ink60 }}>
            <Legend c={C.capital} t="Capital" /><Legend c={C.interet} t="Intérêts" /><Legend c={C.assur} t="Assurance" />
            <span>trait pointillé : bascule capital &gt; intérêts</span>
          </div>
        </section>

        <section className="grid gap-2 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
          <div className="px-3 py-3" style={{ border: `1px solid ${C.ink}`, background: "#fff" }}>
            <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink60 }}>Point de bascule</div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 23, fontWeight: 700 }}>{R.bascule > 0 ? `Mois ${R.bascule}` : "—"}</div>
            <div style={{ fontSize: 11, color: C.ink60, lineHeight: 1.4 }}>
              Première échéance où le capital dépasse les intérêts{R.bascule > 0 && ` — ${(R.bascule / 12).toFixed(1)} ans.`}
            </div>
          </div>
          {[3, 5, 7].map((y) => {
            const r = R.at(y), rem = R.capitalTotal - r.balance;
            return <div key={y} className="px-3 py-3" style={{ border: `1px solid ${C.rule}`, background: "#fff" }}>
              <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink60 }}>Après {y} ans</div>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 19, fontWeight: 600, color: C.capital }}>{eur(rem)}</div>
              <div style={{ fontSize: 10.5, color: C.ink60 }}>capital remboursé — {pct(rem / Math.max(1, R.capitalTotal) * 100)}<br />reste dû {eur(r.balance)}</div>
            </div>;
          })}
        </section>

        <section className="mb-5">
          <H2>Où part l'argent, au total</H2>
          <div className="flex" style={{ height: 32, border: `1px solid ${C.rule}` }}>
            {[{ v: R.tot.p, c: C.capital }, { v: R.tot.i, c: C.interet }, { v: R.tot.a, c: C.assur }].map((s, i) => (
              <div key={i} className="flex items-center justify-center overflow-hidden"
                style={{ width: `${s.v / Math.max(1, total) * 100}%`, background: s.c, color: "#fff", fontSize: 10.5 }}>
                {s.v / total > .09 && `${(s.v / total * 100).toFixed(0)} %`}
              </div>))}
          </div>
          <div style={{ fontSize: 11.5, color: C.ink60, marginTop: 5 }}>
            Pour {eur(R.capitalTotal)} empruntés vous rembourserez {eur(total)}, plus {eur(R.fraisAnnexes)} de frais initiaux.
          </div>
        </section>

        <section>
          <H2>Tableau d'amortissement annuel</H2>
          <div style={{ maxHeight: 280, overflow: "auto", border: `1px solid ${C.rule}`, background: "#fff" }}>
            <table className="w-full" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
              <thead style={{ position: "sticky", top: 0, background: C.panel }}>
                <tr style={{ borderBottom: `1px solid ${C.ink}` }}>
                  {["An", "Capital", "Intérêts", "Assur.", "Restant dû"].map((h, i) => (
                    <th key={h} className="px-2 py-1.5" style={{ textAlign: i === 0 ? "left" : "right", fontWeight: 500, fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: C.ink60 }}>{h}</th>))}
                </tr>
              </thead>
              <tbody>
                {R.annuel.map((a) => (
                  <tr key={a.y} style={{ borderBottom: `1px solid ${C.paper}`, background: a.y === cur.annee ? "#FDF6E6" : "transparent" }}>
                    <td className="px-2 py-1">{a.y}</td>
                    <td className="px-2 py-1 text-right" style={{ color: C.capital }}>{eur(a.principal)}</td>
                    <td className="px-2 py-1 text-right" style={{ color: C.interet }}>{eur(a.interest)}</td>
                    <td className="px-2 py-1 text-right" style={{ color: C.assur }}>{eur(a.insurance)}</td>
                    <td className="px-2 py-1 text-right">{eur(a.balance)}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ═══ Module 2 ════════════════════════════════════════════════════════════ */
function ModuleCompare({ p, R, q, uq }) {
  const [o, so] = useState({ 1: true, 2: true, 3: false, 4: false, 5: false, 6: false });
  const t = (k) => so((s) => ({ ...s, [k]: !s[k] }));
  const [fp, setFp] = useState(false);
  const [deep, setDeep] = useState(false);
  const K = useMemo(() => buildCompare(p, R, q), [p, R, q]);
  const y1 = K.years[0];
  const scen = [K.A, K.B, K.Cc];
  const best = scen.reduce((a, b) => (b.patrimoine > a.patrimoine ? b : a), scen[0]);
  const maxAbs = Math.max(K.ptfLoc, ...scen.map((s) => s.patrimoine), 1);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "min(330px,100%) minmax(0,1fr)" }}>
      <aside className="px-4 py-1" style={{ borderRight: `1px solid ${C.rule}`, background: C.panel }}>
        <Panel n="01" title="Si je reste locataire" open={o[1]} toggle={() => t(1)}>
          <Field label="Loyer hors charges" value={q.loyer} onChange={(v) => uq({ loyer: v })} unit="€/mois" step={50} />
          <Field label="Charges locatives" value={q.chargesLoc} onChange={(v) => uq({ chargesLoc: v })} unit="€/mois" step={10} />
          <Field label="Assurance habitation" value={q.mrhLoc} onChange={(v) => uq({ mrhLoc: v })} unit="€/mois" step={5} />
          <Field label="Révision annuelle du loyer" value={q.inflLoyer} onChange={(v) => uq({ inflLoyer: v })} unit="%/an" step={.1} hint="indice de référence des loyers" />
        </Panel>
        <Panel n="02" title="Charges de propriétaire" open={o[2]} toggle={() => t(2)}>
          <Field label="Taxe foncière" value={q.taxeFonciere} onChange={(v) => uq({ taxeFonciere: v })} unit="€/an" step={100} />
          <Field label="Charges de copro non récupérables" value={q.chargesCopro} onChange={(v) => uq({ chargesCopro: v })} unit="€/mois" step={10} />
          <Field label="Provision travaux" value={q.provTravaux} onChange={(v) => uq({ provTravaux: v })} unit="%/an" step={.1} hint="de la valeur du bien" />
          <Field label="Assurance habitation" value={q.mrhProprio} onChange={(v) => uq({ mrhProprio: v })} unit="€/mois" step={5} />
          <Field label="Appréciation du bien" value={q.appreciation} onChange={(v) => uq({ appreciation: v })} unit="%/an" step={.25} hint="marché plat depuis 2023" />
        </Panel>
        <Panel n="03" title="Horizons et sortie" open={o[3]} toggle={() => t(3)}>
          <Field label="Départ de France dans" value={q.hDepart} onChange={(v) => uq({ hDepart: v })} unit="ans" step={1} min={1} />
          <Field label="Liquidation / comparaison à" value={q.hFinal} onChange={(v) => uq({ hFinal: v })} unit="ans" step={1} min={1} />
          <Field label="Frais d'agence à la vente" value={q.fraisAgence} onChange={(v) => uq({ fraisAgence: v })} unit="%" step={.5} />
          <Toggle on={q.iraZero} set={(v) => uq({ iraZero: v })} label="Indemnités de remboursement anticipé négociées à 0" />
          <div style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.45 }}>
            Sinon plafonnées au plus faible de 3 % du capital restant dû ou 6 mois d'intérêts.
            Exonérées de plein droit en cas de mutation professionnelle.
          </div>
        </Panel>
        <Panel n="04" title="Placement du locataire" open={o[4]} toggle={() => t(4)}>
          <Field label="Rendement annuel" value={q.rendement} onChange={(v) => uq({ rendement: v })} unit="%/an" step={.25} />
          <Toggle on={q.placTaxe} set={(v) => uq({ placTaxe: v })} label="Imposé au prélèvement forfaitaire de 30 % (compte-titres)" />
          <p style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.45 }}>
            Le locataire place l'apport, puis chaque mois l'écart entre coût de propriétaire et loyer.
          </p>
        </Panel>
        <Panel n="05" title="Location longue durée" open={o[5]} toggle={() => t(5)}>
          <Field label="Loyer perçu" value={q.loyerPercu} onChange={(v) => uq({ loyerPercu: v })} unit="€/mois" step={50} />
          <Field label="Vacance locative" value={q.vacance} onChange={(v) => uq({ vacance: v })} unit="%" step={1} />
          <Field label="Frais de gestion" value={q.gestion} onChange={(v) => uq({ gestion: v })} unit="%" step={.5} hint="agence, 0 si en direct" />
          <Field label="Assurance propriétaire non occupant" value={q.pno} onChange={(v) => uq({ pno: v })} unit="€/an" step={20} />
          <Choice label="Régime fiscal" value={q.regimeLoc} onChange={(v) => uq({ regimeLoc: v })} col
            options={[{ v: "microfoncier", l: "Micro-foncier 30 %" }, { v: "reelnu", l: "Réel nu" }, { v: "lmnp", l: "Micro-BIC 50 %" }, { v: "lmnpreel", l: "LMNP réel" }]} />
          <p style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.45 }}>
            Réel nu : les intérêts d'emprunt sont déductibles. LMNP réel : amortissement du bien en plus, base souvent nulle.
          </p>
        </Panel>
        <Panel n="06" title="Conciergerie courte durée" open={o[6]} toggle={() => t(6)}>
          <Field label="Tarif par nuit" value={q.nuit} onChange={(v) => uq({ nuit: v })} unit="€" step={5} />
          <Field label="Taux d'occupation" value={q.occupation} onChange={(v) => uq({ occupation: v })} unit="%" step={1}
            hint={`${eur(K.brutAirbnb)} brut/an`} />
          <Field label="Commission plateforme" value={q.plateforme} onChange={(v) => uq({ plateforme: v })} unit="%" step={.5} />
          <Field label="Honoraires de conciergerie" value={q.conciergerie} onChange={(v) => uq({ conciergerie: v })} unit="%" step={1} hint="ménage et linge inclus" />
          <Field label="Charges d'exploitation" value={q.chargesAirbnb} onChange={(v) => uq({ chargesAirbnb: v })} unit="€/an" step={100} hint="énergie, internet, consommables" />
          <Field label="Ameublement initial" value={q.ameublement} onChange={(v) => uq({ ameublement: v })} step={500} />
          <Choice label="Régime fiscal" value={q.regimeAirbnb} onChange={(v) => uq({ regimeAirbnb: v })} col
            options={[{ v: "nonclasse", l: "Micro-BIC 30 %" }, { v: "classe", l: "Classé 50 %" }, { v: "reel", l: "Réel BIC" }]} />
          <p style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.45 }}>
            Meublé de tourisme non classé : abattement ramené à 30 % et seuil abaissé depuis la réforme de 2025.
          </p>
        </Panel>
        <section style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 10, paddingBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 6 }}>Fiscalité à l'horizon</div>
          <Choice label="Résidence fiscale après le départ" value={q.residence} onChange={(v) => uq({ residence: v })} col
            options={[{ v: "france", l: "France" }, { v: "eee", l: "EEE / Suisse" }, { v: "hors", l: "Hors EEE" }]} />
          <Field label="Taux d'imposition sur les loyers" value={q.tauxIR} onChange={(v) => uq({ tauxIR: v })} unit="%" step={1}
            hint="non-résident : minimum 20 %" />
          <div className="px-2 py-1.5 mb-2" style={{ background: "#fff", border: `1px solid ${C.rule}`, fontSize: 10.5, color: C.ink60, lineHeight: 1.45 }}>
            Prélèvements sociaux appliqués : <b style={{ color: C.ink }}>{pct(K.psRate)}</b>.
            Le taux réduit de 7,5 % suppose une affiliation à un régime de sécurité sociale de l'EEE ou de la Suisse.
          </div>
          <Toggle on={q.forfaitTravaux} set={(v) => uq({ forfaitTravaux: v })} label="Forfait travaux de 15 % sur le prix d'acquisition (détention > 5 ans)" />
          <Toggle on={q.reintegreAmort} set={(v) => uq({ reintegreAmort: v })} label="Réintégrer les amortissements LMNP dans la plus-value" />
        </section>
      </aside>

      <main className="px-4 py-4" style={{ minWidth: 0 }}>
        {/* ── Vue A ── */}
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          <Kpi big label="Coût mensuel propriétaire" value={eur(y1.proprio)} sub={`${eur(y1.mens)} de crédit + ${eur(y1.detention)} de charges`} />
          <Kpi big label="Coût mensuel locataire" value={eur(y1.loyer)} sub="loyer, charges et assurance" />
          <Kpi label="Écart la première année" value={signed(y1.proprio - y1.loyer)} color={y1.proprio > y1.loyer ? C.interet : C.capital} sub="par mois" />
          <Kpi label="Croisement des courbes" value={K.croise ? `Année ${K.croise}` : "jamais"} sub={K.croise ? "le loyer dépasse le coût de propriétaire" : "sur la durée du prêt"} />
        </div>

        <section className="mb-4">
          <H2 right="Mensualité fixe contre loyer indexé">Coût mensuel, année après année</H2>
          <div style={{ border: `1px solid ${C.rule}`, background: "#fff", padding: "8px 6px 0" }}>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={K.years} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.paper} vertical={false} />
                  <XAxis dataKey="y" tick={{ fontSize: 10, fill: C.ink60 }} tickLine={false} axisLine={{ stroke: C.rule }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 10, fill: C.ink60 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${Math.round(v)}` } />
                  <Tooltip formatter={(v) => eur(v)} labelFormatter={(l) => `Année ${l}`}
                    contentStyle={{ fontSize: 11, border: `1px solid ${C.rule}`, borderRadius: 0 }} />
                  <Area dataKey="proprio" name="Propriétaire" stroke={C.ink} strokeWidth={2} fill={C.ink} fillOpacity={.07} isAnimationActive={false} />
                  <Line dataKey="loyer" name="Locataire" stroke={C.brass} strokeWidth={2} dot={false} isAnimationActive={false} />
                  {fp && <Line dataKey="fondsPerdus" name="Fonds perdus" stroke={C.interet} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />}
                  <ReferenceLine x={K.hD} stroke={C.ink} strokeDasharray="2 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* bandeau d'écart */}
            <div className="flex" style={{ height: 12, marginBottom: 8 }}>
              {K.years.map((r) => (
                <div key={r.y} style={{ flex: 1, background: (fp ? r.ecartFP : r.ecart) > 0 ? C.interet : C.capital, opacity: .85 }}
                  title={`Année ${r.y} : ${signed(fp ? r.ecartFP : r.ecart)}/mois`} />))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2" style={{ fontSize: 10.5, color: C.ink60 }}>
            <Legend c={C.ink} t="Coût propriétaire" /><Legend c={C.brass} t="Loyer + charges" />
            <Legend c={C.interet} t="Années où posséder coûte plus cher" />
            <button onClick={() => setFp(!fp)} style={{ fontSize: 10.5, color: C.brass, textDecoration: "underline" }}>
              {fp ? "Masquer" : "Afficher"} les fonds perdus
            </button>
          </div>
          {fp && <p style={{ fontSize: 11, color: C.ink60, marginTop: 6, lineHeight: 1.5, maxWidth: 640 }}>
            Les fonds perdus retirent la part de capital : intérêts, assurance et charges non récupérables uniquement.
            C'est la seule comparaison honnête avec un loyer, puisque le capital remboursé reste votre patrimoine.
            Croisement à ce niveau : {K.croiseFP ? `année ${K.croiseFP}` : "dès la première année"}.
          </p>}
        </section>

        {/* ── Révélation ── */}
        {!deep && (
          <div className="px-4 py-4 mb-2" style={{ border: `1px solid ${C.ink}`, background: C.panel }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Cette comparaison ne répond pas encore à votre question
            </div>
            <p style={{ fontSize: 12, color: C.ink60, lineHeight: 1.55, maxWidth: 620, marginBottom: 10 }}>
              Elle ignore que le locataire place son apport, que les frais d'entrée et de sortie représentent
              environ 12 % du prix, et que la fiscalité diffère radicalement selon ce que vous faites du bien en partant.
              L'analyse patrimoniale compare les trois sorties à horizon choisi.
            </p>
            <button onClick={() => setDeep(true)} className="px-3.5 py-2"
              style={{ background: C.ink, color: C.paper, fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase" }}>
              Déplier l'analyse patrimoniale
            </button>
          </div>
        )}

        {deep && <>
          <div className="flex items-baseline justify-between gap-3 mb-2 mt-6" style={{ borderTop: `2px solid ${C.ink}`, paddingTop: 12 }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "-.01em" }}>
              Patrimoine net à {K.hF} ans
            </h2>
            <button onClick={() => setDeep(false)} style={{ fontSize: 10.5, color: C.brass, textDecoration: "underline" }}>replier</button>
          </div>
          <p style={{ fontSize: 12, color: C.ink60, lineHeight: 1.55, maxWidth: 660, marginBottom: 14 }}>
            Départ de France à {K.hD} ans, comparaison à {K.hF} ans. Le locataire de référence place son apport
            et l'écart mensuel, puis laisse capitaliser. Chaque scénario propriétaire est net de crédit, de frais de sortie et d'impôts.
          </p>

          {/* Barres comparées */}
          <div className="mb-5" style={{ border: `1px solid ${C.rule}`, background: "#fff", padding: 14 }}>
            {[{ label: "Rester locataire", patrimoine: K.ptfLoc, color: C.brass, ref: true }, ...scen].map((s) => (
              <div key={s.label} className="mb-3 last:mb-0">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span style={{ fontSize: 12, fontWeight: s.id === best.id ? 700 : 500 }}>
                    {s.label}{s.id === best.id && <span style={{ color: C.brass, fontSize: 10, marginLeft: 6, letterSpacing: ".06em" }}>MEILLEUR</span>}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 500 }}>
                    {eur(s.patrimoine)}
                    {!s.ref && <span style={{ color: s.patrimoine >= K.ptfLoc ? C.capital : C.interet, marginLeft: 8, fontSize: 11 }}>
                      {signed(s.patrimoine - K.ptfLoc)}
                    </span>}
                  </span>
                </div>
                <div style={{ height: 16, background: C.paper }}>
                  <div style={{ width: `${Math.max(0, s.patrimoine) / maxAbs * 100}%`, height: "100%", background: s.color, opacity: s.ref ? .45 : .9 }} />
                </div>
              </div>))}
            <div style={{ fontSize: 10.5, color: C.ink60, marginTop: 10, lineHeight: 1.45 }}>
              L'écart affiché est la différence avec le scénario locataire, à situation de départ identique.
            </div>
          </div>

          {/* Détail des scénarios */}
          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(255px,1fr))" }}>
            {scen.map((s) => (
              <div key={s.id} style={{ border: `1px solid ${s.id === best.id ? C.ink : C.rule}`, background: "#fff" }}>
                <div className="px-3 py-2" style={{ background: s.color, color: "#fff" }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 700 }}>{eur(s.patrimoine)}</div>
                </div>
                <div className="px-3 py-2.5" style={{ fontSize: 11 }}>
                  {s.lignes.map(([k, v], i) => (
                    <div key={i} className="flex justify-between gap-2 py-0.5">
                      <span style={{ color: C.ink60, lineHeight: 1.3 }}>{k}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "nowrap", color: v < 0 ? C.interet : C.ink }}>{eur(v)}</span>
                    </div>))}
                  <p style={{ fontSize: 10.5, color: C.ink60, marginTop: 8, lineHeight: 1.45, borderTop: `1px solid ${C.paper}`, paddingTop: 6 }}>{s.note}</p>
                </div>
              </div>))}
          </div>

          {/* Alertes structurelles */}
          <section className="mb-5">
            <H2>Ce que le calcul ne chiffre pas</H2>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
              {[
                ["Exonération de plus-value", "L'exonération de résidence principale ne tient que si la vente intervient dans un délai normal après le déménagement, environ un an. Passé ce délai, la plus-value redevient imposable avec abattements progressifs jusqu'à 22 et 30 ans."],
                ["Autorisation de louer en courte durée", "En zone tendue, transformer un logement en meublé touristique suppose une autorisation de changement d'usage, souvent avec compensation. Le règlement de copropriété peut aussi l'interdire."],
                ["Gestion à distance", "Depuis l'étranger, la location courte durée dépend entièrement du prestataire. La rentabilité affichée suppose un taux d'occupation tenu année après année."],
                ["Volatilité du marché", "L'appréciation retenue est une hypothèse, pas une prévision. À horizon court, une baisse de 5 % du prix efface plusieurs années de remboursement de capital."],
              ].map(([k, v]) => (
                <div key={k} className="px-3 py-2.5" style={{ background: C.panel, border: `1px solid ${C.rule}` }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.5 }}>{v}</div>
                </div>))}
            </div>
          </section>

          <p style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.5, maxWidth: 660 }}>
            Estimations à but pédagogique, fondées sur des règles fiscales simplifiées et susceptibles d'évoluer.
            Ce n'est ni un conseil fiscal ni un conseil en investissement : faites valider un projet réel par un notaire
            et un conseiller fiscal, en particulier sur la fiscalité des non-résidents.
          </p>
        </>}
      </main>
    </div>
  );
}

/* ═══ Module 3 ════════════════════════════════════════════════════════════ */
function ModuleRA({ p, R, q, s, us }) {
  const [o, so] = useState({ 1: true, 2: true, 3: false });
  const t = (k) => so((x) => ({ ...x, [k]: !x[k] }));
  const K = useMemo(() => buildRA(p, R, q, s), [p, R, q, s]);
  const nY = p.annees;
  const potAt = (y) => K.wB.serie[Math.min(K.wB.serie.length, y * 12) - 1]?.pot ?? 0;

  const addRA = (y) => {
    if (s.ras.some((x) => x.m === y * 12)) return;
    const dispo = Math.max(0, Math.floor(potAt(y) / 1000) * 1000);
    us({ ras: [...s.ras, { m: y * 12, montant: dispo, mode: s.modeDefaut }].sort((a, b) => a.m - b.m) });
  };
  const edit = (i, o2) => us({ ras: s.ras.map((x, j) => (j === i ? { ...x, ...o2 } : x)) });
  const del = (i) => us({ ras: s.ras.filter((_, j) => j !== i) });

  const suggestion = useMemo(() => suggestRA({
    capital: R.capitalPrincipal, rate: p.taux, months: p.annees * 12,
    S: s.epargne, E0: s.epargne0,
    rm: Math.pow(1 + (s.rendement / 100) * (s.placTaxe ? .7 : 1), 1 / 12) - 1,
    minRA: R.capitalPrincipal * s.minPct / 100, iraZero: s.iraZero,
    stopYear: s.stopYear, mode: s.modeDefaut,
  }), [p, R, s]);

  const arbitrage = K.rendementNet - p.taux;
  const revente = q.hDepart;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "min(330px,100%) minmax(0,1fr)" }}>
      <aside className="px-4 py-1" style={{ borderRight: `1px solid ${C.rule}`, background: C.panel }}>
        <Panel n="01" title="Épargne disponible" open={o[1]} toggle={() => t(1)}>
          <Field label="Épargne déjà constituée" value={s.epargne0} onChange={(v) => us({ epargne0: v })} step={1000} />
          <Field label="Capacité d'épargne mensuelle" value={s.epargne} onChange={(v) => us({ epargne: v })} unit="€/mois" step={50}
            hint="en plus de la mensualité" />
          <Field label="Rendement du placement" value={s.rendement} onChange={(v) => us({ rendement: v })} unit="%/an" step={.25} />
          <Toggle on={s.placTaxe} set={(v) => us({ placTaxe: v })} label="Imposé au prélèvement forfaitaire de 30 %" />
          <div className="px-2 py-2" style={{ background: "#fff", border: `1px solid ${C.rule}`, fontSize: 11 }}>
            <Row k="Rendement net" v={pct(K.rendementNet, 2)} />
            <Row k="Taux du crédit" v={pct(p.taux, 2)} />
            <Row k="Arbitrage" v={`${arbitrage >= 0 ? "+" : "−"}${pct(Math.abs(arbitrage), 2)}`} strong />
          </div>
          <p style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.45, marginTop: 6 }}>
            {arbitrage > 0
              ? "Le placement rapporte plus que le crédit ne coûte : chaque remboursement anticipé économise des intérêts mais détruit de la valeur nette."
              : "Le crédit coûte plus cher que le placement ne rapporte : le remboursement anticipé crée de la valeur nette."}
          </p>
        </Panel>

        <Panel n="02" title="Conditions du contrat" open={o[2]} toggle={() => t(2)}>
          <Toggle on={s.iraZero} set={(v) => us({ iraZero: v })} label="Indemnités négociées à 0 à la souscription" />
          <Field label="Montant minimum par opération" value={s.minPct} onChange={(v) => us({ minPct: v })} unit="%" step={1}
            hint={`${eur(K.minRA)} — clause usuelle`} />
          <Choice label="Mode de remboursement par défaut" value={s.modeDefaut} onChange={(v) => us({ modeDefaut: v })}
            options={[{ v: "duree", l: "Réduire la durée" }, { v: "mensualite", l: "Réduire la mensualité" }]} />
          <p style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.45 }}>
            Réduire la durée maximise les intérêts économisés. Réduire la mensualité libère du cash-flow immédiat mais économise beaucoup moins.
            Les indemnités sont plafonnées au plus faible de 3 % du capital restant dû ou six mois d'intérêts sur la somme remboursée,
            et supprimées en cas de mutation professionnelle, de cessation forcée d'activité ou de décès.
          </p>
        </Panel>

        <Panel n="03" title="Évaluation" open={o[3]} toggle={() => t(3)}>
          <Field label="Horizon d'évaluation" value={s.horizon} onChange={(v) => us({ horizon: v })} unit="ans" step={1} min={1}
            hint={`départ prévu à ${q.hDepart} ans`} />
          <Field label="Dernière année où proposer un remboursement" value={s.stopYear} onChange={(v) => us({ stopYear: v })} unit="ans" step={1} />
        </Panel>

        {p.ptzOn && (
          <div className="px-2 py-2 mb-4" style={{ background: "#FDF6E6", border: `1px solid ${C.brass}`, fontSize: 10.5, lineHeight: 1.45 }}>
            <b>Prêt à taux zéro détecté.</b> Il n'est jamais remboursé par anticipation ici : un capital qui ne porte pas d'intérêt
            ne coûte rien à conserver. Les opérations ne portent que sur le prêt principal.
          </div>
        )}
      </aside>

      <main className="px-4 py-4" style={{ minWidth: 0 }}>
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(148px,1fr))" }}>
          <Kpi big label="Intérêts économisés" value={eur(K.economie)} color={C.capital}
            sub={`sur ${eur(K.base.totI)} d'intérêts initiaux`} />
          <Kpi label="Indemnités payées" value={eur(K.ira)} color={C.interet} sub={s.iraZero ? "négociées à 0" : "plafond légal appliqué"} />
          <Kpi label="Économie nette des indemnités" value={eur(K.gainBrut)} color={C.capital} />
          <Kpi label="Durée raccourcie" value={K.moisGagnes > 0 ? `${K.moisGagnes} mois` : "—"}
            sub={s.modeDefaut === "mensualite" ? `mensualité ${eur(K.mensNouvelle)}` : `au lieu de ${p.annees * 12}`} />
          <Kpi label={`Gain net réel à ${s.horizon} ans`} value={signed(K.gainNet)} color={K.gainNet >= 0 ? C.capital : C.interet}
            sub="coût d'opportunité déduit" />
          <Kpi label="Capital remboursé par anticipation" value={eur(K.totalRA)} sub={`${s.ras.length} opération${s.ras.length > 1 ? "s" : ""}`} />
        </div>

        {/* Suggestion */}
        <div className="px-3 py-2.5 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2"
          style={{ border: `1px solid ${C.brass}`, background: "#FDF6E6" }}>
          <div style={{ fontSize: 11.5, lineHeight: 1.45, flex: "1 1 260px" }}>
            <b>Suggestion</b> — pour maximiser les intérêts économisés, verser toute la cagnotte disponible
            à chaque date anniversaire, en réduisant la durée. {suggestion.length > 0
              ? `${suggestion.length} opération${suggestion.length > 1 ? "s" : ""} possible${suggestion.length > 1 ? "s" : ""} jusqu'à l'année ${s.stopYear}.`
              : "Aucune opération ne dépasse le montant minimum du contrat."}
          </div>
          <div className="flex gap-2">
            <button onClick={() => us({ ras: suggestion })} disabled={!suggestion.length}
              className="px-3 py-1.5" style={{ background: suggestion.length ? C.ink : C.rule, color: C.paper, fontSize: 11, letterSpacing: ".03em" }}>
              Appliquer
            </button>
            <button onClick={() => us({ ras: [] })} className="px-3 py-1.5"
              style={{ border: `1px solid ${C.rule}`, background: "#fff", fontSize: 11, color: C.ink60 }}>Tout effacer</button>
          </div>
        </div>

        {/* Frise */}
        <section className="mb-4">
          <H2 right="Cliquez une année pour y placer un versement">Frise des remboursements</H2>
          <div style={{ border: `1px solid ${C.rule}`, background: "#fff", padding: 10 }}>
            <div className="flex gap-px">
              {Array.from({ length: nY }, (_, i) => i + 1).map((y) => {
                const ev = s.ras.find((x) => x.m === y * 12);
                const dispo = potAt(y);
                return (
                  <button key={y} onClick={() => (ev ? del(s.ras.findIndex((x) => x.m === y * 12)) : addRA(y))}
                    title={ev ? `Année ${y} : ${eur(ev.montant)} — cliquer pour retirer` : `Année ${y} : cagnotte ${eur(dispo)}`}
                    style={{
                      flex: 1, height: 46, position: "relative",
                      background: ev ? C.capital : dispo >= K.minRA ? "#DFE6EA" : C.paper,
                      border: `1px solid ${ev ? C.capital : C.rule}`, cursor: "pointer",
                    }}>
                    {ev && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontFamily: "'IBM Plex Mono',monospace" }}>
                      {Math.round(ev.montant / 1000)}k
                    </span>}
                  </button>);
              })}
            </div>
            <div className="flex justify-between mt-1" style={{ fontSize: 9.5, color: C.ink60 }}>
              <span>An 1</span><span>An {Math.round(nY / 2)}</span><span>An {nY}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2" style={{ fontSize: 10.5, color: C.ink60 }}>
              <Legend c={C.capital} t="Versement placé" />
              <Legend c="#DFE6EA" t="Cagnotte suffisante" />
              <Legend c={C.paper} t="Sous le minimum contractuel" />
            </div>
          </div>
        </section>

        {/* Liste éditable */}
        {s.ras.length > 0 && (
          <section className="mb-4">
            <H2>Versements programmés</H2>
            <div style={{ border: `1px solid ${C.rule}`, background: "#fff" }}>
              {s.ras.map((x, i) => {
                const ev = K.evts.find((e) => e.m === x.m);
                const tropTot = x.montant < K.minRA;
                return (
                  <div key={i} className="flex flex-wrap items-end gap-2 px-3 py-2.5"
                    style={{ borderBottom: i < s.ras.length - 1 ? `1px solid ${C.paper}` : "none" }}>
                    <div style={{ width: 62 }}>
                      <div style={{ fontSize: 9, textTransform: "uppercase", color: C.ink60, letterSpacing: ".05em" }}>Année</div>
                      <input type="number" value={x.m / 12} min={1} max={nY}
                        onChange={(e) => edit(i, { m: Math.max(1, Math.min(nY, +e.target.value)) * 12 })}
                        className="w-full px-1.5 py-1" style={{ border: `1px solid ${C.rule}`, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }} />
                    </div>
                    <div style={{ width: 110 }}>
                      <div style={{ fontSize: 9, textTransform: "uppercase", color: C.ink60, letterSpacing: ".05em" }}>Montant</div>
                      <input type="number" value={x.montant} step={1000} min={0}
                        onChange={(e) => edit(i, { montant: Math.max(0, +e.target.value) })}
                        className="w-full px-1.5 py-1" style={{ border: `1px solid ${tropTot ? C.interet : C.rule}`, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }} />
                    </div>
                    <div style={{ minWidth: 168 }}>
                      <div style={{ fontSize: 9, textTransform: "uppercase", color: C.ink60, letterSpacing: ".05em", marginBottom: 2 }}>Effet</div>
                      <div className="flex" style={{ border: `1px solid ${C.rule}` }}>
                        {[{ v: "duree", l: "Durée" }, { v: "mensualite", l: "Mensualité" }].map((m) => (
                          <button key={m.v} onClick={() => edit(i, { mode: m.v })} className="flex-1 px-2 py-1"
                            style={{ fontSize: 10.5, background: x.mode === m.v ? C.ink : "#fff", color: x.mode === m.v ? C.paper : C.ink60 }}>{m.l}</button>))}
                      </div>
                    </div>
                    <div className="flex-1" style={{ minWidth: 130, fontSize: 10.5, color: C.ink60, lineHeight: 1.4 }}>
                      {ev ? <>Indemnités {eur(ev.ira)}<br />Restant dû {eur(ev.balanceApres)}</> : "au-delà du terme"}
                      {tropTot && <div style={{ color: C.interet }}>Sous le minimum de {eur(K.minRA)}</div>}
                    </div>
                    <button onClick={() => del(i)} className="px-2 py-1" style={{ border: `1px solid ${C.rule}`, fontSize: 10.5, color: C.ink60 }}>Retirer</button>
                  </div>);
              })}
            </div>
            {K.wB.rupture && (
              <div className="px-3 py-2 mt-2" style={{ background: "#FBEDE9", border: `1px solid ${C.interet}`, fontSize: 11, lineHeight: 1.45 }}>
                La cagnotte devient insuffisante au mois {K.wB.rupture}. Un versement dépasse l'épargne réellement disponible à cette date.
              </div>)}
          </section>
        )}

        {/* Graphe comparatif */}
        <section className="mb-5">
          <H2 right="Avec et sans versements anticipés">Capital restant dû</H2>
          <div style={{ height: 200, border: `1px solid ${C.rule}`, background: "#fff", padding: 6 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={K.cmp} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.paper} vertical={false} />
                <XAxis dataKey="annee" tick={{ fontSize: 10, fill: C.ink60 }} tickLine={false} axisLine={{ stroke: C.rule }} minTickGap={26} />
                <YAxis tick={{ fontSize: 10, fill: C.ink60 }} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => eur(v)} labelFormatter={(l) => `Année ${l}`}
                  contentStyle={{ fontSize: 11, border: `1px solid ${C.rule}`, borderRadius: 0 }} />
                <Line dataKey="sans" name="Sans versement" stroke={C.ink60} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                <Line dataKey="avec" name="Avec versements" stroke={C.capital} strokeWidth={2} dot={false} isAnimationActive={false} />
                {s.ras.map((x) => <ReferenceLine key={x.m} x={x.m / 12} stroke={C.brass} strokeWidth={1} />)}
                <ReferenceLine x={revente} stroke={C.interet} strokeDasharray="2 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2" style={{ fontSize: 10.5, color: C.ink60 }}>
            <Legend c={C.ink60} t="Sans versement" /><Legend c={C.capital} t="Avec versements" />
            <Legend c={C.brass} t="Dates de versement" /><Legend c={C.interet} t={`Revente envisagée à ${revente} ans`} />
          </div>
        </section>

        {/* Verdict */}
        <section className="mb-4">
          <H2>Lecture honnête du gain</H2>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
            <div className="px-3 py-3" style={{ border: `1px solid ${C.ink}`, background: "#fff" }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>Intérêts économisés contre gain réel</div>
              <div style={{ fontSize: 11, color: C.ink60, lineHeight: 1.5 }}>
                Le compteur affiche {eur(K.economie)} d'intérêts évités, mais {eur(K.gainBrut)} une fois les indemnités déduites,
                et {signed(K.gainNet)} une fois retiré ce que cette épargne aurait rapporté placée à {pct(K.rendementNet, 2)} net.
                {arbitrage > 0 && " L'écart de rendement joue contre le remboursement anticipé."}
              </div>
            </div>
            <div className="px-3 py-3" style={{ border: `1px solid ${C.interet}`, background: "#fff" }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>Si vous revendez à {revente} ans</div>
              <div style={{ fontSize: 11, color: C.ink60, lineHeight: 1.5 }}>
                Le capital remboursé par anticipation vous revient intégralement à la vente : il n'est pas perdu, mais il n'est pas gagné non plus.
                Sur un horizon aussi court, le seul gain est l'intérêt évité pendant les mois restants, à comparer au rendement du placement.
                Un versement anticipé ressemble alors davantage à un virement d'un compte vers un autre qu'à un investissement.
              </div>
            </div>
            <div className="px-3 py-3" style={{ border: `1px solid ${C.rule}`, background: "#fff" }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>Ce que le modèle ne chiffre pas</div>
              <div style={{ fontSize: 11, color: C.ink60, lineHeight: 1.5 }}>
                Rembourser immobilise de la liquidité. À l'inverse d'un placement, l'argent versé sur un crédit ne se récupère qu'à la vente
                ou par un nouveau crédit. La modulation d'échéances et le report temporaire, souvent prévus au contrat,
                offrent une souplesse qu'un versement anticipé fait perdre.
              </div>
            </div>
          </div>
        </section>

        <p style={{ fontSize: 10.5, color: C.ink60, lineHeight: 1.5, maxWidth: 660 }}>
          Estimations à but pédagogique. Les clauses réelles de remboursement anticipé, de modulation et de report figurent
          à l'offre de prêt et priment sur les hypothèses retenues ici. Ceci n'est pas un conseil en investissement.
        </p>
      </main>
    </div>
  );
}

/* ═══ App ═════════════════════════════════════════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState(1);
  const [p, setP] = useState({
    prix: 350000, typeBien: "ancien", notairePct: 8, agence: 0, travaux: 0, apport: 40000,
    taux: 3.35, annees: 20, fraisDossier: 1200,
    assurTaux: .34, assurBase: "initial", quotite: 100,
    garType: "caution", garPct: 1.25, garRestit: 55,
    ptzOn: false, ptzMt: 40000, ptzDuree: 20, ptzDiffere: 10,
    compOn: false, compMt: 30000, compTaux: 1.5, compAnnees: 15,
    revenus: 4500, charges: 0,
  });
  const [q, setQ] = useState({
    loyer: 1200, chargesLoc: 60, mrhLoc: 15, inflLoyer: 1.5,
    taxeFonciere: 1400, chargesCopro: 100, provTravaux: .7, mrhProprio: 30, appreciation: 1,
    hDepart: 5, hFinal: 20, fraisAgence: 5, iraZero: false,
    rendement: 5, placTaxe: true,
    loyerPercu: 1250, vacance: 6, gestion: 7.5, pno: 180, regimeLoc: "reelnu",
    nuit: 95, occupation: 62, plateforme: 3, conciergerie: 22, chargesAirbnb: 2400,
    ameublement: 12000, regimeAirbnb: "nonclasse",
    residence: "hors", tauxIR: 20, forfaitTravaux: false, reintegreAmort: true,
  });
  const [s, setS] = useState({
    ras: [], iraZero: false, minPct: 10, modeDefaut: "duree",
    epargne0: 5000, epargne: 400, rendement: 5, placTaxe: true,
    horizon: 5, stopYear: 10,
  });
  const us = (o) => setS((x) => ({ ...x, ...o }));
  const up = (o) => setP((s2) => ({ ...s2, ...o }));
  const uq = (o) => setQ((s) => ({ ...s, ...o }));
  const R = useMemo(() => buildCredit(p), [p]);

  const tabs = [
    { n: 1, l: "Crédit" }, { n: 2, l: "Achat vs location" }, { n: 3, l: "Remboursements anticipés" },
  ];

  return (
    <div style={{ background: C.paper, color: C.ink, minHeight: "100%", fontFamily: "'Public Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        input[type=number]::-webkit-inner-spin-button{opacity:.25}
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;background:${C.rule};outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:22px;background:${C.ink};border:2px solid ${C.paper};cursor:ew-resize}
        input[type=range]::-moz-range-thumb{width:14px;height:22px;background:${C.ink};border:2px solid ${C.paper};cursor:ew-resize;border-radius:0}
        button:focus-visible,input:focus-visible{outline:2px solid ${C.brass};outline-offset:1px}
        @media (prefers-reduced-motion:reduce){*{transition:none!important}}
      `}</style>

      <header className="px-4 pt-4" style={{ borderBottom: `2px solid ${C.ink}` }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: ".14em", color: C.brass, textTransform: "uppercase" }}>
          Pilotage patrimonial immobilier
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 27, fontWeight: 700, lineHeight: 1.05, marginTop: 3, letterSpacing: "-.02em" }}>
          {tab === 1 ? "Calculateur de crédit" : tab === 2 ? "Acheter ou rester locataire" : "Remboursements anticipés"}
        </h1>
        <div className="flex flex-wrap gap-0 mt-3">
          {tabs.map((t) => (
            <button key={t.n} disabled={t.off} onClick={() => !t.off && setTab(t.n)}
              className="px-3 py-2" style={{
                fontSize: 11.5, letterSpacing: ".03em",
                borderTop: `1px solid ${C.rule}`, borderLeft: `1px solid ${C.rule}`, borderRight: `1px solid ${C.rule}`,
                background: tab === t.n ? C.paper : C.panel,
                borderBottom: tab === t.n ? `2px solid ${C.paper}` : "none",
                marginBottom: tab === t.n ? -2 : 0,
                color: t.off ? C.rule : tab === t.n ? C.ink : C.ink60,
                fontWeight: tab === t.n ? 600 : 400,
                cursor: t.off ? "not-allowed" : "pointer",
              }}>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9.5, color: C.brass, marginRight: 5 }}>
                {String(t.n).padStart(2, "0")}
              </span>{t.l}{t.off && " · à venir"}
            </button>))}
        </div>
      </header>

      {tab === 1 ? <ModuleCredit p={p} up={up} R={R} />
        : tab === 2 ? <ModuleCompare p={p} R={R} q={q} uq={uq} />
          : <ModuleRA p={p} R={R} q={q} s={s} us={us} />}
    </div>
  );
}
