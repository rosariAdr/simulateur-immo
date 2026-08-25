"use client";

import { MARKET_2026 } from "@/core/assumptions/market";
import type { HypotheseChiffree } from "@/core/assumptions/market";
import type { LocationCourteDuree } from "@/core/compare/location-courte-duree";
import type { LocationLongueDuree } from "@/core/compare/location-longue-duree";
import type { AlerteLocative } from "@/core/compare/regimes-locatifs";
import type { Cents } from "@/core/money";
import { euros, toEuros } from "@/core/money";
import { formatDuree, formatEuros, formatPourcentage } from "@/lib/format";
import {
  DUREES_LOCATION,
  TAUX_MARGINAUX,
  TROIS_SORTIES,
  type Location,
  type RegimeCourteDuree,
  type RegimeLongueDuree,
  type SortieLocativeAnalysee,
  type SortieRegardee,
} from "@/lib/patrimoine";
import { ChampMontant, ChampTaux, ListeDeroulante, SelecteurSegmente } from "@/components/ui";
import type { DefinirLocation } from "./usePatrimoine";

/**
 * LES TROIS SORTIES, CHIFFRÉES — `UI-025`, ADR-022
 *
 * ═══ CE QUE CE BLOC EST DEVENU ═══
 *
 * Il déclarait deux absences ; les moteurs sont livrés, il est devenu le lieu où
 * les récits locatifs se chiffrent. L'analyse principale de l'écran — courbes,
 * retournement, décompte — reste la vente contre le portefeuille ; ici, un
 * sélecteur ouvre l'un des trois récits, et chacun tombe à ses propres dates.
 *
 * **Aucune ligne ne compare des euros de dates différentes.** Une location
 * repousse la revente au-delà de l'horizon ; additionner son produit à des flux
 * antérieurs sans actualisation serait le genre de biais que ce module existe
 * pour dénoncer. Chaque récit est donc complet et daté, et aucun n'est déclaré
 * meilleur qu'un autre.
 *
 * ═══ L'ORDRE DE CHAQUE RÉCIT ═══
 *
 * ADR-015, toujours : les hypothèses employées et leur fiabilité d'abord, les
 * champs, puis l'année 1 poste par poste, les totaux, la revente, les alertes de
 * seuil — rendues avec le seuil et les recettes, jamais en jugement — et les
 * réserves, visibles sans interaction.
 */

const L = MARKET_2026.location;

/* ── Petites briques d'affichage ──────────────────────────────────────────── */

function Ligne({
  cle,
  signe,
  libelle,
  montant,
  note,
}: {
  cle: string;
  signe: "+" | "−" | "=";
  libelle: string;
  montant: Cents;
  note?: string;
}) {
  const total = signe === "=";
  return (
    <div
      data-poste={cle}
      className={`flex items-baseline justify-between gap-3 py-1 ${
        total ? "mt-1 border-t border-filet pt-2" : ""
      }`}
    >
      <span className="min-w-0 text-[12px] leading-[1.4]">
        <span
          aria-hidden="true"
          className={`mr-1.5 font-mono ${
            signe === "−" ? "text-interets-texte" : total ? "text-encre" : "text-capital-texte"
          }`}
        >
          {signe}
        </span>
        <span className={total ? "font-semibold" : ""}>{libelle}</span>
        {note && (
          <span className="block pl-4 text-[10px] leading-[1.4] text-encre-secondaire">{note}</span>
        )}
      </span>
      <span
        data-montant
        className={`shrink-0 font-mono text-[12px] tabular-nums ${
          total ? "text-[14px] font-semibold text-encre" : "text-encre"
        }`}
      >
        {formatEuros(montant)}
      </span>
    </div>
  );
}

/** Une hypothèse de marché employée, avec sa valeur, son intervalle et sa fiabilité. */
function hypothese(nom: string, h: HypotheseChiffree, unite = "%"): string {
  const [bas, haut] = h.intervalle;
  return `${nom} ${formatPourcentage(h.valeur, 1)}${unite === "%" ? "" : ` ${unite}`} (${
    h.fiabilite === "observee" ? "observée" : "estimée"
  }, intervalle ${formatPourcentage(bas, 1)} à ${formatPourcentage(haut, 1)})`;
}

/**
 * Les alertes de seuil, chacune à sa première année d'apparition.
 *
 * Les recettes sont indexées : un seuil peut n'être franchi qu'en cours de
 * route, et « dès l'année N » est précisément l'information utile.
 */
function alertesAvecPremiereAnnee(
  annees: readonly { annee: number; impot: { alertes: readonly AlerteLocative[] } }[],
): readonly { type: AlerteLocative["type"]; seuil: Cents; annee: number }[] {
  const vues = new Map<AlerteLocative["type"], { type: AlerteLocative["type"]; seuil: Cents; annee: number }>();
  for (const a of annees) {
    for (const alerte of a.impot.alertes) {
      if (!vues.has(alerte.type)) {
        vues.set(alerte.type, { type: alerte.type, seuil: alerte.seuil, annee: a.annee });
      }
    }
  }
  return [...vues.values()];
}

function Alertes({
  annees,
}: {
  annees: readonly { annee: number; impot: { alertes: readonly AlerteLocative[] } }[];
}) {
  const alertes = alertesAvecPremiereAnnee(annees);
  if (alertes.length === 0) return null;
  return (
    <div data-alertes-location className="mt-2.5 flex flex-col gap-1.5">
      {alertes.map((a) => (
        <p
          key={a.type}
          data-alerte={a.type}
          className="border-l-2 border-interets pl-2 text-[11px] leading-[1.5]"
        >
          {a.type === "micro-ineligible" ? (
            <>
              Les recettes dépassent le seuil du régime micro — {formatEuros(a.seuil)} — dès
              l&apos;année {a.annee} : le régime réel s&apos;applique alors de plein droit, et ce
              calcul, qui garde le micro demandé, s&apos;en écarte à partir de là.
            </>
          ) : (
            <>
              Les recettes dépassent {formatEuros(a.seuil)} dès l&apos;année {a.annee} : en courte
              durée, l&apos;affiliation à la sécurité sociale des indépendants remplace alors les
              prélèvements sociaux, et ses cotisations ne sont pas calculées ici.
            </>
          )}
        </p>
      ))}
    </div>
  );
}

function Reserves({ resultat }: { resultat: LocationLongueDuree | LocationCourteDuree }) {
  const propres = resultat.reserves.filter((r) => r.source === "location");
  return (
    <div data-reserves-location className="mt-3 border-t border-filet pt-2">
      <p className="mb-1 text-[10px] uppercase tracking-[0.07em] text-encre-secondaire">
        Ce que ce récit ne dit pas
      </p>
      <ul className="flex flex-col gap-1">
        {propres.map((r) => (
          <li key={r.texte} className="max-w-[92ch] text-[11px] leading-[1.5] text-encre-secondaire">
            {r.texte}
          </li>
        ))}
        <li className="max-w-[92ch] text-[11px] leading-[1.5] text-encre-secondaire">
          Les réserves de la revente elle-même sont celles du décompte de vente, plus haut sur
          cette page.
        </li>
      </ul>
    </div>
  );
}

function Revente({
  resultat,
  minoration,
}: {
  resultat: LocationLongueDuree | LocationCourteDuree;
  minoration: Cents;
}) {
  const produit = resultat.cession.produitDeVente.produitNet;
  return (
    <div data-revente className="mt-2.5 border-t border-filet pt-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-semibold">
          La revente, après {formatDuree(resultat.horizonCessionMois)} de détention
        </span>
        <span data-produit-revente className="shrink-0 font-mono text-[14px] font-semibold tabular-nums">
          {formatEuros(produit)}
        </span>
      </div>
      <p className="mt-0.5 max-w-[92ch] text-[10px] leading-[1.5] text-encre-secondaire">
        Produit net, impôt de plus-value compris. Le bien n&apos;est plus la résidence principale :
        la plus-value est imposée, les abattements courant depuis l&apos;acquisition.
        {minoration > 0 && (
          <>
            {" "}
            Les amortissements déduits pendant la location — {formatEuros(minoration)} — minorent le
            prix d&apos;acquisition (art. 150 VB, III du CGI).
          </>
        )}
      </p>
    </div>
  );
}

function MotifNonChiffrable({ motif }: { motif: string }) {
  return (
    <p data-location-non-chiffrable className="mt-2 max-w-[92ch] text-[12px] leading-[1.55]">
      Ce récit n&apos;est pas chiffré sous la description de cession retenue : {motif} Le refus
      vient du moteur et n&apos;est pas contourné ici — décrire les travaux au réel, avec ou sans
      montant, rend la revente chiffrable.
    </p>
  );
}

/* ── Les libellés des régimes ─────────────────────────────────────────────── */

const REGIMES_LD_LIBELLES: readonly { valeur: RegimeLongueDuree; libelle: string }[] = [
  { valeur: "micro-foncier", libelle: "Micro-foncier — nue, abattement de 30 %" },
  { valeur: "reel-nu", libelle: "Réel — nue, charges et intérêts déduits" },
  { valeur: "micro-bic", libelle: "Micro-BIC — meublée, abattement de 50 %" },
  { valeur: "reel-meuble", libelle: "Réel meublé — amortissement du bien" },
];

const REGIMES_CD_LIBELLES: readonly { valeur: RegimeCourteDuree; libelle: string }[] = [
  { valeur: "tourisme-classe", libelle: "Meublé de tourisme classé — micro, 50 %" },
  { valeur: "tourisme-non-classe", libelle: "Meublé de tourisme non classé — micro, 30 %" },
  { valeur: "reel-meuble", libelle: "Réel meublé — amortissement du bien" },
];

/* ── Les trois panneaux ───────────────────────────────────────────────────── */

function PanneauVente() {
  const vente = TROIS_SORTIES.find((s) => s.cle === "vente");
  return (
    <div data-sortie="vente" data-modelisee="oui" className="max-w-[96ch]">
      <p className="text-[12px] leading-[1.6] text-encre-secondaire">{vente?.texte}</p>
      <p className="mt-1.5 text-[12px] leading-[1.6]">
        Le décompte complet, année par année, est au-dessus : c&apos;est la sortie que les courbes
        de cette page balaient.
      </p>
    </div>
  );
}

function PanneauLongueDuree({
  location,
  definir,
  analyse,
}: {
  location: Location;
  definir: DefinirLocation;
  analyse: SortieLocativeAnalysee<LocationLongueDuree>;
}) {
  const r = analyse.resultat;
  const a1 = r?.annees[0];
  const auReel = location.regimeLongueDuree === "reel-meuble";
  return (
    <div data-sortie="location-longue-duree" data-modelisee="oui" className="min-w-0">
      <p className="mb-2 max-w-[96ch] text-[11px] leading-[1.55] text-encre-secondaire">
        La mise en location commence au mois qui suit l&apos;horizon projeté, aux conditions du
        bien décrit à gauche — taxe foncière, charges non récupérables, assurance (qui tient lieu
        d&apos;assurance propriétaire non occupant), provision et indexations compris. Hypothèses
        employées : {hypothese("vacance", L.vacanceLocativePctLoyers)} des loyers ·{" "}
        {hypothese("gestion", L.fraisGestionPctLoyers)} des loyers encaissés
        {auReel && (
          <>
            {" "}
            · {hypothese("amortissement", L.amortissementAnnuelPct)} par an sur{" "}
            {formatPourcentage(L.partAmortissableDuBienPct.valeur, 1)} de la valeur
          </>
        )}
        .
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <ListeDeroulante
          id="regime-longue-duree"
          libelle="Régime fiscal de la location"
          famille="contraint"
          options={REGIMES_LD_LIBELLES.map((x) => ({ valeur: x.valeur, libelle: x.libelle }))}
          valeur={location.regimeLongueDuree}
          onChange={(v) => void definir({ regimeLongueDuree: v })}
          aide="La location nue paie 17,2 % de prélèvements sociaux, la meublée 18,6 % : la dérogation de l'art. L136-8 du code de la sécurité sociale vise les revenus fonciers, pas les bénéfices du meublé."
        />
        <ChampMontant
          id="loyer-marche"
          libelle="Loyer mensuel de marché, hors charges"
          famille="contraint"
          valeur={euros(location.loyerMarche)}
          onChange={(c) => void definir({ loyerMarche: Math.round(toEuros(c)) })}
          aide="Le loyer que ce bien obtiendrait à la mise en location — pas celui du niveau simple, qui décrit le logement où vivrait le locataire de référence. Il est ensuite indexé chaque année."
        />
        <ListeDeroulante
          id="duree-location"
          libelle="Durée de mise en location"
          famille="contraint"
          options={DUREES_LOCATION.map((a) => ({ valeur: String(a), libelle: `${a} an${a > 1 ? "s" : ""}` }))}
          valeur={String(location.dureeLocationAnnees)}
          onChange={(v) => void definir({ dureeLocationAnnees: Number(v) })}
          aide="La revente suit la dernière année de location. Plus la détention totale est longue, plus les abattements de plus-value montent."
        />
        <ListeDeroulante
          id="tmi-longue-duree"
          libelle="Taux marginal d'imposition du foyer"
          famille="contraint"
          options={TAUX_MARGINAUX.map((t) => ({
            valeur: String(t),
            libelle: t === 0 ? "0 % — foyer non imposable" : `${t} %`,
          }))}
          valeur={String(location.tmi)}
          onChange={(v) => void definir({ tmi: Number(v) })}
          aide="Le taux de la dernière tranche du foyer : c'est lui qui frappe un revenu supplémentaire. Les loyers imposables s'y ajoutent, et les prélèvements sociaux s'y cumulent."
        />
      </div>

      {analyse.motifNonChiffrable !== null && (
        <MotifNonChiffrable motif={analyse.motifNonChiffrable} />
      )}

      {r && a1 && (
        <>
          <p className="mb-0.5 mt-3 text-[10px] uppercase tracking-[0.07em] text-encre-secondaire">
            La première année de location
          </p>
          <div data-annee-location className="max-w-[520px]">
            <Ligne cle="loyersBruts" signe="+" libelle="Loyers de l'année" montant={a1.loyersBruts} />
            <Ligne cle="vacance" signe="−" libelle="Vacance entre deux locataires" montant={a1.vacance} />
            <Ligne cle="fraisGestion" signe="−" libelle="Frais de gestion" montant={a1.fraisGestion} />
            <Ligne
              cle="chargesProprietaire"
              signe="−"
              libelle="Charges du propriétaire"
              montant={a1.chargesProprietaire}
              note="taxe foncière, copropriété non récupérable, assurance, provision travaux"
            />
            <Ligne
              cle="mensualites"
              signe="−"
              libelle="Mensualités du crédit, toujours dues"
              montant={a1.mensualites}
            />
            <Ligne
              cle="impot"
              signe="−"
              libelle={`Impôt — ${formatPourcentage(location.tmi, 1)} sur ${formatEuros(a1.impot.baseImposable)}, prélèvements sociaux à ${formatPourcentage(a1.impot.tauxPrelevementsSociauxPct, 1)}`}
              montant={a1.impot.impotTotal}
            />
            <Ligne cle="fluxNet" signe="=" libelle="Flux net de l'année 1" montant={a1.fluxNet} />
          </div>
          <p
            data-totaux-location
            className="mt-1.5 max-w-[92ch] text-[11px] leading-[1.5] text-encre-secondaire"
          >
            Sur {r.annees.length} an{r.annees.length > 1 ? "s" : ""} de location :{" "}
            <span className="font-mono tabular-nums text-encre">{formatEuros(r.totaux.fluxNet)}</span>{" "}
            de flux nets cumulés, dont{" "}
            <span className="font-mono tabular-nums">{formatEuros(r.totaux.impots)}</span>{" "}
            d&apos;impôts. Un flux négatif n&apos;est pas une anomalie : tant que le crédit court,
            la mensualité reste due, loyers ou pas.
          </p>
          <Revente resultat={r} minoration={r.cession.plusValue?.assiette.minorationAmortissements ?? 0} />
          <Alertes annees={r.annees} />
          <Reserves resultat={r} />
        </>
      )}
    </div>
  );
}

function PanneauCourteDuree({
  location,
  definir,
  analyse,
}: {
  location: Location;
  definir: DefinirLocation;
  analyse: SortieLocativeAnalysee<LocationCourteDuree>;
}) {
  const r = analyse.resultat;
  const a1 = r?.annees[0];
  const [occBas, occHaut] = L.tauxOccupationPct.intervalle;
  return (
    <div data-sortie="location-courte-duree" data-modelisee="oui" className="min-w-0">
      <p className="mb-2 max-w-[96ch] text-[11px] leading-[1.55] text-encre-secondaire">
        Exploitation en meublé de tourisme dès le mois qui suit l&apos;horizon. Le propriétaire
        paie toutes les charges ; l&apos;ameublement sort la première année. Hypothèses
        employées : {hypothese("commission de plateforme", L.commissionPlateformePctRevenus)} des
        revenus · {hypothese("conciergerie", L.conciergeriePctRevenus)} des revenus.
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <ListeDeroulante
          id="regime-courte-duree"
          libelle="Régime fiscal de l'exploitation"
          famille="contraint"
          options={REGIMES_CD_LIBELLES.map((x) => ({ valeur: x.valeur, libelle: x.libelle }))}
          valeur={location.regimeCourteDuree}
          onChange={(v) => void definir({ regimeCourteDuree: v })}
          aide="Depuis la loi du 19 novembre 2024, le meublé de tourisme non classé est au micro le plus étroit : 15 000 € de seuil et 30 % d'abattement, contre 83 600 € et 50 % pour le classé."
        />
        <ChampMontant
          id="tarif-nuitee"
          libelle="Tarif par nuit"
          famille="contraint"
          valeur={euros(location.tarifNuitee)}
          onChange={(c) => void definir({ tarifNuitee: Math.round(toEuros(c)) })}
          aide="Le tarif moyen que ce bien obtiendrait, toutes saisons confondues. Il est indexé chaque année comme un loyer."
        />
        <ChampTaux
          id="taux-occupation"
          libelle="Taux d'occupation annuel"
          famille="contraint"
          valeur={location.tauxOccupation}
          onChange={(v) => void definir({ tauxOccupation: Number(v.toFixed(1)) })}
          min={0}
          max={100}
          pas={0.5}
          aide={`Part des nuits vendues sur l'année. Aucune moyenne ne décrit un bien précis : le relevé de marché n'en publie qu'une fourchette, ${formatPourcentage(occBas, 1)} à ${formatPourcentage(occHaut, 1)}, et le point d'ouverture — son milieu — n'a aucune autorité.`}
        />
        <ListeDeroulante
          id="duree-courte-duree"
          libelle="Durée d'exploitation"
          famille="contraint"
          options={DUREES_LOCATION.map((a) => ({ valeur: String(a), libelle: `${a} an${a > 1 ? "s" : ""}` }))}
          valeur={String(location.dureeLocationAnnees)}
          onChange={(v) => void definir({ dureeLocationAnnees: Number(v) })}
        />
        <ChampMontant
          id="charges-exploitation"
          libelle="Charges d'exploitation, par an"
          famille="contraint"
          valeur={euros(location.chargesExploitation)}
          onChange={(c) => void definir({ chargesExploitation: Math.round(toEuros(c)) })}
          aide="Tout ce que paie l'exploitant : copropriété entière, énergie, eau, accès internet, consommables. Rien n'est récupérable en courte durée."
        />
        <ChampMontant
          id="ameublement"
          libelle="Ameublement et équipement initial"
          famille="contraint"
          valeur={euros(location.ameublement)}
          onChange={(c) => void definir({ ameublement: Math.round(toEuros(c)) })}
          aide="Décaissé la première année. Au régime réel, il s'amortit sur la durée d'usage du mobilier ; au micro, l'abattement forfaitaire est réputé tout couvrir."
        />
        <ListeDeroulante
          id="tmi-courte-duree"
          libelle="Taux marginal d'imposition du foyer"
          famille="contraint"
          options={TAUX_MARGINAUX.map((t) => ({
            valeur: String(t),
            libelle: t === 0 ? "0 % — foyer non imposable" : `${t} %`,
          }))}
          valeur={String(location.tmi)}
          onChange={(v) => void definir({ tmi: Number(v) })}
        />
      </div>

      {analyse.motifNonChiffrable !== null && (
        <MotifNonChiffrable motif={analyse.motifNonChiffrable} />
      )}

      {r && a1 && (
        <>
          <p className="mb-0.5 mt-3 text-[10px] uppercase tracking-[0.07em] text-encre-secondaire">
            La première année d&apos;exploitation
          </p>
          <div data-annee-location className="max-w-[520px]">
            <Ligne
              cle="revenusBruts"
              signe="+"
              libelle={`Revenus — ${formatPourcentage(location.tauxOccupation, 1)} de 365 nuits`}
              montant={a1.revenusBruts}
            />
            <Ligne
              cle="commissionPlateforme"
              signe="−"
              libelle="Commission de plateforme"
              montant={a1.commissionPlateforme}
            />
            <Ligne cle="conciergerie" signe="−" libelle="Conciergerie" montant={a1.conciergerie} />
            <Ligne
              cle="chargesProprietaire"
              signe="−"
              libelle="Charges du propriétaire"
              montant={a1.chargesProprietaire}
              note="exploitation, taxe foncière, assurance, provision travaux"
            />
            <Ligne cle="ameublement" signe="−" libelle="Ameublement initial" montant={a1.ameublement} />
            <Ligne
              cle="mensualites"
              signe="−"
              libelle="Mensualités du crédit, toujours dues"
              montant={a1.mensualites}
            />
            <Ligne
              cle="impot"
              signe="−"
              libelle={`Impôt — ${formatPourcentage(location.tmi, 1)} sur ${formatEuros(a1.impot.baseImposable)}, prélèvements sociaux à ${formatPourcentage(a1.impot.tauxPrelevementsSociauxPct, 1)}`}
              montant={a1.impot.impotTotal}
            />
            <Ligne cle="fluxNet" signe="=" libelle="Flux net de l'année 1" montant={a1.fluxNet} />
          </div>
          <p
            data-totaux-location
            className="mt-1.5 max-w-[92ch] text-[11px] leading-[1.5] text-encre-secondaire"
          >
            Sur {r.annees.length} an{r.annees.length > 1 ? "s" : ""} :{" "}
            <span className="font-mono tabular-nums text-encre">{formatEuros(r.totaux.fluxNet)}</span>{" "}
            de flux nets cumulés, dont{" "}
            <span className="font-mono tabular-nums">{formatEuros(r.totaux.impots)}</span>{" "}
            d&apos;impôts et {formatEuros(r.totaux.ameublement)} d&apos;ameublement.
          </p>
          <Revente resultat={r} minoration={r.cession.plusValue?.assiette.minorationAmortissements ?? 0} />
          <Alertes annees={r.annees} />
          <Reserves resultat={r} />
        </>
      )}
    </div>
  );
}

/* ── La section ───────────────────────────────────────────────────────────── */

const ONGLETS: readonly { valeur: SortieRegardee; libelle: string }[] = [
  { valeur: "vente", libelle: "Vendre" },
  { valeur: "longue-duree", libelle: "Louer en longue durée" },
  { valeur: "courte-duree", libelle: "Louer en courte durée" },
];

export function TroisSorties({
  location,
  definir,
  longueDuree,
  courteDuree,
}: {
  location: Location;
  definir: DefinirLocation;
  longueDuree: SortieLocativeAnalysee<LocationLongueDuree>;
  courteDuree: SortieLocativeAnalysee<LocationCourteDuree>;
}) {
  const chiffrees = TROIS_SORTIES.filter((s) => s.modelisee).length;
  const active = location.sortieRegardee;

  return (
    <section
      data-trois-sorties
      aria-labelledby="titre-sorties"
      className="min-w-0 border-t border-filet pt-3"
    >
      <h2
        id="titre-sorties"
        className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire"
      >
        Les trois sorties
      </h2>

      <p className="mb-2.5 max-w-[96ch] text-[12px] leading-[1.6]">
        La spécification de ce module prévoit trois façons de sortir d&apos;un bien à
        l&apos;horizon.{" "}
        {chiffrees === TROIS_SORTIES.length
          ? "Les trois sont chiffrées ici."
          : `${chiffrees} seulement ${chiffrees > 1 ? "sont chiffrées" : "est chiffrée"}.`}{" "}
        Chaque récit tombe à ses propres dates — une location repousse la revente au-delà de
        l&apos;horizon —, et cette page n&apos;additionne jamais des euros de dates différentes :
        elle pose les récits côte à côte, sans désigner l&apos;un d&apos;eux.
      </p>

      <div className="max-w-[520px]">
        <SelecteurSegmente
          id="sortie-regardee"
          libelle="La sortie regardée"
          famille="contraint"
          options={ONGLETS.map((o) => ({ valeur: o.valeur, libelle: o.libelle }))}
          valeur={active}
          onChange={(v) => void definir({ sortieRegardee: v })}
        />
      </div>

      <div className="mt-3">
        {active === "vente" && <PanneauVente />}
        {active === "longue-duree" && (
          <PanneauLongueDuree location={location} definir={definir} analyse={longueDuree} />
        )}
        {active === "courte-duree" && (
          <PanneauCourteDuree location={location} definir={definir} analyse={courteDuree} />
        )}
      </div>
    </section>
  );
}
