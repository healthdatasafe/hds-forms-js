import { useRef, useState, type ReactNode } from 'react';
import { buildCycleChart, canChart, CycleChart, daysToCheck, nextToCheck, registry } from 'hds-feminine-cycle-ui';
import type { ChartCycle, ChartDay, ChartEvent, CycleChartModel } from 'hds-feminine-cycle-ui';
import type { DocumentConversation, ProposedValueView } from 'hds-lib';
import { AnchoredDocumentView, type AnchoredDocumentSource } from './AnchoredDocumentView';
import type { PdfJsLike } from './pdfjs';
import { chartDraftOf, type ChartDayRef, type ChartDraftEvent, type ChartRowRef } from './chartDraft';
import { blockText, type ConversationActions, type ConversationOutcome } from './conversationRun';
import { CONVERSATION_TEXTS, type ConversationTextKey } from './conversationTexts';
import { dayText, itemLabel, lineText, proposalText, tx } from './labels';
import type { RowBlock } from './rowBlock';
import { shownAtOf } from './rowBlock';
import { ValueCorrectionEditor } from './ValueCorrectionEditor';
import { btn, card, cx, muted, small } from './ui';

/** The method whose paper chart is read (the only one hds-feminine-cycle-ui draws a chart of yet) */
const METHOD = 'creighton';

export interface ChartReviewProps {
  /** A dated grid's conversation (hds-lib `conversationOf`); anything else draws nothing */
  conversation: DocumentConversation;
  /** null: shown, no answer possible */
  actions: ConversationActions | null;
  /** Her own records, to draw beside the draft and compare (`same` / `differs`) */
  recorded?: ChartEvent[];
  /** The calendar day of one of her records, `YYYY-MM-DD`, in her zone (hds-feminine-cycle-ui `dayOf`); without it none is drawn */
  dayOf?: (event: ChartEvent) => string | null | undefined;
  /** Today in her zone, `YYYY-MM-DD`. Default: today on this device */
  today?: string;
  sourceOf: (attachmentId?: string) => AnchoredDocumentSource | null;
  loadPdfJs?: () => Promise<PdfJsLike>;
  pdfOptions?: Record<string, unknown>;
  /** Days per line. Default: 7 (a phone) */
  columns?: number;
  /** The chart's language (hds-feminine-cycle-ui `lang`); the review's own texts follow hds-lib's locale, as the other components */
  lang?: string;
  /** The contact's name, in a refusal that names it */
  contactName?: string;
  /**
   * "Enter it myself" on a box not read, in a dated row: the host opens her own entry form for that day, then answers
   * `skip` on `candidateIds` once she saved (decided 2026-11-26: no provenance is claimed for what she types)
   */
  onEnterDay?: (day: { date: string; candidateIds: string[] }) => void;
  /**
   * "Replace with the chart's" on a day she recorded otherwise: after she said yes and the chart's value was confirmed,
   * the host removes `recordedEvents` (her own); false when it did not. Without it, only "Keep mine" is offered.
   */
  onReplace?: (replace: { candidateIds: string[]; recordedEvents: ChartEvent[] }) => Promise<boolean>;
  /** The stream of an item, for the chart (default: the item's stream in the model) */
  streamOf?: (itemKey: string) => string | null | undefined;
  className?: string;
}

type Selected = { cycleId: string; day: number };

const MEANWHILE = new Set(['changed-since-shown', 'answered', 'replaced', 'unknown-candidate']);
const CONFIRMABLE = new Set(['clear', 'check']);

function localToday (): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Why a value was not saved, in words: changed meanwhile, the reasons the list shows, else that it failed */
function refusalText (reason: string, contactName: string | undefined): string {
  if (MEANWHILE.has(reason)) return tx('updated');
  const block = reason === 'identity-not-confirmed' ? 'identity-open' : reason;
  const key = `block.${block}`;
  if (!Object.prototype.hasOwnProperty.call(CONVERSATION_TEXTS, key)) return tx('failed');
  const needsName = (CONVERSATION_TEXTS[key as ConversationTextKey].en as string).includes('{name}');
  return needsName && !contactName ? tx('failed') : blockText(block as RowBlock, contactName ?? '');
}

/**
 * A chart read from paper (a dated grid of a charting method), checked day by day: the chart with her own records beside
 * it (hds-feminine-cycle-ui `CycleChart`), under the row of the day she taps that day's box on her document and what was read, and
 * her answers: Confirm, Change, Not on my chart; on a day she recorded otherwise, Keep mine or Replace (asked twice); on a
 * box not read, Enter it myself or Skip. A dated row can be confirmed at once, after its crop is shown, for its days read
 * in full that she did not record. Nothing is written without her tap; a value refused is said on its day. Needs the
 * chart's stylesheet: the host imports `hds-feminine-cycle-ui/cycle-chart.css`.
 */
export function ChartReview ({
  conversation, actions, recorded = [], dayOf, today, sourceOf, loadPdfJs, pdfOptions, columns = 7, lang, contactName,
  onEnterDay, onReplace, streamOf, className
}: ChartReviewProps) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [rowOpen, setRowOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refused, setRefused] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  // what she saw: the server time of the conversation when a view of these items first showed (R3)
  const seen = useRef(new Map<string, number>());
  const modelRef = useRef<CycleChartModel<ChartDraftEvent | ChartEvent> | null>(null);

  const rep = registry.get(METHOD);
  if (rep == null || !canChart(rep)) return null;

  const byId = new Map<string, ChartEvent>(recorded.flatMap((e) => (typeof e.id === 'string' ? [[e.id, e] as [string, ChartEvent]] : [])));
  const draft = chartDraftOf(conversation, { streamOf, written: (id) => byId.get(id) ?? null });
  if (draft.rows.length === 0) return null;
  const pvs = new Map<string, ProposedValueView>(conversation.proposedValues.map((pv) => [pv.candidateId, pv]));
  const pages = new Set(draft.rows.map((r) => (r.ref as ChartRowRef).page));
  const rowName = (ref: ChartRowRef): string => pages.size > 1 && ref.page != null ? tx('chart.rowOnPage', { page: ref.page, row: ref.row }) : tx('chart.row', { row: ref.row });
  const rows = draft.rows.map((r) => {
    const name = rowName(r.ref as ChartRowRef);
    return { ...r, title: r.startDate != null ? tx('chart.rowFrom', { row: name, date: dayText(r.startDate, lang) }) : name };
  });
  const built = buildCycleChart<ChartDraftEvent | ChartEvent>(recorded, rep, { dayOf: (e) => dayOf?.(e as ChartEvent) ?? null, today: today ?? localToday(), draftRows: rows });
  // her records on other days are not part of this chart: never said as "not on the chart"
  const model = { ...built, unplaced: built.unplaced.filter((u) => u.reason !== 'outside-rows') };
  // what she confirmed or corrected from this chart is the chart's own: a day is "recorded otherwise" only by a record
  // made elsewhere, never by her correction of one value while another of the day is still open
  const ownWritten = new Set(conversation.proposedValues.flatMap((pv) => (pv.writtenEventId != null ? [pv.writtenEventId] : [])));
  for (const c of model.cycles) {
    for (const d of c.days) {
      if (d.relation === 'differs' && d.events.every((e) => typeof e.id === 'string' && ownWritten.has(e.id))) delete d.relation;
    }
  }
  modelRef.current = model;

  const refOf = (day: ChartDay<any>): ChartDayRef | null => (day.draft?.ref as ChartDayRef | undefined) ?? null;
  const openOf = (ref: ChartDayRef | null): string[] => (ref?.candidateIds ?? []).filter((id) => pvs.get(id)?.state === 'open');
  const actionable = (day: ChartDay<any>): boolean => {
    const ref = refOf(day);
    if (ref == null) return false;
    // a day the same as hers stays one to check while its values are open: she says it is already in her record
    return openOf(ref).length > 0 || ref.notReadIds.length > 0;
  };
  const checkOpts = { actionable };
  const shownAt = (ids: string[]): number => {
    const key = ids.map((id) => `${id}@${pvs.get(id)?.item.modified ?? ''}`).sort().join(',');
    if (!seen.current.has(key)) seen.current.set(key, shownAtOf(conversation));
    return seen.current.get(key)!;
  };
  const stillOpen = (id: string): boolean => pvs.get(id)?.state === 'open';
  const refusedIds = Object.keys(refused).filter(stillOpen);

  const select = (sel: Selected | null): void => {
    setSelected(sel);
    setCorrecting(null);
    setReplacing(null);
    setNotice(null);
  };
  const goNext = (): void => {
    const m = modelRef.current;
    const next = m != null ? nextToCheck(m, selected, checkOpts) : null;
    select(next != null ? { cycleId: next.cycle.id, day: next.day.day } : null);
  };

  /** One action at a time; its refusals kept per value, the values it covered cleared first. True when nothing was refused */
  const run = async (ids: string[], fn: () => Promise<ConversationOutcome>): Promise<boolean> => {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    let failed: Record<string, string> = {};
    try {
      const out = await fn();
      // `in`, not `!out.ok`: a host compiling without strictNullChecks does not narrow on the boolean
      if ('reason' in out) failed = Object.fromEntries(ids.map((id) => [id, out.reason]));
      else for (const r of out.refused ?? []) failed[r.candidateId] = r.reason;
    } catch {
      failed = Object.fromEntries(ids.map((id) => [id, 'failed']));
    } finally {
      running.current = false;
      setBusy(false);
    }
    setRefused((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return { ...next, ...failed };
    });
    return Object.keys(failed).length === 0;
  };
  const can = actions != null && !busy;

  // the day shown
  const cycle = selected != null ? model.cycles.find((c) => c.id === selected.cycleId) ?? null : null;
  const day = cycle != null && selected != null ? cycle.days.find((d) => d.day === selected.day) ?? null : null;

  const list = daysToCheck(model, checkOpts);
  const position = (cycleId: string, n: number): number => model.cycles.findIndex((c) => c.id === cycleId) * 100000 + n;
  const previous = selected != null
    ? [...list].reverse().find((t) => position(t.cycle.id, t.day.day) < position(selected.cycleId, selected.day)) ?? list.at(-1) ?? null
    : null;

  let detail: ReactNode = <p className={muted}>{tx('chart.pick')}</p>;
  if (cycle != null && day != null) {
    detail = (
      <DayDetail
        key={`${cycle.id}:${day.day}`}
        cycle={cycle} day={day} dayRef={refOf(day)} pvs={pvs} lang={lang} contactName={contactName}
        sourceOf={sourceOf} loadPdfJs={loadPdfJs} pdfOptions={pdfOptions}
        can={can} actions={actions} busy={busy} refused={refused}
        correcting={correcting} setCorrecting={setCorrecting} replacing={replacing} setReplacing={setReplacing} notice={notice}
        onEnterDay={onEnterDay} onReplace={onReplace}
        act={async (ids, fn, after) => {
          const ok = await run(ids, fn);
          if (!ok) return;
          const kept = after != null ? await after() : null;
          if (kept != null) { setNotice(kept); return; }
          goNext();
        }}
        shownAt={shownAt}
        hasPrevious={previous != null && list.length > 0}
        hasNext={list.length > 0}
        onPrevious={() => { if (previous != null) select({ cycleId: previous.cycle.id, day: previous.day.day }); }}
        onNext={goNext}
      />
    );
  }

  // the day's detail sits under its own row, above the next row and the legend: on a phone no scroll to reach it
  const rowNote = (c: ChartCycle<any>): ReactNode => {
    const confirm = rowConfirm(c);
    const here = cycle != null && day != null && c.id === cycle.id ? detail : null;
    if (confirm == null && here == null) return null;
    return <>{confirm}{here != null && <div className='mt-2'>{here}</div>}</>;
  };

  const rowConfirm = (c: ChartCycle<any>): ReactNode => {
    if (c.row == null) return null;
    const ref = (c.ref as ChartRowRef | undefined) ?? null;
    if (ref == null) return null;
    const name = rowName(ref);
    if (c.startDate == null) return <p className={cx(small, 'mt-1')} data-chart-row-undated={c.id}>{tx('chart.rowUndated', { row: name })}</p>;
    // only its days read in full, not recorded, every value confirmable with its day: never incomplete, unread, edited, differs
    const eligible = c.days.filter((d) => {
      const r = refOf(d);
      if (r == null || d.draft?.state !== 'draft' || d.events.length > 0 || d.relation != null || r.notReadIds.length > 0 || r.candidateIds.length === 0) return false;
      return r.candidateIds.every((id) => {
        const pv = pvs.get(id);
        return pv != null && pv.state === 'open' && CONFIRMABLE.has(pv.item.content.status) && typeof pv.item.content.proposal?.time === 'number';
      });
    });
    if (eligible.length === 0 || actions == null) return null;
    const ids = eligible.flatMap((d) => refOf(d)!.candidateIds);
    const n = eligible.length;
    if (rowOpen !== c.id) {
      return (
        <div className='mt-1'>
          <button type='button' className={btn.outline} disabled={!can} data-chart-row-confirm={c.id} onClick={() => setRowOpen(c.id)}>
            {n === 1 ? tx('chart.rowConfirmOne', { row: name }) : tx('chart.rowConfirm', { row: name, n })}
          </button>
        </div>
      );
    }
    const at = shownAt(ids);
    return (
      <div className={cx(card, 'mt-2 space-y-2')} data-chart-row-check={c.id}>
        <p className='text-sm'>{tx('chart.rowCheck', { n })}</p>
        <AnchoredDocumentView
          source={sourceOf(ref.anchor?.attachmentId ?? ref.attachmentId ?? undefined)}
          anchor={ref.anchor != null ? { page: ref.anchor.page, bbox: ref.anchor.bbox } : null}
          label={name}
          loadPdfJs={loadPdfJs}
          pdfOptions={pdfOptions}
        />
        <div className='flex flex-wrap gap-2'>
          <button
            type='button' className={btn.primary} disabled={!can}
            onClick={async () => { if (await run(ids, () => actions.confirm(ids, at))) setRowOpen(null); }}
          >
            {n === 1 ? tx('chart.rowYesOne') : tx('chart.rowYes', { n })}
          </button>
          <button type='button' className={btn.ghost} disabled={busy} onClick={() => setRowOpen(null)}>{tx('cancel')}</button>
        </div>
      </div>
    );
  };

  const refusedDays = new Set(refusedIds);
  const renderDay = (d: ChartDay<any>): ReactNode => {
    const r = refOf(d);
    if (r == null || ![...r.candidateIds, ...r.notReadIds].some((id) => refusedDays.has(id))) return null;
    return <span className='block text-xs font-bold text-red-700 dark:text-red-400' data-chart-refused=''><span aria-hidden='true'>!</span><span className='sr-only'>{tx('chart.refusedMark')}</span></span>;
  };

  return (
    <div className={cx('space-y-4', className)} data-chart-review=''>
      {refusedIds.length > 0 && (
        <p className='text-sm text-red-700 dark:text-red-400' role='status' data-chart-refused-count=''>
          {refusedIds.length === 1 ? tx('chart.refusedOne') : tx('chart.refused', { n: refusedIds.length })}
        </p>
      )}
      <CycleChart
        model={model}
        columns={columns}
        lang={lang}
        onActivateDay={(c, d) => select({ cycleId: c.id, day: d.day })}
        actionable={actionable}
        selected={selected}
        rowNote={rowNote}
        renderDay={renderDay}
      />
      {(cycle == null || day == null) && detail}
    </div>
  );
}

interface DayDetailProps {
  cycle: ChartCycle<any>;
  day: ChartDay<any>;
  dayRef: ChartDayRef | null;
  pvs: Map<string, ProposedValueView>;
  lang?: string;
  contactName?: string;
  sourceOf: ChartReviewProps['sourceOf'];
  loadPdfJs?: ChartReviewProps['loadPdfJs'];
  pdfOptions?: Record<string, unknown>;
  can: boolean;
  actions: ConversationActions | null;
  busy: boolean;
  refused: Record<string, string>;
  correcting: string | null;
  setCorrecting: (id: string | null) => void;
  replacing: string | null;
  setReplacing: (key: string | null) => void;
  notice: string | null;
  onEnterDay?: ChartReviewProps['onEnterDay'];
  onReplace?: ChartReviewProps['onReplace'];
  /** Runs an answer; `after` (Replace) gives a line to show instead of moving on */
  act: (ids: string[], fn: () => Promise<ConversationOutcome>, after?: () => Promise<string | null>) => Promise<void>;
  shownAt: (ids: string[]) => number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

/** The day she tapped: what was read, her answers by case, the box on her document, previous / next */
function DayDetail ({
  cycle, day, dayRef, pvs, lang, contactName, sourceOf, loadPdfJs, pdfOptions, can, actions, busy, refused, correcting, setCorrecting,
  replacing, setReplacing, notice, onEnterDay, onReplace, act, shownAt, hasPrevious, hasNext, onPrevious, onNext
}: DayDetailProps) {
  const read = (dayRef?.candidateIds ?? []).map((id) => pvs.get(id)).filter((pv): pv is ProposedValueView => pv != null);
  const notReadPvs = (dayRef?.notReadIds ?? []).map((id) => pvs.get(id)).filter((pv): pv is ProposedValueView => pv != null);
  const open = read.filter((pv) => pv.state === 'open').map((pv) => pv.candidateId);
  const notReadIds = notReadPvs.map((pv) => pv.candidateId);
  const dated = cycle.startDate != null && day.date != null;
  const state = day.draft?.state;
  const title = [cycle.title, tx('chart.day', { n: day.day }), day.date != null ? dayText(day.date, lang) : null].filter(Boolean).join(' · ');
  const texts = [...new Set([...read.map((pv) => pv.candidateId), ...notReadIds].filter((id) => refused[id] != null && pvs.get(id)?.state === 'open').map((id) => refusalText(refused[id], contactName)))];
  const first = read[0] ?? notReadPvs[0];
  const label = first != null ? lineText(first.item.content) : title;
  const replaceKey = `${cycle.id}:${day.day}`;

  const ids = [...open, ...notReadIds];
  const at = shownAt(ids);

  let answers: ReactNode = null;
  if (actions != null && open.length > 0 && correcting != null && open.includes(correcting)) {
    const pv = pvs.get(correcting)!;
    answers = (
      <ValueCorrectionEditor
        proposal={pv.item.content.proposal}
        busy={busy}
        onSubmit={(correction) => { act([correcting], () => actions.correct(correcting, correction, at)); }}
        onCancel={() => setCorrecting(null)}
      />
    );
  } else if (actions != null && open.length > 0 && day.relation === 'differs') {
    answers = replacing === replaceKey && onReplace != null
      ? (
        <div className='space-y-2' data-chart-replace-ask=''>
          <p className='text-sm font-semibold'>{tx('chart.replaceAsk', { date: day.date != null ? dayText(day.date, lang) : title })}</p>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button' className={btn.primary} disabled={!can}
              onClick={() => {
                act(open, () => actions.confirm(open, at), async () => {
                  let removed = false;
                  try { removed = await onReplace({ candidateIds: open, recordedEvents: day.events as ChartEvent[] }); } catch { removed = false; }
                  return removed ? null : tx('chart.replaceKept');
                });
              }}
            >
              {tx('chart.replaceYes')}
            </button>
            <button type='button' className={btn.ghost} disabled={busy} onClick={() => setReplacing(null)}>{tx('cancel')}</button>
          </div>
        </div>
        )
      : (
        <div className='flex flex-wrap gap-2'>
          <button type='button' className={btn.primary} disabled={!can} onClick={() => { act(open, () => actions.dismiss(open, 'duplicate', at)); }}>{tx('chart.keepMine')}</button>
          {onReplace != null && <button type='button' className={btn.outline} disabled={!can || !dated} onClick={() => setReplacing(replaceKey)}>{tx('chart.replace')}</button>}
        </div>
        );
  } else if (actions != null && open.length > 0 && day.relation === 'same') {
    answers = (
      <div className='flex flex-wrap gap-2'>
        <button type='button' className={btn.primary} disabled={!can} onClick={() => { act(open, () => actions.dismiss(open, 'duplicate', at)); }}>{tx('duplicate')}</button>
      </div>
    );
  } else if (actions != null && open.length > 0) {
    answers = (
      <div className='flex flex-wrap gap-2'>
        <button type='button' className={btn.primary} disabled={!can || !dated} onClick={() => { act(open, () => actions.confirm(open, at)); }}>{tx('confirm')}</button>
        {read.filter((pv) => pv.state === 'open' && pv.item.content.proposal != null).map((pv) => (
          <button
            key={pv.candidateId} type='button' className={btn.outline} disabled={!can || !dated}
            aria-label={open.length > 1 ? tx('chart.changeOne', { line: lineText(pv.item.content) }) : undefined}
            onClick={() => setCorrecting(pv.candidateId)}
          >
            {tx('chart.change')}
          </button>
        ))}
        <button type='button' className={btn.ghost} disabled={!can} onClick={() => { act(ids, () => actions.dismiss(ids, 'skip', at)); }}>{tx('chart.notOnChart')}</button>
      </div>
    );
  }

  // the part of the box not read: hers to enter, or to skip (decided 2026-11-26)
  const unread = actions != null && notReadIds.length > 0 && replacing !== replaceKey && (correcting == null || !open.includes(correcting))
    ? (
      <div className='flex flex-wrap gap-2' data-chart-unread-answers=''>
        {onEnterDay != null && dated && (
          <button type='button' className={btn.primary} disabled={!can} onClick={() => onEnterDay({ date: day.date!, candidateIds: notReadIds })}>{tx('chart.enterIt')}</button>
        )}
        <button type='button' className={btn.ghost} disabled={!can} onClick={() => { act(notReadIds, () => actions.dismiss(notReadIds, 'skip', at)); }}>{tx('skip')}</button>
      </div>
      )
    : null;

  return (
    <section className={cx(card, 'space-y-3')} aria-label={title} data-chart-day={`${cycle.id}:${day.day}`}>
      <p className='text-sm font-semibold'>{title}</p>
      <div>
        <p className={cx(small, 'font-semibold')}>{tx('chart.read')}</p>
        <ul className='mt-1 space-y-1'>
          {read.map((pv) => {
            const c = pv.item.content;
            const item = c.proposal != null ? itemLabel(c.proposal.itemKey) : null;
            const value = c.proposal != null ? proposalText(c.proposal) : null;
            return (
              <li key={pv.candidateId} className='text-sm' data-candidate={pv.candidateId}>
                <span className='font-medium'>{lineText(c)}</span>
                {item != null && value != null && <span className={cx(small, 'block')}>{tx('wouldSave', { item, value })}</span>}
                {pv.state === 'confirmed' && <span className={cx(small, 'block')}>{tx('state.confirmed')}</span>}
                {pv.state === 'corrected' && <span className={cx(small, 'block')}>{tx('state.corrected')}</span>}
              </li>
            );
          })}
          {notReadPvs.map((pv) => (
            <li key={pv.candidateId} className='text-sm' data-candidate={pv.candidateId}>{tx('chart.notReadLine', { line: lineText(pv.item.content) })}</li>
          ))}
        </ul>
      </div>
      {state === 'incomplete' && <p className='text-xs font-medium text-amber-700 dark:text-amber-400'>{tx('grid.partly')}</p>}
      {state === 'unread' && <p className='text-xs font-medium text-amber-700 dark:text-amber-400'>{tx('chart.unread')}</p>}
      {day.relation === 'differs' && <p className='text-sm'>{tx('chart.differs')}</p>}
      {day.relation === 'same' && <p className='text-sm'>{tx('chart.same')}</p>}
      {!dated && <p className={small}>{tx('chart.rowUndated', { row: cycle.title ?? '' })}</p>}
      {answers}
      {unread}
      {answers == null && unread == null && day.relation !== 'same' && <p className={small}>{tx('chart.nothingLeft')}</p>}
      {notice != null && <p className='text-sm' role='status'>{notice}</p>}
      {texts.map((t) => <p key={t} className='text-sm text-red-700 dark:text-red-400' role='alert'>{t}</p>)}
      <AnchoredDocumentView
        source={sourceOf(dayRef?.attachmentId ?? undefined)}
        anchor={dayRef?.anchor != null ? { page: dayRef.anchor.page, bbox: dayRef.anchor.bbox } : null}
        label={label}
        loadPdfJs={loadPdfJs}
        pdfOptions={pdfOptions}
      />
      <div className='flex flex-wrap gap-2'>
        <button type='button' className={btn.ghost} disabled={!hasPrevious} onClick={onPrevious}>{tx('chart.previous')}</button>
        <button type='button' className={btn.ghost} disabled={!hasNext} onClick={onNext}>{tx('chart.next')}</button>
      </div>
    </section>
  );
}
