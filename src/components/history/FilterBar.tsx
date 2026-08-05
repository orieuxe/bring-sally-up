import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { COLORS } from '../../theme';
import { ACCENT } from '../../utils/color';
import { RANGES } from '../../utils/history';
import type { Range } from '../../utils/history';

type Props = {
  range: Range;
  labelFor: (r: Range) => string;
  onRange: (r: Range) => void;
  actions: [string, () => void][];
  bottomInset?: number;
};

// Sticky bottom bar (thumb zone) with rare actions folded behind ⋯
export default function FilterBar({ range, labelFor, onRange, actions, bottomInset = 0 }: Props) {
  const [open, setOpen] = useState(false);
  // Measured so the sheet always clears the bar, whatever the safe-area inset adds.
  const [barHeight, setBarHeight] = useState(0);

  return (
    <>
      {open && <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />}
      <View
        style={[styles.bar, { paddingBottom: 6 + bottomInset }]}
        onLayout={e => setBarHeight(e.nativeEvent.layout.height)}
      >
        {RANGES.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.btn, range === r && styles.btnActive]}
            onPress={() => onRange(r)}
          >
            <Text
              style={[styles.btnText, { fontSize: ms(13) }, range === r && styles.btnTextActive]}
              numberOfLines={1}
            >
              {labelFor(r)}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.more, open && styles.moreActive]}
          onPress={() => setOpen(o => !o)}
        >
          <Text style={styles.moreText}>⋯</Text>
        </TouchableOpacity>
      </View>
      {/* After the bar so it paints above it — the last action used to sit under it. */}
      {open && (
        <View style={[styles.sheet, { bottom: barHeight + 8 }]}>
          {actions.map(([label, action]) => (
            <TouchableOpacity
              key={label}
              style={styles.action}
              onPress={() => { setOpen(false); action(); }}
            >
              <Text style={[styles.actionText, { fontSize: ms(12) }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: COLORS.bgDeep,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  btnActive: { backgroundColor: ACCENT },
  btnText: {
    color: COLORS.grey,
    fontWeight: '600',
  },
  btnTextActive: { color: COLORS.bg },
  more: {
    width: scale(38),
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  moreActive: { backgroundColor: '#2a2a33' },
  moreText: {
    fontSize: 16,
    lineHeight: 16,
    color: COLORS.grey,
    fontWeight: '700',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    position: 'absolute',
    right: 12,
    backgroundColor: COLORS.cardRaised,
    borderRadius: 12,
    paddingVertical: 4,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    elevation: 6,
  },
  action: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    color: COLORS.grey,
    fontWeight: '500',
  },
});
