import { eventToShortText, getHDSModel, localizeText } from 'hds-lib';
import { tx } from './labels';
import { btn, cx, small } from './ui';
import type { DocumentValues, ValueEvent } from './documentValues';

function valueName (e: ValueEvent): string {
  try {
    const def = getHDSModel().itemsDefs.forEvent(e as any, false);
    if (def != null) return localizeText(def.data.label) ?? '';
  } catch { /* the model not loaded: the value alone */ }
  return '';
}

function valueText (e: ValueEvent): string {
  try {
    const t = eventToShortText(e as any);
    return typeof t === 'string' ? t : '';
  } catch {
    return '';
  }
}

export interface DocumentValuesListProps {
  values: DocumentValues;
  /** A value opens (the host's entry view) */
  onOpenValue?: (eventId: string) => void;
  /** Its day in the host's words */
  dayText?: (time: number) => string;
  className?: string;
}

/**
 * The values of a document under it: "Read from this document (n)" and "Also printed here (n)", the second "already in
 * your record, not from this document". Nothing when both are empty.
 */
export function DocumentValuesList ({ values, onOpenValue, dayText, className }: DocumentValuesListProps) {
  if (values.source.length === 0 && values.matched.length === 0) return null;
  const row = (e: ValueEvent) => {
    const name = valueName(e);
    const text = [name, valueText(e)].filter((s) => s !== '').join(': ');
    return (
      <li key={e.id} className='text-sm' data-value-event={e.id}>
        {onOpenValue != null
          ? <button type='button' className={cx(btn.link, 'text-left')} onClick={() => onOpenValue(e.id)}>{text}</button>
          : <span>{text}</span>}
        {dayText != null && <span className={cx(small, 'ml-2')}>{dayText(e.time)}</span>}
      </li>
    );
  };
  return (
    <div className={cx('space-y-3', className)} data-document-values=''>
      {values.source.length > 0 && (
        <section>
          <h3 className='text-sm font-semibold'>{tx('values.source', { n: values.source.length })}</h3>
          <ul className='mt-1 space-y-1'>{values.source.map(row)}</ul>
        </section>
      )}
      {values.matched.length > 0 && (
        <section>
          <h3 className='text-sm font-semibold'>{tx('values.matched', { n: values.matched.length })}</h3>
          <p className={small}>{tx('values.matchedHint')}</p>
          <ul className='mt-1 space-y-1'>{values.matched.map(row)}</ul>
        </section>
      )}
    </div>
  );
}
