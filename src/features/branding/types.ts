// Mission 55 — la charte résolue d'une agence. Les couleurs sont des #RRGGBB (ou null si
// non définies → défauts produit). Les logos sont des URL publiques prêtes à afficher.
export type AgencyBranding = {
  brand: string | null;
  brandDeep: string | null;
  brandSoft: string | null;
  brandDarker: string | null;
  brandDarkest: string | null;
  onBrandText: string | null;
  textContrastAdjusted: boolean;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  // Mission 57 — la clé de la police retenue (parmi la liste embarquée), ou null → typo
  // produit. Et l'adresse du site, conservée mais jamais ouverte (option B).
  fontFamily: string | null;
  siteUrl: string | null;
  validatedAt: string | null;
};
