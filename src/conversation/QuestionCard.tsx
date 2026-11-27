import { useId, useState, type ReactNode } from 'react';
import type { ProposedValueView, QuestionView } from 'hds-lib';
import { AnchoredDocumentView, type AnchoredDocumentSource, type AnchoredDocumentStatus } from './AnchoredDocumentView';
import type { PdfJsLike } from './pdfjs';
import { dayText, dayToTime, lineText, optionLabel, questionText, tx } from './labels';
import type { ConversationTextKey } from './conversationTexts';
import { questionAnswerText } from './answers';
import { anchorOn } from './rowBlock';
import { isUsableBox, type AnchorBox } from './anchorFrame';
import { rememberable, type RememberNameOptions } from './otherNames';
import { RememberNameOffer } from './RememberNameOffer';
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
  /** An answered `which-row-date` may be changed: no value of its row is written yet */
  canChangeDay?: boolean;
  /** `panel` (default): its own background, inside a card; `plain`: none, inside a bubble */
  variant?: 'panel' | 'plain';
  /**
   * "Remember this name" (data-model 4.47.0, R3): after her own "Yes, it is mine" on an `is-this-yours` whose printed
   * name is none of hers, offer to save it as an other name. Off by default (absent or null): the host turns it on only
   * once it may write other names (PROFILE.md § Other names, after the production sweep).
   */
  rememberName?: RememberNameOptions | null;
}

/** A date of `context.dates`; `anchor` (4.47.0) where it is printed, for a date read on a picture */
interface DateOption {
  day: string;
  text: string;
  label?: string;
  role?: string;
  anchor?: { eventId?: string; attachmentId?: string; page: number; bbox?: AnchorBox } | null;
}

/**
 * A date with the crop of her document where it is printed (4.47.0): she checks it against the page before she picks it,
 * so its button shows only once the crop does; a crop that cannot be shown takes the date away (she can still type a day)
 */
interface AnchoredDateProps {
  source: AnchoredDocumentSource;
  anchor: { page: number; bbox: AnchorBox };
  label: string;
  loadPdfJs?: () => Promise<PdfJsLike>;
  pdfOptions?: Record<string, unknown>;
  children: ReactNode;
}

function AnchoredDate ({ source, anchor, label, loadPdfJs, pdfOptions, children }: AnchoredDateProps) {
  const [status, setStatus] = useState<AnchoredDocumentStatus>('loading');
  if (status === 'failed' || status === 'page-missing') return null;
  return (
    <div className='w-full space-y-1' data-anchored-date=''>
      <AnchoredDocumentView source={source} anchor={anchor} label={label} loadPdfJs={loadPdfJs} pdfOptions={pdfOptions} onStatus={setStatus} />
      {status === 'shown' && children}
    </div>
  );
}

const ROLES = new Set(['sampling', 'report', 'received', 'other']);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today where she is */
function today (): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** A whole day she may give a row: with its four-digit year (a date field accepts year 2), and not to come */
function isRowDay (day: string): boolean {
  return ISO_DAY.test(day) && day >= '1900' && day <= today();
}

/** The printed birth date as she reads dates: from its day (`birthDay`, or a printed ISO date), else as printed */
function birthText (identity: { birthDate?: unknown; birthDay?: unknown }, locale?: string): string {
  const day = typeof identity.birthDay === 'string' && ISO_DAY.test(identity.birthDay)
    ? identity.birthDay
    : typeof identity.birthDate === 'string' && ISO_DAY.test(identity.birthDate) ? identity.birthDate : null;
  return day != null ? dayText(day, locale) : String(identity.birthDate);
}

/**
 * A question from the contact with what she needs to answer it (she no longer has the document open): the printed name
 * and birth date for `is-this-yours` (with the document zoomed on them), the dates the document prints for
 * `which-date`, the options of a choice question, the printed line it is about. An unknown or third-party code is shown,
 * not answerable (R8). Answered: what she answered.
 */
export function QuestionCard ({ question, about, contactName, sourceOf, busy = false, canUndoMatch = false, canChangeDay = false, onAnswer, locale, loadPdfJs, pdfOptions, className, variant = 'panel', rememberName }: QuestionCardProps) {
  const c = question.item.content;
  // no name or birth date read: the document's header block (`context.anchor`) is what she answers on, shown at once
  // (a `which-column-date`, 4.39.0, is answered the same way: she types the day printed above the marked column)
  const columnDate = question.code === 'which-column-date';
  const rowDate = question.code === 'which-row-date' || columnDate;
  const dayLabel = columnDate ? 'column-date.label' : 'row-date.label';
  // (and the box of a `which-row-date`: its day is written there)
  const [showDoc, setShowDoc] = useState(((question.code === 'is-this-yours' && c.context?.identity == null) || rowDate) && question.state !== 'answered');
  const [changing, setChanging] = useState(false);
  const [otherDay, setOtherDay] = useState('');
  const [pickingDay, setPickingDay] = useState(false);
  const dayId = useId();
  const answer = question.answer?.content ?? null;
  const open = question.state !== 'answered' || changing;
  const can = onAnswer != null && question.answerable && !busy;
  const send = (a: QuestionAnswer): void => { if (can) onAnswer!(a); };

  const identity = question.code === 'is-this-yours' ? c.context?.identity ?? null : null;
  const anchor = question.code === 'is-this-yours' || rowDate ? anchorOn(c.context?.anchor, c.about) : null;
  const dated = question.code === 'which-date' || question.code === 'which-document-date';
  // a date question shows her document too: the days may have been read from a picture. The contract anchors no date,
  // so it opens on the value it is about, else on the first page
  const dateAnchor = dated ? anchorOn(about?.item.content.anchor, c.about) : null;
  const shownOn = anchor ?? dateAnchor;
  const dates: DateOption[] = dated && Array.isArray(c.context?.dates) ? c.context.dates : [];
  const options: string[] = Array.isArray(c.options) ? c.options : [];
  const matched = answer?.action === 'confirm' && answer?.basis === 'profile-match';
  // her own "Yes" on a printed name that is none of hers (R3, 4.47.0), in her app only
  const toRemember = rememberName != null && onAnswer != null && question.code === 'is-this-yours' && question.state === 'answered'
    ? rememberable(c, answer, rememberName)
    : null;
  const dateButton = (d: DateOption, i: number): ReactNode => (
    <button key={i} type='button' className={btn.outline} disabled={!can} onClick={() => send({ action: 'confirm', time: dayToTime(d.day), timePrecision: 'day' })}>
      <span className='text-left'>
        <span className='block'>{dayText(d.day, locale)}</span>
        <span className='block text-xs text-gray-600 dark:text-gray-400'>
          {[d.label, d.text, tx(`dateRole.${ROLES.has(d.role ?? '') ? d.role : 'other'}` as ConversationTextKey)].filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
  );
  // a date with `anchor` is offered only with its crop: an anchor on another document, without a usable box, or on a
  // file she cannot read leaves it out
  const dateOption = (d: DateOption, i: number): ReactNode => {
    if (d.anchor == null) return dateButton(d, i);
    const a = anchorOn(d.anchor, c.about);
    const source = a != null && isUsableBox(a.bbox) && sourceOf != null ? sourceOf(a.attachmentId) : null;
    if (a == null || source == null) return null;
    return (
      <AnchoredDate key={i} source={source} anchor={{ page: a.page, bbox: a.bbox! }} label={d.text} loadPdfJs={loadPdfJs} pdfOptions={pdfOptions}>
        {dateButton(d, i)}
      </AnchoredDate>
    );
  };

  return (
    <div className={cx(variant === 'panel' && panel, className)} data-question={question.code}>
      <p className='text-sm font-semibold'>{questionText(question.code, contactName)}</p>
      {question.code === 'which-date' && c.candidateId == null && open && <p className={cx(small, 'mt-1')}>{tx('which-date.whole')}</p>}
      {about != null && <p className={cx(small, 'mt-1')}>{tx('aboutValue', { label: lineText(about.item.content) })}</p>}

      {identity != null && (
        <dl className='mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm'>
          {identity.name != null && <><dt className='text-gray-600 dark:text-gray-400'>{tx('printedName')}</dt><dd className='font-medium'>{String(identity.name)}</dd></>}
          {identity.birthDate != null && <><dt className='text-gray-600 dark:text-gray-400'>{tx('printedBirth')}</dt><dd className='font-medium'>{birthText(identity, locale)}</dd></>}
        </dl>
      )}
      {/* the contact read no name or birth date (CONVERSATION.md: then the question carries no identity): she checks on
          the document itself */}
      {question.code === 'is-this-yours' && identity == null && <p className={cx(small, 'mt-1')}>{tx('identityNotRead')}</p>}

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
          {dated && (
            <>
              {dates.map(dateOption)}
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
          {rowDate && (
            <span className='inline-flex flex-wrap items-center gap-2'>
              <label htmlFor={dayId} className='sr-only'>{tx(dayLabel)}</label>
              <input id={dayId} type='date' value={otherDay} max={today()} onChange={(e) => setOtherDay(e.target.value)} className='h-11 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800' />
              <button type='button' className={btn.primary} disabled={!can || !isRowDay(otherDay)} onClick={() => { setChanging(false); send({ action: 'confirm', time: dayToTime(otherDay), timePrecision: 'day' }); }}>{tx('save')}</button>
            </span>
          )}
          {['which-specimen', 'which-unit', 'which-analyte', 'is-fasting', 'which-document-kind'].includes(question.code) && (
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
          {changing && <button type='button' className={btn.ghost} onClick={() => setChanging(false)}>{tx('cancel')}</button>}
          {!changing && question.state !== 'skipped' && question.code !== 'is-this-yours' && (
            <button type='button' className={btn.ghost} disabled={!can} onClick={() => send({ action: 'skip' })}>{tx('skip')}</button>
          )}
        </div>
      )}

      {/* her answer before her document: on a phone the picture takes the screen, and the answer fell under it */}
      {(question.code === 'is-this-yours' || ((dated || rowDate) && open)) && sourceOf != null && (
        <div className='mt-2'>
          <button type='button' className={btn.link} aria-expanded={showDoc} onClick={() => setShowDoc((s) => !s)}>
            {showDoc ? tx('hideDocument') : shownOn != null ? tx('seeOnDocument') : tx('seeDocument')}
          </button>
          {showDoc && (
            <AnchoredDocumentView
              source={sourceOf(shownOn?.attachmentId)}
              anchor={shownOn != null ? { page: shownOn.page, bbox: shownOn.bbox } : { page: 1 }}
              label={rowDate ? tx(dayLabel) : dated ? (about != null ? lineText(about.item.content) : undefined) : tx('printedName')}
              loadPdfJs={loadPdfJs}
              pdfOptions={pdfOptions}
            />
          )}
        </div>
      )}

      {question.state === 'answered' && !matched && answer != null && (
        <p className={cx(muted, 'mt-2 font-medium')}>
          {answer.action === 'choose' ? tx('answer.choose', { option: optionLabel(question.code, answer.option).label }) : questionAnswerText(question.code, answer, locale)}
        </p>
      )}
      {toRemember != null && rememberName != null && <RememberNameOffer key={toRemember} printed={toRemember} onRemember={(name) => rememberName.onRemember(name)} />}
      {rowDate && question.state === 'answered' && !changing && canChangeDay && can && (
        <button type='button' className={btn.link} onClick={() => { setOtherDay(typeof answer?.time === 'number' ? new Date(answer.time * 1000).toISOString().slice(0, 10) : ''); setChanging(true); setShowDoc(true); }}>{tx('row-date.change')}</button>
      )}
      {question.state === 'skipped' && <p className={cx(small, 'mt-1')}>{tx('state.skipped')}</p>}
    </div>
  );
}
