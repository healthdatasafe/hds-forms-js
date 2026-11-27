import { useId, useState } from 'react';
import { tx } from './labels';
import { splitPrintedName, type RememberedName } from './otherNames';
import { btn, cx, small } from './ui';

export interface RememberNameOfferProps {
  /** The name printed on the document she confirmed is hers, none of her names (`nameToRemember`) */
  printed: string;
  /** Writes it as one of her other names (the host: `contact/other-name-v1` on `other-names`) */
  onRemember: (name: RememberedName) => Promise<void> | void;
  className?: string;
}

const field = 'h-11 w-full rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800';

/**
 * "Remember this name" (data-model 4.47.0, CONVERSATION.md R3): offered after she said by hand that a document whose
 * printed name is none of hers is hers, so her app recognises the next one. Never saved without her: she accepts the
 * name, or changes its parts first. Nothing of it reaches the contact.
 */
export function RememberNameOffer ({ printed, onRemember, className }: RememberNameOfferProps) {
  const [state, setState] = useState<'offer' | 'editing' | 'saving' | 'saved' | 'dismissed' | 'failed'>('offer');
  const guess = splitPrintedName(printed);
  const [given, setGiven] = useState(guess.given ?? '');
  const [family, setFamily] = useState(guess.family ?? '');
  const givenId = useId();
  const familyId = useId();
  if (state === 'dismissed') return null;
  if (state === 'saved') return <p className={cx(small, 'mt-2')} role='status' data-remember-name=''>{tx('rememberName.saved')}</p>;

  const save = async (): Promise<void> => {
    const name: RememberedName = {};
    if (given.trim() !== '') name.given = given.trim();
    if (family.trim() !== '') name.family = family.trim();
    setState('saving');
    try {
      await onRemember(name);
      setState('saved');
    } catch (e) {
      console.warn('[conversation] name not remembered:', e);
      setState('failed');
    }
  };
  const canSave = (given.trim() !== '' || family.trim() !== '') && state !== 'saving';

  return (
    <div className={cx('mt-2 space-y-2', className)} data-remember-name=''>
      <p className='text-sm'>{tx('rememberName.offer', { name: printed })}</p>
      {state === 'offer'
        ? (
          <div className='flex flex-wrap gap-2'>
            <button type='button' className={btn.outline} onClick={() => setState('editing')}>{tx('rememberName.action')}</button>
            <button type='button' className={btn.ghost} onClick={() => setState('dismissed')}>{tx('rememberName.notNow')}</button>
          </div>
          )
        : (
          <>
            <p className={small}>{tx('rememberName.check')}</p>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              <label htmlFor={givenId} className='text-sm'>
                {tx('rememberName.given')}
                <input id={givenId} className={field} value={given} onChange={(e) => setGiven(e.target.value)} />
              </label>
              <label htmlFor={familyId} className='text-sm'>
                {tx('rememberName.family')}
                <input id={familyId} className={field} value={family} onChange={(e) => setFamily(e.target.value)} />
              </label>
            </div>
            {state === 'failed' && <p className='text-sm text-red-700 dark:text-red-400' role='alert'>{tx('failed')}</p>}
            <div className='flex flex-wrap gap-2'>
              <button type='button' className={btn.primary} disabled={!canSave} onClick={() => { save().catch(() => {}); }}>{tx('save')}</button>
              <button type='button' className={btn.ghost} disabled={state === 'saving'} onClick={() => setState('dismissed')}>{tx('cancel')}</button>
            </div>
          </>
          )}
    </div>
  );
}
