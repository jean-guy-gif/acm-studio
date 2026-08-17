import type { Metadata } from 'next';
import { Montserrat, Rajdhani } from 'next/font/google';

import './globals.css';

// Montserrat = corps / interface ; Rajdhani = titres et éléments distinctifs
// (charte Start Academy).
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

export const metadata: Metadata = {
  title: 'ACM Studio',
  description: 'ACM Studio — préparation du rendez-vous vendeur.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${rajdhani.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
