import { useEffect, useId, useRef, useState } from 'react';
import { localizeText } from 'hds-lib';
import type { FieldProps } from '../../types';
import type { ValueDisplay } from '../../schema/schemas';
import { toDisplayText, toDisplayNumber, toRawValue, numberInputStep } from '../../schema/valueDisplay';

const l = localizeText;

interface NumberInputProps extends FieldProps {
  /** Unit symbol to display (e.g. 'Kg', 'lb', 'IU/L') */
  unit?: string;
  /** UI-only display scaling of the raw value. `display.suffix` overrides `unit` when set. */
  display?: ValueDisplay;
  /** Lower bound in the RAW (stored) scale, from the item definition. */
  min?: number;
  /** Upper bound in the raw scale. */
  max?: number;
  /** Step increment in the raw scale. */
  step?: number;
  /**
   * Least decimals the field steps by when no `step` is declared, in the display scale
   * (e.g. 2 for a basal temperature: the arrows move 36.50 → 36.51). Defaults to
   * `display.precision`. Only the step: the value is not reformatted.
   */
  precision?: number;
}

export function NumberInput ({ label, description, value, onChange, required, disabled, unit, display, min, max, step, precision }: NumberInputProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
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

  // Bounds arrive in the raw stored scale and the input is display-scaled, so they must be
  // converted before reaching the DOM: an item storing 0..1 and rendering as a percentage
  // needs max="100", not max="1". `undefined` makes React omit the attribute.
  const displayMin = toDisplayNumber(min, display);
  const displayMax = toDisplayNumber(max, display);
  // Steps by the decimals the value is written with (36.52 → 0.01), so the arrows move the
  // digits most likely to change from one day to the next; `any` when nothing is declared or typed.
  const displayStep = numberInputStep({ step, precision: precision ?? display?.precision, display, text, displayMin });

  return (
    <div>
      <label htmlFor={id} className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {description && <p id={descriptionId} className='mb-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
      <div className='flex items-center gap-2'>
        <input
          id={id}
          type='number'
          aria-describedby={description ? descriptionId : undefined}
          value={text}
          onFocus={() => { focused.current = true; }}
          onBlur={() => {
            focused.current = false;
            setText(displayText);
          }}
          onChange={(e) => handleChange(e.target.value)}
          required={required}
          disabled={disabled}
          min={displayMin}
          max={displayMax}
          // Without a step, `<input type="number">` defaults to 1 per the HTML spec, so 72.5 kg
          // or an HbA1c of 5.4% would be a stepMismatch and block submission. Only one item in
          // the model declares a step today; `numberInputStep` never returns a step a typed
          // value would mismatch (see there).
          step={displayStep}
          className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500'
        />
        {shownUnit && (
          <span className='shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400'>{shownUnit}</span>
        )}
      </div>
    </div>
  );
}
