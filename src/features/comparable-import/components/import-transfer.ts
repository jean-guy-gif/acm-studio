// Passe-plat entre l'assistant d'import et le formulaire d'ajout d'un bien
// concurrent : les deux écrans vivent dans le MÊME onglet (l'assistant navigue
// vers le formulaire), donc le stockage de session suffit et rien ne transite
// par une adresse ni par le serveur.
//
// Le code de la page pèse souvent 1 à 3 Mo : on refuse proprement au-delà de la
// limite acceptée par l'analyse serveur plutôt que de tronquer en silence.

export const ASSISTANT_FLAG = 'assistant';
const HTML_KEY = 'acm-import-html';
const URL_KEY = 'acm-import-url';

export const MAX_TRANSFER_BYTES = 4 * 1024 * 1024;

export function transferSize(html: string): number {
  // Approximation suffisante côté navigateur (2 octets par unité de code UTF-16
  // au pire) — la mesure exacte est refaite côté serveur avant analyse.
  return new Blob([html]).size;
}

// Retourne false si le navigateur refuse (quota dépassé) : l'appelant propose
// alors le collage manuel plutôt que d'échouer sans explication.
export function storeTransfer(url: string, html: string): boolean {
  try {
    window.sessionStorage.setItem(URL_KEY, url);
    window.sessionStorage.setItem(HTML_KEY, html);
    return true;
  } catch {
    clearTransfer();
    return false;
  }
}

export function takeTransfer(): { url: string; html: string } | null {
  try {
    const url = window.sessionStorage.getItem(URL_KEY);
    const html = window.sessionStorage.getItem(HTML_KEY);
    clearTransfer();
    if (!url || !html) {
      return null;
    }
    return { url, html };
  } catch {
    return null;
  }
}

export function clearTransfer(): void {
  try {
    window.sessionStorage.removeItem(URL_KEY);
    window.sessionStorage.removeItem(HTML_KEY);
  } catch {
    // Stockage indisponible (navigation privée stricte) : rien à nettoyer.
  }
}
