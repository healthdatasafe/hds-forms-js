/**
 * Plan 71 Phase C — questionnaire prefill.
 *
 * Walk a `questionnaire/request-v1` payload, query Pryv per-question with the
 * declared temporal scope, and return an `AnswerEntry` map suitable for
 * seeding HDSQuestionnaireForm's `initialAnswers`.
 *
 * Storage-shape note: Pryv's `content` / `clientData` path grammar
 * (`[a-zA-Z0-9_:-]+(\.[a-zA-Z0-9_:-]+)*`) excludes array indices and
 * wildcards. Items whose content carries arrays of coded objects
 * (e.g. `medication/coded-v1`'s `drug.codes[]`) can't be filtered directly
 * via server-side content queries — the prefill returns candidate events
 * (eventType + temporal scope filter) and the caller applies
 * params-matching client-side via the `matchEvent` callback. When the
 * underlying storage shape supports direct content queries (scalar paths or
 * keyed objects per Pryv §7), a future optimization can swap the bulk
 * fetch for `Connection.getLatestByContent`.
 *
 * Per-pregnancy / per-context isolation (Plan 53 D3): pass the relevant
 * context substreamIds via `baseStreams`.
 */

import { getHDSModel, appTemplates } from 'hds-lib';

type QuestionDef = appTemplates.QuestionDef;
type QuestionScope = appTemplates.QuestionScope;
type AnswerEntry = appTemplates.AnswerEntry;
type QuestionnaireRequestContent = appTemplates.QuestionnaireRequestContent;

/** Minimal Pryv Connection surface the prefill helpers need. */
export interface PryvConnectionLike {
  // pryv@3.6 Connection — `get('events', params)` returns { events: [...] }
  get: (method: 'events', params: Record<string, unknown>) => Promise<{ events?: PryvEvent[] }>;
}

export interface PryvEvent {
  id: string;
  type: string;
  streamIds?: string[];
  time?: number;
  content?: unknown;
  clientData?: Record<string, unknown>;
}

export interface QuestionMatchContext {
  questionKey: string;
  question: QuestionDef;
  candidates: PryvEvent[];
}

export type MatchEventFn = (event: PryvEvent, question: QuestionDef) => boolean;

export type ResolveEventTypeFn = (question: QuestionDef) => string | null;

export interface PrefillOptions {
  /** Pryv connection used for the lookup. */
  connection: PryvConnectionLike;
  /** The instantiated questionnaire (request event content). */
  request: QuestionnaireRequestContent;
  /**
   * Base streamIds to scope the lookup. For per-pregnancy questionnaires
   * (Plan 53 D3) pass the per-pregnancy descendant streamIds.
   */
  baseStreams?: string[];
  /**
   * Optional client-side filter applied to each candidate event. Use this to
   * narrow the matched set when the underlying content shape can't be
   * server-filtered (e.g. arrays of codes). Default: accept all candidates.
   */
  matchEvent?: MatchEventFn;
  /** Cap on candidates fetched per question (default 100, `latest` capped at 1). */
  maxCandidatesPerQuestion?: number;
  /** Override `now` for deterministic tests (UNIX seconds). */
  nowSeconds?: number;
  /**
   * Override the eventType lookup. Defaults to the HDS-model-backed
   * resolveQuestionEventType. Useful in tests or in callers that maintain
   * their own item-key → eventType mapping.
   */
  resolveEventType?: ResolveEventTypeFn;
}

/**
 * Resolve the eventType the prefill query should target for a given question.
 * Returns null if the referenced item isn't found in the HDS model.
 */
export function resolveQuestionEventType (question: QuestionDef): string | null {
  const itemDef = getHDSModel().itemsDefs.forKey(question.itemRef);
  if (!itemDef) return null;
  return itemDef.data?.eventType ?? null;
}

/**
 * Translate a question's scope into Pryv `events.get` query knobs.
 * Returns `{ fromTime?, sortAscending: false, limit }` — caller merges with
 * stream / type filters.
 */
export function scopeToQueryParams (
  scope: QuestionScope,
  nowSeconds: number,
  cap: number
): Record<string, unknown> {
  const params: Record<string, unknown> = { sortAscending: false };
  if (scope.type === 'ever') {
    params.limit = cap;
    return params;
  }
  // window or latest — both bounded by withinDays
  params.fromTime = nowSeconds - scope.withinDays * 86400;
  params.limit = scope.type === 'latest' ? 1 : cap;
  return params;
}

/**
 * Fetch candidate events for a single question. Returns [] when the
 * referenced item is unknown or the eventType can't be resolved.
 */
export async function fetchCandidatesForQuestion (
  connection: PryvConnectionLike,
  question: QuestionDef,
  baseStreams: string[] | undefined,
  nowSeconds: number,
  maxCandidates: number,
  resolveEventType: ResolveEventTypeFn = resolveQuestionEventType
): Promise<PryvEvent[]> {
  const eventType = resolveEventType(question);
  if (eventType == null) return [];
  const scopeParams = scopeToQueryParams(question.scope, nowSeconds, maxCandidates);
  const params: Record<string, unknown> = {
    types: [eventType],
    ...scopeParams
  };
  if (baseStreams && baseStreams.length > 0) params.streams = baseStreams;
  const result = await connection.get('events', params);
  return result.events ?? [];
}

/**
 * Prefill an answer map for the questionnaire by querying Pryv per-question
 * with the declared temporal scope and applying the optional client-side
 * match callback.
 *
 * For each question with at least one matched event, sets:
 *   answers[key] = { status: 'answered', references: [<eventId>, ...] }
 *
 * Questions with no match are left absent (= implicit "not-answered") — the
 * renderer's status radio starts at no selection so the patient can fill in
 * any of the four statuses.
 */
export async function prefillQuestionnaire (opts: PrefillOptions): Promise<Record<string, AnswerEntry>> {
  const {
    connection, request, baseStreams, matchEvent,
    maxCandidatesPerQuestion = 100,
    nowSeconds = Math.floor(Date.now() / 1000),
    resolveEventType
  } = opts;
  const answers: Record<string, AnswerEntry> = {};
  const entries = Object.entries(request.questions);
  // Per-question lookups are independent — fan out in parallel.
  await Promise.all(entries.map(async ([key, question]) => {
    const candidates = await fetchCandidatesForQuestion(
      connection, question, baseStreams, nowSeconds, maxCandidatesPerQuestion, resolveEventType
    );
    const matched = matchEvent
      ? candidates.filter((e) => matchEvent(e, question))
      : candidates;
    if (matched.length === 0) return;
    answers[key] = {
      status: 'answered',
      references: matched.map((e) => e.id)
    };
  }));
  return answers;
}
