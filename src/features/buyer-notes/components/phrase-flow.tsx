'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  alertError,
  btnDanger,
  chipGreen,
  chipNeutral,
  chipOrange,
  socleBigStep,
  socleBtnFilledBig,
  socleBtnOutline,
  socleBtnQuiet,
  socleCardBordered,
  socleStepLink,
} from '@/components/ui/styles';
import { readBuyerNotes } from '@/features/buyer-notes/actions/read-notes';
import {
  cancelNotesReading,
  saveBuyerFromNotes,
} from '@/features/buyer-notes/actions/save-from-notes';
import { prepareFiles, type PreparedNotes } from '@/features/buyer-notes/client/prepare-notes';
import { useLeaveConfirm } from '@/features/buyer-notes/client/use-leave-confirm';
import { NOTES_AI_WARNING } from '@/features/buyer-notes/components/notes-warning';
import { NOTE_STARS_MAX } from '@/features/buyer-notes/note-stars';
import {
  NOTE_HEIC_MESSAGE,
  NOTE_READING_MESSAGES,
} from '@/features/buyer-notes/services/note-messages';
import {
  draftForm,
  draftFromProposal,
  draftMissing,
  editDraft,
  phraseChips,
  type ChipTone,
  type PhraseChip,
  type PhraseDraft,
  type PhraseEdit,
} from '@/features/buyer-notes/services/phrase-chips';
import type { NoteProposal } from '@/features/buyer-notes/types';
import type { BuyerPropertyType } from '@/features/buyers/types';

// La refonte, lot D (maquette REFONTE-2) — « Nouvel acquéreur par une phrase » : une phrase écrite
// ou dictée (ou la photo de ses notes), puis « Ce que j'ai compris » en pastilles à corriger, et
// « Trouver ses biens ». C'est la lecture des notes de la M151 — la même action, les mêmes gardes,
// le même forfait, le même avertissement —, montrée autrement : rien n'est enregistré avant
// « Trouver ses biens », la proposition n'est gardée nulle part, la quitter le demande d'abord.

type Reading = {
  proposal: NoteProposal;
  usageId: string | null;
  // La phrase lue ; null : une photo ou un fichier.
  from: string | null;
};

const QUIT_TITLE = 'Quitter sans créer la fiche ?';
const QUIT_TEXT =
  'La proposition sera perdue : rien n’a été enregistré. Pour la retrouver, il faudra relancer la lecture de vos notes.';
const NOT_SAVED = 'La fiche n’a pas pu être enregistrée. Réessayez.';

const CHIP: Record<ChipTone, string> = {
  plain: chipNeutral,
  soft: chipGreen,
  must: chipOrange,
  // Ce qui manque pour créer la fiche : une question, en pointillé.
  missing: `${chipOrange} border-dashed`,
};

const microphone = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5 flex-none"
  >
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const camera = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5 flex-none"
  >
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

const quietWide = `${socleBtnQuiet} h-12 w-full px-3 text-brand-darker`;

// « Ce que j'ai compris » : les pastilles, et la correction de celle qu'on a touchée.
export function PhraseChips({
  chips,
  open,
  onOpen,
  onEdit,
  starsLeft,
}: {
  chips: PhraseChip[];
  open: string | null;
  onOpen: (id: string | null) => void;
  onEdit: (edit: PhraseEdit) => void;
  // Il reste de la place pour un indispensable (deux au plus).
  starsLeft: boolean;
}) {
  const current = chips.find((chip) => chip.id === open) ?? null;
  return (
    <section className="flex flex-col gap-2.5" data-testid="phrase-understood">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-extrabold text-brand-darker stage:text-white">
          Ce que j’ai compris
        </h2>
        <span className="text-[13px] text-[#5B6380] stage:text-white/60">
          Touchez pour corriger
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`${CHIP[chip.tone]} max-w-full text-left ${chip.id === open ? 'outline-2 outline-offset-2 outline-brand-deep' : ''}`}
            aria-expanded={chip.id === open}
            data-testid="phrase-chip"
            data-chip={chip.id}
            data-tone={chip.tone}
            onClick={() => onOpen(chip.id === open ? null : chip.id)}
          >
            <span className="truncate">{chip.label}</span>
          </button>
        ))}
      </div>
      {current ? (
        <ChipCorrection
          key={current.id}
          chip={current}
          starsLeft={starsLeft}
          onEdit={onEdit}
          onClose={() => onOpen(null)}
        />
      ) : null}
    </section>
  );
}

const TYPE_CHOICES: { label: string; value: BuyerPropertyType[] }[] = [
  { label: 'Appartement', value: ['apartment'] },
  { label: 'Maison', value: ['house'] },
  { label: 'Les deux', value: ['apartment', 'house'] },
];

const sameTypes = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((type) => b.includes(type));

// La correction d'une pastille : sa valeur à retaper, ou son choix, et la ligne des notes d'où
// elle vient (montrée ici, jamais gardée). « Retirer » l'ôte de la fiche proposée.
function ChipCorrection({
  chip,
  starsLeft,
  onEdit,
  onClose,
}: {
  chip: PhraseChip;
  starsLeft: boolean;
  onEdit: (edit: PhraseEdit) => void;
  onClose: () => void;
}) {
  const { editor } = chip;
  const [typed, setTyped] = useState(
    editor.kind === 'text'
      ? editor.value
      : editor.kind === 'number' && editor.value != null
        ? String(editor.value)
        : '',
  );
  const apply = (edit: PhraseEdit) => {
    onEdit(edit);
    onClose();
  };
  const submit = () => {
    if (editor.kind === 'text') apply({ type: 'text', field: editor.field, value: typed });
    if (editor.kind === 'number') {
      const digits = typed.replace(/[^\d]/g, '');
      apply({ type: 'number', field: editor.field, value: digits ? Number(digits) : null });
    }
  };
  const removable = !(editor.kind === 'text' && (editor.field === 'name' || !editor.value));
  return (
    <div
      className={`${socleCardBordered} flex flex-col gap-3 p-4`}
      data-testid="chip-correction"
      data-chip={chip.id}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-extrabold text-brand-darker stage:text-white">
          {chip.title}
        </h3>
        <button
          type="button"
          className="text-sm font-bold text-brand-deep stage:text-brand"
          onClick={onClose}
        >
          Fermer
        </button>
      </div>
      {chip.hint ? (
        <p className="text-sm text-[#7A2E08] stage:text-orange-300" data-testid="chip-hint">
          {chip.hint}
        </p>
      ) : null}
      {editor.kind === 'text' || editor.kind === 'number' ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input
            autoFocus
            aria-label={chip.title}
            inputMode={editor.kind === 'number' ? 'numeric' : undefined}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={
              editor.kind === 'text' && editor.field === 'cities'
                ? 'Vence, Saint-Paul-de-Vence'
                : ''
            }
            className="h-12 min-w-0 flex-1 rounded-[14px] border border-[#D5DAEA] bg-white px-3.5 text-base text-brand-darker focus-visible:outline-2 focus-visible:outline-brand-deep stage:border-white/15 stage:bg-white/10 stage:text-white"
            data-testid="chip-input"
          />
          {editor.kind === 'number' ? (
            <span className="flex-none text-sm text-[#5B6380] stage:text-white/60">
              {editor.unit}
            </span>
          ) : null}
          <button
            type="submit"
            className={`${socleBtnOutline} flex-none px-4`}
            data-testid="chip-ok"
          >
            OK
          </button>
        </form>
      ) : null}
      {editor.kind === 'types' ? (
        <div className="flex flex-wrap gap-2">
          {TYPE_CHOICES.map((choice) => (
            <button
              key={choice.label}
              type="button"
              className={sameTypes(choice.value, editor.value) ? chipGreen : chipNeutral}
              aria-pressed={sameTypes(choice.value, editor.value)}
              onClick={() => apply({ type: 'types', value: choice.value })}
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : null}
      {editor.kind === 'wish' ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={editor.starred ? chipNeutral : chipGreen}
              aria-pressed={!editor.starred}
              onClick={() => apply({ type: 'star', star: editor.field, on: false })}
            >
              Souhaité
            </button>
            <button
              type="button"
              className={editor.starred ? chipOrange : chipNeutral}
              aria-pressed={editor.starred}
              disabled={!editor.starred && !(editor.canStar && starsLeft)}
              onClick={() => apply({ type: 'star', star: editor.field, on: true })}
              data-testid="chip-star"
            >
              Indispensable
            </button>
          </div>
          {!editor.starred && !(editor.canStar && starsLeft) ? (
            <p className="text-sm text-[#5B6380] stage:text-white/60">
              {NOTE_STARS_MAX} indispensables au plus : retirez-en un d’abord.
            </p>
          ) : null}
        </div>
      ) : null}
      {editor.kind === 'cash' ? (
        <button
          type="button"
          className={`${socleBtnOutline} self-start`}
          onClick={() => apply({ type: 'cash' })}
        >
          Noter « Financement validé »
        </button>
      ) : null}
      {chip.source ? (
        <p
          className="text-[13px] italic text-[#5B6380] stage:text-white/60"
          data-testid="chip-source"
        >
          d’après : «&nbsp;{chip.source}&nbsp;»
        </p>
      ) : null}
      {removable ? (
        <button
          type="button"
          className="self-start text-sm font-bold text-[#7A2E08] underline stage:text-orange-300"
          data-testid="chip-remove"
          onClick={() => apply({ type: 'remove', id: chip.id })}
        >
          {editor.kind === 'star' ? 'Ne plus le dire indispensable' : 'Retirer'}
        </button>
      ) : null}
    </div>
  );
}

export function PhraseFlow({
  demo,
  children,
}: {
  // L'agence de démonstration (M114) : le texte de notes inventées, d'avance dans la phrase, et
  // leur photo ; la lecture y est simulée.
  demo: { text: string; photo: string } | null;
  // La saisie rapide (M132), derrière « Saisir à la main ».
  children: ReactNode;
}) {
  const router = useRouter();
  const [manual, setManual] = useState(false);
  const [text, setText] = useState(demo?.text ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [draft, setDraft] = useState<PhraseDraft | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const [saving, startSaving] = useTransition();
  const token = useRef(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Pendant la lecture aussi : partir laisserait une lecture comptée sans suite.
  const guard = useLeaveConfirm(busy || draft != null);

  async function read(notes: Extract<PreparedNotes, { ok: true }>, from: string | null) {
    const current = ++token.current;
    // Une lecture précédente, remplacée : dite « annulée » sur sa ligne.
    if (reading?.usageId) void cancelNotesReading(reading.usageId);
    setReading(null);
    setDraft(null);
    setOpen(null);
    setError(null);
    setBusy(true);
    const form = new FormData();
    form.set('kind', notes.kind);
    if (notes.text) form.set('text', notes.text);
    for (const image of notes.images) form.append('images', image);
    const result = await readBuyerNotes(form).catch(() => ({
      ok: false as const,
      cause: 'unavailable' as const,
      heic: false,
    }));
    // « Annuler » pendant la lecture : la réponse arrivée après ne s'affiche pas.
    if (current !== token.current) {
      if (result.ok && result.usageId) void cancelNotesReading(result.usageId);
      return;
    }
    setBusy(false);
    if (!result.ok) {
      setError(result.heic ? NOTE_HEIC_MESSAGE : NOTE_READING_MESSAGES[result.cause]);
      return;
    }
    setReading({ proposal: result.proposal, usageId: result.usageId, from });
    setDraft(draftFromProposal(result.proposal));
  }

  async function onPhrase() {
    const phrase = text.trim();
    if (!phrase) {
      setError('Écrivez d’abord ce qu’il cherche, ou prenez vos notes en photo.');
      area.current?.focus();
      return;
    }
    await read({ ok: true, kind: 'text', text: phrase, images: [] }, phrase);
  }

  async function onFiles(kind: 'photo' | 'file', list: FileList | null) {
    const files = [...(list ?? [])];
    if (files.length === 0) return;
    setError(null);
    const notes = await prepareFiles(kind, files);
    if (!notes.ok) {
      setError(
        notes.reason === 'heic'
          ? NOTE_HEIC_MESSAGE
          : notes.reason === 'too_many'
            ? NOTE_READING_MESSAGES.too_large
            : notes.reason === 'empty'
              ? NOTE_READING_MESSAGES.empty
              : NOTE_READING_MESSAGES.unsupported_file,
      );
      return;
    }
    await read(notes, null);
  }

  // La photo de la démo passe par la même préparation qu'une photo prise au téléphone.
  async function onDemoPhoto() {
    if (!demo) return;
    setError(null);
    try {
      const response = await fetch(demo.photo);
      if (!response.ok) throw new Error('photo');
      const blob = await response.blob();
      const file = new File([blob], 'notes.jpg', { type: blob.type || 'image/jpeg' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      await onFiles('photo', transfer.files);
    } catch {
      setError(NOTE_READING_MESSAGES.unsupported_file);
    }
  }

  function cancelReading() {
    token.current += 1;
    setBusy(false);
  }

  function leave(href: string) {
    // Une lecture en cours, quittée : sa réponse, si elle arrive, sera dite « annulée » (read()).
    token.current += 1;
    if (reading?.usageId) void cancelNotesReading(reading.usageId);
    setBusy(false);
    setReading(null);
    setDraft(null);
    router.push(href);
  }

  function save() {
    if (!draft || !reading) return;
    setError(null);
    const { fields, toVerify } = draftForm(draft);
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) {
      if (Array.isArray(value)) value.forEach((item) => form.append(name, item));
      else form.set(name, value);
    }
    for (const name of toVerify) form.append('fields_to_verify', name);
    if (reading.usageId) form.set('usage_id', reading.usageId);
    startSaving(async () => {
      const result = await saveBuyerFromNotes(form).catch(() => ({
        ok: false as const,
        error: NOT_SAVED,
        errors: undefined,
      }));
      if (!result.ok) {
        setError(
          result.errors
            ? `${result.error} ${Object.values(result.errors).join(' ')}`.trim()
            : result.error,
        );
        return;
      }
      setReading(null);
      setDraft(null);
      // « Trouver ses biens » : ce que l'agence a déjà pour lui, et le marché à chercher.
      router.push(`/acquereurs/${result.buyerId}/biens-ideaux`);
    });
  }

  const quitDialog = guard.pendingHref ? (
    <ConfirmDialog title={QUIT_TITLE} text={QUIT_TEXT} onCancel={guard.stay} cancelLabel="Rester">
      <button
        type="button"
        className={btnDanger}
        data-testid="notes-quit"
        onClick={() => {
          const href = guard.pendingHref ?? '/acquereurs';
          guard.stay();
          leave(href);
        }}
      >
        Quitter
      </button>
    </ConfirmDialog>
  ) : null;

  if (manual) {
    return (
      <div className="flex flex-col gap-5" data-testid="phrase-manual">
        <button
          type="button"
          className="self-start text-[15px] font-bold text-brand-deep stage:text-brand"
          onClick={() => setManual(false)}
        >
          Revenir à la phrase
        </button>
        {children}
      </div>
    );
  }

  const chips = draft && reading ? phraseChips(draft, reading.proposal) : [];
  const missing = draft ? draftMissing(draft) : [];
  const skipped = reading?.proposal.personalMentionsSkipped ?? 0;
  const stale = draft != null && reading?.from != null && text.trim() !== reading.from;
  const rows = Math.min(10, Math.max(4, text.split('\n').length));

  return (
    <div className="flex flex-1 flex-col gap-[18px]" data-testid="phrase-flow">
      <div className="flex flex-col gap-2.5">
        <label htmlFor="recherche" className="sr-only">
          Sa recherche
        </label>
        <textarea
          id="recherche"
          ref={area}
          rows={rows}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Par exemple : M. et Mme Martin. Une maison de 5 pièces à Vence, avec jardin, au calme, jusqu’à 800 000 €."
          className="w-full resize-none rounded-[20px] border-2 border-brand-deep bg-white p-4 text-lg leading-[1.45] text-brand-darker placeholder:text-[#8A90A6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand stage:border-white/40 stage:bg-white/10 stage:text-white"
          data-testid="phrase-text"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className={quietWide}
            aria-expanded={dictating}
            data-testid="phrase-dictate"
            onClick={() => {
              setDictating(true);
              area.current?.focus();
            }}
          >
            {microphone}
            Dicter
          </button>
          <button
            type="button"
            className={quietWide}
            disabled={busy}
            data-testid="phrase-photo"
            onClick={() => photoInput.current?.click()}
          >
            {camera}
            <span className="truncate">Photo de mes notes</span>
          </button>
        </div>
        {/* La dictée est celle de l'appareil : rien ne passe par l'outil. */}
        {dictating ? (
          <p
            className="text-sm text-[#5B6380] stage:text-white/60"
            role="status"
            data-testid="phrase-dictate-hint"
          >
            Touchez le micro de votre clavier, puis parlez : la dictée est celle de votre appareil.
            Sur un ordinateur, lancez la dictée de votre système.
          </p>
        ) : null}
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          data-testid="notes-photo"
          onChange={(event) => void onFiles('photo', event.currentTarget.files)}
        />
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,image/*,.heic,.heif"
          multiple
          hidden
          data-testid="notes-file"
          onChange={(event) => void onFiles('file', event.currentTarget.files)}
        />
        {demo ? (
          <div
            className={`${socleCardBordered} flex flex-wrap items-center gap-3 p-3`}
            data-testid="notes-demo-photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- une image du dépôt, telle quelle */}
            <img
              src={demo.photo}
              alt="Photo des notes de M. et Mme Arnaud"
              className="h-16 w-auto flex-none rounded-md border border-[#E3E6F0]"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <b className="text-sm text-brand-darker stage:text-white">
                Les notes de M. et Mme Arnaud
              </b>
              <span className="text-[13px] text-[#5B6380] stage:text-white/60">
                Une photo prise après leur appel
              </span>
            </div>
            <button
              type="button"
              className={`${socleBtnQuiet} flex-none`}
              disabled={busy}
              onClick={() => void onDemoPhoto()}
            >
              Lire cette photo
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="self-start text-sm font-bold text-brand-deep stage:text-brand"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          ou déposer un fichier (PDF, image)
        </button>
      </div>

      {error ? (
        <p role="alert" className={alertError} data-testid="notes-error">
          {error}
        </p>
      ) : null}

      {busy ? (
        <div
          className={`${socleCardBordered} flex flex-col gap-1.5 p-4`}
          data-testid="notes-reading"
        >
          <p
            className="text-[17px] font-extrabold text-brand-darker stage:text-white"
            role="status"
          >
            Lecture de vos notes…
          </p>
          <p className="text-sm text-[#5B6380] stage:text-white/60">
            Quelques secondes. Rien n’est enregistré avant votre accord.
          </p>
          <button
            type="button"
            className="self-start text-sm font-bold text-brand-deep underline stage:text-brand"
            onClick={cancelReading}
          >
            Annuler
          </button>
        </div>
      ) : null}

      {draft && reading ? (
        <>
          <PhraseChips
            chips={chips}
            open={open}
            onOpen={setOpen}
            onEdit={(edit) => setDraft((current) => (current ? editDraft(current, edit) : current))}
            starsLeft={draft.stars.length < NOTE_STARS_MAX}
          />
          {stale ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[#5B6380] stage:text-white/60">
              <span>La phrase a changé depuis la lecture.</span>
              <button
                type="button"
                className={`${socleBtnQuiet} h-10 px-3.5 text-sm`}
                data-testid="phrase-reread"
                onClick={() => void onPhrase()}
              >
                Relire ma phrase
              </button>
            </div>
          ) : null}
          {skipped > 0 ? (
            <p
              className="text-[13px] text-[#5B6380] stage:text-white/60"
              data-testid="proposal-skipped"
            >
              {skipped === 1
                ? '1 mention personnelle n’a pas été relevée.'
                : `${skipped} mentions personnelles n’ont pas été relevées.`}
            </p>
          ) : null}
          <p
            className="rounded-[14px] bg-[#E9ECF5] px-3.5 py-2.5 text-sm text-[#3B4466] stage:bg-white/10 stage:text-white/80"
            data-testid="notes-not-kept"
          >
            Cette proposition n’est pas gardée : si vous quittez ou rechargez la page, elle sera
            perdue.
          </p>
        </>
      ) : null}

      {/* Le texte validé de l'écran des notes (M151) : tel quel. */}
      <p
        className="text-[13px] leading-snug text-[#5B6380] stage:text-white/60"
        data-testid="notes-warning"
      >
        {NOTES_AI_WARNING}
      </p>

      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        {draft ? (
          <>
            {missing.length > 0 ? (
              <p className="text-center text-sm text-[#7A2E08] stage:text-orange-300" role="status">
                Il manque {missing.join(' et ')} : touchez la pastille orange.
              </p>
            ) : null}
            <button
              type="button"
              className={`${socleBtnFilledBig} ${socleBigStep} w-full`}
              disabled={saving || missing.length > 0}
              data-testid="phrase-find"
              onClick={save}
            >
              {saving ? 'Enregistrement…' : 'Trouver ses biens'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`${socleBtnFilledBig} ${socleBigStep} w-full`}
            disabled={busy}
            data-testid="phrase-read"
            onClick={() => void onPhrase()}
          >
            {busy ? 'Lecture…' : 'Voir ce que j’ai compris'}
          </button>
        )}
        <p className="text-center text-[13px] text-[#5B6380] stage:text-white/60">
          Vous pourrez tout compléter plus tard.
        </p>
        <div className="flex items-center justify-center gap-5">
          {draft ? (
            <button
              type="button"
              className={socleStepLink}
              data-testid="notes-cancel"
              onClick={() => guard.ask('/acquereurs')}
            >
              Annuler
            </button>
          ) : (
            <button
              type="button"
              className={socleStepLink}
              disabled={busy}
              data-testid="phrase-manual-open"
              onClick={() => setManual(true)}
            >
              Saisir à la main
            </button>
          )}
        </div>
      </div>
      {quitDialog}
    </div>
  );
}
