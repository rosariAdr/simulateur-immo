import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ce que cet outil n'est pas — simulateur d'acquisition",
  description:
    "Portée et limites du simulateur : ce qu'il calcule, ce qu'il ne conseille pas, " +
    "et ce qui fait foi en cas de divergence avec votre banque.",
};

/**
 * VERSION LONGUE DE L'AVERTISSEMENT — `/avertissement`
 *
 * Le texte reprend `docs/legal/avertissement.md`, qui reste la source. Les
 * références légales y sont citées par leur article, pour qu'elles se vérifient.
 *
 * Ce n'est pas une page de conditions générales : elle dit ce que l'outil n'est
 * pas, dans les termes de quelqu'un qui vient d'y voir un chiffre et se demande
 * ce qu'il vaut. Les mentions légales et la politique de confidentialité auront
 * leurs propres pages — c'est `LEG-001`.
 */
export default function PageAvertissement() {
  return (
    <main className="min-h-full bg-papier px-6 py-8 text-encre lg:px-8">
      <div className="max-w-[76ch]">
        <h1 className="mb-1.5 font-titre text-[23px] font-bold tracking-[-0.022em]">
          Ce que cet outil n&apos;est pas
        </h1>
        <p className="mb-7 text-[13px] leading-[1.6] text-encre-secondaire">
          Et ce qu&apos;il est : un calculateur qui applique des formules publiques à des paramètres
          que vous fournissez, et qui explique chaque paramètre au moment où il apparaît. Les
          méthodes de calcul et les sources des valeurs réglementaires sont documentées et
          publiques.
        </p>

        <Section titre="Ce n’est pas un conseil en investissement">
          L&apos;éditeur n&apos;est pas conseiller en investissements financiers au sens de
          l&apos;article L. 541-1 du code monétaire et financier. Aucun résultat ne constitue une
          recommandation personnalisée d&apos;acquérir, de conserver ou de céder un bien ou un
          placement.
        </Section>

        <Section titre="Ce n’est pas un conseil fiscal">
          Les calculs fiscaux sont des ordres de grandeur fondés sur des règles générales. Ils
          ignorent votre situation particulière, et la consultation juridique est une activité
          réglementée à laquelle l&apos;éditeur n&apos;est pas habilité.
        </Section>

        <Section titre="Ce n’est pas une offre de crédit">
          L&apos;éditeur n&apos;est pas intermédiaire en opérations de banque et en services de
          paiement au sens de l&apos;article L. 519-1 du code monétaire et financier. Seule une
          banque peut émettre une offre de prêt, et seule cette offre engage.
        </Section>

        <Section titre="Ce n’est pas une prévision">
          Les rendements, l&apos;évolution des prix et l&apos;inflation sont des hypothèses que{" "}
          <em className="not-italic underline decoration-accent underline-offset-2">vous</em> posez.
          Le simulateur en déduit des conséquences arithmétiques ; il ne prétend pas savoir ce qui
          arrivera.
        </Section>

        <h2 className="mb-2 mt-9 font-titre text-[15px] font-semibold">Sur l&apos;exactitude</h2>
        <p className="mb-3 text-[13px] leading-[1.65]">
          Les valeurs réglementaires — taux d&apos;usure, plafonds, abattements, barèmes — changent
          fréquemment ; le taux d&apos;usure est révisé chaque trimestre. Chaque valeur affichée
          porte sa date d&apos;application et sa source, afin que vous puissiez la vérifier.
          Certaines n&apos;ont pas encore été confrontées à une source officielle et sont signalées
          comme telles.
        </p>
        <p className="mb-3 text-[13px] leading-[1.65]">
          Un écart avec le calcul de votre banque est possible et n&apos;a rien d&apos;anormal : les
          établissements retiennent des conventions d&apos;arrondi et des périmètres de frais qui
          leur sont propres.{" "}
          <strong className="font-semibold">
            En cas de divergence, c&apos;est l&apos;offre de prêt qui fait foi.
          </strong>
        </p>

        <h2 className="mb-2 mt-9 font-titre text-[15px] font-semibold">Où vérifier</h2>
        <p className="mb-3 text-[13px] leading-[1.65]">
          Ne fondez aucune décision sur ces résultats sans les confronter à votre banque, à un
          courtier, ou à l&apos;ADIL de votre département — l&apos;Agence départementale
          d&apos;information sur le logement, dont le conseil est gratuit et neutre.
        </p>

        <p className="mt-10 border-t border-filet pt-4 text-[13px]">
          <Link
            href="/credit"
            className="text-accent underline underline-offset-2 hover:text-accent-survol
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-accent"
          >
            Revenir au simulateur de crédit
          </Link>
        </p>
      </div>
    </main>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 border-l-2 border-filet pl-3.5">
      <h2 className="mb-1 font-titre text-[15px] font-semibold">{titre}</h2>
      <p className="text-[13px] leading-[1.65]">{children}</p>
    </section>
  );
}
