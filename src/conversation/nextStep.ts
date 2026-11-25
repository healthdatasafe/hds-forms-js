import { cmcConversation } from 'hds-lib';
import type { ConversationItem, DocumentConversation, ProposedValueView, QuestionView } from 'hds-lib';
import { alreadyInRecord, batchCandidates, isWritten, rowBlock, type RowBlock, type RowBlockOptions } from './rowBlock';
import { tx } from './labels';
import { ON_HOLD } from './workInProgress';

/**
 * One step of a conversation shown one by one, as a chat (perki: "the questions should appear like if I was chatting
 * with someone, one by one, with proposals of action I can just click"): what the person answers next about one
 * document. A pure function of the document's conversation (her answers live on her `sent` child, so leaving and coming
 * back shows the same step). `key` changes when what the step shows changes (ids and `modified`).
 */
export type ConversationStep =
  | { kind: 'question'; key: string; question: QuestionView; about: ProposedValueView | null }
  /** A proposed document (4.26.0): the document's date and kind, `pending` the fields still waiting on it */
  | { kind: 'document'; key: string; proposed: ProposedDocumentView; pending: DocumentField[] }
  | { kind: 'value'; key: string; value: ProposedValueView }
  | { kind: 'batch'; key: string; values: ProposedValueView[] }
  | {
    kind: 'summary';
    key: string;
    keptAside: ProposedValueView[];
    waiting: Array<{ value: ProposedValueView; block: RowBlock }>;
    skipped: ProposedValueView[];
    unanswerable: QuestionView[];
    /** Values her record already holds ("Add anyway" adds one; the contact deletes them once its work is done) */
    alreadyInRecord: ProposedValueView[];
  };

export interface StepOptions extends RowBlockOptions {
  /** The fewest values read clearly that make a batch step (default 3); `Infinity`: strictly one by one */
  batchMin?: number;
  /** She chose "One by one" on the batch step: it is not offered again */
  batchDeclined?: boolean;
  /** She closed the summary: no step until something new comes */
  summaryAcknowledged?: boolean;
  /** "Review the ones set aside": values she set aside ("Later", or answered `skip`) come back as steps */
  includeSkipped?: boolean;
  /**
   * The candidates she set aside with "Later": nothing is written (an answer `skip` would let the contact delete the
   * value once its work is `done`, R10), so the value stays open and the contact waits; it comes back from the summary.
   */
  deferred?: readonly string[];
  /**
   * The document event (`about`), to know which of its fields still wait (`hdsDocumentPending`, 4.26.0): without it, no
   * proposed document is a step
   */
  document?: { type?: string; trashed?: boolean; time?: number; content?: any; clientData?: Record<string, any> } | null;
}

type ProposedDocumentView = cmcConversation.ProposedDocumentView;
type DocumentField = cmcConversation.DocumentField;
const DOCUMENT_CODES = new Set(['which-document-kind', 'which-document-date']);

const SETTLED = new Set(['awaiting-answers', 'done']);
const LINE_STATUSES = new Set(['kept-aside', 'unmapped']);
const VALUE_ACTIONS = new Set(['correct', 'skip', 'duplicate', 'request-item']);
const itemKey = (i: { id: string; modified: number }): string => `${i.id}:${i.modified}`;

/** Items in the order of the document: page, then the box of a dated grid (never from where a tilted page puts it), else the line's top */
function byPlace (x: ConversationItem, y: ConversationItem): number {
  const pos = (item: ConversationItem): number[] => {
    const c = item.content;
    const a = c.anchor ?? c.context?.anchor;
    const grid = c.grid ?? c.context?.grid;
    const page = typeof a?.page === 'number' ? a.page : Number.MAX_SAFE_INTEGER;
    if (grid != null) return [page, grid.row, grid.column, item.created];
    const top = Array.isArray(a?.bbox) && typeof a.bbox[1] === 'number' ? a.bbox[1] : Number.MAX_SAFE_INTEGER;
    return [page, top, 0, item.created];
  };
  const [a, b] = [pos(x), pos(y)];
  return a.map((v, i) => v - b[i]).find((d) => d !== 0) ?? 0;
}

/** Values in the order the document prints them: page, then the line's top; without an anchor, as they came */
export function documentOrder (values: ProposedValueView[]): ProposedValueView[] {
  return [...values].sort((x, y) => byPlace(x.item, y.item));
}

const openQuestion = (q: QuestionView, includeSkipped: boolean): boolean => q.answerable && (q.state === 'open' || (includeSkipped && q.state === 'skipped'));

/**
 * The next step about one document, or null when nothing waits for her (or the contact still works, or the document is
 * not hers). In order: `is-this-yours` (nothing is written before it, R3); the document's `which-date`, or the
 * `which-row-date` of each row of a dated grid; the questions
 * about one value (a `choose` brings a re-proposal while she goes on); the values to `check`; the values read clearly,
 * offered first as one batch (`batchMin`; never a value to check, never one asked about), then one by one; then one
 * summary of what she cannot answer here (kept aside, waiting for the contact, set aside, a question this version
 * cannot answer). Answered, written and replaced values are never a step.
 */
export function nextStep (conv: DocumentConversation, engines: readonly string[], opts: StepOptions = {}): ConversationStep | null {
  if (conv.identity === 'not-mine') return null;
  // on hold (4.33.0), maybe after `done`: a proposed date and kind stays answerable (it does not hold up the work), no more
  const held = opts.status === ON_HOLD;
  if (opts.status !== undefined && !SETTLED.has(opts.status ?? '') && !held) return null;
  if (held && conv.identity === 'open') return null;
  const includeSkipped = opts.includeSkipped === true;
  const blockOpts: RowBlockOptions = opts.status !== undefined ? { status: opts.status } : {};
  const pvOf = (candidateId: unknown): ProposedValueView | null => conv.proposedValues.find((p) => p.candidateId === candidateId) ?? null;
  const question = (q: QuestionView): ConversationStep => ({ kind: 'question', key: itemKey(q.item), question: q, about: pvOf(q.item.content.candidateId) });

  const identity = conv.questions.find((q) => q.code === 'is-this-yours' && openQuestion(q, includeSkipped));
  if (identity != null) return held ? null : question(identity);
  const deferred = new Set(includeSkipped ? [] : opts.deferred ?? []);
  // the document itself (4.26.0): its kind and date asked, then the contact's proposal of both
  const proposed = (conv.proposedDocuments ?? []).find((pd) => !deferred.has(pd.candidateId) &&
    (pd.state === 'open' || (includeSkipped && pd.state === 'skipped')) && cmcConversation.documentProposalRefusal(pd, opts.document, conv) == null);
  const docQuestion = conv.questions.find((q) => DOCUMENT_CODES.has(q.code) && openQuestion(q, includeSkipped) &&
    (proposed == null || q.item.content.candidateId === proposed.candidateId));
  if (docQuestion != null && proposed != null) return { kind: 'question', key: itemKey(docQuestion.item), question: docQuestion, about: null };
  if (proposed != null) {
    const pending = cmcConversation.pendingFieldsOf(opts.document);
    return { kind: 'document', key: itemKey(proposed.item), proposed, pending };
  }
  if (held) return null;
  const documentDate = conv.questions.find((q) => q.code === 'which-date' && q.item.content.candidateId == null && openQuestion(q, includeSkipped));
  if (documentDate != null) return question(documentDate);
  // a dated grid (4.36.0): the day of a box of each row, top to bottom; the contact proposes the row's values after it
  const rowDates = conv.questions.filter((q) => q.code === 'which-row-date' && openQuestion(q, includeSkipped)).sort((x, y) => byPlace(x.item, y.item));
  if (rowDates.length > 0) return question(rowDates[0]);
  const aboutValues = conv.questions.filter((q) => q.item.content.candidateId != null && !DOCUMENT_CODES.has(q.code) && openQuestion(q, includeSkipped));
  if (aboutValues.length > 0) {
    const order = documentOrder(conv.proposedValues).map((p) => p.candidateId);
    aboutValues.sort((a, b) => order.indexOf(a.item.content.candidateId) - order.indexOf(b.item.content.candidateId));
    return question(aboutValues[0]);
  }

  const values = documentOrder(conv.proposedValues.filter((pv) => pv.state !== 'replaced' && !isWritten(conv, pv)));
  const askable = (pv: ProposedValueView): boolean => !deferred.has(pv.candidateId) &&
    (pv.state === 'open' || (includeSkipped && pv.state === 'skipped')) && rowBlock(conv, pv, engines, blockOpts) == null;
  const check = values.find((pv) => pv.item.content.status === 'check' && askable(pv));
  if (check != null) return { kind: 'value', key: itemKey(check.item), value: check };

  const clear = values.filter((pv) => pv.item.content.status === 'clear' && askable(pv));
  if (opts.batchDeclined !== true && clear.length >= (opts.batchMin ?? 3)) {
    const batch = documentOrder(batchCandidates(conv, engines, blockOpts).filter((pv) => clear.includes(pv)));
    if (batch.length >= (opts.batchMin ?? 3)) {
      return { kind: 'batch', key: 'batch:' + batch.map((pv) => itemKey(pv.item)).join(','), values: batch };
    }
  }
  if (clear.length > 0) return { kind: 'value', key: itemKey(clear[0].item), value: clear[0] };

  if (opts.summaryAcknowledged === true) return null;
  const keptAside = values.filter((pv) => pv.state === 'open' && LINE_STATUSES.has(pv.item.content.status));
  const waiting: Array<{ value: ProposedValueView; block: RowBlock }> = [];
  for (const pv of values) {
    if (pv.state !== 'open' || LINE_STATUSES.has(pv.item.content.status)) continue;
    const block = rowBlock(conv, pv, engines, blockOpts);
    if (block != null) waiting.push({ value: pv, block });
  }
  const skipped = includeSkipped
    ? []
    : values.filter((pv) => (pv.state === 'skipped' || (pv.state === 'open' && deferred.has(pv.candidateId))) && rowBlock(conv, pv, engines, blockOpts) == null);
  const unanswerable = conv.questions.filter((q) => !q.answerable && q.state === 'open');
  const inRecord = documentOrder(alreadyInRecord(conv));
  if (keptAside.length + waiting.length + skipped.length + unanswerable.length + inRecord.length === 0) return null;
  const ids = [...keptAside, ...waiting.map((w) => w.value), ...skipped, ...inRecord].map((pv) => itemKey(pv.item)).concat(unanswerable.map((q) => itemKey(q.item)));
  return { kind: 'summary', key: 'summary:' + ids.join(','), keptAside, waiting, skipped, unanswerable, alreadyInRecord: inRecord };
}

/** Where one document's conversation stands, for "28 values · 1 question · 9 answered" (derived, never from `counts`) */
export interface ConversationProgress {
  values: number;
  questions: number;
  answered: number;
  /** values waiting for the contact (a re-proposal after her choice) */
  waitingOnContact: number;
  keptAside: number;
  /** values her record already holds (not counted in `answered`) */
  alreadyInRecord: number;
}

/** "28 values · 1 question · 9 answered", each part left out when zero */
export function progressText (p: ConversationProgress): string {
  const parts: string[] = [];
  if (p.values > 0) parts.push(p.values === 1 ? tx('progress.valuesOne') : tx('progress.values', { n: p.values }));
  if (p.questions > 0) parts.push(p.questions === 1 ? tx('progress.questionsOne') : tx('progress.questions', { n: p.questions }));
  if (p.answered > 0) parts.push(tx('progress.answered', { n: p.answered }));
  if (p.alreadyInRecord > 0) parts.push(p.alreadyInRecord === 1 ? tx('progress.inRecordOne') : tx('progress.inRecord', { n: p.alreadyInRecord }));
  return parts.join(' · ');
}

/**
 * Counted over the document's candidates, also those the contact deleted once its work was done (R10): her answers on
 * her `sent` child still name them, so "28 values" stays 28 after the clean-up.
 */
export function conversationProgress (conv: DocumentConversation, engines: readonly string[], opts: RowBlockOptions = {}): ConversationProgress {
  const present = new Map(conv.proposedValues.filter((pv) => pv.state !== 'replaced').map((pv) => [pv.candidateId, pv]));
  const answeredBy = new Map<string, string>();
  const duplicates = new Set<string>();
  const documentCandidates = new Set((conv.proposedDocuments ?? []).map((pd) => pd.candidateId));
  for (const a of conv.answers) {
    const ids: unknown = a.content.candidateIds;
    if (!Array.isArray(ids)) continue;
    // only her answers on the values themselves; an answer to a question about one (`choose`, a date) settles no value,
    // nor one about the document itself (a proposed document: `applied`, `basis: not-pending`, or its candidate)
    if (Array.isArray(a.content.applied) || a.content.basis === 'not-pending') continue;
    if ((ids as unknown[]).some((id) => documentCandidates.has(id as string))) continue;
    const onValues = VALUE_ACTIONS.has(String(a.content.action)) || (a.content.action === 'confirm' && Array.isArray(a.content.written));
    if (!onValues) continue;
    for (const id of ids) {
      if (typeof id !== 'string') continue;
      answeredBy.set(id, String(a.content.action));
      if (a.content.action === 'duplicate') duplicates.add(id);
    }
  }
  const written = new Set(Object.keys(conv.writtenCandidates ?? {}));
  for (const pv of present.values()) {
    if (pv.state === 'duplicate') duplicates.add(pv.candidateId);
    if (isWritten(conv, pv)) written.add(pv.candidateId);
  }
  for (const id of written) duplicates.delete(id);
  // a value re-proposed under a new candidate counts once: its replaced candidate (named by her answer about it) not
  const replaced = new Set(conv.proposedValues.filter((pv) => pv.state === 'replaced' && !present.has(pv.candidateId)).map((pv) => pv.candidateId));
  const candidates = new Set([...present.keys(), ...answeredBy.keys(), ...written].filter((id) => !replaced.has(id)));
  let answered = 0;
  let waitingOnContact = 0;
  let keptAside = 0;
  for (const id of candidates) {
    if (duplicates.has(id)) continue;
    if (written.has(id)) { answered += 1; continue; }
    const pv = present.get(id);
    if (pv == null) { if (answeredBy.has(id) && answeredBy.get(id) !== 'skip') answered += 1; continue; }
    if (pv.state !== 'open' && pv.state !== 'skipped') answered += 1;
    else if (LINE_STATUSES.has(pv.item.content.status)) keptAside += 1;
    else if (rowBlock(conv, pv, engines, opts) === 'awaiting-reproposal') waitingOnContact += 1;
  }
  // the document's own questions (its kind, its date) are not about its values: as the contact's `counts`, left out
  const questions = conv.questions.filter((q) => !DOCUMENT_CODES.has(q.code));
  answered += questions.filter((q) => q.state === 'answered').length;
  return { values: candidates.size, questions: questions.length, answered, waitingOnContact, keptAside, alreadyInRecord: duplicates.size };
}
