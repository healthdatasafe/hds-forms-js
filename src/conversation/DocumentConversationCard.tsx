import { useEffect, useMemo, useRef, useState } from 'react';
import type { ConversationAlert, DocumentConversation, ProposedValueView } from 'hds-lib';
import type { AnchoredDocumentSource } from './AnchoredDocumentView';
import type { PdfJsLike } from './pdfjs';
import { noticeText, tx, valueDayText } from './labels';
import { QuestionCard, type QuestionAnswer } from './QuestionCard';
import { TaskStatusLine } from './ConversationBubbles';
import type { ConversationViewer } from './answers';
import { batchCandidates, isWritten, rowBlock, shownAtOf } from './rowBlock';
import { ValueLine, ValueReview } from './ValueParts';
import { useConversationRun, type ConversationActions } from './conversationRun';
import { btn, card, cx, muted } from './ui';

export type { ConversationOutcome, ConversationActions } from './conversationRun';

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
  /**
   * Whose app shows it: hers (default) or a contact's, always read-only (its `actions` are ignored); the state of the
   * work then reads as the contact's own ("Waiting for Anna's answers"), the questions and values as she was asked them
   */
  viewer?: ConversationViewer;
  /** Her name, for a contact's app */
  personName?: string | null;
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

/**
 * One document's conversation with a contact, for any relationship: the state of the work, its notices, the
 * questions with their context, and the values read from the document. A value opens "Can you confirm this value is
 * XYZ?" with her document zoomed and highlighted on where it is printed (zoom out for the context, back to the
 * value), then Confirm or Correct (the item's own field). "Confirm all" covers the values read clearly. Nothing is
 * confirmable before she says the document is hers when the contact asked; a value the contact cannot propose
 * (R9) or that waits for an answer says why. Presentational: the host reads, writes and refreshes (`actions`).
 */
export function DocumentConversationCard ({
  conversation: conv, status, notices = [], engines, title, contactName, sourceOf, actions: givenActions, onNotMyDocument, onOpenDocument,
  viewer = 'person', personName, locale, loadPdfJs, pdfOptions, className, surfaceClassName
}: DocumentConversationCardProps) {
  // a contact's app never answers for her
  const actions = viewer === 'contact' ? null : givenActions;
  const shownAt = useMemo(() => shownAtOf(conv), [conv]);
  const { busy, message, setMessage, run } = useConversationRun();
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
  }, [reviewing, reviewedKey, setMessage]);

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
          <TaskStatusLine status={workStatus ?? null} errorCode={status?.hds?.errorCode} counts={status?.hds?.counts} contactName={contactName} viewer={viewer} personName={personName} />
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
                  <ValueLine pv={pv} block={block} written={written} contactName={contactName} day={valueDayText(pv, conv.proposedValues, locale)} />
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
                  {!written && pv.state === 'duplicate' && block == null && actions != null && (
                    <div className='mt-2 flex flex-wrap gap-2'>
                      <button type='button' className={btn.outline} disabled={!can} onClick={() => run('a:' + pv.candidateId, () => actions.confirm([pv.candidateId], shownAt))}>{tx('addAnyway')}</button>
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
