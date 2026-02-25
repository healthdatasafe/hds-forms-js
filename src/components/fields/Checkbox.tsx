import type { FieldProps } from '../../types';

export function Checkbox ({ label, description, value, onChange, disabled }: FieldProps) {
  return (
    <div className='flex items-start gap-3'>
      <input
        type='checkbox'
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className='mt-1 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600'
      />
      <div>
        <label className='text-sm font-medium text-gray-900 dark:text-gray-300'>{label}</label>
        {description && <p className='text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
      </div>
    </div>
  );
}
