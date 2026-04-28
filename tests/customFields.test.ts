import { describe, it, expect } from 'vitest';
import { appTemplates } from 'hds-lib';
import type { CustomFieldDeclaration } from 'hds-lib';
import {
  buildCustomFieldEntries,
  customFieldFormKey,
  isCustomFieldKey,
  CUSTOM_FIELD_KEY_PREFIX
} from '../src/schema/customFields';
import { prefillFromEvents, formDataToActions } from '../src/schema/eventData';

describe('Plan 45 — custom-field VirtualItemDef shape', () => {
  function decl (overrides: Partial<CustomFieldDeclaration['def']> & { eventType?: any, streamId?: string } = {}): CustomFieldDeclaration {
    const { eventType, streamId, ...defOverrides } = overrides;
    return {
      streamId: streamId || 'stormm-woman-custom-flow',
      eventType: (eventType as any) || 'note/txt',
      def: {
        version: 'v1',
        templateId: 'stormm-woman',
        key: 'flow',
        label: { en: 'Flow' },
        ...defOverrides
      } as any
    };
  }

  it('note/txt with options → form type "select" with {value, label} pairs', () => {
    const v = appTemplates.customFieldDeclarationToVirtualItem(
      decl({ options: ['light', 'medium', 'heavy'] })
    );
    expect(v.data.type).toBe('select');
    expect(v.data.options).toHaveLength(3);
    expect(v.data.options![0]).toEqual({ value: 'light', label: { en: 'light' } });
  });

  it('note/txt without options → form type "text"', () => {
    const v = appTemplates.customFieldDeclarationToVirtualItem(decl());
    expect(v.data.type).toBe('text');
    expect(v.data.options).toBeUndefined();
  });

  it('count/generic → form type "number" with min/max/step preserved', () => {
    const v = appTemplates.customFieldDeclarationToVirtualItem(
      decl({ eventType: 'count/generic', streamId: 'stormm-woman-custom-pain', key: 'pain', min: 0, max: 10, step: 1 })
    );
    expect(v.data.type).toBe('number');
    expect(v.data.min).toBe(0);
    expect(v.data.max).toBe(10);
    expect(v.data.step).toBe(1);
  });

  it('date/iso-8601 → form type "date" with minDate/maxDate', () => {
    const v = appTemplates.customFieldDeclarationToVirtualItem(
      decl({ eventType: 'date/iso-8601', streamId: 'stormm-woman-custom-onset', key: 'onset', minDate: '2020-01-01', maxDate: '2030-12-31' })
    );
    expect(v.data.type).toBe('date');
    expect(v.data.minDate).toBe('2020-01-01');
    expect(v.data.maxDate).toBe('2030-12-31');
  });

  it('activity/plain → form type "text"', () => {
    const v = appTemplates.customFieldDeclarationToVirtualItem(
      decl({ eventType: 'activity/plain', streamId: 'stormm-woman-custom-walk', key: 'walk' })
    );
    expect(v.data.type).toBe('text');
  });

  it('virtual key follows {templateId}::{def.key}', () => {
    const v = appTemplates.customFieldDeclarationToVirtualItem(decl());
    expect(v.key).toBe('stormm-woman::flow');
  });

  it('preserves required, maxLength, repeatable, section, description', () => {
    const v = appTemplates.customFieldDeclarationToVirtualItem(
      decl({
        required: true,
        maxLength: 200,
        repeatable: 'P1D',
        section: 'menstrual',
        description: { en: 'help text' }
      })
    );
    expect(v.data.required).toBe(true);
    expect(v.data.maxLength).toBe(200);
    expect(v.data.repeatable).toBe('P1D');
    expect(v.data.section).toBe('menstrual');
    expect(v.data.description).toEqual({ en: 'help text' });
  });

  it('streamId is carried through for write-time event creation', () => {
    const v = appTemplates.customFieldDeclarationToVirtualItem(decl());
    expect(v.data.streamId).toBe('stormm-woman-custom-flow');
    expect(v.data.eventType).toBe('note/txt');
  });

  it('eventTemplate() returns Pryv-shape {streamIds, type} so it slots into formDataToActions', () => {
    const v = appTemplates.customFieldDeclarationToVirtualItem(decl());
    expect(v.eventTemplate()).toEqual({
      streamIds: ['stormm-woman-custom-flow'],
      type: 'note/txt'
    });
  });
});

describe('Plan 45 — customField bridge helpers', () => {
  function flowDecl (): CustomFieldDeclaration {
    return {
      streamId: 'stormm-woman-custom-flow',
      eventType: 'note/txt',
      def: {
        version: 'v1',
        templateId: 'stormm-woman',
        key: 'flow',
        label: { en: 'Flow' },
        options: ['light', 'medium', 'heavy']
      }
    };
  }
  function painDecl (): CustomFieldDeclaration {
    return {
      streamId: 'stormm-woman-custom-pain',
      eventType: 'count/generic',
      def: {
        version: 'v1',
        templateId: 'stormm-woman',
        key: 'pain',
        label: { en: 'Pain' },
        min: 0,
        max: 10
      }
    };
  }

  it('customFieldFormKey returns __cf::{templateId}::{key}', () => {
    expect(customFieldFormKey(flowDecl())).toBe('__cf::stormm-woman::flow');
  });

  it('isCustomFieldKey recognises the prefix', () => {
    expect(isCustomFieldKey('__cf::stormm-woman::flow')).toBe(true);
    expect(isCustomFieldKey('flow')).toBe(false);
    expect(isCustomFieldKey('canonical-item-key')).toBe(false);
  });

  it('CUSTOM_FIELD_KEY_PREFIX is the agreed sentinel', () => {
    expect(CUSTOM_FIELD_KEY_PREFIX).toBe('__cf::');
  });

  it('buildCustomFieldEntries returns empty when keys/decls absent', () => {
    expect(buildCustomFieldEntries(undefined, [flowDecl()])).toEqual([]);
    expect(buildCustomFieldEntries(['flow'], undefined)).toEqual([]);
    expect(buildCustomFieldEntries([], [flowDecl()])).toEqual([]);
  });

  it('buildCustomFieldEntries returns one entry per matching key', () => {
    const entries = buildCustomFieldEntries(['flow', 'pain'], [flowDecl(), painDecl()]);
    expect(entries).toHaveLength(2);
    expect(entries[0].key).toBe('__cf::stormm-woman::flow');
    expect(entries[1].key).toBe('__cf::stormm-woman::pain');
    expect(entries[0].itemDef.data.streamId).toBe('stormm-woman-custom-flow');
    expect(entries[0].itemDef.eventTemplate()).toEqual({
      streamIds: ['stormm-woman-custom-flow'],
      type: 'note/txt'
    });
  });

  it('buildCustomFieldEntries skips keys not declared in customFields[]', () => {
    const entries = buildCustomFieldEntries(['flow', 'unknown'], [flowDecl()]);
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe('__cf::stormm-woman::flow');
  });

  it('round-trip — formDataToActions emits create on a custom-field value', () => {
    const entries = buildCustomFieldEntries(['flow'], [flowDecl()]);
    const formData = { '__cf::stormm-woman::flow': 'medium' };
    const actions = formDataToActions(entries, formData, {}, 1700000000);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('create');
    expect(actions[0].params).toEqual({
      streamIds: ['stormm-woman-custom-flow'],
      type: 'note/txt',
      content: 'medium',
      time: 1700000000
    });
  });

  it('round-trip — formDataToActions emits update when the event already exists', () => {
    const entries = buildCustomFieldEntries(['pain'], [painDecl()]);
    const formData = { '__cf::stormm-woman::pain': 7 };
    const existingIds = { '__cf::stormm-woman::pain': 'evt-abc' };
    const actions = formDataToActions(entries, formData, existingIds);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('update');
    expect(actions[0].params.id).toBe('evt-abc');
    expect(actions[0].params.update.content).toBe(7);
  });

  it('round-trip — formDataToActions emits delete when value cleared', () => {
    const entries = buildCustomFieldEntries(['flow'], [flowDecl()]);
    const formData = { '__cf::stormm-woman::flow': '' };
    const existingIds = { '__cf::stormm-woman::flow': 'evt-xyz' };
    const actions = formDataToActions(entries, formData, existingIds);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('delete');
    expect(actions[0].params).toEqual({ id: 'evt-xyz' });
  });

  it('round-trip — prefillFromEvents matches a custom-field event by (streamId, eventType)', () => {
    const entries = buildCustomFieldEntries(['flow', 'pain'], [flowDecl(), painDecl()]);
    const events = [
      { type: 'note/txt', streamIds: ['stormm-woman-custom-flow'], content: 'heavy', time: 100 },
      { type: 'count/generic', streamIds: ['stormm-woman-custom-pain'], content: 4, time: 200 }
    ];
    const values = prefillFromEvents(entries, events);
    expect(values['__cf::stormm-woman::flow']).toBe('heavy');
    expect(values['__cf::stormm-woman::pain']).toBe(4);
  });

  it('round-trip — prefillFromEvents picks the most recent matching event', () => {
    const entries = buildCustomFieldEntries(['flow'], [flowDecl()]);
    const events = [
      { type: 'note/txt', streamIds: ['stormm-woman-custom-flow'], content: 'light', time: 100 },
      { type: 'note/txt', streamIds: ['stormm-woman-custom-flow'], content: 'heavy', time: 300 },
      { type: 'note/txt', streamIds: ['stormm-woman-custom-flow'], content: 'medium', time: 200 }
    ];
    const values = prefillFromEvents(entries, events);
    expect(values['__cf::stormm-woman::flow']).toBe('heavy');
  });

  it('round-trip — mixed canonical + custom-field entries do not interfere', () => {
    const cfEntries = buildCustomFieldEntries(['flow'], [flowDecl()]);
    const canonical = {
      key: 'body-weight',
      itemDef: {
        data: { type: 'number', label: { en: 'Weight' }, eventType: 'mass/kg', streamId: 'body-weight' },
        eventTemplate: () => ({ streamIds: ['body-weight'], type: 'mass/kg' })
      } as any
    };
    const events = [
      { type: 'note/txt', streamIds: ['stormm-woman-custom-flow'], content: 'medium', time: 100 },
      { type: 'mass/kg', streamIds: ['body-weight'], content: 70, time: 100 }
    ];
    const values = prefillFromEvents([canonical, ...cfEntries], events);
    expect(values['body-weight']).toBe(70);
    expect(values['__cf::stormm-woman::flow']).toBe('medium');
  });
});
