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
