import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Carousel } from 'react-native-reanimated-carousel';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { getHistory, clearHistory } from '../storage';
import type { Attempt, RootStackParamList } from '../types';
import { scoreColor, ACCENT, RECORD_GOLD } from '../utils/color';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'History'> };
const RANGES = ['1M', '6M', '1Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];
const RANGE_LABELS: Record<Range, string> = {
  '1M': '1 mois',
  '6M': '6 mois',
  '1Y': '1 an',
  'ALL': 'Tout',
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

const CHART_HEIGHT = 170;

export default function HistoryScreen({ navigation }: Props) {
  const [history, setHistory] = useState<Attempt[]>([]);
  const [range, setRange] = useState<Range>('1M');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<{ date: string; duration: number } | null>(null);
  const carouselRef = useRef<any>(null);
  const [carouselIdx, setCarouselIdx] = useState(-1);
  const [sortBy, setSortBy] = useState<'day' | 'avg' | 'done' | 'miss' | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Heatmap generator
  const getMonthData = (offset: number) => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const scores: Record<string, number> = {};
    for (const a of history) {
      const d = new Date(a.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        scores[a.date] = a.duration ?? 0;
      }
    }
    const monthLabel = base.toLocaleDateString('fr', {
      month: 'long',
      year: 'numeric',
    });
    const cells: { day: number; score: number; label: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        day: d,
        score: scores[ds] ?? 0,
        label: ds,
      });
    }
    return {
      cells,
      firstDow,
      monthLabel,
      offset,
    };
  };

  const allMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    let minOff = 0;
    for (const a of history) {
      const d = new Date(a.date);
      const off = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
      if (off < minOff) minOff = off;
    }
    for (let off = minOff; off <= 0; off++) {
      const data = getMonthData(off);
      if (data.cells.some(c => c.score > 0)) months.push(data);
    }
    return months;
  }, [history]);

  const carouselDefaultIdx = useMemo(() => {
    return Math.max(0, allMonths.findIndex(m => m.offset === 0));
  }, [allMonths]);

  useFocusEffect(
    useCallback(() => { getHistory().then(setHistory); }, []),
  );

  // Filter by range (1M centered on selected month if swiped)
  const filtered = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const limits: Record<Range, Date> = {
      '1M': new Date(base.getFullYear(), base.getMonth(), 1),
      '6M': new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
      '1Y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      'ALL': new Date(0),
    };
    const limit = limits[range];
    if (range === '1M') {
      // Filter to only that specific month
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      return history.filter((a) => {
        const d = new Date(a.date);
        return d >= limit && d <= end;
      });
    }
    return history.filter(a => new Date(a.date) >= limit);
  }, [history, range, monthOffset]);

  const stats = useMemo(() => {
    const times = filtered.map(a => a.duration ?? 0).filter(t => t > 0);
    if (times.length === 0) {
      return {
        avg: 0,
        max: 0,
        count: 0,
      };
    }
    const sum = times.reduce((a, b) => a + b, 0);
    return {
      avg: sum / times.length,
      max: Math.max(...times),
      count: times.length,
    };
  }, [filtered]);

  const weekdayStats = useMemo(() => {
    const DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
    if (filtered.length === 0) {
      return DAYS.map(day => ({
        day,
        avg: 0,
        done: 0,
        miss: 0,
      }));
    }
    const dates = filtered.map(a => a.date);
    const minDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    // Count total occurrences of each weekday in range
    const total = Array(7).fill(0);
    const cur = new Date(minDate);
    while (cur <= maxDate) {
      total[(cur.getDay() + 6) % 7]++;
      cur.setDate(cur.getDate() + 1);
    }
    // Count sessions per weekday
    const sum = Array(7).fill(0);
    const done = Array(7).fill(0);
    for (const a of filtered) {
      const day = (new Date(a.date).getDay() + 6) % 7;
      sum[day] += a.duration ?? 0;
      done[day]++;
    }
    const rows = DAYS.map((day, i) => ({
      day,
      idx: i,
      avg: sum[i] / Math.max(done[i], 1),
      done: done[i],
      miss: total[i] - done[i],
    }));
    if (sortBy) {
      const dir = sortAsc ? 1 : -1;
      rows.sort((a, b) => {
        const val = sortBy === 'day' ? a.idx - b.idx : (a[sortBy] as number) - (b[sortBy] as number);
        return val * dir;
      });
    }
    return rows;
  }, [filtered, sortBy, sortAsc]);

  // Scatter + trend data
  const chartData = useMemo(() => {
    return filtered
      .filter(a => (a.duration ?? 0) > 0)
      .map(a => ({
        date: a.date,
        time: a.duration ?? 0,
        ts: new Date(a.date).getTime(),
      }))
      .sort((a, b) => a.ts - b.ts);
  }, [filtered]);

  const chartWidth = screenWidth - 40;
  const chartHeight = scale(CHART_HEIGHT);
  const pad = {
    l: scale(20),
    r: 12,
    t: 4,
    b: 22,
  };

  const scatterPoints = useMemo(() => {
    if (chartData.length < 2) {
      return {
        points: [],
        trend: '',
        avgY: 0,
        maxY: 0,
        minY: 0,
        minX: 0,
        maxX: 0,
      };
    }
    const times = chartData.map(d => d.time);
    const allTimes = history.filter(a => (a.duration ?? 0) > 0).map(a => a.duration ?? 0);
    const minY = Math.min(...allTimes);
    const maxY = Math.max(...times);
    const yScale = maxY + (maxY - minY) * 0.15; // 15% padding above max
    const yBase = Math.max(0, minY - (maxY - minY) * 0.1); // 10% padding below min
    const yRange = yScale - yBase || 1;
    const minX = chartData[0].ts;
    const maxX = chartData[chartData.length - 1].ts;
    const xRange = maxX - minX || 1;

    const pt = (x: number, y: number) =>
      `${pad.l + ((x - minX) / xRange) * (chartWidth - pad.l - pad.r)},${pad.t + (1 - (y - yBase) / yRange) * (chartHeight - pad.t - pad.b)}`;

    // Moving average for trend curve (window = 20% of data points)
    const window = Math.max(3, Math.ceil(chartData.length * 0.2));
    const smoothed = chartData.map((_, i) => {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(chartData.length, i + Math.floor(window / 2) + 1);
      const slice = chartData.slice(start, end);
      const avgTime = slice.reduce((s, d) => s + d.time, 0) / slice.length;
      return {
        ts: chartData[i].ts,
        time: avgTime,
      };
    });
    const linePath = smoothed.map(d => pt(d.ts, d.time)).join(' ');

    return {
      linePath,
      maxY: yScale,
      minY: yBase,
      minX,
      maxX,
      avgY: stats.avg,
    };
  }, [chartData, stats]);

  const getHeatColor = (score: number) => scoreColor(score, stats.avg);

  const allTimeBest = useMemo(() => {
    return Math.max(0, ...history.map(a => a.duration ?? 0));
  }, [history]);

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

  const selectedMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

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

  const handleClear = () => {
    const doClear = async () => {
      await clearHistory();
      setHistory([]);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Effacer l\'historique ?')) doClear();
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Effacer', 'Tous les scores seront supprimés.', [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: doClear,
        },
      ]);
    }
  };

  const exportCSV = () => {
    const rows = [['date', 'duree', 'completed'].join(',')];
    for (const a of history) {
      rows.push([a.date, a.duration ?? 0, a.completed ? '1' : '0'].join(','));
    }
    if (Platform.OS === 'web') {
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bring-sally-up.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (history.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucun score</Text>
        <Text style={styles.emptySub}>Lance ton premier challenge</Text>
      </View>
    );
  }

  return (
    // maxHeight pins the filter bar to the viewport on web (body scrolls there)
    <View style={[styles.container, { maxHeight: screenHeight }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backLink, { fontSize: ms(13) }]}>← retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Period summary — reflects the active filter */}
        <View style={styles.statsCard}>
          <Text style={[styles.periodLabel, { fontSize: ms(10) }]}>{periodLabel}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { fontSize: ms(22) }]}>{stats.count}</Text>
              <Text style={[styles.statLabel, { fontSize: ms(10) }]}>sessions</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { fontSize: ms(22) }]}>{formatTime(Math.round(stats.avg))}</Text>
              <Text style={[styles.statLabel, { fontSize: ms(10) }]}>moyenne</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { fontSize: ms(22) }]}>{formatTime(stats.max)}</Text>
              <Text style={[styles.statLabel, { fontSize: ms(10) }]}>
                {range === 'ALL' ? 'record' : 'meilleur'}
              </Text>
            </View>
          </View>
        </View>

        {/* Day tooltip — always filled (latest session by default) */}
        {shownDay && (
          <View style={styles.tooltip}>
            <View style={{ alignItems: 'center' }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
              >
                <View style={[styles.tooltipDot, { backgroundColor: getHeatColor(shownDay.duration) }]} />
                <Text style={{
                  color: '#888',
                  fontSize: ms(11),
                  textTransform: 'capitalize',
                }}
                >
                  {new Date(shownDay.date).toLocaleDateString('fr', { weekday: 'short' }).replace('.', '')}
                </Text>
              </View>
              <Text style={{
                color: '#888',
                fontSize: ms(18),
                fontWeight: '500',
              }}
              >
                {new Date(shownDay.date).getDate()}
              </Text>
              {shownDay.duration === allTimeBest && (
                <Text style={[styles.tooltipRecord, { fontSize: ms(9) }]}>★ record</Text>
              )}
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>REPS</Text>
              <Text style={styles.tooltipVal}>
                {shownAttempt && shownAttempt.cuesCompleted > 0
                  ? shownAttempt.cuesCompleted
                  : Math.round((shownDay.duration ?? 0) / 3.4)}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>TEMPS</Text>
              <Text style={styles.tooltipVal}>{formatTime(shownDay.duration)}</Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>MOYENNE</Text>
              <Text style={[styles.tooltipVal, {
                color: (shownDay.duration ?? 0) >= stats.avg ? '#4caf50' : '#e25a5a',
              }]}
              >
                {(() => {
                  if (stats.avg === 0) return '--';
                  const diff = (shownDay.duration ?? 0) - stats.avg;
                  const sign = diff >= 0 ? '+' : '';
                  return `${sign}${Math.round(diff)}s`;
                })()}
              </Text>
            </View>
          </View>
        )}

        {/* Calendar carousel — only months with data */}
        {allMonths.length > 0 && (
          <View style={{
            height: scale(260),
            flexDirection: 'row',
            alignItems: 'center',
          }}
          >
            <TouchableOpacity
              onPress={() => carouselRef.current?.prev()}
              disabled={carouselIdx === 0}
              style={{ opacity: carouselIdx === 0 ? 0.2 : 0.6 }}
            >
              <Text style={{
                color: '#888',
                fontSize: ms(40),
              }}
              >
                ‹
              </Text>
            </TouchableOpacity>
            <Carousel
              ref={carouselRef}
              style={{
                flex: 1,
                height: scale(260),
              }}
              data={allMonths}
              defaultIndex={carouselDefaultIdx}
              itemSize={Math.min(screenWidth - 60, scale(340))}
              onSnapToItem={(idx: number) => {
                setMonthOffset(allMonths[idx].offset);
                setRange('1M');
                setSelectedDay(null);
                setCarouselIdx(idx);
              }}
              renderItem={({ item: hm }: { item: ReturnType<typeof getMonthData> }) => (
                <View style={styles.heatPage}>
                  <Text style={[styles.monthLabel, { fontSize: ms(14, 0.8) }]}>{hm.monthLabel}</Text>
                  <View style={[styles.heatmapGrid, { width: scale(270) }]}>
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                      <View
                        key={i}
                        style={[styles.dayLabelCell, {
                          width: scale(36),
                          height: scale(14),
                        }]}
                      >
                        <Text style={[styles.dayLabel, { fontSize: ms(9) }]}>{d}</Text>
                      </View>
                    ))}
                    {Array.from({ length: hm.firstDow === 0 ? 6 : hm.firstDow - 1 }).map((_, i) => (
                      <View
                        key={`pad-${hm.offset}-${i}`}
                        style={[styles.heatCell, {
                          width: scale(36),
                          height: scale(36),
                          borderRadius: scale(4),
                        }]}
                      />
                    ))}
                    {hm.cells.map((c: { day: number; score: number; label: string }) => (
                      <TouchableOpacity
                        key={c.label}
                        style={[styles.heatCell, {
                          backgroundColor: getHeatColor(c.score),
                          width: scale(36),
                          height: scale(36),
                          borderRadius: scale(4),
                          ...(selectedDay?.date === c.label && c.score > 0
                            ? {
                                borderWidth: 3,
                                borderColor: '#fff',
                              }
                            : {}),
                        }]}
                        onPress={() => c.score > 0
                          ? setSelectedDay({
                              date: c.label,
                              duration: c.score,
                            })
                          : setSelectedDay(null)}
                        activeOpacity={c.score > 0 ? 0.7 : 1}
                      >
                        {c.score > 0 && c.score === allTimeBest && (
                          <Text style={[styles.recordStar, { fontSize: ms(11) }]}>★</Text>
                        )}
                        <Text style={[styles.heatCellText, c.score > 0 && styles.heatCellTextActive, { fontSize: ms(10) }]}>{c.day}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            />
            <TouchableOpacity
              onPress={() => carouselRef.current?.next()}
              disabled={carouselIdx === allMonths.length - 1 || carouselIdx === -1}
              style={{ opacity: carouselIdx === allMonths.length - 1 || carouselIdx === -1 ? 0.1 : 0.6 }}
            >
              <Text style={{
                color: '#888',
                fontSize: ms(40),
              }}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Trend chart */}
        {chartData.length >= 2 && (
          <View style={styles.chartSection}>
            {/* @ts-ignore */}
            <Svg width={chartWidth} height={chartHeight} overflow="visible">
              {/* Y-axis grid lines + labels */}
              {(() => {
                const { maxY: yMax, minY: yMin } = scatterPoints;
                const step = Math.max(5, Math.round((yMax - yMin) / 4 / 5) * 5);
                const vals: number[] = [];
                for (let v = Math.ceil(yMin / step) * step; v <= yMax + step / 2; v += step) vals.push(v);
                return vals.map((val) => {
                  const y = pad.t + (1 - (val - yMin) / (yMax - yMin || 1)) * (chartHeight - pad.t - pad.b);
                  return (
                    <React.Fragment key={val}>
                      <Line x1={pad.l} y1={y} x2={chartWidth - pad.r} y2={y} stroke="#2a2a2a" strokeWidth={0.5} />
                      <SvgText x={pad.l - 4} y={y + 4} fill="#888" fontSize={ms(8, 0.8)} textAnchor="end">{formatTime(val)}</SvgText>
                    </React.Fragment>
                  );
                });
              })()}
              {/* X-axis: first + last date only */}
              {(() => {
                const first = chartData[0];
                const last = chartData[chartData.length - 1];
                const fDate = first.date.slice(5);
                const lDate = last.date.slice(5);
                return (
                  <>
                    <SvgText x={pad.l} y={chartHeight - 6} fill="#888" fontSize={ms(10, 0.8)} textAnchor="start">{fDate}</SvgText>
                    <SvgText x={chartWidth - pad.r} y={chartHeight - 6} fill="#888" fontSize={ms(10, 0.8)} textAnchor="end">{lDate}</SvgText>
                  </>
                );
              })()}
              {/* Avg line */}
              <Line
                x1={pad.l}
                y1={pad.t + (1 - (stats.avg - scatterPoints.minY) / ((scatterPoints.maxY - scatterPoints.minY) || 1)) * (chartHeight - pad.t - pad.b)}
                x2={chartWidth - pad.r}
                y2={pad.t + (1 - (stats.avg - scatterPoints.minY) / ((scatterPoints.maxY - scatterPoints.minY) || 1)) * (chartHeight - pad.t - pad.b)}
                stroke="#333"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              {/* Trend curve */}
              <Polyline points={scatterPoints.linePath} fill="none" stroke={ACCENT} strokeWidth={1} opacity={0.5} />
              {/* Scatter points */}
              {chartData.map((d, i) => {
                const x = pad.l + ((d.ts - scatterPoints.minX) / (scatterPoints.maxX - scatterPoints.minX || 1)) * (chartWidth - pad.l - pad.r);
                const y = pad.t + (1 - (d.time - scatterPoints.minY) / ((scatterPoints.maxY - scatterPoints.minY) || 1)) * (chartHeight - pad.t - pad.b);
                return (
                  <G
                    key={i}
                    onPress={() => setSelectedDay({
                      date: d.date,
                      duration: d.time,
                    })}
                  >
                    <Rect x={x - 10} y={y - 10} width={20} height={20} fill="transparent" />
                    {d.time === allTimeBest
                      ? (
                          <SvgText x={x} y={y + 4} fill={RECORD_GOLD} fontSize={ms(11)} fontWeight="bold" textAnchor="middle">★</SvgText>
                        )
                      : (
                          <Circle cx={x} cy={y} r={3} fill={getHeatColor(d.time)} opacity={0.8} />
                        )}
                  </G>
                );
              })}
              {/* Highlight selected day */}
              {selectedDay && chartData.find(d => d.date === selectedDay.date) && (() => {
                const pt = chartData.find(d => d.date === selectedDay.date)!;
                const x = pad.l + ((pt.ts - scatterPoints.minX) / (scatterPoints.maxX - scatterPoints.minX || 1)) * (chartWidth - pad.l - pad.r);
                const y = pad.t + (1 - (pt.time - scatterPoints.minY) / ((scatterPoints.maxY - scatterPoints.minY) || 1)) * (chartHeight - pad.t - pad.b);
                return <Circle cx={x} cy={y} r={4} fill="none" stroke={ACCENT} strokeWidth={2} />;
              })()}
            </Svg>
          </View>
        )}

        {/* List */}

        <View style={styles.sessionsCard}>
          <Text style={[styles.sectionTitle, {
            fontSize: ms(10),
            marginLeft: 14,
            marginTop: 10,
            marginBottom: 6,
          }]}
          >
            par jour de la semaine
          </Text>
          <View style={styles.thRow}>
            <Text style={[styles.th, { fontSize: ms(10) }]} onPress={() => { setSortBy('day'); setSortAsc(sortBy === 'day' ? !sortAsc : false); }}>
              jour
              {' '}
              {sortBy === 'day' ? (sortAsc ? '▲' : '▼') : ''}
            </Text>
            <Text style={[styles.th, { fontSize: ms(10) }]} onPress={() => { setSortBy('done'); setSortAsc(sortBy === 'done' ? !sortAsc : false); }}>
              fait
              {' '}
              {sortBy === 'done' ? (sortAsc ? '▲' : '▼') : ''}
            </Text>
            <Text style={[styles.th, { fontSize: ms(10) }]} onPress={() => { setSortBy('miss'); setSortAsc(sortBy === 'miss' ? !sortAsc : false); }}>
              raté
              {' '}
              {sortBy === 'miss' ? (sortAsc ? '▲' : '▼') : ''}
            </Text>
            <Text style={[styles.th, { fontSize: ms(10) }]} onPress={() => { setSortBy('avg'); setSortAsc(sortBy === 'avg' ? !sortAsc : false); }}>
              moyenne
              {' '}
              {sortBy === 'avg' ? (sortAsc ? '▲' : '▼') : ''}
            </Text>
          </View>
          {(() => {
            const bestDone = Math.max(...weekdayStats.map(d => d.done));
            const worstDone = Math.min(...weekdayStats.map(d => d.done));
            const bestAvg = Math.max(...weekdayStats.map(d => d.avg));
            const worstAvg = Math.min(...weekdayStats.map(d => d.done > 0 ? d.avg : Infinity));
            return weekdayStats.map((d, i) => (
              <View key={d.day} style={[styles.row, i === weekdayStats.length - 1 && styles.rowLast]}>
                <Text style={[styles.cell, {
                  fontSize: ms(12),
                  fontWeight: '600',
                  color: '#888',
                }]}
                >
                  {d.day}
                </Text>
                <Text style={[styles.cellNum, {
                  fontSize: ms(13),
                  color: d.done === bestDone && bestDone > 0 ? '#4caf50' : d.done === worstDone ? '#e25a5a' : '#ccc',
                }]}
                >
                  {d.done}
                </Text>
                <Text style={[styles.cellNum, { fontSize: ms(13) }]}>{d.miss}</Text>
                <Text style={[styles.cellNum, {
                  fontSize: ms(13),
                  color: d.done > 0 && d.avg === bestAvg ? '#4caf50' : d.done > 0 && d.avg === worstAvg ? '#e25a5a' : '#ccc',
                }]}
                >
                  {formatTime(Math.round(d.avg))}
                </Text>
              </View>
            ));
          })()}
        </View>

      </ScrollView>

      {/* Rare actions — behind the ⋯ button of the bottom bar */}
      {showActions && (
        <View style={styles.actionsSheet}>
          {([
            ['effacer', handleClear],
            ['importer', () => navigation.navigate('Import')],
            ['exporter', exportCSV],
          ] as [string, () => void][]).map(([label, action]) => (
            <TouchableOpacity
              key={label}
              style={styles.actionBtn}
              onPress={() => { setShowActions(false); action(); }}
            >
              <Text style={[styles.clearBtnText, { fontSize: ms(12) }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sticky filter bar — thumb zone */}
      <View style={styles.bottomBar}>
        {RANGES.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
            onPress={() => setRange(r)}
          >
            <Text
              style={[styles.rangeText, { fontSize: ms(12) }, range === r && styles.rangeTextActive]}
              numberOfLines={1}
            >
              {rangeLabel(r)}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.moreBtn, showActions && styles.moreBtnActive]}
          onPress={() => setShowActions(s => !s)}
        >
          <Text style={styles.moreBtnText}>⋯</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16161a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backLink: { color: '#aaa' },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1c1c22',
    alignItems: 'center',
  },
  rangeBtnActive: { backgroundColor: ACCENT },
  rangeText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  rangeTextActive: { color: '#16161a' },
  // Sticky filter bar (thumb zone)
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#121216',
    borderTopWidth: 1,
    borderTopColor: '#26262d',
  },
  moreBtn: {
    width: scale(38),
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1c1c22',
    alignItems: 'center',
  },
  moreBtnActive: { backgroundColor: '#2a2a33' },
  moreBtnText: {
    fontSize: 16,
    lineHeight: 16,
    color: '#888',
    fontWeight: '700',
  },
  actionsSheet: {
    position: 'absolute',
    right: 12,
    bottom: scale(58),
    backgroundColor: '#22222a',
    borderRadius: 12,
    paddingVertical: 4,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    elevation: 6,
  },
  actionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statsCard: {
    backgroundColor: '#1c1c22',
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  periodLabel: {
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingBottom: 4,
  },
  stat: { alignItems: 'center' },
  statVal: {
    fontSize: 22,
    fontWeight: '500',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    color: '#555',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  // Heatmap
  heatPage: {
    alignItems: 'center',
    paddingTop: 4,
  },
  monthLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 6,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  dayLabelCell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  dayLabel: { color: '#444' },
  heatCell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heatCellText: { color: '#333' },
  recordStar: {
    position: 'absolute',
    top: scale(1),
    left: 0,
    right: 0,
    textAlign: 'center',
    color: RECORD_GOLD,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 2,
  },
  heatCellTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  tooltip: {
    backgroundColor: '#1c1c22',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: scale(62),
  },
  tooltipDate: {
    fontSize: ms(11),
    color: '#888',
    marginBottom: 4,
    textAlign: 'center',
  },
  tooltipRow: { alignItems: 'center' },
  tooltipVal: {
    fontSize: ms(18),
    fontWeight: '600',
    color: '#fff',
  },
  tooltipLabel: {
    fontSize: ms(9),
    color: '#555',
    marginTop: 2,
  },
  tooltipDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  tooltipRecord: {
    color: RECORD_GOLD,
    fontWeight: '700',
    marginTop: 1,
  },
  // Chart
  chartSection: {
    backgroundColor: '#1c1c22',
    borderRadius: 16,
    padding: 6,
    marginBottom: 10,
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    elevation: 3,
  },
  // List rows
  sessionsCard: {
    backgroundColor: '#1c1c22',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  rowLast: { borderBottomWidth: 0 },
  rowDate: {
    color: '#555',
    fontVariant: ['tabular-nums'],
  },
  rowTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ccc',
    fontVariant: ['tabular-nums'],
  },
  thRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  th: {
    flex: 1,
    textAlign: 'center',
    color: '#555',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
  },
  cellNum: {
    flex: 1,
    textAlign: 'center',
    color: '#ccc',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  clearBtnText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  // Empty
  empty: {
    flex: 1,
    backgroundColor: '#16161a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '300',
    color: '#666',
  },
  emptySub: {
    fontSize: 13,
    color: '#444',
    marginTop: 4,
  },
});
