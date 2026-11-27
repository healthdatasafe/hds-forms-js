// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A paper chart read as a dated grid (data-model 4.36.0), checked day by day (plan 139 R3): hds-lib's real `conversationOf`
 * settles the fixtures, hds-feminine-cycle-ui's real chart draws them; the model and R9's pack check are faked.
 */
const ITEMS: Record<string, any> = {
  'body-vulva-mucus-inspect': { key: 'body-vulva-mucus-inspect', data: { type: 'convertible', label: { en: 'Cervical fluid' }, streamId: 'body-vulva-mucus-inspect' } },
  'body-vulva-bleeding': { key: 'body-vulva-bleeding', data: { type: 'number', label: { en: 'Bleeding' }, streamId: 'body-vulva-bleeding', eventType: 'ratio/proportion' } }
};

vi.mock('hds-lib', async (importOriginal) => {
  const real: any = await importOriginal();
  return {
    ...real,
    localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
    getHDSModel: () => ({ itemsDefs: { forKey: (k: string) => ITEMS[k] ?? null } }),
    eventToShortText: (e: any) => `${typeof e.content === 'object' ? e.content?.source?.sourceData?.mucus : e.content}`,
    cmcConversation: {
      ...real.cmcConversation,
      checkValueProposal: (p: any) => (p?.itemKey in ITEMS && typeof p.content === 'number' ? null : 'invalid-content')
    }
  };
});
vi.mock('../src/components/HDSFormField', () => ({
  HDSFormField: ({ value, onChange }: any) => <input aria-label='the value' value={String(value ?? '')} onChange={(e) => onChange(Number(e.target.value))} />
}));

const { cmcConversation } = await import('hds-lib');
const conv = await import('../src/conversation/index');

const DOC = 'chartdoc0001';
const REC = 'conv-aaaaaaaaaaaa';
const SENT = 'conv-bbbbbbbbbbbb';
const EXTRACTION = { engine: 'hds-reader', engineVersion: '1', kbVersion: '1', backend: 'vision' };
const MUCUS = 'vulva-mucus-inspect/9d-vector';
let seq = 0;

function item (kind: 'question' | 'proposed-value' | 'answer', content: Record<string, any>, at = 100) {
  seq += 1;
  return { id: `ev${seq}`, streamId: kind === 'answer' ? SENT : REC, direction: kind === 'answer' ? 'sent' : 'received', kind, about: DOC, time: at, created: at, modified: at, content: { kind, about: DOC, ...content } } as any;
}
const anchor = (row: number, column: number, page = 1) => ({ attachmentId: 'att1', page, bbox: [column * 2, 90 - row * 5, 2, 4] });
/** Day n of a row that starts on 5 January 2026, at 12:00 UTC */
const timeOf = (day: number) => Date.parse('2026-01-05T12:00:00Z') / 1000 + (day - 1) * 86400;
const mucusContent = (code: string, frequency?: string) => ({ vectors: {}, source: { key: 'creighton', sourceData: { mucus: code }, ...(frequency ? { annotations: { frequency } } : {}) } });
function value (id: string, row: number, column: number, proposal: Record<string, any>, extra: Record<string, any> = {}, page = 1) {
  return item('proposed-value', {
    candidateId: id,
    grid: { row, column },
    anchor: anchor(row, column, page),
    printed: { label: String(column), value: extra.printedValue ?? 'x' },
    proposal: { clientData: { hdsTimePrecision: 'day' }, ...proposal },
    status: 'clear',
    extraction: EXTRACTION,
    ...extra
  });
}
const mucus = (id: string, row: number, column: number, code: string, opts: { frequency?: string; dated?: boolean; status?: string; page?: number } = {}) => value(id, row, column, {
  itemKey: 'body-vulva-mucus-inspect', type: MUCUS, content: mucusContent(code, opts.frequency), ...(opts.dated === false ? {} : { time: timeOf(column) })
}, { printedValue: code, ...(opts.status ? { status: opts.status } : {}) }, opts.page);
const bleeding = (id: string, row: number, column: number, flow: number) => value(id, row, column, { itemKey: 'body-vulva-bleeding', type: 'ratio/proportion', content: flow, time: timeOf(column) }, { printedValue: 'L' });
function notRead (id: string, row: number, column: number) {
  const v = value(id, row, column, {}, { status: 'unmapped', reason: 'not-read' });
  delete v.content.proposal;
  return v;
}
const rowQ = (row: number, page = 1) => item('question', { code: 'which-row-date', context: { grid: { row, column: 1 }, anchor: anchor(row, 1, page) } });
const answer = (target: any, action: string, extra: Record<string, any> = {}, at = 200) => item('answer', { inReplyTo: target.id, action, ...extra }, at);
const dayAnswer = (q: any, day: string) => answer(q, 'confirm', { time: Date.parse(day + 'T12:00:00Z') / 1000, timePrecision: 'day' });
const of = (items: any[]) => cmcConversation.conversationOf(items, DOC);

let root: Root | null = null;
let container: HTMLDivElement;
beforeEach(() => { seq = 0; vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 }))); });
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  vi.unstubAllGlobals();
});
async function render (ui: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(ui); });
}
const buttons = (within: ParentNode = container) => [...within.querySelectorAll('button')];
const button = (text: string, within: ParentNode = container) => buttons(within).find((b) => b.textContent?.trim() === text) ?? null;
async function click (el: Element | null) {
  expect(el, 'element to click').not.toBeNull();
  await act(async () => { (el as HTMLElement).click(); });
}
/** A day's button in the chart: row (from 0), day */
const dayButton = (row: number, day: number) => [...container.querySelectorAll('.hdsfc-cycle')[row].querySelectorAll('button.hdsfc-act')]
  .find((b) => new RegExp(`^Day ${day}[,:]`).test(b.querySelector('.hdsfc-sr')?.textContent ?? '')) ?? null;
const detail = () => container.querySelector('[data-chart-day]');

function actions () {
  return {
    confirm: vi.fn(async (..._a: any[]) => ({ ok: true as const })),
    correct: vi.fn(async (..._a: any[]) => ({ ok: true as const })),
    dismiss: vi.fn(async (..._a: any[]) => ({ ok: true as const })),
    answer: vi.fn(async (..._a: any[]) => ({ ok: true as const }))
  };
}

describe('[CHART] chartDraftOf: a dated grid as the rows of a chart draft', () => {
  it('not a dated grid: no rows', () => {
    const v = item('proposed-value', { candidateId: 'c1', proposal: { itemKey: 'body-vulva-bleeding', type: 'ratio/proportion', content: 0.35, time: 1 }, status: 'clear', extraction: EXTRACTION });
    expect(conv.chartDraftOf(of([v]))).toEqual({ rows: [], days: new Map() });
  });

  it('rows in document order (page, row), a day per box, its values as records on the item\'s stream', () => {
    const c = of([
      mucus('p2', 1, 3, '6C', { page: 2 }), mucus('r2', 2, 1, '4'), mucus('r1b', 1, 4, '8C', { frequency: 'X2' }), bleeding('r1a', 1, 2, 0.35), mucus('r1c', 1, 2, '10KL')
    ]);
    const draft = conv.chartDraftOf(c);
    expect(draft.rows.map((r) => r.id)).toEqual(['att1:1:1', 'att1:1:2', 'att1:2:1']);
    const [one] = draft.rows;
    expect(one.days.map((d) => d.day)).toEqual([2, 4]);
    expect(one.days[0]).toMatchObject({ state: 'draft', ref: { candidateIds: ['r1a', 'r1c'], notReadIds: [], attachmentId: 'att1', anchor: { page: 1 } } });
    expect(one.days[0].events).toEqual([
      { id: 'r1a', streamIds: ['body-vulva-bleeding'], type: 'ratio/proportion', content: 0.35, time: timeOf(2) },
      { id: 'r1c', streamIds: ['body-vulva-mucus-inspect'], type: MUCUS, content: mucusContent('10KL'), time: timeOf(2) }
    ]);
    expect(draft.days.get('att1:1:1')!.get(4)!.candidateIds).toEqual(['r1b']);
    expect(conv.chartDraftOf(c, { streamOf: (k) => `s-${k}` }).rows[0].days[0].events[0].streamIds).toEqual(['s-body-vulva-bleeding']);
  });

  it('states: edited, incomplete, unread, draft; values skipped, in her record, asked for or read again are left out', () => {
    const skipped = mucus('s', 1, 5, '2');
    const dup = mucus('d', 1, 6, '2');
    const old = mucus('o', 1, 7, '2');
    const fixed = mucus('f', 1, 8, '4');
    const items = [
      mucus('a', 1, 1, '10KL'), mucus('b', 1, 2, '8C'), notRead('nb', 1, 2), notRead('nc', 1, 3), skipped, dup, old,
      { ...mucus('o2', 1, 7, '6C'), content: { ...mucus('o2', 1, 7, '6C').content, replaces: 'o' } }, fixed,
      answer(skipped, 'skip', { candidateIds: ['s'] }), answer(dup, 'duplicate', { candidateIds: ['d'] }),
      answer(fixed, 'correct', { candidateIds: ['f'], written: [{ candidateId: 'f', eventId: 'w-f' }] })
    ];
    const c = of(items);
    expect(c.proposedValues.find((p) => p.candidateId === 'f')!.state).toBe('corrected');
    const { rows } = conv.chartDraftOf(c, { written: (id) => (id === 'w-f' ? { type: MUCUS, content: mucusContent('10KL') } : null) });
    const states = Object.fromEntries(rows[0].days.map((d) => [d.day, d.state]));
    expect(states).toEqual({ 1: 'draft', 2: 'incomplete', 3: 'unread', 7: 'draft', 8: 'edited' });
    const day = (n: number) => rows[0].days.find((d) => d.day === n)!;
    expect(day(2).ref).toMatchObject({ candidateIds: ['b'], notReadIds: ['nb'] });
    expect(day(3).events).toEqual([]);
    expect(day(3).ref).toMatchObject({ candidateIds: [], notReadIds: ['nc'] });
    expect(day(7).ref).toMatchObject({ candidateIds: ['o2'] });
    // her correction is drawn, not the proposal; without her record, the proposal
    expect(day(8).events[0].content).toEqual(mucusContent('10KL'));
    expect(conv.chartDraftOf(c).rows[0].days.find((d) => d.day === 8)!.events[0].content).toEqual(mucusContent('4'));
    // a box not read, once skipped, is gone
    expect(conv.chartDraftOf(of([...items, answer(items[3], 'skip', { candidateIds: ['nc'] }, 300)])).rows[0].days.map((d) => d.day)).not.toContain(3);
  });

  it('a row is dated by her answer to its which-row-date, else undated; the row ref names its question', () => {
    const q1 = rowQ(1);
    const q2 = rowQ(2);
    const q3 = rowQ(3);
    const c = of([q1, q2, q3, mucus('a', 1, 1, '4'), mucus('b', 2, 1, '4', { dated: false }), mucus('c', 3, 1, '4', { dated: false }),
      dayAnswer(q1, '2026-01-05'), answer(q3, 'confirm', { timePrecision: 'unknown' })]);
    const { rows } = conv.chartDraftOf(c);
    expect(rows.map((r) => r.startDate)).toEqual(['2026-01-05', undefined, undefined]);
    expect(rows[0].ref).toEqual({ questionId: q1.id, anchor: anchor(1, 1), attachmentId: 'att1', page: 1, row: 1 });
    expect((rows[1].ref as any).questionId).toBe(q2.id);
  });
});

describe('[CHART] ChartReview: the chart, the day she taps, her answers', () => {
  const recorded = [
    { id: 'r1', streamIds: ['body-vulva-mucus-inspect'], type: MUCUS, content: mucusContent('10KL', 'X2'), time: timeOf(1) },
    { id: 'r2', streamIds: ['body-vulva-mucus-inspect'], type: MUCUS, content: mucusContent('6C'), time: timeOf(2) }
  ];
  const fixed = () => mucus('a7', 1, 7, '4');
  function chart () {
    const q1 = rowQ(1);
    const q2 = rowQ(2);
    const a7 = fixed();
    return [
      q1, q2, dayAnswer(q1, '2026-01-05'),
      mucus('a1', 1, 1, '10KL', { frequency: 'X2' }), // the same as recorded
      mucus('a2', 1, 2, '8C'), // recorded otherwise
      mucus('a3', 1, 3, '4'), bleeding('a3b', 1, 3, 0.35),
      mucus('a4', 1, 4, '2'),
      mucus('a5', 1, 5, '10KL'), notRead('n5', 1, 5),
      notRead('n6', 1, 6),
      a7, answer(a7, 'correct', { candidateIds: ['a7'], written: [{ candidateId: 'a7', eventId: 'w7' }] }),
      mucus('a8', 1, 8, '6C', { status: 'check' }),
      mucus('b1', 2, 1, '4', { dated: false })
    ];
  }
  const dayOf = (e: any) => new Date(e.time * 1000).toISOString().slice(0, 10);
  const sourceOf = () => ({ kind: 'image', url: 'data:image/png;base64,AAAA' }) as any;
  const review = (a: any, extra: Record<string, any> = {}, items = chart()) => (
    <conv.ChartReview conversation={of(items)} actions={a} recorded={recorded} dayOf={dayOf} today='2026-02-01' sourceOf={sourceOf} lang='en' {...extra} />
  );

  it('draws the rows, one dated with her records beside it, one undated; a day the same as hers is answered "already in my record"', async () => {
    const a = actions();
    await render(review(a));
    expect(container.querySelectorAll('.hdsfc-cycle')).toHaveLength(2);
    expect(container.querySelector('.hdsfc-cycle .hdsfc-title')!.textContent).toContain('Row 1, from January 5, 2026');
    expect(container.querySelector('td[data-relation="same"]')).not.toBeNull();
    for (const n of [2, 3, 4, 5, 6, 8]) expect(dayButton(0, n), `day ${n}`).not.toBeNull();
    // corrected and nothing left to answer
    expect(dayButton(0, 7)).toBeNull();
    expect(dayButton(1, 1)).not.toBeNull();
    expect(container.textContent).toContain('Tap a day on the chart to check it.');
    await click(dayButton(0, 1));
    expect(button('Confirm', detail()!)).toBeNull();
    await click(button('Already in my record', detail()!));
    expect(a.dismiss).toHaveBeenCalledWith(['a1'], 'duplicate', expect.any(Number));
  });

  it('a draft day: Confirm with its values, Change one, Not on my chart; then the next day to check', async () => {
    const a = actions();
    await render(review(a));
    await click(dayButton(0, 3));
    const d = detail()!;
    expect(d.textContent).toContain('Row 1, box 3: 4');
    expect(d.textContent).toContain('Row 1, box 3: L');
    expect(d.querySelector('[role="region"]')).not.toBeNull();
    expect(buttons(d).filter((b) => b.textContent === 'Change').map((b) => b.getAttribute('aria-label'))).toEqual(['Change Row 1, box 3: 4', 'Change Row 1, box 3: L']);
    expect(button('Keep mine', d)).toBeNull();
    await click(button('Confirm', d));
    expect(a.confirm).toHaveBeenCalledWith(['a3', 'a3b'], expect.any(Number));
    expect(detail()!.getAttribute('data-chart-day')).toMatch(/:4$/);
    await click(button('Not on my chart', detail()!));
    expect(a.dismiss).toHaveBeenCalledWith(['a4'], 'skip', expect.any(Number));
  });

  it('Change opens the value\'s own editor and corrects that value only', async () => {
    const a = actions();
    await render(review(a));
    await click(dayButton(0, 3));
    await click(buttons(detail()!).find((b) => b.getAttribute('aria-label') === 'Change Row 1, box 3: L')!);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="the value"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0.55');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(button('Save'));
    expect(a.correct).toHaveBeenCalledWith('a3b', expect.objectContaining({ itemKey: 'body-vulva-bleeding', content: 0.55 }), expect.any(Number));
  });

  it('recorded otherwise: Keep mine; Replace only with onReplace, after a second step, confirm then the host removes hers', async () => {
    const a = actions();
    await render(review(a));
    await click(dayButton(0, 2));
    expect(detail()!.textContent).toContain('You recorded this day otherwise.');
    expect(button('Confirm', detail()!)).toBeNull();
    expect(button('Replace with the chart’s')).toBeNull();
    await click(button('Keep mine'));
    expect(a.dismiss).toHaveBeenCalledWith(['a2'], 'duplicate', expect.any(Number));

    const b = actions();
    const onReplace = vi.fn(async (..._a: any[]) => true);
    await render(review(b, { onReplace }));
    await click(dayButton(0, 2));
    await click(button('Replace with the chart’s'));
    expect(b.confirm).not.toHaveBeenCalled();
    expect(detail()!.textContent).toContain('Remove your record of January 6, 2026?');
    await click(button('Cancel', detail()!));
    expect(button('Keep mine')).not.toBeNull();
    await click(button('Replace with the chart’s'));
    await click(button('Yes, remove mine'));
    expect(b.confirm).toHaveBeenCalledWith(['a2'], expect.any(Number));
    expect(onReplace).toHaveBeenCalledWith({ candidateIds: ['a2'], recordedEvents: [recorded[1]] });
    expect(b.confirm.mock.invocationCallOrder[0]).toBeLessThan(onReplace.mock.invocationCallOrder[0]);

    // the host kept hers: said, nothing else removed
    const c = actions();
    await render(review(c, { onReplace: vi.fn(async () => false) }));
    await click(dayButton(0, 2));
    await click(button('Replace with the chart’s'));
    await click(button('Yes, remove mine'));
    expect(detail()!.textContent).toContain('your own record was kept');
  });

  it('a box not read: Enter it myself (the host\'s form) or Skip; part not read is said, and Confirm covers the part read', async () => {
    const a = actions();
    const onEnterDay = vi.fn();
    await render(review(a, { onEnterDay }));
    await click(dayButton(0, 6));
    expect(detail()!.textContent).toContain('This box has writing that was not read');
    expect(button('Confirm', detail()!)).toBeNull();
    await click(button('Enter it myself'));
    expect(onEnterDay).toHaveBeenCalledWith({ date: '2026-01-10', candidateIds: ['n6'] });
    expect(a.dismiss).not.toHaveBeenCalled();
    await click(button('Skip', detail()!));
    expect(a.dismiss).toHaveBeenCalledWith(['n6'], 'skip', expect.any(Number));

    await click(dayButton(0, 5));
    expect(detail()!.textContent).toContain('Part of this box was not read');
    await click(button('Confirm', detail()!));
    expect(a.confirm).toHaveBeenCalledWith(['a5'], expect.any(Number));
  });

  it('an undated row: no confirm, its first day asked first; no Enter it myself without a day', async () => {
    const a = actions();
    await render(review(a, { onEnterDay: vi.fn() }));
    expect(container.querySelector('[data-chart-row-undated]')!.textContent).toContain('Row 2: its first day is not answered yet');
    expect(container.querySelectorAll('[data-chart-row-confirm]')).toHaveLength(1);
    await click(dayButton(1, 1));
    expect((button('Confirm', detail()!) as HTMLButtonElement).disabled).toBe(true);
    expect((button('Not on my chart', detail()!) as HTMLButtonElement).disabled).toBe(false);
    await render(review(a, { onEnterDay: vi.fn() }, [rowQ(2), notRead('m1', 2, 1)]));
    await click(dayButton(0, 1));
    expect(button('Enter it myself')).toBeNull();
    expect(button('Skip', detail()!)).not.toBeNull();
  });

  it('a row confirm shows the row on her document first, then covers its days read in full that she did not record', async () => {
    const a = actions();
    await render(review(a));
    expect(container.querySelector('[data-chart-row-check]')).toBeNull();
    await click(button('Confirm Row 1 at once (3 days)'));
    const check = container.querySelector('[data-chart-row-check]')!;
    expect(check.querySelector('[role="region"]')!.getAttribute('aria-label')).toBe('Your document, Row 1');
    expect(a.confirm).not.toHaveBeenCalled();
    await click(button('Confirm the 3 days', check));
    // never the same, the different, the part read, the not read, the corrected
    expect(a.confirm).toHaveBeenCalledWith(['a3', 'a3b', 'a4', 'a8'], expect.any(Number));
    expect(container.querySelector('[data-chart-row-check]')).toBeNull();
  });

  it('a refusal is said on its day, marked on the chart and counted above it; the day stays shown', async () => {
    const a = actions();
    a.confirm.mockResolvedValueOnce({ ok: true, refused: [{ candidateId: 'a3b', reason: 'changed-since-shown' }] } as any);
    await render(review(a));
    await click(dayButton(0, 3));
    await click(button('Confirm', detail()!));
    expect(detail()!.getAttribute('data-chart-day')).toMatch(/:3$/);
    expect(detail()!.querySelector('[role="alert"]')!.textContent).toBe('This was updated meanwhile: look at it again.');
    expect(container.querySelector('[data-chart-refused-count]')!.textContent).toBe('1 value was not saved: its day is marked “!”.');
    expect(dayButton(0, 3)!.closest('td')!.querySelector('[data-chart-refused]')).not.toBeNull();
    expect(dayButton(0, 4)!.closest('td')!.querySelector('[data-chart-refused]')).toBeNull();
    // a whole failure is said on each day it covered
    a.dismiss.mockResolvedValueOnce({ ok: false, reason: 'write-failed' } as any);
    await click(dayButton(0, 4));
    await click(button('Not on my chart', detail()!));
    expect(detail()!.querySelector('[role="alert"]')!.textContent).toBe('This could not be done. Try again.');
    expect(container.querySelector('[data-chart-refused-count]')!.textContent).toContain('2 values were not saved');
  });

  it('busy: one answer at a time, its buttons off until it is done; Previous and Next move between days to check', async () => {
    const a = actions();
    let release: (v: any) => void = () => {};
    a.confirm.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    await render(review(a));
    await click(dayButton(0, 3));
    await click(button('Confirm', detail()!));
    expect((button('Not on my chart', detail()!) as HTMLButtonElement).disabled).toBe(true);
    await click(button('Not on my chart', detail()!));
    expect(a.dismiss).not.toHaveBeenCalled();
    await act(async () => { release({ ok: true }); });
    expect(detail()!.getAttribute('data-chart-day')).toMatch(/:4$/);
    await click(button('Previous'));
    expect(detail()!.getAttribute('data-chart-day')).toMatch(/:3$/);
    await click(button('Next'));
    expect(detail()!.getAttribute('data-chart-day')).toMatch(/:4$/);
  });

  it('read-only without actions; nothing drawn for a document that is no dated grid', async () => {
    await render(review(null));
    await click(dayButton(0, 3));
    expect(button('Confirm', detail()!)).toBeNull();
    expect(button('Not on my chart')).toBeNull();
    expect(container.querySelector('[data-chart-row-confirm]')).toBeNull();
    const plain = item('proposed-value', { candidateId: 'c1', proposal: { itemKey: 'body-vulva-bleeding', type: 'ratio/proportion', content: 0.35, time: 1 }, status: 'clear', extraction: EXTRACTION });
    await render(review(actions(), {}, [plain]));
    expect(container.querySelector('[data-chart-review]')).toBeNull();
  });
});
