import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getHDSModel, localizeText } from 'hds-lib';
import type { FieldProps } from '../../types';
import { getCompanionSchema, extractCompanionDefaults, getEnumLabel, keyToLabel } from '../../schema/companionFields';

const l = localizeText;

interface DatasetSearchProps extends FieldProps {
  datasource: string;
  eventType?: string;
}

/** Resolve a display field name — handles both plain string and LocalizableText */
function resolveFieldName (field: unknown): string {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) return l(field as any) || '';
  return '';
}

const inputClass = 'block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400';

/** Render input fields for a companion object's sub-properties */
function CompanionFields ({ schema, value, onChange, readonlyKeys }: { schema: any; value: any; onChange: (v: any) => void; readonlyKeys?: Set<string> }) {
  if (schema.type !== 'object' || !schema.properties) return null;
  const current = value || {};

  function update (field: string, val: any) {
    const next = { ...current, [field]: val };
    // Remove empty values
    if (val === '' || val === undefined || val === null) delete next[field];
    onChange(Object.keys(next).length > 0 ? next : undefined);
  }

  const entries = Object.entries(schema.properties) as Array<[string, any]>;
  // Separate: inline (number, enum selects, boolean), text (free text, full width below)
  const inlineFields = entries.filter(([, s]) => s.type === 'number' || (s.type === 'string' && s.enum) || s.type === 'boolean');
  const textFields = entries.filter(([, s]) => s.type === 'string' && !s.enum);
  const ro = readonlyKeys || new Set<string>();
  const readonlyClass = 'opacity-60 cursor-not-allowed';

  return (
    <div className='space-y-2'>
      {inlineFields.length > 0 && (
        <div className='flex items-end gap-2'>
          {inlineFields.map(([key, propSchema]) => {
            const locked = ro.has(key);
            return (
              <div key={key} className={propSchema.type === 'number' ? 'w-20 shrink-0' : 'min-w-0 flex-1'} title={propSchema.description || ''}>
                <label className={labelClass}>{keyToLabel(key)}</label>
                {propSchema.type === 'number' && (
                  <input
                    type='number'
                    value={current[key] ?? ''}
                    onChange={e => update(key, e.target.value ? parseFloat(e.target.value) : undefined)}
                    disabled={locked}
                    placeholder='—'
                    className={`${inputClass} ${locked ? readonlyClass : ''}`}
                  />
                )}
                {propSchema.type === 'string' && propSchema.enum && (
                  <select
                    value={current[key] || ''}
                    onChange={e => update(key, e.target.value || undefined)}
                    disabled={locked}
                    className={`${inputClass} ${locked ? readonlyClass : ''}`}
                  >
                    <option value=''>—</option>
                    {propSchema.enum.map((v: string) => (
                      <option key={v} value={v}>{getEnumLabel(v)}</option>
                    ))}
                  </select>
                )}
                {propSchema.type === 'boolean' && (
                  <label className='flex cursor-pointer items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={!!current[key]}
                      onChange={e => update(key, e.target.checked || undefined)}
                      disabled={locked}
                      className={`h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-700 ${locked ? readonlyClass : ''}`}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
      {textFields.map(([key, propSchema]) => {
        const locked = ro.has(key);
        return (
          <div key={key} title={propSchema.description || ''}>
            <label className={labelClass}>{keyToLabel(key)}</label>
            <input
              type='text'
              value={current[key] || ''}
              onChange={e => update(key, e.target.value || undefined)}
              disabled={locked}
              placeholder={propSchema.description || keyToLabel(key)}
              className={`${inputClass} ${locked ? readonlyClass : ''}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export function DatasetSearch ({ label, description, value, onChange, required, disabled, datasource, eventType }: DatasetSearchProps) {
  const config = getHDSModel().datasources.forKey(datasource)!;
  const minQueryLength = config.minQueryLength || 3;
  const companionSchema = useMemo(() => getCompanionSchema(eventType), [eventType]);

  // Extract drug selection and companion data from value
  // Handle both new format {drug: {...}, intake: {...}} and legacy flat format {label, codes, route, ...}
  const hasDatasourceProp = companionSchema && value && value[companionSchema.datasourceProp] !== undefined;
  const drugValue = companionSchema && value
    ? (hasDatasourceProp ? value[companionSchema.datasourceProp] : value)
    : value;
  const companionValues = companionSchema && value
    ? (hasDatasourceProp
        ? Object.fromEntries(companionSchema.companions.map(c => [c.key, value?.[c.key]]).filter(([, v]) => v !== undefined))
        : extractCompanionDefaults(companionSchema, value))
    : {};

  // Edit mode: initial value already has a drug selection — lock the drug, only allow companion edits
  const initialDrugRef = useRef<any>(drugValue);
  const isEditMode = initialDrugRef.current != null;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  // Track which companion sub-keys were pre-filled from datasource (readonly)
  // In edit mode, derive from the drug object itself
  const [prefilledKeys, setPrefilledKeys] = useState<Record<string, Set<string>>>(() => {
    if (!isEditMode || !companionSchema || !initialDrugRef.current) return {};
    const locked: Record<string, Set<string>> = {};
    const prefilled = extractCompanionDefaults(companionSchema, initialDrugRef.current);
    for (const [companionKey, obj] of Object.entries(prefilled)) {
      if (obj && typeof obj === 'object') {
        locked[companionKey] = new Set(Object.keys(obj));
      }
    }
    return locked;
  });
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

  /** Emit combined value: { drug: selected, intake: {...} } or just selected if no companions */
  function emitValue (drug: any, companions?: Record<string, any>) {
    if (!companionSchema || !drug) {
      onChange(drug);
      return;
    }
    const combined: Record<string, any> = { [companionSchema.datasourceProp]: drug };
    if (companions) {
      for (const [k, v] of Object.entries(companions)) {
        if (v !== undefined) combined[k] = v;
      }
    }
    onChange(combined);
  }

  function handleSelect (item: any) {
    const selected: Record<string, any> = {};
    for (const field of config.valueFields) {
      if (item[field] !== undefined) {
        selected[field] = item[field];
      }
    }
    // Merge pre-filled defaults from search result with any existing companion values
    const prefilled = companionSchema ? extractCompanionDefaults(companionSchema, item) : {};
    // Track which sub-keys in each companion were pre-filled (→ readonly)
    const locked: Record<string, Set<string>> = {};
    for (const [companionKey, obj] of Object.entries(prefilled)) {
      if (obj && typeof obj === 'object') {
        locked[companionKey] = new Set(Object.keys(obj));
      }
    }
    setPrefilledKeys(locked);

    const merged = { ...prefilled };
    for (const [k, v] of Object.entries(companionValues)) {
      if (v !== undefined) merged[k] = v;
    }
    emitValue(selected, merged);

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
    setPrefilledKeys({});
    setResults([]);
    setIsOpen(false);
  }

  function handleCompanionChange (companionKey: string, companionValue: any) {
    const newCompanions = { ...companionValues, [companionKey]: companionValue };
    if (companionValue === undefined) delete newCompanions[companionKey];
    emitValue(drugValue, newCompanions);
  }

  const labelField = resolveFieldName(config.displayFields.label);
  const descField = resolveFieldName(config.displayFields.description);

  // In edit mode, resolve the drug display label from the stored value
  const editDrugLabel = useMemo(() => {
    if (!isEditMode || !drugValue) return '';
    const labelField = resolveFieldName(config.displayFields.label);
    const drugLabel = drugValue[labelField];
    return typeof drugLabel === 'object' ? (l(drugLabel) || '') : String(drugLabel || '');
  }, [isEditMode, drugValue, config.displayFields.label]);

  return (
    <div ref={containerRef} className='relative'>
      <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {description && <p className='mb-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}

      {isEditMode
        ? (
          /* Edit mode: show drug name as static text, no search */
          <div className='block w-full rounded-lg border border-gray-300 bg-gray-100 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'>
            {editDrugLabel}
          </div>
          )
        : (
      /* Create mode: search input */
          <>
            <div style={{ position: 'relative' }}>
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
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
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
              <ul className='mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700'>
                {results.map((item, idx) => {
                  const itemLabel = item[labelField];
                  const itemDesc = item[descField];
                  const displayLabel = typeof itemLabel === 'object' ? (l(itemLabel) || itemLabel.en || '') : String(itemLabel || '');
                  const displayDesc = typeof itemDesc === 'object' ? (l(itemDesc) || itemDesc.en || '') : String(itemDesc || '');
                  const systems: string[] = Array.from(new Set((item.codes || []).map((c: any) => String(c.system)).filter(Boolean)));
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
          </>
          )}

      {drugValue && companionSchema && companionSchema.companions.map(({ key, schema }) => {
        if (schema?.type === 'object') {
          return (
            <div key={key} className='mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700'>
              <CompanionFields
                schema={schema}
                value={companionValues[key]}
                onChange={(v) => handleCompanionChange(key, v)}
                readonlyKeys={prefilledKeys[key]}
              />
            </div>
          );
        }
        const cur = companionValues[key];
        const setScalar = (raw: string | boolean | undefined) => {
          if (raw === undefined || raw === '' || raw === null) {
            handleCompanionChange(key, undefined);
            return;
          }
          if (schema?.type === 'number') {
            const n = typeof raw === 'string' ? parseFloat(raw) : NaN;
            handleCompanionChange(key, Number.isFinite(n) ? n : undefined);
          } else {
            handleCompanionChange(key, raw);
          }
        };
        return (
          <div key={key} className='mt-3' title={schema?.description || ''}>
            <label className={labelClass}>{keyToLabel(key)}</label>
            {schema?.type === 'number' && (
              <input
                type='number'
                value={cur ?? ''}
                onChange={e => setScalar(e.target.value)}
                placeholder='—'
                className={inputClass}
              />
            )}
            {schema?.type === 'boolean' && (
              <input
                type='checkbox'
                checked={!!cur}
                onChange={e => setScalar(e.target.checked || undefined)}
                className='h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-700'
              />
            )}
            {schema?.type === 'string' && (
              schema?.enum
                ? (
                  <select
                    value={cur ?? ''}
                    onChange={e => setScalar(e.target.value || undefined)}
                    className={inputClass}
                  >
                    <option value=''>—</option>
                    {schema.enum.map((v: string) => (
                      <option key={v} value={v}>{getEnumLabel(v)}</option>
                    ))}
                  </select>
                )
                : (
                  <input
                    type='text'
                    value={cur ?? ''}
                    onChange={e => setScalar(e.target.value || undefined)}
                    placeholder={schema?.description || keyToLabel(key)}
                    className={inputClass}
                  />
                )
            )}
          </div>
        );
      })}
    </div>
  );
}
