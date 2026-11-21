import { useId, useState } from 'react';
import type { ProposedValueView, QuestionView } from 'hds-lib';
import { AnchoredDocumentView, type AnchoredDocumentSource } from './AnchoredDocumentView';
import type { PdfJsLike } from './pdfjs';
import { dayText, dayToTime, optionLabel, printedText, questionText, tx } from './labels';
import type { ConversationTextKey } from './conversationTexts';
import { questionAnswerText } from './answers';
import { anchorOn } from './rowBlock';
import { btn, cx, muted, panel, small } from './ui';

/** Her answer to a question, as the host passes it to hds-lib `answerQuestion` */
export interface QuestionAnswer {
  action: 'choose' | 'confirm' | 'not-mine' | 'skip';
  option?: string;
  time?: number;
  timePrecision?: 'day' | 'unknown';
}

export interface QuestionCardProps {
  question: QuestionView;
  /** The proposed value the question is about (its `candidateId`), to show its printed line */
  about?: ProposedValueView | null;
  contactName: string;
  /** The document's file, for an anchored identity block */
  sourceOf?: (attachmentId?: string) => AnchoredDocumentSource | null;
  /** True while an answer is being sent */
  busy?: boolean;
  /** `is-this-yours` answered by her app (profile match): "Not mine" stays offered while the work is not done */
  canUndoMatch?: boolean;
  /** null: shown, not answerable (read-only host) */
  onAnswer: ((a: QuestionAnswer) => void) | null;
  locale?: string;
  loadPdfJs?: () => Promise<PdfJsLike>;
  pdfOptions?: Record<string, unknown>;
  className?: string;
  /** `panel` (default): its own background, inside a card; `plain`: none, inside a bubble */
  variant?: 'panel' | 'plain';
}

const ROLES = new Set(['sampling', 'report', 'received', 'other']);

/**
 * A question from the contact with what she needs to answer it (she no longer has the document open): the printed name
 * and birth date for `is-this-yours` (with the document zoomed on them), the dates the document prints for
 * `which-date`, the options of a choice question, the printed line it is about. An unknown or third-party code is shown,
 * not answerable (R8). Answered: what she answered.
 */
export function QuestionCard ({ question, about, contactName, sourceOf, busy = false, canUndoMatch = false, onAnswer, locale, loadPdfJs, pdfOptions, className, variant = 'panel' }: QuestionCardProps) {
  const c = question.item.content;
  // no name or birth date read: the document's header block (`context.anchor`) is what she answers on, shown at once
  const [showDoc, setShowDoc] = useState(question.code === 'is-this-yours' && c.context?.identity == null && question.state !== 'answered');
  const [otherDay, setOtherDay] = useState('');
  const [pickingDay, setPickingDay] = useState(false);
  const dayId = useId();
  const answer = question.answer?.content ?? null;
  const open = question.state !== 'answered';
  const can = onAnswer != null && question.answerable && !busy;
  const send = (a: QuestionAnswer): void => { if (can) onAnswer!(a); };

  const identity = question.code === 'is-this-yours' ? c.context?.identity ?? null : null;
  const anchor = question.code === 'is-this-yours' ? anchorOn(c.context?.anchor, c.about) : null;
  const dates: Array<{ day: string; text: string; label?: string; role?: string }> = question.code === 'which-date' && Array.isArray(c.context?.dates) ? c.context.dates : [];
  const options: string[] = Array.isArray(c.options) ? c.options : [];
  const matched = answer?.action === 'confirm' && answer?.basis === 'profile-match';

  return (
    <div className={cx(variant === 'panel' && panel, className)} data-question={question.code}>
      <p className='text-sm font-semibold'>{questionText(question.code, contactName)}</p>
      {about != null && <p className={cx(small, 'mt-1')}>{tx('aboutValue', { label: printedText(about.item.content.printed) })}</p>}

      {identity != null && (
        <dl className='mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm'>
          {identity.name != null && <><dt className='text-gray-600 dark:text-gray-400'>{tx('printedName')}</dt><dd className='font-medium'>{String(identity.name)}</dd></>}
          {identity.birthDate != null && <><dt className='text-gray-600 dark:text-gray-400'>{tx('printedBirth')}</dt><dd className='font-medium'>{String(identity.birthDate)}</dd></>}
        </dl>
      )}
      {/* the contact read no name or birth date (CONVERSATION.md: then the question carries no identity): she checks on
          the document itself */}
      {question.code === 'is-this-yours' && identity == null && <p className={cx(small, 'mt-1')}>{tx('identityNotRead')}</p>}
      {question.code === 'is-this-yours' && sourceOf != null && (
        <>
          <button type='button' className={btn.link} aria-expanded={showDoc} onClick={() => setShowDoc((s) => !s)}>
            {showDoc ? tx('hideDocument') : anchor != null ? tx('seeOnDocument') : tx('seeDocument')}
          </button>
          {showDoc && (
            <AnchoredDocumentView
              source={sourceOf(anchor?.attachmentId)}
              anchor={anchor != null ? { page: anchor.page, bbox: anchor.bbox } : { page: 1 }}
              label={tx('printedName')}
              loadPdfJs={loadPdfJs}
              pdfOptions={pdfOptions}
            />
          )}
        </>
      )}

      {question.answerable && matched && (
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <span className='text-sm font-medium text-primary-700 dark:text-primary-300'>{tx('matchedProfile')}</span>
          {canUndoMatch && <button type='button' className={btn.outline} disabled={!can} onClick={() => send({ action: 'not-mine' })}>{tx('notMine')}</button>}
        </div>
      )}

      {question.answerable && open && !matched && (
        <div className='mt-2 flex flex-wrap gap-2'>
          {question.code === 'is-this-yours' && (
            <>
              <button type='button' className={btn.primary} disabled={!can} onClick={() => send({ action: 'confirm' })}>{tx('mine')}</button>
              <button type='button' className={btn.outline} disabled={!can} onClick={() => send({ action: 'not-mine' })}>{tx('notMine')}</button>
            </>
          )}
          {question.code === 'which-date' && (
            <>
              {dates.map((d) => (
                <button key={d.day + d.text} type='button' className={btn.outline} disabled={!can} onClick={() => send({ action: 'confirm', time: dayToTime(d.day), timePrecision: 'day' })}>
                  <span className='text-left'>
                    <span className='block'>{dayText(d.day, locale)}</span>
                    <span className='block text-xs text-gray-600 dark:text-gray-400'>
                      {[d.label, d.text, tx(`dateRole.${ROLES.has(d.role ?? '') ? d.role : 'other'}` as ConversationTextKey)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              ))}
              {!pickingDay && <button type='button' className={btn.outline} disabled={!can} onClick={() => setPickingDay(true)}>{tx('otherDay')}</button>}
              {pickingDay && (
                <span className='inline-flex flex-wrap items-center gap-2'>
                  <label htmlFor={dayId} className='sr-only'>{tx('pickDay')}</label>
                  <input id={dayId} type='date' value={otherDay} onChange={(e) => setOtherDay(e.target.value)} className='h-11 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800' />
                  <button type='button' className={btn.primary} disabled={!can || !/^\d{4}-\d{2}-\d{2}$/.test(otherDay)} onClick={() => send({ action: 'confirm', time: dayToTime(otherDay), timePrecision: 'day' })}>{tx('save')}</button>
                </span>
              )}
              <button type='button' className={btn.ghost} disabled={!can} onClick={() => send({ action: 'confirm', timePrecision: 'unknown' })}>{tx('dateUnknown')}</button>
            </>
          )}
          {['which-specimen', 'which-unit', 'which-analyte', 'is-fasting'].includes(question.code) && (
            <>
              {options.map((o) => {
                const { label, selectable } = optionLabel(question.code, o);
                return (
                  <button key={o} type='button' className={btn.outline} disabled={!can || !selectable} title={selectable ? undefined : tx('optionUnavailable', { option: label })} onClick={() => send({ action: 'choose', option: o })}>
                    {label}
                  </button>
                );
              })}
            </>
          )}
          {question.state !== 'skipped' && question.code !== 'is-this-yours' && (
            <button type='button' className={btn.ghost} disabled={!can} onClick={() => send({ action: 'skip' })}>{tx('skip')}</button>
          )}
        </div>
      )}

      {question.state === 'answered' && !matched && answer != null && (
        <p className={cx(muted, 'mt-2 font-medium')}>
          {answer.action === 'choose' ? tx('answer.choose', { option: optionLabel(question.code, answer.option).label }) : questionAnswerText(question.code, answer, locale)}
        </p>
      )}
      {question.state === 'skipped' && <p className={cx(small, 'mt-1')}>{tx('state.skipped')}</p>}
    </div>
  );
}
