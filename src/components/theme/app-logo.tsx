'use client';

import { Logo } from '@/components/brand/logo';
import { useAppStage } from '@/components/theme/app-stage';

// Logo officiel accordé au thème du shell applicatif : wordmark bleu sur fond
// clair, wordmark blanc sur fond sombre (aucun redessin — voir brand/logo).
export function AppLogo({
  priority = false,
  className = 'h-8',
}: {
  priority?: boolean;
  className?: string;
}) {
  const { theme } = useAppStage();
  return <Logo onDark={theme === 'dark'} priority={priority} className={className} />;
}
