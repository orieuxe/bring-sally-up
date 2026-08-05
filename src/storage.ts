import AsyncStorage from '@react-native-async-storage/async-storage';
import { Attempt } from './types';

const HISTORY_KEY = '@sally_history';

export async function getHistory(): Promise<Attempt[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
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

// Imported records replace whatever is already stored for that date.
export async function importRecords(records: Attempt[]): Promise<Attempt[]> {
  const existing = await getHistory();
  const merged = existing.filter(e => !records.some(r => r.date === e.date));
  merged.push(...records);
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
  return merged;
}

// Drops a single day's entry — the one-session counterpart of clearHistory.
export async function deleteAttempt(date: string): Promise<Attempt[]> {
  const history = await getHistory();
  const next = history.filter(a => a.date !== date);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
