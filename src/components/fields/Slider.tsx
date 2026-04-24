import { localizeText } from 'hds-lib';
import type { FieldProps } from '../../types';
import type { SliderLabel, SliderDisplay } from '../../schema/schemas';

const l = localizeText;

interface SliderFieldProps extends FieldProps {
  /** Raw lower bound. */
  min: number;
  /** Raw upper bound. */
  max: number;
  /** Raw step increment. Default 1. */
  step?: number;
  /** Orientation of the track. Default 'horizontal'. */
  orientation?: 'horizontal' | 'vertical';
  /** Per-raw-value tick labels (min/max anchors + optional intermediate ticks). */
  labels?: Record<string | number, SliderLabel>;
  /** UI-only display scaling of the raw value. */
  display?: SliderDisplay;
}

function defaultPrecision (multiplier: number, step: number): number {
  // If multiplier >= 10, show as integer by default; otherwise infer from step.
  if (multiplier >= 10) return 0;
  const stepStr = String(step);
  const dot = stepStr.indexOf('.');
  return dot >= 0 ? Math.min(stepStr.length - dot - 1, 4) : 0;
}

function formatDisplayed (raw: number, display: SliderDisplay | undefined, step: number, suffix: string): string {
  const multiplier = display?.multiplier ?? 1;
  const precision = display?.precision ?? defaultPrecision(multiplier, step);
  const scaled = raw * multiplier;
  return scaled.toFixed(precision) + (suffix ? ` ${suffix}` : '');
}

export function Slider ({
  label,
  description,
  value,
  onChange,
  required,
  disabled,
  min,
  max,
  step = 1,
  orientation = 'horizontal',
  labels,
  display
}: SliderFieldProps) {
  const current = typeof value === 'number' ? value : (min + max) / 2;
  const suffix = display?.suffix ? (l(display.suffix) || '') : '';
  const displayed = formatDisplayed(current, display, step, suffix);

  // Build tick-label entries in raw-scale order
  const ticks = labels
    ? Object.entries(labels)
      .map(([rawKey, lab]) => ({ raw: Number(rawKey), label: l(lab.label) || '', description: lab.description ? (l(lab.description) || '') : '' }))
      .filter(t => !isNaN(t.raw))
      .sort((a, b) => a.raw - b.raw)
    : [];

  const isVertical = orientation === 'vertical';

  return (
    <div>
      <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {description && <p className='mb-2 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}

      <div className={isVertical ? 'flex items-stretch gap-3' : 'space-y-2'}>
        <div className={isVertical ? 'flex h-56 flex-col items-center' : ''}>
          <input
            type='range'
            role='slider'
            min={min}
            max={max}
            step={step}
            value={current}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={current}
            aria-valuetext={displayed}
            className={isVertical
              ? 'h-full w-2 cursor-pointer appearance-none bg-gray-200 dark:bg-gray-600 [writing-mode:vertical-lr]'
              : 'h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary-600 dark:bg-gray-600'}
          />
        </div>

        <div className={isVertical ? 'flex flex-col justify-between text-xs text-gray-600 dark:text-gray-300' : 'flex items-center justify-between text-xs text-gray-600 dark:text-gray-300'}>
          {ticks.map((t) => (
            <div
              key={t.raw}
              title={t.description || undefined}
              className={isVertical ? 'text-left' : 'text-center'}
            >
              <div className='font-medium'>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className='mt-2 flex items-center gap-2 text-sm text-gray-900 dark:text-white'>
        <span className='font-medium'>{displayed}</span>
      </div>
    </div>
  );
}
