import { useEffect, useMemo, useState } from 'react';
import { cmcConversation, settings } from 'hds-lib';
import 'hds-feminine-cycle-ui/cycle-chart.css';
import { ChartReview, type ConversationActions } from 'hds-forms/conversation';

// ChartReview (plan 139 R3) on invented data: a paper chart of two rows read as a dated grid. Row 1 is dated (her own
// records beside it: one day the same, one recorded otherwise), row 2 is not. Every state of a day: draft, part not read,
// not read, corrected, checked. Answers are kept in this page only; nothing is read from or written to an account.

const DOC = 'chart-doc-1';
const MUCUS = 'vulva-mucus-inspect/9d-vector';
const EXTRACTION = { engine: 'hds-reader', engineVersion: '1', kbVersion: '1', backend: 'vision' };
const START = Date.parse('2026-01-05T12:00:00Z') / 1000;
const COLS = 8;
const W = 800;
const H = 300;
const box = (row: number, column: number) => ({ x: 40 + (column - 1) * 90, y: 40 + (row - 1) * 120, w: 80, h: 100 });
const anchor = (row: number, column: number) => {
  const b = box(row, column);
  return { attachmentId: 'att-1', page: 1, bbox: [b.x / W * 100, b.y / H * 100, b.w / W * 100, b.h / H * 100] };
};

// what is written on the invented chart, box by box
const WRITTEN: Record<string, string> = { '1:1': '10KL X2', '1:2': '8C', '1:3': 'L 4', '1:4': '2', '1:5': '10KL ~~', '1:6': '~~~', '1:7': '4', '1:8': '6C', '2:1': '4', '2:2': 'VL 2' };
const PAPER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fdfcf7"/>` +
  [1, 2].flatMap((row) => Array.from({ length: COLS }, (_, i) => {
    const b = box(row, i + 1);
    const text = WRITTEN[`${row}:${i + 1}`] ?? '';
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="#555"/><text x="${b.x + 6}" y="${b.y + 16}" font-size="12" fill="#888">${i + 1}</text>` +
      `<text x="${b.x + b.w / 2}" y="${b.y + 62}" font-size="18" text-anchor="middle" font-family="cursive" fill="#123">${text}</text>`;
  })).join('') + '</svg>'
);

let seq = 0;
function item (kind: 'question' | 'proposed-value' | 'answer', content: Record<string, unknown>, at = 100): any {
  seq += 1;
  return { id: `i${seq}`, streamId: kind === 'answer' ? 'conv-sent' : 'conv-received', direction: kind === 'answer' ? 'sent' : 'received', kind, about: DOC, time: at, created: at, modified: at, content: { kind, about: DOC, ...content } };
}
const mucusContent = (code: string, frequency?: string) => ({ vectors: {}, source: { key: 'creighton', sourceData: { mucus: code }, ...(frequency ? { annotations: { frequency } } : {}) } });
function value (id: string, row: number, column: number, proposal: Record<string, unknown> | null, extra: Record<string, unknown> = {}) {
  return item('proposed-value', {
    candidateId: id, grid: { row, column }, anchor: anchor(row, column), printed: { label: String(column), value: WRITTEN[`${row}:${column}`] },
    ...(proposal ? { proposal: { clientData: { hdsTimePrecision: 'day' }, ...proposal } } : {}), status: 'clear', extraction: EXTRACTION, ...extra
  });
}
const dated = (column: number) => START + (column - 1) * 86400;
const mucus = (id: string, row: number, column: number, code: string, frequency?: string, extra: Record<string, unknown> = {}) =>
  value(id, row, column, { itemKey: 'body-vulva-mucus-inspect', type: MUCUS, content: mucusContent(code, frequency), ...(row === 1 ? { time: dated(column) } : {}) }, extra);
const bleeding = (id: string, row: number, column: number, flow: number) =>
  value(id, row, column, { itemKey: 'body-vulva-bleeding', type: 'ratio/proportion', content: flow, ...(row === 1 ? { time: dated(column) } : {}) });
const notRead = (id: string, row: number, column: number) => value(id, row, column, null, { status: 'unmapped', reason: 'not-read' });
const rowQuestion = (row: number) => item('question', { code: 'which-row-date', context: { grid: { row, column: 1 }, anchor: anchor(row, 1) } });

function fixtures () {
  seq = 0;
  const q1 = rowQuestion(1);
  const a7 = mucus('a7', 1, 7, '6C');
  const items = [
    q1, rowQuestion(2),
    item('answer', { inReplyTo: q1.id, action: 'confirm', time: START, timePrecision: 'day' }, 150),
    mucus('a1', 1, 1, '10KL', 'X2'), mucus('a2', 1, 2, '8C'), bleeding('a3b', 1, 3, 0.35), mucus('a3', 1, 3, '4'), mucus('a4', 1, 4, '2'),
    mucus('a5', 1, 5, '10KL'), notRead('n5', 1, 5), notRead('n6', 1, 6), a7,
    item('answer', { inReplyTo: a7.id, action: 'correct', candidateIds: ['a7'], written: [{ candidateId: 'a7', eventId: 'w-a7' }] }, 160),
    mucus('a8', 1, 8, '6C', undefined, { status: 'check' }),
    mucus('b1', 2, 1, '4'), bleeding('b2b', 2, 2, 0.2), mucus('b2', 2, 2, '2')
  ];
  // her own records on row 1: day 1 the same as the chart, day 2 otherwise, and the value she corrected on day 7
  const recorded = [
    { id: 'r1', streamIds: ['body-vulva-mucus-inspect'], type: MUCUS, content: mucusContent('10KL', 'X2'), time: dated(1) },
    { id: 'r2', streamIds: ['body-vulva-mucus-inspect'], type: MUCUS, content: mucusContent('6C'), time: dated(2) },
    { id: 'w-a7', streamIds: ['body-vulva-mucus-inspect'], type: MUCUS, content: mucusContent('4'), time: dated(7) }
  ];
  return { items, recorded };
}

const toggle = (on: boolean) => `rounded px-3 py-1 text-sm ${on ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`;
const dayOf = (e: any): string | null => (typeof e.time === 'number' ? new Date(e.time * 1000).toISOString().slice(0, 10) : null);

export default function ChartReviewPanel () {
  const [state, setState] = useState(fixtures);
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const [columns, setColumns] = useState(7);
  const [log, setLog] = useState<string[]>([]);
  const [, setVersion] = useState(0);
  useEffect(() => {
    settings.setPreferredLocales([lang]);
    setVersion((v) => v + 1);
    return () => settings.setPreferredLocales(['en']);
  }, [lang]);
  const conversation = useMemo(() => cmcConversation.conversationOf(state.items, DOC), [state.items]);
  const say = (line: string) => setLog((l) => [line, ...l].slice(0, 12));

  const answer = (ids: string[], action: string, written = false, correction?: { type: string; content: unknown }) => {
    setState((s) => {
      const target = s.items.find((i) => i.content.candidateId === ids[0]);
      const content: Record<string, unknown> = { inReplyTo: target?.id, action, candidateIds: ids };
      if (written) content.written = ids.map((id) => ({ candidateId: id, eventId: `w-${id}` }));
      const added = written
        ? ids.flatMap((id) => {
          const p = s.items.find((i) => i.content.candidateId === id)?.content.proposal;
          return p ? [{ id: `w-${id}`, streamIds: [p.itemKey], type: correction?.type ?? p.type, content: correction != null ? correction.content : p.content, time: p.time }] : [];
        })
        : [];
      return { items: [...s.items, item('answer', content, 300 + seq)], recorded: [...s.recorded, ...added] };
    });
    say(`${action} ${ids.join(', ')}`);
    return Promise.resolve({ ok: true as const });
  };
  const actions: ConversationActions = {
    confirm: (ids) => answer(ids, 'confirm', true),
    correct: (id, correction) => { say(`correct ${id}: ${JSON.stringify(correction.content)}`); return answer([id], 'correct', true, correction); },
    dismiss: (ids, action) => answer(ids, action),
    answer: (id) => { say(`answer ${id}`); return Promise.resolve({ ok: true }); }
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm font-medium text-gray-700 dark:text-gray-200'>Language</span>
        <button type='button' className={toggle(lang === 'en')} onClick={() => setLang('en')}>en</button>
        <button type='button' className={toggle(lang === 'fr')} onClick={() => setLang('fr')}>fr</button>
        <span className='ml-4 text-sm font-medium text-gray-700 dark:text-gray-200'>Columns</span>
        <button type='button' className={toggle(columns === 7)} onClick={() => setColumns(7)}>7</button>
        <button type='button' className={toggle(columns === 35)} onClick={() => setColumns(35)}>35</button>
        <button type='button' className='ml-4 rounded bg-gray-100 px-3 py-1 text-sm text-gray-700' onClick={() => { setState(fixtures()); setLog([]); }}>Reset</button>
      </div>
      <div className='max-w-3xl'>
        <ChartReview
          conversation={conversation}
          actions={actions}
          recorded={state.recorded}
          dayOf={dayOf}
          today='2026-02-01'
          sourceOf={() => ({ url: PAPER, kind: 'image' })}
          columns={columns}
          lang={lang}
          contactName='HDS Reader'
          onEnterDay={({ date, candidateIds }) => { say(`enter ${date} (her form), then skip ${candidateIds.join(', ')}`); answer(candidateIds, 'skip'); }}
          onReplace={async ({ recordedEvents }) => {
            const ids = recordedEvents.map((e) => e.id);
            setState((s) => ({ ...s, recorded: s.recorded.filter((e) => !ids.includes(e.id)) }));
            say(`removed her record ${ids.join(', ')}`);
            return true;
          }}
        />
      </div>
      <pre className='max-w-3xl rounded bg-gray-50 p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300'>{log.join('\n') || 'Her answers show here.'}</pre>
    </div>
  );
}
