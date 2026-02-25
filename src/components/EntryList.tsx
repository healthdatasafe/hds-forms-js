import type { SectionEntry } from '../types';

interface EntryListProps {
  entries: SectionEntry[];
  itemKeys: string[];
  fieldLabels: Record<string, string>;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

function formatDate (timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatValue (val: any): string {
  if (val == null) return '—';
  if (typeof val === 'boolean') return val ? '✓' : '✗';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function EntryList ({ entries, itemKeys, fieldLabels, onEdit, onDelete }: EntryListProps) {
  if (entries.length === 0) return null;

  return (
    <div className='mt-4'>
      <h4 className='mb-2 text-sm font-medium text-gray-700 dark:text-gray-300'>Previous entries</h4>
      <div className='overflow-x-auto'>
        <table className='w-full text-left text-sm text-gray-700 dark:text-gray-300'>
          <thead className='bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-400'>
            <tr>
              <th className='px-3 py-2'>Date</th>
              {itemKeys.map(key => (
                <th key={key} className='px-3 py-2'>{fieldLabels[key] || key}</th>
              ))}
              <th className='px-3 py-2 text-right'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={index} className='border-b border-gray-200 dark:border-gray-600'>
                <td className='px-3 py-2 whitespace-nowrap'>{formatDate(entry.time)}</td>
                {itemKeys.map(key => (
                  <td key={key} className='px-3 py-2'>{formatValue(entry.values[key])}</td>
                ))}
                <td className='px-3 py-2 text-right whitespace-nowrap'>
                  <button
                    type='button'
                    onClick={() => onEdit(index)}
                    className='mr-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300'
                    title='Edit'
                  >
                    ✎
                  </button>
                  <button
                    type='button'
                    onClick={() => onDelete(index)}
                    className='text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                    title='Delete'
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
