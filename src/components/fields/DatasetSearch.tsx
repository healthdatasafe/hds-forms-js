import { useState, useRef, useEffect, useCallback } from 'react';
import { getHDSModel, localizeText } from 'hds-lib';
import type { FieldProps } from '../../types';

const l = localizeText;

interface DatasetSearchProps extends FieldProps {
  datasource: string;
}

/** Resolve a display field name — handles both plain string and LocalizableText */
function resolveFieldName (field: unknown): string {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) return l(field as any) || '';
  return '';
}

export function DatasetSearch ({ label, description, value, onChange, required, disabled, datasource }: DatasetSearchProps) {
  const config = getHDSModel().datasources.forKey(datasource)!;
  const minQueryLength = config.minQueryLength || 3;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastQueryRef = useRef('');

  // Fetch available sources from {endpoint}/sources
  useEffect(() => {
    fetch(`${config.endpoint}/sources`)
      .then(res => res.json())
      .then(data => {
        const sources = Object.keys(data.sources || {});
        setAvailableSources(sources);
        setSelectedSources(new Set(sources));
      })
      .catch(() => {}); // silently ignore if /sources not available
  }, [config.endpoint]);

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
      let url = `${config.endpoint}?${config.queryParam}=${encodeURIComponent(text)}`;
      if (selectedSources.size > 0 && selectedSources.size < availableSources.length) {
        url += `&system=${[...selectedSources].join(',')}`;
      }
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
  }, [config, minQueryLength, selectedSources, availableSources.length]);

  function handleInputChange (text: string) {
    setQuery(text);
    lastQueryRef.current = text;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 300);
  }

  function toggleSource (source: string) {
    setSelectedSources(prev => {
      const next = new Set(prev);
      if (next.has(source)) {
        if (next.size > 1) next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }

  // Re-search when source filter changes
  useEffect(() => {
    if (lastQueryRef.current.length >= minQueryLength) {
      doSearch(lastQueryRef.current);
    }
  }, [selectedSources]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect (item: any) {
    const selected: Record<string, any> = {};
    for (const field of config.valueFields) {
      if (item[field] !== undefined) {
        selected[field] = item[field];
      }
    }
    onChange(selected);

    const fieldName = resolveFieldName(config.displayFields.label);
    const displayText = item[fieldName];
    setQuery(typeof displayText === 'object' ? l(displayText) || '' : String(displayText || ''));
    setIsOpen(false);
    setResults([]);
  }

  function handleClear () {
    setQuery('');
    lastQueryRef.current = '';
    onChange(null);
    setResults([]);
    setIsOpen(false);
  }

  const labelField = resolveFieldName(config.displayFields.label);
  const descField = resolveFieldName(config.displayFields.description);

  return (
    <div ref={containerRef} className='relative overflow-visible'>
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

      {availableSources.length > 1 && (
        <div className='mt-1 flex items-center gap-3'>
          {availableSources.map(source => {
            const active = selectedSources.has(source);
            return (
              <label key={source} className='flex cursor-pointer items-center gap-1 select-none'>
                <input
                  type='checkbox'
                  checked={active}
                  onChange={() => toggleSource(source)}
                  className='h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-1 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-700'
                />
                <span className={`text-xs ${active ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 line-through dark:text-gray-600'}`}>
                  {source}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>Searching...</div>
      )}

      {isOpen && results.length > 0 && (
        <ul className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700'>
          {results.map((item, idx) => {
            const itemLabel = item[labelField];
            const itemDesc = item[descField];
            const displayLabel = typeof itemLabel === 'object' ? (l(itemLabel) || itemLabel.en || '') : String(itemLabel || '');
            const displayDesc = typeof itemDesc === 'object' ? (l(itemDesc) || itemDesc.en || '') : String(itemDesc || '');
            const systems = [...new Set((item.codes || []).map((c: any) => c.system).filter(Boolean))];
            return (
              <li
                key={idx}
                onClick={() => handleSelect(item)}
                className='cursor-pointer border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600'
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='text-sm font-medium text-gray-900 dark:text-white'>{displayLabel}</div>
                    {displayDesc && (
                      <div className='text-xs text-gray-500 dark:text-gray-400'>{displayDesc}</div>
                    )}
                  </div>
                  {systems.length > 0 && (
                    <div className='flex shrink-0 gap-1'>
                      {systems.map(s => (
                        <span key={s} className='rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-600 dark:text-gray-300'>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
