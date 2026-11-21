import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ConversationAlert, DocumentConversation, ProposedValueView, ValueCorrection } from 'hds-lib';
import { AnchoredDocumentView, type AnchoredDocumentSource } from './AnchoredDocumentView';
import type { PdfJsLike } from './pdfjs';
import { itemLabel, noticeText, printedText, proposalText, reasonText, tx } from './labels';
import type { ConversationTextKey } from './conversationTexts';
import { QuestionCard, type QuestionAnswer } from './QuestionCard';
import { ValueCorrectionEditor } from './ValueCorrectionEditor';
import { TaskStatusLine } from './ConversationBubbles';
import { batchCandidates, isWritten, rowBlock, shownAtOf, type RowBlock } from './rowBlock';
import { btn, card, cx, muted, small } from './ui';

/** What an action came to: done (some candidates may have been refused, each with hds-lib's reason) or failed */
export type ConversationOutcome = { ok: true; refused?: Array<{ candidateId: string; reason: string }> } | { ok: false; reason: string };

/**
 * What the host does when she answers (hds-lib `cmcConversation`): each call gets the card's `shownAt` (R3: an answer
 * binds to what was shown) and resolves once the host read the conversation again.
 */
export interface ConversationActions {
  confirm (candidateIds: string[], shownAt: number): Promise<ConversationOutcome>;
  correct (candidateId: string, correction: ValueCorrection, shownAt: number): Promise<ConversationOutcome>;
  dismiss (candidateIds: string[], action: 'skip' | 'request-item' | 'duplicate', shownAt: number): Promise<ConversationOutcome>;
  answer (questionId: string, answer: QuestionAnswer, shownAt: number): Promise<ConversationOutcome>;
}

export interface DocumentConversationCardProps {
  /** hds-lib `conversationOf(items, about)` */
  conversation: DocumentConversation;
  /** The latest `task-status` alert of the document (hds-lib `taskStatusOf`, R4), null before the first */
  status: ConversationAlert | null;
  /** The notices about this document */
  notices?: ConversationAlert[];
  /** The engines vouched for this relationship's app (hds-lib `vouchedEnginesFor`, R9) */
  engines: readonly string[];
  /** The document's title, as the host names documents */
  title: string;
  contactName: string;
  /** Her copy of the document's file, by attachment id (the host builds the URL with its read token) */
  sourceOf: (attachmentId?: string) => AnchoredDocumentSource | null;
  /** null: shown read-only */
  actions: ConversationActions | null;
  /** "This is not my document" when no `is-this-yours` was asked: the host takes the document back (its standard unshare) */
  onNotMyDocument?: () => void;
  /** The title opens the whole document (the host's viewer) */
  onOpenDocument?: () => void;
  locale?: string;
  loadPdfJs?: () => Promise<PdfJsLike>;
  pdfOptions?: Record<string, unknown>;
  className?: string;
  /** Replaces the card's own surface classes (border, background, text colour), so it looks like the host's cards */
  surfaceClassName?: string;
}

const STATE_TEXT: Record<string, ConversationTextKey> = {
  confirmed: 'state.confirmed',
  corrected: 'state.corrected',
  skipped: 'state.skipped',
  requested: 'state.requested',
  duplicate: 'state.duplicate',
  replaced: 'state.replaced'
};

function blockText (block: RowBlock, contactName: string): string {
  const key = `block.${block}`;
  if (block === 'answered' || block === 'replaced') return '';
  return tx((key in BLOCK_KEYS ? key : 'block.unknown') as ConversationTextKey, { name: contactName });
}
const BLOCK_KEYS: Record<string, true> = {
  'block.identity-open': true,
  'block.still-reading': true,
  'block.unit-missing': true,
  'block.not-mine': true,
  'block.no-date': true,
  'block.question-open': true,
  'block.awaiting-reproposal': true,
  'block.engine-not-vouched': true,
  'block.status': true
};

/**
 * One document's conversation with a contact, for any relationship: the state of the work, its notices, the
 * questions with their context, and the values read from the document. A value opens "Can you confirm this value is
 * XYZ?" with her document zoomed and highlighted on where it is printed (zoom out for the context, back to the
 * value), then Confirm or Correct (the item's own field). "Confirm all" covers the values read clearly. Nothing is
 * confirmable before she says the document is hers when the contact asked; a value the contact cannot propose
 * (R9) or that waits for an answer says why. Presentational: the host reads, writes and refreshes (`actions`).
 */
export function DocumentConversationCard ({
  conversation: conv, status, notices = [], engines, title, contactName, sourceOf, actions, onNotMyDocument, onOpenDocument,
  locale, loadPdfJs, pdfOptions, className, surfaceClassName
}: DocumentConversationCardProps) {
  const shownAt = useMemo(() => shownAtOf(conv), [conv]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);

  // an open review closes when its value changed meanwhile (a re-read by the contact)
  const reviewed = reviewing != null ? conv.proposedValues.find((p) => p.candidateId === reviewing) ?? null : null;
  const reviewedKey = reviewed != null ? `${reviewed.item.id}:${reviewed.item.modified}` : null;
  const openedKey = useRef<string | null>(null);
  useEffect(() => {
    if (reviewing == null) { openedKey.current = null; return; }
    if (openedKey.current == null) { openedKey.current = reviewedKey; return; }
    if (reviewedKey !== openedKey.current) {
      setReviewing(null);
      setCorrecting(false);
      setMessage(tx('updated'));
    }
  }, [reviewing, reviewedKey]);

  const run = async (key: string, fn: () => Promise<ConversationOutcome>, after?: () => void): Promise<void> => {
    if (busy != null) return;
    setBusy(key);
    setMessage(null);
    try {
      const out = await fn();
      const refused = 'refused' in out ? out.refused ?? [] : [];
      if ('reason' in out) setMessage(out.reason === 'changed-since-shown' ? tx('updated') : tx('failed'));
      else if (refused.length > 0) setMessage(refused.some((r) => r.reason === 'changed-since-shown') ? tx('updated') : tx('failed'));
      else after?.();
    } catch {
      setMessage(tx('failed'));
    } finally {
      setBusy(null);
    }
  };

  const can = actions != null && busy == null;
  const workStatus = status?.hds?.status as string | undefined;
  const done = workStatus === 'done';
  const identityQ = conv.questions.filter((q) => q.code === 'is-this-yours');
  const docQuestions = conv.questions.filter((q) => q.code !== 'is-this-yours' && q.item.content.candidateId == null);
  const valueQuestions = conv.questions.filter((q) => q.item.content.candidateId != null);
  const blockOpts = { status: workStatus ?? null };
  const batch = batchCandidates(conv, engines, blockOpts);
  const pvOf = (candidateId: unknown): ProposedValueView | null => conv.proposedValues.find((p) => p.candidateId === candidateId) ?? null;
  // a replaced value is shown once, through what replaced it
  const shownValues = conv.proposedValues.filter((p) => p.state !== 'replaced');
  const answerQ = (questionId: string) => (a: QuestionAnswer) => {
    if (actions != null) run('q:' + questionId, () => actions.answer(questionId, a, shownAt));
  };

  return (
    <section className={cx(surfaceClassName ?? card, className)} aria-label={title} data-about={conv.about}>
      <div className='flex items-start gap-3'>
        <div className='min-w-0 flex-1'>
          <h3 className='break-words text-base font-semibold'>
            {onOpenDocument != null ? <button type='button' className='text-left underline-offset-2 hover:underline' onClick={onOpenDocument}>{title}</button> : title}
          </h3>
          <TaskStatusLine status={workStatus ?? null} errorCode={status?.hds?.errorCode} counts={status?.hds?.counts} contactName={contactName} />
        </div>
      </div>

      {notices.map((n) => <p key={n.alertEventId} className={cx(muted, 'mt-2')}>{noticeText(String(n.hds.code), contactName)}</p>)}
      {conv.identity === 'not-mine' && <p className={cx(muted, 'mt-2')}>{tx('block.not-mine')}</p>}
      {message != null && <p className='mt-2 text-sm text-red-700 dark:text-red-400' role='alert'>{message}</p>}

      <div className='mt-3 space-y-3'>
        {identityQ.map((q) => (
          <QuestionCard
            key={q.item.id} question={q} contactName={contactName} sourceOf={sourceOf} busy={busy != null} canUndoMatch={!done}
            onAnswer={actions != null ? answerQ(q.item.id) : null} locale={locale} loadPdfJs={loadPdfJs} pdfOptions={pdfOptions}
          />
        ))}
        {conv.identity !== 'not-mine' && docQuestions.map((q) => (
          <QuestionCard key={q.item.id} question={q} contactName={contactName} busy={busy != null} onAnswer={actions != null ? answerQ(q.item.id) : null} locale={locale} />
        ))}
        {conv.identity !== 'not-mine' && valueQuestions.map((q) => (
          <QuestionCard key={q.item.id} question={q} about={pvOf(q.item.content.candidateId)} contactName={contactName} busy={busy != null} onAnswer={actions != null ? answerQ(q.item.id) : null} locale={locale} />
        ))}
      </div>

      {conv.identity !== 'not-mine' && shownValues.length > 0 && (
        <>
          <h4 className='mt-4 text-sm font-semibold'>{tx('proposedTitle')}</h4>
          {batch.length > 1 && actions != null && (
            <button type='button' className={cx(btn.primary, 'mt-2 w-full')} disabled={!can} onClick={() => run('batch', () => actions.confirm(batch.map((p) => p.candidateId), shownAt))}>
              {tx('confirmAll', { n: batch.length })}
            </button>
          )}
          <ul className='mt-2 space-y-2'>
            {shownValues.map((pv) => {
              const block = rowBlock(conv, pv, engines, blockOpts);
              const written = isWritten(conv, pv);
              const open = reviewing === pv.candidateId && !written;
              return (
                <li key={pv.item.id} className='rounded-md border border-gray-200 p-3 dark:border-gray-700' data-candidate={pv.candidateId}>
                  <ValueLine pv={pv} block={block} written={written} contactName={contactName} />
                  {!open && !written && (pv.state === 'open' || pv.state === 'skipped') && actions != null && (
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {block == null && <button type='button' className={btn.outline} disabled={!can} onClick={() => { setReviewing(pv.candidateId); setCorrecting(false); setMessage(null); }}>{tx('review')}</button>}
                      {block == null && pv.item.content.status === 'clear' && <button type='button' className={btn.primary} disabled={!can} onClick={() => run('c:' + pv.candidateId, () => actions.confirm([pv.candidateId], shownAt))}>{tx('confirm')}</button>}
                      {(pv.item.content.status === 'kept-aside' || pv.item.content.status === 'unmapped') && pv.item.content.requestKey != null && (
                        <button type='button' className={btn.outline} disabled={!can} onClick={() => run('r:' + pv.candidateId, () => actions.dismiss([pv.candidateId], 'request-item', shownAt))}>{tx('requestItem')}</button>
                      )}
                      {pv.state === 'open' && <button type='button' className={btn.ghost} disabled={!can} onClick={() => run('s:' + pv.candidateId, () => actions.dismiss([pv.candidateId], 'skip', shownAt))}>{tx('skip')}</button>}
                    </div>
                  )}
                  {open && (
                    <ValueReview
                      pv={pv} sourceOf={sourceOf} busy={busy != null} correcting={correcting} loadPdfJs={loadPdfJs} pdfOptions={pdfOptions}
                      onConfirm={() => actions != null && run('c:' + pv.candidateId, () => actions.confirm([pv.candidateId], shownAt), () => setReviewing(null))}
                      onCorrect={() => setCorrecting(true)}
                      onSubmitCorrection={(c) => actions != null && run('x:' + pv.candidateId, () => actions.correct(pv.candidateId, c, shownAt), () => { setReviewing(null); setCorrecting(false); })}
                      onCancelCorrection={() => setCorrecting(false)}
                      onDuplicate={() => actions != null && run('d:' + pv.candidateId, () => actions.dismiss([pv.candidateId], 'duplicate', shownAt), () => setReviewing(null))}
                      onClose={() => { setReviewing(null); setCorrecting(false); }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {actions != null && conv.identity !== 'not-mine' && !done && (identityQ.length > 0 || onNotMyDocument != null) && (
        <div className='mt-3 flex justify-end'>
          <button
            type='button' className={btn.ghost} disabled={!can}
            onClick={() => {
              const q = identityQ.find((x) => x.answerable);
              if (q != null) answerQ(q.item.id)({ action: 'not-mine' });
              else onNotMyDocument?.();
            }}
          >
            {tx('notMyDocument')}
          </button>
        </div>
      )}
    </section>
  );
}

/** A value read from the document: the line as printed, what would be saved, and its state or why it waits */
function ValueLine ({ pv, block, written, contactName }: { pv: ProposedValueView; block: RowBlock | null; written: boolean; contactName: string }) {
  const c = pv.item.content;
  const proposed = c.proposal != null ? proposalText(c.proposal) : null;
  const item = c.proposal != null ? itemLabel(c.proposal.itemKey) : null;
  const stateKey = written && pv.state !== 'corrected' ? STATE_TEXT.confirmed : STATE_TEXT[pv.state];
  let note: ReactNode = null;
  if (stateKey != null && pv.state !== 'skipped') note = <p className='mt-1 text-xs font-semibold text-primary-700 dark:text-primary-300'>{tx(stateKey)}</p>;
  else if (c.status === 'kept-aside' || c.status === 'unmapped') note = <p className={cx(small, 'mt-1')}>{reasonText(c.reason)}</p>;
  else if (block != null) {
    const text = block === 'status' ? (c.status === 'unit-missing' ? tx('block.unit-missing') : reasonText(c.reason)) : blockText(block, contactName);
    if (text !== '') note = <p className={cx(small, 'mt-1')}>{text}</p>;
  } else if (c.status === 'check') note = <p className='mt-1 text-xs font-medium text-amber-700 dark:text-amber-400'>{tx('checkThis')}</p>;
  return (
    <div>
      <p className='text-sm'><span className='sr-only'>{tx('printedAs')}: </span><span className='font-semibold'>{printedText(c.printed)}</span></p>
      {proposed != null && item != null && <p className={cx(small, 'mt-1')}>{tx('wouldSave', { item, value: proposed })}</p>}
      {note}
      {pv.state === 'skipped' && <p className={cx(small, 'mt-1')}>{tx('state.skipped')}</p>}
    </div>
  );
}

interface ValueReviewProps {
  pv: ProposedValueView;
  sourceOf: (attachmentId?: string) => AnchoredDocumentSource | null;
  busy: boolean;
  correcting: boolean;
  onConfirm: () => void;
  onCorrect: () => void;
  onSubmitCorrection: (c: ValueCorrection) => void;
  onCancelCorrection: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  loadPdfJs?: () => Promise<PdfJsLike>;
  pdfOptions?: Record<string, unknown>;
}

/** "Can you confirm this value is XYZ?": her document on the value's anchor, then Confirm, Correct, or already saved */
function ValueReview ({ pv, sourceOf, busy, correcting, onConfirm, onCorrect, onSubmitCorrection, onCancelCorrection, onDuplicate, onClose, loadPdfJs, pdfOptions }: ValueReviewProps) {
  const c = pv.item.content;
  const value = (c.proposal != null ? proposalText(c.proposal) : null) ?? printedText(c.printed);
  const anchor = c.anchor ?? null;
  return (
    <div className='mt-3 space-y-2'>
      <p className='text-sm font-semibold'>{tx('confirmQuestion', { value })}</p>
      <AnchoredDocumentView
        source={sourceOf(anchor?.attachmentId)}
        anchor={anchor != null ? { page: anchor.page, bbox: anchor.bbox } : null}
        label={printedText(c.printed)}
        loadPdfJs={loadPdfJs}
        pdfOptions={pdfOptions}
      >
        {!correcting && (
          <div className='flex flex-wrap gap-2'>
            <button type='button' className={btn.primary} disabled={busy} onClick={onConfirm}>{tx('confirm')}</button>
            <button type='button' className={btn.outline} disabled={busy} onClick={onCorrect}>{tx('correct')}</button>
            <button type='button' className={btn.ghost} disabled={busy} onClick={onDuplicate}>{tx('duplicate')}</button>
            <button type='button' className={btn.ghost} disabled={busy} onClick={onClose}>{tx('close')}</button>
          </div>
        )}
      </AnchoredDocumentView>
      {correcting && c.proposal != null && (
        <ValueCorrectionEditor proposal={c.proposal} busy={busy} onSubmit={onSubmitCorrection} onCancel={onCancelCorrection} />
      )}
    </div>
  );
}
