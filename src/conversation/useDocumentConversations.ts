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
  actions: ConversationActions;
}

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
}

interface Read {
  rel: ConversationRel;
  alerts: ConversationAlert[];
  items: ConversationItem[];
}

/** hds-lib's reason on a refused call (`HDSLibError` carries it in its inner object) */
function reasonOf (e: unknown): string {
  const err = e as { innerObject?: { reason?: string }; reason?: string } | null;
  return err?.innerObject?.reason ?? err?.reason ?? 'failed';
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
  const relKey = rels.map((r) => `${r.accessId}:${r.localCollectorStreamId ?? ''}:${r.grantedPermissions.length}`).join('|');
  const relsRef = useRef(rels);
  relsRef.current = rels;

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
          list.push({ rel, alerts, items });
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
  }, [connection, relKey, opts.alertEventsKey, version, reload]);

  // R11: the documents each relationship may talk about: shared in it now, or every one when its grant reads them all
  const sharedIn = useMemo(() => {
    const out = new Map<string, Set<string>>();
    for (const a of opts.documentAlerts) {
      if (a.direction !== 'sent' || a.kind !== 'document-shared' || !a.current) continue;
      if (!out.has(a.stream)) out.set(a.stream, new Set());
      out.get(a.stream)!.add(a.eventId);
    }
    return out;
  }, [opts.documentAlerts]);

  const state = useMemo(() => {
    const documents: DocumentConversationData[] = [];
    const answers: DocumentConversationsState['answers'] = [];
    const looseNotices: ConversationAlert[] = [];
    if (connection == null || reads == null || reads.key !== relKey) return { documents, answers, looseNotices };
    for (const { rel, alerts, items } of reads.list) {
      const fromContact = alerts.filter((a) => a.direction === 'received');
      const seesAll = cmcDocuments.sharesAllDocuments(rel.grantedPermissions);
      const allowed = (about: string): boolean => seesAll || (sharedIn.get(rel.localCollectorStreamId!)?.has(about) ?? false);
      const abouts = new Set<string>();
      for (const a of fromContact) if (typeof a.hds.about === 'string' && a.kind !== 'answer') abouts.add(a.hds.about);
      for (const i of items) abouts.add(i.about);
      for (const a of fromContact) if (a.kind === 'notice' && a.hds.about == null) looseNotices.push(a);
      const engines = cmcConversation.vouchedEnginesFor(rel.appCode);
      for (const about of abouts) {
        if (!allowed(about)) continue;
        const conversation = cmcConversation.conversationOf(items, about);
        const mine = fromContact.filter((a) => a.hds.about === about);
        const times = [...mine.map((a) => a.time), ...conversation.received.map((i) => i.created)];
        const doc: DocumentConversationData = {
          key: `${rel.accessId}:${about}`,
          rel,
          about,
          conversation,
          status: cmcConversation.taskStatusOf(alerts, about),
          notices: mine.filter((a) => a.kind === 'notice'),
          engines,
          time: times.length > 0 ? Math.min(...times) : 0,
          actions: actionsFor(connection, rel, about, engines, reload, conversation, (ids) => provisionRef.current?.(ids) ?? Promise.resolve())
        };
        documents.push(doc);
        for (const item of conversation.answers) answers.push({ item, document: doc });
      }
    }
    return { documents, answers, looseNotices };
  }, [connection, reads, relKey, sharedIn, reload]);

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
  conversation: DocumentConversation, provision: (streamIds: string[]) => Promise<void>
): ConversationActions {
  const provisionFor = async (itemKeys: unknown[]): Promise<void> => {
    const ids = [...new Set(itemKeys.map(itemStreamOf).filter((s): s is string => s != null))];
    if (ids.length > 0) await provision(ids);
  };
  const proposedKeys = (candidateIds: string[]) => conversation.proposedValues
    .filter((p) => candidateIds.includes(p.candidateId))
    .map((p) => p.item.content.proposal?.itemKey);
  const call = async (fn: () => Promise<{ refused?: Array<{ candidateId: string; reason: string }> } | unknown>): Promise<ConversationOutcome> => {
    try {
      const res = await fn() as { refused?: Array<{ candidateId: string; reason: string }> } | null;
      return { ok: true, refused: res?.refused ?? [] };
    } catch (e) {
      const reason = reasonOf(e);
      // written, not announced: the contact finds the answer on her sent child when it reads the document again
      if (reason === 'alert-not-posted') return { ok: true };
      console.warn('[conversation] answer failed:', e);
      return { ok: false, reason };
    } finally {
      reload();
    }
  };
  const r = rel as any;
  return {
    confirm: (candidateIds, shownAt) => call(async () => {
      await provisionFor(proposedKeys(candidateIds));
      return await cmcConversation.acceptProposedValues(connection, r, { about, decisions: candidateIds.map((candidateId) => ({ candidateId, action: 'confirm' as const })), shownAt, engines });
    }),
    correct: (candidateId, correction, shownAt) => call(async () => {
      await provisionFor([correction.itemKey]);
      return await cmcConversation.acceptProposedValues(connection, r, { about, decisions: [{ candidateId, action: 'correct', correction }], shownAt, engines });
    }),
    dismiss: (candidateIds, action, shownAt) => call(() => cmcConversation.answerProposedValues(connection, r, { about, candidateIds, action, shownAt })),
    answer: (questionId, a, shownAt) => call(() => cmcConversation.answerQuestion(connection, r, { questionId, ...a, shownAt }))
  };
}
