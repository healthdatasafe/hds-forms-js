import { useState } from 'react';
import { durationToLabel } from 'hds-lib';

/** Pryv-native duration: positive seconds = span, `0` = no duration (point-in-time), `null` = ongoing/unbounded. */
export type EventDuration = number | null;

/** Internal UI mode for picking the duration. The output (`value`) is the resolved EventDuration only. */
export type DurationMode = 'none' | 'ongoing' | 'length' | 'endTime';

export interface EventDurationInputProps {
  /** Resolved duration. Pass `undefined` to mean "user has not chosen yet" (initial state). */
  value: EventDuration | undefined;
  /** Fires with the resolved duration. Does not fire while the user is mid-input with an invalid value. */
  onChange: (duration: EventDuration | undefined) => void;
  /**
   * Anchor for the End time mode (Unix seconds). End must be strictly greater. Defaults to `now` at
   * change-time when omitted. Pass the form's `event.time` so the two pickers stay coherent.
   */
  eventTime?: number;
  /**
   * When true, hide the "No duration" mode (item declares a duration is required).
   * Maps to `itemDef.duration.mandatory`.
   */
  mandatory?: boolean;
  /**
   * When false, hide the "Ongoing" mode (item declares a duration must be a finite number).
   * Maps to `itemDef.duration.canBeNull`. Defaults to true.
   */
  allowNull?: boolean;
  /**
   * Maximum allowed duration in seconds. Lengths exceeding this emit `undefined` and show an inline error.
   * Maps to `itemDef.duration.maxSeconds`.
   */
  maxSeconds?: number;
  /** Visible label, default `event.duration`. */
  label?: string;
  className?: string;
}

interface UnitOption { value: string; label: string; seconds: number }

const UNIT_OPTIONS: UnitOption[] = [
  { value: 'seconds', label: 'seconds', seconds: 1 },
  { value: 'minutes', label: 'minutes', seconds: 60 },
  { value: 'hours',   label: 'hours',   seconds: 3600 },
  { value: 'days',    label: 'days',    seconds: 86400 },
  { value: 'months',  label: 'months',  seconds: 2592000 },   // 30 days nominal
  { value: 'years',   label: 'years',   seconds: 31557600 },  // 365.25 days nominal
];

const inputClass = 'rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400';

function pad (n: number): string { return n < 10 ? '0' + n : String(n); }

function toDatetimeLocal (d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Pick the largest whole unit that divides `seconds` exactly, falling back to seconds. */
function decomposeLength (seconds: number): { num: number; unit: string } {
  for (let i = UNIT_OPTIONS.length - 1; i >= 0; i--) {
    const u = UNIT_OPTIONS[i];
    if (seconds >= u.seconds && seconds % u.seconds === 0) {
      return { num: seconds / u.seconds, unit: u.value };
    }
  }
  return { num: seconds, unit: 'seconds' };
}

/** Derive the initial mode from a value passed in by the parent, respecting visibility constraints. */
function modeFromValue (value: EventDuration | undefined, mandatory: boolean, allowNull: boolean): DurationMode {
  if (value === null) return allowNull ? 'ongoing' : 'length';
  if (typeof value === 'number' && value > 0) return 'length';
  // value is undefined or 0
  if (mandatory) return allowNull ? 'ongoing' : 'length';
  return 'none';
}

/**
 * Four-mode duration picker for a Pryv event:
 *   No duration → emits 0
 *   Ongoing     → emits null
 *   Length      → number + unit (seconds…years), emits seconds
 *   End time    → datetime-local, emits (end - eventTime) seconds; invalid if end ≤ eventTime
 */
export function EventDurationInput ({
  value,
  onChange,
  eventTime,
  mandatory = false,
  allowNull = true,
  maxSeconds,
  label = 'event.duration',
  className
}: EventDurationInputProps) {
  const [mode, setMode] = useState<DurationMode>(() => modeFromValue(value, mandatory, allowNull));
  const [length, setLength] = useState<{ num: string; unit: string }>(() => {
    if (typeof value === 'number' && value > 0) {
      const d = decomposeLength(value);
      return { num: String(d.num), unit: d.unit };
    }
    return { num: '', unit: 'minutes' };
  });
  const [endStr, setEndStr] = useState<string>(() => {
    if (typeof value === 'number' && value > 0 && eventTime != null) {
      return toDatetimeLocal(new Date((eventTime + value) * 1000));
    }
    return '';
  });
  const [tooLong, setTooLong] = useState(false);

  // Mode is internal UI state — the parent only sees the resolved value.
  // To reset the picker (e.g. when the form's underlying item changes), pass a stable `key={…}` from the parent.

  function emitForMode (nextMode: DurationMode, nextLength = length, nextEnd = endStr) {
    if (nextMode === 'none') { setTooLong(false); return onChange(0); }
    if (nextMode === 'ongoing') { setTooLong(false); return onChange(null); }
    if (nextMode === 'length') {
      const n = parseFloat(nextLength.num);
      const u = UNIT_OPTIONS.find(o => o.value === nextLength.unit);
      if (!Number.isFinite(n) || n <= 0 || !u) { setTooLong(false); return onChange(undefined); }
      const sec = Math.round(n * u.seconds);
      if (maxSeconds != null && sec > maxSeconds) { setTooLong(true); return onChange(undefined); }
      setTooLong(false);
      return onChange(sec);
    }
    // endTime
    const endSec = Math.floor(new Date(nextEnd).getTime() / 1000);
    const startSec = eventTime ?? Math.floor(Date.now() / 1000);
    if (!Number.isFinite(endSec) || endSec <= startSec) { setTooLong(false); return onChange(undefined); }
    const sec = endSec - startSec;
    if (maxSeconds != null && sec > maxSeconds) { setTooLong(true); return onChange(undefined); }
    setTooLong(false);
    return onChange(sec);
  }

  function pickMode (next: DurationMode) {
    setMode(next);
    emitForMode(next);
  }

  const lengthLabel = (mode === 'length' && typeof value === 'number' && value > 0)
    ? safeDurationLabel(value)
    : null;
  const endLabel = (mode === 'endTime' && typeof value === 'number' && value > 0)
    ? safeDurationLabel(value)
    : null;
  const endInvalid = mode === 'endTime' && endStr !== '' && value === undefined && !tooLong;
  const maxLabel = maxSeconds != null ? safeDurationLabel(maxSeconds) : null;

  const radio = (m: DurationMode, text: string) => (
    <label className='flex cursor-pointer items-center gap-1 select-none'>
      <input
        type='radio'
        checked={mode === m}
        onChange={() => pickMode(m)}
        className='h-3.5 w-3.5 border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-700'
      />
      <span className='text-xs text-gray-700 dark:text-gray-300'>{text}</span>
    </label>
  );

  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        {!mandatory && radio('none', 'No duration')}
        {allowNull && radio('ongoing', 'Ongoing')}
        {radio('length', 'Length')}
        {radio('endTime', 'End time')}
      </div>
      {mode === 'length' && (
        <div className='mt-2 flex items-center gap-2'>
          <input
            type='number'
            min='0'
            step='any'
            value={length.num}
            onChange={e => {
              const next = { ...length, num: e.target.value };
              setLength(next);
              emitForMode('length', next);
            }}
            placeholder='e.g. 30'
            className={`${inputClass} w-24`}
          />
          <select
            value={length.unit}
            onChange={e => {
              const next = { ...length, unit: e.target.value };
              setLength(next);
              emitForMode('length', next);
            }}
            className={`${inputClass} pr-8`}
          >
            {UNIT_OPTIONS.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          {lengthLabel && <span className='text-xs text-gray-500 dark:text-gray-400'>= {lengthLabel}</span>}
          {tooLong && maxLabel && (
            <span className='text-xs text-red-600 dark:text-red-400'>Exceeds max of {maxLabel}</span>
          )}
        </div>
      )}
      {mode === 'endTime' && (
        <div className='mt-2 flex items-center gap-2'>
          <input
            type='datetime-local'
            value={endStr}
            onChange={e => {
              setEndStr(e.target.value);
              emitForMode('endTime', length, e.target.value);
            }}
            className={inputClass}
          />
          {endLabel && <span className='text-xs text-gray-500 dark:text-gray-400'>= {endLabel}</span>}
          {endInvalid && (
            <span className='text-xs text-red-600 dark:text-red-400'>End must be after event.time</span>
          )}
          {tooLong && maxLabel && (
            <span className='text-xs text-red-600 dark:text-red-400'>Exceeds max of {maxLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

function safeDurationLabel (sec: number): string | null {
  try { return durationToLabel(sec); } catch { return null; }
}
