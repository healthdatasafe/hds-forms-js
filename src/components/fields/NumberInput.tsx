import { useEffect, useRef, useState } from 'react';
import { localizeText } from 'hds-lib';
import type { FieldProps } from '../../types';
import type { ValueDisplay } from '../../schema/schemas';
import { toDisplayText, toRawValue } from '../../schema/valueDisplay';

const l = localizeText;

interface NumberInputProps extends FieldProps {
  /** Unit symbol to display (e.g. 'Kg', 'lb', 'IU/L') */
  unit?: string;
  /** UI-only display scaling of the raw value. `display.suffix` overrides `unit` when set. */
  display?: ValueDisplay;
}

export function NumberInput ({ label, description, value, onChange, required, disabled, unit, display }: NumberInputProps) {
  // The input is text-backed rather than driven straight off `value`: with a multiplier,
  // round-tripping every keystroke through raw storage destroys in-progress input — "5."
  // parses to 5 and the trailing dot vanishes, so a decimal can never be typed.
  const displayText = toDisplayText(value as number, display);
  const [text, setText] = useState<string>(displayText);
  const focused = useRef(false);

  // Re-sync from the outside (prefill, unit switch, reset) — but never while the user is
  // mid-edit, or their keystrokes would be overwritten.
  useEffect(() => {
    if (focused.current) return;
    setText(displayText);
  }, [displayText]);

  function handleChange (next: string) {
    setText(next);
    const raw = toRawValue(next, display);
    if (raw === undefined) return; // transient ("-", "1e") — keep the text, don't store
    onChange(raw);
  }

  const suffix = display?.suffix ? (l(display.suffix) || undefined) : undefined;
  const shownUnit = suffix ?? unit;

  return (
    <div>
      <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {description && <p className='mb-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
      <div className='flex items-center gap-2'>
        <input
          type='number'
          value={text}
          onFocus={() => { focused.current = true; }}
          onBlur={() => {
            focused.current = false;
            setText(displayText);
          }}
          onChange={(e) => handleChange(e.target.value)}
          required={required}
          disabled={disabled}
          className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500'
        />
        {shownUnit && (
          <span className='shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400'>{shownUnit}</span>
        )}
      </div>
    </div>
  );
}
