'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import {
  btnPrimary,
  btnSecondary,
  errorText,
  inputBase,
  link,
  okText,
} from '@/components/ui/styles';
import { recordFollowUpContact } from '@/features/meeting-conclusion/actions/record-follow-up-contact';
import { saveSellerContact } from '@/features/meeting-conclusion/actions/save-seller-contact';
import {
  defaultNextFollowUpOn,
  NEXT_FOLLOW_UP_MAX_DAYS,
  parisDay,
} from '@/features/meeting-conclusion/services/follow-up-contacts';
import {
  followUpShareHrefs,
  telHref,
} from '@/features/meeting-conclusion/services/follow-up-share';
import { dayLabel } from '@/features/meeting-conclusion/services/suivi-step-labels';
import type { FollowUpMotive } from '@/features/meeting-conclusion/types';

const stepTitle =
  'font-title text-sm font-bold text-zinc-900 stage:text-white [&>span]:text-brand-deep';

// Mission 130 — la relance sur place, dans la carte du vendeur (jamais une fenêtre : M92, M93) :
// 1 · le message prêt avec ses mots (M96), que le conseiller corrige et envoie lui-même (Copier,
// SMS, WhatsApp, E-mail : l'outil n'envoie rien) ; 2 · après l'appel ou le message, « J'ai
// relancé » consigne la relance avec la prochaine date (M105). Un appel est une relance : rien
// n'oblige à toucher Copier.
export function FollowUpPanel({
  projectId,
  sellerName,
  phone: initialPhone,
  email: initialEmail,
  motive,
  proposed,
  onClose,
  onDone,
}: {
  projectId: string;
  sellerName: string;
  phone: string | null;
  email: string | null;
  motive: FollowUpMotive | null;
  proposed: string | null;
  onClose: () => void;
  onDone: (nextOn: string) => void;
}) {
  const router = useRouter();
  const [text, setText] = useState(proposed ?? '');
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null);
  const [today] = useState(() => parisDay(new Date()));
  const [lastDay] = useState(() =>
    parisDay(new Date(Date.now() + NEXT_FOLLOW_UP_MAX_DAYS * 86_400_000)),
  );
  const [proposedNext] = useState(() => defaultNextFollowUpOn(motive, new Date()));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  // Mission 130 — sans téléphone ou sans e-mail, on les ajoute ici, sans quitter le Suivi.
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [contactPending, startContact] = useTransition();
  const [contactError, setContactError] = useState<string | null>(null);
  const hrefs = followUpShareHrefs(text, phone, email);

  useEffect(() => {
    messageRef.current?.focus();
  }, []);

  return (
    <section
      data-testid="follow-up-panel"
      aria-label={`Relancer ${sellerName}`}
      className="flex flex-col gap-4 border-t border-zinc-100 bg-zinc-50/60 p-4 stage:border-white/10 stage:bg-white/[0.03]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-title text-base font-bold text-zinc-900 stage:text-white">
          Relancer {sellerName}
        </h3>
        <span className="flex flex-wrap gap-x-3 text-sm">
          {phone ? (
            <a href={telHref(phone)} className={link}>
              {phone}
            </a>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className={link}>
              {email}
            </a>
          ) : null}
          {!phone && !email ? (
            <span className="text-zinc-500 stage:text-white/60">
              Ni téléphone ni e-mail dans le dossier vendeur.
            </span>
          ) : null}
        </span>
      </div>

      {!phone || !email ? (
        <form
          data-testid="seller-contact-form"
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            setContactError(null);
            startContact(async () => {
              const result = await saveSellerContact(projectId, formData);
              if (result.ok) {
                setPhone(result.phone);
                setEmail(result.email);
                router.refresh();
              } else {
                setContactError(result.error);
              }
            });
          }}
        >
          {!phone ? (
            <label className="flex flex-col gap-1 text-sm text-zinc-600 stage:text-white/70">
              Ajouter son téléphone
              <input
                type="tel"
                name="seller_phone"
                autoComplete="off"
                placeholder="06 12 34 56 78"
                className={`${inputBase} w-48`}
              />
            </label>
          ) : null}
          {!email ? (
            <label className="flex flex-col gap-1 text-sm text-zinc-600 stage:text-white/70">
              Ajouter son e-mail
              <input
                type="email"
                name="seller_email"
                autoComplete="off"
                placeholder="prenom.nom@example.com"
                className={`${inputBase} w-64 max-w-full`}
              />
            </label>
          ) : null}
          <button type="submit" className={btnSecondary} disabled={contactPending}>
            {contactPending ? 'J’enregistre…' : 'Enregistrer'}
          </button>
          {contactError ? (
            <span role="alert" className={`${errorText} w-full`}>
              {contactError}
            </span>
          ) : null}
        </form>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-2">
          <p className={stepTitle}>
            <span>1</span> · Votre message
          </p>
          {proposed ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-500 stage:text-white/60">
                  Modifiez-le si besoin. ACM ne l’envoie pas et ne le garde pas.
                </span>
                <textarea
                  ref={messageRef}
                  rows={8}
                  value={text}
                  data-testid="follow-up-message"
                  onChange={(event) => {
                    setText(event.target.value);
                    setCopied(null);
                  }}
                  className={inputBase}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(text);
                      setCopied('yes');
                    } catch {
                      setCopied('failed');
                    }
                  }}
                >
                  Copier
                </button>
                {hrefs.sms ? (
                  <a href={hrefs.sms} className={btnSecondary}>
                    SMS
                  </a>
                ) : (
                  <span className={`${btnSecondary} pointer-events-none opacity-40`}>SMS</span>
                )}
                {hrefs.whatsapp ? (
                  <a
                    href={hrefs.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className={btnSecondary}
                  >
                    WhatsApp
                  </a>
                ) : (
                  <span className={`${btnSecondary} pointer-events-none opacity-40`}>WhatsApp</span>
                )}
                <a href={hrefs.email} className={btnSecondary}>
                  E-mail
                </a>
                <button
                  type="button"
                  className={`${link} text-sm`}
                  onClick={() => {
                    setText(proposed);
                    setCopied(null);
                  }}
                >
                  Reprendre le texte proposé
                </button>
              </div>
              {!phone && email ? (
                <span className="text-xs text-zinc-500 stage:text-white/60">
                  Pas de numéro dans le dossier vendeur.
                </span>
              ) : null}
              {copied === 'yes' ? <span className={okText}>Message copié.</span> : null}
              {copied === 'failed' ? (
                <span className={errorText}>
                  La copie a échoué&nbsp;: sélectionnez le texte et copiez-le à la main.
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-sm text-zinc-500 stage:text-white/60">
              Appelez-le ou écrivez-lui, puis notez la relance.
            </span>
          )}
        </div>

        <form
          className="flex min-w-0 flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const nextOn = String(formData.get('next_follow_up_on') ?? '');
            setError(null);
            startTransition(async () => {
              const result = await recordFollowUpContact(projectId, formData);
              if (result.ok) {
                onDone(nextOn);
                router.refresh();
              } else {
                setError(result.error || 'La relance n’a pas été enregistrée. Réessayez.');
              }
            });
          }}
        >
          <p className={stepTitle}>
            <span>2</span> · Après votre appel ou votre message
          </p>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 stage:text-white/70">
            Note (facultative)
            <input
              type="text"
              name="note"
              maxLength={200}
              placeholder="Rappelle après les vacances"
              className={inputBase}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 stage:text-white/70">
            Prochaine relance le
            <input
              type="date"
              name="next_follow_up_on"
              required
              min={today}
              max={lastDay}
              defaultValue={proposedNext}
              className={`${inputBase} w-auto`}
            />
            <span className="text-xs text-zinc-500 stage:text-white/60">
              {motive === 'thinking_price'
                ? 'Proposée dans 1 mois\u00a0: il réfléchit au prix.'
                : 'Proposée dans 7 jours.'}
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={`${btnPrimary} w-full sm:w-auto`} disabled={pending}>
              {pending ? 'J’enregistre…' : 'J’ai relancé'}
            </button>
            <button type="button" className={`${link} text-sm`} onClick={onClose}>
              Annuler
            </button>
          </div>
          {error ? (
            <span role="alert" className={errorText}>
              {error}
            </span>
          ) : null}
        </form>
      </div>
    </section>
  );
}

export function relancedLabel(nextOn: string): string {
  return `Relancé aujourd’hui. Prochaine relance le ${dayLabel(nextOn)}.`;
}
