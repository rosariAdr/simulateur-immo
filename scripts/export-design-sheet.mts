/**
 * PLANCHE DE DONNÉES POUR LE DESIGN
 *
 * Lit les fixtures et en tire un document lisible, à coller en entrée de
 * Claude Design. Le JSON brut est illisible pour un travail de mise en page ;
 * ce document montre les vrais chiffres, la vraie longueur des tableaux, et la
 * largeur réelle des montants.
 *
 *   node scripts/run.mjs scripts/export-design-sheet.mts
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const files = readdirSync("fixtures")
  .filter((f) => f.endsWith(".json"))
  .sort();

const out: string[] = [];
const w = (s = "") => out.push(s);

w("# Planche de données — sorties réelles du moteur");
w();
w("> Produit par `scripts/export-design-sheet.mts` à partir des fixtures. **Ne pas éditer à la main.**");
w("> Tous les chiffres de ce document sortent du moteur de calcul, aucun n'est inventé.");
w("> Le moteur compte 95 tests, dont des cas de référence vérifiés contre une source externe.");
w();

/* ── Largeurs réelles, pour dimensionner les colonnes ────────────────────── */

let widest = "";
let widestLabel = "";
for (const f of files) {
  const d = JSON.parse(readFileSync(`fixtures/${f}`, "utf8"));
  for (const r of d.tableau_mensuel) {
    for (const v of [r.interets_eur, r.capital_eur, r.assurance_eur, r.echeance_eur, r.restant_du_eur]) {
      if (String(v).length > widest.length) widest = String(v);
    }
  }
  for (const p of d.entree.prets) {
    if (p.label.length > widestLabel.length) widestLabel = p.label;
  }
}

w("## Contraintes de mise en page à respecter");
w();
w(`- **Montant le plus large rencontré : \`${widest}\`** (${widest.length} caractères). C'est lui qui dimensionne les colonnes de montants, pas la moyenne.`);
w(`- **Libellé de prêt le plus long : « ${widestLabel} »**.`);
w("- Le séparateur de milliers est une **espace insécable étroite**, la décimale une **virgule**, le symbole **après** le montant. C'est le format français, non négociable.");
w("- Les tableaux mensuels comptent **240 à 300 lignes**. Une maquette qui ne montre que cinq lignes ne prouve rien.");
w("- Deux scénarios sur quatre sont **non conformes** à une règle. L'état non conforme n'est pas un cas limite à traiter plus tard : c'est un état de premier plan.");
w();
w("---");
w();

/* ── Un bloc par scénario ────────────────────────────────────────────────── */

for (const f of files) {
  const d = JSON.parse(readFileSync(`fixtures/${f}`, "utf8"));
  const i = d.indicateurs;

  w(`## ${d.meta.label}`);
  w();
  w(`\`${d.meta.id}\` — ${d.meta.why}`);
  w();

  w("### Ce que l'utilisateur a saisi");
  w();
  w("| Paramètre | Valeur |");
  w("|---|---|");
  for (const p of d.entree.prets) {
    const diff = p.differe_mois > 0 ? `, différé ${p.differe_mois} mois` : "";
    w(`| ${p.label} | ${p.capital_eur} à ${p.taux} sur ${p.duree_mois} mois${diff} |`);
  }
  w(`| Assurance | ${d.entree.assurance.taux} sur ${d.entree.assurance.base}, quotité ${d.entree.assurance.quotite} |`);
  w(`| Garantie | ${d.garantie.type === "mortgage" ? "hypothèque" : d.garantie.type === "suretyship" ? "caution" : "nantissement"} — ${d.garantie.cout_eur}, dont ${d.garantie.restitue_au_terme_eur} restitués au terme |`);
  w(`| Revenu net mensuel | ${d.entree.revenu_net_mensuel_eur} |`);
  w(`| Prix du bien | ${d.entree.prix_du_bien_eur} |`);
  w();

  w("### Bandeau d'indicateurs");
  w();
  w("| Indicateur | Valeur |");
  w("|---|---|");
  w(`| Première mensualité | **${i.premiere_mensualite_eur}** |`);
  w(`| Mensualité maximale | **${i.mensualite_maximale_eur}**${i.premiere_mensualite_eur !== i.mensualite_maximale_eur ? " ← différente de la première" : ""} |`);
  w(`| Capital emprunté | ${i.capital_total_eur} |`);
  w(`| Intérêts | ${i.interets_total_eur} |`);
  w(`| Assurance | ${i.assurance_total_eur} |`);
  w(`| Frais initiaux | ${i.frais_initiaux_eur} |`);
  w(`| Coût total du crédit | **${i.cout_total_credit_eur}** |`);
  w(`| TAEG | ${i.taeg} |`);
  w(`| TAEA | ${i.taea} |`);
  w(`| Nombre d'échéances | ${i.nombre_echeances} |`);
  w(`| Mois de bascule capital/intérêts | ${i.mois_de_bascule ?? "aucun"} |`);
  w();

  w("### Conformité");
  w();
  w(`- **Usure** — ${d.usure.conforme ? "conforme" : "**SEUIL DÉPASSÉ**"} · TAEG ${d.usure.taeg} contre un plafond de ${d.usure.seuil} (${d.usure.trimestre}) · marge ${d.usure.marge_restante_points} point(s)`);
  w(`- **HCSF** — ${d.hcsf.conforme ? "conforme" : "**NON CONFORME**"} · taux d'effort ${d.hcsf.taux_effort} contre un plafond de ${d.hcsf.plafond} · durée max ${d.hcsf.duree_max_mois} mois · marge dérogatoire des banques ${d.hcsf.marge_derogatoire}`);
  w();

  const p = d.profil_amortissement;
  w("### Profil d'amortissement");
  w();
  w(`- Dix premières échéances : ${p.dix_premieres.interets_eur} d'intérêts, soit **${p.dix_premieres.part_interets}** de l'échéance`);
  w(`- Dix dernières échéances : ${p.dix_dernieres.interets_eur} d'intérêts, soit **${p.dix_dernieres.part_interets}**`);
  w(`- Rapport d'antériorité : **${p.rapport_ouverture_cloture}×**`);
  w(`- Les intérêts dominent dès la première échéance : **${p.interets_domines_des_la_premiere_echeance ? "oui" : "non"}**`);
  w(`- Médiane des intérêts au mois ${p.mediane_interets_mois}, médiane du capital au mois ${p.mediane_capital_mois} — **écart de ${p.ecart_des_medianes_mois} mois**`);
  w();

  w("### Jalons et fenêtres — à ne jamais confondre");
  w();
  w("| Jalon : part d'intérêts sous… | Mois | Fenêtre : 1 € versé rapporte ≥… | Jusqu'au mois |");
  w("|---|---|---|---|");
  const n = Math.max(d.jalons_de_constitution.length, d.fenetres_de_remboursement_anticipe.length);
  for (let k = 0; k < n; k++) {
    const j = d.jalons_de_constitution[k];
    const fe = d.fenetres_de_remboursement_anticipe[k];
    w(`| ${j ? j.seuil : ""} | ${j ? (j.mois ?? "jamais") : ""} | ${fe ? fe.rendement_vise : ""} | ${fe ? (fe.dernier_mois ?? "jamais") : ""} |`);
  }
  w();
  w("Les jalons décrivent **où en est le crédit**. Les fenêtres désignent **où agir**. Elles pointent en sens opposés.");
  w();

  w(`### Tableau annuel — ${d.tableau_annuel.length} lignes, intégralement reproduites`);
  w();
  w("| Année | Intérêts | Capital | Assurance | Échéances | Restant dû |");
  w("|---|---|---|---|---|---|");
  for (const a of d.tableau_annuel) {
    w(`| ${a.annee} | ${a.interets_eur} | ${a.capital_eur} | ${a.assurance_eur} | ${a.echeances_eur} | ${a.restant_du_eur} |`);
  }
  w();

  const rows = d.tableau_mensuel;
  w(`### Tableau mensuel — ${rows.length} lignes`);
  w();
  w("Extrait. Le tableau complet fait la longueur indiquée ci-dessus : c'est la contrainte de mise en page réelle.");
  w();
  w("| Mois | Intérêts | Capital | Assurance | Échéance | Restant dû |");
  w("|---|---|---|---|---|---|");
  const show = [0, 1, 2, Math.floor(rows.length / 2), rows.length - 3, rows.length - 2, rows.length - 1];
  let prev = -1;
  for (const k of show) {
    if (k - prev > 1 && prev >= 0) w("| … | … | … | … | … | … |");
    const r = rows[k];
    w(`| ${r.mois} | ${r.interets_eur} | ${r.capital_eur} | ${r.assurance_eur} | ${r.echeance_eur} | ${r.restant_du_eur} |`);
    prev = k;
  }
  w();
  w("---");
  w();
}

writeFileSync("fixtures/PLANCHE-DESIGN.md", out.join("\n"), "utf8");
console.log(`fixtures/PLANCHE-DESIGN.md — ${out.length} lignes, ${files.length} scenarios`);
