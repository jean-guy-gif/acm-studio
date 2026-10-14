import { lastExtensionPing } from '@/features/browser-extension/client';
import type { ExtensionIssue } from '@/features/browser-extension/extension-required-notice';

// Mission 105 — l'extension n'a pas répondu : est-elle absente, ou installée sans accès à ACM
// Studio ? La dernière détection le dit (l'appel direct à l'extension a répondu ou non).
export function missingExtensionIssue(): ExtensionIssue {
  return lastExtensionPing()?.noSiteAccess ? 'no_site_access' : 'missing';
}
