import type { Attempt } from '../types';
import { dayKey, parseDayKey } from './time';

function shiftKey(key: string, days: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

export interface StreakInfo {
  /** Days in a row up to today — kept alive until today is over. */
  current: number;
  /** Longest run ever, all history. */
  best: number;
  /** Last day of that longest run, `YYYY-MM-DD`. */
  bestEnd: string | null;
  doneToday: boolean;
}

export function computeStreak(history: Attempt[], now: Date = new Date()): StreakInfo {
  const done = new Set<string>();
  for (const a of history) {
    if ((a.duration ?? 0) > 0) done.add(a.date.slice(0, 10));
  }

  const today = dayKey(now);
  const doneToday = done.has(today);

  // Today still counts as "in progress": start yesterday when it isn't done yet,
  // so a streak only breaks once a full day has been missed.
  let current = 0;
  let cursor = doneToday ? today : shiftKey(today, -1);
  while (done.has(cursor)) {
    current++;
    cursor = shiftKey(cursor, -1);
  }

  const keys = [...done].sort();
  let best = 0;
  let bestEnd: string | null = null;
  let run = 0;
  for (let i = 0; i < keys.length; i++) {
    run = i > 0 && shiftKey(keys[i], -1) === keys[i - 1] ? run + 1 : 1;
    // `>=` so an ongoing run that ties the record shows today's date
    if (run >= best) {
      best = run;
      bestEnd = keys[i];
    }
  }

  return {
    current,
    best,
    bestEnd,
    doneToday,
  };
}
