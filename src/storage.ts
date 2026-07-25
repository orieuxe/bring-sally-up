import AsyncStorage from "@react-native-async-storage/async-storage";
import { Attempt, Cue } from "./types";

const HISTORY_KEY = "@sally_history";
const CUES_KEY = "@sally_cues";

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

export async function importRecords(records: Attempt[]): Promise<Attempt[]> {
  const existing = await getHistory();
  const merged = [...existing];
  for (const r of records) {
    if (!merged.find((e) => e.date === r.date)) {
      merged.push(r);
    }
  }
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
  return merged;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
