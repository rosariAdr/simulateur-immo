import type { Metadata } from "next";
import { Archivo, Public_Sans, IBM_Plex_Mono } from "next/font/google";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
