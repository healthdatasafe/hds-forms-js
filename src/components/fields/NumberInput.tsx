import type { FieldProps } from '../../types';

interface NumberInputProps extends FieldProps {
  /** Unit symbol to display (e.g. 'Kg', 'lb', 'IU/L') */
  unit?: string;
}

export function NumberInput ({ label, description, value, onChange, required, disabled, unit }: NumberInputProps) {
  return (
    <div>
      <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {description && <p className='mb-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
      <div className='flex items-center gap-2'>
        <input
          type='number'
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          required={required}
          disabled={disabled}
          className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500'
        />
        {unit && (
          <span className='shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400'>{unit}</span>
        )}
      </div>
    </div>
  );
}
