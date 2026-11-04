import type { colleagueExclusivityCard } from '@/features/buyer-prospecting/services/buyer-letter';

// Mission 120 B — la carte « Votre exclusivité » du dossier au confrère, sans importer la requête
// serveur dans un composant du navigateur.
export type ExclusivityCard = ReturnType<typeof colleagueExclusivityCard>;
