import type { ConversationAlert } from 'hds-lib';

/** The `task-status` statuses in which the contact is working on a document and nothing waits for her (CONVERSATION.md) */
export const WORKING_STATUSES: readonly string[] = ['received', 'reading'];
/** The statuses in which the contact's work stopped or waits for her: no indicator */
const SETTLED_STATUSES = new Set(['awaiting-answers', 'done', 'error']);

/**
 * How long a "working" status keeps the indicator on, in seconds: a contact that stopped without a last status (a crash)
 * must not show as working for ever. The document's card still says where the work stands.
 */
export const WORKING_MAX_AGE_S = 30 * 60;

/**
 * Whether the contact is working on a document now: its latest `task-status` (hds-lib `taskStatusOf`, R4) is
 * `received` or `reading`, or a status this version does not know (R8: read as in progress), and was posted less than
 * `maxAgeS` ago. `awaiting-answers`, `done` and `error` stop it, as does a newer status.
 */
export function isWorking (status: Pick<ConversationAlert, 'hds' | 'time'> | null | undefined, nowS: number, maxAgeS: number = WORKING_MAX_AGE_S): boolean {
  if (status == null) return false;
  const s = status.hds?.status;
  if (typeof s !== 'string' || SETTLED_STATUSES.has(s)) return false;
  return nowS - (status.time ?? 0) < maxAgeS;
}
