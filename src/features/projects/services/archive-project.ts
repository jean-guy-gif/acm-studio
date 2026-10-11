// Mission 93 — « Supprimer » un dossier l'ARCHIVE : statut `archived`, invisible partout
// (Préparation, Live, Suivi, Prospection), jamais effacé. C'est la suppression douce de
// CLAUDE.md : une erreur de clic se rattrape, et rien ne dépend d'une cascade.
//
// Rien d'autre n'est touché : ni le bien, ni les concurrents, ni les réponses du Live, ni les
// photos de prospection. L'effacement réel (demande RGPD) suit `docs/PROCEDURE_EFFACEMENT.md`.

export const ARCHIVED_STATUS = 'archived';

type ArchiveFilter = {
  eq(column: string, value: string): ArchiveFilter;
  neq(column: string, value: string): PromiseLike<{ error: unknown }>;
};

// Le minimum du client Supabase dont l'archivage a besoin : une mise à jour, jamais `delete`.
export type ArchiveClient = {
  from(table: 'projects'): {
    update(values: { status: string; updated_at: string }): ArchiveFilter;
  };
};

// Cadré sur l'agence : le dossier d'une autre agence n'est jamais touché.
export async function archiveProject(
  client: ArchiveClient,
  agencyId: string,
  projectId: string,
  now: Date = new Date(),
): Promise<{ ok: boolean }> {
  const { error } = await client
    .from('projects')
    .update({ status: ARCHIVED_STATUS, updated_at: now.toISOString() })
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .neq('status', ARCHIVED_STATUS);
  return { ok: !error };
}
