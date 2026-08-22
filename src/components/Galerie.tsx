"use client";

import { useState } from "react";
import {
  CaseACocher,
  ChampMontant,
  ChampTaux,
  ListeDeroulante,
  Pastille,
  SelecteurSegmente,
  type Famille,
} from "@/components/ui";
import { avec, GLOSSAIRE, GLOSSAIRE_PARAMETRE } from "@/content/glossaire";
import { PARAMS_2026 } from "@/core/fiscal/params";
import { euros } from "@/core/money";
import { formatDuree, formatEuros, formatPourcentage } from "@/lib/format";

/** Un cas de démonstration : un état nommé, et le composant dans cet état. */
function Cas({ etat, children }: { etat: string; children: React.ReactNode }) {
  return (
    <div data-cas={etat} className="min-w-0">
      <p className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-encre-secondaire">{etat}</p>
      {children}
    </div>
  );
}

function Rangee({ titre, note, children }: { titre: string; note?: string; children: React.ReactNode }) {
  return (
    <section data-primitive={titre} className="border-t border-filet pt-5">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-titre text-[15px] font-semibold text-encre">{titre}</h2>
        {note && <p className="text-[11px] text-encre-secondaire">{note}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{children}</div>
    </section>
  );
}

const BASES = [
  { valeur: "initial", libelle: "capital initial" },
  { valeur: "restant", libelle: "capital restant dû" },
] as const;

const GARANTIES = [
  { valeur: "caution", libelle: "Caution" },
  { valeur: "hypotheque", libelle: "Hypothèque" },
  { valeur: "nantissement", libelle: "Nantissement" },
] as const;

/**
 * La galerie montre des contenus réels, pas des textes de démonstration : ce
 * sont les entrées du glossaire, avec leurs valeurs réglementaires prises à la
 * source. Une bulle qui s'afficherait mal ici s'afficherait mal en production.
 */
const TRAVAUX = avec(GLOSSAIRE_PARAMETRE.travaux, {
  partTravaux: formatPourcentage(PARAMS_2026.hcsf.derogatoryWorksSharePct, 1),
  plafond: formatDuree(PARAMS_2026.hcsf.maxDurationMonths),
  derogatoire: formatDuree(PARAMS_2026.hcsf.maxDurationDerogatoryMonths),
});

export function Galerie() {
  const [prix, setPrix] = useState(euros(205_000));
  const [taux, setTaux] = useState(3.2);
  const [base, setBase] = useState<(typeof BASES)[number]["valeur"]>("initial");
  const [garantie, setGarantie] = useState<(typeof GARANTIES)[number]["valeur"]>("caution");
  const [travaux, setTravaux] = useState(false);

  const familles: readonly Famille[] = ["negociable", "contraint", "reglementaire"];

  return (
    <div className="min-h-full bg-papier px-8 py-7 text-encre">
      <header className="mb-6 border-b border-filet pb-4">
        <h1 className="font-titre text-[22px] font-bold tracking-[-0.022em]">Primitives de saisie</h1>
        <p className="mt-1 max-w-[92ch] text-[13px] leading-[1.55] text-encre-secondaire">
          Le vocabulaire de composants du produit, chacun dans ses cinq états. Cette page n&apos;est pas
          destinée aux visiteurs : elle sert de banc d&apos;essai aux tests de bout en bout et de
          documentation vivante de la charte.
        </p>
      </header>

      <section className="mb-7">
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.07em] text-encre-secondaire">
          Les trois familles de paramètres
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {familles.map((famille) => (
            <ChampMontant
              key={famille}
              id={`famille-${famille}`}
              libelle="Prix du bien"
              famille={famille}
              valeur={prix}
              onChange={setPrix}
            />
          ))}
        </div>
        <p className="mt-2.5 max-w-[92ch] text-[11px] leading-[1.5] text-encre-secondaire">
          L&apos;appartenance se lit au trait de la bordure — plein laiton, plein gris, tireté — et à
          l&apos;étiquette en toutes lettres. Jamais à la couleur seule.
        </p>
      </section>

      <div className="flex flex-col gap-7">
        <Rangee titre="Champ montant" note="mise en forme française à la sortie du champ">
          <Cas etat="repos">
            <ChampMontant id="m-repos" libelle="Prix du bien" famille="contraint" valeur={prix} onChange={setPrix} />
          </Cas>
          <Cas etat="avec-aide">
            <ChampMontant
              id="m-aide"
              libelle="Apport"
              famille="contraint"
              valeur={euros(25_000)}
              onChange={() => {}}
              aide="Un apport plus élevé réduit le coût du crédit, pas la mensualité seule."
            />
          </Cas>
          <Cas etat="pedagogie">
            <ChampMontant
              id="m-pedago"
              libelle="Frais de dossier"
              famille="negociable"
              valeur={euros(900)}
              onChange={() => {}}
              explication={GLOSSAIRE.fraisDossier}
            />
          </Cas>
          <Cas etat="erreur">
            <ChampMontant
              id="m-erreur"
              libelle="Apport"
              famille="contraint"
              valeur={euros(320_000)}
              onChange={() => {}}
              erreur="L'apport dépasse le prix du bien."
            />
          </Cas>
          <Cas etat="desactive">
            <ChampMontant
              id="m-desactive"
              libelle="Prix du bien"
              famille="contraint"
              valeur={prix}
              onChange={() => {}}
              desactive
            />
          </Cas>
        </Rangee>

        <Rangee titre="Champ taux" note="saisie et curseur pilotent la même valeur">
          <Cas etat="repos">
            <ChampTaux id="t-repos" libelle="Taux nominal" famille="negociable" valeur={taux} onChange={setTaux} />
          </Cas>
          <Cas etat="avec-seuil">
            <ChampTaux
              id="t-seuil"
              libelle="Taux nominal"
              famille="negociable"
              valeur={taux}
              onChange={setTaux}
              seuil={{ valeur: 5.29, libelle: "Plafond d'usure, 3ᵉ trimestre 2026" }}
            />
          </Cas>
          <Cas etat="seuil-franchi">
            <ChampTaux
              id="t-franchi"
              libelle="Taux nominal"
              famille="negociable"
              valeur={5.62}
              onChange={() => {}}
              seuil={{ valeur: 5.29, libelle: "Plafond d'usure, 3ᵉ trimestre 2026" }}
            />
          </Cas>
          <Cas etat="erreur">
            <ChampTaux
              id="t-erreur"
              libelle="Taux nominal"
              famille="negociable"
              valeur={18}
              onChange={() => {}}
              erreur="Au-delà du taux d'usure : aucune banque ne peut prêter à ce taux."
            />
          </Cas>
          <Cas etat="desactive">
            <ChampTaux
              id="t-desactive"
              libelle="Taux nominal"
              famille="negociable"
              valeur={3.2}
              onChange={() => {}}
              desactive
            />
          </Cas>
        </Rangee>

        <Rangee titre="Sélecteur segmenté" note="flèches gauche et droite au clavier">
          <Cas etat="repos">
            <SelecteurSegmente
              id="s-repos"
              libelle="Base de calcul"
              famille="negociable"
              options={BASES}
              valeur={base}
              onChange={setBase}
            />
          </Cas>
          <Cas etat="trois-options">
            <SelecteurSegmente
              id="s-trois"
              libelle="Garantie"
              famille="reglementaire"
              options={GARANTIES}
              valeur={garantie}
              onChange={setGarantie}
            />
          </Cas>
          <Cas etat="pedagogie">
            <SelecteurSegmente
              id="s-pedago"
              libelle="Base de calcul"
              famille="negociable"
              options={BASES}
              valeur={base}
              onChange={setBase}
              explication={GLOSSAIRE.baseAssurance}
            />
          </Cas>
          <Cas etat="erreur">
            <SelecteurSegmente
              id="s-erreur"
              libelle="Base de calcul"
              famille="negociable"
              options={BASES}
              valeur={base}
              onChange={() => {}}
              erreur="Votre contrat doit préciser la base retenue."
            />
          </Cas>
          <Cas etat="desactive">
            <SelecteurSegmente
              id="s-desactive"
              libelle="Base de calcul"
              famille="negociable"
              options={BASES}
              valeur={base}
              onChange={() => {}}
              desactive
            />
          </Cas>
        </Rangee>

        <Rangee titre="Liste déroulante" note="sélecteur natif, peinture reprise">
          <Cas etat="repos">
            <ListeDeroulante
              id="l-repos"
              libelle="Garantie"
              famille="reglementaire"
              options={GARANTIES}
              valeur={garantie}
              onChange={setGarantie}
            />
          </Cas>
          <Cas etat="non-renseigne">
            <ListeDeroulante
              id="l-vide"
              libelle="Garantie"
              famille="reglementaire"
              options={GARANTIES}
              valeur=""
              onChange={() => {}}
              invite="Choisir une garantie"
            />
          </Cas>
          <Cas etat="avec-aide">
            <ListeDeroulante
              id="l-aide"
              libelle="Garantie"
              famille="reglementaire"
              options={GARANTIES}
              valeur="caution"
              onChange={() => {}}
              aide="La caution restitue une part au terme, l'hypothèque coûte une mainlevée à la revente."
            />
          </Cas>
          <Cas etat="erreur">
            <ListeDeroulante
              id="l-erreur"
              libelle="Garantie"
              famille="reglementaire"
              options={GARANTIES}
              valeur=""
              onChange={() => {}}
              invite="Choisir une garantie"
              erreur="Obligatoire pour calculer le TAEG."
            />
          </Cas>
          <Cas etat="desactive">
            <ListeDeroulante
              id="l-desactive"
              libelle="Garantie"
              famille="reglementaire"
              options={GARANTIES}
              valeur="caution"
              onChange={() => {}}
              desactive
            />
          </Cas>
        </Rangee>

        <Rangee titre="Case à cocher" note="hors taxonomie : une option n'est pas un paramètre">
          <Cas etat="repos">
            <CaseACocher id="c-repos" libelle="Travaux inclus" coche={travaux} onChange={setTravaux} />
          </Cas>
          <Cas etat="coche">
            <CaseACocher id="c-coche" libelle="Travaux inclus" coche onChange={() => {}} />
          </Cas>
          <Cas etat="pedagogie">
            <CaseACocher
              id="c-pedago"
              libelle="Travaux inclus"
              coche={false}
              onChange={() => {}}
              explication={TRAVAUX}
            />
          </Cas>
          <Cas etat="erreur">
            <CaseACocher
              id="c-erreur"
              libelle="Travaux inclus"
              coche
              onChange={() => {}}
              erreur="Renseignez leur montant."
            />
          </Cas>
          <Cas etat="desactive">
            <CaseACocher id="c-desactive" libelle="Travaux inclus" coche={false} onChange={() => {}} desactive />
          </Cas>
        </Rangee>
      </div>

      <section data-primitive="Pastille pédagogique" className="mt-7 border-t border-filet pt-5">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="font-titre text-[15px] font-semibold text-encre">Pastille pédagogique</h2>
          <p className="text-[11px] text-encre-secondaire">
            deux phrases, jamais plus — et une bulle qui reste dans la fenêtre
          </p>
        </div>
        <div className="flex items-center justify-between">
          {/*
            Les deux extrêmes de la ligne, et c'est tout l'intérêt du cas : la
            bulle de gauche s'ancre à gauche, celle de droite doit basculer, sans
            quoi elle sort de l'écran et la page se met à défiler latéralement.
            Les tests de bout en bout mesurent exactement ces deux positions.
          */}
          <span data-cas="bord-gauche" className="inline-flex items-center text-[12px] text-encre">
            Terme au bord gauche
            <Pastille entree={GLOSSAIRE.amortissement} />
          </span>
          <span data-cas="bord-droit" className="inline-flex items-center text-[12px] text-encre">
            Terme au bord droit
            <Pastille entree={GLOSSAIRE.capitalRestantDu} />
          </span>
        </div>
      </section>

      <section data-primitive="Sortie vive" className="mt-7 border-t border-filet pt-5">
        <h2 className="mb-3 font-titre text-[15px] font-semibold">Les valeurs circulent vraiment</h2>
        <p className="mb-3 max-w-[92ch] text-[12px] leading-[1.55] text-encre-secondaire">
          Les champs de cette page ne sont pas des images. Ce bloc relit leur état, mis en forme par
          la couche de présentation — c&apos;est ce que les tests de bout en bout vérifient.
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] text-encre-secondaire">Prix du bien</dt>
            <dd data-sortie="prix" className="font-mono text-[14px] tabular-nums">
              {formatEuros(prix)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-encre-secondaire">Taux nominal</dt>
            <dd data-sortie="taux" className="font-mono text-[14px] tabular-nums">
              {taux.toFixed(2).replace(".", ",")} %
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-encre-secondaire">Base de l&apos;assurance</dt>
            <dd data-sortie="base" className="text-[14px]">
              {BASES.find((b) => b.valeur === base)?.libelle}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-encre-secondaire">Travaux</dt>
            <dd data-sortie="travaux" className="text-[14px]">
              {travaux ? "inclus" : "non inclus"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
