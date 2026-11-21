import type { ConversationItem, DocumentConversation } from 'hds-lib';
import { dayText, optionLabel, tx } from './labels';

/** What one of her answers says, from what it answers (the document's conversation) */
export function answerText (answer: ConversationItem, conv: DocumentConversation | null, locale?: string): string {
  const c = answer.content;
  const question = conv?.questions.find((q) => q.item.id === c.inReplyTo) ?? null;
  if (c.action === 'choose') return tx('answer.choose', { option: question != null ? optionLabel(question.code, c.option).label : String(c.option ?? '') });
  if (c.action === 'confirm' && question != null) return questionAnswerText(question.code, c, locale);
  // what it answered may be gone (R10 deletes answered questions): its own fields still say which question it was
  if (c.action === 'confirm' && typeof c.timePrecision === 'string') return questionAnswerText('which-date', c, locale);
  if (c.action === 'confirm' && !Array.isArray(c.written) && !Array.isArray(c.candidateIds)) return questionAnswerText('is-this-yours', c, locale);
  if (c.action === 'confirm') {
    const n = Array.isArray(c.candidateIds) ? c.candidateIds.length : 1;
    return n === 1 ? tx('answer.confirmOne') : tx('answer.confirm', { n });
  }
  // her app's own answer (R3, `basis: existing-value`), not hers: it says what her app found
  if (c.action === 'duplicate' && c.basis === 'existing-value') {
    const n = Array.isArray(c.candidateIds) ? c.candidateIds.length : 1;
    return n === 1 ? tx('answer.duplicateAutoOne') : tx('answer.duplicateAuto', { n });
  }
  const key = `answer.${String(c.action)}`;
  return ['answer.correct', 'answer.skip', 'answer.duplicate', 'answer.request-item', 'answer.not-mine'].includes(key) ? tx(key as 'answer.skip') : tx('answer.unknown');
}

/** Her answer to a question (`is-this-yours`, `which-date`) in words */
export function questionAnswerText (code: string, a: Record<string, any>, locale?: string): string {
  if (a.action === 'not-mine') return tx('answer.not-mine');
  if (code === 'is-this-yours') return a.basis === 'profile-match' ? tx('answer.mineAuto') : tx('answer.mine');
  if (code === 'which-date') {
    if (a.timePrecision === 'unknown' || typeof a.time !== 'number') return tx('answer.dateUnknown');
    return `${tx('answer.confirmDate')}: ${dayText(new Date(a.time * 1000).toISOString().slice(0, 10), locale)}`;
  }
  return tx('answer.unknown');
}

/** A confirmation of proposed values (it wrote them), not an answer to a question */
const isValueConfirm = (a: ConversationItem): boolean => a.content.action === 'confirm' && Array.isArray(a.content.written);

/**
 * Her answers in order, a run of `minRun` or more value confirmations in a row folded into one group (one bubble:
 * "You confirmed 12 values"); every other answer alone. One by one, each confirmation is its own answer.
 */
export function answerRuns (answers: ConversationItem[], minRun: number = 3): ConversationItem[][] {
  const sorted = [...answers].sort((a, b) => a.created - b.created);
  const out: ConversationItem[][] = [];
  let run: ConversationItem[] = [];
  const flush = (): void => {
    if (run.length >= minRun) out.push(run);
    else for (const a of run) out.push([a]);
    run = [];
  };
  for (const a of sorted) {
    if (isValueConfirm(a)) { run.push(a); continue; }
    flush();
    out.push([a]);
  }
  flush();
  return out;
}

/** The clientData a correction carries: the proposal's, without the flag and interpretation, and its range only in the same unit */
export function correctedClientData (proposal: { type: string; clientData?: Record<string, unknown> }, type: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(proposal.clientData ?? {}) };
  delete out.hdsFlag;
  delete out.hdsInterpretation;
  if (type !== proposal.type) delete out.hdsRefRange;
  return out;
}
