import Link from 'next/link';

import { BUYER_GONE_MESSAGE, BUYERS_LIST_HREF } from '@/features/buyer-dossier/services/buyer-gone';

// Mission 120 B (reprise R5) — la fiche n'existe plus : le dire, et ramener à la liste.
export function BuyerGoneNotice() {
  return (
    <p role="alert" className="text-sm text-zinc-700" data-testid="buyer-gone">
      {BUYER_GONE_MESSAGE}{' '}
      <Link href={BUYERS_LIST_HREF} className="font-semibold text-brand-deep underline">
        Revenir à la liste des acquéreurs
      </Link>
    </p>
  );
}
