import type { ConversationItem, DocumentConversation } from 'hds-lib';
import { errorText, noticeText, statusText, tx } from './labels';
import { answerText, personNameOf, type ConversationViewer } from './answers';
import type { ConversationTextKey } from './conversationTexts';
import { bubbleIn, bubbleOut, cx, small } from './ui';

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

/** The state of the contact's work on one document */
export function TaskStatusLine ({ status, errorCode, counts, contactName, viewer = 'person', personName, className }: TaskStatusLineProps) {
  const contact = viewer === 'contact';
  const name = personNameOf({ personName });
  return (
    <p className={cx(small, className)} role='status'>
      <span className='font-medium'>{contact ? contactStatusText(status, name) : statusText(status)}</span>
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
