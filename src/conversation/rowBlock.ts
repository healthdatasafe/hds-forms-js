import { cmcConversation } from 'hds-lib';
import type { DocumentConversation, ProposalRefusal, ProposedValueView } from 'hds-lib';

/** Why a proposed value cannot be confirmed now: hds-lib's R9 refusals, plus what this conversation still waits for */
export type RowBlock = ProposalRefusal | 'not-mine' | 'still-reading' | 'identity-open' | 'question-open' | 'awaiting-reproposal' | 'no-date';

/** The states of the work in which the contact asked all it will ask (R4: the latest `task-status`) */
const SETTLED = new Set(['awaiting-answers', 'done']);

export interface RowBlockOptions {
  /**
   * The latest `task-status` of the document (`hds.status`; null before the first). When given, nothing is
   * confirmable before the contact says it waits for her answers: it writes its proposed values before its questions
   * (CONVERSATION.md § The flow), so an `is-this-yours` may still come. An unknown status is read as in progress (R8).
   */
  status?: string | null;
}

/**
 * Whether she may confirm (or correct) a proposed value now; null when she may. In order: the document is not hers;
 * the value itself is not confirmable (hds-lib `proposalRefusal`: answered, replaced, its status, its proposal, the
 * engine not vouched for this relationship); the document's `is-this-yours` waits for her; a question about this value
 * waits for her, or she answered a `choose` and the contact has not re-proposed it yet (an answer to a question writes
 * nothing: the re-proposal is what she confirms); no date (no `proposal.time` and no `which-date` answer).
 */
export function rowBlock (conv: DocumentConversation, pv: ProposedValueView, engines: readonly string[], opts: RowBlockOptions = {}): RowBlock | null {
  if (conv.identity === 'not-mine') return 'not-mine';
  // written already (an answer's `written`), also while the contact deletes what was answered (R10)
  if (isWritten(conv, pv)) return 'answered';
  const refusal = cmcConversation.proposalRefusal(pv, engines);
  if (refusal != null) return refusal;
  if (opts.status !== undefined && !SETTLED.has(opts.status ?? '')) return 'still-reading';
  if (conv.identity === 'open') return 'identity-open';
  const about = conv.questions.filter((q) => q.item.content.candidateId === pv.candidateId);
  if (about.some((q) => q.state === 'open')) return 'question-open';
  if (about.some((q) => q.answer?.content.action === 'choose')) return 'awaiting-reproposal';
  const date = conv.candidateDates[pv.candidateId] ?? conv.documentDate;
  if (pv.item.content.proposal?.time == null && date == null) return 'no-date';
  return null;
}

/**
 * Whether her app wrote this value: its state says so, or an answer's `written` names its candidate. The second holds
 * while the contact deletes what was answered (R10): once the event an answer replied to is gone, hds-lib no longer
 * counts that answer for the other values it covered, which would otherwise read as open again.
 */
export function isWritten (conv: DocumentConversation, pv: ProposedValueView): boolean {
  return pv.state === 'confirmed' || pv.state === 'corrected' || Object.prototype.hasOwnProperty.call(conv.writtenCandidates ?? {}, pv.candidateId);
}

/** The candidates "Confirm all" covers: confirmable now, read clearly (`clear`, not `check`), no question about them */
export function batchCandidates (conv: DocumentConversation, engines: readonly string[], opts: RowBlockOptions = {}): ProposedValueView[] {
  return conv.proposedValues.filter((pv) => pv.item.content.status === 'clear' && rowBlock(conv, pv, engines, opts) == null);
}

/**
 * The `shownAt` of a document's card: the latest `modified` of the items it shows, on the server's clock (no skew
 * with the device). An item changed after it is newer than what she saw, and hds-lib refuses the answer (R3).
 */
export function shownAtOf (conv: DocumentConversation): number {
  let max = 0;
  for (const i of conv.received) if (i.modified > max) max = i.modified;
  return max;
}
