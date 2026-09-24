import {
  Inter,
  Montserrat,
  Nunito_Sans,
  Poppins,
  Rajdhani,
  Source_Sans_3,
  Work_Sans,
} from 'next/font/google';

// Mission 57 §5 — les polices EMBARQUÉES. next/font les télécharge et les auto-héberge À LA
// COMPILATION : aucune requête vers un service extérieur pendant le Live, et la question de
// licence est réglée d'avance (Google Fonts, licence ouverte). Le navigateur ne télécharge
// une fonte que lorsqu'un texte rendu l'utilise réellement — embarquer six familles ne coûte
// donc rien au runtime : seule la police active de l'agence part sur le réseau du vendeur.
//
// Les noms de variables ci-dessous DOIVENT rester alignés avec `cssVar` dans font-registry.ts
// (next/font exige des littéraux ici, d'où le doublon assumé). Poids alignés partout :
// régulier / medium / semibold / gras — les quatre dont l'interface a besoin.

// Défaut produit Start Academy : Montserrat (corps/interface) + Rajdhani (titres).
const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
const rajdhani = Rajdhani({
  variable: '--font-rajdhani',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

// Les cinq autres de la liste embarquée (Montserrat y figure aussi, comme choix explicite).
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
const sourceSans = Source_Sans_3({
  variable: '--font-source-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
const workSans = Work_Sans({
  variable: '--font-work-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
const nunitoSans = Nunito_Sans({
  variable: '--font-nunito-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

// Toutes les variables, à poser une fois sur <html> : chaque police devient disponible en
// `var(--font-*)`, et la charte de l'agence désigne laquelle est active (voir brand-style).
export const embeddedFontClassNames = [
  montserrat.variable,
  rajdhani.variable,
  inter.variable,
  poppins.variable,
  sourceSans.variable,
  workSans.variable,
  nunitoSans.variable,
].join(' ');
