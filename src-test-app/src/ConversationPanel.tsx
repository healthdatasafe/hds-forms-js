import { useEffect, useState } from 'react';
import { settings } from 'hds-lib';
import {
  ConversationAnswerBubble, ContactWorkingIndicator, NoticeBubble, TaskStatusLine, type ConversationViewer
} from 'hds-forms/conversation';

// The standard conversation's read-only components (docs/CONVERSATION-COMPONENTS.md) on fixtures: the person's app and
// a contact's app ("viewer"), en / fr, light / dark. Invented person and contact; nothing is read from an account.

const DOC = 'doc-1';
let seq = 0;
/** One of her answers, as hds-lib's `parseConversationItems` gives it */
function answer (action: string, extra: Record<string, unknown> = {}): any {
  seq += 1;
  return { id: `a${seq}`, streamId: 'conv-sent', direction: 'sent', kind: 'answer', about: DOC, time: 1000 + seq, created: 1000 + seq, modified: 1000 + seq, content: { kind: 'answer', about: DOC, inReplyTo: `q${seq}`, action, ...extra } };
}

const ANSWERS: Array<{ label: string; item: any }> = [
  { label: 'confirm 3 values', item: answer('confirm', { candidateIds: ['c1', 'c2', 'c3'], written: [{ candidateId: 'c1', eventId: 'e1' }] }) },
  { label: 'confirm 1 value, with a note', item: answer('confirm', { candidateIds: ['c4'], written: [{ candidateId: 'c4', eventId: 'e4' }], note: 'I was fasting' }) },
  { label: 'correct', item: answer('correct', { candidateIds: ['c5'] }) },
  { label: 'skip', item: answer('skip', { candidateIds: ['c6'] }) },
  { label: 'duplicate (her app)', item: answer('duplicate', { candidateIds: ['c7', 'c8'], basis: 'existing-value' }) },
  { label: 'is-this-yours (profile match)', item: answer('confirm', { basis: 'profile-match' }) },
  { label: 'not-mine', item: answer('not-mine') },
  { label: 'document date and kind confirmed', item: answer('confirm', { candidateIds: ['d1'], applied: ['time', 'kind'] }) }
];
const STATUSES: Array<{ status: string | null; errorCode?: string; counts?: { proposed?: number; questions?: number } }> = [
  { status: null },
  { status: 'reading' },
  { status: 'awaiting-answers', counts: { proposed: 5, questions: 1 } },
  { status: 'done' },
  { status: 'error', errorCode: 'reading-failed' },
  { status: 'error', errorCode: 'no-attachment' }
];
const NOTICES = ['ready', 'no-result-found', 'several-sampling-dates', 'typed-text-not-read', 'note-not-read'];
/** Work in progress, by how long ago its last news came */
const OPENED_S = Date.now() / 1000;
const WORKING_SINCE: Array<{ status: string; minutes: number }> = [
  { status: 'reading', minutes: 1.2 }, { status: 'sent', minutes: 8 }, { status: 'received', minutes: 12 }, { status: 'received', minutes: 200 }, { status: 'on-hold', minutes: 12 }, { status: 'on-hold', minutes: 1600 }, { status: 'reading', minutes: 15 }, { status: 'reading', minutes: 200 }
];
const CONTACT = 'HDS Reader';
const PERSON = 'Anna';

const toggle = (on: boolean) => `rounded px-3 py-1 text-sm ${on ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`;

export default function ConversationPanel () {
  const [viewer, setViewer] = useState<ConversationViewer>('person');
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  // the components read the language from hds-lib's preferred locales
  const [, setVersion] = useState(0);
  useEffect(() => {
    settings.setPreferredLocales([lang]);
    setVersion((v) => v + 1);
    return () => settings.setPreferredLocales(['en']);
  }, [lang]);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm font-medium text-gray-700 dark:text-gray-200'>Viewer</span>
        <button type='button' className={toggle(viewer === 'person')} onClick={() => setViewer('person')}>Her app</button>
        <button type='button' className={toggle(viewer === 'contact')} onClick={() => setViewer('contact')}>A contact's app</button>
        <span className='ml-4 text-sm font-medium text-gray-700 dark:text-gray-200'>Language</span>
        <button type='button' className={toggle(lang === 'en')} onClick={() => setLang('en')}>en</button>
        <button type='button' className={toggle(lang === 'fr')} onClick={() => setLang('fr')}>fr</button>
        <span className='ml-4 text-sm font-medium text-gray-700 dark:text-gray-200'>Theme</span>
        <button type='button' className={toggle(!dark)} onClick={() => setDark(false)}>light</button>
        <button type='button' className={toggle(dark)} onClick={() => setDark(true)}>dark</button>
      </div>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Her answers (<code>ConversationAnswerBubble</code>)</h2>
        <div className='max-w-xl space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900'>
          {ANSWERS.map(({ label, item }) => (
            <div key={item.id} title={label}>
              <ConversationAnswerBubble answer={item} viewer={viewer} personName={PERSON} timeText='10:42' onOpenValue={(id) => window.alert(`open value ${id}`)} />
            </div>
          ))}
        </div>
      </section>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>The state of the work (<code>TaskStatusLine</code>)</h2>
        <div className='max-w-xl space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900'>
          {STATUSES.map((s) => (
            <TaskStatusLine key={`${s.status}-${s.errorCode ?? ''}`} status={s.status} errorCode={s.errorCode} counts={s.counts} contactName={CONTACT} viewer={viewer} personName={PERSON} />
          ))}
        </div>
      </section>

      {viewer === 'person' && (
        <section className='space-y-2'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>From the contact (<code>NoticeBubble</code>, <code>ContactWorkingIndicator</code>)</h2>
          <div className='max-w-xl space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900'>
            {NOTICES.map((code) => <NoticeBubble key={code} code={code} contactName={CONTACT} timeText='10:40' />)}
            <ContactWorkingIndicator contactName={CONTACT} status='reading' documentTitle='Blood test March 2026' />
            {WORKING_SINCE.map(({ status, minutes }) => (
              <ContactWorkingIndicator key={`${status}-${minutes}`} contactName={CONTACT} status={status} documentTitle='Blood test March 2026' sinceS={OPENED_S - minutes * 60} locale={lang} />
            ))}
          </div>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>In progress, then no news (<code>TaskStatusLine</code> with <code>sinceS</code>)</h2>
          <div className='max-w-xl space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900'>
            {WORKING_SINCE.map(({ status, minutes }) => (
              <TaskStatusLine key={`${status}-${minutes}`} status={status === 'sent' ? null : status} contactName={CONTACT} sinceS={OPENED_S - minutes * 60} locale={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
