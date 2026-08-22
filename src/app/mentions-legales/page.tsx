import type { Metadata } from "next";
import { Faits, H2, P, PageLegale } from "@/components/PageLegale";
import { CONTACT, DEPOT, HEBERGEUR } from "@/content/legal";

export const metadata: Metadata = {
  title: "Mentions légales — simulateur d'acquisition",
  description: "Éditeur, hébergeur, propriété intellectuelle et signalement d'erreur.",
};

/**
 * MENTIONS LÉGALES — `LEG-001`
 *
 * Régime retenu : **éditeur non professionnel anonyme**, au sens du III de
 * l'article 6 de la loi n° 2004-575 du 21 juin 2004. Le nom et l'adresse ne sont
 * pas publiés ; ils sont communiqués à l'hébergeur, dont l'identité figure ici.
 *
 * Les deux conditions de ce régime doivent être RÉELLEMENT remplies. La seconde
 * est tenue par cette page ; la première ne l'est que si l'identité a bien été
 * transmise à Vercel. Voir `docs/legal/mentions-legales.md`.
 *
 * Le régime bascule automatiquement dès qu'un revenu apparaît — publicité,
 * affiliation, mise en relation rémunérée. Il ne se décide pas.
 */
export default function PageMentionsLegales() {
  return (
    <PageLegale titre="Mentions légales">
      <H2>Éditeur</H2>
      <P>
        Ce site est édité à titre <strong className="font-semibold">non professionnel</strong> par un
        particulier, qui a communiqué son identité à l&apos;hébergeur conformément au III de
        l&apos;article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie
        numérique. Ce régime dispense de publier son nom et son adresse, à la condition que
        l&apos;identité de l&apos;hébergeur figure sur le site — elle est ci-dessous.
      </P>
      <Faits
        items={[
          ["Contact", <a key="c" href={`mailto:${CONTACT}`} className="underline underline-offset-2">{CONTACT}</a>],
          ["Directeur de la publication", "l'éditeur"],
        ]}
      />

      <H2>Hébergeur</H2>
      <Faits
        items={[
          ["Dénomination", HEBERGEUR.nom],
          ["Adresse", HEBERGEUR.adresse],
          ["Site", <a key="s" href={HEBERGEUR.site} className="underline underline-offset-2">{HEBERGEUR.site}</a>],
          ["Téléphone", "non publié par l'hébergeur"],
        ]}
      />

      <H2>Propriété intellectuelle</H2>
      <P>
        Le code source de ce site est publié à l&apos;adresse{" "}
        <a href={DEPOT} className="underline underline-offset-2">
          {DEPOT}
        </a>
        . <strong className="font-semibold">Aucune licence d&apos;utilisation n&apos;y est attachée
        à ce jour</strong> : en l&apos;absence de licence, le droit d&apos;auteur s&apos;applique
        pleinement et aucune réutilisation n&apos;est autorisée sans accord préalable de
        l&apos;éditeur.
      </P>
      <P>
        Les contenus rédactionnels, les méthodes de calcul et leur documentation restent la
        propriété de l&apos;éditeur. Les valeurs réglementaires utilisées — taux, seuils, barèmes —
        sont des données publiques, reproduites avec l&apos;indication de leur source.
      </P>

      <H2>Signaler une erreur de calcul</H2>
      <P>
        Une erreur dans un calcul ou dans une valeur réglementaire peut être signalée à{" "}
        <a href={`mailto:${CONTACT}`} className="underline underline-offset-2">
          {CONTACT}
        </a>{" "}
        ou par une <em>issue</em> sur le dépôt public. Les signalements portant sur
        l&apos;exactitude sont traités en priorité.
      </P>
    </PageLegale>
  );
}
