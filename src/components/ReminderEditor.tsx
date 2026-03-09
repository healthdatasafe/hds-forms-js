import { useState } from 'react';

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

const DURATION_OPTIONS = [
  { value: '', label: '—' },
  { value: 'PT8H', label: '8 hours' },
  { value: 'P1D', label: '1 day' },
  { value: 'P2D', label: '2 days' },
  { value: 'P1W', label: '1 week' },
  { value: 'P2W', label: '2 weeks' },
  { value: 'P21D', label: '21 days' },
  { value: 'P1M', label: '1 month' },
  { value: 'P35D', label: '35 days' },
  { value: 'P3M', label: '3 months' },
  { value: 'P6M', label: '6 months' },
  { value: 'P1Y', label: '1 year' }
];

const IMPORTANCE_OPTIONS = [
  { value: '', label: 'default (may)' },
  { value: 'may', label: 'May (optional)' },
  { value: 'should', label: 'Should (recommended)' },
  { value: 'must', label: 'Must (required)' }
];

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
  if (config.cooldown) parts.push(`cooldown: ${config.cooldown}`);
  if (config.expectedInterval) {
    const { min, max } = config.expectedInterval;
    parts.push(`interval: ${min || '?'}–${max || '?'}`);
  }
  if (config.relativeTo) {
    parts.push(`relative to ${config.relativeTo} days [${config.relativeDays?.join(', ')}]`);
  }
  if (config.importance) parts.push(config.importance);
  return parts.join(', ') || 'configured (no timing)';
}

const selectClass = 'rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white';
const inputClass = 'w-20 rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white';
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
        <label className='text-gray-600 dark:text-gray-400'>Reminder:</label>
        <span className='text-gray-400 dark:text-gray-500' title={defaultReminder ? describeDefault(defaultReminder) : undefined}>
          {defaultReminder ? describeDefault(defaultReminder) : 'none in data model'}
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
              <label className={labelClass}>Type:</label>
              <select value={type} onChange={e => handleTypeChange(e.target.value as ReminderType)} className={selectClass}>
                <option value='cooldown'>Cooldown</option>
                <option value='interval'>Expected interval</option>
                {(type === 'relative' || (availableItemKeys && availableItemKeys.length > 0)) && (
                  <option value='relative'>Relative to item</option>
                )}
              </select>
            </div>
            <div className='flex items-center gap-1'>
              <label className={labelClass}>Importance:</label>
              <select
                value={override?.importance || ''}
                onChange={e => update({ importance: (e.target.value || undefined) as any })}
                className={selectClass}
              >
                {IMPORTANCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value === '' && defaultReminder?.importance
                      ? `default (${defaultReminder.importance})`
                      : opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Type-specific fields */}
          {type === 'cooldown' && (
            <div className='flex items-center gap-1'>
              <label className={labelClass}>Cooldown:</label>
              <select
                value={effective?.cooldown || ''}
                onChange={e => update({ cooldown: e.target.value || undefined })}
                className={selectClass}
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'interval' && (
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>Min:</label>
                <select
                  value={effective?.expectedInterval?.min || ''}
                  onChange={e => updateInterval('min', e.target.value)}
                  className={selectClass}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>Max:</label>
                <select
                  value={effective?.expectedInterval?.max || ''}
                  onChange={e => updateInterval('max', e.target.value)}
                  className={selectClass}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>Cooldown:</label>
                <select
                  value={effective?.cooldown || ''}
                  onChange={e => update({ cooldown: e.target.value || undefined })}
                  className={selectClass}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'relative' && (
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>Relative to:</label>
                <span className='text-xs text-gray-700 dark:text-gray-300'>{effective?.relativeTo || '—'}</span>
              </div>
              <div className='flex items-center gap-1'>
                <label className={labelClass}>Days:</label>
                <input
                  type='text'
                  value={(effective?.relativeDays || []).join(', ')}
                  onChange={e => updateRelativeDays(e.target.value)}
                  placeholder='2, 3, 4'
                  className={inputClass}
                  title='Comma-separated cycle days (e.g. 2, 3, 4)'
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
