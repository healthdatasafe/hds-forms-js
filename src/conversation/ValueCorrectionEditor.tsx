import { useId, useMemo, useState } from 'react';
import { cmcConversation, getHDSModel, localizeText } from 'hds-lib';
import type { ValueCorrection } from 'hds-lib';
import { HDSFormField } from '../components/HDSFormField';
import { tx } from './labels';
import { correctedClientData } from './answers';
import { btn, cx, small } from './ui';

export interface ValueCorrectionEditorProps {
  /** The proposal she corrects: its item stays, its value (and unit, when the item offers several) changes */
  proposal: { itemKey: string; type: string; content: unknown; clientData?: Record<string, unknown> };
  busy?: boolean;
  onSubmit: (c: ValueCorrection) => void;
  onCancel: () => void;
  className?: string;
}

/**
 * The value as she corrects it, with the item's own field (hds-forms `HDSFormField`, prefilled with the proposal) and
 * the item's units. Returns a `ValueCorrection` checked like a proposal (hds-lib `checkValueProposal`, R9); the host
 * writes it through `acceptProposedValues` (with `hdsExtraction.corrected`), never directly. The proposal's flag and
 * interpretation are not carried (they were about the printed value), its reference range only in the same unit. An
 * observation of a charting method is corrected in the method it was read in, whatever her own is: the document's words.
 */
export function ValueCorrectionEditor ({ proposal, busy = false, onSubmit, onCancel, className }: ValueCorrectionEditorProps) {
  const unitId = useId();
  const itemDef = useMemo(() => {
    try { return getHDSModel().itemsDefs.forKey(proposal.itemKey, false); } catch { return null; }
  }, [proposal.itemKey]);
  const units: Array<{ value: string; label: unknown }> = (itemDef?.data as any)?.variations?.eventType?.options ?? [];
  const [type, setType] = useState(proposal.type);
  const [value, setValue] = useState<unknown>(proposal.content);
  const [error, setError] = useState(false);

  if (itemDef == null) return null;
  const readMethod = (proposal.content as any)?.source?.key;

  const submit = (): void => {
    const correction: ValueCorrection = { itemKey: proposal.itemKey, type, content: value, clientData: correctedClientData(proposal, type) };
    if (cmcConversation.checkValueProposal(correction) != null) { setError(true); return; }
    setError(false);
    onSubmit(correction);
  };

  return (
    <form className={cx('mt-2 space-y-3', className)} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <p className='text-sm font-semibold'>{tx('correctTitle')}</p>
      {units.length > 1 && (
        <div>
          <label htmlFor={unitId} className='mb-1 block text-sm font-medium'>{tx('unit')}</label>
          <select id={unitId} value={type} onChange={(e) => setType(e.target.value)} className='h-11 w-full rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800'>
            {units.map((u) => <option key={u.value} value={u.value}>{localizeText(u.label as any) ?? u.value}</option>)}
          </select>
        </div>
      )}
      <HDSFormField itemData={itemDef.data as any} itemKey={proposal.itemKey} value={value} onChange={(v) => { setValue(v); setError(false); }} eventType={type} inputMethod={typeof readMethod === 'string' ? readMethod : undefined} prefilled={false} />
      {error && <p className={cx(small, 'text-red-700 dark:text-red-400')} role='alert'>{tx('failed')}</p>}
      <div className='flex flex-wrap gap-2'>
        <button type='submit' className={btn.primary} disabled={busy}>{tx('save')}</button>
        <button type='button' className={btn.ghost} disabled={busy} onClick={onCancel}>{tx('cancel')}</button>
      </div>
    </form>
  );
}
