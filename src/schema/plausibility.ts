import { localizeText } from 'hds-lib';

/**
 * Plausibility of a value about to be saved (B-2026-11-05-6): the platform checks types only, so a systolic below its
 * diastolic, a 12 kg adult or a weight in pounds saved as kilograms reach every reader unless the entry app warns.
 * Warnings only: an unusual value can be true, the person decides. Ranges are per item and per unit (eventType), so a
 * value typed in the wrong unit falls out of range ("unit sanity").
 */

interface Range { min: number; max: number }

/** Plausible ranges per item key, then per eventType; `adult` applies from 18 years old when the age is known */
const RANGES: Record<string, Record<string, Range & { adult?: Range }>> = {
  'body-weight': {
    'mass/kg': { min: 0.3, max: 350, adult: { min: 30, max: 350 } },
    'mass/lb': { min: 0.7, max: 770, adult: { min: 66, max: 770 } }
  },
  'body-height': {
    'length/m': { min: 0.25, max: 2.6, adult: { min: 1.2, max: 2.6 } },
    'length/ft': { min: 0.8, max: 8.5, adult: { min: 4, max: 8.5 } }
  },
  'body-temperature': { 'temperature/c': { min: 33, max: 43 } },
  'body-temperature-basal': { 'temperature/c': { min: 34, max: 39 } },
  'body-heart-rate': { 'frequency/bpm': { min: 25, max: 250 } }
};

/** Plausible ranges of a composite item's parts */
const PART_RANGES: Record<string, Record<string, Range>> = {
  'body-blood-pressure': {
    systolic: { min: 50, max: 300 },
    diastolic: { min: 25, max: 200 },
    rate: { min: 25, max: 250 }
  }
};

export type PlausibilityWarning =
  | { code: 'range'; value: number; min: number; max: number; part?: string }
  | { code: 'systolicNotAboveDiastolic'; systolic: number; diastolic: number };

export interface PlausibilityOptions {
  /** The person's age in years, when known: tightens the adult ranges (a 12 kg adult) */
  ageYears?: number;
}

function num (v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The warnings for a value of an item, in the unit `eventType` (the variation chosen, else the item's own eventType).
 * An item, unit or part with no rule gives none.
 */
export function plausibilityWarnings (itemKey: string | undefined, value: unknown, eventType: string | undefined, opts: PlausibilityOptions = {}): PlausibilityWarning[] {
  if (!itemKey || value == null) return [];
  const warnings: PlausibilityWarning[] = [];
  const parts = PART_RANGES[itemKey];
  if (parts) {
    if (typeof value !== 'object') return [];
    const v = value as Record<string, unknown>;
    for (const [part, r] of Object.entries(parts)) {
      const n = num(v[part]);
      if (n != null && (n < r.min || n > r.max)) warnings.push({ code: 'range', value: n, min: r.min, max: r.max, part });
    }
    const systolic = num(v.systolic);
    const diastolic = num(v.diastolic);
    if (itemKey === 'body-blood-pressure' && systolic != null && diastolic != null && systolic <= diastolic) {
      warnings.push({ code: 'systolicNotAboveDiastolic', systolic, diastolic });
    }
    return warnings;
  }
  const byType = eventType ? RANGES[itemKey]?.[eventType] : undefined;
  const n = num(value);
  if (!byType || n == null) return [];
  const r = byType.adult && opts.ageYears != null && opts.ageYears >= 18 ? byType.adult : byType;
  if (n < r.min || n > r.max) warnings.push({ code: 'range', value: n, min: r.min, max: r.max });
  return warnings;
}

/** Age in whole years on `at` of a `YYYY-MM-DD` date of birth; undefined when it is not one */
export function ageInYears (dateOfBirth: string | null | undefined, at: Date = new Date()): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth ?? '');
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = at.getFullYear() - y;
  if (at.getMonth() + 1 < mo || (at.getMonth() + 1 === mo && at.getDate() < d)) age--;
  return age >= 0 ? age : undefined;
}

const TEXT = {
  range: {
    en: '{value} looks unusual (expected between {min} and {max}). Check the value and its unit.',
    fr: '{value} semble inhabituel (attendu entre {min} et {max}). Vérifiez la valeur et son unité.'
  },
  systolicNotAboveDiastolic: {
    en: 'The systolic ({systolic}) is usually higher than the diastolic ({diastolic}). Check that they are not swapped.',
    fr: 'La systolique ({systolic}) est normalement plus haute que la diastolique ({diastolic}). Vérifiez qu’elles ne sont pas inversées.'
  }
};

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (all, k) => (values[k] != null ? String(values[k]) : all));

/**
 * A warning as a sentence in the current language; a part of a composite is named by its label in `partLabels`
 * (e.g. the item's `composite.<part>.label`, localized)
 */
export function plausibilityText (w: PlausibilityWarning, partLabels: Record<string, string> = {}): string {
  if (w.code === 'systolicNotAboveDiastolic') return fill(localizeText(TEXT.systolicNotAboveDiastolic) ?? '', w);
  const sentence = fill(localizeText(TEXT.range) ?? '', w);
  const part = w.part ? (partLabels[w.part] ?? w.part) : undefined;
  return part ? `${part}: ${sentence}` : sentence;
}

/** Whether an item is entered at most once a day: `repeatable: P1D`, or a daily reminder (`reminder.cooldown: P1D`) */
export function isOncePerDayItem (itemData: { repeatable?: string; reminder?: { cooldown?: string } } | undefined): boolean {
  return itemData?.repeatable === 'P1D' || itemData?.reminder?.cooldown === 'P1D';
}

/** An entry, as much of it as the same-day check reads */
export interface SameDayEntry { id?: string; time: number; type?: string; content?: unknown; trashed?: boolean }

const localDay = (unix: number) => {
  const d = new Date(unix * 1000);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function sameContent (a: unknown, b: unknown): boolean {
  const na = num(a);
  const nb = num(b);
  if (na != null || nb != null) return na === nb;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if (!sameContent((a as any)[k], (b as any)[k])) return false;
    return true;
  }
  return (a ?? null) === (b ?? null);
}

/**
 * The entries of one item (`entries`, already filtered to that item) on the same local day as `time` that make a new
 * value a likely duplicate: any of them for an item entered once a day (`oncePerDay`), else those with the same value
 * in the same unit (a value saved twice). `excludeId` is the entry being rewritten.
 */
export function sameDayEntries<E extends SameDayEntry> (
  entries: E[],
  time: number,
  opts: { oncePerDay: boolean; value?: unknown; eventType?: string; excludeId?: string }
): E[] {
  const day = localDay(time);
  return entries.filter(e => !e.trashed && e.id !== opts.excludeId && e.time != null && localDay(e.time) === day &&
    (opts.oncePerDay || ((opts.eventType == null || e.type === opts.eventType) && sameContent(e.content, opts.value))));
}
