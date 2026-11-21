import { useId, useState } from 'react';
import type { DocumentFields } from './conversationRun';
import { dayToTime, documentKindOptions, tx } from './labels';
import { btn } from './ui';

export interface DocumentFieldsEditorProps {
  /** The document's fields still waiting (`pendingFieldsOf`): only those are offered */
  pending: ReadonlyArray<'time' | 'kind'>;
  /** The contact's proposal (`proposed-document.proposal`), as the starting values */
  proposal?: { documentKind?: string; time?: number; timePrecision?: string } | null;
  busy?: boolean;
  /** Only what she changed (hds-lib `DocumentFields`): a kind key, a day, or `timePrecision: 'unknown'` */
  onSubmit: (correction: DocumentFields) => void;
  onCancel: () => void;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Her own date and kind for a document, instead of the contact's proposal: the pack's kinds (not deprecated), a day, or
 * "I do not know the date". Only the fields still waiting on the document are offered; only what she changed is sent.
 */
export function DocumentFieldsEditor ({ pending, proposal, busy = false, onSubmit, onCancel }: DocumentFieldsEditorProps) {
  const kindId = useId();
  const dayId = useId();
  const initialDay = typeof proposal?.time === 'number' && proposal.timePrecision === 'day' ? new Date(proposal.time * 1000).toISOString().slice(0, 10) : '';
  const [kind, setKind] = useState(proposal?.documentKind ?? '');
  const [day, setDay] = useState(initialDay);
  const [unknownDate, setUnknownDate] = useState(false);
  const kinds = documentKindOptions();
  const correction: DocumentFields = {};
  if (pending.includes('kind') && kind !== '' && kind !== proposal?.documentKind) correction.documentKind = kind;
  if (pending.includes('time')) {
    if (unknownDate) correction.timePrecision = 'unknown';
    else if (DAY.test(day) && day !== initialDay) { correction.time = dayToTime(day); correction.timePrecision = 'day'; }
  }
  const changed = Object.keys(correction).length > 0;
  return (
    <div className='space-y-2' data-document-fields-editor=''>
      {pending.includes('kind') && (
        <div className='flex flex-wrap items-center gap-2'>
          <label htmlFor={kindId} className='text-sm font-medium'>{tx('document.kind')}</label>
          <select id={kindId} value={kind} onChange={(e) => setKind(e.target.value)} className='h-11 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800'>
            <option value='' disabled>—</option>
            {kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </div>
      )}
      {pending.includes('time') && (
        <div className='flex flex-wrap items-center gap-2'>
          <label htmlFor={dayId} className='text-sm font-medium'>{tx('document.date')}</label>
          <input id={dayId} type='date' value={day} disabled={unknownDate} onChange={(e) => setDay(e.target.value)} className='h-11 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800' />
          <label className='inline-flex items-center gap-1 text-sm'>
            <input type='checkbox' checked={unknownDate} onChange={(e) => setUnknownDate(e.target.checked)} />
            {tx('document.dateUnknown')}
          </label>
        </div>
      )}
      <div className='flex flex-wrap gap-2'>
        <button type='button' className={btn.primary} disabled={busy || !changed} onClick={() => onSubmit(correction)}>{tx('save')}</button>
        <button type='button' className={btn.ghost} disabled={busy} onClick={onCancel}>{tx('cancel')}</button>
      </div>
    </div>
  );
}
