import { useState } from 'react';
import type { StepFiling } from './conversationRun';

/** Her tick, and what she was told when she set it */
export type StepFilingTick = { told: string; checked: boolean } | null;

/**
 * What she chose about filing, for what she is told now: her tick stands for exactly that (a place or a reader that
 * changes asks again). Unticked to start with as soon as someone newly sees the document or no longer does, or when not
 * all who see her documents are known: a disclosure is hers to tick. `shared`: one tick for the step and its editor, so
 * a tick she took off on the step stays off in "Change".
 */
export function useStepFiling (
  stepKey: string,
  filing: StepFiling | null,
  shared?: [StepFilingTick, (tick: StepFilingTick) => void]
): { checked: boolean; setChecked: (checked: boolean) => void; chosen: StepFiling | undefined } {
  const own = useState<StepFilingTick>(null);
  const [choice, setChoice] = shared ?? own;
  const told = filing != null ? JSON.stringify([stepKey, filing.place, filing.gains, filing.loses, filing.complete, filing.key ?? null]) : '';
  const sameReaders = filing != null && filing.complete && filing.gains.length === 0 && filing.loses.length === 0;
  const checked = filing != null && (choice?.told === told ? choice.checked : sameReaders);
  return { checked, setChecked: (v) => setChoice({ told, checked: v }), chosen: checked && filing != null ? filing : undefined };
}
