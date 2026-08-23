"use client";

import type { AnneesDeCroisement } from "@/core/compare/types";
import { DESCRIPTION_LECTURE, LECTURES, type Lecture } from "@/lib/comparaison";

/**
 * LA LIMITE, AVANT LES CHIFFRES — `VIZ-003`
 *
 * ═══ L'EXIGENCE ═══
 *
 * `docs/03-spec-domaine.md` §2 ne demande pas une note de bas de page. Il écrit :
 * « **Limite à énoncer explicitement dans l'interface** : cette comparaison est
 * faussée, car la part de capital de la mensualité n'est pas une dépense. »
 *
 * Une limite énoncée après les courbes n'est pas énoncée. Le lecteur pressé lit
 * le graphique, en tire une conclusion, et ne descend pas. C'est exactement le
 * défaut que ce module existe pour corriger, et le reproduire dans la mise en
 * page l'annulerait.
 *
 * ═══ LA FORME RETENUE, ET POURQUOI CELLE-LÀ ═══
 *
 * Trois autres formes ont été écartées avant celle-ci.
 *
 *   Une infobulle sur le titre — invisible tant qu'on ne la cherche pas, et
 *   c'est précisément celui qui ne la cherche pas qu'il s'agit d'atteindre.
 *   Un encadré sous le graphique — l'ordre du document décide de ce qui est lu ;
 *   sous les courbes, la limite arrive après la conclusion qu'elle corrige.
 *   Un texte au-dessus, sans plus — lisible, mais rien n'oblige à le traverser.
 *
 * La forme retenue **soude l'avertissement à la commande**. La bascule entre les
 * deux lectures ne vit nulle part ailleurs sur l'écran : elle est à l'intérieur
 * de cet encadré, sous la phrase qui explique pourquoi il y a deux lectures. On
 * ne peut donc pas changer de lecture sans passer par la raison d'être de ce
 * choix, et l'on ne peut pas atteindre le premier chiffre de comparaison sans
 * avoir traversé le bloc. C'est la seule disposition où l'avertissement n'est
 * pas contournable par la mise en page.
 *
 * Les **deux années de croisement y figurent ensemble**, et non celle de la seule
 * lecture retenue. Vingt-huit ans d'écart entre les deux, sur le scénario
 * d'ouverture, disent la limite mieux qu'aucune phrase.
 *
 * ═══ CE QUE CE BLOC NE FAIT PAS ═══
 *
 * Il ne désigne pas de gagnant, et n'appelle « rentable » aucun des deux
 * croisements. Un croisement de fonds perdus se lit spontanément comme un seuil
 * de rentabilité ; il n'en est pas un, et le dernier paragraphe le dit à
 * l'endroit exact où la confusion se produit.
 *
 * ═══ POURQUOI PAS `SelecteurSegmente` ═══
 *
 * La primitive `SelecteurSegmente` passe par `Champ`, qui pose sur tout contrôle
 * une étiquette de famille — négociable, contraint, réglementaire. La lecture
 * n'est aucune des trois : ce n'est pas un paramètre de l'opération, c'est une
 * façon de la regarder. Lui coller une étiquette de famille aurait affaibli une
 * taxonomie qui ne vaut que par sa constance. Le dessin est repris — inversion
 * fond encre sur texte papier, lisible sans distinguer les couleurs —, la
 * sémantique de champ ne l'est pas.
 */

interface Props {
  readonly lecture: Lecture;
  readonly onLecture: (lecture: Lecture) => void;
  readonly croisement: AnneesDeCroisement;
  readonly horizonAnnees: number;
}

export function BandeauLimite({ lecture, onLecture, croisement, horizonAnnees }: Props) {
  return (
    <section
      data-limite
      role="note"
      aria-labelledby="titre-limite"
      className="border border-l-4 border-interets bg-panneau px-3.5 py-3"
    >
      <h2
        id="titre-limite"
        className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire"
      >
        À lire avant les courbes
      </h2>

      <p className="max-w-[96ch] text-[13px] leading-[1.55]">
        {/* La phrase de la spécification, repérée pour que le test puisse
            vérifier qu'elle est DANS la fenêtre, et pas seulement dans le
            document. Une limite qu'il faut faire défiler n'est pas énoncée. */}
        <strong data-phrase-limite className="font-semibold">
          Cette comparaison est faussée : la part de capital de votre mensualité n&apos;est pas une
          dépense.
        </strong>{" "}
        Elle sort bien du compte, mais elle n&apos;est pas consommée — elle passe de vos liquidités
        à votre bien. La compter comme une dépense revient à dire qu&apos;un virement vers son
        propre livret appauvrit.
      </p>

      <p className="mt-2 max-w-[96ch] text-[13px] leading-[1.55]">
        Le biais n&apos;est pas corrigé dans votre dos : les deux lectures sont calculées ensemble,
        et la bascule ci-dessous passe de l&apos;une à l&apos;autre. Elles ne se croisent pas la
        même année, et cet écart est l&apos;enseignement du module.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Bascule lecture={lecture} onLecture={onLecture} />
        <p data-angle-mort className="min-w-0 max-w-[72ch] text-[12px] leading-[1.5] text-encre-secondaire">
          <span className="text-encre">Angle mort de cette lecture :</span>{" "}
          {DESCRIPTION_LECTURE[lecture].angleMort}
        </p>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1.5 border-t border-filet pt-2.5">
        {LECTURES.map((cle) => (
          <div key={cle} className="flex items-baseline gap-2">
            <dt className="text-[11px] text-encre-secondaire">
              Croisement en {DESCRIPTION_LECTURE[cle].libelle.toLowerCase()}
            </dt>
            <dd
              data-croisement={cle}
              data-valeur={croisement[cle] ?? "aucune"}
              className="font-mono text-[12px] tabular-nums text-encre"
            >
              {enClair(croisement[cle], horizonAnnees)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-2 max-w-[96ch] text-[12px] leading-[1.5] text-encre-secondaire">
        Une année de croisement est l&apos;année où le cumul versé par le propriétaire repasse sous
        celui du locataire, dans la lecture indiquée. Elle ne dit pas que l&apos;achat rapporte
        davantage : ce calcul ne mesure ni l&apos;appréciation du bien, ni les frais de revente, ni
        le coût d&apos;opportunité de l&apos;apport immobilisé.
      </p>
    </section>
  );
}

/** « année 29 », « dès la première année », ou l'absence de croisement énoncée. */
function enClair(annee: number | null, horizonAnnees: number): string {
  if (annee === null) return `aucun avant l'année ${horizonAnnees}`;
  if (annee === 1) return "dès la première année";
  return `année ${annee}`;
}

/**
 * La bascule entre les deux lectures.
 *
 * `radiogroup` et non deux boutons : les flèches parcourent alors les options, et
 * un lecteur d'écran annonce « 1 sur 2 » plutôt que d'énumérer deux boutons sans
 * lien. L'option retenue s'inverse — fond encre, texte papier — ce qui se voit
 * sans distinguer les teintes.
 */
function Bascule({ lecture, onLecture }: { lecture: Lecture; onLecture: (l: Lecture) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Lecture du coût"
      data-bascule-lecture
      className="flex shrink-0 border border-filet"
    >
      {LECTURES.map((cle) => {
        const actif = cle === lecture;
        return (
          <button
            key={cle}
            type="button"
            role="radio"
            aria-checked={actif}
            tabIndex={actif ? 0 : -1}
            data-lecture={cle}
            onClick={() => onLecture(cle)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const i = LECTURES.indexOf(lecture);
              const suivant = e.key === "ArrowRight" ? i + 1 : i - 1;
              const cible = LECTURES[(suivant + LECTURES.length) % LECTURES.length];
              if (cible) onLecture(cible);
            }}
            className={`px-3 py-1.5 text-[12px] transition-colors focus-visible:outline
                        focus-visible:outline-2 focus-visible:-outline-offset-2
                        focus-visible:outline-accent ${
                          actif
                            ? "bg-encre text-papier"
                            : "bg-panneau text-encre-secondaire hover:bg-survol-fond hover:text-encre"
                        }`}
          >
            {DESCRIPTION_LECTURE[cle].libelle}
          </button>
        );
      })}
    </div>
  );
}
