'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  alertError,
  btnDanger,
  btnPrimary,
  btnSecondary,
  card,
  fieldLabel,
  hintText,
  inputBase,
  link,
} from '@/components/ui/styles';
import { readBuyerNotes } from '@/features/buyer-notes/actions/read-notes';
import {
  cancelNotesReading,
  saveBuyerFromNotes,
} from '@/features/buyer-notes/actions/save-from-notes';
import { prepareFiles, type PreparedNotes } from '@/features/buyer-notes/client/prepare-notes';
import { useLeaveConfirm } from '@/features/buyer-notes/client/use-leave-confirm';
import {
  NOTE_HEIC_MESSAGE,
  NOTE_READING_MESSAGES,
} from '@/features/buyer-notes/services/note-messages';
import {
  PROPOSAL_CARDS,
  cardSource,
  cardText,
  type ProposalCard,
} from '@/features/buyer-notes/services/proposal-display';
import { proposalForm, type ExistingBuyer } from '@/features/buyer-notes/services/proposal-form';
import type { NoteField, NoteProposal, NoteValues } from '@/features/buyer-notes/types';
import { BUYER_SOFT_CRITERION_LABELS } from '@/features/buyers/types';

// Mission 151 — « Depuis mes notes » (planches 1 et 2, validées par Jean-Guy le 10/11 et le 12/11) :
// apporter ses notes, la lecture, puis la fiche proposée à vérifier. La proposition vit dans cet
// écran et nulle part ailleurs : la quitter la perd, d'où l'avertissement et la confirmation.

type Step = 'intake' | 'text' | 'reading' | 'proposal';
type Reading = { proposal: NoteProposal; usageId: string | null };

// Le ★ que porte chaque champ (les indispensables de l'écran, M132).
const STAR_OF_FIELD: Partial<Record<NoteField, NoteProposal['mustHave'][number]['key']>> = {
  cities: 'cities',
  budgetMax: 'budget',
  outdoor: 'outdoor',
  parking: 'parking',
  pool: 'pool',
  elevator: 'elevator',
};

const QUIT_TITLE = 'Quitter sans créer la fiche ?';
const QUIT_TEXT =
  'La proposition sera perdue : rien n’a été enregistré. Pour la retrouver, il faudra relancer la lecture de vos notes.';

function VerifyPill() {
  return (
    <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
      À vérifier
    </span>
  );
}

export function NotesFlow({
  existing,
  demoText,
  children,
}: {
  // La saisie rapide (M132), dessous, tant que rien n'est en lecture ni en vérification : un seul
  // bouton plein par écran (M146).
  children?: ReactNode;
  // Une fiche à compléter, ou null pour une fiche neuve.
  existing: ExistingBuyer | null;
  // L'agence de démonstration : un texte de notes inventé, proposé d'avance (M114).
  demoText: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intake');
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(demoText ?? '');
  const [prepared, setPrepared] = useState<Extract<PreparedNotes, { ok: true }> | null>(null);
  const [preview, setPreview] = useState<{ urls: string[]; text: string | null }>({
    urls: [],
    text: null,
  });
  const [reading, setReading] = useState<Reading | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [saving, startSaving] = useTransition();
  const readingToken = useRef(0);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const guard = useLeaveConfirm(step === 'proposal');

  // Les images montrées à côté de la proposition vivent dans l'onglet seulement.
  useEffect(() => () => preview.urls.forEach((url) => URL.revokeObjectURL(url)), [preview.urls]);

  async function read(notes: Extract<PreparedNotes, { ok: true }>) {
    const token = ++readingToken.current;
    setError(null);
    setStep('reading');
    const form = new FormData();
    form.set('kind', notes.kind);
    if (notes.text) form.set('text', notes.text);
    for (const image of notes.images) form.append('images', image);
    const result = await readBuyerNotes(form);
    // « Annuler » pendant la lecture : la réponse arrivée après ne s'affiche pas, la lecture est
    // dite annulée sur sa ligne.
    if (token !== readingToken.current) {
      if (result.ok && result.usageId) void cancelNotesReading(result.usageId);
      return;
    }
    if (!result.ok) {
      setError(result.heic ? NOTE_HEIC_MESSAGE : NOTE_READING_MESSAGES[result.cause]);
      setStep('intake');
      return;
    }
    setReading({ proposal: result.proposal, usageId: result.usageId });
    setStep('proposal');
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
    setPreview({ urls: notes.images.map((image) => URL.createObjectURL(image)), text: notes.text });
    setPrepared(notes);
    await read(notes);
  }

  async function onText() {
    const notes = { ok: true as const, kind: 'text' as const, text: text.trim(), images: [] };
    if (!notes.text) {
      setError(NOTE_READING_MESSAGES.empty);
      return;
    }
    setPreview({ urls: [], text: notes.text });
    setPrepared(notes);
    await read(notes);
  }

  function cancelReading() {
    readingToken.current += 1;
    setStep('intake');
  }

  function leave(href: string) {
    if (reading?.usageId) void cancelNotesReading(reading.usageId);
    setStep('intake');
    router.push(href);
  }

  async function again() {
    if (!prepared) return;
    if (reading?.usageId) void cancelNotesReading(reading.usageId);
    setReading(null);
    await read(prepared);
  }

  // --- planche 1 -----------------------------------------------------------------------------
  if (step === 'intake' || step === 'text') {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <section className={`${card} flex flex-col gap-4 p-5`} data-testid="notes-intake">
          <div className="flex flex-col gap-1">
            <h2 className="font-title text-xl font-bold text-brand-darker">
              {existing ? 'Compléter depuis mes notes' : 'Depuis mes notes'}
            </h2>
            <p className={hintText}>
              Vos notes papier, la fiche de votre logiciel ou un texte : l’outil propose la fiche,
              vous la vérifiez.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              className={`${btnSecondary} flex-col py-4`}
              onClick={() => photoInput.current?.click()}
            >
              <b>Prendre une photo</b>
              <span className="text-xs text-zinc-500">de vos notes</span>
            </button>
            <button
              type="button"
              className={`${btnSecondary} flex-col py-4`}
              onClick={() => fileInput.current?.click()}
            >
              <b>Déposer un fichier</b>
              <span className="text-xs text-zinc-500">PDF, image, capture</span>
            </button>
            <button
              type="button"
              className={`${btnSecondary} flex-col py-4`}
              aria-expanded={step === 'text'}
              onClick={() => setStep(step === 'text' ? 'intake' : 'text')}
            >
              <b>Coller un texte</b>
              <span className="text-xs text-zinc-500">e-mail, message, CRM</span>
            </button>
          </div>
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
          {step === 'text' ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className={fieldLabel}>Le texte de vos notes</span>
                <textarea
                  rows={8}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className={inputBase}
                  data-testid="notes-text"
                />
              </label>
              <div>
                <button type="button" className={btnSecondary} onClick={() => void onText()}>
                  Lire ce texte
                </button>
              </div>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className={alertError} data-testid="notes-error">
              {error}
            </p>
          ) : null}
          <p className={hintText}>
            Vos notes sont lues par un service d’intelligence artificielle, qui propose une fiche :
            vous la vérifiez avant de l’enregistrer. La photo n’est pas gardée. Ne photographiez pas
            d’information sur la santé, la religion ou la vie privée de vos clients.
          </p>
        </section>
        {children ? (
          <>
            <p className="text-center text-sm text-zinc-500">ou saisissez-le en 30 secondes</p>
            {children}
          </>
        ) : null}
      </div>
    );
  }

  if (step === 'reading') {
    return (
      <section
        className={`${card} flex flex-col items-center gap-3 p-8 text-center`}
        data-testid="notes-reading"
      >
        <NotesPreview preview={preview} small />
        <h2 className="font-title text-xl font-bold text-brand-darker" role="status">
          Lecture de vos notes…
        </h2>
        <p className={hintText}>Quelques secondes. Rien n’est enregistré avant votre accord.</p>
        <button type="button" className={link} onClick={cancelReading}>
          Annuler
        </button>
      </section>
    );
  }

  // --- planche 2 -----------------------------------------------------------------------------
  return (
    <>
      <NotesProposal
        existing={existing}
        reading={reading as Reading}
        preview={preview}
        showNotes={showNotes}
        setShowNotes={setShowNotes}
        saving={saving}
        onCancel={() => guard.ask(existing ? `/acquereurs/${existing.id}` : '/acquereurs')}
        onAgain={() => void again()}
        onSave={(form) =>
          startSaving(async () => {
            const result = await saveBuyerFromNotes(form);
            if (!result.ok) {
              setError(
                result.errors
                  ? `${result.error} ${Object.values(result.errors).join(' ')}`.trim()
                  : result.error,
              );
              return;
            }
            setStep('intake');
            router.push(`/acquereurs/${result.buyerId}?enregistre=1`);
          })
        }
        error={error}
      />
      {guard.pendingHref ? (
        <ConfirmDialog
          title={QUIT_TITLE}
          text={QUIT_TEXT}
          onCancel={guard.stay}
          cancelLabel="Rester"
        >
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
      ) : null}
    </>
  );
}

function NotesPreview({
  preview,
  small = false,
}: {
  preview: { urls: string[]; text: string | null };
  small?: boolean;
}) {
  if (preview.urls.length > 0) {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {preview.urls.map((url) => (
          // Une image locale de l'onglet (blob:), jamais envoyée ailleurs que pour la lecture.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt="Vos notes"
            className={`${small ? 'max-h-40' : 'max-h-[28rem]'} rounded-xl border border-zinc-200 object-contain`}
          />
        ))}
      </div>
    );
  }
  if (preview.text) {
    return (
      <pre
        className={`${small ? 'max-h-32' : 'max-h-[28rem]'} w-full overflow-auto whitespace-pre-wrap rounded-xl bg-amber-50 p-3 text-left text-sm text-zinc-700`}
      >
        {preview.text}
      </pre>
    );
  }
  return null;
}

function NotesProposal({
  existing,
  reading,
  preview,
  showNotes,
  setShowNotes,
  saving,
  onCancel,
  onAgain,
  onSave,
  error,
}: {
  existing: ExistingBuyer | null;
  reading: Reading;
  preview: { urls: string[]; text: string | null };
  showNotes: boolean;
  setShowNotes: (value: boolean) => void;
  saving: boolean;
  onCancel: () => void;
  onAgain: () => void;
  onSave: (form: FormData) => void;
  error: string | null;
}) {
  const { proposal, usageId } = reading;
  const beforeValues = useMemo<Partial<NoteValues>>(() => {
    if (!existing) return {};
    const out: Partial<NoteValues> = {};
    for (const card of PROPOSAL_CARDS) {
      for (const field of card.fields) {
        const value = existing[field];
        if (
          value != null &&
          !(Array.isArray(value) && value.length === 0) &&
          !(field === 'language' && value === 'fr')
        ) {
          (out as Record<string, unknown>)[field] = value;
        }
      }
    }
    return out;
  }, [existing]);

  // Sur une fiche existante : une valeur différente est décochée, un champ vide coché (A.8).
  const initialKept = useMemo(() => {
    const kept = new Set<string>();
    for (const card of PROPOSAL_CARDS) {
      if (cardText(card, proposal.values) == null) continue;
      if (!existing || cardText(card, beforeValues) == null) kept.add(card.id);
    }
    return kept;
  }, [existing, proposal.values, beforeValues]);
  const [kept, setKept] = useState<Set<string>>(initialKept);
  const [starsKept, setStarsKept] = useState(!existing || existing.mustHave.length === 0);
  const [softKept, setSoftKept] = useState(true);
  const [cashValidated, setCashValidated] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [typedCities, setTypedCities] = useState('');

  const starOf = new Set(proposal.mustHave.map((star) => star.key));
  const needsName = !proposal.values.name && !existing?.name;
  const needsCities = !proposal.values.cities && !(existing && existing.cities.length > 0);
  const proposedCount =
    PROPOSAL_CARDS.flatMap((card) => card.fields).filter(
      (field) => proposal.values[field] !== undefined,
    ).length +
    proposal.softCriteria.length +
    (proposal.financing || proposal.cashSuggestion ? 1 : 0);

  function submit() {
    const keptFields = new Set<NoteField>(
      PROPOSAL_CARDS.filter((card) => kept.has(card.id)).flatMap((card) => card.fields),
    );
    const { fields, toVerify } = proposalForm(proposal, existing, {
      kept: keptFields,
      starsKept,
      softKept,
      cashValidated,
      typedName,
      typedCities,
    });
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) {
      if (Array.isArray(value)) value.forEach((item) => form.append(name, item));
      else form.set(name, value);
    }
    for (const name of toVerify) form.append('fields_to_verify', name);
    if (usageId) form.set('usage_id', usageId);
    if (existing) form.set('buyer_id', existing.id);
    onSave(form);
  }

  const renderCard = (cardDef: ProposalCard) => {
    const value = cardText(cardDef, proposal.values);
    if (value == null && !cardDef.always) return null;
    const before = existing ? cardText(cardDef, beforeValues) : null;
    const changes = value != null && before !== value;
    const source = cardSource(cardDef, proposal);
    const starred = cardDef.fields.some((field) => {
      const star = STAR_OF_FIELD[field];
      return star != null && starOf.has(star);
    });
    const corrected =
      cardDef.id === 'cities'
        ? proposal.communes.filter((check) => check.status === 'corrected')
        : [];
    const unknown =
      cardDef.id === 'cities'
        ? proposal.communes.filter(
            (check) => check.status === 'unknown' || check.status === 'ambiguous',
          )
        : [];
    return (
      <div
        key={cardDef.id}
        className={`flex flex-col gap-1 rounded-xl border p-3 ${value == null ? 'border-zinc-200 bg-white' : 'border-amber-200 bg-amber-50/60'}`}
        data-testid={`proposal-${cardDef.id}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-600">{cardDef.label}</span>
          {value != null ? <VerifyPill /> : null}
        </div>
        {existing && value != null && changes ? (
          <label className="flex items-start gap-2 text-[15px] font-semibold">
            <input
              type="checkbox"
              className="mt-1 accent-brand"
              checked={kept.has(cardDef.id)}
              onChange={(event) => {
                const next = new Set(kept);
                if (event.target.checked) next.add(cardDef.id);
                else next.delete(cardDef.id);
                setKept(next);
              }}
            />
            <span>{before ? `${before} → ${value}` : value}</span>
          </label>
        ) : (
          <span className="text-[15px] font-semibold text-zinc-900">
            {starred ? <span className="mr-1 text-amber-500">★</span> : null}
            {value ?? (existing && before ? before : '—')}
          </span>
        )}
        {source ? (
          <span className="text-xs italic text-brand-darker">d’après : «&nbsp;{source}&nbsp;»</span>
        ) : null}
        {corrected.map((check) => (
          <span key={check.read} className="text-xs text-zinc-500">
            lu : «&nbsp;{check.read}&nbsp;»
          </span>
        ))}
        {unknown.map((check) => (
          <span key={check.read} className="text-xs text-orange-700">
            «&nbsp;{check.read}&nbsp;» n’est pas reconnue : saisissez la commune.
          </span>
        ))}
        {cardDef.id === 'name' && needsName ? (
          <input
            aria-label="Nom de l’acquéreur"
            className={inputBase}
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
          />
        ) : null}
        {cardDef.id === 'cities' && needsCities ? (
          <input
            aria-label="Communes"
            placeholder="Vence, Saint-Paul-de-Vence"
            className={inputBase}
            value={typedCities}
            onChange={(event) => setTypedCities(event.target.value)}
          />
        ) : null}
      </div>
    );
  };

  const financingCard = (
    <div
      className={`flex flex-col gap-1 rounded-xl border p-3 ${proposal.financing || proposal.cashSuggestion ? 'border-amber-200 bg-amber-50/60' : 'border-zinc-200 bg-white'}`}
      data-testid="proposal-financing"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-600">Financement</span>
        {proposal.financing || proposal.cashSuggestion ? <VerifyPill /> : null}
      </div>
      <span className="text-[15px] font-semibold text-zinc-900">
        {proposal.financing === 'validated'
          ? 'Validé'
          : proposal.financing === 'in_progress'
            ? 'En cours'
            : proposal.cashSuggestion
              ? 'Comptant, à vérifier'
              : '—'}
      </span>
      {proposal.cashSuggestion ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-brand"
            checked={cashValidated}
            onChange={(event) => setCashValidated(event.target.checked)}
          />
          Le noter « Validé »
        </label>
      ) : null}
      {proposal.financingSource ? (
        <span className="text-xs italic text-brand-darker">
          d’après : «&nbsp;{proposal.financingSource}&nbsp;»
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-24" data-testid="notes-proposal">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-title text-2xl font-bold text-brand-darker">
          {existing ? 'Vérifiez ce que vos notes ajoutent' : 'Vérifiez la fiche proposée'}
        </h2>
        <span className="text-sm text-zinc-500">
          {proposedCount} champ{proposedCount > 1 ? 's' : ''} proposé{proposedCount > 1 ? 's' : ''}{' '}
          · tous à vérifier
        </span>
      </div>
      <p
        className="flex items-center gap-2.5 rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
        data-testid="notes-not-kept"
      >
        <span
          aria-hidden="true"
          className="flex h-5 w-5 flex-none items-center justify-center rounded-full border border-zinc-500 font-serif text-xs italic"
        >
          i
        </span>
        Cette proposition n’est pas gardée : si vous quittez ou rechargez la page, elle sera perdue.
      </p>
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <aside className="flex flex-col gap-2">
          <button
            type="button"
            className={`${btnSecondary} lg:hidden`}
            onClick={() => setShowNotes(!showNotes)}
          >
            {showNotes ? 'Masquer vos notes' : 'Voir vos notes'}
          </button>
          <div
            className={`${showNotes ? 'flex' : 'hidden'} flex-col gap-2 lg:sticky lg:top-4 lg:flex`}
          >
            <NotesPreview preview={preview} />
            <p className={hintText}>Vos notes · la photo n’est pas gardée</p>
          </div>
        </aside>
        <div className="flex flex-col gap-4">
          <section className={`${card} flex flex-col gap-3 p-4`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">Qui</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROPOSAL_CARDS.filter((cardDef) => cardDef.section === 'qui').map(renderCard)}
              {financingCard}
            </div>
          </section>
          <section className={`${card} flex flex-col gap-3 p-4`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              Ce qu’ils cherchent
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROPOSAL_CARDS.filter((cardDef) => cardDef.section === 'cherche').map(renderCard)}
            </div>
            {existing && proposal.mustHave.length > 0 && existing.mustHave.length > 0 ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={starsKept}
                  onChange={(event) => setStarsKept(event.target.checked)}
                />
                Ajouter les indispensables lus :{' '}
                {proposal.mustHave.map((star) => star.key).join(', ')}
              </label>
            ) : null}
          </section>
          <section className={`${card} flex flex-col gap-3 p-4`} data-testid="proposal-soft">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              Ce qui compte pour eux
            </h3>
            <p className={hintText}>
              Leurs mots. Ces critères rangent les biens trouvés et disent pourquoi ; ils n’en
              écartent aucun.
            </p>
            {proposal.softCriteria.length > 0 ? (
              <>
                {existing ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-brand"
                      checked={softKept}
                      onChange={(event) => setSoftKept(event.target.checked)}
                    />
                    Les ajouter à la fiche
                  </label>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {proposal.softCriteria.map((soft) => (
                    <div
                      key={soft.key}
                      className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <b className="text-[15px]">{BUYER_SOFT_CRITERION_LABELS[soft.key]}</b>
                        <VerifyPill />
                      </div>
                      {soft.words ? (
                        <span className="text-sm italic text-brand-darker">
                          «&nbsp;{soft.words}&nbsp;»
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Rien de relevé.</p>
            )}
            {proposal.personalMentionsSkipped > 0 ? (
              <p
                className="border-t border-dashed border-zinc-200 pt-2.5 text-xs text-zinc-500"
                data-testid="proposal-skipped"
              >
                {proposal.personalMentionsSkipped === 1
                  ? '1 mention personnelle n’a pas été relevée.'
                  : `${proposal.personalMentionsSkipped} mentions personnelles n’ont pas été relevées.`}
              </p>
            ) : null}
          </section>
          {error ? (
            <p role="alert" className={alertError}>
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-2.5 border-t border-zinc-200 bg-white/95 px-3 py-3 backdrop-blur">
        <span className="mr-auto hidden text-sm text-zinc-500 sm:inline">
          Rien n’est enregistré avant votre accord
        </span>
        <button type="button" className={link} onClick={onCancel} data-testid="notes-cancel">
          Annuler
        </button>
        <button
          type="button"
          className={`${btnSecondary} hidden sm:inline-flex`}
          onClick={onAgain}
          disabled={saving}
        >
          Recommencer la lecture
        </button>
        <button
          type="button"
          className={`${btnPrimary} flex-1 sm:flex-none`}
          onClick={submit}
          disabled={saving}
          data-testid="notes-save"
        >
          {saving ? 'Enregistrement…' : existing ? 'Compléter la fiche' : 'Créer la fiche'}
        </button>
      </div>
    </div>
  );
}
