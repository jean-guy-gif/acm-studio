import { metaLabel } from '@/components/ui/styles';
import {
  nextFollowUpLabel,
  type FollowUpContact,
} from '@/features/meeting-conclusion/services/follow-up-contacts';

const day = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

// Mission 96 — l'historique des relances d'un dossier : date, note, auteur. Écran conseiller.
export function FollowUpHistory({ contacts }: { contacts: FollowUpContact[] }) {
  if (contacts.length === 0) {
    return null;
  }
  return (
    <section data-testid="follow-up-history" className="flex flex-col gap-1.5">
      <h3 className={metaLabel}>Historique des relances</h3>
      <ul className="flex flex-col gap-1">
        {contacts.map((contact) => (
          <li key={contact.id} className="text-sm text-zinc-700 stage:text-white/80">
            <span className="font-semibold">{day(contact.contactedAt)}</span>
            {contact.note ? ` — ${contact.note}` : ''}
            {contact.nextFollowUpOn ? ` · ${nextFollowUpLabel(contact.nextFollowUpOn)}` : ''}
            {contact.author ? (
              <span className="text-zinc-500 stage:text-white/50"> · {contact.author}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
