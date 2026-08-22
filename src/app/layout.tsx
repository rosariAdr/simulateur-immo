import type { Metadata } from "next";
import { Archivo, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Avertissement } from "@/components/Avertissement";
import { PiedDePage } from "@/components/PiedDePage";
import { INDEXABLE } from "@/lib/site";
import "./globals.css";

/**
 * Trois rôles, trois familles. Voir docs/06-design-system.md §6.
 *
 * `next/font` télécharge à la compilation et sert les fichiers depuis ce site.
 * Aucune requête n'est émise vers une fonderie distante à l'exécution : c'est
 * ce qui permet de tenir la promesse « aucune donnée personnelle traitée », un
 * appel distant transmettant l'adresse IP de chaque visiteur.
 */

/** Titres et chiffres marquants. Grotesque variable en graisse et en largeur. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

/** Texte courant et interface. Lignée Franklin Gothic, registre institutionnel. */
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

/** Données, montants, tableaux. Chasse fixe, chiffres tabulaires. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simulateur d'acquisition immobilière",
  description:
    "Calcule et explique une acquisition immobilière : crédit, aides, comparaison " +
    "avec la location, remboursements anticipés. Gratuit, sans compte, sans collecte de données.",
  // Hérité par toutes les routes qui ne définissent pas les leurs. Tant que les
  // textes légaux n'ont pas été relus, le site fonctionne et se partage par lien
  // mais n'entre pas dans les moteurs. Voir src/lib/site.ts.
  ...(INDEXABLE ? {} : { robots: { index: false, follow: false } }),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          L’avertissement est en tête de document, avant le contenu, sur toutes
          les pages — y compris la galerie de composants. « Visible, pas relégué
          en pied de page », et il ne se ferme pas. Voir LEG-002.
        */}
        <Avertissement />
        {/* L’état des scénarios vit dans l’URL. Voir src/lib/scenario.ts. */}
        <NuqsAdapter>{children}</NuqsAdapter>
        {/* Les textes qu'on va chercher délibérément. Voir LEG-001. */}
        <PiedDePage />
      </body>
    </html>
  );
}
