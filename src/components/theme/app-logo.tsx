'use client';

import { Logo } from '@/components/brand/logo';
import { useAppStage } from '@/components/theme/app-stage';

// Logo officiel accordé au thème du shell applicatif : wordmark bleu sur fond
// clair, wordmark blanc sur fond sombre (aucun redessin — voir brand/logo).
export function AppLogo({
  priority = false,
  className = 'h-8',
  lightUrl = null,
  darkUrl = null,
  fallbackName = null,
}: {
  priority?: boolean;
  className?: string;
  lightUrl?: string | null;
  darkUrl?: string | null;
  fallbackName?: string | null;
}) {
  const { theme } = useAppStage();
  return (
    <Logo
      onDark={theme === 'dark'}
      priority={priority}
      className={className}
      lightSrc={lightUrl}
      darkSrc={darkUrl}
      fallbackName={fallbackName}
    />
  );
}
