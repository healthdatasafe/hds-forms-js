import { useId } from 'react';
import type { StepFiling } from './conversationRun';
import { tx } from './labels';
import { small } from './ui';

export interface StepFilingChoiceProps {
  filing: StepFiling;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** Where the document goes as she confirms its kind, who newly sees it there and who no longer does, with the tick that says so */
export function StepFilingChoice ({ filing, checked, disabled = false, onChange }: StepFilingChoiceProps) {
  const id = useId();
  const { label, gains, loses, complete } = filing;
  return (
    <div className='space-y-1' data-step-filing={filing.place}>
      <label className='flex min-h-11 cursor-pointer items-center gap-2 text-sm'>
        <input type='checkbox' checked={checked} disabled={disabled} aria-describedby={id} onChange={(e) => onChange(e.target.checked)} className='h-5 w-5 shrink-0' />
        <span>{tx('document.file', { place: label })}</span>
      </label>
      <div id={id} className='space-y-1' aria-live='polite'>
        {gains.length > 0 && <p className='text-xs font-medium text-amber-700 dark:text-amber-400'>{tx('document.fileGains', { names: gains.join(', ') })}</p>}
        {loses.length > 0 && <p className='text-xs font-medium text-amber-700 dark:text-amber-400'>{tx('document.fileLoses', { names: loses.join(', ') })}</p>}
        {!complete && <p className='text-xs font-medium text-amber-700 dark:text-amber-400'>{tx('document.fileNotAllKnown')}</p>}
        {complete && gains.length === 0 && loses.length === 0 && <p className={small}>{tx('document.fileSame')}</p>}
      </div>
    </div>
  );
}
