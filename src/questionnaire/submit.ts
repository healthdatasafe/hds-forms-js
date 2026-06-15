/**
 * Plan 71 Phase C — questionnaire submit.
 *
 * Build the Pryv `events.batch` payload that lands together when a patient
 * submits a questionnaire: any newly-created typed events (e.g. a body-weight
 * the patient entered while filling) plus the `questionnaire/answer-v1` event
 * that references them.
 *
 * Atomicity convention (data-model documentation/QUESTIONNAIRE.md): all
 * writes go in one batch so a partial failure doesn't leave dangling
 * references or orphan typed events. Pryv has no cascade enforcement —
 * convention is: answer-event references are immutable post-write; edits
 * write a new answer event with refreshed references.
 *
 * Cross-reference convention (Pryv §7): every referenced eventId AND the
 * request eventId is mirrored into the answer event's
 * `clientData.related.<eventId>: true` so cohort queries hit the indexed
 * `clientData` parameter directly.
 */

import { appTemplates } from 'hds-lib';
const { Questionnaire } = appTemplates;

type AnswerEntry = appTemplates.AnswerEntry;

/** A typed event the patient created during the form filling, to land in the batch. */
export interface NewTypedEvent {
  /** Stable identifier the answer event references. Caller assigns (e.g. `uuid`). */
  id: string;
  type: string;
  streamIds: string[];
  content?: unknown;
  time?: number;
  clientData?: Record<string, unknown>;
}

/** The answer event written alongside the typed events. */
export interface AnswerEventToWrite {
  type: 'questionnaire/answer-v1';
  streamIds: string[];
  time?: number;
  content: appTemplates.QuestionnaireAnswerContent;
  clientData: { related: Record<string, true> };
}

export interface BuildAnswerBatchOptions {
  /** eventId of the `questionnaire/request-v1` event the patient is answering. */
  requestEventId: string;
  /** Patient's per-question answers (post-filling state). */
  answers: Record<string, AnswerEntry>;
  /** Streams the answer event lives in. */
  answerStreamIds: string[];
  /** Time the answer event happened. Defaults to now. */
  answerTimeSeconds?: number;
  /** Typed events created during the filling, to land in the same batch. */
  newTypedEvents?: NewTypedEvent[];
  /** Optional whitelist of valid question keys (from the request's questions map). */
  knownQuestionKeys?: string[];
}

export interface AnswerBatchResult {
  /** Array suitable for Pryv `events.batch` — typed events first, answer last. */
  batch: Array<NewTypedEvent | AnswerEventToWrite>;
  answerEvent: AnswerEventToWrite;
  newTypedEvents: NewTypedEvent[];
}

/**
 * Compose the per-filling event batch. Typed events go first so they exist
 * before the answer event's references hit the server; Pryv `batch` resolves
 * them in array order.
 *
 * Throws if the answer payload fails the canonical Questionnaire schema
 * validation (delegated to hds-lib's Questionnaire.buildAnswerEvent), or if
 * any reference id has an invalid shape.
 *
 * Pre-existing references (eventIds the patient is confirming, not creating)
 * are trusted as-is — callers obtain them via prefill / search and this
 * helper does not fetch to verify.
 */
export function buildAnswerBatch (opts: BuildAnswerBatchOptions): AnswerBatchResult {
  const {
    requestEventId,
    answers,
    answerStreamIds,
    answerTimeSeconds = Math.floor(Date.now() / 1000),
    newTypedEvents = [],
    knownQuestionKeys
  } = opts;

  if (!Array.isArray(answerStreamIds) || answerStreamIds.length === 0) {
    throw new Error('buildAnswerBatch: answerStreamIds must be a non-empty array');
  }

  // Delegate content + clientData mirror construction to the canonical helper
  // in hds-lib so the validation rules stay in one place.
  const { content, clientData } = Questionnaire.buildAnswerEvent(
    requestEventId,
    answers,
    knownQuestionKeys
  );

  const answerEvent: AnswerEventToWrite = {
    type: 'questionnaire/answer-v1',
    streamIds: answerStreamIds,
    time: answerTimeSeconds,
    content,
    clientData
  };

  const batch: Array<NewTypedEvent | AnswerEventToWrite> = [
    ...newTypedEvents,
    answerEvent
  ];

  return {
    batch,
    answerEvent,
    newTypedEvents
  };
}

/**
 * Convenience helper that takes the batch from `buildAnswerBatch` and writes
 * it to Pryv via the connection's batch API. Returns the raw Pryv result so
 * the caller can surface per-event ids / errors.
 *
 * NOTE: Pryv's batch API surface is `connection.api(batchCall)`; this helper
 * wraps the common case so the caller doesn't repeat boilerplate. Callers
 * that need finer control (custom batchSize, callback per chunk, etc.) can
 * skip this and call Pryv directly.
 */
export interface BatchSubmitConnection {
  api: (batchCalls: Array<{ method: 'events.create'; params: unknown }>) => Promise<unknown[]>;
}

export async function submitAnswerBatch (
  connection: BatchSubmitConnection,
  result: AnswerBatchResult
): Promise<unknown[]> {
  const batchCalls = result.batch.map((event) => ({
    method: 'events.create' as const,
    params: event
  }));
  return await connection.api(batchCalls);
}
