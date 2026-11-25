import { tx } from './labels';
import type { ConversationTextKey } from './conversationTexts';
import { bubbleIn, cx } from './ui';
import { counterText, durationText, momentText, useNowS, waitText } from './elapsed';
import { progressState } from './workInProgress';

export interface ContactWorkingIndicatorProps {
  contactName: string;
  /** The latest `task-status` (`hds.status`): `received` and `reading` say what is going on; any other, "working" */
  status?: string | null;
  /** The document the contact works on, as the host names it */
  documentTitle?: string | null;
  /**
   * When the last news came (seconds): the latest `task-status`'s time, or her share's while there is none (`sent`).
   * Shows how long it has been, then that the contact has not started or that there is no news (`progressState`).
   * Absent: neither.
   */
  sinceS?: number | null;
  /** The time (seconds); default: the device's, moving by itself */
  nowS?: number;
  locale?: string;
  className?: string;
  /** Replaces the bubble's own classes, so it looks like the host's other bubbles from the contact */
  bubbleClassName?: string;
}

/**
 * The standard "working" indicator of a conversation, as a typing indicator from the contact: three moving dots, what it
 * does ("HDS Reader is reading “Lab report”…") and for how long, on the contact's side at the end of the thread. After a
 * while the dots go and it says what is known: the contact has it and has not started, or no news, for how long, and that
 * her document is kept. The host shows it while the contact's latest status of a document is in progress (`workState`) and removes it on
 * the next one. Announced politely to screen readers, once per state: the moving time is for the eye, they hear since
 * when. The dots stand still when the person asks for reduced motion.
 */
export function ContactWorkingIndicator ({ contactName, status, documentTitle, sinceS, nowS, locale, className, bubbleClassName }: ContactWorkingIndicatorProps) {
  const now = useNowS(sinceS, nowS);
  const vars = { name: contactName, title: documentTitle ?? '' };
  const doc = documentTitle != null && documentTitle !== '';
  const state = sinceS != null ? progressState(status, sinceS, now) : 'working';
  // `sent`: her app's own state, between her share and the contact's first task-status (no webhook: 1-2 minutes)
  const text = status === 'sent'
    ? tx(doc ? 'working.sent' : 'working.sentNoTitle', vars)
    : status === 'received'
      ? tx(doc ? 'working.received' : 'working.receivedNoTitle', vars)
      : status === 'reading'
        ? tx(doc ? 'working.reading' : 'working.readingNoTitle', vars)
        : tx(doc ? 'working.other' : 'working.otherNoTitle', vars);
  // past `working`: the moving time for the eye, since when for a screen reader
  const key = state === 'not-started' ? 'working.notStarted' : 'working.noNews';
  const said = (since: boolean) => {
    const full = `${key}${since ? 'Since' : ''}${doc ? '' : 'NoTitle'}` as ConversationTextKey;
    const age = now - (sinceS ?? now);
    return tx(full, since ? { ...vars, moment: momentText(sinceS ?? now, now, locale) } : { ...vars, time: state === 'not-started' ? waitText(age) : durationText(age) });
  };
  return (
    <div className={cx('flex justify-start', className)} data-working-indicator={state === 'working' ? '' : state}>
      <div className={cx(bubbleClassName ?? bubbleIn, state === 'working' ? 'inline-flex items-center gap-2' : '')} role='status' aria-live='polite'>
        {state === 'working'
          ? (
            <>
              <span className='inline-flex items-center gap-1' aria-hidden='true'>
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className='h-1.5 w-1.5 rounded-full bg-current opacity-60 motion-safe:animate-bounce' style={{ animationDelay: `${delay}ms` }} />
                ))}
              </span>
              <span>{text}</span>
              {sinceS != null && <span className='text-xs tabular-nums opacity-70' aria-hidden='true' data-working-counter=''>{counterText(now - sinceS)}</span>}
            </>
            )
          : (
            <>
              <span aria-hidden='true'>{said(false)}</span>
              <span className='sr-only'>{said(true)}</span>
              {' '}<span>{tx('status.kept')}</span>
            </>
            )}
      </div>
    </div>
  );
}
