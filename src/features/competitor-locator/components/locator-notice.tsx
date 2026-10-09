import {
  LOCATOR_SHARING_OFF_MESSAGE,
  LOCATOR_UNAVAILABLE_MESSAGE,
  type LocatorAvailability,
} from '@/features/competitor-locator/types';

// Mission 75 — sans Localisateur, ou partage éteint : une ligne discrète, et rien d'autre ne
// change. Rien tant que le Localisateur n'a pas répondu, rien quand il est prêt.
export function LocatorNotice({ availability }: { availability: LocatorAvailability | null }) {
  if (availability === null || availability === 'ready') {
    return null;
  }
  return (
    <p className="text-xs text-zinc-400 stage:text-white/40">
      {availability === 'sharing_off' ? LOCATOR_SHARING_OFF_MESSAGE : LOCATOR_UNAVAILABLE_MESSAGE}.
    </p>
  );
}
