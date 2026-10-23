import { DEMO_DELAY_MS } from '@/features/demo/constants';

// Mission 114 — le court délai fixe des réponses simulées (A2.5). Une seule porte, pour que les
// tests la ferment (`vi.mock`) sans attendre.
export async function demoDelay(ms: number = DEMO_DELAY_MS): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
