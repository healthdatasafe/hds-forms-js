import { useCallback, useMemo, useState } from 'react';
import type { StepOptions } from './nextStep';

/** Her choices about the flow of each document's conversation, by the host's document key */
export type StepChoices = Record<string, Partial<StepOptions>>;

/** Where the choices are kept: `sessionStorage` by default (a convenience: losing them only re-offers a step) */
export interface StepChoicesStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

/** The key the choices are kept under */
export const STEP_CHOICES_KEY = 'hds.conversation.steps';

/** The browser's session storage, or null where it is missing or refused (private mode, a test runner) */
function sessionStore (): StepChoicesStore | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

function read (store: StepChoicesStore | null, key: string): StepChoices {
  if (store == null) return {};
  try {
    const parsed = JSON.parse(store.getItem(key) ?? '{}');
    return parsed != null && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write (store: StepChoicesStore | null, key: string, choices: StepChoices): void {
  if (store == null) return;
  try { store.setItem(key, JSON.stringify(choices)); } catch { /* full or refused: kept in memory only */ }
}

/** The four callbacks `ConversationStepBubble` takes for her choices on one document */
export interface StepChoiceHandlers {
  onDeclineBatch: () => void;
  onLater: (candidateId: string) => void;
  onAcknowledgeSummary: () => void;
  onReviewSkipped: () => void;
}

/**
 * Her choices about the flow of each document's conversation ("One by one" on the batch, "Later" on a value, the
 * summary closed, "Review the ones set aside"), kept for the session. None of them writes anything to the account:
 * "Later" in particular is local (a `skip` would let the contact delete the value at `done`, R10). Pass
 * `choices[docKey]` to `nextStep` and `handlers(docKey)` to `ConversationStepBubble`. `store: null` keeps them in
 * memory only.
 */
export function useStepChoices (store?: StepChoicesStore | null, key: string = STEP_CHOICES_KEY): {
  choices: StepChoices;
  choose: (docKey: string, choice: Partial<StepOptions>) => void;
  handlers: (docKey: string) => StepChoiceHandlers;
} {
  const kept = useMemo(() => (store === undefined ? sessionStore() : store), [store]);
  const [choices, setChoices] = useState<StepChoices>(() => read(kept, key));
  const choose = useCallback((docKey: string, choice: Partial<StepOptions>) => {
    setChoices((prev) => {
      const next = { ...prev, [docKey]: { ...prev[docKey], ...choice } };
      write(kept, key, next);
      return next;
    });
  }, [kept, key]);
  const handlers = useCallback((docKey: string): StepChoiceHandlers => ({
    onDeclineBatch: () => choose(docKey, { batchDeclined: true }),
    onLater: (candidateId) => choose(docKey, { deferred: [...(choices[docKey]?.deferred ?? []), candidateId] }),
    onAcknowledgeSummary: () => choose(docKey, { summaryAcknowledged: true, includeSkipped: false }),
    onReviewSkipped: () => choose(docKey, { deferred: [], includeSkipped: true, summaryAcknowledged: false })
  }), [choices, choose]);
  return { choices, choose, handlers };
}
