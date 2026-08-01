import type { Attempt } from '../types';

// Attempts are stored with a UTC `YYYY-MM-DD` key (see ChallengeScreen), so all
// day arithmetic here stays in UTC to compare like with like.
function keyOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function shiftKey(key: string, days: number): string {
  const d = parseKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return keyOf(d);
}

export interface StreakDay {
  key: string;
  label: string;
  done: boolean;
  today: boolean;
}

export interface StreakInfo {
  /** Days in a row up to today — kept alive until today is over. */
  current: number;
  /** Longest run ever, all history. */
  best: number;
  doneToday: boolean;
  /** Last 7 days, oldest first. */
  week: StreakDay[];
}

export function computeStreak(history: Attempt[], now: Date = new Date()): StreakInfo {
  const done = new Set<string>();
  for (const a of history) {
    if ((a.duration ?? 0) > 0) done.add(a.date.slice(0, 10));
  }

  const today = keyOf(now);
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
  let run = 0;
  for (let i = 0; i < keys.length; i++) {
    run = i > 0 && shiftKey(keys[i], -1) === keys[i - 1] ? run + 1 : 1;
    if (run > best) best = run;
  }

  const week: StreakDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = shiftKey(today, -i);
    week.push({
      key,
      label: parseKey(key).toLocaleDateString('fr', {
        weekday: 'narrow',
        timeZone: 'UTC',
      }),
      done: done.has(key),
      today: i === 0,
    });
  }

  return {
    current,
    best,
    doneToday,
    week,
  };
}
