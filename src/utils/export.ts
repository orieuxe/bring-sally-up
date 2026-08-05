import { Platform, Share } from 'react-native';
import type { Attempt } from '../types';
import { formatTime } from './time';

// Same shape the Import screen parses, so an export can be pasted straight
// back in: "YYYY-MM-DD M:SS" plus the hour of day when it's known.
export function historyToText(history: Attempt[]): string {
  return [...history]
    .filter(a => (a.duration ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(a => [a.date, formatTime(a.duration ?? 0), a.hour ?? ''].join(' ').trim())
    .join('\n');
}

function fileName(): string {
  return `bring-sally-up-${new Date().toISOString().split('T')[0]}.txt`;
}

/**
 * Hands the history to the OS: a file download on web, the share sheet on
 * mobile. Returns false when there is nothing to export.
 */
export async function exportHistory(history: Attempt[]): Promise<boolean> {
  const text = historyToText(history);
  if (!text) return false;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoking straight away can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  }

  await Share.share({
    title: fileName(),
    message: text,
  });
  return true;
}
