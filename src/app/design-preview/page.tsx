import { notFound } from 'next/navigation';

import {
  DEMO_AT,
  demoAnsweredResponses,
  demoAnsweredSummary,
  demoComparables,
  demoProject,
  demoProperty,
  demoSavedPositioning,
} from '@/app/design-preview/demo-data';
import {
  LiveComparativeShell,
  type LiveStageTheme,
} from '@/features/live-seller/components/live-comparative-shell';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';

// ---------------------------------------------------------------------------
// Aperçu design du Live vendeur — OUTIL DE DÉVELOPPEMENT UNIQUEMENT.
// Données 100 % fictives et clairement identifiées comme telles (« Démo ») :
// aucune donnée métier réelle, aucune écriture, aucune action serveur aboutie.
// Inaccessible en production sauf ACM_DESIGN_PREVIEW=1 (revue design).
//
//   /design-preview?page=2&state=answered&theme=dark
//     page  : index de la fiche (0 = intro … 12 = conclusion pour 3 concurrents)
//     state : fresh (aucune réponse) | answered (réponses enregistrées)
//     theme : dark | light
//
// L'aperçu du shell applicatif (hors Live) vit sous /design-preview/app.
// ---------------------------------------------------------------------------

// `fiche` est le paramètre écrit par la présentation elle-même (reprise après
// rechargement, comme en Live réel) ; `page` reste accepté pour les liens
// d'aperçu déjà partagés.
type PreviewSearchParams = { page?: string; fiche?: string; state?: string; theme?: string };

export default async function DesignPreviewPage({
  searchParams,
}: {
  searchParams: Promise<PreviewSearchParams>;
}) {
  // Jamais accessible en production réelle ; ACM_DESIGN_PREVIEW=1 réservé aux
  // revues design internes.
  if (process.env.NODE_ENV === 'production' && process.env.ACM_DESIGN_PREVIEW !== '1') {
    notFound();
  }

  const { page, fiche, state, theme } = await searchParams;
  const answered = state !== 'fresh';
  const initialIndex = Number.parseInt(fiche ?? page ?? '0', 10) || 0;
  const initialStage: LiveStageTheme = theme === 'light' ? 'light' : 'dark';

  const presentation = buildSellerPresentation({
    project: demoProject,
    property: demoProperty,
    diagnostics: null,
    condominium: null,
    comparables: demoComparables,
    savedPositioning: demoSavedPositioning,
    sellerResponses: answered ? demoAnsweredResponses : [],
    sellerSummary: answered ? demoAnsweredSummary : null,
    generatedAt: DEMO_AT,
  });

  return (
    <LiveComparativeShell
      projectId="design-preview"
      presentation={presentation}
      initialIndex={initialIndex}
      initialStage={initialStage}
    />
  );
}
