// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useStepChoices, STEP_CHOICES_KEY, type StepChoiceHandlers, type StepChoices, type StepChoicesStore } from '../src/conversation/useStepChoices';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function memoryStore (initial: Record<string, string> = {}): StepChoicesStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

let root: Root | null = null;
afterEach(() => { act(() => root?.unmount()); root = null; });

/** Renders the hook and hands back its latest value */
async function mount (store?: StepChoicesStore | null): Promise<() => { choices: StepChoices; handlers: (k: string) => StepChoiceHandlers }> {
  let latest: any;
  function Probe () { latest = useStepChoices(store); return null; }
  root = createRoot(document.createElement('div'));
  await act(async () => { root!.render(<Probe />); });
  return () => latest;
}

describe('useStepChoices', () => {
  it('keeps her choices per document, and the four handlers say what ConversationStepBubble needs', async () => {
    const store = memoryStore();
    const hook = await mount(store);
    await act(async () => { hook().handlers('d1').onLater('c1'); });
    await act(async () => { hook().handlers('d1').onLater('c2'); });
    await act(async () => { hook().handlers('d1').onDeclineBatch(); });
    expect(hook().choices.d1).toEqual({ deferred: ['c1', 'c2'], batchDeclined: true });
    await act(async () => { hook().handlers('d1').onAcknowledgeSummary(); });
    expect(hook().choices.d1).toMatchObject({ summaryAcknowledged: true, includeSkipped: false });
    await act(async () => { hook().handlers('d1').onReviewSkipped(); });
    expect(hook().choices.d1).toMatchObject({ deferred: [], includeSkipped: true, summaryAcknowledged: false });
    expect(hook().choices.d2).toBeUndefined();
    expect(JSON.parse(store.data[STEP_CHOICES_KEY]).d1.includeSkipped).toBe(true);
  });

  it('reads what was kept, and a broken or missing store only loses the convenience', async () => {
    const kept = await mount(memoryStore({ [STEP_CHOICES_KEY]: JSON.stringify({ d1: { batchDeclined: true } }) }));
    expect(kept().choices).toEqual({ d1: { batchDeclined: true } });
    act(() => root?.unmount());
    const broken = await mount(memoryStore({ [STEP_CHOICES_KEY]: '{not json' }));
    expect(broken().choices).toEqual({});
    act(() => root?.unmount());
    const none = await mount(null);
    await act(async () => { none().handlers('d1').onDeclineBatch(); });
    expect(none().choices.d1).toEqual({ batchDeclined: true });
  });
});
