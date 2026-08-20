/**
 * ARITHMÉTIQUE MONÉTAIRE — décimal scalé à exposant fixe.
 *
 * ── LE MODÈLE ───────────────────────────────────────────────────────────────
 * Toute somme est un entier de centimes : la mantisse d'un décimal scalé dont
 * l'exposant vaut −2 et n'a donc pas besoin d'être transporté.
 *
 *     10 000,54 €  →  1 000 054 centimes  =  1 000 054 × 10⁻²
 *
 * C'est la représentation employée par les systèmes bancaires. Porter
 * l'exposant explicitement sur chaque valeur n'apporterait rien tant qu'il est
 * constant : champ redondant, et risque d'incohérence si l'on additionne deux
 * montants d'exposants différents sans normaliser.
 *
 * L'exposant explicite est en revanche utile à la FRONTIÈRE du moteur, pour
 * analyser une saisie utilisateur sans passer par un flottant intermédiaire.
 * D'où le type `Scaled` et `parseAmount` ci-dessous.
 *
 * ── CE QUE CETTE REPRÉSENTATION NE RÉSOUT PAS ───────────────────────────────
 * Elle rend exactes les sommes, différences et comparaisons de montants.
 * Elle ne rend PAS exact le calcul d'intérêts, et aucune représentation
 * décimale ne le pourrait :
 *
 *     intérêts = capitalRestantDû × taux / 12
 *
 * À 3,35 %, le taux mensuel vaut 0,0027916666… — un décimal illimité. Et
 * l'annuité fait intervenir (1 + r)^(−n), qui n'est pas un décimal du tout.
 * Il FAUT arrondir. La seule question qui vaille est : où, et comment ?
 *
 * La réponse n'est pas numérique mais contractuelle. Les banques arrondissent
 * au centime à chaque échéance, et la dernière échéance absorbe le résidu.
 * C'est une convention, pas une approximation subie — d'où `RoundingMode`,
 * explicite et testable, plutôt qu'un `Math.round` dispersé dans le code.
 *
 * ── SÛRETÉ EN 64 BITS ───────────────────────────────────────────────────────
 * JavaScript n'a pas d'entiers 64 bits : ses nombres sont des flottants double
 * précision, exacts sur les entiers jusqu'à 2⁵³ − 1 = 9 007 199 254 740 991.
 * En centimes, cela plafonne à environ 90 000 milliards d'euros. Aucun risque
 * sur ce domaine métier — `assertSafe` le vérifie tout de même aux points chauds.
 *
 * BigInt donnerait des entiers exacts sans limite, mais interdirait `Math.pow`
 * et imposerait de réimplémenter l'exponentiation en virgule fixe. Le gain
 * serait nul ici : le facteur limitant est l'arrondi contractuel, pas la
 * précision de la représentation.
 */

/** Montant en centimes entiers. Mantisse d'un décimal scalé à exposant −2. */
export type Cents = number;

/** Taux exprimé en pourcentage annuel, tel que saisi (3.35 = 3,35 %). */
export type PercentPerYear = number;

/** Décimal scalé explicite : valeur = mantisse × 10^exposant. Usage frontière uniquement. */
export interface Scaled {
  readonly mantissa: number;
  readonly exponent: number;
}

export const MAX_SAFE_CENTS = Number.MAX_SAFE_INTEGER;

export function assertSafe(value: number, context: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${context} : valeur non finie`);
  if (Math.abs(value) > MAX_SAFE_CENTS) {
    throw new RangeError(`${context} : dépassement de la précision entière exacte (2⁵³)`);
  }
}

/* ── Politique d'arrondi ──────────────────────────────────────────────────── */

/**
 * - "half-up"   : 0,5 monte. Convention bancaire française la plus répandue.
 * - "half-even" : 0,5 va au pair le plus proche. Réduit le biais cumulé sur de
 *                 longues séries. Convention IEEE 754, retenue par certains
 *                 établissements.
 * - "down"      : troncature vers zéro.
 *
 * Le choix relève du contrat, pas du moteur. Il est donc paramétrable et son
 * effet est mesurable — voir les tests de sensibilité à l'arrondi.
 */
export type RoundingMode = "half-up" | "half-even" | "down";

export function roundCents(value: number, mode: RoundingMode = "half-up"): Cents {
  assertSafe(value, "roundCents");
  switch (mode) {
    case "down":
      return Math.trunc(value);
    case "half-even": {
      const floor = Math.floor(value);
      const diff = value - floor;
      if (diff > 0.5) return floor + 1;
      if (diff < 0.5) return floor;
      return floor % 2 === 0 ? floor : floor + 1;
    }
    default:
      return value >= 0 ? Math.floor(value + 0.5) : -Math.floor(-value + 0.5);
  }
}

/* ── Conversions ──────────────────────────────────────────────────────────── */

export const euros = (v: number): Cents => roundCents(v * 100);
export const toEuros = (c: Cents): number => c / 100;

/**
 * Analyse une saisie utilisateur en décimal scalé, SANS flottant intermédiaire.
 *
 * C'est ici que l'exposant explicite sert : « 10000,54 » devient
 * { mantissa: 1000054, exponent: −2 } par manipulation de chaîne, puis se
 * convertit exactement en centimes. `parseFloat("10000.54")` produirait
 * 10000.539999999999 avant même le premier calcul.
 *
 * Accepte la virgule décimale française, l'espace et l'espace insécable.
 */
export function parseAmount(input: string): Scaled {
  const cleaned = input.trim().replace(/[\s\u00A0\u202F]/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "." || cleaned === "-" || !/^-?\d*\.?\d*$/.test(cleaned)) {
    throw new SyntaxError(`Montant illisible : « ${input} »`);
  }
  const negative = cleaned.startsWith("-");
  const body = negative ? cleaned.slice(1) : cleaned;
  const parts = body.split(".");
  const intPart = parts[0] ?? "0";
  const fracPart = parts[1] ?? "";
  const mantissa = Number(`${intPart}${fracPart}` || "0");
  assertSafe(mantissa, "parseAmount");
  return { mantissa: negative ? -mantissa : mantissa, exponent: -fracPart.length };
}

/** Convertit un décimal scalé en centimes, avec arrondi si la précision dépasse 10⁻². */
export function scaledToCents(s: Scaled, mode: RoundingMode = "half-up"): Cents {
  const shift = s.exponent + 2;
  if (shift >= 0) return s.mantissa * Math.pow(10, shift);
  return roundCents(s.mantissa / Math.pow(10, -shift), mode);
}

export const amountFromInput = (input: string, mode: RoundingMode = "half-up"): Cents =>
  scaledToCents(parseAmount(input), mode);

/* ── Opérations ───────────────────────────────────────────────────────────── */

/** Applique un pourcentage à un montant. Un seul arrondi, en fin de calcul. */
export function applyPct(amount: Cents, pct: number, mode: RoundingMode = "half-up"): Cents {
  return roundCents((amount * pct) / 100, mode);
}

/** Taux mensuel proportionnel. Le TAEG emploie une méthode d'équivalence distincte (voir apr.ts). */
export const monthlyRate = (annualPct: PercentPerYear): number => annualPct / 100 / 12;

export function sum(xs: readonly Cents[]): Cents {
  let acc = 0;
  for (const x of xs) acc += x;
  assertSafe(acc, "sum");
  return acc;
}

/** Alias historique conservé pour la lisibilité des appels internes. */
export const cents = (v: number): Cents => roundCents(v);
