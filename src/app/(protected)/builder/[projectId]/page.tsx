import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  backLink,
  badgeNeutral,
  card,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { getProject } from '@/features/projects/queries/get-project';
import { statusLabel } from '@/features/projects/status-label';

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

// Étapes de préparation du dossier — purement navigationnel : aucun état
// d'avancement inventé (pas de faux indicateurs de complétion).
const STEPS = [
  {
    href: (id: string) => `/builder/${id}/property`,
    title: 'Bien vendeur',
    description: 'Caractéristiques, diagnostics et copropriété du bien à vendre.',
  },
  {
    href: (id: string) => `/builder/${id}/comparables`,
    title: 'Biens concurrents',
    description: 'Importer depuis les portails, rechercher, accepter ou écarter.',
  },
  {
    href: (id: string) => `/builder/${id}/comparables/analysis`,
    title: 'Analyse comparative',
    description: 'Le bien face à ses concurrents, critère par critère.',
  },
  {
    href: (id: string) => `/builder/${id}/comparables/positioning`,
    title: 'Positionnement prix',
    description: 'Fourchette issue du marché, décision validée par le conseiller.',
  },
  {
    href: (id: string) => `/builder/${id}/presentation`,
    title: 'Présentation vendeur',
    description: 'Vérifier la matière préparée avant le rendez-vous.',
  },
];

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/builder" className={backLink}>
          ← Retour aux dossiers
        </Link>
        <span className={kickerLabel}>Dossier vendeur</span>
        <h1 className={pageTitle}>{project.seller_name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={badgeNeutral}>{statusLabel(project.status)}</span>
          <span className={pageSubtitle}>
            {project.seller_email || 'E-mail non renseigné'} ·{' '}
            {project.seller_phone || 'Téléphone non renseigné'} · Créé le{' '}
            {new Date(project.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <Link
            key={step.title}
            href={step.href(projectId)}
            className={`${card} group flex items-start gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10 stage:hover:border-brand stage:hover:shadow-none`}
          >
            <span className="font-title text-3xl leading-none font-bold text-brand/35 transition-colors group-hover:text-brand stage:text-brand/40">
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
                {step.title}
              </span>
              <span className="text-sm text-zinc-500 stage:text-white/55">{step.description}</span>
            </span>
          </Link>
        ))}

        {/* L'accès à la scène : le rendez-vous lui-même. */}
        <Link
          href={`/live/${projectId}`}
          className="group flex items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-deep via-[#013a58] to-[#01283b] p-5 text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/25"
        >
          <span className="font-title text-3xl leading-none font-bold text-brand transition-transform group-hover:translate-x-0.5">
            →
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-title text-lg leading-snug font-semibold">Lancer le Live</span>
            <span className="text-sm text-white/65">
              Le rendez-vous vendeur en mode présentation, plein écran.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
