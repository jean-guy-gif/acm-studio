import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';

// Mission 139 — la clé d'un bien écarté pour un acquéreur, celle de la boucle (M134) : une annonce
// par son identité publiée (`listing:<portail>:<numéro>`, M47), un dossier de l'agence par son id
// (`project:<id>`), un concurrent sans annonce reconnue par son id (`competitor:<id>`). Un même bien
// a une seule clé, d'où qu'on l'écarte (biens idéaux, « Nouveau cette semaine », boucle). Pur.
export type DismissTarget =
  | { source: 'listing'; url: string }
  | { source: 'project'; projectId: string }
  | { source: 'competitor'; competitorId: string; listingUrl: string | null };

export function dismissalKey(target: DismissTarget): string {
  if (target.source === 'project') return `project:${target.projectId}`;
  const url = target.source === 'listing' ? target.url : target.listingUrl;
  const identity = listingIdentityKey(url);
  if (identity) return `listing:${identity}`;
  return target.source === 'listing'
    ? `listing:${target.url.trim()}`
    : `competitor:${target.competitorId}`;
}
