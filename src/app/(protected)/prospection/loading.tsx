import { PageSkeleton } from '@/components/ui/page-skeleton';

// Mission 128 — l'attente de cet espace, tout de suite après le clic.
export default function Loading() {
  return <PageSkeleton kicker="Concurrents à démarcher" title="Prospection" layout="columns" />;
}
