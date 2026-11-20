import { describe, it, expect, afterEach } from 'vitest';
import { todayString, localDateToTime } from '../src/components/localDate';

const savedTZ = process.env.TZ;
afterEach(() => { process.env.TZ = savedTZ; });

describe('local calendar dates (B-2026-11-20-7)', () => {
  it('[LD-1] today is the local day, not the UTC day, just after local midnight', () => {
    process.env.TZ = 'Europe/Zurich';
    // 00:30 in Zurich on 21 November is still 20 November in UTC.
    expect(todayString(new Date('2026-11-20T23:30:00Z'))).toBe('2026-11-21');
    process.env.TZ = 'America/New_York';
    // 21:00 in New York on 20 November is already 21 November in UTC.
    expect(todayString(new Date('2026-11-21T02:00:00Z'))).toBe('2026-11-20');
  });

  it('[LD-2] a date is timed at local midnight of that day', () => {
    process.env.TZ = 'Europe/Zurich';
    expect(localDateToTime('2026-11-21')).toBe(Date.UTC(2026, 10, 20, 23) / 1000);
    expect(localDateToTime('2026-07-01')).toBe(Date.UTC(2026, 5, 30, 22) / 1000);
    process.env.TZ = 'America/New_York';
    expect(localDateToTime('2026-11-21')).toBe(Date.UTC(2026, 10, 21, 5) / 1000);
  });

  it('[LD-3] the two round-trip: the time of today is on today', () => {
    process.env.TZ = 'Pacific/Auckland';
    const now = new Date('2026-11-20T12:30:00Z');
    const day = todayString(now);
    expect(todayString(new Date(localDateToTime(day) * 1000))).toBe(day);
  });
});
