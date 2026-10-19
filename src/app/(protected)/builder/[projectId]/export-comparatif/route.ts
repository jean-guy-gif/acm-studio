import { getComparables } from '@/features/comparables/queries/get-comparables';
import { buildComparisonCsv } from '@/features/expert-mode/services/comparison-csv';
import { getProject } from '@/features/projects/queries/get-project';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';

// MISSION 110 — « Exporter le comparatif » : le tableur du conseiller, en mode expert seulement.
// Lu avec les droits de l'appelant (règles de l'agence) ; jamais mis en cache, jamais indexé.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId } = await params;
  const profile = await getProfile();
  if (!profile || profile.removed_at || !profile.expert_mode) {
    return new Response('Introuvable', { status: 404 });
  }
  const project = await getProject(projectId);
  if (!project || project.agency_id !== profile.agency_id) {
    return new Response('Introuvable', { status: 404 });
  }
  const [property, comparables] = await Promise.all([
    getSubjectProperty(projectId),
    getComparables(projectId),
  ]);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(buildComparisonCsv(property, comparables), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="comparatif-${date}.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
