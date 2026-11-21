// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The conversation one by one (perki, plan 128): the next step about a document (`nextStep`), the step and document
 * bubbles, her answers folded into runs. hds-lib's real `conversationOf` settles the fixtures; the pack is faked.
 */
const ITEMS: Record<string, any> = {
  ferritin: { key: 'ferritin', data: { type: 'number', label: { en: 'Ferritin' }, streamId: 'ferritin', eventType: 'concentration/ug-l' } }
};
vi.mock('hds-lib', async (importOriginal) => {
  const real: any = await importOriginal();
  return {
    ...real,
    localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
    getHDSModel: () => ({ itemsDefs: { forKey: (k: string) => ITEMS[k] ?? null } }),
    eventToShortText: (e: any) => `${e.content} µg/L`,
    cmcConversation: {
      ...real.cmcConversation,
      checkValueProposal: (p: any) => (p?.itemKey in ITEMS ? null : 'invalid-content'),
      proposalRefusal: (pv: any, engines: string[]) => {
        if (pv.state === 'replaced') return 'replaced';
        if (pv.state !== 'open' && pv.state !== 'skipped') return 'answered';
        if (!['clear', 'check'].includes(pv.item.content.status)) return 'status';
        if (!engines.includes(pv.item.content.extraction?.engine)) return 'engine-not-vouched';
        return null;
      }
    }
  };
});
vi.mock('../src/components/HDSFormField', () => ({ HDSFormField: () => <input aria-label='the value' /> }));

const { cmcConversation } = await import('hds-lib');
const conv = await import('../src/conversation/index');

const DOC = 'doc1';
const EX = { engine: 'hds-reader', engineVersion: '1.0.0', kbVersion: '1.0.0', backend: 'text-layer' };
const E = ['hds-reader'];
let seq = 0;
function item (kind: 'question' | 'proposed-value' | 'answer', content: Record<string, any>, at = 100) {
  seq += 1;
  return { id: `ev${seq}`, streamId: kind === 'answer' ? 'conv-s' : 'conv-r', direction: kind === 'answer' ? 'sent' : 'received', kind, about: DOC, time: at, created: at + seq, modified: at, content: { kind, about: DOC, ...content } } as any;
}
const pv = (candidateId: string, extra: Record<string, any> = {}) => item('proposed-value', {
  candidateId,
  printed: { label: candidateId, value: '1' },
  proposal: { itemKey: 'ferritin', type: 'concentration/ug-l', content: 1, time: 1773316800, clientData: { hdsTimePrecision: 'day' } },
  status: 'clear',
  extraction: EX,
  ...extra
});
const at = (y: number) => ({ anchor: { attachmentId: 'a', page: 1, bbox: [5, y, 80, 2] } });
const question = (code: string, extra: Record<string, any> = {}) => item('question', { code, ...extra });
const answer = (target: any, action: string, extra: Record<string, any> = {}, t = 200) => item('answer', { inReplyTo: target.id, action, ...extra }, t);
const of = (items: any[]) => cmcConversation.conversationOf(items, DOC);
const ready = { status: 'awaiting-answers' };

beforeEach(() => { seq = 0; });

describe('[OBO] nextStep: what she answers next', () => {
  it('is-this-yours first; nothing while the contact still reads; nothing once not mine', () => {
    const q = question('is-this-yours');
    const c = of([pv('a'), q]);
    expect(conv.nextStep(c, E, ready)).toMatchObject({ kind: 'question', question: { code: 'is-this-yours' } });
    expect(conv.nextStep(c, E, { status: 'reading' })).toBeNull();
    expect(conv.nextStep(of([pv('a'), q, answer(q, 'not-mine')]), E, ready)).toBeNull();
  });

  it('then the document date, then the questions about one value, then the values to check, then the clear ones', () => {
    const a = pv('a', at(40));
    const b = pv('b', { ...at(30), status: 'check' });
    const c = pv('c', at(10));
    const d = pv('d', { ...at(20), proposal: undefined, status: 'unit-missing' });
    const date = question('which-date', { context: { dates: [{ day: '2026-11-18', text: '18.11.2026' }] } });
    const unit = question('which-unit', { candidateId: 'd', options: ['mmol/L'] });
    let items: any[] = [a, b, c, d, date, unit];
    expect(conv.nextStep(of(items), E, { ...ready, batchMin: Infinity })).toMatchObject({ kind: 'question', question: { code: 'which-date' } });
    items = [...items, answer(date, 'confirm', { time: 1, timePrecision: 'day' }, 300)];
    expect(conv.nextStep(of(items), E, { ...ready, batchMin: Infinity })).toMatchObject({ kind: 'question', question: { code: 'which-unit' } });
    items = [...items, answer(unit, 'skip', { candidateIds: ['d'] }, 301)];
    expect(conv.nextStep(of(items), E, { ...ready, batchMin: Infinity })).toMatchObject({ kind: 'value', value: { candidateId: 'b' } });
    items = [...items, answer(b, 'confirm', { candidateIds: ['b'], written: [{ candidateId: 'b', eventId: 'v' }] }, 302)];
    // the clear ones in the order the document prints them
    expect(conv.nextStep(of(items), E, { ...ready, batchMin: Infinity })).toMatchObject({ kind: 'value', value: { candidateId: 'c' } });
  });

  it('three or more clear values: one batch step (never a value to check); "one by one" declines it', () => {
    const c = of([pv('a', at(1)), pv('b', at(2)), pv('c', at(3)), pv('k', { ...at(4), status: 'check' })]);
    expect(conv.nextStep(c, E, ready)).toMatchObject({ kind: 'value', value: { candidateId: 'k' } });
    const clear = of([pv('a', at(1)), pv('b', at(2)), pv('c', at(3))]);
    const batch = conv.nextStep(clear, E, ready) as any;
    expect(batch.kind).toBe('batch');
    expect(batch.values.map((v: any) => v.candidateId)).toEqual(['a', 'b', 'c']);
    expect(conv.nextStep(clear, E, { ...ready, batchDeclined: true })).toMatchObject({ kind: 'value', value: { candidateId: 'a' } });
    expect(conv.nextStep(of([pv('a'), pv('b')]), E, ready)).toMatchObject({ kind: 'value' });
  });

  it('then one summary: kept aside, waiting for the contact, set aside ("Later"), unanswerable; OK closes it', () => {
    const kept = pv('k', { status: 'kept-aside', reason: 'no-item', proposal: undefined });
    const later = pv('l');
    const notVouched = pv('n', { extraction: { ...EX, engine: 'other' } });
    const odd = question('x-acme-thing');
    const items = [kept, later, notVouched, odd, answer(later, 'skip', { candidateIds: ['l'] })];
    const s = conv.nextStep(of(items), E, ready) as any;
    expect(s.kind).toBe('summary');
    expect(s.keptAside.map((v: any) => v.candidateId)).toEqual(['k']);
    expect(s.skipped.map((v: any) => v.candidateId)).toEqual(['l']);
    expect(s.waiting.map((w: any) => [w.value.candidateId, w.block])).toEqual([['n', 'engine-not-vouched']]);
    expect(s.unanswerable.map((q: any) => q.code)).toEqual(['x-acme-thing']);
    expect(conv.nextStep(of(items), E, { ...ready, summaryAcknowledged: true })).toBeNull();
    // "Review the one set aside": it is a step again
    expect(conv.nextStep(of(items), E, { ...ready, includeSkipped: true })).toMatchObject({ kind: 'value', value: { candidateId: 'l' } });
  });

  it('"Later" sets a value aside without writing: the next one comes, it waits in the summary, "review" brings it back', () => {
    const a = pv('a', at(1));
    const b = pv('b', at(2));
    const c = of([a, b]);
    expect(conv.nextStep(c, E, { ...ready, deferred: ['a'] })).toMatchObject({ kind: 'value', value: { candidateId: 'b' } });
    const s = conv.nextStep(c, E, { ...ready, deferred: ['a', 'b'] }) as any;
    expect(s.kind).toBe('summary');
    expect(s.skipped.map((v: any) => v.candidateId)).toEqual(['a', 'b']);
    expect(conv.nextStep(c, E, { ...ready, deferred: ['a', 'b'], includeSkipped: true })).toMatchObject({ kind: 'value', value: { candidateId: 'a' } });
  });

  it('a written value is never a step, also once the contact deleted what was answered (R10)', () => {
    const a = pv('a');
    const b = pv('b');
    const batch = answer(a, 'confirm', { candidateIds: ['a', 'b'], written: [{ candidateId: 'a', eventId: 'v1' }, { candidateId: 'b', eventId: 'v2' }] });
    expect(conv.nextStep(of([b, batch]), E, ready)).toBeNull();
  });

  it('the batch comes only once every question and every value to check is answered', () => {
    const k = pv('k', { ...at(4), status: 'check' });
    const date = question('which-date', { context: { dates: [{ day: '2026-11-18', text: '18.11.2026' }] } });
    let items: any[] = [pv('a', at(1)), pv('b', at(2)), pv('c', at(3)), k, date];
    expect(conv.nextStep(of(items), E, ready)).toMatchObject({ kind: 'question' });
    items = [...items, answer(date, 'confirm', { time: 1, timePrecision: 'day' }, 300)];
    expect(conv.nextStep(of(items), E, ready)).toMatchObject({ kind: 'value', value: { candidateId: 'k' } });
    items = [...items, answer(k, 'confirm', { candidateIds: ['k'], written: [{ candidateId: 'k', eventId: 'v' }] }, 301)];
    expect(conv.nextStep(of(items), E, ready)).toMatchObject({ kind: 'batch' });
  });

  it('a value her record holds is never in the batch nor a step: the summary lists it, to add anyway', () => {
    const a = pv('a', at(1));
    const items = [a, pv('b', at(2)), pv('c', at(3)), pv('d', at(4)), answer(a, 'duplicate', { candidateIds: ['a'], basis: 'existing-value' })];
    const batch = conv.nextStep(of(items), E, ready) as any;
    expect(batch.values.map((v: any) => v.candidateId)).toEqual(['b', 'c', 'd']);
    expect(conv.batchCandidates(of(items), E, ready).map((v: any) => v.candidateId)).toEqual(['b', 'c', 'd']);
    const s = conv.nextStep(of(items), E, { ...ready, batchDeclined: true, deferred: ['b', 'c', 'd'] }) as any;
    expect(s.kind).toBe('summary');
    expect(s.alreadyInRecord.map((v: any) => v.candidateId)).toEqual(['a']);
    // only values her record holds: still a summary, so she can add one anyway
    expect(conv.nextStep(of([a, answer(a, 'duplicate', { candidateIds: ['a'] })]), E, ready)).toMatchObject({ kind: 'summary' });
  });

  it('an anchor on another document is ignored (R11); one without eventId is on its document', () => {
    expect(conv.anchorOn({ page: 1, eventId: 'other' }, DOC)).toBeNull();
    expect(conv.anchorOn({ page: 1, eventId: DOC }, DOC)).toEqual({ page: 1, eventId: DOC });
    expect(conv.anchorOn({ page: 2 }, DOC)).toEqual({ page: 2 });
    expect(conv.anchorOn(null, DOC)).toBeNull();
  });

  it('the key changes with what the step shows (ids and modified)', () => {
    const a = pv('a');
    const k1 = (conv.nextStep(of([a]), E, ready) as any).key;
    const a2 = { ...a, modified: 999 };
    expect((conv.nextStep(of([a2]), E, ready) as any).key).not.toBe(k1);
  });

  it('progress: values, questions, answered, kept aside', () => {
    const a = pv('a');
    const q = question('is-this-yours');
    const c = of([a, pv('b'), pv('k', { status: 'kept-aside', reason: 'no-item', proposal: undefined }), q, answer(q, 'confirm'), answer(a, 'confirm', { candidateIds: ['a'], written: [{ candidateId: 'a', eventId: 'v' }] })]);
    expect(conv.conversationProgress(c, E, ready)).toMatchObject({ values: 3, questions: 1, answered: 2, keptAside: 1, alreadyInRecord: 0 });
    expect(conv.progressText({ values: 28, questions: 1, answered: 9, waitingOnContact: 0, keptAside: 0, alreadyInRecord: 3 })).toBe('28 values · 1 question · 9 answered · 3 already in your record');
  });

  it('progress: a value re-proposed after her answer counts once', () => {
    const old = pv('g', { proposal: undefined, status: 'unit-missing' });
    const unit = question('which-unit', { candidateId: 'g', options: ['mmol/L'] });
    const neu = pv('g2', { replaces: 'g', status: 'check' });
    const items = [old, pv('f'), unit, answer(unit, 'choose', { option: 'mmol/L', candidateIds: ['g'] }), neu];
    const c = of(items);
    expect(c.proposedValues.find((p: any) => p.candidateId === 'g')?.state).toBe('replaced');
    expect(conv.conversationProgress(c, E, ready).values).toBe(2);
    // once done, the contact deleted every value (R10): her answers alone, the unit answer counts no value
    const after = of([answer(unit, 'choose', { option: 'mmol/L', candidateIds: ['g'] }), answer(neu, 'confirm', { candidateIds: ['g2', 'f'], written: [{ candidateId: 'g2', eventId: 'v1' }, { candidateId: 'f', eventId: 'v2' }] })]);
    expect(conv.conversationProgress(after, E, ready)).toMatchObject({ values: 2, answered: 2 });
  });

  it('progress keeps counting what the contact deleted once done (R10): written and already in her record', () => {
    const a = pv('a');
    const d = pv('d');
    const items = [pv('k', { status: 'kept-aside', reason: 'no-item', proposal: undefined }),
      answer(a, 'confirm', { candidateIds: ['a', 'b'], written: [{ candidateId: 'a', eventId: 'v1' }, { candidateId: 'b', eventId: 'v2' }] }),
      answer(d, 'duplicate', { candidateIds: ['d'], basis: 'existing-value' })];
    expect(conv.conversationProgress(of(items), E, ready)).toMatchObject({ values: 4, answered: 2, keptAside: 1, alreadyInRecord: 1 });
  });
});

describe('[OBO] answers folded into runs', () => {
  it('three value confirmations in a row are one group; a question answer breaks the run', () => {
    const v = (id: string) => answer({ id }, 'confirm', { candidateIds: [id], written: [{ candidateId: id, eventId: 'w' + id }] });
    const q = () => answer({ id: 'q' }, 'confirm', {});
    const runs = conv.answerRuns([v('a'), v('b'), v('c'), q(), v('d'), v('e')]);
    expect(runs.map((r) => r.length)).toEqual([3, 1, 1, 1]);
  });
});

describe('[OBO] the anchor names its document (data-model 4.25.0)', () => {
  it('anchor.eventId first, else the one related event, else null', () => {
    expect(conv.anchorDocumentId({ hdsSourceAnchor: { attachmentId: 'a', page: 1, eventId: 'doc9' }, related: { x: true, y: true } })).toBe('doc9');
    expect(conv.anchorDocumentId({ hdsSourceAnchor: { attachmentId: 'a', page: 1 }, related: { doc7: true } })).toBe('doc7');
    expect(conv.anchorDocumentId({ related: { a: true, b: true } })).toBeNull();
    expect(conv.readSourceAnchor({ hdsSourceAnchor: { attachmentId: 'a', page: 2, eventId: 'd' } })).toEqual({ attachmentId: 'a', page: 2, eventId: 'd' });
  });
});

let root: Root | null = null;
let container: HTMLDivElement;
afterEach(() => { act(() => root?.unmount()); root = null; container?.remove(); vi.unstubAllGlobals(); });
async function render (ui: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(ui); });
}
const button = (text: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) ?? null;
async function click (el: Element | null) { expect(el).not.toBeNull(); await act(async () => { (el as HTMLElement).click(); }); }
function actions () {
  return {
    confirm: vi.fn(async () => ({ ok: true as const })),
    correct: vi.fn(async () => ({ ok: true as const })),
    dismiss: vi.fn(async () => ({ ok: true as const })),
    answer: vi.fn(async () => ({ ok: true as const }))
  };
}

describe('[OBO] ConversationStepBubble', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 }))));
  const bubble = (c: any, step: any, a: any = actions(), extra: Record<string, any> = {}) => (
    <conv.ConversationStepBubble step={step} conversation={c} contactName='Dr Test' title='Lab report' sourceOf={() => ({ url: 'https://x.backloop.dev/d.png', kind: 'image' })} actions={a} {...extra} />
  );

  it('a value: what was read, what would be saved, quick replies; each sends with the shownAt of when it showed', async () => {
    const a = pv('a', { printed: { label: 'Ferritine', value: '48', unit: 'ng/mL' } });
    const c = of([a]);
    const acts = actions();
    await render(bubble(c, conv.nextStep(c, E, { ...ready, batchMin: Infinity }), acts));
    expect(container.textContent).toContain('I read Ferritine 48 ng/mL.');
    expect(container.textContent).toContain('Save it as Ferritin: 1 µg/L?');
    expect(container.textContent).toContain('About “Lab report”');
    await click(button('Confirm'));
    expect(acts.confirm).toHaveBeenCalledWith(['a'], 100);
    await click(button('Later'));
    expect(acts.dismiss).toHaveBeenCalledWith(['a'], 'skip', 100);
    await click(button('Already in my record'));
    expect(acts.dismiss).toHaveBeenCalledWith(['a'], 'duplicate', 100);
  });

  it('with onLater, "Later" writes nothing: the host sets the value aside', async () => {
    const a = pv('a');
    const c = of([a]);
    const acts = actions();
    const onLater = vi.fn();
    await render(bubble(c, conv.nextStep(c, E, { ...ready, batchMin: Infinity }), acts, { onLater }));
    await click(button('Later'));
    expect(onLater).toHaveBeenCalledWith('a');
    expect(acts.dismiss).not.toHaveBeenCalled();
  });

  it('a value to check opens on the document; Correct opens the item\'s field', async () => {
    const k = pv('k', { status: 'check', ...at(10) });
    const c = of([k]);
    await render(bubble(c, conv.nextStep(c, E, ready)));
    expect(container.querySelector('[role="region"]')).not.toBeNull();
    await click(button('Correct'));
    expect(container.querySelector('input[aria-label="the value"]')).not.toBeNull();
  });

  it('the batch: its list to see, "Confirm the 3" sends them all, "One by one" declines', async () => {
    const c = of([pv('a', at(1)), pv('b', at(2)), pv('c', at(3))]);
    const acts = actions();
    const onDeclineBatch = vi.fn();
    await render(bubble(c, conv.nextStep(c, E, ready), acts, { onDeclineBatch }));
    expect(container.textContent).toContain('3 items have been found with a high level of confidence. Do you want to review them one by one?');
    expect(container.querySelectorAll('details li').length).toBe(3);
    await click(button('No, save them all'));
    expect(acts.confirm).toHaveBeenCalledWith(['a', 'b', 'c'], 100);
    await click(button('Yes, one by one'));
    expect(onDeclineBatch).toHaveBeenCalled();
  });

  it('a question in a bubble: its options as quick replies', async () => {
    const q = question('which-date', { context: { dates: [{ day: '2026-11-18', text: '18.11.2026' }] } });
    const c = of([q]);
    const acts = actions();
    await render(bubble(c, conv.nextStep(c, E, ready), acts));
    expect(container.querySelector('[data-conversation-step="question"]')).not.toBeNull();
    await click(button('I do not know'));
    expect(acts.answer).toHaveBeenCalledWith(q.id, { action: 'confirm', timePrecision: 'unknown' }, 100);
  });

  it('the summary: kept aside with "Ask for it", the ones set aside to review, OK', async () => {
    const kept = pv('k', { status: 'kept-aside', reason: 'no-item', requestKey: 'lipase', proposal: undefined });
    const later = pv('l');
    const c = of([kept, later, answer(later, 'skip', { candidateIds: ['l'] })]);
    const acts = actions();
    const onAcknowledgeSummary = vi.fn();
    const onReviewSkipped = vi.fn();
    await render(bubble(c, conv.nextStep(c, E, ready), acts, { onAcknowledgeSummary, onReviewSkipped }));
    await click(button('Ask for it'));
    expect(acts.dismiss).toHaveBeenCalledWith(['k'], 'request-item', 100);
    await click(button('Review the one set aside'));
    expect(onReviewSkipped).toHaveBeenCalled();
    await click(button('OK'));
    expect(onAcknowledgeSummary).toHaveBeenCalled();
  });

  it('a cumulative report: each value says its sampling day (and printed time); a one-day report does not', async () => {
    const t = (day: string) => ({ itemKey: 'ferritin', type: 'concentration/ug-l', content: 1, time: Date.parse(day + 'T12:00:00Z') / 1000, clientData: { hdsTimePrecision: 'day' } });
    const a = pv('a', { ...at(1), proposal: t('2020-11-05'), printed: { label: 'Ferritine', value: '12', samplingTime: '08:30' } });
    const b = pv('b', { ...at(2), proposal: t('2021-01-14'), printed: { label: 'Ferritine', value: '30' } });
    const c = pv('c', { ...at(3), proposal: t('2021-02-18'), printed: { label: 'Ferritine', value: '41' } });
    const multi = of([a, b, c]);
    expect(conv.valueDayText(multi.proposedValues[0], multi.proposedValues, 'en')).toBe('November 5, 2020, 08:30');
    await render(bubble(multi, conv.nextStep(multi, E, ready)));
    expect(container.textContent).toContain('Would be saved as Ferritin: 1 µg/L, sampled January 14, 2021');
    expect(container.textContent).toContain('sampled November 5, 2020, 08:30');
    const one = of([pv('x', at(1)), pv('y', at(2))]);
    expect(conv.valueDayText(one.proposedValues[0], one.proposedValues, 'en')).toBeNull();
  });

  it('the summary: the values her record already holds, each to add anyway', async () => {
    const a = pv('a', { printed: { label: 'Ferritine', value: '48', unit: 'ng/mL' } });
    const c = of([a, answer(a, 'duplicate', { candidateIds: ['a'], basis: 'existing-value' })]);
    const acts = actions();
    await render(bubble(c, conv.nextStep(c, E, ready), acts));
    expect(container.textContent).toContain('1 value already in your record');
    await click(button('Add anyway'));
    expect(acts.confirm).toHaveBeenCalledWith(['a'], 100);
  });

  it('the document bubble: status, progress, "See everything" shows the overview', async () => {
    const status = { alertEventId: 's', kind: 'task-status', hds: { kind: 'task-status', about: DOC, status: 'awaiting-answers', attempt: 1 }, time: 1, direction: 'received', from: null } as any;
    const onToggle = vi.fn();
    await render(
      <conv.DocumentStatusBubble title='Lab report' status={status} contactName='Dr Test' progress={{ values: 28, questions: 1, answered: 9, waitingOnContact: 0, keptAside: 0, alreadyInRecord: 0 }} expanded onToggle={onToggle}>
        <p>overview</p>
      </conv.DocumentStatusBubble>
    );
    expect(container.textContent).toContain('Waiting for your answers');
    expect(container.textContent).toContain('28 values · 1 question · 9 answered');
    expect(container.textContent).toContain('overview');
    await click(button('Hide'));
    expect(onToggle).toHaveBeenCalled();
  });
});
