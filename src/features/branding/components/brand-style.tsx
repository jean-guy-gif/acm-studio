import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { brandingCssVariables } from '@/features/branding/services/branding-css';

// Mission 55 — injecte la charte VALIDÉE de l'agence sur TOUT l'outil : un <style> qui
// surcharge les jetons `--color-brand*` (et `--color-on-brand`) après la feuille Tailwind,
// donc elles gagnent. Rendu APRÈS le socle : composant serveur async placé en tête de body.
//
// Sécurité : brandingCssVariables ne laisse passer que des #RRGGBB (isValidHex) — il n'y a
// donc aucun caractère capable de casser la feuille de style, malgré dangerouslySetInnerHTML.
// Rien à afficher tant que la charte n'est pas validée, ou vide → défauts produit.
export async function BrandStyle() {
  const branding = await getAgencyBranding();
  if (!branding?.validatedAt) {
    return null;
  }
  const declarations = brandingCssVariables(branding);
  if (declarations === '') {
    return null;
  }
  return <style dangerouslySetInnerHTML={{ __html: `:root{${declarations}}` }} />;
}
