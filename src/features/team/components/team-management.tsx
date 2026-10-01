'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  btnPrimary,
  card,
  errorText,
  fieldLabel,
  inputBase,
  metaLabel,
  okText,
} from '@/components/ui/styles';
import { cancelInvitation } from '@/features/team/actions/cancel-invitation';
import { inviteMember } from '@/features/team/actions/invite-member';
import { removeMember } from '@/features/team/actions/remove-member';
import { resendInvitation } from '@/features/team/actions/resend-invitation';
import { setMemberRole } from '@/features/team/actions/set-member-role';
import type { Team } from '@/features/team/queries/get-team';
import { roleLabel } from '@/features/team/services/role';

type Feedback = { ok: boolean; message: string } | null;

const badge = 'inline-flex rounded-md px-2 py-0.5 text-xs font-medium';
const linkBtn = 'text-sm font-medium text-brand-deep hover:underline disabled:opacity-40';
const dangerBtn = 'text-sm font-medium text-red-600 hover:underline disabled:opacity-40';

export function TeamManagement({ team }: { team: Team }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'advisor' | 'manager'>('advisor');
  const [invite, setInvite] = useState<Feedback>(null);
  const [action, setAction] = useState<Feedback>(null);

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okMessage: string) {
    setAction(null);
    startTransition(async () => {
      const result = await fn();
      setAction(
        result.ok ? { ok: true, message: okMessage } : { ok: false, message: result.error },
      );
      router.refresh();
    });
  }

  function submitInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setInvite(null);
    startTransition(async () => {
      const result = await inviteMember(formData);
      if (result.ok) {
        setInvite({ ok: true, message: 'Invitation envoyée.' });
        setEmail('');
      } else {
        setInvite({ ok: false, message: result.error });
      }
      router.refresh();
    });
  }

  const activeManagers = team.members.filter((m) => m.removedAt == null && m.role === 'manager');
  const lastManagerId = activeManagers.length === 1 ? activeManagers[0].id : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Inviter */}
      <section className="flex flex-col gap-3">
        <span className={metaLabel}>Inviter un conseiller</span>
        <form onSubmit={submitInvite} className={`${card} flex flex-col gap-4 p-5`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Adresse e-mail</span>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="conseiller@agence.fr"
                className={inputBase}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Rôle</span>
              <select
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value as 'advisor' | 'manager')}
                className={inputBase}
              >
                <option value="advisor">Conseiller</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            <button type="submit" className={btnPrimary} disabled={pending}>
              {pending ? 'Envoi…' : 'Inviter'}
            </button>
          </div>
          {invite ? <span className={invite.ok ? okText : errorText}>{invite.message}</span> : null}
        </form>
      </section>

      {/* Invitations en attente */}
      {team.invitations.length > 0 ? (
        <section className="flex flex-col gap-3">
          <span className={metaLabel}>Invitations en attente</span>
          <ul className="flex flex-col gap-2">
            {team.invitations.map((inv) => (
              <li
                key={inv.id}
                className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{inv.email}</span>
                    <span className={`${badge} bg-brand-soft text-brand-deep`}>
                      {roleLabel(inv.role)}
                    </span>
                    {inv.sentAt == null ? (
                      <span className={`${badge} bg-red-100 text-red-700`}>Non envoyée</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {inv.sentAt == null
                      ? 'L’e-mail n’est pas parti — renvoyez-la.'
                      : `Invitée le ${new Date(inv.createdAt).toLocaleDateString('fr-FR')}`}
                  </span>
                </span>
                <span className="flex items-center gap-4">
                  <button
                    type="button"
                    className={linkBtn}
                    disabled={pending}
                    onClick={() => run(() => resendInvitation(inv.id), 'Invitation renvoyée.')}
                  >
                    Renvoyer
                  </button>
                  <button
                    type="button"
                    className={dangerBtn}
                    disabled={pending}
                    onClick={() => run(() => cancelInvitation(inv.id), 'Invitation annulée.')}
                  >
                    Annuler
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Membres */}
      <section className="flex flex-col gap-3">
        <span className={metaLabel}>Membres de l’agence</span>
        {action ? <span className={action.ok ? okText : errorText}>{action.message}</span> : null}
        <ul className="flex flex-col gap-2">
          {team.members.map((member) => {
            const isRemoved = member.removedAt != null;
            const isManager = member.role === 'manager';
            const isLastManager = member.id === lastManagerId;
            return (
              <li
                key={member.id}
                className={`${card} flex flex-wrap items-center justify-between gap-3 p-4 ${
                  isRemoved ? 'opacity-60' : ''
                }`}
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{member.name}</span>
                    <span className={`${badge} bg-brand-soft text-brand-deep`}>
                      {roleLabel(member.role)}
                    </span>
                    {member.isSelf ? <span className="text-xs text-zinc-400">(vous)</span> : null}
                    {isRemoved ? (
                      <span className={`${badge} bg-zinc-200 text-zinc-600`}>Retiré</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-zinc-500">{member.email}</span>
                </span>
                {!isRemoved ? (
                  <span className="flex items-center gap-4">
                    {isManager ? (
                      <button
                        type="button"
                        className={linkBtn}
                        disabled={pending || isLastManager}
                        title={
                          isLastManager
                            ? 'Le dernier manager ne peut pas être rétrogradé.'
                            : undefined
                        }
                        onClick={() =>
                          run(() => setMemberRole(member.id, 'advisor'), 'Rôle mis à jour.')
                        }
                      >
                        Retirer le rôle manager
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={linkBtn}
                        disabled={pending}
                        onClick={() =>
                          run(() => setMemberRole(member.id, 'manager'), 'Rôle mis à jour.')
                        }
                      >
                        Nommer manager
                      </button>
                    )}
                    <button
                      type="button"
                      className={dangerBtn}
                      disabled={pending || isLastManager}
                      title={
                        isLastManager ? 'Le dernier manager ne peut pas être retiré.' : undefined
                      }
                      onClick={() => run(() => removeMember(member.id), 'Membre retiré.')}
                    >
                      {member.isSelf ? 'Me retirer' : 'Retirer'}
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
