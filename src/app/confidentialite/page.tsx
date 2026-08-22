import type { Metadata } from "next";
import { Faits, H2, P, PageLegale } from "@/components/PageLegale";
import { CONTACT, HEBERGEUR } from "@/content/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité — simulateur d'acquisition",
  description:
    "Ce site ne demande rien et ne conserve rien. Ce qui est néanmoins traité, et pourquoi.",
};

/**
 * POLITIQUE DE CONFIDENTIALITÉ — `LEG-001`
 *
 * Le passage qui compte est « Ce qui est néanmoins traité ». Écrire « aucune
 * donnée personnelle n'est traitée » serait faux : l'affichage d'une page
 * suppose une connexion, et l'hébergeur en journalise l'adresse IP. Un texte de
 * confidentialité qui commence par une contre-vérité ne vaut rien.
 *
 * L'autre passage qui compte est l'avertissement sur le partage de lien. L'état
 * dans l'URL est la promesse du produit ; c'en est aussi le risque, et c'est à
 * l'éditeur de le dire, pas à l'utilisateur de le découvrir.
 */
export default function PageConfidentialite() {
  return (
    <PageLegale titre="Politique de confidentialité">
      <H2>En résumé</H2>
      <P>
        Ce site ne vous demande rien et ne conserve rien. Pas de compte, pas de formulaire, pas de
        cookie, pas de traceur, pas de mesure d&apos;audience.
      </P>
      <P>
        Les chiffres que vous saisissez — revenus, apport, prix du bien —{" "}
        <strong className="font-semibold">ne quittent jamais votre navigateur</strong>. Aucun calcul
        n&apos;est effectué sur un serveur. Ces valeurs sont inscrites dans l&apos;adresse de la
        page, ce qui vous permet de partager un scénario par simple copie du lien et de retrouver
        vos paramètres par l&apos;historique du navigateur.
      </P>
      <P>
        <strong className="font-semibold">Conséquence à connaître.</strong> Puisque vos paramètres
        figurent dans l&apos;adresse, partager un lien revient à partager les chiffres qu&apos;il
        contient. Si votre scénario reflète votre situation réelle, tenez-en compte avant de le
        diffuser.
      </P>

      <H2>Ce qui est néanmoins traité</H2>
      <P>
        Il serait inexact d&apos;écrire qu&apos;aucune donnée personnelle n&apos;est traitée. Comme
        pour tout site web, l&apos;affichage d&apos;une page suppose une connexion technique à
        l&apos;hébergeur, qui enregistre dans ses journaux l&apos;adresse IP, la date et le type de
        navigateur. Ce traitement est nécessaire au fonctionnement et à la sécurité du service ; il
        relève de l&apos;intérêt légitime de l&apos;éditeur (RGPD, art. 6.1.f), et l&apos;éditeur
        n&apos;exploite pas ces journaux.
      </P>
      <Faits
        items={[
          ["Responsable de traitement", "l'éditeur identifié dans les mentions légales"],
          ["Sous-traitant technique", HEBERGEUR.nom],
          ["Durée de conservation", "celle appliquée par l'hébergeur"],
          ["Transfert hors Union européenne", "possible, l'hébergeur étant établi aux États-Unis"],
        ]}
      />

      <H2>Cookies</H2>
      <P>
        Aucun. Ni cookie technique, ni cookie de mesure, ni cookie tiers. C&apos;est pourquoi ce
        site n&apos;affiche pas de bandeau de consentement : il n&apos;a rien à faire consentir.
      </P>
      <P>
        Les polices de caractères sont servies depuis ce site et non depuis une fonderie distante,
        afin qu&apos;aucune requête vers un tiers ne transmette votre adresse IP.
      </P>

      <H2>Vos droits</H2>
      <P>
        Aucune donnée permettant de vous identifier n&apos;étant conservée par l&apos;éditeur, les
        droits d&apos;accès, de rectification et d&apos;effacement sont sans objet pour ce qui le
        concerne. Pour les journaux techniques, adressez-vous à{" "}
        <a href={`mailto:${CONTACT}`} className="underline underline-offset-2">
          {CONTACT}
        </a>
        .
      </P>
      <P>
        Vous pouvez introduire une réclamation auprès de la Commission nationale de
        l&apos;informatique et des libertés —{" "}
        <a href="https://www.cnil.fr" className="underline underline-offset-2">
          www.cnil.fr
        </a>
        .
      </P>
    </PageLegale>
  );
}
