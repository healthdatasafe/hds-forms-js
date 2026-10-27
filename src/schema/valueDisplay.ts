import type { ValueDisplay } from './schemas';

/**
 * Display-scale helpers for numeric items.
 *
 * Storage is always the raw value in the item's eventType; `ValueDisplay.multiplier`
 * scales it for presentation only. These live apart from the React field so the
 * arithmetic — the part that can silently corrupt a clinical value — is unit-testable.
 *
 * The driving case is lab percentages (Plan 83 / D2): HbA1c, hematocrit, RDW,
 * transferrin saturation and the WBC differential are genuine fractions, so they store
 * 0..1 on `ratio/proportion` and render as `42%` via `multiplier: 100`.
 */

/** Significant digits used to strip binary-float noise. Far beyond any assay's precision. */
const FLOAT_NOISE_PRECISION = 12;

/**
 * Render a raw (stored) value in the display scale.
 *
 * `toPrecision` strips float noise — `0.42 * 100` is `42.00000000000001` and
 * `0.29 * 100` is `28.999999999999996` — without truncating genuine decimals the way a
 * fixed precision would. A number input must not default `precision` to 0 the way a
 * slider does, or HbA1c 5.4% would render as "5".
 */
export function toDisplayText (raw: number | null | undefined, display?: ValueDisplay): string {
  if (raw == null || Number.isNaN(raw)) return '';
  const multiplier = display?.multiplier ?? 1;
  const scaled = raw * multiplier;
  if (display?.precision != null) return scaled.toFixed(display.precision);
  return String(Number(scaled.toPrecision(FLOAT_NOISE_PRECISION)));
}

/**
 * Scale a raw bound (`min` / `max` / `step`) into the display scale, as a number.
 *
 * The `<input type="number">` attributes must be in the same scale as the text the
 * user sees, so a raw bound cannot be handed to the DOM unconverted: an item storing
 * 0..1 on `ratio/proportion` and rendering as a percentage via `multiplier: 100` needs
 * `max="100"`, not `max="1"`, or the browser rejects every valid entry.
 *
 * Returns `undefined` for a missing bound, so a caller can spread it into JSX and have
 * React omit the attribute entirely.
 */
export function toDisplayNumber (raw: number | null | undefined, display?: ValueDisplay): number | undefined {
  if (raw == null || Number.isNaN(raw)) return undefined;
  const multiplier = display?.multiplier ?? 1;
  if (multiplier === 1) return raw;
  return Number((raw * multiplier).toPrecision(FLOAT_NOISE_PRECISION));
}

/** Decimals written in a number's text form ("36.52" → 2, "36" → 0, "1e-7" → 0). */
export function decimalsOf (text: string | number | null | undefined): number {
  if (text == null) return 0;
  const s = String(text).trim();
  if (/e/i.test(s)) return 0;
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

/** Cap on derived decimals, so a pasted 0.1 + 0.2 does not become a step of 1e-17. */
const MAX_STEP_DECIMALS = 10;

export interface NumberStepInput {
  /** Step declared by the item, in the RAW scale. Wins when set (> 0). */
  step?: number | null;
  /** Least decimals the field steps by, in the DISPLAY scale (item `number.display.precision`, or the host's). */
  precision?: number | null;
  /** Display scaling of the raw value (the declared step is converted with it). */
  display?: ValueDisplay;
  /** Text currently in the field (display scale). */
  text?: string;
  /** Lower bound in the display scale: it is the step base, so its decimals count too. */
  displayMin?: number;
}

/**
 * The `step` attribute of a number input.
 *
 * 1. A step declared by the item wins, converted into the display scale.
 * 2. Otherwise the field steps by its decimals: the larger of the declared `precision`, the
 *    decimals typed (36.52 → 0.01) and those of `min` (the step base). Following what is typed
 *    means a typed value is never a `stepMismatch`.
 * 3. Nothing declared and no decimals typed: `any`, as before (a whole number steps by 1 with
 *    the arrows, and any decimal is accepted).
 */
export function numberInputStep ({ step, precision, display, text, displayMin }: NumberStepInput): number | string {
  if (typeof step === 'number' && step > 0) {
    const s = toDisplayNumber(step, display);
    if (s != null && s > 0) return s;
  }
  const declared = typeof precision === 'number' && precision >= 0 ? Math.floor(precision) : undefined;
  const n = Math.min(MAX_STEP_DECIMALS, Math.max(declared ?? 0, decimalsOf(text), decimalsOf(displayMin)));
  if (declared == null && n === 0) return 'any';
  return n > 0 ? (10 ** -n).toFixed(n) : 1;
}

/**
 * Convert a user-typed display value back to the raw value to store.
 *
 * Returns `null` for empty input and `undefined` for transient, not-yet-numeric text
 * ("-", "1e") — the caller keeps such text on screen without storing anything.
 */
export function toRawValue (text: string, display?: ValueDisplay): number | null | undefined {
  if (text.trim() === '') return null;
  const typed = Number(text);
  if (Number.isNaN(typed)) return undefined;
  const multiplier = display?.multiplier ?? 1;
  if (multiplier === 1) return typed;
  // Dividing reintroduces float noise (5.4 / 100 is 0.054000000000000006). Round it off
  // before it reaches storage: the noise would otherwise be persisted, exported to FHIR
  // and compared for equality.
  return Number((typed / multiplier).toPrecision(FLOAT_NOISE_PRECISION));
}
