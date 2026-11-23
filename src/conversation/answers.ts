import type { ConversationItem, DocumentConversation } from 'hds-lib';
import { dayText, optionLabel, tx } from './labels';
import type { ConversationTextKey } from './conversationTexts';

/** Whose app shows the conversation: the person's (her answers are "You …") or a contact's ("{name} …") */
export type ConversationViewer = 'person' | 'contact';

/** Who reads her answers: the viewer and, for a contact, her name (else "The person") */
export interface AnswerReader {
  viewer?: ConversationViewer;
  personName?: string | null;
}

type AnswerKey = Extract<ConversationTextKey, `answer.${string}`>;

/** Her name for a contact's texts */
export function personNameOf (reader?: AnswerReader | null): string {
  const name = reader?.personName;
  return typeof name === 'string' && name.trim() !== '' ? name : tx('contact.person');
}

/** An answer text in the reader's words: `answer.x` for her, `contact.answer.x` with her name for a contact */
function at (key: AnswerKey, vars: Record<string, string | number> = {}, reader?: AnswerReader | null): string {
  if (reader?.viewer !== 'contact') return tx(key, vars);
  return tx(`contact.${key}` as ConversationTextKey, { ...vars, name: personNameOf(reader) });
}

/** What one of her answers says, from what it answers (the document's conversation); a contact reads it in the third person */
export function answerText (answer: ConversationItem, conv: DocumentConversation | null, locale?: string, reader?: AnswerReader | null): string {
  const c = answer.content;
  const question = conv?.questions.find((q) => q.item.id === c.inReplyTo) ?? null;
  if (c.action === 'choose') return at('answer.choose', { option: question != null ? optionLabel(question.code, c.option).label : String(c.option ?? '') }, reader);
  // a proposed document (4.26.0): `applied` names the fields her app wrote on the document
  if ((c.action === 'confirm' || c.action === 'correct') && Array.isArray(c.applied)) {
    if (c.action === 'correct') return at('answer.documentCorrected', {}, reader);
    if (c.applied.length === 1) return at(c.applied[0] === 'kind' ? 'answer.documentConfirmedKind' : 'answer.documentConfirmedDate', {}, reader);
    return at('answer.documentConfirmed', {}, reader);
  }
  if (c.action === 'confirm' && question != null) return questionAnswerText(question.code, c, locale, reader);
  // what it answered may be gone (R10 deletes answered questions): its own fields still say which question it was
  if (c.action === 'confirm' && typeof c.timePrecision === 'string') return questionAnswerText(Array.isArray(c.candidateIds) && conv?.proposedDocuments?.some((p) => c.candidateIds.includes(p.candidateId)) ? 'which-document-date' : 'which-date', c, locale, reader);
  if (c.action === 'confirm' && !Array.isArray(c.written) && !Array.isArray(c.candidateIds)) return questionAnswerText('is-this-yours', c, locale, reader);
  if (c.action === 'confirm') {
    const n = Array.isArray(c.candidateIds) ? c.candidateIds.length : 1;
    return n === 1 ? at('answer.confirmOne', {}, reader) : at('answer.confirm', { n }, reader);
  }
  // her app's own answer (R3, `basis: existing-value`), not hers: it says what her app found
  if (c.action === 'duplicate' && c.basis === 'existing-value') {
    const n = Array.isArray(c.candidateIds) ? c.candidateIds.length : 1;
    return n === 1 ? at('answer.duplicateAutoOne', {}, reader) : at('answer.duplicateAuto', { n }, reader);
  }
  const key = `answer.${String(c.action)}`;
  return ['answer.correct', 'answer.skip', 'answer.duplicate', 'answer.request-item', 'answer.not-mine'].includes(key) ? at(key as AnswerKey, {}, reader) : at('answer.unknown', {}, reader);
}

/** Her answer to a question (`is-this-yours`, `which-date`) in words */
export function questionAnswerText (code: string, a: Record<string, any>, locale?: string, reader?: AnswerReader | null): string {
  if (a.action === 'not-mine') return at('answer.not-mine', {}, reader);
  if (code === 'is-this-yours') return a.basis === 'profile-match' ? at('answer.mineAuto', {}, reader) : at('answer.mine', {}, reader);
  if (code === 'which-date' || code === 'which-document-date') {
    const ofDocument = code === 'which-document-date';
    if (a.timePrecision === 'unknown' || typeof a.time !== 'number') return at(ofDocument ? 'answer.documentDateUnknown' : 'answer.dateUnknown', {}, reader);
    return `${at(ofDocument ? 'answer.documentDate' : 'answer.confirmDate', {}, reader)}: ${dayText(new Date(a.time * 1000).toISOString().slice(0, 10), locale)}`;
  }
  return at('answer.unknown', {}, reader);
}

/** A confirmation of proposed values (it wrote them), not an answer to a question */
const isValueConfirm = (a: ConversationItem): boolean => a.content.action === 'confirm' && Array.isArray(a.content.written);

/**
 * Her answers in order, a run of `minRun` or more value confirmations in a row folded into one group (one bubble:
 * "You confirmed 12 values"); every other answer alone. One by one, each confirmation is its own answer.
 */
export function answerRuns (answers: ConversationItem[], minRun: number = 3): ConversationItem[][] {
  // her app settling a proposed document with nothing left to apply (`basis: not-pending`) is no answer of hers to show
  const sorted = answers.filter((a) => a.content.basis !== 'not-pending').sort((a, b) => a.created - b.created);
  const out: ConversationItem[][] = [];
  let run: ConversationItem[] = [];
  const flush = (): void => {
    if (run.length >= minRun) out.push(run);
    else for (const a of run) out.push([a]);
    run = [];
  };
  for (const a of sorted) {
    // an answer with her note stays its own bubble, the note under it
    if (isValueConfirm(a) && typeof a.content.note !== 'string') { run.push(a); continue; }
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
