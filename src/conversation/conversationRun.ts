import { useCallback, useRef, useState } from 'react';
import type { cmcConversation, ValueCorrection } from 'hds-lib';
import { tx } from './labels';
import type { ConversationTextKey } from './conversationTexts';
import type { QuestionAnswer } from './QuestionCard';
import type { RowBlock } from './rowBlock';

/** What she confirms or corrects for a proposed document (hds-lib `DocumentFields`, not exported at the top level) */
export type DocumentFields = cmcConversation.DocumentFields;

/**
 * What filing a document as she confirms its kind does (data-model DOCUMENTS.md "Filing", 4.35.0), as the host knows it
 * from the grants it read: shown on the step, and given back with her confirm when she ticked it.
 */
export interface StepFiling {
  /** The stream of the kind the document goes to (hds-lib `documentKinds.streamFor`) */
  place: string;
  /** Its name, as she reads it */
  label: string;
  /** Who newly sees the document there */
  gains: string[];
  /** Who no longer does */
  loses: string[];
  /** false: not all who see her documents are known, `gains` and `loses` may miss some */
  complete: boolean;
  /**
   * The host's own identity of who gains and who loses (two readers may share a name): never shown, part of what her
   * tick stands for, and what the host compares before it writes
   */
  key?: string;
}

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
   * correction (only what she changed) corrects it. `filing` (only when she ticked it): what she was told, the document is
   * also filed there (hds-lib `file`). A host that offers it reads the document and the grants again first, and answers
   * `{ ok: false, reason: 'changed-since-shown' }` with nothing written when it would tell her something else now.
   */
  confirmDocument? (candidateId: string, correction: DocumentFields | undefined, shownAt: number, note?: string, filing?: StepFiling): Promise<ConversationOutcome>;
  /** A proposed document set aside (hds-lib `skipProposedDocument`): her note sent alone on it */
  skipDocument? (candidateId: string, shownAt: number, note?: string): Promise<ConversationOutcome>;
}

/** A refusal because of what happened since she saw it: changed by the contact, or already answered */
const MEANWHILE = new Set(['changed-since-shown', 'answered']);

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
      else if (refused.length > 0) setMessage(refused.some((r) => MEANWHILE.has(r.reason)) ? tx('updated') : tx('failed'));
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
