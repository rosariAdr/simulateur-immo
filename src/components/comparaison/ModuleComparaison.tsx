"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatMoisReleve } from "@/lib/format";
import type { Lecture } from "@/lib/comparaison";
import { BandeauEcart } from "./BandeauEcart";
import { BandeauLimite } from "./BandeauLimite";
import { CourbesCout } from "./CourbesCout";
import { PanneauComparaison } from "./PanneauComparaison";
import { TableauComparaison } from "./TableauComparaison";
import { useComparaison } from "./useComparaison";

/**
 * MODULE « ACHETER OU LOUER », NIVEAU SIMPLE — `VIZ-003`, `/comparaison`
 *
 * Même structure que `/credit`, et volontairement : saisie à gauche, résultat à
 * droite, réaction immédiate, aucun bouton « calculer ». « Cette constance
 * permet de changer de module sans réapprendre où sont les choses »
 * (`docs/06-design-system.md` §7).
 *
 * ═══ L'ORDRE DU DOCUMENT EST L'ARGUMENT ═══
 *
 * Il y a une seule chose que cet écran doit garantir : **personne ne lit un
 * chiffre de comparaison avant d'avoir traversé la limite qui l'affecte.**
 * L'ordre du document est donc, sans exception :
 *
 *   1. le titre, qui ne porte aucun montant ;
 *   2. `BandeauLimite` — la phrase de `docs/03-spec-domaine.md` §2, la bascule
 *      entre les deux lectures, et les deux années de croisement ;
 *   3. les chiffres, tous marqués `data-chiffre` ;
 *   4. les paramètres, les courbes, le tableau ;
 *   5. ce que le calcul ne dit pas.
 *
 * C'est la grille de bureau qui replace le panneau de saisie à gauche, par un
 * placement explicite — la même solution qu'`UI-006` avait retenue pour le
 * module crédit. L'ordre de tabulation suit le document et non le dessin : on
 * lit la limite, puis le résumé, puis on modifie.
 *
 * ═══ DEUX ÉTATS LOCAUX, ET AUCUN DES DEUX DANS L'URL ═══
 *
 * La lecture retenue et l'année lue restent des états de composant. Ni l'une ni
 * l'autre ne change un chiffre : les deux séries sont calculées ensemble et les
 * deux années de croisement sont affichées en permanence. ADR-005 tranche ce cas
 * exactement — « ce qui change un chiffre entre dans l'URL, ce qui change un
 * cadrage n'y entre pas ». Conséquence acceptée : on ne partage pas « regarde
 * cet écran en fonds perdus ». Elle est petite, parce que le destinataire du
 * lien reçoit de toute façon les deux croisements sous les yeux.
 */
export function ModuleComparaison() {
  const { scenario, definir, plan, comparaison } = useComparaison();
  const [lecture, setLecture] = useState<Lecture>("decaissement");
  const [anneeChoisie, setAnneeChoisie] = useState<number | null>(null);
  const [copie, setCopie] = useState(false);

  const dernier = comparaison.annees.length;

  /**
   * La chaîne de requête courante, recopiée telle quelle vers le niveau
   * approfondi — `UI-007`.
   *
   * Lue dans l'adresse plutôt que reconstruite depuis `scenario` : une URL nue
   * décrit le scénario par défaut, et elle doit rester nue de l'autre côté aussi.
   * Reconstruire écrirait les dix-sept clés à chaque passage, y compris celles
   * qui ne s'écartent pas du défaut, et le lien partagé cesserait d'être lisible.
   */
  const requete = useSearchParams().toString();

  /**
   * L'année ouverte est **la plus tardive des deux années de croisement**, à
   * défaut la dernière projetée.
   *
   * Trois raisons de ne pas ouvrir sur l'année 1. Le croisement est le seul
   * moment que cet écran existe pour montrer, et faire chercher est le défaut
   * qu'`UI-006` a déjà corrigé sur le ruban. La plus tardive des deux, parce
   * qu'à cette année-là les deux lectures ont toutes deux basculé : l'écran
   * s'ouvre sur l'état où l'histoire entière est derrière soi. Et la plus tardive
   * plutôt que celle de la lecture retenue, parce qu'une année d'ouverture qui
   * sauterait à chaque coup de bascule ferait perdre le point de comparaison
   * — c'est justement ce qu'on veut garder fixe quand on change de lecture.
   *
   * Bornée à chaque rendu plutôt que réinitialisée par un effet : raccourcir
   * l'horizon ne doit pas laisser le curseur pointer une année disparue.
   */
  const croisements = [comparaison.croisement.decaissement, comparaison.croisement.fondsPerdus]
    .filter((a): a is number => a !== null);
  const ouverture = croisements.length > 0 ? Math.max(...croisements) : dernier;
  const annee = Math.min(Math.max(anneeChoisie ?? ouverture, 1), Math.max(dernier, 1));
  const anneeLue = comparaison.annees.find((a) => a.annee === annee);

  return (
    <main className="min-h-full bg-papier px-6 py-6 text-encre lg:px-8">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-filet pb-3">
        <h1 className="font-titre text-[21px] font-bold tracking-[-0.022em]">
          Acheter ou louer : ce que chaque année coûte
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

      {/* LA LIMITE, AVANT TOUT CHIFFRE. Voir le commentaire de tête de
          `BandeauLimite` : ce placement est la moitié de la décision. */}
      <BandeauLimite
        lecture={lecture}
        onLecture={setLecture}
        croisement={comparaison.croisement}
        horizonAnnees={dernier}
      />

      <div
        className="mt-5 grid grid-cols-1 gap-5
                   lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-6"
      >
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          {anneeLue && <BandeauEcart annee={anneeLue} lecture={lecture} />}
        </div>

        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <PanneauComparaison
            scenario={scenario}
            definir={definir}
            mensualite={plan.firstPayment}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-2">
          <CourbesCout
            comparaison={comparaison}
            lecture={lecture}
            annee={annee}
            onAnnee={setAnneeChoisie}
          />

          <TableauComparaison
            annees={comparaison.annees}
            lecture={lecture}
            annee={annee}
            onAnnee={setAnneeChoisie}
          />

          <section data-limites className="border-t border-filet pt-3">
            <h2 className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
              Ce que ce calcul ne dit pas
            </h2>
            <p className="max-w-[92ch] text-[12px] leading-[1.6]">
              Il ignore l&apos;appréciation ou la dépréciation du bien, les frais de revente, la
              fiscalité, et le rendement qu&apos;aurait eu l&apos;apport s&apos;il avait été placé.
              Ce dernier point n&apos;est pas un détail : sans le coût d&apos;opportunité de
              l&apos;apport, les fonds perdus flattent la propriété. Le locataire de référence qui
              place cet apport puis la différence chaque mois relève du niveau approfondi, et ce
              niveau existe désormais — il est en dessous.
            </p>

            {/*
              LE CHEMIN VERS LE NIVEAU APPROFONDI — `UI-007`.

              Posé ici, dans les limites, et non en tête d'écran : c'est ce
              paragraphe qui vient de nommer ce qui manque, et l'endroit où un
              manque est nommé est le seul endroit où proposer d'y remédier ne
              soit pas une réclame. Le lien conserve l'intégralité du scénario,
              les dix-sept clés étant les mêmes des deux côtés : la chaîne de
              requête courante est recopiée telle quelle, sans être réencodée.
              Un lien qui ferait perdre le scénario en changeant de niveau
              contredirait la promesse centrale du produit.
            */}
            <p className="mt-2.5 text-[12px] leading-[1.6]">
              <Link
                href={{ pathname: "/comparaison/patrimoine", query: requete }}
                data-vers-patrimoine
                className="inline-flex items-center gap-2 border border-accent px-3 py-1.5 text-accent
                           transition-colors hover:bg-survol-fond hover:text-accent-survol
                           focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Voir les deux patrimoines à l&apos;horizon
                <span aria-hidden="true">→</span>
              </Link>
            </p>
            <p className="mt-2 max-w-[92ch] text-[12px] leading-[1.6]">
              Il suppose aussi que rien ne bouge des deux côtés pendant tout l&apos;horizon : ni
              déménagement, ni relocation, ni renégociation, ni remboursement anticipé. Et il ne
              dit pas ce que vaudra le bien dans {dernier} ans — personne ne le sait, et un
              simulateur qui affiche ce nombre l&apos;invente.
            </p>
            <p className="mt-2.5 text-[12px] leading-[1.6]">
              <Link
                href="/credit"
                data-vers-credit
                className="text-accent underline underline-offset-2 hover:text-accent-survol
                           focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Retour au module crédit
              </Link>{" "}
              — l&apos;échéance lue ici y est détaillée mois par mois, avec le TAEG et les deux
              plafonds.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
