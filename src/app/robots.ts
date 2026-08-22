import type { MetadataRoute } from "next";
import { INDEXABLE } from "@/lib/site";

/**
 * `/robots.txt`, généré à la compilation.
 *
 * Il dit la même chose que les balises `robots` de la mise en page, parce qu'il
 * lit le même interrupteur. Un `robots.txt` permissif assorti de balises
 * `noindex` — ou l'inverse — est une incohérence qu'on ne remarque qu'une fois
 * le site indexé, c'est-à-dire trop tard.
 *
 * Une précision qui compte : `robots.txt` demande de ne pas *explorer*, la
 * balise demande de ne pas *indexer*. Les deux sont nécessaires, et aucune
 * n'est contraignante — ce sont des conventions que les moteurs sérieux
 * respectent. Ce n'est pas une mesure de confidentialité.
 */
export default function robots(): MetadataRoute.Robots {
  return INDEXABLE
    ? { rules: { userAgent: "*", allow: "/" } }
    : { rules: { userAgent: "*", disallow: "/" } };
}
