import type { ConversationItem, DocumentConversation } from 'hds-lib';
import { errorText, noticeText, statusText, tx } from './labels';
import { answerText, personNameOf, type ConversationViewer } from './answers';
import type { ConversationTextKey } from './conversationTexts';
import { bubbleIn, bubbleOut, cx, small } from './ui';
import { counterText, durationText, sinceText, useNowS, waitText } from './elapsed';
import { ON_HOLD, isInProgress, progressState } from './workInProgress';

export interface TaskStatusLineProps {
  /** The latest `task-status` alert's `status` (R4); none yet: "sent, not opened yet"; unknown: in progress (R8) */
  status?: string | null;
  errorCode?: string | null;
  counts?: { proposed?: number; questions?: number } | null;
  contactName: string;
  /** Whose app shows it: the person's (default) or the contact's own, its work in its own words */
  viewer?: ConversationViewer;
  /** Her name, for a contact's app ("Waiting for Anna's answers") */
  personName?: string | null;
  /**
   * When the last news came (seconds): the status's own time, or her share's while there is none. While the work is in
   * progress, shows how long it has been, then that it has not started or that there is no news (`progressState`).
   * Absent: neither.
   */
  sinceS?: number | null;
  /** The time (seconds); default: the device's, moving by itself */
  nowS?: number;
  locale?: string;
  className?: string;
}

const CONTACT_STATUS = new Set(['waiting', 'awaiting-answers']);
const CONTACT_ERRORS = new Set(['no-attachment', 'reading-failed', 'write-failed']);

/** The state of the work as the contact's app says it (its own work, her name) */
function contactStatusText (status: string | null | undefined, name: string): string {
  const s = status ?? 'waiting';
  return CONTACT_STATUS.has(s) ? tx(`contact.status.${s}` as ConversationTextKey, { name }) : statusText(status);
}

function contactErrorText (code: string | null | undefined, name: string): string {
  return tx(`contact.error.${code != null && CONTACT_ERRORS.has(code) ? code : 'unknown'}` as ConversationTextKey, { name });
}

/** "5 values, 1 question": what waits for her, each count left out when zero */
function countsText (counts: { proposed?: number; questions?: number }): string {
  const parts: string[] = [];
  const v = counts.proposed ?? 0;
  const q = counts.questions ?? 0;
  if (v > 0) parts.push(v === 1 ? tx('status.valuesOne') : tx('status.values', { n: v }));
  if (q > 0) parts.push(q === 1 ? tx('status.questionsOne') : tx('status.questions', { n: q }));
  return parts.join(', ');
}

const NO_NEWS_STATUS = new Set(['sent', 'received', 'reading', ON_HOLD]);

/** A status in progress, once it is old: what is known (it started), never that it goes on ("Being read") */
function oldStatusText (status: string | null | undefined, contact: boolean, name: string): string {
  const s = status ?? 'sent';
  if (contact && s === 'sent') return contactStatusText(null, name);
  return tx(`status.noNews.${NO_NEWS_STATUS.has(s) ? s : 'unknown'}` as ConversationTextKey);
}

/**
 * The state of the contact's work on one document. In progress, with `sinceS`: how long it has been, then that it has not
 * started or that there is no news. The moving time is for the eye; a screen reader hears since when, once.
 */
export function TaskStatusLine ({ status, errorCode, counts, contactName, viewer = 'person', personName, sinceS, nowS, locale, className }: TaskStatusLineProps) {
  const contact = viewer === 'contact';
  const name = personNameOf({ personName });
  const since = sinceS != null && (status == null || isInProgress(status)) ? sinceS : null;
  const now = useNowS(since, nowS);
  const state = since != null ? progressState(status, since, now) : 'working';
  // a contact's app never says there is no news from itself
  const key = contact ? 'contact.status.noNews' : state === 'not-started' ? 'status.notStarted' : state === 'on-hold' ? 'status.onHold' : 'status.noNews';
  return (
    <p className={cx(small, className)} role='status' data-work-state={since != null ? state : undefined}>
      <span className='font-medium'>{state !== 'working' ? oldStatusText(status, contact, name) : contact ? contactStatusText(status, name) : statusText(status)}</span>
      {since != null && state === 'working' && <span className='tabular-nums' aria-hidden='true' data-working-counter=''> · {counterText(now - since)}</span>}
      {since != null && state !== 'working' && (
        <>
          <span aria-hidden='true'> · {tx(`${key}For` as ConversationTextKey, { time: state === 'no-news' ? durationText(now - since) : waitText(now - since) })}</span>
          <span className='sr-only'>, {tx(`${key}Since` as ConversationTextKey, { since: sinceText(since, now, locale) })}</span>
          {!contact && <span className='mt-0.5 block'>{tx(state === 'on-hold' ? 'status.onHoldKept' : 'status.kept')}</span>}
        </>
      )}
      {status === 'awaiting-answers' && counts != null && countsText(counts) !== '' && <> · {countsText(counts)}</>}
      {status === 'error' && <span className='mt-1 block text-red-700 dark:text-red-400'>{contact ? contactErrorText(errorCode, name) : errorText(errorCode, contactName)}</span>}
    </p>
  );
}

export interface NoticeBubbleProps {
  code: string;
  contactName: string;
  /**
   * A second line from the host: for `ready`, the vouched app's description (APP-DESCRIPTION.md § The rule; never an
   * unvouched manifest's)
   */
  detail?: string | null;
  /** The time as the host writes it in its bubbles */
  timeText?: string;
  className?: string;
  /** Replaces the bubble's own classes, so it looks like the host's other bubbles from the contact */
  bubbleClassName?: string;
}

/** A notice from the contact (a code, never text from the contact: R6, R12), on its side of the conversation */
export function NoticeBubble ({ code, contactName, detail, timeText, className, bubbleClassName }: NoticeBubbleProps) {
  return (
    <div className={cx('flex justify-start', className)} data-notice={code}>
      <div className={bubbleClassName ?? bubbleIn}>
        <span className='sr-only'>{tx('fromContact', { name: contactName })}: </span>
        {noticeText(code, contactName)}
        {detail != null && detail !== '' && <span className='mt-1 block text-sm text-gray-600 dark:text-gray-400'>{detail}</span>}
        {timeText != null && <span className='float-right mt-1.5 ml-3 text-xs leading-none text-gray-500'>{timeText}</span>}
      </div>
    </div>
  );
}

export interface ConversationAnswerBubbleProps {
  answer: ConversationItem;
  /** A run of value confirmations shown as one bubble (`answerRuns`): "You confirmed 12 values" */
  run?: ConversationItem[];
  /** Her document's conversation, to say what the answer was about */
  conversation?: DocumentConversation | null;
  locale?: string;
  timeText?: string;
  /** The values her app wrote for this answer can be opened (her record's entry) */
  onOpenValue?: (eventId: string) => void;
  /**
   * Whose app shows it: hers (default: "You confirmed…", on her side) or a contact's ("Anna confirmed…", on the
   * other side, read-only words for the same answer)
   */
  viewer?: ConversationViewer;
  /** Her name, for a contact's app; "The person" without it */
  personName?: string | null;
  className?: string;
  /** Replaces the bubble's own classes, so it looks like the host's other bubbles of hers */
  bubbleClassName?: string;
}

/** One of her answers, on her side of the conversation (a value she confirmed opens its entry) */
export function ConversationAnswerBubble ({ answer, run, conversation, locale, timeText, onOpenValue, viewer = 'person', personName, className, bubbleClassName }: ConversationAnswerBubbleProps) {
  const reader = { viewer, personName };
  const contact = viewer === 'contact';
  const name = personNameOf(reader);
  const written: Array<{ eventId: string }> = Array.isArray(answer.content.written) ? answer.content.written : [];
  const confirmed = (run ?? []).reduce((n, a) => n + (Array.isArray(a.content.candidateIds) ? a.content.candidateIds.length : 1), 0);
  const text = run != null && run.length > 1
    ? (contact
        ? tx(confirmed === 1 ? 'contact.answer.confirmOne' : 'contact.answer.confirm', { n: confirmed, name })
        : (confirmed === 1 ? tx('answer.confirmOne') : tx('answer.confirm', { n: confirmed })))
    : answerText(answer, conversation ?? null, locale, reader);
  const first = written[0]?.eventId;
  const note = typeof answer.content.note === 'string' && answer.content.note !== '' ? answer.content.note : null;
  return (
    <div className={cx('flex', contact ? 'justify-start' : 'justify-end', className)} data-answer-viewer={viewer}>
      <div className={bubbleClassName ?? (contact ? bubbleIn : bubbleOut)}>
        <span className='sr-only'>{contact ? tx('fromContact', { name }) : tx('fromYou')}: </span>
        {first != null && onOpenValue != null
          ? <button type='button' className='text-left underline-offset-2 hover:underline' onClick={() => onOpenValue(first)}>{text}</button>
          : text}
        {note != null && (
          <span className='mt-1 block text-sm italic' data-answer-note=''>{contact ? tx('contact.note', { name, note }) : tx('note.yours', { note })}</span>
        )}
        {timeText != null && <span className='float-right mt-1.5 ml-3 text-xs leading-none text-gray-500'>{timeText}</span>}
      </div>
    </div>
  );
}
