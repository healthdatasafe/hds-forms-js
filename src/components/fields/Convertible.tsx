import type { FieldProps } from '../../types';

interface ConvertibleFieldProps extends FieldProps {
  /** Dimension names from the converter engine */
  dimensionNames?: string[];
}

/**
 * Field component for convertible items (euclidian-distance converter engine).
 *
 * Renders the N-D vector as a set of range sliders (0.0–1.0 per dimension).
 * When a source block is present, shows the source method and observation as read-only context.
 */
export function Convertible ({ label, description, value, onChange, dimensionNames, required, disabled }: ConvertibleFieldProps) {
  const data = value?.data ?? value ?? {};
  const source = value?.source;
  const dims = dimensionNames ?? Object.keys(data).filter(k => typeof data[k] === 'number');

  function handleDimChange (dim: string, newVal: number) {
    const newData = { ...data, [dim]: newVal };
    if (source) {
      onChange({ data: newData, source });
    } else {
      onChange(newData);
    }
  }

  return (
    <div>
      <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {description && <p className='mb-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}

      {source && (
        <div className='mb-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400'>
          Source: <span className='font-medium'>{String(source.sourceData)}</span>
          <span className='ml-1 text-gray-400'>({source.key})</span>
        </div>
      )}

      <div className='space-y-2'>
        {dims.map((dim) => {
          const val = typeof data[dim] === 'number' ? data[dim] : 0;
          return (
            <div key={dim} className='flex items-center gap-2'>
              <span className='w-28 text-xs text-gray-700 dark:text-gray-300 truncate' title={dim}>{dim}</span>
              <input
                type='range'
                min='0'
                max='1'
                step='0.05'
                value={val}
                onChange={(e) => handleDimChange(dim, parseFloat(e.target.value))}
                disabled={disabled}
                className='h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary-600 dark:bg-gray-700'
              />
              <span className='w-8 text-right text-xs text-gray-500'>{val.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
