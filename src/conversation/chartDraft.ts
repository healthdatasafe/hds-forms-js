import { cmcConversation, getHDSModel } from 'hds-lib';
import type { DocumentConversation, ProposedValueView } from 'hds-lib';
import type { ChartDraftRow, DraftState } from 'hds-feminine-cycle-ui';
import { boxKey, gridRowKey, notRead } from './labels';
import { anchorOn } from './rowBlock';

/** Where a box or a row is on the document (a proposed value's `anchor`, a question's `context.anchor`) */
export interface ChartAnchor {
  attachmentId?: string;
  eventId?: string;
  page: number;
  bbox?: [number, number, number, number];
}

/** A day of the draft, as the review needs it: its values (`ChartDraft.ref` of hds-feminine-cycle-ui) */
export interface ChartDayRef {
  /** The values read on the box and drawn (open, confirmed or corrected) */
  candidateIds: string[];
  /** The parts of the box not read (`unmapped`, `not-read`), not answered yet */
  notReadIds: string[];
  anchor: ChartAnchor | null;
  attachmentId: string | null;
}

/** A row of the draft: its `which-row-date` question, and where the row is */
export interface ChartRowRef {
  questionId: string | null;
  /** The question's anchor: the box of the row it asks the day of */
  anchor: ChartAnchor | null;
  attachmentId: string | null;
  page: number | null;
  /** The row's number on its page (`grid.row`) */
  row: number;
}

/** A proposed value shaped as a record, for the chart: its stream from its item, its value (or her correction's) */
export interface ChartDraftEvent {
  /** Its candidateId */
  id: string;
  streamIds: string[];
  type: string;
  content: any;
  time?: number;
}

export interface ChartDraftOptions {
  /** The stream of an item. Default: the item's stream in the model, else the item key */
  streamOf?: (itemKey: string) => string | null | undefined;
  /**
   * The event her app wrote for a corrected value (`writtenEventId`): its type and content are drawn. Without it, or when
   * it gives nothing, the proposal's are (the day is still `edited`).
   */
  written?: (eventId: string) => { type: string; content?: unknown } | null | undefined;
}

export interface ConversationChartDraft {
  /** The rows of the grid in document order (page, then row); `id` is `gridRowKey`, `ref` a `ChartRowRef` */
  rows: Array<ChartDraftRow<ChartDraftEvent>>;
  /** Each row's days by their box number (`grid.column`) */
  days: Map<string, Map<number, ChartDayRef>>;
}

function modelStreamOf (itemKey: string): string | null {
  try {
    return getHDSModel().itemsDefs.forKey(itemKey, false)?.data.streamId ?? null;
  } catch {
    return null;
  }
}

/** Values drawn: read and not set aside; a box not read only while she has not answered it */
const DRAWN = new Set(['open', 'confirmed', 'corrected']);

/** The day a `which-row-date` answer gave (12:00 UTC on it), `YYYY-MM-DD`; null when none */
function answeredDay (q: cmcConversation.QuestionView): string | null {
  const a = q.state === 'answered' ? q.answer?.content : null;
  if (a == null || a.action !== 'confirm' || a.timePrecision === 'unknown' || typeof a.time !== 'number') return null;
  return new Date(a.time * 1000).toISOString().slice(0, 10);
}

/**
 * A dated grid's proposed values as the rows of a chart draft (hds-feminine-cycle-ui `buildCycleChart({ draftRows })`).
 * Pure. A row per page and `grid.row`, a day per box (`grid.column`); a day is `edited` when a value of it was corrected,
 * `incomplete` when part of the box was not read, `unread` when none of it was, else `draft`. A row is dated from her
 * answer to its `which-row-date`, else undated. Values skipped, already in her record, asked for or read again are not
 * drawn. Not a dated grid: no rows.
 */
export function chartDraftOf (conv: DocumentConversation, opts: ChartDraftOptions = {}): ConversationChartDraft {
  const days = new Map<string, Map<number, ChartDayRef>>();
  if (!cmcConversation.isDatedGrid(conv)) return { rows: [], days };
  const streamOf = (itemKey: string): string => opts.streamOf?.(itemKey) ?? modelStreamOf(itemKey) ?? itemKey;

  interface Box { ref: ChartDayRef; events: ChartDraftEvent[]; edited: boolean }
  interface Row { key: string; attachmentId: string | null; page: number | null; row: number; order: number; boxes: Map<number, Box> }
  const rows = new Map<string, Row>();
  const attachments: string[] = [];

  const boxOf = (pv: ProposedValueView): Box | null => {
    const c = pv.item.content;
    const rowKey = gridRowKey(c);
    const column = c.grid?.column;
    if (rowKey == null || boxKey(c) == null || !Number.isInteger(column) || column < 1 || !Number.isInteger(c.grid?.row)) return null;
    const anchor = anchorOn<ChartAnchor>(c.anchor, conv.about);
    let row = rows.get(rowKey);
    if (row == null) {
      const attachmentId = typeof c.anchor?.attachmentId === 'string' ? c.anchor.attachmentId : null;
      if (!attachments.includes(attachmentId ?? '')) attachments.push(attachmentId ?? '');
      row = { key: rowKey, attachmentId, page: typeof c.anchor?.page === 'number' ? c.anchor.page : null, row: c.grid.row, order: attachments.indexOf(attachmentId ?? ''), boxes: new Map() };
      rows.set(rowKey, row);
    }
    let box = row.boxes.get(column);
    if (box == null) {
      box = { ref: { candidateIds: [], notReadIds: [], anchor, attachmentId: anchor?.attachmentId ?? null }, events: [], edited: false };
      row.boxes.set(column, box);
    }
    if (box.ref.anchor == null && anchor != null) box.ref = { ...box.ref, anchor, attachmentId: anchor.attachmentId ?? null };
    return box;
  };

  for (const pv of conv.proposedValues) {
    const c = pv.item.content;
    if (c.grid == null) continue;
    if (notRead(c)) {
      if (pv.state !== 'open') continue;
      boxOf(pv)?.ref.notReadIds.push(pv.candidateId);
      continue;
    }
    const p = c.proposal;
    if (!DRAWN.has(pv.state) || p == null || typeof p.itemKey !== 'string' || typeof p.type !== 'string') continue;
    const box = boxOf(pv);
    if (box == null) continue;
    const own = pv.state === 'corrected' && pv.writtenEventId != null ? opts.written?.(pv.writtenEventId) : null;
    box.ref.candidateIds.push(pv.candidateId);
    box.events.push({
      id: pv.candidateId,
      streamIds: [streamOf(p.itemKey)],
      type: own?.type ?? p.type,
      content: own != null ? own.content : p.content,
      ...(typeof p.time === 'number' ? { time: p.time } : {})
    });
    if (pv.state === 'corrected') box.edited = true;
  }

  const questions = conv.questions.filter((q) => q.code === cmcConversation.QUESTION_CODES.WHICH_ROW_DATE);
  const sorted = [...rows.values()].sort((a, b) => a.order - b.order || (a.page ?? 0) - (b.page ?? 0) || a.row - b.row);
  const out: Array<ChartDraftRow<ChartDraftEvent>> = sorted.map((row) => {
    const q = questions.find((x) => gridRowKey(x.item.content) === row.key) ?? null;
    const startDate = q != null ? answeredDay(q) : null;
    const ref: ChartRowRef = {
      questionId: q?.item.id ?? null,
      anchor: q != null ? anchorOn<ChartAnchor>(q.item.content.context?.anchor, conv.about) : null,
      attachmentId: row.attachmentId,
      page: row.page,
      row: row.row
    };
    const byDay = new Map<number, ChartDayRef>();
    days.set(row.key, byDay);
    const draftDays = [...row.boxes].sort((a, b) => a[0] - b[0]).map(([day, box]) => {
      const read = box.events.length > 0;
      const state: DraftState = box.edited ? 'edited' : read && box.ref.notReadIds.length > 0 ? 'incomplete' : read ? 'draft' : 'unread';
      byDay.set(day, box.ref);
      return { day, events: box.events, state, ref: box.ref };
    });
    return { id: row.key, ...(startDate != null ? { startDate } : {}), ref, days: draftDays };
  });
  return { rows: out, days };
}
