/**
 * HYPOTHÈSES DE MARCHÉ — `FIS-005`, recoupées par `FIS-006`
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═══
 *
 * `fiscal/params.ts` contient des valeurs **que la loi fixe**. Chacune porte un
 * `@source` renvoyant à un article, et sa mise à jour est un fait daté : la loi
 * de finances change, on change la valeur.
 *
 * Les coûts de garantie ne sont pas de cette nature. **Aucun texte ne les fixe.**
 * Un organisme de caution publie une grille commerciale, progressive, qu'il
 * révise quand il veut ; un notaire facture une inscription hypothécaire selon un
 * barème qui mêle émoluments, taxe de publicité foncière et débours. Ce sont des
 * ordres de grandeur observés, pas des règles.
 *
 * Les avoir logés dans `FiscalParams` créait trois problèmes, dont un seul aurait
 * suffi :
 *
 * 1. **Rien ne les distinguait du reste.** Un lecteur de `params.ts` ne pouvait
 *    pas savoir, sans lire les commentaires, quelles valeurs opposer à une banque
 *    et lesquelles ne sont qu'une estimation de notre part.
 * 2. **Leur `TODO_VERIFY` était insoluble.** Vérifier « à la source » suppose une
 *    source qui fasse autorité. Il n'y en a pas : il n'y a que des grilles
 *    commerciales, divergentes et datées du jour où on les a lues.
 * 3. **Elles n'auraient jamais dû être immuables.** Une valeur négociable a
 *    vocation à devenir un paramètre que l'utilisateur ajuste. Enfermée dans le
 *    millésime fiscal, elle ne le pouvait pas.
 *
 * ═══ CE QUE CE FICHIER PROMET, ET CE QU'IL NE PROMET PAS ═══
 *
 * Il ne promet pas l'exactitude. Il promet que l'imprécision est **déclarée** :
 * chaque valeur porte son intervalle observé et la manière dont elle a été
 * obtenue. Une estimation qui s'annonce comme telle vaut mieux qu'une estimation
 * déguisée en règle.
 *
 * ═══ CE QUE « OBSERVEE » VEUT DIRE ICI — `FIS-006` ═══
 *
 * La campagne de recoupement du 23 août 2026 a dû trancher un point que
 * `FIS-005` n'avait pas eu à poser : que faut-il avoir lu pour qu'une entrée
 * cesse d'être `estimee` ?
 *
 * **Règle retenue.** Une entrée passe `observee` quand le chiffre qui sert au
 * calcul — la valeur centrale pour une `HypotheseChiffree`, les deux bornes pour
 * une `FourchetteObservee` — a été **lu dans un document public et citable**, et
 * que la provenance nomme ce document. Les bornes d'une `HypotheseChiffree`
 * restent, elles, une extension de notre fait : elles disent jusqu'où on a vu
 * varier les offres, pas ce qu'une source affirme. Chaque provenance dit
 * laquelle des deux situations elle décrit.
 *
 * Une entrée reste `estimee` dès que le chiffre n'a pas été lu, **et la
 * provenance dit alors pourquoi la vérification n'a pas abouti**. C'est le point
 * du ticket : « nous n'avons pas trouvé de grille publique pour ceci » est une
 * information, « estimée » tout court n'en est pas une.
 *
 * ⚠️ Les provenances citent des documents qui ont réellement été ouverts. Aucune
 * source n'est mentionnée de mémoire. Quand un document n'a pas pu être lu — un
 * simulateur sans grille statique, un serveur qui refuse les requêtes —, la
 * provenance le dit au lieu de le taire.
 *
 * Voir `docs/ADR.md`, ADR-008 et ADR-017.
 */

/**
 * Le degré de confiance d'une hypothèse. Il n'est pas décoratif : l'interface
 * doit pouvoir dire à l'utilisateur ce qu'elle sait et ce qu'elle suppose.
 */
export type Fiabilite =
  /** Le chiffre qui sert au calcul a été lu dans un document public et citable. */
  | "observee"
  /** Ordre de grandeur communément admis, non recoupé sur des sources primaires. */
  | "estimee";

export interface HypotheseChiffree {
  readonly valeur: number;
  /** Intervalle observé sur le marché, bornes comprises. */
  readonly intervalle: readonly [number, number];
  readonly fiabilite: Fiabilite;
  /** D'où vient le chiffre, en une phrase lisible par un non-technicien. */
  readonly provenance: string;
}

export interface GuaranteeAssumptions {
  /** Commission + contribution au fonds mutuel, en % du capital garanti. */
  readonly suretyshipCostPct: HypotheseChiffree;
  /** Part de la contribution restituée au terme, en % du coût. */
  readonly suretyshipRefundPct: HypotheseChiffree;
  /** Inscription hypothécaire, en % du capital garanti. */
  readonly mortgageCostPct: HypotheseChiffree;
  /** Mainlevée en cas de revente avant terme, en % du capital garanti. */
  readonly mortgageReleasePct: HypotheseChiffree;
  /** Frais de nantissement, en % du capital garanti. */
  readonly pledgeCostPct: HypotheseChiffree;
}

/**
 * Une fourchette observée, sans valeur centrale.
 *
 * Certaines hypothèses n'ont pas de « bonne » valeur, seulement un intervalle où
 * l'on trouve les offres. Leur donner une valeur unique reviendrait à inventer
 * une moyenne que personne n'a mesurée.
 */
export interface FourchetteObservee {
  readonly intervalle: readonly [number, number];
  readonly fiabilite: Fiabilite;
  readonly provenance: string;
}

export interface InsuranceAssumptions {
  /** Contrat de groupe de la banque, en % du capital initial et par an. */
  readonly groupRatePct: FourchetteObservee;
  /** Délégation d'assurance, même assiette. */
  readonly delegationRatePct: FourchetteObservee;
}

export interface AcquisitionAssumptions {
  /** Frais d'acquisition totaux dans l'ancien, en % du prix. */
  readonly totalFeesOldPct: FourchetteObservee;
  /** Idem dans le neuf, où il n'y a pas de droits de mutation. */
  readonly totalFeesNewPct: FourchetteObservee;
}

/**
 * COÛTS DE DÉTENTION — `ENG-010`.
 *
 * Ces quatre valeurs pilotent la comparaison « acheter ou louer » au niveau
 * simple. Aucune n'est un montant : la taxe foncière, les charges et l'assurance
 * habitation sont saisies par l'utilisateur, parce qu'elles dépendent de la
 * commune, de l'immeuble et du contrat, et qu'aucune moyenne nationale ne dirait
 * quoi que ce soit d'utile sur un bien précis.
 *
 * Ce qui reste ici, ce sont les **ordres de grandeur qu'un utilisateur ne peut
 * pas connaître** : ce qu'il faut provisionner pour l'entretien, et la vitesse à
 * laquelle chaque poste dérive d'une année sur l'autre.
 *
 * ⚠️ Les trois indexations sont le paramètre le plus sensible du module, et de
 * loin. L'année de croisement dépend d'un écart entre deux séries qui grandissent
 * chacune à quelques pour cent par an : un point d'écart d'indexation la déplace
 * de plusieurs années. C'est pourquoi elles sont ici, déclarées avec leur
 * intervalle, plutôt qu'écrites en dur dans le calcul.
 *
 * `FIS-006` en a corrigé deux sur trois. Le loyer était indexé un demi-point
 * trop haut, la taxe foncière deux dixièmes trop bas ; les deux corrections
 * jouent dans le même sens, celui de l'achat, et aucune n'était visible sans
 * ouvrir une série publiée.
 */
export interface DetentionAssumptions {
  /** Provision annuelle pour travaux et entretien, en % de la valeur du bien. */
  readonly provisionTravauxPctAnnuel: HypotheseChiffree;
  /** Révision annuelle du loyer, en %. */
  readonly indexationLoyerPctAnnuel: HypotheseChiffree;
  /** Dérive annuelle de la taxe foncière, en %. */
  readonly indexationTaxeFoncierePctAnnuel: HypotheseChiffree;
  /** Dérive annuelle des charges, assurances et provisions, en %. */
  readonly indexationChargesPctAnnuel: HypotheseChiffree;
}

/**
 * SCÉNARIO DE VENTE — `ENG-012`.
 *
 * Deux hypothèses, et **elles ne sont pas de la même espèce**. C'est pourquoi
 * elles n'ont pas le même type, et il faut le lire comme une prise de position.
 *
 * ── L'APPRÉCIATION N'A PAS DE VALEUR CENTRALE, ET N'EN AURA PAS ─────────────
 *
 * `FourchetteObservee`, donc **sans `valeur`**. Publier un chiffre central pour
 * l'appréciation d'un bien reviendrait à publier une prévision de marché, ce que
 * `docs/CONTEXT.md` §8 exclut explicitement. Le simulateur n'a aucune idée de ce
 * que vaudra un appartement dans quinze ans, et personne n'en a.
 *
 * La conséquence est voulue et elle se voit dans le code : `produitDeVente` n'a
 * **aucune valeur par défaut** pour l'appréciation, et le champ est obligatoire
 * dans son type d'entrée. L'interface montre l'intervalle, l'utilisateur choisit
 * son point, et le résultat porte l'hypothèse retenue. Même discipline que
 * `rendements` ci-dessous.
 *
 * ── LA COMMISSION D'AGENCE, ELLE, S'OBSERVE ────────────────────────────────
 *
 * `HypotheseChiffree`, donc avec une valeur centrale, parce qu'il y en a une :
 * les grilles sont publiques, affichées en vitrine, et l'ordre de grandeur ne
 * dépend d'aucune anticipation. Elle sert de valeur par défaut, et l'utilisateur
 * peut la ramener à zéro pour chiffrer une vente entre particuliers.
 */
export interface VenteAssumptions {
  /**
   * Appréciation annuelle du bien, en %. Sans valeur centrale — voir ci-dessus.
   * L'intervalle est large et sa borne basse est négative : les marchés reculent,
   * et un intervalle strictement positif serait déjà une prévision.
   */
  readonly appreciationAnnuellePct: FourchetteObservee;
  /** Commission d'agence à la revente, en % du prix de cession. */
  readonly commissionAgencePct: HypotheseChiffree;
}

/**
 * RENDEMENTS DU PORTEFEUILLE DE RÉFÉRENCE — `ENG-011`, déplacés ici par `FIS-006`.
 *
 * Ces fourchettes vivaient dans `src/core/compare/portefeuille.ts`, avec un
 * commentaire disant qu'elles étaient au mauvais endroit et pourquoi : le
 * fichier d'accueil était pris par un autre chantier au moment de les écrire.
 * Elles sont ici sans qu'un seul chiffre ait bougé, et un test le garde.
 *
 * ⚠️ Ces rendements s'entendent **nets de toute fiscalité**. C'est ce qui rend
 * leur recoupement difficile : les sources publient du brut. Voir chaque
 * provenance, et `portefeuille.ts` pour ce que le module en fait — c'est-à-dire
 * rien : il ne les lit jamais, l'utilisateur les remplace.
 */
export interface RendementAssumptions {
  /** Support à capital garanti, type fonds en euros. */
  readonly sansRisque: FourchetteObservee;
  /** Portefeuille d'actions diversifié, détenu longtemps. */
  readonly actionsDiversifiees: FourchetteObservee;
}

/**
 * MISE EN LOCATION — `ENG-029`, entrées du 25 août 2026.
 *
 * Le scénario « louer plutôt que vendre » a besoin de quatre ordres de grandeur
 * qu'aucun texte ne fixe et qu'un utilisateur ne connaît généralement pas : ce
 * que la vacance coûte, ce que la gestion prélève, et à quel rythme un meublé
 * s'amortit au régime réel. Les quatre entrent en `estimee`, chacune avec la
 * raison écrite — les listes-cliquets de `market.test.ts` ont été mises à jour
 * en conséquence, ce qui est leur usage prévu.
 */
export interface LocationAssumptions {
  /** Loyers perdus entre deux locataires, en % des loyers annuels. */
  readonly vacanceLocativePctLoyers: HypotheseChiffree;
  /** Honoraires de gestion courante, TTC, en % des loyers encaissés. */
  readonly fraisGestionPctLoyers: HypotheseChiffree;
  /** Dotation annuelle au réel meublé, en % de la part amortissable. */
  readonly amortissementAnnuelPct: HypotheseChiffree;
  /** Part de la valeur du bien qui s'amortit — le terrain ne s'amortit jamais. */
  readonly partAmortissableDuBienPct: HypotheseChiffree;
}

export interface MarketAssumptions {
  /** Date du relevé, et non millésime légal : ces valeurs n'ont pas d'exercice. */
  readonly releve: string;
  readonly guarantee: GuaranteeAssumptions;
  readonly insurance: InsuranceAssumptions;
  readonly acquisition: AcquisitionAssumptions;
  readonly detention: DetentionAssumptions;
  readonly location: LocationAssumptions;
  readonly vente: VenteAssumptions;
  readonly rendements: RendementAssumptions;
}

/**
 * Valeurs en vigueur dans le simulateur.
 *
 * Relevé du 23 août 2026, après la campagne de recoupement `FIS-006`. Six
 * chiffres ont bougé, chacun contre un document ouvert et cité dans sa
 * provenance ; les autres sont restés, avec la raison écrite pour laquelle ils
 * n'ont pas pu l'être.
 */
export const MARKET_2026: MarketAssumptions = {
  releve: "2026-08",

  guarantee: {
    suretyshipCostPct: {
      valeur: 1.35,
      intervalle: [1.0, 1.5],
      fiabilite: "observee",
      provenance:
        "Caution d'un organisme spécialisé, commission et fonds mutuel réunis, en pourcentage " +
        "du capital garanti. Crédit Logement ne publie aucune grille : ses pages de tarification " +
        "Classic et Initio décrivent les deux composantes sans un seul chiffre et renvoient à un " +
        "simulateur. La valeur vient donc de deux exemples représentatifs de la Société Générale, " +
        "où le poste est chiffré : 2 750 € pour 200 000 € empruntés dans l'exemple en vigueur au " +
        "1er mai 2025, soit 1,375 %, et 2 660 € dans l'offre du 15 juin au 15 juillet 2026, soit " +
        "1,33 %. Les bornes, elles, ne sont lues nulle part : elles couvrent les autres " +
        "organismes de cautionnement, dont aucun ne publie de barème.",
    },
    suretyshipRefundPct: {
      valeur: 55,
      intervalle: [0, 75],
      fiabilite: "estimee",
      provenance:
        "Part du coût de la caution restituée au terme du prêt. Crédit Logement annonce sur sa " +
        "page de tarification que « le taux de restitution est d'environ 70 % » et qu'il évolue " +
        "chaque trimestre — mais ces 70 % portent sur le seul versement au fonds mutuel, pas sur " +
        "le coût total, dont la commission de caution n'est jamais restituée. Le partage entre " +
        "les deux composantes n'est publié nulle part : seul le simulateur le donne, cas par cas. " +
        "Notre 55 % du total est donc une conversion que nous n'avons pas pu vérifier, et c'est " +
        "la raison pour laquelle cette entrée reste estimée.",
    },
    mortgageCostPct: {
      valeur: 1.35,
      intervalle: [1.2, 1.5],
      fiabilite: "observee",
      provenance:
        "Inscription hypothécaire : émoluments du notaire, taxe de publicité foncière et débours " +
        "réunis. Le Crédit Agricole publie le détail sur son site — taxe de publicité foncière de " +
        "0,715 % du montant garanti, débours de 200 à 300 €, émoluments au barème réglementé — et " +
        "chiffre le total à « 1,2 % à 1,5 % du montant du prêt ». La valeur retenue est le milieu " +
        "de cette fourchette lue ; l'ancien intervalle montait à 2,0 %, ce qu'aucune source " +
        "consultée ne soutient.",
    },
    mortgageReleasePct: {
      valeur: 0.4,
      intervalle: [0.3, 0.6],
      fiabilite: "observee",
      provenance:
        "Mainlevée d'hypothèque en cas de revente avant le terme du prêt. La question écrite " +
        "n° 6820 de la XVIIe législature, publiée au Journal officiel avec la réponse du " +
        "gouvernement, chiffre ces frais « entre 0,3 et 0,6 % du montant initial de l'emprunt » ; " +
        "le chiffre est avancé par le député et la réponse ne le conteste pas. L'assiette est le " +
        "capital emprunté, et non le prix du bien : la mainlevée radie une inscription, dont le " +
        "montant est celui de la créance garantie. Le moteur appliquait ce taux au prix jusqu'au " +
        "ticket ENG-028, qui l'a corrigé.",
    },
    pledgeCostPct: {
      valeur: 0.3,
      intervalle: [0.1, 0.5],
      fiabilite: "estimee",
      provenance:
        "Nantissement d'un contrat d'épargne. Ni acte notarié ni fonds mutuel à alimenter, d'où " +
        "un coût d'entrée nettement inférieur aux deux autres garanties. Aucune grille publique " +
        "n'a pu être trouvée : les pages des assureurs qui pratiquent le nantissement — MAIF, " +
        "AG2R La Mondiale, Matmut — en décrivent le mécanisme et vantent l'économie réalisée sans " +
        "jamais chiffrer l'acte lui-même, qui se négocie de gré à gré avec la banque. La valeur " +
        "reste un ordre de grandeur et l'intervalle un encadrement de notre fait.",
    },
  },

  insurance: {
    groupRatePct: {
      intervalle: [0.26, 0.42],
      fiabilite: "estimee",
      provenance:
        "Contrat de groupe d'une banque, taux annuel sur capital initial. La borne basse était de " +
        "0,30 % et elle était fausse : l'exemple représentatif de la Société Générale en vigueur " +
        "au 1er mai 2025 facture 43,33 € par mois pour 200 000 € empruntés par un emprunteur de " +
        "35 ans, soit 0,26 % par an — le contre-exemple relevé par ENG-008, désormais intégré. " +
        "L'offre SG du 15 juin au 15 juillet 2026 donne 61,33 € par mois à 38 ans, soit 0,368 % : " +
        "trois ans d'écart d'âge et 42 % de prime en plus. La borne haute, elle, n'est lue dans " +
        "aucune source et reste notre extension, d'où une fiabilité qui n'est pas relevée.",
    },
    delegationRatePct: {
      intervalle: [0.1, 0.2],
      fiabilite: "estimee",
      provenance:
        "Délégation d'assurance, même assiette. L'écart avec le contrat de groupe est ce que la " +
        "loi Lemoine permet d'aller chercher ; il varie fortement avec l'âge et l'état de santé, " +
        "que ces bornes n'expriment pas. Vérification non aboutie : les assureurs alternatifs ne " +
        "publient pas d'exemple représentatif chiffré, la fiche standardisée d'information est " +
        "remise au client et non mise en ligne, et le bilan de la loi Lemoine adressé au Parlement " +
        "par le Comité consultatif du secteur financier raisonne en parts de marché et en nombre " +
        "de substitutions, jamais en taux. Les seuls chiffres trouvés viennent de courtiers, qui " +
        "vendent ce qu'ils décrivent : ils ne font pas une source.",
    },
  },

  acquisition: {
    totalFeesOldPct: {
      intervalle: [7, 8.5],
      fiabilite: "estimee",
      provenance:
        "Frais d'acquisition dans l'ancien, tous postes réunis. Les notaires de France publient " +
        "« environ 7 à 8 % du prix » — mais cette phrase cohabite, sur leur propre site mis à jour " +
        "le 5 décembre 2025, avec un taux global de taxe de publicité foncière porté à 6,31 % " +
        "après le relèvement départemental de 2025. Une contradiction interne à la source : les " +
        "6,31 % de taxe ne laissent pas de place aux émoluments, débours et formalités sous une " +
        "borne haute de 8 %. Notre 8,5 % tient compte de la hausse, ce que la phrase des notaires " +
        "ne fait visiblement pas ; faute de pouvoir citer une source qui l'écrive, la fiabilité " +
        "reste estimée.",
    },
    totalFeesNewPct: {
      intervalle: [2, 3],
      fiabilite: "observee",
      provenance:
        "Frais d'acquisition dans le neuf, où la taxe de publicité foncière au taux réduit " +
        "remplace les droits de mutation. Les deux bornes sont celles que publient les notaires " +
        "de France : « environ 2 à 3 % » du prix. Rien ne les a fait bouger en 2025, la hausse " +
        "départementale ne portant que sur l'ancien.",
    },
  },

  detention: {
    provisionTravauxPctAnnuel: {
      valeur: 1.0,
      intervalle: [0.5, 2.0],
      fiabilite: "estimee",
      provenance:
        "Règle de pouce répandue : provisionner environ 1 % de la valeur du bien et par an pour " +
        "l'entretien, le remplacement des équipements et la quote-part de travaux votés en " +
        "assemblée. Vérification non aboutie, et il faut dire pourquoi : les observatoires de " +
        "copropriété publient des charges au mètre carré, pas une dépense d'entretien rapportée " +
        "à la valeur du bien, et les deux ne se convertissent pas l'une dans l'autre sans " +
        "connaître le prix au mètre carré de l'immeuble. Un immeuble récent se situe plutôt en " +
        "bas de l'intervalle, un immeuble ancien à ravaler bien au-dessus.",
    },
    indexationLoyerPctAnnuel: {
      valeur: 1.5,
      intervalle: [0, 3.6],
      fiabilite: "observee",
      provenance:
        "Révision annuelle du loyer. Le plafond, lui, est bien de droit — la révision ne peut " +
        "dépasser la variation de l'indice de référence des loyers publié par l'INSEE, et le bail " +
        "doit prévoir une clause de révision. Mais la VARIATION de cet indice n'est pas une règle : " +
        "c'est une donnée qui se constate. L'INSEE la publie, et elle contredit la valeur de 2,0 % " +
        "qui figurait ici : l'indice vaut 148,37 au deuxième trimestre 2026 pour une base 100 au " +
        "quatrième trimestre 1998, soit 1,44 % par an sur vingt-sept ans et demi. Les derniers " +
        "trimestres sont plus bas encore, +0,78 % puis +1,15 % sur un an. La borne haute passe de " +
        "3,5 à 3,6 %, plus forte hausse annuelle de la série sur dix ans, atteinte au deuxième " +
        "trimestre 2022.",
    },
    indexationTaxeFoncierePctAnnuel: {
      valeur: 3.2,
      intervalle: [1.9, 6.5],
      fiabilite: "observee",
      provenance:
        "Dérive annuelle de la taxe foncière. Elle a deux moteurs de nature différente : la " +
        "revalorisation forfaitaire des valeurs locatives cadastrales, qui suit un indice, et le " +
        "taux voté chaque année par les collectivités, qui ne suit rien d'autre que leur budget. " +
        "Le dix-neuvième rapport de l'Observatoire national des taxes foncières, publié en " +
        "octobre 2025 à partir des fichiers de la direction générale des finances publiques, " +
        "mesure une hausse moyenne de 37,3 % entre 2014 et 2024, soit 3,2 % par an — contre " +
        "19,9 % d'inflation et 8,7 % de loyers sur la même période. Les bornes sont les extrêmes " +
        "des deux cents plus grandes villes sur ces dix ans : Caen à +21 % cumulés, soit 1,9 % " +
        "par an, et Paris à +88 %, soit 6,5 % par an. Retenir zéro serait le seul choix " +
        "franchement faux.",
    },
    indexationChargesPctAnnuel: {
      valeur: 2.0,
      intervalle: [1.0, 4.0],
      fiabilite: "estimee",
      provenance:
        "Dérive annuelle des charges de copropriété, des charges locatives, des assurances " +
        "habitation et de la provision pour travaux, appliquée identiquement aux deux côtés de la " +
        "comparaison. La valeur est celle d'une inflation de longue période : l'Institut de " +
        "l'épargne immobilière et foncière mesure 2,0 % par an sur quarante ans et 1,6 % sur " +
        "quinze. Les charges, elles, montent plus vite, et les deux observatoires consultés ne " +
        "s'accordent pas sur combien : la FNAIM du Grand Paris relève +10,71 % pour la seule " +
        "année 2023, l'Association des responsables de copropriété +4,6 % pour cette même année, " +
        "sur des périmètres qui ne se recouvrent pas. Faute de série longue et de chiffres " +
        "concordants, l'entrée reste estimée et sa borne haute est notre extension.",
    },
  },

  location: {
    vacanceLocativePctLoyers: {
      valeur: 2.5,
      intervalle: [0, 8],
      fiabilite: "estimee",
      provenance:
        "Part des loyers annuels perdue entre deux locataires. L'observatoire CLAMEUR mesurait " +
        "4,6 semaines de vacance moyenne entre deux baux en février 2017 — 3,2 semaines en " +
        "Aquitaine, 10,6 en Pays de la Loire —, chiffres lus dans un article de SeLoger de " +
        "mars 2017, seul document qui a pu être ouvert : les communiqués CLAMEUR récents relayés " +
        "par la presse n'ont pas pu l'être. La conversion en pourcentage des loyers dépend en " +
        "outre de la durée d'occupation entre deux départs, que ces sources ne donnent pas. " +
        "Notre 2,5 % — environ 4,6 semaines de vide tous les trois ans et demi — reste donc un " +
        "ordre de grandeur, et zéro décrit un locataire qui ne part jamais.",
    },
    fraisGestionPctLoyers: {
      valeur: 7,
      intervalle: [4, 10],
      fiabilite: "estimee",
      provenance:
        "Honoraires de gestion locative courante, toutes taxes comprises, en pourcentage des " +
        "loyers encaissés. Les grilles publiées le sont par les gestionnaires eux-mêmes : une " +
        "page de l'agence en ligne Manda, mise à jour en 2026, situe le marché entre 4 et 10 % " +
        "TTC — 4 à 6 % pour les mandats en ligne, 7 à 10 % en agence traditionnelle. Un " +
        "gestionnaire qui décrit les tarifs de ses concurrents vend ce qu'il décrit, et aucun " +
        "barème d'observatoire public n'a pu être trouvé : l'entrée reste estimée. Les " +
        "honoraires de mise en location et la garantie loyers impayés, facturés à part, n'y " +
        "sont pas. Zéro chiffre la gestion en direct.",
    },
    amortissementAnnuelPct: {
      valeur: 2.5,
      intervalle: [2, 3],
      fiabilite: "estimee",
      provenance:
        "Dotation annuelle d'amortissement au régime réel meublé, en pourcentage de la part " +
        "amortissable du bien. Aucun texte ne fixe ce taux : la doctrine admet l'amortissement " +
        "par composants, et la pratique des experts-comptables du meublé retient des durées qui " +
        "reviennent à 2 ou 3 % par an sur l'ensemble bâti. Les durées indicatives composant par " +
        "composant n'ont pas pu être confrontées — leur application demande une ventilation du " +
        "prix que le simulateur ne connaît pas. La valeur reste un ordre de grandeur de " +
        "praticien, pas une mesure.",
    },
    partAmortissableDuBienPct: {
      valeur: 85,
      intervalle: [75, 90],
      fiabilite: "estimee",
      provenance:
        "Part de la valeur du bien effectivement amortissable, le terrain ne s'amortissant " +
        "jamais. La quote-part du terrain varie fortement entre une commune rurale et un " +
        "centre-ville dense, et les ventilations admises par l'administration ne sont pas " +
        "publiées en tableau national : aucune grille n'a pu être ouverte. Les 85 % retenus — " +
        "un terrain à 15 % — sont la convention la plus répandue chez les praticiens du " +
        "meublé ; c'est notre décision, pas une mesure.",
    },
  },

  vente: {
    appreciationAnnuellePct: {
      intervalle: [-2, 4],
      fiabilite: "estimee",
      provenance:
        "Appréciation annuelle d'un logement, en termes nominaux. Aucune valeur centrale n'est " +
        "publiée ici, et c'est délibéré : la donner reviendrait à annoncer ce que vaudra un bien " +
        "dans quinze ans. Ce que l'INSEE publie, c'est la variation d'une ANNÉE sur l'autre de " +
        "l'indice Notaires-INSEE, et elle est bien plus violente que notre intervalle : de −5,5 % " +
        "au premier trimestre 2024 à +10,0 % au deuxième trimestre 2011, +0,1 % au premier " +
        "trimestre 2026. Nos bornes sont volontairement plus resserrées, parce qu'elles décrivent " +
        "un taux TENU SUR TOUT UN HORIZON et non la secousse d'une année ; mais ce resserrement " +
        "est notre décision, aucune source ne le publie, et c'est pourquoi l'entrée reste estimée. " +
        "L'écart entre deux points de cet intervalle change le produit de la vente de plusieurs " +
        "dizaines de milliers d'euros sur vingt ans : c'est l'hypothèse la plus sensible du " +
        "scénario, et de très loin.",
    },
    commissionAgencePct: {
      valeur: 5,
      intervalle: [3, 8],
      fiabilite: "observee",
      provenance:
        "Commission d'agence à la revente, toutes taxes comprises, en pourcentage du prix de " +
        "cession. Les honoraires sont libres depuis la loi du 1er août 1986, mais leur affichage " +
        "est obligatoire, ce qui rend les barèmes lisibles : celui d'une agence Century 21 daté " +
        "du 1er janvier 2026 facture 10 100 € à 150 000 €, 12 000 € à 200 000 €, 14 800 € à " +
        "300 000 € et 5 % hors taxes au-delà de 450 000 €, soit de 4,7 à 6,7 % selon le prix — " +
        "le barème est dégressif, ce qu'un taux unique ne reproduit pas. La borne basse de 3 % " +
        "vise les réseaux à honoraires réduits, dont aucun barème publié n'a pu être ouvert. " +
        "Zéro chiffre la vente de particulier à particulier.",
    },
  },

  rendements: {
    sansRisque: {
      intervalle: [1.5, 3],
      fiabilite: "estimee",
      provenance:
        "Support à capital garanti, type fonds en euros, net des prélèvements. Le taux moyen de " +
        "revalorisation servi en 2025 est de 2,6 % selon France Assureurs et de 2,63 % selon " +
        "l'Autorité de contrôle prudentiel et de résolution — mais ces taux sont nets de frais de " +
        "gestion et BRUTS de prélèvements sociaux, soit environ 2,2 % une fois les 17,2 % " +
        "retranchés. La conversion tombe bien dans notre intervalle sans en justifier les bornes, " +
        "que la dispersion contrat par contrat déterminerait et qu'aucun document ouvert ne " +
        "donne : les publications de l'ACPR n'ont pas pu être consultées, le serveur refusant les " +
        "requêtes automatisées. L'entrée reste donc estimée.",
    },
    actionsDiversifiees: {
      intervalle: [4, 7],
      fiabilite: "estimee",
      provenance:
        "Portefeuille d'actions diversifié détenu sur longue période, net d'impôt et de frais. " +
        "L'étude « 40 ans de performances comparées » de l'Institut de l'épargne immobilière et " +
        "foncière donne des taux de rendement interne de 12,4 % par an sur quarante ans et 9,9 % " +
        "sur quinze pour les actions françaises — mais BRUTS de fiscalité, quand notre fourchette " +
        "est nette. La conversion dépend de l'enveloppe retenue, qui n'est pas encore modélisée " +
        "(ticket ENG-023) : notre intervalle est donc cohérent avec ces mesures sans en découler, " +
        "et il reste estimé. Il est de surcroît une espérance : il ne dit rien de la dispersion, " +
        "que seule une simulation de trajectoires rend visible.",
    },
  },
};

/** Raccourci de lecture : la valeur seule, quand le contexte suffit. */
export const valeur = (h: HypotheseChiffree): number => h.valeur;
