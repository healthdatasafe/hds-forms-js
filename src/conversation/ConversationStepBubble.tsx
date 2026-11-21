import { useRef, useState, type ReactNode } from 'react';
import { cmcConversation } from 'hds-lib';
import type { ConversationAlert, DocumentConversation, ProposedValueView } from 'hds-lib';
import { DocumentFieldsEditor } from './DocumentFieldsEditor';
import { AnchoredDocumentView, type AnchoredDocumentSource } from './AnchoredDocumentView';
import type { PdfJsLike } from './pdfjs';
import { documentKindLabel, itemLabel, noticeText, printedText, proposalText, proposedDateText, questionText, reasonText, tx, valueDayText } from './labels';
import { QuestionCard } from './QuestionCard';
import { ValueCorrectionEditor } from './ValueCorrectionEditor';
import { TaskStatusLine } from './ConversationBubbles';
import { anchorOn, shownAtOf } from './rowBlock';
import { blockText, useConversationRun, type ConversationActions } from './conversationRun';
import { progressText, type ConversationProgress, type ConversationStep } from './nextStep';
import { btn, bubbleIn, cx, small } from './ui';

const wide = 'w-full max-w-[92%]';

export interface ConversationStepBubbleProps {
  /** `nextStep(conversation, engines, opts)` */
  step: ConversationStep;
  conversation: DocumentConversation;
  progress?: ConversationProgress | null;
  contactName: string;
  /** The document the step is about, as the host names it */
  title: string;
  sourceOf: (attachmentId?: string) => AnchoredDocumentSource | null;
  /** null: shown, no answer possible */
  actions: ConversationActions | null;
  /** "One by one" on the batch step */
  onDeclineBatch?: () => void;
  /**
   * "Later" on a value: the host sets it aside (`StepOptions.deferred`), nothing is written, the contact keeps waiting.
   * Without it, "Later" answers `skip`, which the contact may delete with the value once its work is done (R10).
   */
  onLater?: (candidateId: string) => void;
  /** "OK" on the summary */
  onAcknowledgeSummary?: () => void;
  /** "Review the N set aside" on the summary */
  onReviewSkipped?: () => void;
  /**
   * Her note, typed in the chat line while this step waits (`answer.note`, 4.26.0): shown on the step, carried by the
   * answer she taps next. The host clears it once the step changed.
   */
  note?: string | null;
  /** ✕ on the note */
  onClearNote?: () => void;
  /** "Send as a message instead": the host posts the note as a plain chat message */
  onNoteAsMessage?: () => void;
  locale?: string;
  loadPdfJs?: () => Promise<PdfJsLike>;
  pdfOptions?: Record<string, unknown>;
  className?: string;
  /** Replaces the bubble's own classes, so it looks like the host's other bubbles from the contact */
  bubbleClassName?: string;
}

/**
 * The step of the conversation that waits for her, as a bubble from the contact with replies she just taps (perki:
 * "like chatting with someone, one by one"): a question with its context and options; a value ("I read Ferritine 48
 * ng/mL. Save it as Ferritin: 48 µg/L?") with Confirm · Correct · Already in my record · Later and her document zoomed
 * on the value; the values read clearly in one turn ("Confirm the 22" / "One by one", the list to see first); the
 * summary of what she cannot answer here. The answer carries the `shownAt` of when this step first showed (R3); the
 * host shows the next step once it read the conversation again.
 */
export function ConversationStepBubble ({
  step, conversation, progress, contactName, title, sourceOf, actions, onDeclineBatch, onLater, onAcknowledgeSummary, onReviewSkipped,
  note, onClearNote, onNoteAsMessage, locale, loadPdfJs, pdfOptions, className, bubbleClassName
}: ConversationStepBubbleProps) {
  const noteArg = note != null && note.trim() !== '' ? note.trim().slice(0, cmcConversation.NOTE_MAX_LENGTH) : undefined;
  // what she saw, when this step first showed: a step whose items change gets a new key, and a new shownAt
  const shown = useRef<{ key: string; at: number } | null>(null);
  if (shown.current?.key !== step.key) shown.current = { key: step.key, at: shownAtOf(conversation) };
  const shownAt = shown.current.at;
  const { busy, message, run } = useConversationRun();
  const [showDoc, setShowDoc] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const can = actions != null && busy == null;
  // a cumulative report: each value says its day, "Ferritine 12" and "Ferritine 30" differ by it alone
  const saveText = (pv: ProposedValueView, item: string, value: string, plain: 'step.save' | 'wouldSave', on: 'step.saveOn' | 'wouldSaveOn'): string => {
    const day = valueDayText(pv, conversation.proposedValues, locale);
    return day != null ? tx(on, { item, value, day }) : tx(plain, { item, value });
  };

  let body: ReactNode = null;
  if (step.kind === 'question') {
    body = (
      <QuestionCard
        variant='plain'
        question={step.question}
        about={step.about}
        contactName={contactName}
        sourceOf={sourceOf}
        busy={busy != null}
        onAnswer={actions != null ? (a) => { run('q', () => actions.answer(step.question.item.id, a, shownAt, noteArg)); } : null}
        locale={locale}
        loadPdfJs={loadPdfJs}
        pdfOptions={pdfOptions}
      />
    );
  } else if (step.kind === 'value') {
    const pv = step.value;
    const c = pv.item.content;
    const item = c.proposal != null ? itemLabel(c.proposal.itemKey) : null;
    const value = c.proposal != null ? proposalText(c.proposal) : null;
    const anchor = anchorOn(c.anchor, c.about);
    const docOpen = showDoc === step.key || (showDoc == null && c.status === 'check');
    // "I read {printed}." with the printed line in bold, in the sentence's own order
    const [readBefore, readAfter = ''] = tx('step.read').split('{printed}');
    body = (
      <div className='space-y-2'>
        <p className='text-sm'>{readBefore}<span className='font-semibold'>{printedText(c.printed)}</span>{readAfter}</p>
        {item != null && value != null && <p className='text-sm font-semibold'>{saveText(pv, item, value, 'step.save', 'step.saveOn')}</p>}
        {c.status === 'check' && <p className='text-xs font-medium text-amber-700 dark:text-amber-400'>{tx('step.check')}</p>}
        <button type='button' className={btn.link} aria-expanded={docOpen} onClick={() => setShowDoc(docOpen ? '' : step.key)}>
          {docOpen ? tx('hideDocument') : tx('seeOnDocument')}
        </button>
        {docOpen && (
          <AnchoredDocumentView
            source={sourceOf(anchor?.attachmentId)}
            anchor={anchor != null ? { page: anchor.page, bbox: anchor.bbox } : null}
            label={printedText(c.printed)}
            loadPdfJs={loadPdfJs}
            pdfOptions={pdfOptions}
          />
        )}
        {correcting === step.key && c.proposal != null
          ? (
            <ValueCorrectionEditor
              proposal={c.proposal}
              busy={busy != null}
              onSubmit={(correction) => { if (actions != null) run('x', () => actions.correct(pv.candidateId, correction, shownAt, noteArg), () => setCorrecting(null)); }}
              onCancel={() => setCorrecting(null)}
            />
            )
          : actions != null && (
            <div className='flex flex-wrap gap-2'>
              <button type='button' className={btn.primary} disabled={!can} onClick={() => run('c', () => actions.confirm([pv.candidateId], shownAt, noteArg))}>{tx('confirm')}</button>
              <button type='button' className={btn.outline} disabled={!can || c.proposal == null} onClick={() => setCorrecting(step.key)}>{tx('correct')}</button>
              <button type='button' className={btn.ghost} disabled={!can} onClick={() => run('d', () => actions.dismiss([pv.candidateId], 'duplicate', shownAt, noteArg))}>{tx('duplicate')}</button>
              <button type='button' className={btn.ghost} disabled={!can} onClick={() => { if (onLater != null) onLater(pv.candidateId); else run('s', () => actions.dismiss([pv.candidateId], 'skip', shownAt, noteArg)); }}>{tx('step.later')}</button>
            </div>
          )}
      </div>
    );
  } else if (step.kind === 'document') {
    const pd = step.proposed;
    const c = pd.item.content;
    const p = c.proposal ?? {};
    const kind = step.pending.includes('kind') && typeof p.documentKind === 'string' ? (documentKindLabel(p.documentKind) ?? p.documentKind) : null;
    const date = step.pending.includes('time') && typeof p.time === 'number' ? proposedDateText(p.time, p.timePrecision, locale) : null;
    const anchor = anchorOn(c.anchor, c.about);
    const docOpen = showDoc === step.key || (showDoc == null && c.status === 'check' && anchor != null);
    const text = kind != null && date != null
      ? tx('document.proposal', { kind, date })
      : kind != null ? tx('document.proposalKind', { kind }) : date != null ? tx('document.proposalDate', { date }) : null;
    const confirmDocument = actions?.confirmDocument;
    body = (
      <div className='space-y-2' data-proposed-document={pd.candidateId}>
        {c.status === 'check' && <p className='text-xs font-medium text-amber-700 dark:text-amber-400'>{tx('document.unsure')}</p>}
        {text != null && <p className='text-sm font-semibold'>{text}</p>}
        {anchor != null && (
          <button type='button' className={btn.link} aria-expanded={docOpen} onClick={() => setShowDoc(docOpen ? '' : step.key)}>
            {docOpen ? tx('hideDocument') : tx('seeOnDocument')}
          </button>
        )}
        {docOpen && anchor != null && (
          <AnchoredDocumentView source={sourceOf(anchor.attachmentId)} anchor={{ page: anchor.page, bbox: anchor.bbox }} label={date ?? ''} loadPdfJs={loadPdfJs} pdfOptions={pdfOptions} />
        )}
        {correcting === step.key && confirmDocument != null
          ? (
            <DocumentFieldsEditor
              pending={step.pending}
              proposal={p}
              busy={busy != null}
              onSubmit={(correction) => run('dx', () => confirmDocument(pd.candidateId, correction, shownAt, noteArg), () => setCorrecting(null))}
              onCancel={() => setCorrecting(null)}
            />
            )
          : confirmDocument != null && (
            <div className='flex flex-wrap gap-2'>
              <button type='button' className={btn.primary} disabled={!can || text == null} onClick={() => run('dc', () => confirmDocument(pd.candidateId, undefined, shownAt, noteArg))}>{tx('confirm')}</button>
              <button type='button' className={btn.outline} disabled={!can} onClick={() => setCorrecting(step.key)}>{tx('document.change')}</button>
              {onLater != null && <button type='button' className={btn.ghost} disabled={!can} onClick={() => onLater(pd.candidateId)}>{tx('step.later')}</button>}
            </div>
          )}
      </div>
    );
  } else if (step.kind === 'batch') {
    const n = step.values.length;
    body = (
      <div className='space-y-2'>
        <p className='text-sm font-semibold'>{tx('step.batch', { n })}</p>
        <details className='text-sm'>
          <summary className='cursor-pointer font-medium text-primary-700 dark:text-primary-300'>{tx('step.batchList')}</summary>
          <ul className='mt-2 space-y-1'>
            {step.values.map((pv) => {
              const c = pv.item.content;
              const item = c.proposal != null ? itemLabel(c.proposal.itemKey) : null;
              const value = c.proposal != null ? proposalText(c.proposal) : null;
              return (
                <li key={pv.item.id} data-candidate={pv.candidateId}>
                  <span className='font-medium'>{printedText(c.printed)}</span>
                  {item != null && value != null && <span className={cx(small, 'block')}>{saveText(pv, item, value, 'wouldSave', 'wouldSaveOn')}</span>}
                </li>
              );
            })}
          </ul>
        </details>
        {actions != null && (
          <div className='flex flex-wrap gap-2'>
            <button type='button' className={btn.primary} disabled={!can} onClick={() => run('b', () => actions.confirm(step.values.map((pv) => pv.candidateId), shownAt, noteArg))}>{tx('step.batchConfirm', { n })}</button>
            <button type='button' className={btn.outline} disabled={!can} onClick={() => onDeclineBatch?.()}>{tx('step.oneByOne')}</button>
          </div>
        )}
      </div>
    );
  } else {
    body = (
      <div className='space-y-2'>
        <p className='text-sm font-semibold'>{tx('step.summary')}</p>
        {step.keptAside.length > 0 && (
          <div>
            <p className={cx(small, 'font-semibold')}>{tx('step.keptAside')}</p>
            <ul className='mt-1 space-y-1'>
              {step.keptAside.map((pv) => (
                <li key={pv.item.id} className='text-sm' data-candidate={pv.candidateId}>
                  <span className='font-medium'>{printedText(pv.item.content.printed)}</span>
                  <span className={cx(small, 'block')}>{reasonText(pv.item.content.reason)}</span>
                  {actions != null && pv.item.content.requestKey != null && (
                    <button type='button' className={btn.link} disabled={!can} onClick={() => run('r' + pv.candidateId, () => actions.dismiss([pv.candidateId], 'request-item', shownAt, noteArg))}>{tx('requestItem')}</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {step.waiting.length > 0 && (
          <div>
            <p className={cx(small, 'font-semibold')}>{tx('step.waiting', { name: contactName })}</p>
            <ul className='mt-1 space-y-1'>
              {step.waiting.map(({ value: pv, block }) => (
                <li key={pv.item.id} className='text-sm' data-candidate={pv.candidateId}>
                  <span className='font-medium'>{printedText(pv.item.content.printed)}</span>
                  <span className={cx(small, 'block')}>{block === 'status' && pv.item.content.status === 'unit-missing' ? tx('block.unit-missing') : block === 'status' ? reasonText(pv.item.content.reason) : blockText(block, contactName)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {step.alreadyInRecord.length > 0 && (
          <div data-already-in-record=''>
            <p className={cx(small, 'font-semibold')}>
              {step.alreadyInRecord.length === 1 ? tx('step.inRecordOne') : tx('step.inRecord', { n: step.alreadyInRecord.length })}
            </p>
            <ul className='mt-1 space-y-1'>
              {step.alreadyInRecord.map((pv) => {
                const c = pv.item.content;
                const item = c.proposal != null ? itemLabel(c.proposal.itemKey) : null;
                const value = c.proposal != null ? proposalText(c.proposal) : null;
                return (
                  <li key={pv.item.id} className='text-sm' data-candidate={pv.candidateId}>
                    <span className='font-medium'>{printedText(c.printed)}</span>
                    {item != null && value != null && <span className={cx(small, 'block')}>{saveText(pv, item, value, 'wouldSave', 'wouldSaveOn')}</span>}
                    {actions != null && (
                      <button type='button' className={btn.link} disabled={!can} onClick={() => run('a' + pv.candidateId, () => actions.confirm([pv.candidateId], shownAt, noteArg))}>{tx('addAnyway')}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {step.unanswerable.length > 0 && (
          <div>
            <p className={cx(small, 'font-semibold')}>{tx('step.unanswerable')}</p>
            <ul className='mt-1 space-y-1'>
              {step.unanswerable.map((q) => <li key={q.item.id} className='text-sm'>{questionText(q.code, contactName)}</li>)}
            </ul>
          </div>
        )}
        <div className='flex flex-wrap gap-2'>
          {step.skipped.length > 0 && onReviewSkipped != null && (
            <button type='button' className={btn.outline} onClick={onReviewSkipped}>
              {step.skipped.length === 1 ? tx('step.reviewSkippedOne') : tx('step.reviewSkipped', { n: step.skipped.length })}
            </button>
          )}
          {onAcknowledgeSummary != null && <button type='button' className={btn.ghost} onClick={onAcknowledgeSummary}>{tx('ok')}</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={cx('flex justify-start', className)} data-conversation-step={step.kind}>
      <div className={cx(bubbleClassName ?? bubbleIn, wide)} role='group' aria-label={tx('step.about', { title })}>
        <span className='sr-only'>{tx('fromContact', { name: contactName })}: </span>
        <p className={cx(small, 'mb-2')}>
          {tx('step.about', { title })}
          {progress != null && progressText(progress) !== '' && <> · {progressText(progress)}</>}
        </p>
        {body}
        {noteArg != null && step.kind !== 'summary' && (
          <div className='mt-2 rounded-md border border-dashed border-gray-300 p-2 text-sm dark:border-gray-600' data-note-draft=''>
            <span>{tx('note.draft', { note: noteArg })}</span>
            {onClearNote != null && <button type='button' className={cx(btn.ghost, 'ml-1')} aria-label={tx('note.remove')} onClick={onClearNote}>✕</button>}
            {onNoteAsMessage != null && <button type='button' className={cx(btn.link, 'block')} onClick={onNoteAsMessage}>{tx('note.asMessage')}</button>}
          </div>
        )}
        {message != null && <p className='mt-2 text-sm text-red-700 dark:text-red-400' role='alert'>{message}</p>}
      </div>
    </div>
  );
}

export interface DocumentStatusBubbleProps {
  title: string;
  /** The latest `task-status` of the document (R4) */
  status: ConversationAlert | null;
  notices?: ConversationAlert[];
  progress?: ConversationProgress | null;
  contactName: string;
  /** The title opens the whole document (the host's viewer) */
  onOpenDocument?: () => void;
  /** "See everything": the host shows its overview (`DocumentConversationCard`) as `children` while expanded */
  expanded?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  className?: string;
  bubbleClassName?: string;
}

/**
 * One document in the conversation, from the contact: its title, the state of the work, its notices, where it stands
 * ("28 values · 1 question · 9 answered"), and "See everything" (every question and value of the document at once).
 */
export function DocumentStatusBubble ({ title, status, notices = [], progress, contactName, onOpenDocument, expanded = false, onToggle, children, className, bubbleClassName }: DocumentStatusBubbleProps) {
  return (
    <div className={cx('flex justify-start', className)} data-document-status=''>
      <div className={cx(bubbleClassName ?? bubbleIn, expanded ? 'w-full max-w-full' : '')}>
        <span className='sr-only'>{tx('fromContact', { name: contactName })}: </span>
        <p className='text-sm font-semibold'>
          {onOpenDocument != null ? <button type='button' className='text-left underline-offset-2 hover:underline' onClick={onOpenDocument}>{title}</button> : title}
        </p>
        <TaskStatusLine status={(status?.hds?.status as string | undefined) ?? null} errorCode={status?.hds?.errorCode} contactName={contactName} />
        {progress != null && progressText(progress) !== '' && <p className={small}>{progressText(progress)}</p>}
        {notices.map((n) => <p key={n.alertEventId} className='mt-1 text-sm'>{noticeText(String(n.hds.code), contactName)}</p>)}
        {onToggle != null && (
          <button type='button' className={btn.link} aria-expanded={expanded} onClick={onToggle}>{expanded ? tx('hideEverything') : tx('seeEverything')}</button>
        )}
        {expanded && <div className='mt-2'>{children}</div>}
      </div>
    </div>
  );
}
