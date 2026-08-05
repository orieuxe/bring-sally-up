import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale as ms } from 'react-native-size-matters';
import { COLORS } from '../../theme';
import { formatTime } from '../../utils/time';
import type { PeriodStats } from '../../utils/history';

type Props = {
  label: string | undefined;
  stats: PeriodStats;
  maxLabel: string;
};

export default function PeriodSummary({ label, stats, maxLabel }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.periodLabel, { fontSize: ms(10) }]}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.val, { fontSize: ms(22) }]}>{stats.count}</Text>
          <Text style={[styles.label, { fontSize: ms(10) }]}>sessions</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.val, { fontSize: ms(22) }]}>{formatTime(Math.round(stats.avg))}</Text>
          <Text style={[styles.label, { fontSize: ms(10) }]}>moyenne</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.val, { fontSize: ms(22) }]}>{formatTime(stats.max)}</Text>
          <Text style={[styles.label, { fontSize: ms(10) }]}>{maxLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  periodLabel: {
    color: COLORS.grey,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingBottom: 4,
  },
  stat: { alignItems: 'center' },
  val: {
    fontWeight: '500',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  label: {
    color: COLORS.greyDim,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
