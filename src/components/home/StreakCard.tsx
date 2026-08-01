import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { COLORS } from '../../theme';
import { ACCENT, ACCENT_RGB } from '../../utils/color';
import type { StreakInfo } from '../../utils/streak';

type Props = { streak: StreakInfo };

// Streak counter + the last 7 days at a glance. Today is outlined while it's
// still to do, filled once the session is done.
export default function StreakCard({ streak }: Props) {
  const alive = streak.current > 0;
  const dot = scale(22);

  return (
    <View style={[styles.card, {
      paddingHorizontal: scale(20),
      paddingVertical: scale(14),
      borderRadius: scale(16),
    }]}
    >
      <View style={styles.head}>
        <View style={styles.countRow}>
          <Text style={[styles.flame, { fontSize: ms(20) }, !alive && styles.flameOff]}>🔥</Text>
          <Text style={[styles.count, { fontSize: ms(28) }, !alive && styles.countOff]}>
            {streak.current}
          </Text>
          <Text style={[styles.unit, { fontSize: ms(12) }]}>
            {streak.current > 1 ? 'jours de suite' : 'jour de suite'}
          </Text>
        </View>
        {streak.best > 0 && (
          <Text style={[styles.best, { fontSize: ms(11) }]}>
            record
            {' '}
            {streak.best}
          </Text>
        )}
      </View>

      <View style={[styles.week, { gap: scale(6) }]}>
        {streak.week.map(d => (
          <View key={d.key} style={styles.day}>
            <View
              style={[
                styles.dot,
                {
                  width: dot,
                  height: dot,
                  borderRadius: dot / 2,
                },
                d.done && styles.dotDone,
                d.today && !d.done && styles.dotToday,
              ]}
            />
            <Text style={[styles.dayLabel, { fontSize: ms(9) }, d.today && styles.dayLabelToday]}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.card,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    elevation: 4,
    marginBottom: 28,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  flame: { opacity: 1 },
  flameOff: { opacity: 0.3 },
  count: {
    fontWeight: '300',
    color: ACCENT,
    fontVariant: ['tabular-nums'],
  },
  countOff: { color: COLORS.faint },
  unit: {
    color: COLORS.hint,
    letterSpacing: 1,
  },
  best: {
    color: COLORS.faint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    backgroundColor: COLORS.emptyCell,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dotDone: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    boxShadow: `0 0 8px rgba(${ACCENT_RGB},0.45)`,
  },
  dotToday: {
    borderColor: ACCENT,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  dayLabel: {
    color: COLORS.faint,
    textTransform: 'uppercase',
  },
  dayLabelToday: { color: COLORS.muted },
});
