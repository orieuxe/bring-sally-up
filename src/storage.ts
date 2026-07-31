import AsyncStorage from '@react-native-async-storage/async-storage';
import { Attempt, Cue } from './types';

const HISTORY_KEY = '@sally_history';
const CUES_KEY = '@sally_cues';

export async function getHistory(): Promise<Attempt[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getCustomCues(): Promise<Cue[] | null> {
  const raw = await AsyncStorage.getItem(CUES_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveCustomCues(cues: Cue[]): Promise<void> {
  await AsyncStorage.setItem(CUES_KEY, JSON.stringify(cues));
}

export async function saveAttempt(attempt: Attempt): Promise<Attempt[]> {
  const history = await getHistory();
  history.push(attempt);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

// One entry per day: replaces the day's entry only when the new time beats it.
// When rejected, returns the better duration already stored for that day.
export async function saveDailyBest(
  attempt: Attempt,
): Promise<{ saved: boolean; existing?: number }> {
  const history = await getHistory();
  const prev = history.find(a => a.date === attempt.date);
  if (prev && (attempt.duration ?? 0) <= (prev.duration ?? 0)) {
    return {
      saved: false,
      existing: prev.duration ?? 0,
    };
  }
  const next = history.filter(a => a.date !== attempt.date);
  next.push(attempt);
  next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return { saved: true };
}

export async function importRecords(records: Attempt[]): Promise<Attempt[]> {
  const existing = await getHistory();
  const merged = [...existing];
  for (const r of records) {
    const idx = merged.findIndex(e => e.date === r.date);
    if (idx === -1) {
      merged.push(r);
    } else if (typeof merged[idx].hour !== 'number' && typeof r.hour === 'number') {
      // Same date already imported (e.g. before hours were supported) —
      // backfill just the hour instead of silently skipping the line.
      merged[idx] = { ...merged[idx], hour: r.hour };
    }
  }
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
  return merged;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
