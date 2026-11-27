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
  'administrative-document': { key: 'administrative-document', label: { en: 'Administrative document' } },
  other: { key: 'other', label: { en: 'Other document' } },
  'old-report': { key: 'old-report', label: { en: 'Old report' }, deprecated: true }
};
vi.mock('hds-lib', async (importOriginal) => {
  const real: any = await importOriginal();
  return {
    ...real,
    localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
    getHDSModel: () => ({
      itemsDefs: { forKey: (k: string) => ITEMS[k] ?? null, forEvent: (e: any) => ITEMS[e.streamIds?.[0]] ?? null },
      documentKinds: { label: (k: string) => KINDS[k]?.label.en ?? null, getAll: () => Object.values(KINDS).filter((k) => !k.deprecated) }
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

  it('on hold (4.33.0), also after done: it stays answerable, nothing else is a step', () => {
    const d = pdoc('d1');
    const kindQ = question('which-document-kind', { candidateId: 'd1', options: ['laboratory-report', 'other'] });
    const hold = { status: 'on-hold', document: pending };
    expect(conv.nextStep(of([pv('a'), d]), E, hold)).toMatchObject({ kind: 'document', proposed: { candidateId: 'd1' } });
    expect(conv.nextStep(of([pv('a'), d, kindQ]), E, hold)).toMatchObject({ kind: 'question', question: { code: 'which-document-kind' } });
    expect(conv.nextStep(of([pv('a')]), E, hold)).toBeNull();
    expect(conv.nextStep(of([pv('a'), question('which-date')]), E, hold)).toBeNull();
    expect(conv.nextStep(of([d, answer(d, 'confirm', { candidateIds: ['d1'], applied: ['time', 'kind'] })]), E, hold)).toBeNull();
    // nothing is written before she says it is hers (R3)
    expect(conv.nextStep(of([d, question('is-this-yours')]), E, hold)).toBeNull();
    // while the contact reads, as before
    expect(conv.nextStep(of([pv('a'), d]), E, { status: 'reading', document: pending })).toBeNull();
    // nothing is confirmable on hold
    const c = of([pv('a')]);
    expect(conv.rowBlock(c, c.proposedValues[0], E, { status: 'on-hold' })).toBe('still-reading');
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
    expect(acts.confirmDocument).toHaveBeenCalledWith('d1', undefined, 100, undefined, undefined);
    await click(button('Change'));
    const select = container.querySelector('select') as HTMLSelectElement;
    await act(async () => {
      select.value = 'other';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click(button('Save'));
    expect(acts.confirmDocument).toHaveBeenLastCalledWith('d1', { documentKind: 'other' }, 100, undefined, undefined);
  });

  const clinical = { place: 'documents-clinical', label: 'Clinical documents', gains: [] as string[], loses: [] as string[], complete: true };
  const tick = () => container.querySelector('[data-step-filing] input') as HTMLInputElement | null;
  const choose = async (value: string) => {
    const select = container.querySelector('select') as HTMLSelectElement;
    await act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
  };

  it('[FOC1] says where it goes; ticked when no one newly sees it or loses it; Confirm carries what she was told', async () => {
    const c = of([pdoc('d1')]);
    const acts = actions();
    const filingOf = vi.fn(() => clinical);
    await render(bubble(c, conv.nextStep(c, E, ready), acts, { filingOf }));
    expect(filingOf).toHaveBeenCalledWith('laboratory-report');
    expect(container.textContent).toContain('Also file it in: Clinical documents');
    expect(container.textContent).toContain('No one new will see it, and no one will lose it.');
    expect(tick()!.checked).toBe(true);
    await click(button('Confirm'));
    expect(acts.confirmDocument).toHaveBeenLastCalledWith('d1', undefined, 100, undefined, clinical);
    await click(tick());
    await click(button('Confirm'));
    expect(acts.confirmDocument).toHaveBeenLastCalledWith('d1', undefined, 100, undefined, undefined);
  });

  it('[FOC2] unticked when someone gains it, loses it, or not all readers are known; her tick is for what she was told', async () => {
    const c = of([pdoc('d1')]);
    const step = conv.nextStep(c, E, ready);
    for (const [change, text] of [[{ gains: ['Dr New'] }, 'Will now see it: Dr New'], [{ loses: ['Dr Old'] }, 'Will no longer see it: Dr Old'], [{ complete: false }, 'some may now see it']] as Array<[object, string]>) {
      const acts = actions();
      await render(bubble(c, step, acts, { filingOf: () => ({ ...clinical, ...change }) }));
      expect(container.textContent).toContain(text);
      expect(container.textContent).not.toContain('No one new');
      expect(tick()!.checked).toBe(false);
      await click(button('Confirm'));
      expect(acts.confirmDocument).toHaveBeenLastCalledWith('d1', undefined, 100, undefined, undefined);
    }
    const acts = actions();
    await render(bubble(c, step, acts, { filingOf: () => ({ ...clinical, gains: ['Dr New'] }) }));
    await click(tick());
    expect(tick()!.checked).toBe(true);
    await act(async () => { root!.render(bubble(c, step, acts, { filingOf: () => ({ ...clinical, gains: ['Dr New', 'Dr Other'] }) })); });
    expect(tick()!.checked).toBe(false);
    await act(async () => { root!.render(bubble(c, step, acts, { filingOf: () => ({ ...clinical, gains: ['Dr New'] }) })); });
    await click(button('Confirm'));
    expect(acts.confirmDocument).toHaveBeenLastCalledWith('d1', undefined, 100, undefined, { ...clinical, gains: ['Dr New'] });
  });

  it('[FOC3] nothing offered without the host, for a kind it is not offered for, or when the kind is not confirmed here', async () => {
    const c = of([pdoc('d1')]);
    await render(bubble(c, conv.nextStep(c, E, ready)));
    expect(tick()).toBeNull();
    await render(bubble(c, conv.nextStep(c, E, ready), actions(), { filingOf: () => null }));
    expect(tick()).toBeNull();
    const filingOf = vi.fn(() => clinical);
    const dateOnly = { ...ready, document: { ...ready.document, clientData: { hdsDocumentPending: ['time'] } } };
    await render(bubble(c, conv.nextStep(c, E, dateOnly), actions(), { filingOf }));
    expect(container.textContent).toContain('This document looks dated');
    expect(tick()).toBeNull();
    const noKind = of([pdoc('d1', { time: 1604577600, timePrecision: 'day' })]);
    await render(bubble(noKind, conv.nextStep(noKind, E, ready), actions(), { filingOf }));
    expect(tick()).toBeNull();
    const { confirmDocument: _c, ...without } = actions();
    await render(bubble(c, conv.nextStep(c, E, ready), without, { filingOf }));
    expect(tick()).toBeNull();
    expect(filingOf).not.toHaveBeenCalled();
  });

  it('[FOC4] Change: the place follows the kind she picks, and her tick with it', async () => {
    const c = of([pdoc('d1')]);
    const acts = actions();
    const admin = { ...clinical, place: 'documents-admin', label: 'Administrative documents', gains: ['Insurer'] };
    const filingOf = (kind: string) => kind === 'laboratory-report' ? clinical : kind === 'administrative-document' ? admin : null;
    await render(bubble(c, conv.nextStep(c, E, ready), acts, { filingOf }));
    await click(button('Change'));
    expect(container.textContent).toContain('Clinical documents');
    await choose('other');
    expect(tick()).toBeNull();
    await choose('administrative-document');
    expect(container.textContent).toContain('Also file it in: Administrative documents');
    expect(tick()!.checked).toBe(false);
    await click(tick());
    await click(button('Save'));
    expect(acts.confirmDocument).toHaveBeenLastCalledWith('d1', { documentKind: 'administrative-document' }, 100, undefined, admin);
  });

  describe('[135-1] DocumentFieldsEditor initial: starting values that are hers', () => {
    const PROPOSAL = { documentKind: 'laboratory-report', time: 1604577600, timePrecision: 'day' };
    const setDay = async (value: string) => {
      const day = container.querySelector('input[type="date"]') as HTMLInputElement;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(day, value);
        day.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };
    const editor = (props: Record<string, any>) => <conv.DocumentFieldsEditor pending={['time', 'kind']} onSubmit={vi.fn()} onCancel={vi.fn()} {...props} />;

    it('kept as they are: shown and sent on Save', async () => {
      const onSubmit = vi.fn();
      await render(editor({ initial: { documentKind: 'administrative-document', day: '2021-03-04' }, onSubmit }));
      expect((container.querySelector('select') as HTMLSelectElement).value).toBe('administrative-document');
      expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2021-03-04');
      await click(button('Save'));
      expect(onSubmit).toHaveBeenLastCalledWith({ documentKind: 'administrative-document', time: Date.parse('2021-03-04T12:00:00Z') / 1000, timePrecision: 'day' }, undefined);
    });

    it('kept even when the proposal says the same; a cleared day is not sent; a changed one is', async () => {
      const onSubmit = vi.fn();
      await render(editor({ proposal: PROPOSAL, initial: { documentKind: 'laboratory-report', day: '2020-11-05' }, onSubmit }));
      await setDay('');
      await click(button('Save'));
      expect(onSubmit).toHaveBeenLastCalledWith({ documentKind: 'laboratory-report' }, undefined);
      await setDay('2020-12-01');
      await click(button('Save'));
      expect(onSubmit).toHaveBeenLastCalledWith({ documentKind: 'laboratory-report', time: Date.parse('2020-12-01T12:00:00Z') / 1000, timePrecision: 'day' }, undefined);
    });

    it('cleared or not usable: nothing to send, Save stays off; only the field she has a value for counts', async () => {
      await render(editor({ initial: { day: '2021-03-04' } }));
      await setDay('');
      expect(button('Save')!.disabled).toBe(true);
      await render(editor({ initial: { documentKind: 'x-not-in-pack', day: 'March 4' } }));
      expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('');
      expect(button('Save')!.disabled).toBe(true);
      const onSubmit = vi.fn();
      await render(editor({ proposal: PROPOSAL, initial: { day: '2021-03-04' }, onSubmit }));
      await click(button('Save'));
      expect(onSubmit).toHaveBeenLastCalledWith({ time: Date.parse('2021-03-04T12:00:00Z') / 1000, timePrecision: 'day' }, undefined);
    });

    it('with a proposal only, as before: nothing changed, nothing sent', async () => {
      await render(editor({ proposal: PROPOSAL }));
      expect((container.querySelector('select') as HTMLSelectElement).value).toBe('laboratory-report');
      expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2020-11-05');
      expect(button('Save')!.disabled).toBe(true);
    });

    it('a day that is not a real date is ignored (2021-02-31, 2021-13-01): the proposal\'s day stays, nothing sent', async () => {
      for (const bad of ['2021-02-31', '2021-13-01', '2021-13-45']) {
        await render(editor({ proposal: PROPOSAL, initial: { day: bad } }));
        expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2020-11-05');
        expect(button('Save')!.disabled).toBe(true);
        await render(editor({ initial: { day: bad } }));
        expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('');
        expect(button('Save')!.disabled).toBe(true);
      }
    });

    it('a deprecated kind is ignored', async () => {
      await render(editor({ proposal: PROPOSAL, initial: { documentKind: 'old-report' } }));
      expect((container.querySelector('select') as HTMLSelectElement).value).toBe('laboratory-report');
      expect(button('Save')!.disabled).toBe(true);
    });

    it('read once at mount: a later initial does not take over the proposal\'s values', async () => {
      const onSubmit = vi.fn();
      await render(editor({ proposal: PROPOSAL, onSubmit }));
      await act(async () => { root!.render(editor({ proposal: PROPOSAL, initial: { documentKind: 'administrative-document', day: '2021-03-04' }, onSubmit })); });
      expect((container.querySelector('select') as HTMLSelectElement).value).toBe('laboratory-report');
      expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2020-11-05');
      expect(button('Save')!.disabled).toBe(true);
    });

    it('only pending fields: a kind not pending is not sent; "I do not know the date" wins over initial.day', async () => {
      const onSubmit = vi.fn();
      await render(editor({ pending: ['time'], initial: { documentKind: 'administrative-document', day: '2021-03-04' }, onSubmit }));
      expect(container.querySelector('select')).toBeNull();
      await click(button('Save'));
      expect(onSubmit).toHaveBeenLastCalledWith({ time: Date.parse('2021-03-04T12:00:00Z') / 1000, timePrecision: 'day' }, undefined);
      const unknown = container.querySelector('[data-document-fields-editor] input[type="checkbox"]') as HTMLInputElement;
      await click(unknown);
      await click(button('Save'));
      expect(onSubmit).toHaveBeenLastCalledWith({ timePrecision: 'unknown' }, undefined);
    });
  });

  it('[FOC7] a tick she took off on the step stays off in Change; readers told apart by the host\'s key, not their names', async () => {
    const c = of([pdoc('d1')]);
    const acts = actions();
    await render(bubble(c, conv.nextStep(c, E, ready), acts, { filingOf: () => clinical }));
    await click(tick());
    await click(button('Change'));
    expect(tick()!.checked).toBe(false);
    const day = container.querySelector('input[type="date"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(day, '2020-11-06');
      day.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(button('Save'));
    expect((acts.confirmDocument.mock.calls.at(-1) as unknown[])[4]).toBeUndefined();
    const a2 = actions();
    const named = { ...clinical, gains: ['Dr Martin'], key: 'c:1' };
    await render(bubble(c, conv.nextStep(c, E, ready), a2, { filingOf: () => named }));
    await click(tick());
    expect(tick()!.checked).toBe(true);
    await act(async () => { root!.render(bubble(c, conv.nextStep(c, E, ready), a2, { filingOf: () => ({ ...named, key: 'c:2' }) })); });
    expect(tick()!.checked).toBe(false);
  });

  it('[FOC5] a kind, a date or no date she answered in a question is what is confirmed: said, filed by it', async () => {
    const p = pdoc('d1', {});
    const kindQ = question('which-document-kind', { candidateId: 'd1', options: ['laboratory-report', 'other'] });
    const dateQ = question('which-document-date', { candidateId: 'd1' });
    const kind = answer(kindQ, 'choose', { option: 'laboratory-report' });
    const c = of([p, kindQ, kind]);
    const acts = actions();
    const filingOf = vi.fn(() => clinical);
    await render(bubble(c, conv.nextStep(c, E, ready), acts, { filingOf }));
    expect(container.textContent).toContain('This looks like a Laboratory report. Save that on the document?');
    expect(filingOf).toHaveBeenCalledWith('laboratory-report');
    await click(button('Confirm'));
    expect(acts.confirmDocument).toHaveBeenLastCalledWith('d1', undefined, 100, undefined, clinical);
    const dated = of([p, kindQ, kind, dateQ, answer(dateQ, 'confirm', { time: 1604577600, timePrecision: 'day' })]);
    await render(bubble(dated, conv.nextStep(dated, E, ready), actions()));
    expect(container.textContent).toContain('This looks like a Laboratory report from November 5, 2020.');
    const undated = of([p, dateQ, answer(dateQ, 'confirm', { timePrecision: 'unknown' })]);
    const a2 = actions();
    await render(bubble(undated, conv.nextStep(undated, E, ready), a2));
    expect(container.textContent).toContain('You do not know the date of this document. Save that on it?');
    await click(button('Confirm'));
    expect(a2.confirmDocument).toHaveBeenLastCalledWith('d1', undefined, 100, undefined, undefined);
    const kindUndated = of([p, kindQ, kind, dateQ, answer(dateQ, 'confirm', { timePrecision: 'unknown' })]);
    await render(bubble(kindUndated, conv.nextStep(kindUndated, E, ready), actions()));
    expect(container.textContent).toContain('This looks like a Laboratory report, and you do not know its date. Save that on the document?');
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

  it('every answer text has its contact wording', () => {
    const keys = Object.keys(conv.CONVERSATION_TEXTS);
    const missing = keys.filter((k) => k.startsWith('answer.') && !keys.includes(`contact.${k}`));
    expect(missing).toEqual([]);
  });

  it('a contact reads her answers in the third person, on the other side, read-only', async () => {
    const a = answer({ id: 'x' }, 'confirm', { candidateIds: ['a', 'b'], written: [{ candidateId: 'a', eventId: 'w' }], note: 'fasting' });
    await render(<conv.ConversationAnswerBubble answer={a} viewer='contact' personName='Anna' />);
    expect(container.textContent).toContain('Anna confirmed 2 values');
    expect(container.querySelector('[data-answer-note]')?.textContent).toBe('Anna’s note: fasting');
    expect(container.querySelector('[data-answer-viewer="contact"]')?.className).toContain('justify-start');
    await render(<conv.ConversationAnswerBubble answer={answer({ id: 'y' }, 'skip', {})} viewer='contact' />);
    expect(container.textContent).toContain('The person set it aside');
  });

  it('the work status in the contact’s own words', async () => {
    await render(<conv.TaskStatusLine status='awaiting-answers' counts={{ proposed: 2 }} contactName='HDS Reader' viewer='contact' personName='Anna' />);
    expect(container.textContent).toContain('Waiting for Anna’s answers · 2 values');
    await render(<conv.TaskStatusLine status='error' errorCode='reading-failed' contactName='HDS Reader' viewer='contact' personName='Anna' />);
    expect(container.textContent).toContain('This document could not be read yet; reading is tried again.');
    await render(<conv.TaskStatusLine status='error' errorCode='reading-failed' contactName='HDS Reader' />);
    expect(container.textContent).toContain('HDS Reader could not read this document yet');
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

  it('the values list: a value opens with its event; one read from here is shown where it is printed', async () => {
    const anchor = { attachmentId: 'a1', page: 1, bbox: [0.1, 0.2, 0.3, 0.05] };
    const read = { id: 'v1', type: 'concentration/ug-l', time: 1, streamIds: ['ferritin'], content: 48, clientData: { hdsSourceAnchor: anchor } };
    const matched = { ...read, id: 'v2' };
    const plain = { ...read, id: 'v3', clientData: {} };
    const onOpenValue = vi.fn();
    const sourceOf = vi.fn(() => null);
    await render(<conv.DocumentValuesList values={{ source: [read, plain], matched: [matched] }} onOpenValue={onOpenValue} sourceOf={sourceOf} />);
    const links = [...container.querySelectorAll('button')].filter((b) => b.textContent === 'See it on the document');
    // only v1: v3 has no anchor, v2 was read from another document
    expect(links.length).toBe(1);
    expect(links[0].closest('[data-value-event]')?.getAttribute('data-value-event')).toBe('v1');
    await act(async () => { links[0].click(); });
    expect(sourceOf).toHaveBeenCalledWith('a1');
    expect(container.textContent).toContain('Hide the document');
    const open = container.querySelector('[data-value-event="v3"] button') as HTMLButtonElement;
    await act(async () => { open.click(); });
    expect(onOpenValue).toHaveBeenCalledWith('v3', plain);
  });

  it('the values list: the host dates a value from its event, not its time alone (B-2026-11-23-5)', async () => {
    const ev = { id: 'v1', type: 'concentration/ug-l', time: 1, streamIds: ['ferritin'], content: 48, clientData: { hdsTimePrecision: 'year' } };
    const dayText = vi.fn((_time: number, e: { clientData?: Record<string, any> }) => `known to the ${e.clientData?.hdsTimePrecision}`);
    await render(<conv.DocumentValuesList values={{ source: [ev], matched: [] }} dayText={dayText} />);
    expect(dayText).toHaveBeenCalledWith(1, ev);
    expect(container.textContent).toContain('known to the year');
  });
});
