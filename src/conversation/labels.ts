import { cmcConversation, eventToShortText, getHDSModel, localizeText } from 'hds-lib';
import type { DocumentConversation } from 'hds-lib';
import { observationLabel } from '../schema/convertibleMethod';
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

/**
 * A proposed observation of a charting method as it was read, with its annotations (Creighton frequency): "10KL — Stretchy,
 * clear, lubricative · X2 — seen twice (Creighton)". She confirms what would be saved, so never the observation converted to
 * the method she displays (`eventToShortText` converts, and leaves the annotations out). Null for any other value.
 */
function readObservationText (itemData: any, content: any): string | null {
  const source = content?.source;
  if (itemData?.type !== 'convertible' || typeof source?.key !== 'string' || source.key === '_raw' || source.sourceData == null) return null;
  const methodDef = getHDSModel().converters?.getEngine(itemData['converter-engine']?.models)?.getMethodDef(source.key) as any;
  // the converter not loaded: a value of one field ({ mucus: '10KL' }) is said by its code, never as JSON
  const fields = methodDef == null && typeof source.sourceData === 'object' ? Object.values(source.sourceData) : null;
  if (fields != null && (fields.length !== 1 || fields[0] == null || typeof fields[0] === 'object')) return null;
  const parts = [observationLabel(methodDef, fields != null ? fields[0] : source.sourceData)];
  for (const [id, value] of Object.entries(source.annotations ?? {})) {
    if (typeof value !== 'string' || value === '') continue;
    const known = methodDef?.notation?.annotations?.find((a: any) => a.id === id)?.values?.find((v: any) => v.value === value);
    const label = known != null ? localizeText(known.label) : null;
    parts.push(label ? `${value} — ${label}` : value);
  }
  return `${parts.join(' · ')} (${localizeText(methodDef?.name) || source.key})`;
}

/** A proposed (or corrected) value as the app writes any value, e.g. "48 µg/L"; null when it cannot be said */
export function proposalText (p: { itemKey?: string; type?: string; content?: unknown; clientData?: Record<string, unknown> } | null | undefined): string | null {
  if (p == null || typeof p.type !== 'string') return null;
  try {
    const def = typeof p.itemKey === 'string' ? getHDSModel().itemsDefs.forKey(p.itemKey, false) : null;
    const read = readObservationText(def?.data, p.content);
    if (read != null) return read;
    // a checkbox without content (the peak day): its day is the data, said beside it; read alone it would be the date of
    // an event with no time ("NaN.NaN.NaN")
    if (p.content == null && def?.data?.type === 'checkbox') return tx('yes');
    const text = eventToShortText({ type: p.type, content: p.content, streamIds: def != null ? [def.data.streamId] : [], clientData: p.clientData ?? {} } as any);
    return typeof text === 'string' && text !== '' ? text : null;
  } catch {
    return null;
  }
}

/**
 * A picture may not be read in full, and nothing in an answer says so: how many results were read on it, for her to
 * compare with the page. Null for a document read from its text (`extraction.backend` `text-layer`, or not given).
 */
export function pictureText (conv: DocumentConversation): string | null {
  const n = conv.proposedValues.filter((pv) => pv.state !== 'replaced' && readOnPicture(pv.item.content) && !notRead(pv.item.content)).length;
  if (n === 0) return null;
  return n === 1 ? tx('picture.readOne', { n }) : tx('picture.read', { n });
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
 * A proposed line as she finds it on her document: as printed, or the box of a dated grid (4.36.0) and what is written in it
 * ("Row 3, box 14: 10KL x2"; its printed label is the column number alone)
 */
export function lineText (c: Record<string, any>): string {
  if (c.grid == null) return printedText(c.printed);
  const box = tx('grid.box', { row: c.grid.row, column: c.grid.column });
  return typeof c.printed?.value === 'string' && c.printed.value !== '' ? `${box}: ${c.printed.value}` : box;
}

/** A box with writing the contact proposes nothing from, or not from all of it (4.36.0) */
export const notRead = (c: Record<string, any>): boolean => c.status === 'unmapped' && c.reason === 'not-read';

/** The box of a dated grid a proposed value or a question is about: its attachment, its page and its place; null for none */
export function boxKey (c: Record<string, any>): string | null {
  const anchor = c.anchor ?? c.context?.anchor;
  const grid = c.grid ?? c.context?.grid;
  return grid != null ? [anchor?.attachmentId ?? '', anchor?.page ?? '', grid.row, grid.column].join(':') : null;
}

/** The row of `boxKey` */
export function gridRowKey (c: Record<string, any>): string | null {
  return boxKey(c)?.split(':').slice(0, 3).join(':') ?? null;
}

/** Whether a proposed value is a part of a box that was not read in full (a `not-read` with the same `grid`) */
export function isPartlyRead (c: Record<string, any>, conv: DocumentConversation): boolean {
  const key = boxKey(c);
  return key != null && !notRead(c) && conv.proposedValues.some((pv) => pv.state !== 'replaced' && notRead(pv.item.content) && boxKey(pv.item.content) === key);
}

/** How many boxes with writing were not read (a dated grid), null when none */
export function notReadText (conv: DocumentConversation): string | null {
  const n = conv.proposedValues.filter((pv) => pv.state !== 'replaced' && notRead(pv.item.content)).length;
  if (n === 0) return null;
  return n === 1 ? tx('grid.notReadOne', { n }) : tx('grid.notRead', { n });
}

/** Whether a value was read from a picture: its `extraction.backend` is given, and is not the document's text */
function readOnPicture (c: Record<string, any>): boolean {
  const backend = c.extraction?.backend;
  return typeof backend === 'string' && backend !== 'text-layer';
}

/**
 * The day a proposed value would be saved on ("5 November 2020, 08:30"): its own, else the one she answered. Said when
 * its document has values of several days (a cumulative report: "Ferritine 12" and "Ferritine 30" differ by their day
 * alone), and always for a value read from a picture, where the day was read too. Null otherwise, and without a day.
 */
export function valueDayText (
  pv: { candidateId?: string; item: { content: Record<string, any> } },
  values: ReadonlyArray<{ candidateId?: string; state?: string; item: { content: Record<string, any> } }>,
  locale?: string,
  conv?: DocumentConversation
): string | null {
  const dayOf = (v: { candidateId?: string; item: { content: Record<string, any> } }): string | null => {
    const own = v.item.content.proposal?.time;
    const given = conv == null ? null : cmcConversation.answeredDateOf(conv, v.candidateId ?? '');
    const time = typeof own === 'number' ? own : given != null && given.timePrecision !== 'unknown' ? given.time : undefined;
    return typeof time === 'number' ? new Date(time * 1000).toISOString().slice(0, 10) : null;
  };
  const day = dayOf(pv);
  if (day == null) return null;
  const days = new Set(values.filter((v) => v.state !== 'replaced').map(dayOf).filter((d): d is string => d != null));
  if (days.size < 2 && !readOnPicture(pv.item.content)) return null;
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
