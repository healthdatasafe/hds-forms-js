import { eventToShortText, getHDSModel, localizeText } from 'hds-lib';
import { CONVERSATION_TEXTS, type ConversationTextKey } from './conversationTexts';

/** A conversation text in the host's locale, `{var}` replaced */
export function tx (key: ConversationTextKey, vars: Record<string, string | number> = {}): string {
  let text = localizeText(CONVERSATION_TEXTS[key]) ?? CONVERSATION_TEXTS[key].en;
  for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

const has = (key: string): key is ConversationTextKey => Object.prototype.hasOwnProperty.call(CONVERSATION_TEXTS, key);

/** A key under `prefix`, else `prefix.unknown` (R8: an unknown value falls back to a generic text) */
function known (prefix: string, value: unknown, vars: Record<string, string | number> = {}): string {
  const key = `${prefix}.${String(value)}`;
  return tx(has(key) ? key : `${prefix}.unknown` as ConversationTextKey, vars);
}

/** The state of the work, from a `task-status` alert's `status` (no alert yet: `waiting`; unknown: in progress) */
export function statusText (status: string | null | undefined): string {
  if (status == null) return tx('status.waiting');
  return known('status', status);
}

export function errorText (code: string | null | undefined, contactName: string): string {
  return known('error', code, { name: contactName });
}

export function noticeText (code: string, contactName: string): string {
  return known('notice', code, { name: contactName });
}

/** Why a kept-aside or unmapped line is not saved */
export function reasonText (reason: string | null | undefined): string {
  return known('reason', reason);
}

/** A question's text; an unknown or third-party (`x-`) code: "cannot answer yet" */
export function questionText (code: string, contactName: string): string {
  return known('question', code, { name: contactName });
}

/** An item's name from the model, else null */
export function itemLabel (itemKey: string): string | null {
  try {
    const def = getHDSModel().itemsDefs.forKey(itemKey, false);
    return def != null ? (localizeText(def.data.label) ?? null) : null;
  } catch {
    return null;
  }
}

const SPECIMENS = new Set(['serum', 'plasma', 'blood', 'urine']);
const UCUM = /^[A-Za-z0-9%µ/.*[\]{}^()'-]{1,32}$/;

/**
 * An option of a choice question, as she reads it, and whether she may pick it (R8: an option code this version
 * cannot label is shown, not selectable). which-analyte: an item key, by its name; which-unit: a UCUM code as it is;
 * is-fasting: yes / no; which-specimen: an item key by its name, or a specimen code.
 */
export function optionLabel (code: string, option: string): { label: string; selectable: boolean } {
  if (code === 'is-fasting') {
    if (option === 'yes' || option === 'no') return { label: tx(option), selectable: true };
    return { label: option, selectable: false };
  }
  if (code === 'which-unit') return { label: option, selectable: UCUM.test(option) };
  if (code === 'which-analyte' || code === 'which-specimen') {
    const name = itemLabel(option);
    if (name != null) return { label: name, selectable: true };
    if (code === 'which-specimen' && SPECIMENS.has(option)) return { label: tx(`specimen.${option}` as ConversationTextKey), selectable: true };
  }
  return { label: option, selectable: false };
}

/** A proposed (or corrected) value as the app writes any value, e.g. "48 µg/L"; null when it cannot be said */
export function proposalText (p: { itemKey?: string; type?: string; content?: unknown; clientData?: Record<string, unknown> } | null | undefined): string | null {
  if (p == null || typeof p.type !== 'string') return null;
  try {
    const def = typeof p.itemKey === 'string' ? getHDSModel().itemsDefs.forKey(p.itemKey, false) : null;
    const text = eventToShortText({ type: p.type, content: p.content, streamIds: def != null ? [def.data.streamId] : [], clientData: p.clientData ?? {} } as any);
    return typeof text === 'string' && text !== '' ? text : null;
  } catch {
    return null;
  }
}

/** The line as the document prints it: "Ferritine 48 ng/mL (30 - 400) H" */
export function printedText (printed: { label?: string; value?: string; unit?: string; refRange?: string; flag?: string } | null | undefined): string {
  if (printed == null) return '';
  const parts = [printed.label, printed.value, printed.unit].filter((s) => typeof s === 'string' && s !== '');
  let out = parts.join(' ');
  if (printed.refRange) out += ` (${printed.refRange})`;
  if (printed.flag) out += ` ${printed.flag}`;
  return out;
}

/** A day (YYYY-MM-DD) as the host's locale writes it, from the day alone (never shifted by a time zone) */
export function dayText (day: string, locale?: string): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  try {
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return day;
  }
}

/** The day of a which-date answer as `time` (12:00 UTC) with `timePrecision: day` (PARTIAL-DATES.md) */
export function dayToTime (day: string): number {
  return Date.parse(day + 'T12:00:00Z') / 1000;
}
