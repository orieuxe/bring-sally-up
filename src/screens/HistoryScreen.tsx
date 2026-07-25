import React, { useState, useCallback, useMemo } from "react";
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
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { getHistory, clearHistory } from "../storage";
import type { Attempt, RootStackParamList } from "../types";

type Props = { navigation: StackNavigationProp<RootStackParamList, "History"> };
type Range = "1M" | "6M" | "1Y" | "ALL";

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
    for (let off = -11; off <= 0; off++) months.push(getMonthData(off));
    return months;
  }, [history]);

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

  const chartWidth = screenWidth - 48;
  const chartHeight = CHART_HEIGHT;
  const pad = { l: 34, r: 2, t: 8, b: 26 };

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
          <Text style={styles.backLink}>← retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Calendar carousel — independent, always all data */}
        {allMonths.length > 0 && (
          <View style={{ height: 260 }}>
            <Carousel
              style={{ width: screenWidth, height: 260 }}
              data={allMonths}
              defaultIndex={11}
              itemSize={screenWidth - 60}
              onSnapToItem={(idx: number) => {
                setMonthOffset(idx - 11);
                setRange("1M");
              }}
              renderItem={({ item: hm }: { item: ReturnType<typeof getMonthData> }) => (
                <View style={styles.heatPage}>
                  <Text style={styles.monthLabel}>{hm.monthLabel}</Text>
                  <View style={styles.heatmapGrid}>
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                      <View key={i} style={styles.dayLabelCell}><Text style={styles.dayLabel}>{d}</Text></View>
                    ))}
                    {Array.from({ length: hm.firstDow === 0 ? 6 : hm.firstDow - 1 }).map((_, i) => (
                      <View key={`pad-${hm.offset}-${i}`} style={styles.heatCell} />
                    ))}
                    {hm.cells.map((c: { day: number; score: number; label: string }) => (
                      <View key={c.label} style={[styles.heatCell, { backgroundColor: getHeatColor(c.score) }]}>
                        <Text style={[styles.heatCellText, c.score > 0 && styles.heatCellTextActive]}>{c.day}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            />
          </View>
        )}
        <View style={styles.legend}>
          <Text style={styles.legendText}>bas</Text>
          <View style={[styles.legendBox, { backgroundColor: "#542e2e" }]} />
          <View style={[styles.legendBox, { backgroundColor: "#7a4a1e" }]} />
          <View style={[styles.legendBox, { backgroundColor: "#4a6e2a" }]} />
          <View style={[styles.legendBox, { backgroundColor: "#38a636" }]} />
          <Text style={styles.legendText}>haut</Text>
        </View>

        {/* Trend chart */}
        {chartData.length >= 2 && (
          <View style={styles.chartSection}>
            <View style={styles.trendHeader}>
              <Text style={styles.sectionTitle}>tendance</Text>
              <View style={styles.rangeRow}>
                {(["1M", "6M", "1Y", "ALL"] as Range[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
                    onPress={() => setRange(r)}
                  >
                    <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Svg width={chartWidth} height={chartHeight}>
              {/* Y-axis grid lines + labels (auto-scale) */}
              {(() => {
                const { maxY: yMax, minY: yMin } = scatterPoints;
                const step = Math.max(5, Math.round((yMax - yMin) / 4 / 5) * 5);
                const vals: number[] = [];
                for (let v = Math.ceil(yMin / step) * step; v <= yMax + step / 2; v += step) vals.push(v);
                return vals.map((val) => {
                  const y = pad.t + (1 - (val - yMin) / (yMax - yMin || 1)) * (chartHeight - pad.t - pad.b);
                  return (
                    <React.Fragment key={`y-${val}`}>
                      <Line x1={pad.l} y1={y} x2={chartWidth - pad.r} y2={y} stroke="#2a2a2a" strokeWidth={0.5} />
                      <SvgText x={pad.l - 4} y={y + 4} fill="#777" fontSize={10} textAnchor="end">{formatTime(val)}</SvgText>
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
                    <SvgText x={pad.l} y={chartHeight - 6} fill="#777" fontSize={10} textAnchor="start">{fDate}</SvgText>
                    <SvgText x={chartWidth - pad.r} y={chartHeight - 6} fill="#777" fontSize={10} textAnchor="end">{lDate}</SvgText>
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
              <Polyline points={scatterPoints.linePath} fill="none" stroke="#e2b714" strokeWidth={2} />
              {/* Scatter points */}
              {chartData.map((d, i) => {
                const x = pad.l + ((d.ts - scatterPoints.minX) / (scatterPoints.maxX - scatterPoints.minX || 1)) * (chartWidth - pad.l - pad.r);
                const y = pad.t + (1 - (d.time - scatterPoints.minY) / ((scatterPoints.maxY - scatterPoints.minY) || 1)) * (chartHeight - pad.t - pad.b);
                return (
                  <Circle key={i} cx={x} cy={y} r={3} fill="#e2b714" opacity={0.8} />
                );
              })}
            </Svg>
          </View>
        )}

        {/* List */}
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{stats.count}</Text>
            <Text style={styles.statLabel}>sessions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{formatTime(Math.round(stats.avg))}</Text>
            <Text style={styles.statLabel}>moyenne</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{formatTime(stats.max)}</Text>
            <Text style={styles.statLabel}>record</Text>
          </View>
        </View>

        <View style={styles.sessionsCard}>
        {filtered.map((item, i) => (
          <View key={i} style={[styles.row, i === filtered.length - 1 && styles.rowLast]}>
            <Text style={styles.rowDate}>{item.date}</Text>
            <Text style={styles.rowTime}>{formatTime(item.duration ?? 0)}</Text>
            <View style={styles.rowBar}>
              <View style={[styles.barFill, { width: `${Math.min(100, ((item.duration ?? 0) / (stats.max || 1)) * 100)}%`, backgroundColor: item.completed ? "#e2b714" : "#444" }]} />
            </View>
          </View>
        ))}
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearBtnText}>effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={() => navigation.navigate("Import")}>
            <Text style={styles.clearBtnText}>importer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#16161a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backLink: {
    fontSize: 13, color: "#aaa",
    backgroundColor: "#1c1c22", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    overflow: "hidden",
  },
  trendHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8 },
  rangeRow: { flexDirection: "row", gap: 4 },
  rangeBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
    backgroundColor: "#1c1c22",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
  },
  rangeBtnActive: { backgroundColor: "#e2b714" },
  rangeText: { fontSize: 11, color: "#555", fontWeight: "600" },
  rangeTextActive: { color: "#16161a" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  statsRow: {
    flexDirection: "row", justifyContent: "space-around", marginVertical: 16,
    backgroundColor: "#1c1c22", borderRadius: 16, paddingVertical: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  stat: { alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "500", color: "#fff", fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 10, color: "#555", textTransform: "uppercase", marginTop: 2 },
  sectionTitle: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1 },
  // Heatmap
  heatPage: { alignItems: "center", paddingTop: 4 },
  monthLabel: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, fontWeight: "600", marginBottom: 6 },
  heatmapGrid: { flexDirection: "row", flexWrap: "wrap", width: 7 * 36 + 6 * 3, gap: 3 },
  dayLabelCell: { width: 36, height: 14, alignItems: "center", justifyContent: "center", marginBottom: 1 },
  dayLabel: { fontSize: 9, color: "#444" },
  heatCell: { width: 36, height: 36, borderRadius: 4, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  heatCellText: { fontSize: 10, color: "#333" },
  heatCellTextActive: { color: "#fff", fontWeight: "600" },
  legend: { flexDirection: "row", justifyContent: "flex-start", alignItems: "center", gap: 4, marginBottom: 8 },
  legendBox: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 9, color: "#555" },
  // Chart
  chartSection: {
    marginTop: 8, backgroundColor: "#1c1c22", borderRadius: 16, padding: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  // List rows
  sessionsCard: {
    backgroundColor: "#1c1c22", borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  row: {
    flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingHorizontal: 14, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "#222",
  },
  rowLast: { borderBottomWidth: 0 },
  rowDate: { fontSize: 12, color: "#555", width: 85, fontVariant: ["tabular-nums"] },
  rowTime: { fontSize: 14, fontWeight: "500", color: "#ccc", width: 48, fontVariant: ["tabular-nums"] },
  rowBar: { flex: 1, height: 3, backgroundColor: "#1a1a1a", borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  // Clear
  bottomRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 16 },
  clearBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
    backgroundColor: "#1c1c22", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
  },
  clearBtnText: { fontSize: 13, color: "#888", fontWeight: "500" },
  // Empty
  empty: { flex: 1, backgroundColor: "#16161a", alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18, fontWeight: "300", color: "#666" },
  emptySub: { fontSize: 13, color: "#444", marginTop: 4 },
});
