import type { Attempt } from '../types';

export const RANGES = ['1M', '6M', '1Y', 'ALL'] as const;
export type Range = (typeof RANGES)[number];
export const RANGE_LABELS: Record<Range, string> = {
  '1M': '1 mois',
  '6M': '6 mois',
  '1Y': '1 an',
  'ALL': 'Tout',
};

export interface MonthData {
  cells: { day: number; score: number; label: string }[];
  firstDow: number;
  monthLabel: string;
  year: number;
  month: number; // 1-indexed
}

export function getMonthData(history: Attempt[], year: number, month: number): MonthData {
  const base = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = base.getDay();
  const scores: Record<string, number> = {};
  for (const a of history) {
    const d = new Date(a.date);
    if (d.getFullYear() === year && d.getMonth() === month - 1) {
      scores[a.date] = a.duration ?? 0;
    }
  }
  const monthLabel = base.toLocaleDateString('fr', {
    month: 'long',
    year: 'numeric',
  });
  const cells: MonthData['cells'] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      day: d,
      score: scores[ds] ?? 0,
      label: ds,
    });
  }
  return {
    cells,
    firstDow,
    monthLabel,
    year,
    month,
  };
}

// Every month between the oldest session and now that has at least one score.
export function buildMonths(history: Attempt[]): MonthData[] {
  const seen = new Map<string, { year: number; month: number }>();
  for (const a of history) {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) seen.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return [...seen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, m]) => getMonthData(history, m.year, m.month))
    .filter(m => m.cells.some(c => c.score > 0));
}

export function filterByRange(
  history: Attempt[],
  range: Range,
  targetMonth: { year: number; month: number },
): Attempt[] {
  const now = new Date();
  if (range === '1M') {
    const base = new Date(targetMonth.year, targetMonth.month - 1, 1);
    const end = new Date(targetMonth.year, targetMonth.month, 0);
    return history.filter(a => {
      const d = new Date(a.date);
      return d >= base && d <= end;
    });
  }
  const limits: Record<Exclude<Range, '1M'>, Date> = {
    '6M': new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
    '1Y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    'ALL': new Date(0),
  };
  const limit = limits[range];
  return history.filter(a => new Date(a.date) >= limit);
}

export interface PeriodStats {
  avg: number;
  max: number;
  count: number;
}

export function computeStats(attempts: Attempt[]): PeriodStats {
  const times = attempts.map(a => a.duration ?? 0).filter(t => t > 0);
  if (times.length === 0) {
    return {
      avg: 0,
      max: 0,
      count: 0,
    };
  }
  const sum = times.reduce((a, b) => a + b, 0);
  return {
    avg: sum / times.length,
    max: Math.max(...times),
    count: times.length,
  };
}

export interface WeekdayRow {
  day: string;
  idx: number;
  avg: number;
  done: number;
  miss: number;
}

export function computeWeekdayStats(attempts: Attempt[]): WeekdayRow[] {
  const DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  if (attempts.length === 0) {
    return DAYS.map((day, idx) => ({
      day,
      idx,
      avg: 0,
      done: 0,
      miss: 0,
    }));
  }
  const dates = attempts.map(a => a.date);
  const minDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
  // Total occurrences of each weekday in the range (monday-first indexing)
  const total = Array(7).fill(0);
  const cur = new Date(minDate);
  while (cur <= maxDate) {
    total[(cur.getDay() + 6) % 7]++;
    cur.setDate(cur.getDate() + 1);
  }
  const sum = Array(7).fill(0);
  const done = Array(7).fill(0);
  for (const a of attempts) {
    const day = (new Date(a.date).getDay() + 6) % 7;
    sum[day] += a.duration ?? 0;
    done[day]++;
  }
  return DAYS.map((day, i) => ({
    day,
    idx: i,
    avg: sum[i] / Math.max(done[i], 1),
    done: done[i],
    miss: total[i] - done[i],
  }));
}
