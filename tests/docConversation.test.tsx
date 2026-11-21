// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * data-model 4.26.0 on the person's side (plan 135): a proposed document's date and kind one by one, her note on an
 * answer, a document's values, specimen labels from hds-lib. hds-lib's real `conversationOf` settles the fixtures; the
 * pack (items, document kinds) is faked, and so are the two helpers that read it.
 */
const ITEMS: Record<string, any> = {
  ferritin: { key: 'ferritin', data: { type: 'number', label: { en: 'Ferritin' }, streamId: 'ferritin', eventType: 'concentration/ug-l' } }
};
const KINDS: Record<string, any> = {
  'laboratory-report': { key: 'laboratory-report', label: { en: 'Laboratory report' } },
  other: { key: 'other', label: { en: 'Other document' } }
};
vi.mock('hds-lib', async (importOriginal) => {
  const real: any = await importOriginal();
  return {
    ...real,
    localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
    getHDSModel: () => ({
      itemsDefs: { forKey: (k: string) => ITEMS[k] ?? null, forEvent: (e: any) => ITEMS[e.streamIds?.[0]] ?? null },
      documentKinds: { label: (k: string) => KINDS[k]?.label.en ?? null, getAll: () => Object.values(KINDS) }
    }),
    eventToShortText: (e: any) => `${e.content} µg/L`,
    cmcConversation: {
      ...real.cmcConversation,
      pendingFieldsOf: (d: any) => d?.clientData?.hdsDocumentPending ?? [],
      documentProposalRefusal: (pd: any, d: any) => {
        if (pd.state === 'replaced') return 'replaced';
        if (pd.state !== 'open' && pd.state !== 'skipped') return 'answered';
        if (d == null) return 'not-a-document';
        return (d.clientData?.hdsDocumentPending ?? []).length > 0 ? null : 'nothing-pending';
      },
      proposalRefusal: (pv: any) => (pv.state === 'open' || pv.state === 'skipped' ? null : 'answered')
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
function item (kind: string, content: Record<string, any>, at = 100) {
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
const pdoc = (candidateId: string, proposal: Record<string, any> = { documentKind: 'laboratory-report', time: 1604577600, timePrecision: 'day' }, extra: Record<string, any> = {}) =>
  item('proposed-document', { candidateId, proposal, status: 'clear', extraction: EX, ...extra });
const question = (code: string, extra: Record<string, any> = {}) => item('question', { code, ...extra });
const answer = (target: any, action: string, extra: Record<string, any> = {}, t = 200) => item('answer', { inReplyTo: target.id, action, ...extra }, t);
const of = (items: any[]) => cmcConversation.conversationOf(items, DOC);
const pending = { id: DOC, type: 'file/xds-v1', clientData: { hdsDocumentPending: ['time', 'kind'] } };
const ready = { status: 'awaiting-answers', document: pending };

beforeEach(() => { seq = 0; });

describe('[DOC] nextStep: a proposed document', () => {
  it('comes right after is-this-yours, before the values; only while a field still waits on the document', () => {
    const q = question('is-this-yours');
    const d = pdoc('d1');
    expect(conv.nextStep(of([pv('a'), d, q]), E, ready)).toMatchObject({ kind: 'question', question: { code: 'is-this-yours' } });
    const step = conv.nextStep(of([pv('a'), d, q, answer(q, 'confirm')]), E, ready) as any;
    expect(step).toMatchObject({ kind: 'document', proposed: { candidateId: 'd1' }, pending: ['time', 'kind'] });
    // no document read, or nothing left to set on it: the values come
    expect(conv.nextStep(of([pv('a'), d]), E, { status: 'awaiting-answers' })).toMatchObject({ kind: 'value' });
    expect(conv.nextStep(of([pv('a'), d]), E, { status: 'awaiting-answers', document: { id: DOC, type: 'file/xds-v1', clientData: {} } })).toMatchObject({ kind: 'value' });
    // "Later" sets it aside
    expect(conv.nextStep(of([pv('a'), d]), E, { ...ready, deferred: ['d1'] })).toMatchObject({ kind: 'value' });
  });

  it('its own questions (kind, date) come before it, and are not counted as questions about the values', () => {
    const d = pdoc('d1', { time: 1604577600, timePrecision: 'day' });
    const kindQ = question('which-document-kind', { candidateId: 'd1', options: ['laboratory-report', 'other'] });
    const c = of([pv('a'), d, kindQ]);
    expect(conv.nextStep(c, E, ready)).toMatchObject({ kind: 'question', question: { code: 'which-document-kind' }, about: null });
    expect(conv.conversationProgress(c, E, ready).questions).toBe(0);
    // her answer on the proposed document is not about a value
    const corrected = of([pv('a'), d, answer(d, 'correct', { candidateIds: ['d1'], applied: ['time'] })]);
    expect(conv.conversationProgress(corrected, E, ready)).toMatchObject({ values: 1, answered: 0 });
    expect(conv.optionLabel('which-document-kind', 'laboratory-report')).toEqual({ label: 'Laboratory report', selectable: true });
    expect(conv.optionLabel('which-document-kind', 'x-unknown').selectable).toBe(false);
  });
});

describe('[DOC] answers', () => {
  it('a proposed document confirmed or corrected says which fields were written; her app\'s not-pending skip shows no bubble', () => {
    const d = pdoc('d1');
    expect(conv.answerText(answer(d, 'confirm', { candidateIds: ['d1'], applied: ['time', 'kind'] }), null)).toBe('You confirmed the document’s date and kind');
    expect(conv.answerText(answer(d, 'confirm', { candidateIds: ['d1'], applied: ['kind'] }), null)).toBe('You confirmed the document’s kind');
    expect(conv.answerText(answer(d, 'correct', { candidateIds: ['d1'], applied: ['time'] }), null)).toBe('You corrected the document’s date and kind');
    const runs = conv.answerRuns([answer(d, 'skip', { candidateIds: ['d1'], basis: 'not-pending' })]);
    expect(runs).toEqual([]);
  });

  it('an answer with her note is never folded into a run', () => {
    const v = (id: string, note?: string) => answer({ id }, 'confirm', { candidateIds: [id], written: [{ candidateId: id, eventId: 'w' + id }], ...(note ? { note } : {}) });
    expect(conv.answerRuns([v('a'), v('b'), v('c', 'from the old lab'), v('d')]).map((r) => r.length)).toEqual([1, 1, 1, 1]);
    expect(conv.answerRuns([v('a'), v('b'), v('c'), v('d', 'x')]).map((r) => r.length)).toEqual([3, 1]);
  });

  it('specimen codes are labelled from hds-lib SPECIMEN_CODES', () => {
    expect(conv.optionLabel('which-specimen', 'serum-plasma')).toEqual({ label: 'Serum or plasma', selectable: true });
    expect(conv.optionLabel('which-specimen', 'urine-24h').label).toBe('24-hour urine');
  });
});

describe('[DOC] a document\'s values', () => {
  it('read from it (related + sourceKey, or its index) and also printed in it (hdsPrintedIn); a dangling index entry skipped', () => {
    const document = { id: DOC, clientData: { hdsDocumentValues: { v2: 'c2', gone: 'c9' } } };
    const ev = (id: string, cd: Record<string, any>, time = 10) => ({ id, type: 'concentration/ug-l', time, streamIds: ['ferritin'], content: 1, clientData: cd });
    const values = conv.documentValuesOf(document, [
      ev('v1', { related: { [DOC]: true }, sourceKey: `hds-reader:document:${DOC}:c1` }, 2),
      ev('v2', {}, 1),
      ev('v3', { hdsPrintedIn: { [DOC]: true } }),
      ev('v4', { related: { [DOC]: true } })
    ]);
    expect(values.source.map((e) => e.id)).toEqual(['v2', 'v1']);
    expect(values.matched.map((e) => e.id)).toEqual(['v3']);
  });
});

let root: Root | null = null;
let container: HTMLDivElement;
afterEach(() => { act(() => root?.unmount()); root = null; container?.remove(); });
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
    answer: vi.fn(async () => ({ ok: true as const })),
    confirmDocument: vi.fn(async () => ({ ok: true as const }))
  };
}
const bubble = (c: any, step: any, a: any = actions(), extra: Record<string, any> = {}) => (
  <conv.ConversationStepBubble step={step} conversation={c} contactName='Dr Test' title='Lab report' sourceOf={() => null} actions={a} locale='en' {...extra} />
);

describe('[DOC] the document step and her note', () => {
  it('says the proposal; Confirm confirms it; Change sends only what she changed', async () => {
    const c = of([pdoc('d1')]);
    const acts = actions();
    await render(bubble(c, conv.nextStep(c, E, ready), acts, { onLater: vi.fn() }));
    expect(container.textContent).toContain('This looks like a Laboratory report from November 5, 2020. Save that on the document?');
    await click(button('Confirm'));
    expect(acts.confirmDocument).toHaveBeenCalledWith('d1', undefined, 100, undefined);
    await click(button('Change'));
    const select = container.querySelector('select') as HTMLSelectElement;
    await act(async () => {
      select.value = 'other';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click(button('Save'));
    expect(acts.confirmDocument).toHaveBeenLastCalledWith('d1', { documentKind: 'other' }, 100, undefined);
  });

  it('her note shows on the step, goes with the answer she taps, ✕ removes it', async () => {
    const c = of([pv('a')]);
    const acts = actions();
    const onClearNote = vi.fn();
    await render(bubble(c, conv.nextStep(c, E, ready), acts, { note: '  from the old lab  ', onClearNote, onNoteAsMessage: vi.fn() }));
    expect(container.querySelector('[data-note-draft]')?.textContent).toContain('Your note: “from the old lab” · goes with your answer');
    await click(button('Confirm'));
    expect(acts.confirm).toHaveBeenCalledWith(['a'], 100, 'from the old lab');
    await click(container.querySelector('[aria-label="Remove the note"]'));
    expect(onClearNote).toHaveBeenCalled();
  });

  it('her note sent alone sets the item aside with it (D-1), with the warning; on a proposed document through skipDocument', async () => {
    const c = of([pv('a')]);
    const acts = actions();
    await render(bubble(c, conv.nextStep(c, E, ready), acts, { note: 'ask the lab' }));
    expect(container.textContent).toContain('Dr Test can read it.');
    expect(container.textContent).toContain('This sets the item aside; you can still confirm it until Dr Test has finished.');
    await click(button('Send the note alone'));
    expect(acts.dismiss).toHaveBeenCalledWith(['a'], 'skip', 100, 'ask the lab');
    const d = of([pdoc('d1')]);
    const acts2 = { ...actions(), skipDocument: vi.fn(async () => ({ ok: true as const })) };
    await render(bubble(d, conv.nextStep(d, E, ready), acts2, { note: 'not a lab report' }));
    await click(button('Send the note alone'));
    expect(acts2.skipDocument).toHaveBeenCalledWith('d1', 100, 'not a lab report');
  });

  it('the host\'s send button sends the note alone (noteAloneSignal)', async () => {
    const c = of([pv('a')]);
    const acts = actions();
    const step = conv.nextStep(c, E, ready);
    await render(bubble(c, step, acts, { note: 'ask the lab', noteAloneSignal: 0 }));
    expect(acts.dismiss).not.toHaveBeenCalled();
    await act(async () => { root!.render(bubble(c, step, acts, { note: 'ask the lab', noteAloneSignal: 1 })); });
    expect(acts.dismiss).toHaveBeenCalledWith(['a'], 'skip', 100, 'ask the lab');
  });

  it('a proposed document without an anchor still shows the document; a done document says what was saved', async () => {
    const c = of([pdoc('d1')]);
    await render(bubble(c, conv.nextStep(c, E, ready), actions()));
    expect(button('See the document')).not.toBeNull();
    const status = { alertEventId: 's', kind: 'task-status', hds: { kind: 'task-status', about: DOC, status: 'done', attempt: 1 }, time: 1, direction: 'received', from: null } as any;
    const onOpen = vi.fn();
    await render(<conv.DocumentStatusBubble title='Lab report' status={status} contactName='Dr Test' saved={6} onOpenDocument={onOpen} />);
    expect(container.querySelector('[data-closing-line]')?.textContent).toBe('6 values saved · See them');
    await click(button('See them'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('the `ready` notice (4.27.0) says the contact can read her documents, with the host\'s detail line', async () => {
    await render(<conv.NoticeBubble code='ready' contactName='HDS Reader' detail='Reads lab reports.' />);
    expect(container.textContent).toContain('HDS Reader can read your documents: share one in this conversation');
    expect(container.textContent).toContain('Reads lab reports.');
  });

  it('every text has its en and fr', () => {
    const missing = Object.entries(conv.CONVERSATION_TEXTS as Record<string, { en?: string; fr?: string }>)
      .filter(([, t]) => !t.en || !t.fr).map(([k]) => k);
    expect(missing).toEqual([]);
  });

  it('her answer bubble shows its note', async () => {
    const a = answer({ id: 'x' }, 'confirm', { candidateIds: ['a'], written: [{ candidateId: 'a', eventId: 'w' }], note: 'fasting' });
    await render(<conv.ConversationAnswerBubble answer={a} />);
    expect(container.querySelector('[data-answer-note]')?.textContent).toBe('Your note: fasting');
  });

  it('the values list: both groups, nothing when empty', async () => {
    const ev = { id: 'v1', type: 'concentration/ug-l', time: 1, streamIds: ['ferritin'], content: 48 };
    await render(<conv.DocumentValuesList values={{ source: [ev], matched: [{ ...ev, id: 'v2' }] }} />);
    expect(container.textContent).toContain('Read from this document (1)');
    expect(container.textContent).toContain('Also printed here (1)');
    expect(container.textContent).toContain('already in your record, not from this document');
    expect(container.textContent).toContain('Ferritin: 48 µg/L');
    await render(<conv.DocumentValuesList values={{ source: [], matched: [] }} />);
    expect(container.querySelector('[data-document-values]')).toBeNull();
  });
});
