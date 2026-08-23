"use client";

import { TROIS_SORTIES } from "@/lib/patrimoine";

/**
 * TROIS SORTIES, UNE SEULE CHIFFRÉE — `UI-007`
 *
 * ═══ POURQUOI CE BLOC EXISTE, ET POURQUOI IL RESSEMBLE À CE QU'IL EST ═══
 *
 * `docs/03-spec-domaine.md` §2 annonce trois scénarios de sortie. Le moteur en
 * modélise **un**. Les deux autres sont les tickets `ENG-013` et `ENG-015`, et
 * ils ne sont pas écrits.
 *
 * L'accueil traite le même problème pour ses modules, et sa solution ne convient
 * pas ici. Là-bas, une carte grisée portant « à venir » est exacte : le module
 * existera, le lien apparaîtra. Ici, l'objet n'est pas une page mais un
 * **chiffre**, et une esquisse grisée d'un chiffre absent est bien pire qu'un
 * lien mort — elle laisse croire qu'un ordre de grandeur est connu.
 *
 * D'où la forme retenue : **de la prose, pas des cartes**. Chaque sortie est
 * nommée, et ce qu'il faudrait pour la chiffrer est décrit. Un lecteur qui sort
 * d'ici sait exactement ce que le simulateur ne sait pas faire, et pourquoi ce
 * n'est pas une petite affaire. Rien n'est grisé, rien n'est daté, rien
 * n'annonce une échéance que personne ne tient.
 *
 * ⚠️ `UI-014` a corrigé l'erreur symétrique — un module livré que l'accueil
 * annonçait « à venir ». Les deux erreurs se réparent au même endroit : l'état
 * d'une chose ne s'écrit qu'une fois. Ici, c'est le champ `modelisee` de
 * `TROIS_SORTIES`, et la garde de `tests/e2e/patrimoine.spec.ts` compte les
 * mentions plutôt que de les lire.
 */
export function TroisSorties() {
  const chiffrees = TROIS_SORTIES.filter((s) => s.modelisee).length;

  return (
    <section data-trois-sorties aria-labelledby="titre-sorties" className="min-w-0 border-t border-filet pt-3">
      <h2
        id="titre-sorties"
        className="mb-1.5 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire"
      >
        Trois sorties, une seule chiffrée
      </h2>

      <p className="mb-2.5 max-w-[96ch] text-[12px] leading-[1.6]">
        La spécification de ce module prévoit trois façons de sortir d&apos;un bien à
        l&apos;horizon. {chiffrees === 1 ? "Une seule est modélisée" : `${chiffrees} sont modélisées`} ;
        les autres ne le sont pas, et cet écran ne les approche par aucun détour. Ce n&apos;est pas
        une nuance de calendrier : aucun chiffre affiché ici ne dit quoi que ce soit de ce que
        produirait une mise en location.
      </p>

      <dl className="flex flex-col gap-2.5">
        {TROIS_SORTIES.map((s) => (
          <div
            key={s.cle}
            data-sortie={s.cle}
            data-modelisee={s.modelisee ? "oui" : "non"}
            className="max-w-[96ch]"
          >
            <dt className="flex flex-wrap items-baseline gap-2">
              <span className="font-titre text-[13px] font-semibold">{s.nom}</span>
              <span
                className={`shrink-0 border px-1.5 py-px text-[9px] uppercase tracking-[0.05em] ${
                  s.modelisee
                    ? "border-accent text-accent"
                    : "border-interets text-interets-texte"
                }`}
              >
                {s.modelisee ? "chiffrée ici" : "non modélisée"}
              </span>
            </dt>
            <dd className="mt-1 text-[12px] leading-[1.6] text-encre-secondaire">{s.texte}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
