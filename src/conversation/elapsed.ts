import { useEffect, useState } from 'react';
import { tx } from './labels';

/**
 * The time, in seconds, moving by itself: every second under an hour from `sinceS` (a counter), then every minute. Stands
 * still without `sinceS`, or when the host gives its own `nowS`.
 */
export function useNowS (sinceS: number | null | undefined, nowS?: number): number {
  const [own, setOwn] = useState(() => Date.now() / 1000);
  const moves = sinceS != null && nowS == null;
  const slow = sinceS != null && own - sinceS >= 3600;
  useEffect(() => {
    if (!moves) return undefined;
    const id = setInterval(() => setOwn(Date.now() / 1000), slow ? 60_000 : 1000);
    return () => clearInterval(id);
  }, [moves, slow]);
  return nowS ?? own;
}

/** A counter as a clock writes it: "0:42", "12:05", "1:02:05"; never below 0 (a device's clock behind the server's) */
export function counterText (seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const two = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}

/** How long, in words, rounded down: "12 min", "3 h", "2 days" (the largest unit alone) */
export function durationText (seconds: number): string {
  const min = Math.max(0, Math.floor(seconds / 60));
  if (min < 60) return tx('time.minutes', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return tx('time.hours', { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? tx('time.dayOne') : tx('time.days', { n: d });
}

/** How long a wait lasts: exact to the minute, then "over an hour" (a waiting contact says so again, and the time restarts) */
export function waitText (seconds: number): string {
  return seconds < 3600 ? durationText(seconds) : tx('time.overHour');
}

/** Since when, for a screen reader: "since 14:30" today, "since 23 November at 14:30" else; it does not change as time passes */
export function sinceText (timeS: number, nowS: number, locale?: string): string {
  const d = new Date(timeS * 1000);
  const sameDay = d.toDateString() === new Date(nowS * 1000).toDateString();
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', ...(sameDay ? {} : { day: 'numeric', month: 'long' }) };
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat(locale, opts);
  } catch {
    format = new Intl.DateTimeFormat(undefined, opts);
  }
  const moment = format.format(d);
  if (!sameDay) return tx(d.getDate() === 8 || d.getDate() === 11 ? 'time.sinceDayVowel' : 'time.sinceDay', { moment });
  const hour = Number(format.formatToParts(d).find((p) => p.type === 'hour')?.value);
  return tx(hour === 1 ? 'time.sinceTimeOne' : 'time.sinceTime', { moment });
}
