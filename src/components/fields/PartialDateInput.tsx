import { useId } from 'react';
import { localizeText } from 'hds-lib';
import type { FieldProps } from '../../types';

type Precision = 'unknown' | 'year' | 'month' | 'day';

const TEXTS = {
  precision: { en: 'how precisely', fr: 'précision' },
  unknown: { en: 'Not known', fr: 'Inconnue' },
  year: { en: 'Year', fr: 'Année' },
  month: { en: 'Month', fr: 'Mois' },
  day: { en: 'Day', fr: 'Jour' }
} as const;

const PARTIAL = /^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$/;

function precisionOf (value: string): Precision {
  if (!PARTIAL.test(value)) return 'unknown';
  return value.length === 4 ? 'year' : value.length === 7 ? 'month' : 'day';
}

const input = 'rounded-lg border border-[color:var(--hds-input,#848c97)] bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white';

/**
 * A date at the precision she knows it: not known (`''`), a year, a month or a day (B-2026-11-21-10: a plain
 * `<input type=date>` showed a stored `2022` or `2024-03` as empty). Changing the precision keeps what still fits
 * (2019-04-12 → 2019-04 → 2019).
 */
export function PartialDateInput ({ label, description, value, onChange, required, disabled }: FieldProps) {
  const id = useId();
  const text = typeof value === 'string' ? value : '';
  const precision = precisionOf(text);
  const thisYear = new Date().getFullYear();
  const l = (t: { en: string; fr: string }) => localizeText(t) || t.en;

  function setPrecision (p: Precision) {
    if (p === 'unknown') return onChange('');
    const [y = String(thisYear), m = '01', d = '01'] = (precision === 'unknown' ? '' : text).split('-').filter(Boolean);
    onChange(p === 'year' ? y : p === 'month' ? `${y}-${m}` : `${y}-${m}-${d}`);
  }

  return (
    <div>
      <label htmlFor={id} className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-600 dark:text-red-300'> *</span>}
      </label>
      {description && <p className='mb-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
      <div className='flex gap-2'>
        <select
          id={id}
          aria-label={`${label}: ${l(TEXTS.precision)}`}
          value={precision}
          disabled={disabled}
          onChange={(e) => setPrecision(e.target.value as Precision)}
          className={`${input} ${precision === 'unknown' ? 'w-full' : 'w-36'}`}
        >
          <option value='unknown'>{l(TEXTS.unknown)}</option>
          <option value='year'>{l(TEXTS.year)}</option>
          <option value='month'>{l(TEXTS.month)}</option>
          <option value='day'>{l(TEXTS.day)}</option>
        </select>
        {precision === 'year' && (
          <select
            aria-label={`${label}: ${l(TEXTS.year)}`}
            value={text}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`${input} w-28`}
          >
            {Array.from({ length: thisYear - 1899 }, (_, i) => String(thisYear - i)).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {precision === 'month' && (
          <input type='month' aria-label={`${label}: ${l(TEXTS.month)}`} value={text} disabled={disabled} onChange={(e) => e.target.value && onChange(e.target.value)} className={`${input} flex-1`} />
        )}
        {precision === 'day' && (
          <input type='date' aria-label={`${label}: ${l(TEXTS.day)}`} value={text} disabled={disabled} onChange={(e) => e.target.value && onChange(e.target.value)} className={`${input} flex-1`} />
        )}
      </div>
    </div>
  );
}
