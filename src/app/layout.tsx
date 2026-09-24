import type { Metadata } from 'next';

import { BrandStyle } from '@/features/branding/components/brand-style';
import { embeddedFontClassNames } from '@/features/branding/fonts/embedded-fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'ACM Studio',
  description: 'ACM Studio — préparation du rendez-vous vendeur.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Mission 57 — toutes les polices embarquées disponibles en var(--font-*) ; la charte de
  // l'agence (BrandStyle) désigne laquelle est active. Défaut : Montserrat + Rajdhani.
  return (
    <html lang="fr" className={`${embeddedFontClassNames} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <BrandStyle />
        {children}
      </body>
    </html>
  );
}
