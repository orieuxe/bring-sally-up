import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Carousel } from 'react-native-reanimated-carousel';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { COLORS } from '../../theme';
import { RECORD_GOLD } from '../../utils/color';
import type { MonthData } from '../../utils/history';
import type { DayRef } from './DayTooltip';

type Props = {
  months: MonthData[];
  defaultIndex: number;
  selectedDate: string | null;
  allTimeBest: number;
  getColor: (score: number) => string;
  onSelectDay: (day: DayRef | null) => void;
  onMonthSnap: (offset: number) => void;
};

export default function CalendarCarousel({
  months, defaultIndex, selectedDate, allTimeBest, getColor, onSelectDay, onMonthSnap,
}: Props) {
  const carouselRef = useRef<any>(null);
  const [idx, setIdx] = useState(-1);
  const { width: screenWidth } = useWindowDimensions();

  if (months.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={() => carouselRef.current?.prev()}
        disabled={idx === 0}
        style={{ opacity: idx === 0 ? 0.2 : 0.6 }}
      >
        <Text style={styles.arrow}>‹</Text>
      </TouchableOpacity>
      <Carousel
        ref={carouselRef}
        style={{
          flex: 1,
          height: scale(260),
        }}
        data={months}
        defaultIndex={defaultIndex}
        itemSize={Math.min(screenWidth - 60, scale(340))}
        onSnapToItem={(i: number) => {
          onMonthSnap(months[i].offset);
          setIdx(i);
        }}
        renderItem={({ item: hm }: { item: MonthData }) => (
          <View style={styles.page}>
            <Text style={[styles.monthLabel, { fontSize: ms(14, 0.8) }]}>{hm.monthLabel}</Text>
            <View style={[styles.grid, { width: scale(270) }]}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <View
                  key={i}
                  style={[styles.dowCell, {
                    width: scale(36),
                    height: scale(14),
                  }]}
                >
                  <Text style={[styles.dow, { fontSize: ms(9) }]}>{d}</Text>
                </View>
              ))}
              {Array.from({ length: hm.firstDow === 0 ? 6 : hm.firstDow - 1 }).map((_, i) => (
                <View key={`pad-${hm.offset}-${i}`} style={[styles.cell, cellSize]} />
              ))}
              {hm.cells.map((c) => {
                const isSelected = selectedDate === c.label && c.score > 0;
                return (
                  <TouchableOpacity
                    key={c.label}
                    style={[styles.cell, cellSize, { backgroundColor: getColor(c.score) }]}
                    onPress={() => c.score > 0
                      ? onSelectDay({
                          date: c.label,
                          duration: c.score,
                        })
                      : onSelectDay(null)}
                    activeOpacity={c.score > 0 ? 0.7 : 1}
                  >
                    <Text
                      style={[styles.cellText, c.score > 0 && styles.cellTextActive, { fontSize: ms(10) }]}
                    >
                      {c.day}
                    </Text>
                    {c.score > 0 && c.score === allTimeBest && (
                      <Text style={[styles.star, { fontSize: ms(13) }]}>★</Text>
                    )}
                    {/* Overlay, not a border on the cell itself: selection never shifts the
                        content box the day number and star are positioned against */}
                    {isSelected && (
                      <View pointerEvents="none" style={[styles.selectionRing, cellSize]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      />
      <TouchableOpacity
        onPress={() => carouselRef.current?.next()}
        disabled={idx === months.length - 1 || idx === -1}
        style={{ opacity: idx === months.length - 1 || idx === -1 ? 0.1 : 0.6 }}
      >
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const cellSize = {
  width: scale(36),
  height: scale(36),
  borderRadius: scale(4),
};

const styles = StyleSheet.create({
  wrap: {
    height: scale(260),
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    color: COLORS.muted,
    fontSize: ms(40),
  },
  page: {
    alignItems: 'center',
    paddingTop: 4,
  },
  monthLabel: {
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  dowCell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  dow: { color: COLORS.hint },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellText: { color: COLORS.ghost },
  cellTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  star: {
    // cell has overflow:hidden, so the badge must stay inside its bounds
    position: 'absolute',
    top: scale(1),
    right: scale(3),
    color: RECORD_GOLD,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 2,
  },
  selectionRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 3,
    borderColor: COLORS.text,
  },
});
