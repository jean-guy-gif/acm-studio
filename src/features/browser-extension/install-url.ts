// Mission 74 — l'adresse d'installation de l'extension vient de l'environnement, jamais du code :
// l'extension est déposée « non répertoriée » sur le Chrome Web Store (mission 73), son lien se
// transmet. Variable absente ou invalide : pas de bouton, le message renvoie vers l'agence.

export const EXTENSION_INSTALL_LABEL = 'Installer l’extension';
export const EXTENSION_INSTALL_FALLBACK =
  'Installez l’extension ACM Studio — demandez le lien à votre agence';

export function parseExtensionInstallUrl(raw: string | undefined): string | null {
  const value = raw?.trim() ?? '';
  if (value === '') {
    return null;
  }
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

// `process.env.NEXT_PUBLIC_…` doit être écrit en toutes lettres pour être inscrit dans le
// paquet du navigateur.
export function extensionInstallUrl(): string | null {
  return parseExtensionInstallUrl(process.env.NEXT_PUBLIC_EXTENSION_INSTALL_URL);
}
