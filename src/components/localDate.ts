/**
 * Local calendar dates for the section form (B-2026-11-20-7). Both helpers read the runtime's own time zone,
 * which in a browser is the person's.
 */

/**
 * Today as `YYYY-MM-DD` in the local time zone. `toISOString()` gave the UTC day, so an entry made between
 * midnight and 1–2 am in Switzerland defaulted to the day before.
 */
export function todayString (now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Unix time (seconds) of local midnight on a `YYYY-MM-DD` date. `new Date('YYYY-MM-DD')` parses as UTC
 * midnight, which timed a recurring entry at 01:00/02:00 local in Switzerland and on the previous evening
 * west of UTC.
 */
export function localDateToTime (dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(new Date(y, m - 1, d).getTime() / 1000);
}
