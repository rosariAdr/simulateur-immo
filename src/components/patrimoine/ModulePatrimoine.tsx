"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PanneauComparaison } from "@/components/comparaison/PanneauComparaison";
import { formatMoisReleve } from "@/lib/format";
import { BandeauBascule } from "./BandeauBascule";
import { BandeauIncertitude } from "./BandeauIncertitude";
import { CourbesPatrimoine } from "./CourbesPatrimoine";
import { DecompteSortie } from "./DecompteSortie";
import { PanneauSortie } from "./PanneauSortie";
import { TroisSorties } from "./TroisSorties";
import { usePatrimoine } from "./usePatrimoine";

/**
 * MODULE « ACHETER OU LOUER », NIVEAU APPROFONDI — `UI-007`
 *
 * ═══ CE QUE CET ÉCRAN AJOUTE À `/comparaison` ═══
 *
 * Le niveau simple compare des **dépenses**. Celui-ci compare des
 * **patrimoines**, et il retourne souvent la conclusion : sur le scénario
 * d'ouverture, le propriétaire a décaissé 16 508,31 € **de plus** que le
 * locataire sur trente ans, et il dispose pourtant de 36 030,77 € **de plus**
 * une fois le bien vendu et le prêt soldé. Les deux phrases sont vraies, elles
 * portent sur le même ménage, et elles penchent en sens contraire.
 *
 * ═══ L'ORDRE DU DOCUMENT, ENCORE ═══
 *
 * ADR-015 avait décidé qu'aucun chiffre de comparaison n'apparaît avant la
 * limite qui l'affecte. La règle est reprise, avec une limite qui n'est pas la
 * même : ici, le danger n'est pas de mal compter, c'est que **la réponse dépend
 * entièrement de deux nombres que personne ne connaît**. Les deux curseurs qui
 * les portent vivent donc à l'intérieur du bloc de limite, et nulle part
 * ailleurs sur l'écran. Voir ADR-020.
 *
 *   1. le titre, qui ne porte aucun montant ;
 *   2. `BandeauIncertitude` — la limite, les deux hypothèses, et la mention que
 *      deux des trois sorties ne sont pas modélisées ;
 *   3. le retournement, chiffré, marqué `data-chiffre` ;
 *   4. les paramètres, les courbes, le décompte poste par poste ;
 *   5. les trois sorties, puis ce que le calcul ne dit pas.
 *
 * ═══ UN SEUL ÉTAT LOCAL ═══
 *
 * L'année lue. Elle ne change aucun chiffre, elle change lequel on regarde :
 * ADR-005, elle reste hors de l'URL. Les deux hypothèses de marché, elles, y
 * entrent — elles changent tous les nombres de la page, et un lien partagé qui
 * ne les porterait pas rendrait d'autres chiffres que ceux qu'on croyait
 * envoyer.
 */
export function ModulePatrimoine() {
  const {
    scenario,
    definir,
    sortie,
    definirSortie,
    location,
    definirLocation,
    plan,
    comparaison,
    analyse,
    longueDuree,
    courteDuree,
  } = usePatrimoine();
  const [anneeChoisie, setAnneeChoisie] = useState<number | null>(null);
  const [copie, setCopie] = useState(false);

  const dernier = analyse.annees.length;
  const requete = useSearchParams().toString();

  /**
   * L'année ouverte est **l'horizon projeté**, et non l'année du croisement.
   *
   * Le niveau simple ouvre sur son croisement, parce que le croisement est ce
   * qu'il existe pour montrer. Ici, le croisement des deux patrimoines n'est pas
   * l'événement : c'est un point qui bouge de plusieurs années au moindre
   * dixième d'appréciation, et l'ouvrir en premier lui donnerait une importance
   * qu'il n'a pas. L'horizon, lui, est ce que l'utilisateur a saisi — c'est la
   * question qu'il a posée, et l'écran y répond d'abord.
   *
   * Borné à chaque rendu plutôt que réinitialisé par un effet : raccourcir
   * l'horizon ne doit pas laisser le curseur pointer une année disparue.
   */
  const annee = Math.min(Math.max(anneeChoisie ?? dernier, 1), Math.max(dernier, 1));
  const anneeLue = analyse.annees.find((a) => a.annee === annee);
  const anneeSimple = comparaison.annees.find((a) => a.annee === annee);

  return (
    <main className="min-h-full bg-papier px-6 py-6 text-encre lg:px-8">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-filet pb-3">
        <h1 className="font-titre text-[21px] font-bold tracking-[-0.022em]">
          Acheter ou louer : ce que chacun possède à l&apos;arrivée
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-encre-secondaire">
            Hypothèses de marché relevées en{" "}
            {formatMoisReleve(comparaison.parametres.releveHypotheses)}
          </span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
              setCopie(true);
              window.setTimeout(() => setCopie(false), 2200);
            }}
            className="border border-accent px-2.5 py-1 text-[12px] text-accent transition-colors
                       hover:bg-survol-fond focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copie ? "Lien copié" : "Copier le lien de ce scénario"}
          </button>
        </div>
      </header>

      {/* LA LIMITE, AVANT TOUT CHIFFRE, et les deux hypothèses à l'intérieur.
          Voir le commentaire de tête de `BandeauIncertitude`. */}
      <BandeauIncertitude
        appreciation={sortie.appreciation}
        onAppreciation={(v) => void definirSortie({ appreciation: Number(v.toFixed(2)) })}
        rendement={sortie.rendement}
        onRendement={(v) => void definirSortie({ rendement: Number(v.toFixed(2)) })}
      />

      <div
        className="mt-5 grid grid-cols-1 gap-5
                   lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-6"
      >
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          {anneeLue && (
            <BandeauBascule
              annee={anneeLue}
              ecartDecaissement={anneeSimple?.ecartCumulDecaissement ?? 0}
              horizonAnnees={dernier}
              motifForfait={analyse.motifForfait}
            />
          )}
        </div>

        {/* La sortie d'abord — c'est le sujet de cet écran —, puis les
            dix-sept paramètres du niveau simple, repris TELS QUELS de
            `PanneauComparaison`. Les redessiner ici aurait produit deux
            panneaux à maintenir pour un seul jeu de clés d'URL, et la première
            divergence aurait été invisible. */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <PanneauSortie
            sortie={sortie}
            definir={definirSortie}
            horizonMois={scenario.horizonAnnees * 12}
          />
          <PanneauComparaison
            scenario={scenario}
            definir={definir}
            mensualite={plan.firstPayment}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-2">
          <CourbesPatrimoine analyse={analyse} annee={annee} onAnnee={setAnneeChoisie} />

          <DecompteSortie
            annee={annee}
            cession={anneeLue?.cession ?? null}
            portefeuille={analyse.portefeuille}
            motifForfait={analyse.motifForfait}
          />

          <TroisSorties
            location={location}
            definir={definirLocation}
            longueDuree={longueDuree}
            courteDuree={courteDuree}
          />

          <section data-limites className="border-t border-filet pt-3">
            <h2 className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
              Ce que ce calcul ne dit pas
            </h2>
            <p className="max-w-[92ch] text-[12px] leading-[1.6]">
              Il suppose que le locataire de référence place réellement l&apos;écart chaque mois,
              sans exception, pendant tout l&apos;horizon. C&apos;est l&apos;hypothèse la plus
              fragile de l&apos;écran, et rien ne permet de la vérifier : un locataire qui consomme
              cet écart n&apos;a pas de portefeuille du tout, et la colonne de droite tombe à
              l&apos;apport seul.
            </p>
            <p className="mt-2 max-w-[92ch] text-[12px] leading-[1.6]">
              Il ne modélise aucune enveloppe fiscale — plan d&apos;épargne en actions,
              assurance-vie, prélèvement forfaitaire unique. Le rendement se saisit net
              d&apos;impôt pour cette raison, et l&apos;écran ne retranche rien de plus. La nature
              du bien est supposée bâtie, le cédant personne physique, et son affiliation à la
              sécurité sociale française : le taux réduit des prélèvements sociaux pour les
              affiliés de l&apos;Espace économique européen ou de Suisse n&apos;est pas proposé
              ici, bien que le moteur sache le calculer.
            </p>
            <p className="mt-2 max-w-[92ch] text-[12px] leading-[1.6]">
              Il ne chiffre ni le déménagement, ni la relocation, ni la renégociation, ni un
              remboursement anticipé, ni les frais de cession autres que la commission d&apos;agence
              et la mainlevée — diagnostics, honoraires d&apos;architecte, indemnité
              d&apos;éviction. Il ne dit pas non plus ce que valent la liberté de partir en trois
              mois et le fait d&apos;être chez soi, qui ne sont pas des montants.
            </p>
            <p className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] leading-[1.6]">
              {/* Le retour conserve le scénario, dans les deux sens : la chaîne
                  de requête courante est recopiée telle quelle. Les sept clés
                  de sortie voyagent avec, et le niveau simple les ignore sans
                  les effacer — repasser d'un niveau à l'autre ne perd rien. */}
              <Link
                href={{ pathname: "/comparaison", query: requete }}
                data-vers-comparaison
                className="text-accent underline underline-offset-2 hover:text-accent-survol
                           focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Retour au niveau simple
              </Link>
              <Link
                href="/credit"
                data-vers-credit
                className="text-accent underline underline-offset-2 hover:text-accent-survol
                           focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Retour au module crédit
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
