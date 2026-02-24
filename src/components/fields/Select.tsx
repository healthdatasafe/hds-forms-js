import type { FieldProps } from '../../types';

interface SelectFieldProps extends FieldProps {
  options: Array<{ value: string | number; label: string }>;
}

export function Select ({ label, description, value, onChange, options, required, disabled }: SelectFieldProps) {
  return (
    <div>
      <label className='mb-1 block text-sm font-medium text-gray-900'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {description && <p className='mb-1 text-sm text-gray-500'>{description}</p>}
      <select
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          // Preserve number type if options use numbers
          const numVal = Number(val);
          onChange(val === '' ? null : (isNaN(numVal) ? val : numVal));
        }}
        required={required}
        disabled={disabled}
        className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500'
      >
        <option value=''>--</option>
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
