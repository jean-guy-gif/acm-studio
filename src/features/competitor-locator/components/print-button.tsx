'use client';

import { btnPrimary } from '@/components/ui/styles';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${btnPrimary} print:hidden`}>
      Imprimer
    </button>
  );
}
