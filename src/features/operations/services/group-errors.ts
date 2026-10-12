// Mission 100 — la page « Erreurs » : les erreurs des 7 derniers jours, regroupées par message.

export const ERRORS_WINDOW_DAYS = 7;

export type AppErrorRow = {
  created_at: string;
  agency_id: string | null;
  source: string;
  page: string;
  message: string;
  version: string | null;
};

export type ErrorGroup = {
  message: string;
  count: number;
  // Les agences touchées, par nom ; `unknownAgency` : au moins une occurrence sans agence
  // (visiteur non connecté, ou agence supprimée depuis).
  agencies: string[];
  unknownAgency: boolean;
  lastAt: string;
  // Où et sur quelle version l'erreur s'est produite la dernière fois.
  lastPage: string;
  lastVersion: string | null;
  sources: string[];
};

// La plus récente d'abord. Un identifiant d'agence sans nom connu compte comme inconnue.
export function groupErrors(rows: AppErrorRow[], agencyNames: Map<string, string>): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup & { agencyIds: Set<string> }>();
  for (const row of rows) {
    let group = groups.get(row.message);
    if (!group) {
      group = {
        message: row.message,
        count: 0,
        agencies: [],
        unknownAgency: false,
        lastAt: row.created_at,
        lastPage: row.page,
        lastVersion: row.version,
        sources: [],
        agencyIds: new Set(),
      };
      groups.set(row.message, group);
    }
    group.count += 1;
    if (row.agency_id != null && agencyNames.has(row.agency_id)) group.agencyIds.add(row.agency_id);
    else group.unknownAgency = true;
    if (!group.sources.includes(row.source)) group.sources.push(row.source);
    if (row.created_at > group.lastAt) {
      group.lastAt = row.created_at;
      group.lastPage = row.page;
      group.lastVersion = row.version;
    }
  }
  return [...groups.values()]
    .map(({ agencyIds, ...group }) => ({
      ...group,
      agencies: [...agencyIds]
        .map((id) => agencyNames.get(id)!)
        .sort((a, b) => a.localeCompare(b, 'fr')),
      sources: [...group.sources].sort(),
    }))
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0));
}

// La pastille du menu : « 1 erreur depuis hier », « 12 erreurs depuis hier ».
export function errorsBadgeLabel(count: number): string {
  return `${count} erreur${count > 1 ? 's' : ''} depuis hier`;
}

const SOURCE_LABELS: Record<string, string> = {
  server: 'Serveur',
  browser: 'Navigateur',
  live: 'Live',
};

export function errorSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
