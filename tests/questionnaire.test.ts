import { describe, it, expect } from 'vitest';
import {
  scopeToQueryParams,
  fetchCandidatesForQuestion,
  prefillQuestionnaire,
  type PryvConnectionLike,
  type PryvEvent
} from '../src/questionnaire/prefill';
import { buildAnswerBatch } from '../src/questionnaire/submit';

const NOW = 1735689600; // 2025-01-01 00:00:00 UTC

function mockConnection (eventsByCall: PryvEvent[][]): PryvConnectionLike & { calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  let n = 0;
  return {
    calls,
    get: async (_method, params) => {
      calls.push(params);
      return { events: eventsByCall[n++] || [] };
    }
  };
}

const progesteroneQuestion = {
  label: { en: 'Did you take Progesterone?' },
  itemRef: 'medication-intake-coded',
  params: { drug: { codes: [{ system: 'ATC', code: 'G03DA04' }] } },
  scope: { type: 'ever' as const }
};

const weightQuestion = {
  label: { en: 'Body weight in past week' },
  itemRef: 'body-weight',
  scope: { type: 'latest' as const, withinDays: 7 }
};

const cycleQuestion = {
  label: { en: 'Cycle in past 60 days' },
  itemRef: 'fertility-cycles-start',
  scope: { type: 'window' as const, withinDays: 60 }
};

describe('scopeToQueryParams', () => {
  it('ever → sortAscending false + cap, no fromTime', () => {
    const p = scopeToQueryParams({ type: 'ever' }, NOW, 50);
    expect(p).toEqual({ sortAscending: false, limit: 50 });
  });

  it('window → fromTime = now - withinDays*86400, cap limit', () => {
    const p = scopeToQueryParams({ type: 'window', withinDays: 60 }, NOW, 100);
    expect(p.fromTime).toBe(NOW - 60 * 86400);
    expect(p.limit).toBe(100);
    expect(p.sortAscending).toBe(false);
  });

  it('latest → limit 1, fromTime = now - withinDays*86400', () => {
    const p = scopeToQueryParams({ type: 'latest', withinDays: 7 }, NOW, 100);
    expect(p.fromTime).toBe(NOW - 7 * 86400);
    expect(p.limit).toBe(1);
  });
});

describe('fetchCandidatesForQuestion', () => {
  it('returns [] if resolveEventType returns null', async () => {
    const conn = mockConnection([]);
    const out = await fetchCandidatesForQuestion(
      conn, progesteroneQuestion, undefined, NOW, 100, () => null
    );
    expect(out).toEqual([]);
    expect(conn.calls).toHaveLength(0); // no request when type unknown
  });

  it('passes streams + types + scope to connection.get', async () => {
    const conn = mockConnection([
      [{ id: 'evt-1', type: 'medication/coded-v1' }]
    ]);
    const out = await fetchCandidatesForQuestion(
      conn, progesteroneQuestion, ['stream-a', 'stream-b'], NOW, 100,
      () => 'medication/coded-v1'
    );
    expect(out).toHaveLength(1);
    expect(conn.calls[0]).toMatchObject({
      streams: ['stream-a', 'stream-b'],
      types: ['medication/coded-v1'],
      sortAscending: false,
      limit: 100
    });
  });

  it('omits streams param when baseStreams is empty', async () => {
    const conn = mockConnection([[]]);
    await fetchCandidatesForQuestion(
      conn, weightQuestion, [], NOW, 100, () => 'body-weight/kg'
    );
    expect(conn.calls[0].streams).toBeUndefined();
  });

  it('latest scope sets limit 1', async () => {
    const conn = mockConnection([[]]);
    await fetchCandidatesForQuestion(
      conn, weightQuestion, undefined, NOW, 100, () => 'body-weight/kg'
    );
    expect(conn.calls[0].limit).toBe(1);
    expect(conn.calls[0].fromTime).toBe(NOW - 7 * 86400);
  });
});

describe('prefillQuestionnaire', () => {
  it('fills `answered` for questions with matched events', async () => {
    const conn = mockConnection([
      [{ id: 'evt-prog-1', type: 'medication/coded-v1' }],
      [{ id: 'evt-bw-1', type: 'body-weight/kg' }],
      []
    ]);
    const request = {
      questions: {
        'progesterone-life': progesteroneQuestion,
        'weight-week': weightQuestion,
        'cycle-recent': cycleQuestion
      }
    };
    const answers = await prefillQuestionnaire({
      connection: conn,
      request,
      nowSeconds: NOW,
      resolveEventType: (q) => {
        if (q.itemRef === 'medication-intake-coded') return 'medication/coded-v1';
        if (q.itemRef === 'body-weight') return 'body-weight/kg';
        if (q.itemRef === 'fertility-cycles-start') return 'fertility-cycles-start';
        return null;
      }
    });
    expect(answers).toEqual({
      'progesterone-life': { status: 'answered', references: ['evt-prog-1'] },
      'weight-week': { status: 'answered', references: ['evt-bw-1'] }
    });
    // 'cycle-recent' got no events → absent from answers
    expect(answers['cycle-recent']).toBeUndefined();
  });

  it('applies matchEvent filter to candidates', async () => {
    const conn = mockConnection([
      [
        { id: 'evt-prog-1', type: 'medication/coded-v1', content: { drug: { codes: [{ code: 'G03DA04' }] } } },
        { id: 'evt-other', type: 'medication/coded-v1', content: { drug: { codes: [{ code: 'B01AC06' }] } } }
      ]
    ]);
    const request = { questions: { 'progesterone-life': progesteroneQuestion } };
    const answers = await prefillQuestionnaire({
      connection: conn,
      request,
      nowSeconds: NOW,
      resolveEventType: () => 'medication/coded-v1',
      matchEvent: (event, question) => {
        const want = (question.params as { drug: { codes: { code: string }[] } }).drug.codes[0].code;
        const have = (event.content as { drug: { codes: { code: string }[] } }).drug.codes;
        return have.some((c) => c.code === want);
      }
    });
    expect(answers['progesterone-life']).toEqual({
      status: 'answered',
      references: ['evt-prog-1']
    });
  });

  it('runs lookups in parallel (one call per question)', async () => {
    const conn = mockConnection([[], [], []]);
    const request = {
      questions: {
        q1: weightQuestion,
        q2: weightQuestion,
        q3: weightQuestion
      }
    };
    await prefillQuestionnaire({
      connection: conn,
      request,
      nowSeconds: NOW,
      resolveEventType: () => 'body-weight/kg'
    });
    expect(conn.calls).toHaveLength(3);
  });
});

describe('buildAnswerBatch', () => {
  it('composes typed events + answer event in the right order', () => {
    const result = buildAnswerBatch({
      requestEventId: 'evt-q-abc',
      answers: {
        'progesterone-life': { status: 'answered', references: ['evt-prog-1'], qualifier: 'T2' },
        'cycle-recent': { status: 'no' }
      },
      answerStreamIds: ['questionnaire-in'],
      answerTimeSeconds: NOW,
      newTypedEvents: [
        { id: 'evt-bw-new', type: 'body-weight/kg', streamIds: ['body-weight'], content: { value: 65 } }
      ]
    });
    expect(result.batch).toHaveLength(2);
    expect(result.batch[0]).toMatchObject({ id: 'evt-bw-new' });
    expect(result.batch[1]).toMatchObject({
      type: 'questionnaire/answer-v1',
      streamIds: ['questionnaire-in'],
      time: NOW,
      content: { requestEventId: 'evt-q-abc' }
    });
  });

  it('clientData.related mirrors request + all answered references', () => {
    const result = buildAnswerBatch({
      requestEventId: 'evt-q-abc',
      answers: {
        a: { status: 'answered', references: ['evt-1', 'evt-2'] },
        b: { status: 'answered', references: ['evt-3'] },
        c: { status: 'no' }
      },
      answerStreamIds: ['s']
    });
    expect(Object.keys(result.answerEvent.clientData.related).sort()).toEqual([
      'evt-1', 'evt-2', 'evt-3', 'evt-q-abc'
    ]);
  });

  it('throws when answerStreamIds is empty', () => {
    expect(() => buildAnswerBatch({
      requestEventId: 'evt-q-abc',
      answers: { a: { status: 'no' } },
      answerStreamIds: []
    })).toThrow(/non-empty array/);
  });

  it('delegates schema validation to Questionnaire.buildAnswerEvent (rejects answered without refs)', () => {
    expect(() => buildAnswerBatch({
      requestEventId: 'evt-q-abc',
      answers: { a: { status: 'answered', references: [] } },
      answerStreamIds: ['s']
    })).toThrow(/non-empty 'references'/);
  });

  it('knownQuestionKeys is enforced', () => {
    expect(() => buildAnswerBatch({
      requestEventId: 'evt-q-abc',
      answers: { stranger: { status: 'no' } },
      answerStreamIds: ['s'],
      knownQuestionKeys: ['a', 'b']
    })).toThrow(/not a question on the request/);
  });

  it('answer event omits time only when not provided (no — present by default)', () => {
    const result = buildAnswerBatch({
      requestEventId: 'evt-q-abc',
      answers: { a: { status: 'no' } },
      answerStreamIds: ['s']
    });
    expect(typeof result.answerEvent.time).toBe('number');
  });
});
