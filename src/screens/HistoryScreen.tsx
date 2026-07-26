import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Carousel } from "react-native-reanimated-carousel";
import { moderateScale as ms, scale } from "react-native-size-matters";
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { getHistory, clearHistory } from "../storage";
import type { Attempt, RootStackParamList } from "../types";

type Props = { navigation: StackNavigationProp<RootStackParamList, "History"> };
const RANGES = ["1M", "6M", "1Y", "ALL"] as const;
type Range = (typeof RANGES)[number];
const RANGE_LABELS: Record<Range, string> = { "1M": "1 mois", "6M": "6 mois", "1Y": "1 an", ALL: "Tout" };

const COLORS = ["#1a1a1a", "#3d2020", "#6b3812", "#3d5c20", "#2d8f2d"];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

const CHART_HEIGHT = 170;

export default function HistoryScreen({ navigation }: Props) {
  const [history, setHistory] = useState<Attempt[]>([]);
  const [range, setRange] = useState<Range>("1M");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<{ date: string; duration: number } | null>(null);
  const carouselRef = useRef<any>(null);
  const [carouselIdx, setCarouselIdx] = useState(-1);
  const [sortBy, setSortBy] = useState<"day" | "avg" | "done" | "miss" | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

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
    const monthLabel = base.toLocaleDateString("fr", { month: "long", year: "numeric" });
    const cells: { day: number; score: number; label: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, score: scores[ds] ?? 0, label: ds });
    }
    return { cells, firstDow, monthLabel, offset };
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
    useCallback(() => { getHistory().then(setHistory); }, [])
  );

  // Filter by range (1M centered on selected month if swiped)
  const filtered = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const limits: Record<Range, Date> = {
      "1M": new Date(base.getFullYear(), base.getMonth(), 1),
      "6M": new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
      "1Y": new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      ALL: new Date(0),
    };
    const limit = limits[range];
    if (range === "1M") {
      // Filter to only that specific month
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      return history.filter((a) => {
        const d = new Date(a.date);
        return d >= limit && d <= end;
      });
    }
    return history.filter((a) => new Date(a.date) >= limit);
  }, [history, range, monthOffset]);

  const stats = useMemo(() => {
    const times = filtered.map((a) => a.duration ?? 0).filter((t) => t > 0);
    if (times.length === 0) return { avg: 0, max: 0, count: 0 };
    const sum = times.reduce((a, b) => a + b, 0);
    return { avg: sum / times.length, max: Math.max(...times), count: times.length };
  }, [filtered]);

  const weekdayStats = useMemo(() => {
    const DAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
    if (filtered.length === 0) return DAYS.map((day) => ({ day, avg: 0, done: 0, miss: 0 }));
    const dates = filtered.map((a) => a.date);
    const minDate = new Date(Math.min(...dates.map((d) => new Date(d).getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
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
      day, idx: i, avg: sum[i] / Math.max(done[i], 1), done: done[i], miss: total[i] - done[i],
    }));
    if (sortBy) {
      const dir = sortAsc ? 1 : -1;
      rows.sort((a, b) => {
        const val = sortBy === "day" ? a.idx - b.idx : (a[sortBy] as number) - (b[sortBy] as number);
        return val * dir;
      });
    }
    return rows;
  }, [filtered, sortBy, sortAsc]);

  // Scatter + trend data
  const chartData = useMemo(() => {
    return filtered
      .filter((a) => (a.duration ?? 0) > 0)
      .map((a) => ({
        date: a.date,
        time: a.duration ?? 0,
        ts: new Date(a.date).getTime(),
      }))
      .sort((a, b) => a.ts - b.ts);
  }, [filtered]);

  const chartWidth = screenWidth - 40;
  const chartHeight = scale(CHART_HEIGHT);
  const pad = { l: scale(20), r: 12, t: 4, b: 22 };

  const scatterPoints = useMemo(() => {
    if (chartData.length < 2) return { points: [], trend: "", avgY: 0, maxY: 0, minY: 0, minX: 0, maxX: 0 };
    const times = chartData.map((d) => d.time);
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
      return { ts: chartData[i].ts, time: avgTime };
    });
    const linePath = smoothed.map((d) => pt(d.ts, d.time)).join(" ");

    return { linePath, maxY: yScale, minY: yBase, minX, maxX, avgY: stats.avg };
  }, [chartData, stats]);

  const getHeatColor = (score: number) => {
    if (score === 0) return COLORS[0];
    const ratio = stats.avg > 0 ? Math.min(score / stats.avg, 1.5) : 0;

    // Interpolate across 4 color stops (ratio 0→1.5+)
    const stops = [
      { r: 0.20, color: [0x54, 0x2e, 0x2e] },  // red   @ ratio 0.2
      { r: 0.50, color: [0x7a, 0x4a, 0x1e] },  // orange @ ratio 0.5
      { r: 0.85, color: [0x4a, 0x6e, 0x2a] },  // olive  @ ratio 0.85
      { r: 1.20, color: [0x38, 0xa6, 0x36] },  // green  @ ratio 1.2
    ];

    // Find surrounding stops
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (ratio >= stops[i].r && ratio <= stops[i + 1].r) {
        lo = stops[i]; hi = stops[i + 1]; break;
      }
    }
    if (ratio <= stops[0].r) { lo = stops[0]; hi = stops[0]; }
    if (ratio >= stops[stops.length - 1].r) { lo = stops[stops.length - 1]; hi = stops[stops.length - 1]; }

    const t = hi.r !== lo.r ? (ratio - lo.r) / (hi.r - lo.r) : 0;
    const r = Math.round(lo.color[0] + (hi.color[0] - lo.color[0]) * t);
    const g = Math.round(lo.color[1] + (hi.color[1] - lo.color[1]) * t);
    const b = Math.round(lo.color[2] + (hi.color[2] - lo.color[2]) * t);
    return `rgb(${r},${g},${b})`;
  };

  const handleClear = () => {
    const doClear = async () => { await clearHistory(); setHistory([]); };
    if (Platform.OS === "web") {
      if (window.confirm("Effacer l'historique ?")) doClear();
    } else {
      const { Alert } = require("react-native");
      Alert.alert("Effacer", "Tous les scores seront supprimés.", [
        { text: "Annuler", style: "cancel" },
        { text: "Effacer", style: "destructive", onPress: doClear },
      ]);
    }
  };

  const exportCSV = () => {
    const rows = [["date", "duree", "completed"].join(",")];
    for (const a of history) {
      rows.push([a.date, a.duration ?? 0, a.completed ? "1" : "0"].join(","));
    }
    if (Platform.OS === "web") {
      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "bring-sally-up.csv"; a.click();
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backLink, { fontSize: ms(13) }]}>← retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Day tooltip — always visible at top */}
        <View style={styles.tooltip}>
          {selectedDay ? (
            <>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#888", fontSize: ms(11), textTransform: "capitalize" }}>
                  {new Date(selectedDay.date).toLocaleDateString("fr", { weekday: "short" }).replace(".", "")}
                </Text>
                <Text style={{ color: "#888", fontSize: ms(18), fontWeight: "500" }}>
                  {new Date(selectedDay.date).getDate()}
                </Text>
              </View>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>REPS</Text>
                <Text style={styles.tooltipVal}>
                  {Math.round((selectedDay.duration ?? 0) / 3.4)}
                </Text>
              </View>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>TEMPS</Text>
                <Text style={styles.tooltipVal}>{formatTime(selectedDay.duration)}</Text>
              </View>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>MOYENNE</Text>
                <Text style={[styles.tooltipVal, {
                  color: (selectedDay.duration ?? 0) >= stats.avg ? "#4caf50" : "#e25a5a",
                }]}>
                  {(() => {
                    if (stats.avg === 0) return "--";
                    const diff = (selectedDay.duration ?? 0) - stats.avg;
                    const sign = diff >= 0 ? "+" : "";
                    return `${sign}${Math.round(diff)}s`;
                  })()}
                </Text>
              </View>
            </>
          ) : (
            <Text style={{ color: "#555", fontSize: ms(12), textAlign: "center", width: "100%" }}>
              cliquer sur un jour pour le voir en détails
            </Text>
          )}
        </View>

        {/* Calendar carousel — only months with data */}
        {allMonths.length > 0 && (
          <View style={{ height: scale(260), flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => carouselRef.current?.prev()}
              disabled={carouselIdx === 0}
              style={{ opacity: carouselIdx === 0 ? 0.2 : 0.6 }}
            >
              <Text style={{ color: "#888", fontSize: ms(40) }}>‹</Text>
            </TouchableOpacity>
            <Carousel
              ref={carouselRef}
              style={{ flex: 1, height: scale(260) }}
              data={allMonths}
              defaultIndex={carouselDefaultIdx}
              itemSize={Math.min(screenWidth - 60, scale(340))}
              onSnapToItem={(idx: number) => {
                setMonthOffset(allMonths[idx].offset);
                setRange("1M");
                setSelectedDay(null);
                setCarouselIdx(idx);
              }}
              renderItem={({ item: hm }: { item: ReturnType<typeof getMonthData> }) => (
                <View style={styles.heatPage}>
                  <Text style={[styles.monthLabel, { fontSize: ms(14, 0.8) }]}>{hm.monthLabel}</Text>
                  <View style={[styles.heatmapGrid, { width: scale(270) }]}>
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                      <View key={i} style={[styles.dayLabelCell, { width: scale(36), height: scale(14) }]}>
                        <Text style={[styles.dayLabel, { fontSize: ms(9) }]}>{d}</Text>
                      </View>
                    ))}
                    {Array.from({ length: hm.firstDow === 0 ? 6 : hm.firstDow - 1 }).map((_, i) => (
                      <View key={`pad-${hm.offset}-${i}`} style={[styles.heatCell, { width: scale(36), height: scale(36), borderRadius: scale(4) }]} />
                    ))}
                    {hm.cells.map((c: { day: number; score: number; label: string }) => (
                      <TouchableOpacity
                        key={c.label}
                        style={[styles.heatCell, { backgroundColor: getHeatColor(c.score), width: scale(36), height: scale(36), borderRadius: scale(4) }]}
                        onPress={() => c.score > 0 ? setSelectedDay({ date: c.label, duration: c.score }) : setSelectedDay(null)}
                        activeOpacity={c.score > 0 ? 0.7 : 1}
                      >
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
              <Text style={{ color: "#888", fontSize: ms(40) }}>›</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Trend chart */}
        {chartData.length >= 2 && (
          <View style={styles.chartSection}>
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
                <Text style={[styles.statLabel, { fontSize: ms(10) }]}>record</Text>
              </View>
            </View>
            <View style={styles.rangeRow}>
              {RANGES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
                  onPress={() => setRange(r)}
                >
                  <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>
                    {RANGE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
                x1={pad.l} y1={pad.t + (1 - (stats.avg - scatterPoints.minY) / ((scatterPoints.maxY - scatterPoints.minY) || 1)) * (chartHeight - pad.t - pad.b)}
                x2={chartWidth - pad.r}
                y2={pad.t + (1 - (stats.avg - scatterPoints.minY) / ((scatterPoints.maxY - scatterPoints.minY) || 1)) * (chartHeight - pad.t - pad.b)}
                stroke="#333" strokeWidth={1} strokeDasharray="4,4"
              />
              {/* Trend curve */}
              <Polyline points={scatterPoints.linePath} fill="none" stroke="#e2b714" strokeWidth={1} opacity={0.5} />
              {/* Scatter points */}
              {chartData.map((d, i) => {
                const x = pad.l + ((d.ts - scatterPoints.minX) / (scatterPoints.maxX - scatterPoints.minX || 1)) * (chartWidth - pad.l - pad.r);
                const y = pad.t + (1 - (d.time - scatterPoints.minY) / ((scatterPoints.maxY - scatterPoints.minY) || 1)) * (chartHeight - pad.t - pad.b);
                return (
                  <G key={i} onPress={() => setSelectedDay({ date: d.date, duration: d.time })}>
                    <Rect x={x - 10} y={y - 10} width={20} height={20} fill="transparent" />
                    <Circle cx={x} cy={y} r={3} fill={getHeatColor(d.time)} opacity={0.8} />
                  </G>
                );
              })}
              {/* Highlight selected day */}
              {selectedDay && chartData.find(d => d.date === selectedDay.date) && (() => {
                const pt = chartData.find(d => d.date === selectedDay.date)!;
                const x = pad.l + ((pt.ts - scatterPoints.minX) / (scatterPoints.maxX - scatterPoints.minX || 1)) * (chartWidth - pad.l - pad.r);
                const y = pad.t + (1 - (pt.time - scatterPoints.minY) / ((scatterPoints.maxY - scatterPoints.minY) || 1)) * (chartHeight - pad.t - pad.b);
                return <Circle cx={x} cy={y} r={4} fill="none" stroke="#e2b714" strokeWidth={2} />;
              })()}
            </Svg>
          </View>
        )}

        {/* List */}

        <View style={styles.sessionsCard}>
          <Text style={[styles.sectionTitle, { fontSize: ms(10), marginLeft: 14, marginTop: 10, marginBottom: 6 }]}>par jour de la semaine</Text>
          <View style={styles.thRow}>
            <Text style={[styles.th, { fontSize: ms(10) }]} onPress={() => { setSortBy("day"); setSortAsc(sortBy === "day" ? !sortAsc : false); }}>
              jour {sortBy === "day" ? (sortAsc ? "▲" : "▼") : ""}
            </Text>
            <Text style={[styles.th, { fontSize: ms(10) }]} onPress={() => { setSortBy("done"); setSortAsc(sortBy === "done" ? !sortAsc : false); }}>
              fait {sortBy === "done" ? (sortAsc ? "▲" : "▼") : ""}
            </Text>
            <Text style={[styles.th, { fontSize: ms(10) }]} onPress={() => { setSortBy("miss"); setSortAsc(sortBy === "miss" ? !sortAsc : false); }}>
              raté {sortBy === "miss" ? (sortAsc ? "▲" : "▼") : ""}
            </Text>
            <Text style={[styles.th, { fontSize: ms(10) }]} onPress={() => { setSortBy("avg"); setSortAsc(sortBy === "avg" ? !sortAsc : false); }}>
              moyenne {sortBy === "avg" ? (sortAsc ? "▲" : "▼") : ""}
            </Text>
          </View>
          {(() => {
            const bestDone = Math.max(...weekdayStats.map(d => d.done));
            const worstDone = Math.min(...weekdayStats.map(d => d.done));
            const bestAvg = Math.max(...weekdayStats.map(d => d.avg));
            const worstAvg = Math.min(...weekdayStats.map(d => d.done > 0 ? d.avg : Infinity));
            return weekdayStats.map((d, i) => (
              <View key={d.day} style={[styles.row, i === weekdayStats.length - 1 && styles.rowLast]}>
                <Text style={[styles.cell, { fontSize: ms(12), fontWeight: "600", color: "#888" }]}>{d.day}</Text>
                <Text style={[styles.cellNum, { fontSize: ms(13), color: d.done === bestDone && bestDone > 0 ? "#4caf50" : d.done === worstDone ? "#e25a5a" : "#ccc" }]}>{d.done}</Text>
                <Text style={[styles.cellNum, { fontSize: ms(13) }]}>{d.miss}</Text>
                <Text style={[styles.cellNum, { fontSize: ms(13), color: d.done > 0 && d.avg === bestAvg ? "#4caf50" : d.done > 0 && d.avg === worstAvg ? "#e25a5a" : "#ccc" }]}>
                  {formatTime(Math.round(d.avg))}
                </Text>
              </View>
            ));
          })()}
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={[styles.clearBtn, { paddingHorizontal: scale(20), paddingVertical: scale(10), borderRadius: scale(20) }]}
            onPress={handleClear}
          >
            <Text style={[styles.clearBtnText, { fontSize: ms(12) }]}>effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.clearBtn, { paddingHorizontal: scale(20), paddingVertical: scale(10), borderRadius: scale(20) }]}
            onPress={() => navigation.navigate("Import")}
          >
            <Text style={[styles.clearBtnText, { fontSize: ms(12) }]}>importer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.clearBtn, { paddingHorizontal: scale(20), paddingVertical: scale(10), borderRadius: scale(20) }]}
            onPress={exportCSV}
          >
            <Text style={[styles.clearBtnText, { fontSize: ms(12) }]}>exporter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#16161a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backLink: { color: "#aaa" },
  rangeRow: { flexDirection: "row", gap: 8, justifyContent: "center", width: "100%", marginVertical: 8 },
  rangeBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 8, marginBottom: 10,
    backgroundColor: "#1c1c22", alignItems: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)", elevation: 2,
  },
  rangeBtnActive: { backgroundColor: "#e2b714" },
  rangeText: { fontSize: 13, color: "#555", fontWeight: "600" },
  rangeTextActive: { color: "#16161a" },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  statsRow: {
    flexDirection: "row", justifyContent: "space-around", paddingTop: 10, paddingBottom: 4,
  },
  stat: { alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "500", color: "#fff", fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 10, color: "#555", textTransform: "uppercase", marginTop: 2 },
  // Heatmap
  heatPage: { alignItems: "center", paddingTop: 4 },
  monthLabel: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, fontWeight: "600", marginBottom: 6 },
  heatmapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  dayLabelCell: { alignItems: "center", justifyContent: "center", marginBottom: 1 },
  dayLabel: { color: "#444" },
  heatCell: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  heatCellText: { color: "#333" },
  heatCellTextActive: { color: "#fff", fontWeight: "600" },
  legend: { flexDirection: "row", justifyContent: "flex-start", alignItems: "center", gap: 4, marginBottom: 8 },
  tooltip: {
    backgroundColor: "#1c1c22", borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    minHeight: scale(62),
  },
  tooltipDate: { fontSize: ms(11), color: "#888", marginBottom: 4, textAlign: "center" },
  tooltipRow: { alignItems: "center" },
  tooltipVal: { fontSize: ms(18), fontWeight: "600", color: "#fff" },
  tooltipLabel: { fontSize: ms(9), color: "#555", marginTop: 2 },
  // Chart
  chartSection: {
    backgroundColor: "#1c1c22", borderRadius: 16, padding: 6, marginBottom: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)", elevation: 3,
  },
  // List rows
  sessionsCard: {
    backgroundColor: "#1c1c22", borderRadius: 16, overflow: "hidden",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)", elevation: 3,
  },
  row: {
    flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingHorizontal: 14, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "#222",
  },
  rowLast: { borderBottomWidth: 0 },
  rowDate: { color: "#555", fontVariant: ["tabular-nums"] },
  rowTime: { fontSize: 14, fontWeight: "500", color: "#ccc", fontVariant: ["tabular-nums"] },
  thRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#222" },
  th: { flex: 1, textAlign: "center", color: "#555", fontWeight: "600", textTransform: "uppercase" },
  cell: { flex: 1, textAlign: "center" },
  cellNum: { flex: 1, textAlign: "center", color: "#ccc", fontVariant: ["tabular-nums"] },
  sectionTitle: { color: "#888", textTransform: "uppercase", letterSpacing: 1, fontWeight: "600" },
  // Clear
  bottomRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 16 },
  clearBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
    backgroundColor: "#1c1c22", alignItems: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)", elevation: 2,
  },
  clearBtnText: { fontSize: 13, color: "#888", fontWeight: "500" },
  // Empty
  empty: { flex: 1, backgroundColor: "#16161a", alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18, fontWeight: "300", color: "#666" },
  emptySub: { fontSize: 13, color: "#444", marginTop: 4 },
});
