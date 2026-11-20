/**
 * Plan 134 B3: the notation picker as a facet filter, built from the generated Creighton definition.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registry } from 'hds-feminine-cycle-ui';
import { compatible, choices, toggle, resolve, selectionOf, pickedValue, type Selection } from '../src/schema/notationFacets';
import { buildNotation, itemValuesOf, candidateOf, type NotationModel } from '../src/schema/methodNotation';

const fixture = (): any => JSON.parse(readFileSync(new URL('./fixtures/creighton-v0.json', import.meta.url), 'utf-8'));
const rep = registry.get('creighton')!;
const MUCUS = 'body-vulva-mucus-inspect';
const BLEEDING = 'body-vulva-bleeding';
const BROWN = 'body-vulva-bleeding-browndark';

const mucusModel = (def: any = fixture()): NotationModel => buildNotation({ methodDef: def, rep, itemKeys: [MUCUS] })!;
const fullModel = (def: any = fixture()): NotationModel => buildNotation({ methodDef: def, rep, itemKeys: [MUCUS, BLEEDING] })!;

const show = (m: NotationModel, sel: Selection, facet: string) => choices(m.candidates, sel, facet, m.order[facet]);
const res = (m: NotationModel, sel: Selection) => resolve(m.candidates, m.rows, sel)?.payload.text ?? null;
const stickerOfCode = (m: NotationModel, code: string) => m.candidates.find(c => c.payload.text === code)!.facets.sticker;

function permutations<T> (xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
}

describe('buildNotation (Creighton, from the model)', () => {
  it('applies only with a notation block, a single component and a registered representation', () => {
    const def = fixture();
    expect(mucusModel(def)).not.toBeNull();
    expect(buildNotation({ methodDef: { ...def, notation: undefined }, rep, itemKeys: [MUCUS] })).toBeNull();
    expect(buildNotation({ methodDef: def, rep: undefined, itemKeys: [MUCUS] })).toBeNull();
    expect(buildNotation({ methodDef: { ...def, components: [...def.components, def.components[0]] }, rep, itemKeys: [MUCUS] })).toBeNull();
    expect(buildNotation({ methodDef: def, rep, itemKeys: ['body-weight'] })).toBeNull();
  });

  it('mucus alone: sticker, number, letters; the offered codes only', () => {
    const m = mucusModel();
    expect(m.rows.map(r => r.id)).toEqual(['sticker', 'number', 'letters']);
    expect(m.candidates.length).toBe(67);
    expect(m.candidates.map(c => c.payload.text)).not.toContain('10');
    expect(m.covers).toEqual([MUCUS]);
    expect(m.writes).toEqual([MUCUS]);
  });

  it('with bleeding: a bleeding row; the brown presence item is written though not asked', () => {
    const m = fullModel();
    expect(m.rows.map(r => r.id)).toEqual(['sticker', 'bleeding', 'number', 'letters']);
    expect(m.order.bleeding).toEqual(['H', 'M', 'L', 'VL', 'B']);
    expect(m.candidates.length).toBe(67 + 5 + 5 * 67);
    expect(m.covers).toEqual([MUCUS, BLEEDING]);
    expect(m.writes).toEqual([MUCUS, BLEEDING, BROWN]);
  });

  it('skips a notation row without parts (a later row kind)', () => {
    const def = fixture();
    def.notation.rows.push({ id: 'frequency', label: { en: 'Frequency' } });
    expect(mucusModel(def).rows.map(r => r.id)).toEqual(['sticker', 'number', 'letters']);
  });

  it('the choice texts and words come from the notation block', () => {
    const m = mucusModel();
    expect(m.display.colour.CK.text).toBe('C/K');
    expect(m.display.lubricative.true.text).toBe('L');
    expect(m.display.consistency.G.label.en).toBe('gummy');
  });
});

describe('notation facets', () => {
  const m = mucusModel();

  it('stickers: dry green, mucus white with a baby, B / R and any bleeding red', () => {
    const f = fullModel();
    const green = stickerOfCode(f, '0');
    const white = stickerOfCode(f, '6C');
    const red = stickerOfCode(f, '6B');
    expect(new Set([green, white, red]).size).toBe(3);
    for (const c of ['2', '2W', '4']) expect(stickerOfCode(f, c)).toBe(green);
    for (const c of ['8CK', '10KL', '10DL', '6GCKL']) expect(stickerOfCode(f, c)).toBe(white);
    for (const c of ['6R', '10B', '10R', 'H', 'VL', 'B', 'L 6C', 'B 0']) expect(stickerOfCode(f, c)).toBe(red);
    expect(f.order.sticker).toEqual([green, white, red]);
    expect(f.display.sticker[white].cell?.baby).toBe(true);
    expect(f.display.sticker[white].cell?.code).toBeUndefined();
  });

  it('green shows 0, 2, 2W, 4 only; white with baby 6, 8, 10', () => {
    expect(show(m, { sticker: stickerOfCode(m, '0') }, 'base')).toEqual(['0', '2', '2W', '4']);
    expect(show(m, { sticker: stickerOfCode(m, '6C') }, 'base')).toEqual(['6', '8', '10']);
  });

  it('eliminates: 6 then P leaves C and Y, no L; 8 has no P; 10 then D leaves L', () => {
    expect(show(m, { base: '6', consistency: 'P' }, 'colour')).toEqual(['C', 'Y']);
    expect(show(m, { base: '6', consistency: 'P' }, 'lubricative')).toEqual([]);
    expect(show(m, { base: '8' }, 'consistency')).toEqual(['G']);
    expect(show(m, { base: '10', sensation: 'D' }, 'lubricative')).toEqual(['true']);
    expect(show(m, { base: '10', sensation: 'D' }, 'colour')).toEqual([]);
    expect(show(m, { base: '10', sensation: 'D' }, 'consistency')).toEqual([]);
  });

  it('a picked facet shows its value alone; a second tap releases it and the others return', () => {
    let sel = toggle({}, 'base', '6');
    expect(show(m, sel, 'base')).toEqual(['6']);
    sel = toggle(sel, 'base', '6');
    expect(sel).toEqual({});
    expect(show(m, sel, 'base')).toEqual(['0', '2', '2W', '4', '6', '8', '10']);
  });

  it('resolves exactly: 6 + C is 6C, 6 alone nothing, 10 + D needs L', () => {
    expect(res(m, { base: '6', colour: 'C' })).toBe('6C');
    expect(res(m, { base: '6' })).toBeNull();
    expect(res(m, { base: '10', sensation: 'D' })).toBeNull();
    expect(res(m, { base: '10', sensation: 'D', lubricative: 'true' })).toBe('10DL');
    expect(res(m, { base: '0' })).toBe('0');
    expect(res(m, { sticker: stickerOfCode(m, '0') })).toBeNull();
  });

  it('a derived sticker filters and shows the resolved record as picked', () => {
    const row = m.rows[0];
    const sel = { base: '6', colour: 'C' };
    const resolved = resolve(m.candidates, m.rows, sel);
    expect(pickedValue(row, 'sticker', sel, resolved)).toBe(stickerOfCode(m, '6C'));
    expect(res(m, { ...sel, sticker: stickerOfCode(m, '6C') })).toBe('6C');
  });

  it('a bleeding record: alone, or with mucus; a red sticker narrows to them', () => {
    const f = fullModel();
    expect(res(f, { bleeding: 'L' })).toBe('L');
    expect(res(f, { bleeding: 'L', base: '6', colour: 'C' })).toBe('L 6C');
    const red = stickerOfCode(f, 'H');
    expect(show(f, { sticker: red }, 'bleeding')).toEqual(['H', 'M', 'L', 'VL', 'B']);
    expect(show(f, { sticker: stickerOfCode(f, '6C') }, 'bleeding')).toEqual([]);
    expect(res(f, { sticker: red, base: '6', colour: 'C' })).toBeNull();
  });

  it('reachability: every candidate is reached by its taps in any order, and no shown value is a dead end', () => {
    const check = (model: NotationModel, cands: typeof model.candidates) => {
      for (const target of cands) {
        const taps = Object.entries(selectionOf(target, model.rows));
        for (const order of permutations(taps)) {
          let sel: Selection = {};
          for (const [facet, value] of order) {
            expect(show(model, sel, facet), `${target.id}: ${facet}=${value} after ${JSON.stringify(sel)}`).toContain(value);
            sel = toggle(sel, facet, value);
            for (const row of model.rows) {
              for (const f of row.facets) {
                for (const v of show(model, sel, f)) expect(compatible(model.candidates, { ...sel, [f]: v }).length).toBeGreaterThan(0);
              }
            }
          }
          expect(resolve(model.candidates, model.rows, sel)?.id).toBe(target.id);
        }
      }
    };
    check(m, m.candidates);
    const f = fullModel();
    check(f, f.candidates.filter(c => !c.payload.mucus || ['0', '6C', '6GCKL', '10DL', '6B'].includes(c.payload.mucus)));
  });
});

describe('the choices follow the model data, with no code change', () => {
  it('a code removed from the generated list: 6 + G no longer resolves and needs a colour', () => {
    const before = mucusModel();
    expect(res(before, { base: '6', consistency: 'G' })).toBe('6G');
    const def = fixture();
    def.components[0].options = def.components[0].options.filter((o: any) => o.value !== '6G');
    const after = mucusModel(def);
    expect(res(after, { base: '6', consistency: 'G' })).toBeNull();
    expect(show(after, { base: '6', consistency: 'G' }, 'colour')).toEqual(['C', 'CK', 'K', 'Y']);
  });

  it('a rule relaxed (8B added with its parts): B is offered with 8', () => {
    expect(show(mucusModel(), { base: '8' }, 'colour')).not.toContain('B');
    const def = fixture();
    def.components[0].options.push({ value: '8B', label: { en: '8B — Tacky, brown', fr: '8B — Poisseux, brun' }, vector: {}, parts: { category: 'mucus', base: '8', consistency: null, colour: 'B', lubricative: false } });
    const after = mucusModel(def);
    expect(show(after, { base: '8' }, 'colour')).toContain('B');
    expect(res(after, { base: '8', colour: 'B' })).toBe('8B');
  });

  it('a code made not offered disappears; the stored one still opens', () => {
    const def = fixture();
    for (const o of def.components[0].options) if (o.value === '6C') o.offer = false;
    expect(res(mucusModel(def), { base: '6', colour: 'C' })).toBeNull();
    const editing = buildNotation({ methodDef: def, rep, itemKeys: [MUCUS], current: '6C' })!;
    expect(res(editing, { base: '6', colour: 'C' })).toBe('6C');
  });

  it('a stored code not offered (10) opens as picked', () => {
    const editing = buildNotation({ methodDef: fixture(), rep, itemKeys: [MUCUS], current: '10' })!;
    const c = candidateOf(editing, '10', undefined)!;
    expect(selectionOf(c, editing.rows)).toEqual({ base: '10' });
    expect(res(editing, { base: '10' })).toBe('10');
  });
});

describe('itemValuesOf: what a record saves', () => {
  const f = fullModel();
  const values = (text: string) => itemValuesOf(f, f.candidates.find(c => c.payload.text === text)!.payload);

  it('mucus alone, bleeding alone, both, brown bleeding (presence)', () => {
    expect(values('6C')).toEqual({ mucus: '6C', items: { [MUCUS]: undefined, [BLEEDING]: undefined, [BROWN]: undefined } });
    expect(values('H')).toEqual({ mucus: undefined, items: { [MUCUS]: undefined, [BLEEDING]: 0.75, [BROWN]: undefined } });
    expect(values('VL 10KL')).toEqual({ mucus: '10KL', items: { [MUCUS]: undefined, [BLEEDING]: 0.2, [BROWN]: undefined } });
    expect(values('B 0')).toEqual({ mucus: '0', items: { [MUCUS]: undefined, [BLEEDING]: undefined, [BROWN]: true } });
  });

  it('nothing picked: every item undefined', () => {
    expect(itemValuesOf(f, null)).toEqual({ items: { [MUCUS]: undefined, [BLEEDING]: undefined, [BROWN]: undefined } });
  });
});
