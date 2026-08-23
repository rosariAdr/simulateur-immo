"use client";

import { MARKET_2026 } from "@/core/assumptions/market";
import { INTERVALLE_APPRECIATION, INTERVALLE_RENDEMENT } from "@/lib/patrimoine";
import { ChampFourchette } from "./ChampFourchette";

/**
 * LA LIMITE, AVANT LES PATRIMOINES — `UI-007`
 *
 * ═══ L'EXIGENCE, ET POURQUOI CE N'EST PAS CELLE DE `VIZ-003` ═══
 *
 * ADR-015 a placé la limite du niveau simple avant ses chiffres, et soudé la
 * bascule des deux lectures à l'intérieur du bloc qui la porte. La forme est
 * reprise ici ; **la limite, elle, n'est pas la même**, et la recopier aurait
 * été le vrai contresens.
 *
 * Au niveau simple, tous les nombres sont de l'arithmétique sur des montants
 * que l'utilisateur a saisis : le danger est qu'on compte la part de capital
 * comme une dépense. À ce niveau-ci, les nombres sont autre chose. Le patrimoine
 * du propriétaire dépend de ce que vaudra le bien, celui du locataire de ce que
 * rapportera son épargne, et **personne ne connaît ni l'un ni l'autre**. Ce
 * n'est pas une réserve de bas de page : c'est ce qui gouverne le résultat.
 *
 * ═══ LA FORME RETENUE : LES DEUX HYPOTHÈSES VIVENT DANS L'AVERTISSEMENT ═══
 *
 * Les deux curseurs qui décident de la réponse sont **à l'intérieur de ce
 * bloc**, et nulle part ailleurs sur l'écran. On ne peut donc pas déplacer
 * l'hypothèse qui commande le résultat sans passer par la phrase qui dit que
 * personne ne la connaît. C'est le mécanisme d'ADR-015, appliqué à la chose qui
 * mérite ici d'être rendue incontournable.
 *
 * La ligne de partage n'est pas arbitraire, et c'est ce qui la rend tenable :
 * **entrent ici les hypothèses auxquelles `src/core/assumptions/market.ts`
 * refuse une valeur centrale** — les `FourchetteObservee`. Celles qui en ont
 * une, comme la commission d'agence, sont des paramètres comme les autres et
 * vivent dans le panneau de saisie. La distinction est lisible dans le type,
 * pas dans le goût de qui a dessiné l'écran.
 *
 * ═══ TROIS FORMES ÉCARTÉES ═══
 *
 *   Les deux curseurs dans le panneau de saisie, avec les vingt autres champs.
 *   C'est la disposition évidente, et elle noie les deux nombres qui décident
 *   parmi vingt qui ne décident pas.
 *   Un bandeau « résultats indicatifs » au-dessus du graphique. Une formule que
 *   personne ne lit parce qu'elle ne coûte rien à écrire et rien à ignorer.
 *   Un affichage en fourchette seule, sans point retenu. Honnête, et
 *   inutilisable : aucun décompte poste par poste n'existe pour une fourchette,
 *   et c'est le décompte qui apprend quelque chose. La fourchette est donc
 *   **dessinée autour** du point plutôt qu'à sa place — voir `CourbesPatrimoine`.
 */

const V = MARKET_2026.vente;
const R = MARKET_2026.rendements;

interface Props {
  readonly appreciation: number;
  readonly onAppreciation: (v: number) => void;
  readonly rendement: number;
  readonly onRendement: (v: number) => void;
}

export function BandeauIncertitude({
  appreciation,
  onAppreciation,
  rendement,
  onRendement,
}: Props) {
  return (
    <section
      data-limite
      role="note"
      aria-labelledby="titre-incertitude"
      className="border border-l-4 border-interets bg-panneau px-3.5 py-3"
    >
      <h2
        id="titre-incertitude"
        className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire"
      >
        À lire avant les patrimoines
      </h2>

      <p className="max-w-[96ch] text-[13px] leading-[1.55]">
        {/* Repérée pour que la garde puisse vérifier qu'elle est DANS la
            fenêtre, et pas seulement dans le document. Une limite qu'il faut
            faire défiler n'est pas énoncée — ADR-015. */}
        <strong data-phrase-limite className="font-semibold">
          Cet écran ne compare plus deux dépenses mais deux patrimoines, et sa réponse est
          gouvernée par deux nombres que personne ne connaît.
        </strong>{" "}
        Ce que vaudra le bien à l&apos;arrivée, et ce qu&apos;aura rapporté l&apos;épargne du
        locataire. Les deux sont des hypothèses que vous posez ci-dessous ; le simulateur ne les
        prévoit pas et n&apos;en publie aucune valeur centrale.
      </p>

      <p className="mt-2 max-w-[96ch] text-[13px] leading-[1.55]">
        Le locataire de référence place votre apport, puis chaque mois l&apos;écart entre votre
        coût de propriétaire et son loyer. Les deux ménages sortent donc la même somme du même
        compte le même mois — c&apos;est ce qui rend la comparaison possible, et c&apos;est ce que
        le niveau simple ne faisait pas.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <ChampFourchette
          id="appreciation"
          libelle="Appréciation du bien, par an"
          valeur={appreciation}
          onChange={onAppreciation}
          intervalle={INTERVALLE_APPRECIATION}
          fiabilite={V.appreciationAnnuellePct.fiabilite}
          note="C'est de très loin la plus sensible des deux : d'un bout à l'autre de l'intervalle, le produit de la vente varie de plusieurs centaines de milliers d'euros sur trente ans."
          provenance={V.appreciationAnnuellePct.provenance}
          min={-10}
          max={10}
          pas={0.1}
        />

        <ChampFourchette
          id="rendement"
          libelle="Rendement du portefeuille, par an, net d'impôt"
          valeur={rendement}
          onChange={onRendement}
          intervalle={INTERVALLE_RENDEMENT}
          fiabilite={R.actionsDiversifiees.fiabilite}
          note="Deux ordres de grandeur sont relevés séparément — un support à capital garanti et un portefeuille d'actions diversifié — et l'intervalle affiché couvre les deux, faute d'avoir à choisir pour vous ce que fait le locataire de son épargne."
          provenance={`${R.sansRisque.provenance} — ${R.actionsDiversifiees.provenance}`}
          min={-10}
          max={15}
          pas={0.1}
        />
      </div>

      <p data-une-sortie className="mt-3 max-w-[96ch] border-t border-filet pt-2.5 text-[12px] leading-[1.5] text-encre-secondaire">
        <span className="text-encre">Une sortie sur trois est chiffrée.</span> La spécification en
        annonce trois — vendre, louer en longue durée, louer en courte durée. Seule la vente est
        modélisée ; les deux autres ne sont ni calculées, ni approchées, ni prévues sur cet écran.
        Le détail est plus bas, sous « Trois sorties, une seule chiffrée ».
      </p>
    </section>
  );
}
