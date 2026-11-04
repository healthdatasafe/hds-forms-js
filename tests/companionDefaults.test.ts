import { describe, it, expect } from 'vitest';
import { extractCompanionDefaults, type CompanionSchema } from '../src/schema/companionFields';

/**
 * A pre-filled companion key is locked read-only, so it must only take a value its schema accepts: datasets-service
 * returns `route: null` / `doseUnit: null` for many medications, and a locked `intake.route: null` made the saved
 * event invalid (string + enum) with no way for the user to change it.
 */
const companions: CompanionSchema = {
  datasourceProp: 'drug',
  hidden: [],
  companions: [{
    key: 'intake',
    schema: {
      type: 'object',
      properties: {
        doseValue: { type: 'number' },
        doseUnit: { type: 'string', enum: ['dose/tablet', 'volume/ml'] },
        route: { type: 'string', enum: ['oral', 'parenteral', 'otic'] },
        note: { type: 'string' }
      }
    }
  }]
};

describe('[CPD] extractCompanionDefaults', () => {
  it('[CPD-1] copies values the companion field accepts', () => {
    expect(extractCompanionDefaults(companions, { route: 'oral', doseUnit: 'dose/tablet', label: { en: 'x' } }))
      .toEqual({ intake: { route: 'oral', doseUnit: 'dose/tablet' } });
  });

  it('[CPD-2] skips null and undefined: nothing to pre-fill, nothing locked', () => {
    expect(extractCompanionDefaults(companions, { route: null, doseUnit: null })).toEqual({});
    expect(extractCompanionDefaults(companions, { route: null, doseUnit: 'volume/ml' })).toEqual({ intake: { doseUnit: 'volume/ml' } });
  });

  it('[CPD-3] skips a value outside the field\'s enum', () => {
    expect(extractCompanionDefaults(companions, { route: 'intrathecal', doseUnit: 'dose/tablet' })).toEqual({ intake: { doseUnit: 'dose/tablet' } });
  });

  it('[CPD-4] a field without enum takes any non-null value', () => {
    expect(extractCompanionDefaults(companions, { note: '', doseValue: 0 })).toEqual({ intake: { note: '', doseValue: 0 } });
  });
});
