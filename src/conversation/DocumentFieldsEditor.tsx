import { useId, useState } from 'react';
import type { DocumentFields, StepFiling } from './conversationRun';
import { dayToTime, documentKindOptions, tx } from './labels';
import { StepFilingChoice } from './StepFilingChoice';
import { useStepFiling, type StepFilingTick } from './useStepFiling';
import { btn } from './ui';

export interface DocumentFieldsEditorProps {
  /** The document's fields still waiting (`pendingFieldsOf`): only those are offered */
  pending: ReadonlyArray<'time' | 'kind'>;
  /** The contact's proposal (`proposed-document.proposal`), as the starting values */
  proposal?: { documentKind?: string; time?: number; timePrecision?: string } | null;
  /**
   * Starting values that are hers (e.g. read from the file by the host): shown in place of the proposal's and sent on Save
   * unless she clears or changes them, so Save confirms them. A kind given here can be declined ("—", then no kind is
   * sent). A kind the pack does not offer (unknown or deprecated), or a day that is not a real `YYYY-MM-DD` date, is
   * ignored. Read once, when the editor mounts.
   */
  initial?: { documentKind?: string; day?: string } | null;
  busy?: boolean;
  /** What filing it under a kind would do (`ConversationStepBubble`); null: not offered for that kind */
  filingOf?: (documentKind: string) => StepFiling | null;
  /** The step's own tick and its key (`ConversationStepBubble`): what she chose on the step holds here too, for the same place and readers */
  filingTick?: { stepKey: string; tick: [StepFilingTick, (tick: StepFilingTick) => void] };
  /** What she changed, plus the `initial` values she kept (hds-lib `DocumentFields`): a kind key, a day, or `timePrecision: 'unknown'`; `filing` when she ticked it */
  onSubmit: (correction: DocumentFields, filing?: StepFiling) => void;
  onCancel: () => void;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day as `YYYY-MM-DD` (not `2021-02-31`, not `2021-13-01`) */
function isDay (day: string): boolean {
  if (!DAY.test(day)) return false;
  const time = dayToTime(day);
  return Number.isFinite(time) && new Date(time * 1000).toISOString().slice(0, 10) === day;
}

/**
 * Her own date and kind for a document, instead of the contact's proposal: the pack's kinds (not deprecated), a day, or
 * "I do not know the date". Only the fields still waiting on the document are offered; what she changed is sent, plus
 * the `initial` values she kept.
 */
export function DocumentFieldsEditor ({ pending, proposal, initial, busy = false, filingOf, filingTick, onSubmit, onCancel }: DocumentFieldsEditorProps) {
  const kindId = useId();
  const dayId = useId();
  const kinds = documentKindOptions();
  const proposalDay = typeof proposal?.time === 'number' && proposal.timePrecision === 'day' ? new Date(proposal.time * 1000).toISOString().slice(0, 10) : '';
  const [{ herKind, herDay }] = useState(() => ({
    herKind: initial?.documentKind != null && kinds.some((k) => k.key === initial.documentKind) ? initial.documentKind : null,
    herDay: initial?.day != null && isDay(initial.day) ? initial.day : null
  }));
  const [kind, setKind] = useState(herKind ?? proposal?.documentKind ?? '');
  const [day, setDay] = useState(herDay ?? proposalDay);
  const [unknownDate, setUnknownDate] = useState(false);
  const correction: DocumentFields = {};
  if (pending.includes('kind') && kind !== '' && (herKind != null || kind !== proposal?.documentKind)) correction.documentKind = kind;
  if (pending.includes('time')) {
    if (unknownDate) correction.timePrecision = 'unknown';
    else if (DAY.test(day) && (herDay != null || day !== proposalDay)) { correction.time = dayToTime(day); correction.timePrecision = 'day'; }
  }
  const changed = Object.keys(correction).length > 0;
  const filing = pending.includes('kind') && kind !== '' ? filingOf?.(kind) ?? null : null;
  const file = useStepFiling(filingTick?.stepKey ?? 'editor', filing, filingTick?.tick);
  return (
    <div className='space-y-2' data-document-fields-editor=''>
      {pending.includes('kind') && (
        <div className='flex flex-wrap items-center gap-2'>
          <label htmlFor={kindId} className='text-sm font-medium'>{tx('document.kind')}</label>
          <select id={kindId} value={kind} onChange={(e) => setKind(e.target.value)} className='h-11 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800'>
            {/* a kind given by `initial` (read from the file) can be declined: "—" sends no kind */}
            <option value='' disabled={herKind == null}>—</option>
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
      {filing != null && <StepFilingChoice filing={filing} checked={file.checked} disabled={busy} onChange={(checked) => file.setChecked(checked)} />}
      <div className='flex flex-wrap gap-2'>
        <button type='button' className={btn.primary} disabled={busy || !changed} onClick={() => onSubmit(correction, file.chosen)}>{tx('save')}</button>
        <button type='button' className={btn.ghost} disabled={busy} onClick={onCancel}>{tx('cancel')}</button>
      </div>
    </div>
  );
}
