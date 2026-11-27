// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The person's side of a standard conversation (data-model 4.22.0 CONVERSATION.md): hds-lib's real `conversationOf`
 * settles the fixtures; the model, the value text and R9's pack check are faked (the pack is not loaded here).
 */
let lang: 'en' | 'fr' = 'en';
const ITEMS: Record<string, any> = {
  'body-blood-serum-ferritin': { key: 'body-blood-serum-ferritin', data: { type: 'number', label: { en: 'Ferritin', fr: 'Ferritine' }, streamId: 'body-blood-serum-ferritin', eventType: 'concentration/ug-l' } },
  'body-blood-serum-glucose-fasting': { key: 'body-blood-serum-glucose-fasting', data: { type: 'number', label: { en: 'Fasting glucose' }, streamId: 'g', variations: { eventType: { options: [{ value: 'concentration/mmol-l', label: { en: 'mmol/L' } }, { value: 'concentration/mg-dl', label: { en: 'mg/dL' } }] } } } }
};

vi.mock('hds-lib', async (importOriginal) => {
  const real: any = await importOriginal();
  return {
    ...real,
    localizeText: (t: any) => (typeof t === 'string' ? t : (t?.[lang] ?? t?.en ?? '')),
    getHDSModel: () => ({ itemsDefs: { forKey: (k: string) => ITEMS[k] ?? null } }),
    eventToShortText: (e: any) => `${e.content} (${e.type})`,
    cmcConversation: {
      ...real.cmcConversation,
      // R9 as far as these fixtures need it: the pack check passes for the known items
      checkValueProposal: (p: any) => (p?.itemKey in ITEMS && typeof p.content === 'number' ? null : 'invalid-content'),
      proposalRefusal: (pv: any, engines: string[]) => {
        if (pv.state === 'replaced') return 'replaced';
        if (pv.state !== 'open' && pv.state !== 'skipped') return 'answered';
        if (!['clear', 'check'].includes(pv.item.content.status)) return 'status';
        if (pv.item.content.proposal == null) return 'no-proposal';
        if (!engines.includes(pv.item.content.extraction?.engine)) return 'engine-not-vouched';
        return null;
      }
    }
  };
});
vi.mock('../src/components/HDSFormField', () => ({
  HDSFormField: ({ value, onChange }: any) => <input aria-label='the value' value={String(value ?? '')} onChange={(e) => onChange(Number(e.target.value))} />
}));

const { cmcConversation } = await import('hds-lib');
const conv = await import('../src/conversation/index');
const { CONVERSATION_TEXTS } = conv;

const DOC = 'docevent0001';
const REC = 'conv-aaaaaaaaaaaa';
const SENT = 'conv-bbbbbbbbbbbb';
const EXTRACTION = { engine: 'hds-reader', engineVersion: '1', kbVersion: '1', backend: 'text-layer' };
let seq = 0;

function item (kind: 'question' | 'proposed-value' | 'answer', content: Record<string, any>, at = 100) {
  seq += 1;
  return { id: `ev${seq}`, streamId: kind === 'answer' ? SENT : REC, direction: kind === 'answer' ? 'sent' : 'received', kind, about: DOC, time: at, created: at, modified: at, content: { kind, about: DOC, ...content } } as any;
}
const pv = (candidateId: string, extra: Record<string, any> = {}) => item('proposed-value', {
  candidateId,
  printed: { label: 'Ferritine', value: '48', unit: 'ng/mL', refRange: '30 - 400', flag: 'H' },
  anchor: { attachmentId: 'att1', page: 1, bbox: [8, 30, 80, 3] },
  proposal: { itemKey: 'body-blood-serum-ferritin', type: 'concentration/ug-l', content: 48, time: 1773316800, clientData: { hdsTimePrecision: 'day', hdsFlag: 'H', hdsInterpretation: 'H', hdsRefRange: { text: '30 - 400' } } },
  status: 'clear',
  extraction: EXTRACTION,
  ...extra
});
const question = (code: string, extra: Record<string, any> = {}) => item('question', { code, ...extra });
const answer = (target: any, action: string, extra: Record<string, any> = {}, at = 200) => item('answer', { inReplyTo: target.id, action, ...extra }, at);
const of = (items: any[]) => cmcConversation.conversationOf(items, DOC);

let root: Root | null = null;
let container: HTMLDivElement;
beforeEach(() => { lang = 'en'; seq = 0; vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 }))); });
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
const buttons = () => [...container.querySelectorAll('button')];
const button = (text: string) => buttons().find((b) => b.textContent?.trim() === text) ?? null;
async function click (el: Element | null) {
  expect(el, 'element to click').not.toBeNull();
  await act(async () => { (el as HTMLElement).click(); });
}

function actions () {
  return {
    confirm: vi.fn(async () => ({ ok: true as const })),
    correct: vi.fn(async () => ({ ok: true as const })),
    dismiss: vi.fn(async () => ({ ok: true as const })),
    answer: vi.fn(async () => ({ ok: true as const }))
  };
}
const statusAlert = (status: string) => ({ alertEventId: 'st-' + status, kind: 'task-status', hds: { kind: 'task-status', about: DOC, status, attempt: 1 }, time: 1, direction: 'received', from: null });
const card = (c: any, a: any = actions(), extra: Record<string, any> = {}) => (
  <conv.DocumentConversationCard conversation={c} status={statusAlert('awaiting-answers')} engines={['hds-reader']} title='Lab report' contactName='Dr Test' sourceOf={() => ({ url: 'https://x.backloop.dev/doc.png', kind: 'image' })} actions={a} {...extra} />
);

describe('[CONV-UI] rowBlock: when a value can be confirmed', () => {
  it('a clear value with a date and nothing waiting: confirmable', () => {
    const v = pv('c1');
    const c = of([v]);
    expect(conv.rowBlock(c, c.proposedValues[0], ['hds-reader'])).toBeNull();
  });
  it('the engine is not vouched for this relationship (R9): not confirmable', () => {
    const c = of([pv('c1')]);
    expect(conv.rowBlock(c, c.proposedValues[0], [])).toBe('engine-not-vouched');
  });
  it('is-this-yours asked and not answered: nothing is confirmable', () => {
    const c = of([pv('c1'), question('is-this-yours', { context: { identity: { name: 'DUPONT Marie' } } })]);
    expect(conv.rowBlock(c, c.proposedValues[0], ['hds-reader'])).toBe('identity-open');
  });
  it('is-this-yours answered not-mine: blocked for good', () => {
    const q = question('is-this-yours');
    const c = of([pv('c1'), q, answer(q, 'not-mine')]);
    expect(conv.rowBlock(c, c.proposedValues[0], ['hds-reader'])).toBe('not-mine');
  });
  it('an open question about the value, then a choose waiting for the re-proposal', () => {
    const v = pv('c1');
    const q = question('which-unit', { candidateId: 'c1', options: ['mmol/L', 'mg/dL'] });
    const open = of([v, q]);
    expect(conv.rowBlock(open, open.proposedValues[0], ['hds-reader'])).toBe('question-open');
    const chosen = of([v, q, answer(q, 'choose', { option: 'mmol/L', candidateIds: ['c1'] })]);
    expect(conv.rowBlock(chosen, chosen.proposedValues[0], ['hds-reader'])).toBe('awaiting-reproposal');
  });
  it('no proposal time and no which-date answer: no date; the document day answers it', () => {
    const v = pv('c1', { proposal: { itemKey: 'body-blood-serum-ferritin', type: 'concentration/ug-l', content: 48 } });
    const q = question('which-date', { context: { dates: [{ day: '2026-11-18', text: '18.11.2026' }] } });
    const before = of([v, q]);
    expect(conv.rowBlock(before, before.proposedValues[0], ['hds-reader'])).toBe('no-date');
    const after = of([v, q, answer(q, 'confirm', { time: 1795000000, timePrecision: 'day' })]);
    expect(conv.rowBlock(after, after.proposedValues[0], ['hds-reader'])).toBeNull();
  });
  it('batch: clear and confirmable only (never a value to check, never one asked about)', () => {
    const c = of([pv('c1'), pv('c2', { status: 'check' }), pv('c3'), question('is-fasting', { candidateId: 'c3', options: ['yes', 'no'] })]);
    expect(conv.batchCandidates(c, ['hds-reader']).map((p: any) => p.candidateId)).toEqual(['c1']);
  });
  it('nothing is confirmable while the contact still reads (its questions may still come); waiting for answers or done: it is', () => {
    const c = of([pv('c1')]);
    for (const status of [null, 'received', 'reading', 'error', 'something-new']) {
      expect(conv.rowBlock(c, c.proposedValues[0], ['hds-reader'], { status }), String(status)).toBe('still-reading');
    }
    for (const status of ['awaiting-answers', 'done']) expect(conv.rowBlock(c, c.proposedValues[0], ['hds-reader'], { status })).toBeNull();
  });
  it('a value an answer wrote stays written while the contact deletes what was answered (R10)', () => {
    const a = pv('c1');
    const b = pv('c2');
    const batch = answer(a, 'confirm', { candidateIds: ['c1', 'c2'], written: [{ candidateId: 'c1', eventId: 'v1' }, { candidateId: 'c2', eventId: 'v2' }] });
    // the contact deleted c1, the event the batch answer replied to: hds-lib no longer counts the answer for c2
    const c = of([b, batch]);
    expect(c.proposedValues[0].state).toBe('open');
    expect(conv.isWritten(c, c.proposedValues[0])).toBe(true);
    expect(conv.rowBlock(c, c.proposedValues[0], ['hds-reader'])).toBe('answered');
    expect(conv.batchCandidates(c, ['hds-reader'])).toEqual([]);
  });
  it('shownAt is the latest modified of what the card shows (the server clock)', () => {
    const a = pv('c1');
    const b = pv('c2');
    b.modified = 150;
    expect(conv.shownAtOf(of([a, b]))).toBe(150);
  });
});

describe('[CONV-UI] DocumentConversationCard', () => {
  it('is-this-yours shows the printed name and birth date; values wait for it; "Yes, it is mine" answers it', async () => {
    const q = question('is-this-yours', { context: { identity: { name: 'DUPONT Marie', birthDate: '14.03.1985' }, anchor: { attachmentId: 'att1', page: 1, bbox: [6, 8, 40, 4] } } });
    const a = actions();
    await render(card(of([pv('c1'), pv('c2'), q]), a));
    expect(container.textContent).toContain('DUPONT Marie');
    expect(container.textContent).toContain('14.03.1985');
    expect(container.textContent).toContain('Answer whether this document is yours first.');
    expect(button('Confirm')).toBeNull();
    expect(button('Confirm the 2 values read clearly')).toBeNull();
    await click(button('See it on the document'));
    expect(container.querySelector('[role="region"]')).not.toBeNull();
    await click(button('Yes, it is mine'));
    expect(a.answer).toHaveBeenCalledWith(q.id, { action: 'confirm' }, 100);
  });

  it('is-this-yours without a printed identity says so and shows the document at once (its first page)', async () => {
    const q = question('is-this-yours');
    await render(card(of([pv('c1'), q])));
    expect(container.textContent).toContain('No name or birth date could be read on the document');
    expect(container.textContent).not.toContain('Name printed');
    expect(container.querySelector('[role="region"]')).not.toBeNull();
    expect(button('Hide the document')).not.toBeNull();
    expect(button('Yes, it is mine')).not.toBeNull();
  });

  it('a profile match says so and keeps "Not mine" until the work is done', async () => {
    const q = question('is-this-yours', { context: { identity: { name: 'X' } } });
    const c = of([pv('c1'), q, answer(q, 'confirm', { basis: 'profile-match' })]);
    const a = actions();
    await render(card(c, a));
    expect(container.textContent).toContain('Matched to your profile');
    await click(button('Not mine'));
    expect(a.answer).toHaveBeenCalledWith(q.id, { action: 'not-mine' }, 100);
  });

  it('which-date: her document is one tap away while it is open, on the value it is about, else on its first page', async () => {
    const q = question('which-date', { context: { dates: [{ day: '2026-11-18', text: '18.11.2026', role: 'sampling' }, { day: '2026-11-18', text: '18.11.2026', role: 'report' }] } });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sourceOf = vi.fn(() => ({ kind: 'image', url: 'data:image/png;base64,AAAA' }) as any);
    await render(card(of([pv('c1'), q]), actions(), { sourceOf }));
    const dates = [...container.querySelectorAll('[data-question="which-date"] button')].map((b) => b.textContent);
    expect(dates.filter((d) => d!.includes('18.11.2026')).length).toBe(2);
    expect(err.mock.calls.some((c) => String(c[0]).includes('same key'))).toBe(false);
    err.mockRestore();
    expect(container.querySelector('[data-question="which-date"] [role="region"]')).toBeNull();
    await click(button('See the document'));
    expect(container.querySelector('[data-question="which-date"]')!.textContent).toContain('Hide');
    expect(sourceOf).toHaveBeenCalledWith(undefined);
    await render(card(of([pv('c1'), q, answer(q, 'confirm', { time: 1795003200, timePrecision: 'day' }, 200)]), actions(), { sourceOf }));
    expect(container.querySelector('[data-question="which-date"]')!.textContent).not.toContain('See the document');
  });

  it('which-date about the whole document says what the day is used for; about one value it does not', async () => {
    const hint = 'This day is used for every value of the document that has no day of its own.';
    const q = question('which-date', { context: { dates: [] } });
    await render(card(of([pv('c1'), q]), actions()));
    expect(container.textContent).toContain(hint);
    await render(card(of([pv('c1'), q, answer(q, 'confirm', { time: 1795003200, timePrecision: 'day' }, 200)]), actions()));
    expect(container.textContent).not.toContain(hint);
    await render(card(of([pv('c1'), question('which-date', { candidateId: 'c1', context: { dates: [] } })]), actions()));
    expect(container.textContent).not.toContain(hint);
  });

  it('a picture: how many results were read on it, beside its values, for her alone', async () => {
    const on = (backend: string | undefined, id: string, over: any = {}) => { const v = pv(id, over); v.content.extraction = { ...v.content.extraction, backend }; return v; };
    const line = () => container.querySelector('[data-picture-count]')?.textContent ?? null;
    await render(card(of([on('vision', 'c1'), on('vision', 'c2', { status: 'kept-aside', reason: 'x' }), on('vision', 'c3', { replaces: 'c1' })]), actions()));
    expect(line()).toBe('2 results read on this picture. Compare with the page: a line may be missing.');
    await render(card(of([on('vision', 'c1')]), actions()));
    expect(line()).toBe('1 result read on this picture. Compare with the page: a line may be missing.');
    lang = 'fr';
    await render(card(of([on('vision', 'c1'), on('vision', 'c2')]), actions()));
    expect(line()).toBe('2 résultats lus sur cette image. Comparez avec la page : une ligne peut manquer.');
    lang = 'en';
    for (const backend of ['text-layer', undefined]) {
      await render(card(of([on(backend, 'c1')]), actions()));
      expect(line()).toBeNull();
    }
    await render(card(of([on('vision', 'c1')]), null, { viewer: 'contact', personName: 'Anna' }));
    expect(line()).toBeNull();
  });

  it('a picture: the step says it until she answered one of its values', async () => {
    const on = (id: string) => { const v = pv(id); v.content.extraction = { ...v.content.extraction, backend: 'vision' }; return v; };
    const line = () => container.querySelector('[data-picture-count]')?.textContent ?? null;
    const step = (c: any) => {
      const st = conv.nextStep(c, ['hds-reader'], { status: 'awaiting-answers' })!;
      return <conv.ConversationStepBubble step={st} conversation={c} contactName='Dr Test' title='Lab report' sourceOf={() => null} actions={actions()} />;
    };
    const vs = [on('c1'), on('c2'), on('c3'), on('c4')];
    await render(step(of(vs)));
    expect(line()).toBe('4 results read on this picture. Compare with the page: a line may be missing.');
    const q = question('which-date', { context: { dates: [] } });
    await render(step(of([q, ...vs])));
    expect(line()).toBeNull();
    await render(step(of([...vs, answer(vs[0], 'confirm', { candidateIds: ['c1'], written: [{ candidateId: 'c1', eventId: 'v1' }] }, 300)])));
    expect(line()).toBeNull();
  });

  it('which-date: a printed date answers with its day at 12:00 UTC; "I do not know" with unknown', async () => {
    const q = question('which-date', { context: { dates: [{ day: '2026-11-18', text: '18.11.2026', label: 'Prélevé le', role: 'sampling' }] } });
    const a = actions();
    await render(card(of([q]), a));
    const date = buttons().find((b) => b.textContent?.includes('18.11.2026'));
    expect(date?.textContent).toContain('Prélevé le');
    await click(date!);
    expect(a.answer).toHaveBeenLastCalledWith(q.id, { action: 'confirm', time: Date.parse('2026-11-18T12:00:00Z') / 1000, timePrecision: 'day' }, 100);
    await click(button('I do not know'));
    expect(a.answer).toHaveBeenLastCalledWith(q.id, { action: 'confirm', timePrecision: 'unknown' }, 100);
  });

  it('a choice question offers its options (an unknown option not selectable) and names the value it is about', async () => {
    const v = pv('c1', { status: 'unit-missing', proposal: undefined });
    const q = question('which-unit', { candidateId: 'c1', options: ['mmol/L', 'not a unit!'] });
    const a = actions();
    await render(card(of([v, q]), a));
    expect(container.textContent).toContain('About: Ferritine 48 ng/mL');
    expect(button('not a unit!')?.disabled).toBe(true);
    await click(button('mmol/L'));
    expect(a.answer).toHaveBeenCalledWith(q.id, { action: 'choose', option: 'mmol/L' }, 100);
  });

  it('an unknown or third-party question is shown, not answerable (R8)', async () => {
    await render(card(of([question('x-acme-mood', { options: ['a'] })])));
    expect(container.textContent).toContain('Dr Test asks a question this app cannot answer yet.');
    expect(button('a')).toBeNull();
    expect(button('Skip')).toBeNull();
  });

  it('"Check on the document" shows her document on the value, then Confirm sends that value with shownAt', async () => {
    const a = actions();
    await render(card(of([pv('c1', { status: 'check' })]), a));
    expect(container.textContent).toContain('Please check this one on the document');
    expect(button('Confirm')).toBeNull();
    await click(button('Check on the document'));
    expect(container.textContent).toContain('Can you confirm this value is 48 (concentration/ug-l)?');
    expect(container.querySelector('[role="region"]')).not.toBeNull();
    await click(button('Confirm'));
    expect(a.confirm).toHaveBeenCalledWith(['c1'], 100);
  });

  it('Correct opens the item\'s field prefilled; the correction drops the printed flag and keeps the range in the same unit', async () => {
    const a = actions();
    await render(card(of([pv('c1')]), a));
    await click(button('Check on the document'));
    await click(button('Correct'));
    const input = container.querySelector('input[aria-label="the value"]') as HTMLInputElement;
    expect(input.value).toBe('48');
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(input, '52');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(button('Save'));
    expect(a.correct).toHaveBeenCalledWith('c1', {
      itemKey: 'body-blood-serum-ferritin', type: 'concentration/ug-l', content: 52, clientData: { hdsTimePrecision: 'day', hdsRefRange: { text: '30 - 400' } }
    }, 100);
  });

  it('confirms the values read clearly in one tap', async () => {
    const a = actions();
    await render(card(of([pv('c1'), pv('c2'), pv('c3', { status: 'check' })]), a));
    await click(button('Confirm the 2 values read clearly'));
    expect(a.confirm).toHaveBeenCalledWith(['c1', 'c2'], 100);
  });

  it('a value the contact cannot propose says why and offers no confirm (R9); skip stays', async () => {
    const a = actions();
    await render(card(of([pv('c1')]), a, { engines: [] }));
    expect(container.textContent).toContain('Dr Test cannot propose values to save yet.');
    expect(button('Confirm')).toBeNull();
    await click(button('Skip'));
    expect(a.dismiss).toHaveBeenCalledWith(['c1'], 'skip', 100);
  });

  it('a kept-aside value says why, and can be asked for', async () => {
    const a = actions();
    await render(card(of([pv('c1', { status: 'kept-aside', reason: 'no-item', requestKey: 'body-blood-serum-lipase', proposal: undefined })]), a));
    expect(container.textContent).toContain('Not saved: this test has no place in your record yet.');
    await click(button('Ask for it'));
    expect(a.dismiss).toHaveBeenCalledWith(['c1'], 'request-item', 100);
  });

  it('a value saved shows it; a replaced one is shown through its replacement', async () => {
    const old = pv('c1', { status: 'unit-missing', proposal: undefined });
    const q = question('which-unit', { candidateId: 'c1', options: ['mmol/L'] });
    const c = of([old, q, answer(q, 'choose', { option: 'mmol/L', candidateIds: ['c1'] }, 150), pv('c2', { replaces: 'c1' }), (() => { const v = pv('c3'); return v; })()]);
    const done = of([...c.received, ...c.answers, answer(c.proposedValues[2].item, 'confirm', { candidateIds: ['c3'], written: [{ candidateId: 'c3', eventId: 'val1' }] }, 300)]);
    await render(card(done));
    expect(container.querySelectorAll('[data-candidate]').length).toBe(2);
    expect(container.textContent).toContain('Saved in your record');
    expect(container.textContent).toContain('You answered: mmol/L');
  });

  it('a refused answer says the value changed meanwhile', async () => {
    const a = actions();
    a.confirm.mockResolvedValueOnce({ ok: true, refused: [{ candidateId: 'c1', reason: 'changed-since-shown' }] } as any);
    await render(card(of([pv('c1')]), a));
    await click(button('Confirm'));
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('This was updated meanwhile: look at it again.');
  });

  it('a value answered meanwhile, refused, says it was updated, not that it failed', async () => {
    const a = actions();
    a.confirm.mockResolvedValueOnce({ ok: true, refused: [{ candidateId: 'c1', reason: 'answered' }] } as any);
    await render(card(of([pv('c1')]), a));
    await click(button('Confirm'));
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('This was updated meanwhile: look at it again.');
  });

  it('while the contact reads, its values are listed, not confirmable', async () => {
    await render(card(of([pv('c1'), pv('c2')]), actions(), { status: statusAlert('reading') }));
    expect(container.textContent).toContain('Dr Test has not finished with this document yet.');
    expect(button('Confirm')).toBeNull();
    expect(button('Confirm the 2 values read clearly')).toBeNull();
  });

  it('R8: an unknown status reads as in progress, an unknown notice and error get generic texts', async () => {
    const status = { alertEventId: 'a1', kind: 'task-status', hds: { kind: 'task-status', about: DOC, status: 'thinking', attempt: 1 }, time: Date.now() / 1000, direction: 'received', from: null };
    const notice = { alertEventId: 'a2', kind: 'notice', hds: { kind: 'notice', code: 'x-acme-hello', about: DOC }, time: 1, direction: 'received', from: null };
    await render(card(of([]), actions(), { status, notices: [notice] }));
    expect(container.textContent).toContain('In progress');
    expect(container.textContent).toContain('Dr Test sent a message this app cannot show yet.');
  });

  it('"This is not my document" answers is-this-yours when asked, else hands it to the host', async () => {
    const a = actions();
    const onNotMyDocument = vi.fn();
    await render(card(of([pv('c1')]), a, { onNotMyDocument }));
    await click(button('This is not my document'));
    expect(onNotMyDocument).toHaveBeenCalled();
    expect(a.answer).not.toHaveBeenCalled();
  });

  it('read-only without actions', async () => {
    await render(card(of([pv('c1'), question('which-date', { context: { dates: [{ day: '2026-11-18', text: '18.11.2026' }] } })]), null));
    expect(button('Confirm')).toBeNull();
    expect(buttons().every((b) => b.disabled || !b.textContent?.includes('18.11.2026'))).toBe(true);
  });
});

describe('[CONV-UI] bubbles and texts', () => {
  it('her answers in words', () => {
    const v = pv('c1');
    const q = question('which-date', {});
    const c = of([v, q]);
    expect(conv.answerText(answer(v, 'confirm', { candidateIds: ['c1', 'c2'] }), c)).toBe('You confirmed 2 values');
    expect(conv.answerText(answer(v, 'correct', { candidateIds: ['c1'] }), c)).toBe('You corrected a value');
    expect(conv.answerText(answer(q, 'confirm', { timePrecision: 'unknown' }), c)).toBe('You do not know the day');
    expect(conv.answerText(answer(v, 'future-action'), c)).toBe('You answered');
  });
  it('her answers to questions the contact deleted since (R10) still say what they answered', () => {
    const gone = { id: 'deleted-question' };
    expect(conv.answerText(answer(gone, 'confirm', {}), of([]))).toBe('You said the document is yours');
    expect(conv.answerText(answer(gone, 'confirm', { basis: 'profile-match' }), of([]))).toBe('Matched to your profile');
    expect(conv.answerText(answer(gone, 'confirm', { time: Date.parse('2026-11-18T12:00:00Z') / 1000, timePrecision: 'day' }), of([]), 'en-US')).toBe('You gave the day: November 18, 2026');
  });
  it('the status line and the notice bubble', async () => {
    await render(<><conv.TaskStatusLine status='awaiting-answers' counts={{ proposed: 3, questions: 1 }} contactName='Dr Test' /><conv.NoticeBubble code='no-result-found' contactName='Dr Test' /></>);
    expect(container.textContent).toContain('Waiting for your answers · 3 values, 1 question');
    expect(container.textContent).not.toContain('1 questions');
    expect(container.textContent).toContain('Dr Test found no result it could read in this document.');
  });
  it('data-model 4.24.0 codes: the notice several-sampling-dates and the error reading-failed have their own words', async () => {
    expect(conv.noticeText('several-sampling-dates', 'Dr Test')).toContain('several sampling days');
    expect(conv.errorText('reading-failed', 'Dr Test')).toBe('Dr Test could not read this document yet. It tries again by itself: you have nothing to do.');
    lang = 'fr';
    expect(conv.noticeText('several-sampling-dates', 'Dr Test')).toContain('plusieurs jours de prélèvement');
    expect(conv.errorText('reading-failed', 'Dr Test')).toContain('réessaie de lui-même');
    lang = 'en';
    const status = { alertEventId: 'e1', kind: 'task-status', hds: { kind: 'task-status', about: DOC, status: 'error', errorCode: 'reading-failed', attempt: 1 }, time: 1, direction: 'received', from: null };
    const notice = { alertEventId: 'n1', kind: 'notice', hds: { kind: 'notice', code: 'several-sampling-dates', about: DOC }, time: 1, direction: 'received', from: null };
    await render(card(of([]), actions(), { status, notices: [notice] }));
    expect(container.textContent).toContain('It tries again by itself');
    expect(container.textContent).toContain('one column per day');
    expect(container.textContent).not.toContain('cannot show yet');
  });
  it('data-model 4.39.0, 4.45.0 and 4.47.0 notices have their own words in every language, with the contact\'s name', () => {
    const codes = ['columns-not-read', 'several-result-columns', 'lines-may-be-missing', 'grid-not-located', 'kind-not-read', 'pages-not-read'];
    for (const l of ['en', 'fr', 'es', 'it', 'pt-BR']) {
      lang = l;
      const unknown = conv.noticeText('x-acme-hello', 'Dr Test');
      for (const code of codes) {
        const text = conv.noticeText(code, 'Dr Test');
        expect(text, l + ' ' + code).not.toBe(unknown);
        expect(text, l + ' ' + code).toContain('Dr Test');
        expect(text, l + ' ' + code).not.toMatch(/chart|graphique|gráfico|grafico/i);
      }
      // 4.47.0: pages-not-read names no page and no date (R6)
      expect(conv.noticeText('pages-not-read', 'Dr Test'), l).not.toMatch(/\d/);
      expect(conv.noticeText('pages-not-read', 'Dr Test'), l).not.toBe(conv.noticeText('columns-not-read', 'Dr Test'));
    }
    lang = 'en';
  });
  it('isWorking: received and reading (and an unknown status, R8) are work in progress; the rest, or a stale one, is not', () => {
    const at = (status: string, time = 1000) => ({ hds: { kind: 'task-status', status }, time });
    for (const s of ['received', 'reading', 'something-new']) expect(conv.isWorking(at(s), 1060), s).toBe(true);
    for (const s of ['awaiting-answers', 'done', 'error']) expect(conv.isWorking(at(s), 1060), s).toBe(false);
    expect(conv.isWorking(null, 1060)).toBe(false);
    expect(conv.isWorking(at('reading'), 1000 + conv.WORKING_MAX_AGE_S)).toBe(false);
    expect(conv.isWorking(at('reading'), 1000 + 60, 30)).toBe(false);
  });
  it('the working indicator says who does what on which document, politely announced, dots still for reduced motion', async () => {
    await render(<conv.ContactWorkingIndicator contactName='HDS Reader' status='reading' documentTitle='Lab report' />);
    const status = container.querySelector('[role="status"]')!;
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('HDS Reader is reading “Lab report”…');
    expect(container.querySelectorAll('.motion-safe\\:animate-bounce').length).toBe(3);
    act(() => root!.unmount());
    root = null;
    lang = 'fr';
    await render(<><conv.ContactWorkingIndicator contactName='Lecteur HDS' status='received' /><conv.ContactWorkingIndicator contactName='Dr Test' status='new-thing' documentTitle='Bilan' /></>);
    expect(container.textContent).toContain('Lecteur HDS a reçu votre document et s’y met…');
    expect(container.textContent).toContain('Dr Test travaille sur « Bilan »…');
  });
  describe('time and no news', () => {
    const T = Date.parse('2026-11-24T10:00:00Z') / 1000;
    // a number and its unit stay on one line: a no-break space
    const text = () => (container.textContent ?? '').replaceAll('\u00a0', ' ');
    const heard = () => [...container.querySelectorAll('[role="status"] > *:not([aria-hidden])')].map((e) => e.textContent).join(' ').trim();

    it('workState: each status reads as it says for its time, then not started or no news; settled or none is idle', () => {
      const at = (status: string) => ({ hds: { kind: 'task-status', status }, time: T });
      const MIN = 60;
      for (const st of ['reading', 'something-new']) {
        expect(conv.workState(at(st), T + 10 * MIN - 1), st).toBe('working');
        expect(conv.workState(at(st), T + 10 * MIN), st).toBe('no-news');
        expect(conv.workState(at(st), T + 86400 * 30), st).toBe('no-news');
      }
      expect(conv.workState(at('received'), T + 5 * MIN - 1)).toBe('working');
      expect(conv.workState(at('received'), T + 5 * MIN)).toBe('not-started');
      expect(conv.workState(at('received'), T + 13 * 3600 - 1)).toBe('not-started');
      expect(conv.workState(at('received'), T + 13 * 3600)).toBe('no-news');
      for (const st of ['sent', null]) {
        expect(conv.progressState(st, T, T + 5 * MIN - 1)).toBe('working');
        expect(conv.progressState(st, T, T + 5 * MIN)).toBe('no-news');
      }
      for (const st of ['awaiting-answers', 'done', 'error']) expect(conv.workState(at(st), T + 86400), st).toBe('idle');
      expect(conv.workState(null, T)).toBe('idle');
      expect(conv.progressState('reading', T + 10, T)).toBe('working');
    });

    it('the indicator counts the time for the eye; a screen reader hears no moving time', async () => {
      await render(<conv.ContactWorkingIndicator contactName='HDS Reader' status='reading' documentTitle='Lab report' sinceS={T} nowS={T + 125} />);
      expect(container.querySelector('[data-working-counter]')!.textContent).toBe('2:05');
      expect(container.querySelector('[data-working-counter]')!.getAttribute('aria-hidden')).toBe('true');
      expect(heard()).toBe('HDS Reader is reading “Lab report”…');
    });

    it('without news for a while it says so, never that the contact reads or stopped', async () => {
      for (const status of ['sent', 'reading', 'new-thing']) {
        await render(<conv.ContactWorkingIndicator key={status} contactName='HDS Reader' status={status} documentTitle='Lab report' sinceS={T} nowS={T + 15 * 60 + 20} locale='en-US' />);
        expect(text(), status).toContain('No news from HDS Reader about “Lab report” for 15 min.');
        expect(text(), status).toContain('Your document is kept in your account.');
        expect(text(), status).not.toMatch(/is reading|is working|is starting|stopped|down|later|nothing to do/);
        expect(container.querySelector('.motion-safe\\:animate-bounce'), status).toBeNull();
        expect(container.querySelector('[data-working-indicator="no-news"]'), status).not.toBeNull();
        expect(heard(), status).toMatch(/^No news from HDS Reader about “Lab report” since .+\. Your document is kept/);
        expect(heard(), status).not.toContain('15 min');
      }
    });

    it('on hold (4.33.0): said at once, no dots, never as work; no news past 25 h', async () => {
      const at = { hds: { kind: 'task-status', status: 'on-hold' }, time: T };
      expect(conv.isInProgress('on-hold')).toBe(true);
      expect(conv.isWorking(at, T + 1)).toBe(false);
      expect(conv.workState(at, T)).toBe('on-hold');
      expect(conv.workState(at, T + 25 * 3600 - 1)).toBe('on-hold');
      expect(conv.workState(at, T + 25 * 3600)).toBe('no-news');
      await render(<conv.ContactWorkingIndicator contactName='HDS Reader' status='on-hold' documentTitle='Lab report' sinceS={T} nowS={T + 720} locale='en-US' />);
      expect(text()).toContain('HDS Reader has “Lab report” and cannot read it right now (12 min).');
      expect(text()).toContain('You have nothing to do. Your document is kept in your account.');
      expect(text()).not.toMatch(/is reading|is working|stopped|later/);
      expect(container.querySelector('.motion-safe\\:animate-bounce')).toBeNull();
      expect(container.querySelector('[data-working-indicator="on-hold"]')).not.toBeNull();
      expect(heard()).toMatch(/^HDS Reader has “Lab report” and cannot read it right now, since .+\. You have nothing to do/);
      await render(<conv.ContactWorkingIndicator key='n' contactName='HDS Reader' status='on-hold' sinceS={T} nowS={T + 3 * 3600} />);
      expect(text()).toContain('HDS Reader has your document and cannot read it right now (over an hour).');
      await render(<conv.ContactWorkingIndicator key='t' contactName='HDS Reader' status='on-hold' />);
      expect(container.querySelector('[data-working-indicator="on-hold"]')).not.toBeNull();
      await render(<conv.TaskStatusLine key='l' status='on-hold' contactName='HDS Reader' sinceS={T} nowS={T + 720} />);
      expect(text()).toContain('Waiting to be read · 12 min');
      expect(text()).toContain('You have nothing to do.');
      await render(<conv.TaskStatusLine key='o' status='on-hold' contactName='HDS Reader' sinceS={T} nowS={T + 30 * 3600} />);
      expect(text()).toContain('Waiting to be read · no news for 1 day');
      await render(<conv.TaskStatusLine key='p' status='on-hold' contactName='HDS Reader' />);
      expect(text()).toBe('Waiting to be read');
      lang = 'fr';
      await render(<conv.ContactWorkingIndicator key='f' contactName='Lecteur HDS' status='on-hold' documentTitle='Bilan' sinceS={T} nowS={T + 720} locale='fr-CH' />);
      expect(text()).toContain('Lecteur HDS a « Bilan » et ne peut pas le lire pour le moment (12 min).');
      expect(text()).toContain('Vous n’avez rien à faire.');
    });

    it('a status is a word from the contact: no name of the language is taken for one', () => {
      for (const st of ['constructor', 'toString', '__proto__']) expect(conv.progressState(st, T, T + 599), st).toBe('working');
    });

    it('received and not started: said as such, and past an hour without an exact time', async () => {
      await render(<conv.ContactWorkingIndicator contactName='HDS Reader' status='received' documentTitle='Lab report' sinceS={T} nowS={T + 720} locale='en-US' />);
      expect(text()).toContain('HDS Reader has “Lab report” and has not started reading it yet (12 min).');
      expect(container.querySelector('[data-working-indicator="not-started"]')).not.toBeNull();
      expect(container.querySelector('.motion-safe\\:animate-bounce')).toBeNull();
      expect(heard()).toMatch(/^HDS Reader has “Lab report” since .+ and has not started reading it yet\. Your document is kept/);
      await render(<conv.ContactWorkingIndicator key='h' contactName='HDS Reader' status='received' sinceS={T} nowS={T + 3 * 3600} />);
      expect(text()).toContain('HDS Reader has your document and has not started reading it yet (over an hour).');
      await render(<conv.ContactWorkingIndicator key='d' contactName='HDS Reader' status='received' sinceS={T} nowS={T + 14 * 3600} />);
      expect(text()).toContain('No news from HDS Reader about your document for 14 h.');
      await render(<conv.TaskStatusLine key='l' status='received' contactName='HDS Reader' sinceS={T} nowS={T + 720} />);
      expect(text()).toContain('Received · not started yet (12 min)');
    });

    it('what a screen reader hears does not change as time passes', async () => {
      await render(<conv.ContactWorkingIndicator contactName='HDS Reader' status='reading' sinceS={T} nowS={T + 600} locale='en-US' />);
      const before = heard();
      await act(async () => { root!.render(<conv.ContactWorkingIndicator contactName='HDS Reader' status='reading' sinceS={T} nowS={T + 900} locale='en-US' />); });
      expect(text()).toContain('15 min');
      expect(heard()).toBe(before);
    });

    it('moves by itself, from the counter to no news', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(T * 1000);
        await render(<conv.ContactWorkingIndicator contactName='HDS Reader' status='reading' sinceS={T} />);
        expect(container.querySelector('[data-working-counter]')!.textContent).toBe('0:00');
        await act(async () => { vi.advanceTimersByTime(42_000); });
        expect(container.querySelector('[data-working-counter]')!.textContent).toBe('0:42');
        await act(async () => { vi.advanceTimersByTime(10 * 60_000); });
        expect(text()).toContain('No news from HDS Reader about your document for 10 min.');
        await act(async () => { vi.advanceTimersByTime(3 * 3600_000); });
        expect(text()).toContain('for 3 h.');
      } finally {
        act(() => root!.unmount());
        root = null;
        vi.useRealTimers();
      }
    });

    it('a device behind the server\'s clock counts from 0', async () => {
      await render(<conv.ContactWorkingIndicator contactName='HDS Reader' status='reading' sinceS={T + 300} nowS={T} />);
      expect(container.querySelector('[data-working-counter]')!.textContent).toBe('0:00');
    });

    it('the card\'s line: the counter, then no news in place of "Being read"', async () => {
      await render(<conv.TaskStatusLine status='reading' contactName='HDS Reader' sinceS={T} nowS={T + 61} />);
      expect(text()).toBe('Being read · 1:01');
      await act(async () => { root!.render(<conv.TaskStatusLine status='reading' contactName='HDS Reader' sinceS={T} nowS={T + 86400 * 2} />); });
      expect(text()).toContain('Reading started · no news for 2 days');
      expect(text()).toContain('Your document is kept in your account.');
      expect(text()).not.toContain('Being read');
      await act(async () => { root!.render(<conv.TaskStatusLine status={null} contactName='HDS Reader' sinceS={T} nowS={T + 3600} />); });
      expect(text()).toContain('Sent, not opened yet · no news for 1 h');
      await act(async () => { root!.render(<conv.TaskStatusLine status='new-thing' contactName='HDS Reader' sinceS={T} nowS={T + 86400} />); });
      expect(text()).toContain('Started · no news for 1 day');
    });

    it('a settled line, or one without a time, is as before', async () => {
      for (const st of ['awaiting-answers', 'done', 'error']) {
        await render(<conv.TaskStatusLine key={st} status={st} contactName='HDS Reader' sinceS={T} nowS={T + 86400} />);
        expect(container.querySelector('[data-work-state]'), st).toBeNull();
        expect(text(), st).not.toContain('no news');
      }
      await render(<conv.TaskStatusLine key='none' status='reading' contactName='HDS Reader' />);
      expect(text()).toBe('Being read');
    });

    it('a contact\'s app: its own work without change, in its own words', async () => {
      await render(<conv.TaskStatusLine status='reading' contactName='HDS Reader' viewer='contact' personName='Anna' sinceS={T} nowS={T + 720} />);
      expect(text()).toContain('Reading started · no change for 12 min');
      expect(text()).not.toContain('Your document');
      expect(text()).not.toContain('news');
    });

    it('in French', async () => {
      lang = 'fr';
      await render(<conv.ContactWorkingIndicator contactName='Lecteur HDS' status='reading' documentTitle='Bilan' sinceS={T} nowS={T + 720} locale='fr-CH' />);
      expect(text()).toContain('Pas de nouvelles de Lecteur HDS pour « Bilan » depuis 12 min.');
      await render(<conv.TaskStatusLine key='l' status='reading' contactName='Lecteur HDS' sinceS={T} nowS={T + 720} locale='fr-CH' />);
      expect(text()).toContain('Lecture commencée · pas de nouvelles depuis 12 min');
    });
  });
  it('option labels: an item key by its name, yes / no, a specimen code', () => {
    expect(conv.optionLabel('which-analyte', 'body-blood-serum-ferritin')).toEqual({ label: 'Ferritin', selectable: true });
    expect(conv.optionLabel('which-analyte', 'nope')).toEqual({ label: 'nope', selectable: false });
    expect(conv.optionLabel('is-fasting', 'yes')).toEqual({ label: 'Yes', selectable: true });
    expect(conv.optionLabel('which-specimen', 'serum-plasma')).toEqual({ label: 'Serum or plasma', selectable: true });
    expect(conv.optionLabel('which-specimen', 'whole-blood')).toEqual({ label: 'Whole blood', selectable: true });
    expect(conv.optionLabel('which-specimen', 'plasma-of-mars').selectable).toBe(false);
  });
  it('unit codes as people read them; the answer keeps the code', () => {
    expect(conv.optionLabel('which-unit', '1')).toEqual({ label: 'No unit (a ratio)', selectable: true });
    expect(conv.unitText('10*6/mL')).toBe('10⁶/mL');
    expect(conv.unitText('10*9/L')).toBe('10⁹/L');
    expect(conv.unitText('/uL')).toBe('/µL');
    expect(conv.unitText('umol/L')).toBe('µmol/L');
    expect(conv.unitText('ug/L')).toBe('µg/L');
    expect(conv.unitText('mmol/L')).toBe('mmol/L');
    expect(conv.unitText('U/L')).toBe('U/L');
  });
  it('every text has its French', () => {
    for (const [key, t] of Object.entries(CONVERSATION_TEXTS)) expect((t as any).fr, key).toBeTruthy();
  });
  it('in French', async () => {
    lang = 'fr';
    await render(<conv.TaskStatusLine status='done' contactName='Dr Test' />);
    expect(container.textContent).toBe('Terminé');
  });
});

describe('a dated grid (data-model 4.36.0)', () => {
  const ENGINES = ['hds-reader'];
  const at = (row: number, column: number, page = 1) => ({ grid: { row, column }, anchor: { eventId: DOC, page, bbox: [column * 2, 90 - row - column / 10, 2, 4] } });
  const box = (id: string, row: number, column: number, over: any = {}): any => {
    const v = pv(id, { ...at(row, column), printed: { label: String(column), value: '10KL x2' }, ...over });
    v.content.extraction = { ...v.content.extraction, backend: 'vision' };
    return v;
  };
  const unread = (id: string, row: number, column: number): any => {
    const v = box(id, row, column, { status: 'unmapped', reason: 'not-read', printed: { label: String(column) } });
    delete v.content.proposal;
    return v;
  };
  const rowDate = (row: number, column = 1): any => question('which-row-date', { context: { grid: { row, column }, anchor: at(row, column).anchor } });
  const step = (c: any, extra: any = {}): any => conv.nextStep(c, ENGINES, { status: 'awaiting-answers', ...extra });
  const DAY = { time: Date.parse('2026-01-05T12:00:00Z') / 1000, timePrecision: 'day' };
  const input = () => container.querySelector<HTMLInputElement>('input[type="date"]');
  async function type (value: string) {
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(input()!, value);
      input()!.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('the rows are dated first, top to bottom of the pages, then the values follow the grid, not where the picture tilts them', () => {
    const [q2, q1] = [rowDate(2), rowDate(1)];
    const items = [q2, q1, unread('n1', 1, 4)];
    expect(step(of(items))).toMatchObject({ kind: 'question', question: { item: { id: q1.id } } });
    const one = [...items, answer(q1, 'confirm', DAY, 200)];
    expect(step(of(one))).toMatchObject({ kind: 'question', question: { item: { id: q2.id } } });
    const done = [...one, answer(q2, 'skip', {}, 210)];
    const t = (id: string, row: number, column: number) => { const v = box(id, row, column, { status: 'check' }); v.content.proposal = { ...v.content.proposal, time: DAY.time }; return v; };
    const c = of([...done, t('b', 1, 9), t('a', 1, 2), t('z', 2, 1)]);
    expect(step(c)).toMatchObject({ kind: 'value', value: { candidateId: 'a' } });
    expect(conv.documentOrder(c.proposedValues.filter((v: any) => v.item.content.proposal != null)).map((v: any) => v.candidateId)).toEqual(['a', 'b', 'z']);
    // a skipped row stays answerable when she reviews what she set aside
    expect(step(of(done), { includeSkipped: true })).toMatchObject({ kind: 'question', question: { item: { id: q2.id } } });
  });

  it('a row is dated on its box, with a whole day that is past; skipped, or changed until a value of the row is written', async () => {
    const q = rowDate(3, 7);
    const a = actions();
    const sourceOf = vi.fn(() => ({ kind: 'image', url: 'data:image/png;base64,AAAA' }) as any);
    await render(card(of([q, unread('n1', 3, 9)]), a, { sourceOf }));
    expect(container.textContent).toContain('Which day is the marked box? Give its year too.');
    expect(container.querySelector('[data-question="which-row-date"] [role="region"]')!.getAttribute('aria-label')).toBe('Your document, The day of the marked box');
    const save = () => button('Save') as HTMLButtonElement;
    expect(save().disabled).toBe(true);
    for (const bad of ['0026-01-05', '2999-01-01']) {
      await type(bad);
      expect(save().disabled).toBe(true);
    }
    await type('2026-01-05');
    await click(save());
    expect(a.answer).toHaveBeenCalledWith(q.id, { action: 'confirm', ...DAY }, expect.any(Number));
    expect(button('Skip')).not.toBeNull();

    const answered = [q, answer(q, 'confirm', DAY, 200)];
    const v = box('v1', 3, 7);
    v.content.proposal = { ...v.content.proposal, time: DAY.time };
    await render(card(of([...answered, v]), a, { sourceOf }));
    expect(container.textContent).toContain('You gave the day: January 5, 2026');
    expect(input()).toBeNull();
    await click(button('Change the day'));
    expect(input()!.value).toBe('2026-01-05');
    await type('2026-02-05');
    await click(button('Save'));
    expect(a.answer).toHaveBeenLastCalledWith(q.id, { action: 'confirm', time: DAY.time + 31 * 86400, timePrecision: 'day' }, expect.any(Number));

    const written = answer(v, 'confirm', { candidateIds: ['v1'], written: [{ candidateId: 'v1', eventId: 'e1' }] }, 300);
    await render(card(of([...answered, v, written]), a, { sourceOf }));
    expect(button('Change the day')).toBeNull();
    // another row's value does not hold this one
    const other = box('v2', 4, 7);
    await render(card(of([...answered, v, other, answer(other, 'confirm', { candidateIds: ['v2'], written: [{ candidateId: 'v2', eventId: 'e2' }] }, 300)]), a, { sourceOf }));
    expect(button('Change the day')).not.toBeNull();
    await render(card(of([...answered, v]), null, { sourceOf }));
    expect(button('Change the day')).toBeNull();
  });

  it('her answer comes before her document: Save and Confirm are above the picture, not under it on a phone', async () => {
    const sourceOf = () => ({ kind: 'image', url: 'data:image/png;base64,AAAA' }) as any;
    const bubble = (c: any) => <conv.ConversationStepBubble step={step(c)} conversation={c} contactName='Dr Test' title='Chart' sourceOf={sourceOf} actions={actions()} />;
    const above = (a: Element | null, b: Element | null) => a != null && b != null && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    const region = () => container.querySelector('[role="region"]');
    const q = rowDate(1);
    await render(bubble(of([q, unread('n1', 1, 4)])));
    expect(above(button('Save'), region())).toBe(true);
    const v = box('v1', 1, 2, { status: 'check' });
    v.content.proposal = { ...v.content.proposal, time: DAY.time };
    await render(bubble(of([q, answer(q, 'confirm', DAY, 200), v])));
    expect(above(button('Confirm'), region())).toBe(true);
    expect(above(button('Later'), button('Hide the document'))).toBe(true);
  });

  it('a box is named by its place, one read in part says so, the boxes not read are counted and are not results', async () => {
    const read = box('a', 3, 14);
    read.content.proposal = { ...read.content.proposal, time: DAY.time };
    const c = of([read, unread('b', 3, 14), unread('d', 3, 15), box('e', 3, 16)]);
    await render(card(c, actions()));
    expect(container.querySelector('[data-candidate="a"]')!.textContent).toContain('Row 3, box 14: 10KL x2');
    expect(container.querySelector('[data-candidate="a"]')!.textContent).toContain('Part of this box was not read');
    expect(container.querySelector('[data-candidate="b"]')!.textContent).toContain('Row 3, box 14');
    expect(container.querySelector('[data-candidate="b"]')!.textContent).not.toContain('Part of this box');
    expect(container.querySelector('[data-candidate="e"]')!.textContent).not.toContain('Part of this box');
    expect(container.querySelector('[data-picture-count]')!.textContent).toContain('2 results read on this picture.');
    expect(container.querySelector('[data-not-read-count]')!.textContent).toBe('2 boxes with writing were not read.');
    expect(button('Ask for it')).toBeNull();
    const sourceOf = vi.fn(() => ({ kind: 'image', url: 'data:image/png;base64,AAAA' }) as any);
    await render(card(of([unread('b', 3, 14)]), actions(), { sourceOf }));
    expect(container.querySelector('[data-candidate="b"] [role="region"]')).toBeNull();
    await click(button('See it on the document'));
    expect(container.querySelector('[data-candidate="b"] [role="region"]')!.getAttribute('aria-label')).toBe('Your document, Row 3, box 14');
    await click(button('Hide the document'));
    expect(container.querySelector('[data-candidate="b"] [role="region"]')).toBeNull();
    expect(container.querySelector('[data-picture-count]')).toBeNull();
    expect(container.querySelector('[data-not-read-count]')!.textContent).toBe('1 box with writing was not read.');
    // the same place on another page is another box
    await render(card(of([read, { ...unread('p', 3, 14), content: { ...unread('p', 3, 14).content, anchor: at(3, 14, 2).anchor } }]), actions()));
    expect(container.querySelector('[data-candidate="a"]')!.textContent).not.toContain('Part of this box');
  });

  it('a value without its own day is never dated by an answer on the document', () => {
    const q = question('which-date', { context: { dates: [] } });
    const undated = box('a', 1, 1);
    delete undated.content.proposal.time;
    const c = of([q, undated, answer(q, 'confirm', DAY, 200)]);
    expect(conv.rowBlock(c, c.proposedValues[0], ENGINES)).toBe('no-date');
    expect(conv.valueDayText(c.proposedValues[0], c.proposedValues, 'en', c)).toBeNull();
  });
});

describe('[CONV-UI] data-model 4.47.0: a date with its crop (R8, § Question codes)', () => {
  const ANCHOR = { eventId: DOC, attachmentId: 'att1', page: 1, bbox: [60, 6, 30, 2] };
  const read = { day: '2026-11-18', text: '18.11.2026', role: 'sampling', anchor: ANCHOR };
  const typed = { day: '2026-11-17', text: '17.11.2026', role: 'report' };
  const dateButton = (text: string) => buttons().find((b) => b.textContent?.includes(text)) ?? null;
  const image = () => ({ url: 'https://x.backloop.dev/scan.jpg', kind: 'image' }) as any;

  it('[D47-1] a date read on a picture is shown with its crop, and offered once the crop shows; one without anchor as before', async () => {
    const q = question('which-date', { context: { dates: [read, typed] } });
    const a = actions();
    const sourceOf = vi.fn(image);
    await render(card(of([q]), a, { sourceOf }));
    const block = container.querySelector('[data-anchored-date]')!;
    expect(block).not.toBeNull();
    expect(block.querySelector('[role="region"]')).not.toBeNull();
    expect(sourceOf).toHaveBeenCalledWith('att1');
    expect(dateButton('17.11.2026')).not.toBeNull();
    expect(dateButton('18.11.2026')).toBeNull();
    const img = block.querySelector('img')!;
    Object.defineProperty(img, 'naturalWidth', { value: 1240 });
    Object.defineProperty(img, 'naturalHeight', { value: 1754 });
    await act(async () => { img.dispatchEvent(new Event('load')); });
    expect(block.querySelector('[data-testid="anchor-highlight"]')).not.toBeNull();
    await click(dateButton('18.11.2026'));
    expect(a.answer).toHaveBeenLastCalledWith(q.id, { action: 'confirm', time: Date.parse('2026-11-18T12:00:00Z') / 1000, timePrecision: 'day' }, 100);
  });

  it('[D47-2] no crop, no one-tap date: a file she cannot read, an anchor on another document or with no box, a picture that fails', async () => {
    const q = (anchor: any) => question('which-date', { context: { dates: [{ ...read, anchor }, typed] } });
    const offered = () => ({ anchored: container.querySelector('[data-anchored-date]') != null, read: dateButton('18.11.2026') != null, typed: dateButton('17.11.2026') != null, other: button('Another day') != null });
    await render(card(of([q(ANCHOR)]), actions(), { sourceOf: () => null }));
    expect(offered()).toEqual({ anchored: false, read: false, typed: true, other: true });
    await render(card(of([q({ ...ANCHOR, eventId: 'anotherdoc01' })]), actions(), { sourceOf: image }));
    expect(offered()).toEqual({ anchored: false, read: false, typed: true, other: true });
    await render(card(of([q({ eventId: DOC, attachmentId: 'att1', page: 1 })]), actions(), { sourceOf: image }));
    expect(offered()).toEqual({ anchored: false, read: false, typed: true, other: true });
    await render(card(of([q(ANCHOR)]), actions(), { sourceOf: image }));
    await act(async () => { container.querySelector('[data-anchored-date] img')!.dispatchEvent(new Event('error')); });
    expect(offered()).toEqual({ anchored: false, read: false, typed: true, other: true });
  });

  it('[D47-3] which-document-date reads its anchored dates the same way', async () => {
    const q = question('which-document-date', { candidateId: 'd1', context: { dates: [read] } });
    await render(card(of([q]), actions(), { sourceOf: () => null }));
    expect(dateButton('18.11.2026')).toBeNull();
    expect(button('Another day')).not.toBeNull();
  });
});

describe('[CONV-UI] data-model 4.47.0: "Remember this name" (R3)', () => {
  const names = { profile: { name: 'Marie', surname: 'Dupont' }, otherNames: [{ family: 'MARTIN', use: 'maiden' }, { given: 'Mimi', use: 'nickname' }] };
  const iy = (name?: string) => question('is-this-yours', name != null ? { context: { identity: { name, birthDate: '14.03.1985' } } } : {});
  async function typeInto (el: Element, value: string) {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => { set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
  }

  it('[RN1] offered after her own Yes on a name none of hers; saved by the host as she accepts or changes it, never automatically', async () => {
    const q = iy('DURAND Marie');
    const onRemember = vi.fn(async () => {});
    await render(card(of([pv('c1'), q]), actions(), { rememberName: { ...names, onRemember } }));
    expect(button('Remember this name')).toBeNull();
    await render(card(of([pv('c1'), q, answer(q, 'confirm')]), actions(), { rememberName: { ...names, onRemember } }));
    expect(container.textContent).toContain('“DURAND Marie”');
    await click(button('Remember this name'));
    expect(onRemember).not.toHaveBeenCalled();
    const [given, family] = [...container.querySelectorAll('[data-remember-name] input')] as HTMLInputElement[];
    expect([given.value, family.value]).toEqual(['Marie', 'DURAND']);
    await typeInto(family, 'Durand-Lefèvre');
    await click(button('Save'));
    expect(onRemember).toHaveBeenCalledWith({ given: 'Marie', family: 'Durand-Lefèvre' });
    expect(container.textContent).toContain('Name remembered');
    expect(button('Remember this name')).toBeNull();
  });

  it('[RN2] "Not now" puts it away; a failed save says so and keeps her name', async () => {
    const q = iy('DURAND Marie');
    const onRemember = vi.fn(async () => { throw new Error('denied'); });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(card(of([q, answer(q, 'confirm')]), actions(), { rememberName: { ...names, onRemember } }));
    await click(button('Not now'));
    expect(container.querySelector('[data-remember-name]')).toBeNull();
    await render(card(of([q, answer(q, 'confirm')]), actions(), { rememberName: { ...names, onRemember } }));
    await click(button('Remember this name'));
    await click(button('Save'));
    expect(container.querySelector('[data-remember-name] [role="alert"]')).not.toBeNull();
    expect(button('Save')).not.toBeNull();
    vi.restoreAllMocks();
  });

  it('[RN3] not offered: off by default, an automatic match, a name already hers (a nickname too), no printed name, not mine, a contact\'s app', async () => {
    const onRemember = vi.fn();
    const rn = { rememberName: { ...names, onRemember } };
    const none = () => container.querySelector('[data-remember-name]') == null;
    const q = iy('DURAND Marie');
    await render(card(of([q, answer(q, 'confirm')]), actions()));
    expect(none()).toBe(true);
    await render(card(of([q, answer(q, 'confirm', { basis: 'profile-match' })]), actions(), rn));
    expect(none()).toBe(true);
    for (const name of ['DUPONT Marie', 'Marie MARTIN', 'dupont, marie', 'Mimi DUPONT']) {
      const mine = iy(name);
      await render(card(of([mine, answer(mine, 'confirm')]), actions(), rn));
      expect(none(), name).toBe(true);
    }
    const picture = iy();
    await render(card(of([picture, answer(picture, 'confirm')]), actions(), rn));
    expect(none()).toBe(true);
    await render(card(of([q, answer(q, 'not-mine')]), actions(), rn));
    expect(none()).toBe(true);
    await render(card(of([q, answer(q, 'confirm')]), null, { ...rn, viewer: 'contact', personName: 'Anna' }));
    expect(none()).toBe(true);
    expect(onRemember).not.toHaveBeenCalled();
  });

  it('[RN4] nameToRemember and splitPrintedName, for a host that offers it elsewhere in its thread', () => {
    const q = iy('DURAND Marie');
    expect(conv.nameToRemember(of([q]), names)).toBeNull();
    expect(conv.nameToRemember(of([q, answer(q, 'confirm')]), names)).toEqual({ questionId: q.id, printed: 'DURAND Marie' });
    expect(conv.nameToRemember(of([q, answer(q, 'confirm', { basis: 'profile-match' })]), names)).toBeNull();
    expect(conv.splitPrintedName('DUPONT Marie Claire')).toEqual({ given: 'Marie Claire', family: 'DUPONT' });
    expect(conv.splitPrintedName('Marie Dupont')).toEqual({ given: 'Marie', family: 'Dupont' });
    expect(conv.splitPrintedName('DUPONT, MARIE')).toEqual({ given: 'MARIE', family: 'DUPONT' });
    expect(conv.isKnownName('Durand Marie', { profile: names.profile, otherNames: [{ family: 'Durand' }] })).toBe(true);
  });

  it('[RN5] its texts exist in every language', () => {
    for (const key of ['rememberName.offer', 'rememberName.action', 'rememberName.notNow', 'rememberName.check', 'rememberName.given', 'rememberName.family', 'rememberName.saved']) {
      for (const l of ['en', 'fr', 'es', 'it', 'pt-BR']) expect((CONVERSATION_TEXTS as any)[key][l], key + ' ' + l).toBeTruthy();
    }
  });
});

describe('[CONV-UI] data-model 4.49.0: which-page-date, a document dated per page', () => {
  const BAND = { eventId: DOC, attachmentId: 'att2', page: 2, bbox: [0, 0, 100, 12] };
  // answerable from hds-lib 2.84.0 (QUESTION_CODES.WHICH_PAGE_DATE); set here so the card is tested on any hds-lib
  const view = (q: any, items: any[] = [q]) => ({ ...of(items).questions.find((x: any) => x.item.id === q.id), answerable: true });
  async function typeInto (el: Element, value: string) {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => { set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
  }
  const qcard = (v: any, onAnswer: any, sourceOf: any = () => ({ url: 'https://x.backloop.dev/scan.jpg', kind: 'image' })) => (
    <conv.QuestionCard question={v} contactName='Dr Test' sourceOf={sourceOf} onAnswer={onAnswer} />
  );

  it('[PD1] the page is shown at once, no date offered; a full day up to today answers confirm at 12:00 UTC, or skip', async () => {
    const q = question('which-page-date', { context: { anchor: BAND } });
    const onAnswer = vi.fn();
    const sourceOf = vi.fn(() => ({ url: 'https://x.backloop.dev/scan.jpg', kind: 'image' }) as any);
    await render(qcard(view(q), onAnswer, sourceOf));
    expect(container.textContent).toContain('Which day are the results on this page from? Give its year too.');
    expect(container.querySelector('[role="region"]')).not.toBeNull();
    expect(sourceOf).toHaveBeenCalledWith('att2');
    expect(buttons().map((b) => b.textContent?.trim()).filter((t) => t !== '−' && t !== '+')).toEqual(['Save', 'Skip', 'Hide the document']);
    const input = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input.max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(button('Save')!.disabled).toBe(true);
    await typeInto(input, '2999-01-01');
    expect(button('Save')!.disabled).toBe(true);
    await typeInto(input, '2026-11-18');
    await click(button('Save'));
    expect(onAnswer).toHaveBeenLastCalledWith({ action: 'confirm', time: Date.parse('2026-11-18T12:00:00Z') / 1000, timePrecision: 'day' });
    await click(button('Skip'));
    expect(onAnswer).toHaveBeenLastCalledWith({ action: 'skip' });
  });

  it('[PD2] without a top band, the whole page; an anchor on another document is not used', async () => {
    const sourceOf = vi.fn(() => ({ url: 'https://x.backloop.dev/scan.jpg', kind: 'image' }) as any);
    await render(qcard(view(question('which-page-date', { context: { anchor: { eventId: DOC, attachmentId: 'att3', page: 3 } } })), vi.fn(), sourceOf));
    expect(container.querySelector('[role="region"]')).not.toBeNull();
    expect(sourceOf).toHaveBeenLastCalledWith('att3');
    await render(qcard(view(question('which-page-date', { context: { anchor: { ...BAND, eventId: 'anotherdoc01' } } })), vi.fn(), sourceOf));
    expect(sourceOf).toHaveBeenLastCalledWith(undefined);
  });

  it('[PD3] answered: the day she gave', async () => {
    const q = question('which-page-date', { context: { anchor: BAND } });
    const a = answer(q, 'confirm', { time: Date.parse('2026-11-18T12:00:00Z') / 1000, timePrecision: 'day' });
    expect(conv.questionAnswerText('which-page-date', a.content, 'en')).toMatch(/^You gave the day: /);
    await render(qcard({ ...view(q), state: 'answered', answer: a }, vi.fn()));
    expect(container.textContent).toContain('You gave the day');
    expect(container.querySelector('input[type="date"]')).toBeNull();
  });

  it('[PD4] one step per page, in page order, before the values', () => {
    const p2 = question('which-page-date', { context: { anchor: BAND } });
    const p1 = question('which-page-date', { context: { anchor: { ...BAND, page: 1 } } });
    const c = of([pv('c1'), p2, p1]);
    for (const q of c.questions) (q as any).answerable = true;
    expect(conv.nextStep(c, ['hds-reader'], { status: 'awaiting-answers' })).toMatchObject({ kind: 'question', question: { item: { id: p1.id } } });
  });

  it('[PD5] its texts exist in every language', () => {
    for (const key of ['question.which-page-date', 'page-date.label']) {
      for (const l of ['en', 'fr', 'es', 'it', 'pt-BR']) expect((CONVERSATION_TEXTS as any)[key][l], key + ' ' + l).toBeTruthy();
    }
  });
});
