# Textes légaux — première version

> **Brouillons. Non validés par un professionnel du droit.**
> Suffisants pour publier un site en construction, expressément présenté comme tel.
> `LEG-001` et `LEG-002` ne sont pas clos tant qu'un juriste n'a pas relu ces textes.

Quatre textes, trois obligations distinctes :

| Fichier | Obligation | Fondement |
|---|---|---|
| `mentions-legales.md` | Identifier l'éditeur et l'hébergeur | LCEN 2004-575, art. 6 III |
| `politique-confidentialite.md` | Informer sur les traitements de données | RGPD, art. 13 |
| `conditions-utilisation.md` | Fixer les règles d'usage et la responsabilité | contractuel |
| `avertissement.md` | Écarter la qualification de conseil réglementé | `LEG-002` |

## État au 22 août 2026

**Les champs `[À COMPLÉTER]` sont remplis** et les quatre textes sont publiés :
`/mentions-legales`, `/confidentialite`, `/conditions` et `/avertissement`. Ces
fichiers restent la source ; les pages les rendent.

Régime retenu : **éditeur non professionnel anonyme** (LCEN, art. 6 III). Il tient à
deux conditions, dont une seule est vérifiable depuis le site.

- ✅ L'identité de l'hébergeur figure dans les mentions légales — un test de bout en
  bout le vérifie, y compris l'absence de téléphone publié par Vercel.
- ⚠️ **L'identité de l'éditeur doit avoir été communiquée à Vercel.** Rien dans ce
  dépôt ne peut l'attester. Si ce n'est pas fait, le régime d'anonymat ne s'applique
  pas et le nom doit être publié.

**Ce qui reste ouvert.**

- La relecture par un juriste. `LEG-001` et `LEG-002` sont livrés, pas validés.
- La licence du code source. Aucune n'est attachée à ce jour, ce que les mentions
  légales disent explicitement — en l'absence de licence, un dépôt public reste sous
  droit d'auteur plein et n'autorise aucune réutilisation. C'est un choix par défaut
  et non une décision ; il mérite d'en devenir une.
- Le site reste en `noindex` jusqu'à cette relecture. Voir `src/lib/site.ts`.

Un site sans identification d'éditeur est en infraction, quelle que soit la qualité
du reste.
