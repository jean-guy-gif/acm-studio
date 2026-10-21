// Mission 112 — la bande d'« Analyse des prix » est calculée par le serveur sur les concurrents
// révélés, sans ceux jugés « Non » (M94, M108). Un « Non » dit pendant la séance, une fois la bande
// livrée, la rend fausse : l'écran l'oublie et la redemande, sans rechargement.
export function invalidatesAnalysis(formData: FormData): boolean {
  return String(formData.get('seller_serious_competitor') ?? '') === 'no';
}
