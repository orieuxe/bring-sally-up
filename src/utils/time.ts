// M:SS — the app's single time format.
export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// A day key is the user's local calendar day: a session at 23:59 belongs to the
// day their clock showed, not to whatever UTC was doing at that moment. Every
// date in storage is written and read through these two helpers, so the day
// never shifts between the calendar, the stats and the streak.
export function dayKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The inverse: local midnight, safe to call getMonth()/getDay() on. Passing the
// raw string to `new Date()` would parse it as UTC and land on the day before
// west of Greenwich.
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// "5 août 2026" — only the 1st takes an ordinal suffix in French.
export function formatDayFr(key: string): string {
  const d = parseDayKey(key);
  const text = d.toLocaleDateString('fr', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return d.getDate() === 1 ? text.replace('1 ', '1er ') : text;
}
