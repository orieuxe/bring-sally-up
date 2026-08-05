import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { COLORS } from '../../theme';
import { RECORD_GOLD } from '../../utils/color';
import { formatTime, parseDayKey } from '../../utils/time';
import type { Attempt } from '../../types';

// Fallback reps estimate when the session has no cue count (imports)
const SECONDS_PER_REP = 3.4;

export type DayRef = { date: string; duration: number };

type Props = {
  day: DayRef;
  attempt: Attempt | undefined;
  avg: number;
  isRecord: boolean;
  color: string;
};

export default function DayTooltip({ day, attempt, avg, isRecord, color }: Props) {
  const date = parseDayKey(day.date);
  const hasRealReps = attempt != null && attempt.cuesCompleted > 0;
  const reps = hasRealReps
    ? String(attempt.cuesCompleted)
    : `~${Math.round(day.duration / SECONDS_PER_REP)}`;
  const diff = day.duration - avg;

  return (
    <View style={styles.tooltip}>
      <View style={styles.dateCol}>
        <View style={styles.dateRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.weekday, { fontSize: ms(11) }]}>
            {date.toLocaleDateString('fr', { weekday: 'short' }).replace('.', '')}
          </Text>
        </View>
        <Text style={[styles.dayNum, { fontSize: ms(18) }]}>{date.getDate()}</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>REPS</Text>
        <Text style={styles.val}>{reps}</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>TEMPS</Text>
        <Text style={styles.val}>{formatTime(day.duration)}</Text>
      </View>
      <View style={styles.col}>
        {isRecord
          ? (
              <Text style={[styles.val, styles.recordVal, { fontSize: ms(15) }]}>★ record</Text>
            )
          : (
              <>
                <Text style={styles.label}>MOYENNE</Text>
                <Text style={[styles.val, { color: diff >= 0 ? COLORS.good : COLORS.bad }]}>
                  {avg === 0 ? '--' : `${diff >= 0 ? '+' : ''}${Math.round(diff)}s`}
                </Text>
              </>
            )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: scale(62),
  },
  dateCol: { alignItems: 'center' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  weekday: {
    color: COLORS.grey,
    textTransform: 'capitalize',
  },
  dayNum: {
    color: COLORS.grey,
    fontWeight: '500',
  },
  recordVal: {
    color: RECORD_GOLD,
    fontWeight: '700',
  },
  col: { alignItems: 'center' },
  val: {
    fontSize: ms(18),
    fontWeight: '600',
    color: COLORS.text,
  },
  label: {
    fontSize: ms(9),
    color: COLORS.greyDim,
    marginTop: 2,
  },
});
