import { cmcConversation, eventToShortText, getHDSModel, localizeText } from 'hds-lib';
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

/** A specimen code of `which-specimen` by its label (CONVERSATION.md § Specimen codes, hds-lib `SPECIMEN_CODES`); `other`: ours */
function specimenLabel (code: string): string | null {
  const labels = (cmcConversation.SPECIMEN_CODES as Record<string, Record<string, string>> | undefined)?.[code];
  if (labels != null) return localizeText(labels) ?? labels.en;
  return code === 'other' ? tx('specimen.other') : null;
}

/** A document kind of the pack by its label (`documentKinds`), else null */
export function documentKindLabel (key: string): string | null {
  try {
    return getHDSModel().documentKinds.label(key);
  } catch {
    return null;
  }
}

/** The kinds she may pick for a document (the pack's, not deprecated), by label */
export function documentKindOptions (): Array<{ key: string; label: string }> {
  try {
    return getHDSModel().documentKinds.getAll().map((k) => ({ key: k.key, label: localizeText(k.label) ?? k.key }));
  } catch {
    return [];
  }
}
const UCUM = /^[A-Za-z0-9%µ/.*[\]{}^()'-]{1,32}$/;
const SUPERSCRIPT: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };

/**
 * A UCUM unit code as people read it: `1` (a ratio, no unit) in words, `10*6/mL` as 10⁶/mL, the micro prefix `u` as µ
 * (`uL`, `umol/L`, `ug`). The code itself is what an answer carries.
 */
export function unitText (code: string): string {
  if (code === '1') return tx('unit.ratio');
  return code
    .replace(/10\*(-?\d+)/g, (_m, n: string) => '10' + [...n].map((ch) => SUPERSCRIPT[ch] ?? ch).join(''))
    .replace(/(^|[/.(])u(?=(mol|g|L|l|IU|U|kat)\b)/g, '$1µ');
}

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
  if (code === 'which-unit') return UCUM.test(option) ? { label: unitText(option), selectable: true } : { label: option, selectable: false };
  if (code === 'which-analyte' || code === 'which-specimen') {
    const name = itemLabel(option);
    if (name != null) return { label: name, selectable: true };
    const specimen = code === 'which-specimen' ? specimenLabel(option) : null;
    if (specimen != null) return { label: specimen, selectable: true };
  }
  if (code === 'which-document-kind') {
    const kind = documentKindLabel(option);
    return kind != null ? { label: kind, selectable: true } : { label: option, selectable: false };
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

/**
 * The sampling day of a proposed value ("5 November 2020, 08:30"), only when its document's values were taken on
 * several days (a cumulative report): there, "Ferritine 12" and "Ferritine 30" differ by their day alone. Null for a
 * one-day document or a value with no day yet.
 */
export function valueDayText (
  pv: { item: { content: Record<string, any> } },
  values: ReadonlyArray<{ state?: string; item: { content: Record<string, any> } }>,
  locale?: string
): string | null {
  const dayOf = (c: Record<string, any>): string | null => typeof c.proposal?.time === 'number' ? new Date(c.proposal.time * 1000).toISOString().slice(0, 10) : null;
  const days = new Set(values.filter((v) => v.state !== 'replaced').map((v) => dayOf(v.item.content)).filter((d): d is string => d != null));
  const day = dayOf(pv.item.content);
  if (days.size < 2 || day == null) return null;
  const time = pv.item.content.printed?.samplingTime;
  return dayText(day, locale) + (typeof time === 'string' && time !== '' ? `, ${time}` : '');
}

/** A proposed date at its precision (PARTIAL-DATES.md): `day` "5 November 2020", `month` "November 2020", `year` "2020" */
export function proposedDateText (time: number, precision: string | undefined, locale?: string): string {
  const d = new Date(time * 1000);
  try {
    if (precision === 'year') return String(d.getUTCFullYear());
    if (precision === 'month') return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' });
  } catch { /* an unknown locale: the day below */ }
  return dayText(d.toISOString().slice(0, 10), locale);
}

/** The day of a which-date answer as `time` (12:00 UTC) with `timePrecision: day` (PARTIAL-DATES.md) */
export function dayToTime (day: string): number {
  return Date.parse(day + 'T12:00:00Z') / 1000;
}
