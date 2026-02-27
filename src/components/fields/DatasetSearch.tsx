import { useState, useRef, useEffect, useCallback } from 'react';
import { getHDSModel, localizeText } from 'hds-lib';
import type { FieldProps } from '../../types';

const l = localizeText;

interface DatasetSearchProps extends FieldProps {
  datasource: string;
}

export function DatasetSearch ({ label, description, value, onChange, required, disabled, datasource }: DatasetSearchProps) {
  // forKey with throwErrorIfNotFound=true (default) throws if not found, so config is never null
  const config = getHDSModel().datasources.forKey(datasource)!;
  const minQueryLength = config.minQueryLength || 3;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside (e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(async (text: string) => {
    if (text.length < minQueryLength) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const url = `${config.endpoint}?${config.queryParam}=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      const items = data[config.resultKey] || [];
      setResults(items);
      setIsOpen(items.length > 0);
    } catch (err) {
      console.error('DatasetSearch fetch error:', err);
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [config, minQueryLength]);

  function handleInputChange (text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 300);
  }

  function handleSelect (item: any) {
    // Extract value fields
    const selected: Record<string, any> = {};
    for (const field of config.valueFields) {
      if (item[field] !== undefined) {
        selected[field] = item[field];
      }
    }
    onChange(selected);

    // Set display text
    const displayLabel = config.displayFields.label;
    const displayText = item[displayLabel];
    setQuery(typeof displayText === 'object' ? l(displayText) || '' : String(displayText || ''));
    setIsOpen(false);
    setResults([]);
  }

  function handleClear () {
    setQuery('');
    onChange(null);
    setResults([]);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className='relative'>
      <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {description && <p className='mb-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
      <div className='relative'>
        <input
          type='text'
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={`Type at least ${minQueryLength} characters to search...`}
          disabled={disabled}
          className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-8 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500'
        />
        {(query || value) && !disabled && (
          <button
            type='button'
            onClick={handleClear}
            className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          >
            &times;
          </button>
        )}
      </div>

      {isLoading && (
        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>Searching...</div>
      )}

      {isOpen && results.length > 0 && (
        <ul className='absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700'>
          {results.map((item, idx) => {
            const itemLabel = item[config.displayFields.label];
            const itemDesc = item[config.displayFields.description];
            const displayLabel = typeof itemLabel === 'object' ? (l(itemLabel) || itemLabel.en || '') : String(itemLabel || '');
            const displayDesc = typeof itemDesc === 'object' ? (l(itemDesc) || itemDesc.en || '') : String(itemDesc || '');
            return (
              <li
                key={idx}
                onClick={() => handleSelect(item)}
                className='cursor-pointer border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600'
              >
                <div className='text-sm font-medium text-gray-900 dark:text-white'>{displayLabel}</div>
                {displayDesc && (
                  <div className='text-xs text-gray-500 dark:text-gray-400'>{displayDesc}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
