import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cmcConversation, cmcDocuments, getHDSModel, HDSProfile } from 'hds-lib';
import type { pryv as Pryv, ConversationAlert, ConversationItem, DocumentAlert, DocumentConversation, ScopePermission } from 'hds-lib';
import type { ConversationActions, ConversationOutcome } from './conversationRun';

/** A relationship as the conversation reads it (hds-lib `CmcRelationship` fits) */
export interface ConversationRel {
  accessId: string;
  localCollectorStreamId?: string | null;
  grantedPermissions: ScopePermission[];
  appCode?: string | null;
}

/** One document's conversation with a contact, with what a host needs to show it and answer it */
export interface DocumentConversationData {
  /** `<accessId>:<document event id>` */
  key: string;
  rel: ConversationRel;
  /** The document's event id */
  about: string;
  conversation: DocumentConversation;
  /** The latest `task-status` of the document (R4) */
  status: ConversationAlert | null;
  notices: ConversationAlert[];
  /** The engines vouched for the relationship's app (R9) */
  engines: string[];
  /** Where it sits in a thread: the contact's first alert or item about the document */
  time: number;
  /**
   * Her app is still checking which values her record already holds (`autoMarkDuplicates`): a host shows no step yet,
   * so a value she has is never offered to save
   */
  checking: boolean;
  /**
   * The document event, read when the contact proposed its date and kind (4.26.0), for `nextStep`'s `document`; else
   * null
   */
  document: DocumentEvent | null;
  actions: ConversationActions;
}

type DocumentEvent = { id: string; type?: string; trashed?: boolean; streamIds?: string[]; time?: number; content?: any; clientData?: Record<string, any> };

export interface DocumentConversationsState {
  documents: DocumentConversationData[];
  /** Her answers, each with the document it is about */
  answers: Array<{ item: ConversationItem; document: DocumentConversationData }>;
  /** Notices about no document (`typed-text-not-read`) */
  looseNotices: ConversationAlert[];
  failed: boolean;
  reload: () => void;
}

export interface DocumentConversationsOptions {
  /** Changes when an alert arrives (the host's live events): the conversation is read again */
  alertEventsKey: string;
  /** The relationships' document alerts (hds-lib `listDocumentAlerts`, each with its collectors stream): R11 */
  documentAlerts: Array<DocumentAlert & { stream: string }>;
  /** Creates the model streams of the items about to be written (an account that never used an item has none) */
  provisionStreams?: (streamIds: string[]) => Promise<void>;
  /** After her app granted a relationship its conversation children: its grant changed, read the relationships again */
  onGranted?: () => Promise<void> | void;
  /** Answer `is-this-yours` itself on a profile match (R3, `basis: profile-match`); default true */
  autoConfirmIdentity?: boolean;
  /** Mark the proposed values her record already holds (R3, `basis: existing-value`); default true */
  autoMarkDuplicates?: boolean;
}

const SETTLED = new Set(['awaiting-answers', 'done']);

/**
 * What her app checks before she sees a step, for a document once the contact waits for her answers: whether her
 * record holds its open values. One key per open value (and `is-this-yours` state): a value that arrives, or the
 * identity answered, is checked again; her own answers are not.
 */
function duplicateKeys (d: { key: string; status: ConversationAlert | null; conversation: DocumentConversation }): Array<{ k: string; candidateId: string }> {
  if (!SETTLED.has(String(d.status?.hds?.status ?? ''))) return [];
  const conv = d.conversation;
  if (conv.identity === 'open' || conv.identity === 'not-mine') return [];
  return conv.proposedValues.filter((p) => p.state === 'open').map((p) => ({ k: `${d.key}|${conv.identity}|${p.item.id}:${p.item.modified}`, candidateId: p.candidateId }));
}

interface Read {
  rel: ConversationRel;
  alerts: ConversationAlert[];
  items: ConversationItem[];
  /** The documents the contact proposed a date and kind for, by id */
  documents: Record<string, DocumentEvent>;
  /** Where each document is, by id: null when it is gone, absent when it was not read */
  streamIds: Record<string, string[] | null>;
}

/** The documents a conversation is about, as the contact's alerts and the items name them */
function aboutsOf (alerts: ConversationAlert[], items: ConversationItem[]): Set<string> {
  const abouts = new Set<string>();
  for (const a of alerts) if (a.direction === 'received' && typeof a.hds.about === 'string' && a.kind !== 'answer') abouts.add(a.hds.about);
  for (const i of items) abouts.add(i.about);
  return abouts;
}

/** Whether the grant reads a document, as the platform decides; one not read or gone: whether it reads them all */
function grantReads (rel: ConversationRel, streamIds: string[] | null | undefined): boolean {
  return streamIds != null ? cmcDocuments.readsDocument(rel.grantedPermissions, { streamIds }) : cmcDocuments.sharesAllDocuments(rel.grantedPermissions);
}

/** hds-lib's reason on a refused call (`HDSLibError` carries it in its inner object) */
function reasonOf (e: unknown): string {
  const err = e as { innerObject?: { reason?: string }; reason?: string } | null;
  return err?.innerObject?.reason ?? err?.reason ?? 'failed';
}

type Refused = Array<{ candidateId: string; reason: string }>;

/** The candidates hds-lib refused, from its result or from the error it throws when an alert was not posted */
function refusedOf (from: unknown): Refused {
  const refused = (from as { refused?: unknown } | null)?.refused;
  return Array.isArray(refused) ? refused : [];
}

/** Her confirm of a value already answered (a second tap after a write that failed in the middle) is not refused: the reload shows it */
function notAnswered (out: ConversationOutcome): ConversationOutcome {
  return out.ok && out.refused != null ? { ...out, refused: out.refused.filter((r) => r.reason !== 'answered') } : out;
}

/**
 * The person's side of the standard conversation with her contacts (data-model CONVERSATION.md, hds-lib
 * `cmcConversation`), for any contact and any HDS app: per relationship with a system channel, the conversation alerts
 * on its collectors stream and the items on its two conversation children, settled per document (`conversationOf`),
 * with the actions that answer them. A document gets an entry only when it is shared in that relationship, or covered
 * by its grant (R11). Read again when an alert arrives (`alertEventsKey`), after each answer, and when the app comes
 * back to the front. A contact that talks with no children yet gets them (her app creates and grants them, once per
 * relationship and screen). On `is-this-yours`, when the printed name and birth date match her profile, her app answers
 * itself, once per document.
 */
export function useDocumentConversations (connection: Pryv.Connection | null, rels: ConversationRel[], opts: DocumentConversationsOptions): DocumentConversationsState {
  const provisionRef = useRef(opts.provisionStreams);
  provisionRef.current = opts.provisionStreams;
  const grantedRef = useRef(opts.onGranted);
  grantedRef.current = opts.onGranted;
  const ensured = useRef(new Set<string>());
  const [reads, setReads] = useState<{ key: string; list: Read[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const answering = useRef<Promise<unknown>>(Promise.resolve());
  const relKey = rels.map((r) => `${r.accessId}:${r.localCollectorStreamId ?? ''}:${r.grantedPermissions.map((p) => `${p.streamId ?? ''}=${p.level ?? ''}`).join(',')}`).join('|');
  const relsRef = useRef(rels);
  relsRef.current = rels;

  // R11: the documents each relationship may talk about: shared in it now, or read by its grant
  const sharedIn = useMemo(() => {
    const out = new Map<string, Set<string>>();
    for (const a of opts.documentAlerts) {
      if (a.direction !== 'sent' || a.kind !== 'document-shared' || !a.current) continue;
      if (!out.has(a.stream)) out.set(a.stream, new Set());
      out.get(a.stream)!.add(a.eventId);
    }
    return out;
  }, [opts.documentAlerts]);
  // a document shared or taken back changed its streams: read again
  const sharedKey = [...sharedIn].map(([stream, ids]) => `${stream}:${[...ids].sort().join(',')}`).sort().join('|');

  useEffect(() => {
    const withChannel = relsRef.current.filter((r) => r.localCollectorStreamId != null);
    if (connection == null || withChannel.length === 0) { setReads(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const list: Read[] = [];
        let granted = false;
        for (const rel of withChannel) {
          const alerts = await cmcConversation.listConversationAlerts(connection, rel.localCollectorStreamId!);
          let streams = await cmcConversation.conversationStreamsFor(connection, rel.accessId);
          if (streams == null && alerts.some((a) => a.direction === 'received') && !ensured.current.has(rel.accessId)) {
            ensured.current.add(rel.accessId);
            try {
              const made = await cmcConversation.ensureConversationStreams(connection, rel as any);
              streams = { received: made.received, sent: made.sent };
              granted = true;
            } catch (e) {
              console.warn('[conversation] children not created:', e);
            }
          }
          const items = streams != null ? await cmcConversation.listConversationItems(connection, streams) : [];
          // a proposed document is a step only against the document itself (which fields still wait on it)
          const documents: Record<string, DocumentEvent> = {};
          const proposed = new Set(items.filter((i) => i.kind === 'proposed-document').map((i) => i.about));
          // R11: whether the grant reads a document depends on the streams it is in
          const streamIds: Read['streamIds'] = {};
          const abouts = [...aboutsOf(alerts, items)];
          if (abouts.length > 0) {
            try {
              const results = await connection.api(abouts.map((id) => ({ method: 'events.getOne', params: { id } })) as any) as Array<{ event?: DocumentEvent; error?: { id?: string } }>;
              abouts.forEach((about, i) => {
                const { event, error } = results[i] ?? {};
                if (event?.streamIds != null) streamIds[about] = event.streamIds;
                else if (event != null || error?.id === 'unknown-resource') streamIds[about] = null;
                else console.warn('[conversation] document not read:', error);
                if (event != null && proposed.has(about)) documents[about] = event;
              });
            } catch (e) {
              console.warn('[conversation] documents not read:', e);
            }
          }
          list.push({ rel, alerts, items, documents, streamIds });
        }
        if (!cancelled) { setReads({ key: relKey, list }); setFailed(false); }
        if (granted) await grantedRef.current?.();
      } catch (e) {
        console.warn('[conversation] not read:', e);
        if (!cancelled) setFailed(true);
      }
    })();
    const onVisible = (): void => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, [connection, relKey, sharedKey, opts.alertEventsKey, version, reload]);

  const autoDuplicates = opts.autoMarkDuplicates !== false;
  const dupTried = useRef(new Set<string>());
  const dupDone = useRef(new Set<string>());
  const [checked, setChecked] = useState(0);

  const state = useMemo(() => {
    const documents: DocumentConversationData[] = [];
    const answers: DocumentConversationsState['answers'] = [];
    const looseNotices: ConversationAlert[] = [];
    if (connection == null || reads == null || reads.key !== relKey) return { documents, answers, looseNotices };
    for (const { rel, alerts, items, documents: docEvents, streamIds } of reads.list) {
      const fromContact = alerts.filter((a) => a.direction === 'received');
      const allowed = (about: string): boolean => (sharedIn.get(rel.localCollectorStreamId!)?.has(about) ?? false) || grantReads(rel, streamIds[about]);
      for (const a of fromContact) if (a.kind === 'notice' && a.hds.about == null) looseNotices.push(a);
      const engines = cmcConversation.vouchedEnginesFor(rel.appCode);
      for (const about of aboutsOf(alerts, items)) {
        if (!allowed(about)) continue;
        const conversation = cmcConversation.conversationOf(items, about);
        const mine = fromContact.filter((a) => a.hds.about === about);
        const times = [...mine.map((a) => a.time), ...conversation.received.map((i) => i.created)];
        const key = `${rel.accessId}:${about}`;
        const status = cmcConversation.taskStatusOf(alerts, about);
        const dupKeys = autoDuplicates ? duplicateKeys({ key, status, conversation }) : [];
        const doc: DocumentConversationData = {
          key,
          rel,
          about,
          conversation,
          status,
          notices: mine.filter((a) => a.kind === 'notice'),
          engines,
          time: times.length > 0 ? Math.min(...times) : 0,
          checking: dupKeys.some(({ k }) => !dupDone.current.has(k)),
          document: docEvents[about] ?? null,
          actions: actionsFor(connection, rel, about, engines, reload, conversation, (ids) => provisionRef.current?.(ids) ?? Promise.resolve(), answering)
        };
        documents.push(doc);
        for (const item of conversation.answers) answers.push({ item, document: doc });
      }
    }
    return { documents, answers, looseNotices };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `checked` re-reads dupDone (a ref) after a check
  }, [connection, reads, relKey, sharedIn, reload, autoDuplicates, checked]);

  useEffect(() => {
    if (!autoDuplicates || connection == null) return;
    const pending = state.documents
      .map((d) => ({ d, keys: duplicateKeys(d).filter(({ k }) => !dupTried.current.has(k)) }))
      .filter((x) => x.keys.length > 0);
    if (pending.length === 0) return;
    (async () => {
      let answered = false;
      for (const { d, keys } of pending) {
        for (const { k } of keys) dupTried.current.add(k);
        let matched = new Set<string>();
        try {
          const res = await cmcConversation.autoMarkDuplicates(connection, d.rel as any, { about: d.about, engines: d.engines });
          if (res != null) { answered = true; matched = new Set(res.candidateIds); }
        } catch (e) {
          console.warn('[conversation] values already in her record not checked:', e);
        }
        // a value found in her record stays "checking" until the conversation read again shows it answered (then it is
        // no longer open, so no longer checked): no step offers it meanwhile
        for (const { k, candidateId } of keys) if (!matched.has(candidateId)) dupDone.current.add(k);
      }
      setChecked((v) => v + 1);
      if (answered) reload();
    })();
  }, [autoDuplicates, connection, state.documents, reload]);

  const autoTried = useRef(new Set<string>());
  const auto = opts.autoConfirmIdentity !== false;
  useEffect(() => {
    if (!auto || connection == null || !HDSProfile.isHooked) return;
    const pending = state.documents.filter((d) => d.conversation.identity === 'open' && !autoTried.current.has(d.key));
    if (pending.length === 0) return;
    let profile: { name?: string; surname?: string; dateOfBirth?: string };
    try { profile = HDSProfile.getAll() as typeof profile; } catch { return; }
    (async () => {
      let answered = false;
      for (const d of pending) {
        autoTried.current.add(d.key);
        try {
          if (await cmcConversation.autoConfirmIdentity(connection, d.rel as any, { about: d.about, profile }) != null) answered = true;
        } catch (e) {
          console.warn('[conversation] profile match not answered:', e);
        }
      }
      if (answered) reload();
    })();
  }, [auto, connection, state.documents, reload]);

  // R3, 4.26.0: a proposed document none of whose fields still waits on the document (she set them) settles itself
  const settleTried = useRef(new Set<string>());
  useEffect(() => {
    if (connection == null) return;
    const pending = state.documents.filter((d) => d.document != null && (d.conversation.proposedDocuments ?? []).some((pd) => {
      const key = `${d.key}|${pd.item.id}:${pd.item.modified}`;
      return pd.state === 'open' && !settleTried.current.has(key) && cmcConversation.documentProposalRefusal(pd, d.document, d.conversation) === 'nothing-pending';
    }));
    if (pending.length === 0) return;
    (async () => {
      let answered = false;
      for (const d of pending) {
        for (const pd of d.conversation.proposedDocuments) settleTried.current.add(`${d.key}|${pd.item.id}:${pd.item.modified}`);
        try {
          if ((await cmcConversation.autoSettleProposedDocuments(connection, d.rel as any, { about: d.about })).length > 0) answered = true;
        } catch (e) {
          console.warn('[conversation] proposed document not settled:', e);
        }
      }
      if (answered) reload();
    })();
  }, [connection, state.documents, reload]);

  // her notes (answer.note, 4.26.0) removed once a `done` of the contact is later, whatever follows it (shared again, on hold),
  // or 24 h after on not-mine or an unshared document
  const notesTried = useRef(new Set<string>());
  useEffect(() => {
    if (connection == null || reads == null) return;
    const work: Array<{ rel: ConversationRel; about: string; unshared: boolean; ids: string[] }> = [];
    for (const { rel, alerts, items, streamIds } of reads.list) {
      for (const about of new Set(items.map((i) => i.about))) {
        const conv = cmcConversation.conversationOf(items, about);
        if (!conv.answers.some((a) => typeof a.content.note === 'string')) continue;
        // a document not read this time may still be one the grant reads: not taken for unshared
        const unshared = streamIds[about] !== undefined && !grantReads(rel, streamIds[about]) && !(sharedIn.get(rel.localCollectorStreamId ?? '')?.has(about) ?? false);
        const due = cmcConversation.notesToRemove(conv, cmcConversation.latestDoneOf(alerts, about), { unshared, current: cmcConversation.taskStatusOf(alerts, about) }).map((a) => a.id).filter((id) => !notesTried.current.has(id));
        if (due.length > 0) work.push({ rel, about, unshared, ids: due });
      }
    }
    if (work.length === 0) return;
    (async () => {
      for (const w of work) {
        for (const id of w.ids) notesTried.current.add(id);
        try {
          await cmcConversation.removeNotes(connection, w.rel as any, { about: w.about, unshared: w.unshared });
        } catch (e) {
          console.warn('[conversation] notes not removed:', e);
        }
      }
    })();
  }, [connection, reads, sharedIn]);

  return { ...state, failed, reload };
}

/** The model stream of an item, null when the model does not know it */
function itemStreamOf (itemKey: unknown): string | null {
  if (typeof itemKey !== 'string') return null;
  try {
    return getHDSModel().itemsDefs.forKey(itemKey, false)?.data.streamId ?? null;
  } catch {
    return null;
  }
}

/**
 * Her answers for one document, through hds-lib (it writes the values, then the answer and its alert). The streams of
 * the items a confirmation or a correction writes are created first: hds-lib writes on the item's stream and an
 * account that never used the item has none.
 */
function actionsFor (
  connection: Pryv.Connection, rel: ConversationRel, about: string, engines: string[], reload: () => void,
  conversation: DocumentConversation, provision: (streamIds: string[]) => Promise<void>, answering: { current: Promise<unknown> }
): ConversationActions {
  const provisionFor = async (itemKeys: unknown[]): Promise<void> => {
    const ids = [...new Set(itemKeys.map(itemStreamOf).filter((s): s is string => s != null))];
    if (ids.length > 0) await provision(ids);
  };
  const proposedKeys = (candidateIds: string[]) => conversation.proposedValues
    .filter((p) => candidateIds.includes(p.candidateId))
    .map((p) => p.item.content.proposal?.itemKey);
  // one answer at a time: the next step may show, and be answered, while the last one is still being written
  const call = (fn: () => Promise<unknown>): Promise<ConversationOutcome> => {
    const result = answering.current.then(() => answerNow(fn));
    answering.current = result.catch(() => {});
    return result;
  };
  const answerNow = async (fn: () => Promise<unknown>): Promise<ConversationOutcome> => {
    try {
      return { ok: true, refused: refusedOf(await fn()) };
    } catch (e) {
      const reason = reasonOf(e);
      // written, not announced: the contact finds the answer on her sent child when it reads the document again
      if (reason === 'alert-not-posted') return { ok: true, refused: refusedOf((e as { innerObject?: unknown } | null)?.innerObject) };
      console.warn('[conversation] answer failed:', e);
      return { ok: false, reason };
    } finally {
      reload();
    }
  };
  const r = rel as any;
  const noted = (note?: string): { note?: string } => (note != null && note !== '' ? { note } : {});
  return {
    confirm: async (candidateIds, shownAt, note) => notAnswered(await call(async () => {
      await provisionFor(proposedKeys(candidateIds));
      return await cmcConversation.acceptProposedValues(connection, r, { about, decisions: candidateIds.map((candidateId) => ({ candidateId, action: 'confirm' as const })), shownAt, engines, ...noted(note) });
    })),
    correct: (candidateId, correction, shownAt, note) => call(async () => {
      await provisionFor([correction.itemKey]);
      return await cmcConversation.acceptProposedValues(connection, r, { about, decisions: [{ candidateId, action: 'correct', correction }], shownAt, engines, ...noted(note) });
    }),
    dismiss: (candidateIds, action, shownAt, note) => call(() => cmcConversation.answerProposedValues(connection, r, { about, candidateIds, action, shownAt, ...noted(note) })),
    answer: (questionId, a, shownAt, note) => call(() => cmcConversation.answerQuestion(connection, r, { questionId, ...a, shownAt, ...noted(note) })),
    confirmDocument: (candidateId, correction, shownAt, note) => call(() => cmcConversation.acceptProposedDocument(connection, r, { about, candidateId, shownAt, ...(correction != null ? { correction } : {}), ...noted(note) })),
    skipDocument: (candidateId, shownAt, note) => call(() => cmcConversation.skipProposedDocument(connection, r, { about, candidateId, shownAt, ...noted(note) }))
  };
}
