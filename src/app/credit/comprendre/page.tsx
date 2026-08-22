import type { Metadata } from "next";
import Link from "next/link";
import {
  ASSURANCE,
  DERNIERE_ANNEE,
  EFFORT,
  FAMILLES_PAR_SECTION,
  GARANTIES,
  MAJ_FICHE,
  MOIS_DE_BASCULE,
  PARAMS,
  PLAN,
  PREMIERE_ANNEE,
  RAPPORT_ANTERIORITE,
  EXEMPLE,
  TRANCHES_USURE,
  USURE,
  type AnneeLue,
} from "@/content/fiche-credit";
import { FAMILLES, type Famille } from "@/components/ui/taxonomie";
import { formatDuree, formatEuros, formatPourcentage } from "@/lib/format";

export const metadata: Metadata = {
  title: "Comprendre un crédit immobilier — fiche du module crédit",
  description:
    "Comment se forme une mensualité, ce qu'est le TAEG, l'assurance emprunteur et ses deux " +
    "bases de calcul, les trois garanties, le taux d'usure et le taux d'effort. " +
    "Chaque notion rattachée à sa famille : négociable, contraint, réglementaire.",
};

/**
 * FICHE PÉDAGOGIQUE DU MODULE CRÉDIT — `/credit/comprendre`, ticket `CNT-002`
 *
 * ── POURQUOI CETTE ROUTE ──────────────────────────────────────────────────
 *
 * Sous `/credit`, et non à la racine ni sous un `/fiches` générique. La fiche
 * n'existe que par le module : on y arrive en ayant vu des chiffres et en se
 * demandant ce qu'ils veulent dire. L'adresse le dit — « /credit, comprendre » —
 * et la parenté d'URL prépare `/comparaison/comprendre` sans inventer d'index de
 * contenus tant qu'il n'y a qu'une fiche.
 *
 * ── CE QUE LA FICHE FAIT, ET NE FAIT PAS ──────────────────────────────────
 *
 * Elle explique une mécanique et rattache chaque notion à sa famille —
 * négociable, contraint, réglementaire, le fil conducteur du produit
 * (`docs/CONTEXT.md` §3). Elle ne conseille rien : elle chiffre des écarts et
 * laisse la décision au lecteur (`docs/CONTEXT.md` §8). Deux tests gardent cette
 * règle, l'un sur le module de contenu, l'autre sur la page rendue.
 *
 * ── AUCUN CHIFFRE N'EST ÉCRIT ICI ─────────────────────────────────────────
 *
 * Ni les seuils réglementaires, ni les montants d'exemple. Les premiers viennent
 * de `src/core/fiscal/params.ts`, les seconds sont calculés par le moteur sur le
 * scénario par défaut du simulateur. Voir `src/content/fiche-credit.ts`.
 *
 * Composant serveur, prérendu statiquement : la page ne lit ni l'URL ni le
 * navigateur.
 */
export default function PageComprendreLeCredit() {
  return (
    <main className="min-h-full bg-papier text-encre">
      <article className="mx-auto max-w-[1240px] px-6 py-8 lg:px-10">
        <Entete />
        <Sommaire />
        <LesTroisFamilles />
        <Mensualite />
        <Taeg />
        <Assurance />
        <Garanties />
        <Plafonds />
        <CeQueLaFicheNeDitPas />
        <Retour />
      </article>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Le chapeau                                                                  */
/* -------------------------------------------------------------------------- */

function Entete() {
  return (
    <header className="max-w-[74ch] border-b border-filet pb-7">
      <p className="mb-3 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
        Fiche · module crédit
      </p>

      <h1 className="max-w-[24ch] font-titre text-[30px] font-bold leading-[1.15] tracking-[-0.026em] lg:text-[38px]">
        Comprendre un crédit immobilier
      </h1>

      <p className="mt-5 text-[16px] leading-[1.65]">
        Vous venez de voir des chiffres. Cette fiche dit d&apos;où ils viennent : comment une
        mensualité se forme, pourquoi les intérêts pèsent lourd au début, ce que mesure le TAEG, ce
        que coûte l&apos;assurance selon la façon dont on la calcule, ce que les trois garanties
        s&apos;échangent entre elles, et où se trouvent les deux murs que la réglementation dresse.
      </p>

      <p className="mt-3 text-[15px] leading-[1.65] text-encre-secondaire">
        Elle ne dit pas quoi faire. Elle chiffre des écarts et nomme, pour chaque notion, la famille
        dont elle relève — la décision reste la vôtre.
      </p>

      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-encre-secondaire">
        <span>Lecture suivie, une dizaine de minutes</span>
        <span>·</span>
        <span>Révision du texte : {MAJ_FICHE}</span>
        <span>·</span>
        <span>
          Barèmes du millésime {PARAMS.vintage}, {trimestreEnClair(USURE.trimestre)}
        </span>
      </p>

      <p className="mt-5 text-[13px]">
        <Lien href="/credit" marque="vers-credit">
          Retourner au simulateur de crédit
        </Lien>
      </p>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Le sommaire                                                                 */
/* -------------------------------------------------------------------------- */

const SECTIONS = [
  { ancre: "familles", titre: "Les trois familles de paramètres" },
  { ancre: "mensualite", titre: "Comment se forme une mensualité" },
  { ancre: "taeg", titre: "Le TAEG, le seul taux comparable" },
  { ancre: "assurance", titre: "L'assurance emprunteur et ses deux bases" },
  { ancre: "garantie", titre: "Les trois garanties" },
  { ancre: "plafonds", titre: "Les deux plafonds, et à qui ils s'imposent" },
  { ancre: "limites", titre: "Ce que cette fiche ne dit pas" },
] as const;

function Sommaire() {
  return (
    <nav aria-label="Sommaire de la fiche" className="border-b border-filet py-6">
      <h2 className="mb-3 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
        Ce que couvre cette fiche
      </h2>
      <ol className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <li key={s.ancre} className="flex gap-2.5 text-[13px] leading-[1.5]">
            <span className="font-mono text-[12px] tabular-nums text-encre-secondaire">
              {String(i + 1).padStart(2, "0")}
            </span>
            <Lien href={`#${s.ancre}`}>{s.titre}</Lien>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Les trois familles                                                          */
/* -------------------------------------------------------------------------- */

const ORDRE: readonly Famille[] = ["negociable", "contraint", "reglementaire"];

/**
 * Le fil conducteur, rappelé une fois puis employé partout.
 *
 * Les libellés et les messages viennent de `src/components/ui/taxonomie.ts`,
 * la même source que les champs de saisie et la page d'accueil.
 */
function LesTroisFamilles() {
  return (
    <Section ancre="familles" titre="Les trois familles de paramètres">
      <Para>
        Tout paramètre d&apos;un crédit appartient à l&apos;une de trois familles. Savoir laquelle
        change ce qu&apos;on peut en faire : un chiffre négociable se discute, un chiffre contraint
        se change en changeant le projet, un chiffre réglementaire ne se discute pas du tout.
        Chaque section de cette fiche porte la ou les familles dont elle relève.
      </Para>

      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ORDRE.map((famille) => {
          const style = FAMILLES[famille];
          return (
            <li
              key={famille}
              data-famille={famille}
              className={`${style.bordure} bg-panneau px-4 py-3.5`}
            >
              <h3 className="font-titre text-[16px] font-semibold capitalize">{style.libelle}</h3>
              <p className="mt-2 text-[13px] leading-[1.6]">{style.message}</p>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 max-w-[80ch] text-[12px] leading-[1.55] text-encre-secondaire">
        L&apos;appartenance se lit au trait de la bordure — plein laiton, plein gris, tireté — et à
        l&apos;étiquette en toutes lettres. Jamais à la couleur seule.
      </p>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 1 — La mensualité                                                           */
/* -------------------------------------------------------------------------- */

function Mensualite() {
  return (
    <Section
      ancre="mensualite"
      titre="Comment se forme une mensualité"
      familles={FAMILLES_PAR_SECTION["mensualite"]}
    >
      <Para>
        Une mensualité de prêt à taux fixe ne change pas pendant toute la durée. Ce qu&apos;elle
        contient, si. Chaque mois, la banque calcule d&apos;abord les intérêts sur le capital qui
        lui reste dû ; ce qui reste de la mensualité rembourse le capital. Comme le capital dû
        diminue à chaque échéance, les intérêts diminuent avec lui — et la part qui rembourse
        grandit d&apos;elle-même, sans qu&apos;aucune clause ne l&apos;organise.
      </Para>

      <Para>
        L&apos;assurance s&apos;ajoute par-dessus, et c&apos;est un poste distinct : elle ne
        rembourse rien du capital. Sur l&apos;exemple ci-dessous, la mensualité s&apos;établit à{" "}
        <Montant valeur={formatEuros(PLAN.firstPayment)} nom="mensualite" />, assurance comprise.
      </Para>

      <Exemple />

      <TableauAnnees annees={[PREMIERE_ANNEE, DERNIERE_ANNEE]} />

      <Para>
        À proportion, la première année de ce prêt contient environ{" "}
        <strong className="font-semibold">{Math.round(RAPPORT_ANTERIORITE)} fois</strong> plus
        d&apos;intérêts que la dernière. C&apos;est ce déséquilibre qui rend un remboursement
        anticipé d&apos;autant plus efficace qu&apos;il intervient tôt : un euro versé économise les
        intérêts qu&apos;il aurait produits jusqu&apos;au terme, donc d&apos;autant plus
        qu&apos;il reste d&apos;échéances devant lui.
      </Para>

      <Encadre titre="Une idée reçue, et ce qu'elle confond">
        <p className="text-[13px] leading-[1.65]">
          On lit souvent que « les premières échéances ne remboursent presque rien ». Sur ce prêt,
          c&apos;est inexact :{" "}
          {MOIS_DE_BASCULE === 1 ? (
            <>
              dès la première échéance, la part de capital dépasse déjà celle des intérêts — elle
              représente {formatPourcentage(100 - PREMIERE_ANNEE.partInterets, 1)} de la première
              année, intérêts et capital confondus.
            </>
          ) : (
            <>
              la part de capital dépasse celle des intérêts à partir du mois{" "}
              <span className="font-mono tabular-nums">{MOIS_DE_BASCULE}</span>.
            </>
          )}
        </p>
        <p className="mt-2.5 text-[13px] leading-[1.65]">
          Deux affirmations distinctes se confondent ici. « Les intérêts sont maximaux au début »
          est vrai de tout prêt amortissable. « Les intérêts dépassent le capital au début » ne
          l&apos;est que si le taux et la durée sont assez élevés — la comparaison exacte porte sur{" "}
          <span className="font-mono text-[12px]">(1 + r)ⁿ</span> face à 2, où{" "}
          <span className="font-mono text-[12px]">r</span> est le taux mensuel et{" "}
          <span className="font-mono text-[12px]">n</span> le nombre d&apos;échéances.
        </p>
      </Encadre>

      <Para>
        Dans cette mécanique, le taux nominal relève du{" "}
        <MotFamille famille="negociable" /> : il se discute, et il pèse sur toute la durée. Le
        capital emprunté et la durée relèvent du <MotFamille famille="contraint" /> : ils ne se
        négocient pas avec la banque, ils se changent en changeant le projet — un apport plus
        important, un bien moins cher, une durée plus courte.
      </Para>
    </Section>
  );
}

/** Le scénario d'exemple, énoncé une fois, réutilisé partout. */
function Exemple() {
  return (
    <div className="my-5 border-l-2 border-filet bg-panneau px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
        L&apos;exemple de cette fiche
      </p>
      <p className="mt-2 text-[13px] leading-[1.65]">
        Un bien à <span className="font-mono tabular-nums">{formatEuros(EXEMPLE.prix)}</span>, un
        apport de <span className="font-mono tabular-nums">{formatEuros(EXEMPLE.apport)}</span>,
        soit{" "}
        <span className="font-mono tabular-nums">{formatEuros(EXEMPLE.capitalEmprunte)}</span>{" "}
        empruntés à {formatPourcentage(EXEMPLE.tauxPct)} sur {formatDuree(EXEMPLE.dureeMois)}, avec
        une assurance de {formatPourcentage(ASSURANCE.tauxPct)} sur le capital initial,{" "}
        <span className="font-mono tabular-nums">{formatEuros(EXEMPLE.fraisDossier)}</span> de frais
        de dossier et un revenu net mensuel de{" "}
        <span className="font-mono tabular-nums">{formatEuros(EXEMPLE.revenu)}</span>.
      </p>
      <p className="mt-2 text-[12px] leading-[1.6] text-encre-secondaire">
        C&apos;est le scénario que le module crédit ouvre par défaut, et tous les chiffres de cette
        fiche en sont issus. Ouvrez{" "}
        <Lien href="/credit">le simulateur</Lien> sans rien changer : vous y retrouverez les mêmes.
      </p>
    </div>
  );
}

/** Première et dernière année, à l'échelle. Les colonnes portent leur libellé. */
function TableauAnnees({ annees }: { annees: readonly AnneeLue[] }) {
  return (
    <div className="my-5 border border-filet bg-panneau">
      <p className="border-b border-filet px-4 py-2.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
        Ce que contiennent les échéances, première et dernière année
      </p>
      <div className="overflow-x-auto">
        <table data-tableau-annees className="w-full min-w-[30rem] border-collapse">
          <thead>
            <tr className="border-b border-filet">
              <th className="px-4 py-2 text-left text-[11px] font-normal text-encre-secondaire">
                Année
              </th>
              <th className="px-4 py-2 text-right text-[11px] font-normal text-encre-secondaire">
                dont intérêts
              </th>
              <th className="px-4 py-2 text-right text-[11px] font-normal text-encre-secondaire">
                dont capital
              </th>
              <th className="px-4 py-2 text-right text-[11px] font-normal text-encre-secondaire">
                part d&apos;intérêts
              </th>
            </tr>
          </thead>
          <tbody>
            {annees.map((a) => (
              <tr key={a.rang} className="border-b border-filet last:border-b-0">
                <td className="px-4 py-2.5 text-[13px]">
                  {a.libelle}{" "}
                  <span className="text-encre-secondaire">
                    (année <span className="font-mono tabular-nums">{a.rang}</span>)
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums text-interets-texte">
                  {formatEuros(a.interets)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums text-capital-texte">
                  {formatEuros(a.capital)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums">
                  {formatPourcentage(a.partInterets, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-filet px-4 py-2.5 text-[12px] leading-[1.55] text-encre-secondaire">
        Hors assurance, qui s&apos;ajoute à l&apos;échéance sans rembourser de capital. Les intérêts
        sont en brique, le capital en vert — les colonnes portent le mot, la couleur ne fait que le
        redire.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2 — Le TAEG                                                                 */
/* -------------------------------------------------------------------------- */

function Taeg() {
  return (
    <Section
      ancre="taeg"
      titre="Le TAEG, le seul taux comparable"
      familles={FAMILLES_PAR_SECTION["taeg"]}
    >
      <Para>
        Le taux nominal ne dit qu&apos;une partie du prix. Deux banques peuvent l&apos;afficher
        identique et facturer des crédits différents, parce que l&apos;assurance, les frais de
        dossier et le coût de la garantie ne s&apos;y trouvent pas. Le taux annuel effectif global
        les réunit tous : c&apos;est le seul chiffre qui permette de mettre deux offres côte à côte.
      </Para>

      <Para>
        Sa méthode de calcul n&apos;appartient pas aux banques — elle est fixée par le Code de la
        consommation, qui impose l&apos;équivalence actuarielle entre le capital reçu et la suite
        des échéances, et qui énumère les frais à inclure et ceux à laisser dehors. C&apos;est ce
        qui en fait un repère de famille <MotFamille famille="reglementaire" /> : sa définition ne
        se négocie pas. Ce qu&apos;il agrège, en revanche, est largement{" "}
        <MotFamille famille="negociable" />.
      </Para>

      <ListeChiffres
        entrees={[
          ["Taux nominal du prêt", formatPourcentage(EXEMPLE.tauxPct)],
          ["TAEG du même prêt", formatPourcentage(PLAN.aprPct)],
          ["dont la part propre à l'assurance (TAEA)", formatPourcentage(PLAN.taeaPct)],
        ]}
      />

      <Para>
        Sur l&apos;exemple, l&apos;écart entre le taux nominal et le TAEG s&apos;établit à{" "}
        {enPoints(PLAN.aprPct - EXEMPLE.tauxPct)} — c&apos;est ce que coûtent
        l&apos;assurance, les frais de dossier et la caution, ramenés à un taux.
      </Para>

      <Para>
        Ce que le TAEG n&apos;inclut pas : les frais d&apos;acquisition, ceux qu&apos;on appelle
        « frais de notaire ». Ils ne rémunèrent pas le crédit, et le Code de la consommation les
        exclut expressément. Un TAEG n&apos;est donc pas le coût de l&apos;opération, seulement
        celui de son financement.
      </Para>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 — L'assurance                                                             */
/* -------------------------------------------------------------------------- */

function Assurance() {
  return (
    <Section
      ancre="assurance"
      titre="L'assurance emprunteur et ses deux bases"
      familles={FAMILLES_PAR_SECTION["assurance"]}
    >
      <Para>
        L&apos;assurance emprunteur est le deuxième poste de coût d&apos;un crédit, et celui dont le
        taux affiché renseigne le moins. Deux contrats au même taux peuvent coûter du simple au
        double, parce qu&apos;ils ne calculent pas la prime sur la même base.
      </Para>

      <Para>
        <strong className="font-semibold">Sur le capital initial</strong>, la prime est calculée une
        fois pour toutes sur le montant emprunté d&apos;origine : elle ne bouge jamais, même quand
        il ne reste presque plus rien à rembourser.{" "}
        <strong className="font-semibold">Sur le capital restant dû</strong>, elle suit la dette et
        décroît avec elle. La différence n&apos;a rien de marginal.
      </Para>

      <ListeChiffres
        entrees={[
          [
            `Coût total sur la durée, base capital initial, taux ${formatPourcentage(ASSURANCE.tauxPct)}`,
            formatEuros(ASSURANCE.surCapitalInitial),
          ],
          [
            "Coût total sur la durée, base capital restant dû, au même taux affiché",
            formatEuros(ASSURANCE.surCapitalRestantDu),
          ],
          ["Écart entre les deux", formatPourcentage(ASSURANCE.ecartPct, 1)],
        ]}
      />

      <Para>
        À taux identique, l&apos;écart atteint donc{" "}
        {formatPourcentage(ASSURANCE.ecartPct, 1)} du coût total sur cet exemple. Comparer deux
        contrats sur leur seul taux revient à ignorer cette variable ; c&apos;est le TAEA, qui isole
        la part de l&apos;assurance à l&apos;intérieur du TAEG, qui se compare d&apos;un contrat à
        l&apos;autre.
      </Para>

      <Encadre titre="Ce que la loi Lemoine a ouvert">
        <p className="text-[13px] leading-[1.65]">
          Depuis la loi du 28 février 2022, un contrat d&apos;assurance emprunteur se substitue{" "}
          <strong className="font-semibold">à tout moment</strong>, sans frais et sans attendre une
          date anniversaire, dès lors que les garanties de remplacement sont équivalentes. La banque
          dispose d&apos;un délai pour répondre et motive un refus.
        </p>
        <p className="mt-2.5 text-[13px] leading-[1.65]">
          La même loi supprime le questionnaire de santé lorsque la part assurée n&apos;excède pas{" "}
          <span className="font-mono tabular-nums">{formatEuros(ASSURANCE.lemoineSeuil)}</span> par
          assuré et que le prêt s&apos;achève avant le{" "}
          <span className="font-mono tabular-nums">{ASSURANCE.lemoineAgeAuTerme}</span>
          <sup>e</sup> anniversaire de l&apos;emprunteur.
        </p>
        <p className="mt-2.5 text-[13px] leading-[1.65] text-encre-secondaire">
          C&apos;est ce qui range l&apos;assurance dans la famille{" "}
          <MotFamille famille="negociable" /> non seulement avant la signature, mais pendant toute
          la vie du prêt — cas rare parmi les paramètres d&apos;un crédit.
        </p>
      </Encadre>

      <Para>
        Deux autres variables pèsent sur la prime. La{" "}
        <strong className="font-semibold">quotité</strong> est la part du capital couverte pour
        chaque emprunteur : à deux, une couverture totale de 200 % coûte deux fois une couverture de
        100 %, et la répartition entre les têtes se discute. Le{" "}
        <strong className="font-semibold">type de contrat</strong> ensuite : les contrats de groupe
        proposés par les banques se situent, à titre indicatif, entre{" "}
        {formatPourcentage(ASSURANCE.fourchetteGroupePct[0], 2)} et{" "}
        {formatPourcentage(ASSURANCE.fourchetteGroupePct[1], 2)}, les délégations entre{" "}
        {formatPourcentage(ASSURANCE.fourchetteDelegationPct[0], 2)} et{" "}
        {formatPourcentage(ASSURANCE.fourchetteDelegationPct[1], 2)}. Ces fourchettes décrivent un
        marché, pas une règle : elles dépendent de l&apos;âge, de l&apos;état de santé et de la
        profession, que ce simulateur ne modélise pas.
      </Para>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 — Les garanties                                                           */
/* -------------------------------------------------------------------------- */

function Garanties() {
  const caution = GARANTIES[0];
  const hypotheque = GARANTIES[1];

  return (
    <Section
      ancre="garantie"
      titre="Les trois garanties"
      familles={FAMILLES_PAR_SECTION["garantie"]}
    >
      <Para>
        Une banque ne prête pas sans garantie : elle exige de quoi se rembourser si les échéances
        cessent d&apos;être payées. Trois formes coexistent, et leur prix affiché ne suffit pas à
        les départager.
      </Para>

      <Para>
        La <strong className="font-semibold">caution</strong> est donnée par un organisme
        spécialisé, qui prélève une commission et une contribution à un fonds mutuel de garantie ;
        une part de ce fonds est restituée au terme du prêt, si aucun incident n&apos;est survenu.
        L&apos;<strong className="font-semibold">hypothèque</strong> inscrit un droit sur le bien
        lui-même : elle coûte des taxes et des émoluments à la signature, et une mainlevée si le
        bien est revendu avant le terme. Le{" "}
        <strong className="font-semibold">nantissement</strong> affecte en garantie un placement
        déjà constitué — assurance vie, portefeuille — ce qui suppose de disposer de ce placement et
        de le laisser immobilisé.
      </Para>

      <TableauGaranties />

      <Para>
        L&apos;arbitrage se joue sur l&apos;horizon de détention, et l&apos;ordre des trois change
        avec lui. Si le prêt va jusqu&apos;à son terme, la restitution du fonds mutuel ramène le
        coût net de la caution à{" "}
        <span className="font-mono tabular-nums">{formatEuros(caution?.netAuTerme ?? 0)}</span>,
        contre <span className="font-mono tabular-nums">{formatEuros(hypotheque?.netAuTerme ?? 0)}</span>{" "}
        pour l&apos;hypothèque. En cas de revente anticipée, cette restitution n&apos;intervient pas
        et la mainlevée s&apos;ajoute : l&apos;écart se creuse alors dans le même sens, à{" "}
        <span className="font-mono tabular-nums">
          {formatEuros(caution?.netEnCasDeRevente ?? 0)}
        </span>{" "}
        contre{" "}
        <span className="font-mono tabular-nums">
          {formatEuros(hypotheque?.netEnCasDeRevente ?? 0)}
        </span>
        .
      </Para>

      <Para>
        Le choix de la garantie relève du <MotFamille famille="negociable" />, mais il ne l&apos;est
        pas toujours dans les faits : l&apos;organisme de caution peut refuser un dossier, et la
        banque impose alors l&apos;hypothèque. Une garantie refusée n&apos;est pas une garantie
        négociée.
      </Para>

      <p className="mt-4 border-l-2 border-filet pl-3.5 text-[12px] leading-[1.6] text-encre-secondaire">
        Les barèmes employés ici sont des ordres de grandeur de marché, et non des valeurs
        réglementaires : les tarifs réels des organismes de caution sont progressifs et dépendent du
        montant emprunté. Ils n&apos;ont pas encore été confrontés aux barèmes publiés, et cette
        fiche le signale plutôt que de laisser croire à une précision qu&apos;elle n&apos;a pas.
      </p>
    </Section>
  );
}

function TableauGaranties() {
  return (
    <div className="my-5 border border-filet bg-panneau">
      <p className="border-b border-filet px-4 py-2.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
        Sur l&apos;exemple, pour {formatEuros(PLAN.totalPrincipal)} garantis
      </p>
      <div className="overflow-x-auto">
        <table data-tableau-garanties className="w-full min-w-[34rem] border-collapse">
          <thead>
            <tr className="border-b border-filet">
              <th className="px-4 py-2 text-left text-[11px] font-normal text-encre-secondaire">
                Garantie
              </th>
              <th className="px-4 py-2 text-right text-[11px] font-normal text-encre-secondaire">
                à la signature
              </th>
              <th className="px-4 py-2 text-right text-[11px] font-normal text-encre-secondaire">
                restitué au terme
              </th>
              <th className="px-4 py-2 text-right text-[11px] font-normal text-encre-secondaire">
                mainlevée si revente
              </th>
            </tr>
          </thead>
          <tbody>
            {GARANTIES.map((g) => (
              <tr key={g.cle} data-garantie={g.cle} className="border-b border-filet last:border-b-0">
                <td className="px-4 py-2.5 text-[13px]">{g.nom}</td>
                <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums text-interets-texte">
                  {formatEuros(g.cout)}
                </td>
                {/*
                  Un tiret n'est pas un montant : il reste en encre secondaire.
                  Le peindre en vert ferait porter à la couleur une information
                  qu'elle ne dit pas — « rien » n'est pas « un gain ».
                */}
                <Cellule valeur={g.restitue} teinte="text-capital-texte" />
                <Cellule valeur={g.mainlevee} teinte="text-interets-texte" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Une cellule de montant, ou un tiret quand il n'y a rien à afficher. */
function Cellule({ valeur, teinte }: { valeur: number; teinte: string }) {
  return (
    <td
      className={`px-4 py-2.5 text-right font-mono text-[13px] tabular-nums ${
        valeur > 0 ? teinte : "text-encre-secondaire"
      }`}
    >
      {valeur > 0 ? formatEuros(valeur) : "—"}
    </td>
  );
}

/* -------------------------------------------------------------------------- */
/* 5 — Les deux plafonds                                                       */
/* -------------------------------------------------------------------------- */

function Plafonds() {
  return (
    <Section
      ancre="plafonds"
      titre="Les deux plafonds, et à qui ils s'imposent"
      familles={FAMILLES_PAR_SECTION["plafonds"]}
    >
      <Para>
        Deux murs bornent un crédit immobilier. Ni l&apos;un ni l&apos;autre ne se discute — ils
        relèvent en entier de la famille <MotFamille famille="reglementaire" /> — mais ils ne
        s&apos;adressent ni au même destinataire ni avec la même rigidité.
      </Para>

      <h3 className="mb-2 mt-7 font-titre text-[17px] font-semibold">
        Le taux d&apos;usure plafonne le TAEG, pas le taux
      </h3>

      <Para>
        La Banque de France publie chaque trimestre un seuil au-delà duquel aucun établissement
        n&apos;a le droit de prêter. Ce seuil porte sur le{" "}
        <strong className="font-semibold">TAEG complet</strong> — assurance, frais de dossier et
        garantie inclus — et non sur le taux nominal. Un dossier peut donc buter sur l&apos;usure à
        cause de son assurance, alors même que le taux négocié est raisonnable. C&apos;est la cause
        de refus la moins bien comprise.
      </Para>

      <ListeChiffres
        entrees={TRANCHES_USURE.map(
          (t) => [`Prêt à taux fixe, ${t.libelle}`, formatPourcentage(t.seuilPct)] as const,
        )}
        note={`Seuils du ${trimestreEnClair(USURE.trimestre)}, applicables du ${dateEnClair(USURE.du)} au ${dateEnClair(USURE.au)}. Ils sont révisés chaque trimestre.`}
      />

      <Para>
        Sur l&apos;exemple, le TAEG de {formatPourcentage(USURE.taegDuScenarioPct)} se tient{" "}
        {enPoints(USURE.margePoints)} sous le seuil de{" "}
        {formatPourcentage(USURE.seuilDuScenarioPct)} qui lui est applicable.
      </Para>

      <Para>
        <strong className="font-semibold">À qui ce plafond s&apos;impose-t-il ?</strong> À
        l&apos;établissement prêteur, à qui il est interdit de dépasser le seuil, sous peine de
        sanction. Il n&apos;existe aucune dérogation : c&apos;est un mur sans porte, et un dossier
        au-delà ne se finance pas — il se modifie, en agissant sur ce qui entre dans le TAEG.
      </Para>

      <h3 className="mb-2 mt-7 font-titre text-[17px] font-semibold">
        Le taux d&apos;effort, et la durée maximale
      </h3>

      <Para>
        Le Haut Conseil de stabilité financière fixe aux banques deux normes d&apos;octroi : un taux
        d&apos;effort maximal de {formatPourcentage(EFFORT.plafondPct, 1)} des revenus nets,{" "}
        <strong className="font-semibold">assurance comprise</strong>, et une durée maximale de{" "}
        {formatDuree(EFFORT.dureeMaxMois)}, portée à {formatDuree(EFFORT.dureeDerogatoireMois)}{" "}
        lorsque des travaux atteignent {formatPourcentage(EFFORT.partTravauxPct, 1)} du montant
        emprunté, ainsi qu&apos;en construction ou en vente en l&apos;état futur
        d&apos;achèvement.
      </Para>

      <ListeChiffres
        entrees={[
          ["Taux d'effort maximal, assurance comprise", formatPourcentage(EFFORT.plafondPct, 1)],
          ["Durée maximale", formatDuree(EFFORT.dureeMaxMois)],
          [
            `Durée maximale avec travaux d'au moins ${formatPourcentage(EFFORT.partTravauxPct, 1)}`,
            formatDuree(EFFORT.dureeDerogatoireMois),
          ],
          [
            "Part de la production trimestrielle pouvant déroger",
            formatPourcentage(EFFORT.margeDerogationPct, 1),
          ],
          ["Taux d'effort de l'exemple", formatPourcentage(EFFORT.duScenarioPct)],
        ]}
      />

      <Para>
        <strong className="font-semibold">À qui ce plafond s&apos;impose-t-il ?</strong> Aux
        établissements, et non aux emprunteurs. La nuance est pratique et non théorique : chaque
        banque peut consacrer {formatPourcentage(EFFORT.margeDerogationPct, 1)} de sa production
        trimestrielle à des dossiers qui dépassent ces normes, une marge prioritairement affectée à
        la résidence principale et aux primo-accédants. Un dossier au-delà du seuil n&apos;est donc
        pas hors la loi ; il consomme une ressource rare, et il est examiné comme tel.
      </Para>

      <Para>
        Un critère supplémentaire échappe à ces chiffres : le{" "}
        <strong className="font-semibold">reste à vivre</strong>, c&apos;est-à-dire ce que le foyer
        conserve une fois les charges de crédit payées. Il n&apos;est normé par aucun texte, chaque
        banque applique le sien, et il se révèle parfois plus contraignant que le ratio lui-même.
        Ce simulateur ne le calcule pas.
      </Para>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Les limites                                                                 */
/* -------------------------------------------------------------------------- */

function CeQueLaFicheNeDitPas() {
  return (
    <Section ancre="limites" titre="Ce que cette fiche ne dit pas">
      <Para>
        Dire ce qu&apos;un calcul laisse dehors compte autant que le calcul lui-même. Six omissions
        méritent d&apos;être nommées.
      </Para>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LIMITES.map(([titre, texte]) => (
          <li key={titre} className="border border-filet bg-panneau px-4 py-3">
            <h3 className="font-titre text-[14px] font-semibold">{titre}</h3>
            <p className="mt-1.5 text-[12px] leading-[1.6] text-encre-secondaire">{texte}</p>
          </li>
        ))}
      </ul>

      <p className="mt-5 max-w-[80ch] text-[12px] leading-[1.6] text-encre-secondaire">
        Les valeurs réglementaires citées portent le millésime {PARAMS.vintage} et ont été relevées
        le {dateEnClair(PARAMS.verifiedAt)} ; plusieurs attendent encore d&apos;être confrontées à
        une source officielle, et la page{" "}
        <Lien href="/avertissement">sur la portée de l&apos;outil</Lien> dit lesquelles.
      </p>
    </Section>
  );
}

/** Ce que le calcul laisse dehors. Six entrées, chacune nommée. */
const LIMITES: readonly (readonly [string, string])[] = [
  [
    "Le coût de l'opération",
    "Les chiffres ci-dessus décrivent un financement, jamais une acquisition : ni frais d'acquisition, ni taxe foncière, ni charges de copropriété, ni entretien n'y figurent.",
  ],
  [
    "Le prix réel des garanties",
    "Les barèmes des organismes de caution sont progressifs et n'ont pas encore été confrontés à leurs publications. Les montants indiqués sont des ordres de grandeur.",
  ],
  [
    "Ce que coûtera votre assurance",
    "La prime dépend de l'âge, de l'état de santé et de la profession. Le simulateur applique le taux que vous saisissez ; il ne le prédit pas.",
  ],
  [
    "Le lissage de plusieurs prêts",
    "Quand un prêt aidé s'ajoute au prêt principal, les banques lissent l'ensemble pour obtenir une mensualité constante. Le calcul décrit ici les prêts tels qu'ils sont contractés.",
  ],
  [
    "Si l'opération est une bonne idée",
    "Comparer avec la location, mesurer un horizon de revente ou arbitrer avec un placement sont d'autres questions, qui dépendent d'hypothèses que vous seul posez.",
  ],
  [
    "Ce qui fait foi",
    "Un écart avec le calcul de votre banque est normal : les conventions d'arrondi et les périmètres de frais varient d'un établissement à l'autre. En cas de divergence, c'est l'offre de prêt qui fait foi.",
  ],
];

/* -------------------------------------------------------------------------- */
/* Le retour                                                                   */
/* -------------------------------------------------------------------------- */

function Retour() {
  return (
    <nav aria-label="Suite de la lecture" className="mt-10 border-t border-filet pt-5">
      <p className="text-[14px] leading-[1.6]">
        <Lien href="/credit" marque="retour-credit">
          Reprendre le simulateur de crédit
        </Lien>
      </p>
      <p className="mt-1.5 max-w-[80ch] text-[12px] leading-[1.55] text-encre-secondaire">
        Les notions de cette fiche y sont rappelées en deux phrases, sur la pastille « i » posée à
        côté de chaque champ.
      </p>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Le gabarit                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Une section de la fiche, avec les familles dont elle relève.
 *
 * L'étiquette porte le mot en toutes lettres ET le trait de bordure de la
 * famille. Un lecteur qui ne distingue pas le laiton du gris lit quand même
 * « négociable », et voit quand même le tireté du réglementaire.
 */
function Section({
  ancre,
  titre,
  familles,
  children,
}: {
  ancre: string;
  titre: string;
  familles?: readonly Famille[];
  children: React.ReactNode;
}) {
  return (
    <section id={ancre} data-section={ancre} className="border-b border-filet py-8 last:border-b-0">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 className="font-titre text-[21px] font-semibold tracking-[-0.014em] lg:text-[24px]">
          {titre}
        </h2>
        {familles && familles.length > 0 && (
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-[11px] text-encre-secondaire">Famille :</span>
            {familles.map((f) => (
              <Etiquette key={f} famille={f} />
            ))}
          </p>
        )}
      </div>
      <div className="max-w-[74ch]">{children}</div>
    </section>
  );
}

function Etiquette({ famille }: { famille: Famille }) {
  const style = FAMILLES[famille];
  return (
    <span
      data-etiquette-famille={famille}
      className={`${style.bordure} ${style.etiquette} px-2 py-0.5 text-[11px] uppercase tracking-[0.05em]`}
    >
      {style.libelle}
    </span>
  );
}

/** Le mot d'une famille, dans le fil du texte, souligné du trait de l'accent. */
function MotFamille({ famille }: { famille: Famille }) {
  return (
    <span data-mot-famille={famille} className="underline decoration-accent underline-offset-2">
      {FAMILLES[famille].libelle}
    </span>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="mb-3.5 text-[15px] leading-[1.7] last:mb-0">{children}</p>;
}

function Encadre({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <aside className="my-5 border border-filet bg-panneau px-4 py-3.5">
      <p className="mb-2 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">{titre}</p>
      {children}
    </aside>
  );
}

/** Une liste de couples libellé / valeur. Les valeurs restent en encre. */
function ListeChiffres({
  entrees,
  note,
}: {
  entrees: readonly (readonly [string, string])[];
  note?: string;
}) {
  return (
    <div className="my-5 border-l-2 border-filet pl-3.5">
      <dl>
        {entrees.map(([libelle, valeur]) => (
          <div
            key={libelle}
            className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 last:mb-0"
          >
            <dt className="text-[13px] leading-[1.6] text-encre-secondaire">{libelle}</dt>
            <dd className="font-mono text-[13px] tabular-nums">{valeur}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-2.5 text-[12px] leading-[1.55] text-encre-secondaire">{note}</p>}
    </div>
  );
}

/** Un montant nommé, repérable par les tests de bout en bout. */
function Montant({ valeur, nom }: { valeur: string; nom: string }) {
  return (
    <span data-chiffre={nom} className="font-mono text-[14px] tabular-nums">
      {valeur}
    </span>
  );
}

/**
 * Un lien de la fiche. `marque` pose un `data-lien`, ce qui donne aux tests de
 * bout en bout une prise stable : un libellé se réécrit, un repère non.
 */
function Lien({
  href,
  marque,
  children,
}: {
  href: string;
  marque?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      {...(marque === undefined ? {} : { "data-lien": marque })}
      className="text-accent underline underline-offset-2 hover:text-accent-survol
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                 focus-visible:outline-accent"
    >
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Mise en forme locale                                                        */
/* -------------------------------------------------------------------------- */

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/**
 * Une date ISO en français, sans passer par `Date`.
 *
 * `new Date("2026-07-01")` est minuit UTC : formatée dans un fuseau en retard,
 * elle affiche le 30 juin. Une fiche prérendue au moment de la compilation
 * n'a aucune raison de dépendre du fuseau de la machine qui compile.
 */
function dateEnClair(iso: string): string {
  const [annee, mois, jour] = iso.split("-");
  const rang = Number(mois);
  const libelle = MOIS[rang - 1];
  if (!annee || !jour || !libelle) return iso;
  return `${Number(jour) === 1 ? "1er" : Number(jour)} ${libelle} ${annee}`;
}

/** « 2026-T3 » se lit « 3ᵉ trimestre 2026 ». */
function trimestreEnClair(code: string): string {
  const [annee, rang] = code.split("-T");
  if (!annee || !rang) return code;
  return `${rang}ᵉ trimestre ${annee}`;
}

/**
 * Un écart de taux s'exprime en points, jamais en pourcentage.
 *
 * « Le TAEG dépasse le taux nominal de 0,76 % » se lit comme une proportion et
 * serait faux ; l'écart entre deux taux est une différence, pas un rapport.
 */
function enPoints(valeur: number): string {
  const chiffres = valeur.toFixed(2).replace(".", ",");
  return `${chiffres} ${Math.abs(valeur) >= 2 ? "points" : "point"}`;
}
