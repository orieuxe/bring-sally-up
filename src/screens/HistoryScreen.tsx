import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { moderateScale as ms } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { getHistory, clearHistory, deleteAttempt } from '../storage';
import type { Attempt, RootStackParamList } from '../types';
import { scoreColor } from '../utils/color';
import { COLORS } from '../theme';
import { formatDayFr, formatTime, parseDayKey } from '../utils/time';
import { exportHistory } from '../utils/export';
import {
  buildMonths,
  computeStats,
  filterByRange,
  RANGE_LABELS,
} from '../utils/history';
import type { Range } from '../utils/history';
import PeriodSummary from '../components/history/PeriodSummary';
import DayTooltip from '../components/history/DayTooltip';
import type { DayRef } from '../components/history/DayTooltip';
import CalendarCarousel from '../components/history/CalendarCarousel';
import TrendChart from '../components/history/TrendChart';
import WeekdayTable from '../components/history/WeekdayTable';
import TimeSlotTable from '../components/history/TimeSlotTable';
import FilterBar from '../components/history/FilterBar';
import DeleteSheet from '../components/history/DeleteSheet';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'History'> };

export default function HistoryScreen({ navigation }: Props) {
  const [history, setHistory] = useState<Attempt[]>([]);
  const [range, setRange] = useState<Range>('1M');
  const [targetMonth, setTargetMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedDay, setSelectedDay] = useState<DayRef | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      getHistory().then(h => {
        setHistory(h);
        // Open the summary on the month the calendar will land on: this one
        // when it has sessions, otherwise the most recent one that does —
        // the two used to disagree after a quiet start of month.
        setTargetMonth(prev => {
          const months = h.map(a => parseDayKey(a.date));
          if (months.length === 0) return prev;
          const inPrev = months.some(
            d => d.getFullYear() === prev.year && d.getMonth() + 1 === prev.month,
          );
          if (inPrev) return prev;
          const latest = new Date(Math.max(...months.map(d => d.getTime())));
          return {
            year: latest.getFullYear(),
            month: latest.getMonth() + 1,
          };
        });
      });
    }, []),
  );

  const filtered = useMemo(
    () => filterByRange(history, range, targetMonth),
    [history, range, targetMonth],
  );
  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const allMonths = useMemo(() => buildMonths(history), [history]);
  const carouselDefaultIdx = useMemo(
    () => Math.max(0, allMonths.findIndex(m => m.year === targetMonth.year && m.month === targetMonth.month)),
    [allMonths, targetMonth],
  );

  const allTimeBest = useMemo(
    () => Math.max(0, ...history.map(a => a.duration ?? 0)),
    [history],
  );
  const allTimeWorst = useMemo(() => {
    const times = history.map(a => a.duration ?? 0).filter(t => t > 0);
    return times.length > 0 ? Math.min(...times) : 0;
  }, [history]);

  const chartData = useMemo(() => {
    return filtered
      .filter(a => (a.duration ?? 0) > 0)
      .map(a => ({
        date: a.date,
        time: a.duration ?? 0,
        ts: parseDayKey(a.date).getTime(),
      }))
      .sort((a, b) => a.ts - b.ts);
  }, [filtered]);

  // Tooltip has no empty state: default to the most recent session
  const shownDay = useMemo(() => {
    if (selectedDay) return selectedDay;
    const latest = history.find(a => (a.duration ?? 0) > 0);
    return latest
      ? {
          date: latest.date,
          duration: latest.duration ?? 0,
        }
      : null;
  }, [selectedDay, history]);

  const shownAttempt = useMemo(
    () => (shownDay ? history.find(a => a.date === shownDay.date) : undefined),
    [shownDay, history],
  );

  const selectedMonth = useMemo(
    () => new Date(targetMonth.year, targetMonth.month - 1, 1),
    [targetMonth],
  );

  const periodLabel = useMemo(() => {
    if (range === '1M') {
      return selectedMonth.toLocaleDateString('fr', {
        month: 'long',
        year: 'numeric',
      });
    }
    return {
      '6M': '6 derniers mois',
      '1Y': '12 derniers mois',
      'ALL': 'depuis le début',
    }[range];
  }, [range, selectedMonth]);

  const rangeLabel = (r: Range) => {
    if (r !== '1M') return RANGE_LABELS[r];
    const now = new Date();
    return selectedMonth.getFullYear() === now.getFullYear()
      ? selectedMonth.toLocaleDateString('fr', { month: 'long' })
      : selectedMonth.toLocaleDateString('fr', {
          month: 'short',
          year: '2-digit',
        });
  };

  const getHeatColor = (score: number) => scoreColor(score, stats.avg);

  // Label of the session the tooltip is on, shown in the delete dialog.
  const shownDayLabel = useMemo(
    () => (shownDay ? `${formatDayFr(shownDay.date)} · ${formatTime(shownDay.duration)}` : null),
    [shownDay],
  );

  // One entry, and the sheet already named it — no second confirmation.
  const handleDeleteDay = async () => {
    const day = shownDay;
    setDeleting(false);
    if (!day) return;
    setHistory(await deleteAttempt(day.date));
    setSelectedDay(null);
  };

  // Wiping everything keeps its own confirmation on top of the sheet.
  const handleDeleteAll = () => {
    setDeleting(false);
    const doClear = async () => {
      await clearHistory();
      setHistory([]);
      setSelectedDay(null);
    };
    const message = 'Toutes les séances seront perdues.';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) doClear();
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Supprimer', message, [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: doClear,
        },
      ]);
    }
  };

  const handleExport = async () => {
    const ok = await exportHistory(history);
    if (!ok && Platform.OS === 'web') window.alert('Rien à exporter.');
  };

  // Reachable by wiping the history from this very screen — it needs its own
  // way back, there is no bar left to navigate from.
  if (history.length === 0) {
    return (
      <View style={[styles.emptyScreen, { paddingTop: insets.top + 4 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backLink, { fontSize: ms(13) }]}>← retour</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun score</Text>
          <Text style={styles.emptySub}>Lance ton premier challenge</Text>
        </View>
      </View>
    );
  }

  return (
    // maxHeight pins the filter bar to the viewport on web (body scrolls there)
    <View style={[styles.container, { maxHeight: screenHeight }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backLink, { fontSize: ms(13) }]}>← retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <PeriodSummary
          label={periodLabel}
          stats={stats}
          maxLabel={range === 'ALL' ? 'record' : 'meilleur'}
        />

        {shownDay && (
          <DayTooltip
            day={shownDay}
            attempt={shownAttempt}
            avg={stats.avg}
            isRecord={shownDay.duration === allTimeBest}
            color={getHeatColor(shownDay.duration)}
          />
        )}

        <CalendarCarousel
          months={allMonths}
          defaultIndex={carouselDefaultIdx}
          selectedDate={shownDay?.date ?? null}
          allTimeBest={allTimeBest}
          getColor={getHeatColor}
          onSelectDay={setSelectedDay}
          onMonthSnap={m => {
            setTargetMonth(m);
            setRange('1M');
            setSelectedDay(null);
          }}
        />

        <TrendChart
          data={chartData}
          avg={stats.avg}
          allTimeWorst={allTimeWorst}
          allTimeBest={allTimeBest}
          width={screenWidth - 40}
          range={range}
          selectedDate={shownDay?.date ?? null}
          getColor={getHeatColor}
          onSelectDay={setSelectedDay}
        />

        <WeekdayTable attempts={filtered} />
        <TimeSlotTable attempts={filtered} />
      </ScrollView>

      <FilterBar
        range={range}
        labelFor={rangeLabel}
        onRange={setRange}
        bottomInset={insets.bottom}
        actions={[
          ['supprimer', () => setDeleting(true)],
          ['exporter', handleExport],
          ['importer', () => navigation.navigate('Import')],
        ]}
      />

      <DeleteSheet
        visible={deleting}
        dayLabel={shownDayLabel}
        onDeleteDay={handleDeleteDay}
        onDeleteAll={handleDeleteAll}
        onCancel={() => setDeleting(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backLink: { color: COLORS.grey },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '300',
    color: COLORS.grey,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.greyDim,
    marginTop: 4,
  },
});
