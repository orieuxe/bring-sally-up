import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
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
  yMinAll: number; // min duration over the WHOLE history, keeps y-scale stable
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
  data, avg, yMinAll, allTimeBest, width, selectedDate, getColor, onSelectDay,
}: Props) {
  const height = scale(CHART_HEIGHT);

  const scales = useMemo(() => {
    if (data.length < 2) return null;
    const maxY = Math.max(...data.map(d => d.time));
    const yScale = maxY + (maxY - yMinAll) * 0.15; // 15% padding above max
    const yBase = Math.max(0, yMinAll - (maxY - yMinAll) * 0.1); // 10% below min
    const minX = data[0].ts;
    const maxX = data[data.length - 1].ts;
    const x = (ts: number) =>
      PAD.l + ((ts - minX) / (maxX - minX || 1)) * (width - PAD.l - PAD.r);
    const y = (t: number) =>
      PAD.t + (1 - (t - yBase) / (yScale - yBase || 1)) * (height - PAD.t - PAD.b);

    // Moving average trend curve (window = 20% of points)
    const window = Math.max(3, Math.ceil(data.length * 0.2));
    const linePath = data.map((_, i) => {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.floor(window / 2) + 1);
      const slice = data.slice(start, end);
      const smoothed = slice.reduce((s, d) => s + d.time, 0) / slice.length;
      return `${x(data[i].ts)},${y(smoothed)}`;
    }).join(' ');

    return {
      x,
      y,
      yMax: yScale,
      yMin: yBase,
      linePath,
    };
  }, [data, yMinAll, width, height]);

  if (!scales) return null;
  const { x, y, yMax, yMin, linePath } = scales;

  const gridVals: number[] = [];
  const step = Math.max(5, Math.round((yMax - yMin) / 4 / 5) * 5);
  for (let v = Math.ceil(yMin / step) * step; v <= yMax + step / 2; v += step) gridVals.push(v);

  const selectedPt = selectedDate ? data.find(d => d.date === selectedDate) : undefined;

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
          <G
            key={i}
            onPress={() => onSelectDay({
              date: d.date,
              duration: d.time,
            })}
          >
            <Rect x={x(d.ts) - 10} y={y(d.time) - 10} width={20} height={20} fill="transparent" />
            {d.time === allTimeBest
              ? (
                  <SvgText x={x(d.ts)} y={y(d.time) + 4} fill={RECORD_GOLD} fontSize={ms(11)} fontWeight="bold" textAnchor="middle">★</SvgText>
                )
              : (
                  <Circle cx={x(d.ts)} cy={y(d.time)} r={3} fill={getColor(d.time)} opacity={0.8} />
                )}
          </G>
        ))}
        {selectedPt && (
          <Circle cx={x(selectedPt.ts)} cy={y(selectedPt.time)} r={4} fill="none" stroke={ACCENT} strokeWidth={2} />
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
