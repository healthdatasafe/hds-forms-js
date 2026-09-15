import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The pin helpers and DatasetSearch read the published model through
 * `getHDSModel()`. These tests mock it so the render branches can be asserted
 * without a network fetch or a loaded pack.
 */
const datasources: Record<string, any> = {
  treatment: {
    endpoint: 'https://example.invalid/treatment',
    queryParam: 'search',
    minQueryLength: 3,
    resultKey: 'treatments',
    displayFields: { label: 'label', description: 'description' },
    valueFields: ['label', 'description', 'codes', 'hdsId', 'route']
  },
  // A datasource whose display label lives under a non-default field, to prove
  // pinDisplayLabel reads displayFields rather than assuming `label`.
  condition: {
    endpoint: 'https://example.invalid/condition',
    queryParam: 'search',
    minQueryLength: 3,
    resultKey: 'conditions',
    displayFields: { label: 'preferredTerm', description: 'description' },
    valueFields: ['preferredTerm', 'codes', 'hdsId']
  }
};

const eventTypeDefs: Record<string, any> = {
  'treatment-coded/v1': {
    type: 'object',
    required: ['treatment'],
    properties: {
      treatment: { type: 'object' },
      course: {
        type: 'object',
        properties: {
          count: { type: 'number' },
          route: { type: 'string' }
        }
      }
    }
  }
};

vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
  getHDSModel: () => ({
    datasources: {
      forKey: (key: string, throwIfMissing = true) => {
        const d = datasources[key];
        if (!d) {
          if (throwIfMissing) throw new Error('Cannot find datasource definition with key: ' + key);
          return null;
        }
        return d;
      }
    },
    eventTypes: {
      getEventTypeDefinition: (t: string) => eventTypeDefs[t],
      getEventTypeExtra: () => undefined
    }
  }),
  HDSSettings: { isHooked: false, get: () => undefined },
  appTemplates: {},
  getPreferredInput: () => undefined
}));

const { asItemPin, pinDisplayLabel, buildPinnedValue } = await import('../src/schema/itemPin');
const { DatasetSearch } = await import('../src/components/fields/DatasetSearch');

const IVF = {
  datasource: 'treatment',
  value: {
    label: { en: 'In vitro fertilization' },
    codes: [{ system: 'SNOMED', code: '63487001' }],
    hdsId: 'hds:treatment:ivf',
    route: 'oral'
  }
};

const noop = (): void => {};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('asItemPin', () => {
  it('accepts a well-formed pin', () => {
    expect(asItemPin(IVF)).toEqual({ datasource: 'treatment', value: IVF.value });
  });

  it('rejects anything that is not a usable pin', () => {
    // A malformed pin must read as "no pin" rather than half-applying: the
    // field then behaves exactly as it did before pins existed.
    expect(asItemPin(undefined)).toBeUndefined();
    expect(asItemPin(null)).toBeUndefined();
    expect(asItemPin('treatment')).toBeUndefined();
    expect(asItemPin({})).toBeUndefined();
    expect(asItemPin({ datasource: 'treatment' })).toBeUndefined();
    expect(asItemPin({ value: { label: 'x' } })).toBeUndefined();
    expect(asItemPin({ datasource: '', value: {} })).toBeUndefined();
    expect(asItemPin({ datasource: 'treatment', value: 'not-an-object' })).toBeUndefined();
  });
});

describe('pinDisplayLabel', () => {
  it('localizes a localizableText label', () => {
    expect(pinDisplayLabel(IVF)).toBe('In vitro fertilization');
  });

  it('accepts a plain string label', () => {
    expect(pinDisplayLabel({ datasource: 'treatment', value: { label: 'IUI' } })).toBe('IUI');
  });

  it("reads the datasource's own displayFields.label, not a hardcoded 'label'", () => {
    const pin = { datasource: 'condition', value: { preferredTerm: { en: 'Endometriosis' } } };
    expect(pinDisplayLabel(pin)).toBe('Endometriosis');
  });

  it('returns empty string when the label field is absent', () => {
    expect(pinDisplayLabel({ datasource: 'treatment', value: { hdsId: 'x' } })).toBe('');
  });

  it('falls back to `label` for an unknown datasource instead of throwing', () => {
    // forKey(..., false) is used deliberately so a stale pin cannot crash a form.
    expect(pinDisplayLabel({ datasource: 'nope', value: { label: 'Fallback' } })).toBe('Fallback');
  });
});

describe('buildPinnedValue', () => {
  it('returns the bare concept when the event type has no companions', () => {
    expect(buildPinnedValue(IVF, undefined)).toEqual(IVF.value);
    expect(buildPinnedValue(IVF, 'unknown/type')).toEqual(IVF.value);
  });

  it('wraps under the datasource prop and pre-fills companion defaults', () => {
    const built = buildPinnedValue(IVF, 'treatment-coded/v1');
    expect(built.treatment).toEqual(IVF.value);
    // `route` is a top-level field on the concept and a sub-property of the
    // `course` companion, so it pre-fills exactly as a user selection would.
    expect(built.course).toEqual({ route: 'oral' });
  });

  it('emits the same shape a user selection would have produced', () => {
    // The point of storing the resolved concept: pinned and searched-for
    // answers must be indistinguishable downstream.
    const built = buildPinnedValue(IVF, 'treatment-coded/v1');
    expect(Object.keys(built).sort()).toEqual(['course', 'treatment']);
  });
});

describe('DatasetSearch with a pin', () => {
  it('renders the concept as static text and no search box', () => {
    const html = renderToStaticMarkup(
      <DatasetSearch
        label='IVF cycles'
        value={undefined}
        onChange={noop}
        datasource='treatment'
        eventType='treatment-coded/v1'
        pin={IVF}
      />
    );
    expect(html).toContain('In vitro fertilization');
    // The search box is identified by its placeholder; any remaining text
    // inputs belong to the companion block, which must still render.
    expect(html).not.toContain('characters to search');
  });

  it('locks the companion sub-keys the pin pre-filled, and leaves the rest editable', () => {
    const html = renderToStaticMarkup(
      <DatasetSearch
        label='IVF cycles'
        value={undefined}
        onChange={noop}
        datasource='treatment'
        eventType='treatment-coded/v1'
        pin={IVF}
      />
    );
    // `route` came off the pinned concept, so it is readonly — the respondent
    // did not choose it and must not be able to contradict it.
    const routeBlock = html.slice(html.indexOf('>Route<'));
    expect(routeBlock).toContain('disabled=""');
    // `count` is the question actually being asked, so it stays editable.
    const countBlock = html.slice(html.indexOf('>Count<'), html.indexOf('>Route<'));
    expect(countBlock).not.toContain('disabled=""');
  });

  it('still renders the companion fields, which is the whole point', () => {
    const html = renderToStaticMarkup(
      <DatasetSearch
        label='IVF cycles'
        value={undefined}
        onChange={noop}
        datasource='treatment'
        eventType='treatment-coded/v1'
        pin={IVF}
      />
    );
    expect(html).toContain('Count');
    expect(html).toContain('type="number"');
  });

  it('renders an error when the pin names a different datasource', () => {
    // A silent fallback to the search box is indistinguishable from "the author
    // forgot to pin", so the misconfiguration must be visible.
    const html = renderToStaticMarkup(
      <DatasetSearch
        label='IVF cycles'
        value={undefined}
        onChange={noop}
        datasource='treatment'
        eventType='treatment-coded/v1'
        pin={{ datasource: 'condition', value: { preferredTerm: { en: 'Endometriosis' } } }}
      />
    );
    expect(html).toContain('Pinned concept belongs to datasource');
    expect(html).not.toContain('Endometriosis');
    expect(html).not.toContain('characters to search');
  });

  it('renders the search box unchanged when there is no pin', () => {
    const html = renderToStaticMarkup(
      <DatasetSearch
        label='IVF cycles'
        value={undefined}
        onChange={noop}
        datasource='treatment'
        eventType='treatment-coded/v1'
      />
    );
    expect(html).toContain('characters to search');
    expect(html).not.toContain('Pinned concept belongs to datasource');
  });
});
