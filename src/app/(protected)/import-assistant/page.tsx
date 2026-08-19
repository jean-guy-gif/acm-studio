import { ImportBookmarklet } from '@/features/comparable-import/components/import-bookmarklet';
import { ImportAssistantPanel } from '@/features/comparable-import/components/import-assistant-panel';
import { kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { getProjects } from '@/features/projects/queries/get-projects';
import { statusLabel } from '@/features/projects/status-label';

// Fenêtre d'atterrissage du raccourci « Envoyer vers ACM Studio ». Elle vit
// dans le shell protégé : la session du conseiller est donc exigée comme pour
// n'importe quel écran, et la liste des dossiers reste cloisonnée à son agence
// (getProjects est déjà filtré par agence).
export default async function ImportAssistantPage() {
  const projects = await getProjects();

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Import assisté</span>
        <h1 className={pageTitle}>Annonce envoyée depuis votre navigateur</h1>
        <p className={pageSubtitle}>
          La page de l’annonce est analysée telle que vous la voyez : prix, prix au m², surface,
          pièces, quartier, ville, caractéristiques et photos sont repris automatiquement.
        </p>
      </div>

      <ImportAssistantPanel
        projects={projects.map((project) => ({
          id: project.id,
          sellerName: project.seller_name,
          statusLabel: statusLabel(project.status),
        }))}
      />

      <ImportBookmarklet />
    </div>
  );
}
