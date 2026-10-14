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

// Mission 105 — l'extension est installée mais Chrome ne lui laisse pas lire ACM Studio.
export const EXTENSION_NO_SITE_ACCESS_TITLE = 'Extension installée, mais sans accès à ACM Studio';
export const EXTENSION_NO_SITE_ACCESS_STEPS =
  'Chrome → Extensions → ACM Studio → Détails → Accès aux sites → Sur tous les sites';
export const EXTENSION_ALREADY_INSTALLED_HINT = 'Déjà installée ? Vérifiez l’accès aux sites';
