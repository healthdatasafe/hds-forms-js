import type { ConversationItem, DocumentConversation } from 'hds-lib';
import { errorText, noticeText, statusText, tx } from './labels';
import { answerText } from './answers';
import { bubbleIn, bubbleOut, cx, small } from './ui';

export interface TaskStatusLineProps {
  /** The latest `task-status` alert's `status` (R4); none yet: "sent, not opened yet"; unknown: in progress (R8) */
  status?: string | null;
  errorCode?: string | null;
  counts?: { proposed?: number; questions?: number } | null;
  contactName: string;
  className?: string;
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
export function TaskStatusLine ({ status, errorCode, counts, contactName, className }: TaskStatusLineProps) {
  return (
    <p className={cx(small, className)} role='status'>
      <span className='font-medium'>{statusText(status)}</span>
      {status === 'awaiting-answers' && counts != null && countsText(counts) !== '' && <> · {countsText(counts)}</>}
      {status === 'error' && <span className='mt-1 block text-red-700 dark:text-red-400'>{errorText(errorCode, contactName)}</span>}
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
  className?: string;
  /** Replaces the bubble's own classes, so it looks like the host's other bubbles of hers */
  bubbleClassName?: string;
}

/** One of her answers, on her side of the conversation (a value she confirmed opens its entry) */
export function ConversationAnswerBubble ({ answer, run, conversation, locale, timeText, onOpenValue, className, bubbleClassName }: ConversationAnswerBubbleProps) {
  const written: Array<{ eventId: string }> = Array.isArray(answer.content.written) ? answer.content.written : [];
  const confirmed = (run ?? []).reduce((n, a) => n + (Array.isArray(a.content.candidateIds) ? a.content.candidateIds.length : 1), 0);
  const text = run != null && run.length > 1
    ? (confirmed === 1 ? tx('answer.confirmOne') : tx('answer.confirm', { n: confirmed }))
    : answerText(answer, conversation ?? null, locale);
  const first = written[0]?.eventId;
  return (
    <div className={cx('flex justify-end', className)}>
      <div className={bubbleClassName ?? bubbleOut}>
        <span className='sr-only'>{tx('fromYou')}: </span>
        {first != null && onOpenValue != null
          ? <button type='button' className='text-left underline-offset-2 hover:underline' onClick={() => onOpenValue(first)}>{text}</button>
          : text}
        {typeof answer.content.note === 'string' && answer.content.note !== '' && (
          <span className='mt-1 block text-sm italic' data-answer-note=''>{tx('note.yours', { note: answer.content.note })}</span>
        )}
        {timeText != null && <span className='float-right mt-1.5 ml-3 text-xs leading-none text-gray-500'>{timeText}</span>}
      </div>
    </div>
  );
}
