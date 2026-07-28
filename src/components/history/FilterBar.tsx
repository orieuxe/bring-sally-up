import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
};

// Sticky bottom bar (thumb zone) with rare actions folded behind ⋯
export default function FilterBar({ range, labelFor, onRange, actions }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <View style={styles.sheet}>
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
      <View style={styles.bar}>
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
    color: COLORS.muted,
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
    color: COLORS.muted,
    fontWeight: '700',
  },
  sheet: {
    position: 'absolute',
    right: 12,
    bottom: scale(58),
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
    color: COLORS.muted,
    fontWeight: '500',
  },
});
