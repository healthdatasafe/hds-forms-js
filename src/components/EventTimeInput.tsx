import { useMemo } from 'react';

export interface EventTimeInputProps {
  /** Event time as Unix timestamp in seconds. Undefined renders "now" as the initial placeholder. */
  value?: number;
  /** Called with the new Unix timestamp in seconds whenever the user changes the input. */
  onChange: (timeSec: number) => void;
  /** Visible label, default `event.time`. */
  label?: string;
  className?: string;
}

function pad (n: number): string { return n < 10 ? '0' + n : String(n); }

/** Format a Date as the local-time string accepted by `<input type="datetime-local">`. */
function toDatetimeLocal (d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputClass = 'rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400';

/**
 * Date+time picker that emits a Unix timestamp in seconds.
 * Companion to a Pryv event's `time` field.
 */
export function EventTimeInput ({ value, onChange, label = 'event.time', className }: EventTimeInputProps) {
  const display = useMemo(() => {
    const d = value != null ? new Date(value * 1000) : new Date();
    return toDatetimeLocal(d);
  }, [value]);

  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      <input
        type='datetime-local'
        value={display}
        onChange={e => {
          const t = new Date(e.target.value).getTime();
          if (Number.isFinite(t)) onChange(Math.floor(t / 1000));
        }}
        className={inputClass}
      />
    </div>
  );
}
