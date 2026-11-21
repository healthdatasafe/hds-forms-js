import { useCallback, useRef, useState } from 'react';
import type { cmcConversation, ValueCorrection } from 'hds-lib';
import { tx } from './labels';
import type { ConversationTextKey } from './conversationTexts';
import type { QuestionAnswer } from './QuestionCard';
import type { RowBlock } from './rowBlock';

/** What she confirms or corrects for a proposed document (hds-lib `DocumentFields`, not exported at the top level) */
export type DocumentFields = cmcConversation.DocumentFields;

/** What an action came to: done (some candidates may have been refused, each with hds-lib's reason) or failed */
export type ConversationOutcome = { ok: true; refused?: Array<{ candidateId: string; reason: string }> } | { ok: false; reason: string };

/**
 * What the host does when she answers (hds-lib `cmcConversation`): each call gets the `shownAt` of what she saw (R3:
 * an answer binds to what was shown) and resolves once the host read the conversation again.
 */
export interface ConversationActions {
  /** `note`: her comment typed in the chat line, carried by this answer (`answer.note`, 4.26.0) */
  confirm (candidateIds: string[], shownAt: number, note?: string): Promise<ConversationOutcome>;
  correct (candidateId: string, correction: ValueCorrection, shownAt: number, note?: string): Promise<ConversationOutcome>;
  dismiss (candidateIds: string[], action: 'skip' | 'request-item' | 'duplicate', shownAt: number, note?: string): Promise<ConversationOutcome>;
  answer (questionId: string, answer: QuestionAnswer, shownAt: number, note?: string): Promise<ConversationOutcome>;
  /**
   * A proposed document's date and kind (hds-lib `acceptProposedDocument`): no `correction` confirms the proposal, a
   * correction (only what she changed) corrects it
   */
  confirmDocument? (candidateId: string, correction: DocumentFields | undefined, shownAt: number, note?: string): Promise<ConversationOutcome>;
}

/**
 * One action at a time and what it came to: `busy` while it runs, `message` when it failed or was refused because what
 * she saw changed meanwhile (R3), `after` when it went through.
 */
export function useConversationRun () {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const running = useRef(false);
  const run = useCallback(async (key: string, fn: () => Promise<ConversationOutcome>, after?: () => void): Promise<void> => {
    if (running.current) return;
    running.current = true;
    setBusy(key);
    setMessage(null);
    try {
      const out = await fn();
      const refused = 'refused' in out ? out.refused ?? [] : [];
      if ('reason' in out) setMessage(out.reason === 'changed-since-shown' ? tx('updated') : tx('failed'));
      else if (refused.length > 0) setMessage(refused.some((r) => r.reason === 'changed-since-shown') ? tx('updated') : tx('failed'));
      else after?.();
    } catch {
      setMessage(tx('failed'));
    } finally {
      running.current = false;
      setBusy(null);
    }
  }, []);
  return { busy, message, setMessage, run };
}

export const STATE_TEXT: Record<string, ConversationTextKey> = {
  confirmed: 'state.confirmed',
  corrected: 'state.corrected',
  skipped: 'state.skipped',
  requested: 'state.requested',
  duplicate: 'state.duplicate',
  replaced: 'state.replaced'
};

const BLOCK_KEYS = new Set([
  'block.identity-open', 'block.still-reading', 'block.unit-missing', 'block.not-mine', 'block.no-date',
  'block.question-open', 'block.awaiting-reproposal', 'block.engine-not-vouched', 'block.status'
]);

/** Why a value cannot be confirmed now, in words ('' for answered / replaced: their state says it) */
export function blockText (block: RowBlock, contactName: string): string {
  if (block === 'answered' || block === 'replaced') return '';
  const key = `block.${block}`;
  return tx((BLOCK_KEYS.has(key) ? key : 'block.unknown') as ConversationTextKey, { name: contactName });
}
