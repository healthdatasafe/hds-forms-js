import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { settings } from 'hds-lib';
import { CONVERSATION_TEXTS } from '../src/conversation/conversationTexts';
import { sinceText } from '../src/conversation/elapsed';

/** Since when, with its article (plan 138): the texts of each language carry it, the code says which one. */
const at = (day: number, h: number, min: number) => new Date(2026, 10, day, h, min).getTime() / 1000;
const NOW = at(25, 18, 0);
const KEYS = ['time.sinceTime', 'time.sinceTimeOne', 'time.sinceDay', 'time.sinceDayVowel'] as const;
const texts = CONVERSATION_TEXTS as Record<string, Record<string, string>>;

describe('[SNCE] since when, said with its article', () => {
  beforeEach(() => { KEYS.forEach((k) => { texts[k] = { ...texts[k], it: `IT ${k} {moment}` }; }); });
  afterEach(() => {
    KEYS.forEach((k) => { const { it: _it, ...rest } = texts[k]; texts[k] = rest; });
    settings.setPreferredLocales(['en']);
  });

  it('[SNCE1] English and French', () => {
    settings.setPreferredLocales(['en']);
    expect(sinceText(at(25, 14, 30), NOW, 'en-GB')).toBe('since 14:30');
    expect(sinceText(at(23, 14, 30), NOW, 'en-GB')).toBe('since 23 November at 14:30');
    settings.setPreferredLocales(['fr']);
    expect(sinceText(at(25, 14, 30), NOW, 'fr')).toBe('depuis 14:30');
    expect(sinceText(at(23, 14, 30), NOW, 'fr')).toBe('depuis le 23 novembre à 14:30');
  });

  it('[SNCE2] a time, one o\'clock as the locale writes it, a day, the 8 and the 11', () => {
    settings.setPreferredLocales(['it']);
    const key = (t: number, locale = 'it') => sinceText(t, NOW, locale).split(' ')[1];
    expect(key(at(25, 14, 30))).toBe('time.sinceTime');
    expect(key(at(25, 1, 5))).toBe('time.sinceTimeOne');
    expect(key(at(25, 13, 5))).toBe('time.sinceTime');
    expect(key(at(25, 13, 5), 'es-MX')).toBe('time.sinceTimeOne');
    expect(key(at(25, 11, 5))).toBe('time.sinceTime');
    for (const [day, want] of [[23, 'time.sinceDay'], [1, 'time.sinceDay'], [18, 'time.sinceDay'], [8, 'time.sinceDayVowel'], [11, 'time.sinceDayVowel']] as const) expect(key(at(day, 1, 5))).toBe(want);
  });

  it('[SNCE3] an unknown locale formats in the host\'s', () => {
    settings.setPreferredLocales(['en']);
    expect(sinceText(at(25, 14, 30), NOW, 'not_a_locale')).toMatch(/^since \d/);
  });

  it('[SNCE4] no text keeps the old {moment} but the four', () => {
    expect(Object.entries(texts).filter(([, t]) => Object.values(t).some((v) => v.includes('{moment}'))).map(([k]) => k)).toEqual([...KEYS]);
  });
});
