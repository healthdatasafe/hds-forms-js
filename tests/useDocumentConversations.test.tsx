// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { ConversationRel, DocumentConversationsState } from '../src/conversation/useDocumentConversations';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** R11: which documents a contact may talk about; hds-lib's real `readsDocument` and `conversationOf`, the reads faked */
const lib = vi.hoisted(() => ({
  alerts: [] as any[],
  items: [] as any[],
  removeNotes: vi.fn(async () => []),
  accept: vi.fn(),
  acceptDocument: vi.fn(),
  profile: { isHooked: false, getAll: () => ({ name: 'Marie', surname: 'Dupont', dateOfBirth: '1985-03-14' }) },
  autoConfirm: vi.fn(async () => null)
}));
vi.mock('hds-lib', async (importOriginal) => {
  const real: any = await importOriginal();
  return {
    ...real,
    HDSProfile: lib.profile,
    cmcConversation: {
      ...real.cmcConversation,
      autoConfirmIdentity: lib.autoConfirm,
      listConversationAlerts: async () => lib.alerts,
      conversationStreamsFor: async () => ({ received: 'conv-aaaaaaaaaaaa', sent: 'conv-bbbbbbbbbbbb' }),
      listConversationItems: async () => lib.items,
      removeNotes: lib.removeNotes,
      acceptProposedValues: lib.accept,
      acceptProposedDocument: lib.acceptDocument
    }
  };
});
const { useDocumentConversations } = await import('../src/conversation/useDocumentConversations');

const DOC = 'docevent0001';
const SHARE = 'share-abcdefghijk1';
const RECEIVED = 'share-abcdefghijk2';
const STREAM = ':_cmc:apps:a:c:collectors:x';
const rel = (grantedPermissions: any[]): ConversationRel => ({ accessId: 'acc1', localCollectorStreamId: STREAM, grantedPermissions });
const status = { alertEventId: 'st', kind: 'task-status', hds: { kind: 'task-status', about: DOC, status: 'thinking', attempt: 1 }, time: 1, direction: 'received', from: null };
const question = { id: 'q1', streamId: 'conv-aaaaaaaaaaaa', direction: 'received', kind: 'question', about: DOC, time: 1, created: 1, modified: 1, content: { kind: 'question', about: DOC, code: 'x-acme-which', options: ['a'] } };
const noted = { id: 'n1', streamId: 'conv-bbbbbbbbbbbb', direction: 'sent', kind: 'answer', about: DOC, time: 2, created: 2, modified: 2, content: { kind: 'answer', about: DOC, inReplyTo: 'q1', action: 'choose', value: 'a', note: 'a note' } };
const shared = (current: boolean) => [{ alertEventId: 's1', kind: 'document-shared', eventId: DOC, time: 1, direction: 'sent', from: null, current, stream: STREAM }] as any;

/** What `events.getOne` of the document answers in the batch; null = the batch fails */
let one: any;
const api = vi.fn(async (calls: any[]) => {
  if (one == null) throw new TypeError('Failed to fetch');
  return calls.map(() => one);
});
const connection = { api } as any;

let root: Root | null = null;
let state: DocumentConversationsState;
function Host ({ rels, documentAlerts }: { rels: ConversationRel[]; documentAlerts: any[] }) {
  state = useDocumentConversations(connection, rels, { alertEventsKey: '', documentAlerts });
  return null;
}
const NONE: any[] = [];
async function read (perms: any[], documentAlerts: any[] = NONE): Promise<string[]> {
  root ??= createRoot(document.createElement('div'));
  const rels = [rel(perms)];
  await act(async () => { root!.render(<Host rels={rels} documentAlerts={documentAlerts} />); });
  return state.documents.map((d) => d.about);
}

beforeEach(() => {
  lib.alerts = [status];
  lib.items = [];
  one = { event: { id: DOC, streamIds: ['documents', SHARE] } };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { act(() => root?.unmount()); root = null; api.mockClear(); lib.removeNotes.mockClear(); vi.restoreAllMocks(); });

describe('useDocumentConversations: the documents a contact may talk about (R11)', () => {
  it('[R11A] a grant on every document, also when the document was not read or is gone', async () => {
    const all = [{ streamId: 'documents', level: 'read' }];
    expect(await read(all)).toEqual([DOC]);
    expect(api).toHaveBeenCalledWith([{ method: 'events.getOne', params: { id: DOC } }]);
    one = { error: { id: 'unknown-resource' } };
    expect(await read([{ streamId: '*', level: 'read' }])).toEqual([DOC]);
    one = null;
    expect(await read(all)).toEqual([DOC]);
  });

  it('[R11B] its own share child, or a stream under documents, with no alert', async () => {
    expect(await read([{ streamId: SHARE, level: 'read' }])).toEqual([DOC]);
    one = { event: { id: DOC, streamIds: ['documents-lab'] } };
    expect(await read([{ streamId: 'documents-lab', level: 'read' }])).toEqual([DOC]);
    one = { event: { id: DOC, streamIds: ['documents', RECEIVED] } };
    expect(await read([{ streamId: RECEIVED, level: 'contribute' }])).toEqual([DOC]);
  });

  it('[R11C] a document the grant does not read, or the platform hides from it', async () => {
    expect(await read([{ streamId: 'share-abcdefghijk9', level: 'read' }])).toEqual([]);
    expect(await read([{ streamId: 'documents', level: 'read' }, { streamId: SHARE, level: 'none' }])).toEqual([]);
    one = null;
    expect(await read([{ streamId: SHARE, level: 'read' }])).toEqual([]);
  });

  it('[R11D] a current document-shared alert is enough, one taken back is not', async () => {
    const other = [{ streamId: 'body-weight', level: 'read' }];
    expect(await read(other, shared(true))).toEqual([DOC]);
    expect(await read(other, shared(false))).toEqual([]);
  });

  it('[R11E] taken back: the document is read again', async () => {
    const perms = [{ streamId: SHARE, level: 'read' }];
    expect(await read(perms, shared(true))).toEqual([DOC]);
    one = { event: { id: DOC, streamIds: ['documents'] } };
    expect(await read(perms, shared(false))).toEqual([]);
  });

  it('[R11F] the document is given to the host only when its date and kind were proposed', async () => {
    await read([{ streamId: SHARE, level: 'read' }]);
    expect(state.documents[0].document).toBeNull();
    lib.items = [{ ...question, id: 'p1', kind: 'proposed-document', content: { kind: 'proposed-document', about: DOC, candidateId: 'd1', document: { time: 1773316800, kind: 'laboratory-report' }, status: 'clear' } }];
    await act(async () => { state.reload(); });
    expect(state.documents[0].document).toEqual(one.event);
  });
});

describe('useDocumentConversations: a proposed document', () => {
  it('[FOC6] filed only with what she was told, beside her correction and her note', async () => {
    lib.items = [{ ...question, id: 'p1', kind: 'proposed-document', content: { kind: 'proposed-document', about: DOC, candidateId: 'd1', proposal: { documentKind: 'laboratory-report' }, status: 'clear' } }];
    await read([{ streamId: SHARE, level: 'read' }]);
    lib.acceptDocument.mockResolvedValue({ applied: ['kind'], filed: null });
    const { confirmDocument } = state.documents[0].actions;
    const told = { place: 'documents-clinical', label: 'Clinical documents', gains: [], loses: [], complete: true };
    const calls = () => lib.acceptDocument.mock.calls.map((c: any[]) => c[2]);
    await act(async () => { expect((await confirmDocument!('d1', undefined, 100)).ok).toBe(true); });
    await act(async () => { await confirmDocument!('d1', { documentKind: 'other' }, 100, 'a note', told); });
    expect(calls()).toEqual([
      { about: DOC, candidateId: 'd1', shownAt: 100 },
      { about: DOC, candidateId: 'd1', correction: { documentKind: 'other' }, shownAt: 100, note: 'a note', file: true }
    ]);
  });
});

describe('useDocumentConversations: her notes on an unshared document', () => {
  beforeEach(() => { lib.alerts = []; lib.items = [question, noted]; });
  const removed = () => lib.removeNotes.mock.calls.map((c: any[]) => c[2]);

  it('[NOTE1] kept while the grant reads the document or it is shared, removed once neither', async () => {
    await read([{ streamId: 'documents', level: 'read' }]);
    await read([{ streamId: SHARE, level: 'read' }]);
    const other = [{ streamId: 'body-weight', level: 'read' }];
    await read(other, shared(true));
    expect(removed()).toEqual([]);
    await read(other, shared(false));
    expect(removed()).toEqual([{ about: DOC, unshared: true }]);
  });

  it('[NOTE2] removed when the document is gone, kept when it was not read', async () => {
    const perms = [{ streamId: SHARE, level: 'read' }];
    one = null;
    await read(perms);
    expect(removed()).toEqual([]);
    one = { error: { id: 'unknown-resource' } };
    await act(async () => { state.reload(); });
    expect(removed()).toEqual([{ about: DOC, unshared: true }]);
  });

  it('[NOTE3] removed once a done is later than the answer, whatever the contact posted after it; not before', async () => {
    const perms = [{ streamId: SHARE, level: 'read' }];
    const at = (st: string, time: number) => ({ ...status, alertEventId: st + time, hds: { ...status.hds, status: st }, time });
    for (const after of ['on-hold', 'reading', 'received']) {
      lib.removeNotes.mockClear();
      lib.alerts = [at('done', 10), at(after, 20)];
      await read(perms);
      await act(async () => { state.reload(); });
      expect(removed(), after).toEqual([{ about: DOC, unshared: false }]);
      act(() => root!.unmount());
      root = null;
    }
    // answered while the work is in progress again: waits for the next done
    lib.removeNotes.mockClear();
    lib.alerts = [at('done', 10), at('on-hold', 20)];
    lib.items = [question, { ...noted, created: 15, modified: 15 }];
    await read(perms);
    expect(removed()).toEqual([]);
  });
});

describe('useDocumentConversations: her other names in the profile match (4.47.0, R3)', () => {
  const isThisYours = { ...question, id: 'iy1', content: { kind: 'question', about: DOC, code: 'is-this-yours', context: { identity: { name: 'MARTIN Marie', birthDay: '1985-03-14' } } } };
  let names: any;
  function NamesHost ({ rels }: { rels: ConversationRel[] }) {
    state = useDocumentConversations(connection, rels, { alertEventsKey: '', documentAlerts: NONE, otherNames: names });
    return null;
  }
  const rels = [rel([{ streamId: 'documents', level: 'read' }])];
  const show = async () => {
    root ??= createRoot(document.createElement('div'));
    await act(async () => { root!.render(<NamesHost rels={rels} />); });
  };
  const profiles = () => lib.autoConfirm.mock.calls.map((c: any[]) => c[2].profile);
  beforeEach(() => { lib.profile.isHooked = true; lib.items = [isThisYours]; lib.autoConfirm.mockClear(); names = undefined; });
  afterEach(() => { lib.profile.isHooked = false; });

  it('[ON1] her profile alone without them; with them once the host gives them (the document tried again), once per list', async () => {
    await show();
    expect(profiles()).toEqual([{ name: 'Marie', surname: 'Dupont', dateOfBirth: '1985-03-14' }]);
    names = [{ given: null, family: 'MARTIN', use: 'maiden' }];
    await show();
    expect(profiles()[1]).toEqual({ name: 'Marie', surname: 'Dupont', dateOfBirth: '1985-03-14', otherNames: [{ family: 'MARTIN', use: 'maiden' }] });
    names = [{ given: null, family: 'MARTIN', use: 'maiden' }];
    await show();
    await act(async () => { state.reload(); });
    expect(profiles().length).toBe(2);
  });

  it('[ON2] off with autoConfirmIdentity false, whatever the names', async () => {
    names = [{ family: 'MARTIN' }];
    function Off ({ rels }: { rels: ConversationRel[] }) {
      state = useDocumentConversations(connection, rels, { alertEventsKey: '', documentAlerts: NONE, otherNames: names, autoConfirmIdentity: false });
      return null;
    }
    root ??= createRoot(document.createElement('div'));
    await act(async () => { root!.render(<Off rels={rels} />); });
    expect(lib.autoConfirm).not.toHaveBeenCalled();
  });
});

describe('useDocumentConversations: what an answer came to', () => {
  const R1 = { candidateId: 'c1', reason: 'changed-since-shown' };
  const ANSWERED = { candidateId: 'c2', reason: 'answered' };
  const notPosted = (inner: any) => Object.assign(new Error('alert'), { innerObject: { reason: 'alert-not-posted', ...inner } });
  async function actions () {
    await read([{ streamId: 'documents', level: 'read' }]);
    return state.documents[0].actions;
  }
  const run = async (fn: () => Promise<any>): Promise<any> => {
    let out: any;
    await act(async () => { out = await fn(); });
    return out;
  };

  it('an alert not posted is a success that keeps the refusals', async () => {
    const a = await actions();
    lib.accept.mockRejectedValueOnce(notPosted({ answers: [], refused: [R1], notPosted: ['x'] }));
    expect(await run(() => a.confirm(['c1', 'c3'], 1))).toEqual({ ok: true, refused: [R1] });
    lib.accept.mockRejectedValueOnce(notPosted({ answerEventId: 'x' }));
    expect(await run(() => a.confirm(['c1'], 1))).toEqual({ ok: true, refused: [] });
  });

  it('a confirm ignores the values already answered, and no other refusal', async () => {
    const a = await actions();
    lib.accept.mockResolvedValueOnce({ answers: [], refused: [ANSWERED] });
    expect(await run(() => a.confirm(['c2'], 1))).toEqual({ ok: true, refused: [] });
    lib.accept.mockResolvedValueOnce({ answers: [], refused: [ANSWERED, R1] });
    expect(await run(() => a.confirm(['c1', 'c2'], 1))).toEqual({ ok: true, refused: [R1] });
    lib.accept.mockRejectedValueOnce(notPosted({ refused: [ANSWERED, R1] }));
    expect(await run(() => a.confirm(['c1', 'c2'], 1))).toEqual({ ok: true, refused: [R1] });
  });

  it('a correction of a value already answered is refused: it was not applied', async () => {
    const a = await actions();
    lib.accept.mockResolvedValueOnce({ answers: [], refused: [ANSWERED] });
    expect(await run(() => a.correct('c2', { itemKey: 'x', type: 'y', content: 1 } as any, 1))).toEqual({ ok: true, refused: [ANSWERED] });
  });

  it('one answer at a time: the next waits for the last, also after a failure', async () => {
    const a = await actions();
    const order: string[] = [];
    let finish = (): void => {};
    lib.accept.mockImplementationOnce(() => new Promise((_resolve, reject) => { order.push('first'); finish = () => reject(Object.assign(new Error('w'), { innerObject: { reason: 'write-failed' } })); }));
    lib.accept.mockImplementationOnce(async () => { order.push('second'); return { answers: [], refused: [] }; });
    let outs: any[] = [];
    await act(async () => {
      const first = a.confirm(['c1'], 1);
      const second = a.confirm(['c2'], 1);
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(order).toEqual(['first']);
      finish();
      outs = await Promise.all([first, second]);
    });
    expect(order).toEqual(['first', 'second']);
    expect(outs).toEqual([{ ok: false, reason: 'write-failed' }, { ok: true, refused: [] }]);
  });

  it('a write that failed is a failure', async () => {
    const a = await actions();
    lib.accept.mockRejectedValueOnce(Object.assign(new Error('w'), { innerObject: { reason: 'write-failed', refused: [ANSWERED] } }));
    expect(await run(() => a.confirm(['c1'], 1))).toEqual({ ok: false, reason: 'write-failed' });
  });
});
