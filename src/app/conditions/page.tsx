import type { Metadata } from "next";
import Link from "next/link";
import { H2, P, PageLegale } from "@/components/PageLegale";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — simulateur d'acquisition",
  description:
    "Objet, accès, nature du service à son stade de développement, responsabilité et droit applicable.",
};

/**
 * CONDITIONS GÉNÉRALES D'UTILISATION — `LEG-001`
 *
 * La clause de médiation de la consommation a été retirée du brouillon : elle
 * n'est obligatoire que pour un professionnel, et l'édition est non
 * professionnelle. L'y laisser aurait laissé croire à un régime qui n'est pas
 * celui-ci. Voir `docs/legal/conditions-utilisation.md`.
 *
 * L'adresse du site n'est pas écrite en dur : le simulateur vit encore sur une
 * URL d'hébergeur, et une adresse recopiée ici serait fausse dès le premier nom
 * de domaine.
 */
export default function PageConditions() {
  return (
    <PageLegale titre="Conditions générales d'utilisation">
      <H2>1. Objet</H2>
      <P>
        Les présentes conditions régissent l&apos;utilisation du simulateur accessible depuis ce
        site. L&apos;utilisation du site vaut acceptation de ces conditions.
      </P>

      <H2>2. Accès</H2>
      <P>
        Le service est gratuit, ouvert à tous, et ne requiert la création d&apos;aucun compte.
        L&apos;éditeur peut le modifier, le suspendre ou l&apos;interrompre à tout moment, sans
        préavis et sans indemnité. Il ne garantit aucune disponibilité.
      </P>

      <H2>3. Nature du service — stade de développement</H2>
      <P>
        <strong className="font-semibold">
          Le service est en cours de construction et son modèle de calcul est en cours
          d&apos;affinage.
        </strong>{" "}
        Il est mis à disposition dans l&apos;état où il se trouve, à des fins d&apos;information et
        de pédagogie. Certaines valeurs réglementaires n&apos;ont pas encore été vérifiées à leur
        source officielle et sont signalées comme telles dans l&apos;interface.
      </P>
      <P>
        Le service ne constitue ni un conseil en investissement, ni un conseil fiscal, ni une offre
        de crédit, ni un service d&apos;intermédiation bancaire.{" "}
        <Link href="/avertissement" className="text-accent underline underline-offset-2">
          L&apos;avertissement complet
        </Link>{" "}
        fait partie intégrante des présentes conditions.
      </P>

      <H2>4. Responsabilité</H2>
      <P>
        Les résultats sont produits automatiquement à partir des paramètres saisis par
        l&apos;utilisateur et d&apos;hypothèses que celui-ci choisit.{" "}
        <strong className="font-semibold">
          L&apos;utilisateur demeure seul responsable des décisions qu&apos;il prend.
        </strong>
      </P>
      <P>
        L&apos;éditeur ne peut être tenu responsable d&apos;un dommage résultant de
        l&apos;utilisation des résultats, notamment en cas d&apos;erreur de calcul, de valeur
        réglementaire périmée, ou d&apos;écart avec le calcul d&apos;un établissement bancaire. Il
        s&apos;engage en revanche à corriger sans délai toute erreur qui lui est signalée.
      </P>

      <H2>5. Obligations de l&apos;utilisateur</H2>
      <P>
        L&apos;utilisateur s&apos;engage à ne pas perturber le fonctionnement du service, ni à en
        extraire massivement le contenu par des moyens automatisés à des fins commerciales.
      </P>

      <H2>6. Données personnelles</H2>
      <P>
        Voir la{" "}
        <Link href="/confidentialite" className="text-accent underline underline-offset-2">
          politique de confidentialité
        </Link>
        . Le service ne collecte aucune donnée saisie par l&apos;utilisateur.
      </P>

      <H2>7. Droit applicable</H2>
      <P>
        Les présentes conditions sont soumises au droit français. À défaut de résolution amiable, le
        litige relève des juridictions françaises compétentes.
      </P>
    </PageLegale>
  );
}
