import { redirect } from 'next/navigation';

// Mission 91 — une seule tournée imprimable : celle de la page Prospection, filtrée sur ce
// bien vendeur. Le filtre ne retient qu'un dossier de l'agence ouvert à la prospection ;
// tout autre identifiant retombe sur la tournée entière.
export default async function LegacyProjectTourPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/prospection/tournee?bien=${encodeURIComponent(projectId)}`);
}
