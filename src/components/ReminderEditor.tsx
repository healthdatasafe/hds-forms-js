import { useState } from 'react';
import { localizeText as l } from 'hds-lib';
import { fill } from '../textUtils';
import { REMINDER_TEXTS as T } from './builderTexts';

export interface ReminderEditorConfig {
  enabled?: boolean;
  cooldown?: string;
  expectedInterval?: { min?: string; max?: string };
  relativeTo?: string;
  relativeDays?: number[];
  importance?: 'may' | 'should' | 'must';
}

interface ReminderEditorProps {
  /** Default reminder from data-model (itemDef.reminder), read-only reference */
  defaultReminder: ReminderEditorConfig | null;
  /** Current collector override (from itemCustomizations.reminder) */
  override: Partial<ReminderEditorConfig> | undefined;
  /** Called when the doctor changes the override */
  onChange: (reminder: Partial<ReminderEditorConfig> | undefined) => void;
  /** Available item keys for relativeTo references (other items in form) */
  availableItemKeys?: Array<{ key: string; label: string }>;
}

const DURATIONS = ['PT8H', 'P1D', 'P2D', 'P1W', 'P2W', 'P21D', 'P1M', 'P35D', 'P3M', 'P6M', 'P1Y'] as const;
const IMPORTANCES = ['may', 'should', 'must'] as const;

const IMPORTANCE_WORDS = { may: T.importanceMay, should: T.importanceShould, must: T.importanceMust };
const IMPORTANCE_OPTIONS = { may: T.importanceMayOption, should: T.importanceShouldOption, must: T.importanceMustOption };

/** The importance as one word; a value this version does not know is shown as it is */
function importanceWord (importance: string): string {
  const text = (IMPORTANCE_WORDS as Record<string, { en: string; fr: string } | undefined>)[importance];
  return text ? l(text) : importance;
}

const durationOptions = () => (
  <>
    <option value=''>—</option>
    {DURATIONS.map(d => (
      <option key={d} value={d}>{l(T[`duration.${d}`])}</option>
    ))}
  </>
);

type ReminderType = 'none' | 'cooldown' | 'interval' | 'relative';

/** Detect the reminder type from a config */
function detectType (config: Partial<ReminderEditorConfig> | null | undefined): ReminderType {
  if (!config) return 'none';
  if (config.relativeTo) return 'relative';
  if (config.expectedInterval) return 'interval';
  if (config.cooldown) return 'cooldown';
  return 'none';
}

function describeDefault (config: ReminderEditorConfig | null): string {
  if (!config) return 'none';
  const parts: string[] = [];
  if (config.cooldown) parts.push(fill(l(T.describeCooldown), { value: config.cooldown }));
  if (config.expectedInterval) {
    const { min, max } = config.expectedInterval;
    parts.push(fill(l(T.describeInterval), { min: min || '?', max: max || '?' }));
  }
  if (config.relativeTo) {
    parts.push(fill(l(T.describeRelative), { item: config.relativeTo, days: String(config.relativeDays?.join(', ')) }));
  }
  if (config.importance) parts.push(importanceWord(config.importance));
  return parts.join(', ') || l(T.describeNoTiming);
}

const selectClass = 'rounded border border-[color:var(--hds-input,#848c97)] bg-white px-1 py-0.5 text-xs text-gray-900 dark:bg-gray-800 dark:text-white';
const inputClass = 'w-20 rounded border border-[color:var(--hds-input,#848c97)] bg-white px-1 py-0.5 text-xs text-gray-900 dark:bg-gray-800 dark:text-white';
const labelClass = 'text-gray-500 dark:text-gray-400';

export function ReminderEditor ({ defaultReminder, override, onChange, availableItemKeys }: ReminderEditorProps) {
  const effective = override || defaultReminder;
  const [enabled, setEnabled] = useState(
    override?.enabled === false ? false : (override != null || defaultReminder != null)
  );
  const [type, setType] = useState<ReminderType>(() => {
    if (override) {
      const t = detectType(override);
      if (t !== 'none') return t;
    }
    const t = detectType(defaultReminder);
    return t !== 'none' ? t : 'cooldown';
  });

  function handleToggle (checked: boolean) {
    setEnabled(checked);
    if (!checked) {
      if (defaultReminder) {
        onChange({ enabled: false });
      } else {
        onChange(undefined);
      }
    } else {
      onChange(undefined);
    }
  }

  function update (patch: Partial<ReminderEditorConfig>) {
    const current = override || {};
    const next = { ...current, ...patch };
    // Clean empty string values
    for (const [k, v] of Object.entries(next)) {
      if (v === '' || v === undefined) delete (next as any)[k];
    }
    onChange(Object.keys(next).length === 0 ? undefined : next);
  }

  function handleTypeChange (newType: ReminderType) {
    setType(newType);
    // Reset type-specific fields, keep importance
    const imp = override?.importance;
    const base: Partial<ReminderEditorConfig> = {};
    if (imp) base.importance = imp;
    if (newType === 'cooldown') {
      base.cooldown = override?.cooldown || defaultReminder?.cooldown || 'P1D';
    } else if (newType === 'interval') {
      base.expectedInterval = override?.expectedInterval || defaultReminder?.expectedInterval || { min: 'P1W', max: 'P1M' };
      if (override?.cooldown || defaultReminder?.cooldown) base.cooldown = override?.cooldown || defaultReminder?.cooldown;
    } else if (newType === 'relative') {
      base.relativeTo = override?.relativeTo || defaultReminder?.relativeTo || '';
      base.relativeDays = override?.relativeDays || defaultReminder?.relativeDays || [1, 2, 3];
    }
    onChange(Object.keys(base).length === 0 ? undefined : base);
  }

  function updateInterval (field: 'min' | 'max', value: string) {
    const current = override?.expectedInterval || defaultReminder?.expectedInterval || {};
    update({ expectedInterval: { ...current, [field]: value || undefined } });
  }

  function updateRelativeDays (value: string) {
    const days = value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    update({ relativeDays: days.length > 0 ? days : undefined });
  }

  return (
    <div className='mt-1 space-y-1'>
      <div className='flex items-center gap-2'>
        <label className='text-gray-600 dark:text-gray-400'>{l(T.reminder)}</label>
        <span className='text-gray-400 dark:text-gray-500' title={defaultReminder ? describeDefault(defaultReminder) : undefined}>
          {defaultReminder ? describeDefault(defaultReminder) : l(T.noneInModel)}
        </span>
        <input
          type='checkbox'
          checked={enabled}
          onChange={e => handleToggle(e.target.checked)}
          className='ml-auto'
        />
      </div>
      {enabled && (
        <div className='space-y-1'>
          {/* Row 1: Type + Importance */}
          <div className='flex flex-wrap items-center gap-3'>
            <div className='flex items-center gap-1'>
              <label className={labelClass}>{l(T.type)}</label>
              <select value={type} onChange={e => handleTypeChange(e.target.value as ReminderType)} className={selectClass}>
                <option value='cooldown'>{l(T.typeCooldown)}</option>
                <option value='interval'>{l(T.typeInterval)}</option>
                {(type === 'relative' || (availableItemKeys && availableItemKeys.length > 0)) && (
                  <option value='relative'>{l(T.typeRelative)}</option>
                )}
              </select>
            </div>
            <div className='flex items-center gap-1'>
              <label className={labelClass}>{l(T.importance)}</label>
              <select
                value={override?.importance || ''}
                onChange={e => update({ importance: (e.target.value || undefined) as any })}
                className={selectClass}
              >
                <option value=''>{fill(l(T.importanceDefault), { value: importanceWord(defaultReminder?.importance || 'may') })}</option>
                {IMPORTANCES.map(i => (
                  <option key={i} value={i}>{l(IMPORTANCE_OPTIONS[i])}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Type-specific fields */}
          {type === 'cooldown' && (
            <div className='flex items-center gap-1'>
              <label className={labelClass}>{l(T.cooldown)}</label>
              <select
                value={effective?.cooldown || ''}
                onChange={e => update({ cooldown: e.target.value || undefined })}
                className={selectClass}
              >
                {durationOptions()}
              </select>
            </div>
          )}

          {type === 'interval' && (
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>{l(T.min)}</label>
                <select
                  value={effective?.expectedInterval?.min || ''}
                  onChange={e => updateInterval('min', e.target.value)}
                  className={selectClass}
                >
                  {durationOptions()}
                </select>
              </div>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>{l(T.max)}</label>
                <select
                  value={effective?.expectedInterval?.max || ''}
                  onChange={e => updateInterval('max', e.target.value)}
                  className={selectClass}
                >
                  {durationOptions()}
                </select>
              </div>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>{l(T.cooldown)}</label>
                <select
                  value={effective?.cooldown || ''}
                  onChange={e => update({ cooldown: e.target.value || undefined })}
                  className={selectClass}
                >
                  {durationOptions()}
                </select>
              </div>
            </div>
          )}

          {type === 'relative' && (
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>{l(T.relativeTo)}</label>
                <span className='text-xs text-gray-700 dark:text-gray-300'>{effective?.relativeTo || '—'}</span>
              </div>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>{l(T.days)}</label>
                <input
                  type='text'
                  value={(effective?.relativeDays || []).join(', ')}
                  onChange={e => updateRelativeDays(e.target.value)}
                  placeholder='2, 3, 4'
                  className={inputClass}
                  title={l(T.daysHint)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
