import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../../theme';
import { ACCENT, RECORD_GOLD } from '../../utils/color';
import { formatTime } from '../../utils/time';
import type { DayRef } from './DayTooltip';

export type ChartPoint = { date: string; time: number; ts: number };

type Props = {
  data: ChartPoint[];
  avg: number;
  allTimeWorst: number;
  allTimeBest: number;
  width: number;
  selectedDate: string | null;
  getColor: (score: number) => string;
  onSelectDay: (day: DayRef) => void;
};

const CHART_HEIGHT = 170;
const PAD = {
  l: scale(20),
  r: 12,
  t: 4,
  b: 22,
};

export default function TrendChart({
  data, avg, allTimeWorst, allTimeBest, width, selectedDate, getColor, onSelectDay,
}: Props) {
  const height = scale(CHART_HEIGHT);

  const scales = useMemo(() => {
    if (data.length < 2) return null;
    const bestTime = Math.max(...data.map(d => d.time));
    const yMin = Math.max(0, allTimeWorst - (bestTime - allTimeWorst) * 0.1); // 10% below min
    const yMax = bestTime + (bestTime - allTimeWorst) * 0.15; // 15% above max

    // Gaps longer than ~3 weeks (an empty month or more between sessions)
    // get capped instead of spent proportionally, so a long pause doesn't
    // eat up horizontal space with nothing to show for it.
    const GAP_CAP_MS = 21 * 24 * 60 * 60 * 1000;
    const cx = [0];
    for (let i = 1; i < data.length; i++) {
      const gap = Math.min(data[i].ts - data[i - 1].ts, GAP_CAP_MS);
      cx.push(cx[i - 1] + Math.max(gap, 0));
    }
    const cxMax = cx[cx.length - 1] || 1;

    const xAt = (i: number) =>
      PAD.l + (cx[i] / cxMax) * (width - PAD.l - PAD.r);
    const y = (t: number) =>
      PAD.t + (1 - (t - yMin) / (yMax - yMin || 1)) * (height - PAD.t - PAD.b);

    // Moving average trend curve (window = 20% of points)
    const window = Math.max(3, Math.ceil(data.length * 0.2));
    const linePath = data.map((_, i) => {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.floor(window / 2) + 1);
      const slice = data.slice(start, end);
      const smoothed = slice.reduce((s, d) => s + d.time, 0) / slice.length;
      return `${xAt(i)},${y(smoothed)}`;
    }).join(' ');

    return {
      xAt,
      y,
      yMax,
      yMin,
      linePath,
    };
  }, [data, allTimeWorst, width, height]);

  if (!scales) return null;
  const { xAt, y, yMax, yMin, linePath } = scales;

  const gridVals: number[] = [];
  const step = Math.max(5, Math.round((yMax - yMin) / 4 / 5) * 5);
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) gridVals.push(v);

  const selectedIdx = selectedDate ? data.findIndex(d => d.date === selectedDate) : -1;
  const selectedPt = selectedIdx >= 0 ? data[selectedIdx] : undefined;

  // react-native-svg's web touchable mixin crashes Rect/G on web; onClick
  // bypasses it there, but only onPress fires on native.
  const pressHandlerKey = Platform.OS === 'web' ? 'onClick' : 'onPress';

  return (
    <View style={styles.card}>
      {/* @ts-ignore */}
      <Svg width={width} height={height} overflow="visible">
        {gridVals.map(val => (
          <React.Fragment key={val}>
            <Line x1={PAD.l} y1={y(val)} x2={width - PAD.r} y2={y(val)} stroke="#2a2a2a" strokeWidth={0.5} />
            <SvgText x={PAD.l - 4} y={y(val) + 4} fill={COLORS.muted} fontSize={ms(8, 0.8)} textAnchor="end">
              {formatTime(val)}
            </SvgText>
          </React.Fragment>
        ))}
        <SvgText x={PAD.l} y={height - 6} fill={COLORS.muted} fontSize={ms(10, 0.8)} textAnchor="start">
          {data[0].date.slice(5)}
        </SvgText>
        <SvgText x={width - PAD.r} y={height - 6} fill={COLORS.muted} fontSize={ms(10, 0.8)} textAnchor="end">
          {data[data.length - 1].date.slice(5)}
        </SvgText>
        {/* Average line */}
        <Line
          x1={PAD.l}
          y1={y(avg)}
          x2={width - PAD.r}
          y2={y(avg)}
          stroke={COLORS.ghost}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        {/* Trend curve */}
        <Polyline points={linePath} fill="none" stroke={ACCENT} strokeWidth={1} opacity={0.5} />
        {/* Scatter points — record day gets the gold star */}
        {data.map((d, i) => (
          <G key={i}>
            <Rect
              x={xAt(i) - 10}
              y={y(d.time) - 10}
              width={20}
              height={20}
              fill="transparent"
              {...{
                [pressHandlerKey]: () => onSelectDay({
                  date: d.date,
                  duration: d.time,
                }),
              }}
            />
            {d.time === allTimeBest
              ? (
                  // Selected record: the star itself turns white (no ring)
                  <SvgText
                    x={xAt(i)}
                    y={y(d.time) + 4}
                    fill={selectedDate === d.date ? COLORS.text : RECORD_GOLD}
                    fontSize={ms(11)}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    ★
                  </SvgText>
                )
              : (
                  <Circle cx={xAt(i)} cy={y(d.time)} r={3} fill={getColor(d.time)} opacity={0.8} />
                )}
          </G>
        ))}
        {selectedPt && selectedPt.time !== allTimeBest && (
          <Circle cx={xAt(selectedIdx)} cy={y(selectedPt.time)} r={4} fill="none" stroke={COLORS.text} strokeWidth={2} />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 6,
    marginBottom: 10,
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    elevation: 3,
  },
});
