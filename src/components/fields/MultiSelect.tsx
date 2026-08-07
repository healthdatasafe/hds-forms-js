import type { FieldProps } from '../../types';

interface MultiSelectFieldProps extends FieldProps {
  options: Array<{ value: string; label: string }>;
}

/**
 * Checkbox group for `multi-select` items — several options simultaneously true.
 * Value is an array of the chosen option values; empty selection is `null` rather
 * than `[]`, matching the other fields' "no answer" representation.
 *
 * A checkbox group rather than `<select multiple>`: the source questionnaires print
 * these as checkbox lists, and multi-select dropdowns are poor on touch.
 */
export function MultiSelect ({ label, description, value, onChange, options, required, disabled }: MultiSelectFieldProps) {
  const selected: string[] = Array.isArray(value) ? value : [];

  function toggle (optValue: string, checked: boolean) {
    // Rebuild from `options` order so the stored array is stable regardless of
    // the order the user ticked boxes in.
    const next = options
      .map((o) => o.value)
      .filter((v) => (v === optValue ? checked : selected.includes(v)));
    onChange(next.length === 0 ? null : next);
  }

  return (
    <fieldset>
      <legend className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-500'> *</span>}
      </legend>
      {description && <p className='mb-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
      <div className='space-y-2'>
        {options.map((opt) => (
          <div key={opt.value} className='flex items-start gap-3'>
            <input
              type='checkbox'
              id={`ms-${opt.value}`}
              checked={selected.includes(opt.value)}
              onChange={(e) => toggle(opt.value, e.target.checked)}
              disabled={disabled}
              className='mt-1 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600'
            />
            <label htmlFor={`ms-${opt.value}`} className='text-sm font-medium text-gray-900 dark:text-gray-300'>
              {opt.label}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
