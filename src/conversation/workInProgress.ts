import type { ConversationAlert } from 'hds-lib';

/** The `task-status` statuses in which the contact is working on a document and nothing waits for her (CONVERSATION.md) */
export const WORKING_STATUSES: readonly string[] = ['received', 'reading'];
/** The contact has the document and cannot work on it now, for a reason of its own (4.33.0): in progress, not settled */
export const ON_HOLD = 'on-hold';
/** The statuses in which the contact's work stopped or waits for her: no indicator */
const SETTLED_STATUSES = new Set(['awaiting-answers', 'done', 'error']);

/**
 * How long a "working" status keeps the indicator on for `isWorking`, in seconds.
 * @deprecated with `isWorking`: `workState` says when there is no news, instead of hiding the indicator
 */
export const WORKING_MAX_AGE_S = 30 * 60;

/**
 * Whether the contact is working on a document now: its latest `task-status` (hds-lib `taskStatusOf`, R4) is
 * `received` or `reading`, or a status this version does not know (R8: read as in progress), and was posted less than
 * `maxAgeS` ago. `awaiting-answers`, `done` and `error` stop it, as does a newer status.
 * `on-hold` is not work.
 * @deprecated use `workState`
 */
export function isWorking (status: Pick<ConversationAlert, 'hds' | 'time'> | null | undefined, nowS: number, maxAgeS: number = WORKING_MAX_AGE_S): boolean {
  if (status == null || !isInProgress(status.hds?.status) || status.hds?.status === ON_HOLD) return false;
  return nowS - (status.time ?? 0) < maxAgeS;
}

/**
 * Where the contact's work on a document stands, as far as her app knows: nothing in progress; in progress; the contact has
 * it and reported no start; the contact said it cannot work on it now; in progress with no news since. Her app knows the last status and its age alone, never
 * whether the contact runs: it must not say it stopped.
 */
export type WorkState = 'idle' | 'working' | 'not-started' | 'on-hold' | 'no-news';

/** How long one status reads as it says, then what is said: seconds since it, in order */
interface WorkTimes { working: number; waiting?: { state: 'not-started' | 'on-hold'; until: number } }
const MIN = 60;
const HOUR = 3600;
/** `sent` (her share, no status yet): a contact without a webhook takes it within a minute or two */
const SENT: WorkTimes = { working: 5 * MIN };
/** A contact that waits on purpose says so again every 12 h: past 13 h that is no news either */
const RECEIVED: WorkTimes = { working: 5 * MIN, waiting: { state: 'not-started', until: 13 * HOUR } };
/** The contact cannot work on it now (data-model 4.33.0): said at once, and again at least once per 24 h while it lasts */
const HOLD: WorkTimes = { working: 0, waiting: { state: 'on-hold', until: 25 * HOUR } };
/** A long scan takes up to about 9 minutes; also a status this version does not know (R8) */
const READING: WorkTimes = { working: 10 * MIN };
/** Own keys alone: a status is a word from the contact */
const TIMES: Record<string, WorkTimes> = { sent: SENT, received: RECEIVED, [ON_HOLD]: HOLD };
const timesOf = (status: string | null | undefined): WorkTimes => (Object.hasOwn(TIMES, status ?? 'sent') ? TIMES[status ?? 'sent'] : READING);

/**
 * How long the indicator at the end of the conversation stays without news (seconds): after a day the document's own line
 * keeps saying it, and the conversation no longer ends on it (a contact may be a person who reads it next week).
 */
export const NO_NEWS_INDICATOR_MAX_S = 24 * HOUR;

/** Whether a `task-status` status is in progress: `received`, `reading`, `on-hold`, or one this version does not know (R8) */
export function isInProgress (status: unknown): boolean {
  return typeof status === 'string' && !SETTLED_STATUSES.has(status);
}

/** The state of work in progress from its status (`sent` or none: her share, no status yet) and its age */
export function progressState (status: string | null | undefined, sinceS: number, nowS: number): Exclude<WorkState, 'idle'> {
  const age = nowS - sinceS;
  const times = timesOf(status);
  if (age < times.working) return 'working';
  return times.waiting != null && age < times.waiting.until ? times.waiting.state : 'no-news';
}

/**
 * The state of the contact's work on a document, from its latest `task-status` (hds-lib `taskStatusOf`, R4). Without any,
 * `idle`: a document she shared that got no status yet is the host's to show (`progressState('sent', …)` from her share).
 */
export function workState (status: Pick<ConversationAlert, 'hds' | 'time'> | null | undefined, nowS: number): WorkState {
  if (status == null || !isInProgress(status.hds?.status)) return 'idle';
  return progressState(String(status.hds.status), status.time ?? 0, nowS);
}
