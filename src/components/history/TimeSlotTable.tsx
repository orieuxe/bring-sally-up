import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale as ms } from 'react-native-size-matters';
import { COLORS } from '../../theme';
import { formatTime } from '../../utils/time';
import { computeTimeSlotStats } from '../../utils/history';
import type { Attempt } from '../../types';

type SortKey = 'slot' | 'avg' | 'done';

type Props = { attempts: Attempt[] };

export default function TimeSlotTable({ attempts }: Props) {
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo(() => {
    const base = computeTimeSlotStats(attempts);
    if (!sortBy) return base;
    const dir = sortAsc ? 1 : -1;
    return [...base].sort((a, b) => {
      const val = sortBy === 'slot' ? a.idx - b.idx : a[sortBy] - b[sortBy];
      return val * dir;
    });
  }, [attempts, sortBy, sortAsc]);

  const toggleSort = (key: SortKey) => {
    setSortBy(key);
    setSortAsc(sortBy === key ? !sortAsc : false);
  };

  const headers: [SortKey, string][] = [
    ['slot', 'tranche'],
    ['done', 'fait'],
    ['avg', 'moyenne'],
  ];

  const bestDone = Math.max(...rows.map(d => d.done));
  const worstDone = Math.min(...rows.map(d => d.done));
  const bestAvg = Math.max(...rows.map(d => d.avg));
  const worstAvg = Math.min(...rows.map(d => (d.done > 0 ? d.avg : Infinity)));

  return (
    <View style={styles.card}>
      <Text style={[styles.title, { fontSize: ms(10) }]}>par tranche horaire</Text>
      <View style={styles.thRow}>
        {headers.map(([key, label]) => (
          <Text key={key} style={[styles.th, { fontSize: ms(10) }]} onPress={() => toggleSort(key)}>
            {label}
            {' '}
            {sortBy === key ? (sortAsc ? '▲' : '▼') : ''}
          </Text>
        ))}
      </View>
      {rows.map((d, i) => {
        const doneColor = d.done === bestDone && bestDone > 0
          ? COLORS.good
          : d.done === worstDone ? COLORS.bad : COLORS.grey;
        const avgColor = d.done > 0 && d.avg === bestAvg
          ? COLORS.good
          : d.done > 0 && d.avg === worstAvg ? COLORS.bad : COLORS.grey;
        return (
          <View key={d.slot} style={[styles.row, i === rows.length - 1 && styles.rowLast]}>
            <Text style={[styles.cell, styles.slotCell, { fontSize: ms(12) }]}>{d.slot}</Text>
            <Text style={[styles.cellNum, {
              fontSize: ms(13),
              color: doneColor,
            }]}
            >
              {d.done}
            </Text>
            <Text style={[styles.cellNum, {
              fontSize: ms(13),
              color: avgColor,
            }]}
            >
              {d.done > 0 ? formatTime(Math.round(d.avg)) : '--'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    elevation: 3,
  },
  title: {
    color: COLORS.grey,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginLeft: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  thRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  th: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.greyDim,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLast: { borderBottomWidth: 0 },
  cell: {
    flex: 1,
    textAlign: 'center',
  },
  slotCell: {
    fontWeight: '600',
    color: COLORS.grey,
  },
  cellNum: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.grey,
    fontVariant: ['tabular-nums'],
  },
});
