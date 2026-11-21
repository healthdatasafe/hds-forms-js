import { tx } from './labels';
import { bubbleIn, cx } from './ui';

export interface ContactWorkingIndicatorProps {
  contactName: string;
  /** The latest `task-status` (`hds.status`): `received` and `reading` say what is going on; any other, "working" */
  status?: string | null;
  /** The document the contact works on, as the host names it */
  documentTitle?: string | null;
  className?: string;
  /** Replaces the bubble's own classes, so it looks like the host's other bubbles from the contact */
  bubbleClassName?: string;
}

/**
 * The standard "working" indicator of a conversation, as a typing indicator from the contact: three moving dots and
 * what it does ("HDS Reader is reading “Lab report”…"), on the contact's side at the end of the thread. The host shows
 * it while the contact's latest status of a document is in progress (`isWorking`) and removes it on the next one.
 * Announced politely to screen readers; the dots stand still when the person asks for reduced motion.
 */
export function ContactWorkingIndicator ({ contactName, status, documentTitle, className, bubbleClassName }: ContactWorkingIndicatorProps) {
  const vars = { name: contactName, title: documentTitle ?? '' };
  const doc = documentTitle != null && documentTitle !== '';
  const text = status === 'received'
    ? tx(doc ? 'working.received' : 'working.receivedNoTitle', vars)
    : status === 'reading'
      ? tx(doc ? 'working.reading' : 'working.readingNoTitle', vars)
      : tx(doc ? 'working.other' : 'working.otherNoTitle', vars);
  return (
    <div className={cx('flex justify-start', className)} data-working-indicator=''>
      <div className={cx(bubbleClassName ?? bubbleIn, 'inline-flex items-center gap-2')} role='status' aria-live='polite'>
        <span className='inline-flex items-center gap-1' aria-hidden='true'>
          {[0, 150, 300].map((delay) => (
            <span key={delay} className='h-1.5 w-1.5 rounded-full bg-current opacity-60 motion-safe:animate-bounce' style={{ animationDelay: `${delay}ms` }} />
          ))}
        </span>
        <span>{text}</span>
      </div>
    </div>
  );
}
